import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from '../components/AppText';
import { HeroBalance } from '../components/HeroBalance';
import { KpiCard } from '../components/KpiCard';
import { SectionHeader } from '../components/SectionHeader';
import { ListRow } from '../components/ListRow';
import { Card } from '../components/Card';
import { Fab } from '../components/Fab';
import { font } from '../theme/tokens';

// بيانات مؤقتة: بتنستبدل لاحقًا بطبقة البيانات الحقيقية (infrastructure)
const RECENT = [
  { id: '1', glyph: '↓', title: 'فاتورة مبيعات INV-2026-0042', subtitle: 'شركة الأفق · اليوم', amount: 5520 },
  { id: '2', glyph: '↑', title: 'مصروف: إيجار المكتب', subtitle: 'تحويل بنكي · أمس', amount: -8000 },
  { id: '3', glyph: '✓', title: 'تحصيل من عميل', subtitle: 'فاتورة INV-2026-0038', amount: 12650 },
];

export function HomeScreen() {
  const { colors: c } = useTheme();
  const { top } = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: top + 12, paddingHorizontal: 16, paddingBottom: 90 }}>
        {/* الترويسة */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ gap: 1 }}>
            <AppText style={{ fontFamily: font.semibold, fontSize: 15 }}>صباح الخير، سارة</AppText>
            <AppText tone="muted" variant="caption" style={{ fontSize: 11 }}>شركة النور للتجارة</AppText>
          </View>
        </View>

        <HeroBalance value={128450} />

        <View style={{ flexDirection: 'row', gap: 9, marginTop: 11, marginBottom: 13 }}>
          <KpiCard label="مستحق لنا" value={86300} sub="12 عميلًا" />
          <KpiCard label="مستحق علينا" value={41900} sub="7 موردين" />
        </View>

        <SectionHeader title="آخر الحركات" action="عرض الكل" />
        <Card style={{ paddingHorizontal: 12, paddingVertical: 2 }}>
          {RECENT.map((r, i) => (
            <ListRow key={r.id} {...r} last={i === RECENT.length - 1} />
          ))}
        </Card>
      </ScrollView>

      <Fab bottom={16} />
    </View>
  );
}