import { CreatureGlyph } from '@puzzlebloom/ui';
import { LinkButton } from '../shell/LinkButton';

export function NotFound() {
  return (
    <div className="pb-page pb-page--center">
      <span className="pb-notfound__art" aria-hidden="true">
        <CreatureGlyph digit={4} size={64} />
      </span>
      <h1>This path has not grown yet</h1>
      <p>The page you asked for is not here. It may be a game still in the greenhouse.</p>
      <LinkButton to="/" variant="primary" size="md" iconLeft="arrowLeft">
        Back to the garden
      </LinkButton>
    </div>
  );
}
