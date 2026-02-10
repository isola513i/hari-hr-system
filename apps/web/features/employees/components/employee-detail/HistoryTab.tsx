import React from 'react';
import { Plus, Edit2 } from 'lucide-react';
import { HistoryTabProps } from './EmployeeDetailTypes';

export const HistoryTab: React.FC<HistoryTabProps> = ({
    permissions,
    historyList,
    editingHistoryId,
    tempHistoryItem,
    onSetTempHistoryItem,
    onStartEditHistory,
    onCancelEditHistory,
    onSaveHistory,
    onAddClick,
}) => {
    const { isAdmin, isOwnProfile } = permissions;
    const canEdit = isAdmin || isOwnProfile;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Employment History</h3>
                {canEdit && (
                    <button
                        onClick={onAddClick}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        <Plus size={16} />
                        Add Position
                    </button>
                )}
            </div>
            <div className="relative border-l-2 border-border-light dark:border-border-dark ml-3 space-y-8">
                {historyList.map((job, index) => (
                    <div key={job.id} className="relative pl-8">
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-card-dark ${index === 0 ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}></div>

                        {editingHistoryId === job.id && tempHistoryItem && canEdit ? (
                            <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-4 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark">Role</label>
                                        <input
                                            value={tempHistoryItem.role}
                                            onChange={(e) => onSetTempHistoryItem({ ...tempHistoryItem, role: e.target.value })}
                                            className="w-full mt-1 px-2 py-1.5 text-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded focus:outline-none focus:ring-1 focus:ring-primary text-text-light dark:text-text-dark"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark">Department</label>
                                        <input
                                            value={tempHistoryItem.department}
                                            onChange={(e) => onSetTempHistoryItem({ ...tempHistoryItem, department: e.target.value })}
                                            className="w-full mt-1 px-2 py-1.5 text-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded focus:outline-none focus:ring-1 focus:ring-primary text-text-light dark:text-text-dark"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark">Start Date</label>
                                        <input
                                            type="date"
                                            value={tempHistoryItem.startDate}
                                            onChange={(e) => onSetTempHistoryItem({ ...tempHistoryItem, startDate: e.target.value })}
                                            className="w-full mt-1 px-2 py-1.5 text-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded focus:outline-none focus:ring-1 focus:ring-primary text-text-light dark:text-text-dark"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark">End Date</label>
                                        <input
                                            type="date"
                                            value={tempHistoryItem.endDate && tempHistoryItem.endDate !== 'Present' ? tempHistoryItem.endDate : ''}
                                            onChange={(e) => onSetTempHistoryItem({ ...tempHistoryItem, endDate: e.target.value })}
                                            disabled={!tempHistoryItem.endDate || tempHistoryItem.endDate === 'Present'}
                                            className="w-full mt-1 px-2 py-1.5 text-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded focus:outline-none focus:ring-1 focus:ring-primary text-text-light dark:text-text-dark disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        <label className="flex items-center mt-1 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!tempHistoryItem.endDate || tempHistoryItem.endDate === 'Present'}
                                                onChange={(e) => onSetTempHistoryItem({ ...tempHistoryItem, endDate: e.target.checked ? 'Present' : '' })}
                                                className="w-3 h-3 text-primary bg-card-light dark:bg-card-dark border-border-light dark:border-border-dark rounded focus:ring-1 focus:ring-primary"
                                            />
                                            <span className="ml-1 text-xs text-text-muted-light dark:text-text-muted-dark">Current</span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark">Description</label>
                                    <textarea
                                        value={tempHistoryItem.description}
                                        onChange={(e) => onSetTempHistoryItem({ ...tempHistoryItem, description: e.target.value })}
                                        className="w-full mt-1 px-2 py-1.5 text-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded focus:outline-none focus:ring-1 focus:ring-primary text-text-light dark:text-text-dark"
                                        rows={2}
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={onCancelEditHistory}
                                        className="px-3 py-1.5 text-xs font-medium text-text-muted-light hover:text-text-light dark:hover:text-text-dark"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={onSaveHistory}
                                        className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded hover:bg-primary/90"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="group">
                                <div className="flex justify-between items-start gap-4 mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-base font-bold text-text-light dark:text-text-dark">{job.role}</h4>
                                            {canEdit && (
                                                <button
                                                    onClick={() => onStartEditHistory(job)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-text-muted-light hover:text-primary"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-sm font-medium text-primary mb-2">{job.department}</p>
                                        <p className="text-sm text-text-muted-light dark:text-text-muted-dark leading-relaxed">
                                            {job.description}
                                        </p>
                                    </div>
                                    <span className={`text-sm font-medium whitespace-nowrap ${index === 0 ? 'text-green-600 dark:text-green-400' : 'text-text-muted-light dark:text-text-muted-dark'}`}>
                                        {job.startDate} - {job.endDate}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
