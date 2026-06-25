import {
  haversineDistance,
  isWithinGeofence,
  isWithinGeofenceWithAccuracy,
  effectiveRadiusWithAccuracy,
  MAX_ACCURACY_ALLOWANCE_METERS,
} from '../../utils/geoUtils';

// Bangkok office reference point
const OFFICE_LAT = 13.7563;
const OFFICE_LNG = 100.5018;

describe('geoUtils', () => {
  describe('haversineDistance', () => {
    it('is ~0 for the same point', () => {
      expect(haversineDistance(OFFICE_LAT, OFFICE_LNG, OFFICE_LAT, OFFICE_LNG)).toBeCloseTo(0, 5);
    });

    it('is symmetric', () => {
      const a = haversineDistance(OFFICE_LAT, OFFICE_LNG, 13.76, 100.51);
      const b = haversineDistance(13.76, 100.51, OFFICE_LAT, OFFICE_LNG);
      expect(a).toBeCloseTo(b, 6);
    });
  });

  describe('effectiveRadiusWithAccuracy', () => {
    it('returns the bare radius when accuracy is missing', () => {
      expect(effectiveRadiusWithAccuracy(200, undefined)).toBe(200);
      expect(effectiveRadiusWithAccuracy(200, null)).toBe(200);
    });

    it('adds the accuracy to the radius', () => {
      expect(effectiveRadiusWithAccuracy(200, 40)).toBe(240);
    });

    it('caps the accuracy allowance to prevent abuse', () => {
      expect(effectiveRadiusWithAccuracy(200, 5000)).toBe(200 + MAX_ACCURACY_ALLOWANCE_METERS);
    });

    it('ignores negative accuracy', () => {
      expect(effectiveRadiusWithAccuracy(200, -30)).toBe(200);
    });
  });

  describe('isWithinGeofenceWithAccuracy', () => {
    // a point ~230m north of the office (≈0.00207 deg latitude)
    const NEAR_LAT = OFFICE_LAT + 0.00207;
    const radius = 200;

    it('rejects a boundary point when accuracy is unknown (same as strict check)', () => {
      const strict = isWithinGeofence(NEAR_LAT, OFFICE_LNG, OFFICE_LAT, OFFICE_LNG, radius);
      const lenient = isWithinGeofenceWithAccuracy(NEAR_LAT, OFFICE_LNG, OFFICE_LAT, OFFICE_LNG, radius);
      expect(lenient).toBe(strict);
      expect(lenient).toBe(false);
    });

    it('accepts the same boundary point once a generous GPS accuracy is supplied', () => {
      const lenient = isWithinGeofenceWithAccuracy(NEAR_LAT, OFFICE_LNG, OFFICE_LAT, OFFICE_LNG, radius, 80);
      expect(lenient).toBe(true);
    });

    it('still rejects a point far outside even with capped accuracy', () => {
      const farLat = OFFICE_LAT + 0.02; // ~2.2km away
      expect(isWithinGeofenceWithAccuracy(farLat, OFFICE_LNG, OFFICE_LAT, OFFICE_LNG, radius, 5000)).toBe(false);
    });
  });
});
