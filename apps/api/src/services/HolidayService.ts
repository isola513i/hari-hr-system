import { query } from '../db';
import { Holiday, CreateHolidayDTO, UpdateHolidayDTO } from '../models/Holiday';

export class HolidayService {
    async getAllHolidays(): Promise<Holiday[]> {
        const result = await query('SELECT * FROM holidays ORDER BY date ASC');
        return result.rows.map(this.mapRowToHoliday);
    }

    async getHolidaysByRange(startDate: string, endDate: string): Promise<Holiday[]> {
        const result = await query(
            `SELECT * FROM holidays
             WHERE (is_recurring = FALSE AND date >= $1::date AND COALESCE(end_date, date) <= $2::date)
                OR (is_recurring = TRUE AND (
                    TO_CHAR(date, 'MM-DD') >= TO_CHAR($1::date, 'MM-DD')
                    AND TO_CHAR(date, 'MM-DD') <= TO_CHAR($2::date, 'MM-DD')
                ))
             ORDER BY date ASC`,
            [startDate, endDate]
        );
        return result.rows.map(this.mapRowToHoliday);
    }

    async getHolidayDatesSet(startDate: string, endDate: string): Promise<Set<string>> {
        const result = await query(
            `SELECT date, end_date, is_recurring FROM holidays
             WHERE (is_recurring = FALSE AND date >= $1::date AND COALESCE(end_date, date) <= $2::date)
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
                for (let y = targetYear; y <= endYear; y++) {
                    const cur = new Date(y, rowStart.getMonth(), rowStart.getDate());
                    const last = new Date(y, rowEnd.getMonth(), rowEnd.getDate());
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

    async getHolidayById(id: string): Promise<Holiday | null> {
        const result = await query('SELECT * FROM holidays WHERE id = $1', [id]);
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
