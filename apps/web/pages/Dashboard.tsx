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
  DollarSign,
  Palmtree,
  MessageSquare
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
  Announcement
} from '../types';
import { api } from '../lib/api';

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
  const [myTeam, setMyTeam] = useState<Employee[]>([]);

  // ----- WIDGET STATE (Replacing Constants) -----
  const [headcountData, setHeadcountData] = useState<ChartDataPoint[]>([]);
  const [onboardingSummary, setOnboardingSummary] = useState<OnboardingProgressSummary[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Fetch Data from API (Extracted as reusable function)
  const fetchData = async () => {
    try {
      const [employees, auditLogs, headcountStats, events, announcements] = await Promise.all([
        api.get<Employee[]>('/employees'),
        api.get<AuditLogItem[]>('/audit-logs'),
        api.get<ChartDataPoint[]>('/headcount-stats'),
        api.get<UpcomingEvent[]>('/events'),
        api.get<Announcement[]>('/announcements')
      ]);

      // Stats
      setActiveEmployeesCount(employees.filter((employee) => employee.status === 'Active').length);
      setOnLeaveCount(employees.filter((employee) => employee.status === 'On Leave').length);

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      const newJoiners = employees.filter(e => {
        const joinDate = new Date(e.joinDate);
        return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
      }).length;
      setNewHiresCount(newJoiners);

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
      setHeadcountData(headcountStats);
      setUpcomingEvents(events);
      setAnnouncements(announcements);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.role, user?.email, user?.id]);


  // ----- SHARED HANDLERS -----
  const handleSaveNote = () => {
    if (!quickNote.trim()) return;
    showToast("Note saved to your personal dashboard.", "success");
    setQuickNote('');
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
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">Good Morning, {user?.name?.split(' ')[0]}</h1>
            <p className="text-text-muted-light dark:text-text-muted-dark mt-1">You have {myRequests.filter(r => r.status === 'Pending').length} pending leave requests.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary/90 transition-colors">
              <Clock size={18} />
              Clock In
            </button>
          </div>
        </div>

        {/* Quick Actions for Employee */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/time-off')}
            className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
          >
            <div className="p-2 bg-accent-teal/10 text-accent-teal rounded-lg group-hover:bg-accent-teal group-hover:text-white transition-colors">
              <Palmtree size={20} />
            </div>
            <span className="font-medium text-text-light dark:text-text-dark">Time Off</span>
          </button>
          <button
            onClick={() => navigate('/expenses')}
            className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
          >
            <div className="p-2 bg-accent-green/10 text-accent-green rounded-lg group-hover:bg-accent-green group-hover:text-white transition-colors">
              <DollarSign size={20} />
            </div>
            <span className="font-medium text-text-light dark:text-text-dark">Expenses</span>
          </button>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/time-off')}>
            <div>
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium mb-1">Leave Balance</p>
              <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">14 <span className="text-sm font-normal text-text-muted-light">Days</span></h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg">
              <Plane size={24} />
            </div>
          </div>
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium mb-1">Next Payday</p>
              <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">Aug 30</h3>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-lg">
              <Wallet size={24} />
            </div>
          </div>
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium mb-1">Pending Reviews</p>
              <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">1</h3>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-lg">
              <FileText size={24} />
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
            </div>
            <div className="p-4 space-y-4">
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
            </div>
          </div>
        </div>

        {/* Announcements (Shared with Admin but read only context) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
            <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Latest Announcements</h2>
            </div>
            <div className="p-4 space-y-4">
              {announcements.slice(0, 2).map(ann => (
                <div key={ann.id} className="pb-3 border-b border-border-light dark:border-border-dark last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-primary mb-1">{ann.title}</p>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark line-clamp-2">{ann.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Personal Quick Note */}
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
            <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Personal Notes</h2>
              <button onClick={handleSaveNote} className="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary-hover">Save</button>
            </div>
            <div className="p-4 flex-grow flex flex-col">
              <textarea
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Jot down a quick idea..."
                className="w-full h-24 bg-transparent resize-none focus:outline-none text-sm text-text-light dark:text-text-dark placeholder:text-text-muted-light"
              />
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
          <h1 className="text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">HR Overview</h1>
          <p className="text-text-muted-light dark:text-text-muted-dark mt-1">Welcome back, {user?.name?.split(' ')[0]}. Here's what's happening today.</p>
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
            trend={newHiresCount > 0 ? 100 : 0}
            icon={<UserPlus size={22} />}
            color="green"
          />
        </div>
        <div onClick={() => navigate('/analytics')} className="cursor-pointer">
          <StatCard
            title="Turnover Rate"
            value="2.1%"
            trend={-0.4}
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
                      {event.date}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
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
          <div className="p-4 flex-grow overflow-x-auto">
            {pendingRequests.length > 0 ? (
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
            <div className="p-4 space-y-4 max-h-[250px] overflow-y-auto">
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
            </div>
          </div>

          {/* Quick Notes */}
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
            <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Quick Note</h2>
              </div>
              <button onClick={handleSaveNote} className="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary-hover">Save</button>
            </div>
            <div className="p-4 flex-grow flex flex-col">
              <textarea
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Type a quick note or task here..."
                className="w-full h-full min-h-[120px] bg-transparent resize-none focus:outline-none text-sm text-text-light dark:text-text-dark placeholder:text-text-muted-light"
              />
              <div className="mt-auto flex justify-between items-center text-xs text-text-muted-light dark:text-text-muted-dark">
                <span className="flex items-center gap-1"><StickyNote size={12} /> Personal</span>
                <span>{quickNote.length} chars</span>
              </div>
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