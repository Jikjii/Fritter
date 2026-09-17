import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeProps = { label: string; color?: ThemeColor; soft?: boolean; emoji?: string };

/** Small pill label. `color` picks the theme color; `soft` uses its *Soft background. */
export function Badge({ label, color = 'primary', soft = true, emoji }: BadgeProps) {
  const theme = useTheme();
  const softKey = `${color}Soft` as ThemeColor;
  const bg = soft && softKey in theme ? theme[softKey] : theme[color];
  const fg = soft && softKey in theme ? theme[color] : theme.textInverse;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <ThemedText type="caption" style={{ color: fg, fontWeight: '700' }}>
        {emoji ? `${emoji} ` : ''}
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
});
