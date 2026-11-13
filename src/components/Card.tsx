import { View, ViewProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';

export function Card({ style, ...p }: ViewProps) {
  const { colors, shadow } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: colors.surface, borderRadius: radius.card,
          borderWidth: 1, borderColor: colors.border },
        shadow,
        style,
      ]}
      {...p}
    />
  );
}