import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger';

export type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  size?: 'md' | 'lg';
  style?: ViewStyle;
  haptic?: boolean;
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  size = 'lg',
  style,
  disabled,
  onPress,
  haptic = true,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const bg = {
    primary: theme.primary,
    secondary: theme.backgroundElement,
    ghost: 'transparent',
    accent: theme.accent,
    danger: theme.dangerSoft,
  }[variant];
  const fg = {
    primary: theme.textInverse,
    secondary: theme.text,
    ghost: theme.primary,
    accent: theme.textInverse,
    danger: theme.danger,
  }[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={(e) => {
        if (haptic && Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        }
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <ThemedText type={size === 'lg' ? 'defaultBold' : 'smallBold'} style={{ color: fg }}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  lg: { paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, minHeight: 56 },
  md: { paddingVertical: Spacing.two + 2, paddingHorizontal: Spacing.three, minHeight: 40 },
});
