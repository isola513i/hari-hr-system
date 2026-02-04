import bcrypt from 'bcrypt';
import { query } from '../db';
import { Employee, CreateEmployeeDTO, UpdateEmployeeDTO } from '../models/Employee';
import SystemConfigService from './SystemConfigService';
import { PaginationParams, PaginatedResult, createPaginatedResult } from '../utils/pagination';

export interface EmployeeFilters {
    department?: string;
    status?: string;
    search?: string;
}

export class EmployeeService {
    /**
     * Get all employees (no pagination - for backward compatibility)
     */
    async getAllEmployees(): Promise<Employee[]> {
        const result = await query('SELECT * FROM employees ORDER BY name ASC');
        return result.rows.map(this.mapRowToEmployee);
    }

    /**
     * Get employees with pagination and filtering
     */
    async getEmployeesPaginated(
        params: PaginationParams,
        filters: EmployeeFilters = {},
        sortField: string = 'name',
        sortOrder: 'ASC' | 'DESC' = 'ASC'
    ): Promise<PaginatedResult<Employee>> {
        const { limit, offset } = params;
        const { department, status, search } = filters;

        // Build WHERE clause
        const conditions: string[] = [];
        const values: unknown[] = [];
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
        const countResult = await query(
            `SELECT COUNT(*) as total FROM employees ${whereClause}`,
            values
        );
        const total = parseInt(countResult.rows[0].total, 10);

        // Get paginated data
        const dataResult = await query(
            `SELECT * FROM employees ${whereClause}
             ORDER BY ${safeSortField} ${safeSortOrder}
             LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
            [...values, limit, offset]
        );

        const employees = dataResult.rows.map(this.mapRowToEmployee);
        return createPaginatedResult(employees, total, params);
    }

    async getEmployeeById(id: string): Promise<Employee | null> {
        const result = await query('SELECT * FROM employees WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToEmployee(result.rows[0]);
    }

    async createEmployee(employeeData: CreateEmployeeDTO): Promise<Employee> {
        const { name, email, role, department, startDate, salary, password } = employeeData;

        // Check if email already exists
        const existingEmployee = await query(
            'SELECT id FROM employees WHERE email = $1',
            [email]
        );

        if (existingEmployee.rows.length > 0) {
            throw new Error('Email already exists');
        }

        // Hash password - use default from config if not provided
        const defaultPassword = await SystemConfigService.getDefaultPassword();
        const hashedPassword = password
            ? await bcrypt.hash(password, 10)
            : await bcrypt.hash(defaultPassword, 10);

        // Generate avatar
        const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

        // Insert employee
        const result = await query(
            `INSERT INTO employees (name, email, role, department, join_date, avatar, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [name, email, role, department, startDate, avatar, 'Active']
        );

        return this.mapRowToEmployee(result.rows[0]);
    }

    async updateEmployee(updateData: UpdateEmployeeDTO): Promise<Employee> {
        const { id, ...data } = updateData;

        // Check if employee exists
        const existing = await this.getEmployeeById(id);
        if (!existing) {
            throw new Error('Employee not found');
        }

        // Build update query dynamically
        const updates: string[] = [];
        const values: any[] = [];
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

        const result = await query(updateQuery, values);
        return this.mapRowToEmployee(result.rows[0]);
    }

    async deleteEmployee(id: string): Promise<void> {
        const result = await query('DELETE FROM employees WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            throw new Error('Employee not found');
        }
    }

    private mapRowToEmployee(row: any): Employee {
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
    async getManager(employeeId: string): Promise<Employee | null> {
        const result = await query(
            `SELECT m.* FROM employees e
             JOIN employees m ON e.manager_id = m.id
             WHERE e.id = $1`,
            [employeeId]
        );
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToEmployee(result.rows[0]);
    }

    /**
     * Get employee's direct reports
     */
    async getDirectReports(employeeId: string): Promise<Employee[]> {
        const result = await query(
            `SELECT * FROM employees WHERE manager_id = $1 ORDER BY name ASC`,
            [employeeId]
        );
        return result.rows.map(this.mapRowToEmployee);
    }
}

export default new EmployeeService();
