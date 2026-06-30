import pool, { query } from '../db';
import SystemConfigService from './SystemConfigService';
import OTRequestService from './OTRequestService';
import { BusinessError } from '../utils/errorResponse';
import { resolveWorkDays } from '../utils/workdays';
import { holidayDateSql } from './HolidayService';
import logger from '../utils/logger';

export interface PayrollRecord {
  id: string;
  employeeId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  baseSalary: number;
  overtimeHours: number;
  overtimePay: number;
  bonus: number;
  leaveDeduction: number;
  deductions: number;
  taxAmount: number;
  ssfEmployee: number;
  ssfEmployer: number;
  pvfEmployee: number;
  pvfEmployer: number;
  netPay: number;
  status: 'Pending' | 'Processed' | 'Paid' | 'Cancelled';
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
  leaveDeduction?: number;
  deductions?: number;
}

export interface UpdatePayrollData {
  baseSalary?: number;
  overtimeHours?: number;
  bonus?: number;
  leaveDeduction?: number;
  deductions?: number;
  notes?: string;
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

// Default tax brackets (fallback if system_configs not set up)
const DEFAULT_TAX_BRACKETS = [
  { min: 0, max: 150000, rate: 0 },
  { min: 150000, max: 300000, rate: 0.05 },
  { min: 300000, max: 500000, rate: 0.10 },
  { min: 500000, max: 750000, rate: 0.15 },
  { min: 750000, max: 1000000, rate: 0.20 },
  { min: 1000000, max: 2000000, rate: 0.25 },
  { min: 2000000, max: 5000000, rate: 0.30 },
  { min: 5000000, max: -1, rate: 0.35 },
];

const DEFAULT_STANDARD_HOURS = 160;
const DEFAULT_PERSONAL_ALLOWANCE = 60000;
const DEFAULT_EXPENSE_DEDUCTION = 100000;
const DEFAULT_SSF_RATE = 0.05;
const DEFAULT_SSF_MAX_BASE = 15000;
const DEFAULT_PVF_EMPLOYEE_RATE = 0.03;
const DEFAULT_PVF_EMPLOYER_RATE = 0.03;
const DEFAULT_OT_MULTIPLIER = 1.5;
const DEFAULT_HOLIDAY_OT_MULTIPLIER = 3.0;
const DEFAULT_EXPENSE_DEDUCTION_RATE = 0.5;

interface PayrollConfig {
  standardHoursPerMonth: number;
  taxBrackets: { min: number; max: number; rate: number }[];
  personalAllowance: number;
  expenseDeduction: number;
  ssfRate: number;
  ssfMaxBase: number;
  pvfEmployeeRate: number;
  pvfEmployerRate: number;
  otMultiplier: number;
  holidayOtMultiplier: number;
  expenseDeductionRate: number;
}

export class PayrollService {
  /**
   * Load payroll configuration from system_configs
   */
  private async getPayrollConfig(): Promise<PayrollConfig> {
    try {
      const [standardHours, taxBrackets, personalAllowance, expenseDeduction, ssfRate, ssfMaxBase, pvfEmployeeRate, pvfEmployerRate, otMultiplier, holidayOtMultiplier, expenseDeductionRate] = await Promise.all([
        SystemConfigService.getConfigValue('payroll', 'standard_hours_per_month', DEFAULT_STANDARD_HOURS),
        SystemConfigService.getConfigValue('payroll', 'tax_brackets', DEFAULT_TAX_BRACKETS),
        SystemConfigService.getConfigValue('payroll', 'personal_allowance', DEFAULT_PERSONAL_ALLOWANCE),
        SystemConfigService.getConfigValue('payroll', 'expense_deduction', DEFAULT_EXPENSE_DEDUCTION),
        SystemConfigService.getConfigValue('payroll', 'ssf_rate', DEFAULT_SSF_RATE),
        SystemConfigService.getConfigValue('payroll', 'ssf_max_base', DEFAULT_SSF_MAX_BASE),
        SystemConfigService.getConfigValue('payroll', 'pvf_employee_rate', DEFAULT_PVF_EMPLOYEE_RATE),
        SystemConfigService.getConfigValue('payroll', 'pvf_employer_rate', DEFAULT_PVF_EMPLOYER_RATE),
        SystemConfigService.getConfigValue('payroll', 'ot_multiplier', DEFAULT_OT_MULTIPLIER),
        SystemConfigService.getConfigValue('payroll', 'holiday_ot_multiplier', DEFAULT_HOLIDAY_OT_MULTIPLIER),
        SystemConfigService.getConfigValue('payroll', 'expense_deduction_rate', DEFAULT_EXPENSE_DEDUCTION_RATE),
      ]);

      return {
        standardHoursPerMonth: typeof standardHours === 'number' && standardHours > 0 ? standardHours : DEFAULT_STANDARD_HOURS,
        taxBrackets: Array.isArray(taxBrackets) && taxBrackets.length > 0 ? taxBrackets : DEFAULT_TAX_BRACKETS,
        personalAllowance: typeof personalAllowance === 'number' ? personalAllowance : DEFAULT_PERSONAL_ALLOWANCE,
        expenseDeduction: typeof expenseDeduction === 'number' ? expenseDeduction : DEFAULT_EXPENSE_DEDUCTION,
        ssfRate: typeof ssfRate === 'number' ? ssfRate : DEFAULT_SSF_RATE,
        ssfMaxBase: typeof ssfMaxBase === 'number' ? ssfMaxBase : DEFAULT_SSF_MAX_BASE,
        pvfEmployeeRate: typeof pvfEmployeeRate === 'number' ? pvfEmployeeRate : DEFAULT_PVF_EMPLOYEE_RATE,
        pvfEmployerRate: typeof pvfEmployerRate === 'number' ? pvfEmployerRate : DEFAULT_PVF_EMPLOYER_RATE,
        otMultiplier: typeof otMultiplier === 'number' && otMultiplier > 0 ? otMultiplier : DEFAULT_OT_MULTIPLIER,
        holidayOtMultiplier: typeof holidayOtMultiplier === 'number' && holidayOtMultiplier > 0 ? holidayOtMultiplier : DEFAULT_HOLIDAY_OT_MULTIPLIER,
        expenseDeductionRate: typeof expenseDeductionRate === 'number' ? expenseDeductionRate : DEFAULT_EXPENSE_DEDUCTION_RATE,
      };
    } catch (error) {
      logger.error(error, 'Failed to load payroll config, using defaults:');
      return {
        standardHoursPerMonth: DEFAULT_STANDARD_HOURS,
        taxBrackets: DEFAULT_TAX_BRACKETS,
        personalAllowance: DEFAULT_PERSONAL_ALLOWANCE,
        expenseDeduction: DEFAULT_EXPENSE_DEDUCTION,
        ssfRate: DEFAULT_SSF_RATE,
        ssfMaxBase: DEFAULT_SSF_MAX_BASE,
        pvfEmployeeRate: DEFAULT_PVF_EMPLOYEE_RATE,
        pvfEmployerRate: DEFAULT_PVF_EMPLOYER_RATE,
        otMultiplier: DEFAULT_OT_MULTIPLIER,
        holidayOtMultiplier: DEFAULT_HOLIDAY_OT_MULTIPLIER,
        expenseDeductionRate: DEFAULT_EXPENSE_DEDUCTION_RATE,
      };
    }
  }

