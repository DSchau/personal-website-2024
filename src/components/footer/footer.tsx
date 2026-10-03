import socialLinks from '@/assets/contact.yaml'

import { flock } from '@/components/sea/scene'
import { GRASS_INK } from '@/components/sea/wash'
import { BOATS, BRIDGE, H, INK, PAPER, W, grassTufts, sailboat } from './scene'
import { REST_X, restFamily } from './family'
import styles from './footer.module.css'

interface Props {
  updated: string | undefined
  commits: number
}

// computed once per server instance; output is deterministic
const tufts = grassTufts()
const boats = BOATS.map(b => ({ ...b, ...sailboat(b.x, b.y, b.s) }))
// the family's resting pose (family-walk.ts animates them on the client)
const people = restFamily(REST_X)
// a loose flock of gulls, like the homepage's: varied sizes, spacing and wingbeats
const gulls = flock(0, 96, 5, 13)

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

      {/* sailboats on the bay, drifting and rocking a little */}
      <g stroke={INK} strokeLinejoin="round" strokeLinecap="round">
        {boats.map((b, i) => (
          <g key={i} className={styles.boat} style={{ animationDelay: `${b.delay}s` }}>
            <g className={styles.rock} style={{ transformOrigin: `${b.x}px ${b.y}px`, animationDelay: `${b.delay / 7}s` }}>
              <path d={b.mast} strokeWidth={0.7} />
              <path d={`${b.main}${b.jib}`} fill={PAPER} strokeWidth={0.7} />
              <path d={b.shade} strokeWidth={0.35} />
              <path d={b.hull} fill={INK} strokeWidth={0.5} />
            </g>
          </g>
        ))}
      </g>

      <g className={styles.bird} stroke={INK} fill="none" style={{ animationDelay: '-8s' }} dangerouslySetInnerHTML={{ __html: gulls }} />

      {/*
        the family, drawn in line like the birds; a paper halo (the <use> below) lifts them off the hatching.
        Heads are filled with paper so they read as open circles.
      */}
      <g data-family strokeLinecap="round" strokeLinejoin="round" fill="none">
        <use href="#footer-family" stroke={PAPER} strokeWidth={3.4} />
        <g id="footer-family" stroke={INK} strokeWidth={1.15}>
          {people.map(p => (
            <g key={p.id} data-figure={p.id}>
              <path d={p.d} />
              <circle cx={p.head.cx} cy={p.head.cy} r={p.head.r} fill={PAPER} />
            </g>
          ))}
        </g>
      </g>

      <g className={styles.grass} data-footer-grass stroke={GRASS_INK} fill="none" strokeLinecap="round">
        {tufts.map((t, i) => (
          <g key={i} className={styles.push} data-x={t.x} data-y={t.y}>
            <g className={styles.tuft} style={{ animationDelay: `${t.delay}s` }}>
              <path d={t.d} strokeWidth={t.width} />
              {t.flower?.kind === 'daisy' && (
                <>
                  <circle cx={t.flower.cx} cy={t.flower.cy} r={t.flower.r} fill={PAPER} strokeWidth={0.6} />
                  <circle cx={t.flower.cx} cy={t.flower.cy} r={t.flower.r * 0.3} fill={INK} stroke="none" />
                </>
              )}
              {t.flower?.kind === 'poppy' && (
                // a little cup, open to the sky
                <path
                  d={`M${t.flower.cx - t.flower.r} ${t.flower.cy - t.flower.r * 0.6}q${t.flower.r * 0.1} ${t.flower.r * 1.5} ${t.flower.r} ${t.flower.r * 1.5}q${t.flower.r * 0.9} 0 ${t.flower.r} ${-t.flower.r * 1.5}`}
                  fill={INK}
                  strokeWidth={0.5}
                  opacity={0.75}
                />
              )}
            </g>
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
            {updatedDate && (
              <>
                Last updated{' '}
                <time dateTime={updatedDate.toISOString()}>
                  {updatedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                </time>
                {commits > 0 ? ', with ' : '.'}
              </>
            )}
            {commits > 0 && <>{commits.toLocaleString('en-US')} commits so far.</>}
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
