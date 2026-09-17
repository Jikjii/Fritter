import { daysUntil, estimateOwed, formatMoney, formatRange, isPastDeadline, midpoint } from '../estimate';
import type { Opportunity } from '../types';

const mk = (over: Partial<Opportunity>): Opportunity => ({
  id: over.id ?? 'x',
  title: 'X',
  company: 'Co',
  category: 'settlement',
  summary: '',
  whoQualifies: '',
  eligibility: [{ profileKey: 'country', operator: 'equals', value: 'US' }],
  estimatedPayoutMin: 100,
  estimatedPayoutMax: 300,
  deadline: 'rolling',
  proofRequired: '',
  claimMethod: 'online_form',
  confidence: 'verified_current',
  confidenceNote: '',
  formTemplateId: 'settlement_claim',
  updatedAt: '2026-01-01',
  ...over,
});

describe('estimateOwed', () => {
  it('sums midpoints of likely + possible, low only from likely, high from both', () => {
    const catalog = [
      mk({ id: 'likely', category: 'settlement' }), // likely: mid 200, min 100, max 300
      mk({ id: 'possible', category: 'refund', eligibility: [{ profileKey: 'country', operator: 'equals', value: 'US' }, { profileKey: 'services', operator: 'includes', value: 'x' }], estimatedPayoutMin: 10, estimatedPayoutMax: 30 }), // possible: mid 20
      mk({ id: 'unlikely', eligibility: [{ profileKey: 'country', operator: 'equals', value: 'JP' }] }),
    ];
    const e = estimateOwed(catalog, { country: 'US' });
    expect(e.total).toBe(220);
    expect(e.low).toBe(100);
    expect(e.high).toBe(330);
    expect(e.likelyCount).toBe(1);
    expect(e.possibleCount).toBe(1);
    expect(e.byCategory.settlement).toBe(200);
    expect(e.byCategory.refund).toBe(20);
    expect(e.byCategory.travel).toBe(0);
  });

  it('ignores closed (verified_past) and past-deadline items', () => {
    const catalog = [
      mk({ id: 'closed', confidence: 'verified_past' }),
      mk({ id: 'expired', deadline: '2000-01-01' }),
      mk({ id: 'open' }),
    ];
    const e = estimateOwed(catalog, { country: 'US' });
    expect(e.total).toBe(200);
    expect(e.likelyCount).toBe(1);
  });

  it('is zero with an empty profile', () => {
    expect(estimateOwed([mk({})], {}).total).toBe(0);
  });
});

describe('deadline helpers', () => {
  const now = new Date('2026-09-17T12:00:00Z');
  it('isPastDeadline', () => {
    expect(isPastDeadline('2026-09-16', now)).toBe(true);
    expect(isPastDeadline('2026-09-17', now)).toBe(false);
    expect(isPastDeadline('rolling', now)).toBe(false);
    expect(isPastDeadline('unknown', now)).toBe(false);
    expect(isPastDeadline('garbage', now)).toBe(false);
  });
  it('daysUntil', () => {
    expect(daysUntil('2026-09-27', now)).toBe(11);
    expect(daysUntil('rolling', now)).toBeNull();
    expect(daysUntil('2026-09-10', now)).toBeLessThan(0);
  });
});

describe('formatting', () => {
  it('midpoint rounds', () => expect(midpoint({ estimatedPayoutMin: 10, estimatedPayoutMax: 25 })).toBe(18));
  it('formatMoney', () => {
    expect(formatMoney(1234)).toBe('$1,234');
    expect(formatMoney(1500, { compact: true })).toBe('$1.5k');
    expect(formatMoney(2000, { compact: true })).toBe('$2k');
    expect(formatMoney(999, { compact: true })).toBe('$999');
  });
  it('formatRange', () => {
    expect(formatRange({ estimatedPayoutMin: 10, estimatedPayoutMax: 50 })).toBe('$10–$50');
    expect(formatRange({ estimatedPayoutMin: 50, estimatedPayoutMax: 50 })).toBe('$50');
  });
});
