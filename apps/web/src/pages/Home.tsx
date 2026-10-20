import { Chip, CreatureGlyph, Icon, type IconName } from '@puzzlebloom/ui';
import { LinkButton } from '../shell/LinkButton';
import { Link } from '../app/router';
import { useTheme } from '../app/ThemeProvider';
import { GAMES, SPROUTING, type GameManifest } from '../games/registry';

/** A real, valid grid, thinned out. Decoration that happens to be truthful. */
const PREVIEW =
  '5.4.7...2.7..9...81.8...5.78.9.6.4...2...3.9...3.2.8.69.1.3.2.42...1.9.53.5.8.7..';

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
          key={index}
          className={`pb-mini__cell${char === '.' ? ' is-empty' : ''}${
            index === 40 ? ' is-live' : index === 39 || index === 41 || index === 31 || index === 49 ? ' is-near' : ''
          }`}
        >
          {char === '.' ? null : <CreatureGlyph digit={Number(char)} size={24} />}
        </span>
      ))}
    </div>
  );
}

function Art({ game }: { game: GameManifest }) {
  if (game.status === 'ready') {
    return (
      <div className="pb-card__art pb-card__art--grass" aria-hidden="true">
        <div className="pb-card__art-grid">
          {[3, 7, 1, 9, 5, 2, 8, 4, 6].map((digit) => (
            <span key={digit}>
              <CreatureGlyph digit={digit} size={30} />
            </span>
          ))}
        </div>
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

export function Home() {
  const { builtIns, use: useThemeById, theme } = useTheme();
  const [first, ...rest] = GAMES;

  return (
    <>
      <section className="pb-hero">
        <div className="pb-hero__copy">
          <Chip tone="brand">A quiet corner of the internet</Chip>
          <h1 className="pb-hero__title">Puzzles that explain themselves.</h1>
          <p className="pb-hero__lede">
            A small garden of logic games for children, starting with Sudoku — where nine hand-drawn
            creatures each need exactly one home. No timer shouting, no streak to break, no score to
            chase. Just the next cell, and the reason it works.
          </p>
          <div className="pb-hero__actions">
            <LinkButton to={first.route} variant="loud" size="lg" iconLeft="play">
              Play {first.title}
            </LinkButton>
            <LinkButton to="/themes" variant="secondary" size="lg" iconLeft="palette">
              Make it yours
            </LinkButton>
          </div>
          <p className="pb-hero__note">
            Free · no account · works offline once the page has loaded
          </p>
        </div>

        <div className="pb-hero__art">
          <PreviewBoard />
          <p className="pb-hero__caption">Nine creatures. One rule: no repeats in a row, a column, or a box.</p>
        </div>
      </section>

      <section className="pb-section" aria-labelledby="garden-title">
        <div className="pb-section__head">
          <h2 id="garden-title">In the garden</h2>
          <p>One game finished and three growing. Each one arrives when it is actually good.</p>
        </div>

        <div className="pb-cards">
          <Link to={first.route} className="pb-card pb-card--ready">
            <Art game={first} />
            <div className="pb-card__body">
              <div className="pb-card__row">
                <h3>{first.title}</h3>
                <Chip tone="brand">Ready</Chip>
              </div>
              <p className="pb-card__tagline">{first.tagline}</p>
              <p className="pb-card__meta">
                {first.ageRange} · {first.typicalMinutes} · {first.skills.join(' · ')}
              </p>
            </div>
          </Link>

          {[...rest, ...SPROUTING].map((game) => (
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
              onClick={() => useThemeById(mood.id)}
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
            This site exists because a parent wanted one place on the internet where the answer to
            “can I play something?” was simply yes. Here is exactly what it stores, what it never asks
            for, and why the hints teach instead of solving.
          </p>
        </div>
        <LinkButton to="/parents" variant="primary" size="md" iconRight="arrowRight">
          Read the parent notes
        </LinkButton>
      </section>
    </>
  );
}
