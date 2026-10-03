import type { CSSProperties } from 'react'

import { WASH } from '@/components/sea/wash'
import { VIEW, writingScene } from './scene'
import styles from './writing.module.css'

// computed once per server instance; output is deterministic
const rows = writingScene()

// the first few lines write themselves, each starting a beat after the one above
const WRITE_ROWS = 3
const WRITE_STAGGER = 1 // seconds

// where the writing gives way to the sea: the water's wash fades in from here
const seaTop = (rows.find(row => !row.writing)?.base ?? VIEW.y + VIEW.h) - 24

/** the /posts scene: lines of handwriting that, row by row, turn into the sea */
export function Writing() {
  return (
    <svg
      className={styles.scene}
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      {/* the homepage's hand-tinted water: a faint blue wash, multiplied under the ink, deepening toward the bottom */}
      <defs>
        <linearGradient id="writing-wash" gradientUnits="userSpaceOnUse" x1="0" y1={seaTop} x2="0" y2={VIEW.y + VIEW.h}>
          <stop offset="0" stopColor={WASH.water} stopOpacity="0" />
          <stop offset=".45" stopColor={WASH.water} stopOpacity=".7" />
          <stop offset="1" stopColor={WASH.water} />
        </linearGradient>
      </defs>
      <rect x={VIEW.x} y={seaTop} width={VIEW.w} height={VIEW.y + VIEW.h - seaTop} fill="url(#writing-wash)" stroke="none" style={{ mixBlendMode: 'multiply' }} />

      {rows.map((row, i) => {
        if (row.writing) {
          // the first few lines write themselves out in turn, rest, then fade and start again; the rest are already written
          const write = i < WRITE_ROWS
          return (
            <path
              key={i}
              className={write ? styles.write : undefined}
              style={write ? { animationDelay: `${i * WRITE_STAGGER}s` } : undefined}
              d={row.d}
              pathLength={write ? 100 : undefined}
              stroke={row.ink}
              strokeWidth={row.width}
            />
          )
        }
        // the sea rows drift slowly, nearer rows a little farther (like the homepage)
        return (
          <g
            key={i}
            className={styles.drift}
            stroke={row.ink}
            style={{ '--dx': `${Math.round(row.wl * 0.12)}px`, animationDuration: `${26 + (rows.length - i) * 4}s`, animationDelay: `${-i * 6}s` } as CSSProperties}
          >
            <path d={row.d} strokeWidth={row.width} />
            {row.hatch && <path d={row.hatch} strokeWidth={Math.round(row.width * 45) / 100} opacity={0.7} />}
          </g>
        )
      })}
    </svg>
  )
}
