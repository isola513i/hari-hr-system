import bcrypt from 'bcrypt';
import { EmployeeService } from '../../services/EmployeeService';
import { query } from '../../db';
import SystemConfigService from '../../services/SystemConfigService';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('../../services/SystemConfigService');

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedSystemConfigService = SystemConfigService as jest.Mocked<typeof SystemConfigService>;

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
      expect(mockedQuery).toHaveBeenCalledWith('SELECT * FROM employees ORDER BY name ASC');
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
      startDate: '2024-01-01',
      salary: 65000,
    };

    it('should create employee successfully', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // check email
        .mockResolvedValueOnce({
          rows: [{ ...mockEmployee, ...createData }],
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
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({
          rows: [{ ...mockEmployee, ...createData }],
          rowCount: 1,
        } as never);

      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed-custom-password');

      await employeeService.createEmployee(dataWithPassword);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('CustomPassword123!', 10);
    });

    it('should use default password when not provided', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({
          rows: [{ ...mockEmployee, ...createData }],
          rowCount: 1,
        } as never);

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
    it('should delete employee successfully', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      await expect(employeeService.deleteEmployee('emp-123')).resolves.not.toThrow();

      expect(mockedQuery).toHaveBeenCalledWith('DELETE FROM employees WHERE id = $1', ['emp-123']);
    });

    it('should throw error when employee not found', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await expect(employeeService.deleteEmployee('nonexistent')).rejects.toThrow(
        'Employee not found'
      );
    });
  });
});
