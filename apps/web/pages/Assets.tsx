import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useModalA11y } from '../hooks/useModalA11y';
import { Package, Plus, X, Pencil, UserCheck, UserX, Trash2, Search, Monitor, Smartphone, Car, Wrench } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAssets, useCreateAsset, useUpdateAsset, useAssignAsset, useUnassignAsset, useDeleteAsset, useAllEmployees } from '../hooks/queries';
import { useToast } from '../contexts/ToastContext';
import { Dropdown } from '../components/Dropdown';
import { DatePicker } from '../components/DatePicker';
import type { CompanyAsset, AssetStatus } from '../types';

// ─── Config ───────────────────────────────────────────────────────────────────

const ASSET_TYPES = ['Laptop', 'Desktop', 'Monitor', 'Phone', 'Tablet', 'Vehicle', 'Equipment', 'Furniture', 'Other'];
const ASSET_STATUSES: AssetStatus[] = ['Available', 'Assigned', 'Under Maintenance', 'Retired'];

const STATUS_BG_TEXT: Record<AssetStatus, { bg: string; text: string }> = {
  'Available':         { bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-400' },
  'Assigned':          { bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-400' },
  'Under Maintenance': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  'Retired':           { bg: 'bg-gray-100 dark:bg-gray-800',      text: 'text-text-muted-light dark:text-text-muted-dark' },
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  Laptop: <Monitor size={16} />,
  Desktop: <Monitor size={16} />,
  Phone: <Smartphone size={16} />,
  Tablet: <Smartphone size={16} />,
  Vehicle: <Car size={16} />,
};
const getIcon = (type: string) => TYPE_ICON[type] ?? <Wrench size={16} />;

// ─── Form Modal ───────────────────────────────────────────────────────────────

interface AssetFormData {
  name: string;
  assetType: string;
  serialNumber: string;
  status: AssetStatus;
  purchaseDate: string;
  purchasePrice: string;
  notes: string;
}

const EMPTY_FORM: AssetFormData = {
  name: '', assetType: 'Laptop', serialNumber: '', status: 'Available',
  purchaseDate: '', purchasePrice: '', notes: '',
};

function AssetFormModal({
  asset,
  onClose,
  onSave,
}: {
  asset?: CompanyAsset | null;
  onClose: () => void;
  onSave: (data: AssetFormData) => Promise<void>;
}) {
  const { t } = useTranslation(['assets', 'common']);
  const dialogRef = useModalA11y(true, onClose);
  const [form, setForm] = useState<AssetFormData>(
    asset ? {
      name: asset.name,
      assetType: asset.assetType,
      serialNumber: asset.serialNumber || '',
      status: asset.status,
      purchaseDate: asset.purchaseDate || '',
      purchasePrice: asset.purchasePrice != null ? String(asset.purchasePrice) : '',
      notes: asset.notes || '',
    } : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  const ASSET_TYPE_OPTIONS = ASSET_TYPES.map(tp => ({ value: tp, label: t(`assetType.${tp}`) }));
  const ASSET_STATUS_OPTIONS = ASSET_STATUSES.map(s => ({ value: s, label: t(`status.${s}`) }));

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const f = (field: keyof AssetFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-form-title"
        className="bg-card-light dark:bg-card-dark rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 id="asset-form-title" className="text-lg font-bold text-text-light dark:text-text-dark">{asset ? t('form.editTitle') : t('form.addTitle')}</h3>
          <button onClick={onClose} aria-label={t('common:buttons.close')}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handle} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('form.name')}</label>
            <input value={form.name} onChange={f('name')} required className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('form.type')}</label>
              <Dropdown
                options={ASSET_TYPE_OPTIONS}
                value={form.assetType}
                onChange={(val) => setForm(prev => ({ ...prev, assetType: val }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('form.status')}</label>
              <Dropdown
                options={ASSET_STATUS_OPTIONS}
                value={form.status}
                onChange={(val) => setForm(prev => ({ ...prev, status: val as AssetStatus }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('form.serialNumber')}</label>
            <input value={form.serialNumber} onChange={f('serialNumber')} className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('form.purchaseDate')}</label>
              <DatePicker value={form.purchaseDate} onChange={(v) => setForm(prev => ({ ...prev, purchaseDate: v }))} maxDate={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('form.purchasePrice')}</label>
              <input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={f('purchasePrice')} className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('form.notes')}</label>
            <textarea value={form.notes} onChange={f('notes')} rows={2} className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t('buttons.cancel')}</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">{saving ? t('buttons.saving') : t('buttons.save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────

function AssignModal({ asset, onClose, onAssign }: { asset: CompanyAsset; onClose: () => void; onAssign: (employeeId: string) => Promise<void> }) {
  const { t } = useTranslation(['assets', 'common']);
  const dialogRef = useModalA11y(true, onClose);
  const { data: employees = [] } = useAllEmployees();
  const [employeeId, setEmployeeId] = useState('');
  const [saving, setSaving] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {return;}
    setSaving(true);
    try { await onAssign(employeeId); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-assign-title"
        className="bg-card-light dark:bg-card-dark rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 id="asset-assign-title" className="text-lg font-bold text-text-light dark:text-text-dark">{t('assignModal.title', { name: asset.name })}</h3>
          <button onClick={onClose} aria-label={t('common:buttons.close')}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handle} className="space-y-3">
          <Dropdown
            options={[
              { value: '', label: t('assignModal.selectEmployee') },
              ...employees.map(emp => ({ value: emp.id, label: `${emp.name} (${emp.department})` })),
            ]}
            value={employeeId}
            onChange={(val) => setEmployeeId(val)}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t('buttons.cancel')}</button>
            <button type="submit" disabled={saving || !employeeId} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">{saving ? t('buttons.assigning') : t('buttons.assign')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Assets() {
  const { t } = useTranslation(['assets', 'common']);
  const { isAdminView } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editAsset, setEditAsset] = useState<CompanyAsset | null>(null);
  const [assignAsset, setAssignAsset] = useState<CompanyAsset | null>(null);
  const { showToast } = useToast();

  const STATUS_FILTER_OPTIONS = [
    { value: '', label: t('statusFilter.allStatuses') },
    ...ASSET_STATUSES.map(s => ({ value: s, label: t(`status.${s}`) })),
  ];

  const { data: assets = [], isLoading } = useAssets({ status: statusFilter || undefined, search: search || undefined });
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const assignMutation = useAssignAsset();
  const unassignMutation = useUnassignAsset();
  const deleteMutation = useDeleteAsset();

  const handleSave = async (form: AssetFormData) => {
    const payload = {
      name: form.name,
      assetType: form.assetType,
      serialNumber: form.serialNumber || undefined,
      status: form.status,
      purchaseDate: form.purchaseDate || undefined,
      purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
      notes: form.notes || undefined,
    };
    try {
      if (editAsset) {
        await updateMutation.mutateAsync({ id: editAsset.id, data: payload });
        showToast(t('toast.assetUpdated'));
      } else {
        await createMutation.mutateAsync(payload);
        showToast(t('toast.assetCreated'));
      }
      setShowForm(false);
      setEditAsset(null);
    } catch { showToast(t('toast.assetSaveFailed'), 'error'); }
  };

  const handleAssign = async (employeeId: string) => {
    try {
      await assignMutation.mutateAsync({ id: assignAsset!.id, employeeId });
      showToast(t('toast.assetAssigned'));
      setAssignAsset(null);
    } catch { showToast(t('toast.assetAssignFailed'), 'error'); }
  };

  const handleUnassign = async (id: string) => {
    try {
      await unassignMutation.mutateAsync(id);
      showToast(t('toast.assetUnassigned'));
    } catch { showToast(t('toast.assetUnassignFailed'), 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm.delete'))) {return;}
    try {
      await deleteMutation.mutateAsync(id);
      showToast(t('toast.assetDeleted'));
    } catch { showToast(t('toast.assetDeleteFailed'), 'error'); }
  };

  const stats = {
    total: assets.length,
    available: assets.filter(a => a.status === 'Available').length,
    assigned: assets.filter(a => a.status === 'Assigned').length,
    maintenance: assets.filter(a => a.status === 'Under Maintenance').length,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">{t('page.title')}</h1>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-0.5">{t('page.subtitle')}</p>
        </div>
        {isAdminView && (
          <button onClick={() => { setEditAsset(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
            <Plus size={16} /> {t('buttons.addAsset')}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('stats.total'),       value: stats.total,       color: 'text-text-light dark:text-text-dark' },
          { label: t('stats.available'),   value: stats.available,   color: 'text-green-600 dark:text-green-400' },
          { label: t('stats.assigned'),    value: stats.assigned,    color: 'text-blue-600 dark:text-blue-400' },
          { label: t('stats.maintenance'), value: stats.maintenance, color: 'text-yellow-600 dark:text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('filters.search')}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <Dropdown
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
          width="w-48"
        />
      </div>

      {/* Table */}
      <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-16">
            <Package size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('empty.noAssets')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-text-muted-light dark:text-text-muted-dark">{t('table.asset')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted-light dark:text-text-muted-dark">{t('table.type')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted-light dark:text-text-muted-dark">{t('table.status')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted-light dark:text-text-muted-dark">{t('table.assignedTo')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted-light dark:text-text-muted-dark">{t('table.purchaseDate')}</th>
                  {isAdminView && <th className="text-right px-4 py-3 font-semibold text-text-muted-light dark:text-text-muted-dark">{t('table.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {assets.map(asset => {
                  const sc = STATUS_BG_TEXT[asset.status];
                  return (
                    <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-text-light dark:text-text-dark">{asset.name}</div>
                        {asset.serialNumber && <div className="text-xs text-gray-400 dark:text-gray-500">S/N: {asset.serialNumber}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-text-muted-light dark:text-text-muted-dark">
                          {getIcon(asset.assetType)} {t(`assetType.${asset.assetType}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>{t(`status.${asset.status}`)}</span>
                      </td>
                      <td className="px-4 py-3 text-text-muted-light dark:text-text-muted-dark">
                        {asset.assignedToName ? (
                          <div>
                            <div className="font-medium text-text-light dark:text-text-dark">{asset.assignedToName}</div>
                            {asset.assignedToDepartment && <div className="text-xs text-gray-400">{asset.assignedToDepartment}</div>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-text-muted-light dark:text-text-muted-dark">
                        {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      {isAdminView && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setEditAsset(asset); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-primary rounded transition-colors" title={t('common:buttons.edit')}>
                              <Pencil size={14} />
                            </button>
                            {asset.status !== 'Assigned' && asset.status !== 'Retired' && (
                              <button onClick={() => setAssignAsset(asset)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded transition-colors" title={t('buttons.assign')}>
                                <UserCheck size={14} />
                              </button>
                            )}
                            {asset.status === 'Assigned' && (
                              <button onClick={() => handleUnassign(asset.id)} className="p-1.5 text-gray-400 hover:text-orange-500 rounded transition-colors" title={t('actions.unassign')}>
                                <UserX size={14} />
                              </button>
                            )}
                            <button onClick={() => handleDelete(asset.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors" title={t('common:buttons.delete')}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showForm || editAsset) && createPortal(
        <AssetFormModal asset={editAsset} onClose={() => { setShowForm(false); setEditAsset(null); }} onSave={handleSave} />,
        document.body
      )}
      {assignAsset && createPortal(
        <AssignModal asset={assignAsset} onClose={() => setAssignAsset(null)} onAssign={handleAssign} />,
        document.body
      )}
    </div>
  );
}

export default Assets;
