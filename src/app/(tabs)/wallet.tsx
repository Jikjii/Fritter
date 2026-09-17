import { Link, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { GrowthLine } from '@/components/charts';
import { deadlineLabel } from '@/components/opportunity-card';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, Screen, Stat } from '@/components/ui';
import { CategoryStyle, Spacing } from '@/constants/theme';
import { CLAIM_STATUS_LABEL, CLAIM_TRANSITIONS, summarizeWallet } from '@/domain/claims';
import { formatMoney, isPastDeadline } from '@/domain/estimate';
import type { Claim, ClaimStatus } from '@/domain/types';
import { useCatalog } from '@/hooks/use-catalog';
import { analytics, Events } from '@/services/analytics';
import { cancelReminder } from '@/services/notifications';
import { useAppStore } from '@/store/use-app-store';

const STATUS_COLOR: Record<ClaimStatus, 'primary' | 'gold' | 'money' | 'danger' | 'warning'> = {
  saved: 'primary',
  in_progress: 'gold',
  submitted: 'warning',
  paid: 'money',
  rejected: 'danger',
  expired: 'danger',
};

const ACTION_LABEL: Partial<Record<ClaimStatus, string>> = {
  in_progress: 'Start',
  submitted: 'Mark submitted',
  paid: 'Mark paid',
  rejected: 'Rejected',
  expired: 'Expired',
  saved: 'Back to saved',
};

function ClaimRow({ claim }: { claim: Claim }) {
  const opportunity = useAppStore((s) => s.catalog.find((o) => o.id === claim.opportunityId));
  const updateClaimStatus = useAppStore((s) => s.updateClaimStatus);
  const removeClaim = useAppStore((s) => s.removeClaim);
  const router = useRouter();
  if (!opportunity) return null;
  const cat = CategoryStyle[opportunity.category];
  const closed = isPastDeadline(opportunity.deadline);
  const next = CLAIM_TRANSITIONS[claim.status].filter((s) => s !== 'expired' || closed);

  const move = (to: ClaimStatus) => {
    if (updateClaimStatus(claim.id, to)) {
      analytics.track(Events.claimStatusChanged, {
        from: claim.status,
        to,
        opportunityId: claim.opportunityId,
      });
      if (to === 'paid' || to === 'rejected' || to === 'expired') cancelReminder(claim.reminderId);
    }
  };

  const remove = () => {
    const doRemove = () => {
      cancelReminder(claim.reminderId);
      removeClaim(claim.id);
    };
    if (Platform.OS === 'web') return doRemove();
    Alert.alert('Remove claim?', 'This also deletes any generated forms for it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: doRemove },
    ]);
  };

  return (
    <Card style={styles.claimCard}>
      <Pressable
        onPress={() =>
          router.push({ pathname: '/opportunity/[id]', params: { id: opportunity.id } })
        }
        accessibilityRole="button">
        <View style={styles.rowBetween}>
          <Badge label={cat.label} emoji={cat.emoji} color={cat.color} />
          <Badge label={CLAIM_STATUS_LABEL[claim.status]} color={STATUS_COLOR[claim.status]} />
        </View>
        <ThemedText type="heading" numberOfLines={2} style={styles.title}>
          {opportunity.title}
        </ThemedText>
        <View style={styles.rowBetween}>
          <ThemedText type="subtitle" themeColor="money">
            {claim.status === 'paid'
              ? formatMoney(claim.paidAmount ?? claim.estimatedPayout)
              : `~${formatMoney(claim.estimatedPayout)}`}
          </ThemedText>
          <ThemedText type="caption" themeColor={closed ? 'danger' : 'textSecondary'}>
            {deadlineLabel(opportunity.deadline, closed)}
          </ThemedText>
        </View>
      </Pressable>
      <View style={styles.actions}>
        {claim.status === 'saved' || claim.status === 'in_progress' ? (
          <Button
            title={claim.formId ? 'Open form' : 'Prepare form'}
            size="md"
            style={styles.actionBtn}
            onPress={() =>
              claim.formId
                ? router.push({ pathname: '/form/[id]', params: { id: claim.formId } })
                : router.push({ pathname: '/claim/[id]', params: { id: opportunity.id } })
            }
          />
        ) : null}
        {next.map((to) => (
          <Button
            key={to}
            title={ACTION_LABEL[to] ?? CLAIM_STATUS_LABEL[to]}
            variant="secondary"
            size="md"
            style={styles.actionBtn}
            onPress={() => move(to)}
          />
        ))}
        <Button
          title="Remove"
          variant="ghost"
          size="md"
          style={styles.actionBtn}
          onPress={remove}
        />
      </View>
    </Card>
  );
}

export default function WalletScreen() {
  const claims = useAppStore((s) => s.claims);
  const { estimate } = useCatalog();
  const summary = useMemo(() => summarizeWallet(claims), [claims]);

  const growth = useMemo(() => {
    const sorted = [...claims].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const points = sorted.reduce<number[]>(
      (acc, c) => [...acc, acc[acc.length - 1] + c.estimatedPayout],
      [0]
    );
    return points.length >= 2 ? points : [0, 0];
  }, [claims]);

  const sortedClaims = useMemo(
    () => [...claims].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [claims]
  );

  return (
    <Screen>
      <ThemedText type="title">Wallet</ThemedText>

      <Card tone="money">
        <ThemedText type="caption" themeColor="textSecondary">
          MONEY YOU ARE CHASING
        </ThemedText>
        <ThemedText type="money" themeColor="money">
          {formatMoney(summary.potential)}
        </ThemedText>
        <View style={styles.stats}>
          <Stat label="Pending" value={formatMoney(summary.pending)} />
          <Stat label="Paid out" value={formatMoney(summary.paid)} color="money" />
          <Stat label="Claims" value={String(claims.length)} />
        </View>
        {claims.length >= 2 ? (
          <GrowthLine
            points={growth}
            height={90}
            endLabel={formatMoney(growth[growth.length - 1], { compact: true })}
          />
        ) : null}
      </Card>

      {claims.length === 0 ? (
        <Card>
          <ThemedText type="heading">Nothing tracked yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {estimate.total > 0
              ? `Your feed has about ${formatMoney(estimate.total)} you may be owed. Save a payout to track it here.`
              : 'Save a payout from Discover and it shows up here with its deadline and status.'}
          </ThemedText>
          <Link href="/(tabs)" asChild>
            <Button title="Find my payouts" size="md" />
          </Link>
        </Card>
      ) : (
        sortedClaims.map((c) => <ClaimRow key={c.id} claim={c} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  claimCard: { gap: Spacing.two },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  title: { marginVertical: Spacing.one },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  actionBtn: { alignSelf: 'auto', flexGrow: 1 },
});
