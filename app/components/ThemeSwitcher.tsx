'use client';

import { UiVariant, useThemeVariant } from './ThemeProvider';

const options: Array<{ value: UiVariant; label: string }> = [
  { value: 'forest-mist', label: 'Mist' },
  { value: 'forest-bloom', label: 'Bloom' },
  { value: 'forest-dawn', label: 'Dawn' },
];

interface ThemeSwitcherProps {
  compact?: boolean;
}

export default function ThemeSwitcher({ compact = false }: ThemeSwitcherProps) {
  const { variant, setVariant } = useThemeVariant();

  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-0)] p-2">
      {!compact && <p className="mb-2 text-[11px] font-medium text-[var(--text-muted)]">Style</p>}
      <div className="grid grid-cols-3 gap-1">
        {options.map((option) => {
          const isActive = option.value === variant;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setVariant(option.value)}
              className={[
                'rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                isActive
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                  : 'bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              {compact ? option.label.slice(0, 1) : option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
