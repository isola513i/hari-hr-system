import React, { useState, useEffect } from 'react';
// Mocks removed
import { Search, MoreHorizontal, Mail, MapPin, Eye, ChevronDown, X, User, Briefcase, Users, Calendar, Check, Circle, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Employee } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export const Employees: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user.role === 'HR_ADMIN';

  // Initialize state with mock data
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const navigate = useNavigate();

  // Add Employee Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    role: '',
    department: '',
    email: '',
    joinDate: ''
  });

  // Extract unique departments for filter dropdown
  const departments = ['All', ...Array.from(new Set(employeesList.map(e => e.department)))];
  const statuses = ['All', 'Active', 'On Leave', 'Terminated'];

  const filteredEmployees = employeesList.filter(emp => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.skills && emp.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesDepartment = departmentFilter === 'All' || emp.department === departmentFilter;
    const matchesStatus = statusFilter === 'All' || emp.status === statusFilter;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Fetch employees from API
  useEffect(() => {
    fetchEmployees();
  }, []);

  // ... (fetchEmployees)
  const fetchEmployees = async () => {
    try {
      const data = await api.get<any[]>('/employees');
      setEmployeesList(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.role || !newEmployee.department || !newEmployee.email || !newEmployee.joinDate) {
      return;
    }

    try {
      const payload = {
        name: newEmployee.name,
        role: newEmployee.role,
        department: newEmployee.department,
        email: newEmployee.email,
        joinDate: newEmployee.joinDate,
        managerId: null
      };

      await api.post('/employees', payload);

      fetchEmployees(); // Re-fetch
      setIsAddModalOpen(false);
      setNewEmployee({ name: '', role: '', department: '', email: '', joinDate: '' });

    } catch (error) {
      console.error('Error adding employee:', error);
      alert('Failed to add employee. Please try again.');
    }
  };

  const getOnboardingIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 size={16} className="text-accent-green" />;
      case 'In Progress': return <Clock size={16} className="text-accent-orange" />;
      default: return <Circle size={16} className="text-text-muted-light" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">Employee Directory</h1>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary-hover transition-colors"
            >
              Add Employee
            </button>
          </div>
        )}
      </div>

      {/* Search Bar & Filters Container */}
      <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-gray-800/20 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-grow w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={18} />
            <input
              type="text"
              placeholder="Search by name, role, department, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Desktop Filters */}
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative group w-full md:w-48">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full appearance-none pl-4 pr-10 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer text-text-light dark:text-text-dark"
              >
                {departments.map(dept => <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted-light pointer-events-none" />
            </div>

            <div className="relative group w-full md:w-40">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none pl-4 pr-10 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer text-text-light dark:text-text-dark"
              >
                {statuses.map(status => <option key={status} value={status}>{status === 'All' ? 'All Statuses' : status}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted-light pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-text-muted-light dark:text-text-muted-dark font-semibold tracking-wide">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Onboarding</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {filteredEmployees.map((emp) => (
                <tr
                  key={emp.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/employees/${emp.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent group-hover:ring-primary/20 transition-all" />
                      <div>
                        <p className="font-semibold text-text-light dark:text-text-dark group-hover:text-primary transition-colors">{emp.name}</p>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark flex items-center gap-1">
                          <Mail size={10} /> {emp.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-text-light dark:text-text-dark font-medium">{emp.role}</p>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{emp.department}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${emp.status === 'Active'
                      ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900'
                      : emp.status === 'Terminated'
                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900'
                        : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${emp.status === 'Active' ? 'bg-green-500' : emp.status === 'Terminated' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></span>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getOnboardingIcon(emp.onboardingStatus)}
                      <span className="text-text-light dark:text-text-dark text-sm">{emp.onboardingStatus}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-text-muted-light dark:text-text-muted-dark">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} />
                      {emp.location}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/employees/${emp.id}`); }}
                        className="p-2 text-text-muted-light dark:text-text-muted-dark hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        title="View Profile"
                      >
                        <Eye size={18} />
                      </button>
                      {isAdmin && (
                        <button className="p-2 text-text-muted-light dark:text-text-muted-dark hover:text-primary hover:bg-primary/10 rounded-lg transition-all">
                          <MoreHorizontal size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEmployees.length === 0 && (
            <div className="p-12 text-center text-text-muted-light dark:text-text-muted-dark">
              <p>No employees found matching your filters.</p>
              <button
                onClick={() => { setSearchTerm(''); setDepartmentFilter('All'); setStatusFilter('All'); }}
                className="mt-2 text-primary hover:underline text-sm"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Pagination Placeholder */}
        <div className="p-4 border-t border-border-light dark:border-border-dark flex items-center justify-between text-sm text-text-muted-light dark:text-text-muted-dark">
          <span>Showing <span className="font-medium text-text-light dark:text-text-dark">1</span> to <span className="font-medium text-text-light dark:text-text-dark">{filteredEmployees.length}</span> of <span className="font-medium text-text-light dark:text-text-dark">{filteredEmployees.length}</span> results</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-border-light dark:border-border-dark rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">Previous</button>
            <button className="px-3 py-1 border border-border-light dark:border-border-dark rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                Onboard New Employee
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-text-muted-light hover:text-text-light"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                  <input
                    required
                    type="text"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Role / Job Title</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                    <input
                      required
                      type="text"
                      value={newEmployee.role}
                      onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                      placeholder="e.g. UX Researcher"
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
                      onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                      placeholder="e.g. Product"
                      className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                  <input
                    required
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    placeholder="e.g. alex.m@nexus.hr"
                    className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Starting Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                  <input
                    required
                    type="date"
                    value={newEmployee.joinDate}
                    onChange={(e) => setNewEmployee({ ...newEmployee, joinDate: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
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
    </div>
  );
};