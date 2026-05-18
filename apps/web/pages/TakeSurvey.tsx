import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star, Send, Shield, CheckCircle2, Heart, Zap, BookOpen, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { useSurveyDetail, useSubmitSurveyResponse } from '../hooks/queries';
import type { SurveyQuestion } from '../types';

// ---------------------------------------------------------------------------
// Category color mapping
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  Workload: 'bg-blue-500',
  Team: 'bg-teal-500',
  Growth: 'bg-purple-500',
  'Work-Life Balance': 'bg-amber-500',
  Management: 'bg-indigo-500',
  Communication: 'bg-cyan-500',
  Teamwork: 'bg-emerald-500',
  'Problem Solving': 'bg-orange-500',
  'Time Management': 'bg-rose-500',
  Adaptability: 'bg-violet-500',
  'Technical Skills': 'bg-sky-500',
  'Innovation & Learning': 'bg-fuchsia-500',
  'Quality & Responsibility': 'bg-lime-500',
  Blueprint: 'bg-slate-500',
  Action: 'bg-red-500',
  Nurturing: 'bg-pink-500',
  Knowledge: 'bg-yellow-500',
};

const CATEGORY_BG: Record<string, string> = {
  Workload: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  Team: 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  Growth: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  'Work-Life Balance': 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  Management: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  Communication: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  Teamwork: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  'Problem Solving': 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  'Time Management': 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  Adaptability: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  'Technical Skills': 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  'Innovation & Learning': 'bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800',
  'Quality & Responsibility': 'bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300 border-lime-200 dark:border-lime-800',
  Blueprint: 'bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
  Action: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  Nurturing: 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800',
  Knowledge: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
};

// RATING_LABELS moved inside component to use translations

// ---------------------------------------------------------------------------
// B.A.N.K. personality assessment helpers
// ---------------------------------------------------------------------------

const BANK_CATEGORIES = new Set(['Blueprint', 'Action', 'Nurturing', 'Knowledge']);

function isBankSurvey(questions: SurveyQuestion[]): boolean {
  if (questions.length === 0) return false;
  return questions.every((q) => BANK_CATEGORIES.has(q.category));
}

interface BankScore {
  category: string;
  score: number;
  maxScore: number;
  letter: string;
}

interface BankResult {
  code: string;
  scores: BankScore[];
  dominant: string;
}

function calculateBankResult(questions: SurveyQuestion[], ratings: Record<string, number>): BankResult {
  const totals: Record<string, number> = { Blueprint: 0, Action: 0, Nurturing: 0, Knowledge: 0 };
  const counts: Record<string, number> = { Blueprint: 0, Action: 0, Nurturing: 0, Knowledge: 0 };

  questions.forEach((q) => {
    const rating = ratings[q.id] ?? 0;
    totals[q.category] = (totals[q.category] ?? 0) + rating;
    counts[q.category] = (counts[q.category] ?? 0) + 1;
  });

  const scores: BankScore[] = Object.entries(totals)
    .map(([category, score]) => ({
      category,
      score,
      maxScore: (counts[category] ?? 1) * 5,
      letter: category[0]!,
    }))
    .sort((a, b) => b.score - a.score);

  return {
    code: scores.map((s) => s.letter).join(''),
    scores,
    dominant: scores[0]!.category,
  };
}

const BANK_DETAILS: Record<string, { color: string; bgClass: string; icon: React.ComponentType<Record<string, unknown>> }> = {
  Blueprint: { color: '#0071BC', bgClass: 'bg-blue-50 dark:bg-blue-900/20', icon: Shield },
  Action: { color: '#ED1C24', bgClass: 'bg-red-50 dark:bg-red-900/20', icon: Zap },
  Nurturing: { color: '#FDB913', bgClass: 'bg-yellow-50 dark:bg-yellow-900/20', icon: Heart },
  Knowledge: { color: '#00A651', bgClass: 'bg-green-50 dark:bg-green-900/20', icon: BookOpen },
};

// ---------------------------------------------------------------------------
// B.A.N.K. Result View
// ---------------------------------------------------------------------------

