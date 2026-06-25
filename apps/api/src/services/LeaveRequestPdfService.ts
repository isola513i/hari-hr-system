import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { LeaveRequest } from '../models/LeaveRequest';

const THAI_FONT_REGULAR = path.join(__dirname, '../fonts/NotoSansThai-Regular.ttf');
const THAI_FONT_BOLD = path.join(__dirname, '../fonts/NotoSansThai-Bold.ttf');
const HAS_THAI_FONT = fs.existsSync(THAI_FONT_REGULAR);
const HAS_THAI_BOLD = fs.existsSync(THAI_FONT_BOLD);

export interface LeaveRequestPdfOptions {
  companyName?: string;
  /** Human-readable description of the applied filters, shown under the title. */
  filterSummary?: string;
}

// Column layout (x positions + widths) for an A4 page with 40pt margins.
const COLS = [
  { key: 'employee', label: 'Employee', x: 40, w: 110 },
  { key: 'type', label: 'Type', x: 150, w: 70 },
  { key: 'dates', label: 'Dates', x: 220, w: 130 },
  { key: 'days', label: 'Days', x: 350, w: 45 },
  { key: 'status', label: 'Status', x: 395, w: 80 },
  { key: 'reason', label: 'Reason', x: 475, w: 80 },
];

/**
 * Render a list of leave requests as a tabular PDF, streamed to `stream`.
 * Mirrors PayslipPdfService's font handling so Thai names/reasons render.
 */
export function generateLeaveRequestsPdf(
  requests: LeaveRequest[],
  stream: NodeJS.WritableStream,
  options: LeaveRequestPdfOptions = {}
): void {
  const companyName = options.companyName || 'HARI HR System';
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  if (HAS_THAI_FONT) doc.registerFont('MainFont', THAI_FONT_REGULAR);
  if (HAS_THAI_BOLD) doc.registerFont('MainFontBold', THAI_FONT_BOLD);
  const fontName = HAS_THAI_FONT ? 'MainFont' : 'Helvetica';
  const fontBold = HAS_THAI_BOLD ? 'MainFontBold' : HAS_THAI_FONT ? 'MainFont' : 'Helvetica-Bold';

  doc.pipe(stream);

  // Header
  doc.font(fontBold).fontSize(18).text(companyName, { align: 'center' });
  doc.font(fontName).fontSize(12).text('Leave Requests / คำขอลา', { align: 'center' });
  if (options.filterSummary) {
    doc.fontSize(9).fillColor('gray').text(options.filterSummary, { align: 'center' }).fillColor('black');
  }
  doc.fontSize(8).fillColor('gray')
    .text(`Generated on ${new Date().toISOString().split('T')[0]} • ${requests.length} record(s)`, { align: 'center' })
    .fillColor('black');
  doc.moveDown(1);

  const drawHeaderRow = () => {
    const y = doc.y;
    doc.font(fontBold).fontSize(9);
    for (const c of COLS) doc.text(c.label, c.x, y, { width: c.w, lineBreak: false });
    doc.moveDown(0.3);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.3);
    doc.font(fontName);
  };

  drawHeaderRow();

  const fmtDates = (r: LeaveRequest): string => {
    if (r.isHalfDay) return `${r.startDate} (${r.halfDayPeriod === 'morning' ? 'AM' : 'PM'})`;
    return r.startDate === r.endDate ? r.startDate : `${r.startDate} → ${r.endDate}`;
  };

  doc.fontSize(8.5);
  for (const r of requests) {
    // Page break when near the bottom margin
    if (doc.y > 780) {
      doc.addPage();
      drawHeaderRow();
      doc.fontSize(8.5);
    }
    const rowY = doc.y;
    const cells: Record<string, string> = {
      employee: r.employeeName || '—',
      type: r.type || '—',
      dates: fmtDates(r),
      days: String(r.days ?? ''),
      status: r.status || '—',
      reason: r.reason || '—',
    };
    // Compute the tallest cell so the next row starts below it
    let maxBottom = rowY;
    for (const c of COLS) {
      doc.text(cells[c.key], c.x, rowY, { width: c.w });
      maxBottom = Math.max(maxBottom, doc.y);
      doc.y = rowY; // reset for the next column
    }
    doc.y = maxBottom;
    doc.moveDown(0.4);
  }

  if (requests.length === 0) {
    doc.font(fontName).fontSize(10).fillColor('gray').text('No leave requests match the selected filters.', 40, doc.y + 10);
  }

  doc.end();
}
