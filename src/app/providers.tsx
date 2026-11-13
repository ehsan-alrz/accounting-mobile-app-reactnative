import type { ReactNode } from 'react';

export type AppProvidersProps = {
  children: ReactNode;
};

/**
 * Pass-through provider shell.
 *
 * Task 30 replaces this with the locale/theme providers. Until then it simply
 * renders its children so the app shell and its smoke test can run.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return <>{children}</>;
}
