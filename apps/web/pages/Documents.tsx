import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BASE_URL, getAuthToken } from '../lib/api';
import { useDocumentList, useDocumentTrash, useDocumentStorage, useDeleteDocument, useRestoreDocument, usePermanentDeleteDocument } from '../hooks/queries';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import {
  FileText,
  Search,
  ShieldCheck,
  FolderOpen,
  Grid,
  List,
  FileSpreadsheet,
  Clock,
  Filter,
  Trash2,
} from 'lucide-react';
import { DocumentItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Pagination } from '../components/Pagination';
import { UsersIcon, Trash2Icon } from '../components/documents/documentHelpers';
import { DocumentSidebar } from '../components/documents/DocumentSidebar';
import { DocumentGridView } from '../components/documents/DocumentGridView';
import { DocumentListView } from '../components/documents/DocumentListView';
import { DocumentPreviewModal } from '../components/documents/DocumentPreviewModal';
import { UploadModal } from '../components/documents/UploadModal';

export const Documents: React.FC = () => {
  const { t } = useTranslation(['documents', 'common']);
  const { user, isAdminView } = useAuth();
  const isAdmin = isAdminView;

  const { showToast } = useToast();

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
      <DocumentSidebar
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        onUploadClick={() => setIsUploadModalOpen(true)}
        storageStats={storageStats}
      />

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
            <DocumentGridView
              documents={filteredDocuments}
              selectedCategory={selectedCategory}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              onPreview={setPreviewDoc}
              handleDownload={handleDownload}
              handleShare={handleShare}
              handleDelete={handleDelete}
              handleRestore={handleRestore}
              handlePermanentDelete={handlePermanentDelete}
            />
          ) : (
            <DocumentListView
              documents={filteredDocuments}
              onPreview={setPreviewDoc}
              handleDownload={handleDownload}
              handleShare={handleShare}
              handleDelete={handleDelete}
            />
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
        <DocumentPreviewModal
          previewDoc={previewDoc}
          previewImageUrl={previewImageUrl}
          previewPdfUrl={previewPdfUrl}
          onClose={() => setPreviewDoc(null)}
          handleDownload={handleDownload}
        />
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <UploadModal
          onClose={() => {
            setIsUploadModalOpen(false);
            setSelectedFile(null);
          }}
          fileInputRef={fileInputRef}
          selectedFile={selectedFile}
          handleFileSelect={handleFileSelect}
          uploadCategory={uploadCategory}
          setUploadCategory={setUploadCategory}
          handleUpload={handleUpload}
        />
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

    </div>
  );
};
