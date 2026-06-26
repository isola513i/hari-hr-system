import { Router, Request, Response } from 'express';
import { PassThrough } from 'stream';
import { authenticateToken, requireAdmin, requireAdminOrFinance, requireOwnerOrAdmin } from '../middlewares/auth';
import PayrollService from '../services/PayrollService';
import { generatePayslipPdf } from '../services/PayslipPdfService';
import SystemConfigService from '../services/SystemConfigService';
import EmailService from '../services/EmailService';
import { query } from '../db';
import { apiLimiter, validatePayrollCreate, validatePayrollBatch, validateRequest } from '../middlewares/security';
import { safeErrorMessage } from '../utils/errorResponse';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/payroll/batch:
 *   post:
 *     summary: Batch create payroll records for all active employees
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [payPeriodStart, payPeriodEnd]
 *             properties:
 *               payPeriodStart: { type: string, format: date }
 *               payPeriodEnd: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Payroll batch created successfully
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 */
router.post('/batch', requireAdminOrFinance, apiLimiter, validatePayrollBatch, validateRequest, async (req: Request, res: Response) => {
  try {
    const { payPeriodStart, payPeriodEnd } = req.body;

    if (!payPeriodStart || !payPeriodEnd) {
      return res.status(400).json({ error: 'payPeriodStart and payPeriodEnd are required' });
    }

    const result = await PayrollService.batchCreatePayroll(payPeriodStart, payPeriodEnd);
    res.status(201).json(result);
  } catch (error: unknown) {
    console.error('Error batch creating payroll:', error);
    res.status(400).json({ error: safeErrorMessage(error, 'Failed to batch create payroll') });
  }
});

/**
 * @swagger
 * /api/payroll/simulate:
 *   post:
 *     summary: Simulate payroll computation without persisting
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, payPeriodStart, payPeriodEnd]
 *             properties:
 *               employeeId: { type: string, format: uuid }
 *               payPeriodStart: { type: string, format: date }
 *               payPeriodEnd: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Payroll simulation result
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 */
router.post('/simulate', requireAdminOrFinance, apiLimiter, validatePayrollCreate, validateRequest, async (req: Request, res: Response) => {
  try {
    const { employeeId, payPeriodStart, payPeriodEnd } = req.body;

    if (!employeeId || !payPeriodStart || !payPeriodEnd) {
      return res.status(400).json({ error: 'employeeId, payPeriodStart and payPeriodEnd are required' });
    }

    const preview = await PayrollService.simulatePayroll(req.body);
    res.json(preview);
  } catch (error: unknown) {
    console.error('Error simulating payroll:', error);
    res.status(400).json({ error: safeErrorMessage(error, 'Failed to simulate payroll') });
  }
});

/**
 * @swagger
 * /api/payroll:
 *   post:
 *     summary: Create a payroll record (HR_ADMIN or Finance)
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, payPeriodStart, payPeriodEnd]
 *             properties:
 *               employeeId: { type: string, format: uuid }
 *               payPeriodStart: { type: string, format: date }
 *               payPeriodEnd: { type: string, format: date }
 *               baseSalary: { type: number, minimum: 0 }
 *               overtimeHours: { type: number, minimum: 0 }
 *               bonus: { type: number, minimum: 0 }
 *               leaveDeduction: { type: number, minimum: 0 }
 *               deductions: { type: number, minimum: 0 }
 *     responses:
 *       201: { description: Payroll record created }
 *       400: { description: Validation error }
 */
router.post('/', requireAdminOrFinance, apiLimiter, validatePayrollCreate, validateRequest, async (req: Request, res: Response) => {
  try {
    const payroll = await PayrollService.createPayroll(req.body);
    res.status(201).json(payroll);
  } catch (error: unknown) {
    console.error('Error creating payroll:', error);
    res.status(400).json({ error: safeErrorMessage(error, 'Failed to create payroll') });
  }
});

/**
 * @swagger
 * /api/payroll/my-payslips:
 *   get:
 *     summary: Get payroll history for the current authenticated employee
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12 }
 *         description: Maximum number of records to return
 *     responses:
 *       200:
 *         description: List of payslip records
 *       400: { description: Employee ID not found }
 *       401: { description: Unauthorized }
 */
