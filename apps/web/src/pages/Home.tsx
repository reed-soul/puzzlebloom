import { CARD_STONES } from '@puzzlebloom/shadows-engine/card';
import { CARD_FIGURE } from '@puzzlebloom/tangram-engine/card';
import { CreatureGlyph, Icon, type IconName } from '@puzzlebloom/ui';
import { useTheme } from '@puzzlebloom/ui/theme';
import { Link } from '../app/router';
import { GAMES, type GameManifest } from '../games/registry';
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

/**
 * The three doors on the first screen, in the order a person should meet them.
 *
 * Bloom Drop first because it answers within one tap and one second — a creature
 * falls, two touch, something bigger exists. Memory Garden second because the
 * rules need no sentence at all. Number Balance third because it is one idea
 * (both sides the same) wearing a toy.
 *
 * Named here rather than added to the register's order: the register is the
 * shelf's order and every card is equal on it, which is exactly what the first
 * screen must not be. A manifest missing from this list falls through to "the
 * other four" rather than disappearing.
 */
const FIRST = ['bloom', 'memory-garden', 'balance'] as const;

const KICKER: Record<string, string> = {
  bloom: 'Fastest to get',
  'memory-garden': 'No reading needed',
  balance: 'One rule',
};

const PITCH: Record<string, string> = {
  bloom: 'Drop two of the same creature and they become one bigger friend.',
  'memory-garden': 'Turn over two cards. Keep the pair that matches.',
  balance: 'One side holds a number. Make the other side weigh the same.',
};

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
 * beside them, so a second copy of the geometry cannot drift out of step.
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
 * draws it with. Importing the card module costs seven string literals; it
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

/**
 * A jar caught mid-drop: three tiers of the ladder visible, the smallest
 * falling toward two who are about to become one. The merge is the game, so
 * the card shows the moment before it.
 *
 * Unused by the current first screen — Bloom is one of the three doors and
 * wears `BloomLoop` instead. Kept because `FIRST` is only a preference: a
 * manifest that falls out of it lands in "the other five", and it should not
 * arrive there with an empty box where its drawing used to be.
 */
function BloomsArt() {
  return (
    <div className="pb-card__art-blooms" aria-hidden="true">
      <span className="is-falling" />
      <span className="is-pair-a" />
      <span className="is-pair-b" />
      <span className="is-big" />
    </div>
  );
}

/**
 * A plot of stones from the same corner the game looks from.
 *
 * The stones arrive as coordinates from the engine's own `card` module, not as
 * numbers typed here, and the projection is a loop over them — so editing the
 * figure edits the card, and a card can no longer go on drawing a shape the
 * game has stopped shipping.
 *
 * Painter's order: far stones first, then the ones in front of them, then the
 * ones stacked on top. Without the sort the faces land in plot order and a
 * near cube gets painted over by the far wall behind it.
 */
const CUBE = 9;

function ShadowsArt() {
  const faces = [...CARD_STONES]
    .sort((a, b) => a.file + a.rank - (b.file + b.rank) || a.level - b.level)
    .flatMap((stone) => {
      const x = (stone.file - stone.rank) * CUBE;
      const y = (stone.file + stone.rank) * (CUBE / 2) - stone.level * CUBE;
      const w = CUBE;
      const h = CUBE / 2;
      return [
        { tone: 'top', points: `${x},${y - h} ${x + w},${y} ${x},${y + h} ${x - w},${y}` },
        {
          tone: 'left',
          points: `${x - w},${y} ${x},${y + h} ${x},${y + h + CUBE} ${x - w},${y + CUBE}`,
        },
        {
          tone: 'right',
          points: `${x},${y + h} ${x + w},${y} ${x + w},${y + CUBE} ${x},${y + h + CUBE}`,
        },
      ];
    });

  return (
    <svg
      className="pb-card__art-shadows"
      viewBox={viewBoxOf(
        faces.map((face) => face.points),
        0.4,
      )}
      aria-hidden="true"
    >
      {faces.map((face, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the faces are a fixed projection of a fixed figure and nothing reorders
        <polygon key={index} className={`is-${face.tone}`} points={face.points} />
      ))}
    </svg>
  );
}

