// StatusBadge.tsx
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { font, radius } from '../theme/tokens';

export type Status = 'draft' | 'posted' | 'partial' | 'paid' | 'void';

export function StatusBadge({ status }: { status: Status }) {
  const { colors: c } = useTheme();
  const map = {
    draft:   { label: 'مسودة',         bg: c.chip,        fg: c.muted },
    posted:  { label: 'مرحّلة',         bg: c.primarySoft, fg: c.primary },
    partial: { label: 'مدفوعة جزئيًا', bg: c.accentSoft,  fg: c.warnText },
    paid:    { label: 'مدفوعة',         bg: c.primarySoft, fg: c.primary },
    void:    { label: 'ملغاة',          bg: c.negSoft,     fg: c.neg },
  }[status];

  return (
    <View style={{ backgroundColor: map.bg, borderRadius: radius.pill,
      paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ fontFamily: font.semibold, fontSize: 10.5, color: map.fg }}>{map.label}</Text>
    </View>
  );
}