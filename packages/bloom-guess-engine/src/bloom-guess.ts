/**
 * Bloom Guess — a nature word, petal lives, no gallows.
 *
 * Provenance: classic hangman letter-guessing. naimz82/simple-hangman (MIT)
 * is the overnight reference for "masked word + alphabet + lives". The
 * imagery is ours: six petals, never a hanging figure, and the dictionary
 * is a garden list rather than theirs.
 */

export interface GuessState {
  readonly word: string;
  readonly guessed: readonly string[];
  readonly petals: number;
}

export const PETALS = 6;

export const WORDS = [
  'FERN',
  'MOSS',
  'POND',
  'LEAF',
  'BIRD',
  'FROG',
  'ROSE',
  'LILY',
  'SEED',
  'STEM',
  'RAIN',
  'TREE',
  'NEST',
  'PEAR',
  'LAKE',
  'DAISY',
  'TULIP',
  'OLIVE',
  'BERRY',
  'CLOUD',
] as const;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGuess(seed: number): GuessState {
  const rand = mulberry32(seed);
  const word = WORDS[Math.floor(rand() * WORDS.length)];
  return { word, guessed: [], petals: PETALS };
}

export function mask(state: GuessState): string {
  return [...state.word].map((ch) => (state.guessed.includes(ch) ? ch : '_')).join('');
}

export function guess(state: GuessState, letter: string): GuessState {
  if (isOver(state)) return state;
  const ch = letter.toUpperCase();
  if (!/^[A-Z]$/.test(ch) || state.guessed.includes(ch)) return state;
  const hit = state.word.includes(ch);
  return {
    ...state,
    guessed: [...state.guessed, ch],
    petals: hit ? state.petals : state.petals - 1,
  };
}

export function isWon(state: GuessState): boolean {
  return [...state.word].every((ch) => state.guessed.includes(ch));
}

export function isLost(state: GuessState): boolean {
  return state.petals <= 0 && !isWon(state);
}

export function isOver(state: GuessState): boolean {
  return isWon(state) || isLost(state);
}
