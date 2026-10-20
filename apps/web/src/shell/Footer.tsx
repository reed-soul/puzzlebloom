import { CreatureGlyph } from '@puzzlebloom/ui';
import { Link } from '../app/router';

export function Footer() {
  return (
    <footer className="pb-footer">
      <div className="pb-footer__inner">
        <div className="pb-footer__brand">
          <span className="pb-footer__mark" aria-hidden="true">
            <CreatureGlyph digit={1} size={22} />
            <CreatureGlyph digit={4} size={22} />
            <CreatureGlyph digit={7} size={22} />
          </span>
          <p className="pb-footer__line">
            A quiet corner of the internet, for small people with big patience.
          </p>
        </div>

        <nav className="pb-footer__links" aria-label="Footer">
          <Link to="/">The garden</Link>
          <Link to="/themes">Themes</Link>
          <Link to="/parents">For parents</Link>
          <a href="https://github.com/HeyPuter/everything" rel="noreferrer noopener" target="_blank">
            Built on open source
          </a>
        </nav>

        <p className="pb-footer__fine">
          No cookies, no accounts, no tracking pixels. Puzzles are generated on your device and nowhere else.
          <br />© {new Date().getFullYear()} PuzzleBloom · MIT licensed
        </p>
      </div>
    </footer>
  );
}
