import type { CSSProperties } from 'react'

import { VIEW, moonlitScene } from './scene'
import styles from './moonlit-sea.module.css'

// computed once per server instance; output is deterministic
const s = moonlitScene()

/** the /favorites scene: the homepage sea at night, with a path of moonlight down the waves */
export function MoonlitSea() {
  return (
    <svg
      className={styles.scene}
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      // narrow screens crop the left: keep the moon in view
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
    >
      <defs dangerouslySetInnerHTML={{ __html: s.defs }} />

      <g dangerouslySetInnerHTML={{ __html: s.sky }} />
      <g dangerouslySetInnerHTML={{ __html: s.moon }} />
      <g dangerouslySetInnerHTML={{ __html: s.water }} />

      {/* the waves drift slowly, nearer rows a little farther (as on the homepage) */}
      {s.rows.map((row, i) => (
        <g
          key={i}
          className={styles.drift}
          style={{ '--dx': `${Math.round(row.wl * 0.12)}px`, animationDuration: `${30 + (s.rows.length - i) * 4}s`, animationDelay: `${-i * 7}s` } as CSSProperties}
        >
          <g
            className={styles.heave}
            style={{ '--dy': `${(0.3 + i * 0.2).toFixed(1)}px`, animationDelay: `${-i * 1.3}s` } as CSSProperties}
            dangerouslySetInnerHTML={{ __html: row.html }}
          />
        </g>
      ))}

      {/* moonlight shimmers on the water */}
      <g className={styles.shimmer}>
        {s.path.map((row, i) => <path key={i} d={row.d} strokeWidth={0.9} style={{ animationDelay: `${row.delay}s` }} />)}
      </g>
    </svg>
  )
}
