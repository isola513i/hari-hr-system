import bcrypt from 'bcrypt';
import pool, { query } from '../db';
import { Employee, CreateEmployeeDTO, UpdateEmployeeDTO } from '../models/Employee';
import SystemConfigService from './SystemConfigService';
import { PaginationParams, PaginatedResult, createPaginatedResult } from '../utils/pagination';
import JobHistoryService from './JobHistoryService';

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
        const result = await query(
            `SELECT e.*,
                CASE
                    WHEN e.status = 'Active' AND EXISTS (
                        SELECT 1 FROM leave_requests lr
                        WHERE lr.employee_id = e.id
                          AND lr.status = 'Approved'
                          AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date
                    ) THEN 'On Leave'
                    ELSE e.status
                END AS effective_status
             FROM employees e
             WHERE e.status != 'Terminated'
             ORDER BY name ASC`
        );
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

        // Effective status computed via leave_requests
        const effectiveStatusExpr = `
            CASE
                WHEN e.status = 'Active' AND EXISTS (
                    SELECT 1 FROM leave_requests lr
                    WHERE lr.employee_id = e.id
                      AND lr.status = 'Approved'
                      AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date
                ) THEN 'On Leave'
                ELSE e.status
            END`;

        if (department) {
            conditions.push(`e.department = $${paramIndex++}`);
            values.push(department);
        }
        if (status) {
            // Filter by effective status (accounts for employees on approved leave today)
            conditions.push(`(${effectiveStatusExpr}) = $${paramIndex++}`);
            values.push(status);
        } else {
            // By default, exclude terminated employees from listings
            conditions.push(`e.status != 'Terminated'`);
        }
        if (search) {
            conditions.push(`(e.name ILIKE $${paramIndex} OR e.email ILIKE $${paramIndex} OR e.role ILIKE $${paramIndex})`);
            values.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Validate sort field to prevent SQL injection
        const allowedSortFields = ['name', 'email', 'department', 'role', 'status', 'join_date', 'created_at'];
        const safeSortField = allowedSortFields.includes(sortField) ? `e.${sortField}` : 'e.name';
        const safeSortOrder = sortOrder === 'DESC' ? 'DESC' : 'ASC';

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM employees e ${whereClause}`,
            values
        );
        const total = parseInt(countResult.rows[0].total, 10);

        // Get paginated data
        const dataResult = await query(
            `SELECT e.*, (${effectiveStatusExpr}) AS effective_status
             FROM employees e ${whereClause}
             ORDER BY ${safeSortField} ${safeSortOrder}
             LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
            [...values, limit, offset]
        );

        const employees = dataResult.rows.map(this.mapRowToEmployee);
        return createPaginatedResult(employees, total, params);
    }

    async getEmployeeById(id: string): Promise<Employee | null> {
        const result = await query(
            `SELECT e.*,
                CASE
                    WHEN e.status = 'Active' AND EXISTS (
                        SELECT 1 FROM leave_requests lr
                        WHERE lr.employee_id = e.id
                          AND lr.status = 'Approved'
                          AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date
                    ) THEN 'On Leave'
                    ELSE e.status
                END AS effective_status
             FROM employees e
             WHERE e.id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToEmployee(result.rows[0]);
    }

    async createEmployee(employeeData: CreateEmployeeDTO): Promise<Employee> {
        const { name, email, role, department, joinDate, salary, password } = employeeData;

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

        // Auto-generate employee_code
        const codeResult = await query(
            `SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code FROM 5) AS INTEGER)), 0) + 1 AS next_num FROM employees WHERE employee_code LIKE 'EMP-%'`
        );
        const nextNum = codeResult.rows[0].next_num;
        const employeeCode = `EMP-${String(nextNum).padStart(4, '0')}`;

        // Insert employee
        const result = await query(
            `INSERT INTO employees (name, email, role, department, join_date, avatar, status, employee_code)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [name, email, role, department, joinDate, avatar, 'Active', employeeCode]
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
        if (data.role !== undefined) {
            updates.push(`role = $${paramIndex++}`);
            values.push(data.role || null);
        }
        if (data.department) {
            updates.push(`department = $${paramIndex++}`);
            values.push(data.department);
        }
        if (data.salary) {
            updates.push(`salary = $${paramIndex++}`);
            values.push(data.salary);
        }
        if (data.joinDate) {
            updates.push(`join_date = $${paramIndex++}`);
            values.push(data.joinDate);
        }
        if (data.birthDate !== undefined) {
            updates.push(`birth_date = $${paramIndex++}`);
            values.push(data.birthDate || null);
        }
        if (data.bio !== undefined) {
            updates.push(`bio = $${paramIndex++}`);
            values.push(data.bio);
        }
        if (data.phone !== undefined) {
            updates.push(`phone = $${paramIndex++}`);
            values.push(data.phone);
        }
        if (data.avatar && !data.avatar.startsWith('blob:')) {
            // Normalize: strip any absolute host prefix so we always store relative paths
            let avatarPath = data.avatar;
            const uploadIdx = avatarPath.indexOf('/uploads/');
            if (uploadIdx > 0) {
                avatarPath = avatarPath.slice(uploadIdx);
            }
            updates.push(`avatar = $${paramIndex++}`);
            values.push(avatarPath);
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
        if (data.managerId !== undefined) {
            updates.push(`manager_id = $${paramIndex++}`);
            values.push(data.managerId || null);
        }
        if (data.employeeCode !== undefined) {
            updates.push(`employee_code = $${paramIndex++}`);
            values.push(data.employeeCode);
        }
        if (data.address !== undefined) {
            updates.push(`address = $${paramIndex++}`);
            values.push(data.address || null);
        }
        if (data.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(data.status);
        }
        if (data.bannerColor !== undefined) {
            updates.push(`banner_color = $${paramIndex++}`);
            values.push(data.bannerColor || null);
        }
        if (data.workType !== undefined) {
            updates.push(`work_type = $${paramIndex++}`);
            values.push(data.workType);
        }

        if (updates.length === 0) {
            return existing;
        }

        // If terminating, reassign subordinates to the employee's manager
        if (data.status === 'Terminated' && existing.status !== 'Terminated') {
            const emp = await query('SELECT manager_id FROM employees WHERE id = $1', [id]);
            const parentManagerId: string | null = emp.rows[0]?.manager_id || null;
            await query(
                'UPDATE employees SET manager_id = $1 WHERE manager_id = $2',
                [parentManagerId, id],
            );
        }

        // Detect role/department changes for auto-tracking
        const roleChanged = data.role !== undefined && data.role !== existing.role;
        const deptChanged = data.department !== undefined && data.department !== existing.department;

        values.push(id);
        const updateQuery = `UPDATE employees SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

        const result = await query(updateQuery, values);
        const updated = this.mapRowToEmployee(result.rows[0]);

        // Auto-create job history when role or department changes
        if (roleChanged || deptChanged) {
            try {
                await JobHistoryService.autoCreateFromEmployeeUpdate(
                    id,
                    existing.role || '',
                    existing.department || '',
                    updated.role || existing.role || '',
                    updated.department || existing.department || '',
                );
            } catch (err) {
                console.error('Failed to auto-create job history:', err);
                // Non-blocking: employee update still succeeds
            }
        }

        return updated;
    }

    async deleteEmployee(id: string): Promise<void> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const emp = await client.query('SELECT id, status, manager_id FROM employees WHERE id = $1', [id]);
            if (emp.rowCount === 0) {
                throw new Error('Employee not found');
            }
            if (emp.rows[0].status === 'Terminated') {
                throw new Error('Employee is already terminated');
            }

            const parentManagerId: string | null = emp.rows[0].manager_id || null;

            // Reassign subordinates to the terminated employee's manager (move up one level)
            await client.query(
                'UPDATE employees SET manager_id = $1 WHERE manager_id = $2',
                [parentManagerId, id],
            );

            // Soft-delete: set status to Terminated to preserve historical data
            await client.query(
                "UPDATE employees SET status = 'Terminated', manager_id = NULL WHERE id = $1",
                [id],
            );

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    private mapRowToEmployee(row: any): Employee {
        return {
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            department: row.department,
            joinDate: row.join_date || row.created_at,
            birthDate: row.birth_date || null,
            salary: row.salary,
            avatar: row.avatar,
            status: row.effective_status || row.status,
            bio: row.bio,
            phone: row.phone,
            phoneNumber: row.phone_number,
            employeeCode: row.employee_code,
            address: row.address,
            location: row.location,
            slack: row.slack,
            emergencyContact: row.emergency_contact,
            managerId: row.manager_id,
            skills: row.skills,
            onboardingStatus: row.onboarding_status || 'Not Started',
            onboardingPercentage: row.onboarding_percentage || 0,
            bannerColor: row.banner_color || null,
            workType: row.work_type || 'office',
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
