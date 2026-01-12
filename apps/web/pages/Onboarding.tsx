import React, { useState } from 'react';
import {
    CheckCircle2,
    Circle,
    Clock,
    FileText,
    PlayCircle,
    Upload,
    MoreVertical,
    Mail,
    Calendar,
    Users,
    AlertCircle,
    Filter,
    X,
    Check,
    User,
    Briefcase,
    ExternalLink
} from 'lucide-react';
import { MOCK_ONBOARDING_TASKS, MOCK_TRAINING_MODULES, KEY_CONTACTS } from '../constants';
import { OnboardingTask } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';

export const Onboarding: React.FC = () => {
    const { user } = useAuth();
    const { addNode } = useOrg();
    const [tasks, setTasks] = useState(MOCK_ONBOARDING_TASKS);

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

    const toggleTask = (id: string) => {
        setTasks(tasks.map(task =>
            task.id === id ? { ...task, completed: !task.completed } : task
        ));
    };

    const cyclePriority = (id: string) => {
        setTasks(tasks.map(task => {
            if (task.id === id) {
                const priorities: ('High' | 'Medium' | 'Low')[] = ['High', 'Medium', 'Low'];
                const currentIndex = priorities.indexOf(task.priority);
                const nextPriority = priorities[(currentIndex + 1) % priorities.length];
                return { ...task, priority: nextPriority };
            }
            return task;
        }));
    };

    const calculateProgress = () => {
        const relevantTasks = user.role === 'EMPLOYEE'
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
        if (user.role === 'EMPLOYEE' && task.assignee !== 'Employee') {
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
        acc[task.stage].push(task);
        return acc;
    }, {} as Record<string, OnboardingTask[]>);

    // Derived options for dropdowns
    const assignees = ['All', 'My Tasks', ...Array.from(new Set(tasks.map(t => t.assignee))).filter(a => a !== 'HR')];
    const priorities = ['All', 'High', 'Medium', 'Low'];
    const dateOptions = ['All', 'Overdue', 'Due Soon'];

    const handleInviteSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Add to Org Chart Logic (Fix for E2E Test)
        addNode({
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

        alert(`Onboarding invitation sent to ${inviteForm.email}`);
        setIsInviteModalOpen(false);
        setInviteForm({ name: '', email: '', role: '', department: '', startDate: '' });
    };

    const getPriorityBadgeClass = (priority: string) => {
        switch (priority) {
            case 'High': return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-900';
            case 'Medium': return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900';
            case 'Low': return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-900';
            default: return 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Header & Active Onboarding Profile */}
            <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-text-light dark:text-text-dark tracking-tight mb-1">
                        {user.role === 'EMPLOYEE' ? 'My Onboarding Checklist' : 'Onboarding Center'}
                    </h1>
                    <p className="text-text-muted-light dark:text-text-muted-dark">
                        {user.role === 'EMPLOYEE'
                            ? `Welcome aboard, ${user.name.split(' ')[0]}! Complete these tasks to get started.`
                            : <><span className="font-semibold text-text-light dark:text-text-dark">Leo Martinez</span> (Product Designer) - Onboarding Dashboard</>
                        }
                    </p>
                </div>
                {user.role === 'HR_ADMIN' && (
                    <div className="flex items-center gap-3">
                        <button className="px-4 py-2 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Save as Template</button>
                        <button
                            onClick={() => setIsInviteModalOpen(true)}
                            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            Invite Employee
                        </button>
                    </div>
                )}
            </div>

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
                    {user.role === 'HR_ADMIN' && (
                        <div className="flex flex-wrap items-center gap-3 bg-card-light dark:bg-card-dark p-4 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                            <div className="flex items-center gap-2 text-text-muted-light dark:text-text-muted-dark text-sm font-medium mr-2">
                                <Filter size={16} />
                                <span>Filter Tasks:</span>
                            </div>

                            <select
                                value={assigneeFilter}
                                onChange={(e) => setAssigneeFilter(e.target.value)}
                                className="px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                {assignees.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>

                            <select
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                                className="px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                {priorities.map(p => <option key={p} value={p}>{p === 'All' ? 'All Priorities' : p}</option>)}
                            </select>

                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                {dateOptions.map(d => <option key={d} value={d}>{d === 'All' ? 'All Dates' : d}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-border-light dark:border-border-dark flex justify-between items-center">
                            <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Task Checklist</h2>
                            {user.role === 'HR_ADMIN' && (
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
                                                            {user.role === 'HR_ADMIN' && (
                                                                <button
                                                                    onClick={() => cyclePriority(task.id)}
                                                                    className={`px-2 py-0.5 rounded border font-medium transition-colors ${getPriorityBadgeClass(task.priority)}`}
                                                                    title="Click to change priority"
                                                                >
                                                                    {task.priority}
                                                                </button>
                                                            )}

                                                            {user.role === 'HR_ADMIN' && (
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
                            {KEY_CONTACTS.map(contact => (
                                <div key={contact.id} className="flex items-center gap-3 p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors">
                                    <img src={contact.avatar} alt={contact.name} className="w-10 h-10 rounded-full object-cover ring-1 ring-border-light dark:ring-border-dark" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text-light dark:text-text-dark">{contact.name}</p>
                                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{contact.role} • {contact.relation}</p>
                                    </div>
                                    <button className="p-2 text-text-muted-light hover:text-primary transition-colors"><Mail size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Document Collection */}
                    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                        <div className="p-5 border-b border-border-light dark:border-border-dark">
                            <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Document Collection</h2>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark/50 rounded-lg border border-border-light dark:border-border-dark">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-text-light dark:text-text-dark">Signed Contract</p>
                                        <p className="text-xs text-accent-green">Uploaded</p>
                                    </div>
                                </div>
                                <button className="p-1.5 text-text-muted-light hover:text-primary"><MoreVertical size={16} /></button>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark/50 rounded-lg border border-border-light dark:border-border-dark">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-text-light dark:text-text-dark">ID / Passport Copy</p>
                                        <p className="text-xs text-accent-green">Uploaded</p>
                                    </div>
                                </div>
                                <button className="p-1.5 text-text-muted-light hover:text-primary"><MoreVertical size={16} /></button>
                            </div>

                            <div className="flex items-center justify-between p-3 border border-dashed border-border-light dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                                        <Upload size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-text-light dark:text-text-dark">Tax Forms (W-4)</p>
                                        <p className="text-xs text-accent-orange">Pending Upload</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Invite Employee Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                                Invite New Employee
                            </h3>
                            <button
                                onClick={() => setIsInviteModalOpen(false)}
                                className="text-text-muted-light hover:text-text-light"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleInviteSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                    <input
                                        required
                                        type="text"
                                        value={inviteForm.name}
                                        onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                                        placeholder="e.g. Sarah Connor"
                                        className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                    <input
                                        required
                                        type="email"
                                        value={inviteForm.email}
                                        onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                        placeholder="e.g. sarah@example.com"
                                        className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Role</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                        <input
                                            required
                                            type="text"
                                            value={inviteForm.role}
                                            onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                                            placeholder="e.g. Developer"
                                            className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Department</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                        <input
                                            required
                                            type="text"
                                            value={inviteForm.department}
                                            onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                                            placeholder="e.g. Engineering"
                                            className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Start Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                    <input
                                        required
                                        type="date"
                                        value={inviteForm.startDate}
                                        onChange={(e) => setInviteForm({ ...inviteForm, startDate: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsInviteModalOpen(false)}
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
                    </div>
                </div>
            )}
        </div>
    );
};