import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    CheckCircle2,
    Clock,
    FileText,
    Upload,
    Mail,
    Calendar,
    Users,
    AlertCircle,
    Filter,
    User,
    Briefcase,
    ExternalLink,
    ArrowRight,
    ListChecks,
    GitBranch,
    CircleDot,
    Circle,
    Trophy,
    Download,
    Eye,
    XCircle,
    ThumbsUp,
    ThumbsDown,
    MessageSquare,
} from 'lucide-react';
import { OnboardingTask, KeyContact, Employee, OnboardingDocument } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import { Toast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { DatePicker } from '../components/DatePicker';
import { api, BASE_URL } from '../lib/api';
import { Dropdown } from '../components/Dropdown';
import { Avatar } from '../components/Avatar';

// ==========================================
// Onboarding Flow Graph Component (Demo)
// ==========================================
interface FlowStage {
    id: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
    tasks: { title: string; completed: boolean }[];
}

const OnboardingFlowGraph: React.FC<{ tasks: OnboardingTask[] }> = ({ tasks }) => {
    // Group tasks by stage
    const stageMap = tasks.reduce((acc, task) => {
        if (!acc[task.stage]) acc[task.stage] = [];
        acc[task.stage]!.push({ title: task.title, completed: task.completed });
        return acc;
    }, {} as Record<string, { title: string; completed: boolean }[]>);

    const stages: FlowStage[] = [
        {
            id: 'pre-boarding',
            label: 'Pre-boarding',
            icon: <FileText size={22} />,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            borderColor: 'border-blue-200 dark:border-blue-800',
            tasks: stageMap['Pre-boarding'] || [],
        },
        {
            id: 'week-1',
            label: 'Week 1',
            icon: <Calendar size={22} />,
            color: 'text-violet-600 dark:text-violet-400',
            bgColor: 'bg-violet-50 dark:bg-violet-900/20',
            borderColor: 'border-violet-200 dark:border-violet-800',
            tasks: stageMap['Week 1'] || [],
        },
        {
            id: 'month-1',
            label: 'Month 1',
            icon: <Clock size={22} />,
            color: 'text-amber-600 dark:text-amber-400',
            bgColor: 'bg-amber-50 dark:bg-amber-900/20',
            borderColor: 'border-amber-200 dark:border-amber-800',
            tasks: stageMap['Month 1'] || [],
        },
        {
            id: 'completed',
            label: 'Completed',
            icon: <Trophy size={22} />,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
            borderColor: 'border-emerald-200 dark:border-emerald-800',
            tasks: [],
        },
    ];

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const allDone = totalTasks > 0 && completedTasks === totalTasks;

    // Determine which stage is "active" (first stage with incomplete tasks)
    const getStageStatus = (stage: FlowStage): 'done' | 'active' | 'pending' => {
        if (stage.id === 'completed') return allDone ? 'done' : 'pending';
        if (stage.tasks.length === 0) return 'pending';
        const allCompleted = stage.tasks.every(t => t.completed);
        const someCompleted = stage.tasks.some(t => t.completed);
        if (allCompleted) return 'done';
        if (someCompleted) return 'active';
        // Check if previous stages are done
        const stageIndex = stages.findIndex(s => s.id === stage.id);
        const previousStages = stages.slice(0, stageIndex).filter(s => s.id !== 'completed');
        const allPreviousDone = previousStages.every(s => s.tasks.length === 0 || s.tasks.every(t => t.completed));
        return allPreviousDone ? 'active' : 'pending';
    };

    return (
        <div className="space-y-6">
            {/* Flow Overview Card */}
            <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Onboarding Pipeline</h2>
                    <span className="text-sm text-text-muted-light dark:text-text-muted-dark">
                        {completedTasks}/{totalTasks} tasks completed
                    </span>
                </div>
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-6">
                    Visual overview of the onboarding journey from pre-boarding to full integration.
                </p>

                {/* Horizontal Flow Pipeline */}
                <div className="flex items-start gap-0 overflow-x-auto pb-4">
                    {stages.map((stage, index) => {
                        const status = getStageStatus(stage);
                        const stageCompleted = stage.tasks.filter(t => t.completed).length;
                        const stageTotal = stage.tasks.length;
                        const stageProgress = stageTotal > 0 ? Math.round((stageCompleted / stageTotal) * 100) : (status === 'done' ? 100 : 0);

                        return (
                            <React.Fragment key={stage.id}>
                                {/* Stage Card */}
                                <div className={`flex-shrink-0 w-56 rounded-xl border-2 transition-all duration-300 ${
                                    status === 'done'
                                        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10'
                                        : status === 'active'
                                            ? `${stage.borderColor} ${stage.bgColor} ring-2 ring-offset-2 ring-offset-background-light dark:ring-offset-background-dark ring-primary/30`
                                            : 'border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark opacity-60'
                                }`}>
                                    {/* Stage Header */}
                                    <div className="p-4 pb-3">
                                        <div className="flex items-center gap-2.5 mb-2">
                                            {/* Status indicator */}
                                            <div className={`p-2 rounded-lg ${
                                                status === 'done'
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                    : status === 'active'
                                                        ? `${stage.bgColor} ${stage.color}`
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                            }`}>
                                                {status === 'done' ? <CheckCircle2 size={22} /> : stage.icon}
                                            </div>
                                            <div>
                                                <h3 className={`text-sm font-bold ${
                                                    status === 'done'
                                                        ? 'text-emerald-700 dark:text-emerald-400'
                                                        : status === 'active'
                                                            ? 'text-text-light dark:text-text-dark'
                                                            : 'text-text-muted-light dark:text-text-muted-dark'
                                                }`}>
                                                    {stage.label}
                                                </h3>
                                                <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
                                                    {stage.id === 'completed'
                                                        ? (allDone ? 'All done!' : 'Pending')
                                                        : `${stageCompleted}/${stageTotal} tasks`
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        {stage.id !== 'completed' && stageTotal > 0 && (
                                            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                                                        status === 'done' ? 'bg-emerald-500' : 'bg-primary'
                                                    }`}
                                                    style={{ width: `${stageProgress}%` }}
                                                />
                                            </div>
                                        )}
                                        {stage.id === 'completed' && (
                                            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ease-out ${allDone ? 'bg-emerald-500' : ''}`}
                                                    style={{ width: allDone ? '100%' : '0%' }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Task List */}
                                    {stage.tasks.length > 0 && (
                                        <div className="px-4 pb-4 space-y-1.5">
                                            {stage.tasks.map((task, taskIdx) => (
                                                <div key={taskIdx} className="flex items-start gap-2">
                                                    {task.completed
                                                        ? <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                                        : status === 'active'
                                                            ? <CircleDot size={14} className="text-primary mt-0.5 flex-shrink-0" />
                                                            : <Circle size={14} className="text-gray-300 dark:text-gray-600 mt-0.5 flex-shrink-0" />
                                                    }
                                                    <span className={`text-xs leading-tight ${
                                                        task.completed
                                                            ? 'line-through text-text-muted-light dark:text-text-muted-dark'
                                                            : 'text-text-light dark:text-text-dark'
                                                    }`}>
                                                        {task.title}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {stage.id === 'completed' && (
                                        <div className="px-4 pb-4 text-center">
                                            {allDone ? (
                                                <div className="py-3">
                                                    <Trophy size={28} className="text-emerald-500 mx-auto mb-1" />
                                                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Onboarding Complete!</p>
                                                </div>
                                            ) : (
                                                <div className="py-3">
                                                    <Trophy size={28} className="text-gray-300 dark:text-gray-600 mx-auto mb-1" />
                                                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark">Complete all stages</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Arrow Connector */}
                                {index < stages.length - 1 && (
                                    <div className="flex-shrink-0 flex items-center justify-center w-10 self-center pt-2">
                                        <div className="flex items-center">
                                            <div className={`w-5 h-0.5 ${
                                                getStageStatus(stages[index]!) === 'done'
                                                    ? 'bg-emerald-400 dark:bg-emerald-600'
                                                    : 'bg-border-light dark:bg-border-dark'
                                            }`} />
                                            <ArrowRight size={16} className={`-ml-1 ${
                                                getStageStatus(stages[index]!) === 'done'
                                                    ? 'text-emerald-400 dark:text-emerald-600'
                                                    : 'text-border-light dark:text-border-dark'
                                            }`} />
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Stage Detail Cards (vertical breakdown) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stages.filter(s => s.id !== 'completed').map(stage => {
                    const status = getStageStatus(stage);
                    const stageCompleted = stage.tasks.filter(t => t.completed).length;
                    const stageTotal = stage.tasks.length;

                    return (
                        <div
                            key={stage.id}
                            className={`bg-card-light dark:bg-card-dark rounded-xl border shadow-sm overflow-hidden ${
                                status === 'done'
                                    ? 'border-emerald-200 dark:border-emerald-800'
                                    : status === 'active'
                                        ? stage.borderColor
                                        : 'border-border-light dark:border-border-dark'
                            }`}
                        >
                            {/* Colored top bar */}
                            <div className={`h-1 ${
                                status === 'done'
                                    ? 'bg-emerald-500'
                                    : status === 'active'
                                        ? 'bg-primary'
                                        : 'bg-gray-200 dark:bg-gray-700'
                            }`} />

                            <div className="p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${
                                            status === 'done'
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                : `${stage.bgColor} ${stage.color}`
                                        }`}>
                                            {status === 'done' ? <CheckCircle2 size={18} /> : stage.icon}
                                        </div>
                                        <h3 className="font-semibold text-text-light dark:text-text-dark">{stage.label}</h3>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                        status === 'done'
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                            : status === 'active'
                                                ? `${stage.bgColor} ${stage.color}`
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                    }`}>
                                        {stageTotal > 0 ? `${stageCompleted}/${stageTotal}` : '0'}
                                    </span>
                                </div>

                                <div className="space-y-2.5">
                                    {stage.tasks.map((task, idx) => (
                                        <div key={idx} className="flex items-start gap-2.5">
                                            {task.completed
                                                ? <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                                : status === 'active'
                                                    ? <CircleDot size={16} className="text-primary mt-0.5 flex-shrink-0" />
                                                    : <Circle size={16} className="text-gray-300 dark:text-gray-600 mt-0.5 flex-shrink-0" />
                                            }
                                            <span className={`text-sm ${
                                                task.completed
                                                    ? 'line-through text-text-muted-light dark:text-text-muted-dark'
                                                    : 'text-text-light dark:text-text-dark'
                                            }`}>
                                                {task.title}
                                            </span>
                                        </div>
                                    ))}
                                    {stage.tasks.length === 0 && (
                                        <p className="text-sm text-text-muted-light dark:text-text-muted-dark italic">
                                            No tasks assigned yet
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const Onboarding: React.FC = () => {
    const { user } = useAuth();
    const { addNode } = useOrg();

    // Toast state
    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
        show: false, message: '', type: 'success'
    });
    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setToast({ show: true, message, type });
    };

    // Tab state
    const [activeTab, setActiveTab] = useState<'checklist' | 'flow'>('checklist');

    // State
    const [tasks, setTasks] = useState<OnboardingTask[]>([]);
    const [keyContacts, setKeyContacts] = useState<KeyContact[]>([]);

    // Document Checklist state
    const [onboardingDocs, setOnboardingDocs] = useState<OnboardingDocument[]>([]);
    const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
    const [reviewNoteDocId, setReviewNoteDocId] = useState<string | null>(null);
    const [reviewNote, setReviewNote] = useState('');
    const fileInputRef2 = useRef<HTMLInputElement>(null);

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

    // Autocomplete state
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [emailSuggestions, setEmailSuggestions] = useState<Employee[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
    const emailInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch employees for autocomplete functionality
                try {
                    const employeesData = await api.get<Employee[]>('/employees');
                    setAllEmployees(employeesData);
                    console.log('✅ Loaded employees for autocomplete:', employeesData.length);
                } catch (empError) {
                    console.log('⚠️ Could not fetch employees for autocomplete');
                    setAllEmployees([]);
                }

                // Fetch onboarding tasks (may auto-seed for employees)
                try {
                    const tasksData = await api.get<OnboardingTask[]>('/onboarding/tasks');
                    setTasks(tasksData);
                } catch (taskError) {
                    console.log('⚠️ Could not fetch onboarding tasks');
                    setTasks([]);
                }

                // Fetch key contacts
                try {
                    const contactsData = await api.get<KeyContact[]>('/onboarding/contacts');
                    setKeyContacts(contactsData);
                } catch (contactError) {
                    console.log('⚠️ Could not fetch key contacts');
                    setKeyContacts([]);
                }

                // Fetch onboarding documents (after tasks, since auto-seed creates both)
                try {
                    const docsData = await api.get<OnboardingDocument[]>('/onboarding/documents');
                    setOnboardingDocs(docsData);
                } catch (docError) {
                    console.log('⚠️ Could not fetch onboarding documents');
                    setOnboardingDocs([]);
                }
            } catch (error) {
                console.log('⚠️ Error initializing onboarding page:', error);
            }
        };
        fetchData();
    }, []);

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
        setInviteForm({ ...inviteForm, email: value });

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

            console.log('All employees:', allEmployees.length);
            console.log('Filtered employees:', filtered);

            setEmailSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setEmailSuggestions([]);
            setShowSuggestions(false);
        }
    };

    // Handle selecting an employee from suggestions
    const handleSelectEmployee = (employee: Employee) => {
        setInviteForm({
            name: employee.name,
            email: employee.email,
            role: employee.role,
            department: employee.department,
            startDate: employee.joinDate || ''
        });
        setShowSuggestions(false);
        setEmailSuggestions([]);
    };

    const toggleTask = async (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        const newCompleted = !task.completed;
        // Optimistic update
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: newCompleted } : t));
        try {
            await api.patch(`/onboarding/tasks/${id}`, { completed: newCompleted });
        } catch (error) {
            // Revert on failure
            setTasks(tasks.map(t => t.id === id ? { ...t, completed: task.completed } : t));
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
        setTasks(tasks.map(t => t.id === id ? { ...t, priority: nextPriority } as OnboardingTask : t));
        try {
            await api.patch(`/onboarding/tasks/${id}`, { priority: nextPriority });
        } catch (error) {
            // Revert on failure
            setTasks(tasks.map(t => t.id === id ? { ...t, priority: currentPriority } as OnboardingTask : t));
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

    // Helper logic for dates
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

    // Derived options for dropdowns
    const assigneeOptions = [
        { value: 'All', label: 'All Assignees' },
        { value: 'My Tasks', label: 'My Tasks' },
        ...Array.from(new Set(tasks.map(t => t.assignee))).filter(a => a !== 'HR').map(a => ({ value: a, label: a }))
    ];
    const priorityOptions = [
        { value: 'All', label: 'All Priorities' },
        { value: 'High', label: 'High' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Low', label: 'Low' },
    ];
    const dateFilterOptions = [
        { value: 'All', label: 'All Dates' },
        { value: 'Overdue', label: 'Overdue' },
        { value: 'Due Soon', label: 'Due Soon' },
    ];

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

                // Refetch tasks and documents to show newly seeded ones
                try {
                    const updatedTasks = await api.get<OnboardingTask[]>('/onboarding/tasks');
                    setTasks(updatedTasks);
                    const updatedDocs = await api.get<OnboardingDocument[]>('/onboarding/documents');
                    setOnboardingDocs(updatedDocs);
                } catch (fetchError) {
                    console.log('Could not refetch tasks/documents:', fetchError);
                }

                showToast(`Onboarding invitation sent to ${inviteForm.name}!`, 'success');
            } else {
                // Employee doesn't exist - create new employee
                await addNode({
                    // Pass full form data for API
                    name: inviteForm.name,
                    email: inviteForm.email,
                    role: inviteForm.role,
                    department: inviteForm.department,
                    startDate: inviteForm.startDate,
                    parentId: '2', // Default parent

                    // Legacy/UI fields (fetched by API usually, but handy if we optimistic update)
                    id: Date.now().toString(),
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(inviteForm.name)}&background=random`,
                });

                // Refresh employees list for autocomplete
                const updatedEmployees = await api.get<Employee[]>('/employees');
                setAllEmployees(updatedEmployees);

                // Seed onboarding tasks for the new employee
                const newEmployee = updatedEmployees.find(
                    emp => emp.email.toLowerCase() === inviteForm.email.toLowerCase()
                );
                if (newEmployee) {
                    try {
                        await api.post(`/onboarding/tasks/seed/${newEmployee.id}`, {});
                        const updatedTasks = await api.get<OnboardingTask[]>('/onboarding/tasks');
                        setTasks(updatedTasks);
                        const updatedDocs = await api.get<OnboardingDocument[]>('/onboarding/documents');
                        setOnboardingDocs(updatedDocs);
                    } catch (seedError) {
                        console.log('Could not seed tasks for new employee:', seedError);
                    }
                }

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

    // Onboarding Document Checklist handlers
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
            case 'Uploaded': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
            case 'Approved': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
            case 'Rejected': return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-600';
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
            setOnboardingDocs(prev => prev.map(d => d.id === docId ? updatedDoc : d));
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
            setOnboardingDocs(prev => prev.map(d => d.id === docId ? updatedDoc : d));
            showToast(`Document ${status.toLowerCase()}!`, status === 'Approved' ? 'success' : 'warning');
            setReviewNoteDocId(null);
            setReviewNote('');
        } catch {
            showToast('Failed to review document', 'error');
        }
    };

    const docsUploaded = onboardingDocs.filter(d => d.status !== 'Pending').length;
    const docsApproved = onboardingDocs.filter(d => d.status === 'Approved').length;

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
                <OnboardingFlowGraph tasks={tasks} />
            )}

            {/* ==================== CHECKLIST TAB ==================== */}
            {activeTab === 'checklist' && <>
            {/* Progress Overview Card */}
            <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-text-light dark:text-text-dark">Overall Progress</h2>
                    <span className="text-2xl font-bold text-primary">{calculateProgress()}%</span>
                </div>
                <div className="w-full bg-background-light dark:bg-background-dark h-3 rounded-full overflow-hidden">
                    <div
                        className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${calculateProgress()}%` }}
                    ></div>
                </div>
                {/* Detailed breakdown mostly useful for Admin or comprehensive view */}
                <div className="flex gap-8 mt-6 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        <span className="text-text-muted-light dark:text-text-muted-dark">
                            Tasks ({filteredTasks.filter(t => t.completed).length}/{filteredTasks.length})
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left Column: Task Checklist */}
                <div className="xl:col-span-2 space-y-6">

                    {/* Filter Controls - Only show relevant filters for Admin, simpler for Employee */}
                    {user?.role === 'HR_ADMIN' && (
                        <div className="flex flex-wrap items-center gap-3 bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                            <div className="flex items-center gap-2 text-text-muted-light dark:text-text-muted-dark text-sm font-medium mr-2">
                                <Filter size={16} />
                                <span>Filter Tasks:</span>
                            </div>

                            <Dropdown
                                options={assigneeOptions}
                                value={assigneeFilter}
                                onChange={setAssigneeFilter}
                                width="w-40"
                            />

                            <Dropdown
                                options={priorityOptions}
                                value={priorityFilter}
                                onChange={setPriorityFilter}
                                width="w-40"
                            />

                            <Dropdown
                                options={dateFilterOptions}
                                value={dateFilter}
                                onChange={setDateFilter}
                                width="w-36"
                            />
                        </div>
                    )}

                    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-border-light dark:border-border-dark flex justify-between items-center">
                            <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Task Checklist</h2>
                            {user?.role === 'HR_ADMIN' && (
                                <div className="flex gap-2">
                                    <span className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800">IT Setup</span>
                                    <span className="px-2 py-1 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded border border-purple-200 dark:border-purple-800">HR Ops</span>
                                </div>
                            )}
                        </div>

                        {Object.keys(groupedTasks).length === 0 && (
                            <div className="p-8 text-center text-text-muted-light dark:text-text-muted-dark">
                                <p>No tasks found.</p>
                            </div>
                        )}

                        <div className="divide-y divide-border-light dark:divide-border-dark">
                            {(Object.entries(groupedTasks) as [string, OnboardingTask[]][]).map(([stage, stageTasks]) => {
                                const visibleStageTotal = stageTasks.length;
                                const visibleStageCompleted = stageTasks.filter(t => t.completed).length;
                                const stageProgress = visibleStageTotal > 0 ? Math.round((visibleStageCompleted / visibleStageTotal) * 100) : 0;

                                return (
                                    <div key={stage} className="p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2 text-primary font-medium">
                                                {getStageIcon(stage)}
                                                <span>{stage}</span>
                                            </div>
                                            <div className="flex items-center gap-3" title={`${visibleStageCompleted} of ${visibleStageTotal} tasks completed`}>
                                                <span className="text-xs text-text-muted-light dark:text-text-muted-dark font-medium">{Math.round(stageProgress)}%</span>
                                                <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary rounded-full transition-all duration-500"
                                                        style={{ width: `${stageProgress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3 pl-1">
                                            {stageTasks.map(task => {
                                                const overdue = isOverdue(task.dueDate) && !task.completed;
                                                const dueSoon = isDueSoon(task.dueDate) && !task.completed;

                                                return (
                                                    <div key={task.id} className={`flex items-start gap-3 group ${task.completed ? 'opacity-60' : ''}`}>
                                                        <button
                                                            onClick={() => toggleTask(task.id)}
                                                            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border transition-colors flex items-center justify-center ${task.completed
                                                                ? 'bg-primary border-primary text-white'
                                                                : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                                                                }`}
                                                        >
                                                            {task.completed && <CheckCircle2 size={14} />}
                                                        </button>
                                                        <div className="flex-1">
                                                            <p className={`text-sm font-medium ${task.completed ? 'line-through text-text-muted-light dark:text-text-muted-dark' : 'text-text-light dark:text-text-dark'}`}>
                                                                {task.title}
                                                            </p>
                                                            <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{task.description}</p>
                                                            {task.link && (
                                                                <a href={task.link} className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                                                                    Read Material <ExternalLink size={10} />
                                                                </a>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-text-muted-light dark:text-text-muted-dark">
                                                            {user?.role === 'HR_ADMIN' && (
                                                                <button
                                                                    onClick={() => cyclePriority(task.id)}
                                                                    className={`px-2 py-0.5 rounded border font-medium transition-colors ${getPriorityBadgeClass(task.priority)}`}
                                                                    title="Click to change priority"
                                                                >
                                                                    {task.priority}
                                                                </button>
                                                            )}

                                                            {user?.role === 'HR_ADMIN' && (
                                                                <div className="flex items-center gap-1 bg-background-light dark:bg-background-dark px-2 py-0.5 rounded border border-border-light dark:border-border-dark">
                                                                    <Mail size={10} />
                                                                    {task.assignee}
                                                                </div>
                                                            )}

                                                            <span className={`flex items-center gap-1 font-medium ${task.completed ? 'text-text-muted-light' :
                                                                overdue ? 'text-accent-red bg-accent-red/10 px-2 py-0.5 rounded' :
                                                                    dueSoon ? 'text-accent-orange bg-accent-orange/10 px-2 py-0.5 rounded' : ''
                                                                }`}>
                                                                {(overdue || dueSoon) && !task.completed && <AlertCircle size={12} />}
                                                                {task.dueDate}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Documents, Training, Contacts */}
                <div className="flex flex-col gap-6">

                    {/* Key Contacts */}
                    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                        <div className="p-5 border-b border-border-light dark:border-border-dark">
                            <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Key Contacts</h2>
                        </div>
                        <div className="p-4 space-y-3">
                            {keyContacts.map(contact => (
                                <div key={contact.id} className="flex items-center gap-3 p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors">
                                    <Avatar src={contact.avatar} name={contact.name} size="lg" className="ring-1 ring-border-light dark:ring-border-dark" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text-light dark:text-text-dark">{contact.name}</p>
                                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{contact.role} • {contact.relation}</p>
                                    </div>
                                    <button
                                        onClick={() => showToast('Email client opened!', 'info')}
                                        className="p-2 text-text-muted-light hover:text-primary transition-colors"
                                        title="Send Email"
                                    >
                                        <Mail size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Document Checklist */}
                    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                        <div className="p-5 border-b border-border-light dark:border-border-dark">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Document Checklist</h2>
                                {onboardingDocs.length > 0 && (
                                    <span className="text-xs font-medium text-text-muted-light dark:text-text-muted-dark">
                                        {docsUploaded}/{onboardingDocs.length} uploaded
                                    </span>
                                )}
                            </div>
                            {onboardingDocs.length > 0 && (
                                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full transition-all duration-500"
                                        style={{ width: `${onboardingDocs.length > 0 ? Math.round((docsApproved / onboardingDocs.length) * 100) : 0}%` }}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="p-4 space-y-3">
                            {onboardingDocs.length === 0 && (
                                <div className="text-center py-6">
                                    <FileText size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                    <p className="text-sm text-text-muted-light dark:text-text-muted-dark">No documents required yet</p>
                                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">Documents will appear after onboarding is initiated</p>
                                </div>
                            )}
                            {onboardingDocs.map(doc => (
                                <div key={doc.id} className="p-3 bg-background-light dark:bg-background-dark/50 rounded-lg border border-border-light dark:border-border-dark">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded flex-shrink-0 ${
                                            doc.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                                            doc.status === 'Rejected' ? 'bg-red-100 dark:bg-red-900/30' :
                                            doc.status === 'Uploaded' ? 'bg-blue-100 dark:bg-blue-900/30' :
                                            'bg-gray-100 dark:bg-gray-800'
                                        }`}>
                                            {doc.status === 'Approved' ? <CheckCircle2 size={18} className="text-emerald-600" /> :
                                             doc.status === 'Rejected' ? <XCircle size={18} className="text-red-500" /> :
                                             doc.status === 'Uploaded' ? <Eye size={18} className="text-blue-500" /> :
                                             <FileText size={18} className="text-gray-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">{doc.name}</p>
                                                <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${getStatusBadge(doc.status)}`}>
                                                    {doc.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{doc.description}</p>
                                            {doc.fileType && doc.fileSize && (
                                                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
                                                    {doc.fileType} &middot; {doc.fileSize}
                                                </p>
                                            )}
                                            {doc.reviewNote && (
                                                <div className="flex items-start gap-1 mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                                                    <MessageSquare size={12} className="mt-0.5 flex-shrink-0" />
                                                    <span>{doc.reviewNote}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {/* Upload button — for Pending or Rejected items */}
                                            {(doc.status === 'Pending' || doc.status === 'Rejected') && (
                                                <button
                                                    onClick={() => {
                                                        setUploadingDocId(doc.id);
                                                        fileInputRef2.current?.click();
                                                    }}
                                                    className="p-1.5 text-text-muted-light hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                                    title="Upload file"
                                                >
                                                    <Upload size={14} />
                                                </button>
                                            )}
                                            {/* Download button — for uploaded files */}
                                            {doc.filePath && (
                                                <button
                                                    onClick={() => handleDocDownload(doc.id)}
                                                    className="p-1.5 text-text-muted-light hover:text-primary rounded transition-colors"
                                                    title="Download"
                                                >
                                                    <Download size={14} />
                                                </button>
                                            )}
                                            {/* Admin: Approve / Reject buttons */}
                                            {user?.role === 'HR_ADMIN' && doc.status === 'Uploaded' && (
                                                <>
                                                    <button
                                                        onClick={() => handleDocReview(doc.id, 'Approved')}
                                                        className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
                                                        title="Approve"
                                                    >
                                                        <ThumbsUp size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setReviewNoteDocId(doc.id);
                                                            setReviewNote('');
                                                        }}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                        title="Reject"
                                                    >
                                                        <ThumbsDown size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {/* Reject note input */}
                                    {reviewNoteDocId === doc.id && (
                                        <div className="mt-3 flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={reviewNote}
                                                onChange={e => setReviewNote(e.target.value)}
                                                placeholder="Reason for rejection (optional)"
                                                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 text-text-light dark:text-text-dark"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleDocReview(doc.id, 'Rejected', reviewNote)}
                                                className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => { setReviewNoteDocId(null); setReviewNote(''); }}
                                                className="px-2 py-1.5 text-xs text-text-muted-light hover:text-text-light dark:text-text-muted-dark"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Hidden file input for document upload */}
                    <input
                        ref={fileInputRef2}
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.doc,.xlsx,.jpg,.jpeg,.png"
                        onChange={e => {
                            if (e.target.files?.[0] && uploadingDocId) {
                                handleDocUpload(uploadingDocId, e.target.files[0]);
                            }
                            e.target.value = '';
                        }}
                    />
                </div>
            </div>

            </>}

            {/* Invite Employee Modal */}
            <Modal
                isOpen={isInviteModalOpen}
                onClose={() => { setIsInviteModalOpen(false); setInviteErrors({}); }}
                title="Invite New Employee"
                maxWidth="lg"
            >
                <form onSubmit={handleInviteSubmit} noValidate className="p-6 space-y-4">
                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                            <input
                                type="text"
                                value={inviteForm.name}
                                onChange={(e) => {
                                    setInviteForm({ ...inviteForm, name: e.target.value });
                                    if (inviteErrors.name) setInviteErrors(prev => { const { name, ...rest } = prev; return rest; });
                                }}
                                placeholder="e.g. Sarah Connor"
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
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                            Email Address <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light z-10" size={16} />
                            <input
                                ref={emailInputRef}
                                type="email"
                                value={inviteForm.email}
                                onChange={(e) => {
                                    handleEmailChange(e.target.value);
                                    if (inviteErrors.email) setInviteErrors(prev => { const { email, ...rest } = prev; return rest; });
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
                                placeholder="e.g. sarah@example.com"
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
                                            onClick={() => handleSelectEmployee(emp)}
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
                                Start typing to search for existing employees
                            </p>
                        )}
                    </div>

                    {/* Role & Department */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                                Role <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                <input
                                    type="text"
                                    value={inviteForm.role}
                                    onChange={(e) => {
                                        setInviteForm({ ...inviteForm, role: e.target.value });
                                        if (inviteErrors.role) setInviteErrors(prev => { const { role, ...rest } = prev; return rest; });
                                    }}
                                    placeholder="e.g. Developer"
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
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                                Department <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                <input
                                    type="text"
                                    value={inviteForm.department}
                                    onChange={(e) => {
                                        setInviteForm({ ...inviteForm, department: e.target.value });
                                        if (inviteErrors.department) setInviteErrors(prev => { const { department, ...rest } = prev; return rest; });
                                    }}
                                    placeholder="e.g. Engineering"
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
                            label="Start Date"
                            value={inviteForm.startDate}
                            onChange={(date) => {
                                setInviteForm({ ...inviteForm, startDate: date });
                                if (inviteErrors.startDate) setInviteErrors(prev => { const { startDate, ...rest } = prev; return rest; });
                            }}
                            placeholder="Select start date"
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
                            onClick={() => {
                                setIsInviteModalOpen(false);
                                setInviteErrors({});
                                setInviteForm({ name: '', email: '', role: '', department: '', startDate: '' });
                            }}
                            className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2"
                        >
                            <Mail size={16} /> Send Invitation
                        </button>
                    </div>
                </form>
            </Modal>

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