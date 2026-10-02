import type { CSSProperties } from 'react'

import { PAPER } from '@/components/sea/scene'
import { VIEW, moonlitScene } from './scene'
import styles from './moonlit-sea.module.css'

// computed once per server instance; output is deterministic
const s = moonlitScene()

/** the /favorites scene: a starry night over the sea, with the moon's path down the waves */
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

      <g className={styles.sky} dangerouslySetInnerHTML={{ __html: s.sky }} />

      {/* stars are paper showing through the ink; three groups twinkle out of step */}
      <g fill={PAPER} stroke="none">
        {s.stars.map((g, i) => (
          <g key={i} className={styles.stars} style={{ animationDelay: `${-i * 1.7}s` }} dangerouslySetInnerHTML={{ __html: g }} />
        ))}
      </g>
      <path className={styles.glints} d={s.glints} stroke={PAPER} strokeWidth={1} />

      {/* now and then, a shooting star */}
      <path className={styles.meteor} d={s.meteor} pathLength={100} stroke={PAPER} strokeWidth={2.2} />

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

      {/* moonlight glints on the water */}
      <g className={styles.shimmer}>
        {s.path.map((row, i) => <path key={i} d={row.d} strokeWidth={0.9} style={{ animationDelay: `${row.delay}s` }} />)}
      </g>
    </svg>
  )
}
