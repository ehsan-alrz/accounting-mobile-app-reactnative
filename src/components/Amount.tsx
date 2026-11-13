// Amount.tsx
import { Text, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { font } from '../theme/tokens';

const fmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Amount({ value, signed = false, style }:
  { value: number; signed?: boolean; style?: TextStyle }) {
  const { colors } = useTheme();
  const sign = value < 0 ? '−' : signed ? '+' : '';
  const color = !signed ? colors.text : value < 0 ? colors.neg : colors.pos;
  return (
    <Text style={[{
      fontFamily: font.semibold, color,
      writingDirection: 'ltr',
      fontVariant: ['tabular-nums'],
    }, style]}>
      {sign}{fmt.format(Math.abs(value))}
    </Text>
  );
}