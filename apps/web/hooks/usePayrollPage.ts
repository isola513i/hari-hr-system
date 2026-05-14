import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getAuthToken, BASE_URL } from '../lib/api';
import {
  useMyPayslips,
  useAllPayroll,
  usePayrollSummary,
  useCreatePayroll,
  useBatchCreatePayroll,
  useUpdatePayrollStatus,
  useUpdatePayroll,
  useAllEmployees,
  usePayrollSettings,
  useUpdatePayrollSettings,
  useEmailPayslip,
  type PayrollSettings,
  type PayrollRecord,
} from './queries';

export function usePayrollPage() {
  const { t } = useTranslation(['payroll', 'common']);
  const { isAdminView } = useAuth();

  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({ show: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => setToast({ show: true, message, type });

  // Employee payslips
  const { data: myPayslips = [], isLoading: payslipsLoading } = useMyPayslips();

  // Admin: all payroll records + summary for current year
  const { data: allPayroll = [], isLoading: adminLoading } = useAllPayroll(isAdminView);
  const currentYear = new Date().getFullYear();
  const periodStart = `${currentYear}-01-01`;
  const periodEnd = `${currentYear}-12-31`;
  const { data: summary } = usePayrollSummary(isAdminView ? periodStart : '', isAdminView ? periodEnd : '');

  // Create payroll modal
  const [showCreate, setShowCreate] = useState(false);
  const { data: allEmployees = [] } = useAllEmployees();
  const createPayroll = useCreatePayroll();
  const batchCreatePayroll = useBatchCreatePayroll();
  const updateStatus = useUpdatePayrollStatus();
  const updatePayroll = useUpdatePayroll();

  const [createForm, setCreateForm] = useState({
    employeeId: '',
    payPeriodStart: '',
    payPeriodEnd: '',
    baseSalary: '',
    overtimeHours: '0',
    bonus: '0',
    leaveDeduction: '0',
    deductions: '0',
  });

  // Batch payroll modal
  const [showBatch, setShowBatch] = useState(false);
  const [batchForm, setBatchForm] = useState({ payPeriodStart: '', payPeriodEnd: '' });
  const [batchResult, setBatchResult] = useState<{ created: number; skipped: number; skippedEmployees: string[] } | null>(null);

  const handleBatchCreate = async () => {
    if (!batchForm.payPeriodStart || !batchForm.payPeriodEnd) {
      showToast(t('errors.requiredField'), 'warning');
      return;
    }
    try {
      const result = await batchCreatePayroll.mutateAsync(batchForm);
      setBatchResult(result);
      showToast(t('batch.successMessage', { created: result.created, skipped: result.skipped }), 'success');
    } catch {
      showToast(t('errors.batchFailed'), 'error');
    }
  };

  const handleCreate = async () => {
    if (!createForm.employeeId || !createForm.payPeriodStart || !createForm.payPeriodEnd || !createForm.baseSalary) {
      showToast(t('errors.requiredField'), 'warning');
      return;
    }
    try {
      await createPayroll.mutateAsync({
        employeeId: createForm.employeeId,
        payPeriodStart: createForm.payPeriodStart,
        payPeriodEnd: createForm.payPeriodEnd,
        baseSalary: parseFloat(createForm.baseSalary),
        overtimeHours: parseFloat(createForm.overtimeHours) || 0,
        bonus: parseFloat(createForm.bonus) || 0,
        leaveDeduction: parseFloat(createForm.leaveDeduction) || 0,
        deductions: parseFloat(createForm.deductions) || 0,
      });
      showToast(t('success.created'), 'success');
      setShowCreate(false);
      setCreateForm({ employeeId: '', payPeriodStart: '', payPeriodEnd: '', baseSalary: '', overtimeHours: '0', bonus: '0', leaveDeduction: '0', deductions: '0' });
    } catch {
      showToast(t('errors.createFailed'), 'error');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      showToast(t('success.statusUpdated'), 'success');
    } catch {
      showToast(t('errors.statusUpdateFailed'), 'error');
    }
  };

  // Edit payroll modal
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
  const [editForm, setEditForm] = useState({
    baseSalary: '',
    overtimeHours: '0',
    bonus: '0',
    leaveDeduction: '0',
    deductions: '0',
  });

  const openEdit = (record: PayrollRecord) => {
    setEditForm({
      baseSalary: String(record.baseSalary),
      overtimeHours: String(record.overtimeHours),
      bonus: String(record.bonus),
      leaveDeduction: String(record.leaveDeduction),
      deductions: String(record.deductions),
    });
    setEditingRecord(record);
  };

  const handleEdit = async () => {
    if (!editingRecord) return;
    try {
      await updatePayroll.mutateAsync({
        id: editingRecord.id,
        data: {
          baseSalary: parseFloat(editForm.baseSalary) || undefined,
          overtimeHours: parseFloat(editForm.overtimeHours) || 0,
          bonus: parseFloat(editForm.bonus) || 0,
          leaveDeduction: parseFloat(editForm.leaveDeduction) || 0,
          deductions: parseFloat(editForm.deductions) || 0,
        },
      });
      showToast(t('success.updated'), 'success');
      setEditingRecord(null);
    } catch {
      showToast(t('errors.updateFailed'), 'error');
    }
  };

  // Close batch modal and reset
  const closeBatch = () => {
    setShowBatch(false);
    setBatchForm({ payPeriodStart: '', payPeriodEnd: '' });
    setBatchResult(null);
  };

  // Payroll settings
  const { data: payrollSettings } = usePayrollSettings(isAdminView);
  const updatePayrollSettings = useUpdatePayrollSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<PayrollSettings | null>(null);

  const openSettings = () => {
    if (payrollSettings) {
      setSettingsForm({ ...payrollSettings, taxBrackets: payrollSettings.taxBrackets.map((b) => ({ ...b })) });
    }
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
    setSettingsForm(null);
  };

  const handleSaveSettings = async () => {
    if (!settingsForm) return;
    try {
      await updatePayrollSettings.mutateAsync(settingsForm);
      showToast(t('settings.saved'), 'success');
      closeSettings();
    } catch {
      showToast(t('settings.saveFailed'), 'error');
    }
  };

  // Email payslip to employee
  const emailPayslipMutation = useEmailPayslip();
  const handleEmailPayslip = async (id: string) => {
    try {
      await emailPayslipMutation.mutateAsync(id);
      showToast('Payslip emailed to employee successfully');
    } catch {
      showToast('Failed to email payslip', 'error');
    }
  };

  // Download payslip as PDF
  const handleDownloadPayslip = async (id: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${BASE_URL}/payroll/${id}/payslip`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'payslip.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast(t('errors.exportFailed'), 'error');
    }
  };

  // Export payroll as CSV
  const handleExportCSV = async () => {
    try {
      const token = getAuthToken();
      const url = `${BASE_URL}/payroll/export`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `payroll-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch {
      showToast(t('errors.exportFailed'), 'error');
    }
  };

  // Payslip detail expand
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const records = isAdminView ? allPayroll : myPayslips;
  const isLoading = isAdminView ? adminLoading : payslipsLoading;

  // Employee summary stats computed from payslips
  const employeeSummary = useMemo(() => {
    if (isAdminView || myPayslips.length === 0) return null;
    const cy = new Date().getFullYear();
    const thisYearPaid = myPayslips.filter(p => p.status === 'Paid' && p.payPeriodStart?.startsWith(String(cy)));
    const latest = myPayslips.find(p => p.status === 'Paid');
    return {
      latestNetPay: latest?.netPay ?? 0,
      ytdTax: thisYearPaid.reduce((sum, p) => sum + p.taxAmount, 0),
      ytdSSF: thisYearPaid.reduce((sum, p) => sum + (p.ssfEmployee || 0), 0),
      paidMonths: thisYearPaid.length,
    };
  }, [isAdminView, myPayslips]);

  return {
    t,
    isAdminView,
    toast,
    setToast,
    showToast,
    summary,
    showCreate,
    setShowCreate,
    allEmployees,
    createPayroll,
    batchCreatePayroll,
    updatePayroll,
    updatePayrollSettings,
    createForm,
    setCreateForm,
    showBatch,
    setShowBatch,
    batchForm,
    setBatchForm,
    batchResult,
    setBatchResult,
    handleBatchCreate,
    handleCreate,
    handleStatusChange,
    editingRecord,
    setEditingRecord,
    editForm,
    setEditForm,
    openEdit,
    handleEdit,
    closeBatch,
    showSettings,
    settingsForm,
    setSettingsForm,
    openSettings,
    closeSettings,
    handleSaveSettings,
    handleDownloadPayslip,
    handleEmailPayslip,
    handleExportCSV,
    expandedId,
    setExpandedId,
    records,
    isLoading,
    employeeSummary,
    formatCurrency,
    formatDate,
  };
}

// Pure helper functions (no hooks, no JSX) kept here for co-location
export function formatCurrency(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(raw: string) {
  if (!raw) return '-';
  const d = new Date(raw);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
