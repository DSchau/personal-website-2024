import type { CSSProperties } from 'react'

import { NARROW, contours, trail, viewFor } from './scene'
import styles from './trail.module.css'

// computed once per server instance; output is deterministic
const VARIANTS = [
  // wide: crops from the left on mid-sized screens, keeping the summit + latest waypoints in view
  { k: 1, id: 'wide', className: styles.wide, align: 'xMaxYMax slice', weight: 1 },
  // narrow: the whole map squeezed sideways; lines a touch heavier, as it's drawn smaller
  { k: NARROW, id: 'narrow', className: styles.narrow, align: 'xMidYMax slice', weight: 1.4 },
].map(v => ({ ...v, view: viewFor(v.k), map: contours(v.k), t: trail(v.k) }))

/** seconds the trail takes to draw (keep in sync with the `draw` keyframes: 60% of the 28s loop) */
const DRAW = 16.8

/** the /work scene: a topographic map with a trail climbing toward the summit */
export function Trail() {
  return <>{VARIANTS.map(v => <TrailMap key={v.id} {...v} />)}</>
}

function TrailMap({ id, className, align, weight, view: VIEW, map, t }: (typeof VARIANTS)[number]) {
  return (
    <svg
      className={`${styles.scene} ${className}`}
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      preserveAspectRatio={align}
      aria-hidden="true"
    >
      <g className={styles.contours}>
        {map.buckets.map(b => <path key={b.w} d={b.d} strokeWidth={Math.round(b.w * weight * 100) / 100} />)}
      </g>

      {/*
        the trail draws itself up the mountain: a single continuous line draws in inside a mask,
        revealing the dashed trail (and its white halo, which lifts it off the contours) as it goes
      */}
      <defs>
        <mask id={`trail-reveal-${id}`} maskUnits="userSpaceOnUse" x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h}>
          <path className={styles.draw} d={t.d} pathLength={100} stroke="#fff" strokeWidth={10} />
        </mask>
      </defs>
      <g mask={`url(#trail-reveal-${id})`}>
        <path d={t.d} stroke="var(--bg-color)" strokeWidth={5} />
        <path d={t.d} strokeWidth={1.6 * weight} strokeDasharray={weight === 1 ? '6 4' : '5 3.5'} />
      </g>

      {/* a waypoint per chapter; each pulses as the trail reaches it */}
      {t.waypoints.map(w => (
        <circle
          key={w.name}
          className={styles.waypoint}
          cx={w.x}
          cy={w.y}
          r={3.2 * weight}
          fill="var(--bg-color)"
          strokeWidth={1.2 * weight}
          style={{ animationDelay: `${(w.at * DRAW).toFixed(2)}s`, transformOrigin: `${w.x}px ${w.y}px` } as CSSProperties}
        />
      ))}

    </svg>
  )
}
