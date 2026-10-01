import { FLOCK_FAR, FLOCK_NEAR, HZ, PAPER, SUN, VIEW, swellScene } from './scene'
import styles from './header-scene.module.css'

// computed once per server instance; output is deterministic
const s = swellScene()

export function HeaderScene() {
  return (
    <svg
      className={styles.scene}
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
    >
      <defs dangerouslySetInnerHTML={{ __html: s.defs }} />

      <g dangerouslySetInnerHTML={{ __html: s.sky }} />

      {/* faint sun on the horizon: rays + disc move as one; climbs + darkens on hover */}
      <g className={styles.sun}>
        <g className={styles.rise}>
          <g className={styles.rays} style={{ transformOrigin: `${SUN.x}px ${SUN.y}px` }}>
            <path className={styles.raysA} d={s.raysA} strokeWidth={1.2} />
            <path className={styles.raysB} d={s.raysB} strokeWidth={0.8} />
          </g>
          <g dangerouslySetInnerHTML={{ __html: s.sun }} />
        </g>
      </g>

      {/* the sea: paper below the horizon hides the sun's lower half + lower rays */}
      <rect x={VIEW.x} y={HZ} width={VIEW.w} height={VIEW.h} fill={PAPER} stroke="none" />
      <path d={s.horizon} strokeWidth={0.8} />

      {/* rows of waves, far to near; each drifts a fraction of its wavelength and gently rises + falls */}
      {s.rows.map((row, i) => (
        <g
          key={i}
          className={styles.drift}
          style={{
            '--dx': `${Math.round(row.wl * 0.18)}px`,
            animationDuration: `${30 + (s.rows.length - i) * 4}s`,
            animationDelay: `${-i * 7}s`,
          } as React.CSSProperties}
        >
          <g
            className={styles.heave}
            style={{ '--dy': `${(0.3 + i * 0.2).toFixed(1)}px`, animationDelay: `${-i * 1.3}s` } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: row.html }}
          />
        </g>
      ))}

      <g className={styles.glitter}>
        {s.glint.map((g, i) => <path key={i} d={g.d} strokeWidth={0.9} style={{ animationDelay: `${g.delay}s` }} />)}
      </g>

      <g className={styles.flock} style={{ animationDelay: '-20s' }} dangerouslySetInnerHTML={{ __html: FLOCK_NEAR }} />
      <g className={`${styles.flock} ${styles.far}`} style={{ animationDelay: '-48s' }} dangerouslySetInnerHTML={{ __html: FLOCK_FAR }} />
    </svg>
  )
}