function Art({ game }: { game: GameManifest }) {
  return (
    <div className={`pb-card__art pb-card__art--${game.tone}`} aria-hidden="true">
      {game.art === 'squares' ? <SquaresArt /> : null}
      {game.art === 'tangram' ? <TrianglesArt /> : null}
      {game.art === 'pairs' ? <PairsArt /> : null}
      {game.art === 'balance' ? <BalanceArt /> : null}
      {game.art === 'road' ? <RoadArt /> : null}
      {game.art === 'blooms' ? <BloomsArt /> : null}
      {game.art === 'shadows' ? <ShadowsArt /> : null}
      {game.art === 'creatures' || !game.art ? <CreaturesArt /> : null}
    </div>
  );
}

/**
 * Sudoku's own little board, for its card in "the other four".
 *
 * The old front page put the big board in the hero and it was the best drawing
 * on the site — and completely dead. Here the same valid grid is small, inside a
 * link, so the prettiest thing on the page is also a door. The digits are
 * dropped at this size (nine columns of 6px cannot carry a numeral); the boxes
 * and the filled cells still read as sudoku.
 */
function SudokuThumb() {
  return (
    <div className="pb-sudoku-thumb" aria-hidden="true">
      {Array.from(PREVIEW).map((char, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid, nothing reorders
        <span key={index} className={char === '.' ? 'is-empty' : index === 40 ? 'is-live' : 'is-given'} />
      ))}
    </div>
  );
}

/**
 * Bloom Drop, looping every ten seconds.
 *
 * Two ants fall, meet on the jar floor and become a sprout. Ten seconds is short
 * enough to catch the whole story if you land on it mid-loop, long enough that
 * it reads as something alive rather than a GIF begging for attention. The
 * painted jar is the game's own art; the creatures are the game's own tiers.
 */
function BloomLoop() {
  return (
    <div className="pb-loop pb-loop--bloom">
      <img className="pb-loop__jar" src="/art/bloom/jar-scene.webp" alt="" draggable={false} />
      <img
        className="pb-loop__ant pb-loop__ant--a"
        src="/art/bloom/creature-ant.png"
        alt=""
        draggable={false}
      />
      <img
        className="pb-loop__ant pb-loop__ant--b"
        src="/art/bloom/creature-ant.png"
        alt=""
        draggable={false}
      />
      <img className="pb-loop__merged" src="/art/bloom/creature-sprout.png" alt="" draggable={false} />
      <span className="pb-loop__plus">+6</span>
    </div>
  );
}

/**
 * Memory Garden: two of three cards turn up and match. The middle card stays
 * face down on purpose — a card that flips everything proves nothing about the
 * game, and the one left alone is the reason the pair matters.
 */
function MemoryLoop() {
  return (
    <div className="pb-loop pb-loop--memory">
      <span className="pb-memloop__card pb-memloop__card--a">
        <span className="pb-memloop__face pb-memloop__face--back" />
        <span className="pb-memloop__face pb-memloop__face--front">
          <img src="/art/memory/creature-rabbit.png" alt="" draggable={false} />
        </span>
      </span>
      <span className="pb-memloop__card pb-memloop__card--b">
        <span className="pb-memloop__face pb-memloop__face--back" />
        <span className="pb-memloop__face pb-memloop__face--front">
          <img src="/art/memory/creature-owl.png" alt="" draggable={false} />
        </span>
      </span>
      <span className="pb-memloop__card pb-memloop__card--c">
        <span className="pb-memloop__face pb-memloop__face--back" />
        <span className="pb-memloop__face pb-memloop__face--front">
          <img src="/art/memory/creature-rabbit.png" alt="" draggable={false} />
        </span>
      </span>
    </div>
  );
}

/**
 * Number Balance: a "6" against a "3" and three frogs. It starts tipped because
 * that is the problem, and levels at the moment the last frog lands. The tile
 * and the frogs are the game's own pieces; no new drawing.
 */
function BalanceLoop() {
  return (
    <div className="pb-loop pb-loop--balance" aria-hidden="true">
      <span className="pb-balloop__post" />
      <span className="pb-balloop__foot" />
      <span className="pb-balloop__beam" />
      <span className="pb-balloop__pan pb-balloop__pan--left">
        <span className="pb-balloop__tile">6</span>
      </span>
      <span className="pb-balloop__pan pb-balloop__pan--right">
        <span className="pb-balloop__tile pb-balloop__tile--small">3</span>
        <span className="pb-balloop__tile pb-balloop__tile--small">3</span>
      </span>
    </div>
  );
}

