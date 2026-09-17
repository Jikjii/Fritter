import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type OptionTileProps = {
  label: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
};

/** Quiz answer tile used across onboarding question screens. */
export function OptionTile({ label, emoji, selected, onPress, multi }: OptionTileProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: selected ? theme.primarySoft : theme.backgroundElement,
          borderColor: selected ? theme.primary : theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      {emoji ? <ThemedText type="heading">{emoji}</ThemedText> : null}
      <ThemedText type={selected ? 'defaultBold' : 'default'} style={styles.label}>
        {label}
      </ThemedText>
      <View
        style={[
          styles.check,
          {
            borderColor: selected ? theme.primary : theme.border,
            backgroundColor: selected ? theme.primary : 'transparent',
            borderRadius: multi ? 6 : Radius.pill,
          },
        ]}>
        {selected ? <ThemedText type="caption" style={{ color: theme.textInverse }}>✓</ThemedText> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  label: { flex: 1 },
  check: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
