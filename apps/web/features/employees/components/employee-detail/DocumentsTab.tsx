import React from 'react';
import { UploadCloud, Download, FileText, MoreHorizontal } from 'lucide-react';
import { DocumentsTabProps } from './EmployeeDetailTypes';

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
    documentsList,
    onUpload,
    showToast,
}) => {
    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-text-light dark:text-text-dark">Documents</h3>
                <div className="flex gap-2">
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
                        <UploadCloud size={16} />
                        Upload
                        <input type="file" className="hidden" onChange={onUpload} />
                    </label>
                    <button
                        onClick={() => showToast('Bulk download feature coming soon!', 'info')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <Download size={16} />
                        Download All
                    </button>
                </div>
            </div>
            {documentsList.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                    {documentsList.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark/50 rounded-lg border border-border-light dark:border-border-dark hover:border-primary/50 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p className="font-medium text-text-light dark:text-text-dark text-sm">{doc.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">
                                        <span className="uppercase">{doc.type}</span>
                                        <span>•</span>
                                        <span>Last accessed {doc.lastAccessed}</span>
                                    </div>
                                </div>
                            </div>
                            <button className="p-2 text-text-muted-light hover:text-primary hover:bg-primary/10 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                                <MoreHorizontal size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-text-muted-light dark:text-text-muted-dark border-2 border-dashed border-border-light dark:border-border-dark rounded-xl">
                    <p>No documents found for this employee.</p>
                </div>
            )}
        </div>
    );
};
