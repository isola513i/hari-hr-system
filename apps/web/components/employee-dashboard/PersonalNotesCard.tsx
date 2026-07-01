import React from 'react';
import { useTranslation } from 'react-i18next';
import { StickyNote, Pin, Pencil, Send, Trash2, X } from 'lucide-react';

interface DashboardNote {
  id: string;
  content: string;
  pinned: boolean;
  createdAt: string;
}

interface PersonalNotesCardProps {
  notesData: DashboardNote[];
  quickNote: string;
  setQuickNote: React.Dispatch<React.SetStateAction<string>>;
  isSavingNote: boolean;
  editingNoteId: string | null;
  setEditingNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  deletingNoteId: string | null;
  deleteConfirmNoteId: string | null;
  setDeleteConfirmNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  onSaveNote: () => void;
  onDeleteNote: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
}

export const PersonalNotesCard: React.FC<PersonalNotesCardProps> = ({
  notesData,
  quickNote,
  setQuickNote,
  isSavingNote,
  editingNoteId,
  setEditingNoteId,
  deletingNoteId,
  deleteConfirmNoteId,
  setDeleteConfirmNoteId,
  onSaveNote,
  onDeleteNote,
  onTogglePin,
}) => {
  const { t } = useTranslation(['dashboard', 'common']);

  return (
    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-lg">
                <StickyNote size={16} />
              </div>
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{t('dashboard:employee.personalNotes')}</h2>
            </div>
            {notesData.length > 0 && (
              <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('dashboard:admin.saved', { count: notesData.length })}</span>
            )}
          </div>
          <div className="p-4 flex-grow flex flex-col gap-3">
            {/* Note input */}
            <div className="relative">
              <label htmlFor="employeeNote" className="sr-only">{t('dashboard:employee.personalNoteLabel')}</label>
              <textarea
                id="employeeNote"
                name="employeeNote"
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder={t('dashboard:employee.writeNote')}
                className="w-full h-20 px-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm text-text-light dark:text-text-dark placeholder:text-text-muted-light transition-colors"
              />
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-muted-light dark:text-text-muted-dark">{t('dashboard:admin.chars', { count: quickNote.length })}</span>
                  {editingNoteId && (
                    <button onClick={() => { setEditingNoteId(null); setQuickNote(''); }} className="text-[10px] text-text-muted-light hover:text-text-light dark:hover:text-text-dark transition-colors">
                      {t('common:buttons.cancel')}
                    </button>
                  )}
                </div>
                <button
                  onClick={onSaveNote}
                  disabled={isSavingNote || !quickNote.trim()}
                  className={`flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-hover transition-colors font-medium ${isSavingNote || !quickNote.trim() ? 'opacity-40 cursor-not-allowed' : 'shadow-sm'}`}
                >
                  <Send size={12} />
                  {isSavingNote ? t('common:buttons.saving') : editingNoteId ? t('common:buttons.update') : t('dashboard:employee.saveNote')}
                </button>
              </div>
            </div>

            {/* Recent notes list */}
            {notesData.length > 0 && (
              <div className="flex-grow">
                <p className="text-xs font-medium text-text-muted-light dark:text-text-muted-dark mb-2 uppercase tracking-wide">{t('dashboard:admin.recent')}</p>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {notesData.slice(0, 5).map(note => (
                    <div
                      key={note.id}
                      className={`group flex items-start gap-2 p-2 rounded-lg transition-colors ${
                        note.pinned
                          ? 'bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30'
                          : 'hover:bg-background-light dark:hover:bg-background-dark'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {note.pinned ? (
                          <Pin size={12} className="text-amber-500 fill-amber-500" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-border-light dark:bg-border-dark mt-1"></div>
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-xs text-text-light dark:text-text-dark truncate">
                          {note.content.substring(0, 60)}{note.content.length > 60 ? '...' : ''}
                        </p>
                        {note.createdAt && (
                          <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark mt-0.5">
                            {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                      {deleteConfirmNoteId === note.id ? (
                        <div className="flex-shrink-0 flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                            disabled={deletingNoteId === note.id}
                            className="text-[10px] text-red-500 hover:text-red-600 font-medium transition-colors"
                          >
                            {t('common:buttons.confirm')}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmNoteId(null); }}
                            className="p-0.5 text-text-muted-light hover:text-text-light dark:hover:text-text-dark transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex-shrink-0 flex items-center gap-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); onTogglePin(note.id); }}
                            className={`p-1 rounded transition-all ${
                              note.pinned
                                ? 'text-amber-500 opacity-100'
                                : 'text-text-muted-light hover:text-amber-500 opacity-0 group-hover:opacity-100'
                            }`}
                            title={note.pinned ? t('dashboard:admin.unpinNote') : t('dashboard:admin.pinNote')}
                          >
                            <Pin size={12} className={note.pinned ? 'fill-amber-500' : ''} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingNoteId(note.id); setQuickNote(note.content); }}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-text-muted-light hover:text-primary transition-all rounded"
                            title={t('dashboard:admin.editNote')}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmNoteId(note.id); }}
                            disabled={deletingNoteId === note.id}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-text-muted-light hover:text-red-500 transition-all rounded"
                            title={t('dashboard:admin.deleteNote')}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {notesData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-4 text-text-muted-light dark:text-text-muted-dark">
                <StickyNote size={24} className="mb-1.5 opacity-20" />
                <p className="text-xs">{t('dashboard:employee.noNotes')}</p>
              </div>
            )}
          </div>
        </div>
  );
};
