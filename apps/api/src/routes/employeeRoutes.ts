import { Router, Request, Response } from 'express';
import EmployeeController from '../controllers/EmployeeController';
import EmployeeLeaveQuotaController from '../controllers/EmployeeLeaveQuotaController';
import { apiLimiter, validateEmployeeCreation, validateRequest, validateEmployeeBulkDelete } from '../middlewares/security';
import { authenticateToken, requireAdmin } from '../middlewares/auth';
import { cacheMiddleware, invalidateCache } from '../middlewares/cache';
import { avatarUpload, csvUpload, generateStorageKey, getFileBuffer } from '../middlewares/upload';
import { resizeAvatar } from '../middlewares/imageResize';
import { storageService } from '../services/StorageService';
import { getStatusMap } from '../socket';
import pool, { query } from '../db';
import { safeErrorMessage } from '../utils/errorResponse';
import { generateEmployeeReportPdf } from '../services/EmployeeReportPdfService';
import SystemConfigService from '../services/SystemConfigService';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/employees/upload-avatar:
 *   post:
 *     summary: Upload employee avatar image
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully, returns avatarUrl
 *       400: { description: No file uploaded }
 *       401: { description: Unauthorized }
 */
// POST /api/employees/upload-avatar - Upload avatar image
router.post('/upload-avatar', apiLimiter, avatarUpload.single('avatar'), resizeAvatar, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const key = generateStorageKey('avatars', req.file, 'avatar');
        const buffer = getFileBuffer(req.file);
        await storageService.upload({ key, body: buffer, contentType: req.file.mimetype });

        // For avatars: return public URL (R2) or relative path (local)
        const avatarUrl = storageService.getPublicUrl(key) || `/uploads/${key}`;
        res.status(200).json({
            success: true,
            avatarUrl,
            message: 'Avatar uploaded successfully'
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

/**
 * @swagger
 * /api/employees/statuses:
 *   get:
 *     summary: Get all employee availability statuses
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Map of employee IDs to their current availability status
 *       401: { description: Unauthorized }
 */
// GET /api/employees/statuses - Get all availability statuses (for initial load)
router.get('/statuses', (_req, res) => {
    const statusMap = getStatusMap();
    const statuses: Record<string, { status: string; statusMessage: string; updatedAt: string }> = {};
    statusMap.forEach((val, key) => { statuses[key] = val; });
    res.json(statuses);
});

/**
 * @swagger
 * /api/employees/{id}/availability-status:
 *   patch:
 *     summary: Update employee availability status (REST fallback)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [online, busy, away, offline] }
 *               statusMessage: { type: string, maxLength: 100 }
 *     responses:
 *       200:
 *         description: Availability status updated
 *       400: { description: Invalid status value }
 *       401: { description: Unauthorized }
 */
// PATCH /api/employees/:id/availability-status - Update availability status (REST fallback)
router.patch('/:id/availability-status', apiLimiter, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, statusMessage } = req.body;
        const validStatuses = ['online', 'busy', 'away', 'offline'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be one of: online, busy, away, offline' });
        }
        const msg = typeof statusMessage === 'string' ? statusMessage.slice(0, 100) : '';
        await query(
            'UPDATE employees SET availability_status = $1, status_message = $2 WHERE id = $3',
            [status, msg, id]
        );
        // Update in-memory map too
        const statusMapRef = getStatusMap();
        statusMapRef.set(id, { status, statusMessage: msg, updatedAt: new Date().toISOString() });
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating availability status:', error);
        res.status(500).json({ error: 'Failed to update availability status' });
    }
});

/**
 * @swagger
 * /api/employees/import-csv:
 *   post:
 *     summary: Bulk import employees from CSV file (HR_ADMIN only)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary, description: "CSV file with columns: name,email,role,department,joinDate,salary (max 1000 rows)" }
 *     responses:
 *       200:
 *         description: Import complete — returns created count
 *       400: { description: Missing file, empty CSV, missing columns, or row validation errors }
 *       401: { description: Unauthorized }
 *       403: { description: HR_ADMIN role required }
 *       409: { description: Duplicate email detected — no records imported }
 */
