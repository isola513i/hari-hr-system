import { query } from '../db';
import { BusinessError } from '../utils/errorResponse';
import { isWithinGeofence, haversineDistance } from '../utils/geoUtils';
import WFHRequestService from './WFHRequestService';

// ---------------------------------------------------------------------------
// Work Schedule Config (cached)
// ---------------------------------------------------------------------------

interface WorkScheduleConfig {
  lateThreshold: string; // HH:mm
  workEnd: string;       // HH:mm
  standardHours: number;
}

const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let configCache: { data: WorkScheduleConfig; fetchedAt: number } | null = null;

async function getWorkSchedule(): Promise<WorkScheduleConfig> {
  if (configCache && Date.now() - configCache.fetchedAt < CONFIG_CACHE_TTL) {
    return configCache.data;
  }

  const result = await query(
    `SELECT key, value FROM system_configs WHERE category = 'attendance'`
  );

  const map: Record<string, string> = {};
  for (const row of result.rows) {
    map[row.key] = row.value;
  }

  const data: WorkScheduleConfig = {
    lateThreshold: map['late_threshold'] || '09:00',
    workEnd: map['work_end'] || '18:00',
    standardHours: parseFloat(map['standard_hours'] || '8'),
  };

  configCache = { data, fetchedAt: Date.now() };
  return data;
}

// ---------------------------------------------------------------------------
// GPS / Geofence Config (cached)
// ---------------------------------------------------------------------------

interface GPSConfig {
  officeLat: number | null;
  officeLng: number | null;
  geofenceRadius: number;
  gpsRequired: boolean;
  officeIps: string[]; // trusted office public IPs — allows desktop check-in without GPS
}

let gpsConfigCache: { data: GPSConfig; fetchedAt: number } | null = null;

export function clearGPSConfigCache(): void {
  gpsConfigCache = null;
}

export function clearWorkScheduleCache(): void {
  configCache = null;
}

async function getGPSConfig(): Promise<GPSConfig> {
  if (gpsConfigCache && Date.now() - gpsConfigCache.fetchedAt < CONFIG_CACHE_TTL) {
    return gpsConfigCache.data;
  }

  const result = await query(
    `SELECT key, value FROM system_configs WHERE category = 'attendance' AND key IN ('office_lat','office_lng','geofence_radius','gps_required','office_ip')`
  );

  const map: Record<string, string> = {};
  for (const row of result.rows) {
    map[row.key] = row.value;
  }

  const data: GPSConfig = {
    officeLat: map['office_lat'] ? parseFloat(map['office_lat']) : null,
    officeLng: map['office_lng'] ? parseFloat(map['office_lng']) : null,
    geofenceRadius: parseFloat(map['geofence_radius'] || '200'),
    gpsRequired: map['gps_required'] === 'true',
    officeIps: map['office_ip'] ? map['office_ip'].split(',').map(ip => ip.trim()).filter(Boolean) : [],
  };

  gpsConfigCache = { data, fetchedAt: Date.now() };
  return data;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breakDuration: number;
  totalHours: number | null;
  status: 'On-time' | 'Late' | 'Absent' | 'On-leave';
  notes: string | null;
  modifiedBy: string | null;
  createdAt: Date;
  autoCheckout: boolean;
  earlyDeparture: boolean;
  overtimeHours: number | null;
  clockInLat: number | null;
  clockInLng: number | null;
  clockInAccuracy: number | null;
  checkInType: string;
}

