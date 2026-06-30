import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Mail, MapPin, Eye, User, Briefcase, Users, Calendar, Check, Circle, CheckCircle2, Clock, Pencil, Trash2, Upload, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useEmployeeList, useAddEmployee, useDeleteEmployee, useBulkDeleteEmployees } from '../hooks/queries';
import type { BulkDeleteResult } from '../hooks/queries/employee';
import { Modal } from '../components/Modal';
import { Dropdown, DropdownOption } from '../components/Dropdown';
import { Avatar } from '../components/Avatar';
import { StatusIndicator } from '../components/StatusIndicator';
import { useUserStatus } from '../contexts/UserStatusContext';
import { Pagination } from '../components/Pagination';
import { FilterToolbar } from '../components/FilterToolbar';
import QueryErrorState from '../components/QueryErrorState';
import { BASE_URL, getAuthToken } from '../lib/api';

export const Employees: React.FC = () => {
  const { t } = useTranslation(['employees', 'common']);
  const { user, isAdminView } = useAuth();
  const { showToast } = useToast();
  const { getStatus, getStatusMessage } = useUserStatus();
  const isAdmin = isAdminView;

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const navigate = useNavigate();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // React Query
  const { data: employeesResponse, isError: isEmployeesError, error: employeesError, refetch: refetchEmployees } = useEmployeeList({
    page: currentPage,
    limit: itemsPerPage,
    department: departmentFilter,
    status: statusFilter,
    search: searchTerm,
  });
  const addEmployeeMutation = useAddEmployee();

  const employeesList = employeesResponse?.data ?? [];
  const totalItems = employeesResponse?.total ?? 0;
  const totalPages = employeesResponse?.totalPages ?? 1;

  // Add Employee Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    role: '',
    department: '',
    email: '',
    joinDate: ''
  });

  // Action menu & delete confirmation state
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const deleteEmployeeMutation = useDeleteEmployee();

  // CSV Import state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Bulk-delete selection state (desktop table)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkDeleteResult | null>(null);
  const bulkDeleteMutation = useBulkDeleteEmployees();

  // Reset selection whenever the visible page/filter set changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, departmentFilter, statusFilter, searchTerm]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allOnPageSelected = employeesList.length > 0 && employeesList.every((e) => selectedIds.has(e.id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (employeesList.every((e) => prev.has(e.id))) {
        const next = new Set(prev);
        employeesList.forEach((e) => next.delete(e.id));
        return next;
      }
      return new Set([...prev, ...employeesList.map((e) => e.id)]);
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      const result = await bulkDeleteMutation.mutateAsync([...selectedIds]);
      setBulkResult(result);
      setBulkConfirmOpen(false);
      setSelectedIds(new Set());
      showToast(t('employees:toast.bulkDeleted', { count: result.succeeded, defaultValue: '{{count}} employees terminated' }), 'success');
    } catch (error) {
      showToast((error as Error).message || t('employees:toast.deleteFailed'), 'error');
    }
  };

  // Close action menu on click outside
  useEffect(() => {
    if (!actionMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionMenuId]);

  const handleDeleteEmployee = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteEmployeeMutation.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
      showToast(t('employees:toast.employeeDeleted'), 'success');
    } catch (error) {
      showToast((error as Error).message || t('employees:toast.deleteFailed'), 'error');
    }
  };

  const handleImportCSV = async () => {
    if (!importFile) return;
    setIsImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const token = getAuthToken();
      const res = await fetch(`${BASE_URL}/employees/import-csv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImportResult(data);
      refetchEmployees();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Extract unique departments for filter dropdown
  const departments: DropdownOption[] = [
    { value: 'All', label: t('common:departments.allDepartments') },
    { value: 'Engineering', label: t('common:departments.engineering') },
    { value: 'Human Resources', label: t('common:departments.humanResources') },
    { value: 'Marketing', label: t('common:departments.marketing') },
    { value: 'Sales', label: t('common:departments.sales') },
    { value: 'Finance', label: t('common:departments.finance') },
    { value: 'Operations', label: t('common:departments.operations') },
    { value: 'Product', label: t('common:departments.product') },
    { value: 'Design', label: t('common:departments.design') },
    { value: 'Legal', label: t('common:departments.legal') },
    { value: 'Customer Support', label: t('common:departments.customerSupport') },
    { value: 'Tester', label: t('common:departments.tester') },
  ];
  const statuses: DropdownOption[] = [
    { value: 'All', label: t('employees:status.allStatuses') },
    { value: 'Active', label: t('employees:status.active') },
    { value: 'On Leave', label: t('employees:status.onLeave') },
    { value: 'Terminated', label: t('employees:status.terminated') }
  ];

  // Server-side filtering - no need for client-side filtering
  // When filters change, reset to page 1
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.role || !newEmployee.department || !newEmployee.email || !newEmployee.joinDate) {
      showToast(t('employees:toast.fillRequired'), 'warning');
      return;
    }

    try {
      await addEmployeeMutation.mutateAsync({
        name: newEmployee.name,
        role: newEmployee.role,
        department: newEmployee.department,
        email: newEmployee.email,
        joinDate: newEmployee.joinDate,
        managerId: null,
      });

      setIsAddModalOpen(false);
      setNewEmployee({ name: '', role: '', department: '', email: '', joinDate: '' });
      showToast(`${newEmployee.name} ${t('employees:toast.addedSuccess')}`, 'success');

    } catch (error) {
      const apiError = error as Error;
      console.error('Error adding employee:', apiError);
      let errorMessage = t('employees:toast.addFailed');
      if (apiError.message?.includes('already exists')) {
        errorMessage = `${t('employees:toast.emailExists')} (${newEmployee.email})`;
      }
      showToast(errorMessage, 'error');
    }
  };

  const translateStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'Active': t('employees:status.active'),
      'On Leave': t('employees:status.onLeave'),
      'Terminated': t('employees:status.terminated'),
    };
    return statusMap[status] || status;
  };

  const translateOnboardingStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'Not Started': t('employees:onboardingStatus.notStarted'),
      'In Progress': t('employees:onboardingStatus.inProgress'),
      'Completed': t('employees:onboardingStatus.completed'),
    };
    return statusMap[status] || status;
  };

  const getOnboardingIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 size={16} className="text-accent-green" />;
      case 'In Progress': return <Clock size={16} className="text-accent-orange" />;
      default: return <Circle size={16} className="text-text-muted-light" />;
    }
  };

  if (isEmployeesError) {
    return <QueryErrorState error={employeesError} onRetry={refetchEmployees} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">{t('employees:list.title')}</h1>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setIsImportOpen(true); setImportFile(null); setImportResult(null); }}
              className="px-5 py-2.5 border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-medium rounded-lg text-sm shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <Upload size={16} /> {t('employees:list.importCSV')}
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary-hover transition-colors"
            >
              {t('employees:list.addEmployee')}
            </button>
          </div>
        )}
      </div>

      {/* Search Bar & Filters Container */}
      <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
        <FilterToolbar
          searchValue={searchTerm}
          onSearchChange={handleSearchChange}
          searchPlaceholder={t('employees:list.searchPlaceholder')}
        >
          <Dropdown
            options={departments}
            value={departmentFilter}
            onChange={handleFilterChange(setDepartmentFilter)}
            width="w-full md:w-48"
          />
          <Dropdown
            options={statuses}
            value={statusFilter}
            onChange={handleFilterChange(setStatusFilter)}
            width="w-full md:w-40"
          />
        </FilterToolbar>

        {/* Bulk action bar (admin, desktop) */}
        {isAdmin && selectedIds.size > 0 && (
          <div className="hidden md:flex items-center justify-between px-6 py-3 bg-primary/5 dark:bg-primary/10 border-y border-border-light dark:border-border-dark">
            <span className="text-sm font-medium text-text-light dark:text-text-dark">
              {t('employees:list.selectedCount', { count: selectedIds.size, defaultValue: '{{count}} selected' })}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-sm text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors"
              >
                {t('common:buttons.cancel', { defaultValue: 'Cancel' })}
              </button>
              <button
                onClick={() => { setBulkResult(null); setBulkConfirmOpen(true); }}
                className="px-3 py-1.5 text-sm font-medium bg-accent-red text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Trash2 size={14} /> {t('employees:list.deleteSelected', { defaultValue: 'Delete selected' })}
              </button>
            </div>
          </div>
        )}

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-text-muted-light dark:text-text-muted-dark font-semibold tracking-wide">
              <tr>
                {isAdmin && (
                  <th className="px-6 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAll}
                      aria-label={t('employees:list.selectAll', { defaultValue: 'Select all' })}
                      className="w-4 h-4 rounded accent-primary cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-6 py-4">{t('employees:list.employee')}</th>
                <th className="px-6 py-4">{t('employees:list.role')}</th>
                <th className="px-6 py-4">{t('employees:list.status')}</th>
                <th className="px-6 py-4">{t('employees:list.onboarding')}</th>
                <th className="px-6 py-4">{t('employees:list.location')}</th>
                <th className="px-6 py-4 text-right">{t('employees:list.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {employeesList.map((emp) => (
                <tr
                  key={emp.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group cursor-pointer ${selectedIds.has(emp.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                  onClick={() => navigate(`/employees/${emp.id}`)}
                >
                  {isAdmin && (
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(emp.id)}
                        onChange={() => toggleSelect(emp.id)}
                        aria-label={t('employees:list.selectRow', { name: emp.name, defaultValue: 'Select {{name}}' })}
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar src={emp.avatar} name={emp.name} size="lg" className="ring-2 ring-transparent group-hover:ring-primary/20 transition-all" />
                        <StatusIndicator status={getStatus(emp.id)} statusMessage={getStatusMessage(emp.id)} showTooltip size="sm" className="absolute -bottom-0.5 -right-0.5" />
                      </div>
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
                      {translateStatus(emp.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getOnboardingIcon(emp.onboardingStatus)}
                      <span className="text-text-light dark:text-text-dark text-sm">{translateOnboardingStatus(emp.onboardingStatus)}</span>
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
                        title={t('employees:list.viewProfile')}
                        aria-label={t('employees:list.viewProfile')}
                      >
                        <Eye size={18} />
                      </button>
                      {isAdmin && (
                        <div className="relative" ref={actionMenuId === emp.id ? actionMenuRef : undefined}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setActionMenuId(actionMenuId === emp.id ? null : emp.id); }}
                            className="p-2 text-text-muted-light dark:text-text-muted-dark hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                            title={t('employees:list.moreActions')}
                            aria-label={t('employees:list.moreActions')}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          {actionMenuId === emp.id && (
                            <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-card-dark rounded-lg shadow-lg border border-border-light dark:border-border-dark z-20">
                              <button
                                onClick={(e) => { e.stopPropagation(); setActionMenuId(null); navigate(`/employees/${emp.id}`); }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-text-light dark:text-text-dark flex items-center gap-2 rounded-t-lg"
                              >
                                <Eye size={14} /> {t('employees:list.view')}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setActionMenuId(null); navigate(`/employees/${emp.id}?edit=true`); }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-text-light dark:text-text-dark flex items-center gap-2"
                              >
                                <Pencil size={14} /> {t('employees:list.edit')}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setActionMenuId(null); setDeleteConfirmId(emp.id); }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 flex items-center gap-2 rounded-b-lg"
                              >
                                <Trash2 size={14} /> {t('employees:list.delete')}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4 p-4">
          {employeesList.map((emp) => (
            <div
              key={emp.id}
              onClick={() => navigate(`/employees/${emp.id}`)}
              className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              {/* Employee Info */}
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <Avatar src={emp.avatar} name={emp.name} size="xl" className="ring-2 ring-primary/20" />
                  <StatusIndicator status={getStatus(emp.id)} statusMessage={getStatusMessage(emp.id)} showTooltip size="md" className="absolute -bottom-0.5 -right-0.5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-text-light dark:text-text-dark">{emp.name}</p>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark flex items-center gap-1">
                    <Mail size={10} /> {emp.email}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${emp.status === 'Active'
                  ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900'
                  : emp.status === 'Terminated'
                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900'
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900'
                  }`}>
                  {translateStatus(emp.status)}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-text-muted-light dark:text-text-muted-dark text-xs">{t('employees:list.role')}</p>
                  <p className="text-text-light dark:text-text-dark font-medium">{emp.role}</p>
                </div>
                <div>
                  <p className="text-text-muted-light dark:text-text-muted-dark text-xs">{t('employees:list.department')}</p>
                  <p className="text-text-light dark:text-text-dark font-medium">{emp.department}</p>
                </div>
                <div>
                  <p className="text-text-muted-light dark:text-text-muted-dark text-xs">{t('employees:list.onboarding')}</p>
                  <div className="flex items-center gap-1">
                    {getOnboardingIcon(emp.onboardingStatus)}
                    <span className="text-text-light dark:text-text-dark text-sm">{translateOnboardingStatus(emp.onboardingStatus)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-text-muted-light dark:text-text-muted-dark text-xs">{t('employees:list.location')}</p>
                  <div className="flex items-center gap-1">
                    <MapPin size={12} />
                    <span className="text-text-light dark:text-text-dark text-sm">{emp.location}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-border-light dark:border-border-dark">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/employees/${emp.id}`); }}
                  className="flex-1 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye size={16} /> {t('employees:list.viewProfile')}
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/employees/${emp.id}?edit=true`); }}
                      className="px-3 py-2 border border-border-light dark:border-border-dark rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                      title="Edit"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(emp.id); }}
                      className="px-3 py-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {employeesList.length === 0 && (
          <div className="p-12 text-center text-text-muted-light dark:text-text-muted-dark">
            <p>{t('employees:list.noEmployees')}</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setDepartmentFilter('All');
                setStatusFilter('All');
                setCurrentPage(1);
              }}
              className="mt-2 text-primary hover:underline text-sm"
            >
              {t('employees:list.clearFilters')}
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border-light dark:border-border-dark">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t('employees:modals.onboardTitle')}
        maxWidth="lg"
      >
        <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.onboardFullName')}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
              <input
                required
                type="text"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                placeholder={t('common:placeholders.egFullName')}
                className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.onboardRole')}</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                <input
                  required
                  type="text"
                  value={newEmployee.role}
                  onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                  placeholder={t('common:placeholders.egRole')}
                  className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.onboardDepartment')}</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                <input
                  required
                  type="text"
                  value={newEmployee.department}
                  onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                  placeholder={t('common:placeholders.egDepartment')}
                  className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.onboardEmail')}</label>
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
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('employees:modals.onboardStartDate')}</label>
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
              {t('employees:modals.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2"
            >
              <Check size={16} /> {t('employees:list.addEmployee')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title={t('employees:modals.deleteTitle')}
        maxWidth="sm"
      >
        <div className="p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Trash2 className="text-red-600 dark:text-red-400" size={24} />
          </div>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-6">
            {t('employees:modals.deleteConfirm')}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
            >
              {t('employees:modals.cancel')}
            </button>
            <button
              onClick={handleDeleteEmployee}
              disabled={deleteEmployeeMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 size={16} /> {deleteEmployeeMutation.isPending ? t('employees:modals.deleting') : t('employees:modals.delete')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        title={t('employees:modals.bulkDeleteTitle', { defaultValue: 'Delete selected employees' })}
        maxWidth="sm"
      >
        <div className="p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Trash2 className="text-red-600 dark:text-red-400" size={24} />
          </div>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-6">
            {t('employees:modals.bulkDeleteConfirm', { count: selectedIds.size, defaultValue: 'Terminate {{count}} selected employees? This cannot be undone.' })}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setBulkConfirmOpen(false)}
              className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
            >
              {t('employees:modals.cancel')}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 size={16} /> {bulkDeleteMutation.isPending ? t('employees:modals.deleting') : t('employees:modals.delete')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Result Modal (partial-success report) */}
      <Modal
        isOpen={!!bulkResult && bulkResult.failed > 0}
        onClose={() => setBulkResult(null)}
        title={t('employees:modals.bulkResultTitle', { defaultValue: 'Bulk delete results' })}
        maxWidth="sm"
      >
        <div className="p-6">
          <p className="text-sm text-text-light dark:text-text-dark mb-3">
            {t('employees:modals.bulkResultSummary', { succeeded: bulkResult?.succeeded ?? 0, failed: bulkResult?.failed ?? 0, defaultValue: '{{succeeded}} terminated, {{failed}} failed' })}
          </p>
          {bulkResult && bulkResult.failed > 0 && (
            <ul className="text-xs text-accent-red space-y-1 max-h-40 overflow-y-auto">
              {bulkResult.results.filter((r) => !r.success).map((r) => (
                <li key={r.id}>• {r.id.slice(0, 8)}… — {r.error}</li>
              ))}
            </ul>
          )}
          <div className="flex justify-end mt-5">
            <button
              onClick={() => setBulkResult(null)}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover"
            >
              {t('common:buttons.close', { defaultValue: 'Close' })}
            </button>
          </div>
        </div>
      </Modal>

      {/* Import CSV Modal */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title={t('employees:list.importTitle')}
        maxWidth="lg"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
            {t('employees:list.importDesc')}
          </p>
          <a
            href={`${BASE_URL}/employees/csv-template`}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Download size={16} /> {t('employees:list.downloadTemplate')}
          </a>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
              {t('employees:list.selectFile')}
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => { setImportFile(e.target.files?.[0] || null); setImportResult(null); }}
              className="w-full text-sm text-text-light dark:text-text-dark file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>

          {importResult && (
            <div className="rounded-lg border border-border-light dark:border-border-dark p-4 space-y-2">
              <p className="font-semibold text-text-light dark:text-text-dark">{t('employees:list.importComplete')}</p>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 dark:text-green-400">{t('employees:list.created')}: {importResult.created}</span>
                <span className="text-yellow-600 dark:text-yellow-400">{t('employees:list.skipped')}: {importResult.skipped}</span>
              </div>
              {importResult.errors.length > 0 && (
                <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside max-h-40 overflow-y-auto">
                  {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsImportOpen(false)}
              className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
            >
              {t('employees:modals.cancel')}
            </button>
            <button
              onClick={handleImportCSV}
              disabled={!importFile || isImporting}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
            >
              <Upload size={16} /> {isImporting ? t('employees:list.importing') : t('employees:list.importCSV')}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};