import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as WebBrowser from 'expo-web-browser';

import { CategoryBars } from '@/components/charts';
import { OpportunityCard } from '@/components/opportunity-card';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, OptionTile, ProgressBar, Screen, Stat } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { ONBOARDING_SCREENS } from '@/content/onboarding';
import { SOCIAL_FACTS, SOCIAL_PROOF, SOCIAL_STATS } from '@/content/social-proof';
import { rankOpportunities } from '@/domain/eligibility';
import {
  estimateOwed,
  formatExact,
  formatMoney,
  isClosed,
  isSummable,
  isWatching,
} from '@/domain/estimate';
import { nextVisibleIndex, prevVisibleIndex } from '@/domain/onboarding';
import type { OnboardingScreen, ProfileValue } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { analytics, Events } from '@/services/analytics';
import { requestNotificationPermission } from '@/services/notifications';
import { useAppStore } from '@/store/use-app-store';

const TOTAL = ONBOARDING_SCREENS.length;

/** Fake "scanning" steps shown on loading screens — the scientific-feel beat of the playbook. */
const SCAN_STEPS = [
  'Checking open settlements…',
  'Matching your services…',
  'Scanning refund programs…',
  'Checking convention & travel claims…',
  'Building your payout list…',
];

function Header({ index, onBack }: { index: number; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
      <Pressable
        onPress={onBack}
        disabled={index === 0}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={{ opacity: index === 0 ? 0 : 1 }}>
        <ThemedText type="heading">‹</ThemedText>
      </Pressable>
      <View style={styles.progress}>
        <ProgressBar value={(index + 1) / TOTAL} />
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        {index + 1}/{TOTAL}
      </ThemedText>
    </View>
  );
}

function SourceLink({ url }: { url?: string }) {
  if (!url) return null;
  return (
    <Pressable
      onPress={() => WebBrowser.openBrowserAsync(url)}
      accessibilityRole="link"
      accessibilityLabel="Source"
      hitSlop={8}>
      <ThemedText type="caption" themeColor="textSecondary">
        ⓘ source
      </ThemedText>
    </Pressable>
  );
}

function Hook({ screen, onNext }: { screen: OnboardingScreen; onNext: () => void }) {
  const cards = screen.options ?? [];
  return (
    <Screen noTopInset footer={<Button title={screen.cta ?? 'Continue'} onPress={onNext} />}>
      <View style={[styles.hero, cards.length ? styles.heroCompact : null]}>
        <ThemedText type="display">
          {screen.notes?.startsWith('emoji:') ? screen.notes.slice(6) : '💸'}
        </ThemedText>
        <ThemedText type="title">{screen.title}</ThemedText>
        {screen.subtitle ? (
          <ThemedText type="default" themeColor="textSecondary">
            {screen.subtitle}
          </ThemedText>
        ) : null}
      </View>
      {cards.map((c) => (
        <Card key={c.label} tone="money">
          <View style={styles.rowBetween}>
            <ThemedText type="smallBold">
              {c.emoji ? `${c.emoji} ` : ''}
              {c.label}
            </ThemedText>
            <SourceLink url={c.sourceUrl} />
          </View>
          <ThemedText type="small">{c.value}</ThemedText>
        </Card>
      ))}
    </Screen>
  );
}

