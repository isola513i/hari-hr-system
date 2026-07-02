import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
    User,
    Mail,
    Briefcase,
    Users,
    AlertCircle,
} from 'lucide-react';
import { Employee } from '../../types';
import { Modal } from '../Modal';
import { DatePicker } from '../DatePicker';
import { InviteModalProps } from './OnboardingTypes';

export const InviteModal: React.FC<InviteModalProps> = ({
    isOpen,
    onClose,
    inviteForm,
    inviteErrors,
    allEmployees,
    onSetInviteForm,
    onSetInviteErrors,
    onSelectEmployee,
    onSubmit,
}) => {
    const { t } = useTranslation(['onboarding', 'common']);
    // Internalized autocomplete state
    const [emailSuggestions, setEmailSuggestions] = useState<Employee[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
    const emailInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
                emailInputRef.current && !emailInputRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update dropdown position on scroll or resize
    useEffect(() => {
        const updatePosition = () => {
            if (emailInputRef.current && showSuggestions) {
                const rect = emailInputRef.current.getBoundingClientRect();
                setDropdownPosition({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX,
                    width: rect.width
                });
            }
        };

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [showSuggestions]);

    // Handle email input change with autocomplete
    const handleEmailChange = (value: string) => {
        onSetInviteForm({ ...inviteForm, email: value });

        // Update dropdown position
        if (emailInputRef.current) {
            const rect = emailInputRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }

        if (value.trim().length > 0) {
            const filtered = allEmployees.filter(emp =>
                emp.email.toLowerCase().includes(value.toLowerCase()) ||
                emp.name.toLowerCase().includes(value.toLowerCase())
            ).slice(0, 5); // Show max 5 suggestions

            setEmailSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setEmailSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSelectEmployeeInternal = (employee: Employee) => {
        onSelectEmployee(employee);
        setShowSuggestions(false);
        setEmailSuggestions([]);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('inviteModal.title')}
            maxWidth="lg"
        >
            <form onSubmit={onSubmit} noValidate className="p-6 space-y-4">
                {/* Full Name */}
                <div>
                    <label htmlFor="invite-name" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                        {t('inviteModal.fullName')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                        <input
                            id="invite-name"
                            type="text"
                            value={inviteForm.name}
                            onChange={(e) => {
                                onSetInviteForm({ ...inviteForm, name: e.target.value });
                                if (inviteErrors.name) onSetInviteErrors((() => { const { name, ...rest } = inviteErrors; return rest; })());
                            }}
                            placeholder={t('inviteModal.namePlaceholder')}
                            className={`w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border rounded-lg focus:outline-none focus:ring-2 text-text-light dark:text-text-dark ${
                                inviteErrors.name
                                    ? 'border-red-400 dark:border-red-500 focus:ring-red-300'
                                    : 'border-border-light dark:border-border-dark focus:ring-primary'
                            }`}
                        />
                    </div>
                    {inviteErrors.name && (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} /> {inviteErrors.name}
                        </p>
                    )}
                </div>

                {/* Email Address */}
                <div>
                    <label htmlFor="invite-email" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                        {t('inviteModal.email')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light z-10" size={16} />
                        <input
                            id="invite-email"
                            ref={emailInputRef}
                            type="email"
                            value={inviteForm.email}
                            onChange={(e) => {
                                handleEmailChange(e.target.value);
                                if (inviteErrors.email) onSetInviteErrors((() => { const { email, ...rest } = inviteErrors; return rest; })());
                            }}
                            onFocus={() => {
                                if (emailInputRef.current) {
                                    const rect = emailInputRef.current.getBoundingClientRect();
                                    setDropdownPosition({
                                        top: rect.bottom + window.scrollY + 4,
                                        left: rect.left + window.scrollX,
                                        width: rect.width
                                    });
                                }
                                if (inviteForm.email.trim().length > 0 && emailSuggestions.length > 0) {
                                    setShowSuggestions(true);
                                }
                            }}
                            placeholder={t('inviteModal.emailPlaceholder')}
                            autoComplete="off"
                            className={`w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border rounded-lg focus:outline-none focus:ring-2 text-text-light dark:text-text-dark ${
                                inviteErrors.email
                                    ? 'border-red-400 dark:border-red-500 focus:ring-red-300'
                                    : 'border-border-light dark:border-border-dark focus:ring-primary'
                            }`}
                        />

                        {/* Autocomplete Dropdown using Portal */}
                        {showSuggestions && emailSuggestions.length > 0 && dropdownPosition && createPortal(
                            <div
                                ref={suggestionsRef}
                                style={{
                                    position: 'absolute',
                                    top: dropdownPosition.top,
                                    left: dropdownPosition.left,
                                    width: dropdownPosition.width,
                                    zIndex: 99999
                                }}
                                className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg shadow-2xl max-h-60 overflow-y-auto"
                            >
                                {emailSuggestions.map((emp) => (
                                    <button
                                        key={emp.id}
                                        type="button"
                                        onClick={() => handleSelectEmployeeInternal(emp)}
                                        className="w-full px-4 py-3 text-left hover:bg-background-light dark:hover:bg-background-dark transition-colors flex items-center gap-3 border-b border-border-light dark:border-border-dark last:border-0"
                                    >
                                        <img
                                            src={emp.avatar}
                                            alt={emp.name}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">
                                                {emp.name}
                                            </p>
                                            <p className="text-xs text-text-muted-light dark:text-text-muted-dark truncate">
                                                {emp.email}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-text-muted-light dark:text-text-muted-dark">
                                                    {emp.role}
                                                </span>
                                                <span className="text-xs text-text-muted-light dark:text-text-muted-dark">•</span>
                                                <span className="text-xs text-text-muted-light dark:text-text-muted-dark">
                                                    {emp.department}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>,
                            document.body
                        )}
                    </div>
                    {inviteErrors.email ? (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} /> {inviteErrors.email}
                        </p>
                    ) : (
                        <p className="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">
                            {t('inviteModal.searchExisting')}
                        </p>
                    )}
                </div>

                {/* Role & Department */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="invite-role" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                            {t('inviteModal.role')} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                            <input
                                id="invite-role"
                                type="text"
                                value={inviteForm.role}
                                onChange={(e) => {
                                    onSetInviteForm({ ...inviteForm, role: e.target.value });
                                    if (inviteErrors.role) onSetInviteErrors((() => { const { role, ...rest } = inviteErrors; return rest; })());
                                }}
                                placeholder={t('inviteModal.rolePlaceholder')}
                                className={`w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border rounded-lg focus:outline-none focus:ring-2 text-text-light dark:text-text-dark ${
                                    inviteErrors.role
                                        ? 'border-red-400 dark:border-red-500 focus:ring-red-300'
                                        : 'border-border-light dark:border-border-dark focus:ring-primary'
                                }`}
                            />
                        </div>
                        {inviteErrors.role && (
                            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle size={12} /> {inviteErrors.role}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="invite-department" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                            {t('inviteModal.department')} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                            <input
                                id="invite-department"
                                type="text"
                                value={inviteForm.department}
                                onChange={(e) => {
                                    onSetInviteForm({ ...inviteForm, department: e.target.value });
                                    if (inviteErrors.department) onSetInviteErrors((() => { const { department, ...rest } = inviteErrors; return rest; })());
                                }}
                                placeholder={t('inviteModal.departmentPlaceholder')}
                                className={`w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border rounded-lg focus:outline-none focus:ring-2 text-text-light dark:text-text-dark ${
                                    inviteErrors.department
                                        ? 'border-red-400 dark:border-red-500 focus:ring-red-300'
                                        : 'border-border-light dark:border-border-dark focus:ring-primary'
                                }`}
                            />
                        </div>
                        {inviteErrors.department && (
                            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle size={12} /> {inviteErrors.department}
                            </p>
                        )}
                    </div>
                </div>

                {/* Start Date */}
                <div>
                    <DatePicker
                        label={t('inviteModal.startDate')}
                        value={inviteForm.startDate}
                        onChange={(date) => {
                            onSetInviteForm({ ...inviteForm, startDate: date });
                            if (inviteErrors.startDate) onSetInviteErrors((() => { const { startDate, ...rest } = inviteErrors; return rest; })());
                        }}
                        placeholder={t('inviteModal.selectStartDate')}
                    />
                    {inviteErrors.startDate && (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} /> {inviteErrors.startDate}
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
                    >
                        {t('inviteModal.cancel')}
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2"
                    >
                        <Mail size={16} /> {t('inviteModal.sendInvitation')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
