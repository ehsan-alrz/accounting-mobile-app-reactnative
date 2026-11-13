import { Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';

export function Fab({ onPress, bottom }: { onPress?: () => void; bottom: number }) {
  const { colors: c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="إضافة"
      style={{
        position: 'absolute', start: 16, bottom,
        width: 46, height: 46, borderRadius: 15,
        backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
        shadowColor: c.primary, shadowOpacity: 0.4, shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 }, elevation: 5,
      }}>
      <AppText style={{ color: c.onPrimary, fontSize: 24, lineHeight: 28 }}>+</AppText>
    </Pressable>
  );
}