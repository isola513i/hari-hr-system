import ComplianceService from '../../services/ComplianceService';
import { query } from '../../db';
import NotificationService from '../../services/NotificationService';
import { BusinessError } from '../../utils/errorResponse';

// updateStatus notifies the assignee — stub the fire-and-forget call.
jest.mock('../../services/NotificationService', () => ({
  __esModule: true,
  default: { create: jest.fn().mockResolvedValue(undefined) },
}));

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedNotify = NotificationService.create as jest.Mock;

const itemRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'ci-1',
  title: 'GDPR audit',
  description: 'Annual review',
  category: 'Privacy',
  status: 'Active',
  priority: 'High',
  risk_level: 'High',
  assigned_to: 'emp-1',
  assigned_to_name: 'Jane',
  assigned_department: 'Legal',
  due_date: '2026-07-31',
  created_by: 'user-1',
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
  ...overrides,
});

describe('ComplianceService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getAll', () => {
    it('builds a dynamic WHERE from filters and returns items + total', async () => {
      mockedQuery
        // COUNT
        .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 } as never)
        // data page
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 } as never);

      const result = await ComplianceService.getAll({ status: 'Active', riskLevel: 'High', page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({ id: 'ci-1', riskLevel: 'High', assignedToName: 'Jane' });

      const countSql = mockedQuery.mock.calls[0][0] as string;
      expect(countSql).toMatch(/ci\.status = \$1/);
      expect(countSql).toMatch(/ci\.risk_level = \$2/);
      // data query appends LIMIT/OFFSET params after the filter values
      expect(mockedQuery.mock.calls[1][1]).toEqual(['Active', 'High', 20, 0]);
    });

    it('omits WHERE when no filters are supplied', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await ComplianceService.getAll();

      expect(mockedQuery.mock.calls[0][0] as string).not.toMatch(/WHERE/);
    });
  });

  describe('getById', () => {
    it('returns the mapped item when found', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 } as never);
      const item = await ComplianceService.getById('ci-1');
      expect(item).toMatchObject({ id: 'ci-1', title: 'GDPR audit' });
    });

    it('returns null when missing', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
      expect(await ComplianceService.getById('nope')).toBeNull();
    });
  });

  describe('create', () => {
    it('inserts the item, seeds Draft status history, and returns the row via getById', async () => {
      mockedQuery
        // INSERT compliance_items RETURNING *
        .mockResolvedValueOnce({ rows: [{ id: 'ci-1' }], rowCount: 1 } as never)
        // INSERT status history
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
        // getById SELECT
        .mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 } as never);

      const result = await ComplianceService.create({ title: 'GDPR audit', createdBy: 'user-1' });

      expect(result.id).toBe('ci-1');
      expect(mockedQuery.mock.calls[1][0] as string).toMatch(/compliance_status_history/);
      // defaults applied
      expect(mockedQuery.mock.calls[0][1]).toEqual([
        'GDPR audit', null, 'Custom', 'Medium', 'Low', null, null, null, 'user-1',
      ]);
    });
  });

  describe('updateStatus', () => {
    it('rejects an invalid status', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 } as never); // getById
      await expect(ComplianceService.updateStatus('ci-1', 'Bogus', 'user-1')).rejects.toBeInstanceOf(BusinessError);
    });

    it('returns null when the item does not exist', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never); // getById → null
      expect(await ComplianceService.updateStatus('nope', 'Completed', 'user-1')).toBeNull();
    });

    it('updates status, records history, and notifies the assignee', async () => {
      mockedQuery
        // getById (existing, assigned to emp-1)
        .mockResolvedValueOnce({ rows: [itemRow({ status: 'Active' })], rowCount: 1 } as never)
        // UPDATE status
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
        // INSERT history
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
        // SELECT user_id FROM employees
        .mockResolvedValueOnce({ rows: [{ user_id: 'user-9' }], rowCount: 1 } as never)
        // final getById
        .mockResolvedValueOnce({ rows: [itemRow({ status: 'Completed' })], rowCount: 1 } as never);

      const result = await ComplianceService.updateStatus('ci-1', 'Completed', 'user-1', 'done');

      expect(result?.status).toBe('Completed');
      expect(mockedNotify).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-9', type: 'success' }));
    });
  });

  describe('delete', () => {
    it('throws when nothing was deleted', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
      await expect(ComplianceService.delete('nope')).rejects.toBeInstanceOf(BusinessError);
    });

    it('resolves when a row was deleted', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
      await expect(ComplianceService.delete('ci-1')).resolves.toBeUndefined();
    });
  });
});
