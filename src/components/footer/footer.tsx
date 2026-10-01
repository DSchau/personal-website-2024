import socialLinks from '@/assets/contact.yaml'

import { BRIDGE, FAMILY, H, INK, PAPER, W, fogBands, grassTufts, handPaths, personGeometry } from './scene'
import styles from './footer.module.css'

interface Props {
  updated: string | undefined
  commits: number
}

// computed once per server instance; output is deterministic
const tufts = grassTufts()
const fog = fogBands()
const hands = handPaths()
const BIRDS = [[0, 90], [-14, 98], [-26, 86]] as const

function Scene() {
  return (
    <svg
      className={styles.scene}
      data-footer-scene
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
    >
      {/* static engraved layers (sky, bridge, hills, stipple) */}
      <image href="/footer-scene.svg" width={W} height={H} />

      {/* tower lamps, shown on hover */}
      {[BRIDGE.t1, BRIDGE.t2].map(x => (
        <circle key={x} className={styles.lamp} cx={x} cy={BRIDGE.top - 5} r={2} fill={INK} />
      ))}

      <g stroke={PAPER} strokeLinecap="round" strokeWidth={2.4}>
        {fog.map(f => (
          <path key={f.className} className={`${styles.fog} ${styles[f.className]}`} d={f.d} opacity={f.opacity} />
        ))}
      </g>

      {BIRDS.map(([dx, y], i) => (
        <g key={i} className={styles.bird} style={{ animationDelay: `${-i * 1.5 - 8}s` }}>
          <path d={`M${dx} ${y}q4 -4 8 0q4 -4 8 0`} stroke={INK} strokeWidth={1} fill="none" style={{ animationDelay: `${i * 0.17}s` }} />
        </g>
      ))}

      <g className={styles.family}>
        {FAMILY.map(p => {
          const g = personGeometry(p)
          const leg = { y1: g.hip, y2: g.ground, stroke: INK, strokeWidth: g.legWidth, strokeLinecap: 'round' as const, style: { animationDelay: `${p.delay}s` } }
          return (
            <g key={p.x}>
              <line className={styles.leg} x1={p.x - 1.2} x2={p.x - 1.2} {...leg} />
              <line className={`${styles.leg} ${styles.legAlt}`} x1={p.x + 1.2} x2={p.x + 1.2} {...leg} />
              <g className={styles.bob} style={{ animationDelay: `${p.delay}s` }}>
                <path d={g.torso} fill={INK} />
                <circle cx={p.x} cy={g.headY} r={g.head} fill={INK} />
              </g>
            </g>
          )
        })}
        <path d={hands} stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />
        <path d="M280 319H390M283 320.2H386M286 321.4H382M289 322.6H378" stroke={INK} strokeWidth={0.5} opacity={0.5} />
      </g>

      <g className={styles.grass} data-footer-grass stroke={INK} fill="none" strokeLinecap="round">
        {tufts.map((t, i) => (
          <g key={i} className={styles.push} data-x={t.x} data-y={t.y}>
            <path className={styles.tuft} d={t.d} strokeWidth={t.width} style={{ animationDelay: `${t.delay}s` }} />
          </g>
        ))}
      </g>
    </svg>
  )
}

export function Footer({ updated, commits }: Props) {
  const updatedDate = updated ? new Date(updated) : undefined

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div>
          <a className={styles.brand} href="/">Dustin Schau</a>
          <p className={styles.meta}>
            {commits > 0 && <>{commits.toLocaleString('en-US')} commits</>}
            {commits > 0 && updatedDate && <span aria-hidden="true"> · </span>}
            {updatedDate && (
              <>
                updated{' '}
                <time dateTime={updatedDate.toISOString()}>
                  {updatedDate.toISOString().slice(0, 10)}
                </time>
              </>
            )}
          </p>
        </div>
        <ul className={styles.links}>
          {socialLinks.map((link: { href: string; label: string }) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </div>
      <Scene />
    </footer>
  )
}
