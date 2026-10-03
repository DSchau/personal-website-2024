/**
 * The 404's message in a bottle, floating on the ocean (ocean.ts).
 *
 * It's drawn over the water and clipped at its waterline, so it sits *in* the
 * swell; the server places it on the t = 0 surface, and ocean-motion.ts keeps
 * it riding the water (rising, falling and tilting with the swell).
 */
import { BOTTLE_AT, HOME_OCEAN, OceanField } from './ocean'
import { PAPER, r } from './scene'

export const BOTTLE_SCALE = 1.5
/** how far below the waterline its centre sits (so the swell covers its belly) */
export const BOTTLE_SINK = 1.5

/**
 * An engraved bottle along +x, centred on (0, 0): rounded body, shoulder, neck,
 * lip and a hatched cork, glass shaded with contour lines (dark underneath, a
 * white highlight streak along the top), and a rolled message tied with string.
 */
function bottle() {
  const outline =
    'M-30 -11L10 -11C16 -11 20 -4 26 -4L36 -4L36 -5.5L39 -5.5L39 5.5L36 5.5L36 4L26 4C20 4 16 11 10 11L-30 11C-35.5 11 -35.5 -11 -30 -11Z'
  const base = 'M-30 -11C-26 -6 -26 6 -30 11'
  // glass: contour lines along the body, heavier toward the shadowed underside
  const glass = [
    { y: 9, from: -30, to: 10, w: 0.85 },
    { y: 7, from: -29, to: 12, w: 0.7 },
    { y: 5, from: -28, to: 6, w: 0.5 },
    { y: -8.5, from: -24, to: 4, w: 0.35 },
  ].map(({ y, from, to, w }) => `<path d="M${from} ${y}L${to} ${y}" stroke-width="${w}"/>`).join('')
  // a little shading on the underside of the neck + shoulder
  const neck = '<path d="M14 8C18 6 21 3 26 2.5L35 2.5" stroke-width=".45"/>'
  // the message: a rolled scroll with curled ends and a string tie
  const scroll =
    `<path d="M-21 -4.5L5 -4.5L5 4.5L-21 4.5Z" fill="${PAPER}" stroke-width=".6"/>` +
    '<ellipse cx="-21" cy="0" rx="1.6" ry="4.5" stroke-width=".5"/>' +
    '<ellipse cx="5" cy="0" rx="1.6" ry="4.5" stroke-width=".5"/>' +
    '<path d="M-17 -1.5L1 -1.5M-17 1.5L-2 1.5" stroke-width=".3" opacity=".7"/>' +
    '<path d="M-8 -4.5L-8 4.5M-8 4.5Q-10 8 -12 7.5M-8 4.5Q-6 8.5 -4 7.8" stroke-width=".7"/>'
  // cork: vertical hatching
  let cork = '<path d="M39 -3.6L45 -3.2L45 3.2L39 3.6" fill="' + PAPER + '" stroke-width=".8"/>'
  for (let x = 40.2; x < 45; x += 1.4) cork += `<path d="M${r(x)} -3L${r(x)} 3" stroke-width=".45"/>`
  return (
    `<path d="${outline}" fill="${PAPER}" stroke-width="1.1"/>` +
    scroll +
    glass +
    neck +
    `<path d="${base}" stroke-width=".5"/>` +
    cork
  )
}

export function floatingBottle() {
  const field = new OceanField(HOME_OCEAN)
  const line = field.lineAt(BOTTLE_AT.y)
  const { x } = BOTTLE_AT
  const here = field.surface(x, line, 0)
  // tilt to the slope of the water under it
  const tilt = r((Math.atan((field.surface(x + 8, line, 0).y - field.surface(x - 8, line, 0).y) / 16) * 180) / Math.PI - 6)
  return { x, y: r(here.y + BOTTLE_SINK), line, scale: BOTTLE_SCALE, tilt, html: bottle() }
}
