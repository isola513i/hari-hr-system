import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { LeaveGanttCalendar } from '../components/LeaveGanttCalendar';
import { useUserStatus } from '../contexts/UserStatusContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
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
  useUpdateNote,
  useDeleteNote,
  useToggleNotePin,
  useClockIn,
  useClockOut,
  useUpcomingEvents,
  useExpenseClaims,
  useAttendanceGPSConfig,
  useMyOTRequests,
} from '../hooks/queries';
import { WFHRequestModal } from '../components/WFHRequestModal';
import { OTRequestModal } from '../components/OTRequestModal';
import { AttendanceRegularizationModal } from '../components/AttendanceRegularizationModal';
import { LocationPermissionModal } from '../components/LocationPermissionModal';
import { queryKeys } from '../lib/queryKeys';
import { translateLeaveType } from '../lib/leaveTypeConfig';
import {
  DashboardHeader,
  EmployeeQuickActions,
  EmployeeStatsCards,
  MyRecentRequests,
  MyTeamCard,
  UpcomingEventsCard,
  AnnouncementsCard,
  PersonalNotesCard,
  MyOTRequestsCard,
} from '../components/employee-dashboard';

export const EmployeeDashboard: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { user } = useAuth();
  const { showToast } = useToast();
  const { getStatus, getStatusMessage } = useUserStatus();
  const { requests } = useLeave();
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
  const { data: teamHierarchyData, isPending: isTeamLoading } = useMyTeamHierarchy(true);
  const { data: notesData = [] } = useNotes();
  const { data: eventsData = [] } = useUpcomingEvents();
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();
  const { data: gpsConfig } = useAttendanceGPSConfig();
  const { data: myOTRequests = [] } = useMyOTRequests();
  const addNoteMutation = useAddNote();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();
  const togglePinMutation = useToggleNotePin();

  // ----- DERIVED DATA -----
  const employeeStats = employeeStatsData ?? { leaveBalance: 0, nextPayday: null, pendingReviews: 0, pendingSurveys: 0 };
  const teamHierarchy = teamHierarchyData ?? null;

  // ----- STATE -----
  const [quickNote, setQuickNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [deleteConfirmNoteId, setDeleteConfirmNoteId] = useState<string | null>(null);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [locationModal, setLocationModal] = useState<{ show: boolean; mode: 'request' | 'denied' }>({ show: false, mode: 'request' });
  const [showWFHModal, setShowWFHModal] = useState(false);
  const [showOTModal, setShowOTModal] = useState(false);
  const [showRegModal, setShowRegModal] = useState(false);

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
              showToast(t('dashboard:employee.locationError'), 'error');
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
      showToast(t('dashboard:employee.gpsNotSupported'), 'error');
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

  return (
    <>
      {showWFHModal && (
        <WFHRequestModal
          onClose={() => setShowWFHModal(false)}
          onSuccess={(msg) => { showToast(msg, 'success'); setShowWFHModal(false); }}
        />
      )}

      {showOTModal && (
        <OTRequestModal
          onClose={() => setShowOTModal(false)}
          onSuccess={(msg) => { showToast(msg, 'success'); setShowOTModal(false); }}
        />
      )}

      {showRegModal && (
        <AttendanceRegularizationModal
          onClose={() => setShowRegModal(false)}
          onSuccess={(msg) => { showToast(msg, 'success'); setShowRegModal(false); }}
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
      <DashboardHeader
        userName={user?.name}
        pendingRequestsCount={myRequests.filter(r => r.status === 'Pending').length}
        attendanceStatus={attendanceStatus}
        isClockingIn={isClockingIn}
        onClockAction={handleClockAction}
        onRequestCorrection={() => setShowRegModal(true)}
        onRequestWFH={() => setShowWFHModal(true)}
      />

      {/* Quick Actions for Employee */}
      <EmployeeQuickActions />

      {/* Employee Stats */}
      <EmployeeStatsCards employeeStats={employeeStats} />

      {/* Leave Gantt Calendar */}
      <LeaveGanttCalendar
        userLeaves={myLeaves}
        teamLeaves={teamLeaves}
        allEmployees={departmentTeam}
        isManager={false}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* My Tasks */}
        <MyRecentRequests myRequests={myRequests} />

        {/* My Team */}
        <MyTeamCard
          teamHierarchy={teamHierarchy}
          myTeam={myTeam}
          isTeamLoading={isTeamLoading}
          getStatus={getStatus}
          getStatusMessage={getStatusMessage}
        />
      </div>

      {/* Events, Announcements & Personal Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <UpcomingEventsCard upcomingEvents={upcomingEvents} />

        {/* Latest Announcements */}
        <AnnouncementsCard announcementsData={announcementsData} />

        {/* Personal Notes */}
        <PersonalNotesCard
          notesData={notesData}
          quickNote={quickNote}
          setQuickNote={setQuickNote}
          isSavingNote={isSavingNote}
          editingNoteId={editingNoteId}
          setEditingNoteId={setEditingNoteId}
          deletingNoteId={deletingNoteId}
          deleteConfirmNoteId={deleteConfirmNoteId}
          setDeleteConfirmNoteId={setDeleteConfirmNoteId}
          onSaveNote={handleSaveNote}
          onDeleteNote={handleDeleteNote}
          onTogglePin={handleTogglePin}
        />
      </div>

      {/* My OT Requests */}
      <MyOTRequestsCard myOTRequests={myOTRequests} onRequestOT={() => setShowOTModal(true)} />
      </div>
    </>
  );
};
