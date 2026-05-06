import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Check,
    User,
    Mail,
    Hash,
    Lock,
    HeartPulse,
    Phone,
    AlignLeft,
    Star,
    Trash2,
    TrendingUp,
    ArrowRightLeft,
    AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '../../components/DatePicker';
import { Dropdown } from '../../components/Dropdown';
import { ThaiAddressForm } from '../../components/ThaiAddressForm';
import { EmployeeModalsProps } from './EmployeeDetailTypes';
import { DEPARTMENTS, JOB_TITLES } from '../../types';
import { PHONE_COUNTRY_CODES, parsePhoneNumber } from '../../lib/phoneUtils';

const OFFICE_LOCATIONS = ['Office', 'Remote'];

export const EmployeeModals: React.FC<EmployeeModalsProps> = ({
    // Edit Profile Modal
    isEditProfileOpen,
    editForm,
    permissions,
    onCloseEditProfile,
    onProfileChange,
    onProfileSave,

    // Add History Modal
    isAddHistoryModalOpen,
    newHistoryForm,
    onSetNewHistoryForm,
    onCloseAddHistory,
    onSaveNewHistory,

    // Review Modal
    isReviewModalOpen,
    reviewForm,
    isAdmin,
    onSetReviewForm,
    onCloseReviewModal,
    onSaveReview,

    // Delete Confirmation Modal
    deleteConfirmId,
    onCancelDelete,
    onConfirmDelete,

    // Promote Modal
    isPromoteOpen,
    promoteForm,
    onPromoteFormChange,
    onClosePromote,
    onConfirmPromote,

    // Transfer Modal
    isTransferOpen,
    transferDepartment,
    onTransferDepartmentChange,
    onCloseTransfer,
    onConfirmTransfer,

    // Terminate Modal
    isTerminateOpen,
    onCloseTerminate,
    onConfirmTerminate,
}) => {
    const { t } = useTranslation(['employees', 'common']);
    const { canEditSensitiveInfo, isOwnProfile } = permissions;

    // Phone: split into country code + number for the UI, combine before saving
    const [phoneCode, setPhoneCode] = useState('+66');
    const [phoneNumber, setPhoneNumber] = useState('');

    useEffect(() => {
        if (isEditProfileOpen) {
            const parsed = parsePhoneNumber(editForm.phone || '');
            setPhoneCode(parsed.code);
            setPhoneNumber(parsed.number);
        }
    }, [isEditProfileOpen]);

    const handlePhoneChange = (code: string, number: string) => {
        setPhoneCode(code);
        setPhoneNumber(number);
        onProfileChange('phone', number ? `${code}${number}` : '');
    };

    const handleFormKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        // Ctrl/Cmd+Enter → save from anywhere
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onProfileSave();
            return;
        }

        // Enter → focus next field (Shift+Enter for newline in textarea)
        if (e.key === 'Enter' && !e.shiftKey) {
            const target = e.target as HTMLElement;

            e.preventDefault();
            const focusable = Array.from(
                e.currentTarget.querySelectorAll<HTMLElement>(
                    'input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'
                )
            );
            const idx = focusable.indexOf(target);
            const next = idx >= 0 ? focusable[idx + 1] : undefined;
            if (next) next.focus();
        }
    };

    return (
        <>
            {/* Edit Profile Modal */}
            {isEditProfileOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                                {t('employees:modals.editTitle')}
                            </h3>
                            <button
                                onClick={onCloseEditProfile}
                                className="text-text-muted-light hover:text-text-light"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div
                            className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto"
                            onKeyDown={handleFormKeyDown}
                        >
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.fullName')}</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                    <input
                                        type="text"
                                        value={editForm.name || ''}
                                        onChange={(e) => onProfileChange('name', e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                                    {t('employees:modals.roleTitle')}
                                    {!canEditSensitiveInfo && <Lock size={12} className="inline ml-2 text-text-muted-light" />}
                                </label>
                                <Dropdown
                                    value={editForm.role || ''}
                                    onChange={(val) => onProfileChange('role', val)}
                                    placeholder={t('common:placeholders.selectRole')}
                                    disabled={!canEditSensitiveInfo}
                                    options={[
                                        ...(editForm.role && !JOB_TITLES.includes(editForm.role as any)
                                            ? [{ value: editForm.role, label: editForm.role }]
                                            : []),
                                        ...JOB_TITLES.map((t) => ({ value: t, label: t })),
                                    ]}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                                    {t('employees:modals.department')}
                                    {!canEditSensitiveInfo && <Lock size={12} className="inline ml-2 text-text-muted-light" />}
                                </label>
                                <Dropdown
                                    value={editForm.department || ''}
                                    onChange={(val) => onProfileChange('department', val)}
                                    placeholder={t('common:placeholders.selectDepartment')}
                                    disabled={!canEditSensitiveInfo}
                                    options={[
                                        ...(editForm.department && !DEPARTMENTS.includes(editForm.department as any)
                                            ? [{ value: editForm.department, label: editForm.department }]
                                            : []),
                                        ...DEPARTMENTS.map((d) => ({ value: d, label: d })),
                                    ]}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.email')}</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                    <input
                                        type="email"
                                        value={editForm.email || ''}
                                        onChange={(e) => onProfileChange('email', e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.slackHandle')}</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                    <input
                                        type="text"
                                        value={editForm.slack || ''}
                                        onChange={(e) => onProfileChange('slack', e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                        placeholder={t('common:placeholders.slackHandle')}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                                    {t('employees:modals.location')}
                                    {!canEditSensitiveInfo && <Lock size={12} className="inline ml-2 text-text-muted-light" />}
                                </label>
                                <Dropdown
                                    value={editForm.location || ''}
                                    onChange={(val) => onProfileChange('location', val)}
                                    placeholder={t('common:placeholders.selectLocation')}
                                    disabled={!canEditSensitiveInfo}
                                    options={[
                                        ...(editForm.location && !OFFICE_LOCATIONS.includes(editForm.location)
                                            ? [{ value: editForm.location, label: editForm.location }]
                                            : []),
                                        ...OFFICE_LOCATIONS.map((loc) => ({ value: loc, label: loc })),
                                    ]}
                                />
                            </div>

                            {canEditSensitiveInfo && (
                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                                        Work Type
                                    </label>
                                    <Dropdown
                                        value={(editForm as Record<string, unknown>).workType as string || 'office'}
                                        onChange={(val) => onProfileChange('workType', val)}
                                        placeholder="Select work type"
                                        options={[
                                            { value: 'office', label: 'Office' },
                                            { value: 'remote', label: 'Remote' },
                                            { value: 'hybrid', label: 'Hybrid' },
                                        ]}
                                    />
                                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
                                        Remote/Hybrid employees bypass GPS geofence
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                                    {t('employees:modals.joinDate')}
                                    {!canEditSensitiveInfo && <Lock size={12} className="inline ml-2 text-text-muted-light" />}
                                </label>
                                <DatePicker
                                    value={editForm.joinDate || ''}
                                    onChange={(date) => onProfileChange('joinDate', date)}
                                    placeholder={t('common:placeholders.selectJoinDate')}
                                    disabled={!canEditSensitiveInfo}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                                    {t('employees:modals.status')}
                                    {!canEditSensitiveInfo && <Lock size={12} className="inline ml-2 text-text-muted-light" />}
                                </label>
                                <Dropdown
                                    value={editForm.status || 'Active'}
                                    onChange={(val) => onProfileChange('status', val)}
                                    disabled={!canEditSensitiveInfo}
                                    options={[
                                        { value: 'Active', label: t('employees:status.active') },
                                        { value: 'On Leave', label: t('employees:status.onLeave') },
                                        { value: 'Terminated', label: t('employees:status.terminated') },
                                    ]}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.emergencyContact')}</label>
                                <div className="relative">
                                    <HeartPulse className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                    <input
                                        type="text"
                                        value={editForm.emergencyContact || ''}
                                        onChange={(e) => onProfileChange('emergencyContact', e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                        placeholder={t('common:placeholders.emergencyContact')}
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.phoneNumber')}</label>
                                <div className="flex gap-2">
                                    <Dropdown
                                        value={phoneCode}
                                        onChange={(code) => handlePhoneChange(code, phoneNumber)}
                                        options={PHONE_COUNTRY_CODES}
                                        width="w-28"
                                    />
                                    <div className="relative flex-1">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                if (val.length <= 10) handlePhoneChange(phoneCode, val);
                                            }}
                                            maxLength={10}
                                            className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                            placeholder="812345678"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.bio')}</label>
                                <div className="relative">
                                    <AlignLeft className="absolute left-3 top-3 text-text-muted-light" size={16} />
                                    <textarea
                                        rows={3}
                                        value={editForm.bio || ''}
                                        onChange={(e) => onProfileChange('bio', e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark resize-none"
                                        placeholder={t('common:placeholders.bio')}
                                    />
                                </div>
                            </div>

                            {/* Current Address — Thai autocomplete */}
                            <ThaiAddressForm
                                value={editForm.address}
                                onChange={(addr) => onProfileChange('address', addr)}
                            />
                        </div>

                        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex gap-3">
                                <button
                                    onClick={onCloseEditProfile}
                                    className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
                                >
                                    {t('employees:modals.cancel')}
                                </button>
                                <button
                                    onClick={onProfileSave}
                                    className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2"
                                >
                                    <Check size={16} /> {t('employees:modals.save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Add History Modal */}
            {isAddHistoryModalOpen && (isAdmin || isOwnProfile) && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                                {t('employees:modals.addHistory')}
                            </h3>
                            <button
                                onClick={onCloseAddHistory}
                                className="text-text-muted-light hover:text-text-light"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.historyRole')}</label>
                                <input
                                    type="text"
                                    value={newHistoryForm.role || ''}
                                    onChange={(e) => onSetNewHistoryForm({ ...newHistoryForm, role: e.target.value })}
                                    placeholder={t('common:placeholders.egSeniorDev')}
                                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.historyDepartment')}</label>
                                <input
                                    type="text"
                                    value={newHistoryForm.department || ''}
                                    onChange={(e) => onSetNewHistoryForm({ ...newHistoryForm, department: e.target.value })}
                                    placeholder={t('common:placeholders.egEngineering')}
                                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <DatePicker
                                        label={t('employees:modals.historyStartDate')}
                                        value={newHistoryForm.startDate || ''}
                                        onChange={(date) => onSetNewHistoryForm({ ...newHistoryForm, startDate: date })}
                                        placeholder={t('common:placeholders.selectStartDate')}
                                    />
                                </div>
                                <div>
                                    <DatePicker
                                        label={t('employees:modals.historyEndDate')}
                                        value={newHistoryForm.endDate && newHistoryForm.endDate !== 'Present' ? newHistoryForm.endDate : ''}
                                        onChange={(date) => onSetNewHistoryForm({ ...newHistoryForm, endDate: date })}
                                        placeholder={t('common:placeholders.selectEndDate')}
                                        disabled={newHistoryForm.endDate === 'Present'}
                                    />
                                    <label className="flex items-center mt-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newHistoryForm.endDate === 'Present'}
                                            onChange={(e) => onSetNewHistoryForm({ ...newHistoryForm, endDate: e.target.checked ? 'Present' : '' })}
                                            className="w-4 h-4 text-primary bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark rounded focus:ring-2 focus:ring-primary"
                                        />
                                        <span className="ml-2 text-sm text-text-muted-light dark:text-text-muted-dark">{t('employees:modals.historyCurrentPosition')}</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.historyDescription')}</label>
                                <textarea
                                    value={newHistoryForm.description || ''}
                                    onChange={(e) => onSetNewHistoryForm({ ...newHistoryForm, description: e.target.value })}
                                    rows={3}
                                    placeholder={t('common:placeholders.responsibilities')}
                                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark resize-none"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
                            <button
                                onClick={onCloseAddHistory}
                                className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
                            >
                                {t('employees:modals.cancel')}
                            </button>
                            <button
                                onClick={onSaveNewHistory}
                                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2"
                            >
                                <Check size={16} /> {t('employees:modals.historySave')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Performance Review Modal */}
            {isReviewModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                                {reviewForm.id ? t('employees:modals.editReview') : t('employees:modals.newReview')}
                            </h3>
                            <button
                                onClick={onCloseReviewModal}
                                className="text-text-muted-light hover:text-text-light"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.reviewReviewer')}</label>
                                <input
                                    type="text"
                                    value={reviewForm.reviewer || ''}
                                    onChange={(e) => isAdmin ? onSetReviewForm({ ...reviewForm, reviewer: e.target.value }) : undefined}
                                    readOnly={!isAdmin}
                                    placeholder={t('common:placeholders.reviewerName')}
                                    className={`w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark ${!isAdmin ? 'opacity-70 cursor-default' : ''}`}
                                />
                            </div>

                            <div>
                                <DatePicker
                                    label={t('employees:modals.reviewDate')}
                                    value={reviewForm.date || ''}
                                    onChange={(date) => onSetReviewForm({ ...reviewForm, date: date })}
                                    placeholder={t('common:placeholders.selectReviewDate')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.reviewRating')}</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => onSetReviewForm({ ...reviewForm, rating: star })}
                                            className="focus:outline-none"
                                        >
                                            <Star
                                                size={24}
                                                className={`${star <= (reviewForm.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.reviewNotes')}</label>
                                <textarea
                                    value={reviewForm.notes || ''}
                                    onChange={(e) => onSetReviewForm({ ...reviewForm, notes: e.target.value })}
                                    rows={4}
                                    placeholder={t('common:placeholders.detailedFeedback')}
                                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark resize-none"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
                            <button
                                onClick={onCloseReviewModal}
                                className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
                            >
                                {t('employees:modals.cancel')}
                            </button>
                            <button
                                onClick={onSaveReview}
                                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2"
                            >
                                <Check size={16} /> {t('employees:modals.reviewSave')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Promote Modal */}
            {isPromoteOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-lg text-text-light dark:text-text-dark flex items-center gap-2">
                                <TrendingUp size={20} className="text-primary" /> {t('employees:modals.promoteTitle')}
                            </h3>
                            <button onClick={onClosePromote} className="text-text-muted-light hover:text-text-light">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.promoteNewRole')}</label>
                                <Dropdown
                                    value={promoteForm.role}
                                    onChange={(val) => onPromoteFormChange('role', val)}
                                    placeholder={t('common:placeholders.selectNewRole')}
                                    options={[
                                        ...(promoteForm.role && !JOB_TITLES.includes(promoteForm.role as any)
                                            ? [{ value: promoteForm.role, label: promoteForm.role }]
                                            : []),
                                        ...JOB_TITLES.map((t) => ({ value: t, label: t })),
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.promoteNewSalary')}</label>
                                <input
                                    type="number"
                                    value={promoteForm.salary}
                                    onChange={(e) => onPromoteFormChange('salary', e.target.value)}
                                    placeholder={t('common:placeholders.egSalary')}
                                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
                            <button onClick={onClosePromote} className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark">
                                {t('employees:modals.cancel')}
                            </button>
                            <button
                                onClick={onConfirmPromote}
                                disabled={!promoteForm.role}
                                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Check size={16} /> {t('employees:modals.promoteConfirm')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Transfer Modal */}
            {isTransferOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-lg text-text-light dark:text-text-dark flex items-center gap-2">
                                <ArrowRightLeft size={20} className="text-primary" /> {t('employees:modals.transferTitle')}
                            </h3>
                            <button onClick={onCloseTransfer} className="text-text-muted-light hover:text-text-light">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.transferNewDepartment')}</label>
                                <Dropdown
                                    value={transferDepartment}
                                    onChange={onTransferDepartmentChange}
                                    placeholder={t('common:placeholders.selectNewDepartment')}
                                    options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
                            <button onClick={onCloseTransfer} className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark">
                                {t('employees:modals.cancel')}
                            </button>
                            <button
                                onClick={onConfirmTransfer}
                                disabled={!transferDepartment}
                                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Check size={16} /> {t('employees:modals.transferConfirm')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Terminate Confirmation Modal */}
            {isTerminateOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
                            </div>
                            <h3 className="font-bold text-lg text-text-light dark:text-text-dark mb-2">
                                {t('employees:modals.terminateTitle')}
                            </h3>
                            <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                                {t('employees:modals.terminateDescription')}
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-center gap-3 bg-gray-50 dark:bg-gray-800/50">
                            <button onClick={onCloseTerminate} className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark">
                                {t('employees:modals.cancel')}
                            </button>
                            <button
                                onClick={onConfirmTerminate}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
                            >
                                <AlertTriangle size={16} /> {t('employees:modals.terminateConfirm')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <Trash2 className="text-red-600 dark:text-red-400" size={24} />
                            </div>
                            <h3 className="font-bold text-lg text-text-light dark:text-text-dark mb-2">
                                {t('employees:modals.deleteReviewTitle')}
                            </h3>
                            <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                                {t('employees:modals.deleteReviewConfirm')}
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-center gap-3 bg-gray-50 dark:bg-gray-800/50">
                            <button
                                onClick={onCancelDelete}
                                className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
                            >
                                {t('employees:modals.cancel')}
                            </button>
                            <button
                                onClick={onConfirmDelete}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
                            >
                                <Trash2 size={16} /> {t('employees:modals.delete')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
