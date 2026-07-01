import { Request, Response } from 'express';
import EmployeeService from '../services/EmployeeService';
import { getPaginationParams, getSortParams } from '../utils/pagination';
import AuditLogService from '../services/AuditLogService';
import { AppError } from '../utils/errorResponse';
import logger from '../utils/logger';

export class EmployeeController {
    /**
     * Get all employees with optional pagination
     * Query params: page, limit, department, status, search, sortBy, sortOrder
     */
    async getAllEmployees(req: Request, res: Response): Promise<void> {
        try {
            // Check if pagination is requested
            const usePagination = req.query.page !== undefined || req.query.limit !== undefined;

            if (usePagination) {
                const paginationParams = getPaginationParams(req);
                const sortParams = getSortParams(
                    req,
                    ['name', 'email', 'department', 'role', 'status', 'join_date', 'created_at'],
                    'name',
                    'ASC'
                );

                const filters = {
                    department: req.query.department as string | undefined,
                    status: req.query.status as string | undefined,
                    search: req.query.search as string | undefined,
                };

                const result = await EmployeeService.getEmployeesPaginated(
                    paginationParams,
                    filters,
                    sortParams.field,
                    sortParams.order
                );

                res.json(result);
            } else {
                // Backward compatibility: return all employees without pagination
                const employees = await EmployeeService.getAllEmployees();
                res.json(employees);
            }
        } catch (error: unknown) {
            logger.error(error, 'Get employees error:');
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
            logger.error(error, 'Get employee error:');
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
            logger.error(error, 'Create employee error:');
            res.status(400).json({ error: error.message || 'Failed to create employee' });
        }
    }

    async updateEmployee(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user = (req as any).user;

            // Check if user is updating their own profile
            const isOwnProfile = user?.employeeId === id;
            const isAdmin = user?.role === 'HR_ADMIN';

            // If not admin and not own profile, deny access
            if (!isAdmin && !isOwnProfile) {
                res.status(403).json({ error: 'You can only update your own profile' });
                return;
            }

            // If employee updating own profile, restrict fields they can update
            let updateData = { id, ...req.body };
            if (!isAdmin && isOwnProfile) {
                // Employees can only update: name, email, avatar, bio, phone, location, slack, emergencyContact, skills, address
                const allowedFields = ['name', 'email', 'avatar', 'bio', 'phone', 'location', 'slack', 'emergencyContact', 'skills', 'address', 'bannerColor'];
                updateData = {
                    id,
                    ...Object.fromEntries(
                        Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
                    )
                };
            }

            const employee = await EmployeeService.updateEmployee(updateData);

            // Explicit PII audit log — fired whenever national_id or bank_account_number
            // is included in the request payload (value changed OR explicitly cleared).
            const piiChanged = req.body.nationalId !== undefined || req.body.bankAccountNumber !== undefined;
            if (piiChanged) {
                AuditLogService.create({
                    userId:    user?.userId ?? null,
                    userEmail: user?.email  ?? null,
                    action:    'EMPLOYEE_PII_UPDATED',
                    resource:  `employee:${id}`,
                    method:    req.method,
                    path:      req.path,
                    ip:        req.ip ?? '',
                    userAgent: req.headers['user-agent'] ?? '',
                    success:   true,
                    details: {
                        employeeId: id,
                        fields: [
                            ...(req.body.nationalId        !== undefined ? ['national_id']         : []),
                            ...(req.body.bankAccountNumber !== undefined ? ['bank_account_number']  : []),
                        ],
                    },
                }).catch((err) => logger.error(err, 'PII audit log failed:'));
            }

            res.json(employee);
        } catch (error: any) {
            logger.error(error, 'Update employee error:');
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
            res.json({ message: 'Employee terminated successfully' });
        } catch (error: any) {
            logger.error(error, 'Delete employee error:');
            // Typed AppError (NotFoundError/ConflictError) carries its own status;
            // anything else is masked as a 500.
            const status = error instanceof AppError ? error.statusCode : 500;
            res.status(status).json({ error: status < 500 ? error.message : 'Failed to terminate employee' });
        }
    }

    /**
     * Bulk-terminate employees. Processes ids SEQUENTIALLY (not Promise.all) so we
     * never saturate the pg pool with up to 100 concurrent transactions, and so the
     * manager-reassignment cascade keeps the same deterministic ordering as the
     * single-delete path (concurrent reparenting can orphan the hierarchy).
     * Returns a per-item breakdown. Always 2xx (200 all-ok, 207 any failure) so the
     * client receives the detailed results instead of a thrown error.
     */
    async bulkDeleteEmployees(req: Request, res: Response): Promise<void> {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                res.status(400).json({ error: 'ids must be a non-empty array' });
                return;
            }
            if (ids.length > 100) {
                res.status(400).json({ error: 'Cannot process more than 100 employees at once' });
                return;
            }

            const results: { id: string; success: boolean; error?: string }[] = [];
            for (const id of ids) {
                try {
                    await EmployeeService.deleteEmployee(id);
                    results.push({ id, success: true });
                } catch (error: any) {
                    results.push({ id, success: false, error: error.message || 'Failed to terminate' });
                }
            }

            const succeeded = results.filter((r) => r.success).length;
            const failed = ids.length - succeeded;
            // 207 Multi-Status for any failure (partial OR total) — still 2xx so the
            // frontend resolves and can render the per-id failure report.
            const httpStatus = failed > 0 ? 207 : 200;
            res.status(httpStatus).json({ total: ids.length, succeeded, failed, results });
        } catch (error: any) {
            logger.error(error, 'Bulk delete employees error:');
            res.status(500).json({ error: 'Failed to bulk delete employees' });
        }
    }

    async getEmployeeManager(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const manager = await EmployeeService.getManager(id);

            if (!manager) {
                res.status(404).json({ error: 'Manager not found' });
                return;
            }

            res.json(manager);
        } catch (error: any) {
            logger.error(error, 'Get manager error:');
            res.status(500).json({ error: 'Failed to fetch manager' });
        }
    }

    async getEmployeeDirectReports(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const directReports = await EmployeeService.getDirectReports(id);
            res.json(directReports);
        } catch (error: any) {
            logger.error(error, 'Get direct reports error:');
            res.status(500).json({ error: 'Failed to fetch direct reports' });
        }
    }
}

export default new EmployeeController();
