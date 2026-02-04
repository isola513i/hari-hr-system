import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { JobHistoryItem, Employee, PerformanceReview, DocumentItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { api, API_HOST, BASE_URL } from '../lib/api';
import { Toast } from '../components/Toast';
import {
    MapPin,
    Mail,
    Phone,
    Calendar,
    Briefcase,
    Download,
    FileText,
    MoreHorizontal,
    Shield,
    Clock,
    Users,
    CheckCircle2,
    BookOpen,
    PlayCircle,
    X,
    Plus,
    Edit2,
    Save,
    Camera,
    Star,
    Check,
    User,
    Trash2,
    UploadCloud,
    Lock,
    Hash,
    HeartPulse,
    AlignLeft
} from 'lucide-react';

export const EmployeeDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();

    // Permissions Logic
    const isOwnProfile = user?.id === id;
    const isAdmin = user?.role === 'HR_ADMIN';
    const canEditBasicInfo = isAdmin || isOwnProfile; // Admin or Self can edit basic contact info/bio
    const canEditSensitiveInfo = isAdmin; // Only Admin can edit Role, Dept, Status, Dates
    const canViewSensitiveTabs = isAdmin || isOwnProfile; // Peer cannot see Documents, Reviews, etc.

    const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'documents' | 'training' | 'performance'>('overview');

    // Toast State
    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
        show: false, message: '', type: 'success'
    });
    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setToast({ show: true, message, type });
    };

    // Loading State
    const [isLoading, setIsLoading] = useState(true);

    // Employee State (initialized from Mock)
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

    useEffect(() => {
        const fetchEmployeeDetail = async () => {
            setIsLoading(true);
            try {
                // Fetch employee by ID directly (more efficient and includes all fields)
                const [employeeData, history, reviews, training, docs, managerData, directReportsData] = await Promise.all([
                    api.get<Employee>(`/employees/${id}`),
                    api.get<any[]>(`/job-history?employeeId=${id}`),
                    api.get<PerformanceReview[]>(`/performance-reviews?employeeId=${id}`),
                    api.get<any[]>(`/employee-training/${id}`),
                    api.get<DocumentItem[]>('/documents'),
                    api.get<Employee>(`/employees/${id}/manager`).catch(() => null),
                    api.get<Employee[]>(`/employees/${id}/direct-reports`).catch(() => [])
                ]);

                if (employeeData) {
                    setEmployee(employeeData);
                    // Prepend API URL if avatar is a relative path
                    const avatarUrl = employeeData.avatar
                        ? (employeeData.avatar.startsWith('/') ? `${API_HOST}${employeeData.avatar}` : employeeData.avatar)
                        : `https://ui-avatars.com/api/?name=${employeeData.name}`;
                    setAvatar(avatarUrl);
                    setCurrentSkills(employeeData.skills || []);

                    // Auxiliary Data
                    setHistoryList(history);
                    setReviewsList(reviews);
                    setTrainingRecords(training);
                    // Filter documents by employee_id or owner name (for backwards compatibility)
                    setDocumentsList(docs.filter((d: any) =>
                        d.employeeId === employeeData.id || d.owner === employeeData.name
                    ));

                    // Team Hierarchy Data
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
                avatar: avatar
            });

            // Update local state with the response from server (ensures data is in sync)
            setEmployee(updatedEmployee);
            // Prepend API URL if avatar is a relative path
            const avatarUrl = updatedEmployee.avatar
                ? (updatedEmployee.avatar.startsWith('/') ? `${API_HOST}${updatedEmployee.avatar}` : updatedEmployee.avatar)
                : avatar;
            setAvatar(avatarUrl);

            // If user is editing their own profile, update AuthContext to keep Settings page in sync
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

            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                showToast('Image size must be less than 5MB.', 'error');
                return;
            }

            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                showToast('Please upload a JPG, PNG, or GIF image.', 'error');
                return;
            }

            // Show preview immediately
            const previewUrl = URL.createObjectURL(file);
            setAvatar(previewUrl);

            try {
                // Upload the file to the server
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

                // Update avatar with the server URL (prepend API URL if relative path)
                const fullAvatarUrl = data.avatarUrl.startsWith('/')
                    ? `${API_HOST}${data.avatarUrl}`
                    : data.avatarUrl;
                setAvatar(fullAvatarUrl);
                showToast('Avatar uploaded successfully!', 'success');
            } catch (error) {
                console.error('Avatar upload error:', error);
                showToast('Failed to upload avatar. Please try again.', 'error');
                // Revert to original avatar on error
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
            endDate: 'Present',
            description: ''
        });
        setIsAddHistoryModalOpen(true);
    };

    const handleSaveNewHistory = () => {
        if (!newHistoryForm.role || !newHistoryForm.department || !newHistoryForm.startDate) return;

        const newItem: JobHistoryItem = {
            id: Date.now().toString(),
            role: newHistoryForm.role!,
            department: newHistoryForm.department!,
            startDate: newHistoryForm.startDate!,
            endDate: newHistoryForm.endDate || 'Present',
            description: newHistoryForm.description || ''
        };

        setHistoryList([newItem, ...historyList]);
        setIsAddHistoryModalOpen(false);
    };

    // Documents Handler
    const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && employee) {
            const file = e.target.files[0];

            try {
                // Create FormData for file upload
                const formData = new FormData();
                formData.append('file', file);
                formData.append('employeeId', employee.id);
                formData.append('ownerName', employee.name);
                formData.append('category', 'Employee Documents');

                // Upload to API
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

                // Add to documents list
                setDocumentsList([uploadedDoc, ...documentsList]);
                showToast('Document uploaded successfully!', 'success');

                // Clear file input
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

    // Delete confirmation state
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
            // Update existing review
            setReviewsList(prev => prev.map(r => r.id === reviewForm.id ? { ...r, ...reviewForm } as PerformanceReview : r));
        } else {
            // Add new review
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
            {/* Hero Section */}
            <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                <div className="h-32 bg-gradient-to-r from-primary/80 to-accent-teal/80 rounded-t-xl"></div>
                <div className="px-6 pb-6 pt-2">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end -mt-14 mb-4">
                        <div className="flex items-end gap-4">
                            <div className="relative group cursor-pointer">
                                <img
                                    src={avatar}
                                    alt={employee.name}
                                    className="w-24 h-24 rounded-xl object-cover border-4 border-white dark:border-card-dark shadow-md bg-white dark:bg-gray-800"
                                />
                                {/* Only show avatar edit overlay if permitted */}
                                {canEditBasicInfo && (
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
                                        <label htmlFor="avatar-upload" className="cursor-pointer text-white flex flex-col items-center">
                                            <Camera size={24} />
                                            <span className="text-xs mt-1">Change</span>
                                        </label>
                                        <input
                                            id="avatar-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleAvatarChange}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="mb-1 flex flex-col">
                                <h1 className="text-2xl font-bold text-text-light dark:text-text-dark leading-[1.2]">{employee.name}</h1>
                                <p className="text-text-muted-light dark:text-text-muted-dark font-medium mt-1 leading-normal">{employee.role}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-4 md:mt-0">
                            {canEditBasicInfo && (
                                <button
                                    onClick={handleEditProfileClick}
                                    className="px-4 py-2 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Edit Profile
                                </button>
                            )}
                            {isAdmin && (
                                <div className="relative group">
                                    <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
                                        Actions <MoreHorizontal size={16} />
                                    </button>
                                    {/* Dropdown for Admin Actions */}
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-card-dark rounded-lg shadow-lg border border-border-light dark:border-border-dark hidden group-hover:block z-20">
                                        <button
                                            onClick={() => showToast('Promotion workflow coming soon!', 'info')}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-text-light dark:text-text-dark"
                                        >
                                            Promote
                                        </button>
                                        <button
                                            onClick={() => showToast('Transfer workflow coming soon!', 'info')}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-text-light dark:text-text-dark"
                                        >
                                            Transfer
                                        </button>
                                        <button
                                            onClick={() => showToast('Termination workflow coming soon!', 'warning')}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
                                        >
                                            Terminate
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-muted-light dark:text-text-muted-dark border-t border-border-light dark:border-border-dark pt-4">
                        <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-primary" />
                            {employee.location}
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail size={16} className="text-primary" />
                            {employee.email}
                        </div>
                        {employee.slack && (
                            <div className="flex items-center gap-2">
                                <Hash size={16} className="text-primary" />
                                {employee.slack}
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Briefcase size={16} className="text-primary" />
                            {employee.department}
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${employee.status === 'Active'
                                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900'
                                : employee.status === 'Terminated'
                                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900'
                                    : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900'
                                }`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${employee.status === 'Active' ? 'bg-green-500' : employee.status === 'Terminated' ? 'bg-red-500' : 'bg-yellow-500'
                                    }`}></span>
                                {employee.status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Sidebar */}
                <div className="space-y-6">
                    {/* Contact Info */}
                    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4">Contact Information</h2>
                        <div className="space-y-4 text-sm">
                            {employee.phone && (
                                <div>
                                    <p className="text-text-muted-light dark:text-text-muted-dark text-xs mb-1">Phone</p>
                                    <div className="flex items-center gap-2 text-text-light dark:text-text-dark font-medium">
                                        <Phone size={16} />
                                        {employee.phone}
                                    </div>
                                </div>
                            )}
                            <div>
                                <p className="text-text-muted-light dark:text-text-muted-dark text-xs mb-1">Work Email</p>
                                <div className="flex items-center gap-2 text-text-light dark:text-text-dark font-medium">
                                    <Mail size={16} />
                                    {employee.email}
                                </div>
                            </div>
                            {employee.emergencyContact && canViewSensitiveTabs && (
                                <div>
                                    <p className="text-text-muted-light dark:text-text-muted-dark text-xs mb-1">Emergency Contact</p>
                                    <div className="flex items-center gap-2 text-text-light dark:text-text-dark font-medium">
                                        <HeartPulse size={16} className="text-accent-red" />
                                        {employee.emergencyContact}
                                    </div>
                                </div>
                            )}
                            <div>
                                <p className="text-text-muted-light dark:text-text-muted-dark text-xs mb-1">Office Address</p>
                                <div className="flex items-center gap-2 text-text-light dark:text-text-dark font-medium">
                                    <MapPin size={16} />
                                    {employee.location} - Floor 4
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Team Hierarchy */}
                    {(manager || directReports.length > 0) && (
                        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                            <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4">Team</h2>
                            <div className="space-y-4">
                                {manager && (
                                    <div>
                                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-2 uppercase font-semibold">Reports To</p>
                                        <div
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark/50 transition-colors cursor-pointer"
                                            onClick={() => navigate(`/employees/${manager.id}`)}
                                        >
                                            <img
                                                src={manager.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(manager.name)}&background=random`}
                                                alt={manager.name}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                            <div>
                                                <p className="font-medium text-text-light dark:text-text-dark text-sm">{manager.name}</p>
                                                <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{manager.role}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {directReports.length > 0 && (
                                    <div>
                                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-2 uppercase font-semibold">Direct Reports</p>
                                        <div className="flex -space-x-2 overflow-hidden py-1">
                                            {directReports.slice(0, 3).map((report) => (
                                                <img
                                                    key={report.id}
                                                    className="inline-block h-8 w-8 rounded-full ring-2 ring-card-light dark:ring-card-dark cursor-pointer hover:z-10 transition-transform hover:scale-110"
                                                    src={report.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.name)}&background=random`}
                                                    alt={report.name}
                                                    title={report.name}
                                                    onClick={() => navigate(`/employees/${report.id}`)}
                                                />
                                            ))}
                                            {directReports.length > 3 && (
                                                <div className="h-8 w-8 rounded-full ring-2 ring-card-light dark:ring-card-dark bg-background-light dark:bg-background-dark flex items-center justify-center text-xs text-text-muted-light font-medium">
                                                    +{directReports.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

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
                            {/* Private Tabs: Only for Admin or Own Profile */}
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
                            {/* Overview Tab */}
                            {activeTab === 'overview' && (
                                <div className="space-y-8 animate-fade-in">
                                    <div>
                                        <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-2">About</h3>
                                        <p className="text-sm text-text-muted-light dark:text-text-muted-dark leading-relaxed">
                                            {employee.bio || "No bio available."}
                                        </p>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Skills</h3>
                                            {/* Only show Edit Skills if permitted */}
                                            {canEditBasicInfo && (
                                                !isEditingSkills ? (
                                                    <button
                                                        onClick={() => setIsEditingSkills(true)}
                                                        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                                                    >
                                                        <Edit2 size={12} /> Edit Skills
                                                    </button>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleCancelSkills}
                                                            className="text-xs font-medium text-text-muted-light hover:text-text-light dark:hover:text-text-dark px-2 py-1"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={handleSaveSkills}
                                                            className="flex items-center gap-1 text-xs font-medium bg-primary text-white px-2.5 py-1 rounded hover:bg-primary/90"
                                                        >
                                                            <Save size={12} /> Save
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        {isEditingSkills ? (
                                            <div className="space-y-4 p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newSkillInput}
                                                        onChange={(e) => setNewSkillInput(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                                                        placeholder="Add a new skill..."
                                                        className="flex-1 px-3 py-1.5 text-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded focus:outline-none focus:ring-1 focus:ring-primary text-text-light dark:text-text-dark"
                                                    />
                                                    <button
                                                        onClick={handleAddSkill}
                                                        disabled={!newSkillInput.trim()}
                                                        className="p-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded disabled:opacity-50 disabled:hover:bg-primary/10 disabled:hover:text-primary transition-colors"
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {currentSkills.map(skill => (
                                                        <span key={skill} className="inline-flex items-center px-3 py-1 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-full text-xs font-medium text-text-light dark:text-text-dark">
                                                            {skill}
                                                            <button
                                                                onClick={() => handleRemoveSkill(skill)}
                                                                className="ml-2 text-text-muted-light hover:text-accent-red"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {currentSkills.length > 0 ? (
                                                    currentSkills.map(skill => (
                                                        <span key={skill} className="px-3 py-1 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-full text-xs font-medium text-text-light dark:text-text-dark hover:border-primary/50 transition-colors cursor-default">
                                                            {skill}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-text-muted-light dark:text-text-muted-dark">No skills listed.</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-background-light dark:bg-background-dark/50 rounded-lg border border-border-light dark:border-border-dark">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Shield className="text-accent-green" size={20} />
                                                <p className="font-semibold text-text-light dark:text-text-dark">Employment Status</p>
                                            </div>
                                            <p className="text-sm text-text-muted-light dark:text-text-muted-dark pl-8">Full-Time • Permanent</p>
                                        </div>
                                        <div className="p-4 bg-background-light dark:bg-background-dark/50 rounded-lg border border-border-light dark:border-border-dark">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Clock className="text-accent-orange" size={20} />
                                                <p className="font-semibold text-text-light dark:text-text-dark">Work Schedule</p>
                                            </div>
                                            <p className="text-sm text-text-muted-light dark:text-text-muted-dark pl-8">Mon-Fri • 9:00 AM - 5:00 PM</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* History Tab */}
                            {activeTab === 'history' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Employment History</h3>
                                        {isAdmin && (
                                            <button
                                                onClick={handleAddHistoryClick}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                                            >
                                                <Plus size={16} />
                                                Add Position
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative border-l-2 border-border-light dark:border-border-dark ml-3 space-y-8">
                                        {historyList.map((job, index) => (
                                            <div key={job.id} className="relative pl-8">
                                                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-card-dark ${index === 0 ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}></div>

                                                {editingHistoryId === job.id && tempHistoryItem && isAdmin ? (
                                                    <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-4 space-y-3">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark">Role</label>
                                                                <input
                                                                    value={tempHistoryItem.role}
                                                                    onChange={(e) => setTempHistoryItem({ ...tempHistoryItem, role: e.target.value })}
                                                                    className="w-full mt-1 px-2 py-1.5 text-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded focus:outline-none focus:ring-1 focus:ring-primary text-text-light dark:text-text-dark"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark">Department</label>
                                                                <input
                                                                    value={tempHistoryItem.department}
                                                                    onChange={(e) => setTempHistoryItem({ ...tempHistoryItem, department: e.target.value })}
                                                                    className="w-full mt-1 px-2 py-1.5 text-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded focus:outline-none focus:ring-1 focus:ring-primary text-text-light dark:text-text-dark"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark">Start Date</label>
                                                                <input
                                                                    value={tempHistoryItem.startDate}
                                                                    onChange={(e) => setTempHistoryItem({ ...tempHistoryItem, startDate: e.target.value })}
                                                                    className="w-full mt-1 px-2 py-1.5 text-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded focus:outline-none focus:ring-1 focus:ring-primary text-text-light dark:text-text-dark"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark">End Date</label>
                                                                <input
                                                                    value={tempHistoryItem.endDate}
                                                                    onChange={(e) => setTempHistoryItem({ ...tempHistoryItem, endDate: e.target.value })}
                                                                    className="w-full mt-1 px-2 py-1.5 text-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded focus:outline-none focus:ring-1 focus:ring-primary text-text-light dark:text-text-dark"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark">Description</label>
                                                            <textarea
                                                                value={tempHistoryItem.description}
                                                                onChange={(e) => setTempHistoryItem({ ...tempHistoryItem, description: e.target.value })}
                                                                className="w-full mt-1 px-2 py-1.5 text-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded focus:outline-none focus:ring-1 focus:ring-primary text-text-light dark:text-text-dark"
                                                                rows={2}
                                                            />
                                                        </div>
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={cancelEditHistory}
                                                                className="px-3 py-1.5 text-xs font-medium text-text-muted-light hover:text-text-light dark:hover:text-text-dark"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={saveHistory}
                                                                className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded hover:bg-primary/90"
                                                            >
                                                                Save
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="group">
                                                        <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
                                                            <h4 className="text-base font-bold text-text-light dark:text-text-dark">{job.role}</h4>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${index === 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                                                    {job.startDate} - {job.endDate}
                                                                </span>
                                                                {/* Only Admin can edit history */}
                                                                {isAdmin && (
                                                                    <button
                                                                        onClick={() => startEditHistory(job)}
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-text-muted-light hover:text-primary"
                                                                        title="Edit"
                                                                    >
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm font-medium text-primary mb-2">{job.department}</p>
                                                        <p className="text-sm text-text-muted-light dark:text-text-muted-dark leading-relaxed">
                                                            {job.description}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Documents Tab - Restricted */}
                            {activeTab === 'documents' && canViewSensitiveTabs && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Documents</h3>
                                        <div className="flex gap-2">
                                            <label className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
                                                <UploadCloud size={16} />
                                                Upload
                                                <input type="file" className="hidden" onChange={handleUploadDocument} />
                                            </label>
                                            <button
                                                onClick={() => showToast('Bulk download feature coming soon!', 'info')}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            >
                                                <Download size={16} />
                                                Download All
                                            </button>
                                        </div>
                                    </div>
                                    {documentsList.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-3">
                                            {documentsList.map(doc => (
                                                <div key={doc.id} className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark/50 rounded-lg border border-border-light dark:border-border-dark hover:border-primary/50 transition-colors group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                                            <FileText size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-text-light dark:text-text-dark text-sm">{doc.name}</p>
                                                            <div className="flex items-center gap-2 text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">
                                                                <span className="uppercase">{doc.type}</span>
                                                                <span>•</span>
                                                                <span>Last accessed {doc.lastAccessed}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button className="p-2 text-text-muted-light hover:text-primary hover:bg-primary/10 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                                                        <MoreHorizontal size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-text-muted-light dark:text-text-muted-dark border-2 border-dashed border-border-light dark:border-border-dark rounded-xl">
                                            <p>No documents found for this employee.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Training Tab - Restricted */}
                            {activeTab === 'training' && canViewSensitiveTabs && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Training Records</h3>
                                        {isAdmin && (
                                            <button
                                                onClick={() => showToast('Training assignment feature coming soon!', 'info')}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                                            >
                                                Assign Module
                                            </button>
                                        )}
                                    </div>
                                    {trainingRecords.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-3">
                                            {trainingRecords.map(record => (
                                                <div key={record.id} className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark/50 rounded-lg border border-border-light dark:border-border-dark">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2.5 rounded-lg ${record.status === 'Completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
                                                            {record.status === 'Completed' ? <CheckCircle2 size={20} /> : <PlayCircle size={20} />}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-text-light dark:text-text-dark text-sm">{record.title}</p>
                                                            <div className="flex items-center gap-3 text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">
                                                                <span className="flex items-center gap-1"><Clock size={12} /> {record.duration}</span>
                                                                {record.completionDate && <span>Completed on {record.completionDate}</span>}
                                                                {record.score && <span className="font-semibold text-primary">Score: {record.score}%</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${record.status === 'Completed'
                                                            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                                            : 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                                                            }`}>
                                                            {record.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-text-muted-light dark:text-text-muted-dark border-2 border-dashed border-border-light dark:border-border-dark rounded-xl">
                                            <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
                                            <p>No training records found.</p>
                                            <p className="text-xs mt-1">Assign a training module to get started.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Performance Tab - Restricted */}
                            {activeTab === 'performance' && canViewSensitiveTabs && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Performance Reviews</h3>
                                        {isAdmin && (
                                            <button
                                                onClick={handleAddReview}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                                            >
                                                <Plus size={16} />
                                                New Review
                                            </button>
                                        )}
                                    </div>
                                    {reviewsList.length > 0 ? (
                                        <div className="space-y-4">
                                            {reviewsList.map(review => (
                                                <div key={review.id} className="bg-background-light dark:bg-background-dark/50 rounded-lg border border-border-light dark:border-border-dark p-6">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-bold text-text-light dark:text-text-dark">Review by {review.reviewer}</span>
                                                                <span className="text-xs text-text-muted-light dark:text-text-muted-dark">• {review.date}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                {[1, 2, 3, 4, 5].map(star => (
                                                                    <Star
                                                                        key={star}
                                                                        size={16}
                                                                        className={`${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                                                                    />
                                                                ))}
                                                                <span className="ml-2 text-sm font-medium text-text-light dark:text-text-dark">{review.rating}/5</span>
                                                            </div>
                                                        </div>
                                                        {isAdmin && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleEditReview(review)}
                                                                    className="p-1.5 text-text-muted-light hover:text-primary transition-colors"
                                                                    title="Edit Review"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteReview(review.id)}
                                                                    className="p-1.5 text-text-muted-light hover:text-accent-red transition-colors"
                                                                    title="Delete Review"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="bg-card-light dark:bg-card-dark p-4 rounded-lg border border-border-light dark:border-border-dark">
                                                        <p className="text-sm text-text-muted-light dark:text-text-muted-dark italic">"{review.notes}"</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-text-muted-light dark:text-text-muted-dark border-2 border-dashed border-border-light dark:border-border-dark rounded-xl">
                                            <Star size={48} className="mx-auto mb-4 opacity-20" />
                                            <p>No performance reviews recorded.</p>
                                            <p className="text-xs mt-1">Start by adding a new review.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {isEditProfileOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                                Edit Employee Profile
                            </h3>
                            <button
                                onClick={() => setIsEditProfileOpen(false)}
                                className="text-text-muted-light hover:text-text-light"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                    <input
                                        type="text"
                                        value={editForm.name || ''}
                                        onChange={(e) => handleProfileChange('name', e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                                    Role / Title
                                    {!canEditSensitiveInfo && <Lock size={12} className="inline ml-2 text-text-muted-light" />}
                                </label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                    <input
                                        type="text"
                                        value={editForm.role || ''}
                                        disabled={!canEditSensitiveInfo}
                                        onChange={(e) => handleProfileChange('role', e.target.value)}
                                        className={`w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark ${!canEditSensitiveInfo ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                                    Department
                                    {!canEditSensitiveInfo && <Lock size={12} className="inline ml-2 text-text-muted-light" />}
                                </label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                    <input
                                        type="text"
                                        value={editForm.department || ''}
                                        disabled={!canEditSensitiveInfo}
                                        onChange={(e) => handleProfileChange('department', e.target.value)}
                                        className={`w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark ${!canEditSensitiveInfo ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                    <input
                                        type="email"
                                        value={editForm.email || ''}
                                        onChange={(e) => handleProfileChange('email', e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Slack Handle</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                    <input
                                        type="text"
                                        value={editForm.slack || ''}
                                        onChange={(e) => handleProfileChange('slack', e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                        placeholder="@username"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Location</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                    <input
                                        type="text"
                                        value={editForm.location || ''}
                                        onChange={(e) => handleProfileChange('location', e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                                    Join Date
                                    {!canEditSensitiveInfo && <Lock size={12} className="inline ml-2 text-text-muted-light" />}
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                    <input
                                        type="date"
                                        value={editForm.joinDate || ''}
                                        disabled={!canEditSensitiveInfo}
                                        onChange={(e) => handleProfileChange('joinDate', e.target.value)}
                                        className={`w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark ${!canEditSensitiveInfo ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                                    Status
                                    {!canEditSensitiveInfo && <Lock size={12} className="inline ml-2 text-text-muted-light" />}
                                </label>
                                <div className="relative">
                                    <select
                                        value={editForm.status || 'Active'}
                                        disabled={!canEditSensitiveInfo}
                                        onChange={(e) => handleProfileChange('status', e.target.value as any)}
                                        className={`w-full pl-3 pr-8 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark appearance-none ${!canEditSensitiveInfo ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="On Leave">On Leave</option>
                                        <option value="Terminated">Terminated</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted-light">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Emergency Contact</label>
                                <div className="relative">
                                    <HeartPulse className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                    <input
                                        type="text"
                                        value={editForm.emergencyContact || ''}
                                        onChange={(e) => handleProfileChange('emergencyContact', e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                        placeholder="Name - Relation - Phone Number"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                                    <input
                                        type="tel"
                                        value={editForm.phone || ''}
                                        onChange={(e) => handleProfileChange('phone', e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                        placeholder="+66812345678"
                                    />
                                </div>
                                <p className="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">
                                    Include country code (e.g., +66812345678)
                                </p>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Bio</label>
                                <div className="relative">
                                    <AlignLeft className="absolute left-3 top-3 text-text-muted-light" size={16} />
                                    <textarea
                                        rows={3}
                                        value={editForm.bio || ''}
                                        onChange={(e) => handleProfileChange('bio', e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark resize-none"
                                        placeholder="Short professional biography..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
                            <button
                                onClick={() => setIsEditProfileOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleProfileSave}
                                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2"
                            >
                                <Check size={16} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Add History Modal (Admin Only) */}
            {isAddHistoryModalOpen && isAdmin && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                                Add Employment History
                            </h3>
                            <button
                                onClick={() => setIsAddHistoryModalOpen(false)}
                                className="text-text-muted-light hover:text-text-light"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Role</label>
                                <input
                                    type="text"
                                    value={newHistoryForm.role || ''}
                                    onChange={(e) => setNewHistoryForm({ ...newHistoryForm, role: e.target.value })}
                                    placeholder="e.g. Senior Developer"
                                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Department</label>
                                <input
                                    type="text"
                                    value={newHistoryForm.department || ''}
                                    onChange={(e) => setNewHistoryForm({ ...newHistoryForm, department: e.target.value })}
                                    placeholder="e.g. Engineering"
                                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={newHistoryForm.startDate || ''}
                                        onChange={(e) => setNewHistoryForm({ ...newHistoryForm, startDate: e.target.value })}
                                        className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">End Date</label>
                                    <input
                                        type="text"
                                        value={newHistoryForm.endDate || ''}
                                        onChange={(e) => setNewHistoryForm({ ...newHistoryForm, endDate: e.target.value })}
                                        placeholder="Present"
                                        className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Description</label>
                                <textarea
                                    value={newHistoryForm.description || ''}
                                    onChange={(e) => setNewHistoryForm({ ...newHistoryForm, description: e.target.value })}
                                    rows={3}
                                    placeholder="Key responsibilities and achievements..."
                                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark resize-none"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
                            <button
                                onClick={() => setIsAddHistoryModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveNewHistory}
                                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2"
                            >
                                <Check size={16} /> Save Position
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Performance Review Modal (Admin Only) */}
            {isReviewModalOpen && isAdmin && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                                {reviewForm.id ? 'Edit Performance Review' : 'New Performance Review'}
                            </h3>
                            <button
                                onClick={() => setIsReviewModalOpen(false)}
                                className="text-text-muted-light hover:text-text-light"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Reviewer</label>
                                <input
                                    type="text"
                                    value={reviewForm.reviewer || ''}
                                    onChange={(e) => setReviewForm({ ...reviewForm, reviewer: e.target.value })}
                                    placeholder="Reviewer Name"
                                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Date</label>
                                <input
                                    type="date"
                                    value={reviewForm.date || ''}
                                    onChange={(e) => setReviewForm({ ...reviewForm, date: e.target.value })}
                                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Rating</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                            className="focus:outline-none"
                                        >
                                            <Star
                                                size={24}
                                                className={`${star <= (reviewForm.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Notes</label>
                                <textarea
                                    value={reviewForm.notes || ''}
                                    onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                                    rows={4}
                                    placeholder="Detailed feedback..."
                                    className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark resize-none"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
                            <button
                                onClick={() => setIsReviewModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveReview}
                                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2"
                            >
                                <Check size={16} /> Save Review
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <Trash2 className="text-red-600 dark:text-red-400" size={24} />
                            </div>
                            <h3 className="font-bold text-lg text-text-light dark:text-text-dark mb-2">
                                Delete Review?
                            </h3>
                            <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                                This action cannot be undone. Are you sure you want to delete this performance review?
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-center gap-3 bg-gray-50 dark:bg-gray-800/50">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteReview}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Toast Notification */}
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