  /**
   * Calculate tax based on annual salary using progressive brackets
   * Applies expense deduction (50% of income, capped) and personal allowance before tax
   */
  private calculateTax(
    annualSalary: number,
    brackets: { min: number; max: number; rate: number }[],
    expenseDeduction: number,
    personalAllowance: number,
    expenseDeductionRate: number = DEFAULT_EXPENSE_DEDUCTION_RATE
  ): number {
    // Expense deduction: rate% of income, capped at expenseDeduction
    const expense = Math.min(annualSalary * expenseDeductionRate, expenseDeduction);
    // Taxable income after deductions
    const taxableIncome = Math.max(0, annualSalary - expense - personalAllowance);

    let tax = 0;
    let remainingSalary = taxableIncome;

    for (const bracket of brackets) {
      if (remainingSalary <= 0) break;

      const bracketMax = bracket.max === -1 ? Infinity : bracket.max;
      const taxableInBracket = Math.min(remainingSalary, bracketMax - bracket.min);
      tax += taxableInBracket * bracket.rate;
      remainingSalary -= taxableInBracket;
    }

    return Math.round(tax * 100) / 100;
  }

  /**
   * Calculate payroll amounts given inputs and config
   */
  private calculatePayrollAmounts(
    baseSalary: number,
    overtimeHours: number,
    bonus: number,
    leaveDeduction: number,
    deductions: number,
    config: PayrollConfig
  ) {
    // Guard against negative inputs that would silently corrupt pay (e.g. a
    // negative bonus inflating net pay, or negative hours reducing gross).
    if (baseSalary < 0) throw new BusinessError('Base salary cannot be negative');
    if (overtimeHours < 0) throw new BusinessError('Overtime hours cannot be negative');
    if (bonus < 0) throw new BusinessError('Bonus cannot be negative');
    if (leaveDeduction < 0) throw new BusinessError('Leave deduction cannot be negative');
    if (deductions < 0) throw new BusinessError('Deductions cannot be negative');

    const hourlyRate = baseSalary / config.standardHoursPerMonth;
    const overtimePay = Math.round(overtimeHours * hourlyRate * config.otMultiplier * 100) / 100;
    const grossPay = baseSalary + overtimePay + bonus;

    // SSF: employee and employer each pay ssfRate on min(baseSalary, ssfMaxBase)
    const ssfBase = Math.min(baseSalary, config.ssfMaxBase);
    const ssfEmployee = Math.round(ssfBase * config.ssfRate * 100) / 100;
    const ssfEmployer = Math.round(ssfBase * config.ssfRate * 100) / 100;

    // PVF: employee and employer contributions based on full base salary
    const pvfEmployee = Math.round(baseSalary * config.pvfEmployeeRate * 100) / 100;
    const pvfEmployer = Math.round(baseSalary * config.pvfEmployerRate * 100) / 100;

    // Thai PND.1 annualization: base salary × 12, OT and bonus are irregular (added as-is)
    // SSF and PVF employee contributions are tax-deductible in Thailand
    const annualIncome = (baseSalary * 12) + overtimePay + bonus - (ssfEmployee * 12) - (pvfEmployee * 12);
    const annualTax = this.calculateTax(annualIncome, config.taxBrackets, config.expenseDeduction, config.personalAllowance, config.expenseDeductionRate);
    const monthlyTax = Math.round(annualTax / 12 * 100) / 100;
    const netPay = Math.round((grossPay - leaveDeduction - deductions - monthlyTax - ssfEmployee - pvfEmployee) * 100) / 100;

    return { overtimePay, monthlyTax, netPay, ssfEmployee, ssfEmployer, pvfEmployee, pvfEmployer };
  }

