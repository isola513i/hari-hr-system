import cron from 'node-cron';
import { query } from '../db';
import { getIO } from '../socket';

/**
 * Auto-checkout: runs at 23:59 Bangkok time daily.
 * Finds open attendance records (clock_in set, clock_out NULL) for today
 * and auto-closes them at 23:59.
 */
async function autoCheckout(): Promise<void> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

  try {
    // Fetch standard_hours from system config (default 8)
    const configResult = await query(
      `SELECT key, value FROM system_configs WHERE category = 'attendance'`
    );
    const configMap: Record<string, string> = {};
    for (const row of configResult.rows) {
      configMap[row.key] = row.value;
    }
    const standardHours = parseFloat(configMap['standard_hours'] || '8');

    // Find ALL open records up to today (catches missed days too)
    const openRecords = await query(
      `SELECT id, date, clock_in, break_duration, notes FROM attendance_records
       WHERE date <= $1 AND clock_in IS NOT NULL AND clock_out IS NULL`,
      [today]
    );

    if (openRecords.rows.length === 0) return;

    for (const row of openRecords.rows) {
      const clockIn = new Date(row.clock_in);
      const breakDuration = row.break_duration || 0;

      // Auto-checkout: cap at standard_hours after clock_in (+ break time)
      const standardMs = standardHours * 60 * 60 * 1000;
      const breakMs = breakDuration * 60 * 1000;
      const checkoutTime = new Date(clockIn.getTime() + standardMs + breakMs);
      const totalHours = standardHours;

      // Auto-checkout: no overtime, no early departure
      const overtimeHours = 0;
      const earlyDeparture = false;
      const existingNotes = row.notes ? `${row.notes} | ` : '';
      const notes = `${existingNotes}Auto-checkout: capped at ${standardHours}h`;

      await query(
        `UPDATE attendance_records
         SET clock_out = $1, total_hours = $2, overtime_hours = $3,
             early_departure = $4, auto_checkout = TRUE, notes = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [checkoutTime, totalHours, overtimeHours, earlyDeparture, notes, row.id]
      );
    }

    console.log(`[AttendanceScheduler] Auto-checkout: ${openRecords.rows.length} record(s) closed`);

    // Emit socket event for real-time refresh
    try {
      const io = getIO();
      io.emit('attendance:updated', { type: 'auto-checkout' });
    } catch {
      // Socket may not be initialized in test environments
    }
  } catch (err) {
    console.error('[AttendanceScheduler] Auto-checkout error:', err);
  }
}

/**
 * Auto-mark absent: runs at 00:05 Bangkok time daily.
 * Looks at the PREVIOUS day and inserts Absent records for active employees
 * who have no attendance record and no approved leave. Skips weekends.
 */
async function autoMarkAbsent(): Promise<void> {
  // Previous day in Bangkok timezone
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const prevDate = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

  // Skip weekends (Sat=6, Sun=0)
  const dayOfWeek = new Date(`${prevDate}T12:00:00+07:00`).getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    console.log(`[AttendanceScheduler] Auto-absent: skipping weekend (${prevDate})`);
    return;
  }

  // Skip public holidays
  const holidayCheck = await query(
    `SELECT 1 FROM holidays
     WHERE (is_recurring = FALSE AND $1::date BETWEEN date AND COALESCE(end_date, date))
        OR (is_recurring = TRUE  AND TO_CHAR($1::date, 'MM-DD') BETWEEN TO_CHAR(date, 'MM-DD') AND TO_CHAR(COALESCE(end_date, date), 'MM-DD'))
     LIMIT 1`,
    [prevDate]
  );
  if (holidayCheck.rows.length > 0) {
    console.log(`[AttendanceScheduler] Auto-absent: skipping public holiday (${prevDate})`);
    return;
  }

  try {
    // Insert Absent records for active employees with no attendance record and no approved leave
    const result = await query(
      `INSERT INTO attendance_records (employee_id, date, status, notes)
       SELECT e.id, $1, 'Absent', 'Auto-marked absent'
       FROM employees e
       WHERE e.status = 'Active'
         AND NOT EXISTS (
           SELECT 1 FROM attendance_records ar
           WHERE ar.employee_id = e.id AND ar.date = $1
         )
         AND NOT EXISTS (
           SELECT 1 FROM leave_requests lr
           WHERE lr.employee_id = e.id AND lr.status = 'Approved'
             AND $1::date BETWEEN lr.start_date AND lr.end_date
         )`,
      [prevDate]
    );

    const count = result.rowCount || 0;
    if (count > 0) {
      console.log(`[AttendanceScheduler] Auto-absent: ${count} record(s) created for ${prevDate}`);

      try {
        const io = getIO();
        io.emit('attendance:updated', { type: 'auto-absent' });
      } catch {
        // Socket may not be initialized in test environments
      }
    }
  } catch (err) {
    console.error('[AttendanceScheduler] Auto-absent error:', err);
  }
}

/**
 * Initialize the attendance cron jobs.
 * Call this after the server starts listening.
 */
export function initAttendanceScheduler(): void {
  const checkoutCron = process.env.CRON_AUTO_CHECKOUT || '59 23 * * *';
  const absentCron = process.env.CRON_AUTO_ABSENT || '5 0 * * *';
  const timezone = process.env.CRON_TIMEZONE || 'Asia/Bangkok';

  cron.schedule(checkoutCron, autoCheckout, { timezone });
  cron.schedule(absentCron, autoMarkAbsent, { timezone });

  console.log(`[AttendanceScheduler] Initialized (checkout: ${checkoutCron}, absent: ${absentCron}, tz: ${timezone})`);
}
