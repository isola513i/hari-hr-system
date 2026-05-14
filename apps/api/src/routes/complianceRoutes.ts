import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middlewares/auth';
import { apiLimiter } from '../middlewares/security';
import { query } from '../db';
import AuditLogService from '../services/AuditLogService';
import ComplianceController from '../controllers/ComplianceController';
import { receiptUpload } from '../middlewares/upload';

const router = Router();

router.use(authenticateToken, requireAdmin);

// ---------------------------------------------------------------------------
// Compliance Items CRUD (must be before /checks etc to avoid /:id conflict)
// ---------------------------------------------------------------------------
router.get('/items', ComplianceController.getItems.bind(ComplianceController));
router.get('/items/:id', ComplianceController.getItemById.bind(ComplianceController));
router.post('/items', apiLimiter, ComplianceController.createItem.bind(ComplianceController));
router.put('/items/:id', apiLimiter, ComplianceController.updateItem.bind(ComplianceController));
router.delete('/items/:id', apiLimiter, ComplianceController.deleteItem.bind(ComplianceController));

// Status management
router.patch('/items/:id/status', apiLimiter, ComplianceController.updateStatus.bind(ComplianceController));

// Evidence/Attachments
router.post('/items/:id/evidence', apiLimiter, receiptUpload.single('file'), ComplianceController.addEvidence.bind(ComplianceController));
router.get('/items/:id/evidence', ComplianceController.getEvidence.bind(ComplianceController));
router.delete('/evidence/:evidenceId', apiLimiter, ComplianceController.deleteEvidence.bind(ComplianceController));

// Status history
router.get('/items/:id/history', ComplianceController.getStatusHistory.bind(ComplianceController));

// Overdue check
router.post('/check-overdue', apiLimiter, ComplianceController.checkOverdue.bind(ComplianceController));

