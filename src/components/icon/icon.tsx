import type { CSSProperties } from 'react'
import styles from './icon.module.css'
import { icons, type IconName, type Part } from './icons.ts'

export { isIconName, type IconName } from './icons.ts'

/*
  Monochrome link icons (drawings in icons.ts). Each part is a named group so
  icon-motion.ts can act it out on hover; outlines get pathLength=1 so a
  gesture can rewind and redraw them.
*/

interface Props {
  name: IconName;
  /** the current page's nav item: a bolder stroke, like its bold label */
  active?: boolean;
  className?: string;
}

/** decorative: the link's text stays its accessible name */
export function Icon({ name, active = false, className }: Props) {
  return (
    <svg
      className={[styles.icon, active && styles.active, className].filter(Boolean).join(' ')}
      data-icon={name}
      // 2 units of padding on every side so strokes never clip mid-gesture
      viewBox="-2 -2 28 28"
      aria-hidden="true"
      focusable="false"
    >
      <g data-part="all">
        {Object.entries(icons[name] as Record<string, Part>).map(([part, { d, fill, fillRule, extra, width }]) => (
          <g
            key={part}
            data-part={part}
            data-extra={extra ? '' : undefined}
            className={fill ? styles.fill : undefined}
            style={width ? ({ strokeWidth: width } as CSSProperties) : undefined}
          >
            {d.map(path => (
              <path key={path} d={path} fillRule={fillRule} pathLength={fill ? undefined : 1} />
            ))}
          </g>
        ))}
      </g>
    </svg>
  )
}
