import bcrypt from 'bcrypt';
import { EmployeeService } from '../../services/EmployeeService';
import { query } from '../../db';
import pool from '../../db';
import SystemConfigService from '../../services/SystemConfigService';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('../../services/SystemConfigService');
jest.mock('../../services/JobHistoryService', () => ({
  __esModule: true,
  default: {
    autoCreateFromEmployeeUpdate: jest.fn().mockResolvedValue({ id: 'jh-mock' }),
  },
}));

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedSystemConfigService = SystemConfigService as jest.Mocked<typeof SystemConfigService>;

const mockClientQuery = jest.fn();
const mockClientRelease = jest.fn();
const mockClient = {
  query: mockClientQuery,
  release: mockClientRelease,
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pool as any).connect = jest.fn().mockResolvedValue(mockClient);

describe('EmployeeService', () => {
  let employeeService: EmployeeService;

  const mockEmployee = {
    id: 'emp-123',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Developer',
    department: 'Engineering',
    start_date: '2023-01-15',
    salary: 75000,
    avatar: 'https://ui-avatars.com/api/?name=John+Doe',
    status: 'Active',
    phone_number: '555-0123',
    address: '123 Main St',
  };

  beforeEach(() => {
    employeeService = new EmployeeService();
    jest.clearAllMocks();
  });

  describe('getAllEmployees', () => {
    it('should return all employees', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [mockEmployee, { ...mockEmployee, id: 'emp-456', name: 'Jane Doe' }],
        rowCount: 2,
      } as never);

      const result = await employeeService.getAllEmployees();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John Doe');
      expect(mockedQuery).toHaveBeenCalledTimes(1);
      const calledSql = (mockedQuery.mock.calls[0][0] as string).replace(/\s+/g, ' ').trim();
      expect(calledSql).toContain('FROM employees');
      expect(calledSql).toContain('ORDER BY name ASC');
    });

    it('should return empty array when no employees exist', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await employeeService.getAllEmployees();

      expect(result).toHaveLength(0);
    });
  });

  describe('getEmployeeById', () => {
    it('should return employee when found', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 } as never);

      const result = await employeeService.getEmployeeById('emp-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('emp-123');
      expect(result?.name).toBe('John Doe');
    });

    it('should return null when employee not found', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      const result = await employeeService.getEmployeeById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createEmployee', () => {
    const createData = {
      name: 'New Employee',
      email: 'new@example.com',
      role: 'Designer',
      department: 'Design',
      joinDate: '2024-01-01',
      salary: 65000,
    };

    it('should create employee successfully', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // check email
        .mockResolvedValueOnce({ rows: [{ next_num: 1 }], rowCount: 1 } as never) // employee_code
        .mockResolvedValueOnce({
          rows: [{ ...mockEmployee, ...createData, employee_code: 'EMP-0001' }],
          rowCount: 1,
        } as never); // insert

      mockedSystemConfigService.getDefaultPassword.mockResolvedValue('Welcome123!');
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await employeeService.createEmployee(createData);

      expect(result.name).toBe('New Employee');
      expect(result.email).toBe('new@example.com');
      expect(mockedBcrypt.hash).toHaveBeenCalled();
    });

    it('should throw error when email already exists', async () => {
      mockedQuery.mockResolvedValueOnce({
        rows: [{ id: 'existing-id' }],
        rowCount: 1,
      } as never);

      await expect(employeeService.createEmployee(createData)).rejects.toThrow(
        'Email already exists'
      );
    });

    it('should use provided password when given', async () => {
      const dataWithPassword = { ...createData, password: 'CustomPassword123!' };

      mockedQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // check email
        .mockResolvedValueOnce({ rows: [{ next_num: 5 }], rowCount: 1 } as never) // employee_code
        .mockResolvedValueOnce({
          rows: [{ ...mockEmployee, ...createData, employee_code: 'EMP-0005' }],
          rowCount: 1,
        } as never); // insert

      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed-custom-password');

      await employeeService.createEmployee(dataWithPassword);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('CustomPassword123!', 10);
    });

    it('should use default password when not provided', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // check email
        .mockResolvedValueOnce({ rows: [{ next_num: 10 }], rowCount: 1 } as never) // employee_code
        .mockResolvedValueOnce({
          rows: [{ ...mockEmployee, ...createData, employee_code: 'EMP-0010' }],
          rowCount: 1,
        } as never); // insert

      mockedSystemConfigService.getDefaultPassword.mockResolvedValue('DefaultPass123!');
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed-default-password');

      await employeeService.createEmployee(createData);

      expect(mockedSystemConfigService.getDefaultPassword).toHaveBeenCalled();
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('DefaultPass123!', 10);
    });
  });

  describe('updateEmployee', () => {
    it('should update employee successfully', async () => {
      const updatedEmployee = { ...mockEmployee, name: 'Updated Name' };

      mockedQuery
        .mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 } as never) // getEmployeeById
        .mockResolvedValueOnce({ rows: [updatedEmployee], rowCount: 1 } as never); // update

      const result = await employeeService.updateEmployee({
        id: 'emp-123',
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw error when employee not found', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await expect(
        employeeService.updateEmployee({ id: 'nonexistent', name: 'New Name' })
      ).rejects.toThrow('Employee not found');
    });

    it('should return existing employee when no updates provided', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 } as never);

      const result = await employeeService.updateEmployee({ id: 'emp-123' });

      expect(result.id).toBe('emp-123');
      // Only one query should be made (getEmployeeById)
      expect(mockedQuery).toHaveBeenCalledTimes(1);
    });

    it('should update role when set to empty string', async () => {
      const updatedEmployee = { ...mockEmployee, role: null };

      mockedQuery
        .mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 } as never) // getEmployeeById
        .mockResolvedValueOnce({ rows: [updatedEmployee], rowCount: 1 } as never); // UPDATE employees

      const result = await employeeService.updateEmployee({
        id: 'emp-123',
        role: '',
      });

      expect(result.role).toBeNull();
      // 2 queries: getEmployeeById + UPDATE (auto-tracking is mocked via JobHistoryService mock)
      expect(mockedQuery).toHaveBeenCalledTimes(2);
    });

    it('should update status field', async () => {
      const updatedEmployee = { ...mockEmployee, status: 'On Leave' };

      mockedQuery
        .mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 } as never) // getEmployeeById
        .mockResolvedValueOnce({ rows: [updatedEmployee], rowCount: 1 } as never); // update

      const result = await employeeService.updateEmployee({
        id: 'emp-123',
        status: 'On Leave',
      });

      expect(result.status).toBe('On Leave');
      expect(mockedQuery).toHaveBeenCalledTimes(2);
    });

    it('should reassign subordinates when terminating an active employee', async () => {
      const terminatedEmployee = { ...mockEmployee, status: 'Terminated' };

      mockedQuery
        .mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 } as never) // getEmployeeById (status=Active)
        .mockResolvedValueOnce({ rows: [{ manager_id: 'mgr-parent' }], rowCount: 1 } as never) // SELECT manager_id for reassign
        .mockResolvedValueOnce({ rows: [], rowCount: 2 } as never) // UPDATE subordinates
        .mockResolvedValueOnce({ rows: [terminatedEmployee], rowCount: 1 } as never); // UPDATE employee status

      const result = await employeeService.updateEmployee({
        id: 'emp-123',
        status: 'Terminated',
      });

      expect(result.status).toBe('Terminated');
      // Should have reassigned subordinates
      expect(mockedQuery).toHaveBeenCalledWith(
        'SELECT manager_id FROM employees WHERE id = $1',
        ['emp-123'],
      );
      expect(mockedQuery).toHaveBeenCalledWith(
        'UPDATE employees SET manager_id = $1 WHERE manager_id = $2',
        ['mgr-parent', 'emp-123'],
      );
    });

    it('should NOT reassign subordinates when employee is already terminated', async () => {
      const alreadyTerminated = { ...mockEmployee, status: 'Terminated' };
      const updatedEmployee = { ...alreadyTerminated, name: 'Updated Name' };

      mockedQuery
        .mockResolvedValueOnce({ rows: [alreadyTerminated], rowCount: 1 } as never) // getEmployeeById (already Terminated)
        .mockResolvedValueOnce({ rows: [updatedEmployee], rowCount: 1 } as never); // UPDATE

      const result = await employeeService.updateEmployee({
        id: 'emp-123',
        status: 'Terminated',
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      // Should NOT have reassigned subordinates (only 2 queries: getById + update)
      expect(mockedQuery).toHaveBeenCalledTimes(2);
    });

    it('should update multiple fields at once', async () => {
      const updatedEmployee = {
        ...mockEmployee,
        name: 'New Name',
        department: 'New Dept',
        salary: 80000,
      };

      mockedQuery
        .mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [updatedEmployee], rowCount: 1 } as never);

      const result = await employeeService.updateEmployee({
        id: 'emp-123',
        name: 'New Name',
        department: 'New Dept',
        salary: 80000,
      });

      expect(result.name).toBe('New Name');
      expect(result.department).toBe('New Dept');
      expect(result.salary).toBe(80000);
    });
  });

  describe('deleteEmployee', () => {
    beforeEach(() => {
      mockClientQuery.mockReset();
      mockClientRelease.mockReset();
    });

    it('should delete employee and reassign subordinates to parent manager', async () => {
      mockClientQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'emp-123', status: 'Active', manager_id: 'mgr-parent' }], rowCount: 1 }) // SELECT
        .mockResolvedValueOnce({ rows: [], rowCount: 2 }) // UPDATE subordinates
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE soft-delete
        .mockResolvedValueOnce({}); // COMMIT

      await expect(employeeService.deleteEmployee('emp-123')).resolves.not.toThrow();

      expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockClientQuery).toHaveBeenCalledWith(
        'SELECT id, status, manager_id FROM employees WHERE id = $1', ['emp-123'],
      );
      expect(mockClientQuery).toHaveBeenCalledWith(
        'UPDATE employees SET manager_id = $1 WHERE manager_id = $2',
        ['mgr-parent', 'emp-123'],
      );
      expect(mockClientQuery).toHaveBeenCalledWith(
        "UPDATE employees SET status = 'Terminated', manager_id = NULL WHERE id = $1",
        ['emp-123'],
      );
      expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
      expect(mockClientRelease).toHaveBeenCalled();
    });

    it('should set subordinates manager to null when deleting a root employee', async () => {
      mockClientQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'emp-root', status: 'Active', manager_id: null }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE subordinates
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE soft-delete
        .mockResolvedValueOnce({}); // COMMIT

      await expect(employeeService.deleteEmployee('emp-root')).resolves.not.toThrow();

      expect(mockClientQuery).toHaveBeenCalledWith(
        'UPDATE employees SET manager_id = $1 WHERE manager_id = $2',
        [null, 'emp-root'],
      );
      expect(mockClientRelease).toHaveBeenCalled();
    });

    it('should throw error when employee not found', async () => {
      mockClientQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // SELECT — not found

      await expect(employeeService.deleteEmployee('nonexistent')).rejects.toThrow(
        'Employee not found'
      );
      expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClientRelease).toHaveBeenCalled();
    });
  });
});
