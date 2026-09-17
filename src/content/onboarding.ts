import type { OnboardingScreen } from '@/domain/types';

/**
 * PLACEHOLDER — replaced with the final onboarding script from the design spec.
 * Order matters: the step index is the route param (/onboarding/0, /onboarding/1, …).
 */
export const ONBOARDING_SCREENS: OnboardingScreen[] = [
  { id: 'hook', type: 'hook', title: 'Companies owe anime fans money.', subtitle: 'Most of it goes unclaimed.', cta: 'Find mine' },
  {
    id: 'q-country',
    type: 'question',
    title: 'Where do you live?',
    profileKey: 'country',
    options: [
      { label: 'United States', value: 'US', emoji: '🇺🇸' },
      { label: 'Somewhere else', value: 'other', emoji: '🌏' },
    ],
  },
  { id: 'paywall', type: 'paywall', title: 'Unlock' },
];
