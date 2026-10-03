import { PAPER } from '@/components/sea/scene'
import type { OceanConfig } from '@/components/sea/ocean'
import { NIGHT_OCEAN, VIEW, moonlitScene } from './scene'
import styles from './moonlit-sea.module.css'

// computed once per server instance; output is deterministic
const s = moonlitScene()
// narrow screens crop the left: keep the moon in view
const ALIGN = 'xMaxYMax slice'
const config: OceanConfig = { ocean: NIGHT_OCEAN, box: VIEW, align: ALIGN }

/**
 * The /favorites scene: a starry night over the sea. The sky is SVG; the sea
 * is the site's engraved ocean, drawn + set rolling by ocean-motion.ts on a
 * canvas over it (no JS: the prerendered /night-ocean.svg).
 */
export function MoonlitSea() {
  return (
    <div className={styles.scene} data-ocean={JSON.stringify(config)} aria-hidden="true">
      <svg className={styles.layer} viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} preserveAspectRatio={ALIGN}>
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
      </svg>

      <canvas className={styles.layer} data-ocean-canvas />
      <noscript>
        <img className={styles.layer} src="/night-ocean.svg" alt="" />
      </noscript>
    </div>
  )
}
