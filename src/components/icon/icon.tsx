import styles from './icon.module.css'

/*
  Hand-drawn 24×24 outline icons for the nav and footer links, in the same
  stroke style as lucide (2px, round caps and joins). Each part is a named path
  so icon.module.css can animate it on its own; the parts icon.module.css hides
  at rest (smoke, sparks, the turning page, the letter) only appear mid-gesture.
*/
const icons = {
  home: {
    chimney: 'M16 7.3V4.5h2.5v4.9',
    roof: 'M3 11.5 12 4l9 7.5',
    walls: 'M5 10v9.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10',
    door: 'M10 20.5V15h4v5.5',
    smoke: 'M17.3 2.6c-1-.7 1-1.4 0-2.1',
  },
  posts: {
    page: 'M14 3.5H6.5a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8z',
    fold: 'M14 3.5V8h4.5',
    line1: 'M8.5 12.5h7',
    line2: 'M8.5 16H13',
  },
  favorites: {
    heart: 'M12 20s-7.8-4.6-9-9.6C2.2 7 4.4 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.9 1.2-1.8 2.8-2.9 4.8-2.9 2.8 0 5 2.5 4.2 5.9C19.8 15.4 12 20 12 20z',
    spark1: 'M3.6 4.1 1.9 2.4',
    spark2: 'M12 3.8V1.4',
    spark3: 'M20.4 4.1l1.7-1.7',
  },
  books: {
    left: 'M12 7c-2.4-1.7-5.6-2.2-8.5-1.4v12.8c2.9-.8 6.1-.3 8.5 1.4z',
    right: 'M12 7c2.4-1.7 5.6-2.2 8.5-1.4v12.8c-2.9-.8-6.1-.3-8.5 1.4z',
    page: 'M12 7c2.4-1.7 5.6-2.2 8.5-1.4v12.8c-2.9-.8-6.1-.3-8.5 1.4z',
  },
  work: {
    handle: 'M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5',
    case: 'M5 7.5h14A1.5 1.5 0 0 1 20.5 9v9.5A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5V9A1.5 1.5 0 0 1 5 7.5z',
    band: 'M3.5 12.5h17',
  },
  email: {
    letter: 'M8 7V3h8v4',
    envelope: 'M5 5.5h14A1.5 1.5 0 0 1 20.5 7v10a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17V7A1.5 1.5 0 0 1 5 5.5z',
    flap: 'm4.5 7 7.5 5.5L19.5 7',
  },
  x: {
    bar: 'M4 4h4.6L20 20h-4.6z',
    slash: 'M19.6 4l-6.3 6.6M10.7 13.4 4.4 20',
  },
  linkedin: {
    box: 'M6 3.5h12A2.5 2.5 0 0 1 20.5 6v12a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V6A2.5 2.5 0 0 1 6 3.5z',
    dot: 'M8 8v.01',
    i: 'M8 11v5.5',
    n: 'M11.5 16.5V11m0 2.6c0-1.6 1-2.6 2.4-2.6s2.4 1 2.4 2.6v2.9',
  },
  github: {
    cat: 'M9 21v-3.1c0-.9.3-1.6.8-2.1-2.8-.3-5.3-1.5-5.3-5.4 0-1.1.4-2.1 1.1-2.9-.2-.6-.3-1.9.2-3.2 0 0 1-.3 3.1 1.1a10.6 10.6 0 0 1 6.2 0c2.1-1.4 3.1-1.1 3.1-1.1.5 1.3.4 2.6.2 3.2.7.8 1.1 1.8 1.1 2.9 0 3.9-2.5 5.1-5.3 5.4.5.5.8 1.2.8 2.1V21',
    tail: 'M9 18.6c-3.2 1-3.8-1.4-5.5-1.9',
  },
  rss: {
    box: 'M6 3.5h12A2.5 2.5 0 0 1 20.5 6v12a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V6A2.5 2.5 0 0 1 6 3.5z',
    dot: 'M8 16v.01',
    wave1: 'M8 12a4 4 0 0 1 4 4',
    wave2: 'M8 8.5a7.5 7.5 0 0 1 7.5 7.5',
  },
} satisfies Record<string, Record<string, string>>

export type IconName = keyof typeof icons

export const isIconName = (name: string): name is IconName => name in icons

interface Props {
  name: IconName;
  /** the current page's nav item: drawn with a bolder stroke, like its bold label */
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
      {Object.entries(icons[name]).map(([part, d]) => (
        <path key={part} data-part={part} d={d} pathLength={1} />
      ))}
    </svg>
  )
}