  /**
   * Calculate payroll for interns — no tax, SSF, PVF, or OT (OT paid separately)
   */
  private calculateInternPayroll(
    baseSalary: number,
    _overtimeHours: number,
    bonus: number,
    leaveDeduction: number,
    deductions: number,
    _config: PayrollConfig
  ) {
    if (baseSalary < 0) throw new BusinessError('Base salary cannot be negative');
    if (bonus < 0) throw new BusinessError('Bonus cannot be negative');
    if (leaveDeduction < 0) throw new BusinessError('Leave deduction cannot be negative');
    if (deductions < 0) throw new BusinessError('Deductions cannot be negative');

    const overtimePay = 0;
    const grossPay = baseSalary + bonus;
    const netPay = Math.round((grossPay - leaveDeduction - deductions) * 100) / 100;
    return { overtimePay, monthlyTax: 0, netPay, ssfEmployee: 0, ssfEmployer: 0, pvfEmployee: 0, pvfEmployer: 0 };
  }

  /**
   * Get intern daily rate — per-employee override or global default (350 THB)
   */
  private async getInternDailyRate(employeeDailyRate: number | null): Promise<number> {
    if (employeeDailyRate && employeeDailyRate > 0) {
      return employeeDailyRate;
    }
    const defaultRate = await SystemConfigService.getConfigValue('payroll', 'default_intern_daily_rate', 350);
    return typeof defaultRate === 'number' && defaultRate > 0 ? defaultRate : 350;
  }

  /**
   * Count attendance days (days with clock_in) for a pay period
   */
  private async getInternDaysWorked(
    employeeId: string,
    payPeriodStart: string,
    payPeriodEnd: string,
    client?: { query: (sql: string, params: any[]) => Promise<any> }
  ): Promise<number> {
    const db = client || { query };
    const result = await db.query(
      `SELECT COUNT(*)::int AS days_worked
       FROM attendance_records
       WHERE employee_id = $1
         AND date >= $2 AND date <= $3
         AND clock_in IS NOT NULL
         AND deleted_at IS NULL`,
      [employeeId, payPeriodStart, payPeriodEnd]
    );
    return result.rows[0]?.days_worked ?? 0;
  }

