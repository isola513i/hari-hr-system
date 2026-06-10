import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  TrendingUp,
  UserPlus,
  CheckCircle2,
  Rocket,
  Calendar as CalendarIcon,
  GraduationCap,
  PartyPopper,
  Flag,
  Clock,
  Building2,
  UserMinus,
  Briefcase,
  Activity,
  StickyNote,
  Cake,
  Pin,
  Pencil,
  Send,
  Trash2,
  X
} from 'lucide-react';
import { ResponsiveContainer, XAxis, YAxis, AreaChart, Area, Tooltip } from 'recharts';
import { StatCard } from '../components/StatCard';
import { LeaveGanttCalendar } from '../components/LeaveGanttCalendar';
import { Avatar } from '../components/Avatar';
import { AddEmployeeModal } from '../components/AddEmployeeModal';
import QueryErrorState from '../components/QueryErrorState';
import { LeaveDetailModal } from '../components/LeaveDetailModal';
import { RejectReasonDialog } from '../components/RejectReasonDialog';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useLeave } from '../contexts/LeaveContext';
import { translateLeaveType } from '../lib/leaveTypeConfig';
import type {
  ChartDataPoint,
  OnboardingProgressSummary,
  UpcomingEvent,
  LeaveRequest,
} from '../types';
import {
  useAllEmployees,
  useAuditLogs,
  useHeadcountStats,
  useUpcomingEvents,
  useNotes,
  useAddNote,
  useUpdateNote,
  useDeleteNote,
  useToggleNotePin,
  useAddEmployee,
  useAdminAttendanceSnapshot,
  useAdminDashboardStats,
} from '../hooks/queries';

