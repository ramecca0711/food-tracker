'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type UiVariant = 'forest-mist' | 'forest-bloom' | 'forest-dawn';

const VARIANT_STORAGE_KEY = 'homebase-ui-variant';
const DEFAULT_VARIANT: UiVariant = 'forest-mist';

type ThemeContextValue = {
  variant: UiVariant;
  setVariant: (variant: UiVariant) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [variant, setVariant] = useState<UiVariant>(DEFAULT_VARIANT);

  useEffect(() => {
    const saved = window.localStorage.getItem(VARIANT_STORAGE_KEY) as UiVariant | null;
    if (saved === 'forest-mist' || saved === 'forest-bloom' || saved === 'forest-dawn') {
      setVariant(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.uiVariant = variant;
    window.localStorage.setItem(VARIANT_STORAGE_KEY, variant);
  }, [variant]);

  const value = useMemo(() => ({ variant, setVariant }), [variant]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeVariant() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeVariant must be used within ThemeProvider');
  }
  return context;
}
