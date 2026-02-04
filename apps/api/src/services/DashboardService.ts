import { query } from '../db';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

function resolveAvatar(avatar: string | null, name: string): string {
  if (!avatar) return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`;
  if (avatar.startsWith('/')) return `${BASE_URL}${avatar}`;
  return avatar;
}

export interface EmployeeStats {
  leaveBalance: number;
  nextPayday: string | null;
  pendingReviews: number;
  pendingSurveys: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string | null;
  status: string;
  department: string;
}

export interface MyTeamHierarchy {
  manager: TeamMember | null;
  peers: TeamMember[];
  directReports: TeamMember[];
  stats: {
    totalDirectReports: number;
    peersCount: number;
    departmentsInTeam: number;
  };
}

export class DashboardService {
  /**
   * Get employee dashboard stats
   */
  async getEmployeeStats(employeeId: string): Promise<EmployeeStats> {
    // Get leave balance
    const leaveBalance = await this.getLeaveBalance(employeeId);

    // Get next payday
    const nextPayday = await this.getNextPayday();

    // Get pending reviews count
    const pendingReviews = await this.getPendingReviewsCount(employeeId);

    // Get pending surveys count
    const pendingSurveys = await this.getPendingSurveysCount(employeeId);

    return {
      leaveBalance,
      nextPayday,
      pendingReviews,
      pendingSurveys,
    };
  }

  /**
   * Calculate leave balance for employee
   */
  private async getLeaveBalance(employeeId: string): Promise<number> {
    // Total annual leave days (default 14)
    const totalDays = 14;

    // Get used days from approved leave requests this year
    const result = await query(
      `SELECT COALESCE(SUM((end_date::date - start_date::date) + 1), 0) as used_days
       FROM leave_requests
       WHERE employee_id = $1
       AND status = 'Approved'
       AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [employeeId]
    );

    const usedDays = parseInt(result.rows[0]?.used_days || '0', 10);
    return Math.max(0, totalDays - usedDays);
  }

  /**
   * Get next payday based on company policy
   * Default: End of month (30th or last day)
   */
  private async getNextPayday(): Promise<string | null> {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    // Payday is typically the 30th or last day of month
    const payday = 30;

    let nextPaydayDate: Date;

    if (currentDay <= payday) {
      // Payday is this month
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const actualPayday = Math.min(payday, lastDayOfMonth);
      nextPaydayDate = new Date(currentYear, currentMonth, actualPayday);
    } else {
      // Payday is next month
      const lastDayOfNextMonth = new Date(currentYear, currentMonth + 2, 0).getDate();
      const actualPayday = Math.min(payday, lastDayOfNextMonth);
      nextPaydayDate = new Date(currentYear, currentMonth + 1, actualPayday);
    }

    // Format as "Feb 28" style
    return nextPaydayDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Get count of pending performance reviews for employee
   * A review is "pending" if:
   * 1. Employee hasn't received a review in the current quarter
   * 2. Or there's a scheduled review due
   */
  private async getPendingReviewsCount(employeeId: string): Promise<number> {
    // Check if there's a review in the current quarter
    const result = await query(
      `SELECT COUNT(*) as review_count
       FROM performance_reviews
       WHERE employee_id = $1
       AND date >= DATE_TRUNC('quarter', CURRENT_DATE)
       AND date <= CURRENT_DATE`,
      [employeeId]
    );

    const hasCurrentQuarterReview = parseInt(result.rows[0]?.review_count || '0', 10) > 0;

    // If no review this quarter, count as 1 pending
    // In a more sophisticated system, you'd check scheduled reviews
    return hasCurrentQuarterReview ? 0 : 1;
  }

  /**
   * Get count of pending surveys for employee
   */
  private async getPendingSurveysCount(employeeId: string): Promise<number> {
    // Check if surveys table exists and get pending count
    try {
      const result = await query(
        `SELECT COUNT(*) as pending_count
         FROM surveys s
         WHERE s.status = 'Active'
         AND s.end_date >= CURRENT_DATE
         AND NOT EXISTS (
           SELECT 1 FROM survey_responses sr
           WHERE sr.survey_id = s.id
           AND sr.employee_id = $1
         )`,
        [employeeId]
      );
      return parseInt(result.rows[0]?.pending_count || '0', 10);
    } catch {
      // Table doesn't exist yet
      return 0;
    }
  }

  /**
   * Get team members for an employee
   * Returns colleagues in the same department
   */
  async getMyTeam(employeeId: string, limit: number = 5): Promise<TeamMember[]> {
    // First get the employee's department
    const empResult = await query(
      'SELECT department FROM employees WHERE id = $1',
      [employeeId]
    );

    if (empResult.rows.length === 0) {
      return [];
    }

    const department = empResult.rows[0].department;

    // Get team members in same department (excluding self)
    const result = await query(
      `SELECT id, name, role, email, avatar, status, department
       FROM employees
       WHERE department = $1
       AND id != $2
       AND status != 'Terminated'
       ORDER BY name
       LIMIT $3`,
      [department, employeeId, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      role: row.role,
      email: row.email,
      avatar: resolveAvatar(row.avatar, row.name),
      status: row.status,
      department: row.department,
    }));
  }

  /**
   * Get direct reports for a manager
   */
  async getDirectReports(managerId: string): Promise<TeamMember[]> {
    const result = await query(
      `SELECT id, name, role, email, avatar, status, department
       FROM employees
       WHERE manager_id = $1
       AND status != 'Terminated'
       ORDER BY name`,
      [managerId]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      role: row.role,
      email: row.email,
      avatar: resolveAvatar(row.avatar, row.name),
      status: row.status,
      department: row.department,
    }));
  }

  /**
   * Get full team hierarchy for an employee
   * Returns: manager, peers (same manager), direct reports, and stats
   */
  async getMyTeamHierarchy(employeeId: string): Promise<MyTeamHierarchy> {
    // Step 1: Get the employee's manager_id
    const empResult = await query(
      'SELECT manager_id FROM employees WHERE id = $1',
      [employeeId]
    );

    if (empResult.rows.length === 0) {
      return {
        manager: null,
        peers: [],
        directReports: [],
        stats: { totalDirectReports: 0, peersCount: 0, departmentsInTeam: 0 },
      };
    }

    const managerId = empResult.rows[0].manager_id;

    // Step 2: Run queries in parallel for performance
    const [managerResult, peersResult, directReportsResult] = await Promise.all([
      // Get manager info
      managerId
        ? query(
            `SELECT id, name, role, email, avatar, status, department
             FROM employees WHERE id = $1`,
            [managerId]
          )
        : Promise.resolve({ rows: [] }),

      // Get peers (same manager, excluding self)
      managerId
        ? query(
            `SELECT id, name, role, email, avatar, status, department
             FROM employees
             WHERE manager_id = $1
             AND id != $2
             AND status != 'Terminated'
             ORDER BY name`,
            [managerId, employeeId]
          )
        : Promise.resolve({ rows: [] }),

      // Get direct reports
      query(
        `SELECT id, name, role, email, avatar, status, department
         FROM employees
         WHERE manager_id = $1
         AND status != 'Terminated'
         ORDER BY name`,
        [employeeId]
      ),
    ]);

    const mapRow = (row: any): TeamMember => ({
      id: row.id,
      name: row.name,
      role: row.role,
      email: row.email,
      avatar: resolveAvatar(row.avatar, row.name),
      status: row.status,
      department: row.department,
    });

    const manager = managerResult.rows.length > 0
      ? mapRow(managerResult.rows[0])
      : null;

    const peers = peersResult.rows.map(mapRow);
    const directReports = directReportsResult.rows.map(mapRow);

    // Calculate stats
    const departmentsSet = new Set(directReports.map(dr => dr.department).filter(Boolean));

    return {
      manager,
      peers,
      directReports,
      stats: {
        totalDirectReports: directReports.length,
        peersCount: peers.length,
        departmentsInTeam: departmentsSet.size,
      },
    };
  }
}

export default new DashboardService();
