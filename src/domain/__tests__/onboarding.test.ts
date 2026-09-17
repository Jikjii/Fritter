import { ONBOARDING_SCREENS } from '@/content/onboarding';
import catalog from '@/content/catalog.json';

import { evaluateRule } from '../eligibility';
import { estimateOwed, isStale, isSummable, payoutLabel } from '../estimate';
import {
  isScreenVisible,
  nextVisibleIndex,
  prevVisibleIndex,
  validateOnboarding,
} from '../onboarding';
import type { Opportunity } from '../types';

const CATALOG = catalog as Opportunity[];
const NOW = new Date('2026-09-20T12:00:00Z');

describe('onboarding script', () => {
  it('is structurally valid', () => {
    expect(validateOnboarding(ONBOARDING_SCREENS)).toEqual([]);
  });

  it('sets every profileKey the catalog rules read', () => {
    const keys = new Set(ONBOARDING_SCREENS.map((s) => s.profileKey).filter(Boolean));
    const identity = new Set(['country']);
    for (const o of CATALOG) {
      for (const r of o.eligibility) {
        expect(keys.has(r.profileKey) || identity.has(r.profileKey)).toBe(true);
      }
    }
  });

  it('every rule value is an option on the question that sets its key', () => {
    const optionsByKey = new Map<string, Set<string>>();
    for (const s of ONBOARDING_SCREENS) {
      if (s.profileKey && s.options)
        optionsByKey.set(s.profileKey, new Set(s.options.map((o) => o.value)));
    }
    for (const o of CATALOG) {
      for (const r of o.eligibility) {
        const opts = optionsByKey.get(r.profileKey);
        if (!opts) continue;
        const vals = Array.isArray(r.value) ? r.value : [String(r.value)];
        for (const v of vals) expect(opts.has(String(v))).toBe(true);
      }
    }
  });

  it('skips the Amazon notice question unless Amazon Prime was selected', () => {
    const idx = ONBOARDING_SCREENS.findIndex((s) => s.id === 'q_amazon_notice');
    expect(idx).toBeGreaterThan(0);
    expect(isScreenVisible(ONBOARDING_SCREENS[idx], { services: ['steam'] })).toBe(false);
    expect(isScreenVisible(ONBOARDING_SCREENS[idx], { services: ['amazon_prime'] })).toBe(true);
    expect(nextVisibleIndex(ONBOARDING_SCREENS, { services: ['steam'] }, idx)).toBe(idx + 1);
    expect(nextVisibleIndex(ONBOARDING_SCREENS, { services: ['amazon_prime'] }, idx)).toBe(idx);
    expect(prevVisibleIndex(ONBOARDING_SCREENS, { services: ['steam'] }, idx + 1)).toBe(idx - 1);
    expect(prevVisibleIndex(ONBOARDING_SCREENS, {}, 0)).toBe(-1);
  });
});

describe('seed catalog honesty rules', () => {
  it('never sums watching, closed, unverified or non-cash items', () => {
    for (const o of CATALOG) {
      const summable = isSummable(o, NOW);
      if (o.status === 'watching' || o.status === 'closed' || o.confidence !== 'verified_current')
        expect(summable).toBe(false);
      if (o.payoutKind !== 'cash' && o.payoutKind !== 'credit') expect(summable).toBe(false);
      if (o.status === 'watching') expect(payoutLabel(o, NOW)).toBe('$0 today');
      if (o.confidence === 'plausible_unverified' || o.confidence === 'illustrative')
        expect(payoutLabel(o, NOW)).toBe('Amount TBD');
    }
  });

  it('a maxed-out US fan profile gets a bounded, explainable estimate', () => {
    const profile = {
      country: 'us',
      fanType: ['anime', 'gaming', 'cosplay', 'streamer'],
      services: [
        'crunchyroll',
        'funimation_legacy',
        'playstation',
        'nintendo',
        'google_play',
        'steam',
        'twitch',
        'patreon',
        'amazon_prime',
      ],
      amazonClaimNotice: 'unsure',
      shops: ['hot_topic_boxlunch', 'gamestop', 'figure_shops', 'etsy', 'amazon', 'resale'],
      purchases: [
        'psn_digital_2019_2023',
        'play_purchases_2016_2023',
        'the_crew',
        'nintendo_hardware_2025',
        'joycon_drift',
        'funimation_digital_copy',
      ],
      conMishaps: [
        'cancelled_con_badge',
        'flight_delayed_or_cancelled',
        'lost_bag',
        'commission_undelivered',
        'late_figure_preorder',
      ],
      payMethods: ['credit_card', 'paypal_goods'],
      hadFacebookPublicProfile: 'yes',
    };
    const e = estimateOwed(CATALOG, profile, NOW);
    // PSN $33.66 + Google Play $2 + Amazon $200 are the only summable items today.
    expect(e.total).toBeCloseTo(235.66, 2);
    expect(e.sumCount).toBe(3);
    expect(e.watchCount).toBe(4); // crunchyroll, hot topic, nintendo tariff, twitch
    expect(e.closedMatchCount).toBe(4); // crunchyroll 2023, ubisoft, gamestop, patreon
    expect(e.equalsPaidCount).toBeGreaterThanOrEqual(8);
  });

  it('a UK cosplayer sees travel rights but no US-only settlements', () => {
    const profile = {
      country: 'uk',
      services: ['crunchyroll'],
      conMishaps: ['lost_bag', 'flight_delayed_or_cancelled'],
    };
    const e = estimateOwed(CATALOG, profile, NOW);
    expect(e.total).toBe(0);
    expect(e.watchCount).toBe(0);
    const eu = CATALOG.find((o) => o.id === 'con-flight-eu261')!;
    const us = CATALOG.find((o) => o.id === 'con-flight-refund-us')!;
    expect(evaluateRule(eu.eligibility[1], profile)).toBe(true);
    expect(evaluateRule(us.eligibility[1], profile)).toBe(false);
  });

  it('goes stale after the verification TTL', () => {
    const o = CATALOG.find((x) => x.id === 'psn-digital-games-2026')!;
    expect(isStale(o, NOW)).toBe(false);
    expect(isStale(o, new Date('2027-01-01T00:00:00Z'))).toBe(true);
    expect(payoutLabel(o, new Date('2027-01-01T00:00:00Z'))).toBe('Needs re-check');
    expect(isSummable(o, new Date('2027-01-01T00:00:00Z'))).toBe(false);
  });
});

describe('list operators', () => {
  const p = { country: 'uk', services: ['steam', 'etsy'] };
  it('in / includesAny / notIncludes', () => {
    expect(evaluateRule({ profileKey: 'country', operator: 'in', value: ['uk', 'eu'] }, p)).toBe(
      true
    );
    expect(evaluateRule({ profileKey: 'country', operator: 'in', value: ['us'] }, p)).toBe(false);
    expect(
      evaluateRule(
        { profileKey: 'services', operator: 'includesAny', value: ['patreon', 'etsy'] },
        p
      )
    ).toBe(true);
    expect(
      evaluateRule({ profileKey: 'services', operator: 'includesAny', value: ['patreon'] }, p)
    ).toBe(false);
    expect(
      evaluateRule({ profileKey: 'services', operator: 'notIncludes', value: 'patreon' }, p)
    ).toBe(true);
    expect(
      evaluateRule({ profileKey: 'services', operator: 'notIncludes', value: 'steam' }, p)
    ).toBe(false);
    expect(evaluateRule({ profileKey: 'missing', operator: 'in', value: ['x'] }, p)).toBeNull();
  });
});
