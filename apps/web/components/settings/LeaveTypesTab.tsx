import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Check } from 'lucide-react';
import { useLeaveTypeConfig, useUpdateLeaveTypeConfig } from '../../hooks/queries';
import { COLOR_PALETTE, AVAILABLE_COLORS } from '../../lib/leaveTypeConfig';
import { Modal } from '../Modal';
import { useToast } from '../../contexts/ToastContext';
import type { LeaveQuotaConfig } from '../../types';

interface FormState {
  type: string;
  total: string;
  color: string;
}

const emptyForm: FormState = { type: '', total: '', color: 'blue' };

export const LeaveTypesTab: React.FC = () => {
  const { t } = useTranslation(['settings', 'common']);
  const { showToast } = useToast();
  const { data: configs = [], isPending } = useLeaveTypeConfig();
  const updateMutation = useUpdateLeaveTypeConfig();

  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const isEditing = editIndex !== null;

  const openAdd = () => {
    setForm(emptyForm);
    setEditIndex(null);
    setModalOpen(true);
  };

  const openEdit = (idx: number) => {
    const cfg = configs[idx]!;
    setForm({
      type: cfg.type,
      total: String(cfg.total),
      color: cfg.color || 'gray',
    });
    setEditIndex(idx);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditIndex(null);
    setForm(emptyForm);
  };

  const nameError = useMemo(() => {
    const trimmed = form.type.trim();
    if (!trimmed) return '';
    const isDuplicate = configs.some(
      (c, i) => c.type.toLowerCase() === trimmed.toLowerCase() && i !== editIndex,
    );
    return isDuplicate ? t('leaveTypes.nameDuplicate') : '';
  }, [form.type, configs, editIndex]);

  const handleSave = async () => {
    const trimmed = form.type.trim();
    if (!trimmed) {
      showToast(t('leaveTypes.nameRequired'), 'error');
      return;
    }
    if (nameError) {
      showToast(nameError, 'error');
      return;
    }
    const totalNum = form.total.trim() === '' ? 0 : Number(form.total);
    if (isNaN(totalNum)) {
      showToast(t('leaveTypes.quotaInvalid'), 'error');
      return;
    }

    const newEntry: LeaveQuotaConfig = { type: trimmed, total: totalNum, color: form.color };
    let updated: LeaveQuotaConfig[];

    if (isEditing && editIndex !== null) {
      updated = configs.map((c, i) => (i === editIndex ? newEntry : c));
    } else {
      updated = [...configs, newEntry];
    }

    try {
      await updateMutation.mutateAsync(updated);
      showToast(isEditing ? t('leaveTypes.typeUpdated') : t('leaveTypes.typeAdded'), 'success');
      closeModal();
    } catch {
      showToast(t('leaveTypes.saveFailed'), 'error');
    }
  };

  const handleDelete = async () => {
    if (deleteIndex === null) return;
    const updated = configs.filter((_, i) => i !== deleteIndex);
    try {
      await updateMutation.mutateAsync(updated);
      showToast(t('leaveTypes.typeDeleted'), 'success');
    } catch {
      showToast(t('leaveTypes.deleteFailed'), 'error');
    } finally {
      setDeleteIndex(null);
    }
  };

  if (isPending) {
    return (
      <div className="p-6 flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-4">
        <div>
          <h2 className="text-xl font-bold text-text-light dark:text-text-dark">{t('leaveTypes.title')}</h2>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
            {t('leaveTypes.subtitle')}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> {t('leaveTypes.addType')}
        </button>
      </div>

      {/* Desktop Table */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light dark:border-border-dark">
              <th className="text-left py-3 px-4 font-medium text-text-muted-light dark:text-text-muted-dark">{t('leaveTypes.typeName')}</th>
              <th className="text-left py-3 px-4 font-medium text-text-muted-light dark:text-text-muted-dark">{t('leaveTypes.annualQuota')}</th>
              <th className="text-left py-3 px-4 font-medium text-text-muted-light dark:text-text-muted-dark">{t('leaveTypes.color')}</th>
              <th className="text-right py-3 px-4 font-medium text-text-muted-light dark:text-text-muted-dark">{t('leaveTypes.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark">
            {configs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-text-muted-light dark:text-text-muted-dark">
                  {t('leaveTypes.noTypes')}
                </td>
              </tr>
            ) : (
              configs.map((cfg, idx) => {
                const palette = (cfg.color ? COLOR_PALETTE[cfg.color] : undefined) ?? COLOR_PALETTE.gray!;
                return (
                  <tr key={cfg.type} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${palette.badge}`}>
                        {cfg.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-light dark:text-text-dark">
                      {cfg.total === -1 ? (
                        <span className="text-text-muted-light dark:text-text-muted-dark italic">{t('leaveTypes.unlimited')}</span>
                      ) : (
                        <>{cfg.total} {t('leaveTypes.days')}</>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full ${palette.dot}`} />
                        <span className="text-text-muted-light dark:text-text-muted-dark capitalize text-xs">
                          {cfg.color || 'gray'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(idx)}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteIndex(idx)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden">
        {configs.length === 0 ? (
          <div className="py-8 text-center text-text-muted-light dark:text-text-muted-dark">
            {t('leaveTypes.noTypes')}
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map((cfg, idx) => {
              const palette = (cfg.color ? COLOR_PALETTE[cfg.color] : undefined) ?? COLOR_PALETTE.gray!;
              return (
                <div
                  key={cfg.type}
                  className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${palette.badge}`}>
                      {cfg.type}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(idx)}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteIndex(idx)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-light dark:text-text-dark">
                      {cfg.total === -1 ? (
                        <span className="text-text-muted-light dark:text-text-muted-dark italic">{t('leaveTypes.unlimited')}</span>
                      ) : (
                        <>{cfg.total} {t('leaveTypes.days')}</>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full ${palette.dot}`} />
                      <span className="text-text-muted-light dark:text-text-muted-dark capitalize text-xs">
                        {cfg.color || 'gray'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={isEditing ? t('leaveTypes.editType') : t('leaveTypes.addTypeTitle')}
        maxWidth="sm"
      >
        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
              {t('leaveTypes.typeNameLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              className={`w-full px-3 py-2 bg-background-light dark:bg-background-dark border rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary ${
                nameError ? 'border-red-500' : 'border-border-light dark:border-border-dark'
              }`}
              placeholder={t('leaveTypes.typeNamePlaceholder')}
            />
            {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
          </div>

          {/* Quota */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
              {t('leaveTypes.quotaLabel')}
            </label>
            <input
              type="number"
              value={form.total}
              onChange={(e) => setForm((p) => ({ ...p, total: e.target.value }))}
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('leaveTypes.quotaPlaceholder')}
            />
            <p className="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">
              {t('leaveTypes.quotaHint')}
            </p>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              {t('leaveTypes.colorLabel')}
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_COLORS.map((colorKey) => {
                const isSelected = form.color === colorKey;
                const paletteEntry = COLOR_PALETTE[colorKey] ?? COLOR_PALETTE.gray!;
                return (
                  <button
                    key={colorKey}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, color: colorKey }))}
                    className={`w-8 h-8 rounded-full ${paletteEntry.dot} transition-all ${
                      isSelected ? 'ring-2 ring-offset-2 ring-primary dark:ring-offset-gray-900 scale-110' : 'hover:scale-110'
                    }`}
                    title={colorKey}
                  />
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm text-text-muted-light hover:text-text-light dark:hover:text-text-dark transition-colors"
            >
              {t('leaveTypes.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={updateMutation.isPending || !!nameError}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={16} />
              {updateMutation.isPending ? t('leaveTypes.saving') : isEditing ? t('leaveTypes.update') : t('leaveTypes.add')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteIndex !== null}
        onClose={() => setDeleteIndex(null)}
        title={t('leaveTypes.deleteType')}
        maxWidth="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-text-light dark:text-text-dark">
            {t('leaveTypes.deleteConfirm')}{' '}
            <strong>{deleteIndex !== null ? configs[deleteIndex]?.type : ''}</strong>?
            {' '}{t('leaveTypes.deleteWarning')}
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteIndex(null)}
              className="px-4 py-2 text-sm text-text-muted-light hover:text-text-light dark:hover:text-text-dark transition-colors"
            >
              {t('leaveTypes.cancel')}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
              {updateMutation.isPending ? t('leaveTypes.deleting') : t('common:buttons.delete')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
