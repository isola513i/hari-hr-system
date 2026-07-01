import { describe, it, expect } from 'vitest';
import { getLeaveColor, buildLeaveColorMap, COLOR_PALETTE } from '../leaveTypeConfig';

describe('getLeaveColor', () => {
  it('prefers the color supplied by config', () => {
    const configs = [{ type: 'Custom', color: 'blue' }] as any;
    expect(getLeaveColor('Custom', configs)).toBe(COLOR_PALETTE.blue);
  });

  it('falls back to the legacy color map by type name', () => {
    // "Vacation" → blue, "Sick Leave" → amber in the legacy map
    expect(getLeaveColor('Vacation')).toBe(COLOR_PALETTE.blue);
    expect(getLeaveColor('Sick Leave')).toBe(COLOR_PALETTE.amber);
  });

  it('ignores a config color that is not in the palette', () => {
    const configs = [{ type: 'Vacation', color: 'not-a-color' }] as any;
    // invalid config color → legacy fallback (Vacation → blue)
    expect(getLeaveColor('Vacation', configs)).toBe(COLOR_PALETTE.blue);
  });

  it('returns a default palette entry for an unknown type', () => {
    const result = getLeaveColor('Totally Unknown Type');
    expect(result).toHaveProperty('bar');
  });
});

describe('buildLeaveColorMap', () => {
  it('maps every configured type to a color-class object', () => {
    const configs = [
      { type: 'Vacation', color: 'blue' },
      { type: 'Sick Leave', color: 'amber' },
    ] as any;
    const map = buildLeaveColorMap(configs);
    expect(Object.keys(map)).toEqual(['Vacation', 'Sick Leave']);
    expect(map['Vacation']).toBe(COLOR_PALETTE.blue);
    expect(map['Sick Leave']).toBe(COLOR_PALETTE.amber);
  });

  it('returns an empty map for empty configs', () => {
    expect(buildLeaveColorMap([])).toEqual({});
  });
});
