import { midpoint } from './estimate';
import type { Claim, ClaimStatus, Opportunity } from './types';

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  saved: 'Saved',
  in_progress: 'In progress',
  submitted: 'Submitted',
  paid: 'Paid',
  rejected: 'Rejected',
  expired: 'Expired',
};

/** Allowed status transitions (Wallet tab actions). */
export const CLAIM_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  saved: ['in_progress', 'expired'],
  in_progress: ['submitted', 'saved', 'expired'],
  submitted: ['paid', 'rejected', 'in_progress'],
  paid: [],
  rejected: ['in_progress'],
  expired: [],
};

export function canTransition(from: ClaimStatus, to: ClaimStatus): boolean {
  return CLAIM_TRANSITIONS[from].includes(to);
}

export function newClaim(opportunity: Opportunity, now: Date, id: string): Claim {
  const ts = now.toISOString();
  return {
    id,
    opportunityId: opportunity.id,
    status: 'saved',
    estimatedPayout: midpoint(opportunity),
    createdAt: ts,
    updatedAt: ts,
  };
}

export interface WalletSummary {
  potential: number; // saved + in_progress + submitted
  pending: number; // submitted only
  paid: number; // sum of paidAmount (falls back to estimate)
  counts: Record<ClaimStatus, number>;
}

export function summarizeWallet(claims: Claim[]): WalletSummary {
  const counts: Record<ClaimStatus, number> = {
    saved: 0,
    in_progress: 0,
    submitted: 0,
    paid: 0,
    rejected: 0,
    expired: 0,
  };
  let potential = 0;
  let pending = 0;
  let paid = 0;
  for (const c of claims) {
    counts[c.status] += 1;
    if (c.status === 'saved' || c.status === 'in_progress' || c.status === 'submitted') {
      potential += c.estimatedPayout;
    }
    if (c.status === 'submitted') pending += c.estimatedPayout;
    if (c.status === 'paid') paid += c.paidAmount ?? c.estimatedPayout;
  }
  return { potential, pending, paid, counts };
}

/** Stable, dependency-free id generator (no Math.random so tests are deterministic). */
export function makeId(prefix: string, seed: number): string {
  return `${prefix}_${seed.toString(36)}`;
}
