import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { LeaveRequest, LeaveBalance } from '../types';
import { api } from '../lib/api';
// Mocks removed

interface LeaveContextType {
  requests: LeaveRequest[];
  addRequest: (request: LeaveRequest) => Promise<void>;
  updateRequestStatus: (id: string, status: 'Approved' | 'Rejected') => Promise<void>;
  getLeaveBalance: (employeeId: string) => Promise<LeaveBalance[]>;
}

const LeaveContext = createContext<LeaveContextType | undefined>(undefined);

export const LeaveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]); // Start empty



  // ...

  const fetchRequests = async () => {
    try {
      const data = await api.get<LeaveRequest[]>('/leave-requests');
      setRequests(data);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      setRequests([]);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const addRequest = async (request: LeaveRequest) => {
    try {
      // Ensure payload matches API expectation even if types differ
      const payload = {
        employeeId: request.employeeId,
        type: request.type,
        startDate: (request as any).startDate,
        endDate: (request as any).endDate,
        reason: (request as any).reason
      };

      await api.post('/leave-requests', payload);
      fetchRequests();
    } catch (e) {
      console.error(e);
    }
  };

  const updateRequestStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      await api.patch(`/leave-requests/${id}`, { status });
      fetchRequests();
    } catch (e) {
      console.error(e);
    }
  };

  const getLeaveBalance = async (employeeId: string): Promise<LeaveBalance[]> => {
    try {
      return await api.get<LeaveBalance[]>(`/leave-balances/${employeeId}`);
    } catch (e) {
      console.error(e);
      return [
        { type: 'Vacation', total: 20, used: 0, remaining: 20 },
        { type: 'Sick Leave', total: 10, used: 0, remaining: 10 }
      ];
    }
  };

  return (
    <LeaveContext.Provider value={{ requests, addRequest, updateRequestStatus, getLeaveBalance }}>
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