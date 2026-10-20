import { CreatureGlyph, Icon } from '@puzzlebloom/ui';
import { Link, useRouter } from '../app/router';

const LINKS = [
  { to: '/', label: 'The garden', short: 'Garden' },
  { to: '/themes', label: 'Themes', short: 'Themes' },
  { to: '/parents', label: 'For parents', short: 'Parents' },
];

export function Nav() {
  const { path } = useRouter();

  return (
    <header className="pb-nav">
      <div className="pb-nav__inner">
        <Link className="pb-logo" to="/">
          <span className="pb-logo__mark" aria-hidden="true">
            <CreatureGlyph digit={5} size={26} />
          </span>
          <span className="pb-logo__word">
            Puzzle<span className="pb-logo__accent">Bloom</span>
          </span>
        </Link>

        <nav className="pb-nav__links" aria-label="Main">
          {LINKS.map((link) => {
            const active = link.to === '/' ? path === '/' : path.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`pb-nav__link${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="pb-nav__full">{link.label}</span>
                <span className="pb-nav__short">{link.short}</span>
              </Link>
            );
          })}
        </nav>

        <Link className="pb-nav__palette" to="/themes" aria-label="Change the colours">
          <Icon name="palette" size={20} />
        </Link>
      </div>
    </header>
  );
}
