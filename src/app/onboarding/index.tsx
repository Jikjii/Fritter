import { Redirect } from 'expo-router';

import { useAppStore } from '@/store/use-app-store';

/** Resume where the user left off. */
export default function OnboardingIndex() {
  const step = useAppStore((s) => s.onboardingStep);
  return <Redirect href={{ pathname: '/onboarding/[step]', params: { step: String(step) } }} />;
}
