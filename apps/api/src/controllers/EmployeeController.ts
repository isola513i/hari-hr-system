import { Request, Response } from 'express';
import EmployeeService from '../services/EmployeeService';

export class EmployeeController {
    async getAllEmployees(req: Request, res: Response): Promise<void> {
        try {
            const employees = await EmployeeService.getAllEmployees();
            res.json(employees);
        } catch (error: any) {
            console.error('Get employees error:', error);
            res.status(500).json({ error: 'Failed to fetch employees' });
        }
    }

    async getEmployeeById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const employee = await EmployeeService.getEmployeeById(id);

            if (!employee) {
                res.status(404).json({ error: 'Employee not found' });
                return;
            }

            res.json(employee);
        } catch (error: any) {
            console.error('Get employee error:', error);
            res.status(500).json({ error: 'Failed to fetch employee' });
        }
    }

    async createEmployee(req: Request, res: Response): Promise<void> {
        try {
            const employeeData = req.body;

            // Validate required fields
            if (!employeeData.name || !employeeData.email || !employeeData.role || !employeeData.department) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            const employee = await EmployeeService.createEmployee(employeeData);
            res.status(201).json(employee);
        } catch (error: any) {
            console.error('Create employee error:', error);
            res.status(400).json({ error: error.message || 'Failed to create employee' });
        }
    }

    async updateEmployee(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updateData = { id, ...req.body };

            const employee = await EmployeeService.updateEmployee(updateData);
            res.json(employee);
        } catch (error: any) {
            console.error('Update employee error:', error);
            if (error.message === 'Employee not found') {
                res.status(404).json({ error: error.message });
            } else {
                res.status(400).json({ error: error.message || 'Failed to update employee' });
            }
        }
    }

    async deleteEmployee(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            await EmployeeService.deleteEmployee(id);
            res.json({ message: 'Employee deleted successfully' });
        } catch (error: any) {
            console.error('Delete employee error:', error);
            if (error.message === 'Employee not found') {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Failed to delete employee' });
            }
        }
    }
}

export default new EmployeeController();
