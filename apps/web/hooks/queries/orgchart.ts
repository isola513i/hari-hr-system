import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import type { OrgNode, MyTeamHierarchy } from '../../types';

export const useOrgChart = () => {
  return useQuery({
    queryKey: queryKeys.orgChart.tree(),
    queryFn: () => api.get<OrgNode[]>('/org-chart'),
  });
};

export const useOrgSubtree = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.orgChart.subtree(employeeId!),
    queryFn: () => api.get<OrgNode[]>(`/org-chart/subtree/${employeeId}`),
    enabled: !!employeeId,
  });
};

export const useMyTeamHierarchy = (enabled: boolean) => {
  return useQuery({
    queryKey: queryKeys.dashboard.teamHierarchy(),
    queryFn: () => api.get<MyTeamHierarchy>('/dashboard/my-team-hierarchy'),
    enabled,
  });
};

export const useAddOrgNode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/employees', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
      qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
    },
  });
};

export const useUpdateOrgNode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/employees/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
      qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
    },
  });
};

export const useDeleteOrgNode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
      qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
    },
  });
};
