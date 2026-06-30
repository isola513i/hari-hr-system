import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Avatar } from '../Avatar';
import { KeyContactsProps } from './OnboardingTypes';

const emptyForm = { name: '', role: '', relation: '', email: '' };

export const KeyContacts: React.FC<KeyContactsProps> = ({
    contacts,
    showToast,
    isAdmin,
    onAddContact,
    onEditContact,
    onDeleteContact,
}) => {
    const { t } = useTranslation(['onboarding', 'common']);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);

    const handleAdd = () => {
        if (!form.name || !form.email) return;
        onAddContact?.(form);
        setForm(emptyForm);
        setIsAdding(false);
    };

    const handleEdit = (id: string) => {
        if (!form.name || !form.email) return;
        onEditContact?.(id, form);
        setEditingId(null);
        setForm(emptyForm);
    };

    const startEdit = (contact: typeof contacts[0]) => {
        setEditingId(contact.id);
        setForm({ name: contact.name, role: contact.role, relation: contact.relation, email: contact.email });
        setIsAdding(false);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setIsAdding(false);
        setForm(emptyForm);
    };

    const inputClass = "w-full px-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-light dark:text-text-dark placeholder:text-text-muted-light/60";

    const renderForm = (onSave: () => void) => (
        <div className="p-4 bg-background-light dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={t('keyContacts.name')}
                    className={inputClass}
                />
                <input
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder={t('keyContacts.email')}
                    type="email"
                    className={inputClass}
                />
                <input
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    placeholder={t('keyContacts.role')}
                    className={inputClass}
                />
                <input
                    value={form.relation}
                    onChange={e => setForm(f => ({ ...f, relation: e.target.value }))}
                    placeholder={t('keyContacts.relation')}
                    className={inputClass}
                />
            </div>
            <div className="flex justify-end gap-2">
                <button onClick={cancelEdit} className="px-3 py-1.5 text-sm text-text-muted-light hover:text-text-light dark:hover:text-text-dark transition-colors">
                    {t('common:buttons.cancel')}
                </button>
                <button onClick={onSave} disabled={!form.name || !form.email} className="px-4 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-40">
                    <Check size={14} className="inline -mt-0.5 mr-1" />{editingId ? t('common:buttons.save') : t('keyContacts.add')}
                </button>
            </div>
        </div>
    );

    return (
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
            <div className="p-5 border-b border-border-light dark:border-border-dark flex justify-between items-center">
                <h2 className="text-lg font-bold text-text-light dark:text-text-dark">{t('keyContacts.title')}</h2>
                {isAdmin && onAddContact && (
                    <button
                        onClick={() => { setIsAdding(true); setEditingId(null); setForm(emptyForm); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
                    >
                        <Plus size={14} /> {t('keyContacts.add')}
                    </button>
                )}
            </div>
            <div className="p-4 space-y-3">
                {isAdding && renderForm(handleAdd)}
                {contacts.length === 0 && !isAdding && (
                    <div className="text-center py-6 text-text-muted-light dark:text-text-muted-dark text-sm">
                        {t('keyContacts.empty')}
                        {isAdmin && <p className="text-xs mt-1">{t('keyContacts.addFirst')}</p>}
                    </div>
                )}
                {contacts.map(contact => (
                    editingId === contact.id ? (
                        <div key={contact.id}>{renderForm(() => handleEdit(contact.id))}</div>
                    ) : (
                        <div key={contact.id} className="group flex items-center gap-3 p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors">
                            <Avatar src={contact.avatar} name={contact.name} size="lg" className="ring-1 ring-border-light dark:ring-border-dark" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-light dark:text-text-dark">{contact.name}</p>
                                <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{contact.role} {contact.relation ? `\u00B7 ${contact.relation}` : ''}</p>
                            </div>
                            <div className="flex items-center gap-0.5">
                                {isAdmin && (
                                    <>
                                        <button
                                            onClick={() => startEdit(contact)}
                                            className="p-1.5 opacity-0 group-hover:opacity-100 text-text-muted-light hover:text-primary transition-all"
                                            title={t('common:buttons.edit')}
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => onDeleteContact?.(contact.id)}
                                            className="p-1.5 opacity-0 group-hover:opacity-100 text-text-muted-light hover:text-red-500 transition-all"
                                            title={t('common:buttons.delete')}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => {
                                        window.open(`mailto:${contact.email}`);
                                        showToast(t('keyContacts.emailOpened'), 'info');
                                    }}
                                    className="p-2 text-text-muted-light hover:text-primary transition-colors"
                                    title={contact.email}
                                >
                                    <Mail size={16} />
                                </button>
                            </div>
                        </div>
                    )
                ))}
            </div>
        </div>
    );
};
