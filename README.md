# Ledgerly

A mobile accounting app, Arabic-first (RTL), built with React Native, Expo and TypeScript.
It supports light and dark modes and follows a single visual identity driven by design tokens.

> **Status:** early prototype, under active development (`feat/ledgerly-prototype`).

---

## Contents

- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Design system](#design-system)
- [Code conventions](#code-conventions)
- [Testing and linting](#testing-and-linting)
- [Roadmap](#roadmap)

---

## Tech stack

| Area | Tool |
|---|---|
| Framework | React Native + Expo (SDK 58) |
| Language | TypeScript |
| Font | IBM Plex Sans Arabic (`@expo-google-fonts/ibm-plex-sans-arabic`) |
| Gradients | `expo-linear-gradient` |
| Safe areas | `react-native-safe-area-context` |
| Local storage | `@react-native-async-storage/async-storage` |
| Tests | Jest |
| Linting and formatting | ESLint + Prettier |

---

## Getting started

### Requirements

- Node.js (LTS)
- npm
- **Expo Go** on a device, or an Android / iOS emulator

### Install and run

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `a` for an Android emulator or `i` for an iOS simulator.

> **RTL note:** on first launch, RTL is enabled through `I18nManager.forceRTL`.
> It only takes effect after you **fully close and reopen the app** (once).

### Installing Expo packages

Always use `npx expo install <package>` instead of `npm install` for native packages,
so Expo picks the version compatible with the current SDK.

---

## Project structure

```
src/
├── app/                      App root
│   ├── App.tsx               Fonts, RTL, tabs
│   ├── App.test.tsx
│   └── providers.tsx
├── components/               Reusable UI components
│   ├── AppText.tsx           Unified text (variant + tone)
│   ├── Amount.tsx            Money (LTR, tabular numbers, sign, color)
│   ├── Button.tsx            primary / secondary / ghost / danger
│   ├── StatusBadge.tsx       draft / posted / partial / paid / void
│   ├── HeroBalance.tsx       Balance card with green gradient
│   ├── Card.tsx
│   ├── KpiCard.tsx
│   ├── ListRow.tsx
│   ├── SectionHeader.tsx
│   ├── TabBar.tsx
│   └── Fab.tsx
├── screens/
│   └── HomeScreen.tsx        Home screen
├── theme/
│   ├── tokens.ts             Colors, fonts, radii, spacing
│   ├── ThemeProvider.tsx     Light / dark / system (choice is persisted)
│   └── useStyles.ts          Theme-aware styles
└── infrastructure/
    └── testing/
        ├── fakes.ts
        └── fixedClock.ts
```

---

## Design system

The single source of truth for design is `src/theme/tokens.ts`.
Screens and components **ask for roles** (`surface`, `muted`, `neg`), never raw values.

### Usage

```tsx
import { useTheme } from '../theme/ThemeProvider';

function Example() {
  const { colors, isDark, setMode } = useTheme();
  // colors.surface, colors.primary, colors.neg ...
}
```

Switching modes:

```tsx
setMode('light');
setMode('dark');
setMode('system');  // follows the device (default)
```

### Color roles

| Role | Purpose |
|---|---|
| `bg` / `surface` / `surface2` | Background and surfaces |
| `text` / `muted` / `subtle` | Text levels |
| `border` / `borderStrong` | Borders |
| `primary` / `primarySoft` | Brand green and its soft background |
| `accent` / `accentSoft` | Amber: for alerts and indicators only, never as a primary color |
| `pos` / `neg` / `negSoft` | Positive and negative amounts, danger states |
| `hero1` / `hero2` | Balance card gradient |

### Fonts and weights

Do not use `fontWeight` with the custom font in React Native.
Use the font names from `font.regular | medium | semibold | bold`,
or the ready-made styles in `type.display | title | section | body | caption`.

### Dark mode is not an inversion of light mode

- Shadows are replaced with subtle borders.
- Gradients are calmer.
- Green and amber are lifted one step to keep contrast readable.

---

## Code conventions

1. **No hex colors and no numeric spacing inside screens.** Use `useTheme().colors` plus `radius` and `space` from `tokens.ts`.
2. **Any new color is added to both `lightColors` and `darkColors`.** The `Colors` type enforces this.
3. **RTL:**
   - Use `start` / `end`, `marginStart` / `paddingEnd` instead of `left` / `right`.
   - Directional icons (back, arrows) are flipped when `I18nManager.isRTL` is true.
   - Numbers, dates and currency symbols are **never mirrored** (`writingDirection: 'ltr'`).
4. **Money** is always rendered with `<Amount />`.
5. **Pressable elements** have a minimum height of `TAP` (44).
6. **Document status** is derived from journal entries and payments, never edited by hand.
7. Component files use PascalCase (`KpiCard.tsx`), and the project enforces consistent import casing.

---

## Testing and linting

```bash
npx jest                 # tests
npx tsc --noEmit         # type check
npx eslint .             # lint
npx prettier --check .   # formatting
```

Test helpers live in `src/infrastructure/testing/`:

- `fixedClock.ts`: a fixed clock for date-dependent tests.
- `fakes.ts`: fake implementations of dependencies.

When testing any component that uses the theme, wrap it in `ThemeProvider`.

---

## Roadmap

- [x] Design tokens and theme system (light / dark / system)
- [x] Core components
- [x] Home screen
- [ ] Sales invoice form (`Field`, `LineItem`, `TotalsCard`, `StickyTotalBar`)
- [ ] Invoice details and accounting ledger (read-only entries, reversal entries linked to the original)
- [ ] Trial balance
- [ ] Navigation (React Navigation or Expo Router)
- [ ] Real icons instead of placeholder glyphs
- [ ] Real data layer instead of mock data
- [ ] English (LTR) support

---

## Contributing

1. Branch from `feat/ledgerly-prototype`.
2. Follow the code conventions above.
3. Run `npx tsc --noEmit` and `npx jest` before merging.
