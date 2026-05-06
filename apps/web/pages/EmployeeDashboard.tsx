import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plane,
  Palmtree,
  Wallet,
  Clock,
  StickyNote,
  Megaphone,
  MessageSquare,
  Pin,
  Send,
  Trash2,
  Calendar as CalendarIcon,
  Cake,
  PartyPopper,
  GraduationCap,
  Flag,
  Building2,
  DollarSign,
} from 'lucide-react';
import { Toast } from '../components/Toast';
import { LeaveGanttCalendar } from '../components/LeaveGanttCalendar';
import { Avatar } from '../components/Avatar';
import { StatusIndicator } from '../components/StatusIndicator';
import { useUserStatus } from '../contexts/UserStatusContext';
import { useAuth } from '../contexts/AuthContext';
import { useLeave } from '../contexts/LeaveContext';
import { Employee, UpcomingEvent } from '../types';
import {
  useAllEmployees,
  useAnnouncements,
  useAttendanceToday,
  useDashboardEmployeeStats,
  useMyTeamHierarchy,
  useNotes,
  useAddNote,
  useDeleteNote,
  useToggleNotePin,
  useClockIn,
  useClockOut,
  useUpcomingEvents,
  useExpenseClaims,
  useAttendanceGPSConfig,
} from '../hooks/queries';
import { WFHRequestModal } from '../components/WFHRequestModal';
import { LocationPermissionModal } from '../components/LocationPermissionModal';
import { queryKeys } from '../lib/queryKeys';
import { translateLeaveType } from '../lib/leaveTypeConfig';

