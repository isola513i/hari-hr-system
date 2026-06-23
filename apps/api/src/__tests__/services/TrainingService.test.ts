import TrainingService from '../../services/TrainingService';
import { query } from '../../db';
import { BusinessError } from '../../utils/errorResponse';

const mockedQuery = query as jest.MockedFunction<typeof query>;

const MODULE_ROW = {
  id: 'mod-1',
  title: 'Security Basics',
  description: 'Introduction to security',
  duration: '2h',
  type: 'Course',
  status: 'In Progress',
  thumbnail: null,
  progress: 0,
  created_by: 'emp-1',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const ET_ROW = {
  id: 'et-1',
  employee_id: 'emp-1',
  module_id: 'mod-1',
  title: 'Security Basics',
  duration: '2h',
  status: 'Not Started',
  completion_date: null,
  score: null,
  due_date: '2026-07-01',
  assigned_by: 'admin-1',
  assigned_at: '2026-06-01T00:00:00Z',
  type: 'Course',
  thumbnail: null,
  module_progress: 0,
};

describe('TrainingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== MODULE CRUD =====

  describe('getAllModules', () => {
    it('returns only active modules by default', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [MODULE_ROW], rowCount: 1 } as never);

      const result = await TrainingService.getAllModules();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('mod-1');
      expect(mockedQuery.mock.calls[0][0]).toContain('is_active = TRUE');
    });

    it('returns all modules when includeInactive is true', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [MODULE_ROW], rowCount: 1 } as never);

      await TrainingService.getAllModules(true);

      const sql = mockedQuery.mock.calls[0][0] as string;
      expect(sql).not.toContain('is_active');
    });
  });

  describe('getModuleById', () => {
    it('returns the module when found', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [MODULE_ROW], rowCount: 1 } as never);

      const result = await TrainingService.getModuleById('mod-1');

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Security Basics');
    });

    it('returns null when not found', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await TrainingService.getModuleById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createModule', () => {
    it('inserts a new module and returns it', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [MODULE_ROW], rowCount: 1 } as never);

      const result = await TrainingService.createModule({
        title: 'Security Basics',
        description: 'Introduction to security',
        duration: '2h',
        type: 'Course',
        createdBy: 'emp-1',
      });

      expect(result.title).toBe('Security Basics');
      expect(mockedQuery.mock.calls[0][0]).toContain('INSERT INTO training_modules');
    });

    it('applies defaults when optional fields are omitted', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [MODULE_ROW], rowCount: 1 } as never);

      await TrainingService.createModule({ title: 'Quick Module' });

      const params = mockedQuery.mock.calls[0][1] as unknown[];
      expect(params[3]).toBe('Course'); // default type
    });
  });

  describe('updateModule', () => {
    it('updates specified fields and returns updated module', async () => {
      const updated = { ...MODULE_ROW, title: 'Security Advanced' };
      mockedQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 } as never);

      const result = await TrainingService.updateModule('mod-1', { title: 'Security Advanced' });

      expect(result!.title).toBe('Security Advanced');
      expect(mockedQuery.mock.calls[0][0]).toContain('UPDATE training_modules');
    });

    it('calls getModuleById when no fields to update', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [MODULE_ROW], rowCount: 1 } as never);

      await TrainingService.updateModule('mod-1', {});

      // Should call SELECT (getModuleById) not UPDATE
      expect(mockedQuery.mock.calls[0][0]).toContain('SELECT');
    });

    it('returns null when module not found', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await TrainingService.updateModule('nonexistent', { title: 'X' });

      expect(result).toBeNull();
    });
  });

  describe('deleteModule', () => {
    it('soft-deletes by setting is_active = FALSE', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      await TrainingService.deleteModule('mod-1');

      const sql = mockedQuery.mock.calls[0][0] as string;
      expect(sql).toContain('is_active = FALSE');
    });

    it('throws BusinessError when module not found', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await expect(TrainingService.deleteModule('bad-id')).rejects.toBeInstanceOf(BusinessError);
    });
  });

  // ===== EMPLOYEE TRAINING =====

  describe('getEmployeeTraining', () => {
    it('returns training records for an employee', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [ET_ROW], rowCount: 1 } as never);

      const result = await TrainingService.getEmployeeTraining('emp-1');

      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toBe('emp-1');
      expect(result[0].status).toBe('Not Started');
    });
  });

  describe('assignTraining', () => {
    it('inserts employee_training and returns it with join data', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ id: 'et-1' }], rowCount: 1 } as never) // INSERT
        .mockResolvedValueOnce({ rows: [ET_ROW], rowCount: 1 } as never);         // re-fetch with JOIN

      const result = await TrainingService.assignTraining({
        employeeId: 'emp-1',
        title: 'Manual Training',
        assignedBy: 'admin-1',
      });

      expect(result.id).toBe('et-1');
    });

    it('pulls title/duration from module when moduleId is provided', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [MODULE_ROW], rowCount: 1 } as never) // getModuleById
        .mockResolvedValueOnce({ rows: [{ id: 'et-1' }], rowCount: 1 } as never) // INSERT
        .mockResolvedValueOnce({ rows: [ET_ROW], rowCount: 1 } as never);         // re-fetch

      await TrainingService.assignTraining({ employeeId: 'emp-1', moduleId: 'mod-1' });

      const insertParams = mockedQuery.mock.calls[1][1] as unknown[];
      expect(insertParams[2]).toBe('Security Basics'); // title from module
      expect(insertParams[3]).toBe('2h');              // duration from module
    });
  });

  describe('bulkAssignTraining', () => {
    it('throws BusinessError when employee list is empty', async () => {
      await expect(
        TrainingService.bulkAssignTraining({ employeeIds: [], moduleId: 'mod-1' })
      ).rejects.toBeInstanceOf(BusinessError);
    });

    it('throws BusinessError when module not found', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await expect(
        TrainingService.bulkAssignTraining({ employeeIds: ['emp-1'], moduleId: 'bad-id' })
      ).rejects.toBeInstanceOf(BusinessError);
    });

    it('inserts multiple employees with ON CONFLICT DO NOTHING', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [MODULE_ROW], rowCount: 1 } as never) // getModuleById
        .mockResolvedValueOnce({ rows: [ET_ROW], rowCount: 2 } as never);    // bulk INSERT

      const result = await TrainingService.bulkAssignTraining({
        employeeIds: ['emp-1', 'emp-2'],
        moduleId: 'mod-1',
      });

      const sql = mockedQuery.mock.calls[1][0] as string;
      expect(sql).toContain('ON CONFLICT');
      expect(sql).toContain('DO NOTHING');
      expect(result).toHaveLength(1); // rows returned by INSERT
    });
  });

  describe('updateTraining', () => {
    it('sets completion_date when status is Completed', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ ...ET_ROW, status: 'Completed' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ ...ET_ROW, status: 'Completed' }], rowCount: 1 } as never);

      await TrainingService.updateTraining('et-1', 'Completed');

      const params = mockedQuery.mock.calls[0][1] as unknown[];
      expect(params[0]).toBe('Completed');
      expect(params[2]).toBeInstanceOf(Date); // completion_date set
    });

    it('keeps completion_date null when status is not Completed', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [ET_ROW], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [ET_ROW], rowCount: 1 } as never);

      await TrainingService.updateTraining('et-1', 'In Progress');

      const params = mockedQuery.mock.calls[0][1] as unknown[];
      expect(params[2]).toBeNull();
    });

    it('returns null when record not found', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await TrainingService.updateTraining('bad-id', 'Completed');

      expect(result).toBeNull();
    });
  });

  describe('deleteTraining', () => {
    it('soft-deletes by setting deleted_at', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      await TrainingService.deleteTraining('et-1');

      const sql = mockedQuery.mock.calls[0][0] as string;
      expect(sql).toContain('deleted_at = NOW()');
    });

    it('throws BusinessError when record not found or already deleted', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await expect(TrainingService.deleteTraining('bad-id')).rejects.toBeInstanceOf(BusinessError);
    });
  });

  // ===== ANALYTICS =====

  describe('getAnalytics', () => {
    it('returns aggregated training analytics', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ total: '5', active: '4' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ total: '20', completed: '12', overdue: '3' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ department: 'Engineering', total: '10', completed: '8' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ module_id: 'mod-1', title: 'Security Basics', total: '10', completed: '8' }], rowCount: 1 } as never);

      const result = await TrainingService.getAnalytics();

      expect(result.totalModules).toBe(5);
      expect(result.activeModules).toBe(4);
      expect(result.totalAssignments).toBe(20);
      expect(result.completionRate).toBe(60); // 12/20 * 100
      expect(result.overdueCount).toBe(3);
      expect(result.completionsByDepartment).toHaveLength(1);
      expect(result.completionsByDepartment[0].rate).toBe(80); // 8/10 * 100
      expect(result.completionsByModule).toHaveLength(1);
    });

    it('returns 0% completion rate when there are no assignments', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ total: '0', active: '0' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ total: '0', completed: '0', overdue: '0' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await TrainingService.getAnalytics();

      expect(result.completionRate).toBe(0);
    });
  });
});
