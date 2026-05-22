import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../lib/socket';
import { queryKeys } from '../lib/queryKeys';
import { API_HOST } from '../lib/api';
import type { LeaveRequest, NotificationItem } from '../types';

const transformAvatarUrl = (req: LeaveRequest): LeaveRequest => ({
  ...req,
  avatar: req.avatar && req.avatar.startsWith('/')
    ? `${API_HOST}${req.avatar}`
    : req.avatar,
});

export const useSocketQuerySync = () => {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    // -- Leave Request events --
    const onLeaveCreated = (newRequest: LeaveRequest) => {
      const transformed = transformAvatarUrl(newRequest);
      qc.setQueryData<LeaveRequest[]>(queryKeys.leaveRequests.list(), (old) =>
        old ? [...old, transformed] : [transformed],
      );
    };

    const onLeaveUpdated = (updatedRequest: LeaveRequest) => {
      const transformed = transformAvatarUrl(updatedRequest);
      qc.setQueryData<LeaveRequest[]>(queryKeys.leaveRequests.list(), (old) =>
        old?.map((r) => (r.id === updatedRequest.id ? transformed : r)),
      );
    };

    const onLeaveDeleted = ({ id }: { id: string }) => {
      qc.setQueryData<LeaveRequest[]>(queryKeys.leaveRequests.list(), (old) =>
        old?.filter((r) => r.id !== id),
      );
    };

    // -- Expense Claim events --
    const onExpenseCreated = () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenseClaims.all });
    };
    const onExpenseUpdated = () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenseClaims.all });
    };
    const onExpenseDeleted = () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenseClaims.all });
    };

    // -- Attendance events --
    const onAttendanceUpdated = () => {
      qc.invalidateQueries({ queryKey: queryKeys.attendance.all });
      qc.invalidateQueries({ queryKey: queryKeys.adminAttendance.all });
    };

    // -- Notification events --
    const onNotificationNew = (notification: NotificationItem) => {
      qc.setQueryData<NotificationItem[]>(queryKeys.notifications.list(), (old) =>
        old ? [notification, ...old] : [notification],
      );
    };

    const onNotificationRefresh = () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.list() });
    };

    // -- New domain events --
    const onEmployeeUpdated = () => {
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
      qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
    };
    const onOrgChartUpdated = () => {
      qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
    };
    const onPayrollProcessed = () => {
      qc.invalidateQueries({ queryKey: queryKeys.payroll.all });
    };
    const onPerformanceReviewAssigned = () => {
      qc.invalidateQueries({ queryKey: queryKeys.performanceReviews.all });
    };
    const onTrainingCompleted = () => {
      qc.invalidateQueries({ queryKey: queryKeys.training.all });
    };
    const onComplianceStatusChanged = () => {
      qc.invalidateQueries({ queryKey: queryKeys.compliance.all });
    };

    socket.on('leave-request:created', onLeaveCreated);
    socket.on('leave-request:updated', onLeaveUpdated);
    socket.on('leave-request:deleted', onLeaveDeleted);
    socket.on('attendance:updated', onAttendanceUpdated);
    socket.on('notification:new', onNotificationNew);
    socket.on('notification:refresh', onNotificationRefresh);
    socket.on('expense-claim:created', onExpenseCreated);
    socket.on('expense-claim:updated', onExpenseUpdated);
    socket.on('expense-claim:deleted', onExpenseDeleted);
    socket.on('employee:updated', onEmployeeUpdated);
    socket.on('orgchart:updated', onOrgChartUpdated);
    socket.on('payroll:processed', onPayrollProcessed);
    socket.on('performance-review:assigned', onPerformanceReviewAssigned);
    socket.on('training:completed', onTrainingCompleted);
    socket.on('compliance:status-changed', onComplianceStatusChanged);

    return () => {
      socket.off('leave-request:created', onLeaveCreated);
      socket.off('leave-request:updated', onLeaveUpdated);
      socket.off('leave-request:deleted', onLeaveDeleted);
      socket.off('attendance:updated', onAttendanceUpdated);
      socket.off('notification:new', onNotificationNew);
      socket.off('notification:refresh', onNotificationRefresh);
      socket.off('expense-claim:created', onExpenseCreated);
      socket.off('expense-claim:updated', onExpenseUpdated);
      socket.off('expense-claim:deleted', onExpenseDeleted);
      socket.off('employee:updated', onEmployeeUpdated);
      socket.off('orgchart:updated', onOrgChartUpdated);
      socket.off('payroll:processed', onPayrollProcessed);
      socket.off('performance-review:assigned', onPerformanceReviewAssigned);
      socket.off('training:completed', onTrainingCompleted);
      socket.off('compliance:status-changed', onComplianceStatusChanged);
    };
  }, [qc]);
};
