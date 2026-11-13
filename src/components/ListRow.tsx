import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { Amount } from './Amount';
import { font } from '../theme/tokens';

type Props = { glyph: string; title: string; subtitle: string; amount: number; last?: boolean };

export function ListRow({ glyph, title, subtitle, amount, last }: Props) {
  const { colors: c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border,
      }}>
      <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: c.chip,
        alignItems: 'center', justifyContent: 'center' }}>
        <AppText style={{ color: c.primary, fontFamily: font.bold, fontSize: 11 }}>{glyph}</AppText>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 11 }}>{title}</AppText>
        <AppText numberOfLines={1} tone="muted" variant="caption" style={{ fontSize: 9.5 }}>{subtitle}</AppText>
      </View>
      <Amount value={amount} signed style={{ fontSize: 11 }} />
    </View>
  );
}