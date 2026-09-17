import { useMemo } from 'react';

import { rankOpportunities } from '@/domain/eligibility';
import { estimateOwed, isClosed, isSummable, isWatching } from '@/domain/estimate';
import type {
  EligibilityResult,
  Opportunity,
  OpportunityCategory,
  OwedEstimate,
} from '@/domain/types';
import { useAppStore } from '@/store/use-app-store';

export type RankedOpportunity = {
  opportunity: Opportunity;
  eligibility: EligibilityResult;
  closed: boolean;
};

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
      closed: isClosed(r.opportunity),
    }));
    const filtered =
      filter && filter !== 'all' ? ranked.filter((r) => r.opportunity.category === filter) : ranked;
    // Money first: paying/automatic > refunds & rights > watchlist > closed, then eligibility rank (stable).
    const lane = (r: RankedOpportunity) =>
      r.closed ? 3 : isWatching(r.opportunity) ? 2 : isSummable(r.opportunity) ? 0 : 1;
    filtered.sort((a, b) => lane(a) - lane(b));
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