  /**
   * Count the employee's scheduled working days in a date range, excluding public holidays.
   * `workDays` = weekday numbers the employee works (0=Sun … 6=Sat); defaults to Mon–Fri.
   * Used to compute the daily rate for absent deductions.
   */
  private async getWorkingDays(
    payPeriodStart: string,
    payPeriodEnd: string,
    workDays: number[],
    client?: { query: (sql: string, params: any[]) => Promise<any> }
  ): Promise<number> {
    const db = client || { query };
    const result = await db.query(
      `SELECT COUNT(*)::int AS working_days
       FROM generate_series($1::date, $2::date, '1 day'::interval) AS d(day)
       WHERE EXTRACT(DOW FROM d.day)::int = ANY($3::int[])
         AND NOT ${holidayDateSql('d.day::date')}`,
      [payPeriodStart, payPeriodEnd, workDays]
    );
    return result.rows[0]?.working_days ?? 1;
  }

  /**
   * Calculate leave (absent) deduction from attendance records.
   * Counts Absent-status days + days with no record (excluding weekends and holidays).
   * Returns deduction amount = (baseSalary / workingDays) × absentDays.
   */
  async calcLeaveDeduction(
    employeeId: string,
    payPeriodStart: string,
    payPeriodEnd: string,
    baseSalary: number,
    client?: { query: (sql: string, params: any[]) => Promise<any> },
    workDaysHint?: number[] | null
  ): Promise<number> {
    const db = client || { query };
    // Resolve the employee's work-day schedule (default Mon–Fri preserves prior behavior).
    // Callers that already have the employee row (e.g. the bulk generator) pass workDaysHint
    // to avoid an extra per-employee round-trip.
    const workDays: number[] = workDaysHint !== undefined
      ? resolveWorkDays(workDaysHint)
      : resolveWorkDays((await db.query('SELECT work_days FROM employees WHERE id = $1', [employeeId])).rows[0]?.work_days);
    const workingDays = await this.getWorkingDays(payPeriodStart, payPeriodEnd, workDays, client);
    const result = await db.query(
      `SELECT COUNT(*)::int AS absent_days
       FROM generate_series($2::date, $3::date, '1 day'::interval) AS d(day)
       WHERE EXTRACT(DOW FROM d.day)::int = ANY($4::int[])
         AND NOT ${holidayDateSql('d.day::date')}
         AND NOT EXISTS (
           SELECT 1 FROM leave_requests lr
           WHERE lr.employee_id = $1 AND lr.status = 'Approved'
             AND lr.deleted_at IS NULL
             AND d.day::date BETWEEN lr.start_date AND lr.end_date
         )
         AND (
           NOT EXISTS (
             SELECT 1 FROM attendance_records ar
             WHERE ar.employee_id = $1 AND ar.date = d.day::date AND ar.deleted_at IS NULL
           )
           OR EXISTS (
             SELECT 1 FROM attendance_records ar
             WHERE ar.employee_id = $1 AND ar.date = d.day::date
               AND ar.status = 'Absent' AND ar.deleted_at IS NULL
           )
         )`,
      [employeeId, payPeriodStart, payPeriodEnd, workDays]
    );
    const absentDays: number = result.rows[0]?.absent_days ?? 0;
    if (absentDays === 0 || workingDays === 0) return 0;
    const dailyRate = baseSalary / workingDays;
    return Math.round(dailyRate * absentDays * 100) / 100;
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
      bonus = 0,
      deductions = 0,
    } = data;

    // Auto-sum approved OT hours from OT requests when not explicitly provided
    const overtimeHours = data.overtimeHours != null
      ? data.overtimeHours
      : await OTRequestService.getApprovedOTHours(employeeId, payPeriodStart, payPeriodEnd);

    // Auto-calculate leave deduction from attendance when not explicitly provided
    const leaveDeduction = data.leaveDeduction != null
      ? data.leaveDeduction
      : await this.calcLeaveDeduction(employeeId, payPeriodStart, payPeriodEnd, baseSalary);

    // Validate date range
    if (payPeriodEnd <= payPeriodStart) {
      throw new BusinessError('Pay period end date must be after start date');
    }

    // Check for duplicate payroll (same employee + same pay period, excluding Cancelled)
    const existing = await query(
      `SELECT id FROM payroll_records
       WHERE employee_id = $1 AND pay_period_start = $2 AND pay_period_end = $3 AND status != 'Cancelled'`,
      [employeeId, payPeriodStart, payPeriodEnd]
    );
    if (existing.rows.length > 0) {
      throw new BusinessError('A payroll record already exists for this employee and pay period');
    }

    // Check if employee is an intern
    const empResult = await query('SELECT role, daily_rate FROM employees WHERE id = $1', [employeeId]);
    const isIntern = empResult.rows.length > 0 && empResult.rows[0].role?.toLowerCase().includes('intern');