function Loop({ id }: { id: string }) {
  if (id === 'bloom') return <BloomLoop />;
  if (id === 'memory-garden') return <MemoryLoop />;
  if (id === 'balance') return <BalanceLoop />;
  return null;
}

function StartCard({ game, lead }: { game: GameManifest; lead: boolean }) {
  return (
    <Link to={game.route} className={`pb-start pb-door${lead ? ' pb-start--lead' : ''}`}>
      <div className="pb-start__art" aria-hidden="true">
        <Loop id={game.id} />
        {lead ? <span className="pb-start__flag">Start here</span> : null}
      </div>
      <div className="pb-start__body">
        <span className="pb-start__kicker">{KICKER[game.id] ?? game.tagline}</span>
        <h3 className="pb-start__title">{game.title}</h3>
        <span className="pb-start__tagline">{PITCH[game.id] ?? game.tagline}</span>
        <span className="pb-start__cta">
          {lead ? 'Play now' : 'Play'}
          <Icon name="arrowRight" size={16} />
        </span>
      </div>
    </Link>
  );
}

export function Home() {
  const { builtIns, apply, theme } = useTheme();

  const first = FIRST.map((id) => GAMES.find((game) => game.id === id)).filter((game): game is GameManifest =>
    Boolean(game),
  );
  const rest = GAMES.filter((game) => !FIRST.includes(game.id as (typeof FIRST)[number]));

  return (
    <>
      <section className="pb-intro" aria-labelledby="intro-title">
        <div className="pb-intro__copy">
          <p className="pb-intro__eyebrow">No ads · no sign-up · nothing to lose</p>
          <h1 id="intro-title" className="pb-intro__title">
            Eight games. No ads. <span>Play now.</span>
          </h1>
          <p className="pb-intro__lede">
            Bloom Drop is the fastest to get: drop two of the same creature and they become one bigger friend.
            Ten seconds in, you will have made something. No timer, no streak, no account.
          </p>
        </div>
        <div className="pb-intro__mascot" aria-hidden="true">
          <img src="/art/bloom/creature-sprout.png" alt="" width={150} height={150} draggable={false} />
          <span>two ants → this</span>
        </div>
      </section>

      <section className="pb-launch" aria-labelledby="launch-title">
        <div className="pb-launch__head">
          <h2 id="launch-title">Start here</h2>
          <p>Three that answer within one tap. Bloom first, for a reason.</p>
        </div>
        <div className="pb-start-grid">
          {first.map((game, index) => (
            <StartCard key={game.id} game={game} lead={index === 0} />
          ))}
        </div>
      </section>

      <section className="pb-others" aria-labelledby="others-title">
        <div className="pb-launch__head">
          <h2 id="others-title">The other five</h2>
          <p>
            {GAMES.length} games, all playable. Nothing here is “coming soon”; the garden is full for now.
          </p>
        </div>
        <div className="pb-others__grid">
          {rest.map((game) => (
            <Link key={game.id} to={game.route} className="pb-mini-card pb-door">
              <div className="pb-mini-card__art">
                {game.id === 'sudoku' ? <SudokuThumb /> : <Art game={game} />}
              </div>
              <div className="pb-mini-card__body">
                <h3>{game.title}</h3>
                <span className="pb-mini-card__tag">{game.tagline}</span>
                <span className="pb-mini-card__meta">{game.typicalMinutes}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="pb-section pb-promises" aria-labelledby="safe-title">
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
          <h2 id="mood-title">Change how it looks</h2>
          <p>Pick a mood and the whole site changes instantly. Make a sixth one in the theme studio.</p>
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

      <aside className="pb-grownup" aria-labelledby="grownup-title">
        <div className="pb-grownup__copy">
          <h2 id="grownup-title">For the grown-up nearby</h2>
          <p>
            No ads, no accounts, no chat, no tracking. Puzzles are generated on this device, and nothing is
            sent anywhere. The long version is one page.
          </p>
        </div>
        <LinkButton to="/parents" variant="secondary" size="md" iconRight="arrowRight">
          The grown-up notes
        </LinkButton>
      </aside>
    </>
  );
}
