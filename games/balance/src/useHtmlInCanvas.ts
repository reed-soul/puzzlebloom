import { useEffect, useState } from 'react';

/**
 * Feature probe for the HTML-in-Canvas API, per Chrome's documented detection:
 * set `content="drawable"` on a scratch canvas and read it back. No UA sniffing.
 *
 * This is the seam between "always use the newest capability" and "the site
 * must still work": the probe decides, and both branches are tested.
 */
export function useHtmlInCanvas(): boolean {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      canvas.setAttribute('content', 'drawable');
      setSupported(canvas.content === 'drawable');
    } catch {
      setSupported(false);
    }
  }, []);

  return supported;
}
