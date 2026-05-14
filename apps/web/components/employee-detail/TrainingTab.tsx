import React from 'react';
import { CheckCircle2, PlayCircle, Clock, BookOpen, Trash2, AlertCircle, Play, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmployeeTrainingRecord } from '../../types';
import { getAuthToken, BASE_URL } from '../../lib/api';

interface TrainingTabProps {
    isAdmin: boolean;
    trainingRecords: EmployeeTrainingRecord[];
    showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    onAssignTraining?: () => void;
    onDeleteTraining?: (id: string) => void;
    onUpdateStatus?: (id: string, status: string) => void;
}

export const TrainingTab: React.FC<TrainingTabProps> = ({
    isAdmin,
    trainingRecords,
    showToast,
    onAssignTraining,
    onDeleteTraining,
    onUpdateStatus,
}) => {
    const { t } = useTranslation(['employees', 'common']);

    const handleDownloadCertificate = async (id: string, title: string) => {
        try {
            const token = getAuthToken();
            const res = await fetch(`${BASE_URL}/training/${id}/certificate`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Download failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `certificate-${title.replace(/\s+/g, '-')}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            showToast('Failed to download certificate', 'error');
        }
    };

    const isOverdue = (dueDate?: string) => {
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-text-light dark:text-text-dark">{t('employees:training.title')}</h3>
                {isAdmin && (
                    <button
                        onClick={() => onAssignTraining ? onAssignTraining() : showToast(t('employees:toast.trainingAssign'), 'info')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        {t('employees:training.assignModule')}
                    </button>
                )}
            </div>
            {trainingRecords.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                    {trainingRecords.map(record => (
                        <div key={record.id} className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark/50 rounded-lg border border-border-light dark:border-border-dark">
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-lg ${record.status === 'Completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : record.status === 'In Progress' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                                    {record.status === 'Completed' ? <CheckCircle2 size={20} /> : record.status === 'In Progress' ? <PlayCircle size={20} /> : <Clock size={20} />}
                                </div>
                                <div>
                                    <p className="font-medium text-text-light dark:text-text-dark text-sm">{record.title}</p>
                                    <div className="flex items-center gap-3 text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">
                                        <span className="flex items-center gap-1"><Clock size={12} /> {record.duration}</span>
                                        {record.completionDate && <span>{t('employees:training.completedOn')} {record.completionDate}</span>}
                                        {record.score != null && <span className="font-semibold text-primary">Score: {record.score}%</span>}
                                        {record.dueDate && (
                                            <span className={`flex items-center gap-1 ${isOverdue(record.dueDate) && record.status !== 'Completed' ? 'text-red-500 font-medium' : ''}`}>
                                                {isOverdue(record.dueDate) && record.status !== 'Completed' && <AlertCircle size={12} />}
                                                Due: {new Date(record.dueDate).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {record.status === 'Completed' && (
                                    <button
                                        onClick={() => handleDownloadCertificate(record.id, record.title)}
                                        className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                        title="Download Certificate"
                                    >
                                        <Download size={14} />
                                    </button>
                                )}
                                {record.status === 'Not Started' && onUpdateStatus && (
                                    <button
                                        onClick={() => onUpdateStatus(record.id, 'In Progress')}
                                        className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                        title="Start Training"
                                    >
                                        <Play size={14} />
                                    </button>
                                )}
                                {record.status === 'In Progress' && onUpdateStatus && (
                                    <button
                                        onClick={() => onUpdateStatus(record.id, 'Completed')}
                                        className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                        title="Mark Complete"
                                    >
                                        <CheckCircle2 size={14} />
                                    </button>
                                )}
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${record.status === 'Completed'
                                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                    : record.status === 'In Progress'
                                        ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                                        : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                    }`}>
                                    {t(`common:status.${record.status === 'In Progress' ? 'inProgress' : record.status.toLowerCase()}`, { defaultValue: record.status })}
                                </span>
                                {isAdmin && onDeleteTraining && (
                                    <button
                                        onClick={() => onDeleteTraining(record.id)}
                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors ml-1"
                                        title="Delete"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-text-muted-light dark:text-text-muted-dark border-2 border-dashed border-border-light dark:border-border-dark rounded-xl">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
                    <p>{t('employees:training.noRecords')}</p>
                    <p className="text-xs mt-1">{t('employees:training.assignToStart')}</p>
                </div>
            )}
        </div>
    );
};
