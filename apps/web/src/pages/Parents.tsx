import { Button, Chip, Icon, type IconName } from '@puzzlebloom/ui';
import { LinkButton } from '../shell/LinkButton';

const PROMISES: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: 'shield',
    title: 'No advertising, of any kind',
    body: 'No banners, no interstitials, no “watch a video to continue”. There is no business model running underneath the puzzle.',
  },
  {
    icon: 'userOff',
    title: 'No accounts and no messaging',
    body: 'Nothing to sign up for, nobody to talk to. There is no chat box to moderate because there is no chat box.',
  },
  {
    icon: 'heart',
    title: 'No violence, no fear',
    body: 'No shooting, no death, no jump-scares, no countdown that punishes you. Nothing here gets harder because you were slow.',
  },
  {
    icon: 'cloudOff',
    title: 'No data leaves the device',
    body: 'Progress, stats and themes live in this browser’s local storage. There is no analytics script and no server to send anything to.',
  },
  {
    icon: 'grid',
    title: 'No dark patterns',
    body: 'No streaks that punish a missed day, no fake scarcity, no “are you sure you want to leave?”. Closing the tab is always allowed.',
  },
];

const LEVELS = [
  { name: 'Gentle', who: '6 and up', what: 'Plenty of clues, one-step logic only. A good first grid.' },
  { name: 'Curious', who: '8 and up', what: 'Fewer clues, same logic. Rewards scanning the whole board.' },
  { name: 'Tricky', who: '10 and up', what: 'Needs pairs and intersections — the first real deductions.' },
  {
    name: 'Brainy',
    who: '12 and up',
    what: 'Needs subsets and wings. Genuinely hard, still always logical.',
  },
];

