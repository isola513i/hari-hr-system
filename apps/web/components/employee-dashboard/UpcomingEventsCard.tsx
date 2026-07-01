import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar as CalendarIcon,
  Cake,
  PartyPopper,
  GraduationCap,
  Flag,
  Clock,
  Building2,
} from 'lucide-react';
import { Avatar } from '../Avatar';
import { UpcomingEvent } from '../../types';

interface UpcomingEventsCardProps {
  upcomingEvents: UpcomingEvent[];
}

export const UpcomingEventsCard: React.FC<UpcomingEventsCardProps> = ({ upcomingEvents }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();

  return (
    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark flex flex-col shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                <CalendarIcon size={16} />
              </div>
              <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">{t('dashboard:admin.events')}</h2>
            </div>
            <button onClick={() => navigate('/wellbeing')} className="text-xs text-primary font-medium hover:underline">{t('common:buttons.viewAll')}</button>
          </div>
          <div className="p-4 flex-grow flex flex-col">
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 4).map(event => (
                  <div key={event.id} className="flex items-center gap-3 p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark">
                    {event.avatar ? (
                      <Avatar src={event.avatar} name={event.title} size="lg" className="ring-2 ring-white dark:ring-background-dark" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                        event.type === 'Meeting' ? 'bg-accent-teal/10 text-accent-teal' :
                        event.type === 'Birthday' ? 'bg-pink-100 text-pink-500 dark:bg-pink-500/10 dark:text-pink-400' :
                        event.type === 'Social' ? 'bg-amber-100 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400' :
                        event.type === 'Training' ? 'bg-violet-100 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400' :
                        event.type === 'Holiday' ? 'bg-green-100 text-green-500 dark:bg-green-500/10 dark:text-green-400' :
                        event.type === 'Deadline' ? 'bg-red-100 text-red-500 dark:bg-red-500/10 dark:text-red-400' :
                        event.type === 'Company Event' ? 'bg-blue-100 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {event.type === 'Meeting' && <CalendarIcon size={18} />}
                        {event.type === 'Birthday' && <Cake size={18} />}
                        {event.type === 'Social' && <PartyPopper size={18} />}
                        {event.type === 'Training' && <GraduationCap size={18} />}
                        {event.type === 'Holiday' && <Flag size={18} />}
                        {event.type === 'Deadline' && <Clock size={18} />}
                        {event.type === 'Company Event' && <Building2 size={18} />}
                        {!['Meeting', 'Birthday', 'Social', 'Training', 'Holiday', 'Deadline', 'Company Event'].includes(event.type) && <CalendarIcon size={18} />}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-text-light dark:text-text-dark truncate">{event.title}</p>
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-text-muted-light dark:text-text-muted-dark">
                <CalendarIcon size={28} className="mb-2 opacity-20" />
                <p className="text-sm">{t('dashboard:admin.noUpcomingEvents')}</p>
              </div>
            )}
          </div>
        </div>
  );
};
