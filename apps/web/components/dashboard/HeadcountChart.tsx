import React, { useMemo } from 'react';
import { ResponsiveContainer, XAxis, YAxis, AreaChart, Area, Tooltip } from 'recharts';
import { TrendingUp, MoreHorizontal } from 'lucide-react';

interface HeadcountData {
  name: string;
  value: number;
}

interface HeadcountChartProps {
  data: HeadcountData[];
  title?: string;
}

export const HeadcountChart: React.FC<HeadcountChartProps> = React.memo(({
  data,
  title = 'Headcount Trend',
}) => {
  const { latestValue, growthPercent } = useMemo(() => {
    const latest = data[data.length - 1]?.value ?? 0;
    const previous = data[data.length - 2]?.value ?? latest;
    const growth = previous > 0
      ? ((latest - previous) / previous * 100).toFixed(1)
      : '0';
    return { latestValue: latest, growthPercent: growth };
  }, [data]);

  return (
    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-5 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-text-light dark:text-text-dark">{title}</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-text-light dark:text-text-dark">
              {latestValue}
            </span>
            <span className="flex items-center text-xs font-medium text-green-600 dark:text-green-400">
              <TrendingUp size={12} className="mr-0.5" />
              +{growthPercent}%
            </span>
          </div>
        </div>
        <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <MoreHorizontal size={18} className="text-text-muted-light" />
        </button>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="headcountGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#headcountGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

HeadcountChart.displayName = 'HeadcountChart';
