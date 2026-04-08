import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Plus, Pencil, Trash2, RotateCw } from 'lucide-react';
import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday } from '../hooks/queries';
import { useToast } from '../contexts/ToastContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import { DatePicker } from '../components/DatePicker';
import type { PublicHoliday } from '../types';

interface HolidayFormState {
  date: string;
  name: string;
  isRecurring: boolean;
}

const emptyForm: HolidayFormState = { date: '', name: '', isRecurring: false };

export const AdminHolidays: React.FC = () => {
  const { t } = useTranslation(['leave', 'common']);
  const { showToast } = useToast();
  const { data: holidays = [], isLoading } = useHolidays();
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HolidayFormState>(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (h: PublicHoliday) => {
    setEditingId(h.id);
    setForm({ date: h.date, name: h.name, isRecurring: h.isRecurring });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateHoliday.mutateAsync({ id: editingId, ...form });
        showToast(t('leave:holidays.updateSuccess'), 'success');
      } else {
        await createHoliday.mutateAsync(form);
        showToast(t('leave:holidays.createSuccess'), 'success');
      }
      setModalOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteHoliday.mutateAsync(id);
      showToast(t('leave:holidays.deleteSuccess'), 'success');
      setDeleteConfirmId(null);
    } catch (err: any) {
      showToast(err?.message || 'Failed', 'error');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
            <Calendar className="text-primary" size={28} />
            {t('leave:holidays.title')}
          </h1>
          <p className="text-text-muted-light dark:text-text-muted-dark mt-1">
            {t('leave:holidays.subtitle')}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus size={18} />
          {t('leave:holidays.addHoliday')}
        </button>
      </div>

      {/* Table */}
      <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
        {holidays.length === 0 ? (
          <div className="p-8 text-center text-text-muted-light dark:text-text-muted-dark">
            {t('leave:holidays.noHolidays')}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('leave:holidays.date')}
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('leave:holidays.name')}
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('leave:holidays.recurring')}
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                  {t('leave:admin.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {holidays.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-text-primary-light dark:text-text-primary-dark font-medium">
                    {formatDate(h.date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-primary-light dark:text-text-primary-dark">
                    {h.name}
                  </td>
                  <td className="px-6 py-4">
                    {h.isRecurring ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                        <RotateCw size={12} />
                        {t('leave:holidays.recurringYes')}
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted-light dark:text-text-muted-dark">
                        {t('leave:holidays.recurringNo')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(h)}
                        className="p-1.5 text-text-muted-light dark:text-text-muted-dark hover:text-primary transition-colors"
                        title={t('leave:holidays.editHoliday')}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(h.id)}
                        className="p-1.5 text-text-muted-light dark:text-text-muted-dark hover:text-red-500 transition-colors"
                        title={t('leave:holidays.deleteHoliday')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? t('leave:holidays.editHoliday') : t('leave:holidays.addHoliday')}>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
              {t('leave:holidays.name')}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <DatePicker
              label={t('leave:holidays.date')}
              value={form.date}
              onChange={(date) => setForm({ ...form, date })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={form.isRecurring}
              onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
            />
            <label htmlFor="isRecurring" className="text-sm text-text-light dark:text-text-dark">
              {t('leave:holidays.recurring')}
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors"
            >
              {t('common:buttons.cancel')}
            </button>
            <button
              type="submit"
              disabled={createHoliday.isPending || updateHoliday.isPending}
              className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {editingId ? t('common:buttons.save') : t('leave:holidays.addHoliday')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title={t('leave:holidays.deleteHoliday')} maxWidth="sm">
        <div className="p-6">
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-4">
            {t('leave:holidays.deleteConfirm')}
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2 text-sm text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors"
            >
              {t('common:buttons.cancel')}
            </button>
            <button
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteHoliday.isPending}
              className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {t('leave:holidays.deleteHoliday')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminHolidays;
