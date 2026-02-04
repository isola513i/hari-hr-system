import { query } from '../db';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

function resolveAvatar(avatar: string | null, name: string): string {
  if (!avatar) return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`;
  if (avatar.startsWith('/')) return `${BASE_URL}${avatar}`;
  return avatar;
}

export interface OrgChartNode {
  id: string;
  parentId: string | null;
  name: string;
  role: string;
  email: string;
  avatar: string;
  department: string;
  status: string;
  directReportCount: number;
}

export class OrgChartService {
  /**
   * Get full org chart with enriched data
   * Optionally filter by department
   */
  async getOrgChart(department?: string): Promise<OrgChartNode[]> {
    let queryText = `
      SELECT
        e.id,
        e.manager_id AS "parentId",
        e.name,
        e.role,
        e.email,
        e.avatar,
        e.department,
        e.status,
        (SELECT COUNT(*) FROM employees dr WHERE dr.manager_id = e.id AND dr.status != 'Terminated')::int AS "directReportCount"
      FROM employees e
      WHERE e.status != 'Terminated'
    `;
    const params: string[] = [];

    if (department) {
      params.push(department);
      queryText += ` AND e.department = $1`;
    }

    queryText += ` ORDER BY e.name`;

    const result = await query(queryText, params);

    return result.rows.map(row => ({
      id: row.id,
      parentId: row.parentId || null,
      name: row.name,
      role: row.role,
      email: row.email,
      avatar: resolveAvatar(row.avatar, row.name),
      department: row.department || '',
      status: row.status || 'Active',
      directReportCount: row.directReportCount || 0,
    }));
  }

  /**
   * Get org chart subtree rooted at a specific employee
   * Uses recursive CTE for efficient traversal
   */
  async getSubTree(rootEmployeeId: string): Promise<OrgChartNode[]> {
    const result = await query(
      `WITH RECURSIVE org_tree AS (
        SELECT id, manager_id, name, role, email, avatar, department, status
        FROM employees
        WHERE id = $1
        UNION ALL
        SELECT e.id, e.manager_id, e.name, e.role, e.email, e.avatar, e.department, e.status
        FROM employees e
        INNER JOIN org_tree ot ON e.manager_id = ot.id
        WHERE e.status != 'Terminated'
      )
      SELECT
        ot.id,
        ot.manager_id AS "parentId",
        ot.name,
        ot.role,
        ot.email,
        ot.avatar,
        ot.department,
        ot.status,
        (SELECT COUNT(*) FROM employees dr WHERE dr.manager_id = ot.id AND dr.status != 'Terminated')::int AS "directReportCount"
      FROM org_tree ot
      ORDER BY ot.name`,
      [rootEmployeeId]
    );

    return result.rows.map(row => ({
      id: row.id,
      parentId: row.parentId || null,
      name: row.name,
      role: row.role,
      email: row.email,
      avatar: resolveAvatar(row.avatar, row.name),
      department: row.department || '',
      status: row.status || 'Active',
      directReportCount: row.directReportCount || 0,
    }));
  }
}

export default new OrgChartService();