function Question({ screen, onNext }: { screen: OnboardingScreen; onNext: () => void }) {
  const multi = screen.type === 'multiQuestion';
  const key = screen.profileKey as string;
  const current = useAppStore((s) => s.profile[key]);
  const setProfileValue = useAppStore((s) => s.setProfileValue);
  const [selected, setSelected] = useState<string[]>(() =>
    Array.isArray(current) ? current : typeof current === 'string' ? [current] : []
  );

  const commit = (values: string[]) => {
    const value: ProfileValue | undefined = multi ? values : values[0];
    setProfileValue(key, value);
    analytics.track(Events.onboardingAnswer, {
      screen: screen.id,
      key,
      value: Array.isArray(value) ? value.join(',') : value,
    });
  };

  const toggle = (value: string) => {
    if (!multi) {
      setSelected([value]);
      commit([value]);
      setTimeout(onNext, 180);
      return;
    }
    const isNone = value === 'none';
    setSelected((prev) => {
      if (isNone) return prev.includes('none') ? [] : ['none'];
      const without = prev.filter((v) => v !== 'none');
      return without.includes(value) ? without.filter((v) => v !== value) : [...without, value];
    });
  };

  return (
    <Screen
      noTopInset
      footer={
        multi ? (
          <Button
            title={screen.cta ?? 'Continue'}
            disabled={selected.length === 0}
            onPress={() => {
              commit(selected);
              onNext();
            }}
          />
        ) : undefined
      }>
      <ThemedText type="title">{screen.title}</ThemedText>
      {screen.subtitle ? (
        <ThemedText type="small" themeColor="textSecondary">
          {screen.subtitle}
        </ThemedText>
      ) : null}
      <View style={styles.options}>
        {(screen.options ?? []).map((o) => (
          <OptionTile
            key={o.value}
            label={o.label}
            emoji={o.emoji}
            selected={selected.includes(o.value)}
            onPress={() => toggle(o.value)}
            multi={multi}
          />
        ))}
      </View>
    </Screen>
  );
}

function Identity({ screen, onNext }: { screen: OnboardingScreen; onNext: () => void }) {
  const theme = useTheme();
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const [firstName, setFirstName] = useState(
    typeof profile.firstName === 'string' ? profile.firstName : ''
  );
  const [email, setEmail] = useState(typeof profile.email === 'string' ? profile.email : '');
  const [adult, setAdult] = useState(Boolean(profile.ageConfirmedAt));
  const valid = firstName.trim().length > 0 && adult;
  return (
    <Screen
      noTopInset
      footer={
        <Button
          title={screen.cta ?? 'Continue'}
          disabled={!valid}
          onPress={() => {
            setProfile({
              firstName: firstName.trim(),
              email: email.trim(),
              ageConfirmedAt: profile.ageConfirmedAt ?? new Date().toISOString(),
            });
            analytics.track(Events.onboardingAnswer, {
              screen: screen.id,
              key: 'identity',
              value: email ? 'with_email' : 'name_only',
            });
            onNext();
          }}
        />
      }>
      <ThemedText type="title">{screen.title}</ThemedText>
      {screen.subtitle ? (
        <ThemedText type="small" themeColor="textSecondary">
          {screen.subtitle}
        </ThemedText>
      ) : null}
      <View style={styles.field}>
        <ThemedText type="caption" themeColor="textSecondary">
          First name
        </ThemedText>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          autoFocus
          placeholder="Rin"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="words"
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />
      </View>
      <View style={styles.field}>
        <ThemedText type="caption" themeColor="textSecondary">
          Email (for your claim forms — optional)
        </ThemedText>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={theme.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />
      </View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: adult }}
        onPress={() => setAdult((v) => !v)}
        style={[
          styles.checkRow,
          {
            borderColor: adult ? theme.primary : theme.border,
            backgroundColor: theme.backgroundElement,
          },
        ]}>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: adult ? theme.primary : theme.border,
              backgroundColor: adult ? theme.primary : 'transparent',
            },
          ]}>
          {adult ? (
            <ThemedText type="caption" style={{ color: theme.textInverse }}>
              ✓
            </ThemedText>
          ) : null}
        </View>
        <ThemedText type="small" style={styles.checkLabel}>
          I’m 18 or older. (Settlement administrators and card issuers only accept claims from
          adults.)
        </ThemedText>
      </Pressable>
      <ThemedText type="caption" themeColor="textSecondary">
        Stays on your device. Only used to pre-fill forms you generate.
      </ThemedText>
    </Screen>
  );
}

