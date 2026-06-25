import { PayrollService } from '../../services/PayrollService';
import { query } from '../../db';

// Mock SystemConfigService to return defaults
jest.mock('../../services/SystemConfigService', () => ({
  __esModule: true,
  default: {
    getConfigValue: jest.fn().mockImplementation((_cat: string, key: string, defaultVal: any) => defaultVal),
  },
}));

// Mock OTRequestService — createPayroll auto-sums approved OT hours when
// data.overtimeHours is not provided. Default to 0 so existing tests that
// don't care about OT keep working.
jest.mock('../../services/OTRequestService', () => ({
  __esModule: true,
  default: {
    getApprovedOTHours: jest.fn().mockResolvedValue(0),
  },
}));

const mockedQuery = query as jest.MockedFunction<typeof query>;

describe('PayrollService', () => {
  let service: PayrollService;

  beforeEach(() => {
    service = new PayrollService();
    jest.clearAllMocks();
  });

  // Helper to build a mock payroll DB row (snake_case)
  const makePayrollRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'test-id',
    employee_id: 'emp-1',
    pay_period_start: '2026-03-01',
    pay_period_end: '2026-03-31',
    base_salary: '10000',
    overtime_hours: '0',
    overtime_pay: '0',
    bonus: '0',
    leave_deduction: '0',
    deductions: '0',
    tax_amount: '0',
    ssf_employee: '0',
    ssf_employer: '0',
    pvf_employee: '0',
    pvf_employer: '0',
    net_pay: '0',
    status: 'Pending',
    payment_date: null,
    payment_method: null,
    notes: null,
    created_at: new Date(),
    ...overrides,
  });

  /**
   * Helper: set up mocks for createPayroll flow (non-intern).
   *
   * NOTE: When data.leaveDeduction is not provided, createPayroll calls
   * calcLeaveDeduction which fires 2 queries (getWorkingDays + absent count).
   * We mock both to return zeros so they don't affect SSF/PVF/tax math.
   *
   *   query #1 → getWorkingDays              (working_days: 22)
   *   query #2 → absent-day count            (absent_days: 0 → no deduction)
   *   query #3 → duplicate check (empty)
   *   query #4 → SELECT role, daily_rate FROM employees
   *   query #5 → INSERT RETURNING *
   *
   * Existing tests use `mockedQuery.mock.calls[last]` to grab the INSERT,
   * which keeps them robust against changes in the auto-calc chain.
   */
  const setupCreateMocks = (baseSalary: number, overtimeHours = 0, bonus = 0, leaveDeduction = 0, deductions = 0, role = 'Developer', autoCalcLeave = true) => {
    if (autoCalcLeave) {
      mockedQuery
        // calcLeaveDeduction → getWorkingDays
        .mockResolvedValueOnce({ rows: [{ working_days: 22 }], rowCount: 1 } as never)
        // calcLeaveDeduction → absent count (0 → no auto deduction)
        .mockResolvedValueOnce({ rows: [{ absent_days: 0 }], rowCount: 1 } as never);
    }
    mockedQuery
      // duplicate check
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      // SELECT role, daily_rate FROM employees
      .mockResolvedValueOnce({ rows: [{ role, daily_rate: null }], rowCount: 1 } as never)
      // INSERT RETURNING *
      .mockResolvedValueOnce({
        rows: [makePayrollRow({
          base_salary: String(baseSalary),
          overtime_hours: String(overtimeHours),
          bonus: String(bonus),
          leave_deduction: String(leaveDeduction),
          deductions: String(deductions),
        })],
        rowCount: 1,
      } as never);
  };

  /**
   * Helper: set up mocks for createPayroll flow (intern).
   *
   * Interns skip calcLeaveDeduction inside batchCreatePayroll, but
   * createPayroll still calls it unconditionally before the intern branch,
   * so we still mock the 2 leave-deduction queries.
   *
   *   query #1 → getWorkingDays
   *   query #2 → absent count (0)
   *   query #3 → duplicate check
   *   query #4 → SELECT role, daily_rate
   *   query #5 → COUNT attendance days (intern-only)
   *   query #6 → INSERT RETURNING *
   */
  const setupInternCreateMocks = (dailyRate: number | null, daysWorked: number, role = 'Intern', autoCalcLeave = true) => {
    const effectiveSalary = (dailyRate || 350) * daysWorked;
    if (autoCalcLeave) {
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ working_days: 22 }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ absent_days: 0 }], rowCount: 1 } as never);
    }
    mockedQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({ rows: [{ role, daily_rate: dailyRate }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ days_worked: daysWorked }], rowCount: 1 } as never)
      .mockResolvedValueOnce({
        rows: [makePayrollRow({ base_salary: String(effectiveSalary) })],
        rowCount: 1,
      } as never);
  };

  describe('SSF calculation', () => {
    it('should calculate SSF correctly when base salary is below the cap (10000)', async () => {
      setupCreateMocks(10000);

      await service.createPayroll({
        employeeId: 'emp-1',
        payPeriodStart: '2026-03-01',
        payPeriodEnd: '2026-03-31',
        baseSalary: 10000,
      });

      // INSERT is the second query call
      const calls = mockedQuery.mock.calls;
      const insertCall = calls[calls.length - 1];
      const insertParams = insertCall[1] as any[];

      // SSF employee = min(10000, 15000) * 0.05 = 500
      const ssfEmployee = insertParams[10]; // index 10: ssfEmployee
      expect(ssfEmployee).toBe(500);
    });

    it('should cap SSF when base salary exceeds the max base (20000)', async () => {
      setupCreateMocks(20000);

      await service.createPayroll({
        employeeId: 'emp-1',
        payPeriodStart: '2026-03-01',
        payPeriodEnd: '2026-03-31',
        baseSalary: 20000,
      });

      const calls = mockedQuery.mock.calls;
      const insertCall = calls[calls.length - 1];
      const insertParams = insertCall[1] as any[];

      // SSF employee = min(20000, 15000) * 0.05 = 750
      const ssfEmployee = insertParams[10];
      expect(ssfEmployee).toBe(750);
    });
  });

  describe('PVF calculation', () => {
    it('should calculate PVF based on full base salary (30000)', async () => {
      setupCreateMocks(30000);

      await service.createPayroll({
        employeeId: 'emp-1',
        payPeriodStart: '2026-03-01',
        payPeriodEnd: '2026-03-31',
        baseSalary: 30000,
      });

      const calls = mockedQuery.mock.calls;
      const insertCall = calls[calls.length - 1];
      const insertParams = insertCall[1] as any[];

      // PVF employee = 30000 * 0.03 = 900
      const pvfEmployee = insertParams[12]; // index 12: pvfEmployee
      expect(pvfEmployee).toBe(900);
    });
  });

  describe('Tax deductibility', () => {
    it('SSF and PVF should reduce taxable income (annualIncome - SSF*12 - PVF*12)', async () => {
      const baseSalary = 30000;
      setupCreateMocks(baseSalary);

      await service.createPayroll({
        employeeId: 'emp-1',
        payPeriodStart: '2026-03-01',
        payPeriodEnd: '2026-03-31',
        baseSalary,
      });

      const calls = mockedQuery.mock.calls;
      const insertCall = calls[calls.length - 1];
      const insertParams = insertCall[1] as any[];

      const ssfEmployee = insertParams[10]; // 750 (capped at 15000 * 0.05)
      const pvfEmployee = insertParams[12]; // 900 (30000 * 0.03)

      // Annual income for tax = baseSalary*12 + OT + bonus - SSF*12 - PVF*12
      // = 360000 + 0 + 0 - 9000 - 10800 = 340200
      // Expense deduction: min(340200 * 0.5, 100000) = 100000
      // After personal allowance: 340200 - 100000 - 60000 = 180200
      // Tax bracket: first 150000 at 0%, next 30200 at 5% = 1510
      // Monthly tax = 1510 / 12 ≈ 125.83
      const monthlyTax = insertParams[9]; // index 9: tax_amount

      // Verify monthly tax is based on income AFTER SSF/PVF deduction
      // Without SSF/PVF: annual = 360000, expense = 100000, personal = 60000
      //   taxable = 200000, tax = 0 + 50000*0.05 = 2500, monthly = 208.33
      // With SSF/PVF: annual = 340200, tax lower
      expect(monthlyTax).toBeLessThan(208.33);
      expect(monthlyTax).toBeGreaterThan(0);
      expect(ssfEmployee).toBe(750);
      expect(pvfEmployee).toBe(900);
    });
  });

  describe('Net pay calculation', () => {
    it('netPay = grossPay - tax - SSF - PVF - leaveDeduction - deductions', async () => {
      const baseSalary = 30000;
      const leaveDeduction = 500;
      const deductions = 200;
      // leaveDeduction is passed explicitly, so calcLeaveDeduction is skipped
      setupCreateMocks(baseSalary, 0, 0, leaveDeduction, deductions, 'Developer', false);

      await service.createPayroll({
        employeeId: 'emp-1',
        payPeriodStart: '2026-03-01',
        payPeriodEnd: '2026-03-31',
        baseSalary,
        leaveDeduction,
        deductions,
      });

      const calls = mockedQuery.mock.calls;
      const insertCall = calls[calls.length - 1];
      const insertParams = insertCall[1] as any[];

      const overtimePay = insertParams[5];
      const bonus = insertParams[6];
      const monthlyTax = insertParams[9];
      const ssfEmployee = insertParams[10];
      const pvfEmployee = insertParams[12];
      const netPay = insertParams[14];

      const grossPay = baseSalary + overtimePay + bonus;
      const expectedNet = Math.round((grossPay - leaveDeduction - deductions - monthlyTax - ssfEmployee - pvfEmployee) * 100) / 100;

      expect(netPay).toBe(expectedNet);
    });
  });

  describe('OT multiplier', () => {
    it('should calculate overtime pay as (baseSalary/160) * hours * 1.5', async () => {
      const baseSalary = 16000;
      const overtimeHours = 10;
      setupCreateMocks(baseSalary, overtimeHours);

      await service.createPayroll({
        employeeId: 'emp-1',
        payPeriodStart: '2026-03-01',
        payPeriodEnd: '2026-03-31',
        baseSalary,
        overtimeHours,
      });

      const calls = mockedQuery.mock.calls;
      const insertCall = calls[calls.length - 1];
      const insertParams = insertCall[1] as any[];

      // hourlyRate = 16000/160 = 100
      // overtimePay = 10 * 100 * 1.5 = 1500
      const overtimePay = insertParams[5];
      expect(overtimePay).toBe(1500);
    });
  });

  describe('Intern payroll (daily rate × attendance)', () => {
    it('should compute baseSalary from default daily rate (350) × days worked', async () => {
      // daily_rate = null → use default 350, 20 days worked → 7000
      setupInternCreateMocks(null, 20);

      await service.createPayroll({
        employeeId: 'emp-1',
        payPeriodStart: '2026-03-01',
        payPeriodEnd: '2026-03-31',
        baseSalary: 0, // ignored for interns
      });

      // INSERT is query #4 (index 3)
      const internCalls = mockedQuery.mock.calls;
      const insertParams = internCalls[internCalls.length - 1][1] as any[];

      expect(insertParams[3]).toBe(7000);  // baseSalary = 350 × 20
      expect(insertParams[4]).toBe(0);     // overtimeHours = 0
      expect(insertParams[5]).toBe(0);     // overtimePay = 0
      expect(insertParams[9]).toBe(0);     // tax = 0
      expect(insertParams[10]).toBe(0);    // ssfEmployee = 0
      expect(insertParams[14]).toBe(7000); // netPay = 7000
    });

    it('should use per-employee daily rate when set', async () => {
      // daily_rate = 500, 22 days → 11000
      setupInternCreateMocks(500, 22);

      await service.createPayroll({
        employeeId: 'emp-1',
        payPeriodStart: '2026-03-01',
        payPeriodEnd: '2026-03-31',
        baseSalary: 0,
      });

      const internCalls = mockedQuery.mock.calls;
      const insertParams = internCalls[internCalls.length - 1][1] as any[];

      expect(insertParams[3]).toBe(11000); // baseSalary = 500 × 22
      expect(insertParams[14]).toBe(11000); // netPay
    });

    it('should set OT to 0 for interns (OT paid separately)', async () => {
      setupInternCreateMocks(350, 20);

      await service.createPayroll({
        employeeId: 'emp-1',
        payPeriodStart: '2026-03-01',
        payPeriodEnd: '2026-03-31',
        baseSalary: 0,
        overtimeHours: 10, // should be ignored
      });

      const internCalls = mockedQuery.mock.calls;
      const insertParams = internCalls[internCalls.length - 1][1] as any[];

      expect(insertParams[4]).toBe(0); // overtimeHours forced to 0
      expect(insertParams[5]).toBe(0); // overtimePay = 0
    });

    it('should work for Full-stack Developer Intern role', async () => {
      setupInternCreateMocks(350, 15, 'Full-stack Developer Intern');

      await service.createPayroll({
        employeeId: 'emp-1',
        payPeriodStart: '2026-03-01',
        payPeriodEnd: '2026-03-31',
        baseSalary: 0,
      });

      const internCalls = mockedQuery.mock.calls;
      const insertParams = internCalls[internCalls.length - 1][1] as any[];

      expect(insertParams[3]).toBe(5250);  // 350 × 15
      expect(insertParams[9]).toBe(0);     // tax = 0
      expect(insertParams[10]).toBe(0);    // SSF = 0
      expect(insertParams[14]).toBe(5250); // netPay
    });
  });

  /**
   * F2 — Auto-calculated leave deduction from attendance.
   *
   * calcLeaveDeduction makes 2 queries via the helper:
   *   #1 getWorkingDays    → { working_days: N }  (SELECT COUNT FROM generate_series)
   *   #2 absent-day count  → { absent_days: M }   (SELECT COUNT FROM generate_series)
   *
   * The SQL in #1 excludes weekends + holidays (via NOT EXISTS).
   * The SQL in #2 excludes weekends + holidays + approved-leave days, and
   * counts both Absent-status records AND no-record weekdays.
   *
   * The math we verify here: deduction = round((baseSalary / workingDays) * absentDays, 2).
   */
  describe('Leave deduction (auto-calculated from attendance)', () => {
    const PERIOD_START = '2026-06-01';
    const PERIOD_END = '2026-06-30';

    const mockLeaveDeductionQueries = (workingDays: number, absentDays: number) => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ working_days: workingDays }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ absent_days: absentDays }], rowCount: 1 } as never);
    };

    it('happy path — 2 absent weekdays in a 22-day period at ฿22,000 salary → ฿2,000', async () => {
      mockLeaveDeductionQueries(22, 2);

      const result = await service.calcLeaveDeduction('emp-1', PERIOD_START, PERIOD_END, 22000);

      expect(result).toBe(2000); // 22000 / 22 = 1000/day × 2 = 2000
    });

    it('returns 0 when no absent days (holiday + approved leave already excluded by SQL)', async () => {
      mockLeaveDeductionQueries(22, 0);

      const result = await service.calcLeaveDeduction('emp-1', PERIOD_START, PERIOD_END, 22000);

      expect(result).toBe(0);
    });

    it('returns 0 when workingDays is 0 (avoid division by zero)', async () => {
      mockLeaveDeductionQueries(0, 5);

      const result = await service.calcLeaveDeduction('emp-1', PERIOD_START, PERIOD_END, 22000);

      expect(result).toBe(0);
    });

    it('rounds to 2 decimal places (₿25,000 / 22 × 3 = ₿3,409.09)', async () => {
      mockLeaveDeductionQueries(22, 3);

      const result = await service.calcLeaveDeduction('emp-1', PERIOD_START, PERIOD_END, 25000);

      // 25000 / 22 = 1136.3636... × 3 = 3409.0909... → rounded to 3409.09
      expect(result).toBe(3409.09);
    });

    it('scales linearly with absent days', async () => {
      mockLeaveDeductionQueries(20, 5);

      const result = await service.calcLeaveDeduction('emp-2', PERIOD_START, PERIOD_END, 40000);

      // 40000 / 20 = 2000/day × 5 = 10000
      expect(result).toBe(10000);
    });

    it('SQL filter correctness — verifies absent-days query excludes weekends, holidays, and approved leave', async () => {
      mockLeaveDeductionQueries(22, 2);

      await service.calcLeaveDeduction('emp-1', PERIOD_START, PERIOD_END, 22000);

      // Second query is the absent-days one
      const absentQueryCall = mockedQuery.mock.calls[1];
      const absentSql = absentQueryCall[0] as string;

      // Weekends excluded
      expect(absentSql).toMatch(/EXTRACT\(DOW FROM .*?\) NOT IN \(0, 6\)/);
      // Holidays excluded
      expect(absentSql).toMatch(/NOT EXISTS\s*\(\s*SELECT 1 FROM holidays/);
      // Approved leave excluded
      expect(absentSql).toMatch(/leave_requests[\s\S]*?status = 'Approved'/);
      // Absent OR no-record both counted
      expect(absentSql).toMatch(/status = 'Absent'/);
      // Soft-deleted attendance records ignored
      expect(absentSql).toMatch(/ar\.deleted_at IS NULL/);
    });

    it('working-days query also excludes holidays', async () => {
      mockLeaveDeductionQueries(22, 2);

      await service.calcLeaveDeduction('emp-1', PERIOD_START, PERIOD_END, 22000);

      const workingQuerySql = mockedQuery.mock.calls[0][0] as string;

      expect(workingQuerySql).toMatch(/EXTRACT\(DOW FROM .*?\) NOT IN \(0, 6\)/);
      expect(workingQuerySql).toMatch(/NOT EXISTS\s*\(\s*SELECT 1 FROM holidays/);
    });
  });

  describe('simulatePayroll', () => {
    it('computes a preview without persisting (no INSERT) and applies deductions', async () => {
      // Only DB call: the employee role/daily_rate lookup (OT + leave provided).
      mockedQuery.mockResolvedValueOnce({
        rows: [{ role: 'Software Engineer', daily_rate: null }],
        rowCount: 1,
      } as never);

      const result = await service.simulatePayroll({
        employeeId: 'emp-1',
        payPeriodStart: '2026-03-01',
        payPeriodEnd: '2026-03-31',
        baseSalary: 50000,
        bonus: 0,
        deductions: 0,
        overtimeHours: 0,
        leaveDeduction: 0,
      });

      expect(result.simulated).toBe(true);
      expect(result.isIntern).toBe(false);
      expect(result.baseSalary).toBe(50000);
      expect(result.grossPay).toBe(50000);
      // Tax + SSF + PVF deducted, so net is strictly below gross.
      expect(result.netPay).toBeLessThan(result.grossPay);
      expect(result.taxAmount).toBeGreaterThan(0);
      expect(result.ssfEmployee).toBeGreaterThan(0);
      // No INSERT — the single query is the employee lookup only.
      expect(mockedQuery).toHaveBeenCalledTimes(1);
      expect(mockedQuery.mock.calls.every(([sql]) => !/INSERT INTO/i.test(sql as string))).toBe(true);
    });

    it('rejects an invalid pay-period range', async () => {
      await expect(
        service.simulatePayroll({
          employeeId: 'emp-1',
          payPeriodStart: '2026-03-31',
          payPeriodEnd: '2026-03-01',
          baseSalary: 50000,
        }),
      ).rejects.toThrow('Pay period end date must be after start date');
    });
  });

  describe('negative-value guards', () => {
    // calculatePayrollAmounts/calculateInternPayroll are private; call directly
    // to assert the guards in isolation (the guards run before any config use,
    // so a stub config is fine).
    const stubConfig = {} as never;

    it('rejects negative inputs in calculatePayrollAmounts', () => {
      const calc = (service as any).calculatePayrollAmounts.bind(service);
      expect(() => calc(-1, 0, 0, 0, 0, stubConfig)).toThrow(/Base salary cannot be negative/);
      expect(() => calc(10000, -1, 0, 0, 0, stubConfig)).toThrow(/Overtime hours cannot be negative/);
      expect(() => calc(10000, 0, -1, 0, 0, stubConfig)).toThrow(/Bonus cannot be negative/);
      expect(() => calc(10000, 0, 0, -1, 0, stubConfig)).toThrow(/Leave deduction cannot be negative/);
      expect(() => calc(10000, 0, 0, 0, -1, stubConfig)).toThrow(/Deductions cannot be negative/);
    });

    it('rejects negative inputs in calculateInternPayroll', () => {
      const calc = (service as any).calculateInternPayroll.bind(service);
      expect(() => calc(-1, 0, 0, 0, 0, stubConfig)).toThrow(/Base salary cannot be negative/);
      expect(() => calc(5000, 0, -1, 0, 0, stubConfig)).toThrow(/Bonus cannot be negative/);
      expect(() => calc(5000, 0, 0, -1, 0, stubConfig)).toThrow(/Leave deduction cannot be negative/);
    });
  });
});
