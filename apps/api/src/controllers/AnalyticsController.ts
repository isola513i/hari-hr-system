import { Request, Response } from 'express';
import { query } from '../db';
import { getAuditLogs } from '../middlewares/auditLog';
import { projectForward, momentum } from '../utils/stats';
import logger from '../utils/logger';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Short label for a 'YYYY-MM' key, e.g. "Jul '25".
function monthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} '${String(y).slice(2)}`;
}

// Advance a 'YYYY-MM' key by `n` months.
function addMonths(yyyyMm: string, n: number): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  const total = (y * 12 + (m - 1)) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

class AnalyticsController {
  /**
   * GET /api/analytics/dashboard
   * Returns all analytics data in a single response for the Deep Analytics page.
   */
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const currentYear = new Date().getFullYear();
      const yearParam = parseInt(req.query.year as string, 10);
      const year = Number.isFinite(yearParam) && yearParam >= 2000 && yearParam <= currentYear
        ? yearParam
        : currentYear;

      const [
        headcount,
        departments,
        attendance,
        leaveByType,
        performance,
        turnover,
      ] = await Promise.all([
        this.fetchHeadcountGrowth(year),
        this.fetchDepartmentDistribution(),
        this.fetchAttendanceTrends(year),
        this.fetchLeaveByType(year),
        this.fetchPerformanceDistribution(year),
        this.fetchTurnover(year),
      ]);

