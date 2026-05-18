import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Megaphone,
  ScrollText,
  PartyPopper,
  Plus,
  X,
  Check,
  Search,
  Filter,
  Trash2,
  Edit3,
  Calendar,
  Type,
  AlignLeft,
} from 'lucide-react';
import { Announcement } from '../types';
import { useToast } from '../contexts/ToastContext';
import { Dropdown } from '../components/Dropdown';
import {
  useAnnouncements,
  useAddAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
} from '../hooks/queries';
import { useAuth } from '../contexts/AuthContext';

type AnnouncementType = Announcement['type'];
type FilterType = 'all' | AnnouncementType;

const EMPTY_ANNOUNCEMENT: Partial<Announcement> = { type: 'announcement' };

export const Announcements: React.FC = () => {
  const { t } = useTranslation(['wellbeing', 'common']);
  const { isAdminView } = useAuth();
  const { data: announcementsList = [] } = useAnnouncements();
  const addMutation = useAddAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  // ---------------------------------------------------------------------------
  // Local state
  // ---------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState<Partial<Announcement>>(EMPTY_ANNOUNCEMENT);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { showToast } = useToast();

  // ---------------------------------------------------------------------------
  // Filtering & search
  // ---------------------------------------------------------------------------
  const filteredAnnouncements = useMemo(() => {
    let list = announcementsList;

    if (activeFilter !== 'all') {
      list = list.filter((a) => a.type === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          (a.author && a.author.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [announcementsList, activeFilter, searchQuery]);

  // ---------------------------------------------------------------------------
  // Filter tabs
  // ---------------------------------------------------------------------------
  const filterTabs: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('common:buttons.all', 'All') },
    { key: 'announcement', label: t('announcementModal.typeAnnouncement') },
    { key: 'policy', label: t('announcementModal.typePolicy') },
    { key: 'event', label: t('announcementModal.typeEvent') },
  ];

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const typeIcon = (type: AnnouncementType) => {
    switch (type) {
      case 'announcement':
        return <Megaphone size={20} />;
      case 'policy':
        return <ScrollText size={20} />;
      case 'event':
        return <PartyPopper size={20} />;
    }
  };

  const typeBadgeClasses = (type: AnnouncementType) => {
    switch (type) {
      case 'announcement':
        return 'bg-primary/10 text-primary';
      case 'policy':
        return 'bg-accent-orange/10 text-accent-orange';
      case 'event':
        return 'bg-accent-teal/10 text-accent-teal';
    }
  };

  // ---------------------------------------------------------------------------
  // Modal helpers
  // ---------------------------------------------------------------------------
  const openCreateModal = () => {
    setEditingAnnouncement(null);
    setFormData({ ...EMPTY_ANNOUNCEMENT });
    setIsModalOpen(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      description: announcement.description,
      type: announcement.type,
      date: announcement.date,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAnnouncement(null);
    setFormData({ ...EMPTY_ANNOUNCEMENT });
  };

  // ---------------------------------------------------------------------------
  // CRUD handlers
  // ---------------------------------------------------------------------------
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAnnouncement) {
        await updateMutation.mutateAsync({
          id: editingAnnouncement.id,
          data: formData as Record<string, unknown>,
        });
        showToast(t('announcementModal.updateSuccess', 'Announcement updated successfully'));
      } else {
        await addMutation.mutateAsync(formData as Record<string, unknown>);
        showToast(t('announcementModal.postSuccess', 'Announcement posted successfully'));
      }
      closeModal();
    } catch {
      showToast(
        editingAnnouncement
          ? t('announcementModal.updateError', 'Failed to update announcement')
          : t('announcementModal.postError', 'Failed to post announcement'),
        'error',
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      showToast(t('announcementModal.deleteSuccess', 'Announcement deleted'));
      setDeleteConfirmId(null);
    } catch {
      showToast(t('announcementModal.deleteError', 'Failed to delete announcement'), 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark tracking-tight">
          {t('announcements.title')}
        </h1>
        {isAdminView && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary/90 transition-all hover:shadow-md"
          >
            <Plus size={16} />
            {t('announcementModal.title')}
          </button>
        )}
      </div>

      {/* Search & filters */}
      <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('announcements.searchPlaceholder', 'Search announcements...')}
              className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark text-sm"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-background-light dark:bg-background-dark rounded-lg p-1 border border-border-light dark:border-border-dark">
            <Filter size={14} className="text-text-muted-light dark:text-text-muted-dark ml-2 mr-1 flex-shrink-0" />
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeFilter === tab.key
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Announcements list */}
      <section className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6">
        {filteredAnnouncements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-background-light dark:bg-background-dark mb-4">
              <Megaphone size={32} className="text-text-muted-light dark:text-text-muted-dark" />
            </div>
            <p className="text-text-muted-light dark:text-text-muted-dark font-medium">
              {t('announcements.empty', 'No announcements found')}
            </p>
            <p className="text-text-muted-light/70 dark:text-text-muted-dark/70 text-sm mt-1">
              {searchQuery || activeFilter !== 'all'
                ? t('announcements.emptyFiltered', 'Try adjusting your search or filters')
                : t('announcements.emptyDefault', 'Announcements will appear here once created')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-background-light dark:bg-background-dark/50 transition-colors hover:bg-background-light/80 dark:hover:bg-background-dark"
              >
                {/* Type icon */}
                <div className={`p-2 rounded-full flex-shrink-0 ${typeBadgeClasses(item.type)}`}>
                  {typeIcon(item.type)}
                </div>

                {/* Content */}
                <div className="flex-grow min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-text-light dark:text-text-dark font-medium text-sm sm:text-base">
                      {item.title}
                    </p>
                    <span
                      className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full ${typeBadgeClasses(item.type)}`}
                    >
                      {item.type}
                    </span>
                    {item.date && (
                      <span className="text-xs bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark px-1.5 py-0.5 rounded text-text-muted-light">
                        {item.date}
                      </span>
                    )}
                  </div>
                  <p className="text-text-muted-light dark:text-text-muted-dark text-sm mt-0.5">
                    {item.description}
                  </p>
                  {(item.author || item.createdAt) && (
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-text-muted-light dark:text-text-muted-dark">
                      {item.author && <span className="font-medium">{item.author}</span>}
                      {item.author && item.createdAt && <span>&middot;</span>}
                      {item.createdAt && (
                        <span>
                          {new Date(item.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Admin actions */}
                {isAdminView && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 text-text-muted-light hover:text-primary dark:text-text-muted-dark dark:hover:text-primary rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                      title={t('common:buttons.edit', 'Edit')}
                    >
                      <Edit3 size={16} />
                    </button>
                    {deleteConfirmId === item.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-500 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title={t('common:buttons.confirm', 'Confirm')}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="p-2 text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                          title={t('announcementModal.cancel')}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-2 text-text-muted-light hover:text-red-500 dark:text-text-muted-dark dark:hover:text-red-500 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                        title={t('common:buttons.delete', 'Delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create / Edit Modal */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Modal header */}
              <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                  {editingAnnouncement
                    ? t('announcementModal.editTitle', 'Edit Announcement')
                    : t('announcementModal.title')}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-text-muted-light hover:text-text-light"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSave} className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                    {t('announcementModal.titleLabel')}
                  </label>
                  <div className="relative">
                    <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                    <input
                      required
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder={t('announcementModal.titlePlaceholder')}
                      className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                    />
                  </div>
                </div>

                {/* Type & Date row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                      {t('announcementModal.type')}
                    </label>
                    <Dropdown
                      value={formData.type || 'announcement'}
                      onChange={(value) => setFormData({ ...formData, type: value as AnnouncementType })}
                      options={[
                        { value: 'announcement', label: t('announcementModal.typeAnnouncement') },
                        { value: 'policy', label: t('announcementModal.typePolicy') },
                        { value: 'event', label: t('announcementModal.typeEvent') },
                      ]}
                      placeholder={t('announcementModal.typePlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                      {t('announcementModal.eventDate')}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                      <input
                        type="text"
                        value={formData.date || ''}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        placeholder={t('announcementModal.eventDatePlaceholder')}
                        className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                      />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                    {t('announcementModal.content')}
                  </label>
                  <div className="relative">
                    <AlignLeft className="absolute left-3 top-3 text-text-muted-light" size={16} />
                    <textarea
                      required
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('announcementModal.contentPlaceholder')}
                      rows={4}
                      className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark resize-none"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
                  >
                    {t('announcementModal.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={addMutation.isPending || updateMutation.isPending}
                    className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Check size={16} />
                    {editingAnnouncement
                      ? t('announcementModal.save', 'Save')
                      : t('announcementModal.post')}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
