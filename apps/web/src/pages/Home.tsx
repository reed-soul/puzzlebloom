import { CARD_FIGURE } from '@puzzlebloom/tangram-engine/card';
import { Chip, CreatureGlyph, Icon, type IconName } from '@puzzlebloom/ui';
import { Link } from '../app/router';
import { useTheme } from '../app/ThemeProvider';
import { GAMES, type GameManifest, SPROUTING } from '../games/registry';
import { LinkButton } from '../shell/LinkButton';

/** A real, valid grid, thinned out. Decoration that happens to be truthful. */
const PREVIEW = '5.4.7...2.7..9...81.8...5.78.9.6.4...2...3.9...3.2.8.69.1.3.2.42...1.9.53.5.8.7..';

const TRUST: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: 'shield',
    title: 'No ads, ever',
    body: 'Nothing here is trying to sell anything to your child, and there is nothing to tap by accident.',
  },
  {
    icon: 'userOff',
    title: 'No chat, no strangers',
    body: 'No messaging, no friend requests, no leaderboard of people you have never met.',
  },
  {
    icon: 'heart',
    title: 'Nothing to shoot',
    body: 'No fighting, no dying, no being chased. The only stake is whether the next cell can be worked out.',
  },
  {
    icon: 'cloudOff',
    title: 'Works offline',
    body: 'Puzzles are generated on your own device. No account, no upload, no waiting for a server.',
  },
];

function PreviewBoard() {
  return (
    <div className="pb-mini" aria-hidden="true">
      {Array.from(PREVIEW).map((char, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: the string is fixed-length and never reorders, so an index is the cell's identity
          key={index}
          className={`pb-mini__cell${char === '.' ? ' is-empty' : ''}${
            index === 40
              ? ' is-live'
              : index === 39 || index === 41 || index === 31 || index === 49
                ? ' is-near'
                : ''
          }`}
        >
          {char === '.' ? null : <CreatureGlyph digit={Number(char)} size={24} />}
        </span>
      ))}
    </div>
  );
}

/** What a finished game draws on its card. Both are decoration, both are true. */
function CreaturesArt() {
  return (
    <div className="pb-card__art-grid">
      {[3, 7, 1, 9, 5, 2, 8, 4, 6].map((digit) => (
        <span key={digit}>
          <CreatureGlyph digit={digit} size={30} />
        </span>
      ))}
    </div>
  );
}

/**
 * A five-by-five picture, which is exactly what a nonogram is — and specifically
 * the leaf the game ships, so the card is not a promise the puzzle cannot keep.
 * Drawn here rather than imported from the game: the home page must not pull a
 * game's chunk in to decorate a card, and five rows of squares do not need a
 * component library.
 */
const CARD_PICTURE = [6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18, 22];

function SquaresArt() {
  return (
    <div className="pb-card__art-squares">
      {Array.from({ length: 25 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the index is the cell's coordinate in a fixed five-by-five picture, and nothing reorders
        <span key={index} className={CARD_PICTURE.includes(index) ? 'is-lit' : ''} />
      ))}
    </div>
  );
}

/**
 * The card's viewBox, worked out from the polygons rather than written down
 * beside them. The four numbers of a viewBox are read as "x, y, width, height",
 * and a second copy of the geometry is a second thing that can drift out of step
 * with the first — which is how the card came to be drawing the wrong figure in
 * the first place.
 */
function viewBoxOf(polygons: readonly string[], padding = 0.3): string {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const points of polygons) {
    for (const pair of points.split(' ')) {
      const [x, y] = pair.split(',');
      xs.push(Number(x));
      ys.push(Number(y));
    }
  }
  const minX = Math.min(...xs) - padding;
  const minY = Math.min(...ys) - padding;
  return `${minX} ${minY} ${Math.max(...xs) - minX + padding} ${Math.max(...ys) - minY + padding}`;
}

/**
 * A real tangram figure — the sail the game ships, at the coordinates the engine
 * draws it with, so the card shows something a child can actually build. The
 * polygons come from the engine's card module rather than from a copy kept here:
 * the copy used to be here, and it went on drawing a house for a while after the
 * house left the library. Importing that module costs seven string literals; it
 * imports nothing itself, so the engine stays out of the front page's bundle.
 */
function TrianglesArt() {
  const polygons = CARD_FIGURE.polygons;
  return (
    <svg className="pb-card__art-triangles" viewBox={viewBoxOf(polygons)} aria-hidden="true">
      {polygons.map((points) => (
        <polygon key={points} points={points} />
      ))}
    </svg>
  );
}

