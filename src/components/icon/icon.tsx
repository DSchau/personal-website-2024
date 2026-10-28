import type { CSSProperties } from 'react'
import styles from './icon.module.css'

/*
  Hand-drawn 24×24 icons for the nav and footer links: a lucide-weight ink
  outline (2px, round caps and joins) over flat colour. Each part is a named
  group so icon.module.css can animate it on its own; the parts it hides at rest
  (smoke, sparks, the turning page, the letter) only appear mid-gesture.

  A part is its outline path, plus optionally the colour under it: `fill` paints
  the outline's own shape, `paint` adds fill-only details on top (windows, a
  shine), and `ink` is the outline's colour once lit. At rest the icons are plain
  ink; on hover the colour pours into each part from the bottom up, one part
  after another, and it stays while the link is the current page.
*/
interface Part {
  d: string;
  fill?: string;
  ink?: string;
  paint?: [d: string, fill: string][];
}

const icons = {
  home: {
    chimney: { d: 'M16 7.3V4.5h2.5v4.9', ink: '#9c2f22', paint: [['M16 7.33V4.5h2.5v4.92z', '#c2453a']] },
    walls: {
      d: 'M5 10v9.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10', ink: '#8a5a1c',
      paint: [
        ['M5 10 12 4.2l7 5.8v9.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z', '#ffe9b8'],
        ['M6.6 13.2h2.2v2.2H6.6z', '#7cc6ff'],
        ['M15.2 13.2h2.2v2.2h-2.2z', '#7cc6ff'],
        ['M10.9 8.6a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0', '#ffb547'],
      ],
    },
    roof: { d: 'M3 11.5 12 4l9 7.5', ink: '#9c2f22', paint: [['M3 11.5 12 4l9 7.5-1.5 1.3L12 6.6l-7.5 6.2z', '#f25f4c']] },
    door: {
      d: 'M10 20.5V15h4v5.5', ink: '#1d4f9c',
      paint: [
        ['M10 20.5V15h4v5.5z', '#3f8ef0'],
        ['M12.5 17.8a.55.55 0 1 0 1.1 0a.55.55 0 1 0-1.1 0', '#ffd34d'],
      ],
    },
    smoke: { d: 'M17.3 2.6c-1-.7 1-1.4 0-2.1', ink: '#9aa4b2' },
  },
  posts: {
    page: {
      d: 'M14 3.5H6.5a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8z', ink: '#3b4a86',
      fill: '#e8efff',
      paint: [['M8.3 6.4h3.4v3.2H8.3z', '#8b7cf6']],
    },
    fold: { d: 'M14 3.5V8h4.5', ink: '#3b4a86', paint: [['M14 3.5V8h4.5z', '#a9c8ff']] },
    line1: { d: 'M8.5 12.5h7', ink: '#3b4a86', paint: [['M7.4 12.3h9.2v2.6H7.4z', '#ffe066']] },
    line2: { d: 'M8.5 16H13', ink: '#3b4a86', paint: [['M7.4 15.8h6.6v2.6H7.4z', '#ffb3c7']] },
  },
  favorites: {
    heart: {
      d: 'M12 20s-7.8-4.6-9-9.6C2.2 7 4.4 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.9 1.2-1.8 2.8-2.9 4.8-2.9 2.8 0 5 2.5 4.2 5.9C19.8 15.4 12 20 12 20z', ink: '#a8163a',
      fill: '#ff4f6d',
      paint: [
        ['M12 20s7.8-4.6 9-9.6c.3-1.3.2-2.5-.2-3.5-.5 4.6-5.1 9-8.8 10.9z', '#e23656'],
        ['M5 8.6c.2-1.4 1.3-2.3 2.6-2.2-.9.4-1.6 1.2-1.8 2.3a.4.4 0 0 1-.8-.1z', '#fff'],
      ],
    },
    spark1: { d: 'M3.6 4.1 1.9 2.4', ink: '#ffb703' },
    spark2: { d: 'M12 3.8V1.4', ink: '#ffb703' },
    spark3: { d: 'M20.4 4.1l1.7-1.7', ink: '#ffb703' },
  },
  books: {
    left: {
      d: 'M12 7c-2.4-1.7-5.6-2.2-8.5-1.4v12.8c2.9-.8 6.1-.3 8.5 1.4z', ink: '#1b5bb0',
      fill: '#5aa9ff',
      paint: [
        ['M5.4 8.6c1.6-.3 3.2-.1 4.7.6v1c-1.5-.7-3.1-.9-4.7-.6z', '#d6ebff'],
        ['M5.4 11.4c1.6-.3 3.2-.1 4.7.6v1c-1.5-.7-3.1-.9-4.7-.6z', '#d6ebff'],
      ],
    },
    right: {
      d: 'M12 7c2.4-1.7 5.6-2.2 8.5-1.4v12.8c-2.9-.8-6.1-.3-8.5 1.4z', ink: '#a86a00',
      fill: '#ffc94a',
      paint: [
        ['M18.6 8.6c-1.6-.3-3.2-.1-4.7.6v1c1.5-.7 3.1-.9 4.7-.6z', '#fff3cf'],
        ['M18.6 11.4c-1.6-.3-3.2-.1-4.7.6v1c1.5-.7 3.1-.9 4.7-.6z', '#fff3cf'],
      ],
    },
    page: { d: 'M12 7c2.4-1.7 5.6-2.2 8.5-1.4v12.8c-2.9-.8-6.1-.3-8.5 1.4z', ink: '#a86a00', fill: '#fffaf0' },
  },
  work: {
    handle: { d: 'M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5', ink: '#6b3712' },
    case: {
      d: 'M5 7.5h14A1.5 1.5 0 0 1 20.5 9v9.5A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5V9A1.5 1.5 0 0 1 5 7.5z', ink: '#6b3712',
      fill: '#d98c45',
      paint: [['M3.5 12.5h17v6A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5z', '#b86a2c']],
    },
    band: { d: 'M3.5 12.5h17', ink: '#6b3712', paint: [['M10 10.6h4v3.8h-4z', '#ffd34d']] },
  },
  email: {
    letter: { d: 'M8 7V3h8v4' },
    envelope: { d: 'M5 5.5h14A1.5 1.5 0 0 1 20.5 7v10a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17V7A1.5 1.5 0 0 1 5 5.5z' },
    flap: { d: 'm4.5 7 7.5 5.5L19.5 7' },
  },
  x: {
    bar: { d: 'M4 4h4.6L20 20h-4.6z' },
    slash: { d: 'M19.6 4l-6.3 6.6M10.7 13.4 4.4 20' },
  },
  linkedin: {
    box: { d: 'M6 3.5h12A2.5 2.5 0 0 1 20.5 6v12a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V6A2.5 2.5 0 0 1 6 3.5z' },
    dot: { d: 'M8 8v.01' },
    i: { d: 'M8 11v5.5' },
    n: { d: 'M11.5 16.5V11m0 2.6c0-1.6 1-2.6 2.4-2.6s2.4 1 2.4 2.6v2.9' },
  },
  github: {
    cat: { d: 'M9 21v-3.1c0-.9.3-1.6.8-2.1-2.8-.3-5.3-1.5-5.3-5.4 0-1.1.4-2.1 1.1-2.9-.2-.6-.3-1.9.2-3.2 0 0 1-.3 3.1 1.1a10.6 10.6 0 0 1 6.2 0c2.1-1.4 3.1-1.1 3.1-1.1.5 1.3.4 2.6.2 3.2.7.8 1.1 1.8 1.1 2.9 0 3.9-2.5 5.1-5.3 5.4.5.5.8 1.2.8 2.1V21' },
    tail: { d: 'M9 18.6c-3.2 1-3.8-1.4-5.5-1.9' },
  },
  rss: {
    box: { d: 'M6 3.5h12A2.5 2.5 0 0 1 20.5 6v12a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V6A2.5 2.5 0 0 1 6 3.5z' },
    dot: { d: 'M8 16v.01' },
    wave1: { d: 'M8 12a4 4 0 0 1 4 4' },
    wave2: { d: 'M8 8.5a7.5 7.5 0 0 1 7.5 7.5' },
  },
} satisfies Record<string, Record<string, Part>>

export type IconName = keyof typeof icons

export const isIconName = (name: string): name is IconName => name in icons

interface Props {
  name: IconName;
  /** the current page's nav item: drawn in colour with a bolder stroke, like its bold label */
  active?: boolean;
}

/** decorative: the link's text stays its accessible name */
export function Icon({ name, active = false }: Props) {
  return (
    <svg
      className={[styles.icon, active && styles.active].filter(Boolean).join(' ')}
      data-icon={name}
      // 2 units of padding on every side so strokes never clip mid-gesture
      viewBox="-2 -2 28 28"
      aria-hidden="true"
      focusable="false"
    >
      {Object.entries(icons[name] as Record<string, Part>).map(([part, { d, fill, ink, paint = [] }], i) => (
        <g key={part} data-part={part} style={{ '--i': i } as CSSProperties}>
          {(fill || paint.length > 0) && (
            <g className={styles.paint}>
              {fill && <path d={d} style={{ fill }} />}
              {paint.map(([pd, pf]) => <path key={pd} d={pd} style={{ fill: pf }} />)}
            </g>
          )}
          <path className={styles.ink} d={d} pathLength={1} style={ink ? ({ '--lit': ink } as CSSProperties) : undefined} />
        </g>
      ))}
    </svg>
  )
}
