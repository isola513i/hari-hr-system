import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';
import {
  useShiftTemplates,
  useShiftSchedule,
  useCreateShift,
  useUpdateShift,
  useDeleteShift,
  useAssignShift,
  useRemoveAssignment,
  ShiftTemplate,
} from '../hooks/queries';
import { useAllEmployees } from '../hooks/queries';
import { useToast } from '../contexts/ToastContext';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COLORS = ['blue', 'green', 'orange', 'red', 'purple', 'yellow', 'pink'];

const COLOR_STYLES: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  green:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  red:    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  pink:   'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-800',
};

const COLOR_SWATCH: Record<string, string> = {
  blue: 'bg-blue-500', green: 'bg-green-500', orange: 'bg-orange-500',
  red: 'bg-red-500', purple: 'bg-purple-500', yellow: 'bg-yellow-400', pink: 'bg-pink-500',
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toISO(d: Date): string {
  // Use local date parts to avoid UTC offset shifting the date
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ---------------------------------------------------------------------------
// Shift Template Modal
// ---------------------------------------------------------------------------
interface ShiftModalProps {
  initial?: ShiftTemplate | null;
  onClose: () => void;
  onSave: (data: { name: string; startTime: string; endTime: string; color: string }) => void;
  saving: boolean;
}

const ShiftModal: React.FC<ShiftModalProps> = ({ initial, onClose, onSave, saving }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [startTime, setStartTime] = useState(initial?.startTime?.slice(0, 5) ?? '09:00');
  const [endTime, setEndTime] = useState(initial?.endTime?.slice(0, 5) ?? '18:00');
  const [color, setColor] = useState(initial?.color ?? 'blue');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl w-full max-w-md border border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between p-5 border-b border-border-light dark:border-border-dark">
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark">
            {initial ? 'Edit Shift' : 'New Shift'}
          </h2>
          <button onClick={onClose} className="text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Shift Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning Shift"
              className="w-full px-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full ${COLOR_SWATCH[c]} transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors">
            Cancel
          </button>
          <button
            disabled={!name || saving}
            onClick={() => onSave({ name, startTime, endTime, color })}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Assign Modal
// ---------------------------------------------------------------------------
interface AssignModalProps {
  shifts: ShiftTemplate[];
  employees: { id: string; name: string; department: string }[];
  preSelectedEmployee?: string;
  preSelectedDate?: string;
  weekDates: string[];
  onClose: () => void;
  onAssign: (data: { employeeIds: string[]; shiftId: string; dates: string[] }) => void;
  saving: boolean;
}

const AssignModal: React.FC<AssignModalProps> = ({
  shifts, employees, preSelectedEmployee, preSelectedDate, weekDates, onClose, onAssign, saving,
}) => {
  const [shiftId, setShiftId] = useState(shifts[0]?.id ?? '');
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(
    new Set(preSelectedEmployee ? [preSelectedEmployee] : [])
  );
  const [selectedDates, setSelectedDates] = useState<Set<string>>(
    new Set(preSelectedDate ? [preSelectedDate] : [])
  );
  const [empSearch, setEmpSearch] = useState('');

  const toggleEmployee = (id: string) => {
    setSelectedEmployees((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleDate = (d: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl w-full max-w-lg border border-border-light dark:border-border-dark max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border-light dark:border-border-dark flex-shrink-0">
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Assign Shift</h2>
          <button onClick={onClose} className="text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Shift picker */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">Shift</label>
            <div className="flex flex-wrap gap-2">
              {shifts.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setShiftId(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    shiftId === s.id
                      ? COLOR_STYLES[s.color] ?? COLOR_STYLES.blue
                      : 'border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark'
                  }`}
                >
                  {s.name} ({s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)})
                </button>
              ))}
            </div>
          </div>
          {/* Date picker */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">Days</label>
            <div className="flex gap-1.5">
              {weekDates.map((d, i) => {
                const label = DAY_LABELS[i];
                const dayNum = new Date(d + 'T00:00:00').getDate();
                return (
                  <button
                    key={d}
                    onClick={() => toggleDate(d)}
                    className={`flex flex-col items-center px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors flex-1 ${
                      selectedDates.has(d)
                        ? 'bg-primary text-white border-primary'
                        : 'border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="font-bold">{dayNum}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Employee picker */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Employees ({selectedEmployees.size} selected)
            </label>
            <input
              type="text"
              placeholder="Search employees…"
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm mb-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="max-h-48 overflow-y-auto space-y-1 border border-border-light dark:border-border-dark rounded-lg p-2">
              {employees
                .filter((emp) => !empSearch || emp.name.toLowerCase().includes(empSearch.toLowerCase()) || emp.department.toLowerCase().includes(empSearch.toLowerCase()))
                .map((emp) => (
                  <label key={emp.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-background-light dark:hover:bg-background-dark cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.has(emp.id)}
                      onChange={() => toggleEmployee(emp.id)}
                      className="rounded"
                    />
                    <span className="text-sm text-text-light dark:text-text-dark">{emp.name}</span>
                    <span className="text-xs text-text-muted-light dark:text-text-muted-dark ml-auto">{emp.department}</span>
                  </label>
                ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5 flex-shrink-0 border-t border-border-light dark:border-border-dark pt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors">
            Cancel
          </button>
          <button
            disabled={!shiftId || selectedEmployees.size === 0 || selectedDates.size === 0 || saving}
            onClick={() => onAssign({ employeeIds: [...selectedEmployees], shiftId, dates: [...selectedDates] })}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export const ShiftManagement: React.FC = () => {
  const { showToast } = useToast();
  const [tab, setTab] = useState<'shifts' | 'schedule'>('schedule');
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [department, setDepartment] = useState('All');

  const [shiftModal, setShiftModal] = useState<{ open: boolean; editing: ShiftTemplate | null }>({ open: false, editing: null });
  const [assignModal, setAssignModal] = useState<{ open: boolean; preEmp?: string; preDate?: string }>({ open: false });
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const [deleteShiftConfirm, setDeleteShiftConfirm] = useState<string | null>(null);

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => toISO(addDays(weekStart, i))), [weekStart]);
  const startDate = weekDates[0] ?? '';
  const endDate = weekDates[6] ?? '';

  const { data: shifts = [] } = useShiftTemplates();
  const { data: schedule = [], isLoading: scheduleLoading } = useShiftSchedule(startDate, endDate, department);
  const { data: allEmployees = [] } = useAllEmployees();

  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();
  const assignShift = useAssignShift();
  const removeAssignment = useRemoveAssignment();

  const departments = useMemo(() => {
    const depts = [...new Set(allEmployees.map((e) => e.department).filter(Boolean))].sort();
    return ['All', ...depts];
  }, [allEmployees]);

  const activeEmployees = useMemo(() =>
    allEmployees
      .filter((e) => e.status === 'Active' && (department === 'All' || e.department === department))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [allEmployees, department]
  );

  // Build lookup: employeeId+date → assignment
  const assignmentMap = useMemo(() => {
    const map = new Map<string, typeof schedule[0]>();
    for (const a of schedule) {
      map.set(`${a.employeeId}:${a.date}`, a);
    }
    return map;
  }, [schedule]);

  const handleSaveShift = async (data: { name: string; startTime: string; endTime: string; color: string }) => {
    try {
      if (shiftModal.editing) {
        await updateShift.mutateAsync({ id: shiftModal.editing.id, ...data });
        showToast('Shift updated', 'success');
      } else {
        await createShift.mutateAsync(data);
        showToast('Shift created', 'success');
      }
      setShiftModal({ open: false, editing: null });
    } catch {
      showToast('Failed to save shift', 'error');
    }
  };

  const handleDeleteShift = async (id: string) => {
    try {
      await deleteShift.mutateAsync(id);
      showToast('Shift deactivated', 'success');
      setDeleteShiftConfirm(null);
    } catch {
      showToast('Failed to delete shift', 'error');
    }
  };

  const handleAssign = async (data: { employeeIds: string[]; shiftId: string; dates: string[] }) => {
    try {
      await assignShift.mutateAsync(data);
      showToast('Shift assigned', 'success');
      setAssignModal({ open: false });
    } catch {
      showToast('Failed to assign shift', 'error');
    }
  };

  const handleRemove = async (assignmentId: string) => {
    try {
      await removeAssignment.mutateAsync(assignmentId);
      showToast('Assignment removed', 'success');
      setRemoveConfirm(null);
    } catch {
      showToast('Failed to remove assignment', 'error');
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CalendarClock size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Shift Management</h1>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Define shifts and manage employee schedules</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-background-light dark:bg-background-dark rounded-lg p-1 w-fit">
        {(['schedule', 'shifts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
              tab === t
                ? 'bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark shadow-sm'
                : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark'
            }`}
          >
            {t === 'schedule' ? 'Weekly Schedule' : 'Shift Templates'}
          </button>
        ))}
      </div>

      {/* ===== TAB: Shift Templates ===== */}
      {tab === 'shifts' && (
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between p-5 border-b border-border-light dark:border-border-dark">
            <h2 className="font-bold text-text-light dark:text-text-dark">Shift Templates</h2>
            <button
              onClick={() => setShiftModal({ open: true, editing: null })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus size={15} /> Add Shift
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Hours</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Color</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {shifts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-text-muted-light dark:text-text-muted-dark">
                      <CalendarClock size={36} className="mx-auto mb-3 opacity-20" />
                      <p>No shifts defined yet. Click "Add Shift" to create one.</p>
                    </td>
                  </tr>
                ) : (
                  shifts.map((s) => (
                    <tr key={s.id} className="hover:bg-background-light dark:hover:bg-background-dark/30 transition-colors">
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${COLOR_STYLES[s.color] ?? COLOR_STYLES.blue}`}>
                          {s.name}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-text-muted-light dark:text-text-muted-dark font-mono text-xs">
                        {s.startTime.slice(0, 5)} – {s.endTime.slice(0, 5)}
                      </td>
                      <td className="px-5 py-3">
                        <div className={`w-5 h-5 rounded-full ${COLOR_SWATCH[s.color] ?? 'bg-gray-400'}`} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1 min-w-[120px]">
                          {deleteShiftConfirm === s.id ? (
                            <>
                              <span className="text-xs text-red-600 dark:text-red-400 mr-1 whitespace-nowrap">Deactivate?</span>
                              <button
                                onClick={() => handleDeleteShift(s.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                title="Confirm"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteShiftConfirm(null)}
                                className="p-1.5 text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark rounded transition-colors"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setShiftModal({ open: true, editing: s })}
                                className="p-1.5 text-text-muted-light dark:text-text-muted-dark hover:text-primary hover:bg-primary/10 rounded transition-colors"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteShiftConfirm(s.id)}
                                className="p-1.5 text-text-muted-light dark:text-text-muted-dark hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== TAB: Weekly Schedule ===== */}
      {tab === 'schedule' && shifts.length === 0 && (
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-dashed border-border-light dark:border-border-dark p-12 text-center">
          <CalendarClock size={40} className="mx-auto mb-4 text-text-muted-light dark:text-text-muted-dark opacity-30" />
          <p className="text-text-light dark:text-text-dark font-medium mb-1">No shifts defined yet</p>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-4">Create shift templates before assigning employees to a schedule.</p>
          <button
            onClick={() => setTab('shifts')}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Go to Shift Templates
          </button>
        </div>
      )}
      {tab === 'schedule' && shifts.length > 0 && (
        <div className="space-y-3">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Week navigator */}
            <div className="flex items-center gap-2 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg px-3 py-1.5">
              <button
                onClick={() => setWeekStart((w) => addDays(w, -7))}
                className="p-1 text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium text-text-light dark:text-text-dark min-w-[160px] text-center">
                {formatWeekRange(weekStart)}
              </span>
              <button
                onClick={() => setWeekStart((w) => addDays(w, 7))}
                className="p-1 text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            {/* Today */}
            <button
              onClick={() => setWeekStart(getWeekStart(new Date()))}
              className="px-3 py-1.5 text-sm font-medium border border-border-light dark:border-border-dark rounded-lg text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors"
            >
              This Week
            </button>
            {/* Department filter */}
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="py-1.5 px-3 text-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none"
            >
              {departments.map((d) => <option key={d} value={d}>{d === 'All' ? 'All departments' : d}</option>)}
            </select>
            <button
              onClick={() => setAssignModal({ open: true })}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus size={15} /> Assign Shift
            </button>
          </div>

          {/* Grid */}
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider w-44">Employee</th>
                    {weekDates.map((d, i) => {
                      const isToday = d === toISO(new Date());
                      const isWeekend = i >= 5;
                      return (
                        <th key={d} className={`px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider ${isToday ? 'text-primary' : isWeekend ? 'text-text-muted-light/60 dark:text-text-muted-dark/60' : 'text-text-muted-light dark:text-text-muted-dark'}`}>
                          <div>{DAY_LABELS[i]}</div>
                          <div className={`text-sm font-bold mt-0.5 ${isToday ? 'bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center mx-auto' : ''}`}>
                            {new Date(d + 'T00:00:00').getDate()}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {scheduleLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3"><div className="h-4 w-28 bg-background-light dark:bg-background-dark rounded animate-pulse" /></td>
                        {weekDates.map((d) => <td key={d} className="px-2 py-3"><div className="h-7 bg-background-light dark:bg-background-dark rounded animate-pulse" /></td>)}
                      </tr>
                    ))
                  ) : activeEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-text-muted-light dark:text-text-muted-dark">
                        No employees found for this department.
                      </td>
                    </tr>
                  ) : (
                    activeEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-background-light dark:hover:bg-background-dark/20 transition-colors">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-primary">
                                {emp.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-xs font-medium text-text-light dark:text-text-dark truncate max-w-[100px]" title={emp.name}>{emp.name}</span>
                          </div>
                        </td>
                        {weekDates.map((date, di) => {
                          const isWeekend = di >= 5;
                          const assignment = assignmentMap.get(`${emp.id}:${date}`);
                          return (
                            <td key={date} className={`px-1.5 py-2 text-center ${isWeekend ? 'bg-background-light/50 dark:bg-background-dark/30' : ''}`}>
                              {assignment ? (
                                <div className="relative group">
                                  {removeConfirm === assignment.assignmentId ? (
                                    <div className="flex items-center gap-1 justify-center">
                                      <button
                                        onClick={() => handleRemove(assignment.assignmentId)}
                                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                        title="Confirm remove"
                                      >
                                        <Check size={12} />
                                      </button>
                                      <button
                                        onClick={() => setRemoveConfirm(null)}
                                        className="p-1 text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark rounded"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setRemoveConfirm(assignment.assignmentId)}
                                      className={`w-full px-1.5 py-1 rounded text-xs font-medium border truncate max-w-full ${COLOR_STYLES[assignment.color] ?? COLOR_STYLES.blue}`}
                                      title={`${assignment.shiftName} (${assignment.startTime}–${assignment.endTime}) — click to remove`}
                                    >
                                      {assignment.shiftName}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => setAssignModal({ open: true, preEmp: emp.id, preDate: date })}
                                  className="w-full h-7 border border-dashed border-border-light dark:border-border-dark rounded text-text-muted-light dark:text-text-muted-dark hover:border-primary hover:text-primary transition-colors flex items-center justify-center"
                                  title="Assign shift"
                                >
                                  <Plus size={12} />
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          {shifts.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {shifts.map((s) => (
                <span key={s.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${COLOR_STYLES[s.color] ?? COLOR_STYLES.blue}`}>
                  <span>{s.name}</span>
                  <span className="opacity-70">{s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {shiftModal.open && (
        <ShiftModal
          initial={shiftModal.editing}
          onClose={() => setShiftModal({ open: false, editing: null })}
          onSave={handleSaveShift}
          saving={createShift.isPending || updateShift.isPending}
        />
      )}

      {assignModal.open && (
        <AssignModal
          shifts={shifts}
          employees={activeEmployees}
          preSelectedEmployee={assignModal.preEmp}
          preSelectedDate={assignModal.preDate}
          weekDates={weekDates}
          onClose={() => setAssignModal({ open: false })}
          onAssign={handleAssign}
          saving={assignShift.isPending}
        />
      )}
    </div>
  );
};
