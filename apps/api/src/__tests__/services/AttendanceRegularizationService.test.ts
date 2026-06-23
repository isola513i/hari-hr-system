import AttendanceRegularizationService from '../../services/AttendanceRegularizationService';
import { query } from '../../db';
import NotificationService from '../../services/NotificationService';
import AttendanceService from '../../services/AttendanceService';
import { BusinessError } from '../../utils/errorResponse';

jest.mock('../../services/NotificationService', () => ({
  __esModule: true,
  default: {
    notifyAdmins: jest.fn().mockResolvedValue(undefined),
    create: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../services/AttendanceService', () => ({
  __esModule: true,
  default: {
    adminUpsertAttendance: jest.fn().mockResolvedValue({}),
  },
}));

// Run the transaction callback inline against the mocked `query` so the existing
// query mocks drive the approve() flow without a real pool connection.
jest.mock('../../utils/transaction', () => ({
  withTransaction: (cb: (q: typeof import('../../db').query) => unknown) =>
    cb(require('../../db').query),
}));

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedUpsert = AttendanceService.adminUpsertAttendance as jest.Mock;
const mockedNotifyAdmins = NotificationService.notifyAdmins as jest.Mock;

const REG_ROW = {
  id: 'reg-1',
  employee_id: 'emp-1',
  date: '2026-06-20',
  requested_clock_in: '2026-06-20T02:00:00.000Z',
  requested_clock_out: '2026-06-20T11:00:00.000Z',
  reason: 'Forgot to clock out',
  status: 'pending',
  manager_reviewed_by: null,
  manager_reviewed_at: null,
  reviewed_by: null,
  reviewed_at: null,
  notes: null,
  created_at: '2026-06-20T12:00:00.000Z',
};

describe('AttendanceRegularizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('inserts a request and notifies admins', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [REG_ROW], rowCount: 1 } as never) // INSERT
        .mockResolvedValueOnce({ rows: [{ name: 'Alice', manager_user_id: null }], rowCount: 1 } as never); // emp lookup

      const result = await AttendanceRegularizationService.create('emp-1', {
        date: '2026-06-20',
        requestedClockIn: '2026-06-20T02:00:00.000Z',
        requestedClockOut: '2026-06-20T11:00:00.000Z',
        reason: 'Forgot to clock out',
      });

      expect(result.id).toBe('reg-1');
      expect(result.status).toBe('pending');
      expect(mockedQuery.mock.calls[0][0]).toContain('INSERT INTO attendance_regularization_requests');
      expect(mockedNotifyAdmins).toHaveBeenCalled();
    });

    it('notifies the manager when one exists', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [REG_ROW], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ name: 'Alice', manager_user_id: 'mgr-user-1' }], rowCount: 1 } as never);

      await AttendanceRegularizationService.create('emp-1', {
        date: '2026-06-20',
        requestedClockIn: '2026-06-20T02:00:00.000Z',
        reason: 'Forgot to clock out',
      });

      expect(NotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'mgr-user-1' })
      );
    });

    it('rejects when no reason is given', async () => {
      await expect(
        AttendanceRegularizationService.create('emp-1', { date: '2026-06-20', requestedClockIn: 'x', reason: '  ' })
      ).rejects.toBeInstanceOf(BusinessError);
      expect(mockedQuery).not.toHaveBeenCalled();
    });

    it('rejects when neither clock-in nor clock-out is provided', async () => {
      await expect(
        AttendanceRegularizationService.create('emp-1', { date: '2026-06-20', reason: 'fix' })
      ).rejects.toThrow(/clock-in or clock-out/);
    });

    it('rejects a future date', async () => {
      const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await expect(
        AttendanceRegularizationService.create('emp-1', { date: future, requestedClockIn: 'x', reason: 'fix' })
      ).rejects.toThrow(/future/);
    });
  });

  describe('managerApprove', () => {
    it('forwards to HR when the caller is the direct manager', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ employee_id: 'emp-1', status: 'pending', date: '2026-06-20' }], rowCount: 1 } as never) // fetch
        .mockResolvedValueOnce({ rows: [{ manager_id: 'mgr-1', name: 'Alice' }], rowCount: 1 } as never) // employee
        .mockResolvedValueOnce({ rows: [{ ...REG_ROW, status: 'manager_approved' }], rowCount: 1 } as never); // UPDATE

      const result = await AttendanceRegularizationService.managerApprove('reg-1', 'mgr-1');

      expect(result.status).toBe('manager_approved');
      expect(mockedNotifyAdmins).toHaveBeenCalled();
    });

    it('rejects a non-manager (403-style BusinessError)', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ employee_id: 'emp-1', status: 'pending', date: '2026-06-20' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ manager_id: 'someone-else', name: 'Alice' }], rowCount: 1 } as never);

      await expect(
        AttendanceRegularizationService.managerApprove('reg-1', 'not-the-manager')
      ).rejects.toThrow(/direct reports/);
    });

    it('rejects when not in pending state', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [{ employee_id: 'emp-1', status: 'approved', date: '2026-06-20' }], rowCount: 1 } as never);

      await expect(
        AttendanceRegularizationService.managerApprove('reg-1', 'mgr-1')
      ).rejects.toThrow(/pending/);
    });
  });

  describe('approve', () => {
    it('sets approved and applies the correction via adminUpsertAttendance', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ ...REG_ROW, status: 'approved', reviewed_by: 'hr-1' }], rowCount: 1 } as never) // UPDATE
        .mockResolvedValueOnce({ rows: [{ user_id: 'emp-user-1' }], rowCount: 1 } as never); // notifyEmployee lookup

      const result = await AttendanceRegularizationService.approve('reg-1', 'hr-emp-1', 'hr-user-1');

      expect(result.status).toBe('approved');
      expect(mockedUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp-1',
          date: '2026-06-20',
          clockIn: REG_ROW.requested_clock_in,
          clockOut: REG_ROW.requested_clock_out,
          // modified_by is a FK to users(id) → must be the reviewer's USER id, not employee id
          modifiedBy: 'hr-user-1',
        }),
        expect.anything(), // the transaction-bound query executor
      );
    });

    it('throws when the request does not exist', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await expect(AttendanceRegularizationService.approve('missing', 'hr-emp-1', 'hr-user-1')).rejects.toBeInstanceOf(BusinessError);
      expect(mockedUpsert).not.toHaveBeenCalled();
    });

    it('propagates a failure from the attendance write (transaction rolls back)', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [{ ...REG_ROW, status: 'approved' }], rowCount: 1 } as never); // UPDATE
      mockedUpsert.mockRejectedValueOnce(new Error('FK violation'));

      // approve() runs inside withTransaction, so the rejected attendance write
      // bubbles out and the status flip is rolled back rather than committed.
      await expect(AttendanceRegularizationService.approve('reg-1', 'hr-emp-1', 'hr-user-1')).rejects.toThrow('FK violation');
    });
  });

  describe('reject', () => {
    it('sets rejected and does NOT apply any correction', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ ...REG_ROW, status: 'rejected', reviewed_by: 'hr-1' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ user_id: 'emp-user-1' }], rowCount: 1 } as never);

      const result = await AttendanceRegularizationService.reject('reg-1', 'hr-1', 'Times look wrong');

      expect(result.status).toBe('rejected');
      expect(mockedUpsert).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('deletes a pending request owned by the employee', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      await expect(AttendanceRegularizationService.cancel('reg-1', 'emp-1')).resolves.toBeUndefined();
      const sql = mockedQuery.mock.calls[0][0] as string;
      expect(sql).toContain('DELETE FROM attendance_regularization_requests');
      expect(sql).toContain("status = 'pending'");
    });

    it('throws when nothing was deleted (not pending or not owner)', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await expect(AttendanceRegularizationService.cancel('reg-1', 'emp-1')).rejects.toBeInstanceOf(BusinessError);
    });
  });

  describe('getAll', () => {
    it('scopes to the manager team when myTeam is set', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await AttendanceRegularizationService.getAll({ myTeam: true, callerEmployeeId: 'mgr-1' });

      const sql = mockedQuery.mock.calls[0][0] as string;
      expect(sql).toContain('e.manager_id =');
    });
  });
});
