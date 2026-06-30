import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { getReviewPeriods } from '../lib/reviewPeriods';
import { useReviewTemplates, type ReviewTemplate } from '../hooks/queries';

interface SelfReviewFormProps {
  onSubmit: (data: { selfReview: string; reviewPeriod?: string }) => void;
  loading: boolean;
}

// Turn a template's criteria into a guided scaffold the employee fills in.
function buildScaffold(template: ReviewTemplate): string {
  return template.criteria.map((c) => `## ${c.prompt}\n`).join('\n');
}

export function SelfReviewForm({ onSubmit, loading }: SelfReviewFormProps) {
  const { t } = useTranslation(['performance-reviews']);
  const [selfReview, setSelfReview] = useState('');
  const [reviewPeriod, setReviewPeriod] = useState('');
  const [templateId, setTemplateId] = useState('');
  const periods = getReviewPeriods();
  const { data: templates = [] } = useReviewTemplates();

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const tpl = templates.find((x) => x.id === id);
    if (!tpl) return;
    // Only overwrite when the box is empty or still holds an untouched scaffold,
    // so we don't clobber text the user already wrote.
    const isScaffold = selfReview.trim() === '' || selfReview.trimStart().startsWith('## ');
    if (isScaffold) setSelfReview(buildScaffold(tpl));
  };

  return (
    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-5 space-y-4 shadow-sm">
      <h3 className="font-semibold text-text-primary-light dark:text-text-primary-dark">
        {t('actions.newSelfReview')}
      </h3>
      {templates.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1">
            {t('form.template', 'Template')}
          </label>
          <select
            value={templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-sm text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">{t('form.noTemplate', 'No template (free-form)')}</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1">
          {t('form.reviewPeriod')}
        </label>
        <select
          value={reviewPeriod}
          onChange={(e) => setReviewPeriod(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-sm text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">{t('form.selectPeriod')}</option>
          {periods.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1">
          {t('form.selfAssessment')}
        </label>
        <textarea
          value={selfReview}
          onChange={(e) => setSelfReview(e.target.value)}
          placeholder={t('form.selfAssessmentPlaceholder')}
          rows={5}
          className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-sm text-text-primary-light dark:text-text-primary-dark resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <button
        onClick={() => onSubmit({ selfReview, reviewPeriod: reviewPeriod || undefined })}
        disabled={!selfReview.trim() || loading}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        <Plus size={14} /> {loading ? t('actions.saving') : t('actions.saveDraft')}
      </button>
    </div>
  );
}
