import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CardProps = ViewProps & { tone?: 'element' | 'primary' | 'money' | 'accent' | 'gold' };

export function Card({ style, tone = 'element', ...rest }: CardProps) {
  const theme = useTheme();
  const bg = {
    element: theme.backgroundElement,
    primary: theme.primarySoft,
    money: theme.moneySoft,
    accent: theme.accentSoft,
    gold: theme.goldSoft,
  }[tone];
  return (
    <View
      style={[styles.card, { backgroundColor: bg, borderColor: theme.border }, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
