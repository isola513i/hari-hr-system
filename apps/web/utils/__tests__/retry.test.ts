import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithBackoff, retryable } from '../retry';

// retryWithBackoff only retries errors it deems retryable: GET method + a
// retryable HTTP status. Build errors that carry a retryable response.status.
const retryableError = (msg: string) => {
  const e: any = new Error(msg);
  e.response = { status: 503 };
  return e;
};

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Remove jitter so backoff delays are deterministic (1000, 2000, ...).
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns result on first success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const promise = retryWithBackoff(fn, { maxRetries: 3 });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries retryable failures then succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(retryableError('fail 1'))
      .mockRejectedValueOnce(retryableError('fail 2'))
      .mockResolvedValue('ok');
    const onRetry = vi.fn();
    const promise = retryWithBackoff(fn, { maxRetries: 3, initialDelay: 100, onRetry });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting max retries', async () => {
    const fn = vi.fn().mockRejectedValue(retryableError('persistent'));
    const promise = retryWithBackoff(fn, { maxRetries: 2, initialDelay: 100 });
    // Attach a rejection handler up front so the run doesn't surface as unhandled.
    const assertion = expect(promise).rejects.toThrow('persistent');
    await vi.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('does NOT retry a non-retryable error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('plain error'));
    const promise = retryWithBackoff(fn, { maxRetries: 3, initialDelay: 100 });
    const assertion = expect(promise).rejects.toThrow('plain error');
    await vi.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(1); // thrown immediately, no retry
  });

  it('uses exponential backoff timing', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(retryableError('fail 1'))
      .mockRejectedValueOnce(retryableError('fail 2'))
      .mockResolvedValue('ok');
    const promise = retryWithBackoff(fn, { maxRetries: 3, initialDelay: 1000, backoffMultiplier: 2 });
    promise.catch(() => {});
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000); // first retry at 1000ms
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2000); // second retry at +2000ms
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('retryable', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('wraps a function and forwards its arguments', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(retryableError('fail'))
      .mockResolvedValue('ok');
    const wrapped = retryable(fn, { maxRetries: 2, initialDelay: 100 });
    const promise = wrapped('a', 'b');
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledWith('a', 'b');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
