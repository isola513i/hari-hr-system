import React from 'react';
import { FileText, FileSpreadsheet, FileImage, File } from 'lucide-react';

export const displaySize = (size: string | undefined) => {
  if (!size || /^0(\.0+)?\s*(B|KB|MB|GB)$/i.test(size)) return '-';
  return size;
};

export const getFileIcon = (type: string, size: number = 24) => {
  switch (type) {
    case 'PDF':
      return <FileText className="text-red-500" size={size} />;
    case 'DOCX':
      return <FileText className="text-blue-500" size={size} />;
    case 'XLSX':
      return <FileSpreadsheet className="text-green-500" size={size} />;
    case 'JPG':
    case 'PNG':
      return <FileImage className="text-purple-500" size={size} />;
    default:
      return <File className="text-gray-500" size={size} />;
  }
};

export const UsersIcon = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const Trash2Icon = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);