    // For interns: compute baseSalary from daily_rate × attendance days, no OT
    let effectiveBaseSalary = baseSalary;
    let effectiveOvertimeHours = overtimeHours;
    if (isIntern) {
      const dailyRate = await this.getInternDailyRate(empResult.rows[0].daily_rate ? parseFloat(empResult.rows[0].daily_rate) : null);
      const daysWorked = await this.getInternDaysWorked(employeeId, payPeriodStart, payPeriodEnd);
      effectiveBaseSalary = Math.round(dailyRate * daysWorked * 100) / 100;
      effectiveOvertimeHours = 0;
    }

    // Validate baseSalary (skip for interns — they can have 0 if no attendance)
    if (!isIntern && (!baseSalary || baseSalary <= 0)) {
      throw new BusinessError('Base salary must be greater than 0');
    }

    const config = await this.getPayrollConfig();
    const { overtimePay, monthlyTax, netPay, ssfEmployee, ssfEmployer, pvfEmployee, pvfEmployer } = isIntern
      ? this.calculateInternPayroll(effectiveBaseSalary, effectiveOvertimeHours, bonus, leaveDeduction, deductions, config)
      : this.calculatePayrollAmounts(effectiveBaseSalary, effectiveOvertimeHours, bonus, leaveDeduction, deductions, config);

