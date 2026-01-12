import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  TrendingUp, 
  UserPlus, 
  MoreHorizontal, 
  CheckCircle2, 
  Rocket, 
  Calendar as CalendarIcon, 
  Utensils, 
  UserMinus, 
  Briefcase,
  X,
  User,
  Mail,
  Calendar,
  Check,
  Activity,
  StickyNote,
  Cake,
  Clock,
  Wallet,
  Plane,
  FileText,
  DollarSign,
  ClipboardCheck,
  Palmtree,
  MessageSquare
} from 'lucide-react';
import { ResponsiveContainer, XAxis, YAxis, AreaChart, Area, Tooltip } from 'recharts';
import { StatCard } from '../components/StatCard';
import { HEADCOUNT_DATA, ONBOARDING_PROGRESS_SUMMARY, UPCOMING_EVENTS, MOCK_EMPLOYEES, AUDIT_LOGS, ANNOUNCEMENTS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useLeave } from '../contexts/LeaveContext';
import { LeaveRequest } from '../types';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { requests, updateRequestStatus } = useLeave();
  const navigate = useNavigate();

  // Filter requests for Admin (Pending only) and Employee (Own requests)
  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const myRequests = requests.filter(r => r.employeeName === user.name);

  // ----- ADMIN STATE -----
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  
  // ----- FORM STATE -----
  const [newEmployee, setNewEmployee] = useState({
      name: '',
      role: '',
      department: '',
      email: '',
      joinDate: ''
  });

  // ----- SHARED HANDLERS -----
  const handleSaveNote = () => {
      if(!quickNote.trim()) return;
      alert("Note saved to your personal dashboard.");
      setQuickNote('');
  };

  // ----- ADMIN HANDLERS -----
  const handleApproveLeave = (id: string, e?: React.MouseEvent) => {
     e?.stopPropagation();
     updateRequestStatus(id, 'Approved');
  };

  const handleDeclineLeave = (id: string, e?: React.MouseEvent) => {
     e?.stopPropagation();
     updateRequestStatus(id, 'Rejected');
  };

  const handleAddEmployeeSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      alert(`Successfully added ${newEmployee.name} to the system.`);
      setIsAddEmployeeModalOpen(false);
      setNewEmployee({ name: '', role: '', department: '', email: '', joinDate: '' });
  };

  // =========================================================================
  // EMPLOYEE DASHBOARD RENDER
  // =========================================================================
  if (user.role === 'EMPLOYEE') {
      const myTeam = MOCK_EMPLOYEES.filter(e => e.department === 'Product' && e.id !== user.id).slice(0, 3);
      
      return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 <div>
                    <h1 className="text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">Good Morning, {user.name.split(' ')[0]}</h1>
                    <p className="text-text-muted-light dark:text-text-muted-dark mt-1">You have {myRequests.filter(r => r.status === 'Pending').length} pending leave requests.</p>
                 </div>
                 <div className="flex gap-3">
                     <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary/90 transition-colors">
                        <Clock size={18} />
                        Clock In
                     </button>
                 </div>
            </div>

            {/* Quick Actions for Employee */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                    onClick={() => navigate('/time-off')}
                    className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                >
                    <div className="p-2 bg-accent-teal/10 text-accent-teal rounded-lg group-hover:bg-accent-teal group-hover:text-white transition-colors">
                        <Palmtree size={20} />
                    </div>
                    <span className="font-medium text-text-light dark:text-text-dark">Time Off</span>
                </button>
                <button 
                    onClick={() => navigate('/expenses')}
                    className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                >
                    <div className="p-2 bg-accent-green/10 text-accent-green rounded-lg group-hover:bg-accent-green group-hover:text-white transition-colors">
                        <DollarSign size={20} />
                    </div>
                    <span className="font-medium text-text-light dark:text-text-dark">Expenses</span>
                </button>
                <button 
                    onClick={() => navigate('/surveys')}
                    className="flex items-center justify-center gap-3 p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                >
                    <div className="p-2 bg-accent-orange/10 text-accent-orange rounded-lg group-hover:bg-accent-orange group-hover:text-white transition-colors">
                        <MessageSquare size={20} />
                    </div>
                    <span className="font-medium text-text-light dark:text-text-dark">Surveys</span>
                </button>
            </div>

            {/* Employee Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/time-off')}>
                    <div>
                        <p className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium mb-1">Leave Balance</p>
                        <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">14 <span className="text-sm font-normal text-text-muted-light">Days</span></h3>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg">
                        <Plane size={24} />
                    </div>
                </div>
                 <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium mb-1">Next Payday</p>
                        <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">Aug 30</h3>
                    </div>
                     <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-lg">
                        <Wallet size={24} />
                    </div>
                </div>
                 <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium mb-1">Pending Reviews</p>
                        <h3 className="text-3xl font-bold text-text-light dark:text-text-dark">1</h3>
                    </div>
                     <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-lg">
                        <FileText size={24} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* My Tasks */}
                <div className="lg:col-span-2 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
                    <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
                         <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">My Recent Requests</h2>
                         <button onClick={() => navigate('/time-off')} className="text-xs text-primary font-medium hover:underline">View All</button>
                    </div>
                    <div className="p-4 space-y-3">
                        {myRequests.length > 0 ? (
                            myRequests.slice(0, 4).map(req => (
                                <div key={req.id} className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${req.status === 'Approved' ? 'bg-green-100 text-green-600' : req.status === 'Rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                            <Plane size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-text-light dark:text-text-dark">{req.type}</p>
                                            <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{req.dates}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                                        req.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                                        req.status === 'Rejected' ? 'bg-red-100 text-red-700' : 
                                        'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {req.status}
                                    </span>
                                </div>
                            ))
                        ) : (
                             <div className="text-center py-4 text-text-muted-light">No requests made yet.</div>
                        )}
                    </div>
                </div>

                {/* My Team */}
                 <div className="lg:col-span-1 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
                    <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
                         <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">My Team</h2>
                    </div>
                    <div className="p-4 space-y-4">
                        {myTeam.map(teammate => (
                            <div key={teammate.id} className="flex items-center gap-3">
                                <img src={teammate.avatar} alt={teammate.name} className="w-10 h-10 rounded-full object-cover" />
                                <div>
                                    <p className="text-sm font-medium text-text-light dark:text-text-dark">{teammate.name}</p>
                                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{teammate.role}</p>
                                </div>
                                <span className={`ml-auto w-2.5 h-2.5 rounded-full ${teammate.status === 'Active' ? 'bg-green-500' : 'bg-yellow-500'}`} title={teammate.status}></span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Announcements (Shared with Admin but read only context) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
                     <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
                         <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Latest Announcements</h2>
                    </div>
                    <div className="p-4 space-y-4">
                        {ANNOUNCEMENTS.slice(0, 2).map(ann => (
                             <div key={ann.id} className="pb-3 border-b border-border-light dark:border-border-dark last:border-0 last:pb-0">
                                 <p className="text-sm font-medium text-primary mb-1">{ann.title}</p>
                                 <p className="text-xs text-text-muted-light dark:text-text-muted-dark line-clamp-2">{ann.description}</p>
                             </div>
                        ))}
                    </div>
                 </div>

                  {/* Personal Quick Note */}
                <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
                     <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
                         <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Personal Notes</h2>
                         <button onClick={handleSaveNote} className="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary-hover">Save</button>
                    </div>
                    <div className="p-4 flex-grow flex flex-col">
                        <textarea 
                            value={quickNote}
                            onChange={(e) => setQuickNote(e.target.value)}
                            placeholder="Jot down a quick idea..."
                            className="w-full h-24 bg-transparent resize-none focus:outline-none text-sm text-text-light dark:text-text-dark placeholder:text-text-muted-light"
                        />
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // =========================================================================
  // ADMIN DASHBOARD RENDER (Existing Logic)
  // =========================================================================
  
  // Calculate dynamic metrics for Admin
  const activeEmployees = MOCK_EMPLOYEES.filter(e => e.status === 'Active').length;
  const onLeaveEmployees = MOCK_EMPLOYEES.filter(e => e.status === 'On Leave').length;
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const newHires = MOCK_EMPLOYEES.filter(e => {
    const joinDate = new Date(e.joinDate);
    return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
  }).length;

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">HR Overview</h1>
          <p className="text-text-muted-light dark:text-text-muted-dark mt-1">Welcome back, {user.name.split(' ')[0]}. Here's what's happening today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsLeaveModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark font-medium rounded-lg text-sm border border-border-light dark:border-border-dark shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
             <CheckCircle2 size={18} className="text-accent-green" />
             Approve Leave
             {pendingRequests.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{pendingRequests.length}</span>}
          </button>
           <button 
             onClick={() => navigate('/onboarding')}
             className="flex items-center gap-2 px-4 py-2.5 bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark font-medium rounded-lg text-sm border border-border-light dark:border-border-dark shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
           >
             <Rocket size={18} className="text-accent-teal" />
             Initiate Onboarding
          </button>
          <button 
            onClick={() => setIsAddEmployeeModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary-hover transition-colors"
          >
            <UserPlus size={18} />
            Add Employee
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div onClick={() => navigate('/employees')} className="cursor-pointer">
            <StatCard 
              title="Active Employees" 
              value={activeEmployees} 
              trend={2.5}
              icon={<Briefcase size={22} />} 
              color="primary" 
            />
        </div>
        <div onClick={() => navigate('/employees?status=On Leave')} className="cursor-pointer">
            <StatCard 
              title="On Leave" 
              value={onLeaveEmployees} 
              icon={<UserMinus size={22} />} 
              color="orange" 
            />
        </div>
        <div onClick={() => navigate('/onboarding')} className="cursor-pointer">
            <StatCard 
              title="New Hires (Month)" 
              value={newHires} 
              trend={newHires > 0 ? 100 : 0} 
              icon={<UserPlus size={22} />} 
              color="green" 
            />
        </div>
        <div onClick={() => navigate('/analytics')} className="cursor-pointer">
            <StatCard 
              title="Turnover Rate" 
              value="2.1%" 
              trend={-0.4} 
              icon={<TrendingUp size={22} />} 
              color="red" 
            />
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Headcount Chart - Spans 2 columns */}
        <div className="lg:col-span-2 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-primary/10 rounded-lg text-primary">
                 <Users size={20} />
               </div>
               <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Headcount Trends</h2>
            </div>
            <button className="text-text-muted-light hover:text-primary"><MoreHorizontal size={20} /></button>
          </div>
          <div className="h-[250px] w-full flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HEADCOUNT_DATA}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3498db" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3498db" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a0aec0', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#a0aec0', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  cursor={{ stroke: '#3498db', strokeWidth: 1, strokeDasharray: '5 5' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3498db" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Birthdays / Events */}
        <div className="lg:col-span-1 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
             <div className="flex items-center gap-3">
               <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Events</h2>
             </div>
             <button onClick={() => navigate('/wellbeing')} className="text-xs text-primary font-medium hover:underline">View All</button>
          </div>
          <div className="p-4 flex-grow">
             <ul className="space-y-4">
               {UPCOMING_EVENTS.slice(0, 3).map(event => (
                 <li key={event.id} className="flex items-center gap-4">
                    {event.avatar ? (
                      <img src={event.avatar} alt={event.title} className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-background-dark" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        event.type === 'Meeting' ? 'bg-accent-teal/10 text-accent-teal' : 'bg-primary/10 text-primary'
                      }`}>
                         {event.type === 'Meeting' ? <CalendarIcon size={18} /> : <Utensils size={18} />}
                      </div>
                    )}
                    <div>
                       <p className="font-medium text-sm text-text-light dark:text-text-dark leading-tight">{event.title}</p>
                       <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5 flex items-center gap-1">
                         {event.type === 'Birthday' && <Cake size={12} className="text-accent-red" />}
                         {event.date}
                       </p>
                    </div>
                 </li>
               ))}
             </ul>
          </div>
        </div>

        {/* Onboarding Progress Widget */}
        <div className="lg:col-span-1 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
           <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
             <div className="flex items-center gap-3">
               <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Onboarding</h2>
             </div>
             <button onClick={() => navigate('/onboarding')} className="text-xs text-primary font-medium hover:underline">View All</button>
          </div>
          <div className="p-4 flex-grow">
            <ul className="space-y-5">
              {ONBOARDING_PROGRESS_SUMMARY.map(item => (
                <li key={item.id}>
                  <div className="flex justify-between mb-1">
                     <div>
                        <p className="font-medium text-sm text-text-light dark:text-text-dark">{item.name}</p>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{item.role}</p>
                     </div>
                     <p className="text-sm font-bold text-accent-teal">{item.progress}%</p>
                  </div>
                  <div className="w-full bg-background-light dark:bg-background-dark rounded-full h-2 mt-1">
                     <div 
                      className="bg-accent-teal h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${item.progress}%` }}
                     ></div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pending Leave Requests */}
        <div className="lg:col-span-2 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
           <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
             <div className="flex items-center gap-3">
               <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Pending Leave Requests</h2>
             </div>
             <span className="text-xs bg-accent-orange/10 text-accent-orange px-2 py-1 rounded-full">{pendingRequests.length} pending</span>
          </div>
          <div className="p-4 flex-grow overflow-x-auto">
             {pendingRequests.length > 0 ? (
                 <table className="w-full text-left text-sm">
                   <tbody className="divide-y divide-border-light dark:divide-border-dark">
                     {pendingRequests.map(req => (
                       <tr key={req.id}>
                         <td className="py-3 pr-4">
                           <div className="flex items-center gap-3">
                             <img src={req.avatar} alt={req.employeeName} className="w-8 h-8 rounded-full object-cover" />
                             <span className="font-medium text-text-light dark:text-text-dark">{req.employeeName}</span>
                           </div>
                         </td>
                         <td className="py-3 px-4 text-text-muted-light dark:text-text-muted-dark">{req.type}</td>
                         <td className="py-3 px-4 text-text-muted-light dark:text-text-muted-dark">{req.dates}</td>
                         <td className="py-3 pl-4 text-right">
                           <div className="flex items-center justify-end gap-2">
                             <button 
                                onClick={(e) => handleApproveLeave(req.id, e)}
                                className="px-3 py-1 text-xs font-medium text-accent-green bg-accent-green/10 rounded-full hover:bg-accent-green/20 transition-colors"
                             >
                                Approve
                             </button>
                             <button 
                                onClick={(e) => handleDeclineLeave(req.id, e)}
                                className="px-3 py-1 text-xs font-medium text-accent-red bg-accent-red/10 rounded-full hover:bg-accent-red/20 transition-colors"
                             >
                                Decline
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
             ) : (
                <div className="text-center py-8 text-text-muted-light dark:text-text-muted-dark">
                    <CheckCircle2 size={32} className="mx-auto mb-2 opacity-30" />
                    <p>All caught up! No pending requests.</p>
                </div>
             )}
          </div>
        </div>

         {/* Recent Activity & Notes */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
                <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
                     <div className="flex items-center gap-3">
                       <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Recent Activity</h2>
                     </div>
                </div>
                <div className="p-4 space-y-4 max-h-[250px] overflow-y-auto">
                    {AUDIT_LOGS.slice(0, 4).map(log => (
                        <div key={log.id} className="flex gap-3 items-start text-sm">
                            <div className="mt-0.5 p-1.5 bg-background-light dark:bg-background-dark rounded-full border border-border-light dark:border-border-dark text-text-muted-light">
                                <Activity size={14} />
                            </div>
                            <div>
                                <p className="text-text-light dark:text-text-dark">
                                    <span className="font-medium">{log.user}</span> {log.action} <span className="font-medium">{log.target}</span>
                                </p>
                                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{log.time}</p>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => navigate('/compliance')} className="w-full text-center text-xs text-primary mt-2 hover:underline">View Full Log</button>
                </div>
            </div>

            {/* Quick Notes */}
            <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
                 <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
                     <div className="flex items-center gap-3">
                       <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">Quick Note</h2>
                     </div>
                     <button onClick={handleSaveNote} className="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary-hover">Save</button>
                </div>
                <div className="p-4 flex-grow flex flex-col">
                    <textarea 
                        value={quickNote}
                        onChange={(e) => setQuickNote(e.target.value)}
                        placeholder="Type a quick note or task here..."
                        className="w-full h-full min-h-[120px] bg-transparent resize-none focus:outline-none text-sm text-text-light dark:text-text-dark placeholder:text-text-muted-light"
                    />
                    <div className="mt-auto flex justify-between items-center text-xs text-text-muted-light dark:text-text-muted-dark">
                        <span className="flex items-center gap-1"><StickyNote size={12}/> Personal</span>
                        <span>{quickNote.length} chars</span>
                    </div>
                </div>
            </div>
        </div>

      </div>

      {/* MODALS */}

      {/* Add Employee Modal */}
      {isAddEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                        Add New Employee
                    </h3>
                    <button 
                        onClick={() => setIsAddEmployeeModalOpen(false)} 
                        className="text-text-muted-light hover:text-text-light"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleAddEmployeeSubmit} className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                            <input 
                                required
                                type="text" 
                                value={newEmployee.name} 
                                onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                                placeholder="e.g. Alex Morgan"
                                className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Role</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                <input 
                                    required
                                    type="text" 
                                    value={newEmployee.role} 
                                    onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                                    placeholder="e.g. Designer"
                                    className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Department</label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                <input 
                                    required
                                    type="text" 
                                    value={newEmployee.department} 
                                    onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                                    placeholder="e.g. Product"
                                    className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                />
                            </div>
                        </div>
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                            <input 
                                required
                                type="email" 
                                value={newEmployee.email} 
                                onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                                placeholder="e.g. alex@nexus.hr"
                                className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                            />
                        </div>
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Start Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                            <input 
                                required
                                type="date" 
                                value={newEmployee.joinDate} 
                                onChange={(e) => setNewEmployee({...newEmployee, joinDate: e.target.value})}
                                className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button 
                            type="button"
                            onClick={() => setIsAddEmployeeModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2"
                        >
                            <Check size={16} /> Add Employee
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Leave Management Modal (Admin View of Requests) */}
      {isLeaveModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                        Manage Leave Requests
                    </h3>
                    <button 
                        onClick={() => setIsLeaveModalOpen(false)} 
                        className="text-text-muted-light hover:text-text-light"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-0 overflow-y-auto max-h-[60vh]">
                     {pendingRequests.length > 0 ? (
                        <table className="w-full text-left text-sm">
                           <thead className="bg-background-light dark:bg-background-dark text-xs uppercase text-text-muted-light font-semibold">
                               <tr>
                                   <th className="px-6 py-3">Employee</th>
                                   <th className="px-6 py-3">Type</th>
                                   <th className="px-6 py-3">Dates</th>
                                   <th className="px-6 py-3 text-right">Actions</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-border-light dark:divide-border-dark">
                             {pendingRequests.map(req => (
                               <tr key={req.id}>
                                 <td className="py-4 px-6">
                                   <div className="flex items-center gap-3">
                                     <img src={req.avatar} alt={req.employeeName} className="w-8 h-8 rounded-full object-cover" />
                                     <span className="font-medium text-text-light dark:text-text-dark">{req.employeeName}</span>
                                   </div>
                                 </td>
                                 <td className="py-4 px-6 text-text-muted-light dark:text-text-muted-dark">{req.type}</td>
                                 <td className="py-4 px-6 text-text-muted-light dark:text-text-muted-dark">{req.dates}</td>
                                 <td className="py-4 px-6 text-right">
                                   <div className="flex items-center justify-end gap-2">
                                     <button 
                                        onClick={() => handleApproveLeave(req.id)}
                                        className="p-2 text-accent-green bg-accent-green/10 rounded-full hover:bg-accent-green/20 transition-colors"
                                        title="Approve"
                                     >
                                        <Check size={16} />
                                     </button>
                                     <button 
                                        onClick={() => handleDeclineLeave(req.id)}
                                        className="p-2 text-accent-red bg-accent-red/10 rounded-full hover:bg-accent-red/20 transition-colors"
                                        title="Decline"
                                     >
                                        <X size={16} />
                                     </button>
                                   </div>
                                 </td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                     ) : (
                        <div className="p-12 text-center text-text-muted-light dark:text-text-muted-dark">
                            <CheckCircle2 size={48} className="mx-auto mb-4 text-accent-green opacity-50" />
                            <p className="text-lg font-medium">No pending requests</p>
                            <p className="text-sm">You've cleared the queue!</p>
                        </div>
                     )}
                </div>
                <div className="px-6 py-4 border-t border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                    <button 
                        onClick={() => setIsLeaveModalOpen(false)}
                        className="px-4 py-2 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
           </div>
      )}

    </div>
  );
};