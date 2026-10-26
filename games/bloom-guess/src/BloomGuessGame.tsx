import { createGuess, guess, isLost, isWon, mask } from '@puzzlebloom/bloom-guess-engine';
import { Button, chime, Icon } from '@puzzlebloom/ui';
import { useCallback, useEffect, useState } from 'react';
import './bloom-guess.css';

const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface Props {
  onExit?: () => void;
}

export function BloomGuessGame({ onExit }: Props) {
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 10000));
  const [state, setState] = useState(() => createGuess(seed));

  const deal = (nextSeed: number) => {
    setSeed(nextSeed);
    setState(createGuess(nextSeed));
  };

  const onLetter = useCallback((ch: string) => {
    setState((current) => {
      const next = guess(current, ch);
      if (next === current) return current;
      chime(next.petals < current.petals ? 0.22 : 0.6);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!/^[a-zA-Z]$/.test(event.key)) return;
      onLetter(event.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onLetter]);

  const shown = mask(state);
  const won = isWon(state);
  const lost = isLost(state);

  return (
    <div className="pb-play pb-guess">
      <h1 className="sr-only">Bloom Guess for kids</h1>
      <header className="pb-play__bar">
        {onExit ? (
          <button type="button" className="pb-back" onClick={onExit} aria-label="Back to the garden">
            <Icon name="arrowLeft" size={20} />
          </button>
        ) : null}
        <div className="pb-play__meta">
          <span className="pb-play__level">Bloom Guess</span>
        </div>
      </header>
      <div className="pb-play__body">
        <div>
          <div className="pb-guess-petals" role="img" aria-label={`${state.petals} petals left`}>
            {Array.from({ length: 6 }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: petals are a fixed count
              <span key={i} className={`pb-guess-petal${i >= state.petals ? ' is-gone' : ''}`} />
            ))}
          </div>
          <p className="pb-guess-word">{shown}</p>
          {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would bring default border/padding this keyboard does not want */}
          <div className="pb-guess-keys" role="group" aria-label="Letters">
            {KEYS.map((ch) => {
              const used = state.guessed.includes(ch);
              const hit = used && state.word.includes(ch);
              return (
                <button
                  key={ch}
                  type="button"
                  className={`pb-guess-key${hit ? ' is-hit' : ''}${used && !hit ? ' is-miss' : ''}`}
                  disabled={used || won || lost}
                  onClick={() => onLetter(ch)}
                >
                  {ch}
                </button>
              );
            })}
          </div>
        </div>
        <aside className="pb-play__side">
          <p className="pb-calm-note">
            A garden word is hiding. Tap a letter. A miss sheds a petal; six petals is the whole bloom.
          </p>
          <Button variant="quiet" size="sm" block iconLeft="sparkle" onClick={() => deal(seed + 1)}>
            Another word
          </Button>
        </aside>
      </div>
      {won || lost ? (
        <div className="pb-win" role="dialog" aria-modal="true" aria-labelledby="pb-guess-win">
          <div className="pb-win__card">
            <h2 id="pb-guess-win" className="pb-win__title">
              {won ? 'The word bloomed' : 'The petals are spent'}
            </h2>
            <p className="pb-win__sub">It was {state.word}. Another word is waiting.</p>
            <div className="pb-win__actions">
              <Button variant="primary" size="md" iconLeft="play" onClick={() => deal(seed + 1)}>
                Another word
              </Button>
              {onExit ? (
                <Button variant="secondary" size="md" iconLeft="arrowLeft" onClick={onExit}>
                  Back to the garden
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
