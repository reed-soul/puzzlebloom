import type { CSSProperties, ReactNode } from 'react';

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; hint?: string }>;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

/** A radio group wearing a pill. Keyboard behaviour comes free from real radios. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'md',
}: SegmentedProps<T>) {
  return (
    <div className={`pb-seg pb-seg--${size}`} role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        const style = { '--pb-seg-count': options.length } as CSSProperties;
        return (
          <label
            key={option.value}
            className={`pb-seg__item${active ? ' is-active' : ''}`}
            style={style}
            title={option.hint}
          >
            <input
              type="radio"
              name={label}
              value={option.value}
              checked={active}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

interface ChipProps {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'accent';
}

export function Chip({ children, tone = 'neutral' }: ChipProps) {
  return <span className={`pb-chip pb-chip--${tone}`}>{children}</span>;
}
