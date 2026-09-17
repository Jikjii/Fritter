import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, Screen } from '@/components/ui';
import { useAppStore } from '@/store/use-app-store';

export default function FormsScreen() {
  const forms = useAppStore((s) => s.forms);
  const catalog = useAppStore((s) => s.catalog);
  const router = useRouter();

  return (
    <Screen>
      <ThemedText type="title">Forms</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Every claim form and letter you have generated. Export as PDF, copy the text, or mail it in.
      </ThemedText>

      {forms.length === 0 ? (
        <Card>
          <ThemedText type="heading">No forms yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Open a payout and tap “Prepare my claim”. Fritter fills in the form and prepares a PDF
            you can send.
          </ThemedText>
          <Link href="/(tabs)" asChild>
            <Button title="Browse payouts" size="md" />
          </Link>
        </Card>
      ) : (
        forms.map((f) => {
          const o = catalog.find((x) => x.id === f.opportunityId);
          return (
            <Pressable
              key={f.id}
              onPress={() => router.push({ pathname: '/form/[id]', params: { id: f.id } })}
              accessibilityRole="button">
              <Card>
                <View style={styles.rowBetween}>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {f.createdAt.slice(0, 10)}
                  </ThemedText>
                  <Badge
                    label={f.fileUri ? 'PDF ready' : 'Draft'}
                    color={f.fileUri ? 'money' : 'primary'}
                  />
                </View>
                <ThemedText type="heading" numberOfLines={2}>
                  {f.title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {o?.company ?? 'Unknown company'} ·{' '}
                  {Object.values(f.fields).filter(Boolean).length} fields
                </ThemedText>
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
