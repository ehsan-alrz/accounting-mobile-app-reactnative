// HeroBalance.tsx
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { font, radius } from '../theme/tokens';
import { Amount } from './Amount';

export function HeroBalance({ value }: { value: number }) {
  const { colors: c, isDark } = useTheme();
  return (
    <LinearGradient
      colors={[c.hero1, c.hero2]}
      start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
      style={{ borderRadius: 18, padding: 15,
        borderWidth: isDark ? 1 : 0, borderColor: '#2C4A42' }}>
      <Text style={{ fontFamily: font.regular, fontSize: 10.5, color: '#FFFFFFD1' }}>الرصيد النقدي</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Amount value={value} style={{ fontSize: 27, color: '#fff', fontFamily: font.bold }} />
        <Text style={{ fontFamily: font.medium, fontSize: 11, color: '#FFFFFFD1' }}>ر.س</Text>
      </View>
    </LinearGradient>
  );
}
