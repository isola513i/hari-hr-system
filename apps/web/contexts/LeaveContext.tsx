import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { LeaveRequest, LeaveBalance } from '../types';
import { api, API_HOST } from '../lib/api';
import { getSocket } from '../lib/socket';

interface LeaveContextType {
  requests: LeaveRequest[];
  addRequest: (request: LeaveRequest) => Promise<void>;
  updateRequestStatus: (id: string, status: 'Approved' | 'Rejected') => Promise<void>;
  getLeaveBalance: (employeeId: string) => Promise<LeaveBalance[]>;
  refetchRequests: () => Promise<void>;
}

const LeaveContext = createContext<LeaveContextType | undefined>(undefined);

// Helper to transform avatar URLs
const transformAvatarUrl = (req: LeaveRequest): LeaveRequest => ({
  ...req,
  avatar: req.avatar && req.avatar.startsWith('/')
    ? `${API_HOST}${req.avatar}`
    : req.avatar
});

export const LeaveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  const fetchRequests = useCallback(async () => {
    try {
      const data = await api.get<LeaveRequest[]>('/leave-requests');
      const requestsWithFullAvatars = data.map(transformAvatarUrl);
      setRequests(requestsWithFullAvatars);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchRequests();

    // Set up Socket.io listeners for real-time updates
    const socket = getSocket();

    const handleLeaveRequestCreated = (newRequest: LeaveRequest) => {
      console.log('Real-time: Leave request created', newRequest.id);
      const transformedRequest = transformAvatarUrl(newRequest);
      setRequests(prev => [...prev, transformedRequest]);
    };

    const handleLeaveRequestUpdated = (updatedRequest: LeaveRequest) => {
      console.log('Real-time: Leave request updated', updatedRequest.id);
      const transformedRequest = transformAvatarUrl(updatedRequest);
      setRequests(prev =>
        prev.map(req => req.id === updatedRequest.id ? transformedRequest : req)
      );
    };

    const handleLeaveRequestDeleted = ({ id }: { id: string }) => {
      console.log('Real-time: Leave request deleted', id);
      setRequests(prev => prev.filter(req => req.id !== id));
    };

    socket.on('leave-request:created', handleLeaveRequestCreated);
    socket.on('leave-request:updated', handleLeaveRequestUpdated);
    socket.on('leave-request:deleted', handleLeaveRequestDeleted);

    // Cleanup listeners on unmount
    return () => {
      socket.off('leave-request:created', handleLeaveRequestCreated);
      socket.off('leave-request:updated', handleLeaveRequestUpdated);
      socket.off('leave-request:deleted', handleLeaveRequestDeleted);
    };
  }, [fetchRequests]);

  const addRequest = async (request: LeaveRequest) => {
    try {
      const payload = {
        employeeId: request.employeeId,
        type: request.type,
        startDate: (request as any).startDate,
        endDate: (request as any).endDate,
        reason: (request as any).reason
      };

      await api.post('/leave-requests', payload);
      // No need to fetchRequests - socket will handle the update
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const updateRequestStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      await api.patch(`/leave-requests/${id}`, { status });
      // No need to fetchRequests - socket will handle the update
    } catch (e) {
      console.error(e);
      throw e;
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
    <LeaveContext.Provider value={{ requests, addRequest, updateRequestStatus, getLeaveBalance, refetchRequests: fetchRequests }}>
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
