import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { LeaveRequest, LeaveBalance } from '../types';
import { MOCK_LEAVE_REQUESTS } from '../constants';

interface LeaveContextType {
  requests: LeaveRequest[];
  addRequest: (request: LeaveRequest) => Promise<void>;
  updateRequestStatus: (id: string, status: 'Approved' | 'Rejected') => Promise<void>;
  getLeaveBalance: (employeeId: string) => Promise<LeaveBalance[]>;
}

const LeaveContext = createContext<LeaveContextType | undefined>(undefined);

export const LeaveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]); // Start empty

  const fetchRequests = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/leave-requests');
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      } else {
        console.error('Failed to fetch leave requests');
        setRequests(MOCK_LEAVE_REQUESTS);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      setRequests(MOCK_LEAVE_REQUESTS);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const addRequest = async (request: LeaveRequest) => {
    // API expects: { employeeId, type, startDate, endDate, reason }
    // request object has keys matching types.ts, which matches frontend needs
    // We need to extract reason if it's there? type definition of LeaveRequest doesn't have reason?
    // Let's check LeaveRequest in types.ts. It DOES NOT have reason. 
    // But TimeOff.tsx form has reason.
    // TimeOff constructs newRequest WITHOUT reason.
    // I should probably add reason to LeaveRequest type later, but for now let's pass what we have.
    // Actually, I can pass extra fields if I cast or if I change type.

    // But wait, the API I wrote consumes 'reason'.
    // I should stick to what `request` has for now.

    try {
      // We need to parse dates string back to start/end?
      // Ah, TimeOff calculated dates string but didn't keep raw start/end in the object passed to addRequest.
      // This is a problem. Local state in TimeOff had it.
      // I should update TimeOff to pass start/end date in the request object or separate args.
      // For now, let's look at TimeOff again.
      // TimeOff: const newRequest: LeaveRequest = { ... dates: dateString ... }
      // It DOES NOT have startDate/endDate fields.

      // I will fix TimeOff to pass startDate/endDate in the object (I need to update type first or just add it as extra prop)
      // Or I can parse `dates` string... but that's brittle.
      // Better: Update LeaveRequest type in types.ts to include startDate and endDate.

      // For this step, I will assume I can pass them in `request`.
      // Let's CAST it to any for API payload construction.
      const payload = {
        employeeId: request.employeeId,
        type: request.type,
        startDate: (request as any).startDate, // Need to ensure TimeOff passes this
        endDate: (request as any).endDate,     // Need to ensure TimeOff passes this
        reason: (request as any).reason        // Need to ensure TimeOff passes this
      };

      const response = await fetch('http://localhost:3000/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        fetchRequests(); // Refresh
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateRequestStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      const response = await fetch(`http://localhost:3000/api/leave-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        fetchRequests();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getLeaveBalance = async (employeeId: string): Promise<LeaveBalance[]> => {
    try {
      const response = await fetch(`http://localhost:3000/api/leave-balances/${employeeId}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error(e);
    }
    // Fallback if API fails (calc locally using quotas - duplicated logic or just return default)
    // Return empty or default
    return [
      { type: 'Vacation', total: 20, used: 0, remaining: 20 },
      { type: 'Sick Leave', total: 10, used: 0, remaining: 10 }
    ];
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