import { evaluateEligibility } from './eligibility';
import {
  OPPORTUNITY_CATEGORIES,
  type Opportunity,
  type OwedEstimate,
  type UserProfile,
} from './types';

export function midpoint(
  o: Pick<Opportunity, 'estimatedPayoutMin' | 'estimatedPayoutMax'>
): number {
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

export function isClosed(
  o: Pick<Opportunity, 'status' | 'confidence' | 'deadline'>,
  now: Date = new Date()
): boolean {
  return (
    o.status === 'closed' || o.confidence === 'verified_past' || isPastDeadline(o.deadline, now)
  );
}

export function isWatching(o: Pick<Opportunity, 'status'>): boolean {
  return o.status === 'watching';
}

/** After this many days without re-verification an item stops rendering amounts and totals. */
export const VERIFICATION_TTL_DAYS = 60;

export function isStale(
  o: Pick<Opportunity, 'updatedAt' | 'confidence'>,
  now: Date = new Date()
): boolean {
  if (o.confidence === 'verified_past') return false; // history never goes stale
  const t = new Date(o.updatedAt + (o.updatedAt.length === 10 ? 'T00:00:00' : '')).getTime();
  if (Number.isNaN(t)) return true;
  return now.getTime() - t > VERIFICATION_TTL_DAYS * 86_400_000;
}

export function isVerified(
  o: Pick<Opportunity, 'confidence' | 'updatedAt'>,
  now: Date = new Date()
): boolean {
  return (
    (o.confidence === 'verified_current' && !isStale(o, now)) || o.confidence === 'verified_past'
  );
}

/**
 * The honesty rule from the spec, enforced in code: an item may contribute to the headline
 * total only if a human verified it is currently open AND it pays cash or credit.
 */
export function isSummable(o: Opportunity, now: Date = new Date()): boolean {
  return (
    o.confidence === 'verified_current' &&
    !isStale(o, now) &&
    !isWatching(o) &&
    !isClosed(o, now) &&
    (o.payoutKind === 'cash' || o.payoutKind === 'credit') &&
    o.estimatedPayoutMax > 0
  );
}

/**
 * The "you may be owed up to $X" number used in onboarding, the Discover header and the
 * paywall. Only verified, open, cash/credit items the user likely or possibly matches are summed.
 */
export function estimateOwed(
  catalog: Opportunity[],
  profile: UserProfile,
  now: Date = new Date()
): OwedEstimate {
  const byCategory = emptyByCategory();
  let total = 0;
  let low = 0;
  let likelyCount = 0;
  let possibleCount = 0;
  let matchCount = 0;
  let sumCount = 0;
  let equalsPaidCount = 0;
  let watchCount = 0;
  let closedMatchCount = 0;

  for (const o of catalog) {
    if (o.hidden) continue;
    const { status } = evaluateEligibility(o, profile);
    if (status !== 'likely' && status !== 'possible') continue;
    if (isClosed(o, now)) {
      closedMatchCount += 1;
      continue;
    }
    matchCount += 1;
    if (status === 'likely') likelyCount += 1;
    else possibleCount += 1;
    if (isWatching(o)) {
      watchCount += 1;
      continue;
    }
    if (o.payoutKind === 'equals_paid' || o.payoutKind === 'statutory_cap') equalsPaidCount += 1;
    if (!isSummable(o, now)) continue;
    sumCount += 1;
    total += o.estimatedPayoutMax;
    if (status === 'likely') low += o.estimatedPayoutMin;
    byCategory[o.category] += o.estimatedPayoutMax;
  }

  return {
    total,
    low,
    high: total,
    likelyCount,
    possibleCount,
    matchCount,
    sumCount,
    equalsPaidCount,
    watchCount,
    closedMatchCount,
    byCategory,
  };
}

export function formatMoney(amount: number, opts: { compact?: boolean } = {}): string {
  const rounded = Math.round(amount);
  if (opts.compact && rounded >= 1000) {
    const k = rounded / 1000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `$${rounded.toLocaleString('en-US')}`;
}

/** Exact dollars-and-cents when the amount has cents (e.g. $33.66), whole dollars otherwise. */
export function formatExact(amount: number): string {
  return Number.isInteger(amount) ? formatMoney(amount) : `$${amount.toFixed(2)}`;
}

export function formatRange(
  o: Pick<Opportunity, 'estimatedPayoutMin' | 'estimatedPayoutMax'>
): string {
  if (o.estimatedPayoutMin === o.estimatedPayoutMax) return formatExact(o.estimatedPayoutMax);
  return `${formatExact(o.estimatedPayoutMin)}–${formatExact(o.estimatedPayoutMax)}`;
}

/**
 * What to print where a card shows "the money". Enforces: watching → "$0 today";
 * unverified → no number; refund kinds → "what you paid"; caps → "up to $X (legal cap)".
 */
export function payoutLabel(o: Opportunity, now: Date = new Date()): string {
  if (isWatching(o)) return '$0 today';
  if (o.confidence === 'verified_current' && isStale(o, now)) return 'Needs re-check';
  if (!isVerified(o, now)) return 'Amount TBD';
  switch (o.payoutKind) {
    case 'equals_paid':
      return o.estimatedPayoutMax > 0
        ? `What you paid · up to ${formatExact(o.estimatedPayoutMax)}`
        : 'What you paid';
    case 'statutory_cap':
      return `Up to ${formatExact(o.estimatedPayoutMax)} · legal cap`;
    case 'non_cash':
      return o.estimatedPayoutMax > 0 ? `Free fix · ~${formatRange(o)} value` : 'Free fix';
    default:
      return formatRange(o);
  }
}

export type StatusBadge = 'open' | 'automatic' | 'watching' | 'closed';

export function statusBadge(o: Opportunity, now: Date = new Date()): StatusBadge {
  if (isClosed(o, now)) return 'closed';
  if (isWatching(o)) return 'watching';
  if (o.claimMethod === 'automatic') return 'automatic';
  return 'open';
}
