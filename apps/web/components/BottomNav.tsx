import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Clock, Calendar, Bell, LogIn, LogOut } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  useAttendanceToday,
  useClockIn,
  useClockOut,
  useAttendanceGPSConfig,
} from '../hooks/queries';
import { queryClient } from '../lib/queryClient';
import { queryKeys } from '../lib/queryKeys';
import { LocationPermissionModal } from './LocationPermissionModal';

export const BottomNav: React.FC = () => {
  const { t } = useTranslation('common');
  const { unreadCount } = useNotifications();
  const { isAdminView } = useAuth();
  const { showToast } = useToast();

  const { data: attendanceStatus } = useAttendanceToday(!isAdminView);
  const { data: gpsConfig } = useAttendanceGPSConfig(!isAdminView);
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();
  const [isClocking, setIsClocking] = useState(false);
  const [locationModal, setLocationModal] = useState<{ show: boolean; mode: 'request' | 'denied' }>({ show: false, mode: 'request' });

  const isClockedIn = !isAdminView && !!attendanceStatus?.clockIn && !attendanceStatus?.clockOut;
  const isClockedOut = !isAdminView && !!attendanceStatus?.clockOut;

  type ClockState = 'idle' | 'in' | 'out';
  const clockState: ClockState = isClockedOut ? 'out' : isClockedIn ? 'in' : 'idle';

  const FAB_CONFIG: Record<ClockState, { bg: string; labelColor: string; label: string }> = {
    idle: { bg: 'bg-primary hover:bg-primary/90 shadow-primary/30',                         labelColor: 'text-primary',                    label: t('nav.clockIn',     { defaultValue: 'ลงเวลาเข้า' }) },
    in:   { bg: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200 dark:shadow-amber-900/50', labelColor: 'text-amber-500',                  label: t('nav.clockOut',    { defaultValue: 'ลงเวลาออก' }) },
    out:  { bg: 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed',                           labelColor: 'text-gray-400 dark:text-gray-500', label: t('nav.clockedOut',  { defaultValue: 'เสร็จแล้ว' }) },
  };

  const doClockIn = async (position?: GeolocationPosition) => {
    try {
      await clockInMutation.mutateAsync({
        latitude: position?.coords.latitude,
        longitude: position?.coords.longitude,
        accuracy: position?.coords.accuracy,
      });
      showToast(t('dashboard:employee.checkedIn', { defaultValue: 'ลงเวลาเข้างานสำเร็จ' }), 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      if (message.includes('Already clocked in') || message.includes('already checked in')) {
        showToast(t('dashboard:employee.alreadyCheckedIn', { defaultValue: 'ลงเวลาเข้าแล้ว' }), 'info');
        queryClient.invalidateQueries({ queryKey: queryKeys.attendance.today() });
      } else {
        showToast(message, 'error');
      }
    } finally {
      setIsClocking(false);
    }
  };

  const executeGetPosition = () => {
    setIsClocking(true);
    navigator.geolocation.getCurrentPosition(
      doClockIn,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setIsClocking(false);
          setLocationModal({ show: true, mode: 'denied' });
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          doClockIn(undefined);
        } else {
          navigator.geolocation.getCurrentPosition(
            doClockIn,
            () => {
              showToast('Could not get your location. Please try again.', 'error');
              setIsClocking(false);
            },
            { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false }
          );
        }
      },
      { timeout: 8000, maximumAge: 0, enableHighAccuracy: false }
    );
  };

  const handleClockAction = async () => {
    if (isClocking || isClockedOut) return;

    if (isClockedIn) {
      setIsClocking(true);
      try {
        await clockOutMutation.mutateAsync();
        showToast(t('dashboard:employee.checkedOut', { defaultValue: 'ลงเวลาออกสำเร็จ' }), 'success');
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'An error occurred', 'error');
      } finally {
        setIsClocking(false);
      }
      return;
    }

    const gpsRequired = gpsConfig?.gpsRequired === 'true';

    if (!gpsRequired) {
      setIsClocking(true);
      await doClockIn(undefined);
      return;
    }

    if (!navigator.geolocation) {
      showToast('GPS is not supported on this device', 'error');
      return;
    }

    if ('permissions' in navigator) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        if (status.state === 'denied') {
          setLocationModal({ show: true, mode: 'denied' });
          return;
        }
        if (status.state === 'prompt') {
          setLocationModal({ show: true, mode: 'request' });
          return;
        }
      } catch {
        // permissions API unavailable — fall through to native prompt
      }
    }

    executeGetPosition();
  };

  const leftItems = [
    { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/' },
    { icon: Clock, label: t('nav.attendance'), path: isAdminView ? '/admin-attendance' : '/attendance' },
  ];
  const rightItems = [
    {
      icon: Calendar,
      label: isAdminView ? t('nav.leaveRequests') : t('nav.timeOff'),
      path: isAdminView ? '/leave-requests' : '/time-off',
    },
    { icon: Bell, label: t('header.notifications'), path: '/notifications', badge: unreadCount },
  ];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 py-1 rounded-lg transition-colors ${
      isActive ? 'text-primary' : 'text-text-muted-light dark:text-text-muted-dark'
    }`;

  return (
    <>
    {locationModal.show && (
      <LocationPermissionModal
        mode={locationModal.mode}
        onAllow={() => {
          setLocationModal({ show: false, mode: 'request' });
          executeGetPosition();
        }}
        onDismiss={() => setLocationModal({ show: false, mode: 'request' })}
      />
    )}
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card-light dark:bg-card-dark border-t border-border-light dark:border-border-dark md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {leftItems.map((item) => (
          <NavLink key={item.path} to={item.path} className={navLinkClass}>
            <item.icon size={22} />
            <span className="text-[10px] font-medium mt-0.5 leading-tight">{item.label}</span>
          </NavLink>
        ))}

        {!isAdminView ? (
          <div className="relative flex flex-col items-center justify-end w-14 pb-1">
            <button
              onClick={handleClockAction}
              disabled={clockState === 'out' || isClocking}
              className={`absolute -top-8 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${FAB_CONFIG[clockState].bg} ${isClocking ? 'opacity-70' : ''}`}
            >
              {clockState === 'in'
                ? <LogOut size={22} className="text-white" />
                : <LogIn size={22} className="text-white" />}
            </button>
            <span className={`text-[10px] font-medium leading-tight mt-0.5 ${FAB_CONFIG[clockState].labelColor}`}>
              {FAB_CONFIG[clockState].label}
            </span>
          </div>
        ) : (
          <div className="w-14" />
        )}

        {rightItems.map((item) => (
          <NavLink key={item.path} to={item.path} className={navLinkClass}>
            <item.icon size={22} />
            <span className="text-[10px] font-medium mt-0.5 leading-tight">{item.label}</span>
            {'badge' in item && item.badge != null && item.badge > 0 && (
              <span className="absolute top-0.5 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-accent-red rounded-full">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
    </>
  );
};