function Loading({ screen, onNext }: { screen: OnboardingScreen; onNext: () => void }) {
  const [step, setStep] = useState(0);
  const catalog = useAppStore((s) => s.catalog);
  const liveCount = useMemo(
    () => catalog.filter((o) => o.confidence === 'verified_current' && !isClosed(o)).length,
    [catalog]
  );
  useEffect(() => {
    if (step >= SCAN_STEPS.length) {
      const t = setTimeout(onNext, 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 520);
    return () => clearTimeout(t);
  }, [step, onNext]);
  return (
    <Screen noTopInset scroll={false}>
      <View style={styles.hero}>
        <ThemedText type="display">🔎</ThemedText>
        <ThemedText type="title">{screen.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Against {liveCount} live programs and rights.
        </ThemedText>
        <ProgressBar value={Math.min(1, step / SCAN_STEPS.length)} height={10} />
        <View style={styles.scanList}>
          {SCAN_STEPS.map((s, i) => (
            <ThemedText
              key={s}
              type="small"
              themeColor={i < step ? 'money' : i === step ? 'text' : 'textSecondary'}>
              {i < step ? '✓ ' : i === step ? '… ' : '  '}
              {s}
            </ThemedText>
          ))}
        </View>
      </View>
    </Screen>
  );
}

function Chart({ screen, onNext }: { screen: OnboardingScreen; onNext: () => void }) {
  const theme = useTheme();
  // Every bar is a documented per-person maximum from a real program (label carries OPEN/AUTOMATIC/CLOSED).
  const bars = useMemo(
    () =>
      (screen.options ?? [])
        .map((o) => ({ ...o, amount: Number(o.value) || 0 }))
        .sort((a, b) => b.amount - a.amount),
    [screen.options]
  );
  const max = Math.max(1, ...bars.map((b) => b.amount));
  return (
    <Screen noTopInset footer={<Button title={screen.cta ?? 'Continue'} onPress={onNext} />}>
      <ThemedText type="title">{screen.title}</ThemedText>
      {screen.subtitle ? (
        <ThemedText type="small" themeColor="textSecondary">
          {screen.subtitle}
        </ThemedText>
      ) : null}
      <Card>
        {bars.map((b) => {
          const closed = /CLOSED/.test(b.label);
          return (
            <View key={b.label} style={styles.bar}>
              <View style={styles.rowBetween}>
                <ThemedText
                  type="caption"
                  themeColor={closed ? 'textSecondary' : 'text'}
                  style={styles.barLabel}
                  numberOfLines={1}>
                  {b.label}
                </ThemedText>
                <SourceLink url={b.sourceUrl} />
              </View>
              <View style={styles.barRow}>
                <View style={[styles.barTrack, { backgroundColor: theme.backgroundSelected }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.max(4, (b.amount / max) * 100)}%`,
                        backgroundColor: closed ? theme.textSecondary : theme.money,
                      },
                    ]}
                  />
                </View>
                <ThemedText type="smallBold" style={styles.barValue}>
                  {formatExact(b.amount)}
                </ThemedText>
              </View>
            </View>
          );
        })}
        <ThemedText type="caption" themeColor="textSecondary">
          Every bar is a real, documented program. We never invent settlements.
        </ThemedText>
      </Card>
      <View style={styles.stats}>
        {SOCIAL_STATS.map((s) => (
          <Stat key={s.label} label={s.label} value={s.value} />
        ))}
      </View>
    </Screen>
  );
}

function Reveal({ screen, onNext }: { screen: OnboardingScreen; onNext: () => void }) {
  const catalog = useAppStore((s) => s.catalog);
  const profile = useAppStore((s) => s.profile);
  const estimate = useMemo(() => estimateOwed(catalog, profile), [catalog, profile]);
  const top = useMemo(() => {
    const matched = rankOpportunities(catalog, profile).filter(
      (r) =>
        (r.eligibility.status === 'likely' || r.eligibility.status === 'possible') &&
        !isClosed(r.opportunity)
    );
    const rank = (o: (typeof matched)[number]['opportunity']) =>
      isSummable(o) ? 0 : isWatching(o) ? 2 : 1;
    return matched.sort((a, b) => rank(a.opportunity) - rank(b.opportunity)).slice(0, 3);
  }, [catalog, profile]);
  const name =
    typeof profile.firstName === 'string' && profile.firstName ? profile.firstName : null;
  const matched = estimate.matchCount > 0;
  return (
    <Screen noTopInset footer={<Button title={screen.cta ?? 'Claim it'} onPress={onNext} />}>
      <ThemedText type="caption" themeColor="textSecondary">
        {name ? `${name.toUpperCase()}, YOU MATCH` : 'YOU MATCH'}
      </ThemedText>
      <ThemedText type="display" themeColor="money">
        {estimate.matchCount} program{estimate.matchCount === 1 ? '' : 's'}
      </ThemedText>
      {matched ? (
        <ThemedText type="default">
          {estimate.sumCount > 0
            ? `${estimate.sumCount} of them ${estimate.sumCount === 1 ? 'is' : 'are'} paying up to ${formatExact(estimate.total)} right now.`
            : 'None of them is paying cash today, but every one is worth a claim.'}
          {estimate.equalsPaidCount > 0 ? ` ${estimate.equalsPaidCount} refund what you paid.` : ''}
          {estimate.watchCount > 0
            ? ` ${estimate.watchCount} ${estimate.watchCount === 1 ? 'is' : 'are'} on your Watchlist for when claims open.`
            : ''}
        </ThemedText>
      ) : (
        <ThemedText type="default">
          {screen.subtitle ??
            'We did not find a match yet — new payouts are added every week, and we will alert you when one fits.'}
        </ThemedText>
      )}
      {estimate.closedMatchCount > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {estimate.closedMatchCount} you already missed, so you never miss again.
        </ThemedText>
      ) : null}
      {estimate.total > 0 ? (
        <Card>
          <ThemedText type="heading">Where the money comes from</ThemedText>
          <CategoryBars byCategory={estimate.byCategory} />
        </Card>
      ) : null}
      {top.map((r) => (
        <OpportunityCard
          key={r.opportunity.id}
          opportunity={r.opportunity}
          status={r.eligibility.status}
          compact
          locked
        />
      ))}
      <ThemedText type="caption" themeColor="textSecondary">
        Estimates use only documented maximums from settlement administrators, agencies and
        companies. Actual payouts vary. Not a guarantee.
      </ThemedText>
    </Screen>
  );
}

function SocialProof({ screen, onNext }: { screen: OnboardingScreen; onNext: () => void }) {
  return (
    <Screen noTopInset footer={<Button title={screen.cta ?? 'Continue'} onPress={onNext} />}>
      <ThemedText type="title">{screen.title}</ThemedText>
      {screen.subtitle ? (
        <ThemedText type="small" themeColor="textSecondary">
          {screen.subtitle}
        </ThemedText>
      ) : null}
      {SOCIAL_FACTS.map((f) => (
        <Card key={f.sourceUrl} tone="money">
          <View style={styles.rowBetween}>
            <ThemedText type="heading">{f.emoji ?? '✅'}</ThemedText>
            <SourceLink url={f.sourceUrl} />
          </View>
          <ThemedText type="small">{f.text}</ThemedText>
        </Card>
      ))}
      {SOCIAL_PROOF.map((p) => (
        <Card key={p.name + p.quote}>
          <View style={styles.rowBetween}>
            <ThemedText type="smallBold">
              {p.avatarEmoji ?? '🙂'} {p.name}
              {p.handle ? (
                <ThemedText type="caption" themeColor="textSecondary">{`  ${p.handle}`}</ThemedText>
              ) : null}
            </ThemedText>
            {p.amount ? (
              <ThemedText type="smallBold" themeColor="money">
                +{formatMoney(p.amount)}
              </ThemedText>
            ) : null}
          </View>
          <ThemedText type="small">“{p.quote}”</ThemedText>
        </Card>
      ))}
    </Screen>
  );
}

function Notifications({ screen, onNext }: { screen: OnboardingScreen; onNext: () => void }) {
  const setNotificationsGranted = useAppStore((s) => s.setNotificationsGranted);
  const [busy, setBusy] = useState(false);
  const ask = async () => {
    setBusy(true);
    analytics.track(Events.notificationsPrompted);
    const granted = await requestNotificationPermission();
    setNotificationsGranted(granted);
    if (granted) analytics.track(Events.notificationsGranted);
    setBusy(false);
    onNext();
  };
  return (
    <Screen
      noTopInset
      footer={
        <>
          <Button title={screen.cta ?? 'Turn on reminders'} loading={busy} onPress={ask} />
          <Button title="Not now" variant="ghost" onPress={onNext} />
        </>
      }>
      <View style={styles.hero}>
        <ThemedText type="display">🔔</ThemedText>
        <ThemedText type="title">{screen.title}</ThemedText>
        {screen.subtitle ? (
          <ThemedText type="default" themeColor="textSecondary">
            {screen.subtitle}
          </ThemedText>
        ) : null}
      </View>
    </Screen>
  );
}

export default function OnboardingStep() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const router = useRouter();
  const index = Math.min(Math.max(0, Number.parseInt(step ?? '0', 10) || 0), TOTAL - 1);
  const screen = ONBOARDING_SCREENS[index];
  const setOnboardingStep = useAppStore((s) => s.setOnboardingStep);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  useEffect(() => {
    setOnboardingStep(index);
    analytics.track(Events.onboardingStep, { screen: screen.id, index, type: screen.type });
  }, [index, screen.id, screen.type, setOnboardingStep]);

  const goTo = (from: number) => {
    const next = nextVisibleIndex(ONBOARDING_SCREENS, useAppStore.getState().profile, from);
    if (next >= TOTAL) {
      completeOnboarding();
      analytics.track(Events.onboardingComplete);
      router.replace('/(tabs)');
      return;
    }
    const target = ONBOARDING_SCREENS[next];
    if (target.type === 'paywall') {
      completeOnboarding();
      analytics.track(Events.onboardingComplete);
      analytics.track(Events.paywallViewed, { source: 'onboarding' });
      router.replace('/paywall');
      return;
    }
    router.push({ pathname: '/onboarding/[step]', params: { step: String(next) } });
  };
  const onNext = () => goTo(index + 1);
  const onBack = () => {
    const prev = prevVisibleIndex(ONBOARDING_SCREENS, useAppStore.getState().profile, index);
    if (prev < 0) return;
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/onboarding/[step]', params: { step: String(prev) } });
  };

  let body: React.ReactNode;
  switch (screen.type) {
    case 'hook':
      body = <Hook screen={screen} onNext={onNext} />;
      break;
    case 'question':
    case 'multiQuestion':
      body = <Question key={screen.id} screen={screen} onNext={onNext} />;
      break;
    case 'identity':
      body = <Identity screen={screen} onNext={onNext} />;
      break;
    case 'loading':
      body = <Loading screen={screen} onNext={onNext} />;
      break;
    case 'chart':
      body = <Chart screen={screen} onNext={onNext} />;
      break;
    case 'reveal':
      body = <Reveal screen={screen} onNext={onNext} />;
      break;
    case 'socialProof':
      body = <SocialProof screen={screen} onNext={onNext} />;
      break;
    case 'notifications':
      body = <Notifications screen={screen} onNext={onNext} />;
      break;
    case 'paywall':
    default:
      body = <Hook screen={screen} onNext={onNext} />;
  }

  return (
    <View style={styles.root}>
      <Header index={index} onBack={onBack} />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  progress: { flex: 1 },
  hero: { flex: 1, justifyContent: 'center', gap: Spacing.three, paddingVertical: Spacing.five },
  options: { gap: Spacing.two },
  field: { gap: Spacing.one },
  input: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 18,
  },
  scanList: { gap: Spacing.one },
  stats: { flexDirection: 'row', gap: Spacing.two },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  heroCompact: { flex: 0, paddingVertical: Spacing.three },
  checkRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkLabel: { flex: 1 },
  bar: { gap: Spacing.one, paddingVertical: Spacing.one },
  barLabel: { flex: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  barTrack: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6 },
  barValue: { width: 64, textAlign: 'right' },
});
