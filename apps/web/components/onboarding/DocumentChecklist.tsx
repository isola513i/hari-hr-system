import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FileText,
    Upload,
    Download,
    CheckCircle2,
    XCircle,
    Eye,
    ThumbsUp,
    ThumbsDown,
    MessageSquare,
} from 'lucide-react';
import { DocumentChecklistProps } from './OnboardingTypes';
import { translateDocName, translateDocDescription } from '../../utils/onboardingTranslation';

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'Pending': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        case 'Uploaded': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
        case 'Approved': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
        case 'Rejected': return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';
        default: return 'bg-gray-100 text-gray-600';
    }
};

export const DocumentChecklist: React.FC<DocumentChecklistProps> = ({
    documents,
    userRole,
    uploadingDocId,
    reviewNoteDocId,
    reviewNote,
    onSetUploadingDocId,
    onSetReviewNoteDocId,
    onSetReviewNote,
    onDocUpload,
    onDocDownload,
    onDocReview,
}) => {
    const { t } = useTranslation(['onboarding', 'common']);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const docsUploaded = documents.filter(d => d.status !== 'Pending').length;
    const docsApproved = documents.filter(d => d.status === 'Approved').length;

    return (
        <>
            <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                <div className="p-5 border-b border-border-light dark:border-border-dark">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-bold text-text-light dark:text-text-dark">{t('documentChecklist.title')}</h2>
                        {documents.length > 0 && (
                            <span className="text-xs font-medium text-text-muted-light dark:text-text-muted-dark">
                                {docsUploaded}/{documents.length} {t('documentChecklist.uploaded')}
                            </span>
                        )}
                    </div>
                    {documents.length > 0 && (
                        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${documents.length > 0 ? Math.round((docsApproved / documents.length) * 100) : 0}%` }}
                            />
                        </div>
                    )}
                </div>
                <div className="p-4 space-y-3">
                    {documents.length === 0 && (
                        <div className="text-center py-6">
                            <FileText size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('documentChecklist.noDocuments')}</p>
                            <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">{t('documentChecklist.noDocumentsHint')}</p>
                        </div>
                    )}
                    {documents.map(doc => (
                        <div key={doc.id} className="p-3 bg-background-light dark:bg-background-dark/50 rounded-lg border border-border-light dark:border-border-dark">
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded flex-shrink-0 ${
                                    doc.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                                    doc.status === 'Rejected' ? 'bg-red-100 dark:bg-red-900/30' :
                                    doc.status === 'Uploaded' ? 'bg-blue-100 dark:bg-blue-900/30' :
                                    'bg-gray-100 dark:bg-gray-800'
                                }`}>
                                    {doc.status === 'Approved' ? <CheckCircle2 size={18} className="text-emerald-600" /> :
                                     doc.status === 'Rejected' ? <XCircle size={18} className="text-red-500" /> :
                                     doc.status === 'Uploaded' ? <Eye size={18} className="text-blue-500" /> :
                                     <FileText size={18} className="text-gray-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">{translateDocName(t, doc.name)}</p>
                                        <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${getStatusBadge(doc.status)}`}>
                                            {doc.status === 'Pending' ? t('documentChecklist.pending') : doc.status === 'Uploaded' ? t('documentChecklist.uploadedStatus') : doc.status === 'Approved' ? t('documentChecklist.approved') : t('documentChecklist.rejected')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{translateDocDescription(t, doc.description)}</p>
                                    {doc.fileType && doc.fileSize && (
                                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
                                            {doc.fileType} &middot; {doc.fileSize}
                                        </p>
                                    )}
                                    {doc.reviewNote && (
                                        <div className="flex items-start gap-1 mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                                            <MessageSquare size={12} className="mt-0.5 flex-shrink-0" />
                                            <span>{doc.reviewNote}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {/* Upload button — for Pending or Rejected items */}
                                    {(doc.status === 'Pending' || doc.status === 'Rejected') && (
                                        <button
                                            onClick={() => {
                                                onSetUploadingDocId(doc.id);
                                                fileInputRef.current?.click();
                                            }}
                                            className="p-1.5 text-text-muted-light hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                            title={t('documentChecklist.uploadFile')}
                                            aria-label={t('documentChecklist.uploadFile')}
                                        >
                                            <Upload size={14} />
                                        </button>
                                    )}
                                    {/* Download button — for uploaded files */}
                                    {doc.filePath && (
                                        <button
                                            onClick={() => onDocDownload(doc.id)}
                                            className="p-1.5 text-text-muted-light hover:text-primary rounded transition-colors"
                                            title={t('documentChecklist.download')}
                                            aria-label={t('documentChecklist.download')}
                                        >
                                            <Download size={14} />
                                        </button>
                                    )}
                                    {/* Admin: Approve / Reject buttons */}
                                    {userRole === 'HR_ADMIN' && doc.status === 'Uploaded' && (
                                        <>
                                            <button
                                                onClick={() => onDocReview(doc.id, 'Approved')}
                                                className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
                                                title={t('documentChecklist.approve')}
                                                aria-label={t('documentChecklist.approve')}
                                            >
                                                <ThumbsUp size={14} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    onSetReviewNoteDocId(doc.id);
                                                    onSetReviewNote('');
                                                }}
                                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                title={t('documentChecklist.reject')}
                                                aria-label={t('documentChecklist.reject')}
                                            >
                                                <ThumbsDown size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {/* Reject note input */}
                            {reviewNoteDocId === doc.id && (
                                <div className="mt-3 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={reviewNote}
                                        onChange={e => onSetReviewNote(e.target.value)}
                                        placeholder={t('documentChecklist.rejectReason')}
                                        className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 text-text-light dark:text-text-dark"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => onDocReview(doc.id, 'Rejected', reviewNote)}
                                        className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                        {t('documentChecklist.reject')}
                                    </button>
                                    <button
                                        onClick={() => { onSetReviewNoteDocId(null); onSetReviewNote(''); }}
                                        className="px-2 py-1.5 text-xs text-text-muted-light hover:text-text-light dark:text-text-muted-dark"
                                    >
                                        {t('documentChecklist.cancel')}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Hidden file input for document upload */}
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.xlsx,.jpg,.jpeg,.png"
                onChange={e => {
                    if (e.target.files?.[0] && uploadingDocId) {
                        onDocUpload(uploadingDocId, e.target.files[0]);
                    }
                    e.target.value = '';
                }}
            />
        </>
    );
};
