import React, { useState, useEffect } from 'react';
import { Clock, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AttendanceRecord {
  id: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number | null;
  status: 'Present' | 'Absent' | 'Late' | 'Half-day' | 'Remote';
  notes: string | null;
}

interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  remoteDays: number;
  totalHours: number;
}

const Attendance: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedMonth, selectedYear]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];

      const token = localStorage.getItem('token');

      // Fetch attendance records
      const recordsRes = await fetch(
        `http://localhost:3001/api/attendance/employee/${user?.employeeId}?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (recordsRes.ok) {
        const recordsData = await recordsRes.json();
        setRecords(recordsData);
      }

      // Fetch summary
      const summaryRes = await fetch(
        `http://localhost:3001/api/attendance/employee/${user?.employeeId}/summary?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Late':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'Absent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'Half-day':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Remote':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">
            My Attendance
          </h1>
          <p className="text-sm sm:text-base text-text-muted-light dark:text-text-muted-dark mt-1">
            Track your check-in and check-out history
          </p>
        </div>

        {/* Month/Year Selector */}
        <div className="flex gap-2 sm:gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark text-sm"
          >
            {months.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 sm:px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark text-sm"
          >
            {[2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Total Hours</p>
                <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                  {summary.totalHours.toFixed(1)}h
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Present Days</p>
                <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                  {summary.presentDays}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Late Days</p>
                <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                  {summary.lateDays}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Avg Hours/Day</p>
                <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                  {summary.totalDays > 0 ? (summary.totalHours / summary.totalDays).toFixed(1) : '0'}h
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Records */}
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-border-light dark:border-border-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Check In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Check Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Total Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-text-muted-light dark:text-text-muted-dark">Loading attendance records...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-text-muted-light dark:text-text-muted-dark">No attendance records for this period</td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">{formatDate(record.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">{formatTime(record.clockIn)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">{formatTime(record.clockOut)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">{record.totalHours ? `${record.totalHours.toFixed(1)}h` : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>{record.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4">
          {loading ? (
            <div className="py-8 text-center text-text-muted-light dark:text-text-muted-dark">Loading attendance records...</div>
          ) : records.length === 0 ? (
            <div className="py-8 text-center text-text-muted-light dark:text-text-muted-dark">No attendance records for this period</div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <div key={record.id} className="p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-text-light dark:text-text-dark">{formatDate(record.date)}</p>
                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>{record.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-text-muted-light dark:text-text-muted-dark">In</p>
                      <p className="font-medium text-text-light dark:text-text-dark">{formatTime(record.clockIn)}</p>
                    </div>
                    <div>
                      <p className="text-text-muted-light dark:text-text-muted-dark">Out</p>
                      <p className="font-medium text-text-light dark:text-text-dark">{formatTime(record.clockOut)}</p>
                    </div>
                    <div>
                      <p className="text-text-muted-light dark:text-text-muted-dark">Hours</p>
                      <p className="font-medium text-text-light dark:text-text-dark">{record.totalHours ? `${record.totalHours.toFixed(1)}h` : '-'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
