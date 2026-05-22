import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';

export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  isActive: boolean;
  createdAt: string;
}

export interface ShiftAssignment {
  assignmentId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  shiftId: string;
  shiftName: string;
  color: string;
  startTime: string;
  endTime: string;
  date: string;
  notes: string | null;
}

export const useShiftTemplates = () => {
  return useQuery({
    queryKey: queryKeys.shifts.templates(),
    queryFn: () => api.get<ShiftTemplate[]>('/shifts'),
  });
};

export const useShiftSchedule = (startDate: string, endDate: string, department?: string) => {
  return useQuery({
    queryKey: queryKeys.shifts.schedule({ startDate, endDate, department }),
    queryFn: () => {
      const params = new URLSearchParams({ startDate, endDate });
      if (department && department !== 'All') params.append('department', department);
      return api.get<ShiftAssignment[]>(`/shifts/schedule?${params.toString()}`);
    },
    enabled: !!startDate && !!endDate,
  });
};

export const useMySchedule = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: queryKeys.shifts.mySchedule({ startDate, endDate }),
    queryFn: () => api.get<ShiftAssignment[]>(`/shifts/my-schedule?startDate=${startDate}&endDate=${endDate}`),
    enabled: !!startDate && !!endDate,
  });
};

export const useCreateShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; startTime: string; endTime: string; color?: string }) =>
      api.post<ShiftTemplate>('/shifts', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.shifts.all }); },
  });
};

export const useUpdateShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; startTime?: string; endTime?: string; color?: string }) =>
      api.put<ShiftTemplate>(`/shifts/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.shifts.all }); },
  });
};

export const useDeleteShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/shifts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.shifts.all }); },
  });
};

export const useAssignShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { employeeIds: string[]; shiftId: string; dates: string[] }) =>
      api.post<void>('/shifts/assign', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.shifts.all }); },
  });
};

export const useRemoveAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/shifts/assignments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.shifts.all }); },
  });
};
