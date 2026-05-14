import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

const THAI_FONT_REGULAR = path.join(__dirname, '../fonts/NotoSansThai-Regular.ttf');
const THAI_FONT_BOLD = path.join(__dirname, '../fonts/NotoSansThai-Bold.ttf');
const HAS_THAI_FONT = fs.existsSync(THAI_FONT_REGULAR);
const HAS_THAI_BOLD = fs.existsSync(THAI_FONT_BOLD);

export interface EmployeeReportData {
  employee: {
    name: string;
    email: string;
    role: string;
    department: string;
    joinDate?: string;
    employeeCode?: string;
    phone?: string;
    location?: string;
    status?: string;
  };
  leaveSummary: {
    totalApproved: number;
    totalPending: number;
    byType: Array<{ type: string; count: number }>;
  };
  attendanceSummary: {
    present: number;
    absent: number;
    late: number;
    total: number;
  };
  performanceReviews: Array<{
    date: string;
    reviewer: string;
    rating?: number | null;
    notes?: string;
  }>;
  trainingRecords: Array<{
    title: string;
    status: string;
    completionDate?: string | null;
    score?: number | null;
  }>;
  generatedAt?: string;
  companyName?: string;
}

export function generateEmployeeReportPdf(data: EmployeeReportData, stream: NodeJS.WritableStream): void {
  const companyName = data.companyName || 'HARI HR System';
  const generatedAt = data.generatedAt || new Date().toISOString().split('T')[0];

  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  if (HAS_THAI_FONT) doc.registerFont('MainFont', THAI_FONT_REGULAR);
  if (HAS_THAI_BOLD) doc.registerFont('MainFontBold', THAI_FONT_BOLD);

  const font = HAS_THAI_FONT ? 'MainFont' : 'Helvetica';
  const bold = HAS_THAI_BOLD ? 'MainFontBold' : (HAS_THAI_FONT ? 'MainFont' : 'Helvetica-Bold');

  doc.pipe(stream);

  // Header band
  doc.rect(0, 0, 595.28, 70).fill('#1a1a2e');
  doc.fillColor('#ffffff').font(bold).fontSize(18)
    .text(companyName, 50, 15, { width: 495.28, align: 'left' });
  doc.font(font).fontSize(10).fillColor('#aaaacc')
    .text('Employee Report', 50, 40, { width: 495.28 });
  doc.fillColor('#aaaacc').fontSize(9)
    .text(`Generated: ${generatedAt}`, 50, 55, { width: 495.28, align: 'right' });

  doc.moveDown(3);

  // Section helper
  const section = (title: string) => {
    doc.moveDown(0.5);
    doc.font(bold).fontSize(13).fillColor('#1a1a2e').text(title);
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).lineWidth(1).stroke('#c9a84c');
    doc.moveDown(0.5);
    doc.font(font).fontSize(10).fillColor('#333333');
  };

  const row = (label: string, value: string) => {
    const y = doc.y;
    doc.font(bold).fillColor('#555555').text(label, 50, y, { width: 160, continued: false });
    doc.font(font).fillColor('#222222').text(value, 220, y, { width: 325 });
  };

  // Employee Profile
  section('Employee Profile');
  row('Name', data.employee.name);
  row('Email', data.employee.email);
  row('Role', data.employee.role || '—');
  row('Department', data.employee.department || '—');
  if (data.employee.employeeCode) row('Employee Code', data.employee.employeeCode);
  if (data.employee.joinDate) row('Join Date', data.employee.joinDate);
  if (data.employee.location) row('Location', data.employee.location);
  if (data.employee.phone) row('Phone', data.employee.phone);
  row('Status', data.employee.status || 'Active');

  // Leave Summary
  section('Leave Summary');
  row('Approved Leaves', String(data.leaveSummary.totalApproved));
  row('Pending Leaves', String(data.leaveSummary.totalPending));
  if (data.leaveSummary.byType.length > 0) {
    row('By Type', data.leaveSummary.byType.map(t => `${t.type}: ${t.count}`).join(', '));
  }

  // Attendance Summary
  section('Attendance Summary (Last 90 days)');
  row('Present', String(data.attendanceSummary.present));
  row('Absent', String(data.attendanceSummary.absent));
  row('Late', String(data.attendanceSummary.late));
  row('Total Records', String(data.attendanceSummary.total));

  // Performance Reviews
  section('Performance Reviews');
  if (data.performanceReviews.length === 0) {
    doc.font(font).fontSize(10).fillColor('#888888').text('No performance reviews found.', 50);
  } else {
    for (const rev of data.performanceReviews) {
      row('Date', rev.date);
      row('Reviewer', rev.reviewer);
      if (rev.rating != null) row('Rating', `${rev.rating}/5`);
      if (rev.notes) row('Notes', rev.notes.slice(0, 120) + (rev.notes.length > 120 ? '…' : ''));
      doc.moveDown(0.3);
    }
  }

  // Training History
  section('Training History');
  if (data.trainingRecords.length === 0) {
    doc.font(font).fontSize(10).fillColor('#888888').text('No training records found.', 50);
  } else {
    for (const tr of data.trainingRecords) {
      const details = [tr.status, tr.completionDate ? `Completed: ${tr.completionDate}` : null, tr.score != null ? `Score: ${tr.score}%` : null]
        .filter(Boolean).join(' · ');
      row(tr.title, details);
    }
  }

  // Footer
  const pageCount = (doc as any)._pageBuffers?.length || 1;
  doc.fontSize(8).fillColor('#aaaaaa')
    .text(`${companyName} — Confidential — Page 1 of ${pageCount}`, 50, 780, { width: 495, align: 'center' });

  doc.end();
}