export const AdminDashboard: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const { user } = useAuth();
  const { showToast } = useToast();
  const { requests, updateRequestStatus } = useLeave();
  const navigate = useNavigate();

  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const formatLeaveDate = (startDate: string, endDate: string, fallbackDates: string): string => {
    const locale = i18n.language === 'th' ? 'th-TH' : 'en-US';
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return fallbackDates;
      return `${s.toLocaleDateString(locale, opts)} - ${e.toLocaleDateString(locale, opts)}`;
    } catch {
      return fallbackDates;
    }
  };
  const myRequests = useMemo(() => requests.filter(r => r.employeeId === user?.employeeId), [requests, user?.employeeId]);
  const teamRequests = useMemo(() => requests.filter(r => r.employeeId !== user?.employeeId), [requests, user?.employeeId]);

  // ----- REACT QUERY HOOKS -----
  const { data: allEmployees = [], isPending: isEmployeesLoading, isError: isEmployeesError, error: employeesError, refetch: refetchEmployees } = useAllEmployees();
  const { data: adminStats } = useAdminDashboardStats();
  const { data: attendanceSnapshot } = useAdminAttendanceSnapshot();
  const { data: auditLogsData = [] } = useAuditLogs();
  const { data: headcountStats = [] } = useHeadcountStats();
  const { data: eventsData = [] } = useUpcomingEvents();
  const { data: notesData = [] } = useNotes();
  const addNoteMutation = useAddNote();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();
  const togglePinMutation = useToggleNotePin();
  const addEmployeeMutation = useAddEmployee();

  // ----- DERIVED LOADING STATE -----
  const isLoading = isEmployeesLoading;

  // ----- STATE -----
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);

  const [detailRequest, setDetailRequest] = useState<LeaveRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<LeaveRequest | null>(null);
  const [quickNote, setQuickNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [deleteConfirmNoteId, setDeleteConfirmNoteId] = useState<string | null>(null);

  // ----- STATS FROM BACKEND -----
  const newHiresCount = adminStats?.newHiresCount ?? 0;
  const newHiresTrend = adminStats?.newHiresTrend ?? 0;
  const turnoverRate = adminStats?.turnoverRate ?? 0;
  const turnoverTrend = adminStats?.turnoverTrend ?? 0;

  // ----- COMPUTED HEADCOUNT DATA -----
  const headcountData = useMemo<ChartDataPoint[]>(() => {
    if (headcountStats && headcountStats.length > 0) {
      return headcountStats;
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].map(m => t('common:monthsShort.' + m));
    const generatedData: ChartDataPoint[] = [];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();
      const thisMonthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

      const employeesUpToThisMonth = allEmployees.filter(e => {
        if (!e.joinDate) return false;
        const joinDate = new Date(e.joinDate);
        if (isNaN(joinDate.getTime())) return false;
        return joinDate <= thisMonthEnd && e.status !== 'Terminated';
      }).length;

      generatedData.push({
        name: monthNames[targetMonth] ?? '',
        value: employeesUpToThisMonth
      });
    }

    return generatedData;
  }, [allEmployees, headcountStats, t]);

  // ----- COMPUTED ONBOARDING SUMMARY -----
  const onboardingSummary = useMemo<OnboardingProgressSummary[]>(() => {
    const onboarding = allEmployees
      .filter(e => e.onboardingStatus === 'In Progress' || e.onboardingStatus === 'Not Started')
      .map(e => ({
        id: e.id,
        name: e.name,
        role: e.role,
        progress: e.onboardingPercentage ?? 0,
        avatar: e.avatar
      }));
    onboarding.sort((a, b) => b.progress - a.progress);
    return onboarding;
  }, [allEmployees]);

  // ----- COMPUTED UPCOMING EVENTS -----
  const upcomingEvents = useMemo<UpcomingEvent[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventsData.filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    });
  }, [eventsData]);

  // ----- HANDLERS -----
  const handleApproveLeave = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateRequestStatus(id, 'Approved');
  };

  const handleDeclineLeave = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateRequestStatus(id, 'Rejected');
  };

  const handleDetailApprove = (id: string) => {
    updateRequestStatus(id, 'Approved');
    setDetailRequest(null);
  };

  const handleDetailReject = (request: LeaveRequest) => {
    setRejectingRequest(request);
  };

  const handleConfirmReject = (reason: string) => {
    if (rejectingRequest) {
      updateRequestStatus(rejectingRequest.id, 'Rejected', reason);
      setRejectingRequest(null);
      setDetailRequest(null);
    }
  };

  const handleAddEmployee = async (employeeData: {
    name: string;
    role: string;
    department: string;
    email: string;
    joinDate: string;
  }) => {
    try {
      const payload = {
        ...employeeData,
        managerId: null
      };

      await addEmployeeMutation.mutateAsync(payload);
      setIsAddEmployeeModalOpen(false);
      showToast(t('dashboard:admin.employeeAdded', { name: employeeData.name }), 'success');
    } catch (error) {
      const apiError = error as Error;
      console.error('Error adding employee:', apiError);

      let errorMessage = t('dashboard:admin.employeeAddFailed');

      if (apiError.message) {
        if (apiError.message.includes('already exists')) {
          errorMessage = t('dashboard:admin.emailExists', { email: employeeData.email });
        } else if (apiError.message.includes('required')) {
          errorMessage = t('dashboard:admin.requiredFields');
        } else if (apiError.message.includes('Failed to add employee')) {
          errorMessage = t('dashboard:admin.connectionError');
        } else {
          errorMessage = apiError.message;
        }
      }

      showToast(errorMessage, 'error');
    }
  };

  const handleSaveNote = async () => {
    if (!quickNote.trim()) return;
    setIsSavingNote(true);
    try {
      if (editingNoteId) {
        await updateNoteMutation.mutateAsync({ id: editingNoteId, content: quickNote.trim() });
        setEditingNoteId(null);
      } else {
        await addNoteMutation.mutateAsync({ content: quickNote.trim() });
      }
      showToast(t('dashboard:employee.noteSaved'), "success");
      setQuickNote('');
    } catch (error) {
      console.error('Error saving note:', error);
      showToast(t('dashboard:employee.noteSaveFailed'), "error");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingNoteId(noteId);
    setDeleteConfirmNoteId(null);
    try {
      await deleteNoteMutation.mutateAsync(noteId);
      showToast(t('dashboard:employee.noteDeleted'), "success");
    } catch (error) {
      console.error('Error deleting note:', error);
      showToast(t('dashboard:employee.noteDeleteFailed'), "error");
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleTogglePin = async (noteId: string) => {
    try {
      await togglePinMutation.mutateAsync(noteId);
    } catch (error) {
      console.error('Error toggling pin:', error);
      showToast(t('dashboard:employee.notePinFailed'), "error");
    }
  };

  if (isEmployeesError) {
    return <QueryErrorState error={employeesError} onRetry={refetchEmployees} />;
  }

  // Show loading skeleton while fetching data
  if (isLoading) {
    return (
      <div className="space-y-6 pb-8">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card-light dark:bg-card-dark p-4 md:p-6 rounded-xl border border-border-light dark:border-border-dark">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Content Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card-light dark:bg-card-dark p-4 md:p-6 rounded-xl border border-border-light dark:border-border-dark">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in pb-8">
        {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">{t('dashboard:admin.title')}</h1>
          <p className="text-sm sm:text-base text-text-muted-light dark:text-text-muted-dark mt-1">{t('dashboard:admin.welcome', { name: user?.name?.split(' ')[0] })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/onboarding')}
            className="flex items-center gap-2 px-4 py-2.5 bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark font-medium rounded-lg text-sm border border-border-light dark:border-border-dark shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Rocket size={18} className="text-accent-teal" />
            {t('dashboard:admin.initiateOnboarding')}
          </button>
          <button
            onClick={() => setIsAddEmployeeModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary-hover transition-colors"
          >
            <UserPlus size={18} />
            {t('dashboard:admin.addEmployee')}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div onClick={() => navigate('/admin-attendance')} className="cursor-pointer">
          <StatCard
            title={t('dashboard:admin.activeNow')}
            value={attendanceSnapshot?.activeNow ?? 0}
            icon={<Briefcase size={22} />}
            color="primary"
          />
        </div>
        <div onClick={() => navigate('/admin-attendance')} className="cursor-pointer">
          <StatCard
            title={t('dashboard:admin.onLeaveToday')}
            value={attendanceSnapshot?.onLeave ?? 0}
            icon={<UserMinus size={22} />}
            color="orange"
          />
        </div>
        <div onClick={() => navigate('/onboarding')} className="cursor-pointer">
          <StatCard
            title={t('dashboard:admin.newHiresMonth')}
            value={newHiresCount}
            trend={newHiresTrend}
            icon={<UserPlus size={22} />}
            color="green"
          />
        </div>
        <div onClick={() => navigate('/analytics')} className="cursor-pointer">
          <StatCard
            title={t('dashboard:admin.turnoverRate')}
            value={`${turnoverRate.toFixed(1)}%`}
            trend={turnoverTrend}
            icon={<TrendingUp size={22} />}
            color="red"
            invertTrend
          />
        </div>
      </div>

      {/* Leave Gantt Calendar */}
      <LeaveGanttCalendar
        userLeaves={myRequests}
        teamLeaves={teamRequests}
        allEmployees={allEmployees}
        isManager={true}
        onLeaveClick={setDetailRequest}
      />

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">

        {/* Headcount Chart - Spans 2 columns on desktop, full width on mobile */}
        <div className="md:col-span-2 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 md:p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Users size={18} className="md:w-5 md:h-5" />
              </div>
              <h2 className="text-base md:text-lg font-bold text-text-light dark:text-text-dark">{t('dashboard:admin.headcountTrends')}</h2>
            </div>
          </div>
          <div className="flex-grow w-full min-h-[200px]" style={{ minWidth: 300 }}>
            {headcountData && headcountData.length > 0 && !isLoading ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={headcountData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3498db" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3498db" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a0aec0', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a0aec0', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
                      backgroundColor: isDark ? '#1e2433' : '#ffffff',
                      color: isDark ? '#e2e8f0' : '#1a202c',
                    }}
                    cursor={{ stroke: '#3498db', strokeWidth: 1, strokeDasharray: '5 5' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3498db" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-text-muted-light dark:text-text-muted-dark">
                <Users size={40} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">{t('dashboard:admin.noHeadcountData')}</p>
                <p className="text-xs mt-1 opacity-70">{t('dashboard:admin.headcountHint')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Birthdays / Events */}
        <div className="md:col-span-1 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-2 md:gap-3">
              <h2 className="text-base md:text-lg font-semibold text-text-light dark:text-text-dark">{t('dashboard:admin.events')}</h2>
            </div>
            <button onClick={() => navigate('/wellbeing')} className="text-xs text-primary font-medium hover:underline">{t('common:buttons.viewAll')}</button>
          </div>
          <div className="p-3 md:p-4 flex-1 flex flex-col">
            {upcomingEvents.length > 0 ? (
              <ul className="space-y-4">
                {upcomingEvents.slice(0, 3).map(event => (
                  <li key={event.id} className="flex items-center gap-4">
                    {event.avatar ? (
                      <Avatar src={event.avatar} name={event.title} size="lg" className="ring-2 ring-white dark:ring-background-dark" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        event.type === 'Meeting' ? 'bg-accent-teal/10 text-accent-teal' :
                        event.type === 'Birthday' ? 'bg-pink-100 text-pink-500 dark:bg-pink-500/10 dark:text-pink-400' :
                        event.type === 'Social' ? 'bg-amber-100 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400' :
                        event.type === 'Training' ? 'bg-violet-100 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400' :
                        event.type === 'Holiday' ? 'bg-green-100 text-green-500 dark:bg-green-500/10 dark:text-green-400' :
                        event.type === 'Deadline' ? 'bg-red-100 text-red-500 dark:bg-red-500/10 dark:text-red-400' :
                        event.type === 'Company Event' ? 'bg-blue-100 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {event.type === 'Meeting' && <CalendarIcon size={18} />}
                        {event.type === 'Birthday' && <Cake size={18} />}
                        {event.type === 'Social' && <PartyPopper size={18} />}
                        {event.type === 'Training' && <GraduationCap size={18} />}
                        {event.type === 'Holiday' && <Flag size={18} />}
                        {event.type === 'Deadline' && <Clock size={18} />}
                        {event.type === 'Company Event' && <Building2 size={18} />}
                        {!['Meeting', 'Birthday', 'Social', 'Training', 'Holiday', 'Deadline', 'Company Event'].includes(event.type) && <CalendarIcon size={18} />}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm text-text-light dark:text-text-dark leading-tight">{event.title}</p>
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5 flex items-center gap-1">
                        {event.type === 'Birthday' && <Cake size={12} className="text-accent-red" />}
                        {new Date(event.date).toLocaleDateString(i18n.language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-text-muted-light dark:text-text-muted-dark">
                <CalendarIcon size={32} className="mb-2 opacity-20" />
                <p className="text-sm">{t('dashboard:admin.noUpcomingEvents')}</p>
                <button onClick={() => navigate('/announcements')} className="mt-2 text-xs text-primary hover:underline font-medium">{t('dashboard:admin.createAnnouncement')}</button>
              </div>
            )}
          </div>
        </div>

        {/* Onboarding Progress Widget */}
        <div className="md:col-span-1 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm overflow-y-auto">
          <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-2 md:gap-3">
              <h2 className="text-base md:text-lg font-semibold text-text-light dark:text-text-dark">{t('dashboard:admin.onboarding')}</h2>
            </div>
            <button onClick={() => navigate('/onboarding')} className="text-xs text-primary font-medium hover:underline">{t('common:buttons.viewAll')}</button>
          </div>
          <div className="p-3 md:p-4 max-h-[400px] overflow-y-auto">
            <ul className="space-y-5">
              {onboardingSummary.map(item => (
                <li key={item.id}>
                  <div className="flex justify-between mb-1">
                    <div>
                      <p className="font-medium text-sm text-text-light dark:text-text-dark">{item.name}</p>
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{item.role}</p>
                    </div>
                    <p className="text-sm font-bold text-accent-teal">{item.progress}%</p>
                  </div>
                  <div className="w-full bg-background-light dark:bg-background-dark rounded-full h-2 mt-1">
                    <div
                      className="bg-accent-teal h-2 rounded-full transition-all duration-500"
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>
                </li>
              ))}
              {onboardingSummary.length === 0 && (
                <li className="flex flex-col items-center justify-center py-4 text-text-muted-light dark:text-text-muted-dark">
                  <p className="text-sm italic">{t('dashboard:admin.noActiveOnboarding')}</p>
                  <button onClick={() => navigate('/onboarding')} className="mt-2 text-xs text-primary hover:underline font-medium">{t('dashboard:admin.startOnboarding')}</button>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Pending Leave Requests */}
        <div className="lg:col-span-2 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{t('dashboard:admin.pendingLeaveRequests')}</h2>
            </div>
            <span className="text-xs bg-accent-orange/10 text-accent-orange px-2 py-1 rounded-full">{t('dashboard:admin.pending', { count: pendingRequests.length })}</span>
          </div>
          <div className="p-4 flex-1 flex flex-col">
            {pendingRequests.length > 0 ? (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-border-light dark:divide-border-dark">
                      {pendingRequests.map(req => (
                        <tr key={req.id} onClick={() => setDetailRequest(req)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <Avatar src={req.avatar} name={req.employeeName} size="md" />
                              <span className="font-medium text-text-light dark:text-text-dark">{req.employeeName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-text-muted-light dark:text-text-muted-dark">{translateLeaveType(req.type)}</td>
                          <td className="py-3 px-4 text-text-muted-light dark:text-text-muted-dark">{formatLeaveDate(req.startDate, req.endDate, req.dates)}</td>
                          <td className="py-3 pl-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => handleApproveLeave(req.id, e)}
                                className="px-3 py-1 text-xs font-medium text-accent-green bg-accent-green/10 rounded-full hover:bg-accent-green/20 transition-colors"
                              >
                                {t('common:buttons.approve')}
                              </button>
                              <button
                                onClick={(e) => handleDeclineLeave(req.id, e)}
                                className="px-3 py-1 text-xs font-medium text-accent-red bg-accent-red/10 rounded-full hover:bg-accent-red/20 transition-colors"
                              >
                                {t('common:buttons.decline')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {pendingRequests.map(req => (
                    <div key={req.id} onClick={() => setDetailRequest(req)} className="p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark cursor-pointer hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar src={req.avatar} name={req.employeeName} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">{req.employeeName}</p>
                          <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{translateLeaveType(req.type)} · {formatLeaveDate(req.startDate, req.endDate, req.dates)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleApproveLeave(req.id, e)}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-accent-green bg-accent-green/10 rounded-lg hover:bg-accent-green/20 transition-colors text-center"
                        >
                          {t('common:buttons.approve')}
                        </button>
                        <button
                          onClick={(e) => handleDeclineLeave(req.id, e)}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-accent-red bg-accent-red/10 rounded-lg hover:bg-accent-red/20 transition-colors text-center"
                        >
                          {t('common:buttons.decline')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-text-muted-light dark:text-text-muted-dark">
                <CheckCircle2 size={32} className="mb-2 opacity-30" />
                <p>{t('dashboard:admin.allCaughtUp')}</p>
                <button onClick={() => navigate('/leave')} className="mt-2 text-xs text-primary hover:underline font-medium">{t('dashboard:admin.viewLeaveHistory')}</button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity & Notes */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Recent Activity */}
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
            <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{t('dashboard:admin.recentActivity')}</h2>
              </div>
            </div>
            <div className="p-4 max-h-[280px] overflow-y-auto flex-1 flex flex-col">
              {auditLogsData.length > 0 ? (
                <div className="space-y-4">
                  {auditLogsData.slice(0, 4).map(log => (
                    <div key={log.id} className="flex gap-3 items-start text-sm">
                      <div className="mt-0.5 p-1.5 bg-background-light dark:bg-background-dark rounded-full border border-border-light dark:border-border-dark text-text-muted-light">
                        <Activity size={14} />
                      </div>
                      <div>
                        <p className="text-text-light dark:text-text-dark">
                          <span className="font-medium">{log.user}</span> {log.action} <span className="font-medium">{log.target}</span>
                        </p>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{log.time}</p>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => navigate('/compliance')} className="w-full text-center text-xs text-primary mt-2 hover:underline">View Full Log</button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-text-muted-light dark:text-text-muted-dark">
                  <Activity size={32} className="mb-2 opacity-20" />
                  <p className="text-sm">{t('dashboard:admin.noRecentActivity')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Notes */}
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
            <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-lg">
                  <StickyNote size={16} />
                </div>
                <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{t('dashboard:admin.notes')}</h2>
              </div>
              {notesData.length > 0 && (
                <span className="text-[10px] text-text-muted-light dark:text-text-muted-dark">{t('dashboard:admin.saved', { count: notesData.length })}</span>
              )}
            </div>
            <div className="p-4 flex-grow flex flex-col">
              <div className="relative">
                <label htmlFor="adminNote" className="sr-only">Quick Note</label>
                <textarea
                  id="adminNote"
                  name="adminNote"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder={t('dashboard:admin.writeNote')}
                  className="w-full min-h-[70px] px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm text-text-light dark:text-text-dark placeholder:text-text-muted-light transition-colors"
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
                    onClick={handleSaveNote}
                    disabled={isSavingNote || !quickNote.trim()}
                    className={`flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-hover transition-colors font-medium ${isSavingNote || !quickNote.trim() ? 'opacity-40 cursor-not-allowed' : 'shadow-sm'}`}
                  >
                    <Send size={12} />
                    {isSavingNote ? t('common:buttons.saving') : editingNoteId ? t('common:buttons.update') : t('common:buttons.save')}
                  </button>
                </div>
              </div>
              {notesData.length > 0 && (
                <div className="mt-3 pt-2 border-t border-border-light dark:border-border-dark">
                  <p className="text-[10px] font-medium text-text-muted-light dark:text-text-muted-dark mb-1.5 uppercase tracking-wide">{t('dashboard:admin.recent')}</p>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {notesData.slice(0, 3).map(note => (
                      <div
                        key={note.id}
                        className={`group flex items-start gap-2 py-1 px-1 rounded transition-colors ${
                          note.pinned ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                        }`}
                      >
                        {note.pinned ? (
                          <Pin size={10} className="flex-shrink-0 mt-1 text-amber-500 fill-amber-500" />
                        ) : (
                          <div className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-border-light dark:bg-border-dark"></div>
                        )}
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark truncate flex-1">
                          {note.content.substring(0, 40)}{note.content.length > 40 ? '...' : ''}
                        </p>
                        {deleteConfirmNoteId === note.id ? (
                          <div className="flex-shrink-0 flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                              disabled={deletingNoteId === note.id}
                              className="text-[10px] text-red-500 hover:text-red-600 font-medium transition-colors"
                            >
                              {t('common:buttons.confirm')}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmNoteId(null); }}
                              className="p-0.5 text-text-muted-light hover:text-text-light dark:hover:text-text-dark transition-colors"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex-shrink-0 ml-auto flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleTogglePin(note.id); }}
                              className={`p-0.5 rounded transition-all ${
                                note.pinned
                                  ? 'text-amber-500 opacity-100'
                                  : 'text-text-muted-light hover:text-amber-500 opacity-0 group-hover:opacity-100'
                              }`}
                              title={note.pinned ? t('dashboard:admin.unpinNote') : t('dashboard:admin.pinNote')}
                            >
                              <Pin size={10} className={note.pinned ? 'fill-amber-500' : ''} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingNoteId(note.id); setQuickNote(note.content); }}
                              className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 text-text-muted-light hover:text-primary transition-all"
                              title={t('dashboard:admin.editNote')}
                            >
                              <Pencil size={10} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmNoteId(note.id); }}
                              disabled={deletingNoteId === note.id}
                              className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 text-text-muted-light hover:text-red-500 transition-all"
                              title={t('dashboard:admin.deleteNote')}
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* MODALS */}

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
        onSubmit={handleAddEmployee}
      />

      {/* Leave Detail Modal */}
      <LeaveDetailModal
        isOpen={!!detailRequest}
        onClose={() => setDetailRequest(null)}
        request={detailRequest}
        onApprove={handleDetailApprove}
        onReject={handleDetailReject}
      />

      {/* Reject Reason Dialog */}
      <RejectReasonDialog
        isOpen={!!rejectingRequest}
        onClose={() => setRejectingRequest(null)}
        onConfirm={handleConfirmReject}
        employeeName={rejectingRequest?.employeeName}
      />

      </div>
    </>
  );
};
