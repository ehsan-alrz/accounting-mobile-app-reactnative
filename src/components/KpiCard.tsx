import { View } from 'react-native';
import { AppText } from './AppText';
import { Amount } from './Amount';
import { Card } from './Card';

export function KpiCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <Card style={{ flex: 1, paddingHorizontal: 11, paddingVertical: 10 }}>
      <AppText variant="caption" tone="muted" style={{ fontSize: 10 }}>{label}</AppText>
      <View style={{ marginTop: 2 }}>
        <Amount value={value} style={{ fontSize: 16 }} />
      </View>
      <AppText variant="caption" tone="subtle" style={{ fontSize: 9, marginTop: 1 }}>{sub}</AppText>
    </Card>
  );
}