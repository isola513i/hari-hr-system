import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { JobHistoryItem, Employee, PerformanceReview, DocumentItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { api, API_HOST, BASE_URL, getAuthToken } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { getErrorMessage } from '../lib/errorHandler';
import {
    useEmployeeDetail,
    useJobHistory,
    useEmployeeTraining,
    useEmployeeDocuments,
    useEmployeeManager,
    useEmployeeDirectReports,
    useUpdateJobHistory,
    useDeleteJobHistory,
    useAssignTraining,
    useDeleteTraining,
    useUpdateTrainingStatus,
    useTrainingModules,
    useOffboarding,
    useInitiateOffboarding,
    useUpdateOffboardingTask,
    useSaveExitInterview,
} from '../hooks/queries';
import { useToast } from '../contexts/ToastContext';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    EmployeeHero,
    EmployeeSidebar,
    OverviewTab,
    HistoryTab,
    DocumentsTab,
    TrainingTab,
    PerformanceTab,
    EmployeeModals,
    LeaveQuotaTab,
    OffboardingTab,
} from '../components/employee-detail';
import type { EmployeePermissions, EmployeeTab } from '../components/employee-detail';
import { AssignTrainingModal } from '../components/training/AssignTrainingModal';

export const EmployeeDetail: React.FC = () => {
    const { t } = useTranslation(['employees', 'common']);
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user, updateUser, isAdminView } = useAuth();
    const qc = useQueryClient();

    // Permissions Logic
    // Compare both employeeId and id — user.id may be a users-table UUID
    // while the URL param is always an employees-table UUID
    const isOwnProfile = user?.employeeId === id || user?.id === id;
    const isAdmin = isAdminView;
    const canEditBasicInfo = isOwnProfile;
    const canEditSensitiveInfo = isAdmin;
    const canViewSensitiveTabs = isAdmin || isOwnProfile;

    const permissions: EmployeePermissions = {
        isOwnProfile,
        isAdmin,
        canEditBasicInfo,
        canEditSensitiveInfo,
        canViewSensitiveTabs,
    };

    const [activeTab, setActiveTab] = useState<EmployeeTab>('overview');

    const { showToast } = useToast();

    // ---------------------------------------------------------------------------
    // React Query hooks
    // ---------------------------------------------------------------------------
    const employeeQ = useEmployeeDetail(id);
    const historyQ = useJobHistory(id);
    const trainingQ = useEmployeeTraining(id);
    const docsQ = useEmployeeDocuments(id);
    const managerQ = useEmployeeManager(id);
    const directReportsQ = useEmployeeDirectReports(id);

    const employee = (employeeQ.data as Employee | undefined) ?? null;
    const isLoading = employeeQ.isPending;
    const manager = (managerQ.data as Employee | null | undefined) ?? null;
    const directReports = (directReportsQ.data as Employee[] | undefined) ?? [];
    const trainingRecords = trainingQ.data ?? [];

    // ---------------------------------------------------------------------------
    // Derived avatar (with local preview override)
    // ---------------------------------------------------------------------------
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const avatar = useMemo(() => {
        if (avatarPreview) return avatarPreview;
        if (!employee?.avatar) return `https://ui-avatars.com/api/?name=${employee?.name}`;
        return employee.avatar.startsWith('/') ? `${API_HOST}${employee.avatar}` : employee.avatar;
    }, [avatarPreview, employee?.avatar, employee?.name]);

    // ---------------------------------------------------------------------------
    // Local state synced from query data (needed for UI editing)
    // ---------------------------------------------------------------------------
    const [historyList, setHistoryList] = useState<JobHistoryItem[]>([]);
    const [documentsList, setDocumentsList] = useState<DocumentItem[]>([]);
    const [currentSkills, setCurrentSkills] = useState<string[]>([]);

    useEffect(() => { if (historyQ.data) setHistoryList(historyQ.data); }, [historyQ.data]);
    useEffect(() => {
        if (docsQ.data && employee) {
            setDocumentsList(docsQ.data.filter((d) =>
                d.employeeId === employee.id || d.owner === employee.name
            ));
        }
    }, [docsQ.data, employee]);
    useEffect(() => { if (employee?.skills) setCurrentSkills(employee.skills); }, [employee?.skills]);

    // Auto-open edit modal from ?edit=true, or jump to a tab via ?tab=<name>
    useEffect(() => {
        if (searchParams.get('edit') === 'true' && isAdmin && employee && !isEditProfileOpen) {
            setEditForm({ ...employee });
            setIsEditProfileOpen(true);
            setSearchParams({}, { replace: true });
        }
        const tabParam = searchParams.get('tab') as EmployeeTab | null;
        if (tabParam) {
            setActiveTab(tabParam);
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, isAdmin, employee]); // eslint-disable-line react-hooks/exhaustive-deps

    // Profile Edit State
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Employee>>({});

    // Performance Review State
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewForm, setReviewForm] = useState<Partial<PerformanceReview>>({});

    // Skills Editing State
    const [isEditingSkills, setIsEditingSkills] = useState(false);
    const [newSkillInput, setNewSkillInput] = useState('');

    // History Editing State
    const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
    const [tempHistoryItem, setTempHistoryItem] = useState<JobHistoryItem | null>(null);

    // History Add State
    const [isAddHistoryModalOpen, setIsAddHistoryModalOpen] = useState(false);
    const [newHistoryForm, setNewHistoryForm] = useState<Partial<JobHistoryItem>>({});

    // Delete confirmation state
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Action modal states
    const [isPromoteOpen, setIsPromoteOpen] = useState(false);
    const [promoteForm, setPromoteForm] = useState({ role: '', salary: '' });
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [transferDepartment, setTransferDepartment] = useState('');
    const [isTerminateOpen, setIsTerminateOpen] = useState(false);
    const [terminateForm, setTerminateForm] = useState({
        terminationReason: '',
        lastWorkingDay: '',
        terminationNotes: '',
    });

    // Offboarding hooks — only fetched when admin + employee is in Notice Period or Terminated
    const isOffboardingEmployee = Boolean(
        employee && (employee.status === 'Notice Period' || employee.status === 'Terminated')
    );
    const { data: offboardingData, isLoading: offboardingLoading } = useOffboarding(
        id ?? '',
        isAdmin && isOffboardingEmployee
    );
    const initiateOffboardingMutation = useInitiateOffboarding();
    const updateOffboardingTaskMutation = useUpdateOffboardingTask();
    const saveExitInterviewMutation = useSaveExitInterview();

    // Profile Edit Handlers
    const handleEditProfileClick = () => {
        if (employee) {
            setEditForm({ ...employee });
            setIsEditProfileOpen(true);
        }
    };

    const handleProfileSave = async () => {
        if (!employee || !editForm) return;

        try {
            const updatedEmployee = await api.patch<Employee>(`/employees/${employee.id}`, {
                name: editForm.name,
                email: editForm.email,
                role: editForm.role,
                department: editForm.department,
                status: editForm.status,
                location: editForm.location,
                bio: editForm.bio,
                phone: editForm.phone,
                slack: editForm.slack,
                emergencyContact: editForm.emergencyContact,
                address: editForm.address,
                workType: editForm.workType,
                workDays: editForm.workDays,
                nationalId: editForm.nationalId,
                bankAccountNumber: editForm.bankAccountNumber,
            });

            if (isOwnProfile && updateUser) {
                updateUser({
                    name: updatedEmployee.name,
                    email: updatedEmployee.email,
                    bio: updatedEmployee.bio,
                    phone: updatedEmployee.phone,
                    avatar: updatedEmployee.avatar
                });
            }

            setAvatarPreview(null);
            setIsEditProfileOpen(false);
            showToast(t('employees:toast.profileUpdated'), 'success');

            qc.invalidateQueries({ queryKey: queryKeys.employees.detail(id!) });
            qc.invalidateQueries({ queryKey: queryKeys.employees.all });
            qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
        } catch (error) {
            const apiError = error as Error;
            showToast(apiError.message || t('employees:toast.profileUpdateFailed'), 'error');
        }
    };

    const handleProfileChange = (field: keyof Employee, value: Employee[keyof Employee]) => {
        setEditForm(prev => ({ ...prev, [field]: value } as Partial<Employee>));
    };

    // Avatar Handlers
    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];

            if (file.size > 5 * 1024 * 1024) {
                showToast(t('employees:toast.avatarSizeError'), 'error');
                return;
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                showToast(t('employees:toast.avatarTypeError'), 'error');
                return;
            }

            const previewUrl = URL.createObjectURL(file);
            setAvatarPreview(previewUrl);

            try {
                const formData = new FormData();
                formData.append('avatar', file);

                const response = await fetch(`${BASE_URL}/employees/upload-avatar`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Failed to upload avatar');
                }

                const data = await response.json();

                // Save the avatar URL to the employee record
                await api.patch(`/employees/${id}`, { avatar: data.avatarUrl });

                const fullAvatarUrl = data.avatarUrl.startsWith('/')
                    ? `${API_HOST}${data.avatarUrl}`
                    : data.avatarUrl;
                setAvatarPreview(fullAvatarUrl);

                // Update auth context if own profile
                if (isOwnProfile && updateUser) {
                    updateUser({ avatar: data.avatarUrl });
                }

                showToast(t('employees:toast.avatarUpdated'), 'success');

                qc.invalidateQueries({ queryKey: queryKeys.employees.detail(id!) });
                qc.invalidateQueries({ queryKey: queryKeys.employees.all });
            } catch (error) {
                console.error('Avatar upload error:', error);
                showToast(t('employees:toast.avatarFailed'), 'error');
                setAvatarPreview(null);
            }
        }
    };

    // Skills Handlers
    const handleAddSkill = () => {
        if (newSkillInput.trim() && !currentSkills.includes(newSkillInput.trim())) {
            setCurrentSkills([...currentSkills, newSkillInput.trim()]);
            setNewSkillInput('');
        }
    };

    const handleRemoveSkill = (skillToRemove: string) => {
        setCurrentSkills(currentSkills.filter(skill => skill !== skillToRemove));
    };

    const handleSaveSkills = async () => {
        if (!employee) return;

        try {
            await api.patch(`/employees/${employee.id}`, {
                skills: currentSkills
            });
            setIsEditingSkills(false);
            showToast(t('employees:toast.skillsUpdated'), 'success');

            qc.invalidateQueries({ queryKey: queryKeys.employees.detail(id!) });
        } catch (error) {
            const apiError = error as Error;
            showToast(apiError.message || t('employees:toast.skillsFailed'), 'error');
        }
    };

    const handleCancelSkills = () => {
        if (employee) {
            setCurrentSkills(employee.skills || []);
        }
        setIsEditingSkills(false);
        setNewSkillInput('');
    };

    // History Handlers - Edit Existing
    const startEditHistory = (item: JobHistoryItem) => {
        setEditingHistoryId(item.id);
        setTempHistoryItem({ ...item });
    };

    const cancelEditHistory = () => {
        setEditingHistoryId(null);
        setTempHistoryItem(null);
    };

    const updateHistoryMutation = useUpdateJobHistory();
    const deleteHistoryMutation = useDeleteJobHistory();
    const assignTrainingMutation = useAssignTraining();
    const deleteTrainingMutation = useDeleteTraining();
    const updateTrainingStatusMutation = useUpdateTrainingStatus();

    const saveHistory = async () => {
        if (tempHistoryItem) {
            try {
                await updateHistoryMutation.mutateAsync({
                    id: tempHistoryItem.id,
                    data: {
                        role: tempHistoryItem.role,
                        department: tempHistoryItem.department,
                        startDate: tempHistoryItem.startDate,
                        endDate: tempHistoryItem.endDate,
                        description: tempHistoryItem.description,
                    },
                });
                setEditingHistoryId(null);
                setTempHistoryItem(null);
                showToast(t('employees:toast.jobHistoryUpdated'), 'success');
            } catch {
                showToast(t('employees:toast.jobHistoryUpdateFailed'), 'error');
            }
        }
    };

    const handleDeleteHistory = async (historyId: string) => {
        try {
            await deleteHistoryMutation.mutateAsync(historyId);
            showToast(t('employees:toast.jobHistoryDeleted'), 'success');
        } catch {
            showToast(t('employees:toast.jobHistoryDeleteFailed'), 'error');
        }
    };

    // Training handlers
    const [isAssignTrainingOpen, setIsAssignTrainingOpen] = useState(false);
    const { data: trainingModulesList } = useTrainingModules();

    const handleAssignTraining = async (moduleId: string, dueDate?: string) => {
        if (!id) return;
        try {
            await assignTrainingMutation.mutateAsync({ employeeId: id, moduleId, dueDate });
            setIsAssignTrainingOpen(false);
            showToast(t('employees:toast.trainingAssigned'), 'success');
        } catch {
            showToast(t('employees:toast.trainingAssignFailed'), 'error');
        }
    };

    const handleDeleteTraining = async (trainingId: string) => {
        try {
            await deleteTrainingMutation.mutateAsync(trainingId);
            showToast(t('employees:toast.trainingDeleted'), 'success');
        } catch {
            showToast(t('employees:toast.trainingDeleteFailed'), 'error');
        }
    };

    const handleUpdateTrainingStatus = async (trainingId: string, status: string) => {
        try {
            await updateTrainingStatusMutation.mutateAsync({ id: trainingId, status });
            showToast(t('employees:toast.trainingStatusUpdated', { status }), 'success');
        } catch {
            showToast(t('employees:toast.trainingStatusFailed'), 'error');
        }
    };

    // History Handlers - Add New
    const handleAddHistoryClick = () => {
        setNewHistoryForm({
            role: '',
            department: '',
            startDate: '',
            endDate: '',
            description: ''
        });
        setIsAddHistoryModalOpen(true);
    };

    const handleSaveNewHistory = async () => {
        if (!newHistoryForm.role || !newHistoryForm.department || !newHistoryForm.startDate || !id) return;

        try {
            const newItem = await api.post<JobHistoryItem>('/job-history', {
                employeeId: id,
                role: newHistoryForm.role,
                department: newHistoryForm.department,
                startDate: newHistoryForm.startDate,
                endDate: newHistoryForm.endDate || null,
                description: newHistoryForm.description || ''
            });

            setHistoryList([newItem, ...historyList]);
            setIsAddHistoryModalOpen(false);
            showToast(t('employees:toast.historyAdded'), 'success');

            qc.invalidateQueries({ queryKey: queryKeys.jobHistory.byEmployee(id!) });
        } catch (error) {
            const apiError = error as Error;
            showToast(apiError.message || t('employees:toast.historyFailed'), 'error');
        }
    };

    // Documents Handler
    const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && employee) {
            const file = e.target.files[0];

            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('employeeId', employee.id);
                formData.append('ownerName', employee.name);
                formData.append('category', 'Employee Documents');

                const response = await fetch(`${BASE_URL}/documents`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Upload failed');
                }

                const uploadedDoc = await response.json();

                setDocumentsList([uploadedDoc, ...documentsList]);
                showToast(t('employees:toast.documentUploaded'), 'success');

                qc.invalidateQueries({ queryKey: queryKeys.employeeDocuments.byEmployee(id!) });

                e.target.value = '';
            } catch (error) {
                console.error('Upload error:', error);
                showToast(getErrorMessage(error, t('employees:toast.documentFailed')), 'error');
            }
        }
    };

    // Banner Color Handler
    const handleBannerColorChange = async (color: string) => {
        if (!id) return;
        try {
            await api.patch(`/employees/${id}`, { bannerColor: color });
            qc.invalidateQueries({ queryKey: queryKeys.employees.detail(id) });
        } catch (error) {
            showToast((error as Error).message || t('employees:toast.bannerFailed'), 'error');
        }
    };

    // Performance Review Handlers (HR backfill only)
    const handleAddReview = () => {
        setReviewForm({
            employeeId: id,
            date: new Date().toISOString().split('T')[0],
            reviewer: user?.name || 'Admin',
            rating: 0,
            notes: ''
        });
        setIsReviewModalOpen(true);
    };

    const confirmDeleteReview = async () => {
        if (!deleteConfirmId) return;
        try {
            await api.delete(`/performance/reviews/${deleteConfirmId}`);
            showToast(t('employees:toast.reviewDeleted'), 'success');
            qc.invalidateQueries({ queryKey: queryKeys.performanceReviews.byEmployee(id!) });
        } catch (error) {
            showToast((error as Error).message || t('employees:toast.reviewDeleteFailed'), 'error');
        } finally {
            setDeleteConfirmId(null);
        }
    };

    // ---------------------------------------------------------------------------
    // Action Handlers: Promote, Transfer, Terminate
    // ---------------------------------------------------------------------------
    const handleOpenPromote = () => {
        if (employee) {
            setPromoteForm({ role: employee.role || '', salary: employee.salary?.toString() || '' });
            setIsPromoteOpen(true);
        }
    };

    const handleConfirmPromote = async () => {
        if (!employee || !id || !promoteForm.role) return;
        try {
            const oldRole = employee.role;
            await api.patch(`/employees/${id}`, {
                role: promoteForm.role,
                ...(promoteForm.salary ? { salary: Number(promoteForm.salary) } : {}),
            });
            await api.post('/job-history', {
                employeeId: id,
                role: promoteForm.role,
                department: employee.department,
                startDate: new Date().toISOString().split('T')[0],
                description: `Promoted from ${oldRole}`,
            });
            setIsPromoteOpen(false);
            showToast(t('employees:toast.promoted'), 'success');
            qc.invalidateQueries({ queryKey: queryKeys.employees.detail(id) });
            qc.invalidateQueries({ queryKey: queryKeys.employees.all });
            qc.invalidateQueries({ queryKey: queryKeys.jobHistory.byEmployee(id) });
            qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
        } catch (error) {
            showToast((error as Error).message || t('employees:toast.promoteFailed'), 'error');
        }
    };

    const handleOpenTransfer = () => {
        if (employee) {
            setTransferDepartment('');
            setIsTransferOpen(true);
        }
    };

    const handleConfirmTransfer = async () => {
        if (!employee || !id || !transferDepartment) return;
        try {
            const oldDept = employee.department;
            await api.patch(`/employees/${id}`, { department: transferDepartment });
            await api.post('/job-history', {
                employeeId: id,
                role: employee.role,
                department: transferDepartment,
                startDate: new Date().toISOString().split('T')[0],
                description: `Transferred from ${oldDept}`,
            });
            setIsTransferOpen(false);
            showToast(t('employees:toast.transferred'), 'success');
            qc.invalidateQueries({ queryKey: queryKeys.employees.detail(id) });
            qc.invalidateQueries({ queryKey: queryKeys.employees.all });
            qc.invalidateQueries({ queryKey: queryKeys.jobHistory.byEmployee(id) });
            qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
        } catch (error) {
            showToast((error as Error).message || t('employees:toast.transferFailed'), 'error');
        }
    };

    const handleConfirmTerminate = async () => {
        if (!employee || !id) return;
        if (!terminateForm.terminationReason || !terminateForm.lastWorkingDay) {
            showToast(t('employees:toast.fillRequired'), 'error');
            return;
        }
        try {
            await initiateOffboardingMutation.mutateAsync({
                employeeId: id,
                payload: {
                    terminationReason: terminateForm.terminationReason,
                    lastWorkingDay: terminateForm.lastWorkingDay,
                    terminationNotes: terminateForm.terminationNotes || undefined,
                },
            });
            setIsTerminateOpen(false);
            setTerminateForm({ terminationReason: '', lastWorkingDay: '', terminationNotes: '' });
            showToast(t('employees:toast.offboardingInitiated'), 'success');
            qc.invalidateQueries({ queryKey: queryKeys.employees.all });
            qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
        } catch (error) {
            const msg = getErrorMessage(error, t('employees:toast.offboardingInitiateFailed'));
            showToast(msg, 'error');
        }
    };

    const handleSaveReview = async () => {
        if (!reviewForm.reviewer || !reviewForm.date) return;

        try {
            if (reviewForm.id) {
                await api.put<PerformanceReview>(`/performance/reviews/${reviewForm.id}`, {
                    rating: reviewForm.rating,
                    notes: reviewForm.notes,
                    reviewer: reviewForm.reviewer,
                    date: reviewForm.date,
                });
            } else {
                await api.post<PerformanceReview>('/performance/reviews', {
                    employeeId: id,
                    date: reviewForm.date,
                    reviewer: reviewForm.reviewer,
                    rating: reviewForm.rating || 0,
                    notes: reviewForm.notes || '',
                });
            }
            setIsReviewModalOpen(false);
            showToast(reviewForm.id ? t('employees:toast.reviewUpdated') : t('employees:toast.reviewAdded'), 'success');
            qc.invalidateQueries({ queryKey: queryKeys.performanceReviews.byEmployee(id!) });
        } catch (error) {
            showToast((error as Error).message || t('employees:toast.reviewFailed'), 'error');
        }
    };

    // Show loading skeleton while fetching data
    if (isLoading) {
        return (
            <div className="space-y-6 animate-fade-in">
                {/* Hero Section Skeleton */}
                <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                    <div className="h-32 bg-gradient-to-r from-gray-300 dark:from-gray-700 to-gray-200 dark:to-gray-600 rounded-t-xl animate-pulse"></div>
                    <div className="px-6 pb-6 pt-2">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end -mt-14 mb-4">
                            <div className="flex items-end gap-4">
                                <div className="w-24 h-24 rounded-xl bg-gray-300 dark:bg-gray-700 animate-pulse"></div>
                                <div className="space-y-2 mb-2">
                                    <div className="h-6 w-48 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
                                    <div className="h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                            <div className="h-6 w-32 bg-gray-300 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
                            <div className="space-y-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                            <div className="h-6 w-32 bg-gray-300 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state if employee not found after loading
    if (!employee) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-text-muted-light dark:text-text-muted-dark animate-fade-in">
                <Users size={48} className="mb-4 opacity-20" />
                <p className="text-lg">{t('employees:detail.notFound')}</p>
                <button onClick={() => navigate('/employees')} className="mt-4 text-primary hover:underline">{t('employees:detail.returnToDirectory')}</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in relative">
            <EmployeeHero
                employee={employee}
                avatar={avatar}
                permissions={permissions}
                onEditProfileClick={handleEditProfileClick}
                onAvatarChange={handleAvatarChange}
                onBannerColorChange={handleBannerColorChange}
                onPromote={handleOpenPromote}
                onTransfer={handleOpenTransfer}
                onTerminate={() => setIsTerminateOpen(true)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <EmployeeSidebar
                    employee={employee}
                    permissions={permissions}
                    manager={manager}
                    directReports={directReports}
                />

                {/* Main Content Tabs */}
                <div className="lg:col-span-2">
                    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm h-full flex flex-col">
                        <div className="flex border-b border-border-light dark:border-border-dark overflow-x-auto">
                            <button
                                className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-text-muted-light hover:text-text-light dark:hover:text-text-dark'}`}
                                onClick={() => setActiveTab('overview')}
                            >
                                {t('employees:detail.overview')}
                            </button>
                            <button
                                className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-text-muted-light hover:text-text-light dark:hover:text-text-dark'}`}
                                onClick={() => setActiveTab('history')}
                            >
                                {t('employees:detail.history')}
                            </button>
                            {canViewSensitiveTabs && (
                                <>
                                    <button
                                        className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'documents' ? 'border-primary text-primary' : 'border-transparent text-text-muted-light hover:text-text-light dark:hover:text-text-dark'}`}
                                        onClick={() => setActiveTab('documents')}
                                    >
                                        {t('employees:detail.documents')}
                                    </button>
                                    <button
                                        className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'training' ? 'border-primary text-primary' : 'border-transparent text-text-muted-light hover:text-text-light dark:hover:text-text-dark'}`}
                                        onClick={() => setActiveTab('training')}
                                    >
                                        {t('employees:detail.training')}
                                    </button>
                                </>
                            )}
                            <button
                                className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'performance' ? 'border-primary text-primary' : 'border-transparent text-text-muted-light hover:text-text-light dark:hover:text-text-dark'}`}
                                onClick={() => setActiveTab('performance')}
                            >
                                {t('employees:detail.performance')}
                            </button>
                            {isAdmin && (
                                <button
                                    className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'leave-quotas' ? 'border-primary text-primary' : 'border-transparent text-text-muted-light hover:text-text-light dark:hover:text-text-dark'}`}
                                    onClick={() => setActiveTab('leave-quotas')}
                                >
                                    {t('employees:detail.leaveQuota')}
                                </button>
                            )}
                            {/* Offboarding tab — visible to HR_ADMIN when employee is in Notice Period or Terminated (Refinement #4) */}
                            {isAdmin && isOffboardingEmployee && (
                                <button
                                    className={`flex-1 min-w-[110px] px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'offboarding' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-text-muted-light hover:text-text-light dark:hover:text-text-dark'}`}
                                    onClick={() => setActiveTab('offboarding')}
                                >
                                    Offboarding
                                </button>
                            )}
                        </div>

                        <div className="p-6 flex-grow">
                            {activeTab === 'overview' && (
                                <OverviewTab
                                    employee={employee}
                                    permissions={permissions}
                                    currentSkills={currentSkills}
                                    isEditingSkills={isEditingSkills}
                                    newSkillInput={newSkillInput}
                                    onSetIsEditingSkills={setIsEditingSkills}
                                    onSetNewSkillInput={setNewSkillInput}
                                    onAddSkill={handleAddSkill}
                                    onRemoveSkill={handleRemoveSkill}
                                    onSaveSkills={handleSaveSkills}
                                    onCancelSkills={handleCancelSkills}
                                />
                            )}
                            {activeTab === 'history' && (
                                <HistoryTab
                                    permissions={permissions}
                                    historyList={historyList}
                                    editingHistoryId={editingHistoryId}
                                    tempHistoryItem={tempHistoryItem}
                                    onSetTempHistoryItem={setTempHistoryItem}
                                    onStartEditHistory={startEditHistory}
                                    onCancelEditHistory={cancelEditHistory}
                                    onSaveHistory={saveHistory}
                                    onAddClick={handleAddHistoryClick}
                                    onDeleteHistory={handleDeleteHistory}
                                />
                            )}
                            {activeTab === 'documents' && canViewSensitiveTabs && (
                                <DocumentsTab
                                    documentsList={documentsList}
                                    onUpload={handleUploadDocument}
                                    showToast={showToast}
                                />
                            )}
                            {activeTab === 'training' && canViewSensitiveTabs && (
                                <TrainingTab
                                    isAdmin={isAdmin}
                                    trainingRecords={trainingRecords}
                                    showToast={showToast}
                                    onAssignTraining={() => setIsAssignTrainingOpen(true)}
                                    onDeleteTraining={handleDeleteTraining}
                                    onUpdateStatus={handleUpdateTrainingStatus}
                                />
                            )}
                            {activeTab === 'performance' && id && (
                                <PerformanceTab
                                    employeeId={id}
                                    isAdmin={isAdmin}
                                    onAddReview={isAdmin ? handleAddReview : undefined}
                                />
                            )}
                            {activeTab === 'leave-quotas' && isAdmin && id && (
                                <LeaveQuotaTab
                                    employeeId={id}
                                    showToast={showToast}
                                />
                            )}
                            {activeTab === 'offboarding' && isAdmin && isOffboardingEmployee && (
                                <OffboardingTab
                                    employee={employee}
                                    tasks={offboardingData?.tasks ?? []}
                                    exitInterview={offboardingData?.exitInterview ?? null}
                                    progress={offboardingData?.progress ?? { total: 0, completed: 0, percentage: 0 }}
                                    isLoading={offboardingLoading}
                                    onUpdateTask={(taskId, payload) =>
                                        updateOffboardingTaskMutation.mutateAsync({
                                            taskId,
                                            employeeId: id!,
                                            payload,
                                        })
                                    }
                                    onSaveExitInterview={(payload) =>
                                        saveExitInterviewMutation.mutateAsync({
                                            employeeId: id!,
                                            payload,
                                        })
                                    }
                                    showToast={showToast}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <EmployeeModals
                isEditProfileOpen={isEditProfileOpen}
                editForm={editForm}
                permissions={permissions}
                onCloseEditProfile={() => setIsEditProfileOpen(false)}
                onProfileChange={handleProfileChange}
                onProfileSave={handleProfileSave}
                isAddHistoryModalOpen={isAddHistoryModalOpen}
                newHistoryForm={newHistoryForm}
                onSetNewHistoryForm={setNewHistoryForm}
                onCloseAddHistory={() => setIsAddHistoryModalOpen(false)}
                onSaveNewHistory={handleSaveNewHistory}
                isReviewModalOpen={isReviewModalOpen}
                reviewForm={reviewForm}
                isAdmin={isAdmin}
                onSetReviewForm={setReviewForm}
                onCloseReviewModal={() => setIsReviewModalOpen(false)}
                onSaveReview={handleSaveReview}
                deleteConfirmId={deleteConfirmId}
                onCancelDelete={() => setDeleteConfirmId(null)}
                onConfirmDelete={confirmDeleteReview}
                isPromoteOpen={isPromoteOpen}
                promoteForm={promoteForm}
                onPromoteFormChange={(field, value) => setPromoteForm(prev => ({ ...prev, [field]: value }))}
                onClosePromote={() => setIsPromoteOpen(false)}
                onConfirmPromote={handleConfirmPromote}
                isTransferOpen={isTransferOpen}
                transferDepartment={transferDepartment}
                onTransferDepartmentChange={setTransferDepartment}
                onCloseTransfer={() => setIsTransferOpen(false)}
                onConfirmTransfer={handleConfirmTransfer}
                isTerminateOpen={isTerminateOpen}
                terminateForm={terminateForm}
                onTerminateFormChange={(field, value) => setTerminateForm(prev => ({ ...prev, [field]: value }))}
                onCloseTerminate={() => {
                    setIsTerminateOpen(false);
                    setTerminateForm({ terminationReason: '', lastWorkingDay: '', terminationNotes: '' });
                }}
                onConfirmTerminate={handleConfirmTerminate}
            />

            <AssignTrainingModal
                isOpen={isAssignTrainingOpen}
                onClose={() => setIsAssignTrainingOpen(false)}
                modules={Array.isArray(trainingModulesList) ? trainingModulesList : []}
                onAssign={handleAssignTraining}
                isLoading={assignTrainingMutation.isPending}
            />

        </div>
    );
};