    const result = await query(
      `INSERT INTO payroll_records
       (employee_id, pay_period_start, pay_period_end, base_salary, overtime_hours, overtime_pay, bonus, leave_deduction, deductions, tax_amount, ssf_employee, ssf_employer, pvf_employee, pvf_employer, net_pay)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [employeeId, payPeriodStart, payPeriodEnd, effectiveBaseSalary, effectiveOvertimeHours, overtimePay, bonus, leaveDeduction, deductions, monthlyTax, ssfEmployee, ssfEmployer, pvfEmployee, pvfEmployer, netPay]
    );

    return this.mapRowToPayroll(result.rows[0]);
  }

  /**
   * What-if payroll preview. Computes the same amounts as createPayroll
   * (tax, SSF, PVF, OT, leave deduction, intern handling) using live config
   * and attendance/OT data, but persists NOTHING and skips the
   * duplicate-period guard — so HR can test salary/bonus/OT scenarios freely.
   */
  async simulatePayroll(data: CreatePayrollData): Promise<{
    employeeId: string;
    payPeriodStart: string;
    payPeriodEnd: string;
    isIntern: boolean;
    baseSalary: number;
    overtimeHours: number;
    overtimePay: number;
    bonus: number;
    leaveDeduction: number;
    deductions: number;
    grossPay: number;
    taxAmount: number;
    ssfEmployee: number;
    ssfEmployer: number;
    pvfEmployee: number;
    pvfEmployer: number;
    netPay: number;
    simulated: true;
  }> {
    const {
      employeeId,
      payPeriodStart,
      payPeriodEnd,
      baseSalary,
      bonus = 0,
      deductions = 0,
    } = data;

    // Validate date range
    if (payPeriodEnd <= payPeriodStart) {
      throw new BusinessError('Pay period end date must be after start date');
    }

    // Auto-sum approved OT hours from OT requests when not explicitly provided
    const overtimeHours = data.overtimeHours != null
      ? data.overtimeHours
      : await OTRequestService.getApprovedOTHours(employeeId, payPeriodStart, payPeriodEnd);

    // Auto-calculate leave deduction from attendance when not explicitly provided
    const leaveDeduction = data.leaveDeduction != null
      ? data.leaveDeduction
      : await this.calcLeaveDeduction(employeeId, payPeriodStart, payPeriodEnd, baseSalary);

    // Check if employee is an intern
    const empResult = await query('SELECT role, daily_rate FROM employees WHERE id = $1', [employeeId]);
    if (empResult.rows.length === 0) {
      throw new BusinessError('Employee not found');
    }
    const isIntern = empResult.rows[0].role?.toLowerCase().includes('intern') ?? false;

    // For interns: compute baseSalary from daily_rate × attendance days, no OT
    let effectiveBaseSalary = baseSalary;
    let effectiveOvertimeHours = overtimeHours;
    if (isIntern) {
      const dailyRate = await this.getInternDailyRate(empResult.rows[0].daily_rate ? parseFloat(empResult.rows[0].daily_rate) : null);
      const daysWorked = await this.getInternDaysWorked(employeeId, payPeriodStart, payPeriodEnd);
      effectiveBaseSalary = Math.round(dailyRate * daysWorked * 100) / 100;
      effectiveOvertimeHours = 0;
    }

    // Validate baseSalary (skip for interns — they can have 0 if no attendance)
    if (!isIntern && (!baseSalary || baseSalary <= 0)) {
      throw new BusinessError('Base salary must be greater than 0');
    }

    const config = await this.getPayrollConfig();
    const { overtimePay, monthlyTax, netPay, ssfEmployee, ssfEmployer, pvfEmployee, pvfEmployer } = isIntern
      ? this.calculateInternPayroll(effectiveBaseSalary, effectiveOvertimeHours, bonus, leaveDeduction, deductions, config)
      : this.calculatePayrollAmounts(effectiveBaseSalary, effectiveOvertimeHours, bonus, leaveDeduction, deductions, config);

    const grossPay = Math.round((effectiveBaseSalary + overtimePay + bonus) * 100) / 100;

    return {
      employeeId,
      payPeriodStart,
      payPeriodEnd,
      isIntern,
      baseSalary: effectiveBaseSalary,
      overtimeHours: effectiveOvertimeHours,
      overtimePay,
      bonus,
      leaveDeduction,
      deductions,
      grossPay,
      taxAmount: monthlyTax,
      ssfEmployee,
      ssfEmployer,
      pvfEmployee,
      pvfEmployer,
      netPay,
      simulated: true,
    };
  }

  /**
   * Update an existing payroll record (only Pending records can be edited)
   */
  async updatePayroll(id: string, data: UpdatePayrollData): Promise<PayrollRecord> {
    // Get existing record
    const existing = await this.getPayrollById(id);
    if (!existing) {
      throw new BusinessError('Payroll record not found');
    }
    if (existing.status !== 'Pending') {
      throw new BusinessError('Only Pending payroll records can be edited');
    }

    const bonus = data.bonus ?? existing.bonus;
    const leaveDeduction = data.leaveDeduction ?? existing.leaveDeduction;
    const deductions = data.deductions ?? existing.deductions;
    const notes = data.notes !== undefined ? data.notes : existing.notes;

    // Check if employee is an intern
    const empResult = await query('SELECT role, daily_rate FROM employees WHERE id = $1', [existing.employeeId]);
    const isIntern = empResult.rows.length > 0 && empResult.rows[0].role?.toLowerCase().includes('intern');

    let effectiveBaseSalary = data.baseSalary ?? existing.baseSalary;
    let effectiveOvertimeHours = data.overtimeHours ?? existing.overtimeHours;

    if (isIntern) {
      // Recompute from daily rate × attendance if admin didn't explicitly set baseSalary
      if (data.baseSalary === undefined) {
        const dailyRate = await this.getInternDailyRate(empResult.rows[0].daily_rate ? parseFloat(empResult.rows[0].daily_rate) : null);
        const daysWorked = await this.getInternDaysWorked(existing.employeeId, existing.payPeriodStart, existing.payPeriodEnd);
        effectiveBaseSalary = Math.round(dailyRate * daysWorked * 100) / 100;
      }
      effectiveOvertimeHours = 0;
    }

    if (!isIntern && effectiveBaseSalary <= 0) {
      throw new BusinessError('Base salary must be greater than 0');
    }

    const config = await this.getPayrollConfig();
    const { overtimePay, monthlyTax, netPay, ssfEmployee, ssfEmployer, pvfEmployee, pvfEmployer } = isIntern
      ? this.calculateInternPayroll(effectiveBaseSalary, effectiveOvertimeHours, bonus, leaveDeduction, deductions, config)
      : this.calculatePayrollAmounts(effectiveBaseSalary, effectiveOvertimeHours, bonus, leaveDeduction, deductions, config);

    const result = await query(
      `UPDATE payroll_records
       SET base_salary = $1, overtime_hours = $2, overtime_pay = $3, bonus = $4,
           leave_deduction = $5, deductions = $6, tax_amount = $7,
           ssf_employee = $8, ssf_employer = $9, pvf_employee = $10, pvf_employer = $11,
           net_pay = $12, notes = $13, updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING *`,
      [effectiveBaseSalary, effectiveOvertimeHours, overtimePay, bonus, leaveDeduction, deductions, monthlyTax, ssfEmployee, ssfEmployer, pvfEmployee, pvfEmployer, netPay, notes, id]
    );

    return this.mapRowToPayroll(result.rows[0]);
  }

  /**
   * Get payroll records for an employee
   */
  async getPayrollByEmployee(employeeId: string, limit: number = 12): Promise<PayrollRecord[]> {
    const result = await query(
      `SELECT id, employee_id, pay_period_start, pay_period_end, base_salary, overtime_hours, overtime_pay, bonus, leave_deduction, deductions, tax_amount, ssf_employee, ssf_employer, pvf_employee, pvf_employer, net_pay, status, payment_date, payment_method, notes, created_at FROM payroll_records
       WHERE employee_id = $1
       ORDER BY pay_period_start DESC
       LIMIT $2`,
      [employeeId, limit]
    );

    return result.rows.map(this.mapRowToPayroll);
  }

  /**
   * Get all payroll records with employee names (admin)
   */
  async getAllPayroll(limit: number = 50): Promise<(PayrollRecord & { employeeName: string; department: string })[]> {
    const result = await query(
      `SELECT pr.*, e.name AS employee_name, e.department
       FROM payroll_records pr
       LEFT JOIN employees e ON pr.employee_id = e.id
       ORDER BY pr.pay_period_start DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map((row) => ({
      ...this.mapRowToPayroll(row),
      employeeName: (row.employee_name as string) || 'Unknown',
      department: (row.department as string) || '',
    }));
  }

