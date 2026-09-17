import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { BASE_FORM_FIELDS } from '@/domain/documents';
import { useTheme } from '@/hooks/use-theme';
import { analytics, Events } from '@/services/analytics';
import { isMockPurchases, purchases } from '@/services/purchases';
import { useAppStore } from '@/store/use-app-store';

const TERMS_URL = 'https://example.com/terms';
const PRIVACY_URL = 'https://example.com/privacy';

function confirm(title: string, message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Continue', style: 'destructive', onPress: onYes },
  ]);
}

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const isPro = useAppStore((s) => s.isPro);
  const setPro = useAppStore((s) => s.setPro);
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const resetOnboarding = useAppStore((s) => s.resetOnboarding);
  const resetAll = useAppStore((s) => s.resetAll);
  const catalog = useAppStore((s) => s.catalog);
  const catalogUpdatedAt = useAppStore((s) => s.catalogUpdatedAt);
  const [restoring, setRestoring] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      BASE_FORM_FIELDS.map((f) => [
        f.key,
        typeof profile[f.key] === 'string' ? (profile[f.key] as string) : '',
      ])
    )
  );

  const restore = async () => {
    setRestoring(true);
    const res = await purchases.restore();
    setRestoring(false);
    if (res.isPro) {
      setPro(true);
      analytics.track(Events.purchaseRestored);
      Alert.alert('Restored', 'Your Pro access is back.');
    } else {
      Alert.alert(
        'Nothing to restore',
        res.error ?? 'No active subscription was found for this store account.'
      );
    }
  };

  const saveIdentity = () => {
    setProfile(draft);
    setEditing(false);
  };

  return (
    <Screen>
      <ThemedText type="title">Profile</ThemedText>

      <Card tone={isPro ? 'money' : 'primary'}>
        <View style={styles.rowBetween}>
          <ThemedText type="heading">{isPro ? 'Fritter Pro' : 'Free plan'}</ThemedText>
          <Badge label={isPro ? 'Active' : 'Locked'} color={isPro ? 'money' : 'primary'} />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {isPro
            ? 'Every payout, claim form and deadline reminder is unlocked.'
            : 'Unlock every payout in your feed, ready-to-send claim forms and deadline reminders.'}
        </ThemedText>
        {!isPro ? (
          <Button title="Unlock Pro" onPress={() => router.push('/paywall')} size="md" />
        ) : null}
        <Button
          title={restoring ? 'Restoring…' : 'Restore purchases'}
          variant="ghost"
          size="md"
          loading={restoring}
          onPress={restore}
        />
        {isMockPurchases ? (
          <ThemedText type="caption" themeColor="textSecondary">
            Mock store active (no RevenueCat keys). Purchases succeed instantly in this build.
          </ThemedText>
        ) : null}
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <ThemedText type="heading">Claim identity</ThemedText>
          <Button
            title={editing ? 'Cancel' : 'Edit'}
            variant="secondary"
            size="md"
            style={styles.smallBtn}
            onPress={() => setEditing((v) => !v)}
          />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Pre-fills every form you generate. Stored only on this device.
        </ThemedText>
        {editing ? (
          <View style={styles.form}>
            {BASE_FORM_FIELDS.map((f) => (
              <View key={f.key} style={styles.field}>
                <ThemedText type="caption" themeColor="textSecondary">
                  {f.label}
                  {f.required ? ' *' : ''}
                </ThemedText>
                <TextInput
                  value={draft[f.key] ?? ''}
                  onChangeText={(t) => setDraft((d) => ({ ...d, [f.key]: t }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={theme.textSecondary}
                  keyboardType={f.type === 'email' ? 'email-address' : 'default'}
                  autoCapitalize={f.type === 'email' ? 'none' : 'words'}
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                    },
                  ]}
                />
              </View>
            ))}
            <Button title="Save" size="md" onPress={saveIdentity} />
          </View>
        ) : (
          <ThemedText type="small">
            {[profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'No name yet'}
            {profile.email ? ` · ${profile.email}` : ''}
            {profile.city ? ` · ${profile.city}${profile.state ? `, ${profile.state}` : ''}` : ''}
          </ThemedText>
        )}
      </Card>

      <Card>
        <ThemedText type="heading">Your answers</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Eligibility is based on your onboarding answers. Redo them any time.
        </ThemedText>
        <Button
          title="Redo the quiz"
          variant="secondary"
          size="md"
          onPress={() => {
            resetOnboarding();
            router.replace('/onboarding');
          }}
        />
      </Card>

      <Card>
        <ThemedText type="heading">Catalog</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {catalog.length} opportunities ·{' '}
          {catalogUpdatedAt ? `refreshed ${catalogUpdatedAt.slice(0, 10)}` : 'bundled edition'}
        </ThemedText>
      </Card>

      <Card>
        <ThemedText type="heading">Legal</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Fritter is not a law firm and does not give legal advice. Payout estimates are ranges
          published by settlement administrators or companies and are not guarantees. Always confirm
          requirements with the official source before you file.
        </ThemedText>
        <View style={styles.links}>
          <Button
            title="Terms"
            variant="ghost"
            size="md"
            onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}
          />
          <Button
            title="Privacy"
            variant="ghost"
            size="md"
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
          />
        </View>
      </Card>

      <Button
        title="Delete all my data"
        variant="danger"
        size="md"
        onPress={() =>
          confirm(
            'Delete everything?',
            'Answers, claims and generated forms on this device will be erased.',
            () => {
              resetAll();
              router.replace('/onboarding');
            }
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  smallBtn: { alignSelf: 'auto', minWidth: 80 },
  form: { gap: Spacing.two },
  field: { gap: Spacing.one },
  input: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
  },
  links: { flexDirection: 'row', gap: Spacing.two },
});
