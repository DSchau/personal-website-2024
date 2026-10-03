import { FLOCK_FAR, FLOCK_NEAR, PAPER, SEA, seaScene } from './scene'
import { BOTTLE_SINK, floatingBottle } from './bottle'
import { HOME_OCEAN, type OceanConfig, SEA_BOX as BOX } from './ocean'
import styles from './sea.module.css'

// computed once per server instance; output is deterministic
const s = seaScene(SEA)
const b = floatingBottle()
const { view, hz, sun } = SEA

interface Props {
  /** the 404's message in a bottle, floating dead centre */
  bottle?: boolean
}

/**
 * The sea under the header (and on the 404): sky, a faint sun on the horizon,
 * and an engraved ocean (ocean.ts), drawn by ocean-motion.ts on a canvas laid
 * exactly over the SVG so the swells roll in (a single still frame with
 * reduced motion). Without JS, the same first frame comes from the
 * prerendered /sea-ocean.svg.
 */
export function Sea({ bottle = false }: Props) {
  // narrow screens crop the sides: keep the bottle (centre) or the sun (right) in view
  const align = bottle ? 'xMidYMax slice' : 'xMaxYMax slice'
  const viewBox = `${BOX.x} ${BOX.y} ${BOX.w} ${BOX.h}`
  return (
    <div
      className={styles.scene}
      data-ocean={JSON.stringify({ ocean: HOME_OCEAN, box: BOX, align } satisfies OceanConfig)}
      {...bottle
        ? { role: 'img', 'aria-label': 'A message in a bottle drifting on the sea' }
        : { 'aria-hidden': true }}
    >
      <svg className={styles.layer} viewBox={viewBox} preserveAspectRatio={align}>
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
        <rect x={view.x} y={hz} width={view.w} height={view.h + 100} fill={PAPER} stroke="none" />
        <path d={s.horizon} strokeWidth={0.8} />

        <g className={styles.flock} style={{ animationDelay: '-20s' }} dangerouslySetInnerHTML={{ __html: FLOCK_NEAR }} />
        <g className={`${styles.flock} ${styles.far}`} style={{ animationDelay: '-48s' }} dangerouslySetInnerHTML={{ __html: FLOCK_FAR }} />
      </svg>

      <canvas className={styles.layer} data-ocean-canvas aria-hidden="true" />
      <noscript>
        <img className={`${styles.layer} ${bottle ? styles.mid : ''}`} src="/sea-ocean.svg" alt="" />
      </noscript>

      {bottle && (
        // over the water, clipped at its waterline so it floats *in* the swell; ocean-motion.ts keeps it riding the surface
        <svg className={`${styles.layer} ${styles.over}`} viewBox={viewBox} preserveAspectRatio={align} aria-hidden="true">
          <defs>
            <clipPath id="bottle-waterline">
              <rect x={-120} y={-80} width={240} height={80 - BOTTLE_SINK + 0.5} />
            </clipPath>
          </defs>
          <g data-bottle={b.line} data-x={b.x} data-sink={BOTTLE_SINK} transform={`translate(${b.x} ${b.y})`}>
            <g clipPath="url(#bottle-waterline)">
              <g className={styles.bottle}>
                <g data-bottle-tilt transform={`rotate(${b.tilt}) scale(${b.scale})`} dangerouslySetInnerHTML={{ __html: b.html }} />
              </g>
            </g>
          </g>
        </svg>
      )}
    </div>
  )
}