export interface AdminAttendanceFilters {
  search?: string;
  department?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export type AdminDisplayStatus = 'Active' | 'Checked Out' | 'On-Leave' | 'Not In';

export interface AdminAttendanceRecord extends AttendanceRecord {
  employeeName: string;
  employeeDepartment: string;
  employeeAvatar: string | null;
  displayStatus?: AdminDisplayStatus;
}

export interface AttendanceSnapshot {
  total: number;
  presentToday: number;
  activeNow: number;
  checkedOut: number;
  absentOrLeave: number;
  onLeave: number;
}

export interface AdminUpsertData {
  employeeId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status?: AttendanceRecord['status'];
  notes?: string;
  modifiedBy: string;
}

export interface ClockInData {
  employeeId: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  clientIp?: string; // used to allow desktop check-in via office IP allowlist
}

export interface ClockOutData {
  employeeId: string;
  notes?: string;
}

export class AttendanceService {
  /**
   * Clock in for an employee
   */
  async clockIn(data: ClockInData): Promise<AttendanceRecord> {
    const { employeeId, notes, latitude, longitude, accuracy, clientIp } = data;

    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

    // Check if already clocked in today (exclude soft-deleted records)
    const existing = await query(
      'SELECT * FROM attendance_records WHERE employee_id = $1 AND date = $2 AND deleted_at IS NULL',
      [employeeId, today]
    );

    if (existing.rows.length > 0 && existing.rows[0].clock_in && !existing.rows[0].clock_out) {
      throw new BusinessError('Already clocked in for today');
    }

    // GPS / Geofence validation
    const gpsConfig = await getGPSConfig();
    let checkInType = 'office';

    if (gpsConfig.gpsRequired) {
      // Determine if employee bypasses geofence (remote/hybrid or approved WFH)
      const empResult = await query('SELECT work_type FROM employees WHERE id = $1', [employeeId]);
      const workType: string = empResult.rows[0]?.work_type || 'office';

      if (workType === 'remote') {
        checkInType = 'remote';
      } else if (workType === 'hybrid') {
        // Hybrid: attempt geofence — record 'office' if within range, 'remote' if outside
        const hasGps = latitude != null && longitude != null;
        const isOfficeIp = clientIp != null && gpsConfig.officeIps.length > 0 && gpsConfig.officeIps.includes(clientIp);
        if (hasGps && gpsConfig.officeLat != null && gpsConfig.officeLng != null) {
          checkInType = isWithinGeofence(latitude!, longitude!, gpsConfig.officeLat, gpsConfig.officeLng, gpsConfig.geofenceRadius) || isOfficeIp
            ? 'office'
            : 'remote';
        } else if (isOfficeIp) {
          checkInType = 'office';
        } else {
          checkInType = 'remote';
        }
      } else {
        const hasWFH = await WFHRequestService.hasApprovedWFH(employeeId, today);
        if (hasWFH) {
          checkInType = 'wfh';
        } else {
          // Office employee: validate via GPS or office IP allowlist
          const hasGps = latitude != null && longitude != null;
          const isOfficeIp = clientIp != null && gpsConfig.officeIps.length > 0 && gpsConfig.officeIps.includes(clientIp);

          if (!hasGps && !isOfficeIp) {
            if (gpsConfig.officeIps.length > 0) {
              throw new BusinessError('GPS location is required. If you are at the office, make sure you are connected to the office network.');
            }
            throw new BusinessError('GPS location is required to clock in. If you are on a desktop/laptop, please ask your admin to configure the Office IP in GPS settings.');
          }

          if (hasGps) {
            if (gpsConfig.officeLat == null || gpsConfig.officeLng == null) {
              throw new BusinessError('Office location is not configured. Please contact HR admin');
            }
            if (!isWithinGeofence(latitude!, longitude!, gpsConfig.officeLat, gpsConfig.officeLng, gpsConfig.geofenceRadius)) {
              if (isOfficeIp) {
                // On office network but GPS is inaccurate — trust the network
                checkInType = 'office';
              } else {
                const dist = Math.round(haversineDistance(latitude!, longitude!, gpsConfig.officeLat, gpsConfig.officeLng));
                throw new BusinessError(`You are ${dist}m from the office (allowed: ${gpsConfig.geofenceRadius}m). Please check in from the office or submit a WFH request`);
              }
            } else {
              checkInType = 'office';
            }
          } else {
            // No GPS but on office network — allowed
            checkInType = 'office';
          }
        }
      }
    }

    // Determine late status
    const config = await getWorkSchedule();
    const lateThreshold = new Date(`${today}T${config.lateThreshold}:00+07:00`);
    const status = now > lateThreshold ? 'Late' : 'On-time';

    if (existing.rows.length > 0) {
      const result = await query(
        `UPDATE attendance_records
         SET clock_in = $1, status = $2, notes = COALESCE($3, notes),
             clock_in_lat = $4, clock_in_lng = $5, clock_in_accuracy = $6, check_in_type = $7,
             clock_out = NULL, total_hours = NULL, overtime_hours = NULL, early_departure = FALSE,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8
         RETURNING *`,
        [now, status, notes, latitude ?? null, longitude ?? null, accuracy ?? null, checkInType, existing.rows[0].id]
      );
      return this.mapRowToAttendance(result.rows[0]);
    }

    const result = await query(
      `INSERT INTO attendance_records (employee_id, date, clock_in, status, notes, clock_in_lat, clock_in_lng, clock_in_accuracy, check_in_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [employeeId, today, now, status, notes, latitude ?? null, longitude ?? null, accuracy ?? null, checkInType]
    );

    return this.mapRowToAttendance(result.rows[0]);
  }

  /**
   * Clock out for an employee
   */
  async clockOut(data: ClockOutData): Promise<AttendanceRecord> {
    const { employeeId, notes } = data;

    // Current moment in correct UTC
    const now = new Date();
    // Today's date in Bangkok timezone (YYYY-MM-DD) for the DB date column
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

    // Find today's attendance record (exclude soft-deleted)
    const existing = await query(
      'SELECT * FROM attendance_records WHERE employee_id = $1 AND date = $2 AND deleted_at IS NULL',
      [employeeId, today]
    );

    if (existing.rows.length === 0 || !existing.rows[0].clock_in) {
      throw new BusinessError('Must clock in before clocking out');
    }

    if (existing.rows[0].clock_out) {
      throw new BusinessError('Already clocked out for today');
    }

    const clockIn = new Date(existing.rows[0].clock_in);
    const breakDuration = existing.rows[0].break_duration || 0;
    const totalMinutes = (now.getTime() - clockIn.getTime()) / 1000 / 60 - breakDuration;
    const totalHours = Math.round(totalMinutes / 60 * 100) / 100;

    // Compute overtime and early departure
    const config = await getWorkSchedule();
    const overtimeHours = Math.max(0, Math.round((totalHours - config.standardHours) * 100) / 100);
    const workEndTime = new Date(`${today}T${config.workEnd}:00+07:00`);
    const earlyDeparture = now < workEndTime;

    const status = existing.rows[0].status;

    const result = await query(
      `UPDATE attendance_records
       SET clock_out = $1, total_hours = $2, status = $3, notes = COALESCE($4, notes),
           overtime_hours = $5, early_departure = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [now, totalHours, status, notes, overtimeHours, earlyDeparture, existing.rows[0].id]
    );

    return this.mapRowToAttendance(result.rows[0]);
  }

