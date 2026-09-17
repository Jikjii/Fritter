import { Redirect } from 'expo-router';

import { useAppStore } from '@/store/use-app-store';

/** Entry: send new users through onboarding, everyone else to Discover. */
export default function Index() {
  const done = useAppStore((s) => s.hasCompletedOnboarding);
  return <Redirect href={done ? '/(tabs)' : '/onboarding'} />;
}
