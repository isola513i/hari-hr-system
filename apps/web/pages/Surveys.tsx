import React, { useState } from 'react';
import { MessageSquare, CheckCircle2, ArrowRight, Clock } from 'lucide-react';
import { Toast } from '../components/Toast';

export const Surveys: React.FC = () => {
  const activeSurveys = [
      { id: 1, title: 'Q3 Employee Pulse', due: '2 days left', time: '5 min' },
      { id: 2, title: 'Remote Work Feedback', due: '1 week left', time: '10 min' }
  ];

  const pastSurveys = [
      { id: 101, title: 'Q2 Satisfaction Survey', date: 'Submitted Jun 15', status: 'Completed' },
      { id: 102, title: 'Manager Feedback 360', date: 'Submitted May 20', status: 'Completed' }
  ];

  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    show: false, message: '', type: 'success'
  });
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ show: true, message, type });
  };

  const handleStartSurvey = (title: string) => {
    showToast(`Opening "${title}"...`, 'info');
  };

  const handleViewHistory = () => {
    showToast('Full history page coming soon!', 'info');
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">Surveys & Feedback</h1>
          <p className="text-text-muted-light dark:text-text-muted-dark">Share your voice to help improve our workplace.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Active Surveys */}
            <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border-light dark:border-border-dark bg-primary/5">
                    <h2 className="text-lg font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                        <MessageSquare size={20} className="text-primary"/> Active Surveys
                    </h2>
                </div>
                <div className="p-6 space-y-4">
                    {activeSurveys.length > 0 ? activeSurveys.map(survey => (
                        <div key={survey.id} className="flex justify-between items-center p-4 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark">
                            <div>
                                <h3 className="font-semibold text-text-light dark:text-text-dark">{survey.title}</h3>
                                <div className="flex gap-3 text-xs text-text-muted-light mt-1">
                                    <span className="text-accent-orange font-medium">{survey.due}</span>
                                    <span>•</span>
                                    <span>{survey.time} read</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleStartSurvey(survey.title)}
                                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-1 transition-colors"
                            >
                                Start <ArrowRight size={16} />
                            </button>
                        </div>
                    )) : (
                        <p className="text-text-muted-light text-center py-4">No active surveys.</p>
                    )}
                </div>
            </div>

            {/* History */}
            <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border-light dark:border-border-dark">
                    <h2 className="text-lg font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                        <Clock size={20} className="text-text-muted-light"/> History
                    </h2>
                </div>
                <div className="divide-y divide-border-light dark:divide-border-dark">
                    {pastSurveys.map(survey => (
                        <div key={survey.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div>
                                <h3 className="font-medium text-text-light dark:text-text-dark text-sm">{survey.title}</h3>
                                <p className="text-xs text-text-muted-light mt-0.5">{survey.date}</p>
                            </div>
                             <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                <CheckCircle2 size={12} /> {survey.status}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="p-4 text-center border-t border-border-light dark:border-border-dark">
                    <button onClick={handleViewHistory} className="text-sm text-primary hover:underline">View All History</button>
                </div>
            </div>
        </div>

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