import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  useExpenseClaims, useExpenseSummary, useAdminExpenseSummary,
  useCreateExpenseClaim, useUpdateExpenseClaimStatus, useCancelExpenseClaim, useDeleteExpenseClaim,
} from './queries';
import type { ExpenseClaim, ExpenseClaimStatus } from '../types';
import { DropdownOption } from '../components/Dropdown';

export function useExpensePage() {
  const { t } = useTranslation(['expenses', 'common']);
  const { user, isAdminView } = useAuth();
  const isAdmin = isAdminView;

  // Data
  const { data: allClaims = [] } = useExpenseClaims();
  const { data: empSummary } = useExpenseSummary(!isAdmin ? user?.id : undefined);
  const { data: adminSummary } = useAdminExpenseSummary(isAdmin);

  // Mutations
  const createMutation = useCreateExpenseClaim();
  const statusMutation = useUpdateExpenseClaimStatus();
  const cancelMutation = useCancelExpenseClaim();
  const deleteMutation = useDeleteExpenseClaim();

  // State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<ExpenseClaim | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<string>('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formReceipt, setFormReceipt] = useState<File | null>(null);

  // Inline form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  const statusFilterOptions: DropdownOption[] = [
    { value: 'All', label: t('expenses:filterAll') },
    ...(['Pending', 'Approved', 'Rejected', 'Reimbursed', 'Cancelled'] as ExpenseClaimStatus[]).map(s => ({
      value: s, label: t(`expenses:status.${s}`),
    })),
  ];

  const claims = isAdmin ? allClaims : allClaims.filter(c => c.employeeId === user?.id);
  const filtered = statusFilter === 'All' ? claims : claims.filter(c => c.status === statusFilter);

  const resetForm = () => {
    setFormTitle(''); setFormCategory(''); setFormAmount(''); setFormDate(''); setFormDescription(''); setFormReceipt(null); setEditingClaim(null); setFormErrors({});
  };

  const openCreate = () => { resetForm(); setIsFormOpen(true); };
  const openEdit = (claim: ExpenseClaim) => {
    setEditingClaim(claim); setFormTitle(claim.title); setFormCategory(claim.category); setFormAmount(String(claim.amount)); setFormDate(claim.expenseDate); setFormDescription(claim.description || ''); setFormReceipt(null); setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    const errors: Record<string, boolean> = {};
    if (!formTitle.trim()) errors.title = true;
    if (!formCategory) errors.category = true;
    if (!formAmount || Number(formAmount) <= 0) errors.amount = true;
    if (!formDate) errors.date = true;
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const fd = new FormData();
    fd.append('employeeId', user?.id || '');
    fd.append('title', formTitle);
    fd.append('category', formCategory);
    fd.append('amount', formAmount);
    fd.append('expenseDate', formDate);
    if (formDescription) fd.append('description', formDescription);
    if (formReceipt) fd.append('receipt', formReceipt);
    try {
      await createMutation.mutateAsync(fd);
      showToast(t('expenses:toast.createSuccess'));
      setIsFormOpen(false); resetForm();
    } catch (err) { showToast((err as Error).message || t('expenses:toast.createFailed'), 'error'); }
  };

  const handleApprove = async (id: string) => {
    try { await statusMutation.mutateAsync({ id, status: 'Approved' }); showToast(t('expenses:toast.approveSuccess')); } catch { showToast(t('expenses:toast.actionFailed'), 'error'); }
  };
  const handleReject = async () => {
    if (!rejectModalId) return;
    try { await statusMutation.mutateAsync({ id: rejectModalId, status: 'Rejected', rejectionReason: rejectReason }); showToast(t('expenses:toast.rejectSuccess')); setRejectModalId(null); setRejectReason(''); } catch { showToast(t('expenses:toast.actionFailed'), 'error'); }
  };
  const handleReimburse = async (id: string) => {
    try { await statusMutation.mutateAsync({ id, status: 'Reimbursed' }); showToast(t('expenses:toast.reimbursedSuccess')); } catch { showToast(t('expenses:toast.actionFailed'), 'error'); }
  };
  const handleCancel = async () => {
    if (!cancelConfirmId) return;
    try { await cancelMutation.mutateAsync(cancelConfirmId); showToast(t('expenses:toast.cancelSuccess')); setCancelConfirmId(null); } catch { showToast(t('expenses:toast.actionFailed'), 'error'); }
  };
  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try { await deleteMutation.mutateAsync(deleteConfirmId); showToast(t('expenses:toast.deleteSuccess')); setDeleteConfirmId(null); } catch { showToast(t('expenses:toast.actionFailed'), 'error'); }
  };

  const formatAmount = (n: number) => `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

  return {
    t,
    isAdmin,
    empSummary,
    adminSummary,
    claims,
    filtered,
    isFormOpen,
    setIsFormOpen,
    editingClaim,
    statusFilter,
    setStatusFilter,
    rejectModalId,
    setRejectModalId,
    rejectReason,
    setRejectReason,
    cancelConfirmId,
    setCancelConfirmId,
    deleteConfirmId,
    setDeleteConfirmId,
    formTitle,
    setFormTitle,
    formCategory,
    setFormCategory,
    formAmount,
    setFormAmount,
    formDate,
    setFormDate,
    formDescription,
    setFormDescription,
    formReceipt,
    setFormReceipt,
    formErrors,
    setFormErrors,
    statusFilterOptions,
    createMutation,
    openCreate,
    openEdit,
    resetForm,
    handleSubmit,
    handleApprove,
    handleReject,
    handleReimburse,
    handleCancel,
    handleDelete,
    formatAmount,
  };
}
