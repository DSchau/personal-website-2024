import type { CSSProperties } from 'react'

import { VIEW, writingScene } from './scene'
import styles from './writing.module.css'

// computed once per server instance; output is deterministic
const rows = writingScene()

/** the /posts scene: lines of handwriting that, row by row, turn into the sea */
export function Writing() {
  return (
    <svg
      className={styles.scene}
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      {rows.map((row, i) => {
        if (row.writing) {
          // the first line writes itself out, rests, then fades and starts again; the rest are already written
          return <path key={i} className={i === 0 ? styles.write : undefined} d={row.d} pathLength={i === 0 ? 100 : undefined} strokeWidth={row.width} />
        }
        // the sea rows drift slowly, nearer rows a little farther (like the homepage)
        return (
          <g
            key={i}
            className={styles.drift}
            style={{ '--dx': `${Math.round(row.wl * 0.12)}px`, animationDuration: `${26 + (rows.length - i) * 4}s`, animationDelay: `${-i * 6}s` } as CSSProperties}
          >
            <path d={row.d} strokeWidth={row.width} />
            {row.hatch && <path d={row.hatch} strokeWidth={Math.round(row.width * 45) / 100} opacity={0.7} />}
          </g>
        )
      })}
    </svg>
  )
}
