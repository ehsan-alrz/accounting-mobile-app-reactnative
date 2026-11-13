import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, shadows, Colors } from './tokens';

type Mode = 'light' | 'dark' | 'system';
type Theme = { colors: Colors; isDark: boolean; shadow: object; mode: Mode; setMode: (m: Mode) => void };

const Ctx = createContext<Theme>(null!);
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<Mode>('system');

  useEffect(() => {
    AsyncStorage.getItem('theme').then(v => v && setModeState(v as Mode));
  }, []);

  const setMode = (m: Mode) => { setModeState(m); AsyncStorage.setItem('theme', m); };

  const value = useMemo<Theme>(() => {
    const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
    return {
      colors: isDark ? darkColors : lightColors,
      isDark,
      shadow: isDark ? shadows.dark : shadows.light,
      mode, setMode,
    };
  }, [mode, system]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}