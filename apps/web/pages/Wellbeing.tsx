import React, { useState, useEffect } from 'react';
import { Megaphone, ScrollText, PartyPopper, ChevronLeft, ChevronRight, Plus, X, Check, Calendar, Type, AlignLeft } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Announcement } from '../types';
import { Toast } from '../components/Toast';

export const Wellbeing: React.FC = () => {
  const SENTIMENT_COLORS = ['#2ecc71', '#f39c12', '#e74c3c'];

  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>([]);
  const [sentimentData, setSentimentData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState<Partial<Announcement>>({
    type: 'announcement'
  });

  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    show: false, message: '', type: 'success'
  });
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [annRes, sentRes] = await Promise.all([
          fetch('http://localhost:3000/api/announcements'),
          fetch('http://localhost:3000/api/sentiment')
        ]);
        if (annRes.ok) setAnnouncementsList(await annRes.json());
        if (sentRes.ok) setSentimentData(await sentRes.json());
      } catch (error) {
        console.error('Error fetching wellbeing data:', error);
      }
    };
    fetchData();
  }, []);

  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.description) {
      showToast('Please fill in title and description.', 'warning');
      return;
    }

    const newItem: Announcement = {
      id: Date.now().toString(),
      title: newAnnouncement.title,
      description: newAnnouncement.description,
      type: newAnnouncement.type as 'announcement' | 'policy' | 'event',
      date: newAnnouncement.date
    };

    setAnnouncementsList([newItem, ...announcementsList]);
    setIsModalOpen(false);
    setNewAnnouncement({ type: 'announcement', title: '', description: '', date: '' });
    showToast('Announcement posted successfully!', 'success');
  };

  const handlePrevMonth = () => {
    showToast('Calendar navigation coming soon!', 'info');
  };

  const handleNextMonth = () => {
    showToast('Calendar navigation coming soon!', 'info');
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div className="flex flex-col">
          <h1 className="text-text-light dark:text-text-dark text-3xl font-bold tracking-tight">Employee Well-being</h1>
          <p className="text-text-muted-light dark:text-text-muted-dark text-base">Fostering a positive and supportive workplace culture.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} />
          New Announcement
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Employee Sentiment Section */}
          <section className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6">
            <h2 className="text-text-light dark:text-text-dark text-xl font-bold tracking-tight mb-4">Employee Sentiment</h2>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-shrink-0 h-48 w-48 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {sentimentData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[index]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-accent-green">82%</span>
                  <span className="text-xs text-text-muted-light">Positive</span>
                </div>
              </div>
              <div className="flex-1 w-full">
                <p className="text-text-muted-light dark:text-text-muted-dark text-sm mb-4">Based on 1,204 anonymous feedback submissions this month.</p>
                <div className="space-y-3">
                  {sentimentData.map((data, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SENTIMENT_COLORS[idx] }}></div>
                      <span className="text-sm font-medium text-text-light dark:text-text-dark min-w-[60px]">{data.name}</span>
                      <div className="flex-1 h-2 bg-background-light dark:bg-background-dark rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${data.value}%`, backgroundColor: SENTIMENT_COLORS[idx] }}></div>
                      </div>
                      <span className="text-sm font-bold text-text-light dark:text-text-dark w-8 text-right">{data.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Announcements & Policies */}
          <section className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-text-light dark:text-text-dark text-xl font-bold tracking-tight">Announcements & Policies</h2>
              <a className="text-primary text-sm font-medium hover:underline" href="#">View all</a>
            </div>
            <div className="space-y-4">
              {announcementsList.map((item) => (
                <div key={item.id} className="flex items-start gap-4 p-4 rounded-lg bg-background-light dark:bg-background-dark/50 transition-colors hover:bg-background-light/80 dark:hover:bg-background-dark">
                  <div className={`p-2 rounded-full flex-shrink-0 ${item.type === 'announcement' ? 'bg-primary/10 text-primary' :
                    item.type === 'policy' ? 'bg-accent-orange/10 text-accent-orange' :
                      'bg-accent-teal/10 text-accent-teal'
                    }`}>
                    {item.type === 'announcement' && <Megaphone size={20} />}
                    {item.type === 'policy' && <ScrollText size={20} />}
                    {item.type === 'event' && <PartyPopper size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-text-light dark:text-text-dark font-medium">{item.title}</p>
                      {item.date && (
                        <span className="text-xs bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark px-1.5 py-0.5 rounded text-text-muted-light">
                          {item.date}
                        </span>
                      )}
                    </div>
                    <p className="text-text-muted-light dark:text-text-muted-dark text-sm mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-1">
          {/* Team Calendar */}
          <section className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-text-light dark:text-text-dark text-xl font-bold tracking-tight">Team Calendar</h2>
              <div className="flex items-center gap-2">
                <button onClick={handlePrevMonth} className="p-1.5 text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark rounded-md"><ChevronLeft size={18} /></button>
                <button onClick={handleNextMonth} className="p-1.5 text-text-muted-light dark:text-text-muted-dark hover:bg-background-light dark:hover:bg-background-dark rounded-md"><ChevronRight size={18} /></button>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <p className="font-semibold text-text-light dark:text-text-dark">July 2024</p>
            </div>

            {/* Simple Calendar Grid */}
            <div className="grid grid-cols-7 text-center text-xs font-medium text-text-muted-light dark:text-text-muted-dark mb-2">
              <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
            </div>
            <div className="grid grid-cols-7 text-center text-sm gap-y-3">
              <div className="text-text-muted-light opacity-50">30</div>
              <div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div>
              <div>7</div><div>8</div>
              <div className="relative flex justify-center items-center">
                <span className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded-full font-bold shadow-md">9</span>
              </div>
              <div>10</div><div>11</div><div>12</div><div>13</div>
              <div>14</div><div>15</div><div>16</div><div>17</div>
              <div className="relative">18<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-accent-teal rounded-full"></div></div>
              <div>19</div><div>20</div>
              <div>21</div><div>22</div><div>23</div><div>24</div><div className="text-accent-red font-bold">25</div><div>26</div><div>27</div>
              <div>28</div><div>29</div><div>30</div><div>31</div>
              <div className="text-text-muted-light opacity-50">1</div>
              <div className="text-text-muted-light opacity-50">2</div>
              <div className="text-text-muted-light opacity-50">3</div>
            </div>

            <div className="mt-auto pt-6 border-t border-border-light dark:border-border-dark">
              <h3 className="font-semibold text-text-light dark:text-text-dark mb-4">Upcoming Events</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 rounded-full bg-accent-red"></div>
                  <div>
                    <p className="text-sm font-medium text-text-light dark:text-text-dark">Liam Johnson's Birthday</p>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark">July 18th</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 rounded-full bg-accent-teal"></div>
                  <div>
                    <p className="text-sm font-medium text-text-light dark:text-text-dark">Q3 All-Hands Meeting</p>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark">July 25th, 10:00 AM</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 rounded-full bg-primary"></div>
                  <div>
                    <p className="text-sm font-medium text-text-light dark:text-text-dark">Team Lunch: Engineering</p>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark">July 26th, 12:30 PM</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Add Announcement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                Post New Announcement
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted-light hover:text-text-light"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Title</label>
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                  <input
                    required
                    type="text"
                    value={newAnnouncement.title || ''}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    placeholder="e.g. Office Closure Notice"
                    className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Type</label>
                  <div className="relative">
                    <Megaphone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                    <select
                      value={newAnnouncement.type}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value as any })}
                      className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark appearance-none"
                    >
                      <option value="announcement">Announcement</option>
                      <option value="policy">Policy Update</option>
                      <option value="event">Event</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Event Date (Optional)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                    <input
                      type="text"
                      value={newAnnouncement.date || ''}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, date: e.target.value })}
                      placeholder="e.g. Aug 15"
                      className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Content</label>
                <div className="relative">
                  <AlignLeft className="absolute left-3 top-3 text-text-muted-light" size={16} />
                  <textarea
                    required
                    value={newAnnouncement.description || ''}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, description: e.target.value })}
                    placeholder="Details about the announcement..."
                    rows={4}
                    className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2"
                >
                  <Check size={16} /> Post
                </button>
              </div>
            </form>
          </div>
        </div>
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