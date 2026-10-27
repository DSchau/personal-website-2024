import type { CSSProperties } from 'react'

import styles from './icon.module.css'

/*
  Hand-drawn 24×24 line icons for the nav and footer links.
  - fill: outlined shape that fills in on hover (and when `filled`)
  - line: stroke-only detail that stays an outline
  - cut: detail drawn on top of a fill; it turns background-colored once the shape fills, so it reads as a cut-out
*/
type Part = { d: string; kind: 'fill' | 'line' | 'cut' }

const icons = {
  home: [
    { kind: 'fill', d: 'M3.5 10.2 12 3.5l8.5 6.7v9.3a1 1 0 0 1-1 1h-5v-5.5h-5v5.5h-5a1 1 0 0 1-1-1z' },
  ],
  posts: [
    { kind: 'fill', d: 'M6.5 3.5H14l4.5 4.5v11.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z' },
    { kind: 'line', d: 'M14 3.5V8h4.5' },
    { kind: 'cut', d: 'M8.5 12.5h7M8.5 16H13' },
  ],
  favorites: [
    { kind: 'fill', d: 'M12 20s-7.8-4.6-9-9.6C2.2 7 4.4 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.9 1.2-1.8 2.8-2.9 4.8-2.9 2.8 0 5 2.5 4.2 5.9C19.8 15.4 12 20 12 20z' },
  ],
  books: [
    { kind: 'fill', d: 'M12 7c-2.4-1.7-5.6-2.2-8.5-1.4v12.8c2.9-.8 6.1-.3 8.5 1.4z' },
    { kind: 'fill', d: 'M12 7c2.4-1.7 5.6-2.2 8.5-1.4v12.8c-2.9-.8-6.1-.3-8.5 1.4z' },
    { kind: 'cut', d: 'M12 8.6v9.6' },
  ],
  work: [
    { kind: 'fill', d: 'M5 7.5h14A1.5 1.5 0 0 1 20.5 9v9.5A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5V9A1.5 1.5 0 0 1 5 7.5z' },
    { kind: 'line', d: 'M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5' },
    { kind: 'cut', d: 'M6.5 12.5h11' },
  ],
  email: [
    { kind: 'fill', d: 'M5 5.5h14A1.5 1.5 0 0 1 20.5 7v10a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17V7A1.5 1.5 0 0 1 5 5.5z' },
    { kind: 'cut', d: 'm6.2 8.6 5.8 4.4 5.8-4.4' },
  ],
  x: [
    { kind: 'fill', d: 'M4 4h4.6L20 20h-4.6z' },
    { kind: 'cut', d: 'M7.2 5.3 16.8 18.7' },
    { kind: 'line', d: 'M19.6 4l-6.3 6.6M10.7 13.4 4.4 20' },
  ],
  linkedin: [
    { kind: 'fill', d: 'M6 3.5h12A2.5 2.5 0 0 1 20.5 6v12a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V6A2.5 2.5 0 0 1 6 3.5z' },
    { kind: 'cut', d: 'M8 8v.01M8 11v5.5M11.5 16.5V11m0 2.6c0-1.6 1-2.6 2.4-2.6s2.4 1 2.4 2.6v2.9' },
  ],
  github: [
    { kind: 'fill', d: 'M9 21v-3.1c0-.9.3-1.6.8-2.1-2.8-.3-5.3-1.5-5.3-5.4 0-1.1.4-2.1 1.1-2.9-.2-.6-.3-1.9.2-3.2 0 0 1-.3 3.1 1.1a10.6 10.6 0 0 1 6.2 0c2.1-1.4 3.1-1.1 3.1-1.1.5 1.3.4 2.6.2 3.2.7.8 1.1 1.8 1.1 2.9 0 3.9-2.5 5.1-5.3 5.4.5.5.8 1.2.8 2.1V21' },
    { kind: 'line', d: 'M9 18.6c-3.2 1-3.8-1.4-5.5-1.9' },
  ],
} satisfies Record<string, Part[]>

export type IconName = keyof typeof icons

export const isIconName = (name: string): name is IconName => name in icons

interface Props {
  name: IconName;
  /** show the filled state (e.g. the current page's nav item) */
  filled?: boolean;
  /** stagger for the one-time draw on page load, in ms */
  delay?: number;
}

/** decorative: the link's text stays its accessible name */
export function Icon({ name, filled = false, delay = 0 }: Props) {
  const style = delay ? ({ '--icon-delay': `${delay}ms` } as CSSProperties) : undefined

  return (
    <svg
      className={[styles.icon, filled && styles.filled].filter(Boolean).join(' ')}
      style={style}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {icons[name].map((part: Part, i) => (
        <path key={i} className={styles[part.kind]} d={part.d} pathLength={1} />
      ))}
    </svg>
  )
}
