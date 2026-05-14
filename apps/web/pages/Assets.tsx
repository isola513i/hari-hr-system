import { useState } from 'react';
import { Package, Plus, X, Pencil, UserCheck, UserX, Trash2, Search, Monitor, Smartphone, Car, Wrench } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAssets, useCreateAsset, useUpdateAsset, useAssignAsset, useUnassignAsset, useDeleteAsset, useAllEmployees } from '../hooks/queries';
import { Toast } from '../components/Toast';
import type { CompanyAsset, AssetStatus } from '../types';

// ─── Config ───────────────────────────────────────────────────────────────────

const ASSET_TYPES = ['Laptop', 'Desktop', 'Monitor', 'Phone', 'Tablet', 'Vehicle', 'Equipment', 'Furniture', 'Other'];

const STATUS_CONFIG: Record<AssetStatus, { label: string; bg: string; text: string }> = {
  'Available':         { label: 'Available',          bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-400' },
  'Assigned':          { label: 'Assigned',            bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-400' },
  'Under Maintenance': { label: 'Under Maintenance',   bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  'Retired':           { label: 'Retired',             bg: 'bg-gray-100 dark:bg-gray-800',      text: 'text-gray-500 dark:text-gray-400' },
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

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const f = (field: keyof AssetFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{asset ? 'Edit Asset' : 'Add Asset'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handle} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input value={form.name} onChange={f('name')} required className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
              <select value={form.assetType} onChange={f('assetType')} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select value={form.status} onChange={f('status')} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                {(Object.keys(STATUS_CONFIG) as AssetStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
            <input value={form.serialNumber} onChange={f('serialNumber')} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Date</label>
              <input type="date" value={form.purchaseDate} onChange={f('purchaseDate')} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Price</label>
              <input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={f('purchasePrice')} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea value={form.notes} onChange={f('notes')} rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────

function AssignModal({ asset, onClose, onAssign }: { asset: CompanyAsset; onClose: () => void; onAssign: (employeeId: string) => Promise<void> }) {
  const { data: employees = [] } = useAllEmployees();
  const [employeeId, setEmployeeId] = useState('');
  const [saving, setSaving] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    setSaving(true);
    try { await onAssign(employeeId); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Assign "{asset.name}"</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handle} className="space-y-3">
          <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} required className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Select employee…</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>)}
          </select>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={saving || !employeeId} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">{saving ? 'Assigning…' : 'Assign'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Assets() {
  const { isAdminView } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editAsset, setEditAsset] = useState<CompanyAsset | null>(null);
  const [assignAsset, setAssignAsset] = useState<CompanyAsset | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ show: true, message, type });

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
        showToast('Asset updated');
      } else {
        await createMutation.mutateAsync(payload);
        showToast('Asset created');
      }
      setShowForm(false);
      setEditAsset(null);
    } catch { showToast('Failed to save asset', 'error'); }
  };

  const handleAssign = async (employeeId: string) => {
    try {
      await assignMutation.mutateAsync({ id: assignAsset!.id, employeeId });
      showToast('Asset assigned successfully');
      setAssignAsset(null);
    } catch { showToast('Failed to assign asset', 'error'); }
  };

  const handleUnassign = async (id: string) => {
    try {
      await unassignMutation.mutateAsync(id);
      showToast('Asset unassigned');
    } catch { showToast('Failed to unassign asset', 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this asset?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      showToast('Asset deleted');
    } catch { showToast('Failed to delete asset', 'error'); }
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Asset Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track and manage company assets</p>
        </div>
        {isAdminView && (
          <button onClick={() => { setEditAsset(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
            <Plus size={16} /> Add Asset
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900 dark:text-white' },
          { label: 'Available', value: stats.available, color: 'text-green-600 dark:text-green-400' },
          { label: 'Assigned', value: stats.assigned, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Maintenance', value: stats.maintenance, color: 'text-yellow-600 dark:text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</div>
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
            placeholder="Search by name or serial…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Statuses</option>
          {(Object.keys(STATUS_CONFIG) as AssetStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-16">
            <Package size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No assets found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Asset</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Assigned To</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Purchase Date</th>
                  {isAdminView && <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {assets.map(asset => {
                  const sc = STATUS_CONFIG[asset.status];
                  return (
                    <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{asset.name}</div>
                        {asset.serialNumber && <div className="text-xs text-gray-400 dark:text-gray-500">S/N: {asset.serialNumber}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                          {getIcon(asset.assetType)} {asset.assetType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {asset.assignedToName ? (
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{asset.assignedToName}</div>
                            {asset.assignedToDepartment && <div className="text-xs text-gray-400">{asset.assignedToDepartment}</div>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      {isAdminView && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setEditAsset(asset); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-primary rounded transition-colors" title="Edit">
                              <Pencil size={14} />
                            </button>
                            {asset.status !== 'Assigned' && asset.status !== 'Retired' && (
                              <button onClick={() => setAssignAsset(asset)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded transition-colors" title="Assign">
                                <UserCheck size={14} />
                              </button>
                            )}
                            {asset.status === 'Assigned' && (
                              <button onClick={() => handleUnassign(asset.id)} className="p-1.5 text-gray-400 hover:text-orange-500 rounded transition-colors" title="Unassign">
                                <UserX size={14} />
                              </button>
                            )}
                            <button onClick={() => handleDelete(asset.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors" title="Delete">
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

      {(showForm || editAsset) && (
        <AssetFormModal asset={editAsset} onClose={() => { setShowForm(false); setEditAsset(null); }} onSave={handleSave} />
      )}
      {assignAsset && (
        <AssignModal asset={assignAsset} onClose={() => setAssignAsset(null)} onAssign={handleAssign} />
      )}
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(p => ({ ...p, show: false }))} />
      )}
    </div>
  );
}

export default Assets;
