import React from 'react';
import { CheckCircle2, PlayCircle, Clock, BookOpen } from 'lucide-react';
import { TrainingTabProps } from './EmployeeDetailTypes';

export const TrainingTab: React.FC<TrainingTabProps> = ({
    isAdmin,
    trainingRecords,
    showToast,
}) => {
    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Training Records</h3>
                {isAdmin && (
                    <button
                        onClick={() => showToast('Training assignment feature coming soon!', 'info')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        Assign Module
                    </button>
                )}
            </div>
            {trainingRecords.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                    {trainingRecords.map(record => (
                        <div key={record.id} className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark/50 rounded-lg border border-border-light dark:border-border-dark">
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-lg ${record.status === 'Completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
                                    {record.status === 'Completed' ? <CheckCircle2 size={20} /> : <PlayCircle size={20} />}
                                </div>
                                <div>
                                    <p className="font-medium text-text-light dark:text-text-dark text-sm">{record.title}</p>
                                    <div className="flex items-center gap-3 text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">
                                        <span className="flex items-center gap-1"><Clock size={12} /> {record.duration}</span>
                                        {record.completionDate && <span>Completed on {record.completionDate}</span>}
                                        {record.score && <span className="font-semibold text-primary">Score: {record.score}%</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${record.status === 'Completed'
                                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                    : 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                                    }`}>
                                    {record.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-text-muted-light dark:text-text-muted-dark border-2 border-dashed border-border-light dark:border-border-dark rounded-xl">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No training records found.</p>
                    <p className="text-xs mt-1">Assign a training module to get started.</p>
                </div>
            )}
        </div>
    );
};
