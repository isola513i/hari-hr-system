import {
  AttendanceService,
  clearGPSConfigCache,
  clearWorkScheduleCache,
} from '../../services/AttendanceService';
import { query } from '../../db';
import WFHRequestService from '../../services/WFHRequestService';

jest.mock('../../services/WFHRequestService', () => ({
  __esModule: true,
  default: { hasApprovedWFH: jest.fn().mockResolvedValue(false) },
}));

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedHasWFH = WFHRequestService.hasApprovedWFH as jest.Mock;

// Office at Bangkok city center; "far" point is ~13 km away (well outside 200m).
const OFFICE_LAT = 13.7563;
const OFFICE_LNG = 100.5018;
const FAR_LAT = 13.8700;
const FAR_LNG = 100.6200;

const gpsConfigRows = (gpsRequired: boolean) => ({
  rows: [
    { key: 'office_lat', value: String(OFFICE_LAT) },
    { key: 'office_lng', value: String(OFFICE_LNG) },
    { key: 'geofence_radius', value: '200' },
    { key: 'gps_required', value: gpsRequired ? 'true' : 'false' },
  ],
  rowCount: 4,
});

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(() => {
    service = new AttendanceService();
    jest.clearAllMocks();
    clearGPSConfigCache();
    clearWorkScheduleCache();
    mockedHasWFH.mockResolvedValue(false);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('clockIn — late/on-time', () => {
    it('records On-time when before the 09:00 threshold', async () => {
      // 08:00 Bangkok (01:00 UTC)
      jest.setSystemTime(new Date('2026-06-22T01:00:00Z'));
      mockedQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // existing check
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // getGPSConfig (gpsRequired=false)
        .mockResolvedValueOnce({ rows: [{ work_type: 'office' }], rowCount: 1 } as never) // work_type
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // getWorkSchedule (defaults)
        .mockResolvedValueOnce({ rows: [{ id: 'att-1', status: 'On-time', check_in_type: 'office' }], rowCount: 1 } as never); // INSERT

      await service.clockIn({ employeeId: 'emp-1' });

      const insertCall = mockedQuery.mock.calls[4];
      expect(insertCall[0]).toContain('INSERT INTO attendance_records');
      expect((insertCall[1] as unknown[])[3]).toBe('On-time'); // status param
      expect((insertCall[1] as unknown[])[8]).toBe('office'); // check_in_type param
    });

    it('records Late when after the 09:00 threshold', async () => {
      // 11:00 Bangkok (04:00 UTC)
      jest.setSystemTime(new Date('2026-06-22T04:00:00Z'));
      mockedQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [{ work_type: 'office' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
        .mockResolvedValueOnce({ rows: [{ id: 'att-1', status: 'Late' }], rowCount: 1 } as never);

      await service.clockIn({ employeeId: 'emp-1' });

      expect((mockedQuery.mock.calls[4][1] as unknown[])[3]).toBe('Late');
    });
  });

  describe('clockIn — GPS geofence', () => {
    it('rejects an office worker checking in from outside the geofence', async () => {
      jest.setSystemTime(new Date('2026-06-22T01:00:00Z'));
      mockedQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // existing
        .mockResolvedValueOnce(gpsConfigRows(true) as never) // gps required
        .mockResolvedValueOnce({ rows: [{ work_type: 'office' }], rowCount: 1 } as never); // work_type

      await expect(
        service.clockIn({ employeeId: 'emp-1', latitude: FAR_LAT, longitude: FAR_LNG }),
      ).rejects.toThrow(/from the office/);

      expect(mockedHasWFH).toHaveBeenCalled();
    });

    it('allows an office worker within the geofence', async () => {
      jest.setSystemTime(new Date('2026-06-22T01:00:00Z'));
      mockedQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // existing
        .mockResolvedValueOnce(gpsConfigRows(true) as never) // gps required
        .mockResolvedValueOnce({ rows: [{ work_type: 'office' }], rowCount: 1 } as never) // work_type
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // getWorkSchedule
        .mockResolvedValueOnce({ rows: [{ id: 'att-1', status: 'On-time', check_in_type: 'office' }], rowCount: 1 } as never); // INSERT

      const result = await service.clockIn({
        employeeId: 'emp-1',
        latitude: OFFICE_LAT + 0.0005, // ~55m away — within 200m
        longitude: OFFICE_LNG,
      });

      expect(result.checkInType).toBe('office');
      expect((mockedQuery.mock.calls[4][1] as unknown[])[8]).toBe('office');
    });

    it('rejects a duplicate active clock-in', async () => {
      jest.setSystemTime(new Date('2026-06-22T01:00:00Z'));
      mockedQuery.mockResolvedValueOnce({
        rows: [{ id: 'att-1', clock_in: '2026-06-22T01:00:00Z', clock_out: null }],
        rowCount: 1,
      } as never);

      await expect(service.clockIn({ employeeId: 'emp-1' })).rejects.toThrow('Already clocked in');
      expect(mockedQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('clockOut', () => {
    it('computes total hours and overtime', async () => {
      // clock in 08:00, clock out 17:00 BKK → 9h worked, 1h OT over 8h standard
      jest.setSystemTime(new Date('2026-06-22T10:00:00Z')); // 17:00 BKK
      mockedQuery
        .mockResolvedValueOnce({
          rows: [{ id: 'att-1', clock_in: '2026-06-22T01:00:00Z', clock_out: null, break_duration: 0, status: 'On-time' }],
          rowCount: 1,
        } as never) // existing
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never) // getWorkSchedule (8h standard)
        .mockResolvedValueOnce({ rows: [{ id: 'att-1', total_hours: 9, overtime_hours: '1', status: 'On-time' }], rowCount: 1 } as never); // UPDATE

      await service.clockOut({ employeeId: 'emp-1' });

      const updateParams = mockedQuery.mock.calls[2][1] as unknown[];
      expect(updateParams[1]).toBeCloseTo(9); // total_hours
      expect(updateParams[4]).toBeCloseTo(1); // overtime_hours
    });

    it('rejects clock-out without a prior clock-in', async () => {
      jest.setSystemTime(new Date('2026-06-22T10:00:00Z'));
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await expect(service.clockOut({ employeeId: 'emp-1' })).rejects.toThrow('Must clock in before');
    });
  });
});
