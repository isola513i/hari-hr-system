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
exports.PayrollService = void 0;
const db_1 = require("../db");
// Tax brackets (simplified)
const TAX_BRACKETS = [
    { min: 0, max: 50000, rate: 0.10 },
    { min: 50000, max: 100000, rate: 0.15 },
    { min: 100000, max: 200000, rate: 0.20 },
    { min: 200000, max: Infinity, rate: 0.25 },
];
class PayrollService {
    /**
     * Calculate tax based on annual salary
     */
    calculateTax(annualSalary) {
        let tax = 0;
        let remainingSalary = annualSalary;
        for (const bracket of TAX_BRACKETS) {
            if (remainingSalary <= 0)
                break;
            const taxableInBracket = Math.min(remainingSalary, bracket.max - bracket.min);
            tax += taxableInBracket * bracket.rate;
            remainingSalary -= taxableInBracket;
        }
        return Math.round(tax * 100) / 100;
    }
    /**
     * Create payroll record for an employee
     */
    createPayroll(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { employeeId, payPeriodStart, payPeriodEnd, baseSalary, overtimeHours = 0, bonus = 0, deductions = 0, } = data;
            // Calculate overtime pay (1.5x hourly rate)
            const hourlyRate = baseSalary / 160; // Assuming 160 hours/month
            const overtimePay = Math.round(overtimeHours * hourlyRate * 1.5 * 100) / 100;
            // Calculate gross pay
            const grossPay = baseSalary + overtimePay + bonus;
            // Calculate tax (monthly portion)
            const annualSalary = baseSalary * 12;
            const monthlyTax = Math.round(this.calculateTax(annualSalary) / 12 * 100) / 100;
            // Calculate net pay
            const netPay = Math.round((grossPay - deductions - monthlyTax) * 100) / 100;
            const result = yield (0, db_1.query)(`INSERT INTO payroll_records
       (employee_id, pay_period_start, pay_period_end, base_salary, overtime_hours, overtime_pay, bonus, deductions, tax_amount, net_pay)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`, [employeeId, payPeriodStart, payPeriodEnd, baseSalary, overtimeHours, overtimePay, bonus, deductions, monthlyTax, netPay]);
            return this.mapRowToPayroll(result.rows[0]);
        });
    }
    /**
     * Get payroll records for an employee
     */
    getPayrollByEmployee(employeeId_1) {
        return __awaiter(this, arguments, void 0, function* (employeeId, limit = 12) {
            const result = yield (0, db_1.query)(`SELECT * FROM payroll_records
       WHERE employee_id = $1
       ORDER BY pay_period_start DESC
       LIMIT $2`, [employeeId, limit]);
            return result.rows.map(this.mapRowToPayroll);
        });
    }
    /**
     * Get payroll by ID
     */
    getPayrollById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)('SELECT * FROM payroll_records WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToPayroll(result.rows[0]);
        });
    }
    /**
     * Update payroll status
     */
    updatePayrollStatus(id, status, paymentMethod) {
        return __awaiter(this, void 0, void 0, function* () {
            const paymentDate = status === 'Paid' ? new Date().toISOString().split('T')[0] : null;
            const result = yield (0, db_1.query)(`UPDATE payroll_records
       SET status = $1, payment_date = $2, payment_method = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`, [status, paymentDate, paymentMethod, id]);
            if (result.rows.length === 0) {
                throw new Error('Payroll record not found');
            }
            return this.mapRowToPayroll(result.rows[0]);
        });
    }
    /**
     * Get payroll summary for a period
     */
    getPayrollSummary(startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)(`SELECT
        COALESCE(SUM(net_pay), 0) as total_payroll,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COUNT(DISTINCT employee_id) as total_employees,
        COUNT(*) FILTER (WHERE status = 'Pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'Processed') as processed_count,
        COUNT(*) FILTER (WHERE status = 'Paid') as paid_count
       FROM payroll_records
       WHERE pay_period_start >= $1 AND pay_period_end <= $2`, [startDate, endDate]);
            const row = result.rows[0];
            return {
                totalPayroll: parseFloat(row.total_payroll),
                totalTax: parseFloat(row.total_tax),
                totalEmployees: parseInt(row.total_employees, 10),
                pendingCount: parseInt(row.pending_count, 10),
                processedCount: parseInt(row.processed_count, 10),
                paidCount: parseInt(row.paid_count, 10),
            };
        });
    }
    /**
     * Update employee salary and record history
     */
    updateSalary(employeeId, newSalary, changeReason, approvedById) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get current salary
            const currentResult = yield (0, db_1.query)('SELECT base_salary FROM salary_history WHERE employee_id = $1 ORDER BY effective_date DESC LIMIT 1', [employeeId]);
            const previousSalary = currentResult.rows.length > 0 ? currentResult.rows[0].base_salary : null;
            // Insert new salary history
            const result = yield (0, db_1.query)(`INSERT INTO salary_history (employee_id, effective_date, base_salary, previous_salary, change_reason, approved_by)
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)
       RETURNING *`, [employeeId, newSalary, previousSalary, changeReason, approvedById]);
            return this.mapRowToSalaryHistory(result.rows[0]);
        });
    }
    /**
     * Get salary history for an employee
     */
    getSalaryHistory(employeeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)('SELECT * FROM salary_history WHERE employee_id = $1 ORDER BY effective_date DESC', [employeeId]);
            return result.rows.map(this.mapRowToSalaryHistory);
        });
    }
    mapRowToPayroll(row) {
        return {
            id: row.id,
            employeeId: row.employee_id,
            payPeriodStart: row.pay_period_start,
            payPeriodEnd: row.pay_period_end,
            baseSalary: parseFloat(row.base_salary),
            overtimeHours: parseFloat(row.overtime_hours),
            overtimePay: parseFloat(row.overtime_pay),
            bonus: parseFloat(row.bonus),
            deductions: parseFloat(row.deductions),
            taxAmount: parseFloat(row.tax_amount),
            netPay: parseFloat(row.net_pay),
            status: row.status,
            paymentDate: row.payment_date,
            paymentMethod: row.payment_method,
            notes: row.notes,
            createdAt: row.created_at,
        };
    }
    mapRowToSalaryHistory(row) {
        return {
            id: row.id,
            employeeId: row.employee_id,
            effectiveDate: row.effective_date,
            baseSalary: parseFloat(row.base_salary),
            previousSalary: row.previous_salary ? parseFloat(row.previous_salary) : null,
            changeReason: row.change_reason,
            approvedBy: row.approved_by,
            createdAt: row.created_at,
        };
    }
}
exports.PayrollService = PayrollService;
exports.default = new PayrollService();
