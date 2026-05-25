import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, MapPin, HeartPulse, Home, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmployeeSidebarProps } from './EmployeeDetailTypes';
import { EmployeeAddress } from '../../types';
import { Avatar } from '../Avatar';
import { StatusIndicator } from '../StatusIndicator';
import { useUserStatus } from '../../contexts/UserStatusContext';

/** Show last 3 characters of the National ID, mask the rest */
function maskNationalId(id: string): string {
    return id.length > 3 ? '*'.repeat(id.length - 3) + id.slice(-3) : id;
}

/** Show last 4 characters of the bank account number, mask the rest */
function maskBankAccount(acct: string): string {
    return acct.length > 4 ? '*'.repeat(acct.length - 4) + acct.slice(-4) : acct;
}

function formatAddress(address: EmployeeAddress): string {
    const parts = [
        address.addressLine1,
        address.subDistrict,
        address.district,
        address.province,
        address.postalCode,
    ].filter(Boolean);
    return parts.join(', ');
}

export const EmployeeSidebar: React.FC<EmployeeSidebarProps> = ({
    employee,
    permissions,
    manager,
    directReports,
}) => {
    const { t } = useTranslation(['employees', 'common']);
    const navigate = useNavigate();
    const { getStatus, getStatusMessage } = useUserStatus();
    const { canViewSensitiveTabs, canEditSensitiveInfo } = permissions;

    // Toggle visibility of masked PII fields (shoulder-surf protection)
    const [showNationalId, setShowNationalId]   = useState(false);
    const [showBankAccount, setShowBankAccount] = useState(false);

    return (
        <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4">{t('employees:sidebar.contactInfo')}</h2>
                <div className="space-y-4 text-sm">
                    <div>
                        <p className="text-text-muted-light dark:text-text-muted-dark text-xs mb-1">{t('employees:sidebar.phone')}</p>
                        <div className="flex items-center gap-2 text-text-light dark:text-text-dark font-medium">
                            <Phone size={16} />
                            {employee.phone || '-'}
                        </div>
                    </div>
                    <div>
                        <p className="text-text-muted-light dark:text-text-muted-dark text-xs mb-1">{t('employees:sidebar.workEmail')}</p>
                        <div className="flex items-center gap-2 text-text-light dark:text-text-dark font-medium">
                            <Mail size={16} />
                            {employee.email}
                        </div>
                    </div>
                    <div>
                        <p className="text-text-muted-light dark:text-text-muted-dark text-xs mb-1">{t('employees:sidebar.officeAddress')}</p>
                        <div className="flex items-center gap-2 text-text-light dark:text-text-dark font-medium">
                            <MapPin size={16} />
                            {employee.location || '-'}
                        </div>
                    </div>
                    {canViewSensitiveTabs && employee.address && (
                        <div>
                            <p className="text-text-muted-light dark:text-text-muted-dark text-xs mb-1">{t('employees:sidebar.currentAddress')}</p>
                            <div className="flex items-start gap-2 text-text-light dark:text-text-dark font-medium">
                                <Home size={16} className="mt-0.5 shrink-0" />
                                <span>{formatAddress(employee.address)}</span>
                            </div>
                        </div>
                    )}
                    {employee.emergencyContact && canViewSensitiveTabs && (
                        <div>
                            <p className="text-text-muted-light dark:text-text-muted-dark text-xs mb-1">{t('employees:sidebar.emergencyContact')}</p>
                            <div className="flex items-center gap-2 text-text-light dark:text-text-dark font-medium">
                                <HeartPulse size={16} className="text-accent-red" />
                                {employee.emergencyContact}
                            </div>
                        </div>
                    )}

                    {/* Sensitive PII — only visible to HR_ADMIN (canEditSensitiveInfo) */}
                    {canEditSensitiveInfo && (employee.nationalId || employee.bankAccountNumber) && (
                        <div className="border-t border-border-light dark:border-border-dark pt-4 mt-2 space-y-3">
                            <p className="text-xs font-semibold uppercase text-text-muted-light dark:text-text-muted-dark tracking-wider flex items-center gap-1">
                                <ShieldCheck size={12} /> Sensitive Information
                            </p>

                            {employee.nationalId && (
                                <div>
                                    <p className="text-text-muted-light dark:text-text-muted-dark text-xs mb-0.5">National ID</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono text-text-light dark:text-text-dark">
                                            {showNationalId ? employee.nationalId : maskNationalId(employee.nationalId)}
                                        </span>
                                        <button
                                            onClick={() => setShowNationalId((v) => !v)}
                                            className="text-text-muted-light dark:text-text-muted-dark hover:text-primary transition-colors"
                                            title={showNationalId ? 'Hide National ID' : 'Show National ID'}
                                        >
                                            {showNationalId ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {employee.bankAccountNumber && (
                                <div>
                                    <p className="text-text-muted-light dark:text-text-muted-dark text-xs mb-0.5">Bank Account</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono text-text-light dark:text-text-dark">
                                            {showBankAccount ? employee.bankAccountNumber : maskBankAccount(employee.bankAccountNumber)}
                                        </span>
                                        <button
                                            onClick={() => setShowBankAccount((v) => !v)}
                                            className="text-text-muted-light dark:text-text-muted-dark hover:text-primary transition-colors"
                                            title={showBankAccount ? 'Hide bank account' : 'Show bank account'}
                                        >
                                            {showBankAccount ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Team Hierarchy */}
            {(manager || directReports.length > 0) && (
                <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4">{t('employees:sidebar.team')}</h2>
                    <div className="space-y-4">
                        {manager && (
                            <div>
                                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-2 uppercase font-semibold">{t('employees:sidebar.reportsTo')}</p>
                                <div
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark/50 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/employees/${manager.id}`)}
                                >
                                    <div className="relative">
                                        <Avatar
                                            src={manager.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(manager.name)}&background=random`}
                                            name={manager.name}
                                            size="lg"
                                        />
                                        <StatusIndicator
                                            status={getStatus(manager.id)}
                                            statusMessage={getStatusMessage(manager.id)}
                                            showTooltip
                                            size="sm"
                                            className="absolute -bottom-0.5 -right-0.5"
                                        />
                                    </div>
                                    <div>
                                        <p className="font-medium text-text-light dark:text-text-dark text-sm">{manager.name}</p>
                                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{manager.role}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {directReports.length > 0 && (
                            <div>
                                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-2 uppercase font-semibold">{t('employees:sidebar.directReports')}</p>
                                <div className="flex gap-1.5 py-1">
                                    {directReports.slice(0, 3).map((report) => (
                                        <div
                                            key={report.id}
                                            className="relative cursor-pointer transition-transform hover:scale-110"
                                            onClick={() => navigate(`/employees/${report.id}`)}
                                            title={report.name}
                                        >
                                            <Avatar
                                                src={report.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.name)}&background=random`}
                                                name={report.name}
                                                size="md"
                                            />
                                            <StatusIndicator
                                                status={getStatus(report.id)}
                                                size="sm"
                                                className="absolute -bottom-0.5 -right-0.5"
                                            />
                                        </div>
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
