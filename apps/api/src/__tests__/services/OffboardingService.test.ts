import { OffboardingService } from '../../services/OffboardingService';
import { query } from '../../db';

// Mock EmployeeService — OffboardingService calls it for status reads/writes
jest.mock('../../services/EmployeeService', () => ({
  __esModule: true,
  default: {
    getEmployeeById: jest.fn(),
    updateEmployee: jest.fn().mockResolvedValue({ id: 'emp-1', status: 'Terminated' }),
  },
}));

// Mock NotificationService — fire-and-forget calls during finalization
jest.mock('../../services/NotificationService', () => ({
  __esModule: true,
  default: {
    notifyAdmins: jest.fn().mockResolvedValue(undefined),
    notifyEmployee: jest.fn().mockResolvedValue(undefined),
  },
}));

// Re-import mocked module to grab the mock function for assertions
import EmployeeService from '../../services/EmployeeService';

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedGetEmployeeById = EmployeeService.getEmployeeById as jest.MockedFunction<typeof EmployeeService.getEmployeeById>;
const mockedUpdateEmployee = EmployeeService.updateEmployee as jest.MockedFunction<typeof EmployeeService.updateEmployee>;

describe('OffboardingService', () => {
  let service: OffboardingService;

  const activeEmployee = {
    id: 'emp-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'Developer',
    department: 'Engineering',
    status: 'Active' as const,
  };

  const noticePeriodEmployee = { ...activeEmployee, status: 'Notice Period' as const };
  const terminatedEmployee = { ...activeEmployee, status: 'Terminated' as const };

  beforeEach(() => {
    service = new OffboardingService();
    jest.clearAllMocks();
  });

  // ── initiateOffboarding ─────────────────────────────────────────────────
  describe('initiateOffboarding — state transition guard', () => {
    const dto = {
      terminationReason: 'Career change',
      lastWorkingDay: '2026-07-31',
      terminationNotes: 'Moving to another company',
    };
    const actor = { userId: 'user-1', email: 'admin@example.com' };

    it('throws when employee not found', async () => {
      mockedGetEmployeeById.mockResolvedValueOnce(null as never);

      await expect(service.initiateOffboarding('missing', dto, actor)).rejects.toThrow('Employee not found');
    });

    it('throws when employee is already in Notice Period (no double-init)', async () => {
      mockedGetEmployeeById.mockResolvedValueOnce(noticePeriodEmployee as never);

      await expect(service.initiateOffboarding('emp-1', dto, actor)).rejects.toThrow(
        'Employee is already offboarding or terminated',
      );
    });

    it('throws when employee is already Terminated', async () => {
      mockedGetEmployeeById.mockResolvedValueOnce(terminatedEmployee as never);

      await expect(service.initiateOffboarding('emp-1', dto, actor)).rejects.toThrow(
        'Employee is already offboarding or terminated',
      );
    });

    it('flips Active → Notice Period and seeds 8 default tasks', async () => {
      mockedGetEmployeeById.mockResolvedValueOnce(activeEmployee as never);
      // Safety net for the fire-and-forget _notifyAssignees lookup queries
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
      mockedQuery
        // UPDATE employees SET status = 'Notice Period'
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
        // _seedDefaultTasks → COUNT existing (0 → not seeded yet)
        .mockResolvedValueOnce({ rows: [{ cnt: 0 }], rowCount: 1 } as never)
        // _seedDefaultTasks → bulk INSERT, returns 8 task rows
        .mockResolvedValueOnce({
          rows: Array.from({ length: 8 }, (_, i) => ({
            id: `task-${i}`,
            employee_id: 'emp-1',
            title: `Task ${i}`,
            description: '',
            stage: 'Pre-Exit',
            assignee: 'HR',
            due_date: '2026-07-28',
            priority: 'High',
            completed: false,
            created_at: new Date(),
            updated_at: new Date(),
          })),
          rowCount: 8,
        } as never);

      const result = await service.initiateOffboarding('emp-1', dto, actor);

      expect(result.employee.status).toBe('Notice Period');
      expect(result.employee.terminationReason).toBe('Career change');
      expect(result.employee.lastWorkingDay).toBe('2026-07-31');
      expect(result.tasks).toHaveLength(8);

      // First UPDATE call sets the right fields
      const updateCall = mockedQuery.mock.calls[0];
      expect(updateCall[0]).toMatch(/UPDATE employees/);
      expect(updateCall[0]).toMatch(/status\s*=\s*'Notice Period'/);
      expect(updateCall[1]).toEqual([
        'Career change',
        '2026-07-31',
        'Moving to another company',
        'user-1',
        'emp-1',
      ]);
    });

    it('is idempotent — does not re-seed tasks if any exist', async () => {
      mockedGetEmployeeById.mockResolvedValueOnce(activeEmployee as never);
      // Safety net for fire-and-forget _notifyAssignees lookups
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
      mockedQuery
        // UPDATE employees
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
        // COUNT existing tasks → already 8 seeded
        .mockResolvedValueOnce({ rows: [{ cnt: 8 }], rowCount: 1 } as never)
        // _getTasksByEmployee returns existing
        .mockResolvedValueOnce({
          rows: Array.from({ length: 8 }, (_, i) => ({
            id: `existing-${i}`,
            employee_id: 'emp-1',
            title: `Task ${i}`,
            stage: 'Pre-Exit',
            assignee: 'HR',
            due_date: '2026-07-28',
            priority: 'High',
            completed: false,
            created_at: new Date(),
            updated_at: new Date(),
          })),
          rowCount: 8,
        } as never);

      const result = await service.initiateOffboarding('emp-1', dto, actor);

      expect(result.tasks).toHaveLength(8);
      expect(result.tasks[0].id).toBe('existing-0');

      // No bulk INSERT into offboarding_tasks fires because count was already 8.
      // Verify no INSERT of new tasks happened.
      const insertCalls = mockedQuery.mock.calls.filter((c) =>
        (c[0] as string).match(/INSERT INTO offboarding_tasks/i),
      );
      expect(insertCalls).toHaveLength(0);
    });
  });

  // ── updateTask + auto-finalization ──────────────────────────────────────
  describe('updateTask — Notice Period → Terminated auto-finalization', () => {
    const taskRow = {
      id: 'task-1',
      employee_id: 'emp-1',
      title: 'Return laptop',
      description: '',
      stage: 'Last Week',
      assignee: 'Employee',
      due_date: '2026-07-31',
      priority: 'High',
      completed: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('returns null when no fields to update', async () => {
      const result = await service.updateTask('task-1', {});

      expect(result).toBeNull();
      expect(mockedQuery).not.toHaveBeenCalled();
    });

    it('does NOT trigger finalization when completed is not in dto', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [taskRow], rowCount: 1 } as never);

      await service.updateTask('task-1', { title: 'Updated title' });

      // Only 1 query (the UPDATE) — no pending-count check, no finalization
      expect(mockedQuery).toHaveBeenCalledTimes(1);
      expect(mockedUpdateEmployee).not.toHaveBeenCalled();
    });

    it('does NOT finalize when completed=true BUT pending tasks remain', async () => {
      mockedQuery
        // UPDATE task
        .mockResolvedValueOnce({ rows: [taskRow], rowCount: 1 } as never)
        // _checkAndFinalize → 3 pending remain
        .mockResolvedValueOnce({ rows: [{ pending: '3' }], rowCount: 1 } as never);

      await service.updateTask('task-1', { completed: true });

      expect(mockedQuery).toHaveBeenCalledTimes(2);
      // Should not advance to fetching employee or updating status
      expect(mockedGetEmployeeById).not.toHaveBeenCalled();
      expect(mockedUpdateEmployee).not.toHaveBeenCalled();
    });

    it('does NOT finalize when employee is NOT in Notice Period (e.g., already Terminated)', async () => {
      mockedGetEmployeeById.mockResolvedValueOnce(terminatedEmployee as never);
      mockedQuery
        .mockResolvedValueOnce({ rows: [taskRow], rowCount: 1 } as never)
        // _checkAndFinalize → 0 pending
        .mockResolvedValueOnce({ rows: [{ pending: '0' }], rowCount: 1 } as never);

      await service.updateTask('task-1', { completed: true });

      // Employee fetched but status check exits — no updateEmployee call
      expect(mockedGetEmployeeById).toHaveBeenCalledWith('emp-1');
      expect(mockedUpdateEmployee).not.toHaveBeenCalled();
    });

    it('finalizes (Notice Period → Terminated) when last task completes', async () => {
      mockedGetEmployeeById.mockResolvedValueOnce(noticePeriodEmployee as never);
      mockedQuery
        .mockResolvedValueOnce({ rows: [taskRow], rowCount: 1 } as never)
        // 0 pending → trigger finalize
        .mockResolvedValueOnce({ rows: [{ pending: '0' }], rowCount: 1 } as never)
        // termination_date update
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      await service.updateTask('task-1', { completed: true });

      expect(mockedUpdateEmployee).toHaveBeenCalledWith({ id: 'emp-1', status: 'Terminated' });

      // Third query sets termination_date
      const dateCall = mockedQuery.mock.calls[2];
      expect(dateCall[0]).toMatch(/UPDATE employees SET termination_date = CURRENT_DATE/);
      expect(dateCall[1]).toEqual(['emp-1']);
    });
  });

  // ── getOffboarding (read snapshot) ──────────────────────────────────────
  describe('getOffboarding — progress computation', () => {
    it('computes 0% progress for an employee with no tasks', async () => {
      mockedGetEmployeeById.mockResolvedValueOnce(activeEmployee as never);
      mockedQuery
        // _getTasksByEmployee
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        // getExitInterview
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await service.getOffboarding('emp-1');

      expect(result.progress).toEqual({ total: 0, completed: 0, percentage: 0 });
      expect(result.tasks).toEqual([]);
      expect(result.exitInterview).toBeNull();
    });

    it('computes percentage with rounding (3/7 = 43%)', async () => {
      const taskRowFactory = (completed: boolean, i: number) => ({
        id: `task-${i}`,
        employee_id: 'emp-1',
        title: `Task ${i}`,
        description: '',
        stage: 'Pre-Exit',
        assignee: 'HR',
        due_date: '2026-07-28',
        priority: 'High',
        completed,
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockedGetEmployeeById.mockResolvedValueOnce(noticePeriodEmployee as never);
      mockedQuery
        .mockResolvedValueOnce({
          rows: [
            taskRowFactory(true, 0),
            taskRowFactory(true, 1),
            taskRowFactory(true, 2),
            taskRowFactory(false, 3),
            taskRowFactory(false, 4),
            taskRowFactory(false, 5),
            taskRowFactory(false, 6),
          ],
          rowCount: 7,
        } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await service.getOffboarding('emp-1');

      expect(result.progress).toEqual({ total: 7, completed: 3, percentage: 43 });
    });

    it('returns 100% when all tasks done', async () => {
      const allDone = Array.from({ length: 8 }, (_, i) => ({
        id: `task-${i}`,
        employee_id: 'emp-1',
        title: `Task ${i}`,
        description: '',
        stage: 'Pre-Exit',
        assignee: 'HR',
        due_date: '2026-07-28',
        priority: 'High',
        completed: true,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      mockedGetEmployeeById.mockResolvedValueOnce(terminatedEmployee as never);
      mockedQuery
        .mockResolvedValueOnce({ rows: allDone, rowCount: 8 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await service.getOffboarding('emp-1');

      expect(result.progress).toEqual({ total: 8, completed: 8, percentage: 100 });
    });
  });

  // ── Exit Interview upsert ───────────────────────────────────────────────
  describe('saveExitInterview', () => {
    it('upserts (INSERT ... ON CONFLICT DO UPDATE) — verifies SQL', async () => {
      const interviewRow = {
        id: 'int-1',
        employee_id: 'emp-1',
        reason_for_leaving: 'Better Opportunity',
        satisfaction_rating: 4,
        would_rehire: true,
        feedback: 'Great team',
        improvements_suggested: 'More training',
        conducted_by: 'user-1',
        conducted_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockedQuery.mockResolvedValueOnce({ rows: [interviewRow], rowCount: 1 } as never);

      const result = await service.saveExitInterview(
        'emp-1',
        {
          reasonForLeaving: 'Better Opportunity',
          satisfactionRating: 4,
          wouldRehire: true,
          feedback: 'Great team',
          improvementsSuggested: 'More training',
        },
        'user-1',
      );

      expect(result.reasonForLeaving).toBe('Better Opportunity');
      expect(result.satisfactionRating).toBe(4);
      expect(result.wouldRehire).toBe(true);

      const sql = mockedQuery.mock.calls[0][0] as string;
      expect(sql).toMatch(/INSERT INTO exit_interviews/);
      expect(sql).toMatch(/ON CONFLICT \(employee_id\) DO UPDATE/);
    });
  });

  // ── createTask ──────────────────────────────────────────────────────────
  describe('createTask', () => {
    const newTaskRow = {
      id: 'task-9',
      employee_id: 'emp-1',
      title: 'Revoke building access',
      description: 'Disable keycard',
      stage: 'Last Week',
      assignee: 'IT',
      due_date: '2026-07-30',
      priority: 'High',
      completed: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('inserts a task and maps the row back', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [newTaskRow], rowCount: 1 } as never);

      const result = await service.createTask({
        employeeId: 'emp-1',
        title: 'Revoke building access',
        description: 'Disable keycard',
        stage: 'Last Week',
        assignee: 'IT',
        dueDate: '2026-07-30',
        priority: 'High',
      });

      expect(result.id).toBe('task-9');
      expect(result.title).toBe('Revoke building access');
      const sql = mockedQuery.mock.calls[0][0] as string;
      expect(sql).toMatch(/INSERT INTO offboarding_tasks/);
      // priority passed through
      expect((mockedQuery.mock.calls[0][1] as unknown[])[6]).toBe('High');
    });

    it("defaults priority to 'Medium' and nullable fields to null", async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [{ ...newTaskRow, priority: 'Medium', description: null, due_date: null }], rowCount: 1 } as never);

      await service.createTask({
        employeeId: 'emp-1',
        title: 'Exit survey',
        stage: 'Pre-Exit',
        assignee: 'HR',
      });

      const params = mockedQuery.mock.calls[0][1] as unknown[];
      expect(params[2]).toBeNull(); // description
      expect(params[5]).toBeNull(); // dueDate
      expect(params[6]).toBe('Medium'); // priority default
    });
  });

  // ── deleteTask ──────────────────────────────────────────────────────────
  describe('deleteTask', () => {
    it('returns true when a row was deleted', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [{ id: 'task-1' }], rowCount: 1 } as never);

      const ok = await service.deleteTask('task-1');

      expect(ok).toBe(true);
      expect(mockedQuery.mock.calls[0][0]).toMatch(/DELETE FROM offboarding_tasks/);
    });

    it('returns false when nothing matched', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const ok = await service.deleteTask('missing');

      expect(ok).toBe(false);
    });
  });

  // ── getExitInterview ────────────────────────────────────────────────────
  describe('getExitInterview', () => {
    it('returns the mapped interview when present', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [{
          id: 'int-1',
          employee_id: 'emp-1',
          reason_for_leaving: 'Relocation',
          satisfaction_rating: 5,
          would_rehire: true,
          feedback: 'Loved it',
          improvements_suggested: null,
          conducted_by: 'user-1',
          conducted_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        }],
        rowCount: 1,
      } as never);

      const result = await service.getExitInterview('emp-1');

      expect(result).not.toBeNull();
      expect(result?.reasonForLeaving).toBe('Relocation');
    });

    it('returns null when no interview exists', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await service.getExitInterview('emp-1');

      expect(result).toBeNull();
    });
  });
});
