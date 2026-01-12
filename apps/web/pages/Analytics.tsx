import React from 'react';
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
import { TURNOVER_DATA, DEPT_DISTRIBUTION } from '../constants';

export const Analytics: React.FC = () => {
  const COLORS = ['#3498db', '#1abc9c', '#f39c12', '#9b59b6', '#e74c3c'];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">Deep Analytics</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Turnover & Retention Chart */}
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
           <h2 className="text-xl font-bold mb-2 text-text-light dark:text-text-dark">Retention vs Turnover</h2>
           <p className="text-sm text-text-muted-light mb-6">Quarterly performance comparison</p>
           <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={TURNOVER_DATA}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a0aec0'}} />
                 <YAxis yAxisId="left" orientation="left" stroke="#3498db" axisLine={false} tickLine={false} />
                 <YAxis yAxisId="right" orientation="right" stroke="#e74c3c" axisLine={false} tickLine={false} />
                 <Tooltip 
                   contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                   cursor={{fill: 'transparent'}}
                 />
                 <Legend />
                 <Bar yAxisId="right" dataKey="value" name="Turnover %" fill="#e74c3c" radius={[4, 4, 0, 0]} barSize={40} />
                 <Bar yAxisId="left" dataKey="value2" name="Retention %" fill="#3498db" radius={[4, 4, 0, 0]} barSize={40} />
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
                   data={DEPT_DISTRIBUTION}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={100}
                   fill="#8884d8"
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {DEPT_DISTRIBUTION.map((entry, index) => (
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
                   {x: 'Needs Imp.', y: 5},
                   {x: 'Developing', y: 15},
                   {x: 'Solid Perf.', y: 50},
                   {x: 'Exceeds', y: 20},
                   {x: 'Outstanding', y: 10}
               ]}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="x" axisLine={false} tickLine={false} tick={{fill: '#a0aec0'}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#a0aec0'}} />
                   <Tooltip />
                   <Line type="monotone" dataKey="y" stroke="#1abc9c" strokeWidth={3} dot={{r: 6, fill:'#1abc9c', strokeWidth: 2, stroke: '#fff'}} />
               </LineChart>
             </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
};