router.get('/my-payslips', async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID not found' });
    }

    const limit = parseInt(req.query.limit as string, 10) || 12;
    const payroll = await PayrollService.getPayrollByEmployee(employeeId, limit);

    res.json(payroll);
  } catch (error: unknown) {
    console.error('Error getting payslips:', error);
    res.status(500).json({ error: 'Failed to get payslips' });
  }
});

/**
 * @swagger
 * /api/payroll/employee/{employeeId}:
 *   get:
 *     summary: Get payroll history for a specific employee
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12 }
 *         description: Maximum number of records to return
 *     responses:
 *       200:
 *         description: List of payroll records for the employee
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 */
router.get(
  '/employee/:employeeId',
  requireOwnerOrAdmin((req) => req.params.employeeId),
  async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;
      const limit = parseInt(req.query.limit as string, 10) || 12;

      const payroll = await PayrollService.getPayrollByEmployee(employeeId, limit);
      res.json(payroll);
    } catch (error: unknown) {
      console.error('Error getting employee payroll:', error);
      res.status(500).json({ error: 'Failed to get payroll' });
    }
  }
);

/**
 * @swagger
 * /api/payroll/export:
 *   get:
 *     summary: Export payroll records as CSV
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         description: Filter by pay period start date
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         description: Filter by pay period end date
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 */
router.get('/export', requireAdminOrFinance, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // Build query
    let sql = `SELECT pr.*, e.name AS employee_name, e.department, e.employee_code
               FROM payroll_records pr
               LEFT JOIN employees e ON pr.employee_id = e.id
               WHERE pr.status != 'Cancelled'`;
    const values: string[] = [];

    if (startDate && endDate) {
      sql += ` AND pr.pay_period_start >= $1 AND pr.pay_period_end <= $2`;
      values.push(startDate as string, endDate as string);
    }
    sql += ` ORDER BY pr.pay_period_start DESC, e.name ASC`;

    const result = await query(sql, values);

    // Build CSV
    const headers = [
      'Employee Code', 'Employee Name', 'Department',
      'Pay Period Start', 'Pay Period End', 'Status',
      'Base Salary', 'Overtime Hours', 'Overtime Pay', 'Bonus',
      'SSF Employee', 'SSF Employer', 'PVF Employee', 'PVF Employer',
      'Tax Amount', 'Leave Deduction', 'Other Deductions', 'Net Pay',
      'Payment Date', 'Payment Method'
    ];

    const rows = result.rows.map(row => [
      row.employee_code || '',
      row.employee_name || '',
      row.department || '',
      row.pay_period_start,
      row.pay_period_end,
      row.status,
      row.base_salary,
      row.overtime_hours,
      row.overtime_pay,
      row.bonus,
      row.ssf_employee || 0,
      row.ssf_employer || 0,
      row.pvf_employee || 0,
      row.pvf_employer || 0,
      row.tax_amount,
      row.leave_deduction || 0,
      row.deductions,
      row.net_pay,
      row.payment_date || '',
      row.payment_method || '',
    ]);

    // CSV escape helper
    const escapeCsv = (val: any) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\n');

    // Add BOM for Excel UTF-8 compatibility
    const bom = '﻿';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="payroll-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(bom + csv);
  } catch (error) {
    console.error('Payroll export error:', error);
    res.status(500).json({ error: 'Failed to export payroll' });
  }
});

/**
 * @swagger
 * /api/payroll/all:
 *   get:
 *     summary: Get all payroll records (admin or finance only)
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *         description: Maximum number of records to return
 *     responses:
 *       200:
 *         description: List of all payroll records
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 */
router.get('/all', requireAdminOrFinance, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const payroll = await PayrollService.getAllPayroll(limit);
    res.json(payroll);
  } catch (error: unknown) {
    console.error('Error getting all payroll:', error);
    res.status(500).json({ error: 'Failed to get payroll records' });
  }
});