// POST /api/employees/import-csv - Bulk import employees from CSV (HR_ADMIN only)
router.post('/import-csv', requireAdmin, apiLimiter, csvUpload.single('file'), invalidateCache('/api/employees'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No CSV file uploaded' });
        }

        const { parse } = await import('csv-parse/sync');
        const buffer = req.file.buffer || require('fs').readFileSync(req.file.path);
        const csvContent = buffer.toString('utf-8');

        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true,
        }) as Record<string, string>[];

        if (records.length === 0) {
            return res.status(400).json({ error: 'CSV file is empty' });
        }

        if (records.length > 1000) {
            return res.status(400).json({ error: 'CSV file exceeds maximum of 1000 rows per import' });
        }

        // Validate required columns
        const requiredColumns = ['name', 'email', 'role', 'department'];
        const headers = Object.keys(records[0]);
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        if (missingColumns.length > 0) {
            return res.status(400).json({ error: `Missing required columns: ${missingColumns.join(', ')}` });
        }

        // Pre-validate all rows before touching the database
        const validationErrors: string[] = [];
        for (let i = 0; i < records.length; i++) {
            const row = records[i];
            const rowNum = i + 2;
            if (!row.name?.trim() || !row.email?.trim()) {
                validationErrors.push(`Row ${rowNum}: Missing name or email`);
            }
        }
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', errors: validationErrors });
        }

        // Import all rows in a single transaction — all-or-nothing
        const client = await pool.connect();
        let created = 0;
        try {
            await client.query('BEGIN');

            const codeResult = await client.query(
                `SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code FROM 5) AS INTEGER)), 0) AS max_num FROM employees WHERE employee_code LIKE 'EMP-%'`
            );
            let nextNum = parseInt(codeResult.rows[0].max_num, 10) + 1;

            for (const row of records) {
                const name = row.name.trim();
                const email = row.email.trim().toLowerCase();
                const role = row.role?.trim() || 'Employee';
                const department = row.department?.trim() || 'General';
                const joinDate = row.joinDate?.trim() || row.join_date?.trim() || new Date().toISOString().split('T')[0];
                const salary = row.salary ? parseFloat(row.salary) : null;
                const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
                const employeeCode = `EMP-${String(nextNum).padStart(4, '0')}`;

                await client.query(
                    `INSERT INTO employees (name, email, role, department, join_date, avatar, status, employee_code, salary)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [name, email, role, department, joinDate, avatar, 'Active', employeeCode, salary]
                );
                nextNum++;
                created++;
            }

            await client.query('COMMIT');
        } catch (dbError: any) {
            await client.query('ROLLBACK');
            const msg = dbError.message || 'Unknown error';
            if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
                return res.status(409).json({ error: 'Import failed: one or more emails already exist. No records were imported.' });
            }
            throw dbError;
        } finally {
            client.release();
        }

        res.json({
            success: true,
            message: `Import complete: ${created} created`,
            created,
            skipped: 0,
            errors: [],
        });
    } catch (error: any) {
        console.error('CSV import error:', error);
        res.status(500).json({ error: safeErrorMessage(error, 'Failed to import CSV') });
    }
});

/**
 * @swagger
 * /api/employees/csv-template:
 *   get:
 *     summary: Download CSV import template
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file with header row and one example row
 *         content:
 *           text/csv:
 *             schema: { type: string }
 *       401: { description: Unauthorized }
 */
// GET /api/employees/csv-template - Download CSV template
router.get('/csv-template', authenticateToken, (_req, res) => {
    const template = 'name,email,role,department,joinDate,salary\nJohn Doe,john@example.com,Software Engineer,Engineering,2024-01-15,50000\n';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="employee-import-template.csv"');
    res.send(template);
});

/**
 * @swagger
 * /api/employees:
 *   get:
 *     summary: List all employees
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of employees
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Employee'
 *       401: { description: Unauthorized }
 */
// GET /api/employees - Get all employees (any authenticated user) - cached for 30s
router.get('/', cacheMiddleware(), EmployeeController.getAllEmployees.bind(EmployeeController));

/**
 * @swagger
 * /api/employees/{id}/leave-quotas:
 *   get:
 *     summary: Get effective leave quotas for an employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Effective leave quotas (policy defaults merged with any employee overrides)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LeaveBalance'
 *       401: { description: Unauthorized }
 *       404: { description: Employee not found }
 */
// GET /api/employees/:id/leave-quotas - Get effective leave quotas for employee
router.get('/:id/leave-quotas', EmployeeLeaveQuotaController.getEffectiveQuotas.bind(EmployeeLeaveQuotaController));

/**
 * @swagger
 * /api/employees/{id}/leave-quotas:
 *   put:
 *     summary: Upsert employee leave quota overrides (HR_ADMIN only)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Map of leave type to quota override value
 *     responses:
 *       200:
 *         description: Leave quota overrides saved
 *       401: { description: Unauthorized }
 *       403: { description: HR_ADMIN role required }
 *       404: { description: Employee not found }
 */
// PUT /api/employees/:id/leave-quotas - Upsert leave quota overrides (Admin only)
router.put('/:id/leave-quotas', requireAdmin, apiLimiter, EmployeeLeaveQuotaController.upsertOverrides.bind(EmployeeLeaveQuotaController));

/**
 * @swagger
 * /api/employees/{id}/leave-quotas/{type}:
 *   delete:
 *     summary: Delete a single employee leave quota override (HR_ADMIN only)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: type
 *         required: true
 *         schema: { type: string }
 *         description: Leave type identifier (e.g. annual, sick)
 *     responses:
 *       200:
 *         description: Leave quota override deleted
 *       401: { description: Unauthorized }
 *       403: { description: HR_ADMIN role required }
 *       404: { description: Override not found }
 */
// DELETE /api/employees/:id/leave-quotas/:type - Delete a single leave quota override (Admin only)
router.delete('/:id/leave-quotas/:type', requireAdmin, apiLimiter, EmployeeLeaveQuotaController.deleteOverride.bind(EmployeeLeaveQuotaController));

/**
 * @swagger
 * /api/employees/{id}/manager:
 *   get:
 *     summary: Get the manager of an employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Manager employee record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       401: { description: Unauthorized }
 *       404: { description: Employee not found }
 */
// GET /api/employees/:id/manager - Get employee's manager (any authenticated user) - cached for 30s
router.get('/:id/manager', cacheMiddleware(), EmployeeController.getEmployeeManager.bind(EmployeeController));

/**
 * @swagger
 * /api/employees/{id}/direct-reports:
 *   get:
 *     summary: Get direct reports of an employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of employees who report directly to this employee
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Employee'
 *       401: { description: Unauthorized }
 *       404: { description: Employee not found }
 */
// GET /api/employees/:id/direct-reports - Get employee's direct reports (any authenticated user) - cached for 30s
router.get('/:id/direct-reports', cacheMiddleware(), EmployeeController.getEmployeeDirectReports.bind(EmployeeController));

/**
 * @swagger
 * /api/employees/{id}:
 *   get:
 *     summary: Get employee by ID
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Employee record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       401: { description: Unauthorized }
 *       404: { description: Employee not found }
 */
// GET /api/employees/:id - Get employee by ID (any authenticated user) - cached for 30s
router.get('/:id', cacheMiddleware(), EmployeeController.getEmployeeById.bind(EmployeeController));

/**
 * @swagger
 * /api/employees:
 *   post:
 *     summary: Create a new employee (HR_ADMIN only)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEmployee'
 *     responses:
 *       201:
 *         description: Employee created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: HR_ADMIN role required }
 */
// POST /api/employees - Create new employee (HR_ADMIN only)
router.post(
    '/',
    requireAdmin,
    apiLimiter,
    validateEmployeeCreation,
    validateRequest,
    invalidateCache('/api/employees'),
    EmployeeController.createEmployee.bind(EmployeeController)
);

/**
 * @swagger
 * /api/employees/{id}:
 *   patch:
 *     summary: Partially update an employee (own profile or any employee for HR_ADMIN)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       200:
 *         description: Employee updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 *       404: { description: Employee not found }
 */
// PATCH /api/employees/:id - Update own profile (any authenticated user) or any employee (HR_ADMIN)
router.patch('/:id', apiLimiter, invalidateCache('/api/employees'), EmployeeController.updateEmployee.bind(EmployeeController));

/**
 * @swagger
 * /api/employees/{id}:
 *   put:
 *     summary: Replace an employee record (HR_ADMIN only)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       200:
 *         description: Employee updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       401: { description: Unauthorized }
 *       403: { description: HR_ADMIN role required }
 *       404: { description: Employee not found }
 */
// PUT /api/employees/:id - Update employee (HR_ADMIN only)
router.put('/:id', requireAdmin, apiLimiter, invalidateCache('/api/employees'), EmployeeController.updateEmployee.bind(EmployeeController));

/**
 * @swagger
 * /api/employees/{id}:
 *   delete:
 *     summary: Delete an employee (HR_ADMIN only)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Employee deleted
 *       401: { description: Unauthorized }
 *       403: { description: HR_ADMIN role required }
 *       404: { description: Employee not found }
 */
/**
 * @swagger
 * /api/employees/bulk:
 *   delete:
 *     summary: Bulk-terminate employees (HR_ADMIN only)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *                 description: Employee IDs to terminate (1–100)
 *     responses:
 *       200: { description: All employees terminated }
 *       207: { description: Partial success — some failed }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: HR_ADMIN role required }
 *       422: { description: None could be terminated }
 */
// DELETE /api/employees/bulk - Bulk delete (must be BEFORE '/:id' so 'bulk' isn't an id)
router.delete('/bulk', requireAdmin, apiLimiter, validateEmployeeBulkDelete, validateRequest, invalidateCache('/api/employees'), EmployeeController.bulkDeleteEmployees.bind(EmployeeController));

// DELETE /api/employees/:id - Delete employee (HR_ADMIN only)
router.delete('/:id', requireAdmin, apiLimiter, invalidateCache('/api/employees'), EmployeeController.deleteEmployee.bind(EmployeeController));

/**
 * @swagger
 * /api/employees/{id}/report:
 *   get:
 *     summary: Download comprehensive employee report as PDF (admin, manager, or self)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: PDF report file
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 *       404: { description: Employee not found }
 */
router.get('/:id/report', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const empResult = await query(
      `SELECT e.*, u.email AS user_email FROM employees e LEFT JOIN users u ON u.id = e.user_id WHERE e.id = $1`,
      [req.params.id]
    );
    if (!empResult.rows.length) return res.status(404).json({ error: 'Employee not found' });
    const emp = empResult.rows[0];

    // Access: admin, manager, or self
    if (user.role !== 'HR_ADMIN' && user.role !== 'MANAGER' && user.employeeId !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [leaveResult, attResult, perfResult, trainResult, companyName] = await Promise.all([
      query(
        `SELECT leave_type, status, COUNT(*) AS cnt
         FROM leave_requests WHERE employee_id = $1 AND deleted_at IS NULL
         GROUP BY leave_type, status`,
        [req.params.id]
      ),
      query(
        `SELECT status, COUNT(*) AS cnt FROM attendance_records
         WHERE employee_id = $1 AND date >= CURRENT_DATE - INTERVAL '90 days' AND deleted_at IS NULL
         GROUP BY status`,
        [req.params.id]
      ),
      query(
        `SELECT TO_CHAR(date, 'YYYY-MM-DD') AS date, reviewer, rating, notes FROM performance_reviews WHERE employee_id = $1 ORDER BY date DESC LIMIT 5`,
        [req.params.id]
      ),
      query(
        `SELECT title, status, TO_CHAR(completion_date, 'YYYY-MM-DD') AS completion_date, score FROM employee_training WHERE employee_id = $1 AND deleted_at IS NULL ORDER BY assigned_at DESC`,
        [req.params.id]
      ),
      SystemConfigService.getConfigValue('system', 'app_name', 'HARI HR System'),
    ]);

    const leaveSummary = {
      totalApproved: leaveResult.rows.filter((r: any) => r.status === 'Approved').reduce((s: number, r: any) => s + parseInt(r.cnt, 10), 0),
      totalPending: leaveResult.rows.filter((r: any) => r.status === 'Pending').reduce((s: number, r: any) => s + parseInt(r.cnt, 10), 0),
      byType: Object.values(
        leaveResult.rows.filter((r: any) => r.status === 'Approved').reduce((acc: any, r: any) => {
          acc[r.leave_type] = acc[r.leave_type] || { type: r.leave_type, count: 0 };
          acc[r.leave_type].count += parseInt(r.cnt, 10);
          return acc;
        }, {} as Record<string, any>)
      ) as Array<{ type: string; count: number }>,
    };

    const attMap: Record<string, number> = {};
    attResult.rows.forEach((r: any) => { attMap[r.status] = parseInt(r.cnt, 10); });
    const attendanceSummary = {
      present: (attMap['Present'] || 0) + (attMap['Late'] || 0),
      absent: attMap['Absent'] || 0,
      late: attMap['Late'] || 0,
      total: attResult.rows.reduce((s: number, r: any) => s + parseInt(r.cnt, 10), 0),
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${emp.name?.replace(/\s+/g, '-')}.pdf"`);

    generateEmployeeReportPdf({
      employee: {
        name: emp.name,
        email: emp.email || emp.user_email,
        role: emp.role,
        department: emp.department,
        joinDate: emp.join_date,
        employeeCode: emp.employee_code,
        phone: emp.phone,
        location: emp.location,
        status: emp.status,
      },
      leaveSummary,
      attendanceSummary,
      performanceReviews: perfResult.rows.map((r: any) => ({ date: r.date, reviewer: r.reviewer, rating: r.rating, notes: r.notes })),
      trainingRecords: trainResult.rows.map((r: any) => ({ title: r.title, status: r.status, completionDate: r.completion_date, score: r.score })),
      companyName: String(companyName),
    }, res);
  } catch (err) {
    console.error('Employee report PDF error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
