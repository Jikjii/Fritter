import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextType =
  | 'default'
  | 'defaultBold'
  | 'display'
  | 'title'
  | 'subtitle'
  | 'heading'
  | 'small'
  | 'smallBold'
  | 'caption'
  | 'link'
  | 'code'
  | 'money';

export type ThemedTextProps = TextProps & {
  type?: ThemedTextType;
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  return (
    <Text
      style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  defaultBold: { fontSize: 16, lineHeight: 24, fontWeight: '700' },
  display: { fontSize: 56, lineHeight: 60, fontWeight: '800', letterSpacing: -1.5 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  link: { fontSize: 14, lineHeight: 20, fontWeight: '600', textDecorationLine: 'underline' },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
  },
  money: { fontSize: 40, lineHeight: 46, fontWeight: '800', letterSpacing: -1 },
});
