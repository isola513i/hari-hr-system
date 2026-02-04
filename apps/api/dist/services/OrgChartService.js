"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgChartService = void 0;
const db_1 = require("../db");
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
function resolveAvatar(avatar, name) {
    if (!avatar)
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`;
    if (avatar.startsWith('/'))
        return `${BASE_URL}${avatar}`;
    return avatar;
}
class OrgChartService {
    /**
     * Get full org chart with enriched data
     * Optionally filter by department
     */
    getOrgChart(department) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const params = [];
            if (department) {
                params.push(department);
                queryText += ` AND e.department = $1`;
            }
            queryText += ` ORDER BY e.name`;
            const result = yield (0, db_1.query)(queryText, params);
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
        });
    }
    /**
     * Get org chart subtree rooted at a specific employee
     * Uses recursive CTE for efficient traversal
     */
    getSubTree(rootEmployeeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)(`WITH RECURSIVE org_tree AS (
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
      ORDER BY ot.name`, [rootEmployeeId]);
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
        });
    }
}
exports.OrgChartService = OrgChartService;
exports.default = new OrgChartService();
