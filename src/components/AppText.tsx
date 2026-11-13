// AppText.tsx
import { Text, TextProps } from 'react-native';
import { type } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

type Props = TextProps & { variant?: keyof typeof type; tone?: 'text' | 'muted' | 'subtle' };

export function AppText({ variant = 'body', tone = 'text', style, ...p }: Props) {
  const { colors } = useTheme();
  return <Text style={[type[variant], { color: colors[tone] }, style]} {...p} />;
}