/**
 * A memory board caught mid-round: two cards up, four still face down.
 *
 * The two that are up show the same creature, because the one thing this card
 * can show truthfully is a pair that has been matched. Drawn here rather than
 * imported from the game, for the same reason as the other three: the home page
 * must not pull a game's chunk in to decorate a card.
 */
const CARD_PAIRS: Array<number | null> = [2, null, null, null, null, 2];

function PairsArt() {
  return (
    <div className="pb-card__art-pairs">
      {CARD_PAIRS.map((digit, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the index is a card's position in a fixed two-by-three picture, and nothing reorders
        <span key={index} className={digit === null ? 'is-down' : 'is-up'}>
          {digit === null ? null : <CreatureGlyph digit={digit} size={22} />}
        </span>
      ))}
    </div>
  );
}

/**
 * A balance caught just off level: the numeral pan heavier than the frog pan,
 * which is the state the whole game exists to resolve. Three frogs against a
 * "4" tile — one short, beam tipped toward the number, the next move obvious.
 */
function BalanceArt() {
  return (
    <div className="pb-card__art-balance" aria-hidden="true">
      <span className="pb-card__art-balance__tile">4</span>
      <span className="pb-card__art-balance__beam" />
      <span className="pb-card__art-balance__pan">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

/**
 * A road caught mid-ride: a run of plus squares behind the car, a minus square
 * ahead of it, frogs aboard. That is the whole game in one glance — where you
 * are decides what the dice do to your count.
 */
function RoadArt() {
  return (
    <div className="pb-card__art-road" aria-hidden="true">
      <span className="is-plus">+</span>
      <span className="is-plus">+</span>
      <span className="is-here">
        <i aria-hidden="true" />
      </span>
      <span className="is-minus">−</span>
      <span className="is-minus">−</span>
    </div>
  );
}

function Art({ game }: { game: GameManifest }) {
  if (game.status === 'ready') {
    return (
      <div className={`pb-card__art pb-card__art--${game.tone}`} aria-hidden="true">
        {game.art === 'squares' ? <SquaresArt /> : null}
        {game.art === 'tangram' ? <TrianglesArt /> : null}
        {game.art === 'pairs' ? <PairsArt /> : null}
        {game.art === 'balance' ? <BalanceArt /> : null}
        {game.art === 'road' ? <RoadArt /> : null}
        {game.art === 'creatures' || !game.art ? <CreaturesArt /> : null}
      </div>
    );
  }
  return (
    <div className={`pb-card__art pb-card__art--${game.tone}`} aria-hidden="true">
      <div className="pb-card__art-dots">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((cell) => (
          <span key={cell} className={cell === 4 ? 'is-lit' : cell === 1 || cell === 7 ? 'is-half' : ''} />
        ))}
      </div>
    </div>
  );
}

/**
 * Numbers as words, for the shelf's one counted sentence.
 *
 * "Two games finished" reads like a sentence and "2 games finished" reads like a
 * dashboard, and this site talks rather than reports. The list stops at five
 * because a garden with more than five games in it would want a different
 * sentence, not a longer table — past that it falls back to digits, which is
 * honest about being a count.
 */
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five'] as const;

const countWord = (n: number): string => NUMBER_WORDS[n] ?? String(n);

const capitalised = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

export function Home() {
  const { builtIns, apply, theme } = useTheme();
  const [first] = GAMES;

  // Counted from the register rather than written down, because a sentence with
  // a number in it is a sentence that goes stale the moment a game ships. The
  // "growing" half disappears rather than reading "no growing", which is how a
  // finished garden should sound.
  const finished = `${capitalised(countWord(GAMES.length))} game${GAMES.length === 1 ? '' : 's'} finished`;
  const growing =
    SPROUTING.length === 0 ? 'nothing else growing yet' : `${countWord(SPROUTING.length)} growing`;

  return (
    <>
      <section className="pb-hero">
        <div className="pb-hero__copy">
          <Chip tone="brand">A quiet corner of the internet</Chip>
          <h1 className="pb-hero__title">Puzzles that explain themselves.</h1>
          <p className="pb-hero__lede">
            A small garden of puzzles for children. Sudoku, where nine hand-drawn creatures each need exactly
            one home. Nonogram, where the numbers beside every line add up to a drawing you have not seen yet.
            Tangram, where seven flat shapes have to cover a silhouette exactly, and any arrangement that
            covers it is the right answer. Memory Garden, where the cards are the garden’s own creatures and a
            pair that misses stays face up until you turn the next one. No timer shouting, no streak to break,
            no score to chase. Just the next move, and then an account of what you did with it.
          </p>
          <div className="pb-hero__actions">
            <LinkButton to={first.route} variant="loud" size="lg" iconLeft="play">
              Play {first.title}
            </LinkButton>
            <LinkButton to="/themes" variant="secondary" size="lg" iconLeft="palette">
              Make it yours
            </LinkButton>
          </div>
          <p className="pb-hero__note">Free · no account · works offline once the page has loaded</p>
        </div>

        <div className="pb-hero__art">
          <PreviewBoard />
          <p className="pb-hero__caption">
            Nine creatures. One rule: no repeats in a row, a column, or a box.
          </p>
        </div>
      </section>

      <section className="pb-section" aria-labelledby="garden-title">
        <div className="pb-section__head">
          <h2 id="garden-title">In the garden</h2>
          <p>
            {/* The trailing sentence changes when nothing is growing: "each one
                arrives when it is actually good" is a promise about the future,
                and a garden with nothing in the ground should say so rather than
                keep promising. */}
            {finished} and {growing}.
            {SPROUTING.length > 0
              ? ' Each one arrives when it is actually good.'
              : ' The garden is full for now.'}
          </p>
        </div>

        <div className="pb-cards">
          {GAMES.map((game) => (
            <Link key={game.id} to={game.route} className="pb-card pb-card--ready">
              <Art game={game} />
              <div className="pb-card__body">
                <div className="pb-card__row">
                  <h3>{game.title}</h3>
                  <Chip tone="brand">Ready</Chip>
                </div>
                <p className="pb-card__tagline">{game.tagline}</p>
                <p className="pb-card__meta">
                  {game.ageRange} · {game.typicalMinutes} · {game.skills.join(' · ')}
                </p>
              </div>
            </Link>
          ))}

          {SPROUTING.map((game) => (
            <div key={game.id} className="pb-card pb-card--soon" aria-disabled="true">
              <Art game={game} />
              <div className="pb-card__body">
                <div className="pb-card__row">
                  <h3>{game.title}</h3>
                  <Chip>Growing</Chip>
                </div>
                <p className="pb-card__tagline">{game.tagline}</p>
                <p className="pb-card__meta">
                  {game.ageRange} · {game.skills.join(' · ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-section" aria-labelledby="safe-title">
        <div className="pb-section__head">
          <h2 id="safe-title">What it will never do</h2>
          <p>Four promises that are cheaper to keep because there is no server behind this site at all.</p>
        </div>
        <div className="pb-trust">
          {TRUST.map((item) => (
            <div key={item.title} className="pb-trust__item">
              <span className="pb-trust__icon">
                <Icon name={item.icon} size={24} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-section" aria-labelledby="mood-title">
        <div className="pb-section__head">
          <h2 id="mood-title">Pick a mood</h2>
          <p>
            Five ways to look, and a studio for making a sixth. Colours chosen here change the whole site
            instantly — and a theme your child makes can be sent to a friend as a link.
          </p>
        </div>
        <div className="pb-moods">
          {builtIns.map((mood) => (
            <button
              key={mood.id}
              type="button"
              className={`pb-mood${theme.id === mood.id ? ' is-active' : ''}`}
              onClick={() => apply(mood.id)}
              aria-pressed={theme.id === mood.id}
            >
              <span className="pb-mood__swatch">
                <span style={{ background: mood.colors.sky }} />
                <span style={{ background: mood.colors.bg }} />
                <span style={{ background: mood.colors.brand }} />
                <span style={{ background: mood.colors.accent }} />
              </span>
              <span className="pb-mood__name">{mood.name}</span>
            </button>
          ))}
          <Link to="/themes" className="pb-mood pb-mood--more">
            <span className="pb-mood__swatch pb-mood__swatch--more">
              <Icon name="palette" size={20} />
            </span>
            <span className="pb-mood__name">Theme studio</span>
          </Link>
        </div>
      </section>

      <section className="pb-band">
        <div className="pb-band__copy">
          <h2>For the grown-up doing the handing over</h2>
          <p>
            This site exists because a parent wanted one place on the internet where the answer to “can I play
            something?” was simply yes. Here is exactly what it stores, what it never asks for, and why the
            hints teach instead of solving.
          </p>
        </div>
        <LinkButton to="/parents" variant="primary" size="md" iconRight="arrowRight">
          Read the parent notes
        </LinkButton>
      </section>
    </>
  );
}
