import { Request, Response } from 'express';
import HolidayService from '../services/HolidayService';

export class HolidayController {
    async getAllHolidays(req: Request, res: Response): Promise<void> {
        try {
            const { start, end } = req.query;
            let holidays;
            if (start && end) {
                holidays = await HolidayService.getHolidaysByRange(start as string, end as string);
            } else {
                holidays = await HolidayService.getAllHolidays();
            }
            res.json(holidays);
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to fetch holidays' });
        }
    }

    async createHoliday(req: Request, res: Response): Promise<void> {
        try {
            const { date, endDate, name, isRecurring } = req.body;
            const holiday = await HolidayService.createHoliday({ date, endDate, name, isRecurring });
            res.status(201).json(holiday);
        } catch (error: any) {
            res.status(error.statusCode || 500).json({ error: error.message || 'Failed to create holiday' });
        }
    }

    async updateHoliday(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { date, endDate, name, isRecurring } = req.body;
            const holiday = await HolidayService.updateHoliday(id, { date, endDate, name, isRecurring });
            res.json(holiday);
        } catch (error: any) {
            res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update holiday' });
        }
    }

    async deleteHoliday(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            await HolidayService.deleteHoliday(id);
            res.json({ message: 'Holiday deleted' });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({ error: error.message || 'Failed to delete holiday' });
        }
    }

    async calculateBusinessDays(req: Request, res: Response): Promise<void> {
        try {
            const { start, end } = req.query;
            if (!start || !end) {
                res.status(400).json({ error: 'start and end query params required' });
                return;
            }
            const days = await this.computeBusinessDays(start as string, end as string);
            res.json({ days });
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to calculate business days' });
        }
    }

    private async computeBusinessDays(startDate: string, endDate: string): Promise<number> {
        const holidayDates = await HolidayService.getHolidayDatesSet(startDate, endDate);
        const start = new Date(startDate);
        const end = new Date(endDate);
        let count = 0;
        const current = new Date(start);
        while (current <= end) {
            const dayOfWeek = current.getDay();
            const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        return count;
    }
}

export default new HolidayController();
