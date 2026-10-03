/**
 * /favorites scene: a starry night over the sea, engraved.
 *
 * The sky is dense engraved rules, heaviest overhead and easing toward the
 * horizon (and around the moon, for its glow), so it reads as night at a
 * glance. Stars are paper showing through the ink and twinkle; a crescent
 * moon hangs low with its dark limb left in the sky's hatching (earthshine);
 * now and then a shooting star crosses. Below, the homepage's engraved ocean
 * (sea/ocean.ts), inked darker and a little calmer, with the moon's path
 * glinting down it.
 *
 * Seeded/deterministic, rendered to SVG markup at build time; CSS
 * (moonlit-sea.module.css) handles the motion.
 */
import { PAPER, r } from '@/components/sea/scene'
import type { Ocean } from '@/components/sea/ocean'

const rng = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647

export const VIEW = { x: 0, y: 20, w: 1600, h: 250 }
const HZ = 182
// on the right, so narrow screens (cropped from the left) keep it in view
export const MOON = { x: 1330, y: 92, r: 26 }

/** the night sea: the same ocean as the homepage's, inked darker and a little calmer, the moon's path down it */
export const NIGHT_OCEAN: Ocean = {
  hz: HZ,
  bottom: VIEW.y + VIEW.h + 6,
  from: -20,
  to: VIEW.w + 20,
  cx: VIEW.w / 2,
  sun: { x: MOON.x },
  lines: 46,
  height: 4.5,
  ink: 1.35,
}

/**
 * Continuous fine rules (engraved night skies don't break their lines: only
 * the stars and the moon's glow do), heaviest overhead.
 */
function sky() {
  const buckets = new Map<number, string>()
  const top = VIEW.y - 4
  for (let y = top; y < HZ - 1; y += 3.2) {
    const t = 1 - (y - top) / (HZ - top) // 1 overhead … 0 at the horizon
    const w = Math.round((0.15 + t ** 1.3 * 1.05) * 20) / 20
    buckets.set(w, (buckets.get(w) ?? '') + `M-10 ${r(y)}H${VIEW.w + 10}`)
  }
  return [...buckets].map(([w, d]) => `<path d="${d}" stroke-width="${w}"/>`).join('')
}

/** a soft paper glow (fades the sky's rules out smoothly): used around the moon and each star */
const GLOW = `<radialGradient id="glow"><stop offset="0" stop-color="${PAPER}" stop-opacity="1"/><stop offset=".35" stop-color="${PAPER}" stop-opacity=".75"/><stop offset="1" stop-color="${PAPER}" stop-opacity="0"/></radialGradient>`

/** paper stars cut out of the ink sky, in a few groups so they can twinkle out of step */
function stars(rnd: () => number) {
  const groups = ['', '', '']
  let glints = ''
  let placed = 0
  for (let i = 0; placed < 95 && i < 500; i++) {
    const x = rnd() * VIEW.w
    // weighted toward the top, where the sky is darkest (and so the stars show best)
    const y = VIEW.y + 4 + (HZ - VIEW.y - 40) * rnd() ** 1.4
    const big = rnd()
    if (Math.hypot(x - MOON.x, y - MOON.y) < MOON.r + 30) continue
    placed++
    const rad = big > 0.9 ? 2.4 : big > 0.55 ? 1.6 : 1.1
    groups[placed % 3] += `<circle cx="${r(x)}" cy="${r(y)}" r="${r(rad * 4)}" fill="url(#glow)"/><circle cx="${r(x)}" cy="${r(y)}" r="${rad}"/>`
    // the brightest get a four-point glint
    if (rad > 2) {
      const a = 7 + rnd() * 5
      glints += `M${r(x - a)} ${r(y)}h${r(a * 2)}M${r(x)} ${r(y - a)}v${r(a * 2)}`
    }
  }
  return { groups, glints }
}

/** a crescent: the disc engraved dark (dense rules), with the lit limb in paper on top */
function moon() {
  const { x, y, r: R } = MOON
  const sx = x - R * 0.62, sy = y - R * 0.28 // the shadow disc, offset toward the upper left
  let dark = ''
  for (let yy = y - R + 1; yy < y + R; yy += 2) {
    const half = Math.sqrt(Math.max(0, R * R - (yy - y) ** 2))
    dark += `M${r(x - half)} ${r(yy)}H${r(x + half)}`
  }
  return {
    defs: `<mask id="crescent" maskUnits="userSpaceOnUse"><circle cx="${x}" cy="${y}" r="${R + 1}" fill="#fff"/><circle cx="${r(sx)}" cy="${r(sy)}" r="${R}" fill="#000"/></mask>`,
    html:
      // the glow it casts on the sky
      `<circle cx="${x}" cy="${y}" r="${R * 5}" fill="url(#glow)" stroke="none" opacity=".9"/>` +
      // the dark disc: earthshine, engraved
      `<circle cx="${x}" cy="${y}" r="${R}" fill="${PAPER}" stroke-width=".5"/><path d="${dark}" stroke-width=".8" opacity=".75"/>` +
      // the lit crescent, its outer edge inked
      `<g mask="url(#crescent)"><circle cx="${x}" cy="${y}" r="${R}" fill="${PAPER}" stroke-width="1.1"/></g>`,
  }
}

export function moonlitScene() {
  const rnd = rng(42)
  const st = stars(rnd)
  const m = moon()

  return {
    defs: m.defs + GLOW,
    sky: sky(),
    stars: st.groups,
    glints: st.glints,
    moon: m.html,
    // a shooting star's track, falling toward the moon (inside the narrow-screen crop)
    meteor: 'M1040 30L1180 64',
    water: `<rect x="-10" y="${HZ}" width="${VIEW.w + 20}" height="${VIEW.h}" fill="${PAPER}" stroke="none"/><path d="M-10 ${HZ}H${VIEW.w + 10}" stroke-width=".8"/>`,
  }
}
