import { describe, expect, it } from 'vitest';
import { createGuess, guess, isLost, isWon, mask, PETALS, WORDS } from '../src';

describe('bloom guess', () => {
  it('masks every letter until it is guessed', () => {
    const start = createGuess(1);
    expect(mask(start)).toBe('_'.repeat(start.word.length));
    expect(WORDS).toContain(start.word);
  });

  it('a hit keeps the petals; a miss sheds one', () => {
    const start = { word: 'FERN', guessed: [] as string[], petals: PETALS };
    const hit = guess(start, 'f');
    expect(hit.petals).toBe(PETALS);
    expect(mask(hit)).toBe('F___');
    const miss = guess(hit, 'z');
    expect(miss.petals).toBe(PETALS - 1);
    expect(isWon(miss)).toBe(false);
  });

  it('naming every letter wins; six misses loses', () => {
    let state = { word: 'DEW', guessed: [] as string[], petals: PETALS };
    state = guess(state, 'd');
    state = guess(state, 'e');
    state = guess(state, 'w');
    expect(isWon(state)).toBe(true);

    let lost = { word: 'DEW', guessed: [] as string[], petals: PETALS };
    for (const ch of ['x', 'y', 'z', 'q', 'j', 'k']) lost = guess(lost, ch);
    expect(isLost(lost)).toBe(true);
    expect(guess(lost, 'd')).toBe(lost);
  });

  it('the same seed picks the same word', () => {
    expect(createGuess(9).word).toBe(createGuess(9).word);
  });
});
