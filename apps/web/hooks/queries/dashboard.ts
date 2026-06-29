import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import type { ChartDataPoint } from '../../types';

interface EmployeeStats {
  leaveBalance: number;
  nextPayday: string | null;
  pendingReviews: number;
  pendingSurveys: number;
}

export const useDashboardEmployeeStats = (enabled: boolean) => {
  return useQuery({
    queryKey: queryKeys.dashboard.employeeStats(),
    queryFn: () => api.get<EmployeeStats>('/dashboard/employee-stats'),
    enabled,
  });
};

interface AdminDashboardStats {
  newHiresCount: number;
  newHiresTrend: number;
  turnoverRate: number;
  turnoverTrend: number;
}

export const useAdminDashboardStats = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.adminStats(),
    queryFn: () => api.get<AdminDashboardStats>('/dashboard/admin-stats'),
  });
};

export interface AnalyticsDashboard {
  headcount: { name: string; value: number }[];
  departments: { name: string; value: number }[];
  attendance: { day: string; onTime: number; late: number; absent: number }[];
  leaveByType: { type: string; requests: number; days: number }[];
  performance: { rating: number; label: string; count: number }[];
  turnover: { name: string; hires: number; departures: number }[];
}

export const useAnalyticsDashboard = (year?: number) => {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard(year),
    queryFn: () => api.get<AnalyticsDashboard>(`/analytics/dashboard${year ? `?year=${year}` : ''}`),
    staleTime: 5 * 60 * 1000,
  });
};

// ── Predictive analytics ────────────────────────────────────────────────────

export interface ForecastPoint {
  month: string;
  name: string;
  value: number;
  lower?: number;
  upper?: number;
}

export interface ForecastResponse {
  history: ForecastPoint[];
  forecast: ForecastPoint[];
  momentum: number;
}

export interface AttritionRiskRow {
  department: string;
  active: number;
  departures: number;
  turnoverRate: number;
  risk: 'low' | 'medium' | 'high';
}

export const useHeadcountForecast = () => {
  return useQuery({
    queryKey: queryKeys.analytics.headcountForecast(),
    queryFn: () => api.get<ForecastResponse>('/analytics/headcount-forecast'),
    staleTime: 5 * 60 * 1000,
  });
};

export const useLeaveForecast = () => {
  return useQuery({
    queryKey: queryKeys.analytics.leaveForecast(),
    queryFn: () => api.get<ForecastResponse>('/analytics/leave-forecast'),
    staleTime: 5 * 60 * 1000,
  });
};

export const useAttritionRisk = () => {
  return useQuery({
    queryKey: queryKeys.analytics.attritionRisk(),
    queryFn: () => api.get<{ departments: AttritionRiskRow[] }>('/analytics/attrition-risk'),
    staleTime: 5 * 60 * 1000,
  });
};

export const useTeamCalendar = (month: string, department?: string) => {
  return useQuery({
    queryKey: queryKeys.teamCalendar.byMonth(month, department),
    queryFn: () => {
      const params = new URLSearchParams({ month });
      if (department) params.set('department', department);
      return api.get<{ month: string; events: any[]; departments: string[] }>(`/calendar/team?${params.toString()}`);
    },
    staleTime: 30000,
  });
};

export const useHeadcountStats = () => {
  return useQuery({
    queryKey: queryKeys.headcount.stats(),
    queryFn: () => api.get<ChartDataPoint[]>('/headcount-stats'),
  });
};