/**
 * @swagger
 * /api/payroll/reports/summary:
 *   get:
 *     summary: Get payroll summary report for a date range
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, format: date }
 *         description: Report period start date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, format: date }
 *         description: Report period end date
 *     responses:
 *       200:
 *         description: Payroll summary data
 *       400: { description: Missing required query parameters }
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 */
router.get('/reports/summary', requireAdminOrFinance, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const summary = await PayrollService.getPayrollSummary(
      startDate as string,
      endDate as string
    );

    res.json(summary);
  } catch (error: unknown) {
    console.error('Error getting payroll summary:', error);
    res.status(500).json({ error: 'Failed to get payroll summary' });
  }
});

/**
 * @swagger
 * /api/payroll/salary/{employeeId}:
 *   post:
 *     summary: Update employee salary and record salary history
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newSalary, changeReason]
 *             properties:
 *               newSalary: { type: number, minimum: 0 }
 *               changeReason: { type: string }
 *     responses:
 *       201:
 *         description: Salary updated and history record created
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 */
router.post('/salary/:employeeId', requireAdmin, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { newSalary, changeReason } = req.body;

    if (!newSalary || !changeReason) {
      return res.status(400).json({ error: 'newSalary and changeReason are required' });
    }

    const salaryHistory = await PayrollService.updateSalary(
      employeeId,
      newSalary,
      changeReason,
      req.user?.employeeId ?? undefined
    );

    res.status(201).json(salaryHistory);
  } catch (error: unknown) {
    console.error('Error updating salary:', error);
    res.status(400).json({ error: safeErrorMessage(error, 'Failed to update salary') });
  }
});

/**
 * @swagger
 * /api/payroll/salary/{employeeId}/history:
 *   get:
 *     summary: Get salary change history for an employee
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of salary history records
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 */
router.get(
  '/salary/:employeeId/history',
  requireOwnerOrAdmin((req) => req.params.employeeId),
  async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;
      const history = await PayrollService.getSalaryHistory(employeeId);
      res.json(history);
    } catch (error: unknown) {
      console.error('Error getting salary history:', error);
      res.status(500).json({ error: 'Failed to get salary history' });
    }
  }
);

/**
 * @swagger
 * /api/payroll/{id}/payslip:
 *   get:
 *     summary: Download payslip as PDF for a payroll record
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: PDF file download
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 *       404: { description: Payroll record not found }
 */
router.get('/:id/payslip', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const record = await PayrollService.getPayrollById(id);
    if (!record) return res.status(404).json({ error: 'Payroll record not found' });

    // Check access: owner, admin, or finance
    if (user?.role !== 'HR_ADMIN' && user?.role !== 'FINANCE' && user?.employeeId !== record.employeeId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get employee details
    const empResult = await query(
      'SELECT name, department, employee_code FROM employees WHERE id = $1',
      [record.employeeId]
    );
    const emp = empResult.rows[0];

    // Fetch company name and currency from system config
    const [companyName, currency] = await Promise.all([
      SystemConfigService.getConfigValue('system', 'app_name', 'HARI HR System'),
      SystemConfigService.getConfigValue('system', 'currency', 'THB'),
    ]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${record.payPeriodStart}-${record.payPeriodEnd}.pdf"`);

    generatePayslipPdf(
      { ...record, employeeName: emp?.name || 'Unknown', department: emp?.department || '', employeeCode: emp?.employee_code },
      res,
      { companyName: String(companyName), currency: String(currency) }
    );
  } catch (error) {
    console.error('Payslip PDF error:', error);
    res.status(500).json({ error: 'Failed to generate payslip' });
  }
});

/**
 * @swagger
 * /api/payroll/{id}/email-payslip:
 *   post:
 *     summary: Generate and email payslip PDF to the employee
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Payslip emailed successfully
 *       400: { description: Employee email not found }
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 *       404: { description: Payroll record not found }
 */
