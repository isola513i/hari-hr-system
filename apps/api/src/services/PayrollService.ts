import { query } from '../db';

export interface PayrollRecord {
  id: string;
  employeeId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  baseSalary: number;
  overtimeHours: number;
  overtimePay: number;
  bonus: number;
  deductions: number;
  taxAmount: number;
  netPay: number;
  status: 'Pending' | 'Processed' | 'Paid';
  paymentDate: string | null;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface CreatePayrollData {
  employeeId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  baseSalary: number;
  overtimeHours?: number;
  bonus?: number;
  deductions?: number;
}

export interface SalaryHistory {
  id: string;
  employeeId: string;
  effectiveDate: string;
  baseSalary: number;
  previousSalary: number | null;
  changeReason: string | null;
  approvedBy: string | null;
  createdAt: Date;
}

// Tax brackets (simplified)
const TAX_BRACKETS = [
  { min: 0, max: 50000, rate: 0.10 },
  { min: 50000, max: 100000, rate: 0.15 },
  { min: 100000, max: 200000, rate: 0.20 },
  { min: 200000, max: Infinity, rate: 0.25 },
];

export class PayrollService {
  /**
   * Calculate tax based on annual salary
   */
  private calculateTax(annualSalary: number): number {
    let tax = 0;
    let remainingSalary = annualSalary;

    for (const bracket of TAX_BRACKETS) {
      if (remainingSalary <= 0) break;

      const taxableInBracket = Math.min(remainingSalary, bracket.max - bracket.min);
      tax += taxableInBracket * bracket.rate;
      remainingSalary -= taxableInBracket;
    }

    return Math.round(tax * 100) / 100;
  }

  /**
   * Create payroll record for an employee
   */
  async createPayroll(data: CreatePayrollData): Promise<PayrollRecord> {
    const {
      employeeId,
      payPeriodStart,
      payPeriodEnd,
      baseSalary,
      overtimeHours = 0,
      bonus = 0,
      deductions = 0,
    } = data;

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

    const result = await query(
      `INSERT INTO payroll_records
       (employee_id, pay_period_start, pay_period_end, base_salary, overtime_hours, overtime_pay, bonus, deductions, tax_amount, net_pay)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [employeeId, payPeriodStart, payPeriodEnd, baseSalary, overtimeHours, overtimePay, bonus, deductions, monthlyTax, netPay]
    );

    return this.mapRowToPayroll(result.rows[0]);
  }

  /**
   * Get payroll records for an employee
   */
  async getPayrollByEmployee(employeeId: string, limit: number = 12): Promise<PayrollRecord[]> {
    const result = await query(
      `SELECT * FROM payroll_records
       WHERE employee_id = $1
       ORDER BY pay_period_start DESC
       LIMIT $2`,
      [employeeId, limit]
    );

    return result.rows.map(this.mapRowToPayroll);
  }

  /**
   * Get payroll by ID
   */
  async getPayrollById(id: string): Promise<PayrollRecord | null> {
    const result = await query('SELECT * FROM payroll_records WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPayroll(result.rows[0]);
  }

  /**
   * Update payroll status
   */
  async updatePayrollStatus(
    id: string,
    status: 'Pending' | 'Processed' | 'Paid',
    paymentMethod?: string
  ): Promise<PayrollRecord> {
    const paymentDate = status === 'Paid' ? new Date().toISOString().split('T')[0] : null;

    const result = await query(
      `UPDATE payroll_records
       SET status = $1, payment_date = $2, payment_method = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, paymentDate, paymentMethod, id]
    );

    if (result.rows.length === 0) {
      throw new Error('Payroll record not found');
    }

    return this.mapRowToPayroll(result.rows[0]);
  }

  /**
   * Get payroll summary for a period
   */
  async getPayrollSummary(startDate: string, endDate: string): Promise<{
    totalPayroll: number;
    totalTax: number;
    totalEmployees: number;
    pendingCount: number;
    processedCount: number;
    paidCount: number;
  }> {
    const result = await query(
      `SELECT
        COALESCE(SUM(net_pay), 0) as total_payroll,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COUNT(DISTINCT employee_id) as total_employees,
        COUNT(*) FILTER (WHERE status = 'Pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'Processed') as processed_count,
        COUNT(*) FILTER (WHERE status = 'Paid') as paid_count
       FROM payroll_records
       WHERE pay_period_start >= $1 AND pay_period_end <= $2`,
      [startDate, endDate]
    );

    const row = result.rows[0];
    return {
      totalPayroll: parseFloat(row.total_payroll),
      totalTax: parseFloat(row.total_tax),
      totalEmployees: parseInt(row.total_employees, 10),
      pendingCount: parseInt(row.pending_count, 10),
      processedCount: parseInt(row.processed_count, 10),
      paidCount: parseInt(row.paid_count, 10),
    };
  }

  /**
   * Update employee salary and record history
   */
  async updateSalary(
    employeeId: string,
    newSalary: number,
    changeReason: string,
    approvedById?: string
  ): Promise<SalaryHistory> {
    // Get current salary
    const currentResult = await query(
      'SELECT base_salary FROM salary_history WHERE employee_id = $1 ORDER BY effective_date DESC LIMIT 1',
      [employeeId]
    );

    const previousSalary = currentResult.rows.length > 0 ? currentResult.rows[0].base_salary : null;

    // Insert new salary history
    const result = await query(
      `INSERT INTO salary_history (employee_id, effective_date, base_salary, previous_salary, change_reason, approved_by)
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)
       RETURNING *`,
      [employeeId, newSalary, previousSalary, changeReason, approvedById]
    );

    return this.mapRowToSalaryHistory(result.rows[0]);
  }

  /**
   * Get salary history for an employee
   */
  async getSalaryHistory(employeeId: string): Promise<SalaryHistory[]> {
    const result = await query(
      'SELECT * FROM salary_history WHERE employee_id = $1 ORDER BY effective_date DESC',
      [employeeId]
    );

    return result.rows.map(this.mapRowToSalaryHistory);
  }

  private mapRowToPayroll(row: Record<string, unknown>): PayrollRecord {
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      payPeriodStart: row.pay_period_start as string,
      payPeriodEnd: row.pay_period_end as string,
      baseSalary: parseFloat(row.base_salary as string),
      overtimeHours: parseFloat(row.overtime_hours as string),
      overtimePay: parseFloat(row.overtime_pay as string),
      bonus: parseFloat(row.bonus as string),
      deductions: parseFloat(row.deductions as string),
      taxAmount: parseFloat(row.tax_amount as string),
      netPay: parseFloat(row.net_pay as string),
      status: row.status as PayrollRecord['status'],
      paymentDate: row.payment_date as string | null,
      paymentMethod: row.payment_method as string | null,
      notes: row.notes as string | null,
      createdAt: row.created_at as Date,
    };
  }

  private mapRowToSalaryHistory(row: Record<string, unknown>): SalaryHistory {
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      effectiveDate: row.effective_date as string,
      baseSalary: parseFloat(row.base_salary as string),
      previousSalary: row.previous_salary ? parseFloat(row.previous_salary as string) : null,
      changeReason: row.change_reason as string | null,
      approvedBy: row.approved_by as string | null,
      createdAt: row.created_at as Date,
    };
  }
}

export default new PayrollService();
