import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import type { Employee, PaginatedResponse } from '../../types';
import { transformAvatarUrl, EmployeeListFilters } from './_shared';

export const useEmployeeList = (filters: EmployeeListFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.employees.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.department && filters.department !== 'All') params.append('department', filters.department);
      if (filters.status && filters.status !== 'All') params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const qs = params.toString();
      const response = await api.get<PaginatedResponse<Employee>>(qs ? `/employees?${qs}` : '/employees');

      if ('data' in response && 'pagination' in response) {
        return {
          ...response,
          data: response.data.map(transformAvatarUrl),
        };
      }
      // Fallback for non-paginated
      const arr = response as unknown as Employee[];
      return {
        data: arr.map(transformAvatarUrl),
        total: arr.length,
        page: 1,
        limit: arr.length,
        totalPages: 1,
      } as PaginatedResponse<Employee>;
    },
  });
};

export const useAllEmployees = () => {
  return useQuery({
    queryKey: queryKeys.employees.lists(),
    queryFn: async () => {
      const data = await api.get<Employee[]>('/employees');
      return data.map(transformAvatarUrl);
    },
  });
};

export const useEmployeeDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.employees.detail(id!),
    queryFn: () => api.get<Employee & Record<string, unknown>>(`/employees/${id}`),
    enabled: !!id,
  });
};

export const useEmployeeManager = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.employeeManager.byEmployee(id!),
    queryFn: async () => {
      const data = await api.get<Employee>(`/employees/${id}/manager`);
      return data ? transformAvatarUrl(data) : null;
    },
    enabled: !!id,
  });
};

export const useEmployeeDirectReports = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.employeeDirectReports.byEmployee(id!),
    queryFn: async () => {
      const data = await api.get<Employee[]>(`/employees/${id}/direct-reports`);
      return data.map(transformAvatarUrl);
    },
    enabled: !!id,
  });
};

export const useEmployeeSearch = (searchQuery: string) => {
  return useQuery({
    queryKey: [...queryKeys.employees.all, 'search', searchQuery] as const,
    queryFn: async () => {
      const data = await api.get<Employee[]>('/employees');
      if (!searchQuery.trim()) return data.map(transformAvatarUrl);
      const q = searchQuery.toLowerCase();
      return data
        .filter((e) => e.name.toLowerCase().includes(q) || e.department?.toLowerCase().includes(q))
        .map(transformAvatarUrl);
    },
    enabled: true,
    staleTime: 30_000,
  });
};

export const useEmployeeDocuments = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.employeeDocuments.byEmployee(id!),
    queryFn: () => api.get<import('../../types').DocumentItem[]>('/documents'),
    enabled: !!id,
  });
};

export const useAddEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Employee>('/employees', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
      qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
    },
  });
};

export const useUpdateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch<Employee>(`/employees/${id}`, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.employees.lists() });
      qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
    },
  });
};

export const useDeleteEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
      qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
    },
  });
};
