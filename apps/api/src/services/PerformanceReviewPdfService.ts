import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { PerformanceReview } from './PerformanceService';

const THAI_FONT_REGULAR = path.join(__dirname, '../fonts/NotoSansThai-Regular.ttf');
const THAI_FONT_BOLD = path.join(__dirname, '../fonts/NotoSansThai-Bold.ttf');
const HAS_THAI_FONT = fs.existsSync(THAI_FONT_REGULAR);
const HAS_THAI_BOLD = fs.existsSync(THAI_FONT_BOLD);

export interface PerformanceReviewPdfOptions {
  companyName?: string;
  employeeDepartment?: string;
  managerName?: string;
  hrName?: string;
}

const STATUS_LABEL: Record<PerformanceReview['status'], string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  manager_reviewed: 'Manager Reviewed',
  completed: 'Completed',
  rejected: 'Rejected',
};

export function generatePerformanceReviewPdf(
  review: PerformanceReview,
  stream: NodeJS.WritableStream,
  options: PerformanceReviewPdfOptions = {}
): void {
  const companyName = options.companyName || 'HARI HR System';
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  if (HAS_THAI_FONT) doc.registerFont('MainFont', THAI_FONT_REGULAR);
  if (HAS_THAI_BOLD) doc.registerFont('MainFontBold', THAI_FONT_BOLD);

  const fontName = HAS_THAI_FONT ? 'MainFont' : 'Helvetica';
  const fontBold = HAS_THAI_BOLD ? 'MainFontBold' : (HAS_THAI_FONT ? 'MainFont' : 'Helvetica-Bold');

  doc.pipe(stream);

  // Header
  doc.font(fontBold).fontSize(20).text(companyName, { align: 'center' });
  doc.font(fontName).fontSize(12).text('Performance Review / รายงานการประเมินผลงาน', { align: 'center' });
  doc.moveDown();

  // Status + period banner
  doc.font(fontBold).fontSize(11);
  const periodLine = review.reviewPeriod
    ? `Review Period: ${review.reviewPeriod}`
    : `Review Date: ${review.date}`;
  doc.text(periodLine);
  doc.font(fontName).fontSize(10).fillColor('gray').text(`Status: ${STATUS_LABEL[review.status]}`);
  doc.fillColor('black');
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);

  // Participants
  doc.font(fontBold).fontSize(12).text('Participants / ผู้เกี่ยวข้อง', { underline: true });
  doc.font(fontName).fontSize(10);
  doc.text(`Employee: ${review.employeeName ?? '—'}`);
  if (options.employeeDepartment) doc.text(`Department: ${options.employeeDepartment}`);
  doc.text(`Reviewer: ${review.reviewer || '—'}`);
  if (options.managerName) doc.text(`Manager: ${options.managerName}`);
  if (options.hrName) doc.text(`HR Approver: ${options.hrName}`);
  doc.moveDown();

  // Overall rating
  doc.font(fontBold).fontSize(12).text('Overall Rating / คะแนนประเมิน', { underline: true });
  doc.font(fontName).fontSize(10);
  if (review.rating != null) {
    const stars = '★'.repeat(review.rating) + '☆'.repeat(Math.max(0, 5 - review.rating));
    doc.text(`${stars}   ${review.rating}/5`);
  } else {
    doc.text('Not yet rated');
  }
  doc.moveDown();

  // Self-review
  if (review.selfReview) {
    doc.font(fontBold).fontSize(12).text('Self-Review / การประเมินตนเอง', { underline: true });
    doc.font(fontName).fontSize(10).text(review.selfReview, { align: 'left' });
    doc.moveDown();
  }

  // Manager review
  if (review.managerComment || review.managerReviewedAt) {
    doc.font(fontBold).fontSize(12).text('Manager Review / ความเห็นหัวหน้างาน', { underline: true });
    doc.font(fontName).fontSize(10);
    if (review.managerComment) doc.text(review.managerComment);
    if (review.managerReviewedAt) {
      doc.fillColor('gray').fontSize(9).text(`Reviewed on ${new Date(review.managerReviewedAt).toISOString().split('T')[0]}`);
      doc.fillColor('black').fontSize(10);
    }
    doc.moveDown();
  }

  // HR approval
  if (review.hrComment || review.hrReviewedAt) {
    doc.font(fontBold).fontSize(12).text('HR Approval / ความเห็น HR', { underline: true });
    doc.font(fontName).fontSize(10);
    if (review.hrComment) doc.text(review.hrComment);
    if (review.hrReviewedAt) {
      doc.fillColor('gray').fontSize(9).text(`Approved on ${new Date(review.hrReviewedAt).toISOString().split('T')[0]}`);
      doc.fillColor('black').fontSize(10);
    }
    doc.moveDown();
  }

  // General notes
  if (review.notes && review.notes.trim()) {
    doc.font(fontBold).fontSize(12).text('Notes / หมายเหตุ', { underline: true });
    doc.font(fontName).fontSize(10).text(review.notes, { align: 'left' });
    doc.moveDown();
  }

  // Footer
  doc.moveDown(2);
  doc.fontSize(8).fillColor('gray');
  doc.text('This is a system-generated performance review document. / เอกสารนี้ออกโดยระบบอัตโนมัติ', { align: 'center' });
  doc.text(`Generated on ${new Date().toISOString().split('T')[0]}`, { align: 'center' });

  doc.end();
}
