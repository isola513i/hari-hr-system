import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { JobHistoryItem, Employee, PerformanceReview, DocumentItem } from '@hari/shared-types';
import { useAuth } from '../../../contexts/AuthContext';
import { api, API_HOST, BASE_URL } from '../../../lib/api';
import { queryKeys } from '../../../lib/queryKeys';
import { Toast } from '../../../components/ui';
import { Users } from 'lucide-react';
import {
    EmployeeHero,
    EmployeeSidebar,
    OverviewTab,
    HistoryTab,
    DocumentsTab,
    TrainingTab,
    PerformanceTab,
    EmployeeModals,
} from './employee-detail';
import type { EmployeePermissions, EmployeeTab } from './employee-detail';

export const EmployeeDetailView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const qc = useQueryClient();

    // Permissions Logic
    const isOwnProfile = user?.id === id;
    const isAdmin = user?.role === 'HR_ADMIN';
    const canEditBasicInfo = isAdmin || isOwnProfile;
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

    // Toast State
    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
        show: false, message: '', type: 'success'
    });
    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setToast({ show: true, message, type });
    };

    // Loading State
    const [isLoading, setIsLoading] = useState(true);

    // Employee State
    const [employee, setEmployee] = useState<Employee | null>(null);

    // Profile Edit State
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Employee>>({});

    // Documents State
    const [documentsList, setDocumentsList] = useState<DocumentItem[]>([]);

    // Other Data
    const [trainingRecords, setTrainingRecords] = useState<any[]>([]);

    // Performance Review State
    const [reviewsList, setReviewsList] = useState<PerformanceReview[]>([]);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewForm, setReviewForm] = useState<Partial<PerformanceReview>>({});

    // Avatar Editing State
    const [avatar, setAvatar] = useState('');

    // Skills Editing State
    const [isEditingSkills, setIsEditingSkills] = useState(false);
    const [currentSkills, setCurrentSkills] = useState<string[]>([]);
    const [newSkillInput, setNewSkillInput] = useState('');

    // History Editing State
    const [historyList, setHistoryList] = useState<JobHistoryItem[]>([]);
    const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
    const [tempHistoryItem, setTempHistoryItem] = useState<JobHistoryItem | null>(null);

    // History Add State
    const [isAddHistoryModalOpen, setIsAddHistoryModalOpen] = useState(false);
    const [newHistoryForm, setNewHistoryForm] = useState<Partial<JobHistoryItem>>({});

    // Team Hierarchy State
    const [manager, setManager] = useState<Employee | null>(null);
    const [directReports, setDirectReports] = useState<Employee[]>([]);

    // Delete confirmation state
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    useEffect(() => {
        const fetchEmployeeDetail = async () => {
            setIsLoading(true);
            try {
                const [employeeData, history, reviews, training, docs, managerData, directReportsData] = await Promise.all([
                    api.get<Employee>(`/employees/${id}`),
                    api.get<any[]>(`/job-history?employeeId=${id}`),
                    api.get<PerformanceReview[]>(`/performance/reviews?employeeId=${id}`),
                    api.get<any[]>(`/employee-training/${id}`),
                    api.get<DocumentItem[]>('/documents'),
                    api.get<Employee>(`/employees/${id}/manager`).catch(() => null),
                    api.get<Employee[]>(`/employees/${id}/direct-reports`).catch(() => [])
                ]);

                if (employeeData) {
                    setEmployee(employeeData);
                    const avatarUrl = employeeData.avatar
                        ? (employeeData.avatar.startsWith('/') ? `${API_HOST}${employeeData.avatar}` : employeeData.avatar)
                        : `https://ui-avatars.com/api/?name=${employeeData.name}`;
                    setAvatar(avatarUrl);
                    setCurrentSkills(employeeData.skills || []);

                    setHistoryList(history);
                    setReviewsList(reviews);
                    setTrainingRecords(training);
                    setDocumentsList(docs.filter((d: any) =>
                        d.employeeId === employeeData.id || d.owner === employeeData.name
                    ));

                    setManager(managerData);
                    setDirectReports(directReportsData || []);
                }
            } catch (error) {
                console.error('Error fetching employee detail:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEmployeeDetail();
    }, [id]);

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
                avatar: avatar.startsWith('blob:') ? undefined : avatar
            });

            setEmployee(updatedEmployee);
            const avatarUrl = updatedEmployee.avatar
                ? (updatedEmployee.avatar.startsWith('/') ? `${API_HOST}${updatedEmployee.avatar}` : updatedEmployee.avatar)
                : avatar;
            setAvatar(avatarUrl);

            if (isOwnProfile && updateUser) {
                updateUser({
                    name: updatedEmployee.name,
                    email: updatedEmployee.email,
                    bio: updatedEmployee.bio,
                    phone: updatedEmployee.phone,
                    avatar: updatedEmployee.avatar
                });
            }

            setIsEditProfileOpen(false);
            showToast('Profile updated successfully!', 'success');

            qc.invalidateQueries({ queryKey: queryKeys.employees.all });
            qc.invalidateQueries({ queryKey: queryKeys.orgChart.all });
        } catch (error) {
            const apiError = error as Error;
            showToast(apiError.message || 'Failed to update profile.', 'error');
        }
    };

    const handleProfileChange = (field: keyof Employee, value: string) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    // Avatar Handlers
    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];

            if (file.size > 5 * 1024 * 1024) {
                showToast('Image size must be less than 5MB.', 'error');
                return;
            }

            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                showToast('Please upload a JPG, PNG, or GIF image.', 'error');
                return;
            }

            const previewUrl = URL.createObjectURL(file);
            setAvatar(previewUrl);

            try {
                const formData = new FormData();
                formData.append('avatar', file);

                const response = await fetch(`${BASE_URL}/employees/upload-avatar`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Failed to upload avatar');
                }

                const data = await response.json();

                const fullAvatarUrl = data.avatarUrl.startsWith('/')
                    ? `${API_HOST}${data.avatarUrl}`
                    : data.avatarUrl;
                setAvatar(fullAvatarUrl);
                showToast('Avatar uploaded successfully!', 'success');

                qc.invalidateQueries({ queryKey: queryKeys.employees.all });
            } catch (error) {
                console.error('Avatar upload error:', error);
                showToast('Failed to upload avatar. Please try again.', 'error');
                setAvatar(employee?.avatar || `https://ui-avatars.com/api/?name=${employee?.name}`);
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
            setEmployee({ ...employee, skills: currentSkills });
            setIsEditingSkills(false);
            showToast('Skills updated successfully!', 'success');

            qc.invalidateQueries({ queryKey: queryKeys.employees.all });
        } catch (error) {
            const apiError = error as Error;
            showToast(apiError.message || 'Failed to update skills.', 'error');
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

    const saveHistory = () => {
        if (tempHistoryItem) {
            setHistoryList(historyList.map(item => item.id === tempHistoryItem.id ? tempHistoryItem : item));
            setEditingHistoryId(null);
            setTempHistoryItem(null);
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
            showToast('Employment history added successfully!', 'success');
        } catch (error) {
            const apiError = error as Error;
            showToast(apiError.message || 'Failed to add employment history.', 'error');
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
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Upload failed');
                }

                const uploadedDoc = await response.json();

                setDocumentsList([uploadedDoc, ...documentsList]);
                showToast('Document uploaded successfully!', 'success');

                e.target.value = '';
            } catch (error: any) {
                console.error('Upload error:', error);
                showToast(error.message || 'Failed to upload document', 'error');
            }
        }
    };

    // Performance Review Handlers
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

    const handleEditReview = (review: PerformanceReview) => {
        setReviewForm({ ...review });
        setIsReviewModalOpen(true);
    };

    const handleDeleteReview = (reviewId: string) => {
        setDeleteConfirmId(reviewId);
    };

    const confirmDeleteReview = () => {
        if (deleteConfirmId) {
            setReviewsList(reviewsList.filter(r => r.id !== deleteConfirmId));
            showToast('Review deleted successfully.', 'success');
            setDeleteConfirmId(null);
        }
    };

    const handleSaveReview = () => {
        if (!reviewForm.reviewer || !reviewForm.date) return;

        if (reviewForm.id) {
            setReviewsList(prev => prev.map(r => r.id === reviewForm.id ? { ...r, ...reviewForm } as PerformanceReview : r));
        } else {
            const newReview: PerformanceReview = {
                id: Date.now().toString(),
                employeeId: id!,
                reviewer: reviewForm.reviewer!,
                date: reviewForm.date!,
                rating: reviewForm.rating || 0,
                notes: reviewForm.notes || ''
            };
            setReviewsList(prev => [newReview, ...prev]);
        }
        setIsReviewModalOpen(false);
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
                <p className="text-lg">Employee not found.</p>
                <button onClick={() => navigate('/employees')} className="mt-4 text-primary hover:underline">Return to Directory</button>
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
                showToast={showToast}
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
                                Overview
                            </button>
                            <button
                                className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-text-muted-light hover:text-text-light dark:hover:text-text-dark'}`}
                                onClick={() => setActiveTab('history')}
                            >
                                History
                            </button>
                            {canViewSensitiveTabs && (
                                <>
                                    <button
                                        className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'documents' ? 'border-primary text-primary' : 'border-transparent text-text-muted-light hover:text-text-light dark:hover:text-text-dark'}`}
                                        onClick={() => setActiveTab('documents')}
                                    >
                                        Documents
                                    </button>
                                    <button
                                        className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'training' ? 'border-primary text-primary' : 'border-transparent text-text-muted-light hover:text-text-light dark:hover:text-text-dark'}`}
                                        onClick={() => setActiveTab('training')}
                                    >
                                        Training
                                    </button>
                                    <button
                                        className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'performance' ? 'border-primary text-primary' : 'border-transparent text-text-muted-light hover:text-text-light dark:hover:text-text-dark'}`}
                                        onClick={() => setActiveTab('performance')}
                                    >
                                        Performance
                                    </button>
                                </>
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
                                />
                            )}
                            {activeTab === 'performance' && canViewSensitiveTabs && (
                                <PerformanceTab
                                    isAdmin={isAdmin}
                                    reviewsList={reviewsList}
                                    onAddReview={handleAddReview}
                                    onEditReview={handleEditReview}
                                    onDeleteReview={handleDeleteReview}
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
            />

            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(prev => ({ ...prev, show: false }))}
                />
            )}
        </div>
    );
};
