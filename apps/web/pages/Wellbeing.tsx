import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Megaphone, ScrollText, PartyPopper, ChevronLeft, ChevronRight, Plus, X, Check, Calendar, Type, AlignLeft, BarChart3, Users, TrendingUp, Edit3, Trash2 } from 'lucide-react';
import { Announcement, UpcomingEvent } from '../types';
import { Toast } from '../components/Toast';
import { Dropdown } from '../components/Dropdown';
import { DatePicker } from '../components/DatePicker';
import { useAnnouncements, useUpcomingEvents, useAddAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement, useAddEvent, useDeleteEvent, useSentimentOverview } from '../hooks/queries';
import { useAuth } from '../contexts/AuthContext';

export const Wellbeing: React.FC = () => {
  const { t, i18n } = useTranslation(['wellbeing', 'common']);
  const { isAdminView } = useAuth();
  const { data: announcementsList = [] } = useAnnouncements();
  const { data: upcomingEvents = [] } = useUpcomingEvents();
  const { data: sentiment } = useSentimentOverview();
  const addAnnouncementMutation = useAddAnnouncement();
  const updateAnnouncementMutation = useUpdateAnnouncement();
  const deleteAnnouncementMutation = useDeleteAnnouncement();
  const addEventMutation = useAddEvent();
  const deleteEventMutation = useDeleteEvent();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState<Partial<Announcement>>({
    type: 'announcement'
  });
  const [newEvent, setNewEvent] = useState<Partial<UpcomingEvent>>({
    type: 'Meeting'
  });

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    show: false, message: '', type: 'success'
  });
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ show: true, message, type });
  };

  // Helper function to get days in a month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Helper function to get first day of month (0 = Sunday, 6 = Saturday)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1);

    const days: Array<{
      day: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      hasEvent: boolean;
      date: Date;
    }> = [];

    // Add previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const date = new Date(currentYear, currentMonth - 1, day);
      days.push({ day, isCurrentMonth: false, isToday: false, hasEvent: false, date });
    }

    // Add current month's days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      // Check if this date has any events
      const hasEvent = upcomingEvents.some(event => {
        const eventDate = new Date(event.date);
        return eventDate.getDate() === day &&
               eventDate.getMonth() === currentMonth &&
               eventDate.getFullYear() === currentYear;
      });

      days.push({ day, isCurrentMonth: true, isToday, hasEvent, date });
    }

    // Add next month's leading days to complete the grid
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let day = 1; day <= remainingDays; day++) {
        const date = new Date(currentYear, currentMonth + 1, day);
        days.push({ day, isCurrentMonth: false, isToday: false, hasEvent: false, date });
      }
    }

    return days;
  }, [currentYear, currentMonth, upcomingEvents]);

  // Get upcoming events (next 3 events from today)
  const nextUpcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return upcomingEvents
      .filter(event => new Date(event.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [upcomingEvents]);

  // Month names (translated)
  const monthNames = [
    t('common:months.january'), t('common:months.february'), t('common:months.march'),
    t('common:months.april'), t('common:months.may'), t('common:months.june'),
    t('common:months.july'), t('common:months.august'), t('common:months.september'),
    t('common:months.october'), t('common:months.november'), t('common:months.december')
  ];

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.description) {
      showToast('Please fill in title and description.', 'warning');
      return;
    }

    try {
      if (editingAnnouncementId) {
        await updateAnnouncementMutation.mutateAsync({
          id: editingAnnouncementId,
          data: {
            title: newAnnouncement.title,
            description: newAnnouncement.description,
            type: newAnnouncement.type || 'announcement',
            date: newAnnouncement.date || null,
          },
        });
        showToast(t('announcements.updated'), 'success');
      } else {
        await addAnnouncementMutation.mutateAsync({
          title: newAnnouncement.title,
          description: newAnnouncement.description,
          type: newAnnouncement.type || 'announcement',
          date: newAnnouncement.date || null,
        });
        showToast(t('announcements.created'), 'success');
      }

      setIsModalOpen(false);
      setEditingAnnouncementId(null);
      setNewAnnouncement({ type: 'announcement', title: '', description: '', date: '' });
    } catch (error: any) {
      console.error('Error saving announcement:', error);
      showToast(error.message || t('announcements.saveFailed'), 'error');
    }
  };

  const handleEditAnnouncement = (item: Announcement) => {
    setEditingAnnouncementId(item.id);
    setNewAnnouncement({ title: item.title, description: item.description, type: item.type, date: item.date || '' });
    setIsModalOpen(true);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteAnnouncementMutation.mutateAsync(id);
      showToast(t('announcements.deleted'), 'success');
    } catch (error: any) {
      console.error('Error deleting announcement:', error);
      showToast(error.message || t('announcements.deleteFailed'), 'error');
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEventMutation.mutateAsync(eventId);
      showToast('Event deleted successfully!', 'success');
    } catch (error: any) {
      console.error('Error deleting event:', error);
      showToast(error.message || 'Failed to delete event.', 'error');
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) {
      showToast('Please fill in title and date.', 'warning');
      return;
    }

    try {
      await addEventMutation.mutateAsync({
        title: newEvent.title,
        date: newEvent.date,
        type: newEvent.type || 'Meeting',
      });

      setIsEventModalOpen(false);
      setNewEvent({ type: 'Meeting', title: '', date: '' });
      showToast('Event created successfully!', 'success');
    } catch (error: any) {
      console.error('Error creating event:', error);
      showToast(error.message || 'Failed to create event. Please try again.', 'error');
    }
  };

  // Helper function to format event date
  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const monthName = monthNames[date.getMonth()] || '';
    const day = date.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    return `${monthName.slice(0, 3)} ${day}${suffix}`;
  };

  // Helper function to get event color class
  const getEventColorClass = (type: string) => {
    switch (type) {
      case 'Birthday':
        return 'bg-accent-red';
      case 'Meeting':
        return 'bg-accent-teal';
      case 'Social':
        return 'bg-primary';
      case 'Training':
        return 'bg-purple-500';
      case 'Holiday':
        return 'bg-accent-green';
      case 'Deadline':
        return 'bg-accent-orange';
      case 'Company Event':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  // Event type options for dropdown
  const eventTypeOptions = [
    { value: 'Meeting', label: t('eventTypes.meeting') },
    { value: 'Birthday', label: 'Birthday' },
    { value: 'Social', label: 'Social' },
    { value: 'Training', label: t('eventTypes.training') },
    { value: 'Holiday', label: t('eventTypes.holiday') },
    { value: 'Deadline', label: 'Deadline' },
    { value: 'Company Event', label: 'Company Event' },
  ];

  return (
    <div className="space-y-6 animate-fade-in relative">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex flex-col">
          <h1 className="text-text-light dark:text-text-dark text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-text-muted-light dark:text-text-muted-dark text-sm sm:text-base">{t('subtitle')}</p>
        </div>
        {isAdminView && (
          <button
            onClick={() => { setEditingAnnouncementId(null); setNewAnnouncement({ type: 'announcement' }); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary/90 transition-colors w-full sm:w-auto"
          >
            <Plus size={18} />
            {t('newAnnouncement')}
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Employee Sentiment Section */}
          <section className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-text-light dark:text-text-dark text-xl font-bold tracking-tight">{t('sentiment.title')}</h2>
              {sentiment && sentiment.totalResponses > 0 && (
                <span className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full flex items-center gap-1">
                  <TrendingUp size={12} /> {t('sentiment.live')}
                </span>
              )}
            </div>

            {!sentiment || sentiment.totalResponses === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <BarChart3 size={32} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">{t('sentiment.noData')}</h3>
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark max-w-sm">
                  {t('sentiment.noDataDesc')}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Donut Chart + Stats Row */}
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Donut Chart */}
                  {(() => {
                    const { positive, neutral, negative } = sentiment.distribution;
                    const size = 160;
                    const strokeWidth = 22;
                    const radius = (size - strokeWidth) / 2;
                    const circumference = 2 * Math.PI * radius;

                    // Segments: positive (green), neutral (orange), negative (red)
                    const segments = [
                      { pct: positive, color: '#4ade80' },
                      { pct: neutral,  color: '#f59e0b' },
                      { pct: negative, color: '#ef4444' },
                    ];

                    let offset = 0;
                    const arcs = segments.map((seg) => {
                      const dash = (seg.pct / 100) * circumference;
                      const gap = circumference - dash;
                      const currentOffset = offset;
                      offset += dash;
                      return { ...seg, dash, gap, offset: currentOffset };
                    });

                    // Label color based on overall score
                    const scoreColor = sentiment.overallScore >= 70 ? 'text-green-500'
                      : sentiment.overallScore >= 50 ? 'text-amber-500' : 'text-red-500';
                    const sentimentLabel = sentiment.overallScore >= 70 ? t('wellbeing:sentiment.positive')
                      : sentiment.overallScore >= 50 ? t('wellbeing:sentiment.neutral') : t('wellbeing:sentiment.needsWork');

                    return (
                      <div className="relative flex-shrink-0">
                        <svg width={size} height={size} className="-rotate-90">
                          {/* Background track */}
                          <circle
                            cx={size / 2} cy={size / 2} r={radius}
                            fill="none" strokeWidth={strokeWidth}
                            className="stroke-gray-200 dark:stroke-gray-700"
                          />
                          {/* Segments */}
                          {arcs.map((arc, i) => arc.pct > 0 && (
                            <circle
                              key={i}
                              cx={size / 2} cy={size / 2} r={radius}
                              fill="none" stroke={arc.color} strokeWidth={strokeWidth}
                              strokeDasharray={`${arc.dash} ${arc.gap}`}
                              strokeDashoffset={-arc.offset}
                              strokeLinecap="round"
                              className="transition-all duration-700 ease-out"
                            />
                          ))}
                        </svg>
                        {/* Center text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-3xl font-bold ${scoreColor}`}>{sentiment.overallScore}%</span>
                          <span className={`text-xs font-medium ${scoreColor} opacity-80`}>{sentimentLabel}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Right side: Legend + Stats */}
                  <div className="flex-1 space-y-4 w-full">
                    {/* Distribution Legend */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                        <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('wellbeing:sentiment.positive')} {sentiment.distribution.positive}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('wellbeing:sentiment.neutral')} {sentiment.distribution.neutral}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('wellbeing:sentiment.negative')} {sentiment.distribution.negative}%</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-background-light dark:bg-background-dark rounded-lg">
                        <div className="text-2xl font-bold text-accent-teal">{sentiment.responseRate}%</div>
                        <div className="text-xs text-text-muted-light mt-0.5">{t('sentiment.responseRate')}</div>
                      </div>
                      <div className="p-3 bg-background-light dark:bg-background-dark rounded-lg">
                        <div className="text-2xl font-bold text-text-light dark:text-text-dark flex items-center gap-1">
                          <Users size={18} className="text-text-muted-light" />
                          {sentiment.totalResponses}/{sentiment.totalEmployees}
                        </div>
                        <div className="text-xs text-text-muted-light mt-0.5">{t('sentiment.respondents')}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div>
                  <h3 className="text-sm font-semibold text-text-light dark:text-text-dark mb-3">{t('sentiment.categoryBreakdown')}</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {[...sentiment.categoryBreakdown]
                      .sort((a, b) => b.score - a.score)
                      .map((cat) => {
                        const color = cat.score >= 80 ? 'bg-accent-green' :
                          cat.score >= 60 ? 'bg-primary' :
                          cat.score >= 40 ? 'bg-accent-orange' : 'bg-accent-red';
                        return (
                          <div key={cat.category} className="flex items-center gap-2.5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[11px] text-text-muted-light dark:text-text-muted-dark truncate">{t(`sentiment.categories.${cat.category}`, cat.category)}</span>
                                <span className="text-[11px] font-bold text-text-light dark:text-text-dark ml-1">{cat.score}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-background-light dark:bg-background-dark rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${color}`}
                                  style={{ width: `${cat.score}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Announcements & Policies */}
          <section className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-text-light dark:text-text-dark text-xl font-bold tracking-tight">{t('announcements.title')}</h2>
              {isAdminView && (
                <button
                  onClick={() => { setEditingAnnouncementId(null); setNewAnnouncement({ type: 'announcement' }); setIsModalOpen(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus size={14} /> {t('newAnnouncement')}
                </button>
              )}
            </div>
            <div className="space-y-4">
              {announcementsList.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-background-light dark:bg-background-dark flex items-center justify-center mb-3">
                    <Megaphone size={24} className="text-text-muted-light dark:text-text-muted-dark" />
                  </div>
                  <p className="text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('announcements.noAnnouncements')}</p>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{t('announcements.noAnnouncementsHint')}</p>
                </div>
              )}
              {announcementsList.map((item) => (
                <div key={item.id} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-background-light dark:bg-background-dark/50 transition-colors hover:bg-background-light/80 dark:hover:bg-background-dark">
                  <div className={`p-2 rounded-full flex-shrink-0 ${item.type === 'announcement' ? 'bg-primary/10 text-primary' :
                    item.type === 'policy' ? 'bg-accent-orange/10 text-accent-orange' :
                      'bg-accent-teal/10 text-accent-teal'
                    }`}>
                    {item.type === 'announcement' && <Megaphone size={20} />}
                    {item.type === 'policy' && <ScrollText size={20} />}
                    {item.type === 'event' && <PartyPopper size={20} />}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-text-light dark:text-text-dark font-medium text-sm sm:text-base">{item.title}</p>
                      {item.date && (
                        <span className="text-xs bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark px-1.5 py-0.5 rounded text-text-muted-light">
                          {item.date}
                        </span>
                      )}
                    </div>
                    <p className="text-text-muted-light dark:text-text-muted-dark text-sm mt-0.5">{item.description}</p>
                    {(item.author || item.createdAt) && (
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-text-muted-light dark:text-text-muted-dark">
                        {item.author && <span className="font-medium">{item.author}</span>}
                        {item.author && item.createdAt && <span>·</span>}
                        {item.createdAt && (
                          <span>{new Date(item.createdAt).toLocaleDateString(i18n.language === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        )}
                      </div>
                    )}
                  </div>
                  {isAdminView && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEditAnnouncement(item)}
                        className="p-1.5 rounded-lg text-text-muted-light dark:text-text-muted-dark hover:text-primary hover:bg-primary/10 transition-colors"
                        title={t('announcements.edit')}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteAnnouncement(item.id)}
                        className="p-1.5 rounded-lg text-text-muted-light dark:text-text-muted-dark hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title={t('announcements.delete')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-1">
          {/* Team Calendar */}
          <section className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 h-full flex flex-col">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex justify-between items-center">
                <h2 className="text-text-light dark:text-text-dark text-xl font-bold tracking-tight">{t('calendar.teamCalendar')}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={handlePrevMonth} className="p-1.5 text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark rounded-md"><ChevronLeft size={18} /></button>
                  <button onClick={handleNextMonth} className="p-1.5 text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark rounded-md"><ChevronRight size={18} /></button>
                </div>
              </div>
              <button
                onClick={() => setIsEventModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary/90 transition-all hover:shadow-md"
              >
                <Plus size={18} />
                {t('calendar.addEvent')}
              </button>
            </div>

            <div className="flex justify-between items-center mb-4">
              <p className="font-semibold text-text-light dark:text-text-dark">
                {monthNames[currentMonth]} {currentYear}
              </p>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 text-center text-xs font-medium text-text-muted-light dark:text-text-muted-dark mb-3">
              <span className="py-2">{t('common:weekdays.su')}</span><span className="py-2">{t('common:weekdays.mo')}</span><span className="py-2">{t('common:weekdays.tu')}</span><span className="py-2">{t('common:weekdays.we')}</span><span className="py-2">{t('common:weekdays.th')}</span><span className="py-2">{t('common:weekdays.fr')}</span><span className="py-2">{t('common:weekdays.sa')}</span>
            </div>
            <div className="grid grid-cols-7 text-center text-sm gap-y-4 flex-grow">
              {calendarDays.map((dayInfo, index) => (
                <div
                  key={index}
                  className={`relative flex items-center justify-center min-h-[40px] ${!dayInfo.isCurrentMonth ? 'text-text-muted-light opacity-50' : 'text-text-light dark:text-text-dark'}`}
                >
                  {dayInfo.isToday ? (
                    <span className="w-9 h-9 flex items-center justify-center bg-primary text-white rounded-full font-bold shadow-md">
                      {dayInfo.day}
                    </span>
                  ) : (
                    <>
                      {dayInfo.day}
                      {dayInfo.hasEvent && dayInfo.isCurrentMonth && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-accent-teal rounded-full"></div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-border-light dark:border-border-dark">
              <h3 className="font-semibold text-text-light dark:text-text-dark mb-4">{t('calendar.upcomingEvents')}</h3>
              {nextUpcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {nextUpcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-3 group">
                      <div className={`w-1 h-8 rounded-full ${getEventColorClass(event.type)}`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-light dark:text-text-dark truncate">{event.title}</p>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{formatEventDate(event.date)}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-text-muted-light hover:text-red-500 transition-all"
                        title="Delete event"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('calendar.noUpcoming')}</p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Add Announcement Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                {editingAnnouncementId ? t('announcements.editTitle') : t('announcementModal.title')}
              </h3>
              <button
                onClick={() => { setIsModalOpen(false); setEditingAnnouncementId(null); setNewAnnouncement({ type: 'announcement' }); }}
                className="text-text-muted-light hover:text-text-light"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('announcementModal.titleLabel')}</label>
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                  <input
                    required
                    type="text"
                    value={newAnnouncement.title || ''}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    placeholder={t('announcementModal.titlePlaceholder')}
                    className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('announcementModal.type')}</label>
                  <Dropdown
                    value={newAnnouncement.type || 'announcement'}
                    onChange={(value) => setNewAnnouncement({ ...newAnnouncement, type: value as any })}
                    options={[
                      { value: 'announcement', label: t('announcementModal.typeAnnouncement') },
                      { value: 'policy', label: t('announcementModal.typePolicy') },
                      { value: 'event', label: t('announcementModal.typeEvent') }
                    ]}
                    placeholder={t('common:placeholders.selectAnnouncementType')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('announcementModal.eventDate')}</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                    <input
                      type="text"
                      value={newAnnouncement.date || ''}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, date: e.target.value })}
                      placeholder={t('announcementModal.eventDatePlaceholder')}
                      className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('announcementModal.content')}</label>
                <div className="relative">
                  <AlignLeft className="absolute left-3 top-3 text-text-muted-light" size={16} />
                  <textarea
                    required
                    value={newAnnouncement.description || ''}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, description: e.target.value })}
                    placeholder={t('announcementModal.contentPlaceholder')}
                    rows={4}
                    className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingAnnouncementId(null); setNewAnnouncement({ type: 'announcement' }); }}
                  className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
                >
                  {t('announcementModal.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2"
                >
                  <Check size={16} /> {editingAnnouncementId ? t('announcements.save') : t('announcementModal.post')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add Event Modal */}
      {isEventModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                {t('eventModal.title')}
              </h3>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="text-text-muted-light hover:text-text-light"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('eventModal.eventTitle')}</label>
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                  <input
                    required
                    type="text"
                    value={newEvent.title || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder={t('eventModal.titlePlaceholder')}
                    className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('eventModal.eventType')}</label>
                  <Dropdown
                    value={newEvent.type || 'Meeting'}
                    onChange={(value) => setNewEvent({ ...newEvent, type: value as any })}
                    options={eventTypeOptions}
                    placeholder={t('common:placeholders.selectEventType')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">{t('eventModal.date')}</label>
                  <DatePicker
                    value={newEvent.date || ''}
                    onChange={(date) => setNewEvent({ ...newEvent, date })}
                    placeholder={t('common:placeholders.selectDate')}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
                >
                  {t('eventModal.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2"
                >
                  <Check size={16} /> {t('eventModal.create')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

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