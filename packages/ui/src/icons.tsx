/**
 * The icon set. Locked, and deliberately hand-written.
 *
 * One grid (24×24), one stroke weight (1.75), one cap style, no fills except
 * where a shape is meant to read as solid. That consistency is what stops an
 * interface looking assembled from three different libraries — and it is the
 * reason this file has no dependency at all. Adding an icon is four lines; ask
 * for a package and you get a thousand icons in twelve styles.
 *
 * Never substitute an emoji for one of these. An emoji renders differently on
 * every platform, cannot take the theme colour, and a screen reader announces
 * it by its Unicode name.
 */

import type { ReactElement, SVGProps } from 'react';

export type IconName =
  | 'play'
  | 'arrowLeft'
  | 'arrowRight'
  | 'palette'
  | 'undo'
  | 'redo'
  | 'erase'
  | 'pencil'
  | 'bulb'
  | 'pause'
  | 'clock'
  | 'check'
  | 'close'
  | 'grid'
  | 'shield'
  | 'heart'
  | 'share'
  | 'sparkle'
  | 'sun'
  | 'moon'
  | 'userOff'
  | 'cloudOff'
  | 'trophy'
  | 'menu'
  | 'rotate'
  | 'flip';

const PATHS: Record<IconName, ReactElement> = {
  play: (
    <>
      <path d="M9 6.6v10.8L18 12z" />
      <path d="M9 6.6v10.8L18 12z" fill="currentColor" stroke="none" opacity="0.18" />
    </>
  ),
  arrowLeft: <path d="M14.5 5.5 8 12l6.5 6.5M8 12h11" />,
  arrowRight: <path d="M9.5 5.5 16 12l-6.5 6.5M16 12H5" />,
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.9 2-1.9 0-1.6-1.6-1.7-1.6-3.1 0-1 .8-1.8 2-1.8h1.7a3.9 3.9 0 0 0 3.9-4C20 5.9 16.4 3.5 12 3.5Z" />
      <circle cx="8.6" cy="9.4" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12.2" cy="7.4" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="7.6" cy="13.6" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  undo: <path d="M5 9.5A8 8 0 1 1 4.6 15M5 4.8v4.9h4.9" />,
  redo: <path d="M19 9.5A8 8 0 1 0 19.4 15M19 4.8v4.9h-4.9" />,
  erase: (
    <>
      <path d="M9.4 6.2h9.1A1.5 1.5 0 0 1 20 7.7v8.6a1.5 1.5 0 0 1-1.5 1.5H9.4L3.6 12z" />
      <path d="M11.6 9.8l4.4 4.4M16 9.8l-4.4 4.4" />
    </>
  ),
  pencil: (
    <>
      <path d="M4.6 19.4l.9-3.7 9.6-9.6 2.8 2.8-9.6 9.6z" />
      <path d="M13.9 5.3l2.8 2.8" />
    </>
  ),
  bulb: (
    <>
      <path d="M12 3.4a6 6 0 0 0-3.5 10.9v1.5h7v-1.5A6 6 0 0 0 12 3.4Z" />
      <path d="M9.6 18.4h4.8M10.6 20.6h2.8" />
    </>
  ),
  pause: (
    <>
      <rect x="8.5" y="5.5" width="2.6" height="13" rx="1.1" fill="currentColor" stroke="none" />
      <rect x="13.4" y="5.5" width="2.6" height="13" rx="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.5V12l3.2 2" />
    </>
  ),
  check: <path d="M5 12.6l4.6 4.6L19 6.8" />,
  close: <path d="M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6" />,
  grid: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.2" />
      <path d="M9.4 4v16M14.6 4v16M4 9.4h16M4 14.6h16" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.2 19 6v5.6c0 4.4-2.9 7.5-7 9.2-4.1-1.7-7-4.8-7-9.2V6z" />
      <path d="M9 12.2l2.1 2.1 4-4.2" />
    </>
  ),
  heart: (
    <path d="M12 20.2s-7.6-4.4-7.6-9.3A4.3 4.3 0 0 1 12 8.1a4.3 4.3 0 0 1 7.6 2.8c0 4.9-7.6 9.3-7.6 9.3Z" />
  ),
  share: (
    <>
      <circle cx="7" cy="12" r="2.4" />
      <circle cx="17" cy="6.4" r="2.4" />
      <circle cx="17" cy="17.6" r="2.4" />
      <path d="M9.2 10.8 14.8 7.6M9.2 13.2l5.6 3.2" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.6l1.9 5.1 5.1 1.9-5.1 1.9L12 17.6l-1.9-5.1L5 10.6l5.1-1.9z" />
      <path d="M18.4 15.4l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3.4v2.2M12 18.4v2.2M3.4 12h2.2M18.4 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
    </>
  ),
  moon: <path d="M20 14.2A8.3 8.3 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" />,
  userOff: (
    <>
      <circle cx="10" cy="8.4" r="3.9" />
      <path d="M3.6 20.2c0-3.4 2.9-5.6 6.4-5.6 1 0 1.9.2 2.7.5" />
      <path d="M4 4l16 16" />
    </>
  ),
  cloudOff: (
    <>
      <path d="M8.2 18.6h8.4a3.6 3.6 0 0 0 .6-7.1 5.6 5.6 0 0 0-8.5-4.2" />
      <path d="M6.6 9.4a3.7 3.7 0 0 0 .3 7.2" />
      <path d="M4 4l16 16" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4.6h8v4.2a4 4 0 0 1-8 0z" />
      <path d="M8 5.6H5.4v1.6A3 3 0 0 0 8.4 10M16 5.6h2.6v1.6A3 3 0 0 1 15.6 10" />
      <path d="M12 12.8v3.4M8.8 19.4h6.4M10.4 16.2h3.2v3.2h-3.2z" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  // A quarter turn about the centre, for a game whose only rotation is a step.
  rotate: (
    <>
      <path d="M4.6 12a7.4 7.4 0 1 0 2.7-5.8" />
      <path d="M4.2 4.4v4.6h4.6" />
    </>
  ),
  // Two mirrored halves either side of an axis: a mirror, not a copy.
  flip: (
    <>
      <path d="M12 3.4v17.2" strokeDasharray="2.6 2.6" />
      <path d="M9.4 6.8 4.4 17.2h5z" />
      <path d="M14.6 6.8 19.6 17.2h-5z" />
    </>
  ),
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  /** 16 inline, 20 inside a button, 24 standalone. Nothing else. */
  size?: 16 | 20 | 24 | 28 | 32;
  title?: string;
}

export function Icon({ name, size = 20, title, ...rest }: IconProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: untitled icons get aria-hidden below, which is the accessible treatment for decoration
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
