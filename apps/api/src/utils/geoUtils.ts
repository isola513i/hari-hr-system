const EARTH_RADIUS_METERS = 6_371_000;

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.asin(Math.sqrt(a));
}

export function isWithinGeofence(
  lat: number,
  lng: number,
  officeLat: number,
  officeLng: number,
  radiusMeters: number
): boolean {
  return haversineDistance(lat, lng, officeLat, officeLng) <= radiusMeters;
}

/**
 * Largest GPS-accuracy allowance (in metres) that may be added to the geofence
 * radius. Caps how much a poor/forged accuracy reading can widen the boundary.
 */
export const MAX_ACCURACY_ALLOWANCE_METERS = 100;

/**
 * Effective geofence radius once the device's reported GPS accuracy is taken
 * into account. A user sitting on the boundary with a ±50m fix should not be
 * rejected, so we widen the radius by the accuracy — capped to avoid abuse.
 */
export function effectiveRadiusWithAccuracy(radiusMeters: number, accuracyMeters?: number | null): number {
  const allowance = Math.min(Math.max(accuracyMeters ?? 0, 0), MAX_ACCURACY_ALLOWANCE_METERS);
  return radiusMeters + allowance;
}

/**
 * Geofence check that tolerates GPS inaccuracy: the point passes if it falls
 * within the radius widened by the (capped) reported accuracy.
 */
export function isWithinGeofenceWithAccuracy(
  lat: number,
  lng: number,
  officeLat: number,
  officeLng: number,
  radiusMeters: number,
  accuracyMeters?: number | null
): boolean {
  return (
    haversineDistance(lat, lng, officeLat, officeLng) <=
    effectiveRadiusWithAccuracy(radiusMeters, accuracyMeters)
  );
}