export const EmployeeDashboard: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const { user } = useAuth();
  const { getStatus, getStatusMessage } = useUserStatus();
  const { requests } = useLeave();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const myLeaveRequests = requests.filter(r => r.employeeName === user?.name);
  const myLeaves = useMemo(() => requests.filter(r => r.employeeId === user?.employeeId), [requests, user?.employeeId]);
  const teamLeaves = useMemo(() => requests.filter(r => r.employeeId !== user?.employeeId), [requests, user?.employeeId]);

  // ----- REACT QUERY HOOKS -----
  const { data: expenseClaims = [] } = useExpenseClaims();
  const myExpenses = useMemo(() =>
    expenseClaims.filter(e => e.employeeId === user?.employeeId),
    [expenseClaims, user?.employeeId]
  );

  // Merge leave requests + expense claims into unified "my requests"
  const myRequests = useMemo(() => {
    const leaveItems = myLeaveRequests.map(r => ({
      id: r.id,
      kind: 'leave' as const,
      label: translateLeaveType(r.type),
      subtitle: r.dates,
      status: r.status,
      createdAt: r.updatedAt || r.startDate || '',
    }));
    const expenseItems = myExpenses.map(e => ({
      id: e.id,
      kind: 'expense' as const,
      label: e.title,
      subtitle: `฿${e.amount.toLocaleString()} · ${e.category}`,
      status: e.status,
      createdAt: e.createdAt || e.expenseDate || '',
    }));
    return [...leaveItems, ...expenseItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [myLeaveRequests, myExpenses]);

  const { data: allEmployees = [] } = useAllEmployees();

  // Department team members for team calendar
  const departmentTeam = useMemo(() => {
    if (!allEmployees.length) return [];
    const currentEmployee = allEmployees.find(e => e.id === user?.employeeId || e.email === user?.email);
    if (!currentEmployee?.department) return allEmployees.filter(e => e.status !== 'Terminated');
    return allEmployees.filter(e => e.department === currentEmployee.department && e.status !== 'Terminated');
  }, [allEmployees, user?.employeeId, user?.email]);

  const { data: announcementsData = [] } = useAnnouncements();
  const { data: attendanceStatus } = useAttendanceToday(true);
  const { data: employeeStatsData } = useDashboardEmployeeStats(true);
  const { data: teamHierarchyData } = useMyTeamHierarchy(true);
  const { data: notesData = [] } = useNotes();
  const { data: eventsData = [] } = useUpcomingEvents();
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();
  const { data: gpsConfig } = useAttendanceGPSConfig();
  const addNoteMutation = useAddNote();
  const deleteNoteMutation = useDeleteNote();
  const togglePinMutation = useToggleNotePin();

  // ----- DERIVED DATA -----
  const employeeStats = employeeStatsData ?? { leaveBalance: 0, nextPayday: null, pendingReviews: 0, pendingSurveys: 0 };
  const teamHierarchy = teamHierarchyData ?? null;

  // ----- STATE -----
  const [quickNote, setQuickNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [locationModal, setLocationModal] = useState<{ show: boolean; mode: 'request' | 'denied' }>({ show: false, mode: 'request' });
  const [showWFHModal, setShowWFHModal] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ show: true, message, type });
  };

  // ----- COMPUTED MY TEAM -----
  const myTeam = useMemo<Employee[]>(() => {
    if (teamHierarchy) {
      const teamMembers = teamHierarchy.directReports.length > 0
        ? teamHierarchy.directReports
        : teamHierarchy.peers;
      return teamMembers.map(m => ({
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
      }));
    }

    const currentEmployee = allEmployees.find((employee) => employee.email === user?.email);
    const department = currentEmployee?.department || 'Product';
    return allEmployees.filter((employee) => employee.department === department && employee.id !== user?.id).slice(0, 3);
  }, [teamHierarchy, allEmployees, user?.email, user?.id]);


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
  const doClockIn = async (position?: GeolocationPosition) => {
    try {
      await clockInMutation.mutateAsync({
        latitude: position?.coords.latitude,
        longitude: position?.coords.longitude,
        accuracy: position?.coords.accuracy,
      });
      showToast(t('dashboard:employee.checkedIn'), 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      if (message.includes('Already clocked in') || message.includes('already checked in')) {
        showToast(t('dashboard:employee.alreadyCheckedIn'), 'info');
        queryClient.invalidateQueries({ queryKey: queryKeys.attendance.today() });
      } else {
        showToast(message, 'error');
      }
    } finally {
      setIsClockingIn(false);
    }
  };

  const executeGetPosition = () => {
    setIsClockingIn(true);
    navigator.geolocation.getCurrentPosition(
      doClockIn,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setIsClockingIn(false);
          setLocationModal({ show: true, mode: 'denied' });
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          // No GPS hardware (desktop/PC) — let backend validate via office IP allowlist
          doClockIn(undefined);
        } else {
          // TIMEOUT — retry once with cached position allowed
          navigator.geolocation.getCurrentPosition(
            doClockIn,
            () => {
              showToast('Could not get your location. Please try again.', 'error');
              setIsClockingIn(false);
            },
            { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false }
          );
        }
      },
      { timeout: 8000, maximumAge: 0, enableHighAccuracy: false }
    );
  };

  const handleClockAction = async () => {
    const isClockedIn = attendanceStatus?.clockIn && !attendanceStatus?.clockOut;

    if (isClockedIn) {
      setIsClockingIn(true);
      try {
        await clockOutMutation.mutateAsync();
        showToast(t('dashboard:employee.checkedOut'), 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An error occurred';
        showToast(message, 'error');
      } finally {
        setIsClockingIn(false);
      }
      return;
    }

    const gpsRequired = gpsConfig?.gpsRequired === 'true';

    if (!gpsRequired) {
      setIsClockingIn(true);
      try {
        await clockInMutation.mutateAsync({});
        showToast(t('dashboard:employee.checkedIn'), 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An error occurred';
        if (message.includes('Already clocked in') || message.includes('already checked in')) {
          showToast(t('dashboard:employee.alreadyCheckedIn'), 'info');
          queryClient.invalidateQueries({ queryKey: queryKeys.attendance.today() });
        } else {
          showToast(message, 'error');
        }
      } finally {
        setIsClockingIn(false);
      }
      return;
    }

    if (!navigator.geolocation) {
      showToast('GPS is not supported on this device', 'error');
      return;
    }

    // Check current permission state without triggering native prompt
    if ('permissions' in navigator) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        if (status.state === 'denied') {
          setLocationModal({ show: true, mode: 'denied' });
          return;
        }
        if (status.state === 'prompt') {
          setLocationModal({ show: true, mode: 'request' });
          return;
        }
        // 'granted' — proceed directly, no dialog needed
      } catch {
        // permissions API unavailable — fall through to native prompt
      }
    }

    executeGetPosition();
  };

  const handleSaveNote = async () => {
    if (!quickNote.trim()) return;
    setIsSavingNote(true);
    try {
      await addNoteMutation.mutateAsync({ content: quickNote.trim() });
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

      {showWFHModal && (
        <WFHRequestModal
          onClose={() => setShowWFHModal(false)}
          onSuccess={(msg) => { showToast(msg, 'success'); setShowWFHModal(false); }}
        />
      )}

      {locationModal.show && (
        <LocationPermissionModal
          mode={locationModal.mode}
          onAllow={() => {
            setLocationModal({ show: false, mode: 'request' });
            executeGetPosition();
          }}
          onDismiss={() => setLocationModal({ show: false, mode: 'request' })}
        />
      )}

      <div className="space-y-6 animate-fade-in pb-8">
        {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">{t('dashboard:employee.greeting', { name: user?.name?.split(' ')[0] })}</h1>
          <p className="text-sm sm:text-base text-text-muted-light dark:text-text-muted-dark mt-1">{t('dashboard:employee.pendingRequests', { count: myRequests.filter(r => r.status === 'Pending').length })}</p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
          {/* Attendance Status Badge */}
          {attendanceStatus?.clockIn && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
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
                    ? (attendanceStatus.autoCheckout ? t('dashboard:employee.autoCheckout') : t('dashboard:employee.completed'))
                    : attendanceStatus.status === 'Late'
                    ? t('dashboard:employee.workingLate')
                    : t('dashboard:employee.working')}
                </span>
              </div>
              {attendanceStatus.checkInType && attendanceStatus.checkInType !== 'office' && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  attendanceStatus.checkInType === 'wfh'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                    : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                }`}>
                  {attendanceStatus.checkInType === 'wfh' ? 'WFH' : 'Remote'}
                </span>
              )}
            </div>
          )}

          {/* Check In/Out + WFH request buttons */}
          <div className="flex items-center gap-2">
            {!attendanceStatus?.clockIn && (
              <button
                onClick={() => setShowWFHModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-muted-light dark:text-text-muted-dark border border-border-light dark:border-border-dark rounded-lg hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400 transition-all"
              >
                <Building2 size={15} />
                WFH
              </button>
            )}
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
                ? (attendanceStatus?.clockIn ? t('common:buttons.loading') : 'Getting GPS...')
                : attendanceStatus?.clockIn && !attendanceStatus?.clockOut
                ? t('dashboard:employee.checkOut')
                : attendanceStatus?.clockOut
                ? t('dashboard:employee.doneForToday')
                : t('dashboard:employee.checkIn')}
            </button>
          </div>
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
          <span className="font-medium text-text-light dark:text-text-dark">{t('dashboard:employee.timeOff')}</span>
        </button>
        <button
          onClick={() => navigate('/expenses')}
          className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
        >
          <div className="p-2 bg-accent-green/10 text-accent-green rounded-lg group-hover:bg-accent-green group-hover:text-white transition-colors">
            <DollarSign size={20} />
          </div>
          <span className="font-medium text-text-light dark:text-text-dark">{t('common:nav.expenses')}</span>
        </button>
        <button
          onClick={() => navigate('/surveys')}
          className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
        >
          <div className="p-2 bg-accent-orange/10 text-accent-orange rounded-lg group-hover:bg-accent-orange group-hover:text-white transition-colors">
            <MessageSquare size={20} />
          </div>
          <span className="font-medium text-text-light dark:text-text-dark">{t('dashboard:employee.surveys')}</span>
        </button>
        <button
          onClick={() => navigate('/payroll')}
          className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
        >
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-500 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
            <Wallet size={20} />
          </div>
          <span className="font-medium text-text-light dark:text-text-dark">{t('common:nav.payroll')}</span>
        </button>
      </div>

      {/* Employee Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 sm:p-6 shadow-sm flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/time-off')}>
          <div>
            <p className="text-text-muted-light dark:text-text-muted-dark text-xs sm:text-sm font-medium mb-1">{t('dashboard:employee.leaveBalance')}</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">{employeeStats.leaveBalance} <span className="text-xs sm:text-sm font-normal text-text-muted-light">{t('dashboard:employee.daysUnit')}</span></h3>
          </div>
          <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg">
            <Plane size={20} className="sm:w-6 sm:h-6" />
          </div>
        </div>
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 sm:p-6 shadow-sm flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/payroll')}>
          <div>
            <p className="text-text-muted-light dark:text-text-muted-dark text-xs sm:text-sm font-medium mb-1">{t('dashboard:employee.nextPayday')}</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">{employeeStats.nextPayday ? new Date(employeeStats.nextPayday + 'T00:00:00').toLocaleDateString(i18n.language === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric' }) : '—'}</h3>
          </div>
          <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-lg">
            <Wallet size={20} className="sm:w-6 sm:h-6" />
          </div>
        </div>
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 sm:p-6 shadow-sm flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/surveys')}>
          <div>
            <p className="text-text-muted-light dark:text-text-muted-dark text-xs sm:text-sm font-medium mb-1">{t('dashboard:employee.pendingSurveys')}</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">{employeeStats.pendingSurveys}</h3>
          </div>
          <div className="p-2 sm:p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-lg">
            <MessageSquare size={20} className="sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Leave Gantt Calendar */}
      <LeaveGanttCalendar
        userLeaves={myLeaves}
        teamLeaves={teamLeaves}
        allEmployees={departmentTeam}
        isManager={false}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* My Tasks */}
        <div className="lg:col-span-2 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{t('dashboard:employee.myRecentRequests')}</h2>
            <button onClick={() => navigate('/time-off')} className="text-xs text-primary font-medium hover:underline">{t('common:buttons.viewAll')}</button>
          </div>
          <div className="p-4 space-y-3">
            {myRequests.length > 0 ? (
              myRequests.slice(0, 4).map(req => {
                const statusColor = req.status === 'Approved' || req.status === 'Reimbursed'
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  : req.status === 'Rejected' || req.status === 'Cancelled'
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
                const badgeColor = req.status === 'Approved' || req.status === 'Reimbursed'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : req.status === 'Rejected' || req.status === 'Cancelled'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
                return (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${statusColor}`}>
                        {req.kind === 'expense' ? <DollarSign size={18} /> : <Plane size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-light dark:text-text-dark">{req.label}</p>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{req.subtitle}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${badgeColor}`}>
                      {t(`common:status.${req.status === 'Cancel Requested' ? 'cancelRequested' : req.status === 'In Progress' ? 'inProgress' : req.status.toLowerCase()}`, { defaultValue: req.status })}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-text-muted-light">{t('dashboard:employee.noRequestsYet')}</div>
            )}
          </div>
        </div>

        {/* My Team */}
        <div className="lg:col-span-1 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{t('dashboard:employee.myTeam')}</h2>
            {teamHierarchy?.stats && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {teamHierarchy.stats.totalDirectReports > 0
                  ? t('dashboard:employee.reports', { count: teamHierarchy.stats.totalDirectReports })
                  : t('dashboard:employee.peers', { count: teamHierarchy.stats.peersCount })}
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            {/* Manager info */}
            {teamHierarchy?.manager && (
              <div className="flex items-center gap-3 pb-3 border-b border-border-light dark:border-border-dark">
                <div className="relative">
                  <Avatar
                    src={teamHierarchy.manager.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(teamHierarchy.manager.name)}&background=random`}
                    name={teamHierarchy.manager.name}
                    size="lg"
                  />
                  <StatusIndicator
                    status={getStatus(teamHierarchy.manager.id)}
                    statusMessage={getStatusMessage(teamHierarchy.manager.id)}
                    showTooltip
                    size="sm"
                    className="absolute -bottom-0.5 -right-0.5"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-light dark:text-text-dark">{teamHierarchy.manager.name}</p>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{teamHierarchy.manager.role}</p>
                </div>
                <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded font-medium">{t('dashboard:employee.manager')}</span>
              </div>
            )}

            {/* Team members */}
            {myTeam.map(teammate => (
              <div key={teammate.id} className="flex items-center gap-3">
                <div className="relative">
                  <Avatar src={teammate.avatar} name={teammate.name} size="lg" />
                  <StatusIndicator
                    status={getStatus(teammate.id)}
                    statusMessage={getStatusMessage(teammate.id)}
                    showTooltip
                    size="sm"
                    className="absolute -bottom-0.5 -right-0.5"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-light dark:text-text-dark">{teammate.name}</p>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{teammate.role}</p>
                </div>
              </div>
            ))}
            {myTeam.length === 0 && !teamHierarchy?.manager && (
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark text-center py-2">{t('dashboard:employee.noTeamMembers')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Events, Announcements & Personal Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                <CalendarIcon size={16} />
              </div>
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{t('dashboard:admin.events')}</h2>
            </div>
            <button onClick={() => navigate('/wellbeing')} className="text-xs text-primary font-medium hover:underline">{t('common:buttons.viewAll')}</button>
          </div>
          <div className="p-4 flex-grow flex flex-col">
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 4).map(event => (
                  <div key={event.id} className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark">
                    {event.avatar ? (
                      <Avatar src={event.avatar} name={event.title} size="lg" className="ring-2 ring-white dark:ring-background-dark" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
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
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-text-light dark:text-text-dark truncate">{event.title}</p>
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-text-muted-light dark:text-text-muted-dark">
                <CalendarIcon size={28} className="mb-2 opacity-20" />
                <p className="text-sm">{t('dashboard:admin.noUpcomingEvents')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Latest Announcements */}
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg">
                <Megaphone size={16} />
              </div>
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{t('dashboard:employee.announcements')}</h2>
            </div>
            <button onClick={() => navigate('/wellbeing')} className="text-xs text-primary font-medium hover:underline">{t('common:buttons.viewAll')}</button>
          </div>
          <div className="p-4 space-y-3 flex-grow flex flex-col">
            {announcementsData.length > 0 ? (
              announcementsData.slice(0, 3).map(ann => (
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
              <div className="flex flex-col items-center justify-center flex-1 text-text-muted-light dark:text-text-muted-dark">
                <Megaphone size={28} className="mb-2 opacity-20" />
                <p className="text-sm">{t('dashboard:employee.noAnnouncements')}</p>
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
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{t('dashboard:employee.personalNotes')}</h2>
            </div>
            {notesData.length > 0 && (
              <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('dashboard:admin.saved', { count: notesData.length })}</span>
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
                placeholder={t('dashboard:employee.writeNote')}
                className="w-full h-20 px-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm text-text-light dark:text-text-dark placeholder:text-text-muted-light transition-colors"
              />
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-text-muted-light dark:text-text-muted-dark">{t('dashboard:admin.chars', { count: quickNote.length })}</span>
                <button
                  onClick={handleSaveNote}
                  disabled={isSavingNote || !quickNote.trim()}
                  className={`flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-hover transition-colors font-medium ${isSavingNote || !quickNote.trim() ? 'opacity-40 cursor-not-allowed' : 'shadow-sm'}`}
                >
                  <Send size={12} />
                  {isSavingNote ? t('common:buttons.saving') : t('dashboard:employee.saveNote')}
                </button>
              </div>
            </div>

            {/* Recent notes list */}
            {notesData.length > 0 && (
              <div className="flex-grow">
                <p className="text-xs font-medium text-text-muted-light dark:text-text-muted-dark mb-2 uppercase tracking-wide">{t('dashboard:admin.recent')}</p>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {notesData.slice(0, 5).map(note => (
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
                          title={note.pinned ? t('dashboard:admin.unpinNote') : t('dashboard:admin.pinNote')}
                        >
                          <Pin size={12} className={note.pinned ? 'fill-amber-500' : ''} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                          disabled={deletingNoteId === note.id}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-text-muted-light hover:text-red-500 transition-all rounded"
                          title={t('dashboard:admin.deleteNote')}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {notesData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-4 text-text-muted-light dark:text-text-muted-dark">
                <StickyNote size={24} className="mb-1.5 opacity-20" />
                <p className="text-xs">{t('dashboard:employee.noNotes')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
};