// ---------------------------------------------------------------------------
// Helper: escape CSV value
// ---------------------------------------------------------------------------
function csvEscape(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(values: unknown[]): string {
  return values.map(csvEscape).join(',');
}

// ---------------------------------------------------------------------------
// GET /api/compliance/checks
// Compute compliance checks from real system data
// ---------------------------------------------------------------------------
router.get('/checks', async (_req: Request, res: Response) => {
  try {
    const totalResult = await query(
      "SELECT COUNT(*) AS cnt FROM employees WHERE status = 'Active'"
    );
    const totalActive = parseInt(totalResult.rows[0].cnt, 10) || 1;

    const checks = await Promise.all([
      // 1. Emergency Contacts
      (async () => {
        const r = await query(
          "SELECT COUNT(*) AS cnt FROM employees WHERE status = 'Active' AND emergency_contact IS NOT NULL AND emergency_contact != ''"
        );
        const count = parseInt(r.rows[0].cnt, 10);
        const pct = Math.round((count / totalActive) * 100);
        return {
          id: 'emergency_contacts',
          titleKey: 'checks.emergencyContacts',
          status: pct >= 100 ? 'Complete' : pct >= 50 ? 'In Progress' : 'Overdue',
          detail: `${count}/${totalActive}`,
          percentage: pct,
        };
      })(),

      // 2. Onboarding Completed
      (async () => {
        const r = await query(
          "SELECT COUNT(*) AS cnt FROM employees WHERE status = 'Active' AND onboarding_status = 'Completed'"
        );
        const count = parseInt(r.rows[0].cnt, 10);
        const pct = Math.round((count / totalActive) * 100);
        return {
          id: 'onboarding_complete',
          titleKey: 'checks.onboardingComplete',
          status: pct >= 100 ? 'Complete' : pct >= 50 ? 'In Progress' : 'Overdue',
          detail: `${count}/${totalActive}`,
          percentage: pct,
        };
      })(),

      // 3. Performance Reviews (within last year)
      (async () => {
        const r = await query(
          "SELECT COUNT(DISTINCT employee_id) AS cnt FROM performance_reviews WHERE date >= CURRENT_DATE - INTERVAL '1 year'"
        );
        const count = parseInt(r.rows[0].cnt, 10);
        const pct = Math.round((count / totalActive) * 100);
        return {
          id: 'performance_reviews',
          titleKey: 'checks.performanceReviews',
          status: pct >= 100 ? 'Complete' : pct >= 50 ? 'In Progress' : 'Overdue',
          detail: `${count}/${totalActive}`,
          percentage: pct,
        };
      })(),

      // 4. Attendance Tracking (active in last 7 days)
      (async () => {
        const r = await query(
          "SELECT COUNT(DISTINCT employee_id) AS cnt FROM attendance_records WHERE date >= CURRENT_DATE - INTERVAL '7 days' AND clock_in IS NOT NULL"
        );
        const count = parseInt(r.rows[0].cnt, 10);
        const pct = Math.round((count / totalActive) * 100);
        return {
          id: 'attendance_tracking',
          titleKey: 'checks.attendanceTracking',
          status: pct >= 80 ? 'Complete' : pct >= 40 ? 'In Progress' : 'Overdue',
          detail: `${count}/${totalActive}`,
          percentage: pct,
        };
      })(),

      // 5. Document Compliance (at least 1 document per active employee)
      (async () => {
        const r = await query(
          "SELECT COUNT(DISTINCT employee_id) AS cnt FROM documents WHERE deleted_at IS NULL AND employee_id IN (SELECT id FROM employees WHERE status = 'Active')"
        );
        const count = parseInt(r.rows[0].cnt, 10);
        const pct = Math.round((count / totalActive) * 100);
        return {
          id: 'document_compliance',
          titleKey: 'checks.documentCompliance',
          status: pct >= 100 ? 'Complete' : pct >= 50 ? 'In Progress' : 'Overdue',
          detail: `${count}/${totalActive}`,
          percentage: pct,
        };
      })(),

      // 6. Leave Policies Configured (stored as JSON in system_configs.quotas)
      (async () => {
        const r = await query(
          "SELECT value FROM system_configs WHERE key = 'quotas'"
        );
        let count = 0;
        if (r.rows.length > 0 && r.rows[0].value) {
          try {
            const parsed = typeof r.rows[0].value === 'string' ? JSON.parse(r.rows[0].value) : r.rows[0].value;
            count = Array.isArray(parsed) ? parsed.length : 0;
          } catch { count = 0; }
        }
        return {
          id: 'leave_policies',
          titleKey: 'checks.leavePolicies',
          status: count > 0 ? 'Complete' : 'Overdue',
          detail: `${count} types`,
          percentage: count > 0 ? 100 : 0,
        };
      })(),
    ]);

    res.json(checks);
  } catch (error) {
    console.error('Error computing compliance checks:', error);
    res.status(500).json({ error: 'Failed to compute compliance checks' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/compliance/audit-logs/export
// CSV export of audit logs with same filters as list endpoint
// ---------------------------------------------------------------------------
router.get('/audit-logs/export', async (req: Request, res: Response) => {
  try {
    const resource = req.query.resource as string | undefined;
    const action = req.query.action as string | undefined;
    const userEmail = req.query.userEmail as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const successFilter = req.query.success !== undefined
      ? req.query.success === 'true'
      : undefined;

    const { logs } = await AuditLogService.getAll({
      limit: 10000,
      offset: 0,
      resource: resource && resource !== 'All' ? resource : undefined,
      action: action || undefined,
      userEmail: userEmail || undefined,
      startDate,
      endDate,
      success: successFilter,
    });

    const header = 'timestamp,user_email,action,resource,method,path,status_code,duration,success,ip\n';
    const rows = logs.map((log) => [
      log.createdAt ? new Date(log.createdAt).toISOString() : '',
      log.userEmail ?? '',
      log.action,
      log.resource,
      log.method,
      `"${log.path}"`,
      log.statusCode ?? '',
      log.duration ?? '',
      log.success ?? '',
      log.ip ?? '',
    ].join(',')).join('\n');

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${date}.csv"`);
    res.send(header + rows);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/compliance/audit-logs
// Paginated audit logs from persistent table
// ---------------------------------------------------------------------------
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 15;
    const resource = req.query.resource as string | undefined;
    const action = req.query.action as string | undefined;
    const userEmail = req.query.userEmail as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const successFilter = req.query.success !== undefined
      ? req.query.success === 'true'
      : undefined;
    const offset = (page - 1) * limit;

    const { logs, total } = await AuditLogService.getAll({
      limit,
      offset,
      resource: resource && resource !== 'All' ? resource : undefined,
      action: action || undefined,
      userEmail: userEmail || undefined,
      startDate,
      endDate,
      success: successFilter,
    });

    res.json({
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/compliance/reports/generate
// Generate CSV report from selected data points
// ---------------------------------------------------------------------------
router.post('/reports/generate', async (req: Request, res: Response) => {
  try {
    const { dataPoints = [], dateRange = 'last90' } = req.body as {
      dataPoints: string[];
      dateRange: string;
    };

    if (!dataPoints.length) {
      return res.status(400).json({ error: 'At least one data point is required' });
    }

    // Compute date filter
    let dateFilter = '';
    const now = new Date();
    if (dateRange === 'last30') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      dateFilter = d.toISOString().slice(0, 10);
    } else if (dateRange === 'last90') {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      dateFilter = d.toISOString().slice(0, 10);
    } else if (dateRange === 'thisYear') {
      dateFilter = `${now.getFullYear()}-01-01`;
    }

    // Build query columns with parameterized date filter
    const selectCols: string[] = ['e.name AS employee_name'];
    const joins: string[] = [];
    const headers: string[] = ['Employee Name'];
    const params: any[] = [];
    let paramIndex = 1;

    // Reserve $1 for dateFilter if present
    const dateParamIndex = dateFilter ? paramIndex++ : 0;
    if (dateFilter) params.push(dateFilter);

    if (dataPoints.includes('department')) {
      selectCols.push('e.department');
      headers.push('Department');
    }
    if (dataPoints.includes('startDate')) {
      selectCols.push('e.join_date');
      headers.push('Start Date');
    }
    if (dataPoints.includes('salary')) {
      selectCols.push('sh.base_salary AS salary');
      joins.push(
        `LEFT JOIN LATERAL (
          SELECT base_salary FROM salary_history WHERE employee_id = e.id ORDER BY effective_date DESC LIMIT 1
        ) sh ON true`
      );
      headers.push('Salary');
    }
    if (dataPoints.includes('performanceRating')) {
      selectCols.push('pr.rating AS performance_rating');
      joins.push(
        `LEFT JOIN LATERAL (
          SELECT rating FROM performance_reviews WHERE employee_id = e.id ORDER BY date DESC LIMIT 1
        ) pr ON true`
      );
      headers.push('Performance Rating');
    }
    if (dataPoints.includes('leaveBalance')) {
      selectCols.push(`(
        SELECT COALESCE(SUM(
          CASE WHEN lr.end_date >= lr.start_date
            THEN (lr.end_date - lr.start_date + 1)
            ELSE 0 END
        ), 0)
        FROM leave_requests lr
        WHERE lr.employee_id = e.id AND lr.status = 'Approved'
        ${dateFilter ? `AND lr.start_date >= $${dateParamIndex}` : ''}
      ) AS leave_days_used`);
      headers.push('Leave Days Used');
    }
    if (dataPoints.includes('attendanceDays')) {
      selectCols.push(`(
        SELECT COUNT(*)
        FROM attendance_records ar
        WHERE ar.employee_id = e.id AND ar.clock_in IS NOT NULL
        ${dateFilter ? `AND ar.date >= $${dateParamIndex}` : ''}
      ) AS attendance_days`);
      headers.push('Attendance Days');
    }
    if (dataPoints.includes('lateDays')) {
      selectCols.push(`(
        SELECT COUNT(*)
        FROM attendance_records ar
        WHERE ar.employee_id = e.id AND ar.status = 'Late'
        ${dateFilter ? `AND ar.date >= $${dateParamIndex}` : ''}
      ) AS late_days`);
      headers.push('Late Days');
    }
    if (dataPoints.includes('totalHours')) {
      selectCols.push(`(
        SELECT COALESCE(SUM(ar.total_hours), 0)
        FROM attendance_records ar
        WHERE ar.employee_id = e.id AND ar.total_hours IS NOT NULL
        ${dateFilter ? `AND ar.date >= $${dateParamIndex}` : ''}
      ) AS total_hours`);
      headers.push('Total Hours');
    }

    const sql = `
      SELECT ${selectCols.join(', ')}
      FROM employees e
      ${joins.join('\n')}
      WHERE e.status = 'Active'
      ${dateFilter && dataPoints.includes('startDate') ? `AND e.join_date >= $${dateParamIndex}` : ''}
      ORDER BY e.name
    `;

    const result = await query(sql, params);

    // Build CSV
    const lines: string[] = [csvRow(headers)];
    for (const row of result.rows) {
      const values: unknown[] = [row.employee_name];
      if (dataPoints.includes('department')) values.push(row.department);
      if (dataPoints.includes('startDate')) values.push(row.join_date ? new Date(row.join_date).toISOString().slice(0, 10) : '');
      if (dataPoints.includes('salary')) values.push(row.salary);
      if (dataPoints.includes('performanceRating')) values.push(row.performance_rating);
      if (dataPoints.includes('leaveBalance')) values.push(row.leave_days_used);
      if (dataPoints.includes('attendanceDays')) values.push(row.attendance_days);
      if (dataPoints.includes('lateDays')) values.push(row.late_days);
      if (dataPoints.includes('totalHours')) values.push(row.total_hours);
      lines.push(csvRow(values));
    }

    const csv = '\uFEFF' + lines.join('\n'); // BOM for Excel UTF-8
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/compliance/export
// Export compliance summary as CSV
// ---------------------------------------------------------------------------
router.get('/export', async (_req: Request, res: Response) => {
  try {
    // Fetch compliance checks
    const totalResult = await query("SELECT COUNT(*) AS cnt FROM employees WHERE status = 'Active'");
    const totalActive = parseInt(totalResult.rows[0].cnt, 10) || 1;

    const checksData = [
      { label: 'Emergency Contacts', query: "SELECT COUNT(*) AS cnt FROM employees WHERE status = 'Active' AND emergency_contact IS NOT NULL AND emergency_contact != ''" },
      { label: 'Onboarding Completed', query: "SELECT COUNT(*) AS cnt FROM employees WHERE status = 'Active' AND onboarding_status = 'Completed'" },
      { label: 'Performance Reviews (1yr)', query: "SELECT COUNT(DISTINCT employee_id) AS cnt FROM performance_reviews WHERE date >= CURRENT_DATE - INTERVAL '1 year'" },
      { label: 'Attendance Active (7d)', query: "SELECT COUNT(DISTINCT employee_id) AS cnt FROM attendance_records WHERE date >= CURRENT_DATE - INTERVAL '7 days' AND clock_in IS NOT NULL" },
      { label: 'Documents on File', query: "SELECT COUNT(DISTINCT employee_id) AS cnt FROM documents WHERE deleted_at IS NULL AND employee_id IN (SELECT id FROM employees WHERE status = 'Active')" },
      { label: 'Leave Policies Configured', query: "SELECT COALESCE(jsonb_array_length(value::jsonb), 0) AS cnt FROM system_configs WHERE key = 'quotas'" },
    ];

    const lines: string[] = [
      csvRow(['Compliance Check', 'Count', 'Total', 'Percentage', 'Status']),
    ];

    for (const c of checksData) {
      const r = await query(c.query);
      const count = parseInt(r.rows[0].cnt, 10);
      const total = c.label === 'Leave Policies Configured' ? '-' : totalActive;
      const pct = c.label === 'Leave Policies Configured'
        ? (count > 0 ? 100 : 0)
        : Math.round((count / totalActive) * 100);
      const status = pct >= 100 ? 'Complete' : pct >= 50 ? 'In Progress' : 'Overdue';
      lines.push(csvRow([c.label, count, total, `${pct}%`, status]));
    }

    // Add recent audit logs
    lines.push('');
    lines.push(csvRow(['Recent Audit Logs']));
    lines.push(csvRow(['User', 'Action', 'Resource', 'Path', 'Date']));

    const { logs } = await AuditLogService.getAll({ limit: 50 });
    for (const log of logs) {
      lines.push(csvRow([
        log.userEmail || '-',
        log.action,
        log.resource,
        log.path,
        log.createdAt ? new Date(log.createdAt).toISOString() : '-',
      ]));
    }

    const csv = '\uFEFF' + lines.join('\n');
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="compliance_summary_${date}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting compliance data:', error);
    res.status(500).json({ error: 'Failed to export compliance data' });
  }
});

export default router;
