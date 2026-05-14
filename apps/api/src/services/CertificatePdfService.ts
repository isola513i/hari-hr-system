import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

const THAI_FONT_REGULAR = path.join(__dirname, '../fonts/NotoSansThai-Regular.ttf');
const THAI_FONT_BOLD = path.join(__dirname, '../fonts/NotoSansThai-Bold.ttf');
const HAS_THAI_FONT = fs.existsSync(THAI_FONT_REGULAR);
const HAS_THAI_BOLD = fs.existsSync(THAI_FONT_BOLD);

export interface CertificateData {
  employeeName: string;
  trainingTitle: string;
  completionDate: string;
  score?: number | null;
  companyName?: string;
  certificateId?: string;
}

export function generateCertificatePdf(data: CertificateData, stream: NodeJS.WritableStream): void {
  const companyName = data.companyName || 'HARI HR System';

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });

  if (HAS_THAI_FONT) doc.registerFont('MainFont', THAI_FONT_REGULAR);
  if (HAS_THAI_BOLD) doc.registerFont('MainFontBold', THAI_FONT_BOLD);

  const fontName = HAS_THAI_FONT ? 'MainFont' : 'Helvetica';
  const fontBold = HAS_THAI_BOLD ? 'MainFontBold' : (HAS_THAI_FONT ? 'MainFont' : 'Helvetica-Bold');

  const W = 841.89; // A4 landscape width in pts
  const H = 595.28;

  doc.pipe(stream);

  // Background
  doc.rect(0, 0, W, H).fill('#f9f7f0');

  // Outer border
  doc.rect(20, 20, W - 40, H - 40).lineWidth(3).stroke('#c9a84c');
  doc.rect(28, 28, W - 56, H - 56).lineWidth(1).stroke('#c9a84c');

  // Gold header bar
  doc.rect(20, 20, W - 40, 80).fill('#c9a84c');

  // Company name in header
  doc.fillColor('#ffffff').font(fontBold).fontSize(14)
    .text(companyName.toUpperCase(), 20, 45, { width: W - 40, align: 'center' });

  // Certificate title
  doc.fillColor('#8B6914').font(fontBold).fontSize(36)
    .text('Certificate of Completion', 0, 130, { width: W, align: 'center' });

  // "This is to certify that"
  doc.fillColor('#555555').font(fontName).fontSize(14)
    .text('This is to certify that', 0, 195, { width: W, align: 'center' });

  // Employee name
  doc.fillColor('#1a1a2e').font(fontBold).fontSize(28)
    .text(data.employeeName, 0, 220, { width: W, align: 'center' });

  // Line under name
  const nameWidth = Math.min(doc.widthOfString(data.employeeName) + 60, 400);
  doc.moveTo((W - nameWidth) / 2, 260).lineTo((W + nameWidth) / 2, 260).lineWidth(1).stroke('#c9a84c');

  // "has successfully completed"
  doc.fillColor('#555555').font(fontName).fontSize(14)
    .text('has successfully completed', 0, 270, { width: W, align: 'center' });

  // Training title
  doc.fillColor('#1a1a2e').font(fontBold).fontSize(20)
    .text(`"${data.trainingTitle}"`, 80, 295, { width: W - 160, align: 'center' });

  // Score (if available)
  let scoreY = 335;
  if (data.score != null) {
    doc.fillColor('#555555').font(fontName).fontSize(13)
      .text(`with a score of ${data.score}%`, 0, 335, { width: W, align: 'center' });
    scoreY = 355;
  }

  // Completion date
  const dateStr = new Date(data.completionDate + 'T00:00:00').toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  doc.fillColor('#555555').font(fontName).fontSize(13)
    .text(`Completed on ${dateStr}`, 0, scoreY + 5, { width: W, align: 'center' });

  // Gold footer bar
  doc.rect(20, H - 100, W - 40, 80).fill('#c9a84c');

  // Certificate ID in footer
  if (data.certificateId) {
    doc.fillColor('#ffffff').font(fontName).fontSize(9)
      .text(`Certificate ID: ${data.certificateId}`, 40, H - 80, { width: 300 });
  }

  // Generated date in footer
  doc.fillColor('#ffffff').font(fontName).fontSize(9)
    .text(`Generated on ${new Date().toISOString().split('T')[0]}`, W - 340, H - 80, { width: 300, align: 'right' });

  doc.end();
}
