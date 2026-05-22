import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, API_HOST } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import type {
  AdminAttendanceRecord,
  AdminAttendanceSnapshotV2,
  AdminAttendanceUpsertData,
  AdminAttendanceFilters,
  AttendanceAnalytics,
  PaginatedResponse,
} from '../../types';

interface AttendanceStatus {
  id?: string;
  clockIn?: string;
  clockOut?: string;
  status?: string;
  autoCheckout?: boolean;
  checkInType?: string;
  clockInLat?: number | null;
  clockInLng?: number | null;
}

export const useAttendanceToday = (enabled: boolean) => {
  return useQuery({
    queryKey: queryKeys.attendance.today(),
    queryFn: () => api.get<AttendanceStatus>('/attendance/today'),
    enabled,
  });
};

interface AttendanceRecord {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  status: string;
  hoursWorked: number | null;
  totalHours: number | null;
  overtime: number;
  autoCheckout: boolean;
  earlyDeparture: boolean;
  overtimeHours: number | null;
}

export const useAttendanceRecords = (id: string | undefined, month: number, year: number) => {
  return useQuery({
    queryKey: queryKeys.attendance.employee(id!, { month, year }),
    queryFn: () => {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      return api.get<AttendanceRecord[]>(`/attendance/employee/${id}?startDate=${startDate}&endDate=${endDate}`);
    },
    enabled: !!id,
  });
};

interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  averageHours: number;
  overtimeHours: number;
  remoteDays?: number;
  totalHours?: number;
}

export const useAttendanceSummary = (id: string | undefined, month: number, year: number) => {
  return useQuery({
    queryKey: queryKeys.attendance.summary(id!, { month, year }),
    queryFn: () => {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      return api.get<AttendanceSummary>(`/attendance/summary/${id}?startDate=${startDate}&endDate=${endDate}`);
    },
    enabled: !!id,
  });
};

export const useClockIn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload?: { latitude?: number; longitude?: number; accuracy?: number; notes?: string }) =>
      api.post('/attendance/clock-in', payload ?? {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.attendance.all });
    },
  });
};

export const useClockOut = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/attendance/clock-out', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.attendance.all });
    },
  });
};

export const useAdminAttendanceSnapshot = () => {
  return useQuery({
    queryKey: queryKeys.adminAttendance.snapshot(),
    queryFn: () => api.get<AdminAttendanceSnapshotV2>('/admin/attendance/snapshot'),
    refetchInterval: 60_000,
  });
};

export const useAdminAttendanceCalendar = (startDate: string, endDate: string, enabled = true) => {
  return useQuery({
    queryKey: [...queryKeys.adminAttendance.all, 'calendar', startDate, endDate],
    queryFn: () =>
      api.get<{ employeeId: string; date: string }[]>(
        `/admin/attendance/calendar?startDate=${startDate}&endDate=${endDate}`
      ),
    enabled: enabled && !!startDate && !!endDate,
  });
};

export const useAdminAttendanceRecords = (filters: AdminAttendanceFilters, options?: { refetchInterval?: number | false }) => {
  return useQuery({
    queryKey: queryKeys.adminAttendance.records(filters as Record<string, unknown>),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.department && filters.department !== 'All') params.append('department', filters.department);
      if (filters.status && filters.status !== 'All') params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      const qs = params.toString();
      const result = await api.get<PaginatedResponse<AdminAttendanceRecord>>(
        qs ? `/admin/attendance/records?${qs}` : '/admin/attendance/records'
      );
      return {
        ...result,
        data: result.data.map((r: AdminAttendanceRecord) => ({
          ...r,
          employeeAvatar:
            r.employeeAvatar && r.employeeAvatar.startsWith('/')
              ? `${API_HOST}${r.employeeAvatar}`
              : r.employeeAvatar,
        })),
      };
    },
    refetchInterval: options?.refetchInterval,
  });
};

export const useAttendanceAnalytics = (days: number = 14) => {
  return useQuery({
    queryKey: [...queryKeys.adminAttendance.all, 'analytics', days],
    queryFn: () => api.get<AttendanceAnalytics>(`/admin/attendance/analytics?days=${days}`),
    staleTime: 5 * 60_000,
  });
};

export const useAdminUpsertAttendance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminAttendanceUpsertData) =>
      api.put('/admin/attendance/records', data as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminAttendance.all });
      qc.invalidateQueries({ queryKey: queryKeys.attendance.all });
    },
  });
};

export const useAdminDeleteAttendance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/attendance/records/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminAttendance.all });
      qc.invalidateQueries({ queryKey: queryKeys.attendance.all });
    },
  });
};

export interface GPSConfig {
  officeLat: string;
  officeLng: string;
  geofenceRadius: string;
  gpsRequired: string;
  officeIp: string;
}

export const useAttendanceGPSConfig = (enabled = true) =>
  useQuery({
    queryKey: ['configs', 'attendance-gps'],
    enabled,
    queryFn: async () => {
      const configs = await api.get<{ key: string; value: string }[]>('/configs/attendance');
      const map: Record<string, string> = {};
      for (const c of configs) map[c.key] = c.value;
      return {
        officeLat: map['office_lat'] ?? '',
        officeLng: map['office_lng'] ?? '',
        geofenceRadius: map['geofence_radius'] ?? '200',
        gpsRequired: map['gps_required'] ?? 'false',
        officeIp: map['office_ip'] ?? '',
      } as GPSConfig;
    },
  });

export const useUpdateGPSConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: GPSConfig) => {
      await Promise.all([
        api.put('/configs/attendance/office_lat',      { value: config.officeLat } as unknown as Record<string, unknown>),
        api.put('/configs/attendance/office_lng',      { value: config.officeLng } as unknown as Record<string, unknown>),
        api.put('/configs/attendance/geofence_radius', { value: config.geofenceRadius } as unknown as Record<string, unknown>),
        api.put('/configs/attendance/gps_required',    { value: config.gpsRequired } as unknown as Record<string, unknown>),
        api.put('/configs/attendance/office_ip',       { value: config.officeIp } as unknown as Record<string, unknown>),
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configs', 'attendance-gps'] });
    },
  });
};
