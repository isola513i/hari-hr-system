import { ExpenseClaimService } from '../../services/ExpenseClaimService';
import { query } from '../../db';

const mockedQuery = query as jest.MockedFunction<typeof query>;

describe('ExpenseClaimService', () => {
  let service: ExpenseClaimService;

  beforeEach(() => {
    service = new ExpenseClaimService();
    jest.clearAllMocks();
  });

  const makeClaimRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'claim-1',
    employee_id: 'emp-1',
    employee_name: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
    title: 'Office Supplies',
    category: 'Supplies',
    amount: '500',
    currency: 'THB',
    expense_date: '2026-03-10',
    description: 'Pens and paper',
    receipt_path: null,
    status: 'Pending',
    rejection_reason: null,
    approver_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  describe('createExpenseClaim', () => {
    it('should INSERT with correct params and return the claim', async () => {
      const row = makeClaimRow();

      mockedQuery
        // INSERT RETURNING *
        .mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never)
        // getExpenseClaimById (re-fetch with JOIN)
        .mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never);

      const result = await service.createExpenseClaim({
        employeeId: 'emp-1',
        title: 'Office Supplies',
        category: 'Supplies',
        amount: 500,
        expenseDate: '2026-03-10',
        description: 'Pens and paper',
      });

      // Verify INSERT query was called
      expect(mockedQuery).toHaveBeenCalledTimes(2);
      const insertCall = mockedQuery.mock.calls[0];
      expect(insertCall[0]).toContain('INSERT INTO expense_claims');
      const insertParams = insertCall[1] as any[];
      expect(insertParams[0]).toBe('emp-1');
      expect(insertParams[1]).toBe('Office Supplies');
      expect(insertParams[2]).toBe('Supplies');
      expect(insertParams[3]).toBe(500);
      expect(insertParams[4]).toBe('2026-03-10');

      expect(result.employeeId).toBe('emp-1');
      expect(result.title).toBe('Office Supplies');
    });
  });

  describe('editExpenseClaim', () => {
    it('should throw when employee is not the owner', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [makeClaimRow({ employee_id: 'emp-other' })],
        rowCount: 1,
      } as never);

      await expect(
        service.editExpenseClaim('claim-1', 'emp-1', { title: 'Updated' })
      ).rejects.toThrow('You can only edit your own expense claims');
    });

    it('should throw when claim is not Pending', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [makeClaimRow({ status: 'Approved' })],
        rowCount: 1,
      } as never);

      await expect(
        service.editExpenseClaim('claim-1', 'emp-1', { title: 'Updated' })
      ).rejects.toThrow('Only pending expense claims can be edited');
    });
  });

  describe('cancelExpenseClaim', () => {
    it('should soft-delete (mark Cancelled) when claim is Pending', async () => {
      const row = makeClaimRow({ status: 'Pending' });

      mockedQuery
        // SELECT existing
        .mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never)
        // soft-delete UPDATE
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      const result = await service.cancelExpenseClaim('claim-1', 'emp-1');

      // Pending claims are soft-deleted (financial records are never hard-deleted):
      // the row is marked deleted_at + status='Cancelled' instead of DELETEd.
      const cancelCall = mockedQuery.mock.calls[1];
      expect(cancelCall[0]).toContain('UPDATE expense_claims');
      expect(cancelCall[0]).toContain('deleted_at = NOW()');
      expect(cancelCall[0]).toContain("status = 'Cancelled'");
      expect(result).not.toBeNull();
      expect(result!.status).toBe('Cancelled');
    });

    it('should UPDATE to Cancelled when claim is Approved', async () => {
      const row = makeClaimRow({ status: 'Approved' });
      const cancelledRow = makeClaimRow({ status: 'Cancelled' });

      mockedQuery
        // SELECT existing
        .mockResolvedValueOnce({ rows: [row], rowCount: 1 } as never)
        // UPDATE to Cancelled
        .mockResolvedValueOnce({ rows: [cancelledRow], rowCount: 1 } as never)
        // getExpenseClaimById re-fetch
        .mockResolvedValueOnce({ rows: [cancelledRow], rowCount: 1 } as never);

      const result = await service.cancelExpenseClaim('claim-1', 'emp-1');

      // Verify UPDATE was called (second query)
      const updateCall = mockedQuery.mock.calls[1];
      expect(updateCall[0]).toContain('UPDATE expense_claims');
      expect(updateCall[0]).toContain("status = 'Cancelled'");
      expect(result).not.toBeNull();
    });

    it('should throw error when claim is Rejected', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [makeClaimRow({ status: 'Rejected' })],
        rowCount: 1,
      } as never);

      await expect(
        service.cancelExpenseClaim('claim-1', 'emp-1')
      ).rejects.toThrow('Only pending or approved expense claims can be cancelled');
    });
  });
});
