import React from 'react';
import { MapPin, Mail, Hash, Briefcase, Camera, MoreHorizontal } from 'lucide-react';
import { EmployeeHeroProps } from './EmployeeDetailTypes';

export const EmployeeHero: React.FC<EmployeeHeroProps> = ({
    employee,
    avatar,
    permissions,
    onEditProfileClick,
    onAvatarChange,
    showToast,
}) => {
    const { canEditBasicInfo, isAdmin } = permissions;

    return (
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
            <div className="h-32 bg-gradient-to-r from-primary/80 to-accent-teal/80 rounded-t-xl"></div>
            <div className="px-6 pb-6 pt-2">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end -mt-14 mb-4">
                    <div className="flex items-end gap-4">
                        <div className="relative group cursor-pointer">
                            <img
                                src={avatar}
                                alt={employee.name}
                                className="w-24 h-24 rounded-xl object-cover border-4 border-white dark:border-card-dark shadow-md bg-white dark:bg-gray-800"
                            />
                            {canEditBasicInfo && (
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
                                    <label htmlFor="avatar-upload" className="cursor-pointer text-white flex flex-col items-center">
                                        <Camera size={24} />
                                        <span className="text-xs mt-1">Change</span>
                                    </label>
                                    <input
                                        id="avatar-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={onAvatarChange}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="mb-1 flex flex-col">
                            <h1 className="text-2xl font-bold text-text-light dark:text-text-dark leading-[1.2]">{employee.name}</h1>
                            <p className="text-text-muted-light dark:text-text-muted-dark font-medium mt-1 leading-normal">{employee.role}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                        {canEditBasicInfo && (
                            <button
                                onClick={onEditProfileClick}
                                className="px-4 py-2 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Edit Profile
                            </button>
                        )}
                        {isAdmin && (
                            <div className="relative group">
                                <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
                                    Actions <MoreHorizontal size={16} />
                                </button>
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-card-dark rounded-lg shadow-lg border border-border-light dark:border-border-dark hidden group-hover:block z-20">
                                    <button
                                        onClick={() => showToast('Promotion workflow coming soon!', 'info')}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-text-light dark:text-text-dark"
                                    >
                                        Promote
                                    </button>
                                    <button
                                        onClick={() => showToast('Transfer workflow coming soon!', 'info')}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-text-light dark:text-text-dark"
                                    >
                                        Transfer
                                    </button>
                                    <button
                                        onClick={() => showToast('Termination workflow coming soon!', 'warning')}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
                                    >
                                        Terminate
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-muted-light dark:text-text-muted-dark border-t border-border-light dark:border-border-dark pt-4">
                    <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-primary" />
                        {employee.location}
                    </div>
                    <div className="flex items-center gap-2">
                        <Mail size={16} className="text-primary" />
                        {employee.email}
                    </div>
                    {employee.slack && (
                        <div className="flex items-center gap-2">
                            <Hash size={16} className="text-primary" />
                            {employee.slack}
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Briefcase size={16} className="text-primary" />
                        {employee.department}
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${employee.status === 'Active'
                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900'
                            : employee.status === 'Terminated'
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900'
                                : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${employee.status === 'Active' ? 'bg-green-500' : employee.status === 'Terminated' ? 'bg-red-500' : 'bg-yellow-500'
                                }`}></span>
                            {employee.status}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
