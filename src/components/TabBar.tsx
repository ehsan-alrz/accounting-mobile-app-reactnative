import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { font } from '../theme/tokens';

export type TabItem = { key: string; label: string; glyph: string };

export function TabBar({ tabs, active, onChange }:
  { tabs: TabItem[]; active: string; onChange: (key: string) => void }) {
  const { colors: c } = useTheme();
  const { bottom } = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
        backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border,
        height: 60 + bottom, paddingBottom: bottom,
      }}>
      {tabs.map(t => {
        const on = t.key === active;
        const color = on ? c.primary : c.subtle;
        return (
          <Pressable key={t.key} onPress={() => onChange(t.key)}
            style={{ alignItems: 'center', gap: 2, minWidth: 56, minHeight: 44, justifyContent: 'center' }}>
            <AppText style={{ color, fontSize: 14 }}>{t.glyph}</AppText>
            <AppText style={{ color, fontSize: 8.5, fontFamily: on ? font.semibold : font.medium }}>
              {t.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}