  /**
   * Get payroll by ID
   */
  async getPayrollById(id: string): Promise<PayrollRecord | null> {
    const result = await query('SELECT id, employee_id, pay_period_start, pay_period_end, base_salary, overtime_hours, overtime_pay, bonus, leave_deduction, deductions, tax_amount, ssf_employee, ssf_employer, pvf_employee, pvf_employer, net_pay, status, payment_date, payment_method, notes, created_at FROM payroll_records WHERE id = $1', [id]);

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
    status: 'Pending' | 'Processed' | 'Paid' | 'Cancelled',
    paymentMethod?: string
  ): Promise<PayrollRecord> {
    const paymentDate = status === 'Paid' ? new Date().toISOString().split('T')[0] : null;

    const result = await query(
      `UPDATE payroll_records
       SET status = $1, payment_date = $2, payment_method = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, paymentDate, paymentMethod || null, id]
    );

    if (result.rows.length === 0) {
      throw new BusinessError('Payroll record not found');
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
    cancelledCount: number;
  }> {
    const result = await query(
      `SELECT
        COALESCE(SUM(net_pay) FILTER (WHERE status != 'Cancelled'), 0) as total_payroll,
        COALESCE(SUM(tax_amount) FILTER (WHERE status != 'Cancelled'), 0) as total_tax,
        COUNT(DISTINCT employee_id) FILTER (WHERE status != 'Cancelled') as total_employees,
        COUNT(*) FILTER (WHERE status = 'Pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'Processed') as processed_count,
        COUNT(*) FILTER (WHERE status = 'Paid') as paid_count,
        COUNT(*) FILTER (WHERE status = 'Cancelled') as cancelled_count
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
      cancelledCount: parseInt(row.cancelled_count, 10),
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

    // Insert new salary history and update employees.salary
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO salary_history (employee_id, effective_date, base_salary, previous_salary, change_reason, approved_by)
         VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)
         RETURNING *`,
        [employeeId, newSalary, previousSalary, changeReason, approvedById]
      );

      // Keep employees.salary in sync
      await client.query(
        'UPDATE employees SET salary = $1 WHERE id = $2',
        [newSalary, employeeId]
      );

      await client.query('COMMIT');
      return this.mapRowToSalaryHistory(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Batch create payroll records for all active employees
   * Wrapped in a transaction for atomicity
   */
  async batchCreatePayroll(payPeriodStart: string, payPeriodEnd: string): Promise<{
    created: number;
    skipped: number;
    skippedEmployees: string[];
  }> {
    // Validate date range
    if (payPeriodEnd <= payPeriodStart) {
      throw new BusinessError('Pay period end date must be after start date');
    }

    // Load payroll config once
    const config = await this.getPayrollConfig();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get all active employees with their salary, role, and daily_rate
      const employees = await client.query(
        `SELECT e.id, e.name, e.role, e.daily_rate, e.work_days, COALESCE(e.salary, sh.base_salary, 0) AS salary
         FROM employees e
         LEFT JOIN LATERAL (
           SELECT base_salary FROM salary_history
           WHERE employee_id = e.id
           ORDER BY effective_date DESC LIMIT 1
         ) sh ON true
         WHERE e.status = 'Active'`
      );

      // Load default intern daily rate once
      const defaultDailyRate = await SystemConfigService.getConfigValue('payroll', 'default_intern_daily_rate', 350) as number;

      // Single query to check all existing payroll records for this period
      const existingResult = await client.query(
        `SELECT DISTINCT employee_id FROM payroll_records
         WHERE pay_period_start = $1 AND pay_period_end = $2 AND status != 'Cancelled'`,
        [payPeriodStart, payPeriodEnd]
      );
      const existingSet = new Set(existingResult.rows.map((r: Record<string, unknown>) => r.employee_id));

      let created = 0;
      let skipped = 0;
      const skippedEmployees: string[] = [];

      // Calculate values in JS loop
      const insertValues: any[] = [];
      const PARAMS_PER_ROW = 11;

      for (const emp of employees.rows) {
        const isIntern = emp.role && emp.role.toLowerCase().includes('intern');

        if (existingSet.has(emp.id)) {
          skipped++;
          skippedEmployees.push(`${emp.name} (already exists)`);
          continue;
        }

        let effectiveSalary: number;

        if (isIntern) {
          // Intern: daily_rate × attendance days
          const dailyRate = (emp.daily_rate && parseFloat(emp.daily_rate) > 0) ? parseFloat(emp.daily_rate) : (typeof defaultDailyRate === 'number' ? defaultDailyRate : 350);
          const daysWorked = await this.getInternDaysWorked(emp.id, payPeriodStart, payPeriodEnd, client);
          effectiveSalary = Math.round(dailyRate * daysWorked * 100) / 100;
          if (daysWorked === 0) {
            skipped++;
            skippedEmployees.push(`${emp.name} (intern, no attendance)`);
            continue;
          }
        } else {
          effectiveSalary = parseFloat(emp.salary);
          if (!effectiveSalary || effectiveSalary <= 0) {
            skipped++;
            skippedEmployees.push(`${emp.name} (no salary)`);
            continue;
          }
        }

        // Auto-calculate absent deduction from attendance (interns already paid per day)
        const leaveDeduction = isIntern
          ? 0
          : await this.calcLeaveDeduction(emp.id, payPeriodStart, payPeriodEnd, effectiveSalary, client, emp.work_days);

        const { monthlyTax: batchTax, netPay, ssfEmployee, ssfEmployer, pvfEmployee, pvfEmployer } = isIntern
          ? this.calculateInternPayroll(effectiveSalary, 0, 0, leaveDeduction, 0, config)
          : this.calculatePayrollAmounts(effectiveSalary, 0, 0, leaveDeduction, 0, config);

        insertValues.push(emp.id, payPeriodStart, payPeriodEnd, effectiveSalary, leaveDeduction, batchTax, ssfEmployee, ssfEmployer, pvfEmployee, pvfEmployer, netPay);
        created++;
      }

      // One bulk INSERT for all new payroll records
      if (insertValues.length > 0) {
        const rows: string[] = [];
        for (let i = 0; i < created; i++) {
          const o = i * PARAMS_PER_ROW;
          rows.push(`($${o+1},$${o+2},$${o+3},$${o+4},0,0,0,$${o+5},0,$${o+6},$${o+7},$${o+8},$${o+9},$${o+10},$${o+11})`);
        }
        await client.query(
          `INSERT INTO payroll_records (employee_id,pay_period_start,pay_period_end,base_salary,overtime_hours,overtime_pay,bonus,leave_deduction,deductions,tax_amount,ssf_employee,ssf_employer,pvf_employee,pvf_employer,net_pay) VALUES ${rows.join(',')}`,
          insertValues
        );
      }

      await client.query('COMMIT');
      return { created, skipped, skippedEmployees };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get salary history for an employee
   */
  async getSalaryHistory(employeeId: string): Promise<SalaryHistory[]> {
    const result = await query(
      'SELECT id, employee_id, effective_date, base_salary, previous_salary, change_reason, approved_by, created_at FROM salary_history WHERE employee_id = $1 ORDER BY effective_date DESC',
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
      leaveDeduction: parseFloat(row.leave_deduction as string) || 0,
      deductions: parseFloat(row.deductions as string),
      taxAmount: parseFloat(row.tax_amount as string),
      ssfEmployee: parseFloat(row.ssf_employee as string) || 0,
      ssfEmployer: parseFloat(row.ssf_employer as string) || 0,
      pvfEmployee: parseFloat(row.pvf_employee as string) || 0,
      pvfEmployer: parseFloat(row.pvf_employer as string) || 0,
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
