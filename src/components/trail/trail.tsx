import type { CSSProperties } from 'react'

import { VIEW, contours, trail } from './scene'
import styles from './trail.module.css'

// computed once per server instance; output is deterministic
const map = contours()
const t = trail()

/** seconds the trail takes to draw (keep in sync with the `draw` keyframes: 60% of the 28s loop) */
const DRAW = 16.8

/** the /work scene: a topographic map with a trail climbing toward the summit */
export function Trail() {
  return (
    <svg
      className={styles.scene}
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      // narrow screens crop the left: keep the summit + the latest waypoints in view
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
    >
      <g className={styles.contours}>
        {map.buckets.map(b => <path key={b.w} d={b.d} strokeWidth={b.w} />)}
      </g>

      {/*
        the trail draws itself up the mountain: a single continuous line draws in inside a mask,
        revealing the dashed trail (and its white halo, which lifts it off the contours) as it goes
      */}
      <defs>
        <mask id="trail-reveal" maskUnits="userSpaceOnUse" x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h}>
          <path className={styles.draw} d={t.d} pathLength={100} stroke="#fff" strokeWidth={10} />
        </mask>
      </defs>
      <g mask="url(#trail-reveal)">
        <path d={t.d} stroke="var(--bg-color)" strokeWidth={5} />
        <path d={t.d} strokeWidth={1.6} strokeDasharray="6 4" />
      </g>

      {/* a waypoint per chapter; each pulses as the trail reaches it */}
      {t.waypoints.map(w => (
        <circle
          key={w.name}
          className={styles.waypoint}
          cx={w.x}
          cy={w.y}
          r={3.2}
          fill="var(--bg-color)"
          strokeWidth={1.2}
          style={{ animationDelay: `${(w.at * DRAW).toFixed(2)}s`, transformOrigin: `${w.x}px ${w.y}px` } as CSSProperties}
        />
      ))}

    </svg>
  )
}
