import React from 'react';
import { MapPin, ExternalLink, Navigation } from 'lucide-react';
import { Modal } from './Modal';
import type { AdminAttendanceRecord } from '../types';
import { formatTimeTH } from '../lib/date';

interface LocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AdminAttendanceRecord | null;
}

export const LocationMapModal: React.FC<LocationMapModalProps> = ({ isOpen, onClose, record }) => {
  if (!record) return null;

  const lat = record.clockInLat;
  const lng = record.clockInLng;
  const accuracy = record.clockInAccuracy;
  const hasLocation = lat != null && lng != null;

  const mapUrl = hasLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng! - 0.004},${lat! - 0.003},${lng! + 0.004},${lat! + 0.003}&layer=mapnik&marker=${lat},${lng}`
    : null;

  const googleMapsUrl = hasLocation
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ตำแหน่งเช็คอิน" maxWidth="lg">
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
              {record.employeeDepartment} · เช็คอิน {formatTimeTH(record.clockIn)}
            </p>
          </div>
        </div>

        {hasLocation ? (
          <>
            {/* Map iframe */}
            <div className="rounded-lg overflow-hidden border border-border-light dark:border-border-dark h-72">
              <iframe
                src={mapUrl!}
                className="w-full h-full"
                title="ตำแหน่งเช็คอิน"
                loading="lazy"
              />
            </div>

            {/* Coordinate info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-1">พิกัด</p>
                <p className="text-sm font-mono text-text-light dark:text-text-dark">
                  {lat!.toFixed(6)}, {lng!.toFixed(6)}
                </p>
              </div>
              {accuracy != null && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-1 flex items-center gap-1">
                    <Navigation size={11} />
                    ความแม่นยำ GPS
                  </p>
                  <p className="text-sm font-medium text-text-light dark:text-text-dark">
                    ±{Math.round(accuracy)} เมตร
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
              เปิดใน Google Maps
            </a>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted-light dark:text-text-muted-dark">
            <MapPin size={36} className="mb-3 opacity-30" />
            <p className="text-sm">ไม่มีข้อมูลตำแหน่ง</p>
            <p className="text-xs mt-1">พนักงานเช็คอินโดยไม่ได้เปิด GPS</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
