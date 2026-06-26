import { query } from '../db';
import {
    OffboardingTaskRow,
    ExitInterviewRow,
    OffboardingTaskResponse,
    ExitInterviewResponse,
    OffboardingProgress,
    InitiateOffboardingDTO,
    CreateOffboardingTaskDTO,
    UpdateOffboardingTaskDTO,
    ExitInterviewDTO,
} from '../models/Offboarding';
import { Employee } from '../models/Employee';
import EmployeeService from './EmployeeService';
import NotificationService from './NotificationService';

// ==========================================
// Row → Response Mappers
// ==========================================

function mapTaskRow(row: OffboardingTaskRow): OffboardingTaskResponse {
    return {
        id: row.id,
        employeeId: row.employee_id,
        title: row.title,
        description: row.description || '',
        stage: row.stage,
        assignee: row.assignee,
        dueDate: row.due_date || null,
        completed: row.completed,
        priority: row.priority || 'Medium',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapExitInterviewRow(row: ExitInterviewRow): ExitInterviewResponse {
    return {
        id: row.id,
        employeeId: row.employee_id,
        reasonForLeaving: row.reason_for_leaving,
        satisfactionRating: row.satisfaction_rating,
        wouldRehire: row.would_rehire,
        feedback: row.feedback,
        improvementsSuggested: row.improvements_suggested,
        conductedBy: row.conducted_by,
        conductedAt: row.conducted_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// ==========================================
// Default Offboarding Tasks (8 tasks)
// dueOffset = days relative to last_working_day
// ==========================================

interface DefaultOffboardingTask {
    stage: 'Pre-Exit' | 'Last Week' | 'Post-Exit';
    title: string;
    description: string;
    assignee: 'HR' | 'IT' | 'Manager' | 'Employee' | 'Finance';
    dueOffset: number;  // negative = before LWD, 0 = LWD, positive = after LWD
    priority: 'High' | 'Medium' | 'Low';
}

const DEFAULT_OFFBOARDING_TASKS: DefaultOffboardingTask[] = [
    {
        stage: 'Pre-Exit',
        title: 'Conduct exit interview',
        description: 'Schedule and conduct a structured exit interview to gather feedback and insights.',
        assignee: 'HR',
        dueOffset: -3,
        priority: 'High',
    },
    {
        stage: 'Pre-Exit',
        title: 'Notify team & stakeholders',
        description: 'Inform team members, key stakeholders, and clients about the employee\'s departure.',
        assignee: 'Manager',
        dueOffset: -5,
        priority: 'High',
    },
    {
        stage: 'Pre-Exit',
        title: 'Knowledge transfer document',
        description: 'Create comprehensive documentation of ongoing projects, processes, and institutional knowledge.',
        assignee: 'Employee',
        dueOffset: -5,
        priority: 'High',
    },
    {
        stage: 'Pre-Exit',
        title: 'Handover responsibilities',
        description: 'Formally hand over all duties, projects, and client relationships to designated successors.',
        assignee: 'Manager',
        dueOffset: -2,
        priority: 'High',
    },
    {
        stage: 'Last Week',
        title: 'Return company equipment (laptop, badge, etc.)',
        description: 'Return all company-issued equipment including laptop, access badge, phone, and peripherals.',
        assignee: 'Employee',
        dueOffset: 0,
        priority: 'High',
    },
    {
        stage: 'Last Week',
        title: 'Revoke IT access (email, Slack, credentials)',
        description: 'Disable all system access including email, Slack, VPN, code repositories, and internal tools.',
        assignee: 'IT',
        dueOffset: 0,
        priority: 'High',
    },
    {
        stage: 'Last Week',
        title: 'Final paystub & expense settlement',
        description: 'Process final payroll, outstanding expense claims, and any accrued vacation payout.',
        assignee: 'Finance',
        dueOffset: 0,
        priority: 'Medium',
    },
    {
        stage: 'Post-Exit',
        title: 'Archive employee documents',
        description: 'Archive all employee records, contracts, and HR documents per retention policy.',
        assignee: 'HR',
        dueOffset: 7,
        priority: 'Low',
    },
];

// ==========================================
// Service Class
// ==========================================

export class OffboardingService {

    /**
     * Initiate the offboarding flow for an employee.
     *
     * Guard (Refinement #2): throws if employee is already in 'Notice Period' or 'Terminated'.
     * Status transition: 'Active' | 'On Leave' → 'Notice Period' (NOT 'Terminated' yet).
     * Subordinates remain assigned until all tasks complete and status flips to 'Terminated'.
     */
    async initiateOffboarding(
        employeeId: string,
        dto: InitiateOffboardingDTO,
        actor: { userId: string; email: string },
    ): Promise<{ employee: Employee; tasks: OffboardingTaskResponse[] }> {

        // Block double-initiation (guard clause)
        const existing = await EmployeeService.getEmployeeById(employeeId);
        if (!existing) throw new Error('Employee not found');
        if (existing.status === 'Notice Period' || existing.status === 'Terminated') {
            throw new Error('Employee is already offboarding or terminated');
        }

        const now = new Date().toISOString();
        await query(
            `UPDATE employees
             SET status                    = 'Notice Period',
                 termination_reason        = $1,
                 last_working_day          = $2,
                 termination_notes         = $3,
                 terminated_by             = (SELECT id FROM users WHERE id = $4 LIMIT 1),
                 offboarding_initiated_at  = NOW()
             WHERE id = $5`,
            [
                dto.terminationReason,
                dto.lastWorkingDay,
                dto.terminationNotes ?? null,
                actor.userId,
                employeeId,
            ],
        );

        const tasks = await this._seedDefaultTasks(employeeId, dto.lastWorkingDay);

        // Patch the fetched object with known new values — avoids a second DB round-trip
        const updated: Employee = {
            ...existing,
            status: 'Notice Period',
            terminationReason: dto.terminationReason,
            lastWorkingDay: dto.lastWorkingDay,
            terminationNotes: dto.terminationNotes ?? null,
            terminatedBy: actor.userId,
            offboardingInitiatedAt: now,
        };

        await this._notifyAssignees(employeeId, updated, tasks);
        return { employee: updated, tasks };
    }

    /**
     * Get the full offboarding state for an employee:
     * tasks, exit interview, and progress summary.
     */
    async getOffboarding(employeeId: string): Promise<{
        employee: Employee | null;
        tasks: OffboardingTaskResponse[];
        exitInterview: ExitInterviewResponse | null;
        progress: OffboardingProgress;
    }> {
        const [employee, tasks, exitInterview] = await Promise.all([
            EmployeeService.getEmployeeById(employeeId),
            this._getTasksByEmployee(employeeId),
            this.getExitInterview(employeeId),
        ]);

        const progress = this._computeProgressFromTasks(tasks);

        return { employee, tasks, exitInterview, progress };
    }

    // ── Task CRUD ────────────────────────────────────────────────────────────

    async createTask(dto: CreateOffboardingTaskDTO): Promise<OffboardingTaskResponse> {
        const result = await query(
            `INSERT INTO offboarding_tasks
                (employee_id, title, description, stage, assignee, due_date, priority)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                dto.employeeId,
                dto.title,
                dto.description ?? null,
                dto.stage,
                dto.assignee,
                dto.dueDate ?? null,
                dto.priority ?? 'Medium',
            ],
        );
        return mapTaskRow(result.rows[0] as OffboardingTaskRow);
    }

    /**
     * Update a task.
     *
     * Auto-finalization (Refinement #1):
     * If dto.completed === true and all tasks are now done AND employee is in 'Notice Period',
     * flip status → 'Terminated' (triggers subordinate reassignment in EmployeeService).
     */
    async updateTask(
        id: string,
        dto: UpdateOffboardingTaskDTO,
        actor?: { userId: string; email: string },
    ): Promise<OffboardingTaskResponse | null> {

        const setClauses: string[] = [];
        const values: unknown[] = [];
        let p = 1;

        if (dto.title      !== undefined) { setClauses.push(`title = $${p++}`);       values.push(dto.title); }
        if (dto.description !== undefined) { setClauses.push(`description = $${p++}`); values.push(dto.description); }
        if (dto.stage      !== undefined) { setClauses.push(`stage = $${p++}`);       values.push(dto.stage); }
        if (dto.assignee   !== undefined) { setClauses.push(`assignee = $${p++}`);    values.push(dto.assignee); }
        if (dto.dueDate    !== undefined) { setClauses.push(`due_date = $${p++}`);    values.push(dto.dueDate); }
        if (dto.completed  !== undefined) { setClauses.push(`completed = $${p++}`);   values.push(dto.completed); }
        if (dto.priority   !== undefined) { setClauses.push(`priority = $${p++}`);    values.push(dto.priority); }

        if (setClauses.length === 0) return null;

        setClauses.push(`updated_at = NOW()`);
        values.push(id);

        const result = await query(
            `UPDATE offboarding_tasks SET ${setClauses.join(', ')} WHERE id = $${p} RETURNING *`,
            values,
        );

        if (result.rows.length === 0) return null;

        const updated = mapTaskRow(result.rows[0] as OffboardingTaskRow);

        // Auto-finalization check
        if (dto.completed === true) {
            await this._checkAndFinalize(updated.employeeId);
        }

        return updated;
    }

    async deleteTask(id: string): Promise<boolean> {
        const result = await query(
            `DELETE FROM offboarding_tasks WHERE id = $1 RETURNING id`,
            [id],
        );
        return (result.rowCount ?? 0) > 0;
    }

    // ── Exit Interview ────────────────────────────────────────────────────────

    /**
     * Upsert an exit interview for an employee.
     * ON CONFLICT (employee_id) DO UPDATE.
     */
    async saveExitInterview(
        employeeId: string,
        dto: ExitInterviewDTO,
        conductedBy: string,
    ): Promise<ExitInterviewResponse> {
        const result = await query(
            `INSERT INTO exit_interviews
                (employee_id, reason_for_leaving, satisfaction_rating, would_rehire,
                 feedback, improvements_suggested, conducted_by, conducted_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
             ON CONFLICT (employee_id) DO UPDATE SET
                reason_for_leaving     = EXCLUDED.reason_for_leaving,
                satisfaction_rating    = EXCLUDED.satisfaction_rating,
                would_rehire           = EXCLUDED.would_rehire,
                feedback               = EXCLUDED.feedback,
                improvements_suggested = EXCLUDED.improvements_suggested,
                conducted_by           = EXCLUDED.conducted_by,
                conducted_at           = NOW(),
                updated_at             = NOW()
             RETURNING *`,
            [
                employeeId,
                dto.reasonForLeaving ?? null,
                dto.satisfactionRating ?? null,
                dto.wouldRehire ?? null,
                dto.feedback ?? null,
                dto.improvementsSuggested ?? null,
                conductedBy,
            ],
        );
        return mapExitInterviewRow(result.rows[0] as ExitInterviewRow);
    }

    async getExitInterview(employeeId: string): Promise<ExitInterviewResponse | null> {
        const result = await query(
            `SELECT id, employee_id, reason_for_leaving, satisfaction_rating, would_rehire, feedback, improvements_suggested, conducted_by, conducted_at, created_at, updated_at FROM exit_interviews WHERE employee_id = $1`,
            [employeeId],
        );
        if (result.rows.length === 0) return null;
        return mapExitInterviewRow(result.rows[0] as ExitInterviewRow);
    }

    // ==========================================
    // Private helpers
    // ==========================================

    private async _getTasksByEmployee(employeeId: string): Promise<OffboardingTaskResponse[]> {
        const result = await query(
            `SELECT id, employee_id, title, description, stage, assignee, due_date, completed, priority, created_at, updated_at FROM offboarding_tasks WHERE employee_id = $1 ORDER BY due_date ASC NULLS LAST`,
            [employeeId],
        );
        return result.rows.map((r) => mapTaskRow(r as OffboardingTaskRow));
    }

    private _computeProgressFromTasks(tasks: OffboardingTaskResponse[]): OffboardingProgress {
        const total = tasks.length;
        const done  = tasks.filter((t) => t.completed).length;
        return {
            total,
            completed: done,
            percentage: total > 0 ? Math.round((done / total) * 100) : 0,
        };
    }

    /**
     * Seeds the 8 default offboarding tasks relative to lastWorkingDay.
     * Idempotent: skips if tasks already exist for this employee.
     */
    private async _seedDefaultTasks(
        employeeId: string,
        lastWorkingDay: string,
    ): Promise<OffboardingTaskResponse[]> {
        // Idempotency guard
        const existing = await query(
            `SELECT COUNT(*)::int AS cnt FROM offboarding_tasks WHERE employee_id = $1`,
            [employeeId],
        );
        if (existing.rows[0].cnt > 0) {
            return this._getTasksByEmployee(employeeId);
        }

        const lwd = new Date(lastWorkingDay);

        const valuesClauses: string[] = [];
        const params: unknown[] = [];
        let idx = 1;

        for (const task of DEFAULT_OFFBOARDING_TASKS) {
            const dueDate = new Date(lwd);
            dueDate.setDate(dueDate.getDate() + task.dueOffset);
            const dueDateStr = dueDate.toISOString().split('T')[0];

            valuesClauses.push(
                `($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7})`
            );
            params.push(
                employeeId,
                task.title,
                task.description,
                task.stage,
                task.assignee,
                dueDateStr,
                task.priority,
                false, // completed
            );
            idx += 8;
        }

        const result = await query(
            `INSERT INTO offboarding_tasks
                (employee_id, title, description, stage, assignee, due_date, priority, completed)
             VALUES ${valuesClauses.join(', ')}
             RETURNING *`,
            params,
        );

        return result.rows.map((r) => mapTaskRow(r as OffboardingTaskRow));
    }

    /**
     * Auto-finalize: triggered after any task completion.
     * Uses an aggregate query instead of fetching all tasks — avoids a full scan
     * on each of the 7 intermediate completions that don't reach 100%.
     * Employee is only fetched when we actually need to finalize.
     * Subordinate reassignment fires inside EmployeeService.updateEmployee
     * when status flips Terminated (Task 1.2 transaction).
     */
    private async _checkAndFinalize(employeeId: string): Promise<void> {
        const countResult = await query(
            `SELECT COUNT(*) FILTER (WHERE NOT completed) AS pending
             FROM offboarding_tasks WHERE employee_id = $1`,
            [employeeId],
        );
        const pending = parseInt(countResult.rows[0].pending, 10);
        if (pending > 0) return;

        const emp = await EmployeeService.getEmployeeById(employeeId);
        if (!emp || emp.status !== 'Notice Period') return;

        await EmployeeService.updateEmployee({ id: employeeId, status: 'Terminated' });
        await query(
            `UPDATE employees SET termination_date = CURRENT_DATE WHERE id = $1`,
            [employeeId],
        );

        NotificationService.notifyAdmins({
            title: `${emp.name} offboarding complete`,
            message: `All offboarding tasks completed. ${emp.name} is now terminated. Subordinates have been reassigned.`,
            type: 'info',
            link: `/employees/${employeeId}?tab=offboarding`,
        }).catch((err) => console.error('Offboarding finalization notify failed:', err));
    }

    /**
     * Resolve task assignee strings to real user IDs and dispatch notifications.
     * Dynamic routing (IT has no dedicated role — falls back to HR_ADMIN):
     *   'HR' | 'IT' → users WHERE role = 'HR_ADMIN'  (queried once, reused for both)
     *   'Finance'   → users WHERE role = 'FINANCE'
     *   'Manager'   → employees.user_id WHERE id = employee.managerId
     *   'Employee'  → employees.user_id WHERE id = employeeId
     */
    private async _notifyAssignees(
        employeeId: string,
        employee: Employee,
        tasks: OffboardingTaskResponse[],
    ): Promise<void> {
        const assigneeTypes = [...new Set(tasks.map((t) => t.assignee))];

        // Resolve role-based types in parallel; cache HR_ADMIN ids for both 'HR' and 'IT'
        const [hrAdminIds, financeIds, managerUserId, employeeUserId] = await Promise.all([
            assigneeTypes.some((a) => a === 'HR' || a === 'IT')
                ? query(`SELECT id FROM users WHERE role = 'HR_ADMIN'`).then((r) => r.rows.map((row) => row.id as string))
                : Promise.resolve([] as string[]),
            assigneeTypes.includes('Finance')
                ? query(`SELECT id FROM users WHERE role = 'FINANCE'`).then((r) => r.rows.map((row) => row.id as string))
                : Promise.resolve([] as string[]),
            assigneeTypes.includes('Manager') && employee.managerId
                ? query(`SELECT user_id FROM employees WHERE id = $1`, [employee.managerId]).then((r) => r.rows[0]?.user_id as string | undefined)
                : Promise.resolve(undefined),
            assigneeTypes.includes('Employee')
                ? query(`SELECT user_id FROM employees WHERE id = $1`, [employeeId]).then((r) => r.rows[0]?.user_id as string | undefined)
                : Promise.resolve(undefined),
        ]);

        const resolveIds = (assignee: string): string[] => {
            switch (assignee) {
                case 'HR':
                case 'IT':       return hrAdminIds;
                case 'Finance':  return financeIds;
                case 'Manager':  return managerUserId ? [managerUserId] : [];
                case 'Employee': return employeeUserId ? [employeeUserId] : [];
                default:         return [];
            }
        };

        const taskCountByAssignee = new Map<string, number>();
        for (const task of tasks) {
            taskCountByAssignee.set(task.assignee, (taskCountByAssignee.get(task.assignee) ?? 0) + 1);
        }

        for (const assignee of assigneeTypes) {
            const userIds = resolveIds(assignee);
            if (userIds.length === 0) continue;

            const count = taskCountByAssignee.get(assignee) ?? 0;
            const hasHighPriority = tasks.some((t) => t.assignee === assignee && t.priority === 'High');

            for (const userId of userIds) {
                NotificationService.create({
                    user_id: userId,
                    title: `Offboarding tasks assigned: ${employee.name}`,
                    message: `You have ${count} offboarding task${count !== 1 ? 's' : ''} for ${employee.name}'s departure.`,
                    type: hasHighPriority ? 'warning' : 'info',
                    link: `/employees/${employeeId}?tab=offboarding`,
                }).catch((err) => console.error('Offboarding notification failed:', err));
            }
        }
    }
}

export default new OffboardingService();
