import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
// Mocks removed

export const Analytics: React.FC = () => {
  const COLORS = ['#3498db', '#1abc9c', '#f39c12', '#9b59b6', '#e74c3c'];

  const [headcountData, setHeadcountData] = useState<any[]>([]);
  const [deptData, setDeptData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hcRes, empRes] = await Promise.all([
          fetch('http://localhost:3000/api/headcount-stats'),
          fetch('http://localhost:3000/api/employees')
        ]);

        if (hcRes.ok) setHeadcountData(await hcRes.json());

        if (empRes.ok) {
          const employees: any[] = await empRes.json();
          // Aggregate Depts
          const dist: Record<string, number> = {};
          employees.forEach(e => {
            const d = e.department || 'Unknown';
            dist[d] = (dist[d] || 0) + 1;
          });
          const chartData = Object.keys(dist).map(key => ({ name: key, value: dist[key] }));
          setDeptData(chartData);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">Deep Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Headcount Growth Chart */}
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-2 text-text-light dark:text-text-dark">Headcount Growth</h2>
          <p className="text-sm text-text-muted-light mb-6">Monthly employee count</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={headcountData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a0aec0' }} />
                <YAxis orientation="left" stroke="#3498db" axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  cursor={{ fill: 'transparent' }}
                />
                <Legend />
                <Bar dataKey="value" name="Headcount" fill="#3498db" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dept Distribution */}
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-2 text-text-light dark:text-text-dark">Department Distribution</h2>
          <p className="text-sm text-text-muted-light mb-6">Employee count by department</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deptData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="middle" align="right" layout="vertical" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Performance Bell Curve (Simulated with LineChart) */}
      <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-2 text-text-light dark:text-text-dark">Performance Review Distribution</h2>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[
              { x: 'Needs Imp.', y: 5 },
              { x: 'Developing', y: 15 },
              { x: 'Solid Perf.', y: 50 },
              { x: 'Exceeds', y: 20 },
              { x: 'Outstanding', y: 10 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="x" axisLine={false} tickLine={false} tick={{ fill: '#a0aec0' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a0aec0' }} />
              <Tooltip />
              <Line type="monotone" dataKey="y" stroke="#1abc9c" strokeWidth={3} dot={{ r: 6, fill: '#1abc9c', strokeWidth: 2, stroke: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};