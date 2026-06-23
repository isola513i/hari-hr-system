import { LeaveRequestService } from '../../services/LeaveRequestService';
import { query } from '../../db';

jest.mock('../../services/NotificationService', () => ({
  __esModule: true,
  default: {
    notifyAdmins: jest.fn().mockResolvedValue(undefined),
    create: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockedQuery = query as jest.MockedFunction<typeof query>;

describe('LeaveRequestService — status-transition state machine', () => {
  let service: LeaveRequestService;

  beforeEach(() => {
    service = new LeaveRequestService();
    jest.clearAllMocks();
  });

  it('rejects an invalid transition (Approved → Pending) with 400 and no write', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ status: 'Approved' }], rowCount: 1 } as never);

    await expect(
      service.updateLeaveRequestStatus('lr-1', { status: 'Pending', approverEmployeeId: 'hr-1' } as never),
    ).rejects.toMatchObject({ statusCode: 400 });

    // Only the current-status read ran — no snapshot/update.
    expect(mockedQuery).toHaveBeenCalledTimes(1);
  });

  it('rejects transitioning out of a terminal state (Rejected → Approved)', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ status: 'Rejected' }], rowCount: 1 } as never);

    await expect(
      service.updateLeaveRequestStatus('lr-1', { status: 'Approved', approverEmployeeId: 'hr-1' } as never),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 404 when the leave request does not exist', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    await expect(
      service.updateLeaveRequestStatus('missing', { status: 'Approved', approverEmployeeId: 'hr-1' } as never),
    ).rejects.toMatchObject({ message: 'Leave request not found', statusCode: 404 });
  });

  it('allows a valid transition (Pending → Manager Approved)', async () => {
    const updatedRow = {
      id: 'lr-1',
      employee_id: 'emp-1',
      employee_name: 'Test Employee',
      leave_type: 'Annual',
      start_date: '2026-06-22',
      end_date: '2026-06-23',
      reason: '',
      status: 'Manager Approved',
      approver_id: 'hr-1',
      rejection_reason: null,
      business_days: 2,
      is_half_day: false,
      half_day_period: null,
      updated_at: '2026-06-22',
    };

    mockedQuery
      .mockResolvedValueOnce({ rows: [{ status: 'Pending' }], rowCount: 1 } as never) // current status
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)                       // snapshotToHistory insert
      .mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 } as never);            // UPDATE RETURNING *

    const result = await service.updateLeaveRequestStatus('lr-1', {
      status: 'Manager Approved',
      approverEmployeeId: 'hr-1',
      managerApprovedBy: 'mgr-1',
    } as never);

    expect(result.status).toBe('Manager Approved');
  });
});
