import { creatureName, type Recap } from '@puzzlebloom/memory-garden-engine';

/**
 * The end of a round, described rather than graded.
 *
 * This is the answer this game gives to the question the rest of the site asks.
 * A memory game has no reasoning to explain — nothing was deduced, something was
 * noticed — so instead of a technique it offers an account: how many turns the
 * round took, the longest stretch without a miss, and which two creatures the
 * player kept putting together. Every number comes from the log, so none of them
 * can flatter.
 *
 * No stars, no percentage, no "well done". Three facts and a time.
 */

const NUMBERS = [
  'no',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
] as const;

const count = (value: number): string => NUMBERS[value] ?? String(value);

const capitalise = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** "once", "twice", "four times": the forms a person actually says. */
function times(value: number): string {
  if (value === 1) return 'once';
  if (value === 2) return 'twice';
  return `${count(value)} times`;
}

const PAIR_TITLES: Record<number, string> = {
  6: 'All six pairs',
  8: 'All eight pairs',
  9: 'All nine pairs',
};

export const winTitle = (pairs: number): string => PAIR_TITLES[pairs] ?? `All ${count(pairs)} pairs`;

/**
 * The sentences on the panel, in order, as plain strings.
 *
 * Exported so the copy can be read and changed in one place, and so a test could
 * pin the awkward branches — one pair, one miss, no misses at all — if this ever
 * grows any.
 */
export function recapLines(facts: Recap, hintsUsed: number): string[] {
  const lines: string[] = [];

  lines.push(
    facts.turns === 1 ? 'You found them in one turn.' : `You found them in ${count(facts.turns)} turns.`,
  );

  if (facts.bestRun <= 0) {
    // Only reachable if a recap is asked of a board nobody has finished, but the
    // sentence has to stay true if it happens.
    lines.push('You never found two in a row without a miss.');
  } else if (facts.bestRun === 1) {
    lines.push('Your best run was one pair without a miss.');
  } else {
    lines.push(`Your best run was ${count(facts.bestRun)} pairs without a miss.`);
  }

  if (facts.hardest === null) {
    // The honest version of "you never put a wrong pair together": every turn
    // was a match, so no two cards that differed were ever turned as a pair.
    lines.push('You never turned over two cards that did not match.');
  } else {
    const [first, second] = facts.hardest;
    lines.push(
      `${capitalise(creatureName(first))} and ${creatureName(second)} met ${times(
        facts.hardestMisses,
      )} before you kept them apart.`,
    );
  }

  if (hintsUsed > 0) {
    lines.push(`You asked the garden to remind you ${times(hintsUsed)}.`);
  }

  return lines;
}

interface Props {
  facts: Recap;
  hintsUsed: number;
  clock: string;
}

export function RecapPanel({ facts, hintsUsed, clock }: Props) {
  return (
    <>
      <h2 id="pb-memory-win-title" className="pb-win__title">
        {winTitle(facts.pairs)}
      </h2>
      <p className="pb-win__sub">Found in {clock}.</p>
      <ul className="pb-memory__recap">
        {recapLines(facts, hintsUsed).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </>
  );
}
