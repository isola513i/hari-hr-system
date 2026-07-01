import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Megaphone, Users } from 'lucide-react';
import { Announcement } from '../../types';

interface AnnouncementsCardProps {
  announcementsData: Announcement[];
}

export const AnnouncementsCard: React.FC<AnnouncementsCardProps> = ({ announcementsData }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();

  return (
    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg">
                <Megaphone size={16} />
              </div>
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{t('dashboard:employee.announcements')}</h2>
            </div>
            <button onClick={() => navigate('/wellbeing')} className="text-xs text-primary font-medium hover:underline">{t('common:buttons.viewAll')}</button>
          </div>
          <div className="p-4 space-y-3 flex-grow flex flex-col">
            {announcementsData.length > 0 ? (
              announcementsData.slice(0, 3).map(ann => (
                <div key={ann.id} className="p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide ${
                      ann.type === 'announcement' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      ann.type === 'policy' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                    }`}>
                      {ann.type}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-text-light dark:text-text-dark mb-0.5">{ann.title}</p>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark line-clamp-2 leading-relaxed">{ann.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-text-muted-light dark:text-text-muted-dark">
                    {ann.author && (
                      <span className="flex items-center gap-1">
                        <Users size={10} />
                        {ann.author}
                      </span>
                    )}
                    {ann.author && ann.createdAt && <span>·</span>}
                    {ann.createdAt && (
                      <span>{new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-text-muted-light dark:text-text-muted-dark">
                <Megaphone size={28} className="mb-2 opacity-20" />
                <p className="text-sm">{t('dashboard:employee.noAnnouncements')}</p>
              </div>
            )}
          </div>
        </div>
  );
};
