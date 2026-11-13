export const lightColors = {
  bg: '#F4F7F6',       surface: '#FFFFFF',   surface2: '#EDF2F0',
  text: '#0F1E1A',     muted: '#5F726C',     subtle: '#8A9A95',
  border: '#E2E9E6',   chip: '#F1F5F3',
  primary: '#0E7C66',  primarySoft: '#E7F1ED',
  accent: '#C8963C',   accentSoft: '#FBF1DF',
  pos: '#0E7C66',      neg: '#B4453C',
  hero1: '#12896F',    hero2: '#0A5B4B',
  // أضفتها لأن الملف كتبها hardcoded بالفاتح فقط
  onPrimary: '#FFFFFF', negSoft: '#FBE9E7',
  borderStrong: '#D9E2DF', warnText: '#8A5A12',
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  bg: '#0F1720',       surface: '#16202B',   surface2: '#1C2733',
  text: '#E9F0EE',     muted: '#9AA9A6',     subtle: '#6F7F7C',
  border: '#26323B',   chip: '#1B2530',
  primary: '#2E9E85',  primarySoft: '#16332C',
  accent: '#E3B760',   accentSoft: '#33291A',
  pos: '#4FC3A1',      neg: '#F08A7E',
  hero1: '#175A4C',    hero2: '#0F3A32',
  onPrimary: '#FFFFFF',
  negSoft: '#3A2220',      // مقترح، يحتاج موافقة المصمم
  borderStrong: '#33424C', // مقترح
  warnText: '#E3B760',     // مقترح
};

export const radius = { card: 16, field: 12, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const TAP = 44; // الحد الأدنى للعناصر القابلة للضغط

// الداكن: حدود بدل ظلال
export const shadows = {
  light: {
    shadowColor: '#0F1E1A', shadowOpacity: 0.1, shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }, elevation: 3,
  },
  dark: {},
};

// بـ React Native لازم اسم خط مستقل لكل وزن (fontWeight ما بشتغل مع الخطوط المخصصة)
export const font = {
  regular: 'IBMPlexSansArabic_400Regular',
  medium: 'IBMPlexSansArabic_500Medium',
  semibold: 'IBMPlexSansArabic_600SemiBold',
  bold: 'IBMPlexSansArabic_700Bold',
} as const;

export const type = {
  display: { fontFamily: font.bold, fontSize: 27, letterSpacing: -0.3 },
  title:   { fontFamily: font.bold, fontSize: 19 },
  section: { fontFamily: font.semibold, fontSize: 15 },
  body:    { fontFamily: font.regular, fontSize: 13 },
  caption: { fontFamily: font.regular, fontSize: 11.5 },
} as const;