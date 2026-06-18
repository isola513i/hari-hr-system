import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, ExternalLink, Navigation, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import type { AdminAttendanceRecord } from '../types';
import { formatTimeTH } from '../lib/date';

interface LocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AdminAttendanceRecord | null;
}

type IframeStatus = 'loading' | 'loaded' | 'error';

// onError doesn't fire reliably when OSM tiles are blocked by network/CSP — fall back via timeout.
const LOAD_TIMEOUT_MS = 8000;

export const LocationMapModal: React.FC<LocationMapModalProps> = ({ isOpen, onClose, record }) => {
  const { t } = useTranslation('attendance');
  const [iframeStatus, setIframeStatus] = useState<IframeStatus>('loading');
  const timeoutRef = useRef<number | null>(null);

  const lat = record?.clockInLat ?? null;
  const lng = record?.clockInLng ?? null;
  const accuracy = record?.clockInAccuracy;
  const hasLocation = lat != null && lng != null;

  useEffect(() => {
    if (!isOpen || !hasLocation) return;
    setIframeStatus('loading');
    timeoutRef.current = window.setTimeout(() => {
      setIframeStatus(prev => (prev === 'loading' ? 'error' : prev));
    }, LOAD_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [isOpen, record?.id, hasLocation]);

  if (!record) return null;

  const mapUrl = hasLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng! - 0.004},${lat! - 0.003},${lng! + 0.004},${lat! + 0.003}&layer=mapnik&marker=${lat},${lng}`
    : null;

  const googleMapsUrl = hasLocation ? `https://www.google.com/maps?q=${lat},${lng}` : null;

  const handleIframeLoad = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setIframeStatus('loaded');
  };

  const handleIframeError = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setIframeStatus('error');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('locationMap.checkInLocation')} maxWidth="lg">
      <div className="p-4 space-y-4">
        {/* Employee info */}
        <div className="flex items-center gap-3 pb-3 border-b border-border-light dark:border-border-dark">
          {record.employeeAvatar ? (
            <img src={record.employeeAvatar} alt={record.employeeName} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
              {record.employeeName.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-semibold text-text-light dark:text-text-dark">{record.employeeName}</p>
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
              {record.employeeDepartment} · {t('locationMap.checkInAt', { time: formatTimeTH(record.clockIn) })}
            </p>
          </div>
        </div>

        {hasLocation ? (
          <>
            {/* Map iframe — hidden on error, replaced by fallback panel below */}
            {iframeStatus !== 'error' && (
              <div className="relative rounded-lg overflow-hidden border border-border-light dark:border-border-dark h-72 bg-gray-50 dark:bg-gray-800/50">
                {iframeStatus === 'loading' && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 text-text-muted-light dark:text-text-muted-dark z-10 pointer-events-none">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-xs">{t('locationMap.loadingMap')}</span>
                  </div>
                )}
                <iframe
                  src={mapUrl!}
                  className="w-full h-full"
                  title={t('locationMap.checkInLocation')}
                  loading="lazy"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                />
              </div>
            )}

            {iframeStatus === 'error' && (
              <div className="rounded-lg border border-dashed border-border-light dark:border-border-dark p-6 flex flex-col items-center gap-2 text-center bg-gray-50 dark:bg-gray-800/30">
                <MapPin size={28} className="text-text-muted-light dark:text-text-muted-dark opacity-40" />
                <p className="text-sm font-medium text-text-light dark:text-text-dark">{t('locationMap.mapLoadFailed')}</p>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
                  {t('locationMap.mapLoadFailedDesc')}
                </p>
              </div>
            )}

            {/* Coordinate info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-1">{t('locationMap.coordinates')}</p>
                <p className="text-sm font-mono text-text-light dark:text-text-dark">
                  {lat!.toFixed(6)}, {lng!.toFixed(6)}
                </p>
              </div>
              {accuracy != null && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-1 flex items-center gap-1">
                    <Navigation size={11} />
                    {t('locationMap.gpsAccuracy')}
                  </p>
                  <p className="text-sm font-medium text-text-light dark:text-text-dark">
                    {t('locationMap.accuracyMeters', { meters: Math.round(accuracy) })}
                  </p>
                </div>
              )}
            </div>

            {/* Open in Google Maps */}
            <a
              href={googleMapsUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
            >
              <ExternalLink size={14} />
              {t('locationMap.openInGoogleMaps')}
            </a>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted-light dark:text-text-muted-dark">
            <MapPin size={36} className="mb-3 opacity-30" />
            <p className="text-sm">{t('locationMap.noLocation')}</p>
            <p className="text-xs mt-1">{t('locationMap.noLocationDesc')}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
