import {
  daysUntil,
  estimateOwed,
  formatMoney,
  formatRange,
  isPastDeadline,
  isSummable,
  midpoint,
  payoutLabel,
  statusBadge,
} from '../estimate';
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
  payoutKind: 'cash',
  deadline: 'rolling',
  proofRequired: '',
  claimMethod: 'online_form',
  confidence: 'verified_current',
  confidenceNote: '',
  formTemplateId: 'settlement_claim',
  updatedAt: '2026-09-15',
  ...over,
});

const NOW = new Date('2026-09-20T12:00:00Z');

describe('estimateOwed', () => {
  it('sums maxima of likely + possible summable items, low only from likely', () => {
    const catalog = [
      mk({ id: 'likely', category: 'settlement' }), // likely: max 300, min 100
      mk({
        id: 'possible',
        category: 'refund',
        eligibility: [
          { profileKey: 'country', operator: 'equals', value: 'US' },
          { profileKey: 'services', operator: 'includes', value: 'x' },
        ],
        estimatedPayoutMin: 10,
        estimatedPayoutMax: 30,
      }), // possible: max 30
      mk({
        id: 'unlikely',
        eligibility: [{ profileKey: 'country', operator: 'equals', value: 'JP' }],
      }),
    ];
    const e = estimateOwed(catalog, { country: 'US' }, NOW);
    expect(e.total).toBe(330);
    expect(e.low).toBe(100);
    expect(e.high).toBe(330);
    expect(e.likelyCount).toBe(1);
    expect(e.possibleCount).toBe(1);
    expect(e.matchCount).toBe(2);
    expect(e.sumCount).toBe(2);
    expect(e.byCategory.settlement).toBe(300);
    expect(e.byCategory.refund).toBe(30);
    expect(e.byCategory.travel).toBe(0);
  });

  it('ignores closed (verified_past, status closed) and past-deadline items', () => {
    const catalog = [
      mk({ id: 'closed', confidence: 'verified_past' }),
      mk({ id: 'closed2', status: 'closed' }),
      mk({ id: 'expired', deadline: '2000-01-01' }),
      mk({ id: 'open' }),
    ];
    const e = estimateOwed(catalog, { country: 'US' }, NOW);
    expect(e.total).toBe(300);
    expect(e.likelyCount).toBe(1);
    expect(e.matchCount).toBe(1);
  });

  it('counts but never sums watching, unverified, equals_paid, statutory_cap or non_cash items', () => {
    const catalog = [
      mk({ id: 'watch', status: 'watching', estimatedPayoutMin: 0, estimatedPayoutMax: 0 }),
      mk({ id: 'unverified', confidence: 'plausible_unverified' }),
      mk({ id: 'illustrative', confidence: 'illustrative' }),
      mk({ id: 'refund', payoutKind: 'equals_paid', estimatedPayoutMax: 400 }),
      mk({ id: 'cap', payoutKind: 'statutory_cap', estimatedPayoutMax: 4700 }),
      mk({ id: 'repair', payoutKind: 'non_cash' }),
      mk({ id: 'credit', payoutKind: 'credit', estimatedPayoutMin: 1, estimatedPayoutMax: 33.66 }),
    ];
    const e = estimateOwed(catalog, { country: 'US' }, NOW);
    expect(e.total).toBeCloseTo(33.66);
    expect(e.sumCount).toBe(1);
    expect(e.matchCount).toBe(7);
    expect(e.watchCount).toBe(1);
    expect(e.equalsPaidCount).toBe(2);
    expect(isSummable(mk({ payoutKind: 'non_cash' }), NOW)).toBe(false);
    expect(isSummable(mk({ status: 'watching', estimatedPayoutMax: 0 }), NOW)).toBe(false);
  });

  it('is zero with an empty profile', () => {
    expect(estimateOwed([mk({})], {}, NOW).total).toBe(0);
  });
});

describe('payoutLabel / statusBadge', () => {
  it('renders honest labels per kind and status', () => {
    expect(
      payoutLabel(mk({ status: 'watching', estimatedPayoutMax: 0, estimatedPayoutMin: 0 }), NOW)
    ).toBe('$0 today');
    expect(payoutLabel(mk({ confidence: 'illustrative' }), NOW)).toBe('Amount TBD');
    expect(payoutLabel(mk({ confidence: 'plausible_unverified' }), NOW)).toBe('Amount TBD');
    expect(payoutLabel(mk({}), NOW)).toBe('$100–$300');
    expect(
      payoutLabel(
        mk({ estimatedPayoutMin: 0.91, estimatedPayoutMax: 33.66, payoutKind: 'credit' }),
        NOW
      )
    ).toBe('$0.91–$33.66');
    expect(payoutLabel(mk({ payoutKind: 'equals_paid', estimatedPayoutMax: 400 }), NOW)).toBe(
      'What you paid · up to $400'
    );
    expect(
      payoutLabel(
        mk({ payoutKind: 'equals_paid', estimatedPayoutMin: 0, estimatedPayoutMax: 0 }),
        NOW
      )
    ).toBe('What you paid');
    expect(payoutLabel(mk({ payoutKind: 'statutory_cap', estimatedPayoutMax: 4700 }), NOW)).toBe(
      'Up to $4,700 · legal cap'
    );
    expect(
      payoutLabel(
        mk({ payoutKind: 'non_cash', estimatedPayoutMin: 40, estimatedPayoutMax: 80 }),
        NOW
      )
    ).toBe('Free fix · ~$40–$80 value');
    expect(
      payoutLabel(
        mk({ confidence: 'verified_past', estimatedPayoutMin: 30, estimatedPayoutMax: 30 }),
        NOW
      )
    ).toBe('$30');
  });
  it('status badge precedence: closed > watching > automatic > open', () => {
    expect(statusBadge(mk({ status: 'watching', deadline: '2000-01-01' }), NOW)).toBe('closed');
    expect(statusBadge(mk({ status: 'watching', claimMethod: 'automatic' }), NOW)).toBe('watching');
    expect(statusBadge(mk({ claimMethod: 'automatic' }), NOW)).toBe('automatic');
    expect(statusBadge(mk({}), NOW)).toBe('open');
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
  it('midpoint rounds', () =>
    expect(midpoint({ estimatedPayoutMin: 10, estimatedPayoutMax: 25 })).toBe(18));
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
