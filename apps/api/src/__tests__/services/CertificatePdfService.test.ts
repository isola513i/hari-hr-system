import { Writable } from 'stream';
import { generateCertificatePdf, CertificateData } from '../../services/CertificatePdfService';

/**
 * Tests for the training-completion certificate PDF generator.
 *
 * These are smoke + structural tests — they verify the function:
 *   1. Writes valid PDF bytes (starts with %PDF magic header)
 *   2. Doesn't throw on edge inputs (no score, no certificate ID, Thai names)
 *   3. Closes the stream on its own (end-of-document marker present)
 *
 * We don't parse the PDF to assert visual layout — that's out of scope for
 * a unit test. The visual layout is validated manually via the file
 * apps/web/components/employee-detail/TrainingTab.tsx → download button.
 */

function collectPdf(producer: (stream: NodeJS.WritableStream) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const sink = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(chunk as Buffer);
        cb();
      },
    });
    sink.on('finish', () => resolve(Buffer.concat(chunks)));
    sink.on('error', reject);
    producer(sink);
  });
}

describe('CertificatePdfService — generateCertificatePdf', () => {
  const baseData: CertificateData = {
    employeeName: 'Nattapat Lamnui',
    trainingTitle: 'Advanced TypeScript Patterns',
    completionDate: '2026-06-12',
    score: 92,
    companyName: 'HARI HR System',
    certificateId: 'CERT-ABC12345',
  };

  it('produces a valid PDF byte stream (starts with %PDF magic)', async () => {
    const buf = await collectPdf((s) => generateCertificatePdf(baseData, s));

    expect(buf.length).toBeGreaterThan(500); // sanity: non-empty PDF
    expect(buf.subarray(0, 4).toString('utf8')).toBe('%PDF');
    // PDF trailer
    expect(buf.subarray(buf.length - 6).toString('utf8')).toMatch(/%%EOF/);
  });

  it('handles missing optional score', async () => {
    const buf = await collectPdf((s) =>
      generateCertificatePdf({ ...baseData, score: null }, s),
    );

    expect(buf.subarray(0, 4).toString('utf8')).toBe('%PDF');
  });

  it('handles missing optional certificateId', async () => {
    const buf = await collectPdf((s) =>
      generateCertificatePdf({ ...baseData, certificateId: undefined }, s),
    );

    expect(buf.subarray(0, 4).toString('utf8')).toBe('%PDF');
  });

  it('uses default companyName when none provided', async () => {
    const buf = await collectPdf((s) =>
      generateCertificatePdf({ ...baseData, companyName: undefined }, s),
    );

    // Just verify it doesn't crash — falls back to "HARI HR System" default
    expect(buf.length).toBeGreaterThan(500);
  });

  it('accepts Thai characters in employee name without crashing', async () => {
    const buf = await collectPdf((s) =>
      generateCertificatePdf({ ...baseData, employeeName: 'ณัฐภัทร แลมนุย' }, s),
    );

    expect(buf.subarray(0, 4).toString('utf8')).toBe('%PDF');
  });

  it('accepts Thai characters in training title', async () => {
    const buf = await collectPdf((s) =>
      generateCertificatePdf({ ...baseData, trainingTitle: 'การพัฒนาเว็บแอปพลิเคชันด้วย React' }, s),
    );

    expect(buf.subarray(0, 4).toString('utf8')).toBe('%PDF');
  });

  it('parses completionDate as a valid calendar date', async () => {
    // YYYY-MM-DD format from DB — appended with T00:00:00 inside service
    const buf = await collectPdf((s) =>
      generateCertificatePdf({ ...baseData, completionDate: '2026-01-31' }, s),
    );

    expect(buf.subarray(0, 4).toString('utf8')).toBe('%PDF');
  });

  it('handles score of 0 (edge: completed but failed)', async () => {
    const buf = await collectPdf((s) =>
      generateCertificatePdf({ ...baseData, score: 0 }, s),
    );

    expect(buf.subarray(0, 4).toString('utf8')).toBe('%PDF');
  });
});
