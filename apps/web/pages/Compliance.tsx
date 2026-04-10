import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  FileEdit,
  User,
  FileText,
  Shield,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { Toast } from '../components/Toast';
import { Dropdown } from '../components/Dropdown';
import {
  useComplianceChecks,
  useComplianceAuditLogs,
  useComplianceItems,
  useCreateComplianceItem,
  useUpdateComplianceItem,
  useDeleteComplianceItem,
  useUpdateComplianceStatus,
} from '../hooks/queries';
import { Modal } from '../components/Modal';
import { BASE_URL, getAuthToken } from '../lib/api';
import type { ComplianceItem } from '../types';

// Data point options for report builder
const DATA_POINTS = [
  { key: 'department', labelKey: 'reportBuilder.department' },
  { key: 'salary', labelKey: 'reportBuilder.salary' },
  { key: 'startDate', labelKey: 'reportBuilder.startDate' },
  { key: 'performanceRating', labelKey: 'reportBuilder.performanceRating' },
  { key: 'leaveBalance', labelKey: 'reportBuilder.leaveBalance' },
  { key: 'attendanceDays', labelKey: 'reportBuilder.attendanceDays' },
  { key: 'lateDays', labelKey: 'reportBuilder.lateDays' },
  { key: 'totalHours', labelKey: 'reportBuilder.totalHours' },
] as const;

const DATE_RANGES = [
  { value: 'last30', labelKey: 'reportBuilder.rangeLast30' },
  { value: 'last90', labelKey: 'reportBuilder.rangeLast90' },
  { value: 'thisYear', labelKey: 'reportBuilder.rangeThisYear' },
] as const;

// Audit log resource icon mapping
function getResourceIcon(resource: string) {
  if (resource.toLowerCase().includes('employee') || resource.toLowerCase().includes('user'))
    return <User size={16} />;
  if (resource.toLowerCase().includes('leave') || resource.toLowerCase().includes('attendance'))
    return <Clock size={16} />;
  if (resource.toLowerCase().includes('document'))
    return <FileText size={16} />;
  return <Shield size={16} />;
}

function getResourceColor(resource: string) {
  if (resource.toLowerCase().includes('employee') || resource.toLowerCase().includes('user'))
    return 'bg-primary/10 text-primary';
  if (resource.toLowerCase().includes('leave'))
    return 'bg-accent-green/10 text-accent-green';
  if (resource.toLowerCase().includes('document'))
    return 'bg-accent-orange/10 text-accent-orange';
  return 'bg-gray-100 dark:bg-gray-700 text-text-muted-light dark:text-text-muted-dark';
}

function formatTimeAgo(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return t('auditLog.justNow');
  if (diffMins < 60) return t('auditLog.minsAgo', { count: diffMins });
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return t('auditLog.hoursAgo', { count: diffHours });
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return t('auditLog.daysAgo', { count: diffDays });
  return date.toLocaleDateString();
}

