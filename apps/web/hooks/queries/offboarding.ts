import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';
import type {
    OffboardingData,
    OffboardingTask,
    ExitInterview,
} from '../../types';

// ──────────────────────────────────────────────────────────────────────────────
// Query hooks
// ──────────────────────────────────────────────────────────────────────────────

/** Fetches the full offboarding state (tasks, exit interview, progress) for an employee */
export const useOffboarding = (employeeId: string, enabled = true) => {
    return useQuery<OffboardingData>({
        queryKey: queryKeys.offboarding.byEmployee(employeeId),
        queryFn: () => api.get<OffboardingData>(`/employees/${employeeId}/offboarding`),
        enabled: Boolean(employeeId) && enabled,
    });
};

/** Fetches just the exit interview for an employee */
export const useExitInterview = (employeeId: string, enabled = true) => {
    return useQuery<ExitInterview | null>({
        queryKey: queryKeys.offboarding.exitInterview(employeeId),
        queryFn: () => api.get<ExitInterview | null>(`/employees/${employeeId}/offboarding/exit-interview`),
        enabled: Boolean(employeeId) && enabled,
    });
};

// ──────────────────────────────────────────────────────────────────────────────
// Mutation hooks
// ──────────────────────────────────────────────────────────────────────────────

/** Initiates the offboarding workflow for an employee */
export const useInitiateOffboarding = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            employeeId,
            payload,
        }: {
            employeeId: string;
            payload: {
                terminationReason: string;
                lastWorkingDay: string;
                terminationNotes?: string;
            };
        }) =>
            api.offboarding.initiate(employeeId, payload) as Promise<OffboardingData>,
        onSuccess: (_data, { employeeId }) => {
            // Invalidate the offboarding data and the employee detail
            qc.invalidateQueries({ queryKey: queryKeys.offboarding.byEmployee(employeeId) });
            qc.invalidateQueries({ queryKey: queryKeys.employees.detail(employeeId) });
            qc.invalidateQueries({ queryKey: queryKeys.employees.lists() });
        },
    });
};

/** Creates an additional offboarding task for an employee */
export const useCreateOffboardingTask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            employeeId,
            payload,
        }: {
            employeeId: string;
            payload: Record<string, unknown>;
        }) =>
            api.offboarding.createTask(employeeId, payload) as Promise<OffboardingTask>,
        onSuccess: (_data, { employeeId }) => {
            qc.invalidateQueries({ queryKey: queryKeys.offboarding.byEmployee(employeeId) });
        },
    });
};

/** Updates an offboarding task (e.g. mark completed). May trigger auto-finalization. */
export const useUpdateOffboardingTask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (variables: {
            taskId: string;
            employeeId: string;
            payload: Record<string, unknown>;
        }) =>
            api.offboarding.updateTask(variables.taskId, variables.payload) as Promise<OffboardingTask>,
        onSuccess: (_data, { employeeId }) => {
            qc.invalidateQueries({ queryKey: queryKeys.offboarding.byEmployee(employeeId) });
            // Employee status may have changed (auto-finalized to Terminated)
            qc.invalidateQueries({ queryKey: queryKeys.employees.detail(employeeId) });
        },
    });
};

/** Deletes an offboarding task */
export const useDeleteOffboardingTask = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (variables: {
            taskId: string;
            employeeId: string;
        }) =>
            api.offboarding.deleteTask(variables.taskId),
        onSuccess: (_data, { employeeId }) => {
            qc.invalidateQueries({ queryKey: queryKeys.offboarding.byEmployee(employeeId) });
        },
    });
};

/** Saves (upserts) the exit interview for an employee */
export const useSaveExitInterview = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            employeeId,
            payload,
        }: {
            employeeId: string;
            payload: Record<string, unknown>;
        }) =>
            api.offboarding.saveExitInterview(employeeId, payload) as Promise<ExitInterview>,
        onSuccess: (_data, { employeeId }) => {
            qc.invalidateQueries({ queryKey: queryKeys.offboarding.byEmployee(employeeId) });
            qc.invalidateQueries({ queryKey: queryKeys.offboarding.exitInterview(employeeId) });
        },
    });
};
