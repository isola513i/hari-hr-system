import React, { useState, useEffect } from 'react';
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
  Clock,
  Wallet,
  Plane,
  FileText,
  Palmtree,
  MessageSquare,
  Trash2,
  Megaphone,
  Pin,
  Send
} from 'lucide-react';
import { ResponsiveContainer, XAxis, YAxis, AreaChart, Area, Tooltip } from 'recharts';
import { StatCard } from '../components/StatCard';
import { Toast } from '../components/Toast';
import { AddEmployeeModal } from '../components/AddEmployeeModal';
import { LeaveManagementModal } from '../components/LeaveManagementModal';
// Removed constant imports - using API data
import { useAuth } from '../contexts/AuthContext';
import { useLeave } from '../contexts/LeaveContext';
import {
  Employee,
  ChartDataPoint,
  OnboardingProgressSummary,
  UpcomingEvent,
  AuditLogItem,
  Announcement,
  MyTeamHierarchy
} from '../types';
import { api, API_HOST } from '../lib/api';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  // useLeave hook handles fetching from API internally now
  const { requests, updateRequestStatus } = useLeave();
  const navigate = useNavigate();

  // Filter requests for Admin (Pending only) and Employee (Own requests)
  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const myRequests = requests.filter(r => r.employeeName === user?.name);

  // ----- ADMIN STATE -----
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [quickNote, setQuickNote] = useState('');

  // ----- NOTES STATE -----
  interface Note {
    id: string;
    content: string;
    color: string;
    pinned: boolean;
    createdAt: string;
    updatedAt: string;
  }
  const [notes, setNotes] = useState<Note[]>([]);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // ----- LOADING STATE -----
  const [isLoading, setIsLoading] = useState(true);

  // ----- TOAST STATE -----
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ show: true, message, type });
  };

  // ----- STATS STATE -----
  const [activeEmployeesCount, setActiveEmployeesCount] = useState(0);
  const [onLeaveCount, setOnLeaveCount] = useState(0);
  const [newHiresCount, setNewHiresCount] = useState(0);
  const [newHiresTrend, setNewHiresTrend] = useState(0);
  const [turnoverRate, setTurnoverRate] = useState(0);
  const [turnoverTrend, setTurnoverTrend] = useState(0);
  const [myTeam, setMyTeam] = useState<Employee[]>([]);
  const [teamHierarchy, setTeamHierarchy] = useState<MyTeamHierarchy | null>(null);

  // ----- ATTENDANCE STATE -----
  interface AttendanceStatus {
    id?: string;
    clockIn?: string;
    clockOut?: string;
    status?: string;
  }
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null);
  const [isClockingIn, setIsClockingIn] = useState(false);

  // ----- EMPLOYEE STATS STATE -----
  interface EmployeeStats {
    leaveBalance: number;
    nextPayday: string | null;
    pendingReviews: number;
    pendingSurveys: number;
  }
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats>({
    leaveBalance: 0,
    nextPayday: null,
    pendingReviews: 0,
    pendingSurveys: 0,
  });

  // Fetch employee stats from API
  const fetchEmployeeStats = async () => {
    try {
      const stats = await api.get<EmployeeStats>('/dashboard/employee-stats');
      setEmployeeStats(stats);
    } catch (error) {
      console.error('Error fetching employee stats:', error);
    }
  };

  // Fetch my team hierarchy from API
  const fetchMyTeamFromAPI = async () => {
    try {
      const hierarchy = await api.get<MyTeamHierarchy>('/dashboard/my-team-hierarchy');
      setTeamHierarchy(hierarchy);
      // Use direct reports if available (manager view), otherwise peers
      const teamMembers = hierarchy.directReports.length > 0
        ? hierarchy.directReports
        : hierarchy.peers;
      // Map TeamMember to Employee-compatible shape for rendering
      setMyTeam(teamMembers.map(m => ({
        id: m.id,
        name: m.name,
        role: m.role,
        email: m.email,
        avatar: m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random`,
        status: m.status as Employee['status'],
        department: m.department,
        onboardingStatus: 'Completed' as const,
        joinDate: '',
        location: '',
        skills: [],
      })));
    } catch (error) {
      console.error('Error fetching my team:', error);
    }
  };

  // Fetch today's attendance status
  const fetchAttendanceStatus = async () => {
    try {
      const status = await api.get<AttendanceStatus>('/attendance/today');
      setAttendanceStatus(status);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      // If no attendance record for today, set status to null (not checked in yet)
      setAttendanceStatus(null);
    }
  };

  // Handle clock in/out
  const handleClockAction = async () => {
    setIsClockingIn(true);
    try {
      const isClockedIn = attendanceStatus?.clockIn && !attendanceStatus?.clockOut;

      if (isClockedIn) {
        // Clock out
        await api.post('/attendance/clock-out', {});
        showToast('Checked out successfully!', 'success');
      } else {
        // Clock in
        await api.post('/attendance/clock-in', {});
        showToast('Checked in successfully!', 'success');
      }

      // Refresh status
      await fetchAttendanceStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';

      // If already clocked in, refresh status to sync with server
      if (message.includes('Already clocked in') || message.includes('already checked in')) {
        showToast('You have already checked in today', 'info');
        await fetchAttendanceStatus(); // Refresh to show correct status
      } else {
        showToast(message, 'error');
      }
    } finally {
      setIsClockingIn(false);
    }
  };

  // ----- WIDGET STATE (Replacing Constants) -----
  const [headcountData, setHeadcountData] = useState<ChartDataPoint[]>([]);
  const [onboardingSummary, setOnboardingSummary] = useState<OnboardingProgressSummary[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Fetch Data from API (Extracted as reusable function)
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [employeesRaw, auditLogs, headcountStats, eventsRaw, announcements] = await Promise.all([
        api.get<Employee[]>('/employees'),
        api.get<AuditLogItem[]>('/audit-logs'),
        api.get<ChartDataPoint[]>('/headcount-stats'),
        api.get<UpcomingEvent[]>('/upcoming-events').catch(() => []),
        api.get<Announcement[]>('/announcements')
      ]);

      // Transform relative avatar URLs to absolute URLs
      const employees = employeesRaw.map(emp => ({
        ...emp,
        avatar: emp.avatar && emp.avatar.startsWith('/')
          ? `${API_HOST}${emp.avatar}`
          : emp.avatar
      }));

      const events = eventsRaw.map(evt => ({
        ...evt,
        avatar: evt.avatar && evt.avatar.startsWith('/')
          ? `${API_HOST}${evt.avatar}`
          : evt.avatar
      }));

      // Stats
      const activeEmployees = employees.filter((employee) => employee.status === 'Active');
      const onLeaveEmployees = employees.filter((employee) => employee.status === 'On Leave');
      const terminatedEmployees = employees.filter((employee) => employee.status === 'Terminated');

      setActiveEmployeesCount(activeEmployees.length);
      setOnLeaveCount(onLeaveEmployees.length);

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      // Calculate new hires this month
      const newJoinersThisMonth = employees.filter(e => {
        const joinDate = new Date(e.joinDate);
        return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
      }).length;

      // Calculate new hires last month for trend
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const newJoinersLastMonth = employees.filter(e => {
        const joinDate = new Date(e.joinDate);
        return joinDate.getMonth() === lastMonth && joinDate.getFullYear() === lastMonthYear;
      }).length;

      setNewHiresCount(newJoinersThisMonth);

      // Calculate trend percentage for new hires
      const hireTrend = newJoinersLastMonth > 0
        ? ((newJoinersThisMonth - newJoinersLastMonth) / newJoinersLastMonth) * 100
        : newJoinersThisMonth > 0 ? 100 : 0;
      setNewHiresTrend(hireTrend);

      // Calculate turnover rate (terminated / total employees * 100)
      const totalEmployees = employees.length;
      const turnoverRateCalc = totalEmployees > 0
        ? (terminatedEmployees.length / totalEmployees) * 100
        : 0;
      setTurnoverRate(turnoverRateCalc);

      // For trend, compare active employees ratio (simplified)
      // Negative trend is good (less turnover)
      const activeRatio = totalEmployees > 0 ? (activeEmployees.length / totalEmployees) * 100 : 100;
      const turnoverTrendCalc = activeRatio >= 95 ? -0.4 : activeRatio >= 90 ? 0.2 : 0.5;
      setTurnoverTrend(turnoverTrendCalc);

      // My Team (if employee)
      if (user?.role === 'EMPLOYEE') {
        const currentEmployee = employees.find((employee) => employee.email === user?.email);
        const department = currentEmployee?.department || 'Product';
        const teamMembers = employees.filter((employee) => employee.department === department && employee.id !== user?.id).slice(0, 3);
        setMyTeam(teamMembers);
      }

      // Onboarding Summary (Derived)
      const onboarding = employees
        .filter(e => e.onboardingStatus === 'In Progress' || e.onboardingStatus === 'Not Started')
        .map(e => ({
          id: e.id,
          name: e.name,
          role: e.role,
          progress: e.onboardingStatus === 'In Progress' ? 50 : 0, // Simplified: In Progress = 50%, Not Started = 0%
          avatar: e.avatar
        }));
      setOnboardingSummary(onboarding.length ? onboarding : []);

      setAuditLogs(auditLogs);

      // Use headcount stats from API, or generate from employees if empty
      if (headcountStats && headcountStats.length > 0) {
        setHeadcountData(headcountStats);
      } else {
        // Generate headcount data from employees by join month
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const generatedData: ChartDataPoint[] = [];

        // Generate data for last 6 months
        for (let i = 5; i >= 0; i--) {
          // Calculate the target month by subtracting from current date
          const targetDate = new Date(currentYear, currentMonth - i, 1);
          const targetMonth = targetDate.getMonth();
          const targetYear = targetDate.getFullYear();
          const thisMonthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

          const employeesUpToThisMonth = employees.filter(e => {
            // Skip employees without valid joinDate
            if (!e.joinDate) return false;
            const joinDate = new Date(e.joinDate);
            // Check if the date is valid
            if (isNaN(joinDate.getTime())) return false;
            // Count employees who joined on or before end of target month and are not terminated
            return joinDate <= thisMonthEnd && e.status !== 'Terminated';
          }).length;

          generatedData.push({
            name: monthNames[targetMonth],
            value: employeesUpToThisMonth
          });
        }

        setHeadcountData(generatedData);
      }

      setUpcomingEvents(events);
      setAnnouncements(announcements);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.role, user?.email, user?.id]);

  // Fetch attendance status and employee stats on mount (for employees)
  useEffect(() => {
    if (user?.role === 'EMPLOYEE') {
      fetchAttendanceStatus();
      fetchEmployeeStats();
      fetchMyTeamFromAPI();
    }
  }, [user?.role]);

  // Fetch notes on mount (for all users)
  useEffect(() => {
    fetchNotes();
  }, []);


  // ----- NOTES HANDLERS -----
  const fetchNotes = async () => {
    try {
      const fetchedNotes = await api.get<Note[]>('/notes');
      setNotes(fetchedNotes);
      // If there are notes, show the most recent one in the textarea
      if (fetchedNotes.length > 0) {
        // Show pinned note first, or most recent
        const pinnedNote = fetchedNotes.find(n => n.pinned);
        setQuickNote(pinnedNote?.content || fetchedNotes[0]?.content || '');
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const handleSaveNote = async () => {
    if (!quickNote.trim()) return;
    setIsSavingNote(true);
    try {
      await api.post('/notes', { content: quickNote.trim() });
      showToast("Note saved successfully!", "success");
      setQuickNote('');
      // Refresh notes list
      fetchNotes();
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
      await api.delete(`/notes/${noteId}`);
      fetchNotes();
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
      await api.post(`/notes/${noteId}/toggle-pin`, {});
      fetchNotes();
    } catch (error) {
      console.error('Error toggling pin:', error);
      showToast("Failed to pin note", "error");
    }
  };

  // ----- ADMIN HANDLERS -----
  const handleApproveLeave = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateRequestStatus(id, 'Approved');
  };

  const handleDeclineLeave = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateRequestStatus(id, 'Rejected');
  };


  /**
   * Handles adding a new employee
   * Called from AddEmployeeModal component
   */
  const handleAddEmployee = async (employeeData: {
    name: string;
    role: string;
    department: string;
    email: string;
    joinDate: string;
  }) => {
    try {
      // Prepare payload matching API expectations
      const payload = {
        ...employeeData,
        managerId: null
      };

      // Call API to add employee
      await api.post('/employees', payload);

      // Success: Close modal
      setIsAddEmployeeModalOpen(false);

      // Refetch dashboard data to show new employee
      fetchData();

      // Show success message
      showToast(`Successfully added ${employeeData.name} to the system!`, 'success');

    } catch (error) {
      const apiError = error as Error;
      console.error('Error adding employee:', apiError);

      // Parse error message from API
      let errorMessage = 'Failed to add employee. Please try again.';

      if (apiError.message) {
        // Backend returns clear error messages
        errorMessage = apiError.message;

        // Make some messages more user-friendly
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

  // =========================================================================
  // EMPLOYEE DASHBOARD RENDER
  // =========================================================================
  if (user?.role === 'EMPLOYEE') {
    // myTeam state is populated by effect

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
          {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">Good Morning, {user?.name?.split(' ')[0]}</h1>
            <p className="text-sm sm:text-base text-text-muted-light dark:text-text-muted-dark mt-1">You have {myRequests.filter(r => r.status === 'Pending').length} pending leave requests.</p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
            {/* Attendance Status Badge */}
            {attendanceStatus?.clockIn && (
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  attendanceStatus.clockOut
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : attendanceStatus.status === 'Late'
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    attendanceStatus.clockOut
                      ? 'bg-green-500'
                      : attendanceStatus.status === 'Late'
                      ? 'bg-orange-500 animate-pulse'
                      : 'bg-blue-500 animate-pulse'
                  }`}></div>
                  <span>
                    {attendanceStatus.clockOut
                      ? 'Completed'
                      : attendanceStatus.status === 'Late'
                      ? 'Working (Late)'
                      : 'Working'}
                  </span>
                </div>
              </div>
            )}

            {/* Check In/Out Button */}
            <button
              onClick={handleClockAction}
              disabled={isClockingIn || !!(attendanceStatus?.clockIn && attendanceStatus?.clockOut)}
              className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg text-sm shadow-sm transition-all ${
                attendanceStatus?.clockIn && !attendanceStatus?.clockOut
                  ? 'bg-accent-orange text-white hover:bg-accent-orange/90 hover:shadow-md'
                  : attendanceStatus?.clockOut
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90 hover:shadow-md'
              } ${isClockingIn ? 'opacity-70 cursor-wait' : ''}`}
            >
              <Clock size={18} />
              {isClockingIn
                ? 'Loading...'
                : attendanceStatus?.clockIn && !attendanceStatus?.clockOut
                ? 'Check Out'
                : attendanceStatus?.clockOut
                ? 'Done for today'
                : 'Check In'}
            </button>
          </div>
        </div>

        {/* Quick Actions for Employee */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/time-off')}
            className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
          >
            <div className="p-2 bg-accent-teal/10 text-accent-teal rounded-lg group-hover:bg-accent-teal group-hover:text-white transition-colors">
              <Palmtree size={20} />
            </div>
            <span className="font-medium text-text-light dark:text-text-dark">Time Off</span>
          </button>
          {/* Expenses - Hidden until implemented */}
          {/* <button
            onClick={() => navigate('/expenses')}
            className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
          >
            <div className="p-2 bg-accent-green/10 text-accent-green rounded-lg group-hover:bg-accent-green group-hover:text-white transition-colors">
              <DollarSign size={20} />
            </div>
            <span className="font-medium text-text-light dark:text-text-dark">Expenses</span>
          </button> */}
          <button
            onClick={() => navigate('/surveys')}
            className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
          >
            <div className="p-2 bg-accent-orange/10 text-accent-orange rounded-lg group-hover:bg-accent-orange group-hover:text-white transition-colors">
              <MessageSquare size={20} />
            </div>
            <span className="font-medium text-text-light dark:text-text-dark">Surveys</span>
          </button>
        </div>

        {/* Employee Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 sm:p-6 shadow-sm flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/time-off')}>
            <div>
              <p className="text-text-muted-light dark:text-text-muted-dark text-xs sm:text-sm font-medium mb-1">Leave Balance</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">{employeeStats.leaveBalance} <span className="text-xs sm:text-sm font-normal text-text-muted-light">Days</span></h3>
            </div>
            <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg">
              <Plane size={20} className="sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 sm:p-6 shadow-sm flex items-center justify-between relative opacity-60">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-text-muted-light dark:text-text-muted-dark text-xs sm:text-sm font-medium">Next Payday</p>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">WIP</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">{employeeStats.nextPayday || '—'}</h3>
            </div>
            <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-lg">
              <Wallet size={20} className="sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 sm:p-6 shadow-sm flex items-center justify-between relative opacity-60">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-text-muted-light dark:text-text-muted-dark text-xs sm:text-sm font-medium">Pending Reviews</p>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">WIP</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">{employeeStats.pendingReviews}</h3>
            </div>
            <div className="p-2 sm:p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-lg">
              <FileText size={20} className="sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* My Tasks */}
          <div className="lg:col-span-2 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
            <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">My Recent Requests</h2>
              <button onClick={() => navigate('/time-off')} className="text-xs text-primary font-medium hover:underline">View All</button>
            </div>
            <div className="p-4 space-y-3">
              {myRequests.length > 0 ? (
                myRequests.slice(0, 4).map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${req.status === 'Approved' ? 'bg-green-100 text-green-600' : req.status === 'Rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        <Plane size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-light dark:text-text-dark">{req.type}</p>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{req.dates}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                      req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                      {req.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-text-muted-light">No requests made yet.</div>
              )}
            </div>
          </div>

          {/* My Team */}
          <div className="lg:col-span-1 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
            <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">My Team</h2>
              {teamHierarchy?.stats && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {teamHierarchy.stats.totalDirectReports > 0
                    ? `${teamHierarchy.stats.totalDirectReports} reports`
                    : `${teamHierarchy.stats.peersCount} peers`}
                </span>
              )}
            </div>
            <div className="p-4 space-y-3">
              {/* Manager info */}
              {teamHierarchy?.manager && (
                <div className="flex items-center gap-3 pb-3 border-b border-border-light dark:border-border-dark">
                  <img
                    src={
                      teamHierarchy.manager.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(teamHierarchy.manager.name)}&background=random`
                    }
                    alt={teamHierarchy.manager.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-medium text-text-light dark:text-text-dark">{teamHierarchy.manager.name}</p>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{teamHierarchy.manager.role}</p>
                  </div>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded font-medium">Manager</span>
                </div>
              )}

              {/* Team members */}
              {myTeam.map(teammate => (
                <div key={teammate.id} className="flex items-center gap-3">
                  <img src={teammate.avatar} alt={teammate.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-medium text-text-light dark:text-text-dark">{teammate.name}</p>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{teammate.role}</p>
                  </div>
                  <span className={`ml-auto w-2.5 h-2.5 rounded-full ${teammate.status === 'Active' ? 'bg-green-500' : 'bg-yellow-500'}`} title={teammate.status}></span>
                </div>
              ))}
              {myTeam.length === 0 && !teamHierarchy?.manager && (
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark text-center py-2">No team members found</p>
              )}
            </div>
          </div>
        </div>

        {/* Announcements & Personal Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latest Announcements */}
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
            <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg">
                  <Megaphone size={16} />
                </div>
                <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Announcements</h2>
              </div>
              <button onClick={() => navigate('/wellbeing')} className="text-xs text-primary font-medium hover:underline">View All</button>
            </div>
            <div className="p-4 space-y-3 flex-grow">
              {announcements.length > 0 ? (
                announcements.slice(0, 3).map(ann => (
                  <div key={ann.id} className="p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide ${
                        ann.type === 'announcement' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        ann.type === 'policy' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                      }`}>
                        {ann.type}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-text-light dark:text-text-dark mb-0.5">{ann.title}</p>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark line-clamp-2 leading-relaxed">{ann.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-text-muted-light dark:text-text-muted-dark">
                      {ann.author && (
                        <span className="flex items-center gap-1">
                          <Users size={10} />
                          {ann.author}
                        </span>
                      )}
                      {ann.author && ann.createdAt && <span>·</span>}
                      {ann.createdAt && (
                        <span>{new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-text-muted-light dark:text-text-muted-dark">
                  <Megaphone size={28} className="mb-2 opacity-20" />
                  <p className="text-sm">No announcements yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Personal Notes */}
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
            <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-lg">
                  <StickyNote size={16} />
                </div>
                <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Personal Notes</h2>
              </div>
              {notes.length > 0 && (
                <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{notes.length} saved</span>
              )}
            </div>
            <div className="p-4 flex-grow flex flex-col gap-3">
              {/* Note input */}
              <div className="relative">
                <label htmlFor="employeeNote" className="sr-only">Personal Note</label>
                <textarea
                  id="employeeNote"
                  name="employeeNote"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Write a note..."
                  className="w-full h-20 px-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm text-text-light dark:text-text-dark placeholder:text-text-muted-light transition-colors"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-text-muted-light dark:text-text-muted-dark">{quickNote.length} chars</span>
                  <button
                    onClick={handleSaveNote}
                    disabled={isSavingNote || !quickNote.trim()}
                    className={`flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-hover transition-colors font-medium ${isSavingNote || !quickNote.trim() ? 'opacity-40 cursor-not-allowed' : 'shadow-sm'}`}
                  >
                    <Send size={12} />
                    {isSavingNote ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              </div>

              {/* Recent notes list */}
              {notes.length > 0 && (
                <div className="flex-grow">
                  <p className="text-xs font-medium text-text-muted-light dark:text-text-muted-dark mb-2 uppercase tracking-wide">Recent</p>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {notes.slice(0, 5).map(note => (
                      <div
                        key={note.id}
                        className={`group flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          note.pinned
                            ? 'bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30'
                            : 'hover:bg-background-light dark:hover:bg-background-dark'
                        }`}
                        onClick={() => setQuickNote(note.content)}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {note.pinned ? (
                            <Pin size={12} className="text-amber-500 fill-amber-500" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-border-light dark:bg-border-dark mt-1"></div>
                          )}
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="text-xs text-text-light dark:text-text-dark truncate group-hover:text-primary transition-colors">
                            {note.content.substring(0, 60)}{note.content.length > 60 ? '...' : ''}
                          </p>
                          {note.createdAt && (
                            <p className="text-[10px] text-text-muted-light dark:text-text-muted-dark mt-0.5">
                              {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTogglePin(note.id); }}
                            className={`p-1 rounded transition-all ${
                              note.pinned
                                ? 'text-amber-500 opacity-100'
                                : 'text-text-muted-light hover:text-amber-500 opacity-0 group-hover:opacity-100'
                            }`}
                            title={note.pinned ? 'Unpin note' : 'Pin note'}
                          >
                            <Pin size={12} className={note.pinned ? 'fill-amber-500' : ''} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                            disabled={deletingNoteId === note.id}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-text-muted-light hover:text-red-500 transition-all rounded"
                            title="Delete note"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {notes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-4 text-text-muted-light dark:text-text-muted-dark">
                  <StickyNote size={24} className="mb-1.5 opacity-20" />
                  <p className="text-xs">No notes yet. Start writing!</p>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </>
    );
  }

  // =========================================================================
  // ADMIN DASHBOARD RENDER (Existing Logic)
  // =========================================================================

  // State calculated in top-level effect

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
          <div className="h-[200px] md:h-[250px] w-full flex-grow">
            {headcountData && headcountData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={150}>
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
        <div className="md:col-span-1 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-2 md:gap-3">
              <h2 className="text-base md:text-lg font-semibold text-text-light dark:text-text-dark">Events</h2>
            </div>
            <button onClick={() => navigate('/wellbeing')} className="text-xs text-primary font-medium hover:underline">View All</button>
          </div>
          <div className="p-3 md:p-4 flex-grow">
            {upcomingEvents.length > 0 ? (
              <ul className="space-y-4">
                {upcomingEvents.slice(0, 3).map(event => (
                  <li key={event.id} className="flex items-center gap-4">
                    {event.avatar ? (
                      <img src={event.avatar} alt={event.title} className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-background-dark" />
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
        <div className="md:col-span-1 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-2 md:gap-3">
              <h2 className="text-base md:text-lg font-semibold text-text-light dark:text-text-dark">Onboarding</h2>
            </div>
            <button onClick={() => navigate('/onboarding')} className="text-xs text-primary font-medium hover:underline">View All</button>
          </div>
          <div className="p-3 md:p-4 flex-grow">
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
                              <img src={req.avatar} alt={req.employeeName} className="w-8 h-8 rounded-full object-cover" />
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
                        <img src={req.avatar} alt={req.employeeName} className="w-8 h-8 rounded-full object-cover" />
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
              {auditLogs.length > 0 ? (
                <>
                  {auditLogs.slice(0, 4).map(log => (
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
              {notes.length > 0 && (
                <span className="text-[10px] text-text-muted-light dark:text-text-muted-dark">{notes.length} saved</span>
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
              {notes.length > 0 && (
                <div className="mt-3 pt-2 border-t border-border-light dark:border-border-dark">
                  <p className="text-[10px] font-medium text-text-muted-light dark:text-text-muted-dark mb-1.5 uppercase tracking-wide">Recent</p>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {notes.slice(0, 3).map(note => (
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