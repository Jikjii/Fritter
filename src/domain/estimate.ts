import { evaluateEligibility } from './eligibility';
import { OPPORTUNITY_CATEGORIES, type Opportunity, type OwedEstimate, type UserProfile } from './types';

export function midpoint(o: Pick<Opportunity, 'estimatedPayoutMin' | 'estimatedPayoutMax'>): number {
  return Math.round((o.estimatedPayoutMin + o.estimatedPayoutMax) / 2);
}

function emptyByCategory(): OwedEstimate['byCategory'] {
  return OPPORTUNITY_CATEGORIES.reduce(
    (acc, c) => {
      acc[c] = 0;
      return acc;
    },
    {} as OwedEstimate['byCategory']
  );
}

/**
 * The "you may be owed $X" number used in onboarding, on the Discover header and in
 * the Wallet. Only counts items the user is likely or possibly eligible for, and
 * ignores closed (verified_past) opportunities so we never promise dead money.
 */
export function estimateOwed(catalog: Opportunity[], profile: UserProfile): OwedEstimate {
  const byCategory = emptyByCategory();
  let total = 0;
  let low = 0;
  let high = 0;
  let likelyCount = 0;
  let possibleCount = 0;

  for (const o of catalog) {
    if (o.confidence === 'verified_past') continue;
    if (isPastDeadline(o.deadline)) continue;
    const { status } = evaluateEligibility(o, profile);
    if (status === 'likely') {
      likelyCount += 1;
      total += midpoint(o);
      low += o.estimatedPayoutMin;
      high += o.estimatedPayoutMax;
      byCategory[o.category] += midpoint(o);
    } else if (status === 'possible') {
      possibleCount += 1;
      total += midpoint(o);
      high += o.estimatedPayoutMax;
      byCategory[o.category] += midpoint(o);
    }
  }

  return { total, low, high, likelyCount, possibleCount, byCategory };
}

/** True when `deadline` is an ISO date strictly before `now` (defaults to today). */
export function isPastDeadline(deadline: string, now: Date = new Date()): boolean {
  if (deadline === 'rolling' || deadline === 'unknown' || !deadline) return false;
  const d = new Date(deadline + (deadline.length === 10 ? 'T23:59:59' : ''));
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < now.getTime();
}

/** Whole days until the deadline, or null for rolling/unknown. Negative when past. */
export function daysUntil(deadline: string, now: Date = new Date()): number | null {
  if (deadline === 'rolling' || deadline === 'unknown' || !deadline) return null;
  const d = new Date(deadline + (deadline.length === 10 ? 'T23:59:59' : ''));
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
}

export function formatMoney(amount: number, opts: { compact?: boolean } = {}): string {
  const rounded = Math.round(amount);
  if (opts.compact && rounded >= 1000) {
    const k = rounded / 1000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `$${rounded.toLocaleString('en-US')}`;
}

export function formatRange(o: Pick<Opportunity, 'estimatedPayoutMin' | 'estimatedPayoutMax'>): string {
  if (o.estimatedPayoutMin === o.estimatedPayoutMax) return formatMoney(o.estimatedPayoutMax);
  return `${formatMoney(o.estimatedPayoutMin)}–${formatMoney(o.estimatedPayoutMax)}`;
}
