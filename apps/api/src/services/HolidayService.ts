import { query } from '../db';
import { Holiday, CreateHolidayDTO, UpdateHolidayDTO } from '../models/Holiday';

/**
 * Canonical "is `dateExpr` a public holiday?" SQL predicate — the single source of
 * truth reused by HolidayService, PayrollService and AttendanceScheduler so every
 * feature classifies a date the same way.
 *
 * Handles:
 *  - single-day and multi-day non-recurring holidays (date..COALESCE(end_date,date))
 *  - recurring (annual) holidays matched by MM-DD, including spans that wrap the
 *    year boundary (e.g. Dec 31 → Jan 2), where a plain BETWEEN would never match.
 *
 * `dateExpr` must be a trusted SQL date expression (a column like `d.day::date` or
 * a bound param like `$1::date`) — never raw user input.
 */
export function holidayDateSql(dateExpr: string): string {
    return `EXISTS (
        SELECT 1 FROM holidays h
        WHERE (h.is_recurring = FALSE AND ${dateExpr} BETWEEN h.date AND COALESCE(h.end_date, h.date))
           OR (h.is_recurring = TRUE AND (
                CASE
                  WHEN TO_CHAR(h.date, 'MM-DD') <= TO_CHAR(COALESCE(h.end_date, h.date), 'MM-DD')
                    THEN TO_CHAR(${dateExpr}, 'MM-DD') BETWEEN TO_CHAR(h.date, 'MM-DD') AND TO_CHAR(COALESCE(h.end_date, h.date), 'MM-DD')
                  ELSE (TO_CHAR(${dateExpr}, 'MM-DD') >= TO_CHAR(h.date, 'MM-DD')
                        OR TO_CHAR(${dateExpr}, 'MM-DD') <= TO_CHAR(COALESCE(h.end_date, h.date), 'MM-DD'))
                END
              ))
    )`;
}

export class HolidayService {
    async getAllHolidays(): Promise<Holiday[]> {
        const result = await query('SELECT id, date, end_date, name, is_recurring, created_at, updated_at FROM holidays ORDER BY date ASC');
        return result.rows.map(this.mapRowToHoliday);
    }

    async getHolidaysByRange(startDate: string, endDate: string): Promise<Holiday[]> {
        const result = await query(
            // Non-recurring: range OVERLAP (not containment). Recurring: MM-DD overlap,
            // wrap-safe for query ranges that cross the year boundary, honoring end_date.
            `SELECT id, date, end_date, name, is_recurring, created_at, updated_at FROM holidays
             WHERE (is_recurring = FALSE AND date <= $2::date AND COALESCE(end_date, date) >= $1::date)
                OR (is_recurring = TRUE AND (
                    CASE
                      WHEN TO_CHAR($1::date, 'MM-DD') <= TO_CHAR($2::date, 'MM-DD')
                        THEN TO_CHAR(COALESCE(end_date, date), 'MM-DD') >= TO_CHAR($1::date, 'MM-DD')
                             AND TO_CHAR(date, 'MM-DD') <= TO_CHAR($2::date, 'MM-DD')
                      ELSE TO_CHAR(COALESCE(end_date, date), 'MM-DD') >= TO_CHAR($1::date, 'MM-DD')
                             OR TO_CHAR(date, 'MM-DD') <= TO_CHAR($2::date, 'MM-DD')
                    END
                ))
             ORDER BY date ASC`,
            [startDate, endDate]
        );
        return result.rows.map(this.mapRowToHoliday);
    }

