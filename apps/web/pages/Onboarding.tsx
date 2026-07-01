import React, { useState, useMemo, useCallback } from 'react';
import {
    CheckCircle2,
    Clock,
    FileText,
    Calendar,
    ArrowLeft,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { OnboardingTask, Employee, OnboardingDocument } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import { useToast } from '../contexts/ToastContext';
import { Dropdown } from '../components/Dropdown';
import { api, BASE_URL, getAuthToken } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { getErrorMessage } from '../lib/errorHandler';
import { useOnboardingTasks, useOnboardingContacts, useOnboardingDocuments, useAllEmployees, useCreateContact, useUpdateContact, useDeleteContact } from '../hooks/queries';
import { TaskList, KeyContacts, DocumentChecklist, InviteModal, OnboardingOverview } from '../components/onboarding';

export const Onboarding: React.FC = () => {
    const { t, i18n } = useTranslation(['onboarding', 'common']);
    const { user, isAdminView } = useAuth();
    const { addNode } = useOrg();
    const qc = useQueryClient();

    const { showToast } = useToast();

    // React Query hooks for data fetching
    const { data: tasks = [] } = useOnboardingTasks();
    const { data: keyContacts = [] } = useOnboardingContacts();
    const createContactMutation = useCreateContact();
    const updateContactMutation = useUpdateContact();
    const deleteContactMutation = useDeleteContact();

    const handleAddContact = async (data: { name: string; role: string; relation: string; email: string }) => {
        try {
            await createContactMutation.mutateAsync(data);
            showToast(t('keyContacts.contactAdded'), 'success');
        } catch { showToast(t('keyContacts.contactAddFailed'), 'error'); }
    };
    const handleEditContact = async (id: string, data: { name: string; role: string; relation: string; email: string }) => {
        try {
            await updateContactMutation.mutateAsync({ id, data });
            showToast(t('keyContacts.contactUpdated'), 'success');
        } catch { showToast(t('keyContacts.contactUpdateFailed'), 'error'); }
    };
    const handleDeleteContact = async (id: string) => {
        try {
            await deleteContactMutation.mutateAsync(id);
            showToast(t('keyContacts.contactDeleted'), 'success');
        } catch { showToast(t('keyContacts.contactDeleteFailed'), 'error'); }
    };

    // Document Checklist state (from React Query)
    const { data: onboardingDocs = [] } = useOnboardingDocuments();
    const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
    const [reviewNoteDocId, setReviewNoteDocId] = useState<string | null>(null);
    const [reviewNote, setReviewNote] = useState('');

    // Filters State
    const [assigneeFilter, setAssigneeFilter] = useState<string>('All');
    const [priorityFilter, setPriorityFilter] = useState<string>('All');
    const [dateFilter, setDateFilter] = useState<string>('All');

    // Invite Modal State
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({
        name: '',
        email: '',
        role: '',
        department: '',
        startDate: ''
    });
    const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});

    // Autocomplete state (employees from React Query)
    const { data: allEmployees = [] } = useAllEmployees();

    // Employee selector state (admin only — synced with URL ?employee=<id>)
    const [searchParams, setSearchParams] = useSearchParams();
    const isAdmin = isAdminView;
    const selectedEmployeeId = searchParams.get('employee');
    const setSelectedEmployeeId = useCallback((id: string | null) => {
        setSearchParams(prev => {
            if (id) {
                prev.set('employee', id);
            } else {
                prev.delete('employee');
            }
            return prev;
        });
    }, [setSearchParams]);

    // Build employee dropdown options from tasks that have an employeeId
    const employeeDropdownOptions = useMemo(() => {
        if (!isAdmin) return [];
        const idsInTasks = new Set(tasks.map(t => t.employeeId).filter(Boolean) as string[]);
        const matched = allEmployees.filter(e => idsInTasks.has(e.id));
        return [
            { value: '__overview__', label: t('allEmployeesOverview') },
            ...matched.map(e => ({ value: e.id, label: e.name })),
        ];
    }, [isAdmin, tasks, allEmployees]);

    const selectedEmployee = allEmployees.find(e => e.id === selectedEmployeeId) ?? null;

    // Filter tasks & docs by selected employee (when one is chosen)
    // When not admin (employee view), show only the current user's tasks
    const visibleTasks = useMemo(() => {
        if (!isAdmin) return tasks.filter(t => t.employeeId === user?.employeeId);
        if (!selectedEmployeeId) return tasks;
        return tasks.filter(t => t.employeeId === selectedEmployeeId);
    }, [isAdmin, selectedEmployeeId, tasks, user?.employeeId]);

    const visibleDocs = useMemo(() => {
        if (!isAdmin) return onboardingDocs.filter(d => d.employeeId === user?.employeeId);
        if (!selectedEmployeeId) return onboardingDocs;
        return onboardingDocs.filter(d => d.employeeId === selectedEmployeeId);
    }, [isAdmin, selectedEmployeeId, onboardingDocs, user?.employeeId]);

    const toggleTask = async (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        const newCompleted = !task.completed;
        // Optimistic update
        qc.setQueryData<OnboardingTask[]>(queryKeys.onboarding.tasks(), old =>
            (old || []).map(t => t.id === id ? { ...t, completed: newCompleted } : t)
        );
        try {
            await api.patch(`/onboarding/tasks/${id}`, { completed: newCompleted });
            // Backend updates employee onboarding_percentage/status — sync the cache
            qc.invalidateQueries({ queryKey: queryKeys.employees.all });
        } catch (error) {
            // Revert on failure
            qc.setQueryData<OnboardingTask[]>(queryKeys.onboarding.tasks(), old =>
                (old || []).map(t => t.id === id ? { ...t, completed: task.completed } : t)
            );
            showToast(t('failedUpdateTask'), 'error');
        }
    };

    const cyclePriority = async (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        const priorities: ('High' | 'Medium' | 'Low')[] = ['High', 'Medium', 'Low'];
        const currentPriority: 'High' | 'Medium' | 'Low' = task.priority || 'Medium';
        const currentIndex = priorities.indexOf(currentPriority);
        const nextPriority = priorities[(currentIndex + 1) % priorities.length];
        // Optimistic update
        qc.setQueryData<OnboardingTask[]>(queryKeys.onboarding.tasks(), old =>
            (old || []).map(t => t.id === id ? { ...t, priority: nextPriority } as OnboardingTask : t)
        );
        try {
            await api.patch(`/onboarding/tasks/${id}`, { priority: nextPriority });
        } catch (error) {
            // Revert on failure
            qc.setQueryData<OnboardingTask[]>(queryKeys.onboarding.tasks(), old =>
                (old || []).map(t => t.id === id ? { ...t, priority: currentPriority } as OnboardingTask : t)
            );
            showToast(t('failedUpdatePriority'), 'error');
        }
    };

    const calculateProgress = () => {
        const relevantTasks = !isAdminView
            ? visibleTasks.filter(t => t.assignee === 'Employee')
            : visibleTasks;
        const completed = relevantTasks.filter(t => t.completed).length;
        return relevantTasks.length > 0 ? Math.round((completed / relevantTasks.length) * 100) : 0;
    };

    const getStageIcon = (stage: string) => {
        switch (stage) {
            case 'Pre-boarding': return <FileText size={18} />;
            case 'Week 1': return <Calendar size={18} />;
            case 'Month 1': return <Clock size={18} />;
            default: return <CheckCircle2 size={18} />;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString(i18n.language === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const isDueSoon = (dateString: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dateString);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 3;
    };

    const isOverdue = (dateString: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dateString);
        return due < today;
    };

    // Filtering Logic
    const filteredTasks = visibleTasks.filter(task => {
        if (!isAdminView && task.assignee !== 'Employee') {
            return false;
        }

        const matchesAssignee = assigneeFilter === 'All' ? true :
            assigneeFilter === 'My Tasks' ? task.assignee === 'HR' :
                task.assignee === assigneeFilter;

        const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;

        let matchesDate = true;
        if (dateFilter === 'Overdue') {
            matchesDate = isOverdue(task.dueDate) && !task.completed;
        } else if (dateFilter === 'Due Soon') {
            matchesDate = isDueSoon(task.dueDate) && !task.completed;
        }

        return matchesAssignee && matchesPriority && matchesDate;
    });

    const groupedTasks = filteredTasks.reduce((acc, task) => {
        if (!acc[task.stage]) acc[task.stage] = [];
        acc[task.stage]!.push(task);
        return acc;
    }, {} as Record<string, OnboardingTask[]>);

    const validateInviteForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!inviteForm.name.trim()) {
            errors.name = t('validation.nameRequired');
        } else if (inviteForm.name.trim().length < 2) {
            errors.name = t('validation.nameRequired');
        }

        if (!inviteForm.email.trim()) {
            errors.email = t('validation.emailRequired');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email)) {
            errors.email = t('validation.emailInvalid');
        }

        if (!inviteForm.role.trim()) {
            errors.role = t('validation.roleRequired');
        }

        if (!inviteForm.department.trim()) {
            errors.department = t('validation.departmentRequired');
        }

        if (!inviteForm.startDate) {
            errors.startDate = t('validation.startDateRequired');
        }

        setInviteErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleInviteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateInviteForm()) return;

        try {
            // Check if employee already exists
            const existingEmployee = allEmployees.find(emp =>
                emp.email.toLowerCase() === inviteForm.email.toLowerCase()
            );

            if (existingEmployee) {
                // Employee exists - seed onboarding tasks for them
                try {
                    await api.post(`/onboarding/tasks/seed/${existingEmployee.id}`, {});
                } catch (seedError) {
                    // 409 = tasks already exist, which is fine
                    if (!getErrorMessage(seedError, '').includes('already exist')) {
                        console.log('Could not seed tasks:', seedError);
                    }
                }

                // Invalidate onboarding queries to show newly seeded data
                qc.invalidateQueries({ queryKey: queryKeys.onboarding.all });

                showToast(t('inviteSent', { name: inviteForm.name }), 'success');
            } else {
                // Employee doesn't exist - create new employee
                await addNode({
                    name: inviteForm.name,
                    email: inviteForm.email,
                    role: inviteForm.role,
                    department: inviteForm.department,
                    startDate: inviteForm.startDate,
                    parentId: '2', // Default parent

                    id: Date.now().toString(),
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(inviteForm.name)}&background=random`,
                });

                // Invalidate employees list for autocomplete refresh
                qc.invalidateQueries({ queryKey: queryKeys.employees.all });

                // Wait briefly for employee creation to propagate, then seed tasks
                const updatedEmployees = await api.get<Employee[]>('/employees');
                const newEmployee = updatedEmployees.find(
                    emp => emp.email.toLowerCase() === inviteForm.email.toLowerCase()
                );
                if (newEmployee) {
                    try {
                        await api.post(`/onboarding/tasks/seed/${newEmployee.id}`, {});
                    } catch (seedError) {
                        console.log('Could not seed tasks for new employee:', seedError);
                    }
                }

                // Invalidate onboarding queries to refetch tasks/docs
                qc.invalidateQueries({ queryKey: queryKeys.onboarding.all });

                showToast(t('employeeAdded', { name: inviteForm.name }), 'success');
            }

            setIsInviteModalOpen(false);
            setInviteForm({ name: '', email: '', role: '', department: '', startDate: '' });
            setInviteErrors({});
        } catch (error) {
            console.error('Error in handleInviteSubmit:', error);
            showToast(t('inviteFailed'), 'error');
        }
    };

    const getPriorityBadgeClass = (priority: string) => {
        switch (priority) {
            case 'High': return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-900';
            case 'Medium': return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900';
            case 'Low': return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-900';
            default: return 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    const handleDocUpload = async (docId: string, file: File) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const token = getAuthToken();
            const response = await fetch(`${BASE_URL}/onboarding/documents/${docId}/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error);
            }
            const updatedDoc = await response.json();
            qc.setQueryData<OnboardingDocument[]>(queryKeys.onboarding.documents(), old =>
                (old || []).map(d => d.id === docId ? updatedDoc : d)
            );
            showToast(t('documentUploaded'), 'success');
        } catch (error) {
            showToast(getErrorMessage(error, t('uploadFailed')), 'error');
        } finally {
            setUploadingDocId(null);
        }
    };

    const handleDocDownload = async (docId: string) => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${BASE_URL}/onboarding/documents/${docId}/download`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                showToast(t('downloadFailed'), 'error');
                return;
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'document';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            showToast(t('downloadStarted'), 'success');
        } catch {
            showToast(t('downloadFailed'), 'error');
        }
    };

    const handleDocReview = async (docId: string, status: 'Approved' | 'Rejected', note?: string) => {
        try {
            const updatedDoc = await api.patch<OnboardingDocument>(`/onboarding/documents/${docId}/review`, { status, note });
            qc.setQueryData<OnboardingDocument[]>(queryKeys.onboarding.documents(), old =>
                (old || []).map(d => d.id === docId ? updatedDoc : d)
            );
            showToast(status === 'Approved' ? t('documentApproved') : t('documentRejected'), status === 'Approved' ? 'success' : 'warning');
            setReviewNoteDocId(null);
            setReviewNote('');
        } catch {
            showToast(t('failedReviewDocument'), 'error');
        }
    };

    const handleSelectEmployee = (employee: Employee) => {
        setInviteForm({
            name: employee.name,
            email: employee.email,
            role: employee.role,
            department: employee.department,
            startDate: employee.joinDate || ''
        });
    };

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Header & Active Onboarding Profile */}
            <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-text-light dark:text-text-dark tracking-tight mb-1">
                        {!isAdminView ? t('titleEmployee') : t('title')}
                    </h1>
                    <p className="text-text-muted-light dark:text-text-muted-dark">
                        {!isAdminView
                            ? t('subtitleEmployee', { name: user?.name?.split(' ')[0] || 'User' })
                            : selectedEmployee
                                ? t('subtitleAdminEmployee', { name: selectedEmployee.name, role: selectedEmployee.role })
                                : t('subtitleAdminOverview')
                        }
                    </p>
                </div>
                {isAdmin && (
                    <div className="flex items-center gap-3">
                        {selectedEmployeeId && (
                            <button
                                onClick={() => setSelectedEmployeeId(null)}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors"
                            >
                                <ArrowLeft size={16} />
                                {t('backToOverview')}
                            </button>
                        )}
                        <Dropdown
                            options={employeeDropdownOptions}
                            value={selectedEmployeeId ?? '__overview__'}
                            onChange={(val) => setSelectedEmployeeId(val === '__overview__' ? null : val)}
                            width="w-56"
                        />
                        <button
                            onClick={() => setIsInviteModalOpen(true)}
                            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            {t('inviteEmployee')}
                        </button>
                    </div>
                )}
            </div>

            {/* ==================== ADMIN OVERVIEW (no employee selected) ==================== */}
            {isAdmin && !selectedEmployeeId ? (
                <OnboardingOverview
                    employees={allEmployees}
                    tasks={tasks}
                    documents={onboardingDocs}
                    onSelectEmployee={(id) => setSelectedEmployeeId(id)}
                />
            ) : (<>
                    <TaskList
                        tasks={visibleTasks}
                        filteredTasks={filteredTasks}
                        groupedTasks={groupedTasks}
                        userRole={user?.role}
                        progress={calculateProgress()}
                        readOnly={isAdmin && !!selectedEmployeeId}
                        assigneeFilter={assigneeFilter}
                        priorityFilter={priorityFilter}
                        dateFilter={dateFilter}
                        onSetAssigneeFilter={setAssigneeFilter}
                        onSetPriorityFilter={setPriorityFilter}
                        onSetDateFilter={setDateFilter}
                        onToggleTask={toggleTask}
                        onCyclePriority={cyclePriority}
                        getStageIcon={getStageIcon}
                        formatDate={formatDate}
                        isDueSoon={isDueSoon}
                        isOverdue={isOverdue}
                        getPriorityBadgeClass={getPriorityBadgeClass}
                    >
                        <KeyContacts
                            contacts={keyContacts}
                            showToast={showToast}
                            isAdmin={user?.role === 'HR_ADMIN'}
                            onAddContact={handleAddContact}
                            onEditContact={handleEditContact}
                            onDeleteContact={handleDeleteContact}
                        />
                        <DocumentChecklist
                            documents={visibleDocs}
                            userRole={user?.role}
                            uploadingDocId={uploadingDocId}
                            reviewNoteDocId={reviewNoteDocId}
                            reviewNote={reviewNote}
                            onSetUploadingDocId={setUploadingDocId}
                            onSetReviewNoteDocId={setReviewNoteDocId}
                            onSetReviewNote={setReviewNote}
                            onDocUpload={handleDocUpload}
                            onDocDownload={handleDocDownload}
                            onDocReview={handleDocReview}
                        />
                    </TaskList>
            </>)}

            {/* Invite Employee Modal */}
            <InviteModal
                isOpen={isInviteModalOpen}
                onClose={() => { setIsInviteModalOpen(false); setInviteErrors({}); setInviteForm({ name: '', email: '', role: '', department: '', startDate: '' }); }}
                inviteForm={inviteForm}
                inviteErrors={inviteErrors}
                allEmployees={allEmployees}
                onSetInviteForm={setInviteForm}
                onSetInviteErrors={setInviteErrors}
                onSelectEmployee={handleSelectEmployee}
                onSubmit={handleInviteSubmit}
            />

        </div>
    );
};