router.post('/:id/email-payslip', apiLimiter, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const record = await PayrollService.getPayrollById(id);
    if (!record) return res.status(404).json({ error: 'Payroll record not found' });

    if (user?.role !== 'HR_ADMIN' && user?.role !== 'FINANCE' && user?.employeeId !== record.employeeId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const empResult = await query(
      'SELECT name, email, department, employee_code FROM employees WHERE id = $1',
      [record.employeeId]
    );
    const emp = empResult.rows[0];
    if (!emp?.email) return res.status(400).json({ error: 'Employee email not found' });

    const [companyName, currency] = await Promise.all([
      SystemConfigService.getConfigValue('system', 'app_name', 'HARI HR System'),
      SystemConfigService.getConfigValue('system', 'currency', 'THB'),
    ]);

    // Generate PDF into a buffer
    const pass = new PassThrough();
    const chunks: Buffer[] = [];
    pass.on('data', (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve, reject) => {
      pass.on('end', resolve);
      pass.on('error', reject);
      generatePayslipPdf(
        { ...record, employeeName: emp.name || 'Unknown', department: emp.department || '', employeeCode: emp.employee_code },
        pass,
        { companyName: String(companyName), currency: String(currency) }
      );
    });

    const pdfBuffer = Buffer.concat(chunks);
    const payPeriod = `${record.payPeriodStart} to ${record.payPeriodEnd}`;

    await EmailService.sendPayslipEmail(emp.email, emp.name, payPeriod, pdfBuffer);

    res.json({ message: `Payslip emailed to ${emp.email}` });
  } catch (error) {
    console.error('Email payslip error:', error);
    res.status(500).json({ error: safeErrorMessage(error, 'Failed to email payslip') });
  }
});

/**
 * @swagger
 * /api/payroll/{id}:
 *   put:
 *     summary: Update an existing payroll record (Pending status only)
 *     tags: [Payroll]
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
 *             properties:
 *               baseSalary: { type: number, minimum: 0 }
 *               overtimeHours: { type: number, minimum: 0 }
 *               bonus: { type: number, minimum: 0 }
 *               leaveDeduction: { type: number, minimum: 0 }
 *               deductions: { type: number, minimum: 0 }
 *     responses:
 *       200:
 *         description: Payroll record updated
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 */
router.put('/:id', requireAdminOrFinance, apiLimiter, async (req: Request, res: Response) => {
  try {
    const payroll = await PayrollService.updatePayroll(req.params.id, req.body);
    res.json(payroll);
  } catch (error: unknown) {
    console.error('Error updating payroll:', error);
    res.status(400).json({ error: safeErrorMessage(error, 'Failed to update payroll') });
  }
});

/**
 * @swagger
 * /api/payroll/{id}:
 *   get:
 *     summary: Get a specific payroll record by ID
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Payroll record details
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 *       404: { description: Payroll record not found }
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const payroll = await PayrollService.getPayrollById(req.params.id);

    if (!payroll) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    // Check if user can access this payroll
    const isOwner = req.user?.employeeId === payroll.employeeId;
    const isAdmin = req.user?.role === 'HR_ADMIN';
    const isFinance = req.user?.role === 'FINANCE';

    if (!isOwner && !isAdmin && !isFinance) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(payroll);
  } catch (error: unknown) {
    console.error('Error getting payroll:', error);
    res.status(500).json({ error: 'Failed to get payroll' });
  }
});

/**
 * @swagger
 * /api/payroll/{id}/status:
 *   patch:
 *     summary: Update payroll status
 *     tags: [Payroll]
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
 *               status:
 *                 type: string
 *                 enum: [Pending, Processed, Paid, Cancelled]
 *               paymentMethod: { type: string }
 *     responses:
 *       200:
 *         description: Payroll status updated
 *       400: { description: Invalid status }
 *       401: { description: Unauthorized }
 *       403: { description: Access denied }
 */
router.patch('/:id/status', requireAdminOrFinance, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { status, paymentMethod } = req.body;

    if (!['Pending', 'Processed', 'Paid', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const payroll = await PayrollService.updatePayrollStatus(req.params.id, status, paymentMethod);
    res.json(payroll);
  } catch (error: unknown) {
    console.error('Error updating payroll status:', error);
    res.status(400).json({ error: safeErrorMessage(error, 'Failed to update payroll status') });
  }
});

export default router;
