import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
    FileText,
    Download,
    UploadCloud,
    Search,
    ShieldCheck,
    FolderOpen,
    Grid,
    List,
    MoreVertical,
    FileSpreadsheet,
    FileImage,
    File,
    Clock,
    HardDrive,
    Share2,
    Filter,
    X,
    Trash2,
    RotateCcw,
} from 'lucide-react';
import { DocumentItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Toast } from '../components/Toast';

export const Documents: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'HR_ADMIN';

    // Toast state
    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
        show: false, message: '', type: 'success'
    });
    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setToast({ show: true, message, type });
    };

    // Delete confirmation state
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Dropdown menu state
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedCategory, setSelectedCategory] = useState<string>('All Files');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFileType, setSelectedFileType] = useState<string>('All');
    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

    // Upload State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const [trashDocuments, setTrashDocuments] = useState<DocumentItem[]>([]);

    // Storage stats
    const [storageStats, setStorageStats] = useState<{
        used: number;
        total: number;
        usedFormatted: string;
        totalFormatted: string;
        percentage: number;
    } | null>(null);

    const fetchDocuments = async () => {
        try {
            const data = await api.get<DocumentItem[]>('/documents');
            setDocuments(data);
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    };

    const fetchTrashDocuments = async () => {
        try {
            const data = await api.get<DocumentItem[]>('/documents/trash');
            setTrashDocuments(data);
        } catch (error) {
            console.error('Error fetching trash documents:', error);
        }
    };

    const fetchStorageStats = async () => {
        try {
            const data = await api.get<{
                used: number;
                total: number;
                usedFormatted: string;
                totalFormatted: string;
                percentage: number;
            }>('/documents/storage');
            setStorageStats(data);
        } catch (error) {
            console.error('Error fetching storage stats:', error);
        }
    };

    useEffect(() => {
        fetchDocuments();
        fetchTrashDocuments();
        fetchStorageStats();
    }, []);

    // Fetch image preview with auth token
    useEffect(() => {
        if (!previewDoc) {
            setPreviewImageUrl(null);
            return;
        }

        const imageTypes = ['JPG', 'PNG', 'JPEG', 'GIF'];
        if (!imageTypes.includes(previewDoc.type)) {
            setPreviewImageUrl(null);
            return;
        }

        const fetchImage = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/documents/${previewDoc.id}/download`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    setPreviewImageUrl(url);
                }
            } catch (error) {
                console.error('Error fetching image preview:', error);
            }
        };

        fetchImage();

        // Cleanup blob URL on unmount
        return () => {
            if (previewImageUrl) {
                URL.revokeObjectURL(previewImageUrl);
            }
        };
    }, [previewDoc]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        if (openMenuId) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
        return;
    }, [openMenuId]);

    const categories = [
        { name: 'All Files', icon: <FolderOpen size={18} /> },
        { name: 'Contracts', icon: <FileText size={18} /> },
        { name: 'Policies', icon: <ShieldCheck size={18} /> },
        { name: 'Finance', icon: <FileSpreadsheet size={18} /> },
        { name: 'HR', icon: <UsersIcon size={18} /> },
        { name: 'Recent', icon: <Clock size={18} /> },
        // Hide Trash for employees typically, but keeping for UI consistency or filtered content
        ...(isAdmin ? [{ name: 'Trash', icon: <Trash2Icon size={18} /> }] : []),
    ];

    const fileTypes = ['All', 'PDF', 'DOCX', 'XLSX', 'JPG', 'PNG'];

    // Use trashDocuments when viewing Trash, otherwise use active documents
    const sourceDocuments = selectedCategory === 'Trash' ? trashDocuments : documents;

    const filteredDocuments = sourceDocuments.filter(doc => {
        // 1. Filter by User Role Permission
        // Admins see all. Employees see their own docs OR public policies.
        const hasPermission = isAdmin || doc.owner === user?.name || doc.category === 'Policies';
        if (!hasPermission) return false;

        // 2. Filter by Search
        const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());

        // 3. Filter by Category (skip for Trash since we already filtered by source)
        const matchesCategory =
            selectedCategory === 'All Files' ? true :
                selectedCategory === 'Recent' ? true :
                    selectedCategory === 'Trash' ? true :
                        doc.category === selectedCategory;

        // 4. Filter by Type
        const matchesType = selectedFileType === 'All' || doc.type === selectedFileType;

        return matchesSearch && matchesCategory && matchesType;
    });

    const getFileIcon = (type: string, size: number = 24) => {
        switch (type) {
            case 'PDF': return <FileText className="text-red-500" size={size} />;
            case 'DOCX': return <FileText className="text-blue-500" size={size} />;
            case 'XLSX': return <FileSpreadsheet className="text-green-500" size={size} />;
            case 'JPG':
            case 'PNG': return <FileImage className="text-purple-500" size={size} />;
            default: return <File className="text-gray-500" size={size} />;
        }
    };

    const handleDownload = async (e: React.MouseEvent, docId: string) => {
        e.stopPropagation();
        try {
            // Use fetch directly for file download since api client returns JSON
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/documents/${docId}/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const error = await response.json();
                showToast(error.error || 'Download failed', 'error');
                return;
            }

            // Get filename from Content-Disposition header or use default
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'document'; // Browser will use actual filename from header
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            showToast('Download started!', 'success');
        } catch (error) {
            console.error('Error downloading:', error);
            showToast('Download failed. Please try again.', 'error');
        }
    };

    const handleShare = async (e: React.MouseEvent, doc: DocumentItem) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/api/documents/${doc.id}/download`;

        try {
            await navigator.clipboard.writeText(shareUrl);
            showToast('Link copied to clipboard!', 'success');
        } catch {
            // Fallback - still show toast
            showToast('Could not copy link automatically. URL: ' + shareUrl, 'info');
        }
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [uploadCategory, setUploadCategory] = React.useState('HR');

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('category', uploadCategory);
            formData.append('ownerName', user?.name || 'Unknown');
            formData.append('employeeId', user?.id || '');

            const token = localStorage.getItem('token');
            const response = await fetch('/api/documents', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            fetchDocuments();
            fetchStorageStats();
            setIsUploadModalOpen(false);
            setSelectedFile(null);
            setUploadCategory('HR');
            showToast(`"${selectedFile.name}" uploaded successfully!`, 'success');
        } catch (error) {
            const apiError = error as Error;
            console.error('Error uploading document:', apiError);
            showToast(apiError.message || 'Upload failed. Please try again.', 'error');
        }
    };

    const handleDelete = (e: React.MouseEvent, docId: string) => {
        e.stopPropagation();
        setDeleteConfirmId(docId);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;

        try {
            await api.delete(`/documents/${deleteConfirmId}`);
            fetchDocuments();
            fetchTrashDocuments();
            if (previewDoc?.id === deleteConfirmId) setPreviewDoc(null);
            showToast('Document moved to trash.', 'success');
        } catch (error) {
            console.error('Error deleting document:', error);
            showToast('Failed to delete document.', 'error');
        } finally {
            setDeleteConfirmId(null);
        }
    };

    const handleRestore = async (e: React.MouseEvent, docId: string) => {
        e.stopPropagation();
        try {
            await api.post(`/documents/${docId}/restore`, {});
            fetchDocuments();
            fetchTrashDocuments();
            showToast('Document restored successfully.', 'success');
        } catch (error) {
            console.error('Error restoring document:', error);
            showToast('Failed to restore document.', 'error');
        }
    };

    const handlePermanentDelete = async (e: React.MouseEvent, docId: string) => {
        e.stopPropagation();
        try {
            await api.delete(`/documents/${docId}/permanent`);
            fetchTrashDocuments();
            fetchStorageStats();
            showToast('Document permanently deleted.', 'success');
        } catch (error) {
            console.error('Error permanently deleting document:', error);
            showToast('Failed to permanently delete document.', 'error');
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] animate-fade-in gap-6 relative">

            {/* Left Sidebar */}
            <aside className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-6">
                <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 shadow-sm">
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="w-full py-2.5 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mb-6"
                    >
                        <UploadCloud size={18} />
                        Upload New
                    </button>


                    <nav className="space-y-1">
                        {categories.map((cat) => (
                            <button
                                key={cat.name}
                                onClick={() => setSelectedCategory(cat.name)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedCategory === cat.name
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                            >
                                {cat.icon}
                                {cat.name}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-text-light dark:text-text-dark font-semibold">
                        <HardDrive size={18} />
                        <h3>Storage</h3>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden mb-2">
                        <div
                            className={`h-full rounded-full transition-all ${
                                (storageStats?.percentage ?? 0) > 90 ? 'bg-red-500' :
                                (storageStats?.percentage ?? 0) > 70 ? 'bg-accent-orange' : 'bg-green-500'
                            }`}
                            style={{ width: `${storageStats?.percentage ?? 0}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs text-text-muted-light dark:text-text-muted-dark">
                        <span>{storageStats?.usedFormatted ?? '0 B'} used</span>
                        <span>{storageStats?.totalFormatted ?? '100 GB'} total</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-border-light dark:border-border-dark flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-text-light dark:text-text-dark">
                        <h2>{selectedCategory}</h2>
                        <span className="text-text-muted-light dark:text-text-muted-dark font-normal text-sm ml-2">({filteredDocuments.length})</span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">

                        {/* File Type Filter */}
                        <div className="relative hidden sm:block">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                            <select
                                value={selectedFileType}
                                onChange={(e) => setSelectedFileType(e.target.value)}
                                className="appearance-none pl-9 pr-8 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer text-text-light dark:text-text-dark"
                            >
                                {fileTypes.map(type => (
                                    <option key={type} value={type}>{type === 'All' ? 'All Types' : type}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted-light">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </div>

                        <div className="relative flex-grow sm:flex-grow-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-64 pl-9 pr-4 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div className="flex bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-card-dark shadow-sm text-primary' : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light'}`}
                            >
                                <Grid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-card-dark shadow-sm text-primary' : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light'}`}
                            >
                                <List size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background-light/50 dark:bg-background-dark/50">
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredDocuments.map(doc => (
                                <div
                                    key={doc.id}
                                    onClick={() => setPreviewDoc(doc)}
                                    className="group bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer relative"
                                >
                                    {/* Menu Button */}
                                    <div className="absolute top-2 right-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === doc.id ? null : doc.id);
                                            }}
                                            className="p-1.5 text-text-muted-light hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <MoreVertical size={16} />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {openMenuId === doc.id && (
                                            <div className="absolute right-0 top-8 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-border-light dark:border-border-dark py-1 z-10">
                                                {selectedCategory === 'Trash' ? (
                                                    <>
                                                        <button
                                                            onClick={(e) => { handleRestore(e, doc.id); setOpenMenuId(null); }}
                                                            className="w-full px-3 py-2 text-left text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2"
                                                        >
                                                            <RotateCcw size={14} /> Restore
                                                        </button>
                                                        <button
                                                            onClick={(e) => { handlePermanentDelete(e, doc.id); setOpenMenuId(null); }}
                                                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                                        >
                                                            <Trash2 size={14} /> Delete Permanently
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={(e) => { handleDownload(e, doc.id); setOpenMenuId(null); }}
                                                            className="w-full px-3 py-2 text-left text-sm text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                                        >
                                                            <Download size={14} /> Download
                                                        </button>
                                                        <button
                                                            onClick={(e) => { handleShare(e, doc); setOpenMenuId(null); }}
                                                            className="w-full px-3 py-2 text-left text-sm text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                                        >
                                                            <Share2 size={14} /> Share
                                                        </button>
                                                        <button
                                                            onClick={(e) => { handleDelete(e, doc.id); setOpenMenuId(null); }}
                                                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                                        >
                                                            <Trash2 size={14} /> Move to Trash
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-24 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-3">
                                        {getFileIcon(doc.type)}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-medium text-text-light dark:text-text-dark text-sm truncate mb-1" title={doc.name}>{doc.name}</h4>
                                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark truncate">{doc.size}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-text-muted-light dark:text-text-muted-dark font-semibold">
                                        <tr>
                                            <th className="px-6 py-4">Name</th>
                                            <th className="px-6 py-4">Category</th>
                                            <th className="px-6 py-4">Size</th>
                                            <th className="px-6 py-4">Owner</th>
                                            <th className="px-6 py-4">Last Modified</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-light dark:divide-border-dark">
                                        {filteredDocuments.map(doc => (
                                            <tr
                                                key={doc.id}
                                                onClick={() => setPreviewDoc(doc)}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group cursor-pointer"
                                            >
                                                <td className="px-6 py-3 font-medium text-text-light dark:text-text-dark flex items-center gap-3">
                                                    {getFileIcon(doc.type)}
                                                    {doc.name}
                                                </td>
                                                <td className="px-6 py-3 text-text-muted-light dark:text-text-muted-dark">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                                                        {doc.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-text-muted-light dark:text-text-muted-dark font-mono text-xs">{doc.size}</td>
                                                <td className="px-6 py-3 text-text-muted-light dark:text-text-muted-dark">{doc.owner}</td>
                                                <td className="px-6 py-3 text-text-muted-light dark:text-text-muted-dark">{doc.lastAccessed}</td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => handleDownload(e, doc.id)}
                                                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-text-muted-light hover:text-primary transition-colors" title="Download"
                                                        >
                                                            <Download size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleShare(e, doc)}
                                                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-text-muted-light hover:text-primary transition-colors" title="Share"
                                                        >
                                                            <Share2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDelete(e, doc.id)}
                                                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-text-muted-light hover:text-red-500 transition-colors" title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3">
                                {filteredDocuments.map(doc => (
                                    <div
                                        key={doc.id}
                                        onClick={() => setPreviewDoc(doc)}
                                        className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
                                    >
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="flex-shrink-0">
                                                {getFileIcon(doc.type, 32)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-text-light dark:text-text-dark text-sm mb-1 truncate" title={doc.name}>
                                                    {doc.name}
                                                </h4>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                                                    {doc.category}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs text-text-muted-light dark:text-text-muted-dark mb-3">
                                            <div>
                                                <span className="font-medium">Size:</span> {doc.size}
                                            </div>
                                            <div>
                                                <span className="font-medium">Owner:</span> {doc.owner}
                                            </div>
                                            <div className="col-span-2">
                                                <span className="font-medium">Modified:</span> {doc.lastAccessed}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-3 border-t border-border-light dark:border-border-dark">
                                            <button
                                                onClick={(e) => handleDownload(e, doc.id)}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
                                            >
                                                <Download size={14} /> Download
                                            </button>
                                            <button
                                                onClick={(e) => handleShare(e, doc)}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-text-light dark:text-text-dark rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <Share2 size={14} /> Share
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, doc.id)}
                                                className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {filteredDocuments.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-text-muted-light py-12">
                            <FolderOpen size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">No documents found.</p>
                            <p className="text-sm">You have access to your personal documents and company policies.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* File Preview Modal */}
            {previewDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-card-dark rounded-xl shadow-2xl border border-border-light dark:border-border-dark w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                                {getFileIcon(previewDoc.type)}
                                <div>
                                    <h3 className="font-bold text-lg text-text-light dark:text-text-dark">{previewDoc.name}</h3>
                                    <p className="text-xs text-text-muted-light">{previewDoc.size} • {previewDoc.lastAccessed}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => handleDownload(e, previewDoc.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    <Download size={16} /> Download
                                </button>
                                <button
                                    onClick={() => setPreviewDoc(null)}
                                    className="p-2 text-text-muted-light hover:text-text-light dark:hover:text-text-dark hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-8 overflow-auto">
                            {/* Preview Content */}
                            {['JPG', 'PNG', 'JPEG', 'GIF'].includes(previewDoc.type) ? (
                                <div className="relative shadow-lg">
                                    {previewImageUrl ? (
                                        <img src={previewImageUrl} alt="Preview" className="max-w-full max-h-full rounded-lg" />
                                    ) : (
                                        <div className="flex items-center justify-center h-64 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-lg w-full border border-border-light dark:border-border-dark">
                                    <div className="flex justify-center mb-6">
                                        {getFileIcon(previewDoc.type, 64)}
                                    </div>
                                    <h4 className="text-xl font-semibold text-text-light dark:text-text-dark mb-2">Preview not available</h4>
                                    <p className="text-text-muted-light mb-6">This file type cannot be previewed directly in the browser. Please download the file to view its contents.</p>
                                    <button
                                        onClick={(e) => handleDownload(e, previewDoc.id)}
                                        className="px-6 py-2.5 border border-border-light dark:border-border-dark rounded-lg font-medium text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Download File
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-card-dark rounded-xl shadow-2xl border border-border-light dark:border-border-dark w-full max-w-md overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
                            <h3 className="font-bold text-lg text-text-light dark:text-text-dark">Upload Document</h3>
                            <button
                                onClick={() => { setIsUploadModalOpen(false); setSelectedFile(null); }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* File Input Zone */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-border-light dark:border-border-dark rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                                />
                                {selectedFile ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <FileText size={48} className="text-primary" />
                                        <p className="text-sm font-medium text-text-light dark:text-text-dark">{selectedFile.name}</p>
                                        <p className="text-xs text-text-muted-light">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <UploadCloud size={48} className="text-text-muted-light" />
                                        <p className="text-sm text-text-light dark:text-text-dark">Click to select a file</p>
                                        <p className="text-xs text-text-muted-light">PDF, DOCX, XLSX, JPG, PNG (max 50MB)</p>
                                    </div>
                                )}
                            </div>

                            {/* Category Selector */}
                            <div>
                                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Category</label>
                                <select
                                    value={uploadCategory}
                                    onChange={(e) => setUploadCategory(e.target.value)}
                                    className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark"
                                >
                                    <option value="HR">HR</option>
                                    <option value="Contracts">Contracts</option>
                                    <option value="Policies">Policies</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Personal">Personal</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-4 border-t border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50">
                            <button
                                onClick={() => { setIsUploadModalOpen(false); setSelectedFile(null); }}
                                className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={!selectedFile}
                                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Upload
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-card-dark rounded-xl shadow-2xl border border-border-light dark:border-border-dark w-full max-w-sm overflow-hidden">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <Trash2 className="text-red-600 dark:text-red-400" size={24} />
                            </div>
                            <h3 className="font-bold text-lg text-text-light dark:text-text-dark mb-2">
                                Delete Document?
                            </h3>
                            <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                                This action cannot be undone. The document will be permanently deleted.
                            </p>
                        </div>
                        <div className="flex justify-center gap-3 p-4 border-t border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
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

// Helper for HR Category Icon (avoiding circular dependency or large import lists)
const UsersIcon = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);

const Trash2Icon = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
);
