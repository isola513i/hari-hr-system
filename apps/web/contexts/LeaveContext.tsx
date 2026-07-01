import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { LeaveRequest, LeaveBalance } from '../types';
import {
  useLeaveRequests,
  useAddLeaveRequest,
  useUpdateLeaveStatus,
} from '../hooks/queries';
import { api } from '../lib/api';

interface LeaveContextType {
  requests: LeaveRequest[];
  addRequest: (request: LeaveRequest) => Promise<void>;
  updateRequestStatus: (id: string, status: 'Approved' | 'Rejected', rejectionReason?: string) => Promise<void>;
  getLeaveBalance: (employeeId: string) => Promise<LeaveBalance[]>;
  refetchRequests: () => Promise<void>;
}

const LeaveContext = createContext<LeaveContextType | undefined>(undefined);

export const LeaveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: requests = [], refetch } = useLeaveRequests();
  const addMutation = useAddLeaveRequest();
  const updateStatusMutation = useUpdateLeaveStatus();

  const addRequest = useCallback(async (request: LeaveRequest) => {
    try {
      const payload = {
        employeeId: request.employeeId,
        type: request.type,
        startDate: request.startDate,
        endDate: request.endDate,
        reason: request.reason,
      };
      await addMutation.mutateAsync(payload);
      // Socket handles real-time update
    } catch (e) {
      console.error(e);
      throw e;
    }
  }, [addMutation]);

  const updateRequestStatus = useCallback(async (id: string, status: 'Approved' | 'Rejected', rejectionReason?: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status, rejectionReason });
      // Socket handles real-time update
    } catch (e) {
      console.error(e);
      throw e;
    }
  }, [updateStatusMutation]);

  const getLeaveBalance = useCallback(async (employeeId: string): Promise<LeaveBalance[]> => {
    try {
      return await api.get<LeaveBalance[]>(`/leave-balances/${employeeId}`);
    } catch (e) {
      console.error(e);
      return [];
    }
  }, []);

  const refetchRequests = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <LeaveContext.Provider value={{ requests, addRequest, updateRequestStatus, getLeaveBalance, refetchRequests }}>
      {children}
    </LeaveContext.Provider>
  );
};

export const useLeave = () => {
  const context = useContext(LeaveContext);
  if (!context) {
    throw new Error('useLeave must be used within a LeaveProvider');
  }
  return context;
};
