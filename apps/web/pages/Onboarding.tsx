import React, { useState } from 'react';
import {
    CheckCircle2,
    Clock,
    FileText,
    Calendar,
    ListChecks,
    GitBranch,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { OnboardingTask, Employee, OnboardingDocument } from '@hari/shared-types';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import { Toast } from '../components/ui';
import { api, BASE_URL } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useOnboardingTasks, useOnboardingContacts, useOnboardingDocuments, useAllEmployees } from '../hooks/queries';
import { FlowGraph, TaskList, KeyContacts, DocumentChecklist, InviteModal } from '../components/onboarding';

export const Onboarding: React.FC = () => {
    const { user } = useAuth();
    const { addNode } = useOrg();
    const qc = useQueryClient();

    // Toast state
    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
        show: false, message: '', type: 'success'
    });
    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setToast({ show: true, message, type });
    };

    // Tab state
    const [activeTab, setActiveTab] = useState<'checklist' | 'flow'>('checklist');

    // React Query hooks for data fetching
    const { data: tasks = [] } = useOnboardingTasks();
    const { data: keyContacts = [] } = useOnboardingContacts();

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
            showToast('Failed to update task', 'error');
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
            showToast('Failed to update priority', 'error');
        }
    };

    const calculateProgress = () => {
        const relevantTasks = user?.role === 'EMPLOYEE'
            ? tasks.filter(t => t.assignee === 'Employee')
            : tasks;
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
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
    const filteredTasks = tasks.filter(task => {
        if (user?.role === 'EMPLOYEE' && task.assignee !== 'Employee') {
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
            errors.name = 'Full name is required';
        } else if (inviteForm.name.trim().length < 2) {
            errors.name = 'Name must be at least 2 characters';
        }

        if (!inviteForm.email.trim()) {
            errors.email = 'Email address is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email)) {
            errors.email = 'Please enter a valid email address';
        }

        if (!inviteForm.role.trim()) {
            errors.role = 'Role is required';
        }

        if (!inviteForm.department.trim()) {
            errors.department = 'Department is required';
        }

        if (!inviteForm.startDate) {
            errors.startDate = 'Start date is required';
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
                } catch (seedError: any) {
                    // 409 = tasks already exist, which is fine
                    if (!seedError.message?.includes('already exist')) {
                        console.log('Could not seed tasks:', seedError);
                    }
                }

                // Invalidate onboarding queries to show newly seeded data
                qc.invalidateQueries({ queryKey: queryKeys.onboarding.all });

                showToast(`Onboarding invitation sent to ${inviteForm.name}!`, 'success');
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

                showToast(`New employee ${inviteForm.name} added and invited to onboarding!`, 'success');
            }

            setIsInviteModalOpen(false);
            setInviteForm({ name: '', email: '', role: '', department: '', startDate: '' });
            setInviteErrors({});
        } catch (error) {
            console.error('Error in handleInviteSubmit:', error);
            showToast('Failed to process invitation. Please try again.', 'error');
        }
    };

    const handleSaveTemplate = () => {
        showToast('Template saved successfully!', 'success');
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

            const token = localStorage.getItem('token');
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
            showToast('Document uploaded!', 'success');
        } catch (error: any) {
            showToast(error.message || 'Upload failed', 'error');
        } finally {
            setUploadingDocId(null);
        }
    };

    const handleDocDownload = async (docId: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BASE_URL}/onboarding/documents/${docId}/download`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                showToast('Download failed', 'error');
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
            showToast('Download started!', 'success');
        } catch {
            showToast('Download failed', 'error');
        }
    };

    const handleDocReview = async (docId: string, status: 'Approved' | 'Rejected', note?: string) => {
        try {
            const updatedDoc = await api.patch<OnboardingDocument>(`/onboarding/documents/${docId}/review`, { status, note });
            qc.setQueryData<OnboardingDocument[]>(queryKeys.onboarding.documents(), old =>
                (old || []).map(d => d.id === docId ? updatedDoc : d)
            );
            showToast(`Document ${status.toLowerCase()}!`, status === 'Approved' ? 'success' : 'warning');
            setReviewNoteDocId(null);
            setReviewNote('');
        } catch {
            showToast('Failed to review document', 'error');
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
                        {user?.role === 'EMPLOYEE' ? 'My Onboarding Checklist' : 'Onboarding Center'}
                    </h1>
                    <p className="text-text-muted-light dark:text-text-muted-dark">
                        {user?.role === 'EMPLOYEE'
                            ? `Welcome aboard, ${user?.name?.split(' ')[0] || 'User'}! Complete these tasks to get started.`
                            : <><span className="font-semibold text-text-light dark:text-text-dark">Leo Martinez</span> (Product Designer) - Onboarding Dashboard</>
                        }
                    </p>
                </div>
                {user?.role === 'HR_ADMIN' && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSaveTemplate}
                            className="px-4 py-2 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            Save as Template
                        </button>
                        <button
                            onClick={() => setIsInviteModalOpen(true)}
                            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            Invite Employee
                        </button>
                    </div>
                )}
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-1 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-1.5 shadow-sm w-fit">
                <button
                    onClick={() => setActiveTab('checklist')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        activeTab === 'checklist'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark'
                    }`}
                >
                    <ListChecks size={16} />
                    Checklist
                </button>
                <button
                    onClick={() => setActiveTab('flow')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        activeTab === 'flow'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark'
                    }`}
                >
                    <GitBranch size={16} />
                    Onboarding Flow
                </button>
            </div>

            {/* ==================== FLOW TAB ==================== */}
            {activeTab === 'flow' && (
                <FlowGraph tasks={tasks} />
            )}

            {/* ==================== CHECKLIST TAB ==================== */}
            {activeTab === 'checklist' && <>
                <TaskList
                    tasks={tasks}
                    filteredTasks={filteredTasks}
                    groupedTasks={groupedTasks}
                    userRole={user?.role}
                    progress={calculateProgress()}
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
                    <KeyContacts contacts={keyContacts} showToast={showToast} />
                    <DocumentChecklist
                        documents={onboardingDocs}
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
            </>}

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

            {/* Toast Notification */}
            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(prev => ({ ...prev, show: false }))}
                />
            )}
        </div>
    );
};
