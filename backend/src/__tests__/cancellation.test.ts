import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculateRefundRate, calculateRefundAmount, getRefundDates } from '../lib/cancellation.js';

describe('calculateRefundRate', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('7日以上前は100%返金', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));

    const checkIn = new Date('2026-03-10T00:00:00Z'); // 9日後
    expect(calculateRefundRate(checkIn)).toBe(1.0);
  });

  it('ちょうど7日前は100%返金', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-03T00:00:00Z'));

    const checkIn = new Date('2026-03-10T00:00:00Z'); // 7日後
    expect(calculateRefundRate(checkIn)).toBe(1.0);
  });

  it('3〜6日前は50%返金', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-05T12:00:00Z'));

    const checkIn = new Date('2026-03-10T00:00:00Z'); // ~5日後
    expect(calculateRefundRate(checkIn)).toBe(0.5);
  });

  it('ちょうど3日前は50%返金', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T00:00:00Z'));

    const checkIn = new Date('2026-03-10T00:00:00Z'); // 3日後
    expect(calculateRefundRate(checkIn)).toBe(0.5);
  });

  it('2日前は返金なし', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-08T12:00:00Z'));

    const checkIn = new Date('2026-03-10T00:00:00Z'); // ~2日後
    expect(calculateRefundRate(checkIn)).toBe(0);
  });

  it('当日は返金なし', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T06:00:00Z'));

    const checkIn = new Date('2026-03-10T00:00:00Z'); // 当日
    expect(calculateRefundRate(checkIn)).toBe(0);
  });

  it('チェックイン日が過去の場合は返金なし', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-12T00:00:00Z'));

    const checkIn = new Date('2026-03-10T00:00:00Z'); // 2日前
    expect(calculateRefundRate(checkIn)).toBe(0);
  });
});

describe('calculateRefundAmount', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('100%返金の場合、全額返金', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T00:00:00Z'));

    const checkIn = new Date('2026-03-15T00:00:00Z');
    expect(calculateRefundAmount(25000, checkIn)).toBe(25000);
  });

  it('50%返金の場合、半額返金（切り捨て）', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-12T00:00:00Z'));

    const checkIn = new Date('2026-03-15T00:00:00Z'); // 3日後
    expect(calculateRefundAmount(25001, checkIn)).toBe(12500); // Math.floor
  });

  it('0%返金の場合、0円', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-14T00:00:00Z'));

    const checkIn = new Date('2026-03-15T00:00:00Z'); // 1日後
    expect(calculateRefundAmount(25000, checkIn)).toBe(0);
  });
});

describe('getRefundDates', () => {
  it('正しいデッドラインを計算する', () => {
    const checkIn = new Date('2026-03-20T00:00:00Z');
    const { fullRefundDeadline, halfRefundDeadline, noRefundStart } = getRefundDates(checkIn);

    expect(fullRefundDeadline.toISOString()).toBe('2026-03-13T00:00:00.000Z');
    expect(halfRefundDeadline.toISOString()).toBe('2026-03-17T00:00:00.000Z');
    expect(noRefundStart.toISOString()).toBe('2026-03-18T00:00:00.000Z');
  });
});
