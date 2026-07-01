import { describe, it, expect } from 'vitest';
import { getStatusStyle } from '../attendanceStatusStyles';

describe('getStatusStyle', () => {
  it('maps each known status to a distinct dot colour', () => {
    expect(getStatusStyle('Active').dot).toBe('bg-green-500');
    expect(getStatusStyle('Checked Out').dot).toBe('bg-blue-500');
    expect(getStatusStyle('On-Leave').dot).toBe('bg-purple-500');
    expect(getStatusStyle('Not In').dot).toBe('bg-orange-400');
  });

  it('returns both dot and badge classes for a known status', () => {
    const style = getStatusStyle('Active');
    expect(style).toHaveProperty('dot');
    expect(style).toHaveProperty('badge');
    expect(style.badge).toContain('green');
  });

  it('falls back to gray for an unknown status', () => {
    expect(getStatusStyle('Something Else').dot).toBe('bg-gray-500');
    expect(getStatusStyle('').badge).toContain('gray');
  });
});
