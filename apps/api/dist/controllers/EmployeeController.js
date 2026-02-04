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
exports.EmployeeController = void 0;
const EmployeeService_1 = __importDefault(require("../services/EmployeeService"));
const pagination_1 = require("../utils/pagination");
class EmployeeController {
    /**
     * Get all employees with optional pagination
     * Query params: page, limit, department, status, search, sortBy, sortOrder
     */
    getAllEmployees(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if pagination is requested
                const usePagination = req.query.page !== undefined || req.query.limit !== undefined;
                if (usePagination) {
                    const paginationParams = (0, pagination_1.getPaginationParams)(req);
                    const sortParams = (0, pagination_1.getSortParams)(req, ['name', 'email', 'department', 'role', 'status', 'join_date', 'created_at'], 'name', 'ASC');
                    const filters = {
                        department: req.query.department,
                        status: req.query.status,
                        search: req.query.search,
                    };
                    const result = yield EmployeeService_1.default.getEmployeesPaginated(paginationParams, filters, sortParams.field, sortParams.order);
                    res.json(result);
                }
                else {
                    // Backward compatibility: return all employees without pagination
                    const employees = yield EmployeeService_1.default.getAllEmployees();
                    res.json(employees);
                }
            }
            catch (error) {
                console.error('Get employees error:', error);
                res.status(500).json({ error: 'Failed to fetch employees' });
            }
        });
    }
    getEmployeeById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const employee = yield EmployeeService_1.default.getEmployeeById(id);
                if (!employee) {
                    res.status(404).json({ error: 'Employee not found' });
                    return;
                }
                res.json(employee);
            }
            catch (error) {
                console.error('Get employee error:', error);
                res.status(500).json({ error: 'Failed to fetch employee' });
            }
        });
    }
    createEmployee(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const employeeData = req.body;
                // Validate required fields
                if (!employeeData.name || !employeeData.email || !employeeData.role || !employeeData.department) {
                    res.status(400).json({ error: 'Missing required fields' });
                    return;
                }
                const employee = yield EmployeeService_1.default.createEmployee(employeeData);
                res.status(201).json(employee);
            }
            catch (error) {
                console.error('Create employee error:', error);
                res.status(400).json({ error: error.message || 'Failed to create employee' });
            }
        });
    }
    updateEmployee(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const user = req.user;
                // Check if user is updating their own profile
                const isOwnProfile = (user === null || user === void 0 ? void 0 : user.employeeId) === id;
                const isAdmin = (user === null || user === void 0 ? void 0 : user.role) === 'HR_ADMIN';
                // If not admin and not own profile, deny access
                if (!isAdmin && !isOwnProfile) {
                    res.status(403).json({ error: 'You can only update your own profile' });
                    return;
                }
                // If employee updating own profile, restrict fields they can update
                let updateData = Object.assign({ id }, req.body);
                if (!isAdmin && isOwnProfile) {
                    // Employees can only update: name, email, avatar, bio, phone, location, slack, emergencyContact, skills
                    const allowedFields = ['name', 'email', 'avatar', 'bio', 'phone', 'location', 'slack', 'emergencyContact', 'skills'];
                    updateData = Object.assign({ id }, Object.fromEntries(Object.entries(req.body).filter(([key]) => allowedFields.includes(key))));
                }
                const employee = yield EmployeeService_1.default.updateEmployee(updateData);
                res.json(employee);
            }
            catch (error) {
                console.error('Update employee error:', error);
                if (error.message === 'Employee not found') {
                    res.status(404).json({ error: error.message });
                }
                else {
                    res.status(400).json({ error: error.message || 'Failed to update employee' });
                }
            }
        });
    }
    deleteEmployee(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                yield EmployeeService_1.default.deleteEmployee(id);
                res.json({ message: 'Employee deleted successfully' });
            }
            catch (error) {
                console.error('Delete employee error:', error);
                if (error.message === 'Employee not found') {
                    res.status(404).json({ error: error.message });
                }
                else {
                    res.status(500).json({ error: 'Failed to delete employee' });
                }
            }
        });
    }
    getEmployeeManager(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const manager = yield EmployeeService_1.default.getManager(id);
                if (!manager) {
                    res.status(404).json({ error: 'Manager not found' });
                    return;
                }
                res.json(manager);
            }
            catch (error) {
                console.error('Get manager error:', error);
                res.status(500).json({ error: 'Failed to fetch manager' });
            }
        });
    }
    getEmployeeDirectReports(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const directReports = yield EmployeeService_1.default.getDirectReports(id);
                res.json(directReports);
            }
            catch (error) {
                console.error('Get direct reports error:', error);
                res.status(500).json({ error: 'Failed to fetch direct reports' });
            }
        });
    }
}
exports.EmployeeController = EmployeeController;
exports.default = new EmployeeController();
