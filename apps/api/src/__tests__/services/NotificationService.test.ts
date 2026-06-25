import { NotificationService } from '../../services/NotificationService';
import { query } from '../../db';
import { emitNotificationCreated, emitNotificationRefresh } from '../../socket';
import PushService from '../../services/PushService';

// Socket emits are pure side effects — stub them.
jest.mock('../../socket', () => ({
  emitNotificationCreated: jest.fn(),
  emitNotificationRefresh: jest.fn(),
}));

// Fire-and-forget push/email must not perform real work in tests.
jest.mock('../../services/PushService', () => ({
  __esModule: true,
  default: { sendToUser: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../services/EmailService', () => ({
  __esModule: true,
  default: { sendNotificationEmail: jest.fn().mockResolvedValue(undefined) },
}));

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedEmitCreated = emitNotificationCreated as jest.Mock;
const mockedEmitRefresh = emitNotificationRefresh as jest.Mock;
const mockedPush = PushService.sendToUser as jest.Mock;

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'n-1',
  user_id: 'user-1',
  title: 'Hello',
  message: 'World',
  type: 'info',
  read: false,
  link: '/somewhere',
  created_at: new Date(),
  ...overrides,
});

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
    jest.clearAllMocks();
  });

  describe('getByUserId', () => {
    it('returns mapped notifications scoped to the user with a default limit', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [makeRow(), makeRow({ id: 'n-2' })], rowCount: 2 } as never);

      const result = await service.getByUserId('user-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 'n-1', title: 'Hello', read: false });
      expect(result[0]).toHaveProperty('time'); // relative-time string added by mapper
      const [sql, params] = mockedQuery.mock.calls[0];
      expect(sql).toMatch(/FROM notifications/);
      expect(params).toEqual(['user-1', 20]);
    });

    it('honours an explicit limit', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
      await service.getByUserId('user-1', 5);
      expect(mockedQuery.mock.calls[0][1]).toEqual(['user-1', 5]);
    });
  });

  describe('getUnreadCount', () => {
    it('parses the COUNT string into a number', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [{ count: '7' }], rowCount: 1 } as never);

      const count = await service.getUnreadCount('user-1');

      expect(count).toBe(7);
      expect(mockedQuery.mock.calls[0][0]).toMatch(/read = FALSE/);
    });
  });

  describe('create', () => {
    it('inserts, emits a socket event, and fires push (fire-and-forget)', async () => {
      mockedQuery
        // INSERT RETURNING *
        .mockResolvedValueOnce({ rows: [makeRow()], rowCount: 1 } as never)
        // email-preference lookup (fire-and-forget .then)
        .mockResolvedValueOnce({ rows: [{ email: 'a@b.c', email_notifications: false }], rowCount: 1 } as never);

      const result = await service.create({
        user_id: 'user-1',
        title: 'Hello',
        message: 'World',
        type: 'info',
        link: '/somewhere',
      });

      expect(result.id).toBe('n-1');
      expect(mockedEmitCreated).toHaveBeenCalledTimes(1);
      expect(mockedPush).toHaveBeenCalledWith('user-1', expect.objectContaining({ title: 'Hello', body: 'World' }));
      expect(mockedQuery.mock.calls[0][0]).toMatch(/INSERT INTO notifications/);
    });

    it("defaults type to 'info' when omitted", async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [makeRow({ type: 'info' })], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ email: 'a@b.c', email_notifications: false }], rowCount: 1 } as never);

      await service.create({ user_id: 'user-1', title: 'Hi', message: 'M', link: null } as never);

      expect(mockedQuery.mock.calls[0][1]).toEqual(['user-1', 'Hi', 'M', 'info', null]);
    });
  });

  describe('createForMultipleUsers', () => {
    it('no-ops on an empty user list', async () => {
      await service.createForMultipleUsers([], { title: 'T', message: 'M', type: 'info' });
      expect(mockedQuery).not.toHaveBeenCalled();
      expect(mockedEmitRefresh).not.toHaveBeenCalled();
    });

    it('bulk-inserts and emits a refresh', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 2 } as never);

      await service.createForMultipleUsers(['u1', 'u2'], { title: 'T', message: 'M', type: 'info' });

      const [sql, params] = mockedQuery.mock.calls[0];
      expect(sql).toMatch(/INSERT INTO notifications/);
      expect(params).toHaveLength(10); // 2 users × 5 columns
      expect(mockedEmitRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('markAsRead / markAllAsRead / delete', () => {
    it('markAsRead returns true when a row matched', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [makeRow({ read: true })], rowCount: 1 } as never);
      expect(await service.markAsRead('n-1', 'user-1')).toBe(true);
    });

    it('markAsRead returns false when nothing matched', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
      expect(await service.markAsRead('n-x', 'user-1')).toBe(false);
    });

    it('markAllAsRead returns the affected count', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 4 } as never);
      expect(await service.markAllAsRead('user-1')).toBe(4);
    });

    it('delete returns true when a row was removed', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
      expect(await service.delete('n-1', 'user-1')).toBe(true);
    });
  });
});
