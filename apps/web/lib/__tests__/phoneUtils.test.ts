import { describe, it, expect } from 'vitest';
import { parsePhoneNumber, PHONE_COUNTRY_CODES } from '../phoneUtils';

describe('parsePhoneNumber', () => {
  it('defaults to +66 with empty number for falsy input', () => {
    expect(parsePhoneNumber('')).toEqual({ code: '+66', number: '' });
  });

  it('splits a known country code from the number', () => {
    expect(parsePhoneNumber('+66812345678')).toEqual({ code: '+66', number: '812345678' });
    expect(parsePhoneNumber('+14155550123')).toEqual({ code: '+1', number: '4155550123' });
    expect(parsePhoneNumber('+442071234567')).toEqual({ code: '+44', number: '2071234567' });
  });

  it('trims whitespace after the code', () => {
    expect(parsePhoneNumber('+66 812345678')).toEqual({ code: '+66', number: '812345678' });
  });

  it('falls back to +66 and keeps the raw value when no + prefix', () => {
    expect(parsePhoneNumber('0812345678')).toEqual({ code: '+66', number: '0812345678' });
  });

  it('falls back to +66 when the code is unknown', () => {
    // +99 is not in the known list → treated as the whole number under +66
    expect(parsePhoneNumber('+99123')).toEqual({ code: '+66', number: '+99123' });
  });

  it('exposes a non-empty country-code list with +66 first', () => {
    expect(PHONE_COUNTRY_CODES.length).toBeGreaterThan(0);
    expect(PHONE_COUNTRY_CODES[0].value).toBe('+66');
  });
});
