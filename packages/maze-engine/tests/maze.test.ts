import { describe, expect, it } from 'vitest';
import { generateMaze, hint, isSolved, move } from '../src';

describe('maze path', () => {
  it('carves a connected garden: every cell is reachable from the gate', () => {
    const maze = generateMaze(8, 8, 11);
    expect(maze.cells).toHaveLength(64);
    const seen = new Set<number>([0]);
    const stack = [0];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      const r = Math.floor(cur / 8);
      const c = cur % 8;
      for (const [dir, dr, dc] of [
        ['n', -1, 0],
        ['e', 0, 1],
        ['s', 1, 0],
        ['w', 0, -1],
      ] as const) {
        if (maze.cells[cur][dir]) continue;
        const next = (r + dr) * 8 + (c + dc);
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push(next);
      }
    }
    expect(seen.size).toBe(64);
  });

  it('a hint is a legal first step, and following hints reaches the gate', () => {
    let maze = generateMaze(6, 6, 3);
    let guard = 0;
    while (!isSolved(maze) && guard < 200) {
      const dir = hint(maze);
      expect(dir).not.toBeNull();
      maze = move(maze, dir!);
      guard += 1;
    }
    expect(isSolved(maze)).toBe(true);
  });

  it('a wall refuses a step', () => {
    const maze = generateMaze(4, 4, 1);
    const blocked = (['n', 'e', 's', 'w'] as const).filter((d) => maze.cells[0][d]);
    if (blocked.length > 0) {
      const next = move(maze, blocked[0]);
      expect(next.pos).toBe(0);
    }
  });

  it('the same seed grows the same hedges', () => {
    expect(generateMaze(5, 5, 9).cells).toEqual(generateMaze(5, 5, 9).cells);
  });
});
