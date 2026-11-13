import { View, Pressable } from 'react-native';
import { AppText } from './AppText';
import { font } from '../theme/tokens';

export function SectionHeader({ title, action, onAction }:
  { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'baseline', marginBottom: 5 }}>
      <AppText style={{ fontFamily: font.semibold, fontSize: 12 }}>{title}</AppText>
      {action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <AppText tone="muted" variant="caption" style={{ fontSize: 10 }}>{action}</AppText>
        </Pressable>
      )}
    </View>
  );
}