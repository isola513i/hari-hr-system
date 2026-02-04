"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const EmployeeService_1 = require("../../services/EmployeeService");
const db_1 = require("../../db");
const SystemConfigService_1 = __importDefault(require("../../services/SystemConfigService"));
// Mock dependencies
jest.mock('bcrypt');
jest.mock('../../services/SystemConfigService');
const mockedQuery = db_1.query;
const mockedBcrypt = bcrypt_1.default;
const mockedSystemConfigService = SystemConfigService_1.default;
describe('EmployeeService', () => {
    let employeeService;
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
        employeeService = new EmployeeService_1.EmployeeService();
        jest.clearAllMocks();
    });
    describe('getAllEmployees', () => {
        it('should return all employees', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery.mockResolvedValueOnce({
                rows: [mockEmployee, Object.assign(Object.assign({}, mockEmployee), { id: 'emp-456', name: 'Jane Doe' })],
                rowCount: 2,
            });
            const result = yield employeeService.getAllEmployees();
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('John Doe');
            expect(mockedQuery).toHaveBeenCalledWith('SELECT * FROM employees ORDER BY name ASC');
        }));
        it('should return empty array when no employees exist', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            const result = yield employeeService.getAllEmployees();
            expect(result).toHaveLength(0);
        }));
    });
    describe('getEmployeeById', () => {
        it('should return employee when found', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery.mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 });
            const result = yield employeeService.getEmployeeById('emp-123');
            expect(result).not.toBeNull();
            expect(result === null || result === void 0 ? void 0 : result.id).toBe('emp-123');
            expect(result === null || result === void 0 ? void 0 : result.name).toBe('John Doe');
        }));
        it('should return null when employee not found', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            const result = yield employeeService.getEmployeeById('nonexistent');
            expect(result).toBeNull();
        }));
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
        it('should create employee successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery
                .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // check email
                .mockResolvedValueOnce({
                rows: [Object.assign(Object.assign({}, mockEmployee), createData)],
                rowCount: 1,
            }); // insert
            mockedSystemConfigService.getDefaultPassword.mockResolvedValue('Welcome123!');
            mockedBcrypt.hash.mockResolvedValue('hashed-password');
            const result = yield employeeService.createEmployee(createData);
            expect(result.name).toBe('New Employee');
            expect(result.email).toBe('new@example.com');
            expect(mockedBcrypt.hash).toHaveBeenCalled();
        }));
        it('should throw error when email already exists', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery.mockResolvedValueOnce({
                rows: [{ id: 'existing-id' }],
                rowCount: 1,
            });
            yield expect(employeeService.createEmployee(createData)).rejects.toThrow('Email already exists');
        }));
        it('should use provided password when given', () => __awaiter(void 0, void 0, void 0, function* () {
            const dataWithPassword = Object.assign(Object.assign({}, createData), { password: 'CustomPassword123!' });
            mockedQuery
                .mockResolvedValueOnce({ rows: [], rowCount: 0 })
                .mockResolvedValueOnce({
                rows: [Object.assign(Object.assign({}, mockEmployee), createData)],
                rowCount: 1,
            });
            mockedBcrypt.hash.mockResolvedValue('hashed-custom-password');
            yield employeeService.createEmployee(dataWithPassword);
            expect(mockedBcrypt.hash).toHaveBeenCalledWith('CustomPassword123!', 10);
        }));
        it('should use default password when not provided', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery
                .mockResolvedValueOnce({ rows: [], rowCount: 0 })
                .mockResolvedValueOnce({
                rows: [Object.assign(Object.assign({}, mockEmployee), createData)],
                rowCount: 1,
            });
            mockedSystemConfigService.getDefaultPassword.mockResolvedValue('DefaultPass123!');
            mockedBcrypt.hash.mockResolvedValue('hashed-default-password');
            yield employeeService.createEmployee(createData);
            expect(mockedSystemConfigService.getDefaultPassword).toHaveBeenCalled();
            expect(mockedBcrypt.hash).toHaveBeenCalledWith('DefaultPass123!', 10);
        }));
    });
    describe('updateEmployee', () => {
        it('should update employee successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const updatedEmployee = Object.assign(Object.assign({}, mockEmployee), { name: 'Updated Name' });
            mockedQuery
                .mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 }) // getEmployeeById
                .mockResolvedValueOnce({ rows: [updatedEmployee], rowCount: 1 }); // update
            const result = yield employeeService.updateEmployee({
                id: 'emp-123',
                name: 'Updated Name',
            });
            expect(result.name).toBe('Updated Name');
        }));
        it('should throw error when employee not found', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            yield expect(employeeService.updateEmployee({ id: 'nonexistent', name: 'New Name' })).rejects.toThrow('Employee not found');
        }));
        it('should return existing employee when no updates provided', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery.mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 });
            const result = yield employeeService.updateEmployee({ id: 'emp-123' });
            expect(result.id).toBe('emp-123');
            // Only one query should be made (getEmployeeById)
            expect(mockedQuery).toHaveBeenCalledTimes(1);
        }));
        it('should update multiple fields at once', () => __awaiter(void 0, void 0, void 0, function* () {
            const updatedEmployee = Object.assign(Object.assign({}, mockEmployee), { name: 'New Name', department: 'New Dept', salary: 80000 });
            mockedQuery
                .mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 })
                .mockResolvedValueOnce({ rows: [updatedEmployee], rowCount: 1 });
            const result = yield employeeService.updateEmployee({
                id: 'emp-123',
                name: 'New Name',
                department: 'New Dept',
                salary: 80000,
            });
            expect(result.name).toBe('New Name');
            expect(result.department).toBe('New Dept');
            expect(result.salary).toBe(80000);
        }));
    });
    describe('deleteEmployee', () => {
        it('should delete employee successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
            yield expect(employeeService.deleteEmployee('emp-123')).resolves.not.toThrow();
            expect(mockedQuery).toHaveBeenCalledWith('DELETE FROM employees WHERE id = $1', ['emp-123']);
        }));
        it('should throw error when employee not found', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            yield expect(employeeService.deleteEmployee('nonexistent')).rejects.toThrow('Employee not found');
        }));
    });
});
