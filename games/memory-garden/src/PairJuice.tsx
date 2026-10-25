import { chime, type SparkBurst, SparkBursts, useReducedMotion } from '@puzzlebloom/ui';
import { useEffect, useState } from 'react';

/**
 * The kept-pair celebration, on the garden's shared juice layer: when a turn
 * keeps a pair, both cards spark where they lie and a bright chime rings —
 * the moment this game exists for. Positions are read from the two cards'
 * rects at fire time (the grid reflows between sizes), so the bursts sit on
 * the cards whatever the layout.
 */

interface Props {
  flash: { a: number; b: number; at: number } | null;
}

export function PairJuice({ flash }: Props) {
  const [bursts, setBursts] = useState<SparkBurst[]>([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!flash) return;
    // Audio is not motion: the chime rings either way; the sparks do not.
    chime(0.7);
    if (reduced) return;
    const cards = document.querySelectorAll<HTMLButtonElement>('.pb-memory__card');
    const stage = document.querySelector<HTMLElement>('.pb-memory__stage');
    if (!stage || !cards[flash.a] || !cards[flash.b]) return;
    const stageRect = stage.getBoundingClientRect();
    const centres = [cards[flash.a], cards[flash.b]].map((card, i) => {
      const r = card.getBoundingClientRect();
      return {
        id: flash.at + i,
        x: r.left + r.width / 2 - stageRect.left,
        y: r.top + r.height / 2 - stageRect.top,
        color: '#7fb069',
        size: Math.min(r.width * 0.9, 72),
      };
    });
    setBursts(centres);
    const clear = setTimeout(() => setBursts([]), 600);
    return () => clearTimeout(clear);
  }, [flash, reduced]);

  return <SparkBursts bursts={bursts} done={(id) => setBursts((c) => c.filter((b) => b.id !== id))} />;
}
