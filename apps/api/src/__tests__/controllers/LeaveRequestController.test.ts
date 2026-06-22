import LeaveRequestController from '../../controllers/LeaveRequestController';
import LeaveRequestService from '../../services/LeaveRequestService';
import NotificationService from '../../services/NotificationService';
import { emitLeaveRequestUpdated, emitLeaveRequestsBulkUpdated } from '../../socket';
import { query } from '../../db';

// The controller pulls in storage/upload only for create/edit/download paths,
// which these tests don't exercise — stub them so the import graph stays light.
jest.mock('../../services/StorageService', () => ({
  storageService: { upload: jest.fn(), download: jest.fn() },
}));
jest.mock('../../middlewares/upload', () => ({
  generateStorageKey: jest.fn(() => 'key'),
  getFileBuffer: jest.fn(() => Buffer.from('')),
}));

jest.mock('../../services/LeaveRequestService', () => ({
  __esModule: true,
  default: {
    getLeaveRequestById: jest.fn(),
    updateLeaveRequestStatus: jest.fn(),
  },
  LeaveRequestService: { stripSensitiveLeaveFields: jest.fn((r: unknown) => r) },
}));

jest.mock('../../services/NotificationService', () => ({
  __esModule: true,
  default: { notifyAdmins: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../socket', () => ({
  emitLeaveRequestCreated: jest.fn(),
  emitLeaveRequestUpdated: jest.fn(),
  emitLeaveRequestDeleted: jest.fn(),
  emitLeaveRequestsBulkUpdated: jest.fn(),
}));

const mockedService = LeaveRequestService as jest.Mocked<typeof LeaveRequestService>;
const mockedNotify = NotificationService.notifyAdmins as jest.Mock;
const mockedEmitUpdated = emitLeaveRequestUpdated as jest.Mock;
const mockedEmitBulk = emitLeaveRequestsBulkUpdated as jest.Mock;
const mockedQuery = query as jest.MockedFunction<typeof query>;

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const HR = { role: 'HR_ADMIN', employeeId: 'hr-1' };
const MANAGER = { role: 'MANAGER', employeeId: 'mgr-1' };

const pendingLeave = (overrides: Record<string, unknown> = {}) => ({
  id: 'lr-1',
  status: 'Pending',
  employeeId: 'emp-1',
  type: 'Annual',
  employeeName: 'Test Employee',
  ...overrides,
});

describe('LeaveRequestController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedNotify.mockResolvedValue(undefined);
  });

  describe('updateLeaveRequest (single)', () => {
    it('returns 400 for an invalid status', async () => {
      const req: any = { params: { id: 'lr-1' }, body: { status: 'Bogus' }, user: HR };
      const res = mockRes();

      await LeaveRequestController.updateLeaveRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid status' });
      expect(mockedService.updateLeaveRequestStatus).not.toHaveBeenCalled();
    });

    it('returns 404 when the leave request does not exist', async () => {
      mockedService.getLeaveRequestById.mockResolvedValue(null as never);
      const req: any = { params: { id: 'lr-x' }, body: { status: 'Approved' }, user: HR };
      const res = mockRes();

      await LeaveRequestController.updateLeaveRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Leave request not found' });
    });

    it('returns 400 when the request is already finalized', async () => {
      mockedService.getLeaveRequestById.mockResolvedValue(pendingLeave({ status: 'Approved' }) as never);
      const req: any = { params: { id: 'lr-1' }, body: { status: 'Rejected' }, user: HR };
      const res = mockRes();

      await LeaveRequestController.updateLeaveRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Cannot update a leave request that is already approved',
      });
    });

    it('approves a pending request as HR_ADMIN and emits an update', async () => {
      mockedService.getLeaveRequestById.mockResolvedValue(pendingLeave() as never);
      mockedService.updateLeaveRequestStatus.mockResolvedValue(
        pendingLeave({ status: 'Approved' }) as never,
      );
      const req: any = { params: { id: 'lr-1' }, body: { status: 'Approved' }, user: HR };
      const res = mockRes();

      await LeaveRequestController.updateLeaveRequest(req, res);

      expect(mockedService.updateLeaveRequestStatus).toHaveBeenCalledWith(
        'lr-1',
        expect.objectContaining({ status: 'Approved', approverEmployeeId: 'hr-1' }),
      );
      expect(mockedEmitUpdated).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'Approved' }));
      expect(res.status).not.toHaveBeenCalledWith(400);
    });

    it('rejects a manager acting on a non-direct-report with 403', async () => {
      mockedService.getLeaveRequestById.mockResolvedValue(pendingLeave() as never);
      mockedQuery.mockResolvedValue({ rows: [{ manager_id: 'someone-else' }] } as never);
      const req: any = { params: { id: 'lr-1' }, body: { status: 'Approved' }, user: MANAGER };
      const res = mockRes();

      await LeaveRequestController.updateLeaveRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockedService.updateLeaveRequestStatus).not.toHaveBeenCalled();
    });

    it('escalates a manager approval to "Manager Approved" and notifies HR', async () => {
      mockedService.getLeaveRequestById.mockResolvedValue(pendingLeave() as never);
      mockedQuery.mockResolvedValue({ rows: [{ manager_id: 'mgr-1' }] } as never);
      mockedService.updateLeaveRequestStatus.mockResolvedValue(
        pendingLeave({ status: 'Manager Approved' }) as never,
      );
      const req: any = { params: { id: 'lr-1' }, body: { status: 'Approved' }, user: MANAGER };
      const res = mockRes();

      await LeaveRequestController.updateLeaveRequest(req, res);

      expect(mockedService.updateLeaveRequestStatus).toHaveBeenCalledWith(
        'lr-1',
        expect.objectContaining({ status: 'Manager Approved', managerApprovedBy: 'mgr-1' }),
      );
      expect(mockedNotify).toHaveBeenCalledTimes(1);
      expect(mockedEmitUpdated).toHaveBeenCalledTimes(1);
    });
  });

  describe('bulkUpdateLeaveRequests', () => {
    it('returns 400 when ids is empty', async () => {
      const req: any = { body: { ids: [], status: 'Approved' }, user: HR };
      const res = mockRes();

      await LeaveRequestController.bulkUpdateLeaveRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ids must be a non-empty array' });
    });

    it('returns 400 when more than 100 ids are submitted', async () => {
      const ids = Array.from({ length: 101 }, (_, i) => `lr-${i}`);
      const req: any = { body: { ids, status: 'Approved' }, user: HR };
      const res = mockRes();

      await LeaveRequestController.bulkUpdateLeaveRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Cannot process more than 100 requests at once',
      });
    });

    it('returns 200 and one batched broadcast when all succeed', async () => {
      mockedService.getLeaveRequestById.mockResolvedValue(pendingLeave() as never);
      mockedService.updateLeaveRequestStatus.mockResolvedValue(
        pendingLeave({ status: 'Approved' }) as never,
      );
      const req: any = { body: { ids: ['a', 'b'], status: 'Approved' }, user: HR };
      const res = mockRes();

      await LeaveRequestController.bulkUpdateLeaveRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockedEmitBulk).toHaveBeenCalledTimes(1);
      expect(mockedEmitBulk.mock.calls[0][0]).toHaveLength(2);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ total: 2, succeeded: 2, failed: 0 }),
      );
    });

    it('returns 207 for partial success', async () => {
      mockedService.getLeaveRequestById.mockImplementation((id: string) =>
        Promise.resolve(
          (id === 'a' ? pendingLeave() : pendingLeave({ status: 'Approved' })) as never,
        ),
      );
      mockedService.updateLeaveRequestStatus.mockResolvedValue(
        pendingLeave({ status: 'Approved' }) as never,
      );
      const req: any = { body: { ids: ['a', 'b'], status: 'Approved' }, user: HR };
      const res = mockRes();

      await LeaveRequestController.bulkUpdateLeaveRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(207);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ total: 2, succeeded: 1, failed: 1 }),
      );
    });

    it('returns 422 when no item succeeds', async () => {
      mockedService.getLeaveRequestById.mockResolvedValue(null as never);
      const req: any = { body: { ids: ['a', 'b'], status: 'Approved' }, user: HR };
      const res = mockRes();

      await LeaveRequestController.bulkUpdateLeaveRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ total: 2, succeeded: 0, failed: 2 }),
      );
      expect(mockedEmitBulk).toHaveBeenCalledWith([]);
    });
  });
});
