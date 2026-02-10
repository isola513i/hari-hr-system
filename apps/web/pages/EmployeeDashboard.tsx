import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plane,
  Palmtree,
  FileText,
  Wallet,
  Clock,
  StickyNote,
  Megaphone,
  Pin,
  Send,
  Trash2
} from 'lucide-react';
import { Toast, Avatar } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useLeave } from '../contexts/LeaveContext';
import type { Employee } from '@hari/shared-types';
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
} from '../hooks/queries';
import { queryKeys } from '../lib/queryKeys';

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const { requests } = useLeave();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const myRequests = requests.filter(r => r.employeeName === user?.name);

  // ----- REACT QUERY HOOKS -----
  const { data: allEmployees = [] } = useAllEmployees();
  const { data: announcementsData = [] } = useAnnouncements();
  const { data: attendanceStatus } = useAttendanceToday(true);
  const { data: employeeStatsData } = useDashboardEmployeeStats(true);
  const { data: teamHierarchyData } = useMyTeamHierarchy(true);
  const { data: notesData = [] } = useNotes();
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();
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


  // ----- HANDLERS -----
  const handleClockAction = async () => {
    setIsClockingIn(true);
    try {
      const isClockedIn = attendanceStatus?.clockIn && !attendanceStatus?.clockOut;

      if (isClockedIn) {
        await clockOutMutation.mutateAsync();
        showToast('Checked out successfully!', 'success');
      } else {
        await clockInMutation.mutateAsync();
        showToast('Checked in successfully!', 'success');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';

      if (message.includes('Already clocked in') || message.includes('already checked in')) {
        showToast('You have already checked in today', 'info');
        queryClient.invalidateQueries({ queryKey: queryKeys.attendance.today() });
      } else {
        showToast(message, 'error');
      }
    } finally {
      setIsClockingIn(false);
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
        {/* Surveys - Hidden until implemented */}
        {/* <button
          onClick={() => navigate('/surveys')}
          className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
        >
          <div className="p-2 bg-accent-orange/10 text-accent-orange rounded-lg group-hover:bg-accent-orange group-hover:text-white transition-colors">
            <MessageSquare size={20} />
          </div>
          <span className="font-medium text-text-light dark:text-text-dark">Surveys</span>
        </button> */}
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
                <Avatar src={teammate.avatar} name={teammate.name} size="lg" />
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
            {notesData.length > 0 && (
              <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{notesData.length} saved</span>
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
            {notesData.length > 0 && (
              <div className="flex-grow">
                <p className="text-xs font-medium text-text-muted-light dark:text-text-muted-dark mb-2 uppercase tracking-wide">Recent</p>
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
            {notesData.length === 0 && (
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
};
