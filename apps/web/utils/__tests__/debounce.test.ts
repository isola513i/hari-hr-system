import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, throttle } from '../debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should delay function execution', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 300);

    debouncedFn('test');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledWith('test');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should cancel previous calls', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 300);

    debouncedFn('first');
    vi.advanceTimersByTime(100);

    debouncedFn('second');
    vi.advanceTimersByTime(100);

    debouncedFn('third');
    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('third');
  });

  it('should work with multiple arguments', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn('arg1', 'arg2', 'arg3');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute function immediately on first call', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 300);

    throttledFn('test');
    expect(fn).toHaveBeenCalledWith('test');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('runs immediately then throttles a following call into a trailing run', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 300);

    throttledFn('first');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith('first');

    throttledFn('second'); // within window → scheduled as trailing, not run yet
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(300); // trailing call fires with the first throttled arg
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('second');
  });

  it('trailing call uses the first throttled arg (leading throttle)', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 300);

    throttledFn('first');  // runs immediately
    throttledFn('second'); // scheduled as the trailing call
    throttledFn('third');  // ignored — a trailing call is already scheduled

    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('second');
  });
});