      res.json({
        headcount,
        departments,
        attendance,
        leaveByType,
        performance,
        turnover,
      });
    } catch (err) {
      logger.error(err, 'Error fetching analytics dashboard:');
      res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
  }

  /**
   * GET /api/analytics/headcount-stats
   * Standalone headcount endpoint (used by AdminDashboard).
   */
  async getHeadcountStats(_req: Request, res: Response): Promise<void> {
    try {
      // "Headcount Trends" = total active headcount at each of the last 6
      // month-ends (cumulative), NOT new hires per month. Mirrors the
      // AdminDashboard client-side fallback so the line reflects real growth.
      const result = await query(`
        WITH months AS (
          SELECT (date_trunc('month', CURRENT_DATE) - (interval '1 month' * g))::date AS month_start
          FROM generate_series(5, 0, -1) g
        )
        SELECT
          EXTRACT(MONTH FROM month_start)::int AS month_num,
          (SELECT COUNT(*) FROM employees e
            WHERE e.join_date <= (month_start + interval '1 month - 1 day')
              AND (e.termination_date IS NULL OR e.termination_date > (month_start + interval '1 month - 1 day'))
          ) AS headcount
        FROM months
        ORDER BY month_start
      `);
      const data = result.rows.map((r: { month_num: number; headcount: string }) => ({
        name: MONTH_NAMES[r.month_num - 1],
        value: parseInt(r.headcount, 10),
      }));
      res.json(data);
    } catch (err) {
      logger.error(err, 'Error fetching headcount stats:');
      res.status(500).json({ error: 'Failed to get headcount stats' });
    }
  }

  /**
   * GET /api/analytics/audit-logs
   * In-memory audit logs for AdminDashboard.
   */
  async getAuditLogs(_req: Request, res: Response): Promise<void> {
    try {
      const auditLogs = getAuditLogs(100);
      const logs = auditLogs.map((log, index) => ({
        id: index + 1,
        user: log.userEmail || 'System',
        action: log.action,
        target: log.resource,
        time: new Date(log.timestamp).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
        }),
        type: log.resource === 'Employee' ? 'user' : log.resource === 'Leave Request' ? 'leave' : log.resource === 'Document' ? 'policy' : 'user',
      }));
      res.json(logs);
    } catch (err) {
      logger.error(err, 'Error fetching audit logs:');
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // PREDICTIVE ANALYTICS
  // ───────────────────────────────────────────────────────────────────────

  /**
   * GET /api/analytics/headcount-forecast
   * Active headcount at each of the last 12 month-ends, plus a 3-month linear
   * projection with a 95% confidence band.
   */
  async getHeadcountForecast(_req: Request, res: Response): Promise<void> {
    try {
      const result = await query(`
        WITH months AS (
          SELECT (date_trunc('month', CURRENT_DATE) - (interval '1 month' * g))::date AS month_start
          FROM generate_series(1, 12) g
        )
        SELECT
          TO_CHAR(month_start, 'YYYY-MM') AS month,
          (SELECT COUNT(*) FROM employees e
            WHERE e.join_date <= (month_start + interval '1 month - 1 day')
              AND (e.termination_date IS NULL OR e.termination_date > (month_start + interval '1 month - 1 day'))
          ) AS headcount
        FROM months
        ORDER BY month_start
      `);

      const history = result.rows.map((r: { month: string; headcount: string }) => ({
        month: r.month,
        name: monthLabel(r.month),
        value: parseInt(r.headcount, 10),
      }));

      const series = history.map((h) => h.value);
      const projections = projectForward(series, 3);
      const lastMonth = history.length ? history[history.length - 1].month : null;
      const forecast = projections.map((p, i) => {
        const key = lastMonth ? addMonths(lastMonth, i + 1) : '';
        return { month: key, name: key ? monthLabel(key) : '', ...p };
      });

      res.json({ history, forecast, momentum: momentum(series) });
    } catch (err) {
      logger.error(err, 'Error fetching headcount forecast:');
      res.status(500).json({ error: 'Failed to fetch headcount forecast' });
    }
  }

  /**
   * GET /api/analytics/leave-forecast
   * Approved leave-days per month over the last 12 months, plus a 3-month
   * projection of expected leave demand.
   */
  async getLeaveForecast(_req: Request, res: Response): Promise<void> {
    try {
      const result = await query(`
        WITH months AS (
          SELECT (date_trunc('month', CURRENT_DATE) - (interval '1 month' * g))::date AS month_start
          FROM generate_series(1, 12) g
        )
        SELECT
          TO_CHAR(m.month_start, 'YYYY-MM') AS month,
          COALESCE(SUM(
            CASE WHEN lr.end_date >= lr.start_date
              THEN (lr.end_date - lr.start_date + 1) ELSE 0 END
          ), 0) AS days
        FROM months m
        LEFT JOIN leave_requests lr
          ON date_trunc('month', lr.start_date) = m.month_start
          AND lr.status = 'Approved'
          AND lr.deleted_at IS NULL
        GROUP BY m.month_start
        ORDER BY m.month_start
      `);

      const history = result.rows.map((r: { month: string; days: string }) => ({
        month: r.month,
        name: monthLabel(r.month),
        value: parseInt(r.days, 10),
      }));

      const series = history.map((h) => h.value);
      const projections = projectForward(series, 3);
      const lastMonth = history.length ? history[history.length - 1].month : null;
      const forecast = projections.map((p, i) => {
        const key = lastMonth ? addMonths(lastMonth, i + 1) : '';
        return { month: key, name: key ? monthLabel(key) : '', ...p };
      });

      res.json({ history, forecast, momentum: momentum(series) });
    } catch (err) {
      logger.error(err, 'Error fetching leave forecast:');
      res.status(500).json({ error: 'Failed to fetch leave forecast' });
    }
  }

  /**
   * GET /api/analytics/attrition-risk
   * Per-department turnover over the last 6 months with a risk flag.
   * rate = departures / (active + departures); >20% high, >10% medium, else low.
   */
  async getAttritionRisk(_req: Request, res: Response): Promise<void> {
    try {
      const result = await query(`
        SELECT
          department,
          COUNT(*) FILTER (WHERE status = 'Active') AS active,
          COUNT(*) FILTER (
            WHERE termination_date IS NOT NULL
              AND termination_date >= CURRENT_DATE - INTERVAL '6 months'
          ) AS departures
        FROM employees
        WHERE department IS NOT NULL
        GROUP BY department
        ORDER BY department
      `);

      const departments = result.rows.map((r: { department: string; active: string; departures: string }) => {
        const active = parseInt(r.active, 10);
        const departures = parseInt(r.departures, 10);
        const denom = active + departures;
        const rate = denom > 0 ? Math.round((departures / denom) * 1000) / 10 : 0; // %
        const risk = rate > 20 ? 'high' : rate > 10 ? 'medium' : 'low';
        return { department: r.department, active, departures, turnoverRate: rate, risk };
      });

      res.json({ departments });
    } catch (err) {
      logger.error(err, 'Error fetching attrition risk:');
      res.status(500).json({ error: 'Failed to fetch attrition risk' });
    }
  }

  // ── Headcount Growth (new hires per month for selected year) ──────────
  private async fetchHeadcountGrowth(year: number) {
    const result = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', COALESCE(join_date, created_at::date)), 'YYYY-MM') AS month,
        COUNT(*) AS count
      FROM employees
      WHERE EXTRACT(YEAR FROM COALESCE(join_date, created_at::date)) = $1
      GROUP BY month
      ORDER BY month
    `, [year]);

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const countMap = new Map<string, number>();
    for (const r of result.rows as { month: string; count: string }[]) {
      countMap.set(r.month, parseInt(r.count, 10));
    }

    const now = new Date();
    const lastMonth = year === now.getFullYear() ? now.getMonth() : 11;
    const data = [];
    for (let m = 0; m <= lastMonth; m++) {
      const key = `${year}-${String(m + 1).padStart(2, '0')}`;
      data.push({ name: monthNames[m], value: countMap.get(key) || 0 });
    }
    return data;
  }

  // ── Department Distribution (active employees) ─────────────────────
  private async fetchDepartmentDistribution() {
    const result = await query(`
      SELECT department, COUNT(*) AS count
      FROM employees
      WHERE status = 'Active' AND department IS NOT NULL
      GROUP BY department
      ORDER BY count DESC
    `);
    return result.rows.map((r: { department: string; count: string }) => ({
      name: r.department,
      value: parseInt(r.count, 10),
    }));
  }

  // ── Attendance Trends (last 14 weekdays of selected year) ───────────
  private async fetchAttendanceTrends(year: number) {
    const isCurrentYear = year === new Date().getFullYear();
    const result = await query(`
      SELECT
        TO_CHAR(date, 'MM/DD') AS day,
        date,
        COUNT(*) FILTER (WHERE status = 'On-time') AS on_time,
        COUNT(*) FILTER (WHERE status = 'Late') AS late,
        COUNT(*) FILTER (WHERE status = 'Absent') AS absent
      FROM attendance_records
      WHERE deleted_at IS NULL
        AND EXTRACT(YEAR FROM date) = $1
        AND EXTRACT(DOW FROM date) BETWEEN 1 AND 5
        ${isCurrentYear ? "AND date >= CURRENT_DATE - INTERVAL '21 days'" : ''}
      GROUP BY date
      ORDER BY date DESC
      LIMIT 14
    `, [year]);
    return result.rows
      .map((r: { day: string; on_time: string; late: string; absent: string }) => ({
        day: r.day,
        onTime: parseInt(r.on_time, 10),
        late: parseInt(r.late, 10),
        absent: parseInt(r.absent, 10),
      }))
      .reverse();
  }

  // ── Leave Usage by Type (approved, selected year) ──────────────────
  private async fetchLeaveByType(year: number) {
    const result = await query(`
      SELECT
        leave_type AS type,
        COUNT(*) AS requests,
        COALESCE(SUM(
          CASE WHEN end_date >= start_date
            THEN (end_date - start_date + 1)
            ELSE 0 END
        ), 0) AS days
      FROM leave_requests
      WHERE status = 'Approved'
        AND deleted_at IS NULL
        AND EXTRACT(YEAR FROM start_date) = $1
      GROUP BY leave_type
      ORDER BY days DESC
    `, [year]);
    return result.rows.map((r: { type: string; requests: string; days: string }) => ({
      type: r.type,
      requests: parseInt(r.requests, 10),
      days: parseInt(r.days, 10),
    }));
  }

  // ── Performance Rating Distribution (selected year) ────────────────
  private async fetchPerformanceDistribution(year: number) {
    const result = await query(`
      SELECT rating, COUNT(*) AS count
      FROM performance_reviews
      WHERE EXTRACT(YEAR FROM date) = $1
      GROUP BY rating
      ORDER BY rating
    `, [year]);

    const labels = ['', 'Needs Improvement', 'Developing', 'Solid Performer', 'Exceeds', 'Outstanding'];
    // Fill all ratings 1-5 even if some have 0
    const countMap = new Map<number, number>();
    for (const r of result.rows as { rating: number; count: string }[]) {
      countMap.set(r.rating, parseInt(r.count, 10));
    }

    return [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      label: labels[rating],
      count: countMap.get(rating) || 0,
    }));
  }

  // ── Turnover: Hires vs Departures (selected year) ─────────────────
  private async fetchTurnover(year: number) {
    const hiresResult = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', COALESCE(join_date, created_at::date)), 'YYYY-MM') AS month,
        COUNT(*) AS count
      FROM employees
      WHERE EXTRACT(YEAR FROM COALESCE(join_date, created_at::date)) = $1
      GROUP BY month
      ORDER BY month
    `, [year]);

    const departuresResult = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', end_date), 'YYYY-MM') AS month,
        COUNT(*) AS count
      FROM job_history
      WHERE end_date IS NOT NULL
        AND EXTRACT(YEAR FROM end_date) = $1
      GROUP BY month
      ORDER BY month
    `, [year]);

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const hiresMap = new Map<string, number>();
    const deptMap = new Map<string, number>();

    for (const r of hiresResult.rows as { month: string; count: string }[]) {
      hiresMap.set(r.month, parseInt(r.count, 10));
    }
    for (const r of departuresResult.rows as { month: string; count: string }[]) {
      deptMap.set(r.month, parseInt(r.count, 10));
    }

    const now = new Date();
    const lastMonth = year === now.getFullYear() ? now.getMonth() : 11;
    const result = [];
    for (let m = 0; m <= lastMonth; m++) {
      const key = `${year}-${String(m + 1).padStart(2, '0')}`;
      result.push({
        name: months[m],
        hires: hiresMap.get(key) || 0,
        departures: deptMap.get(key) || 0,
      });
    }
    return result;
  }
}

export default new AnalyticsController();
