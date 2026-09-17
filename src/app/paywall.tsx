import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { PAYWALL } from '@/content/paywall';
import { SOCIAL_PROOF } from '@/content/social-proof';
import { formatMoney } from '@/domain/estimate';
import { useCatalog } from '@/hooks/use-catalog';
import { useTheme } from '@/hooks/use-theme';
import { analytics, Events } from '@/services/analytics';
import { DEFAULT_PLANS, perWeek, purchases, yearlySavingsPercent, type Plan, type PlanId } from '@/services/purchases';
import { useAppStore } from '@/store/use-app-store';

const TERMS_URL = 'https://example.com/terms';
const PRIVACY_URL = 'https://example.com/privacy';

function PlanOption({ plan, selected, savings, onPress }: { plan: Plan; selected: boolean; savings: number; onPress: () => void }) {
  const theme = useTheme();
  const yearly = plan.id === 'yearly';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.plan, { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primarySoft : theme.backgroundElement }]}>
      <View style={styles.planLeft}>
        <View style={styles.planTitleRow}>
          <ThemedText type="defaultBold">{yearly ? 'Yearly' : 'Weekly'}</ThemedText>
          {yearly && savings > 0 ? <Badge label={`SAVE ${savings}%`} color="money" soft={false} /> : null}
          {yearly && plan.trialDays > 0 ? <Badge label={`${plan.trialDays}-day free trial`} color="gold" /> : null}
        </View>
        <ThemedText type="caption" themeColor="textSecondary">
          {yearly ? `${plan.priceString}/year · ${plan.currencyCode === 'USD' ? '$' : ''}${perWeek(plan).toFixed(2)}/week` : `${plan.priceString}/week · billed weekly`}
        </ThemedText>
      </View>
      <View style={[styles.radio, { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary : 'transparent' }]}>
        {selected ? <ThemedText type="caption" style={{ color: theme.textInverse }}>✓</ThemedText> : null}
      </View>
    </Pressable>
  );
}

export default function PaywallScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setPro = useAppStore((s) => s.setPro);
  const isPro = useAppStore((s) => s.isPro);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const { estimate } = useCatalog();
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [planId, setPlanId] = useState<PlanId>('yearly');
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [showClose, setShowClose] = useState(false);

  useEffect(() => {
    purchases
      .getPlans()
      .then((p) => {
        if (p.length) setPlans(p);
      })
      .catch(() => undefined);
    // Delayed close button: the standard pattern for onboarding paywalls.
    const t = setTimeout(() => setShowClose(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const yearly = plans.find((p) => p.id === 'yearly');
  const weekly = plans.find((p) => p.id === 'weekly');
  const selected = plans.find((p) => p.id === planId) ?? plans[0];
  const savings = yearlySavingsPercent(weekly, yearly);

  const finish = () => {
    completeOnboarding();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/(tabs)');
  };

  const buy = async () => {
    if (!selected) return;
    setBusy('buy');
    analytics.track(Events.purchaseStarted, { plan: selected.id, price: selected.price });
    const res = await purchases.purchase(selected);
    setBusy(null);
    if (res.isPro) {
      setPro(true);
      analytics.track(Events.purchaseSucceeded, { plan: selected.id, price: selected.price });
      finish();
    } else if (!res.cancelled) {
      analytics.track(Events.purchaseFailed, { plan: selected.id, error: res.error ?? 'unknown' });
      Alert.alert('Purchase did not go through', res.error ?? 'Please try again.');
    }
  };

  const restore = async () => {
    setBusy('restore');
    const res = await purchases.restore();
    setBusy(null);
    if (res.isPro) {
      setPro(true);
      analytics.track(Events.purchaseRestored);
      finish();
    } else {
      Alert.alert('Nothing to restore', res.error ?? 'No active subscription found for this store account.');
    }
  };

  const dismiss = () => {
    analytics.track(Events.paywallDismissed, { plan: planId });
    finish();
  };

  const ctaTitle = isPro
    ? 'You already have Pro'
    : selected?.id === 'yearly' && selected.trialDays > 0
      ? `Start my ${selected.trialDays}-day free trial`
      : 'Unlock Pro';

  return (
    <Screen
      noTopInset
      footer={
        <>
          <Button title={ctaTitle} loading={busy === 'buy'} disabled={isPro} onPress={buy} />
          <ThemedText type="caption" themeColor="textSecondary" style={styles.center}>
            {selected?.id === 'yearly' && selected.trialDays > 0
              ? `Free for ${selected.trialDays} days, then ${selected.priceString}/year. Cancel anytime.`
              : `${selected?.priceString ?? ''}/${selected?.id === 'yearly' ? 'year' : 'week'}, auto-renews. Cancel anytime.`}
          </ThemedText>
          <View style={styles.links}>
            <Pressable onPress={restore} disabled={busy !== null}>
              <ThemedText type="caption" themeColor="textSecondary">
                {busy === 'restore' ? 'Restoring…' : 'Restore'}
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}>
              <ThemedText type="caption" themeColor="textSecondary">
                Terms
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
              <ThemedText type="caption" themeColor="textSecondary">
                Privacy
              </ThemedText>
            </Pressable>
          </View>
        </>
      }>
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'ios' ? Spacing.two : insets.top }]}>
        {showClose || isPro ? (
          <Pressable onPress={dismiss} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
            <ThemedText type="heading" themeColor="textSecondary">
              ✕
            </ThemedText>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      <ThemedText type="caption" themeColor="textSecondary">
        FRITTER PRO
      </ThemedText>
      <ThemedText type="title">{PAYWALL.headline}</ThemedText>
      {estimate.total > 0 ? (
        <Card tone="money">
          <ThemedText type="small">
            Your feed currently holds about{' '}
            <ThemedText type="smallBold" themeColor="money">
              {formatMoney(estimate.total)}
            </ThemedText>{' '}
            in payouts you may qualify for.
          </ThemedText>
        </Card>
      ) : null}

      <View style={styles.bullets}>
        {PAYWALL.bullets.map((b) => (
          <View key={b} style={styles.bullet}>
            <ThemedText type="default" style={{ color: theme.money }}>
              ✓
            </ThemedText>
            <ThemedText type="default" style={styles.bulletText}>
              {b}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.plans}>
        {yearly ? <PlanOption plan={yearly} selected={planId === 'yearly'} savings={savings} onPress={() => { setPlanId('yearly'); analytics.track(Events.paywallPlanSelected, { plan: 'yearly' }); }} /> : null}
        {weekly ? <PlanOption plan={weekly} selected={planId === 'weekly'} savings={0} onPress={() => { setPlanId('weekly'); analytics.track(Events.paywallPlanSelected, { plan: 'weekly' }); }} /> : null}
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        {PAYWALL.yearlyAnchorCopy}
      </ThemedText>

      <Card>
        <ThemedText type="smallBold">{PAYWALL.socialProofLine}</ThemedText>
        {SOCIAL_PROOF.slice(0, 2).map((p) => (
          <ThemedText key={p.name + p.quote} type="small" themeColor="textSecondary">
            {p.avatarEmoji ?? '🙂'} “{p.quote}” — {p.name}
          </ThemedText>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', minHeight: 32 },
  bullets: { gap: Spacing.two },
  bullet: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  bulletText: { flex: 1 },
  plans: { gap: Spacing.two },
  plan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, borderWidth: 2 },
  planLeft: { flex: 1, gap: Spacing.one },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  radio: { width: 24, height: 24, borderRadius: Radius.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.four },
});
