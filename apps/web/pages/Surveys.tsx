import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, X, Check, Trash2, Lock, Unlock, RefreshCw,
  MessageSquare, CheckCircle2, BarChart3, ClipboardList, ArrowRight, FileText, Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Dropdown } from '../components/Dropdown';
import { Toast } from '../components/Toast';
import {
  useSurveyList,
  useCreateSurvey,
  useCloseSurvey,
  useReopenSurvey,
  useDeleteSurvey,
  useSentimentOverview,
} from '../hooks/queries';
import type { SurveyCategory, SentimentOverview } from '../types';

const SURVEY_CATEGORIES: SurveyCategory[] = [
  'Workload', 'Team', 'Growth', 'Work-Life Balance', 'Management',
  'Communication', 'Teamwork', 'Problem Solving', 'Time Management',
  'Adaptability', 'Technical Skills', 'Innovation & Learning', 'Quality & Responsibility',
  'Blueprint', 'Action', 'Nurturing', 'Knowledge',
];

// ---------------------------------------------------------------------------
// IT Performance Evaluation Template
// ---------------------------------------------------------------------------

type TFunc = (key: string) => string;

function getPerformanceEvalTemplate(t: TFunc): { title: string; questions: QuestionDraft[] } {
  const categories: { category: SurveyCategory; keys: string[] }[] = [
    { category: 'Communication', keys: ['communication_1', 'communication_2', 'communication_3'] },
    { category: 'Teamwork', keys: ['teamwork_1', 'teamwork_2', 'teamwork_3'] },
    { category: 'Problem Solving', keys: ['problemSolving_1', 'problemSolving_2', 'problemSolving_3'] },
    { category: 'Time Management', keys: ['timeManagement_1', 'timeManagement_2', 'timeManagement_3'] },
    { category: 'Adaptability', keys: ['adaptability_1', 'adaptability_2', 'adaptability_3'] },
    { category: 'Technical Skills', keys: ['technicalSkills_1', 'technicalSkills_2', 'technicalSkills_3'] },
    { category: 'Innovation & Learning', keys: ['innovationLearning_1', 'innovationLearning_2', 'innovationLearning_3'] },
    { category: 'Quality & Responsibility', keys: ['qualityResponsibility_1', 'qualityResponsibility_2', 'qualityResponsibility_3'] },
  ];

  const questions: QuestionDraft[] = categories.flatMap(({ category, keys }) =>
    keys.map((key) => ({
      questionText: t(`surveys.template.${key}`),
      category,
    }))
  );

  return { title: t('surveys.template.title'), questions };
}

// ---------------------------------------------------------------------------
// B.A.N.K. Personality Model Template
// ---------------------------------------------------------------------------

function getBankModelTemplate(t: TFunc): { title: string; questions: QuestionDraft[] } {
  // 20 questions interleaved across categories to reduce bias (matches reference code order)
  const questionOrder: { category: SurveyCategory; key: string }[] = [
    { category: 'Nurturing', key: 'nurturing_1' },
    { category: 'Action', key: 'action_1' },
    { category: 'Blueprint', key: 'blueprint_1' },
    { category: 'Knowledge', key: 'knowledge_1' },
    { category: 'Blueprint', key: 'blueprint_2' },
    { category: 'Knowledge', key: 'knowledge_2' },
    { category: 'Nurturing', key: 'nurturing_2' },
    { category: 'Action', key: 'action_2' },
    { category: 'Nurturing', key: 'nurturing_3' },
    { category: 'Blueprint', key: 'blueprint_3' },
    { category: 'Knowledge', key: 'knowledge_3' },
    { category: 'Action', key: 'action_3' },
    { category: 'Action', key: 'action_4' },
    { category: 'Knowledge', key: 'knowledge_4' },
    { category: 'Nurturing', key: 'nurturing_4' },
    { category: 'Blueprint', key: 'blueprint_4' },
    { category: 'Action', key: 'action_5' },
    { category: 'Knowledge', key: 'knowledge_5' },
    { category: 'Blueprint', key: 'blueprint_5' },
    { category: 'Nurturing', key: 'nurturing_5' },
  ];

  const questions: QuestionDraft[] = questionOrder.map(({ category, key }) => ({
    questionText: t(`surveys.bankTemplate.${key}`),
    category,
  }));

  return { title: t('surveys.bankTemplate.title'), questions };
}

// ---------------------------------------------------------------------------
// Create Survey Modal (Admin)
// ---------------------------------------------------------------------------

interface QuestionDraft {
  questionText: string;
  category: SurveyCategory;
}

const CreateSurveyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}> = ({ isOpen, onClose, onCreated }) => {
  const { t } = useTranslation(['help', 'common']);
  const createMutation = useCreateSurvey();
  const [title, setTitle] = useState('');
  const [allowRetake, setAllowRetake] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { questionText: '', category: 'Workload' },
  ]);
  const [templateApplied, setTemplateApplied] = useState(false);

  const categoryOptions = SURVEY_CATEGORIES.map((c) => ({
    value: c,
    label: t(`surveys.categories.${c}`),
  }));

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { questionText: '', category: 'Workload' }]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: keyof QuestionDraft, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const validQuestions = questions.filter((q) => q.questionText.trim());
    if (validQuestions.length === 0) return;

    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        questions: validQuestions.map((q, i) => ({
          questionText: q.questionText.trim(),
          category: q.category,
          sortOrder: i,
        })),
        allowRetake,
      });
      setTitle('');
      setAllowRetake(false);
      setQuestions([{ questionText: '', category: 'Workload' }]);
      setTemplateApplied(false);
      onCreated();
      onClose();
    } catch {
      // error handled by toast in parent
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <h3 className="font-bold text-lg text-text-light dark:text-text-dark">{t('surveys.createTitle')}</h3>
          <button onClick={onClose} className="text-text-muted-light hover:text-text-light"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('surveys.surveyTitle')}</label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('surveys.surveyTitlePlaceholder')}
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
            />
          </div>

          {/* Allow Retake Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={allowRetake}
                onChange={(e) => setAllowRetake(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-primary transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
            </div>
            <div>
              <span className="text-sm font-medium text-text-light dark:text-text-dark">{t('surveys.allowRetake')}</span>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('surveys.allowRetakeDesc')}</p>
            </div>
          </label>

          {/* Template Cards */}
          <div>
            <p className="text-sm font-medium text-text-light dark:text-text-dark mb-2">{t('surveys.templateSection.title')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* IT Performance Evaluation */}
              <button
                type="button"
                onClick={() => {
                  const tpl = getPerformanceEvalTemplate(t);
                  setTitle(tpl.title);
                  setQuestions(tpl.questions);
                  setTemplateApplied(true);
                }}
                className="flex flex-col items-start gap-2 p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary">{t('surveys.templateSection.itEvalTitle')}</p>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('surveys.templateSection.itEvalDesc')}</p>
                  <p className="text-[10px] text-text-muted-light/70 dark:text-text-muted-dark/70 mt-1">{t('surveys.templateSection.itEvalMeta')}</p>
                </div>
              </button>

              {/* B.A.N.K. Model */}
              <button
                type="button"
                onClick={() => {
                  const tpl = getBankModelTemplate(t);
                  setTitle(tpl.title);
                  setQuestions(tpl.questions);
                  setTemplateApplied(true);
                }}
                className="flex flex-col items-start gap-2 p-4 rounded-lg border-2 border-dashed border-violet-400/30 bg-violet-50/50 dark:bg-violet-900/10 hover:bg-violet-100/50 dark:hover:bg-violet-900/20 hover:border-violet-400/50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Users size={18} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">{t('surveys.templateSection.bankTitle')}</p>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('surveys.templateSection.bankDesc')}</p>
                  <p className="text-[10px] text-text-muted-light/70 dark:text-text-muted-dark/70 mt-1">{t('surveys.templateSection.bankMeta')}</p>
                </div>
              </button>
            </div>
          </div>

          {templateApplied && (
            <p className="text-xs text-green-600 dark:text-green-400 -mt-2">{t('surveys.template.templateApplied')}</p>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-light dark:text-text-dark">{t('surveys.questionsLabel')}</label>
              <button
                type="button"
                onClick={addQuestion}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> {t('surveys.addQuestion')}
              </button>
            </div>
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={idx} className="flex gap-2 items-start p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={q.questionText}
                      onChange={(e) => updateQuestion(idx, 'questionText', e.target.value)}
                      placeholder={t('surveys.questionNumber', { number: idx + 1 })}
                      className="w-full px-3 py-1.5 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                    />
                    <Dropdown
                      options={categoryOptions}
                      value={q.category}
                      onChange={(val) => updateQuestion(idx, 'category', val)}
                      placeholder={t('common:placeholders.category')}
                    />
                  </div>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      className="p-1.5 text-text-muted-light hover:text-red-500 transition-colors mt-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light">{t('surveys.cancel')}</button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
            >
              <Check size={16} /> {createMutation.isPending ? t('surveys.creating') : t('surveys.create')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// ---------------------------------------------------------------------------
// Main Surveys Page
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Survey Analytics
// ---------------------------------------------------------------------------

function SentimentDonut({ positive, neutral, negative, score }: { positive: number; neutral: number; negative: number; score: number }) {
  const scoreColor = score >= 70 ? '#22c55e' : score >= 40 ? '#facc15' : '#f87171';
  const hasData = positive + neutral + negative > 0;
  return (
    <div className="relative w-44 h-44 mx-auto">
      <div
        className="w-full h-full rounded-full"
        style={{
          background: hasData
            ? `conic-gradient(#22c55e 0% ${positive}%, #facc15 ${positive}% ${positive + neutral}%, #f87171 ${positive + neutral}% 100%)`
            : '#e5e7eb',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-card-light dark:bg-card-dark flex items-center justify-center shadow-inner">
          <div className="text-center">
            <div className="text-3xl font-bold leading-none" style={{ color: scoreColor }}>{score}</div>
            <div className="text-xs text-text-muted-light dark:text-text-muted-dark font-medium">/100</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SurveyAnalytics({ data }: { data: SentimentOverview }) {
  const { t } = useTranslation(['help']);
  const { overallScore, responseRate, totalResponses, totalEmployees, categoryBreakdown, distribution } = data;

  return (
    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border-light dark:border-border-dark bg-primary/5 flex items-center gap-2">
        <BarChart3 size={20} className="text-primary" />
        <h2 className="text-lg font-bold text-text-light dark:text-text-dark">{t('surveyAnalytics.title')}</h2>
      </div>

      <div className="p-5 space-y-5">
        {/* Summary stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { value: String(overallScore), suffix: '/100', label: t('surveyAnalytics.overallScore'), color: overallScore >= 70 ? 'text-green-500' : overallScore >= 40 ? 'text-yellow-500' : 'text-red-500' },
            { value: String(responseRate), suffix: '%', label: t('surveyAnalytics.responseRate'), color: 'text-primary' },
            { value: String(totalResponses), suffix: '', label: t('surveyAnalytics.respondents'), color: 'text-text-light dark:text-text-dark' },
            { value: String(totalEmployees), suffix: '', label: t('surveyAnalytics.totalEmployees'), color: 'text-text-light dark:text-text-dark' },
          ].map((s) => (
            <div key={s.label} className="text-center p-3 bg-background-light dark:bg-background-dark rounded-lg">
              <div className={`text-2xl font-bold ${s.color}`}>
                {s.value}<span className="text-sm font-normal text-text-muted-light dark:text-text-muted-dark">{s.suffix}</span>
              </div>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Split layout: donut left, categories right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Donut chart + sentiment legend */}
          <div className="flex flex-col items-center justify-center gap-4">
            <SentimentDonut
              positive={distribution.positive}
              neutral={distribution.neutral}
              negative={distribution.negative}
              score={overallScore}
            />
            <div className="flex flex-col gap-2 w-full max-w-[200px]">
              {[
                { label: t('surveyAnalytics.positive'), value: distribution.positive, color: 'bg-green-500' },
                { label: t('surveyAnalytics.neutral'), value: distribution.neutral, color: 'bg-yellow-400' },
                { label: t('surveyAnalytics.negative'), value: distribution.negative, color: 'bg-red-400' },
              ].map((seg) => (
                <div key={seg.label} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${seg.color}`} />
                  <span className="text-xs text-text-light dark:text-text-dark flex-1">{seg.label}</span>
                  <div className="flex items-center gap-1.5 flex-1">
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full flex-1 overflow-hidden">
                      <div className={`h-full rounded-full ${seg.color}`} style={{ width: `${seg.value}%` }} />
                    </div>
                    <span className="text-xs font-medium text-text-muted-light dark:text-text-muted-dark w-8 text-right">{seg.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Category breakdown */}
          {categoryBreakdown.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide mb-3">Category Breakdown</p>
              <div className="space-y-2">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-light dark:text-text-dark font-medium">{cat.category}</span>
                      <span className={`font-semibold ${cat.score >= 70 ? 'text-green-500' : cat.score >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>{cat.score}/100</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${cat.score >= 70 ? 'bg-green-500' : cat.score >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ width: `${cat.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const Surveys: React.FC = () => {
  const { t } = useTranslation(['help', 'common']);
  const { isAdminView } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isAdminView;
  const { data: surveys = [], isLoading } = useSurveyList();
  const { data: sentiment } = useSentimentOverview();
  const closeMutation = useCloseSurvey();
  const reopenMutation = useReopenSurvey();
  const deleteMutation = useDeleteSurvey();

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    show: false, message: '', type: 'success',
  });
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ show: true, message, type });
  };

  const handleClose = async (id: string) => {
    try {
      await closeMutation.mutateAsync(id);
      showToast('Survey closed successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to close survey', 'error');
    }
  };

  const handleReopen = async (id: string) => {
    try {
      await reopenMutation.mutateAsync(id);
      showToast('Survey reopened successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to reopen survey', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      showToast('Survey deleted successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete survey', 'error');
    }
  };

  const activeSurveys = surveys.filter((s) => s.status === 'active');
  const closedSurveys = surveys.filter((s) => s.status === 'closed');

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">{t('surveys.title')}</h1>
          <p className="text-text-muted-light dark:text-text-muted-dark text-sm">
            {isAdmin ? t('surveys.adminSubtitle') : t('surveys.employeeSubtitle')}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary/90 transition-colors w-full sm:w-auto"
          >
            <Plus size={18} /> {t('surveys.createSurvey')}
          </button>
        )}
      </header>

      {/* Analytics — Admin only */}
      {isAdmin && sentiment && <SurveyAnalytics data={sentiment} />}

      {isLoading ? (
        <div className="text-center py-12 text-text-muted-light">{t('surveys.loading')}</div>
      ) : surveys.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <ClipboardList size={32} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-1">{t('surveys.noSurveys')}</h3>
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
            {isAdmin ? t('surveys.noSurveysAdmin') : t('surveys.noSurveysEmployee')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Surveys */}
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border-light dark:border-border-dark bg-primary/5">
              <h2 className="text-lg font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                <MessageSquare size={20} className="text-primary" />
                {t('surveys.activeSurveys')}
                <span className="ml-auto text-xs font-normal text-text-muted-light bg-background-light dark:bg-background-dark px-2 py-0.5 rounded-full">
                  {activeSurveys.length}
                </span>
              </h2>
            </div>
            <div className="p-5 space-y-3">
              {activeSurveys.length === 0 ? (
                <p className="text-text-muted-light text-center py-12 text-sm">{t('surveys.noActive')}</p>
              ) : (
                activeSurveys.map((survey) => (
                  <div key={survey.id} className="flex justify-between items-center p-4 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="font-semibold text-text-light dark:text-text-dark text-sm truncate">{survey.title}</h3>
                      <div className="flex flex-wrap gap-2 text-xs text-text-muted-light mt-1">
                        <span>{survey.questionCount} {t('surveys.questions')}</span>
                        <span>·</span>
                        <span>{survey.responseCount} {t('surveys.responses')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {survey.hasCompleted ? (
                        survey.allowRetake ? (
                          <button
                            onClick={() => navigate(`/surveys/${survey.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 text-xs font-medium rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                          >
                            <RefreshCw size={12} /> {t('surveys.retake')}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                            <CheckCircle2 size={12} /> {t('surveys.done')}
                          </span>
                        )
                      ) : (
                        <button
                          onClick={() => navigate(`/surveys/${survey.id}`)}
                          className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1"
                        >
                          {t('surveys.takeSurvey')} <ArrowRight size={14} />
                        </button>
                      )}
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleClose(survey.id)}
                            className="p-1.5 text-text-muted-light hover:text-accent-orange transition-colors"
                            title={t('surveys.closeSurvey')}
                          >
                            <Lock size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(survey.id)}
                            className="p-1.5 text-text-muted-light hover:text-red-500 transition-colors"
                            title={t('surveys.deleteSurvey')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Closed / History */}
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border-light dark:border-border-dark">
              <h2 className="text-lg font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                <BarChart3 size={20} className="text-text-muted-light" />
                {t('surveys.closedSurveys')}
                <span className="ml-auto text-xs font-normal text-text-muted-light bg-background-light dark:bg-background-dark px-2 py-0.5 rounded-full">
                  {closedSurveys.length}
                </span>
              </h2>
            </div>
            {closedSurveys.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-sm text-text-muted-light">{t('surveys.noClosedSurveys')}</div>
            ) : (
              <div className="divide-y divide-border-light dark:divide-border-dark">
                {closedSurveys.map((survey) => (
                  <div key={survey.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="font-medium text-text-light dark:text-text-dark text-sm truncate">{survey.title}</h3>
                      <div className="flex flex-wrap gap-2 text-xs text-text-muted-light mt-0.5">
                        <span>{survey.responseCount} {t('surveys.responses')}</span>
                        {survey.closedAt && (
                          <>
                            <span>·</span>
                            <span>{t('surveys.closedOn', { date: new Date(survey.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isAdmin ? (
                        <>
                          <button
                            onClick={() => handleReopen(survey.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                            title={t('surveys.reopen')}
                          >
                            <Unlock size={12} /> {t('surveys.reopen')}
                          </button>
                          <button
                            onClick={() => handleDelete(survey.id)}
                            className="p-1.5 text-text-muted-light hover:text-red-500 transition-colors"
                            title={t('surveys.deleteSurvey')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          <Lock size={12} /> {t('surveys.closed')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Survey Modal */}
      <CreateSurveyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => showToast('Survey created successfully!')}
      />

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
