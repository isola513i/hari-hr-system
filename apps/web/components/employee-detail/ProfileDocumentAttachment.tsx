import React, { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Paperclip, Download, CheckCircle2, Clock, XCircle, Loader2, Upload } from 'lucide-react';
import { useEmployeeOnboardingDocuments } from '../../hooks/queries/onboarding';
import { queryKeys } from '../../lib/queryKeys';
import { BASE_URL, getAuthToken } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

/** Edit-Profile attachment slot → canonical onboarding checklist document name. */
const SLOT_DOC_NAME: Record<string, string> = {
  'national-id': 'ID / Passport Copy',
  'bank-account': 'Bank Account Details',
};

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.docx';

interface Props {
  employeeId: string;
  slot: 'national-id' | 'bank-account';
  disabled?: boolean;
}

/**
 * Attaches a supporting file (passbook front page, ID copy) to a PII profile field.
 * It targets the SAME onboarding checklist item (via the profile-document bridge
 * endpoint), so an upload here also marks the item done on the Onboarding page.
 */
export const ProfileDocumentAttachment: React.FC<Props> = ({ employeeId, slot, disabled }) => {
  const { t } = useTranslation(['employees', 'common']);
  const qc = useQueryClient();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: docs } = useEmployeeOnboardingDocuments(employeeId);
  const doc = docs?.find((d) => d.name === SLOT_DOC_NAME[slot]);
  const hasFile = !!doc?.filePath;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(
        `${BASE_URL}/onboarding/employees/${employeeId}/documents/${slot}/upload`,
        { method: 'POST', headers: { Authorization: `Bearer ${getAuthToken()}` }, body: fd }
      );
      if (!res.ok) throw new Error('upload failed');
      // Refresh both the per-employee view (this modal) and the shared Onboarding checklist.
      qc.invalidateQueries({ queryKey: queryKeys.onboarding.employeeDocuments(employeeId) });
      qc.invalidateQueries({ queryKey: queryKeys.onboarding.documents() });
      showToast(t('employees:attach.uploaded'), 'success');
    } catch {
      showToast(t('employees:attach.uploadFailed'), 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDownload = async () => {
    if (!doc) return;
    try {
      const res = await fetch(`${BASE_URL}/onboarding/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.name}.${(doc.fileType || 'pdf').toLowerCase()}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast(t('employees:attach.downloadFailed'), 'error');
    }
  };

  const statusVisual = (() => {
    switch (doc?.status) {
      case 'Approved':
        return { icon: <CheckCircle2 size={13} />, cls: 'text-green-600 dark:text-green-400', label: t('employees:attach.statusApproved') };
      case 'Rejected':
        return { icon: <XCircle size={13} />, cls: 'text-red-500 dark:text-red-400', label: t('employees:attach.statusRejected') };
      case 'Uploaded':
        return { icon: <Clock size={13} />, cls: 'text-amber-600 dark:text-amber-400', label: t('employees:attach.statusUploaded') };
      default:
        return { icon: <Clock size={13} />, cls: 'text-text-muted-light dark:text-text-muted-dark', label: t('employees:attach.statusPending') };
    }
  })();

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <input ref={fileRef} type="file" accept={ACCEPT} onChange={handleFile} className="hidden" disabled={disabled || uploading} />

      {hasFile ? (
        <>
          <span className={`inline-flex items-center gap-1 ${statusVisual.cls}`}>
            {statusVisual.icon}
            {statusVisual.label}
          </span>
          <button type="button" onClick={handleDownload} className="inline-flex items-center gap-1 py-1 -my-1 text-primary hover:underline">
            <Download size={13} /> {doc?.fileType || t('common:buttons.download')}
          </button>
          {!disabled && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1 py-1 -my-1 text-text-muted-light dark:text-text-muted-dark hover:text-primary disabled:opacity-50"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {t('employees:attach.replace')}
            </button>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
          className="inline-flex items-center gap-1 py-1 -my-1 text-primary hover:underline disabled:opacity-50 disabled:no-underline disabled:text-text-muted-light"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />}
          {uploading ? t('employees:attach.uploading') : t('employees:attach.attach')}
        </button>
      )}
    </div>
  );
};