export const Compliance: React.FC = () => {
  const { t } = useTranslation(['compliance', 'common']);

  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    show: false, message: '', type: 'success',
  });
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ show: true, message, type });
  };

  // Compliance checks
  const { data: checks = [], isLoading: checksLoading } = useComplianceChecks();

  // Audit logs
  const [auditPage, setAuditPage] = useState(1);
  const [auditResource, setAuditResource] = useState('All');
  const { data: auditData, isLoading: auditLoading } = useComplianceAuditLogs({
    page: auditPage,
    limit: 10,
    resource: auditResource,
  });

  // Report builder state
  const [reportName, setReportName] = useState('');
  const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set(['department']));
  const [dateRange, setDateRange] = useState('last90');
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleDataPoint = (key: string) => {
    setSelectedPoints((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Download helper for CSV endpoints
  const downloadCsv = async (url: string, filename: string) => {
    const token = getAuthToken();
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const handleExportData = async () => {
    showToast(t('exportData') + '...', 'info');
    try {
      const date = new Date().toISOString().slice(0, 10);
      await downloadCsv(`${BASE_URL}/compliance/export`, `compliance_summary_${date}.csv`);
      showToast(t('exportSuccess'), 'success');
    } catch {
      showToast(t('exportFailed'), 'error');
    }
  };

  const handleGenerateReport = async () => {
    if (!reportName.trim()) {
      showToast(t('reportBuilder.nameRequired'), 'warning');
      return;
    }
    if (selectedPoints.size === 0) {
      showToast(t('reportBuilder.selectAtLeast'), 'warning');
      return;
    }
    setIsGenerating(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${BASE_URL}/compliance/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          dataPoints: Array.from(selectedPoints),
          dateRange,
        }),
      });
      if (!response.ok) throw new Error('Failed to generate report');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName.replace(/\s+/g, '_')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('reportBuilder.reportGenerated', { name: reportName }), 'success');
      setReportName('');
    } catch {
      showToast(t('reportBuilder.downloadFailed'), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Unique resources for filter dropdown
  const resourceOptions = ['All', 'Employee', 'Leave', 'Document', 'Attendance', 'Auth'];

  // Compliance Items
  const [itemStatusFilter, setItemStatusFilter] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('');
  const [itemPage, setItemPage] = useState(1);
  const { data: itemsData } = useComplianceItems({
    status: itemStatusFilter || undefined,
    category: itemCategoryFilter || undefined,
    page: itemPage,
    limit: 10,
  });
  const createItemMutation = useCreateComplianceItem();
  const updateItemMutation = useUpdateComplianceItem();
  const deleteItemMutation = useDeleteComplianceItem();
  const updateStatusMutation = useUpdateComplianceStatus();

  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ComplianceItem | null>(null);
  const [itemForm, setItemForm] = useState({
    title: '', description: '', category: 'Custom', priority: 'Medium', riskLevel: 'Low',
    dueDate: '',
  });

  const [statusChangeItem, setStatusChangeItem] = useState<ComplianceItem | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');

  const openItemCreate = () => {
    setEditingItem(null);
    setItemForm({ title: '', description: '', category: 'Custom', priority: 'Medium', riskLevel: 'Low', dueDate: '' });
    setIsItemFormOpen(true);
  };

  const openItemEdit = (item: ComplianceItem) => {
    setEditingItem(item);
    setItemForm({
      title: item.title,
      description: item.description || '',
      category: item.category,
      priority: item.priority,
      riskLevel: item.riskLevel,
      dueDate: item.dueDate || '',
    });
    setIsItemFormOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.title) return;
    try {
      if (editingItem) {
        await updateItemMutation.mutateAsync({ id: editingItem.id, data: itemForm as any });
        showToast('Item updated', 'success');
      } else {
        await createItemMutation.mutateAsync(itemForm as any);
        showToast('Item created', 'success');
      }
      setIsItemFormOpen(false);
    } catch {
      showToast('Failed to save item', 'error');
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteItemMutation.mutateAsync(id);
      setDeleteConfirmId(null);
      showToast('Item deleted', 'success');
    } catch {
      showToast('Failed to delete item', 'error');
    }
  };

  const handleStatusChange = async () => {
    if (!statusChangeItem || !newStatus) return;
    try {
      await updateStatusMutation.mutateAsync({
        id: statusChangeItem.id,
        status: newStatus,
        reason: statusReason || undefined,
      });
      setStatusChangeItem(null);
      setNewStatus('');
      setStatusReason('');
      showToast('Status updated', 'success');
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const statusColors: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    Active: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    'In Progress': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    Completed: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    Overdue: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  };

  const priorityColors: Record<string, string> = {
    Low: 'text-gray-500', Medium: 'text-yellow-600', High: 'text-orange-500', Critical: 'text-red-600',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div className="flex flex-col">
          <h1 className="text-text-light dark:text-text-dark text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-text-muted-light dark:text-text-muted-dark text-base">{t('subtitle')}</p>
        </div>
        <button
          onClick={handleExportData}
          className="flex items-center gap-2 px-5 py-2.5 bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark font-medium rounded-lg text-sm border border-border-light dark:border-border-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Download size={18} />
          {t('exportData')}
        </button>
      </header>

      {/* Compliance Items Section */}
      <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex flex-wrap justify-between items-center gap-3">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{t('items.title')}</h2>
          <div className="flex items-center gap-2">
            <Dropdown
              value={itemStatusFilter}
              onChange={(val) => { setItemStatusFilter(val); setItemPage(1); }}
              placeholder={t('items.allStatus')}
              width="w-36"
              options={[
                { value: '', label: t('items.allStatus') },
                ...['Draft', 'Active', 'In Progress', 'Completed', 'Overdue'].map(s => ({ value: s, label: t(`items.status${s.replace(/\s/g, '')}`) }))
              ]}
            />
            <Dropdown
              value={itemCategoryFilter}
              onChange={(val) => { setItemCategoryFilter(val); setItemPage(1); }}
              placeholder={t('items.allCategories')}
              width="w-36"
              options={[
                { value: '', label: t('items.allCategories') },
                ...['ISO', 'PDPA', 'Custom'].map(c => ({ value: c, label: c }))
              ]}
            />
            <button
              onClick={openItemCreate}
              className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {t('items.addItem')}
            </button>
          </div>
        </div>

        {!itemsData?.data?.length ? (
          <div className="p-8 text-center text-text-muted-light dark:text-text-muted-dark text-sm">
            {t('items.noItems')}
          </div>
        ) : (
          <>
            <div className="divide-y divide-border-light dark:divide-border-dark">
              {itemsData.data.map((item) => (
                <div key={item.id} className="px-6 py-3 flex items-center justify-between hover:bg-background-light dark:hover:bg-background-dark/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-text-light dark:text-text-dark truncate">{item.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusColors[item.status] || ''}`}>{t(`items.status${item.status.replace(/\s/g, '')}`)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">
                      <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{item.category}</span>
                      <span className={priorityColors[item.priority] || ''}>{item.priority}</span>
                      <span>{t('items.risk')}: {item.riskLevel}</span>
                      {item.assignedToName && <span>→ {item.assignedToName}</span>}
                      {item.dueDate && (
                        <span className={new Date(item.dueDate) < new Date() && item.status !== 'Completed' ? 'text-red-500 font-medium' : ''}>
                          {t('items.due')}: {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => { setStatusChangeItem(item); setNewStatus(''); setStatusReason(''); }}
                      className="p-1 text-text-muted-light hover:text-primary rounded text-xs"
                      title="Change Status"
                    >
                      <FileEdit size={14} />
                    </button>
                    <button onClick={() => openItemEdit(item)} className="p-1 text-text-muted-light hover:text-primary rounded" title="Edit">
                      <FileEdit size={14} />
                    </button>
                    <button onClick={() => setDeleteConfirmId(item.id)} className="p-1 text-text-muted-light hover:text-red-500 rounded" title="Delete">
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {itemsData.totalPages > 1 && (
              <div className="px-6 py-3 border-t border-border-light dark:border-border-dark flex justify-between items-center text-xs text-text-muted-light dark:text-text-muted-dark">
                <span>{itemsData.total} {t('items.items')}</span>
                <div className="flex gap-1">
                  <button onClick={() => setItemPage(p => Math.max(1, p - 1))} disabled={itemPage <= 1} className="px-2 py-1 border rounded disabled:opacity-30"><ChevronLeft size={14} /></button>
                  <span className="px-2 py-1">{itemPage}/{itemsData.totalPages}</span>
                  <button onClick={() => setItemPage(p => Math.min(itemsData.totalPages, p + 1))} disabled={itemPage >= itemsData.totalPages} className="px-2 py-1 border rounded disabled:opacity-30"><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Item Form Modal */}
      <Modal isOpen={isItemFormOpen} onClose={() => setIsItemFormOpen(false)} title={editingItem ? t('items.editItem') : t('items.addItemTitle')}>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('items.titleLabel')} *</label>
            <input
              value={itemForm.title}
              onChange={(e) => setItemForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('items.descriptionLabel')}</label>
            <textarea
              value={itemForm.description}
              onChange={(e) => setItemForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-light dark:text-text-dark mb-1">{t('items.categoryLabel')}</label>
              <Dropdown
                value={itemForm.category}
                onChange={(val) => setItemForm(f => ({ ...f, category: val }))}
                options={['ISO', 'PDPA', 'Custom'].map(c => ({ value: c, label: c }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light dark:text-text-dark mb-1">{t('items.priorityLabel')}</label>
              <Dropdown
                value={itemForm.priority}
                onChange={(val) => setItemForm(f => ({ ...f, priority: val }))}
                options={['Low', 'Medium', 'High', 'Critical'].map(p => ({ value: p, label: p }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-light dark:text-text-dark mb-1">{t('items.riskLevelLabel')}</label>
              <Dropdown
                value={itemForm.riskLevel}
                onChange={(val) => setItemForm(f => ({ ...f, riskLevel: val }))}
                options={['Low', 'Medium', 'High', 'Critical'].map(r => ({ value: r, label: r }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('items.dueDateLabel')}</label>
            <input
              type="date"
              value={itemForm.dueDate}
              onChange={(e) => setItemForm(f => ({ ...f, dueDate: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setIsItemFormOpen(false)} className="px-4 py-2 text-sm text-text-muted-light hover:text-text-light">{t('items.cancel')}</button>
            <button onClick={handleSaveItem} disabled={!itemForm.title} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {editingItem ? t('items.update') : t('items.create')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Status Change Modal */}
      <Modal isOpen={!!statusChangeItem} onClose={() => setStatusChangeItem(null)} title={t('items.changeStatus')} maxWidth="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
            {t('items.currentStatus')}: <span className={`font-medium ${statusColors[statusChangeItem?.status || ''] || ''} px-2 py-0.5 rounded`}>{statusChangeItem?.status ? t(`items.status${statusChangeItem.status.replace(/\s/g, '')}`) : ''}</span>
          </p>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('items.newStatus')}</label>
            <Dropdown
              value={newStatus}
              onChange={(val) => setNewStatus(val)}
              placeholder={t('items.selectStatus')}
              options={['Draft', 'Active', 'In Progress', 'Completed'].filter(s => s !== statusChangeItem?.status).map(s => ({ value: s, label: t(`items.status${s.replace(/\s/g, '')}`) }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('items.reasonLabel')}</label>
            <textarea
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setStatusChangeItem(null)} className="px-4 py-2 text-sm text-text-muted-light">{t('items.cancel')}</button>
            <button onClick={handleStatusChange} disabled={!newStatus} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {t('items.updateStatus')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title={t('items.deleteItem')} maxWidth="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-text-light dark:text-text-dark">
            {t('items.deleteConfirm')}
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm text-text-muted-light hover:text-text-light">{t('items.cancel')}</button>
            <button
              onClick={() => deleteConfirmId && handleDeleteItem(deleteConfirmId)}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
            >
              {t('items.delete')}
            </button>
          </div>
        </div>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-8">
          {/* ===== Compliance Checklist ===== */}
          <section className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark">
            <div className="p-6 border-b border-border-light dark:border-border-dark">
              <h2 className="text-text-light dark:text-text-dark text-xl font-bold tracking-tight">{t('checklist.title')}</h2>
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm mt-1">{t('checklist.subtitle')}</p>
            </div>
            <div className="p-6 space-y-3">
              {checksLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 bg-background-light dark:bg-background-dark/50 rounded-lg animate-pulse" />
                ))
              ) : (
                [...checks].sort((a, b) => {
                  const order: Record<string, number> = { 'Overdue': 0, 'In Progress': 1, 'Complete': 2 };
                  return (order[a.status] ?? 1) - (order[b.status] ?? 1);
                }).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-background-light dark:bg-background-dark/50">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {item.status === 'Complete' && <CheckCircle2 className="text-accent-green flex-shrink-0" size={20} />}
                      {item.status === 'In Progress' && <Clock className="text-accent-orange flex-shrink-0" size={20} />}
                      {item.status === 'Overdue' && <AlertCircle className="text-accent-red flex-shrink-0" size={20} />}
                      <div className="flex-1 min-w-0">
                        <p className="text-text-light dark:text-text-dark font-medium text-sm">{t(item.titleKey)}</p>
                        {/* Progress bar */}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                item.status === 'Complete' ? 'bg-accent-green' :
                                item.status === 'In Progress' ? 'bg-accent-orange' : 'bg-accent-red'
                              }`}
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-text-muted-light dark:text-text-muted-dark whitespace-nowrap">
                            {item.detail.endsWith(' types')
                              ? item.detail.replace(' types', ` ${t('checklist.types')}`)
                              : item.detail}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ml-3 whitespace-nowrap ${
                      item.status === 'Complete' ? 'text-accent-green bg-accent-green/10' :
                      item.status === 'In Progress' ? 'text-accent-orange bg-accent-orange/10' :
                      'text-accent-red bg-accent-red/10'
                    }`}>
                      {item.status === 'Complete' ? t('common:status.completed') :
                       item.status === 'In Progress' ? t('common:status.inProgress') :
                       t('common:status.overdue')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ===== HR Audit Log ===== */}
          <section className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark">
            <div className="p-6 border-b border-border-light dark:border-border-dark flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-text-light dark:text-text-dark text-xl font-bold tracking-tight">{t('auditLog.title')}</h2>
                <p className="text-text-muted-light dark:text-text-muted-dark text-sm mt-1">{t('auditLog.subtitle')}</p>
              </div>
              <Dropdown
                value={auditResource}
                onChange={(val) => { setAuditResource(val); setAuditPage(1); }}
                options={resourceOptions.map((opt) => ({
                  value: opt,
                  label: opt === 'All' ? t('auditLog.filterAll') : opt,
                }))}
                width="w-44"
              />
            </div>
            <div className="p-6 space-y-4">
              {auditLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-background-light dark:bg-background-dark/50 rounded-lg animate-pulse" />
                ))
              ) : !auditData?.data?.length ? (
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark text-center py-6">{t('auditLog.noLogs')}</p>
              ) : (
                auditData.data.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className={`rounded-full p-2 flex-shrink-0 ${getResourceColor(log.resource)}`}>
                      {getResourceIcon(log.resource)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-light dark:text-text-dark text-sm leading-snug">
                        <span className="font-semibold">{log.userEmail || t('auditLog.system')}</span>
                        {' — '}
                        <span className="text-text-muted-light dark:text-text-muted-dark">
                          {t(`auditLog.actions.${log.action}`, { defaultValue: log.action })}
                        </span>
                      </p>
                      <p className="text-text-muted-light dark:text-text-muted-dark text-xs mt-0.5">
                        {t(`auditLog.resources.${log.resource}`, { defaultValue: log.resource })} · {formatTimeAgo(log.createdAt, t)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      log.success ? 'text-accent-green bg-accent-green/10' : 'text-accent-red bg-accent-red/10'
                    }`}>
                      {log.success ? t('auditLog.success') : t('auditLog.failed')}
                    </span>
                  </div>
                ))
              )}

              {/* Pagination */}
              {auditData && auditData.totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-border-light dark:border-border-dark">
                  <button
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    disabled={auditPage <= 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft size={14} /> {t('auditLog.previous')}
                  </button>
                  <span className="text-xs text-text-muted-light dark:text-text-muted-dark">
                    {t('auditLog.page', { current: auditPage, total: auditData.totalPages })}
                  </span>
                  <button
                    onClick={() => setAuditPage((p) => Math.min(auditData.totalPages, p + 1))}
                    disabled={auditPage >= auditData.totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark disabled:opacity-40 transition-colors"
                  >
                    {t('auditLog.next')} <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ===== Custom Report Builder ===== */}
        <div className="flex flex-col">
          <section className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark h-full">
            <div className="p-6 border-b border-border-light dark:border-border-dark">
              <h2 className="text-text-light dark:text-text-dark text-xl font-bold tracking-tight">{t('reportBuilder.title')}</h2>
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm mt-1">{t('reportBuilder.subtitle')}</p>
            </div>
            <div className="p-6 flex flex-col">
              <div className="space-y-6 flex-grow">
                {/* Report Name */}
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2" htmlFor="report-name">
                    {t('reportBuilder.reportName')}
                  </label>
                  <input
                    className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark placeholder:text-text-muted-light focus:outline-none focus:ring-2 focus:ring-primary"
                    id="report-name"
                    placeholder={t('reportBuilder.reportPlaceholder')}
                    type="text"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                  />
                </div>

                {/* Data Points */}
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                    {t('reportBuilder.dataPoints')}
                  </label>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-3">
                    {t('reportBuilder.employeeName')} ({t('common:status.always')})
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {DATA_POINTS.map((point) => {
                      const checked = selectedPoints.has(point.key);
                      return (
                        <button
                          key={point.key}
                          type="button"
                          onClick={() => toggleDataPoint(point.key)}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <span
                            className={`flex items-center justify-center w-[18px] h-[18px] rounded border-2 transition-all flex-shrink-0 ${
                              checked
                                ? 'bg-primary border-primary'
                                : 'border-gray-300 dark:border-gray-600 group-hover:border-primary/60'
                            }`}
                          >
                            {checked && <Check size={12} className="text-white" strokeWidth={3} />}
                          </span>
                          <span className="text-text-light dark:text-text-dark text-sm">{t(point.labelKey)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2" htmlFor="date-range">
                    {t('reportBuilder.dateRange')}
                  </label>
                  <Dropdown
                    value={dateRange}
                    onChange={setDateRange}
                    options={DATE_RANGES.map((range) => ({
                      value: range.value,
                      label: t(range.labelKey),
                    }))}
                    id="date-range"
                  />
                </div>
              </div>

              {/* Generate Button */}
              <div className="mt-8">
                <button
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileEdit size={18} />
                  {isGenerating ? t('reportBuilder.generating') : t('reportBuilder.generateReport')}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Toast */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
};
