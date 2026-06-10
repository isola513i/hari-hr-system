import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Sparkles, CheckSquare, Square, AlertCircle, FileText } from 'lucide-react';
import { Modal } from './Modal';
import { useBulkCreateHolidays } from '../hooks/queries';

interface HolidayRow {
  name: string;
  nameTh?: string;
  date: string;
  endDate?: string | null;
  isRecurring: boolean;
}

// Thai public holidays by year
const THAI_PRESETS: Record<number, HolidayRow[]> = {
  2025: [
    { name: "New Year's Day", nameTh: 'วันปีใหม่', date: '2025-01-01', isRecurring: true },
    { name: 'Makha Bucha', nameTh: 'วันมาฆบูชา', date: '2025-02-12', isRecurring: false },
    { name: 'Chakri Memorial Day', nameTh: 'วันจักรี', date: '2025-04-06', isRecurring: true },
    { name: 'Songkran', nameTh: 'วันสงกรานต์', date: '2025-04-13', endDate: '2025-04-15', isRecurring: true },
    { name: 'National Labour Day', nameTh: 'วันแรงงานแห่งชาติ', date: '2025-05-01', isRecurring: true },
    { name: 'Coronation Day', nameTh: 'วันฉัตรมงคล', date: '2025-05-04', isRecurring: true },
    { name: 'Visakha Bucha', nameTh: 'วันวิสาขบูชา', date: '2025-05-12', isRecurring: false },
    { name: 'Asahna Bucha', nameTh: 'วันอาสาฬหบูชา', date: '2025-08-10', isRecurring: false },
    { name: "H.M. Queen's Birthday", nameTh: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ', date: '2025-08-12', isRecurring: true },
    { name: 'H.M. Late King Bhumibol Memorial Day', nameTh: 'วันคล้ายวันสวรรคต ร.9', date: '2025-10-13', isRecurring: true },
    { name: 'Chulalongkorn Memorial Day', nameTh: 'วันปิยมหาราช', date: '2025-10-23', isRecurring: true },
    { name: "H.M. King's Birthday", nameTh: 'วันเฉลิมพระชนมพรรษา ร.10', date: '2025-12-05', isRecurring: true },
    { name: 'Constitution Day', nameTh: 'วันรัฐธรรมนูญ', date: '2025-12-10', isRecurring: true },
    { name: "New Year's Eve", nameTh: 'วันสิ้นปี', date: '2025-12-31', isRecurring: true },
  ],
  2026: [
    { name: "New Year's Day", nameTh: 'วันปีใหม่', date: '2026-01-01', isRecurring: true },
    { name: 'Makha Bucha', nameTh: 'วันมาฆบูชา', date: '2026-03-04', isRecurring: false },
    { name: 'Chakri Memorial Day', nameTh: 'วันจักรี', date: '2026-04-06', isRecurring: true },
    { name: 'Songkran', nameTh: 'วันสงกรานต์', date: '2026-04-13', endDate: '2026-04-15', isRecurring: true },
    { name: 'National Labour Day', nameTh: 'วันแรงงานแห่งชาติ', date: '2026-05-01', isRecurring: true },
    { name: 'Coronation Day', nameTh: 'วันฉัตรมงคล', date: '2026-05-04', isRecurring: true },
    { name: 'Visakha Bucha', nameTh: 'วันวิสาขบูชา', date: '2026-06-01', isRecurring: false },
    { name: 'Asahna Bucha', nameTh: 'วันอาสาฬหบูชา', date: '2026-07-28', isRecurring: false },
    { name: "H.M. Queen's Birthday", nameTh: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ', date: '2026-08-12', isRecurring: true },
    { name: 'H.M. Late King Bhumibol Memorial Day', nameTh: 'วันคล้ายวันสวรรคต ร.9', date: '2026-10-13', isRecurring: true },
    { name: 'Chulalongkorn Memorial Day', nameTh: 'วันปิยมหาราช', date: '2026-10-23', isRecurring: true },
    { name: "H.M. King's Birthday", nameTh: 'วันเฉลิมพระชนมพรรษา ร.10', date: '2026-12-05', isRecurring: true },
    { name: 'Constitution Day', nameTh: 'วันรัฐธรรมนูญ', date: '2026-12-10', isRecurring: true },
    { name: "New Year's Eve", nameTh: 'วันสิ้นปี', date: '2026-12-31', isRecurring: true },
  ],
  2027: [
    { name: "New Year's Day", nameTh: 'วันปีใหม่', date: '2027-01-01', isRecurring: true },
    { name: 'Makha Bucha', nameTh: 'วันมาฆบูชา', date: '2027-02-21', isRecurring: false },
    { name: 'Chakri Memorial Day', nameTh: 'วันจักรี', date: '2027-04-06', isRecurring: true },
    { name: 'Songkran', nameTh: 'วันสงกรานต์', date: '2027-04-13', endDate: '2027-04-15', isRecurring: true },
    { name: 'National Labour Day', nameTh: 'วันแรงงานแห่งชาติ', date: '2027-05-01', isRecurring: true },
    { name: 'Coronation Day', nameTh: 'วันฉัตรมงคล', date: '2027-05-04', isRecurring: true },
    { name: 'Visakha Bucha', nameTh: 'วันวิสาขบูชา', date: '2027-05-21', isRecurring: false },
    { name: 'Asahna Bucha', nameTh: 'วันอาสาฬหบูชา', date: '2027-07-18', isRecurring: false },
    { name: "H.M. Queen's Birthday", nameTh: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ', date: '2027-08-12', isRecurring: true },
    { name: 'H.M. Late King Bhumibol Memorial Day', nameTh: 'วันคล้ายวันสวรรคต ร.9', date: '2027-10-13', isRecurring: true },
    { name: 'Chulalongkorn Memorial Day', nameTh: 'วันปิยมหาราช', date: '2027-10-23', isRecurring: true },
    { name: "H.M. King's Birthday", nameTh: 'วันเฉลิมพระชนมพรรษา ร.10', date: '2027-12-05', isRecurring: true },
    { name: 'Constitution Day', nameTh: 'วันรัฐธรรมนูญ', date: '2027-12-10', isRecurring: true },
    { name: "New Year's Eve", nameTh: 'วันสิ้นปี', date: '2027-12-31', isRecurring: true },
  ],
};

const CSV_TEMPLATE = 'name,date,endDate,isRecurring\nNew Year\'s Day,2026-01-01,,true\nSongkran,2026-04-13,2026-04-15,true';

function parseCSV(text: string): { rows: HolidayRow[]; errors: string[] } {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], errors: ['CSV must have a header row and at least one data row'] };

  const header = lines[0]!.toLowerCase().split(',').map(h => h.trim());
  const nameIdx = header.indexOf('name');
  const dateIdx = header.indexOf('date');
  const endDateIdx = header.indexOf('enddate');
  const recurIdx = header.indexOf('isrecurring');

  if (nameIdx === -1 || dateIdx === -1) {
    return { rows: [], errors: ['CSV must have "name" and "date" columns'] };
  }

  const rows: HolidayRow[] = [];
  const errors: string[] = [];

  lines.slice(1).forEach((line, i) => {
    const cols = line.split(',').map(c => c.trim());
    const name = cols[nameIdx];
    const date = cols[dateIdx];
    if (!name || !date) { errors.push(`Row ${i + 2}: missing name or date`); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { errors.push(`Row ${i + 2}: invalid date format "${date}" (use YYYY-MM-DD)`); return; }
    rows.push({
      name,
      date,
      endDate: endDateIdx !== -1 && cols[endDateIdx] ? cols[endDateIdx] : null,
      isRecurring: recurIdx !== -1 ? cols[recurIdx]?.toLowerCase() === 'true' : false,
    });
  });

  return { rows, errors };
}

const formatDate = (d: string, locale = 'en-US') =>
  new Date(d.slice(0, 10) + 'T00:00:00Z')
    .toLocaleDateString(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' });

interface Props {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export function HolidayImportModal({ onClose, onSuccess }: Props) {
  const { t, i18n } = useTranslation('settings');
  const isThai = i18n.language === 'th';
  const locale = isThai ? 'th-TH' : 'en-US';
  const localName = (h: HolidayRow) => (isThai && h.nameTh) ? h.nameTh : h.name;
  const fmtDate = (d: string) => formatDate(d, locale);
  const [tab, setTab] = useState<'preset' | 'csv'>('preset');
  const [year, setYear] = useState(new Date().getFullYear());
  const [selected, setSelected] = useState<Set<number>>(new Set(
    THAI_PRESETS[new Date().getFullYear()]?.map((_, i) => i) ?? []
  ));
  const [csvText, setCsvText] = useState('');
  const [csvRows, setCsvRows] = useState<HolidayRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkCreate = useBulkCreateHolidays();

  const presetRows = THAI_PRESETS[year] ?? [];

  const handleYearChange = (y: number) => {
    setYear(y);
    setSelected(new Set(THAI_PRESETS[y]?.map((_, i) => i) ?? []));
  };

  const toggleAll = () => {
    if (selected.size === presetRows.length) setSelected(new Set());
    else setSelected(new Set(presetRows.map((_, i) => i)));
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      const { rows, errors } = parseCSV(text);
      setCsvRows(rows);
      setCsvErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleCSVInput = (text: string) => {
    setCsvText(text);
    const { rows, errors } = parseCSV(text);
    setCsvRows(rows);
    setCsvErrors(errors);
  };

  const handleImport = async () => {
    const rows = tab === 'preset'
      ? presetRows.filter((_, i) => selected.has(i)).map(h => ({ ...h, name: localName(h) }))
      : csvRows;

    if (rows.length === 0) return;

    try {
      const result = await bulkCreate.mutateAsync(rows);
      onSuccess(t('holidayImport.importSuccess', { created: result.created, failed: result.failed }));
    } catch {
      // error handled by mutation
    }
  };

  const importCount = tab === 'preset' ? selected.size : csvRows.length;

  return (
    <Modal isOpen onClose={onClose} title={t('holidayImport.title')} maxWidth="lg">
      <div className="p-6 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
          {(['preset', 'csv'] as const).map(tabKey => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === tabKey
                  ? 'bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark shadow-sm'
                  : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark'
              }`}
            >
              {tabKey === 'preset' ? t('holidayImport.tabPreset') : t('holidayImport.tabCsv')}
            </button>
          ))}
        </div>

        {tab === 'preset' && (
          <div className="space-y-3">
            {/* Year selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('holidayImport.year')}</span>
              <div className="flex gap-1">
                {[2025, 2026, 2027].map(y => (
                  <button
                    key={y}
                    onClick={() => handleYearChange(y)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      year === y
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-text-muted-light dark:text-text-muted-dark hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
              <button onClick={toggleAll} className="ml-auto text-xs text-primary hover:underline">
                {selected.size === presetRows.length ? t('holidayImport.deselectAll') : t('holidayImport.selectAll')}
              </button>
            </div>

            {/* Holiday list */}
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {presetRows.map((h, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(prev => {
                    const next = new Set(prev);
                    next.has(i) ? next.delete(i) : next.add(i);
                    return next;
                  })}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    selected.has(i)
                      ? 'bg-primary/5 dark:bg-primary/10'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  {selected.has(i)
                    ? <CheckSquare size={16} className="text-primary shrink-0" />
                    : <Square size={16} className="text-text-muted-light dark:text-text-muted-dark shrink-0" />}
                  <span className="flex-1 text-sm text-text-light dark:text-text-dark">{localName(h)}</span>
                  <span className="text-xs text-text-muted-light dark:text-text-muted-dark shrink-0">
                    {h.endDate ? `${fmtDate(h.date)} – ${fmtDate(h.endDate)}` : fmtDate(h.date)}
                  </span>
                  {h.isRecurring && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">{t('holidayImport.annual')}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'csv' && (
          <div className="space-y-3">
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border-light dark:border-border-dark hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800/30'
              }`}
            >
              <Upload size={24} className="mx-auto mb-2 text-text-muted-light dark:text-text-muted-dark" />
              <p className="text-sm text-text-light dark:text-text-dark font-medium">{t('holidayImport.dropZone')}</p>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">{t('holidayImport.columns')}</p>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            {/* Template download */}
            <button
              onClick={() => {
                const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                a.download = 'holiday_template.csv'; a.click();
              }}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <FileText size={12} /> {t('holidayImport.downloadTemplate')}
            </button>

            {/* Manual paste area */}
            <textarea
              value={csvText}
              onChange={e => handleCSVInput(e.target.value)}
              placeholder={`${t('holidayImport.pastePlaceholder')}\n${CSV_TEMPLATE}`}
              rows={5}
              className="w-full px-3 py-2 text-xs font-mono border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none resize-none"
            />

            {/* Parse errors */}
            {csvErrors.length > 0 && (
              <div className="space-y-1">
                {csvErrors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle size={12} className="shrink-0 mt-0.5" />
                    {err}
                  </div>
                ))}
              </div>
            )}

            {/* Preview */}
            {csvRows.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide">{t('holidayImport.preview', { count: csvRows.length })}</p>
                {csvRows.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm">
                    <span className="flex-1 text-text-light dark:text-text-dark truncate">{h.name}</span>
                    <span className="text-xs text-text-muted-light dark:text-text-muted-dark shrink-0">
                      {h.endDate ? `${fmtDate(h.date)} – ${fmtDate(h.endDate)}` : fmtDate(h.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border-light dark:border-border-dark">
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
            {importCount > 0 ? t('holidayImport.toImport', { count: importCount }) : t('holidayImport.nothingSelected')}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors">
              {t('holidayImport.cancel')}
            </button>
            <button
              onClick={handleImport}
              disabled={importCount === 0 || bulkCreate.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={14} />
              {bulkCreate.isPending ? t('holidayImport.importing') : t('holidayImport.import', { count: importCount })}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
