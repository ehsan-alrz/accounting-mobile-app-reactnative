// src/theme/useStyles.ts
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';

export function useStyles<T extends StyleSheet.NamedStyles<T>>(factory: (t: ReturnType<typeof useTheme>) => T) {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
}