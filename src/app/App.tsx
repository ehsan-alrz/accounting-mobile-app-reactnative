import { useState } from 'react';
import { I18nManager, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts, IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { TabBar } from '../components/TabBar';
import { HomeScreen } from '../screens/HomeScreen';

// مرة وحدة: أول تشغيل بيفعّل RTL، وبعدها لازم تسكّر التطبيق وتفتحه من جديد
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

const TABS = [
  { key: 'home', label: 'الرئيسية', glyph: '◈' },
  { key: 'invoices', label: 'الفواتير', glyph: '▤' },
  { key: 'reports', label: 'التقارير', glyph: '◔' },
  { key: 'more', label: 'المزيد', glyph: '⋯' },
];

function Shell() {
  const { isDark, colors } = useTheme();
  const [tab, setTab] = useState('home');
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>{tab === 'home' && <HomeScreen />}</View>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
    </View>
  );
}

export default function App() {
  const [loaded] = useFonts({
    IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold,
  });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Shell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}