    async getHolidayDatesSet(startDate: string, endDate: string): Promise<Set<string>> {
        const result = await query(
            // Non-recurring rows are fetched on date-range OVERLAP (not full containment),
            // so a multi-day holiday straddling a range edge is not dropped.
            `SELECT date, end_date, is_recurring FROM holidays
             WHERE (is_recurring = FALSE AND date <= $2::date AND COALESCE(end_date, date) >= $1::date)
                OR is_recurring = TRUE`,
            [startDate, endDate]
        );

        const targetYear = new Date(startDate).getFullYear();
        const endYear = new Date(endDate).getFullYear();
        const dates = new Set<string>();

        const formatDate = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        for (const row of result.rows) {
            const rowStart = new Date(row.date);
            const rowEnd = row.end_date ? new Date(row.end_date) : rowStart;

            if (row.is_recurring) {
                // Start a year early so a span that wraps year-end (e.g. Dec 31 → Jan 2)
                // contributes its January days to a range that begins in January.
                for (let y = targetYear - 1; y <= endYear; y++) {
                    const cur = new Date(y, rowStart.getMonth(), rowStart.getDate());
                    const last = new Date(y, rowEnd.getMonth(), rowEnd.getDate());
                    // Year-wrap: end MM-DD precedes start MM-DD → end falls in the next year.
                    if (last < cur) last.setFullYear(y + 1);
                    while (cur <= last) {
                        const dateStr = formatDate(cur);
                        if (dateStr >= startDate && dateStr <= endDate) {
                            dates.add(dateStr);
                        }
                        cur.setDate(cur.getDate() + 1);
                    }
                }
            } else {
                const cur = new Date(rowStart);
                while (cur <= rowEnd) {
                    const dateStr = formatDate(cur);
                    if (dateStr >= startDate && dateStr <= endDate) {
                        dates.add(dateStr);
                    }
                    cur.setDate(cur.getDate() + 1);
                }
            }
        }

        return dates;
    }

    /**
     * True if a given "YYYY-MM-DD" date falls on a public holiday — covers
     * single-day, multi-day (date..end_date) and recurring (annual, MM-DD with
     * year-wrap) holidays via the shared {@link holidayDateSql} predicate.
     */
    async isHoliday(date: string): Promise<boolean> {
        const result = await query(`SELECT ${holidayDateSql('$1::date')} AS is_holiday`, [date]);
        return result.rows[0]?.is_holiday === true;
    }

    async getHolidayById(id: string): Promise<Holiday | null> {
        const result = await query('SELECT id, date, end_date, name, is_recurring, created_at, updated_at FROM holidays WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;
        return this.mapRowToHoliday(result.rows[0]);
    }

    async createHoliday(data: CreateHolidayDTO): Promise<Holiday> {
        const result = await query(
            `INSERT INTO holidays (date, end_date, name, is_recurring)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [data.date, data.endDate || null, data.name, data.isRecurring ?? false]
        );
        return this.mapRowToHoliday(result.rows[0]);
    }

    async updateHoliday(id: string, data: UpdateHolidayDTO): Promise<Holiday> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIdx = 1;

        if (data.date !== undefined) {
            fields.push(`date = $${paramIdx++}`);
            values.push(data.date);
        }
        if (data.endDate !== undefined) {
            fields.push(`end_date = $${paramIdx++}`);
            values.push(data.endDate || null);
        }
        if (data.name !== undefined) {
            fields.push(`name = $${paramIdx++}`);
            values.push(data.name);
        }
        if (data.isRecurring !== undefined) {
            fields.push(`is_recurring = $${paramIdx++}`);
            values.push(data.isRecurring);
        }
        fields.push(`updated_at = NOW()`);
        values.push(id);

        const result = await query(
            `UPDATE holidays SET ${fields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            const err: any = new Error('Holiday not found');
            err.statusCode = 404;
            throw err;
        }
        return this.mapRowToHoliday(result.rows[0]);
    }

    async deleteHoliday(id: string): Promise<void> {
        const result = await query('DELETE FROM holidays WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            const err: any = new Error('Holiday not found');
            err.statusCode = 404;
            throw err;
        }
    }

    private formatDateStr(d: Date): string {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    private mapRowToHoliday(row: any): Holiday {
        const d = new Date(row.date);
        const endD = row.end_date ? new Date(row.end_date) : null;
        return {
            id: row.id,
            date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
            endDate: endD ? `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}` : null,
            name: row.name,
            isRecurring: row.is_recurring,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}

export default new HolidayService();
