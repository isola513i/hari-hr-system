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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../db");
const SystemConfigService_1 = __importDefault(require("./SystemConfigService"));
const pagination_1 = require("../utils/pagination");
class EmployeeService {
    /**
     * Get all employees (no pagination - for backward compatibility)
     */
    getAllEmployees() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)('SELECT * FROM employees ORDER BY name ASC');
            return result.rows.map(this.mapRowToEmployee);
        });
    }
    /**
     * Get employees with pagination and filtering
     */
    getEmployeesPaginated(params_1) {
        return __awaiter(this, arguments, void 0, function* (params, filters = {}, sortField = 'name', sortOrder = 'ASC') {
            const { limit, offset } = params;
            const { department, status, search } = filters;
            // Build WHERE clause
            const conditions = [];
            const values = [];
            let paramIndex = 1;
            if (department) {
                conditions.push(`department = $${paramIndex++}`);
                values.push(department);
            }
            if (status) {
                conditions.push(`status = $${paramIndex++}`);
                values.push(status);
            }
            if (search) {
                conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR role ILIKE $${paramIndex})`);
                values.push(`%${search}%`);
                paramIndex++;
            }
            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            // Validate sort field to prevent SQL injection
            const allowedSortFields = ['name', 'email', 'department', 'role', 'status', 'join_date', 'created_at'];
            const safeSortField = allowedSortFields.includes(sortField) ? sortField : 'name';
            const safeSortOrder = sortOrder === 'DESC' ? 'DESC' : 'ASC';
            // Get total count
            const countResult = yield (0, db_1.query)(`SELECT COUNT(*) as total FROM employees ${whereClause}`, values);
            const total = parseInt(countResult.rows[0].total, 10);
            // Get paginated data
            const dataResult = yield (0, db_1.query)(`SELECT * FROM employees ${whereClause}
             ORDER BY ${safeSortField} ${safeSortOrder}
             LIMIT $${paramIndex++} OFFSET $${paramIndex}`, [...values, limit, offset]);
            const employees = dataResult.rows.map(this.mapRowToEmployee);
            return (0, pagination_1.createPaginatedResult)(employees, total, params);
        });
    }
    getEmployeeById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)('SELECT * FROM employees WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToEmployee(result.rows[0]);
        });
    }
    createEmployee(employeeData) {
        return __awaiter(this, void 0, void 0, function* () {
            const { name, email, role, department, startDate, salary, password } = employeeData;
            // Check if email already exists
            const existingEmployee = yield (0, db_1.query)('SELECT id FROM employees WHERE email = $1', [email]);
            if (existingEmployee.rows.length > 0) {
                throw new Error('Email already exists');
            }
            // Hash password - use default from config if not provided
            const defaultPassword = yield SystemConfigService_1.default.getDefaultPassword();
            const hashedPassword = password
                ? yield bcrypt_1.default.hash(password, 10)
                : yield bcrypt_1.default.hash(defaultPassword, 10);
            // Generate avatar
            const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
            // Insert employee
            const result = yield (0, db_1.query)(`INSERT INTO employees (name, email, role, department, join_date, avatar, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`, [name, email, role, department, startDate, avatar, 'Active']);
            return this.mapRowToEmployee(result.rows[0]);
        });
    }
    updateEmployee(updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            const { id } = updateData, data = __rest(updateData, ["id"]);
            // Check if employee exists
            const existing = yield this.getEmployeeById(id);
            if (!existing) {
                throw new Error('Employee not found');
            }
            // Build update query dynamically
            const updates = [];
            const values = [];
            let paramIndex = 1;
            if (data.name) {
                updates.push(`name = $${paramIndex++}`);
                values.push(data.name);
            }
            if (data.email) {
                updates.push(`email = $${paramIndex++}`);
                values.push(data.email);
            }
            if (data.role) {
                updates.push(`role = $${paramIndex++}`);
                values.push(data.role);
            }
            if (data.department) {
                updates.push(`department = $${paramIndex++}`);
                values.push(data.department);
            }
            if (data.salary) {
                updates.push(`salary = $${paramIndex++}`);
                values.push(data.salary);
            }
            if (data.startDate) {
                updates.push(`join_date = $${paramIndex++}`);
                values.push(data.startDate);
            }
            if (data.bio !== undefined) {
                updates.push(`bio = $${paramIndex++}`);
                values.push(data.bio);
            }
            if (data.phone !== undefined) {
                updates.push(`phone = $${paramIndex++}`);
                values.push(data.phone);
            }
            if (data.avatar) {
                updates.push(`avatar = $${paramIndex++}`);
                values.push(data.avatar);
            }
            if (data.location !== undefined) {
                updates.push(`location = $${paramIndex++}`);
                values.push(data.location);
            }
            if (data.slack !== undefined) {
                updates.push(`slack = $${paramIndex++}`);
                values.push(data.slack);
            }
            if (data.emergencyContact !== undefined) {
                updates.push(`emergency_contact = $${paramIndex++}`);
                values.push(data.emergencyContact);
            }
            if (data.skills !== undefined) {
                updates.push(`skills = $${paramIndex++}`);
                values.push(data.skills);
            }
            if (updates.length === 0) {
                return existing;
            }
            values.push(id);
            const updateQuery = `UPDATE employees SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
            const result = yield (0, db_1.query)(updateQuery, values);
            return this.mapRowToEmployee(result.rows[0]);
        });
    }
    deleteEmployee(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)('DELETE FROM employees WHERE id = $1', [id]);
            if (result.rowCount === 0) {
                throw new Error('Employee not found');
            }
        });
    }
    mapRowToEmployee(row) {
        return {
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            department: row.department,
            startDate: row.join_date,
            salary: row.salary,
            avatar: row.avatar,
            status: row.status,
            bio: row.bio,
            phone: row.phone,
            phoneNumber: row.phone_number,
            address: row.address,
            location: row.location,
            slack: row.slack,
            emergencyContact: row.emergency_contact,
            managerId: row.manager_id,
            skills: row.skills,
        };
    }
    /**
     * Get employee's manager
     */
    getManager(employeeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)(`SELECT m.* FROM employees e
             JOIN employees m ON e.manager_id = m.id
             WHERE e.id = $1`, [employeeId]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToEmployee(result.rows[0]);
        });
    }
    /**
     * Get employee's direct reports
     */
    getDirectReports(employeeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)(`SELECT * FROM employees WHERE manager_id = $1 ORDER BY name ASC`, [employeeId]);
            return result.rows.map(this.mapRowToEmployee);
        });
    }
}
exports.EmployeeService = EmployeeService;
exports.default = new EmployeeService();
