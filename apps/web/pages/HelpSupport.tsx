import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  Clock,
  FileText,
  Settings,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  DollarSign,
  Receipt,
} from 'lucide-react';
import { api } from '../lib/api';

export const HelpSupport: React.FC = () => {
  const { t } = useTranslation(['help', 'common']);
  const [searchTerm, setSearchTerm] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const [form, setForm] = useState({ subject: '', message: '' });
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');

  const faqs = [
    { question: t('faq.q1'), answer: t('faq.a1') },
    { question: t('faq.q2'), answer: t('faq.a2') },
    { question: t('faq.q3'), answer: t('faq.a3') },
    { question: t('faq.q4'), answer: t('faq.a4') },
    { question: t('faq.q5'), answer: t('faq.a5') },
    { question: t('faq.q6'), answer: t('faq.a6') },
    { question: t('faq.q7'), answer: t('faq.a7') },
    { question: t('faq.q8'), answer: t('faq.a8') },
    { question: t('faq.q9'), answer: t('faq.a9') },
    { question: t('faq.q10'), answer: t('faq.a10') },
    { question: t('faq.q11'), answer: t('faq.a11') },
    { question: t('faq.q12'), answer: t('faq.a12') },
    { question: t('faq.q13'), answer: t('faq.a13') },
    { question: t('faq.q14'), answer: t('faq.a14') },
    { question: t('faq.q15'), answer: t('faq.a15') },
    { question: t('faq.q16'), answer: t('faq.a16') },
    { question: t('faq.q17'), answer: t('faq.a17') },
    { question: t('faq.q18'), answer: t('faq.a18') },
    { question: t('faq.q19'), answer: t('faq.a19') },
    { question: t('faq.q20'), answer: t('faq.a20') },
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) return;

    setIsSending(true);
    setSendError('');
    try {
      await api.post('/notifications/support-contact', {
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      setSent(true);
      setForm({ subject: '', message: '' });
    } catch (err: any) {
      setSendError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Hero / Search Section */}
      <div className="bg-primary-dark rounded-2xl p-8 md:p-12 text-center text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <h1 className="text-3xl md:text-4xl font-bold mb-4 relative z-10">{t('title')}</h1>
        <p className="text-blue-100 mb-8 max-w-2xl mx-auto relative z-10">
          {t('subtitle')}
        </p>
        <div className="relative max-w-xl mx-auto z-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-800 shadow-xl focus:outline-none focus:ring-4 focus:ring-primary/30 transition-shadow"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FAQs */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
            <HelpCircle className="text-primary" />
            {t('faq.title')}
          </h2>

          <div className="space-y-4">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden transition-all shadow-sm"
                >
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
                  >
                    <span className="font-semibold text-text-light dark:text-text-dark">{faq.question}</span>
                    {openFaqIndex === index ? (
                      <ChevronUp className="text-primary flex-shrink-0 transition-transform" size={20} />
                    ) : (
                      <ChevronDown className="text-text-muted-light flex-shrink-0 transition-transform" size={20} />
                    )}
                  </button>
                  {openFaqIndex === index && (
                    <div className="px-5 pb-5 text-text-muted-light dark:text-text-muted-dark text-sm leading-relaxed animate-in slide-in-from-top-2 duration-200">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark">
                <p className="text-text-muted-light">{t('faq.noResults', { term: searchTerm })}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Links */}
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
            <h3 className="font-bold text-text-light dark:text-text-dark mb-4">{t('quickLinks.title')}</h3>
            <div className="space-y-2">
              <Link
                to="/time-off"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors group"
              >
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Clock size={16} />
                </div>
                <div>
                  <p className="font-medium text-sm text-text-light dark:text-text-dark">{t('quickLinks.timeOff')}</p>
                  <p className="text-xs text-text-muted-light">{t('quickLinks.timeOffDesc')}</p>
                </div>
              </Link>
              <Link
                to="/documents"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors group"
              >
                <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
                  <FileText size={16} />
                </div>
                <div>
                  <p className="font-medium text-sm text-text-light dark:text-text-dark">{t('quickLinks.documents')}</p>
                  <p className="text-xs text-text-muted-light">{t('quickLinks.documentsDesc')}</p>
                </div>
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors group"
              >
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                  <Settings size={16} />
                </div>
                <div>
                  <p className="font-medium text-sm text-text-light dark:text-text-dark">{t('quickLinks.settings')}</p>
                  <p className="text-xs text-text-muted-light">{t('quickLinks.settingsDesc')}</p>
                </div>
              </Link>
              <Link
                to="/training"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors group"
              >
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg">
                  <GraduationCap size={16} />
                </div>
                <div>
                  <p className="font-medium text-sm text-text-light dark:text-text-dark">{t('quickLinks.training')}</p>
                  <p className="text-xs text-text-muted-light">{t('quickLinks.trainingDesc')}</p>
                </div>
              </Link>
              <Link
                to="/payroll"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors group"
              >
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <DollarSign size={16} />
                </div>
                <div>
                  <p className="font-medium text-sm text-text-light dark:text-text-dark">{t('quickLinks.payroll')}</p>
                  <p className="text-xs text-text-muted-light">{t('quickLinks.payrollDesc')}</p>
                </div>
              </Link>
              <Link
                to="/expenses"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors group"
              >
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
                  <Receipt size={16} />
                </div>
                <div>
                  <p className="font-medium text-sm text-text-light dark:text-text-dark">{t('quickLinks.expenses')}</p>
                  <p className="text-xs text-text-muted-light">{t('quickLinks.expensesDesc')}</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Contact Support */}
          <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
            <h3 className="font-bold text-text-light dark:text-text-dark mb-1">{t('contact.title')}</h3>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-4">
              {t('contact.subtitle')}
            </p>

            {sent ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle className="text-green-500" size={32} />
                <p className="font-medium text-text-light dark:text-text-dark">{t('contact.sent')}</p>
                <p className="text-sm text-text-muted-light">{t('contact.sentDesc')}</p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  {t('contact.sendAnother')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSend} className="space-y-3">
                <input
                  type="text"
                  placeholder={t('contact.subject')}
                  value={form.subject}
                  onChange={(e) => setForm(p => ({ ...p, subject: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                />
                <textarea
                  rows={3}
                  placeholder={t('contact.message')}
                  value={form.message}
                  onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark resize-none"
                />
                {sendError && (
                  <div className="flex items-center gap-2 text-red-500 text-xs">
                    <AlertCircle size={14} /> {sendError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSending || !form.subject.trim() || !form.message.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-white font-medium rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mail size={16} />
                  {isSending ? t('contact.sending') : t('contact.send')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
