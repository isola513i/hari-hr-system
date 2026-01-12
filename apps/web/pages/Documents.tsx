import React, { useState, useEffect } from 'react';
// Mocks removed
import {
    FileText,
    Download,
    UploadCloud,
    Search,
    ShieldCheck,
    FolderOpen,
    Grid,
    List,
    MoreVertical,
    FileSpreadsheet,
    FileImage,
    File,
    Clock,
    HardDrive,
    Share2,
    Filter,
    X,
} from 'lucide-react';
import { DocumentItem } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const Documents: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = user.role === 'HR_ADMIN';

    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedCategory, setSelectedCategory] = useState<string>('All Files');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFileType, setSelectedFileType] = useState<string>('All');
    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/documents');
                if (response.ok) {
                    setDocuments(await response.json());
                }
            } catch (error) {
                console.error('Error fetching documents:', error);
            }
        };
        fetchDocuments();
    }, []);

    const categories = [
        { name: 'All Files', icon: <FolderOpen size={18} /> },
        { name: 'Contracts', icon: <FileText size={18} /> },
        { name: 'Policies', icon: <ShieldCheck size={18} /> },
        { name: 'Finance', icon: <FileSpreadsheet size={18} /> },
        { name: 'HR', icon: <UsersIcon size={18} /> },
        { name: 'Recent', icon: <Clock size={18} /> },
        // Hide Trash for employees typically, but keeping for UI consistency or filtered content
        ...(isAdmin ? [{ name: 'Trash', icon: <Trash2Icon size={18} /> }] : []),
    ];

    const fileTypes = ['All', 'PDF', 'DOCX', 'XLSX', 'JPG', 'PNG'];

    const filteredDocuments = documents.filter(doc => {
        // 1. Filter by User Role Permission
        // Admins see all. Employees see their own docs OR public policies.
        const hasPermission = isAdmin || doc.owner === user.name || doc.category === 'Policies';
        if (!hasPermission) return false;

        // 2. Filter by Search
        const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());

        // 3. Filter by Category
        const matchesCategory =
            selectedCategory === 'All Files' ? true :
                selectedCategory === 'Recent' ? true :
                    selectedCategory === 'Trash' ? false : // Demo logic
                        doc.category === selectedCategory;

        // 4. Filter by Type
        const matchesType = selectedFileType === 'All' || doc.type === selectedFileType;

        return matchesSearch && matchesCategory && matchesType;
    });

    const getFileIcon = (type: string, size: number = 24) => {
        switch (type) {
            case 'PDF': return <FileText className="text-red-500" size={size} />;
            case 'DOCX': return <FileText className="text-blue-500" size={size} />;
            case 'XLSX': return <FileSpreadsheet className="text-green-500" size={size} />;
            case 'JPG':
            case 'PNG': return <FileImage className="text-purple-500" size={size} />;
            default: return <File className="text-gray-500" size={size} />;
        }
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        alert('Downloading file...');
    };

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] animate-fade-in gap-6 relative">

            {/* Left Sidebar */}
            <aside className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-6">
                <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 shadow-sm">
                    <button className="w-full py-2.5 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mb-6">
                        <UploadCloud size={18} />
                        Upload New
                    </button>

                    <nav className="space-y-1">
                        {categories.map((cat) => (
                            <button
                                key={cat.name}
                                onClick={() => setSelectedCategory(cat.name)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedCategory === cat.name
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                            >
                                {cat.icon}
                                {cat.name}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-text-light dark:text-text-dark font-semibold">
                        <HardDrive size={18} />
                        <h3>Storage</h3>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden mb-2">
                        <div className="bg-accent-orange h-full rounded-full w-[45%]"></div>
                    </div>
                    <div className="flex justify-between text-xs text-text-muted-light dark:text-text-muted-dark">
                        <span>45 GB used</span>
                        <span>100 GB total</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-border-light dark:border-border-dark flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-text-light dark:text-text-dark">
                        <h2>{selectedCategory}</h2>
                        <span className="text-text-muted-light dark:text-text-muted-dark font-normal text-sm ml-2">({filteredDocuments.length})</span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">

                        {/* File Type Filter */}
                        <div className="relative hidden sm:block">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                            <select
                                value={selectedFileType}
                                onChange={(e) => setSelectedFileType(e.target.value)}
                                className="appearance-none pl-9 pr-8 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer text-text-light dark:text-text-dark"
                            >
                                {fileTypes.map(type => (
                                    <option key={type} value={type}>{type === 'All' ? 'All Types' : type}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted-light">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </div>

                        <div className="relative flex-grow sm:flex-grow-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-64 pl-9 pr-4 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div className="flex bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-card-dark shadow-sm text-primary' : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light'}`}
                            >
                                <Grid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-card-dark shadow-sm text-primary' : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light'}`}
                            >
                                <List size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-background-light/50 dark:bg-background-dark/50">
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredDocuments.map(doc => (
                                <div
                                    key={doc.id}
                                    onClick={() => setPreviewDoc(doc)}
                                    className="group bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer relative"
                                >
                                    <button className="absolute top-2 right-2 p-1 text-text-muted-light hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical size={16} />
                                    </button>
                                    <div className="h-24 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-3">
                                        {getFileIcon(doc.type)}
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-text-light dark:text-text-dark text-sm truncate mb-1" title={doc.name}>{doc.name}</h4>
                                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark flex justify-between">
                                            <span>{doc.size}</span>
                                            <span>{doc.lastAccessed}</span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-text-muted-light dark:text-text-muted-dark font-semibold">
                                    <tr>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Size</th>
                                        <th className="px-6 py-4">Owner</th>
                                        <th className="px-6 py-4">Last Modified</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                                    {filteredDocuments.map(doc => (
                                        <tr
                                            key={doc.id}
                                            onClick={() => setPreviewDoc(doc)}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group cursor-pointer"
                                        >
                                            <td className="px-6 py-3 font-medium text-text-light dark:text-text-dark flex items-center gap-3">
                                                {getFileIcon(doc.type)}
                                                {doc.name}
                                            </td>
                                            <td className="px-6 py-3 text-text-muted-light dark:text-text-muted-dark">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                                                    {doc.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-text-muted-light dark:text-text-muted-dark font-mono text-xs">{doc.size}</td>
                                            <td className="px-6 py-3 text-text-muted-light dark:text-text-muted-dark">{doc.owner}</td>
                                            <td className="px-6 py-3 text-text-muted-light dark:text-text-muted-dark">{doc.lastAccessed}</td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={handleDownload}
                                                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-text-muted-light hover:text-primary transition-colors" title="Download"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                    <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-text-muted-light hover:text-primary transition-colors" title="Share">
                                                        <Share2 size={16} />
                                                    </button>
                                                    <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-text-muted-light hover:text-primary transition-colors" title="More">
                                                        <MoreVertical size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {filteredDocuments.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-text-muted-light py-12">
                            <FolderOpen size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">No documents found.</p>
                            <p className="text-sm">You have access to your personal documents and company policies.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* File Preview Modal */}
            {previewDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-card-dark rounded-xl shadow-2xl border border-border-light dark:border-border-dark w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-4 border-b border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                                {getFileIcon(previewDoc.type)}
                                <div>
                                    <h3 className="font-bold text-lg text-text-light dark:text-text-dark">{previewDoc.name}</h3>
                                    <p className="text-xs text-text-muted-light">{previewDoc.size} • {previewDoc.lastAccessed}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    <Download size={16} /> Download
                                </button>
                                <button
                                    onClick={() => setPreviewDoc(null)}
                                    className="p-2 text-text-muted-light hover:text-text-light dark:hover:text-text-dark hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-8 overflow-auto">
                            {/* Mock Preview Content */}
                            {['JPG', 'PNG'].includes(previewDoc.type) ? (
                                <div className="relative shadow-lg">
                                    <img src={`https://picsum.photos/800/600?random=${previewDoc.id}`} alt="Preview" className="max-w-full max-h-full rounded-lg" />
                                </div>
                            ) : (
                                <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-lg w-full border border-border-light dark:border-border-dark">
                                    <div className="flex justify-center mb-6">
                                        {getFileIcon(previewDoc.type, 64)}
                                    </div>
                                    <h4 className="text-xl font-semibold text-text-light dark:text-text-dark mb-2">Preview not available</h4>
                                    <p className="text-text-muted-light mb-6">This file type cannot be previewed directly in the browser. Please download the file to view its contents.</p>
                                    <button
                                        onClick={handleDownload}
                                        className="px-6 py-2.5 border border-border-light dark:border-border-dark rounded-lg font-medium text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Download File
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper for HR Category Icon (avoiding circular dependency or large import lists)
const UsersIcon = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);

const Trash2Icon = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
);
