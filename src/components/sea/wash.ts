/**
 * The homepage sea's hand-tinted wash: a little colour laid *under* the ink,
 * the way an engraving gets tinted by hand. Kept deliberately faint:
 *
 * - the water's lines are inked in indigo rather than black (no fill)
 * - a faint warmth low in the sky, fading out toward the top
 * - the sun: a warm disc, a soft glow on the horizon, a faint warm column down the water
 *
 * The washes are multiplied over the drawing (sea.tsx), so the ink stays crisp
 * and only the paper picks up the colour. The footer gets the same treatment,
 * even more sparingly: just its bay and a haze behind the bridge.
 */
import { SEA_BOX } from './ocean'
import { SEA } from './scene'

/** the water's ink: a deep blue-black */
export const WATER_INK = '#1c294d'

const SKY = '#fbe7d6'
const SUN = '#f4c3a0'

/** the shared wash colours (the footer's bay + haze use them too, see footer/scene.ts) */
export const WASH = { sky: SKY, sun: SUN, water: '#e1ebee' }

/**
 * The sun disc's fill. The sun is drawn at 35% opacity (sea.module.css), so
 * this is a little stronger than SUN to land at the same faint warmth.
 */
export const SUN_FILL = '#f2bb93'

/** the washes, as SVG markup in the sea's viewBox (pointer-events off, so hovering the sun still works) */
export function seaWash() {
  const B = SEA_BOX, { hz, sun } = SEA
  return (
    `<defs>` +
    `<linearGradient id="wash-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SKY}" stop-opacity="0"/><stop offset=".6" stop-color="${SKY}" stop-opacity=".25"/><stop offset="1" stop-color="${SKY}" stop-opacity=".55"/></linearGradient>` +
    `<radialGradient id="wash-glow"><stop offset="0" stop-color="${SUN}" stop-opacity=".35"/><stop offset="1" stop-color="${SUN}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="wash-column" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SUN}" stop-opacity=".2"/><stop offset="1" stop-color="${SUN}" stop-opacity="0"/></linearGradient>` +
    `</defs>` +
    `<g style="mix-blend-mode:multiply" pointer-events="none" stroke="none">` +
    `<rect x="${B.x - 400}" y="${B.y}" width="${B.w + 800}" height="${hz - B.y}" fill="url(#wash-sky)"/>` +
    `<ellipse cx="${sun.x}" cy="${hz}" rx="${sun.r * 4.5}" ry="${sun.r * 2.4}" fill="url(#wash-glow)"/>` +
    `<path d="M${sun.x - 40} ${hz}L${sun.x + 40} ${hz}L${sun.x + 160} ${B.y + B.h}L${sun.x - 160} ${B.y + B.h}Z" fill="url(#wash-column)"/>` +
    `</g>`
  )
}
