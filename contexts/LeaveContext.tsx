import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LeaveRequest } from '../types';
import { MOCK_LEAVE_REQUESTS } from '../constants';

interface LeaveContextType {
  requests: LeaveRequest[];
  addRequest: (request: LeaveRequest) => void;
  updateRequestStatus: (id: string, status: 'Approved' | 'Rejected') => void;
}

const LeaveContext = createContext<LeaveContextType | undefined>(undefined);

export const LeaveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>(MOCK_LEAVE_REQUESTS);

  const addRequest = (request: LeaveRequest) => {
    setRequests(prev => [request, ...prev]);
  };

  const updateRequestStatus = (id: string, status: 'Approved' | 'Rejected') => {
    // In a real app, this might update the status. For this dashboard demo, 
    // we often remove it from the "Pending" list, but let's just update status 
    // and let the UI filter pending ones.
    setRequests(prev => prev.map(req => 
      req.id === id ? { ...req, status } : req
    ));
  };

  return (
    <LeaveContext.Provider value={{ requests, addRequest, updateRequestStatus }}>
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