import {
  BLOOM_LENGTH,
  createEcho,
  type EchoState,
  grow,
  type Pad,
  press,
  readyToCopy,
  replay,
} from '@puzzlebloom/simon-engine';
import { Button, chime, GardenCreature, Icon } from '@puzzlebloom/ui';
import { useEffect, useRef, useState } from 'react';
import './simon.css';

const NAMES = ['Sun', 'Honey', 'Sky', 'Leaf'] as const;
const FACES = ['ant', 'bunny', 'bird', 'frog'] as const;

interface Props {
  onExit?: () => void;
}

export function EchoBloomGame({ onExit }: Props) {
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 10000));
  const [state, setState] = useState<EchoState>(() => createEcho(seed));
  const [lit, setLit] = useState<Pad | null>(null);
  const [muted, setMuted] = useState(false);
  const timer = useRef<number[]>([]);

  const ping = (pad: Pad) => {
    if (!muted) chime(0.25 + pad * 0.18);
  };

  const speak = (sequence: readonly Pad[], then: () => void) => {
    for (const id of timer.current) window.clearTimeout(id);
    timer.current = [];
    sequence.forEach((pad, i) => {
      const on = window.setTimeout(
        () => {
          setLit(pad);
          ping(pad);
        },
        420 + i * 620,
      );
      const off = window.setTimeout(() => setLit(null), 420 + i * 620 + 380);
      timer.current.push(on, off);
    });
    const done = window.setTimeout(then, 420 + sequence.length * 620);
    timer.current.push(done);
  };

  // Speak only when a listen/again phase begins. `muted` and `speak` must not
  // retrigger the bloom, or hushing the chimes would restart the sequence.
  // biome-ignore lint/correctness/useExhaustiveDependencies: phase + sequence are the trigger
  useEffect(() => {
    if (state.phase !== 'listen' && state.phase !== 'again') return;
    speak(state.sequence, () => setState((s) => readyToCopy(s)));
    return () => {
      for (const id of timer.current) window.clearTimeout(id);
    };
  }, [state.phase, state.sequence]);

  const onPad = (pad: Pad) => {
    if (state.phase !== 'copy') return;
    ping(pad);
    setLit(pad);
    window.setTimeout(() => setLit(null), 220);
    const next = press(state, pad);
    if (next.phase === 'listen') {
      setState(grow(next, seed));
      return;
    }
    setState(next);
  };

  const restart = () => {
    const nextSeed = seed + 1;
    setSeed(nextSeed);
    setState(createEcho(nextSeed));
  };

  return (
    <div className="pb-play pb-echo">
      <h1 className="sr-only">Echo Bloom for kids</h1>
      <header className="pb-play__bar">
        {onExit ? (
          <button type="button" className="pb-back" onClick={onExit} aria-label="Back to the garden">
            <Icon name="arrowLeft" size={20} />
          </button>
        ) : null}
        <div className="pb-play__meta">
          <span className="pb-play__level">Echo Bloom</span>
          <span className="pb-play__clock">
            {state.sequence.length} of {BLOOM_LENGTH}
          </span>
        </div>
      </header>
      <div className="pb-play__body">
        {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would bring default border/padding these pads do not want */}
        <div className="pb-echo-pads" role="group" aria-label="Four blooms">
          {([0, 1, 2, 3] as const).map((pad) => (
            <button
              key={pad}
              type="button"
              className={`pb-echo-pad pb-echo-pad--${pad}${lit === pad ? ' is-lit' : ''}`}
              aria-label={NAMES[pad]}
              onClick={() => onPad(pad)}
              disabled={state.phase !== 'copy'}
            >
              <GardenCreature name={FACES[pad]} />
            </button>
          ))}
        </div>
        <aside className="pb-play__side">
          <p className="pb-calm-note">
            {state.phase === 'copy'
              ? 'Your turn. Tap the friends in the same order.'
              : state.phase === 'again'
                ? 'Have another go — the same bloom, no rush.'
                : state.phase === 'bloom'
                  ? 'The whole bloom remembered.'
                  : 'Watch the four friends light up.'}
          </p>
          <Button variant="quiet" size="sm" block onClick={() => setMuted((m) => !m)}>
            {muted ? 'Chimes off' : 'Hush the chimes'}
          </Button>
          {state.phase === 'copy' || state.phase === 'again' ? (
            <Button variant="secondary" size="sm" block onClick={() => setState((s) => replay(s))}>
              Show me again
            </Button>
          ) : null}
          <Button variant="quiet" size="sm" block iconLeft="sparkle" onClick={restart}>
            A new bloom
          </Button>
        </aside>
      </div>
      {state.phase === 'bloom' ? (
        <div className="pb-win" role="dialog" aria-modal="true" aria-labelledby="pb-echo-win">
          <div className="pb-win__card">
            <h2 id="pb-echo-win" className="pb-win__title">
              The bloom remembers you
            </h2>
            <p className="pb-win__sub">Eight petals, all in order.</p>
            <div className="pb-win__actions">
              <Button variant="primary" size="md" iconLeft="play" onClick={restart}>
                Another bloom
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
