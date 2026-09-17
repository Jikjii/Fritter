/**
 * Deadline reminders + the onboarding "turn on activity notifications" ask.
 * Uses expo-notifications; everything is guarded so web / tests never crash.
 */
import { Platform } from 'react-native';

import { daysUntil } from '@/domain/estimate';
import type { Opportunity } from '@/domain/types';

function mod(): typeof import('expo-notifications') | null {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const N = mod();
  if (!N) return false;
  try {
    const current = await N.getPermissionsAsync();
    if (current.granted) return true;
    const res = await N.requestPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
}

/**
 * Schedule a reminder 3 days before the opportunity deadline (or tomorrow if closer).
 * Returns the notification identifier, or null when not scheduled.
 */
export async function scheduleDeadlineReminder(o: Opportunity): Promise<string | null> {
  const N = mod();
  if (!N) return null;
  if (o.deadlineKind === 'hearing' || o.deadlineKind === 'none') return null;
  const days = daysUntil(o.deadline);
  if (days === null || days <= 0) return null;
  const fireInDays = Math.max(1, days - 3);
  try {
    return await N.scheduleNotificationAsync({
      content: {
        title: `⏰ ${o.title} closes soon`,
        body: `Your claim deadline is in ${days - fireInDays} day${days - fireInDays === 1 ? '' : 's'}. Open Fritter to finish it.`,
        data: { opportunityId: o.id },
      },
      trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: fireInDays * 86_400 },
    });
  } catch {
    return null;
  }
}

export async function cancelReminder(id: string | undefined): Promise<void> {
  const N = mod();
  if (!N || !id) return;
  try {
    await N.cancelScheduledNotificationAsync(id);
  } catch {
    // ignore
  }
}
