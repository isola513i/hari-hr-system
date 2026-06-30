import React, { useState, useEffect, useRef } from 'react';
import { Camera, MoreHorizontal, Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmployeeHeroProps } from './EmployeeDetailTypes';
import { StatusIndicator } from '../StatusIndicator';
import { useUserStatus } from '../../contexts/UserStatusContext';
import { BASE_URL, getAuthToken } from '../../lib/api';

const BANNER_PRESETS = [
    { label: 'Blue Teal',      from: '#4a90d9', to: '#50c5b7' },
    { label: 'Purple Pink',    from: '#7c3aed', to: '#ec4899' },
    { label: 'Rose Orange',    from: '#e11d48', to: '#f97316' },
    { label: 'Green Cyan',     from: '#16a34a', to: '#06b6d4' },
    { label: 'Indigo Violet',  from: '#4338ca', to: '#8b5cf6' },
    { label: 'Sky Blue',       from: '#0284c7', to: '#38bdf8' },
    { label: 'Amber Gold',     from: '#d97706', to: '#fbbf24' },
    { label: 'Pink Rose',      from: '#db2777', to: '#f472b6' },
    { label: 'Emerald Green',  from: '#059669', to: '#34d399' },
    { label: 'Slate',          from: '#334155', to: '#64748b' },
];

function parseBannerColor(raw?: string | null): { from: string; to: string } {
    if (raw && raw.includes(',')) {
        const parts = raw.split(',');
        return { from: parts[0] ?? '#4a90d9', to: parts[1] ?? '#50c5b7' };
    }
    return { from: '#4a90d9', to: '#50c5b7' };
}

export const EmployeeHero: React.FC<EmployeeHeroProps> = ({
    employee,
    avatar,
    permissions,
    onEditProfileClick,
    onAvatarChange,
    onBannerColorChange,
    onPromote,
    onTransfer,
    onTerminate,
}) => {
    const { t } = useTranslation(['employees', 'common']);
    const { getStatus, getStatusMessage } = useUserStatus();
    const { canEditBasicInfo, isAdmin } = permissions;
    const availabilityStatus = getStatus(employee.id);
    const availabilityMessage = getStatusMessage(employee.id);
    const [actionsOpen, setActionsOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [imgError, setImgError] = useState(false);
    const actionsRef = useRef<HTMLDivElement>(null);
    const paletteRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setImgError(false); }, [avatar]);

    useEffect(() => {
        if (!actionsOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
                setActionsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [actionsOpen]);

    useEffect(() => {
        if (!paletteOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
                setPaletteOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [paletteOpen]);

    const bannerColors = parseBannerColor(employee.bannerColor);
    const bannerStyle = {
        background: `linear-gradient(to right, ${bannerColors.from}, ${bannerColors.to})`,
    };

    return (
        <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
            <div className="h-32 rounded-t-xl relative group/banner" style={bannerStyle}>
                {canEditBasicInfo && (
                    <div ref={paletteRef} className="absolute top-3 right-3">
                        <button
                            onClick={() => setPaletteOpen(p => !p)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/30 hover:bg-black/50 text-white rounded-lg text-xs font-medium opacity-0 group-hover/banner:opacity-100 transition-opacity backdrop-blur-sm"
                        >
                            <Palette size={14} />
                            {t('employees:hero.bannerColor')}
                        </button>

                        {paletteOpen && (
                            <div className="absolute right-0 top-9 z-30 bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark p-3 w-52">
                                <p className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark mb-2">{t('employees:hero.chooseBannerColor')}</p>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {BANNER_PRESETS.map((preset) => {
                                        const isActive = employee.bannerColor === `${preset.from},${preset.to}`;
                                        return (
                                            <button
                                                key={preset.label}
                                                title={preset.label}
                                                onClick={() => {
                                                    onBannerColorChange(`${preset.from},${preset.to}`);
                                                    setPaletteOpen(false);
                                                }}
                                                className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${isActive ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
                                                style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="px-6 pb-5 relative z-10">
                {/* Row 1: Avatar (overlapping banner) + action buttons — both aligned to avatar bottom */}
                <div className="flex justify-between items-end -mt-12 mb-4">
                    <div className="relative group cursor-pointer">
                        {!imgError && avatar ? (
                            <img
                                src={avatar}
                                alt={employee.name}
                                onError={() => setImgError(true)}
                                className="w-24 h-24 rounded-xl object-cover border-4 border-white dark:border-card-dark shadow-md bg-white dark:bg-gray-800"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-xl border-4 border-white dark:border-card-dark shadow-md bg-primary/10 flex items-center justify-center">
                                <span className="text-2xl font-bold text-primary">
                                    {employee.name.split(' ').map(p => p.charAt(0)).join('').toUpperCase().slice(0, 2)}
                                </span>
                            </div>
                        )}
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
                        <StatusIndicator
                            status={availabilityStatus}
                            statusMessage={availabilityMessage}
                            showTooltip
                            size="lg"
                            className="absolute -bottom-1 -right-1 z-10"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {canEditBasicInfo && (
                            <button
                                onClick={onEditProfileClick}
                                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
                            >
                                {t('employees:hero.editProfile')}
                            </button>
                        )}
                        {isAdmin && (
                            <div className="relative" ref={actionsRef}>
                                <button
                                    onClick={() => setActionsOpen(!actionsOpen)}
                                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                                >
                                    {t('employees:hero.actions')} <MoreHorizontal size={15} />
                                </button>
                                {actionsOpen && (
                                    <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-card-dark rounded-lg shadow-lg border border-border-light dark:border-border-dark z-20">
                                        <button
                                            onClick={() => { setActionsOpen(false); onPromote(); }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-text-light dark:text-text-dark rounded-t-lg"
                                        >
                                            {t('employees:hero.promote')}
                                        </button>
                                        <button
                                            onClick={() => { setActionsOpen(false); onTransfer(); }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-text-light dark:text-text-dark"
                                        >
                                            {t('employees:hero.transfer')}
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setActionsOpen(false);
                                                try {
                                                    const token = getAuthToken();
                                                    const res = await fetch(`${BASE_URL}/employees/${employee.id}/report`, {
                                                        headers: { Authorization: `Bearer ${token}` },
                                                    });
                                                    if (!res.ok) throw new Error();
                                                    const blob = await res.blob();
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = `report-${employee.name?.replace(/\s+/g, '-')}.pdf`;
                                                    a.click();
                                                    URL.revokeObjectURL(url);
                                                } catch { alert(t('employees:hero.downloadReportFailed')); }
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-text-light dark:text-text-dark"
                                        >
                                            {t('employees:hero.downloadReport')}
                                        </button>
                                        <button
                                            onClick={() => { setActionsOpen(false); onTerminate(); }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 rounded-b-lg"
                                        >
                                            {t('employees:hero.terminate')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Row 2: Employee info — fully below the banner, no overlap */}
                <div>
                    <h1 className="text-2xl font-bold text-text-light dark:text-text-dark leading-tight">{employee.name}</h1>
                    <p className="text-text-muted-light dark:text-text-muted-dark font-medium mt-1">
                        {employee.role} | {employee.department}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                        {employee.employeeCode && (
                            <span className="text-xs text-text-muted-light dark:text-text-muted-dark font-mono">
                                {employee.employeeCode}
                            </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${employee.status === 'Active'
                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900'
                            : employee.status === 'Terminated'
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900'
                                : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${employee.status === 'Active' ? 'bg-green-500' : employee.status === 'Terminated' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                            {t(`common:status.${employee.status.toLowerCase()}`, { defaultValue: employee.status })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