  /**
   * Get attendance for an employee by date range
   */
  async getAttendanceByEmployee(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceRecord[]> {
    let queryText = 'SELECT * FROM attendance_records WHERE employee_id = $1 AND deleted_at IS NULL';
    const params: unknown[] = [employeeId];
    let paramIndex = 2;

    if (startDate) {
      queryText += ` AND date >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      queryText += ` AND date <= $${paramIndex++}`;
      params.push(endDate);
    }

    queryText += ' ORDER BY date DESC';

    const result = await query(queryText, params);
    return result.rows.map(this.mapRowToAttendance);
  }

  /**
   * Get today's attendance status for an employee
   */
  async getTodayStatus(employeeId: string): Promise<AttendanceRecord | null> {
    // Today's date in Bangkok timezone
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

    const result = await query(
      'SELECT * FROM attendance_records WHERE employee_id = $1 AND date = $2 AND deleted_at IS NULL',
      [employeeId, today]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAttendance(result.rows[0]);
  }

  /**
   * Get attendance summary for a date range
   */
  async getAttendanceSummary(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    onLeaveDays: number;
    totalHours: number;
    overtimeHours: number;
  }> {
    const result = await query(
      `SELECT
        COUNT(*) as total_days,
        COUNT(*) FILTER (WHERE status = 'On-time') as present_days,
        COUNT(*) FILTER (WHERE status = 'Absent') as absent_days,
        COUNT(*) FILTER (WHERE status = 'Late') as late_days,
        COUNT(*) FILTER (WHERE status = 'On-leave') as on_leave_days,
        COALESCE(SUM(total_hours), 0) as total_hours,
        COALESCE(SUM(overtime_hours), 0) as overtime_hours
       FROM attendance_records
       WHERE employee_id = $1 AND date BETWEEN $2 AND $3 AND deleted_at IS NULL`,
      [employeeId, startDate, endDate]
    );

    const row = result.rows[0];
    return {
      totalDays: parseInt(row.total_days, 10),
      presentDays: parseInt(row.present_days, 10),
      absentDays: parseInt(row.absent_days, 10),
      lateDays: parseInt(row.late_days, 10),
      onLeaveDays: parseInt(row.on_leave_days, 10),
      totalHours: parseFloat(row.total_hours),
      overtimeHours: parseFloat(row.overtime_hours),
    };
  }

  // ===========================================================================
  // Admin Methods
  // ===========================================================================

  /**
   * Get today's attendance snapshot counts for admin dashboard
   */
  async adminGetTodaySnapshot(): Promise<AttendanceSnapshot> {
    // Today's date in Bangkok timezone
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

    const result = await query(
      `SELECT
        COUNT(*) FILTER (WHERE clock_in IS NOT NULL) AS present_today,
        COUNT(*) FILTER (WHERE clock_in IS NOT NULL AND clock_out IS NULL) AS active_now,
        COUNT(*) FILTER (WHERE clock_in IS NOT NULL AND clock_out IS NOT NULL) AS checked_out,
        (SELECT COUNT(DISTINCT lr.employee_id)
         FROM leave_requests lr
         JOIN employees e ON lr.employee_id = e.id AND e.status = 'Active'
         WHERE lr.status = 'Approved' AND lr.deleted_at IS NULL
           AND $1::date BETWEEN lr.start_date AND lr.end_date) AS on_leave,
        (SELECT COUNT(*) FROM employees WHERE status = 'Active') AS total
       FROM attendance_records
       WHERE date = $1 AND deleted_at IS NULL`,
      [today]
    );

    const row = result.rows[0];
    const total = parseInt(row.total, 10);
    const presentToday = parseInt(row.present_today, 10);
    const onLeave = parseInt(row.on_leave, 10);
    return {
      total,
      presentToday,
      activeNow: parseInt(row.active_now, 10),
      checkedOut: parseInt(row.checked_out, 10),
      absentOrLeave: Math.max(0, total - presentToday),
      onLeave,
    };
  }

  /**
   * Get paginated attendance for ALL active employees (including those with no record).
   * Uses LEFT JOIN so every employee appears; displayStatus is computed from clock data + leave requests.
   */
  async adminGetAllAttendance(filters: AdminAttendanceFilters): Promise<{
    data: AdminAttendanceRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { search, department, status, startDate, endDate, page = 1, limit = 20 } = filters;

    // $1 = target date used in the LEFT JOINs
    const targetDate = startDate || endDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

    const conditions: string[] = ["e.status = 'Active'"];
    const params: unknown[] = [targetDate];
    let paramIndex = 2;

    if (search) {
      conditions.push(`e.name ILIKE $${paramIndex++}`);
      params.push(`%${search}%`);
    }
    if (department && department !== 'All') {
      conditions.push(`e.department = $${paramIndex++}`);
      params.push(department);
    }

    // Map display-status filter values to SQL conditions
    if (status && status !== 'All') {
      switch (status) {
        case 'Present':
          conditions.push('ar.clock_in IS NOT NULL');
          break;
        case 'Active':
          conditions.push("ar.clock_in IS NOT NULL AND ar.clock_out IS NULL AND ar.status NOT IN ('On-leave','Absent')");
          break;
        case 'Checked Out':
          conditions.push("ar.clock_in IS NOT NULL AND ar.clock_out IS NOT NULL AND ar.status NOT IN ('On-leave','Absent')");
          break;
        case 'On-Leave':
          conditions.push("(ar.status = 'On-leave' OR (ar.id IS NULL AND lr.id IS NOT NULL))");
          break;
        case 'Absent':
          conditions.push("((ar.id IS NULL AND lr.id IS NULL) OR (ar.id IS NOT NULL AND (ar.status = 'Absent' OR (ar.clock_in IS NULL AND ar.status != 'On-leave'))))");
          break;
        case 'Not In':
          conditions.push("(ar.clock_in IS NULL OR ar.status = 'On-leave' OR (ar.id IS NULL AND lr.id IS NOT NULL))");
          break;
        default:
          conditions.push(`ar.status = $${paramIndex++}`);
          params.push(status);
      }
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const fromClause = `
      FROM employees e
      LEFT JOIN attendance_records ar ON ar.employee_id = e.id AND ar.date = $1 AND ar.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT lr2.id FROM leave_requests lr2
        WHERE lr2.employee_id = e.id AND lr2.status = 'Approved'
          AND $1::date BETWEEN lr2.start_date AND lr2.end_date
        LIMIT 1
      ) lr ON true`;

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) AS total ${fromClause} ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Fetch paginated records
    const dataResult = await query(
      `SELECT
        ar.id AS ar_id, ar.date AS ar_date, ar.clock_in, ar.clock_out,
        ar.break_duration, ar.total_hours, ar.status AS ar_status,
        ar.notes, ar.modified_by, ar.created_at AS ar_created_at,
        ar.auto_checkout, ar.early_departure, ar.overtime_hours,
        e.id AS employee_id, e.name AS employee_name,
        e.department AS employee_department, e.avatar AS employee_avatar,
        CASE WHEN lr.id IS NOT NULL THEN true ELSE false END AS is_on_leave
      ${fromClause}
      ${whereClause}
      ORDER BY
        CASE
          WHEN ar.clock_in IS NOT NULL AND ar.clock_out IS NULL THEN 0
          WHEN ar.clock_in IS NOT NULL AND ar.clock_out IS NOT NULL THEN 1
          WHEN lr.id IS NOT NULL OR ar.status = 'On-leave' THEN 2
          ELSE 3
        END,
        e.name ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    const data = dataResult.rows.map((row: Record<string, unknown>): AdminAttendanceRecord => {
      const hasRecord = row.ar_id != null;
      const isOnLeave = row.is_on_leave === true || (hasRecord && row.ar_status === 'On-leave');

      let displayStatus: AdminDisplayStatus;
      if (hasRecord && row.ar_status === 'On-leave') {
        displayStatus = 'On-Leave';
      } else if (hasRecord && row.clock_in && !row.clock_out) {
        displayStatus = 'Active';
      } else if (hasRecord && row.clock_in && row.clock_out) {
        displayStatus = 'Checked Out';
      } else if (isOnLeave) {
        displayStatus = 'On-Leave';
      } else {
        displayStatus = 'Not In';
      }

      return {
        id: (row.ar_id as string) || `absent-${row.employee_id}`,
        employeeId: row.employee_id as string,
        date: (row.ar_date as string) || targetDate,
        clockIn: row.clock_in as string | null,
        clockOut: row.clock_out as string | null,
        breakDuration: (row.break_duration as number) || 0,
        totalHours: row.total_hours as number | null,
        status: (row.ar_status as AttendanceRecord['status']) || (isOnLeave ? 'On-leave' : 'Absent'),
        notes: row.notes as string | null,
        modifiedBy: row.modified_by as string | null,
        createdAt: (row.ar_created_at as Date) || new Date(),
        employeeName: row.employee_name as string,
        employeeDepartment: row.employee_department as string,
        employeeAvatar: row.employee_avatar as string | null,
        displayStatus,
        autoCheckout: row.auto_checkout === true,
        earlyDeparture: row.early_departure === true,
        overtimeHours: row.overtime_hours != null ? parseFloat(row.overtime_hours as string) : null,
        clockInLat: row.clock_in_lat != null ? parseFloat(row.clock_in_lat as string) : null,
        clockInLng: row.clock_in_lng != null ? parseFloat(row.clock_in_lng as string) : null,
        clockInAccuracy: row.clock_in_accuracy != null ? parseFloat(row.clock_in_accuracy as string) : null,
        checkInType: (row.check_in_type as string) || 'office',
      };
    });

    return { data, total, page, limit, totalPages };
  }

  /**
   * Upsert an attendance record (admin manual entry)
   * Bypasses late-threshold and double-clock-in checks
   */
  async adminUpsertAttendance(data: AdminUpsertData): Promise<AttendanceRecord> {
    const { employeeId, date, clockIn, clockOut, status, notes, modifiedBy } = data;

    // Auto-compute totalHours, overtime, early departure when both clock times provided
    let totalHours: number | null = null;
    let overtimeHours: number | null = null;
    let earlyDeparture = false;
    if (clockIn && clockOut) {
      const inTime = new Date(clockIn).getTime();
      const outTime = new Date(clockOut).getTime();
      if (outTime > inTime) {
        totalHours = Math.round((outTime - inTime) / 1000 / 60 / 60 * 100) / 100;
        const config = await getWorkSchedule();
        overtimeHours = Math.max(0, Math.round((totalHours - config.standardHours) * 100) / 100);
        const workEndTime = new Date(`${date}T${config.workEnd}:00+07:00`);
        earlyDeparture = new Date(clockOut) < workEndTime;
      }
    }

    const result = await query(
      `INSERT INTO attendance_records (employee_id, date, clock_in, clock_out, total_hours, status, notes, modified_by, overtime_hours, early_departure)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (employee_id, date)
       DO UPDATE SET
         clock_in = COALESCE($3, attendance_records.clock_in),
         clock_out = COALESCE($4, attendance_records.clock_out),
         total_hours = COALESCE($5, attendance_records.total_hours),
         status = COALESCE($6, attendance_records.status),
         notes = COALESCE($7, attendance_records.notes),
         modified_by = $8,
         overtime_hours = COALESCE($9, attendance_records.overtime_hours),
         early_departure = COALESCE($10, attendance_records.early_departure),
         -- Restore a previously soft-deleted record when admin creates a new entry
         -- for the same employee+date (the unique constraint fires on the same slot)
         deleted_at = NULL,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [employeeId, date, clockIn || null, clockOut || null, totalHours, status || 'On-time', notes || null, modifiedBy, overtimeHours, earlyDeparture]
    );

    return this.mapRowToAttendance(result.rows[0]);
  }

  /**
   * Soft-delete an attendance record by ID.
   * Attendance records (time tracking) must never be permanently removed —
   * they are needed for payroll calculations and labour-law compliance audits.
   */
  async adminDeleteAttendance(recordId: string): Promise<void> {
    const result = await query(
      'UPDATE attendance_records SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [recordId]
    );
    if (result.rowCount === 0) {
      throw new BusinessError('Attendance record not found');
    }
  }

  private mapRowToAttendance(row: Record<string, unknown>): AttendanceRecord {
    return {
      id: row.id as string,
      employeeId: row.employee_id as string,
      date: row.date as string,
      clockIn: row.clock_in as string | null,
      clockOut: row.clock_out as string | null,
      breakDuration: row.break_duration as number,
      totalHours: row.total_hours as number | null,
      status: row.status as AttendanceRecord['status'],
      notes: row.notes as string | null,
      modifiedBy: row.modified_by as string | null,
      createdAt: row.created_at as Date,
      autoCheckout: row.auto_checkout === true,
      earlyDeparture: row.early_departure === true,
      overtimeHours: row.overtime_hours != null ? parseFloat(row.overtime_hours as string) : null,
      clockInLat: row.clock_in_lat != null ? parseFloat(row.clock_in_lat as string) : null,
      clockInLng: row.clock_in_lng != null ? parseFloat(row.clock_in_lng as string) : null,
      clockInAccuracy: row.clock_in_accuracy != null ? parseFloat(row.clock_in_accuracy as string) : null,
      checkInType: (row.check_in_type as string) || 'office',
    };
  }
  /**
   * Get a compact attendance map for a date range (used by the calendar).
   * Returns an array of { employeeId, date } for every record that has a clock_in.
   */
  async getAttendanceCalendarData(
    startDate: string,
    endDate: string
  ): Promise<{ employeeId: string; date: string }[]> {
    const result = await query(
      `SELECT employee_id, date::text
       FROM attendance_records
       WHERE date >= $1 AND date <= $2
         AND clock_in IS NOT NULL
         AND deleted_at IS NULL
       ORDER BY date`,
      [startDate, endDate]
    );

    return result.rows.map((row: Record<string, unknown>) => ({
      employeeId: row.employee_id as string,
      date: row.date as string,
    }));
  }

  async getAnalytics(days: number = 14): Promise<{
    dailyRate: { date: string; present: number; total: number; rate: number; late: number }[];
    topLate: { employeeId: string; name: string; avatar: string | null; lateCount: number }[];
  }> {
    const nowBKK = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    const start = new Date(Date.now() - (days - 1) * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

    const [totalResult, dailyResult, lateResult] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM employees WHERE status = 'Active'`),
      query(
        `SELECT
           ds.date::text,
           COUNT(ar.id) FILTER (WHERE ar.clock_in IS NOT NULL AND ar.status NOT IN ('On-leave','Absent')) AS present,
           COUNT(ar.id) FILTER (WHERE ar.status = 'Late') AS late
         FROM generate_series($1::date, $2::date, '1 day'::interval) AS ds(date)
         LEFT JOIN attendance_records ar ON ar.date = ds.date AND ar.deleted_at IS NULL
         GROUP BY ds.date
         ORDER BY ds.date ASC`,
        [start, nowBKK]
      ),
      query(
        `SELECT e.id AS employee_id, e.name, e.avatar, COUNT(*) AS late_count
         FROM attendance_records ar
         JOIN employees e ON ar.employee_id = e.id
         WHERE ar.status = 'Late' AND ar.date >= $1 AND ar.deleted_at IS NULL
         GROUP BY e.id, e.name, e.avatar
         ORDER BY late_count DESC
         LIMIT 5`,
        [monthStart]
      ),
    ]);

    const total = parseInt(totalResult.rows[0].total, 10);

    const dailyRate = dailyResult.rows.map((row) => {
      const present = parseInt(row.present, 10);
      return {
        date: row.date as string,
        present,
        total,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
        late: parseInt(row.late, 10),
      };
    });

    const topLate = lateResult.rows.map((row) => ({
      employeeId: row.employee_id as string,
      name: row.name as string,
      avatar: row.avatar as string | null,
      lateCount: parseInt(row.late_count, 10),
    }));

    return { dailyRate, topLate };
  }
}

export default new AttendanceService();
