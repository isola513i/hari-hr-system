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
        change={`+${Math.round(activeEmployeesCount * 0.03)}`}
        trend="up"
        iconBgColor="bg-accent-blue/10"
        iconColor="text-accent-blue"
      />
      <StatCard
        title="On Leave Today"
        value={onLeaveCount}
        icon={<UserMinus size={24} />}
        iconBgColor="bg-accent-orange/10"
        iconColor="text-accent-orange"
      />
      <StatCard
        title="New Joiners (Monthly)"
        value={newHiresCount}
        icon={<UserPlus size={24} />}
        change="+3"
        trend="up"
        iconBgColor="bg-accent-green/10"
        iconColor="text-accent-green"
      />
      <StatCard
        title="Pending Approvals"
        value={pendingRequestsCount}
        icon={<TrendingUp size={24} />}
        iconBgColor="bg-accent-red/10"
        iconColor="text-accent-red"
      />
    </div>
  );
};
