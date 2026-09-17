import { evaluateRule } from './eligibility';
import type { OnboardingScreen, UserProfile } from './types';

/** True when the screen should be shown for the answers given so far. */
export function isScreenVisible(screen: OnboardingScreen, profile: UserProfile): boolean {
  if (!screen.showIf) return true;
  return evaluateRule(screen.showIf, profile) === true;
}

/** Index of the next visible screen at or after `from`, or `screens.length` when none. */
export function nextVisibleIndex(
  screens: OnboardingScreen[],
  profile: UserProfile,
  from: number
): number {
  let i = Math.max(0, from);
  while (i < screens.length && !isScreenVisible(screens[i], profile)) i += 1;
  return i;
}

/** Index of the previous visible screen strictly before `from`, or -1 when none. */
export function prevVisibleIndex(
  screens: OnboardingScreen[],
  profile: UserProfile,
  from: number
): number {
  let i = Math.min(screens.length, from) - 1;
  while (i >= 0 && !isScreenVisible(screens[i], profile)) i -= 1;
  return i;
}

/** Validates the script: every question has a profileKey and options, ids are unique, paywall is last. */
export function validateOnboarding(screens: OnboardingScreen[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  screens.forEach((s, i) => {
    if (ids.has(s.id)) problems.push(`duplicate id "${s.id}"`);
    ids.add(s.id);
    if (
      (s.type === 'question' || s.type === 'multiQuestion') &&
      (!s.profileKey || !s.options?.length)
    ) {
      problems.push(`${s.id}: question screens need profileKey and options`);
    }
    if (s.type === 'paywall' && i !== screens.length - 1)
      problems.push(`${s.id}: paywall must be the last screen`);
  });
  if (screens[screens.length - 1]?.type !== 'paywall')
    problems.push('last screen must be the paywall');
  return problems;
}
