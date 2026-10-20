import { useMemo, useState } from 'react';
import {
  Button,
  Chip,
  CreatureGlyph,
  Icon,
} from '@puzzlebloom/ui';
import {
  THEME_PRESETS,
  auditTheme,
  buildThemeLink,
  inferMood,
  repairInk,
  slugify,
  type Theme,
  type ThemeColors,
} from '@puzzlebloom/theme-core';
import { useTheme } from '../app/ThemeProvider';
import { LinkButton } from '../shell/LinkButton';

type ColorKey = 'bg' | 'surface' | 'ink' | 'brand' | 'accent' | 'danger' | 'success';

const FIELDS: Array<{ key: ColorKey; label: string; hint: string }> = [
  { key: 'bg', label: 'Page', hint: 'The wall behind everything' },
  { key: 'surface', label: 'Paper', hint: 'Cards, board, keypad keys' },
  { key: 'ink', label: 'Ink', hint: 'All the words' },
  { key: 'brand', label: 'Brand', hint: 'Links, focus, the selected cell' },
  { key: 'accent', label: 'Accent', hint: 'Badges and hints' },
  { key: 'danger', label: 'Warning', hint: 'A digit that cannot be right' },
  { key: 'success', label: 'Success', hint: 'A finished row' },
];

function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="pb-field" title={hint}>
      <span className="pb-field__label">{label}</span>
      <span className="pb-field__control">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        <code>{value}</code>
      </span>
    </label>
  );
}

function Swatches({ theme }: { theme: Theme }) {
  const order: ColorKey[] = ['bg', 'surface', 'brand', 'accent', 'ink'];
  return (
    <span className="pb-swatches" aria-hidden="true">
      {order.map((key) => (
        <span key={key} style={{ background: theme.colors[key] }} />
      ))}
    </span>
  );
}

