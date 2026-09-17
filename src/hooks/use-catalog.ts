import { useMemo } from 'react';

import { rankOpportunities } from '@/domain/eligibility';
import { estimateOwed, isPastDeadline } from '@/domain/estimate';
import type { EligibilityResult, Opportunity, OpportunityCategory, OwedEstimate } from '@/domain/types';
import { useAppStore } from '@/store/use-app-store';

export type RankedOpportunity = { opportunity: Opportunity; eligibility: EligibilityResult; closed: boolean };

/**
 * Ranked catalog + owed estimate for the current profile. Memoized on catalog/profile identity so
 * screens can call it freely.
 */
export function useCatalog(filter?: OpportunityCategory | 'all'): {
  ranked: RankedOpportunity[];
  estimate: OwedEstimate;
  openCount: number;
} {
  const catalog = useAppStore((s) => s.catalog);
  const profile = useAppStore((s) => s.profile);

  return useMemo(() => {
    const ranked = rankOpportunities(catalog, profile).map((r) => ({
      ...r,
      closed: r.opportunity.confidence === 'verified_past' || isPastDeadline(r.opportunity.deadline),
    }));
    const filtered = filter && filter !== 'all' ? ranked.filter((r) => r.opportunity.category === filter) : ranked;
    // Open items first, closed at the bottom regardless of eligibility.
    filtered.sort((a, b) => Number(a.closed) - Number(b.closed));
    return {
      ranked: filtered,
      estimate: estimateOwed(catalog, profile),
      openCount: ranked.filter((r) => !r.closed).length,
    };
  }, [catalog, profile, filter]);
}

export function useOpportunity(id: string | undefined): RankedOpportunity | undefined {
  const { ranked } = useCatalog();
  return useMemo(() => ranked.find((r) => r.opportunity.id === id), [ranked, id]);
}