const BankResultView: React.FC<{
  result: BankResult;
  onBack: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}> = ({ result, onBack, t }) => {
  const dominant = BANK_DETAILS[result.dominant]!;
  const DominantIcon = dominant.icon;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* B.A.N.K. Code header */}
      <div className="text-center mb-8">
        <p className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark mb-2">
          {t('takeSurvey.bankResult.yourCode')}
        </p>
        <div className="flex justify-center gap-2 mb-6">
          {result.code.split('').map((letter, i) => {
            const cat = result.scores[i]!;
            const detail = BANK_DETAILS[cat.category]!;
            return (
              <span
                key={i}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-black text-white shadow-lg transition-transform hover:scale-105"
                style={{ backgroundColor: detail.color }}
              >
                {letter}
              </span>
            );
          })}
        </div>
      </div>

      {/* Dominant type card */}
      <div
        className="rounded-2xl border-2 p-6 mb-6 text-center"
        style={{ borderColor: dominant.color }}
      >
        <div
          className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
          style={{ backgroundColor: `${dominant.color}20` }}
        >
          <DominantIcon size={28} style={{ color: dominant.color }} />
        </div>
        <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-1">
          {t('takeSurvey.bankResult.dominantType')}
        </p>
        <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">
          {t(`takeSurvey.bankResult.${result.dominant}`)}
        </h2>
        <p className="text-sm text-text-muted-light dark:text-text-muted-dark max-w-md mx-auto">
          {t(`takeSurvey.bankResult.${result.dominant}Desc`)}
        </p>
      </div>

      {/* Score breakdown */}
      <div className="bg-card-light dark:bg-card-dark rounded-2xl border border-border-light dark:border-border-dark p-6 mb-6">
        <h3 className="text-sm font-semibold text-text-light dark:text-text-dark mb-4">
          {t('takeSurvey.bankResult.scoreBreakdown')}
        </h3>
        <div className="space-y-4">
          {result.scores.map((s) => {
            const detail = BANK_DETAILS[s.category]!;
            const Icon = detail.icon;
            const pct = s.maxScore > 0 ? (s.score / s.maxScore) * 100 : 0;
            return (
              <div key={s.category}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon size={16} style={{ color: detail.color }} />
                    <span className="text-sm font-medium text-text-light dark:text-text-dark">
                      {t(`takeSurvey.bankResult.${s.category}`)}
                    </span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: detail.color }}>
                    {s.score} {t('takeSurvey.bankResult.outOf', { max: s.maxScore })}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${pct}%`, backgroundColor: detail.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Back button */}
      <div className="text-center">
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {t('takeSurvey.backToSurveys')}
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TakeSurvey: React.FC = () => {
  const { t } = useTranslation(['help', 'common']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: survey, isLoading } = useSurveyDetail(id);
  const submitMutation = useSubmitSurveyResponse();

  // --- Draft persistence via localStorage ---
  const draftKey = id ? `survey-draft-${id}` : '';

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!draftKey) return 0;
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || '{}');
      return typeof draft.currentIndex === 'number' ? draft.currentIndex : 0;
    } catch { return 0; }
  });

  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    if (!draftKey) return {};
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || '{}');
      return draft.ratings && typeof draft.ratings === 'object' ? draft.ratings : {};
    } catch { return {}; }
  });

  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [retaking, setRetaking] = useState(false);

  const { showToast } = useToast();

  const questions: SurveyQuestion[] = survey?.questions ?? [];
  const isBank = useMemo(() => isBankSurvey(questions), [questions]);
  const RATING_LABELS = isBank
    ? ['', t('takeSurvey.ratingStronglyDisagree'), t('takeSurvey.ratingDisagree'), t('takeSurvey.ratingNeutral'), t('takeSurvey.ratingAgree'), t('takeSurvey.ratingStronglyAgree')]
    : ['', t('takeSurvey.ratingPoor'), t('takeSurvey.ratingFair'), t('takeSurvey.ratingGood'), t('takeSurvey.ratingVeryGood'), t('takeSurvey.ratingExcellent')];
  const bankResult = useMemo(() => (isBank && submitted ? calculateBankResult(questions, ratings) : null), [isBank, submitted, questions, ratings]);
  const total = questions.length;
  const current = questions[currentIndex];
  const answeredCount = Object.keys(ratings).length;
  const allAnswered = answeredCount === total;

  // Save draft to localStorage whenever ratings or currentIndex change
  useEffect(() => {
    if (!draftKey || submitted) return;
    localStorage.setItem(draftKey, JSON.stringify({ ratings, currentIndex }));
  }, [ratings, currentIndex, draftKey, submitted]);

  // Group questions by category for the mini-map
  const categoryGroups = useMemo(() => {
    const groups: { category: string; questions: SurveyQuestion[]; startIndex: number }[] = [];
    let lastCategory = '';
    questions.forEach((q, idx) => {
      if (q.category !== lastCategory) {
        groups.push({ category: q.category, questions: [], startIndex: idx });
        lastCategory = q.category;
      }
      groups[groups.length - 1]!.questions.push(q);
    });
    return groups;
  }, [questions]);

  const handleRate = useCallback((rating: number) => {
    if (!current) return;
    setRatings((prev) => ({ ...prev, [current.id]: rating }));
    // Auto-advance after a short delay, reset hoveredStar so next question shows clean stars
    setTimeout(() => {
      if (currentIndex < total - 1) {
        setHoveredStar(0);
        setCurrentIndex((idx: number) => idx + 1);
      }
    }, 300);
  }, [current, currentIndex, total]);

  const handleSubmit = async () => {
    if (!survey || !allAnswered) return;
    try {
      await submitMutation.mutateAsync({
        surveyId: survey.id,
        responses: questions.map((q) => ({
          questionId: q.id,
          rating: ratings[q.id]!,
        })),
      });
      // Clear draft on successful submission
      if (draftKey) localStorage.removeItem(draftKey);
      setRetaking(false);
      setSubmitted(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit', 'error');
    }
  };

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-text-muted-light dark:text-text-muted-dark text-sm">{t('takeSurvey.loading')}</p>
        </div>
      </div>
    );
  }

  // --- Not found / already completed ---
  if (!survey) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">{t('takeSurvey.notFound')}</h2>
        <button onClick={() => navigate('/surveys')} className="text-primary text-sm hover:underline">{t('takeSurvey.backToSurveys')}</button>
      </div>
    );
  }

  if (survey.hasCompleted && !submitted && !retaking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-2">{t('takeSurvey.alreadyCompleted')}</h2>
        <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-4">{t('takeSurvey.alreadyCompletedDesc')}</p>
        <div className="flex gap-3">
          {survey.allowRetake && (
            <button
              onClick={() => {
                setRetaking(true);
                setRatings({});
                setCurrentIndex(0);
                if (draftKey) localStorage.removeItem(draftKey);
              }}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> {t('takeSurvey.retakeSurvey')}
            </button>
          )}
          <button onClick={() => navigate('/surveys')} className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors">
            {t('takeSurvey.backToSurveys')}
          </button>
        </div>
      </div>
    );
  }

  // --- Success screen ---
  if (submitted) {
    if (bankResult) {
      return <BankResultView result={bankResult} onBack={() => navigate('/surveys')} t={t} />;
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
          <CheckCircle2 size={40} className="text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">{t('takeSurvey.thankYou')}</h2>
        <p className="text-text-muted-light dark:text-text-muted-dark mb-6 max-w-md">
          {t('takeSurvey.thankYouDesc')}
        </p>
        <button onClick={() => navigate('/surveys')} className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          {t('takeSurvey.backToSurveys')}
        </button>
      </div>
    );
  }

  // --- Main survey form ---
  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/surveys')}
          className="flex items-center gap-1 text-sm text-text-muted-light hover:text-text-light dark:hover:text-text-dark transition-colors mb-3"
        >
          <ChevronLeft size={16} /> {t('takeSurvey.backToSurveys')}
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-text-light dark:text-text-dark">{survey.title}</h1>
        <div className="flex items-center gap-2 mt-1.5">
          <Shield size={14} className="text-primary" />
          <span className="text-xs text-text-muted-light dark:text-text-muted-dark">
            Your responses are <span className="font-medium text-primary">{t('takeSurvey.anonymous')}</span>
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-text-muted-light dark:text-text-muted-dark">
            {t('takeSurvey.questionOf', { current: currentIndex + 1, total })}
          </span>
          <span className="text-xs font-semibold text-primary">
            {t('takeSurvey.answered', { count: answeredCount, total })}
          </span>
        </div>

        {/* Segmented category progress */}
        <div className="flex gap-1.5 w-full">
          {categoryGroups.map((group) => {
            const groupAnswered = group.questions.filter((q) => ratings[q.id] !== undefined).length;
            const groupTotal = group.questions.length;
            const groupComplete = groupAnswered === groupTotal;
            const groupActive = currentIndex >= group.startIndex && currentIndex < group.startIndex + groupTotal;
            const groupProgress = groupTotal > 0 ? (groupAnswered / groupTotal) * 100 : 0;
            const color = CATEGORY_COLORS[group.category] || 'bg-primary';

            return (
              <button
                key={group.category}
                onClick={() => setCurrentIndex(group.startIndex)}
                className="flex-1 min-w-0 group"
                title={`${t(`surveys.categories.${group.category}`, { defaultValue: group.category })} — ${groupAnswered}/${groupTotal}`}
              >
                {/* Bar */}
                <div className={`relative h-2 rounded-full overflow-hidden transition-all duration-200 ${
                  groupActive ? 'ring-2 ring-primary/30 ring-offset-1 ring-offset-background-light dark:ring-offset-background-dark' : ''
                } bg-gray-200 dark:bg-gray-700`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${color} ${groupComplete ? 'opacity-100' : 'opacity-75'}`}
                    style={{ width: `${groupProgress}%` }}
                  />
                </div>
                {/* Label */}
                <div className={`mt-1.5 text-[10px] font-medium truncate transition-colors ${
                  groupActive
                    ? 'text-text-light dark:text-text-dark'
                    : 'text-text-muted-light/60 dark:text-text-muted-dark/60 group-hover:text-text-muted-light dark:group-hover:text-text-muted-dark'
                }`}>
                  {t(`surveys.categories.${group.category}`, { defaultValue: group.category })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Question card */}
      {current && (
        <div className="bg-card-light dark:bg-card-dark rounded-2xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
          {/* Category badge */}
          <div className="px-6 pt-5 pb-0">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${CATEGORY_BG[current.category] || 'bg-gray-50 text-gray-600'}`}>
              <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[current.category] || 'bg-gray-400'}`} />
              {t(`surveys.categories.${current.category}`, { defaultValue: current.category })}
            </span>
          </div>

          {/* Question text */}
          <div className="px-6 py-8">
            <h2 className="text-lg sm:text-xl font-semibold text-text-light dark:text-text-dark leading-relaxed">
              {current.questionText}
            </h2>
          </div>

          {/* Star rating */}
          <div className="px-6 pb-8">
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((n) => {
                const isActive = (ratings[current.id] ?? 0) >= n;
                const isHovered = hoveredStar >= n;
                return (
                  <button
                    key={n}
                    onClick={() => handleRate(n)}
                    onMouseEnter={() => setHoveredStar(n)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      size={36}
                      className={`transition-colors duration-150 ${
                        isHovered
                          ? 'fill-yellow-300 text-yellow-300'
                          : isActive
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-2 text-sm font-medium text-text-muted-light dark:text-text-muted-dark min-w-[70px]">
                {RATING_LABELS[hoveredStar || ratings[current.id] || 0]}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <div className="px-6 py-4 border-t border-border-light dark:border-border-dark bg-gray-50/50 dark:bg-gray-800/30 flex justify-between items-center">
            <button
              onClick={() => setCurrentIndex((idx: number) => Math.max(0, idx - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:hover:text-text-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} /> {t('common:pagination.previous')}
            </button>

            {currentIndex === total - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={!allAnswered || submitMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
                {submitMutation.isPending ? t('common:buttons.submitting') : t('common:buttons.submit')}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex((idx: number) => Math.min(total - 1, idx + 1))}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {t('common:buttons.next')} <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
