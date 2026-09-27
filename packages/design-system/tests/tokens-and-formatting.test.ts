import { describe, expect, it } from 'vitest';
import { colors, semanticStatusStyles, formatPaiseToInr, formatApproximatePaise, typography, radii, touchTargets } from '../src/index.js';

describe('Design Tokens', () => {
  it('defines the core Deep Forest and Impact Green color palette', () => {
    expect(colors.forest[900]).toBe('#0B2E23');
    expect(colors.forest[700]).toBe('#14513C');
    expect(colors.green[500]).toBe('#2FBF71');
    expect(colors.green[400]).toBe('#4FD68C');
    expect(colors.ash[100]).toBe('#F4F6F5');
    expect(colors.carbon[800]).toBe('#1A1D1C');
  });

  it('provides complete semantic status styles with contrast and dot colors', () => {
    const statuses = ['success', 'warning', 'danger', 'info', 'neutral'] as const;
    for (const status of statuses) {
      const style = semanticStatusStyles[status];
      expect(style).toBeDefined();
      expect(style.bg).toMatch(/^#/);
      expect(style.text).toMatch(/^#/);
      expect(style.dotColor).toMatch(/^#/);
    }
  });

  it('configures accessibility touch targets meeting WCAG guidelines', () => {
    expect(touchTargets.webMin).toBeGreaterThanOrEqual(44);
    expect(touchTargets.collectorCta).toBeGreaterThanOrEqual(56);
  });

  it('defines Inter typography scales for both mobile and web density', () => {
    expect(typography.fontFamily).toContain('Inter');
    expect(typography.density.collector.numeric.fontSize).toBe('2.5rem');
    expect(typography.density.web.numeric.fontVariantNumeric).toBe('tabular-nums');
  });

  it('defines required component radii', () => {
    expect(radii.card).toBe('0.75rem');
    expect(radii.pill).toBe('9999px');
  });
});

describe('formatPaiseToInr', () => {
  it('correctly divides integer paise into rupees', () => {
    expect(formatPaiseToInr(100)).toBe('INR 1.00');
    expect(formatPaiseToInr(0)).toBe('INR 0.00');
    expect(formatPaiseToInr(50)).toBe('INR 0.50');
  });

  it('formats large numbers using standard Indian grouping (Lakh/Crore)', () => {
    // 10 lakh paise = 10,000.00 rupees
    expect(formatPaiseToInr(1_000_000)).toBe('INR 10,000.00');
    // 99999999 paise = 9,99,999.99 rupees
    expect(formatPaiseToInr(99_999_999)).toBe('INR 9,99,999.99');
  });

  it('handles negative balances cleanly', () => {
    expect(formatPaiseToInr(-2500)).toBe('-INR 25.00');
  });
});

describe('formatApproximatePaise', () => {
  it('formats whole rupees prefixed with Around ₹', () => {
    expect(formatApproximatePaise(210_000)).toBe('Around ₹2,100');
    expect(formatApproximatePaise(14_000)).toBe('Around ₹140');
    expect(formatApproximatePaise(0)).toBe('Around ₹0');
  });

  it('formats large approximate values with Indian grouping', () => {
    expect(formatApproximatePaise(100_000_00)).toBe('Around ₹1,00,000');
  });
});
