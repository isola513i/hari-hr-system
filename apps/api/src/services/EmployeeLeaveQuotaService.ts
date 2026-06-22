import { query } from '../db';
import { EffectiveLeaveQuota, UpsertLeaveQuotaDTO } from '../models/EmployeeLeaveQuota';
import SystemConfigService from './SystemConfigService';
import { toInt } from '../utils/coerce';

export class EmployeeLeaveQuotaService {
    /**
     * Get effective quotas for an employee: per-employee override merged with global defaults
     */
    async getEffectiveQuotas(employeeId: string): Promise<EffectiveLeaveQuota[]> {
        const [globalQuotas, overridesResult] = await Promise.all([
            SystemConfigService.getLeaveQuotas(),
            query(
                'SELECT leave_type, total FROM employee_leave_quotas WHERE employee_id = $1',
                [employeeId]
            ),
        ]);

        const overrideMap = new Map<string, number>();
        for (const row of overridesResult.rows) {
            overrideMap.set(row.leave_type, toInt(row.total));
        }

        return globalQuotas.map(({ type, total: defaultTotal }) => {
            const hasOverride = overrideMap.has(type);
            return {
                type,
                total: hasOverride ? overrideMap.get(type)! : defaultTotal,
                isOverride: hasOverride,
                defaultTotal,
            };
        });
    }

    /**
     * Upsert (insert or update) override quotas for an employee
     */
    async upsertOverrides(employeeId: string, overrides: UpsertLeaveQuotaDTO[]): Promise<EffectiveLeaveQuota[]> {
        if (overrides.length === 0) {
            return this.getEffectiveQuotas(employeeId);
        }

        // Validate leave types against global config
        const globalQuotas = await SystemConfigService.getLeaveQuotas();
        const validTypes = new Set(globalQuotas.map(q => q.type));

        for (const o of overrides) {
            if (!validTypes.has(o.leaveType)) {
                const err: any = new Error(`Invalid leave type: ${o.leaveType}`);
                err.statusCode = 400;
                throw err;
            }
            if (o.total < -1) {
                const err: any = new Error(`Invalid total for ${o.leaveType}: must be >= -1`);
                err.statusCode = 400;
                throw err;
            }
        }

        // PostgreSQL UPSERT using ON CONFLICT
        for (const { leaveType, total } of overrides) {
            await query(
                `INSERT INTO employee_leave_quotas (employee_id, leave_type, total)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (employee_id, leave_type)
                 DO UPDATE SET total = $3, updated_at = CURRENT_TIMESTAMP`,
                [employeeId, leaveType, total]
            );
        }

        return this.getEffectiveQuotas(employeeId);
    }

    /**
     * Delete a single override, reverting that leave type to the global default
     */
    async deleteOverride(employeeId: string, leaveType: string): Promise<EffectiveLeaveQuota[]> {
        await query(
            'DELETE FROM employee_leave_quotas WHERE employee_id = $1 AND leave_type = $2',
            [employeeId, leaveType]
        );
        return this.getEffectiveQuotas(employeeId);
    }
}

export default new EmployeeLeaveQuotaService();