export function Themes() {
  const {
    theme,
    builtIns,
    customThemes,
    preview,
    use: useById,
    save,
    remove,
    reset,
    incoming,
    acceptIncoming,
    dismissIncoming,
  } = useTheme();

  const [draft, setDraft] = useState<Theme>(() => ({
    ...theme,
    id: theme.builtIn ? 'draft' : theme.id,
    name: theme.builtIn ? 'My theme' : theme.name,
    blurb: 'Made in the theme studio.',
    builtIn: false,
  }));
  const [message, setMessage] = useState<string | null>(null);

  const audit = useMemo(() => auditTheme(draft.colors), [draft.colors]);
  const failing = audit.filter((check) => !check.ok);

  const patch = (colors: Partial<ThemeColors>) => {
    const merged: ThemeColors = { ...draft.colors, ...colors };
    const next: Theme = { ...draft, colors: merged, mood: inferMood(merged) };
    setDraft(next);
    preview(next);
    setMessage(null);
  };

  const copyLink = async () => {
    const link = buildThemeLink(draft, window.location.origin);
    try {
      await navigator.clipboard.writeText(link);
      setMessage('Link copied. Anyone who opens it sees this theme.');
    } catch {
      setMessage(link);
    }
  };

  const keep = () => {
    const id = draft.id.startsWith('custom-')
      ? draft.id
      : `custom-${slugify(draft.name)}-${Math.random().toString(36).slice(2, 6)}`;
    const stored = save({ ...draft, id, name: draft.name.trim() || 'My theme' });
    setDraft(stored);
    setMessage('Saved. This is now your default theme.');
  };

  return (
    <div className="pb-page">
      <header className="pb-page__head">
        <Chip tone="brand">Theme studio</Chip>
        <h1>Make it yours</h1>
        <p>
          Seven colours, and the site recomputes every tint, border and cell state from them. Nothing
          here can break the layout — and if the text stops being readable, the studio will say so and
          fix it in one tap.
        </p>
      </header>

      {incoming ? (
        <div className="pb-incoming" role="status">
          <Icon name="share" size={20} />
          <p>
            A theme called <strong>{incoming.name}</strong> arrived with this link. Keep it?
          </p>
          <div className="pb-incoming__actions">
            <Button variant="primary" size="sm" onClick={acceptIncoming}>
              Keep it
            </Button>
            <Button variant="ghost" size="sm" onClick={dismissIncoming}>
              No thanks
            </Button>
          </div>
        </div>
      ) : null}

      <section className="pb-studio">
        <div className="pb-studio__panel">
          <div className="pb-studio__row">
            <label className="pb-field pb-field--wide">
              <span className="pb-field__label">Name it</span>
              <input
                type="text"
                value={draft.name}
                maxLength={32}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Blueberry night"
              />
            </label>
          </div>

          <p className="pb-studio__label">Start from</p>
          <div className="pb-presets">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="pb-preset"
                onClick={() => patch(preset.colors)}
              >
                <Swatches theme={{ ...draft, colors: preset.colors }} />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>

          <p className="pb-studio__label">Colours</p>
          <div className="pb-fields">
            {FIELDS.map((field) => (
              <ColorField
                key={field.key}
                label={field.label}
                hint={field.hint}
                value={draft.colors[field.key]}
                onChange={(value) => patch({ [field.key]: value })}
              />
            ))}
          </div>

          <div className={`pb-audit${failing.length ? ' is-warning' : ''}`}>
            <p className="pb-audit__title">
              <Icon name={failing.length ? 'erase' : 'check'} size={16} />
              {failing.length ? `${failing.length} pair${failing.length > 1 ? 's' : ''} hard to read` : 'Every pair is readable'}
            </p>
            <ul className="pb-audit__list">
              {audit.map((check) => (
                <li key={check.label} className={check.ok ? 'is-ok' : 'is-bad'}>
                  <span>{check.label}</span>
                  <span>{check.ratio}:1</span>
                </li>
              ))}
            </ul>
            {failing.length ? (
              <Button variant="secondary" size="sm" onClick={() => patch(repairInk(draft.colors))}>
                Fix the contrast for me
              </Button>
            ) : null}
          </div>

          <div className="pb-studio__actions">
            <Button variant="primary" size="md" iconLeft="check" onClick={keep}>
              Save this theme
            </Button>
            <Button variant="secondary" size="md" iconLeft="share" onClick={copyLink}>
              Copy a share link
            </Button>
            <Button variant="ghost" size="md" onClick={() => preview(theme)}>
              Undo changes
            </Button>
          </div>

          {message ? <p className="pb-studio__message">{message}</p> : null}
        </div>

        <aside className="pb-studio__preview" aria-label="Preview">
          <p className="pb-studio__label">Previewing right now</p>
          <div className="pb-preview-card">
            <div className="pb-preview-card__top">
              <span className="pb-preview-card__mark">
                <CreatureGlyph digit={6} size={26} />
              </span>
              <strong>{draft.name || 'My theme'}</strong>
            </div>
            <div className="pb-preview-card__board" aria-hidden="true">
              {[6, 0, 2, 0, 5, 0, 3, 0, 8].map((digit, index) => (
                <span key={index} className={digit ? 'is-filled' : ''}>
                  {digit ? <CreatureGlyph digit={digit} size={20} /> : null}
                </span>
              ))}
            </div>
            <div className="pb-preview-card__row">
              <Button variant="primary" size="sm">
                Play
              </Button>
              <Button variant="secondary" size="sm">
                Later
              </Button>
              <Chip tone="accent">Tricky</Chip>
            </div>
          </div>
          <p className="pb-studio__hint">
            Nothing is saved until you press save. Switching pages while previewing keeps the colours
            for this visit only.
          </p>
        </aside>
      </section>

      <section className="pb-section" aria-labelledby="builtin-title">
        <div className="pb-section__head">
          <h2 id="builtin-title">Made by us</h2>
          <p>Five moods, each paired with a mood of the site rather than just a hue.</p>
        </div>
        <div className="pb-theme-grid">
          {builtIns.map((item) => (
            <div key={item.id} className={`pb-theme-card${theme.id === item.id ? ' is-active' : ''}`}>
              <Swatches theme={item} />
              <div className="pb-theme-card__body">
                <h3>{item.name}</h3>
                <p>{item.blurb}</p>
              </div>
              <Button
                variant={theme.id === item.id ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => useById(item.id)}
              >
                {theme.id === item.id ? 'In use' : 'Use'}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-section" aria-labelledby="custom-title">
        <div className="pb-section__head">
          <h2 id="custom-title">Made by you</h2>
          <p>Saved in this browser only. Clearing site data removes them, so share a link if one matters.</p>
        </div>
        {customThemes.length ? (
          <div className="pb-theme-grid">
            {customThemes.map((item) => (
              <div key={item.id} className={`pb-theme-card${theme.id === item.id ? ' is-active' : ''}`}>
                <Swatches theme={item} />
                <div className="pb-theme-card__body">
                  <h3>{item.name}</h3>
                  <p>{item.blurb || 'Your own colours.'}</p>
                </div>
                <div className="pb-theme-card__actions">
                  <Button variant="secondary" size="sm" onClick={() => useById(item.id)}>
                    Use
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(item.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="pb-empty">
            Nothing yet. Change a colour above, name it, and it will appear here.
          </p>
        )}
      </section>

      <div className="pb-page__foot">
        <Button variant="ghost" size="sm" onClick={reset} iconLeft="undo">
          Back to Mochi Meadow
        </Button>
        <LinkButton to="/" variant="secondary" size="sm" iconLeft="arrowLeft">
          Back to the garden
        </LinkButton>
      </div>
    </div>
  );
}
