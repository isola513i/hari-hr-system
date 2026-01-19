import bcrypt from 'bcrypt';
import { query } from '../db';
import { Employee, CreateEmployeeDTO, UpdateEmployeeDTO } from '../models/Employee';

export class EmployeeService {
    async getAllEmployees(): Promise<Employee[]> {
        const result = await query('SELECT * FROM employees ORDER BY name ASC');
        return result.rows.map(this.mapRowToEmployee);
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

        // Hash password
        const hashedPassword = password
            ? await bcrypt.hash(password, 10)
            : await bcrypt.hash('employee123', 10); // Default password

        // Generate avatar
        const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

        // Insert employee
        const result = await query(
            `INSERT INTO employees (name, email, role, department, start_date, salary, password, avatar, status, user_role)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [name, email, role, department, startDate, salary || 50000, hashedPassword, avatar, 'Active', 'EMPLOYEE']
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
            updates.push(`start_date = $${paramIndex++}`);
            values.push(data.startDate);
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
            startDate: row.start_date,
            salary: row.salary,
            avatar: row.avatar,
            status: row.status,
            phoneNumber: row.phone_number,
            address: row.address,
        };
    }
}

export default new EmployeeService();
