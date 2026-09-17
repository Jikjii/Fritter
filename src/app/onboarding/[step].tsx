import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryBars, GrowthLine } from '@/components/charts';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, OptionTile, ProgressBar, Screen, Stat } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { ONBOARDING_SCREENS } from '@/content/onboarding';
import { SOCIAL_PROOF, SOCIAL_STATS } from '@/content/social-proof';
import { estimateOwed, formatMoney } from '@/domain/estimate';
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
      <Pressable onPress={onBack} disabled={index === 0} accessibilityRole="button" accessibilityLabel="Back" style={{ opacity: index === 0 ? 0 : 1 }}>
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

function Hook({ screen, onNext }: { screen: OnboardingScreen; onNext: () => void }) {
  return (
    <Screen noTopInset footer={<Button title={screen.cta ?? 'Continue'} onPress={onNext} />}>
      <View style={styles.hero}>
        <ThemedText type="display">{screen.notes?.startsWith('emoji:') ? screen.notes.slice(6) : '💸'}</ThemedText>
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

function Question({ screen, onNext }: { screen: OnboardingScreen; onNext: () => void }) {
  const multi = screen.type === 'multiQuestion';
  const key = screen.profileKey as string;
  const current = useAppStore((s) => s.profile[key]);
  const setProfileValue = useAppStore((s) => s.setProfileValue);
  const [selected, setSelected] = useState<string[]>(() => (Array.isArray(current) ? current : typeof current === 'string' ? [current] : []));

  const commit = (values: string[]) => {
    const value: ProfileValue | undefined = multi ? values : values[0];
    setProfileValue(key, value);
    analytics.track(Events.onboardingAnswer, { screen: screen.id, key, value: Array.isArray(value) ? value.join(',') : value });
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
          <OptionTile key={o.value} label={o.label} emoji={o.emoji} selected={selected.includes(o.value)} onPress={() => toggle(o.value)} multi={multi} />
        ))}
      </View>
    </Screen>
  );
}

function Identity({ screen, onNext }: { screen: OnboardingScreen; onNext: () => void }) {
  const theme = useTheme();
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const [firstName, setFirstName] = useState(typeof profile.firstName === 'string' ? profile.firstName : '');
  const [email, setEmail] = useState(typeof profile.email === 'string' ? profile.email : '');
  const valid = firstName.trim().length > 0;
  return (
    <Screen
      noTopInset
      footer={
        <Button
          title={screen.cta ?? 'Continue'}
          disabled={!valid}
          onPress={() => {
            setProfile({ firstName: firstName.trim(), email: email.trim() });
            analytics.track(Events.onboardingAnswer, { screen: screen.id, key: 'identity', value: email ? 'with_email' : 'name_only' });
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
        <TextInput value={firstName} onChangeText={setFirstName} autoFocus placeholder="Rin" placeholderTextColor={theme.textSecondary} autoCapitalize="words" style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
      </View>
      <View style={styles.field}>
        <ThemedText type="caption" themeColor="textSecondary">
          Email (for your claim forms — optional)
        </ThemedText>
        <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={theme.textSecondary} keyboardType="email-address" autoCapitalize="none" style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        Stays on your device. Only used to pre-fill forms you generate.
      </ThemedText>
    </Screen>
  );
}

function Loading({ screen, onNext }: { screen: OnboardingScreen; onNext: () => void }) {
  const [step, setStep] = useState(0);
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
        <ProgressBar value={Math.min(1, step / SCAN_STEPS.length)} height={10} />
        <View style={styles.scanList}>
          {SCAN_STEPS.map((s, i) => (
            <ThemedText key={s} type="small" themeColor={i < step ? 'money' : i === step ? 'text' : 'textSecondary'}>
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
  // "Money found by fans like you" — illustrative curve; copy on screen must say so.
  const points = useMemo(() => [40, 55, 70, 95, 120, 160, 210, 280], []);
  return (
    <Screen noTopInset footer={<Button title={screen.cta ?? 'Continue'} onPress={onNext} />}>
      <ThemedText type="title">{screen.title}</ThemedText>
      {screen.subtitle ? (
        <ThemedText type="small" themeColor="textSecondary">
          {screen.subtitle}
        </ThemedText>
      ) : null}
      <Card>
        <GrowthLine points={points} labels={['Week 1', 'Week 4', 'Week 8']} endLabel="$280" />
        <ThemedText type="caption" themeColor="textSecondary">
          Illustrative: cumulative value of open claims a typical fan can file over 8 weeks.
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
  const count = estimate.likelyCount + estimate.possibleCount;
  const name = typeof profile.firstName === 'string' && profile.firstName ? profile.firstName : null;
  return (
    <Screen noTopInset footer={<Button title={screen.cta ?? 'Claim it'} onPress={onNext} />}>
      <ThemedText type="caption" themeColor="textSecondary">
        {name ? `${name.toUpperCase()}, YOU MAY BE OWED` : 'YOU MAY BE OWED'}
      </ThemedText>
      <ThemedText type="display" themeColor="money">
        {count > 0 ? `~${formatMoney(estimate.total)}` : '$0'}
      </ThemedText>
      <ThemedText type="default">
        {count > 0
          ? `${estimate.likelyCount} payout${estimate.likelyCount === 1 ? '' : 's'} you likely qualify for and ${estimate.possibleCount} more to check. Range ${formatMoney(estimate.low)}–${formatMoney(estimate.high)}.`
          : screen.subtitle ?? 'We did not find a match yet — new payouts are added every week, and we will alert you when one fits.'}
      </ThemedText>
      <Card>
        <ThemedText type="heading">Where it comes from</ThemedText>
        <CategoryBars byCategory={estimate.byCategory} />
      </Card>
      <ThemedText type="caption" themeColor="textSecondary">
        Estimates use ranges published by settlement administrators and companies. Not a guarantee.
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
      {SOCIAL_PROOF.map((p) => (
        <Card key={p.name + p.quote}>
          <View style={styles.rowBetween}>
            <ThemedText type="smallBold">
              {p.avatarEmoji ?? '🙂'} {p.name}
              {p.handle ? <ThemedText type="caption" themeColor="textSecondary">{`  ${p.handle}`}</ThemedText> : null}
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

  const goTo = (next: number) => {
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
  const onBack = () => (index > 0 ? router.back() : undefined);

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
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  progress: { flex: 1 },
  hero: { flex: 1, justifyContent: 'center', gap: Spacing.three, paddingVertical: Spacing.five },
  options: { gap: Spacing.two },
  field: { gap: Spacing.one },
  input: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, fontSize: 18 },
  scanList: { gap: Spacing.one },
  stats: { flexDirection: 'row', gap: Spacing.two },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
});
