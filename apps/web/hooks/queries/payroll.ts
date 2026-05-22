import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';

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
  createdAt: string;
}

export interface SalaryHistoryRecord {
  id: string;
  employeeId: string;
  effectiveDate: string;
  baseSalary: number;
  previousSalary: number | null;
  changeReason: string | null;
  approvedBy: string | null;
  createdAt: string;
}

export interface PayrollSummary {
  totalPayroll: number;
  totalTax: number;
  totalEmployees: number;
  pendingCount: number;
  processedCount: number;
  paidCount: number;
  cancelledCount: number;
}

export interface PayrollSettings {
  standardHoursPerMonth: number;
  taxBrackets: { min: number; max: number; rate: number }[];
  personalAllowance: number;
  expenseDeduction: number;
  ssfRate: number;
  ssfMaxBase: number;
  pvfEmployeeRate: number;
  pvfEmployerRate: number;
}

export const useMyPayslips = () => {
  return useQuery({
    queryKey: queryKeys.payroll.myPayslips(),
    queryFn: () => api.get<PayrollRecord[]>('/payroll/my-payslips'),
  });
};

export const useAllPayroll = (enabled: boolean = true) => {
  return useQuery({
    queryKey: [...queryKeys.payroll.all, 'allRecords'] as const,
    queryFn: () => api.get<(PayrollRecord & { employeeName: string; department: string })[]>('/payroll/all'),
    enabled,
  });
};

export const useEmployeePayroll = (employeeId: string) => {
  return useQuery({
    queryKey: queryKeys.payroll.employee(employeeId),
    queryFn: () => api.get<PayrollRecord[]>(`/payroll/employee/${employeeId}`),
    enabled: !!employeeId,
  });
};

export const usePayrollSummary = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: queryKeys.payroll.summary({ startDate, endDate }),
    queryFn: () => api.get<PayrollSummary>(`/payroll/reports/summary?startDate=${startDate}&endDate=${endDate}`),
    enabled: !!startDate && !!endDate,
  });
};

export const useSalaryHistory = (employeeId: string) => {
  return useQuery({
    queryKey: queryKeys.payroll.salaryHistory(employeeId),
    queryFn: () => api.get<SalaryHistoryRecord[]>(`/payroll/salary/${employeeId}/history`),
    enabled: !!employeeId,
  });
};

export const useBatchCreatePayroll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { payPeriodStart: string; payPeriodEnd: string }) =>
      api.post<{ created: number; skipped: number; skippedEmployees: string[] }>('/payroll/batch', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.all });
    },
  });
};

export const useCreatePayroll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      employeeId: string;
      payPeriodStart: string;
      payPeriodEnd: string;
      baseSalary: number;
      overtimeHours?: number;
      bonus?: number;
      leaveDeduction?: number;
      deductions?: number;
    }) => api.post<PayrollRecord>('/payroll', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.all });
    },
  });
};

export const useUpdatePayrollStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, paymentMethod }: { id: string; status: string; paymentMethod?: string }) =>
      api.patch<PayrollRecord>(`/payroll/${id}/status`, { status, paymentMethod }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.all });
    },
  });
};

export const useUpdatePayroll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: {
      baseSalary?: number;
      overtimeHours?: number;
      bonus?: number;
      leaveDeduction?: number;
      deductions?: number;
      notes?: string;
    }}) => api.put<PayrollRecord>(`/payroll/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.all });
    },
  });
};

export const useEmailPayslip = () => {
  return useMutation({
    mutationFn: (id: string) => api.post<{ message: string }>(`/payroll/${id}/email-payslip`, {}),
  });
};

export const useUpdateSalary = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, newSalary, changeReason }: { employeeId: string; newSalary: number; changeReason: string }) =>
      api.post<SalaryHistoryRecord>(`/payroll/salary/${employeeId}`, { newSalary, changeReason }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.salaryHistory(vars.employeeId) });
    },
  });
};

export const usePayrollSettings = (enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.systemConfig.payroll(),
    queryFn: async () => {
      const configs = await api.get<{ key: string; value: string; data_type: string }[]>('/configs/payroll');
      const settings: PayrollSettings = {
        standardHoursPerMonth: 160,
        taxBrackets: [],
        personalAllowance: 60000,
        expenseDeduction: 100000,
        ssfRate: 0.05,
        ssfMaxBase: 15000,
        pvfEmployeeRate: 0.03,
        pvfEmployerRate: 0.03,
      };
      for (const c of configs) {
        if (c.key === 'standard_hours_per_month') settings.standardHoursPerMonth = parseFloat(c.value);
        if (c.key === 'tax_brackets') settings.taxBrackets = JSON.parse(c.value);
        if (c.key === 'personal_allowance') settings.personalAllowance = parseFloat(c.value);
        if (c.key === 'expense_deduction') settings.expenseDeduction = parseFloat(c.value);
        if (c.key === 'ssf_rate') settings.ssfRate = parseFloat(c.value);
        if (c.key === 'ssf_max_base') settings.ssfMaxBase = parseFloat(c.value);
        if (c.key === 'pvf_employee_rate') settings.pvfEmployeeRate = parseFloat(c.value);
        if (c.key === 'pvf_employer_rate') settings.pvfEmployerRate = parseFloat(c.value);
      }
      return settings;
    },
    enabled,
  });
};

export const useUpdatePayrollSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: PayrollSettings) => {
      await Promise.all([
        api.put('/configs/payroll/standard_hours_per_month', { value: String(settings.standardHoursPerMonth) } as unknown as Record<string, unknown>),
        api.put('/configs/payroll/tax_brackets', { value: JSON.stringify(settings.taxBrackets) } as unknown as Record<string, unknown>),
        api.put('/configs/payroll/personal_allowance', { value: String(settings.personalAllowance) } as unknown as Record<string, unknown>),
        api.put('/configs/payroll/expense_deduction', { value: String(settings.expenseDeduction) } as unknown as Record<string, unknown>),
        api.put('/configs/payroll/ssf_rate', { value: String(settings.ssfRate) } as unknown as Record<string, unknown>),
        api.put('/configs/payroll/ssf_max_base', { value: String(settings.ssfMaxBase) } as unknown as Record<string, unknown>),
        api.put('/configs/payroll/pvf_employee_rate', { value: String(settings.pvfEmployeeRate) } as unknown as Record<string, unknown>),
        api.put('/configs/payroll/pvf_employer_rate', { value: String(settings.pvfEmployerRate) } as unknown as Record<string, unknown>),
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.systemConfig.payroll() });
    },
  });
};
