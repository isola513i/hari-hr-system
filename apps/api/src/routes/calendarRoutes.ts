import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { cacheMiddleware } from '../middlewares/cache';
import { query } from '../db';

const router = Router();

router.use(authenticateToken);

/**
 * GET /api/calendar/team?month=2025-01&department=Engineering
 * Returns combined leave + WFH + OT + holidays for a given month.
 * HR_ADMIN/MANAGER see all; EMPLOYEE sees only their own.
 */
router.get('/team', cacheMiddleware(30000), async (req, res) => {
  try {
    const user = (req as any).user;
    const { month, department } = req.query as { month?: string; department?: string };

    // Default to current month
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const [year, mon] = targetMonth.split('-').map(Number);
    const startDate = `${targetMonth}-01`;
    const endDate = new Date(year, mon, 0).toISOString().slice(0, 10); // last day of month

    const isAdmin = user.role === 'HR_ADMIN';
    const isManager = user.role === 'MANAGER';

    // Build department filter SQL fragment
    const deptFilter = department ? `AND e.department = '${department.replace(/'/g, "''")}'` : '';

    // For EMPLOYEE role: only see own data
    const employeeFilter =
      !isAdmin && !isManager && user.employeeId
        ? `AND e.id = '${user.employeeId}'`
        : '';

    // For MANAGER: only see direct reports + self
    const managerFilter =
      isManager && user.employeeId
        ? `AND (e.manager_id = '${user.employeeId}' OR e.id = '${user.employeeId}')`
        : '';

    const roleFilter = employeeFilter || managerFilter;

    // 1. Leave requests
    const leaveResult = await query(
      `SELECT
         lr.id, 'leave' AS event_type,
         e.id AS employee_id, e.name AS employee_name, e.avatar, e.department,
         TO_CHAR(lr.start_date, 'YYYY-MM-DD') AS start_date,
         TO_CHAR(lr.end_date, 'YYYY-MM-DD') AS end_date,
         lr.leave_type AS sub_type, lr.status, lr.reason
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       WHERE lr.start_date <= $1 AND lr.end_date >= $2
         AND lr.status NOT IN ('Rejected', 'Cancelled')
         AND lr.deleted_at IS NULL
         ${deptFilter} ${roleFilter}
       ORDER BY lr.start_date`,
      [endDate, startDate]
    );

    // 2. WFH requests
    const wfhResult = await query(
      `SELECT
         wr.id, 'wfh' AS event_type,
         e.id AS employee_id, e.name AS employee_name, e.avatar, e.department,
         TO_CHAR(wr.date, 'YYYY-MM-DD') AS start_date,
         TO_CHAR(wr.date, 'YYYY-MM-DD') AS end_date,
         'WFH' AS sub_type, wr.status, wr.reason
       FROM wfh_requests wr
       JOIN employees e ON wr.employee_id = e.id
       WHERE wr.date >= $1 AND wr.date <= $2
         AND wr.status NOT IN ('rejected')
         ${deptFilter} ${roleFilter}
       ORDER BY wr.date`,
      [startDate, endDate]
    );

    // 3. OT requests
    const otResult = await query(
      `SELECT
         ot.id, 'ot' AS event_type,
         e.id AS employee_id, e.name AS employee_name, e.avatar, e.department,
         TO_CHAR(ot.date, 'YYYY-MM-DD') AS start_date,
         TO_CHAR(ot.date, 'YYYY-MM-DD') AS end_date,
         ot.ot_type AS sub_type, ot.status, ot.reason
       FROM ot_requests ot
       JOIN employees e ON ot.employee_id = e.id
       WHERE ot.date >= $1 AND ot.date <= $2
         AND ot.status NOT IN ('rejected')
         ${deptFilter} ${roleFilter}
       ORDER BY ot.date`,
      [startDate, endDate]
    );

    // 4. Holidays
    const holidayResult = await query(
      `SELECT id, 'holiday' AS event_type,
         NULL AS employee_id, name AS employee_name, NULL AS avatar, NULL AS department,
         TO_CHAR(date, 'YYYY-MM-DD') AS start_date,
         TO_CHAR(COALESCE(end_date, date), 'YYYY-MM-DD') AS end_date,
         'Holiday' AS sub_type, 'confirmed' AS status, name AS reason
       FROM holidays
       WHERE date >= $1 AND date <= $2
       ORDER BY date`,
      [startDate, endDate]
    );

    // 5. Get distinct departments for filter dropdown
    const deptResult = await query(
      `SELECT DISTINCT department FROM employees WHERE department IS NOT NULL ORDER BY department`
    );

    res.json({
      month: targetMonth,
      events: [
        ...leaveResult.rows,
        ...wfhResult.rows,
        ...otResult.rows,
        ...holidayResult.rows,
      ],
      departments: deptResult.rows.map((r: any) => r.department),
    });
  } catch (err) {
    console.error('Error fetching team calendar:', err);
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
});

export default router;
