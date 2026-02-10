import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, MapPin, HeartPulse } from 'lucide-react';
import { EmployeeSidebarProps } from './EmployeeDetailTypes';

export const EmployeeSidebar: React.FC<EmployeeSidebarProps> = ({
    employee,
    permissions,
    manager,
    directReports,
}) => {
    const navigate = useNavigate();
    const { canViewSensitiveTabs } = permissions;

    return (
        <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4">Contact Information</h2>
                <div className="space-y-4 text-sm">
                    {employee.phone && (
                        <div>
                            <p className="text-text-muted-light dark:text-text-muted-dark text-xs mb-1">Phone</p>
                            <div className="flex items-center gap-2 text-text-light dark:text-text-dark font-medium">
                                <Phone size={16} />
                                {employee.phone}
                            </div>
                        </div>
                    )}
                    <div>
                        <p className="text-text-muted-light dark:text-text-muted-dark text-xs mb-1">Work Email</p>
                        <div className="flex items-center gap-2 text-text-light dark:text-text-dark font-medium">
                            <Mail size={16} />
                            {employee.email}
                        </div>
                    </div>
                    {employee.emergencyContact && canViewSensitiveTabs && (
                        <div>
                            <p className="text-text-muted-light dark:text-text-muted-dark text-xs mb-1">Emergency Contact</p>
                            <div className="flex items-center gap-2 text-text-light dark:text-text-dark font-medium">
                                <HeartPulse size={16} className="text-accent-red" />
                                {employee.emergencyContact}
                            </div>
                        </div>
                    )}
                    <div>
                        <p className="text-text-muted-light dark:text-text-muted-dark text-xs mb-1">Office Address</p>
                        <div className="flex items-center gap-2 text-text-light dark:text-text-dark font-medium">
                            <MapPin size={16} />
                            {employee.location} - Floor 4
                        </div>
                    </div>
                </div>
            </div>

            {/* Team Hierarchy */}
            {(manager || directReports.length > 0) && (
                <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4">Team</h2>
                    <div className="space-y-4">
                        {manager && (
                            <div>
                                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-2 uppercase font-semibold">Reports To</p>
                                <div
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark/50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/employees/${manager.id}`)}
                                >
                                    <img
                                        src={manager.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(manager.name)}&background=random`}
                                        alt={manager.name}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                    <div>
                                        <p className="font-medium text-text-light dark:text-text-dark text-sm">{manager.name}</p>
                                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{manager.role}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {directReports.length > 0 && (
                            <div>
                                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-2 uppercase font-semibold">Direct Reports</p>
                                <div className="flex -space-x-2 overflow-hidden py-1">
                                    {directReports.slice(0, 3).map((report) => (
                                        <img
                                            key={report.id}
                                            className="inline-block h-8 w-8 rounded-full ring-2 ring-card-light dark:ring-card-dark cursor-pointer hover:z-10 transition-transform hover:scale-110"
                                            src={report.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.name)}&background=random`}
                                            alt={report.name}
                                            title={report.name}
                                            onClick={() => navigate(`/employees/${report.id}`)}
                                        />
                                    ))}
                                    {directReports.length > 3 && (
                                        <div className="h-8 w-8 rounded-full ring-2 ring-card-light dark:ring-card-dark bg-background-light dark:bg-background-dark flex items-center justify-center text-xs text-text-muted-light font-medium">
                                            +{directReports.length - 3}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
