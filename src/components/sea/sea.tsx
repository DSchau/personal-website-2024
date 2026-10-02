import type { CSSProperties } from 'react'

import { FLOCK_FAR, FLOCK_NEAR, PAPER, SEA, seaScene } from './scene'
import { BOTTLE_ROW, floatingBottle } from './bottle'
import styles from './sea.module.css'

// computed once per server instance; output is deterministic
const s = seaScene(SEA)
const b = floatingBottle()
const { view, hz, sun } = SEA
// the drawing is 330 tall; show the 250 that match the other pages' illustrations (crop sky above, the nearest row below)
const BOX = { x: view.x, y: view.y + 30, w: view.w, h: 250 }

interface Props {
  /** the 404's message in a bottle, floating dead centre */
  bottle?: boolean
}

/** each row drifts a fraction of its wavelength and gently rises + falls, out of step with its neighbours */
const rowMotion = (i: number, wl: number) => ({
  drift: {
    '--dx': `${Math.round(wl * 0.18)}px`,
    animationDuration: `${30 + (s.rows.length - i) * 4}s`,
    animationDelay: `${-i * 7}s`,
  } as CSSProperties,
  heave: { '--dy': `${(0.3 + i * 0.25).toFixed(2)}px`, animationDelay: `${-i * 1.3}s` } as CSSProperties,
})

export function Sea({ bottle = false }: Props) {
  return (
    <svg
      className={styles.scene}
      viewBox={`${BOX.x} ${BOX.y} ${BOX.w} ${BOX.h}`}
      // narrow screens crop the sides: keep the bottle (centre) or the sun (right) in view
      preserveAspectRatio={bottle ? 'xMidYMax slice' : 'xMaxYMax slice'}
      {...bottle
        ? { role: 'img', 'aria-label': 'A message in a bottle drifting on a calm sea' }
        : { 'aria-hidden': true }}
    >
      <defs dangerouslySetInnerHTML={{ __html: s.defs }} />

      <g dangerouslySetInnerHTML={{ __html: s.sky }} />

      {/* faint sun on the horizon: rays + disc move as one; climbs + darkens when you hover it */}
      <g className={styles.sun}>
        {/* invisible hit area, so hovering anywhere around the sun + its rays counts (not just the hairlines) */}
        <circle cx={sun.x} cy={sun.y} r={sun.r + 40} fill="transparent" stroke="none" />
        <g className={styles.rise}>
          <g className={styles.rays} style={{ transformOrigin: `${sun.x}px ${sun.y}px` }}>
            <path className={styles.raysA} d={s.raysA} strokeWidth={1.2} />
            <path className={styles.raysB} d={s.raysB} strokeWidth={0.8} />
          </g>
          <g dangerouslySetInnerHTML={{ __html: s.sun }} />
        </g>
      </g>

      {/* the sea: paper below the horizon hides the sun's lower half + lower rays */}
      <rect x={view.x} y={hz} width={view.w} height={view.h} fill={PAPER} stroke="none" />
      <path d={s.horizon} strokeWidth={0.8} />

      {s.rows.map((row, i) => {
        const m = rowMotion(i, row.wl)
        const withBottle = bottle && i === BOTTLE_ROW
        return (
          <g key={i} className={styles.drift} style={m.drift}>
            <g className={styles.heave} style={m.heave}>
              {withBottle && (
                // drawn before its row, so the row's water covers the bottle's lower half
                <g transform={`translate(${b.x} ${b.y})`}>
                  <g className={styles.bottle}>
                    <g transform={`rotate(${b.tilt}) scale(${b.scale})`} dangerouslySetInnerHTML={{ __html: b.html }} />
                  </g>
                </g>
              )}
              <g dangerouslySetInnerHTML={{ __html: row.html }} />
              {withBottle && <path className={styles.wake} d={b.wake} strokeWidth={0.7} />}
            </g>
          </g>
        )
      })}

      <g className={styles.glitter}>
        {s.glint.map((g, i) => <path key={i} d={g.d} strokeWidth={0.9} style={{ animationDelay: `${g.delay}s` }} />)}
      </g>

      <g className={styles.flock} style={{ animationDelay: '-20s' }} dangerouslySetInnerHTML={{ __html: FLOCK_NEAR }} />
      <g className={`${styles.flock} ${styles.far}`} style={{ animationDelay: '-48s' }} dangerouslySetInnerHTML={{ __html: FLOCK_FAR }} />
    </svg>
  )
}
