import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BASE_URL, getAuthToken } from '../lib/api';
import { Dropdown } from '../components/Dropdown';
import { useDocumentList, useDocumentTrash, useDocumentStorage, useDeleteDocument, useRestoreDocument, usePermanentDeleteDocument } from '../hooks/queries';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
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
import { formatDate } from '../lib/date';
import { Toast } from '../components/Toast';
import { Pagination } from '../components/Pagination';

export const Documents: React.FC = () => {
  const { t } = useTranslation(['documents', 'common']);
  const { user, isAdminView } = useAuth();
  const isAdmin = isAdminView;

  // Toast state
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    show: false,
    message: '',
    type: 'success',
  });
  const showToast = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'success'
  ) => {
    setToast({ show: true, message, type });
  };

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Files');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFileType, setSelectedFileType] = useState<string>('All');
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const blobUrlRefs = useRef<{ image: string | null; pdf: string | null }>({ image: null, pdf: null });

  const displaySize = (size: string | undefined) => {
    if (!size || /^0(\.0+)?\s*(B|KB|MB|GB)$/i.test(size)) return '-';
    return size;
  };

  // Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const qc = useQueryClient();

  // React Query
  const { data: docsResponse } = useDocumentList({
    page: currentPage,
    limit: itemsPerPage,
    category: selectedCategory !== 'All Files' && selectedCategory !== 'Recent' && selectedCategory !== 'Trash' ? selectedCategory : undefined,
    type: selectedFileType !== 'All' ? selectedFileType : undefined,
    search: searchTerm || undefined,
  });
  const { data: trashDocuments = [] } = useDocumentTrash();
  const { data: storageStats } = useDocumentStorage() as { data: { used: number; total: number; usedFormatted: string; totalFormatted: string; percentage: number } | undefined };
  const deleteDocMutation = useDeleteDocument();
  const restoreDocMutation = useRestoreDocument();
  const permanentDeleteMutation = usePermanentDeleteDocument();

  const documents = docsResponse?.data ?? [];
  const totalItems = docsResponse?.total ?? 0;
  const totalPages = docsResponse?.totalPages ?? 1;

  // Handler functions for pagination and filters
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleFileTypeChange = (type: string) => {
    setSelectedFileType(type);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Fetch file preview with auth token (images + PDF)
  useEffect(() => {
    // Revoke previous blob URLs
    if (blobUrlRefs.current.image) URL.revokeObjectURL(blobUrlRefs.current.image);
    if (blobUrlRefs.current.pdf) URL.revokeObjectURL(blobUrlRefs.current.pdf);
    blobUrlRefs.current = { image: null, pdf: null };

    if (!previewDoc) {
      setPreviewImageUrl(null);
      setPreviewPdfUrl(null);
      return;
    }

    const imageTypes = ['JPG', 'PNG', 'JPEG', 'GIF'];
    const isImage = imageTypes.includes(previewDoc.type);
    const isPdf = previewDoc.type === 'PDF';

    if (!isImage && !isPdf) {
      setPreviewImageUrl(null);
      setPreviewPdfUrl(null);
      return;
    }

    let cancelled = false;

    const fetchPreview = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(`${BASE_URL}/documents/${previewDoc.id}/download`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok && !cancelled) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          if (isImage) {
            blobUrlRefs.current.image = url;
            setPreviewImageUrl(url);
            setPreviewPdfUrl(null);
          } else {
            blobUrlRefs.current.pdf = url;
            setPreviewPdfUrl(url);
            setPreviewImageUrl(null);
          }
        }
      } catch (error) {
        console.error('Error fetching preview:', error);
      }
    };

    fetchPreview();

    return () => {
      cancelled = true;
      if (blobUrlRefs.current.image) URL.revokeObjectURL(blobUrlRefs.current.image);
      if (blobUrlRefs.current.pdf) URL.revokeObjectURL(blobUrlRefs.current.pdf);
      blobUrlRefs.current = { image: null, pdf: null };
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
    { name: 'All Files', label: t('categories.allFiles'), icon: <FolderOpen size={18} /> },
    { name: 'Contracts', label: t('categories.contracts'), icon: <FileText size={18} /> },
    { name: 'Policies', label: t('categories.policies'), icon: <ShieldCheck size={18} /> },
    { name: 'Finance', label: t('categories.finance'), icon: <FileSpreadsheet size={18} /> },
    { name: 'HR', label: t('categories.hr'), icon: <UsersIcon size={18} /> },
    { name: 'Recent', label: t('categories.recent'), icon: <Clock size={18} /> },
    ...(isAdmin ? [{ name: 'Trash', label: t('categories.trash'), icon: <Trash2Icon size={18} /> }] : []),
  ];

  const categoryLabelMap: Record<string, string> = {};
  categories.forEach(c => { categoryLabelMap[c.name] = c.label; });

  const fileTypes = ['All', 'PDF', 'DOCX', 'XLSX', 'JPG', 'PNG'];

  // Use trashDocuments when viewing Trash, otherwise use active documents
  const sourceDocuments = selectedCategory === 'Trash' ? trashDocuments : documents;

  const filteredDocuments = sourceDocuments.filter((doc) => {
    // 1. Filter by User Role Permission
    // Admins see all. Employees see their own docs OR public policies.
    const hasPermission = isAdmin || doc.owner === user?.name || doc.category === 'Policies';
    if (!hasPermission) return false;

    // 2. Filter by Search
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());

    // 3. Filter by Category (skip for Trash since we already filtered by source)
    const matchesCategory =
      selectedCategory === 'All Files'
        ? true
        : selectedCategory === 'Recent'
          ? true
          : selectedCategory === 'Trash'
            ? true
            : doc.category === selectedCategory;

    // 4. Filter by Type
    const matchesType = selectedFileType === 'All' || doc.type === selectedFileType;

    return matchesSearch && matchesCategory && matchesType;
  });

  const getFileIcon = (type: string, size: number = 24) => {
    switch (type) {
      case 'PDF':
        return <FileText className="text-red-500" size={size} />;
      case 'DOCX':
        return <FileText className="text-blue-500" size={size} />;
      case 'XLSX':
        return <FileSpreadsheet className="text-green-500" size={size} />;
      case 'JPG':
      case 'PNG':
        return <FileImage className="text-purple-500" size={size} />;
      default:
        return <File className="text-gray-500" size={size} />;
    }
  };

  const handleDownload = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    try {
      // Use fetch directly for file download since api client returns JSON
      const token = getAuthToken();
      const response = await fetch(`${BASE_URL}/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
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
      showToast(t('toast.downloadStarted'), 'success');
    } catch (error) {
      console.error('Error downloading:', error);
      showToast(t('toast.downloadFailed'), 'error');
    }
  };

  const handleShare = async (e: React.MouseEvent, doc: DocumentItem) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/#/documents?preview=${doc.id}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast(t('toast.linkCopied'), 'success');
    } catch {
      showToast(t('toast.linkCopyFailed'), 'info');
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

      const token = getAuthToken();
      const response = await fetch(`${BASE_URL}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      await qc.invalidateQueries({ queryKey: queryKeys.documents.all });
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setUploadCategory('HR');
      showToast(t('upload.success', { filename: selectedFile.name }), 'success');
    } catch (error) {
      const apiError = error as Error;
      console.error('Error uploading document:', apiError);
      showToast(apiError.message || t('upload.failed'), 'error');
    }
  };

  const handleDelete = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    setDeleteConfirmId(docId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteDocMutation.mutateAsync(deleteConfirmId);
      if (previewDoc?.id === deleteConfirmId) setPreviewDoc(null);
      showToast(t('toast.movedToTrash'), 'success');
    } catch (error) {
      console.error('Error deleting document:', error);
      showToast(t('toast.deleteFailed'), 'error');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleRestore = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    try {
      await restoreDocMutation.mutateAsync(docId);
      showToast(t('toast.restored'), 'success');
    } catch (error) {
      console.error('Error restoring document:', error);
      showToast(t('toast.restoreFailed'), 'error');
    }
  };

  const handlePermanentDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    try {
      await permanentDeleteMutation.mutateAsync(docId);
      showToast(t('toast.permanentlyDeleted'), 'success');
    } catch (error) {
      console.error('Error permanently deleting document:', error);
      showToast(t('toast.permanentDeleteFailed'), 'error');
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
            {t('uploadNew')}
          </button>

          <nav className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleCategoryChange(cat.name)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat.name
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-text-light dark:text-text-dark font-semibold">
            <HardDrive size={18} />
            <h3>{t('storage')}</h3>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all ${
                (storageStats?.percentage ?? 0) > 90
                  ? 'bg-red-500'
                  : (storageStats?.percentage ?? 0) > 70
                    ? 'bg-accent-orange'
                    : 'bg-green-500'
              }`}
              style={{ width: `${storageStats?.percentage ?? 0}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-text-muted-light dark:text-text-muted-dark">
            <span>{t('usedOfTotal', { used: storageStats?.usedFormatted ?? '0 B' })}</span>
            <span>{t('totalStorage', { total: storageStats?.totalFormatted ?? '100 GB' })}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border-light dark:border-border-dark flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-text-light dark:text-text-dark">
            <h2>{categoryLabelMap[selectedCategory] || selectedCategory}</h2>
            <span className="text-text-muted-light dark:text-text-muted-dark font-normal text-sm ml-2">
              ({filteredDocuments.length})
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* File Type Filter */}
            <div className="relative hidden sm:block">
              <Filter
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light"
                size={16}
              />
              <select
                value={selectedFileType}
                onChange={(e) => handleFileTypeChange(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer text-text-light dark:text-text-dark"
              >
                {fileTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === 'All' ? t('fileTypes.all') : type}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted-light">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>

            <div className="relative flex-grow sm:flex-grow-0">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light"
                size={16}
              />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={handleSearchChange}
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
              {filteredDocuments.map((doc) => (
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
                              onClick={(e) => {
                                handleRestore(e, doc.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2"
                            >
                              <RotateCcw size={14} /> {t('actions.restore')}
                            </button>
                            <button
                              onClick={(e) => {
                                handlePermanentDelete(e, doc.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                              <Trash2 size={14} /> {t('actions.deletePermanently')}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                handleDownload(e, doc.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Download size={14} /> {t('actions.download')}
                            </button>
                            <button
                              onClick={(e) => {
                                handleShare(e, doc);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Share2 size={14} /> {t('actions.share')}
                            </button>
                            <button
                              onClick={(e) => {
                                handleDelete(e, doc.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                              <Trash2 size={14} /> {t('actions.moveToTrash')}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="h-24 flex items-center justify-center bg-white dark:bg-card-dark rounded-lg mb-3">
                    {getFileIcon(doc.type)}
                  </div>
                  <div className="min-w-0">
                    <h4
                      className="font-medium text-text-light dark:text-text-dark text-sm truncate mb-1"
                      title={doc.name}
                    >
                      {doc.name}
                    </h4>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark truncate">
                      {displaySize(doc.size)}
                    </p>
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
                      <th className="px-6 py-4">{t('table.name')}</th>
                      <th className="px-6 py-4">{t('table.category')}</th>
                      <th className="px-6 py-4">{t('table.size')}</th>
                      <th className="px-6 py-4">{t('table.owner')}</th>
                      <th className="px-6 py-4">{t('table.lastModified')}</th>
                      <th className="px-6 py-4 text-right">{t('table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {filteredDocuments.map((doc) => (
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
                        <td className="px-6 py-3 text-text-muted-light dark:text-text-muted-dark font-mono text-xs">
                          {displaySize(doc.size)}
                        </td>
                        <td className="px-6 py-3 text-text-muted-light dark:text-text-muted-dark">
                          {doc.owner}
                        </td>
                        <td className="px-6 py-3 text-text-muted-light dark:text-text-muted-dark">
                          {formatDate(doc.lastAccessed)}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleDownload(e, doc.id)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-text-muted-light hover:text-primary transition-colors"
                              title="Download"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={(e) => handleShare(e, doc)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-text-muted-light hover:text-primary transition-colors"
                              title="Share"
                            >
                              <Share2 size={16} />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, doc.id)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-text-muted-light hover:text-red-500 transition-colors"
                              title="Delete"
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
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setPreviewDoc(doc)}
                    className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-shrink-0">{getFileIcon(doc.type, 32)}</div>
                      <div className="flex-1 min-w-0">
                        <h4
                          className="font-medium text-text-light dark:text-text-dark text-sm mb-1 truncate"
                          title={doc.name}
                        >
                          {doc.name}
                        </h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                          {doc.category}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-text-muted-light dark:text-text-muted-dark mb-3">
                      <div>
                        <span className="font-medium">{t('card.size')}</span> {displaySize(doc.size)}
                      </div>
                      <div>
                        <span className="font-medium">{t('card.owner')}</span> {doc.owner}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">{t('card.modified')}</span> {formatDate(doc.lastAccessed)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-border-light dark:border-border-dark">
                      <button
                        onClick={(e) => handleDownload(e, doc.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
                      >
                        <Download size={14} /> {t('actions.download')}
                      </button>
                      <button
                        onClick={(e) => handleShare(e, doc)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-text-light dark:text-text-dark rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Share2 size={14} /> {t('actions.share')}
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
              <p className="text-lg font-medium">{t('noDocuments')}</p>
              <p className="text-sm">
                {t('employeeAccess')}
              </p>
            </div>
          )}

          {/* Pagination */}
          {selectedCategory !== 'Trash' && totalPages > 1 && (
            <div className="p-4 border-t border-border-light dark:border-border-dark mt-6">
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
      </div>

      {/* File Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-card-dark rounded-xl shadow-2xl border border-border-light dark:border-border-dark w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                {getFileIcon(previewDoc.type)}
                <div>
                  <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                    {previewDoc.name}
                  </h3>
                  <p className="text-xs text-text-muted-light">
                    {displaySize(previewDoc.size)} • {formatDate(previewDoc.lastAccessed)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleDownload(e, previewDoc.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Download size={16} /> {t('actions.download')}
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
                    <img
                      src={previewImageUrl}
                      alt="Preview"
                      className="max-w-full max-h-full rounded-lg"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-64 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
              ) : previewDoc.type === 'PDF' ? (
                previewPdfUrl ? (
                  <iframe
                    src={previewPdfUrl}
                    className="w-full h-full rounded-lg bg-white"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )
              ) : (
                <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-lg w-full border border-border-light dark:border-border-dark">
                  <div className="flex justify-center mb-6">{getFileIcon(previewDoc.type, 64)}</div>
                  <h4 className="text-xl font-semibold text-text-light dark:text-text-dark mb-2">
                    {t('preview.notAvailable')}
                  </h4>
                  <p className="text-text-muted-light mb-6">
                    {t('preview.notAvailableDesc')}
                  </p>
                  <button
                    onClick={(e) => handleDownload(e, previewDoc.id)}
                    className="px-6 py-2.5 border border-border-light dark:border-border-dark rounded-lg font-medium text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('preview.downloadFile')}
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
              <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                {t('upload.title')}
              </h3>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setSelectedFile(null);
                }}
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
                    <p className="text-sm font-medium text-text-light dark:text-text-dark">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-text-muted-light">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <UploadCloud size={48} className="text-text-muted-light" />
                    <p className="text-sm text-text-light dark:text-text-dark">
                      {t('upload.dragDrop')}
                    </p>
                    <p className="text-xs text-text-muted-light">
                      {t('upload.hint')}
                    </p>
                  </div>
                )}
              </div>

              {/* Category Selector */}
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                  {t('upload.category')}
                </label>
                <Dropdown
                  id="upload-category"
                  name="category"
                  value={uploadCategory}
                  onChange={(value) => setUploadCategory(value)}
                  options={[
                    { value: 'HR', label: t('categories.hr') },
                    { value: 'Contracts', label: t('categories.contracts') },
                    { value: 'Policies', label: t('categories.policies') },
                    { value: 'Finance', label: t('categories.finance') },
                    { value: 'Personal', label: t('categories.personal') },
                  ]}
                  placeholder={t('common:placeholders.selectCategory')}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setSelectedFile(null);
                }}
                className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light transition-colors"
              >
                {t('upload.cancel')}
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile}
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('upload.upload')}
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
                {t('deleteDialog.title')}
              </h3>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                {t('deleteDialog.message')}
              </p>
            </div>
            <div className="flex justify-center gap-3 p-4 border-t border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light transition-colors"
              >
                {t('deleteDialog.cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 size={16} /> {t('deleteDialog.delete')}
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
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
};

const UsersIcon = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const Trash2Icon = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);