export function Parents() {
  const clearEverything = () => {
    try {
      // Both spellings. The theme studio namespaced its keys `pb:` and the games
      // namespace theirs `pb.`, so a filter for one prefix quietly left the
      // other kind of key behind — a button labelled "clear everything" that
      // did not clear everything.
      Object.keys(localStorage)
        .filter((key) => key.startsWith('pb.') || key.startsWith('pb:'))
        .forEach((key) => {
          localStorage.removeItem(key);
        });
    } catch {
      /* storage blocked; nothing to clear */
    }
    window.location.reload();
  };

  return (
    <div className="pb-page">
      <header className="pb-page__head">
        <Chip tone="brand">For parents</Chip>
        <h1>What this is, and what it refuses to be</h1>
        <p>
          PuzzleBloom is a garden of puzzle games for children. It was built by one parent who wanted a place
          where the answer to “can I play something?” was simply yes — no negotiating, no watching over a
          shoulder, no ads quietly learning what a six-year-old likes.
        </p>
      </header>

      <section className="pb-prose" aria-labelledby="why">
        <h2 id="why">Why it exists</h2>
        <p>
          Most games made for children are made to be returned to: a streak to protect, a chest to open, a
          friend’s score to beat. Those mechanics work, which is exactly the problem. They teach a child to
          keep playing rather than to finish.
        </p>
        <p>
          A puzzle has the opposite shape. It ends. It is satisfying at the moment it is solved, and then
          there is nothing left to collect. That is the whole design brief here: build things worth finishing,
          and make finishing feel like enough.
        </p>
      </section>

      <section className="pb-section" aria-labelledby="never">
        <div className="pb-section__head">
          <h2 id="never">Five promises</h2>
          <p>
            Kept cheap by architecture: this whole site is static files. There is no backend to leak from.
          </p>
        </div>
        <div className="pb-trust">
          {PROMISES.map((promise) => (
            <div key={promise.title} className="pb-trust__item">
              <span className="pb-trust__icon">
                <Icon name={promise.icon} size={24} />
              </span>
              <h3>{promise.title}</h3>
              <p>{promise.body}</p>
            </div>
          ))}
          <div className="pb-trust__item pb-trust__item--wide">
            <span className="pb-trust__icon">
              <Icon name="bulb" size={24} />
            </span>
            <h3>How a hint works</h3>
            <p>
              Hints never reveal the answer. Each one names the technique, points at the cells it read, and
              explains why the conclusion follows — “4 is the only digit left for this cell: its row, column
              and box account for the other eight.” The player can read the reason, or press a second button
              to watch it happen. Reading is the exercise; solving is the reward.
            </p>
          </div>
        </div>
      </section>

      <section className="pb-section" aria-labelledby="ages">
        <div className="pb-section__head">
          <h2 id="ages">Which level for which age</h2>
          <p>Age is a rough guide, not a gate. A child who finishes Gentle should try Curious immediately.</p>
        </div>
        <div className="pb-table-wrap">
          <table className="pb-table">
            <thead>
              <tr>
                <th scope="col">Level</th>
                <th scope="col">Roughly</th>
                <th scope="col">What it asks of them</th>
              </tr>
            </thead>
            <tbody>
              {LEVELS.map((level) => (
                <tr key={level.name}>
                  <th scope="row">{level.name}</th>
                  <td>{level.who}</td>
                  <td>{level.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pb-prose__aside">
          Under six, turn on the creatures instead of numerals. Nine faces are far easier to hold in mind than
          nine symbols that all look like sticks. Nonogram has two sizes rather than four levels: 5×5 for a
          first attempt, 10×10 once counting a line feels automatic. Tangram has neither sizes nor levels —
          the pieces are the difficulty, and the shape a child picks from the list is the level. Memory Garden
          has three: six pairs for a first game, then eight, then all nine creatures.
        </p>
      </section>

      <section className="pb-section" aria-labelledby="data">
        <div className="pb-section__head">
          <h2 id="data">What is stored on this device</h2>
          <p>Three things, all in this browser, none of them sent anywhere.</p>
        </div>
        <ul className="pb-list">
          <li>
            <strong>The board you are in the middle of.</strong> So closing the tab does not lose an
            unfinished puzzle.
          </li>
          <li>
            <strong>How many you have finished, and your best time per level.</strong> Local only, and easy to
            wipe.
          </li>
          <li>
            <strong>The theme you chose.</strong> Colours, nothing else.
          </li>
        </ul>
        <div className="pb-danger-zone">
          <p>Clearing these resets progress, stats and your theme. It cannot be undone.</p>
          <Button variant="secondary" size="sm" iconLeft="erase" onClick={clearEverything}>
            Clear everything on this device
          </Button>
        </div>
      </section>

      <section className="pb-section" aria-labelledby="a11y">
        <div className="pb-section__head">
          <h2 id="a11y">Accessibility notes</h2>
        </div>
        <ul className="pb-list">
          <li>
            The whole board is keyboard playable: arrows to move, digits to place, N for notes, H for a hint.
          </li>
          <li>
            Tangram is keyboard playable as well: Tab to a piece, arrows to nudge it, R to turn it, F to
            mirror it, and Cmd or Ctrl with Z to undo.
          </li>
          <li>
            Memory Garden is keyboard playable: Tab into the grid, arrows to move between cards, Enter or
            Space to turn one over, H for a reminder. A card is announced as “Card 5, the snail, kept”, so the
            three states of a card can be told apart without seeing them.
          </li>
          <li>Every cell is announced with its row, column and contents to a screen reader.</li>
          <li>
            The theme studio measures contrast and offers a one-tap repair rather than letting pale text
            through.
          </li>
          <li>Animations are short and stop entirely when the device asks for reduced motion.</li>
          <li>
            The creatures mode exists for pre-readers and for colour-blind players: each face has its own
            outline shape, not just its own colour.
          </li>
        </ul>
      </section>

      <section className="pb-band">
        <div className="pb-band__copy">
          <h2>Ready when you are</h2>
          <p>
            All four puzzles are one tap away, and the tab can be closed at any point without losing anything.
          </p>
        </div>
        <div className="pb-band__actions">
          <LinkButton to="/play/sudoku" variant="primary" size="md" iconLeft="play">
            Open Sudoku
          </LinkButton>
          <LinkButton to="/play/nonogram" variant="secondary" size="md" iconLeft="play">
            Open Nonogram
          </LinkButton>
          <LinkButton to="/play/tangram" variant="secondary" size="md" iconLeft="play">
            Open Tangram
          </LinkButton>
          <LinkButton to="/play/memory-garden" variant="secondary" size="md" iconLeft="play">
            Open Memory Garden
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
