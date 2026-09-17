import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Card } from '@/components/ui';
import { CategoryStyle, Spacing } from '@/constants/theme';
import { daysUntil, formatRange } from '@/domain/estimate';
import type { EligibilityStatus, Opportunity } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

export const ELIGIBILITY_BADGE: Record<EligibilityStatus, { label: string; color: 'money' | 'gold' | 'primary' | 'danger' }> = {
  likely: { label: 'You likely qualify', color: 'money' },
  possible: { label: 'You may qualify', color: 'gold' },
  unknown: { label: 'Check eligibility', color: 'primary' },
  unlikely: { label: 'Probably not you', color: 'danger' },
};

export function deadlineLabel(deadline: string, closed: boolean): string {
  if (closed) return 'Closed';
  if (deadline === 'rolling') return 'No deadline';
  if (deadline === 'unknown') return 'Deadline TBD';
  const d = daysUntil(deadline);
  if (d === null) return 'Deadline TBD';
  if (d <= 0) return 'Closes today';
  if (d === 1) return 'Closes tomorrow';
  if (d <= 30) return `${d} days left`;
  return `Closes ${deadline}`;
}

export type OpportunityCardProps = {
  opportunity: Opportunity;
  status: EligibilityStatus;
  closed?: boolean;
  /** Locks the card behind the paywall: blurs the payout and routes to /paywall. */
  locked?: boolean;
  compact?: boolean;
};

/** Discover-feed row. Tapping opens the detail screen (or the paywall when locked). */
export function OpportunityCard({ opportunity: o, status, closed = false, locked = false, compact = false }: OpportunityCardProps) {
  const theme = useTheme();
  const cat = CategoryStyle[o.category];
  const badge = ELIGIBILITY_BADGE[status];
  const unverified = o.confidence === 'plausible_unverified' || o.confidence === 'illustrative';
  const href = locked ? '/paywall' : ({ pathname: '/opportunity/[id]', params: { id: o.id } } as const);

  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={`${o.title}, ${badge.label}`} style={({ pressed }) => ({ opacity: pressed ? 0.85 : closed ? 0.6 : 1 })}>
        <Card style={styles.card}>
          <View style={styles.topRow}>
            <Badge label={cat.label} emoji={cat.emoji} color={cat.color} />
            {!closed ? <Badge label={badge.label} color={badge.color} /> : <Badge label="Closed" color="danger" />}
          </View>
          <ThemedText type="heading" numberOfLines={2}>
            {o.title}
          </ThemedText>
          {!compact ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {o.summary}
            </ThemedText>
          ) : null}
          <View style={styles.bottomRow}>
            <ThemedText type="subtitle" style={{ color: theme.money }}>
              {locked ? '$•••' : formatRange(o)}
            </ThemedText>
            <View style={styles.meta}>
              <ThemedText type="caption" themeColor="textSecondary">
                {o.company}
              </ThemedText>
              <ThemedText type="caption" themeColor={closed ? 'danger' : 'textSecondary'}>
                {deadlineLabel(o.deadline, closed)}
              </ThemedText>
            </View>
          </View>
          {unverified ? (
            <ThemedText type="caption" themeColor="warning">
              ⚠︎ Example entry — verify before filing
            </ThemedText>
          ) : null}
        </Card>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two },
  topRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: Spacing.two },
  meta: { alignItems: 'flex-end', gap: Spacing.half },
});
