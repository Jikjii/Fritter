import type {
  EligibilityResult,
  EligibilityRule,
  Opportunity,
  ProfileValue,
  UserProfile,
} from './types';

const NEGATIVE_STRINGS = new Set(['', 'no', 'none', 'never', 'false', '0']);

function normalize(v: unknown): string {
  return String(v).trim().toLowerCase();
}

/** Evaluate a single rule. Returns null when the profile has no answer for the key. */
export function evaluateRule(rule: EligibilityRule, profile: UserProfile): boolean | null {
  const raw: ProfileValue | undefined = profile[rule.profileKey];
  if (raw === undefined || raw === null) return null;
  if (Array.isArray(raw) && raw.length === 0 && rule.operator !== 'truthy') return null;

  switch (rule.operator) {
    case 'equals': {
      if (Array.isArray(raw)) return raw.length === 1 && normalize(raw[0]) === normalize(rule.value);
      if (typeof raw === 'boolean' || typeof rule.value === 'boolean') {
        return Boolean(raw) === Boolean(rule.value);
      }
      return normalize(raw) === normalize(rule.value);
    }
    case 'includes': {
      const wanted = normalize(rule.value);
      if (Array.isArray(raw)) return raw.some((item) => normalize(item) === wanted);
      return normalize(raw) === wanted;
    }
    case 'gte': {
      const n = Array.isArray(raw) ? raw.length : Number(raw);
      if (Number.isNaN(n)) return null;
      return n >= Number(rule.value);
    }
    case 'lte': {
      const n = Array.isArray(raw) ? raw.length : Number(raw);
      if (Number.isNaN(n)) return null;
      return n <= Number(rule.value);
    }
    case 'truthy': {
      if (Array.isArray(raw)) {
        return raw.length > 0 && !raw.every((item) => NEGATIVE_STRINGS.has(normalize(item)));
      }
      if (typeof raw === 'boolean') return raw;
      if (typeof raw === 'number') return raw > 0;
      return !NEGATIVE_STRINGS.has(normalize(raw));
    }
    default:
      return null;
  }
}

/**
 * Evaluate every rule of an opportunity against the profile.
 *
 * - likely:   every rule is met
 * - unlikely: at least one rule is definitely not met
 * - possible: some rules met, the rest unanswered
 * - unknown:  nothing answered yet (or the opportunity has no rules)
 */
export function evaluateEligibility(
  opportunity: Pick<Opportunity, 'eligibility'>,
  profile: UserProfile
): EligibilityResult {
  const rules = opportunity.eligibility ?? [];
  const unmet: EligibilityRule[] = [];
  const unanswered: EligibilityRule[] = [];
  let matched = 0;

  for (const rule of rules) {
    const verdict = evaluateRule(rule, profile);
    if (verdict === true) matched += 1;
    else if (verdict === false) unmet.push(rule);
    else unanswered.push(rule);
  }

  const total = rules.length;
  let status: EligibilityResult['status'];
  if (total === 0) status = 'unknown';
  else if (unmet.length > 0) status = 'unlikely';
  else if (matched === total) status = 'likely';
  else if (matched > 0) status = 'possible';
  else status = 'unknown';

  return { status, matched, total, unmet, unanswered };
}

export const ELIGIBILITY_RANK: Record<EligibilityResult['status'], number> = {
  likely: 0,
  possible: 1,
  unknown: 2,
  unlikely: 3,
};

/** Sort opportunities: likely first, then by (max payout desc). */
export function rankOpportunities<T extends Opportunity>(
  opportunities: T[],
  profile: UserProfile
): { opportunity: T; eligibility: EligibilityResult }[] {
  return opportunities
    .map((opportunity) => ({ opportunity, eligibility: evaluateEligibility(opportunity, profile) }))
    .sort((a, b) => {
      const rank = ELIGIBILITY_RANK[a.eligibility.status] - ELIGIBILITY_RANK[b.eligibility.status];
      if (rank !== 0) return rank;
      return b.opportunity.estimatedPayoutMax - a.opportunity.estimatedPayoutMax;
    });
}
