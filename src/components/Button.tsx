// Button.tsx
import { Pressable, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { font, radius, TAP } from '../theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({ title, variant = 'primary', onPress, disabled }:
  { title: string; variant?: Variant; onPress?: () => void; disabled?: boolean }) {
  const { colors: c } = useTheme();
  const v = {
    primary:   { bg: c.primary,   fg: c.onPrimary, border: 'transparent' },
    secondary: { bg: c.surface,   fg: c.primary,   border: c.borderStrong },
    ghost:     { bg: 'transparent', fg: c.muted,    border: 'transparent' },
    danger:    { bg: c.negSoft,   fg: c.neg,        border: 'transparent' },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: TAP, paddingHorizontal: 16, borderRadius: radius.field,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: v.bg, borderWidth: 1, borderColor: v.border,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      })}>
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: v.fg }}>{title}</Text>
    </Pressable>
  );
}