import { evaluateEligibility, evaluateRule, rankOpportunities } from '../eligibility';
import type { Opportunity, UserProfile } from '../types';

const base: Opportunity = {
  id: 'x',
  title: 'X',
  company: 'Co',
  category: 'settlement',
  summary: '',
  whoQualifies: '',
  eligibility: [],
  estimatedPayoutMin: 10,
  estimatedPayoutMax: 50,
  payoutKind: 'cash',
  deadline: 'rolling',
  proofRequired: '',
  claimMethod: 'online_form',
  confidence: 'illustrative',
  confidenceNote: '',
  formTemplateId: 'settlement_claim',
  updatedAt: '2026-01-01',
};

describe('evaluateRule', () => {
  const profile: UserProfile = {
    services: ['Crunchyroll', 'Steam'],
    country: 'US',
    consPerYear: 3,
    cosplays: true,
    spendTier: 'none',
  };

  it('includes matches array items case-insensitively', () => {
    expect(
      evaluateRule({ profileKey: 'services', operator: 'includes', value: 'crunchyroll' }, profile)
    ).toBe(true);
    expect(
      evaluateRule({ profileKey: 'services', operator: 'includes', value: 'netflix' }, profile)
    ).toBe(false);
  });

  it('equals compares strings and booleans', () => {
    expect(evaluateRule({ profileKey: 'country', operator: 'equals', value: 'us' }, profile)).toBe(
      true
    );
    expect(evaluateRule({ profileKey: 'cosplays', operator: 'equals', value: true }, profile)).toBe(
      true
    );
    expect(
      evaluateRule({ profileKey: 'cosplays', operator: 'equals', value: false }, profile)
    ).toBe(false);
  });

  it('gte/lte handle numbers and array lengths', () => {
    expect(evaluateRule({ profileKey: 'consPerYear', operator: 'gte', value: 2 }, profile)).toBe(
      true
    );
    expect(evaluateRule({ profileKey: 'consPerYear', operator: 'lte', value: 2 }, profile)).toBe(
      false
    );
    expect(evaluateRule({ profileKey: 'services', operator: 'gte', value: 2 }, profile)).toBe(true);
  });

  it('truthy treats "none"/"no" as false', () => {
    expect(
      evaluateRule({ profileKey: 'spendTier', operator: 'truthy', value: true }, profile)
    ).toBe(false);
    expect(evaluateRule({ profileKey: 'cosplays', operator: 'truthy', value: true }, profile)).toBe(
      true
    );
  });

  it('returns null for unanswered keys', () => {
    expect(
      evaluateRule({ profileKey: 'missing', operator: 'equals', value: 'x' }, profile)
    ).toBeNull();
    expect(
      evaluateRule({ profileKey: 'empty', operator: 'includes', value: 'x' }, { empty: [] })
    ).toBeNull();
  });
});

describe('evaluateEligibility', () => {
  const rules = [
    { profileKey: 'services', operator: 'includes', value: 'crunchyroll' },
    { profileKey: 'country', operator: 'equals', value: 'US' },
  ] as const;
  const o = { ...base, eligibility: [...rules] };

  it('is likely when every rule passes', () => {
    const r = evaluateEligibility(o, { services: ['crunchyroll'], country: 'US' });
    expect(r.status).toBe('likely');
    expect(r.matched).toBe(2);
    expect(r.unmet).toHaveLength(0);
  });

  it('is unlikely when any rule fails', () => {
    const r = evaluateEligibility(o, { services: ['crunchyroll'], country: 'CA' });
    expect(r.status).toBe('unlikely');
    expect(r.unmet.map((u) => u.profileKey)).toEqual(['country']);
  });

  it('is possible when some pass and the rest are unanswered', () => {
    const r = evaluateEligibility(o, { services: ['crunchyroll'] });
    expect(r.status).toBe('possible');
    expect(r.unanswered.map((u) => u.profileKey)).toEqual(['country']);
  });

  it('is unknown with no answers or no rules', () => {
    expect(evaluateEligibility(o, {}).status).toBe('unknown');
    expect(evaluateEligibility(base, { services: ['x'] }).status).toBe('unknown');
  });
});

describe('rankOpportunities', () => {
  it('puts likely first, then possible, then unknown, then unlikely; ties by max payout', () => {
    const likelyBig = {
      ...base,
      id: 'a',
      estimatedPayoutMax: 500,
      eligibility: [{ profileKey: 'country', operator: 'equals', value: 'US' }],
    } as Opportunity;
    const likelySmall = {
      ...base,
      id: 'b',
      estimatedPayoutMax: 20,
      eligibility: [{ profileKey: 'country', operator: 'equals', value: 'US' }],
    } as Opportunity;
    const unlikely = {
      ...base,
      id: 'c',
      estimatedPayoutMax: 9999,
      eligibility: [{ profileKey: 'country', operator: 'equals', value: 'JP' }],
    } as Opportunity;
    const unknown = {
      ...base,
      id: 'd',
      estimatedPayoutMax: 100,
      eligibility: [{ profileKey: 'nope', operator: 'equals', value: 'x' }],
    } as Opportunity;
    const ranked = rankOpportunities([unlikely, likelySmall, unknown, likelyBig], {
      country: 'US',
    });
    expect(ranked.map((r) => r.opportunity.id)).toEqual(['a', 'b', 'd', 'c']);
  });
});
