import { act, renderHook } from '@testing-library/react';
import { formatAge, useFreshness } from './useFreshness';

describe('formatAge', () => {
  it('renders sub-minute ages in seconds', () => {
    expect(formatAge(0)).toBe('0s ago');
    expect(formatAge(59)).toBe('59s ago');
  });

  it('renders longer ages in minutes and seconds', () => {
    expect(formatAge(60)).toBe('1m 0s ago');
    expect(formatAge(125)).toBe('2m 5s ago');
  });
});

describe('useFreshness', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('ticks locally and resets when the watched value changes', () => {
    const { result, rerender } = renderHook(({ value }) => useFreshness(value), {
      initialProps: { value: { summary: 1 } },
    });

    expect(result.current).toBe(0);

    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current).toBe(3);

    // A new summary object re-anchors the timer.
    rerender({ value: { summary: 2 } });
    expect(result.current).toBe(0);
  });
});
