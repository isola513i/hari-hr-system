import React from 'react';
import { Users, TrendingUp, UserPlus, UserMinus } from 'lucide-react';
import { StatCard } from '../StatCard';

interface DashboardStatsProps {
  activeEmployeesCount: number;
  onLeaveCount: number;
  newHiresCount: number;
  pendingRequestsCount: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  activeEmployeesCount,
  onLeaveCount,
  newHiresCount,
  pendingRequestsCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      <StatCard
        title="Active Employees"
        value={activeEmployeesCount}
        icon={<Users size={24} />}
        trend={3}
        color="primary"
      />
      <StatCard
        title="On Leave Today"
        value={onLeaveCount}
        icon={<UserMinus size={24} />}
        color="orange"
      />
      <StatCard
        title="New Joiners (Monthly)"
        value={newHiresCount}
        icon={<UserPlus size={24} />}
        trend={5}
        color="green"
      />
      <StatCard
        title="Pending Approvals"
        value={pendingRequestsCount}
        icon={<TrendingUp size={24} />}
        color="red"
      />
    </div>
  );
};
