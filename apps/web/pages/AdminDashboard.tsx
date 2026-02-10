import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  UserPlus,
  MoreHorizontal,
  CheckCircle2,
  Rocket,
  Calendar as CalendarIcon,
  Utensils,
  UserMinus,
  Briefcase,
  Activity,
  StickyNote,
  Cake,
  Pin,
  Send,
  Trash2
} from 'lucide-react';
import { ResponsiveContainer, XAxis, YAxis, AreaChart, Area, Tooltip } from 'recharts';
import { StatCard, Toast, Avatar } from '../components/ui';
import { AddEmployeeModal } from '../components/AddEmployeeModal';
import { LeaveManagementModal } from '../components/LeaveManagementModal';
import { useAuth } from '../contexts/AuthContext';
import { useLeave } from '../contexts/LeaveContext';
import type {
  ChartDataPoint,
  OnboardingProgressSummary,
  UpcomingEvent,
} from '@hari/shared-types';
import {
  useAllEmployees,
  useAuditLogs,
  useHeadcountStats,
  useUpcomingEvents,
  useNotes,
  useAddNote,
  useDeleteNote,
  useToggleNotePin,
  useAddEmployee,
} from '../hooks/queries';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { requests, updateRequestStatus } = useLeave();
  const navigate = useNavigate();

  const pendingRequests = requests.filter(r => r.status === 'Pending');

  // ----- REACT QUERY HOOKS -----
  const { data: allEmployees = [], isPending: isEmployeesLoading } = useAllEmployees();
  const { data: auditLogsData = [] } = useAuditLogs();
  const { data: headcountStats = [] } = useHeadcountStats();
  const { data: eventsData = [] } = useUpcomingEvents();
  const { data: notesData = [] } = useNotes();
  const addNoteMutation = useAddNote();
  const deleteNoteMutation = useDeleteNote();
  const togglePinMutation = useToggleNotePin();
  const addEmployeeMutation = useAddEmployee();

  // ----- DERIVED LOADING STATE -----
  const isLoading = isEmployeesLoading;

  // ----- STATE -----
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ show: true, message, type });
  };

  // ----- COMPUTED STATS -----
  const { activeEmployeesCount, onLeaveCount, newHiresCount, newHiresTrend, turnoverRate, turnoverTrend } = useMemo(() => {
    const activeEmployees = allEmployees.filter((employee) => employee.status === 'Active');
    const onLeaveEmployees = allEmployees.filter((employee) => employee.status === 'On Leave');
    const terminatedEmployees = allEmployees.filter((employee) => employee.status === 'Terminated');

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const newJoinersThisMonth = allEmployees.filter(e => {
      const joinDate = new Date(e.joinDate);
      return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
    }).length;

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const newJoinersLastMonth = allEmployees.filter(e => {
      const joinDate = new Date(e.joinDate);
      return joinDate.getMonth() === lastMonth && joinDate.getFullYear() === lastMonthYear;
    }).length;

    const hireTrend = newJoinersLastMonth > 0
      ? ((newJoinersThisMonth - newJoinersLastMonth) / newJoinersLastMonth) * 100
      : newJoinersThisMonth > 0 ? 100 : 0;

    const totalEmployees = allEmployees.length;
    const turnoverRateCalc = totalEmployees > 0
      ? (terminatedEmployees.length / totalEmployees) * 100
      : 0;

    const turnoverTrendCalc = terminatedEmployees.length > 0 ? turnoverRateCalc : 0;

    return {
      activeEmployeesCount: activeEmployees.length,
      onLeaveCount: onLeaveEmployees.length,
      newHiresCount: newJoinersThisMonth,
      newHiresTrend: hireTrend,
      turnoverRate: turnoverRateCalc,
      turnoverTrend: turnoverTrendCalc,
    };
  }, [allEmployees]);

  // ----- COMPUTED HEADCOUNT DATA -----
  const headcountData = useMemo<ChartDataPoint[]>(() => {
    if (headcountStats && headcountStats.length > 0) {
      return headcountStats;
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
  }, [allEmployees, headcountStats]);

  // ----- COMPUTED ONBOARDING SUMMARY -----
  const onboardingSummary = useMemo<OnboardingProgressSummary[]>(() => {
    const onboarding = allEmployees
      .filter(e => e.onboardingStatus === 'In Progress' || e.onboardingStatus === 'Not Started')
      .map(e => ({
        id: e.id,
        name: e.name,
        role: e.role,
        progress: e.onboardingStatus === 'In Progress' ? 50 : 0,
        avatar: e.avatar
      }));
    return onboarding.length ? onboarding : [];
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
      showToast(`Successfully added ${employeeData.name} to the system!`, 'success');
    } catch (error) {
      const apiError = error as Error;
      console.error('Error adding employee:', apiError);

      let errorMessage = 'Failed to add employee. Please try again.';

      if (apiError.message) {
        errorMessage = apiError.message;

        if (apiError.message.includes('already exists')) {
          errorMessage = `This email (${employeeData.email}) is already registered. Please use a different email.`;
        } else if (apiError.message.includes('required')) {
          errorMessage = 'Name and Email are required fields.';
        } else if (apiError.message.includes('Failed to add employee')) {
          errorMessage = 'Unable to add employee. Please check your connection and try again.';
        }
      }

      showToast(errorMessage, 'error');
    }
  };

  const handleSaveNote = async () => {
    if (!quickNote.trim()) return;
    setIsSavingNote(true);
    try {
      await addNoteMutation.mutateAsync({ content: quickNote.trim() });
      showToast("Note saved successfully!", "success");
      setQuickNote('');
    } catch (error) {
      console.error('Error saving note:', error);
      showToast("Failed to save note", "error");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingNoteId(noteId);
    try {
      await deleteNoteMutation.mutateAsync(noteId);
      showToast("Note deleted", "success");
    } catch (error) {
      console.error('Error deleting note:', error);
      showToast("Failed to delete note", "error");
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleTogglePin = async (noteId: string) => {
    try {
      await togglePinMutation.mutateAsync(noteId);
    } catch (error) {
      console.error('Error toggling pin:', error);
      showToast("Failed to pin note", "error");
    }
  };

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card-light dark:bg-card-dark p-6 rounded-xl border border-border-light dark:border-border-dark">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Content Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card-light dark:bg-card-dark p-6 rounded-xl border border-border-light dark:border-border-dark">
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
      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      <div className="space-y-6 animate-fade-in pb-8">
        {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">HR Overview</h1>
          <p className="text-sm sm:text-base text-text-muted-light dark:text-text-muted-dark mt-1">Welcome back, {user?.name?.split(' ')[0]}. Here's what's happening today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark font-medium rounded-lg text-sm border border-border-light dark:border-border-dark shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <CheckCircle2 size={18} className="text-accent-green" />
            Approve Leave
            {pendingRequests.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{pendingRequests.length}</span>}
          </button>
          <button
            onClick={() => navigate('/onboarding')}
            className="flex items-center gap-2 px-4 py-2.5 bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark font-medium rounded-lg text-sm border border-border-light dark:border-border-dark shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Rocket size={18} className="text-accent-teal" />
            Initiate Onboarding
          </button>
          <button
            onClick={() => setIsAddEmployeeModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary-hover transition-colors"
          >
            <UserPlus size={18} />
            Add Employee
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div onClick={() => navigate('/employees')} className="cursor-pointer">
          <StatCard
            title="Active Employees"
            value={activeEmployeesCount}
            trend={2.5}
            icon={<Briefcase size={22} />}
            color="primary"
          />
        </div>
        <div onClick={() => navigate('/employees?status=On Leave')} className="cursor-pointer">
          <StatCard
            title="On Leave"
            value={onLeaveCount}
            icon={<UserMinus size={22} />}
            color="orange"
          />
        </div>
        <div onClick={() => navigate('/onboarding')} className="cursor-pointer">
          <StatCard
            title="New Hires (Month)"
            value={newHiresCount}
            trend={newHiresTrend}
            icon={<UserPlus size={22} />}
            color="green"
          />
        </div>
        <div onClick={() => navigate('/analytics')} className="cursor-pointer">
          <StatCard
            title="Turnover Rate"
            value={`${turnoverRate.toFixed(1)}%`}
            trend={turnoverTrend}
            icon={<TrendingUp size={22} />}
            color="red"
          />
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Headcount Chart - Spans 2 columns on desktop, full width on mobile */}
        <div className="md:col-span-2 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 md:p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Users size={18} className="md:w-5 md:h-5" />
              </div>
              <h2 className="text-base md:text-lg font-bold text-text-light dark:text-text-dark">Headcount Trends</h2>
            </div>
            <button className="text-text-muted-light hover:text-primary hidden md:block"><MoreHorizontal size={20} /></button>
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
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    cursor={{ stroke: '#3498db', strokeWidth: 1, strokeDasharray: '5 5' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3498db" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-text-muted-light dark:text-text-muted-dark">
                <Users size={40} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">No headcount data available</p>
                <p className="text-xs mt-1 opacity-70">Data will appear once employee records are added</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Birthdays / Events */}
        <div className="md:col-span-1 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm h-fit">
          <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-2 md:gap-3">
              <h2 className="text-base md:text-lg font-semibold text-text-light dark:text-text-dark">Events</h2>
            </div>
            <button onClick={() => navigate('/wellbeing')} className="text-xs text-primary font-medium hover:underline">View All</button>
          </div>
          <div className="p-3 md:p-4">
            {upcomingEvents.length > 0 ? (
              <ul className="space-y-4">
                {upcomingEvents.slice(0, 3).map(event => (
                  <li key={event.id} className="flex items-center gap-4">
                    {event.avatar ? (
                      <Avatar src={event.avatar} name={event.title} size="lg" className="ring-2 ring-white dark:ring-background-dark" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${event.type === 'Meeting' ? 'bg-accent-teal/10 text-accent-teal' : 'bg-primary/10 text-primary'
                        }`}>
                        {event.type === 'Meeting' ? <CalendarIcon size={18} /> : <Utensils size={18} />}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm text-text-light dark:text-text-dark leading-tight">{event.title}</p>
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5 flex items-center gap-1">
                        {event.type === 'Birthday' && <Cake size={12} className="text-accent-red" />}
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-text-muted-light dark:text-text-muted-dark">
                <CalendarIcon size={32} className="mb-2 opacity-20" />
                <p className="text-sm">No upcoming events</p>
              </div>
            )}
          </div>
        </div>

        {/* Onboarding Progress Widget */}
        <div className="md:col-span-1 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm h-fit">
          <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-2 md:gap-3">
              <h2 className="text-base md:text-lg font-semibold text-text-light dark:text-text-dark">Onboarding</h2>
            </div>
            <button onClick={() => navigate('/onboarding')} className="text-xs text-primary font-medium hover:underline">View All</button>
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
              {onboardingSummary.length === 0 && <li className="text-text-muted-light text-sm italic">No active onboarding.</li>}
            </ul>
          </div>
        </div>

        {/* Pending Leave Requests */}
        <div className="lg:col-span-2 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Pending Leave Requests</h2>
            </div>
            <span className="text-xs bg-accent-orange/10 text-accent-orange px-2 py-1 rounded-full">{pendingRequests.length} pending</span>
          </div>
          <div className="p-4 flex-grow">
            {pendingRequests.length > 0 ? (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-border-light dark:divide-border-dark">
                      {pendingRequests.map(req => (
                        <tr key={req.id}>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <Avatar src={req.avatar} name={req.employeeName} size="md" />
                              <span className="font-medium text-text-light dark:text-text-dark">{req.employeeName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-text-muted-light dark:text-text-muted-dark">{req.type}</td>
                          <td className="py-3 px-4 text-text-muted-light dark:text-text-muted-dark">{req.dates}</td>
                          <td className="py-3 pl-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => handleApproveLeave(req.id, e)}
                                className="px-3 py-1 text-xs font-medium text-accent-green bg-accent-green/10 rounded-full hover:bg-accent-green/20 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={(e) => handleDeclineLeave(req.id, e)}
                                className="px-3 py-1 text-xs font-medium text-accent-red bg-accent-red/10 rounded-full hover:bg-accent-red/20 transition-colors"
                              >
                                Decline
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
                    <div key={req.id} className="p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark">
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar src={req.avatar} name={req.employeeName} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">{req.employeeName}</p>
                          <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{req.type} · {req.dates}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleApproveLeave(req.id, e)}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-accent-green bg-accent-green/10 rounded-lg hover:bg-accent-green/20 transition-colors text-center"
                        >
                          Approve
                        </button>
                        <button
                          onClick={(e) => handleDeclineLeave(req.id, e)}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-accent-red bg-accent-red/10 rounded-lg hover:bg-accent-red/20 transition-colors text-center"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-text-muted-light dark:text-text-muted-dark">
                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-30" />
                <p>All caught up! No pending requests.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity & Notes */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
            <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Recent Activity</h2>
              </div>
            </div>
            <div className="p-4 space-y-4 max-h-[280px] overflow-y-auto flex-grow">
              {auditLogsData.length > 0 ? (
                <>
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
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-text-muted-light dark:text-text-muted-dark">
                  <Activity size={32} className="mb-2 opacity-20" />
                  <p className="text-sm">No recent activity</p>
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
                <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Notes</h2>
              </div>
              {notesData.length > 0 && (
                <span className="text-[10px] text-text-muted-light dark:text-text-muted-dark">{notesData.length} saved</span>
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
                  placeholder="Write a quick note..."
                  className="w-full min-h-[70px] px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm text-text-light dark:text-text-dark placeholder:text-text-muted-light transition-colors"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-text-muted-light dark:text-text-muted-dark">{quickNote.length} chars</span>
                  <button
                    onClick={handleSaveNote}
                    disabled={isSavingNote || !quickNote.trim()}
                    className={`flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-hover transition-colors font-medium ${isSavingNote || !quickNote.trim() ? 'opacity-40 cursor-not-allowed' : 'shadow-sm'}`}
                  >
                    <Send size={12} />
                    {isSavingNote ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              {notesData.length > 0 && (
                <div className="mt-3 pt-2 border-t border-border-light dark:border-border-dark">
                  <p className="text-[10px] font-medium text-text-muted-light dark:text-text-muted-dark mb-1.5 uppercase tracking-wide">Recent</p>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {notesData.slice(0, 3).map(note => (
                      <div
                        key={note.id}
                        className={`group flex items-center gap-2 py-1 px-1 rounded cursor-pointer transition-colors ${
                          note.pinned ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                        }`}
                        onClick={() => setQuickNote(note.content)}
                      >
                        {note.pinned ? (
                          <Pin size={10} className="flex-shrink-0 text-amber-500 fill-amber-500" />
                        ) : (
                          <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-border-light dark:bg-border-dark"></div>
                        )}
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark truncate group-hover:text-primary transition-colors">
                          {note.content.substring(0, 40)}{note.content.length > 40 ? '...' : ''}
                        </p>
                        <div className="flex-shrink-0 ml-auto flex items-center gap-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTogglePin(note.id); }}
                            className={`p-0.5 rounded transition-all ${
                              note.pinned
                                ? 'text-amber-500 opacity-100'
                                : 'text-text-muted-light hover:text-amber-500 opacity-0 group-hover:opacity-100'
                            }`}
                            title={note.pinned ? 'Unpin note' : 'Pin note'}
                          >
                            <Pin size={10} className={note.pinned ? 'fill-amber-500' : ''} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                            disabled={deletingNoteId === note.id}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 text-text-muted-light hover:text-red-500 transition-all"
                            title="Delete note"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
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

      {/* Leave Management Modal (Admin View of Requests) */}
      <LeaveManagementModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        pendingRequests={pendingRequests}
        onApprove={handleApproveLeave}
        onDecline={handleDeclineLeave}
      />

      </div>
    </>
  );
};
