import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { OpportunityCard } from '@/components/opportunity-card';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Screen } from '@/components/ui';
import { CategoryStyle, Radius, Spacing } from '@/constants/theme';
import { formatMoney } from '@/domain/estimate';
import { OPPORTUNITY_CATEGORIES, type OpportunityCategory } from '@/domain/types';
import { useCatalog } from '@/hooks/use-catalog';
import { useTheme } from '@/hooks/use-theme';
import { analytics, Events } from '@/services/analytics';
import { fetchRemoteCatalog } from '@/services/catalog';
import { useAppStore } from '@/store/use-app-store';

/** Free users see this many open payouts unlocked; the rest are blurred behind the paywall. */
export const FREE_UNLOCKED_COUNT = 2;

export default function DiscoverScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<OpportunityCategory | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const { ranked, estimate, openCount } = useCatalog(filter);
  const isPro = useAppStore((s) => s.isPro);
  const setCatalog = useAppStore((s) => s.setCatalog);
  const firstName = useAppStore((s) => s.profile.firstName);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const remote = await fetchRemoteCatalog();
    if (remote) setCatalog(remote, new Date());
    setRefreshing(false);
  }, [setCatalog]);

  const openPaywall = () => {
    analytics.track(Events.paywallViewed, { source: 'discover_banner' });
    router.push('/paywall');
  };

  let unlockedLeft = FREE_UNLOCKED_COUNT;

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.primary} />
      }>
      <View style={styles.header}>
        <ThemedText type="caption" themeColor="textSecondary">
          {firstName ? `${firstName.toUpperCase()}, YOU MAY BE OWED` : 'YOU MAY BE OWED'}
        </ThemedText>
        <ThemedText type="money" themeColor="money">
          {isPro
            ? formatMoney(estimate.total)
            : estimate.total > 0
              ? `up to ${formatMoney(estimate.high, { compact: true })}`
              : '$0'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {estimate.likelyCount + estimate.possibleCount > 0
            ? `${estimate.likelyCount} likely · ${estimate.possibleCount} possible · ${openCount} open payouts in your feed`
            : `${openCount} open payouts. Answer the quiz in Profile to see which are yours.`}
        </ThemedText>
      </View>

      {!isPro ? (
        <Card tone="primary">
          <ThemedText type="heading">Unlock every payout</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            See the amounts, get the ready-to-send forms, and never miss a deadline.
          </ThemedText>
          <Button title="Unlock Pro" size="md" onPress={openPaywall} />
        </Card>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipRow}>
        {(['all', ...OPPORTUNITY_CATEGORIES] as const).map((c) => {
          const selected = filter === c;
          const label = c === 'all' ? 'All' : `${CategoryStyle[c].emoji} ${CategoryStyle[c].label}`;
          return (
            <Pressable
              key={c}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setFilter(c)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? theme.primary : theme.backgroundElement,
                  borderColor: selected ? theme.primary : theme.border,
                },
              ]}>
              <ThemedText
                type="smallBold"
                style={{ color: selected ? theme.textInverse : theme.text }}>
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {ranked.length === 0 ? (
        <Card>
          <ThemedText type="heading">Nothing here yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            No payouts in this category right now. Pull to refresh or check another category.
          </ThemedText>
        </Card>
      ) : (
        ranked.map(({ opportunity, eligibility, closed }) => {
          let locked = false;
          if (!isPro && !closed) {
            if (unlockedLeft > 0) unlockedLeft -= 1;
            else locked = true;
          }
          return (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              status={eligibility.status}
              closed={closed}
              locked={locked}
            />
          );
        })
      )}

      <ThemedText type="caption" themeColor="textSecondary" style={styles.footnote}>
        Fritter lists public settlements, refund programs and passenger-rights claims. It is not a
        law firm. Amounts are administrator or company estimates.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.one },
  chipRow: { marginHorizontal: -Spacing.three },
  chips: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.three },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  footnote: { textAlign: 'center', marginTop: Spacing.three },
});
