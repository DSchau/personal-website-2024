/**
 * /favorites scene: the homepage sea at night. Sky rules deepening overhead,
 * a plain moon low over the water, and a shimmering path of moonlight down
 * the waves. Evenings are for favorite films, albums and games.
 *
 * Seeded/deterministic, rendered to SVG markup at build time; CSS
 * (moonlit-sea.module.css) drifts the waves and shimmers the moonlight.
 */
import { PAPER, type Sea, r, seaScene } from '@/components/sea/scene'

const rng = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647

export const VIEW = { x: 0, y: 20, w: 1600, h: 250 }
const HZ = 176
export const MOON = { x: 1180, y: HZ - 44, r: 32 }

const SEA: Sea = {
  view: VIEW,
  hz: HZ,
  sun: MOON, // only used for where the water's shimmer sits
  near: 262,
  rows: 7,
  wl: [60, 220],
  amp: [0.6, 5],
  lines: 6,
  glitterBottom: 250,
  seed: 17,
  id: 'moon-sea',
}

export function moonlitScene() {
  const rnd = rng(42)
  const s = seaScene(SEA)

  // night sky: faint rules, denser and darker overhead, thinning toward the horizon
  let sky = ''
  const rows = Math.floor((HZ - VIEW.y - 6) / 6)
  for (let i = 0; i < rows; i++) {
    const y = VIEW.y + 4 + i * 6
    const t = 1 - i / rows
    let x = rnd() * 40, d = ''
    while (x < VIEW.w) {
      const len = 40 + rnd() * 160
      d += `M${Math.round(x)} ${y}h${Math.round(len)}`
      x += len + 4 + rnd() * 30
    }
    sky += `<path d="${d}" stroke-width=".5" opacity="${r((0.04 + t ** 1.6 * 0.5) * 100) / 100}"/>`
  }

  // the moon: a paper disc with a few light rules along its shadowed edge
  let shade = ''
  for (let y = MOON.y - MOON.r + 3; y < MOON.y + MOON.r; y += 2.6) {
    const half = Math.sqrt(MOON.r * MOON.r - (y - MOON.y) ** 2)
    shade += `M${r(MOON.x - half + 1 + half * 0.9)} ${r(y)}H${r(MOON.x + half - 1)}`
  }
  const moon = `<circle cx="${MOON.x}" cy="${MOON.y}" r="${MOON.r}" fill="${PAPER}" stroke-width="1"/><path d="${shade}" stroke-width=".4" opacity=".6"/>`

  // moonlight on the water: a widening column of short strokes under the moon, in rows so they can shimmer
  const path: { d: string; delay: number }[] = []
  for (let i = 0; i < 16; i++) {
    const t = i / 15, y = HZ + 3 + (250 - HZ) * t ** 1.2, spread = 10 + t * 70
    const n = 2 + Math.floor(rnd() * 2 + t * 3)
    let d = ''
    for (let k = 0; k < n; k++) {
      const x = MOON.x + (rnd() - 0.5) * 2 * spread, len = 3 + rnd() * (5 + t * 10)
      d += `M${r(x - len / 2)} ${r(y)}h${r(len)}`
    }
    path.push({ d, delay: r(-rnd() * 3) })
  }

  return {
    defs: s.defs,
    sky,
    moon,
    water: `<rect x="-10" y="${HZ}" width="${VIEW.w + 20}" height="${VIEW.h}" fill="${PAPER}" stroke="none"/><path d="${s.horizon}" stroke-width=".8"/>`,
    rows: s.rows,
    path,
  }
}
