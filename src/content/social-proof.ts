import type { SocialProofItem } from '@/domain/types';

/**
 * Social proof = documented facts with sources. No invented testimonials: fabricated quotes
 * are an FTC violation and an App Store rejection risk. Add real, permissioned beta-user
 * quotes to SOCIAL_PROOF when you have them (name + handle + the refund screenshot on file).
 */
export const SOCIAL_PROOF: SocialProofItem[] = [];

export type SocialFact = { text: string; sourceUrl: string; emoji?: string };

export const SOCIAL_FACTS: SocialFact[] = [
  {
    text: 'Amazon has paid more than $845,000,000 in Prime refunds under the FTC settlement, with claim notices still going out.',
    sourceUrl: 'https://www.ftc.gov/enforcement/refunds/amazon-refunds',
    emoji: '📦',
  },
  {
    text: 'Google’s $630,000,000 Play Store consumer fund got final approval in April 2026 and is paying about 102 million people automatically.',
    sourceUrl:
      'https://www.doj.state.or.us/media-home/news-media-releases/ag-rayfield-secures-700-million-google-settlement-details-consumer-payout/',
    emoji: '🤖',
  },
  {
    text: 'Crunchyroll settled its video-privacy case for $16,000,000 in 2023. Fans who filed got about $30 each.',
    sourceUrl: 'https://www.crvppasettlement.com/',
    emoji: '🍙',
  },
];

/** Stat tiles for the chart screen. Every value is derived from the catalog or the facts above. */
export const SOCIAL_STATS = [
  { label: 'documented programs', value: '20+' },
  { label: 'largest per-person payout', value: '$200' },
  { label: 'US baggage liability cap', value: '$4,700' },
];
