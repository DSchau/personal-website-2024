/**
 * Procedurally "engraved" footer landscape: rolling hills, the Golden Gate in
 * the distance, and a field of grass. Everything is seeded so output is
 * deterministic between builds.
 *
 * The heavy, static layers (sky, bridge, hills, stipple) are rendered to a
 * standalone SVG served from /footer-scene.svg so it's cached across pages.
 * The animated layers (boats, birds, family, grass) are rendered inline by
 * footer.tsx so CSS can animate them.
 */

import { H, W, midRidge } from './family'
export { H, W }
export const INK = '#161616'
export const PAPER = '#fefefe'

import { BRIDGE, renderBridge, withStrait } from './bridge'
import { compactPaths } from './compact-path'
import { WASH } from '@/components/sea/wash'
import { type Ocean, oceanSvg } from '@/components/sea/ocean'

const rng = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647

type Ridge = (x: number) => number
const ridge = (base: number, amps: [number, number, number][]): Ridge => (x) =>
  base + amps.reduce((t, [a, f, p]) => t + a * Math.sin(x * f + p), 0)
const slope = (fn: Ridge, x: number) => (fn(x + 2) - fn(x - 2)) / 4
const r = (n: number) => Math.round(n * 10) / 10

const HILLS = [
  // the far ridge opens into the strait under the bridge
  { id: 'far', fn: withStrait(ridge(205, [[20, 0.004, 1], [9, 0.011, 2], [4, 0.03, 0]])), lines: 30, spacing: 3, base: 0.55, dark: 0.5 },
  { id: 'mid', fn: midRidge, // the family's footpath (family.ts)
    lines: 24, spacing: 3.6, base: 0.7, dark: 0.4 },
  { id: 'near', fn: ridge(282, [[8, 0.003, 0.5], [4, 0.012, 4]]), lines: 16, spacing: 4.2, base: 0.5, dark: 0.1 },
]

// Golden Gate geometry (shared with the inline lamps)
export { BRIDGE }

function area(fn: Ridge) {
  let d = `M0 ${H}L0 ${r(fn(0))}`
  for (let x = 0; x <= W; x += 8) d += `L${x} ${r(fn(x))}`
  return d + `L${W} ${H}Z`
}

function line(fn: Ridge) {
  let d = ''
  for (let x = 0; x <= W; x += 5) d += (x ? 'L' : 'M') + x + ' ' + r(fn(x))
  return d
}

/**
 * The water under the bridge: the site's engraved ocean (sea/ocean.ts), small
 * and far off. It's drawn before the hills, so the far ridge's bluff and the
 * mid hill overlap it (and hide its lower lines).
 */
const STRAIT_OCEAN: Ocean = {
  hz: BRIDGE.water,
  bottom: 268, // about where the mid hill hides it, so the nearest (biggest) lines are the ones in view
  from: 1000,
  to: W + 10,
  cx: (BRIDGE.t1 + BRIDGE.t2) / 2,
  sun: { x: -9999 }, // no sun over the strait
  lines: 18,
  height: 3.2,
  ink: 1,
  scale: 0.35,
}

/** the towers' reflections: broken, wobbling dashes stacked down the water below each tower, fading toward the viewer */
function reflections() {
  const rnd = rng(7)
  let d = ''
  for (const cx of [BRIDGE.t1, BRIDGE.t2]) {
    for (let y = BRIDGE.water + 2; y < BRIDGE.water + 40; y += 2 + (y - BRIDGE.water) * 0.06) {
      const t = (y - BRIDGE.water) / 40
      if (rnd() < t * 0.7) continue
      const half = 7 + t * 4
      const wob = (rnd() - 0.5) * (2 + t * 6)
      // two legs: dashes either side of the centre, sometimes merged into one
      if (rnd() < 0.5) d += `M${r(cx - half + wob)} ${r(y)}h${r(half * 2 * (0.6 + rnd() * 0.4))}`
      else d += `M${r(cx - half + wob)} ${r(y)}h${r(4 + rnd() * 2)}M${r(cx + half - 5 + wob)} ${r(y)}h${r(4 + rnd() * 2)}`
    }
  }
  return d
}

function strait(defs: string[]) {
  const shape = `M1000 ${BRIDGE.water}H${W + 10}V300H1000Z`
  defs.push(`<clipPath id="strait-water"><path d="${shape}"/></clipPath>`)
  // the hand-tinted wash (sea/wash.ts): the bay is the one place the footer takes colour, a pale blue
  // under its ink, fading toward the viewer (the hills, drawn after, cover the rest)
  defs.push(`<linearGradient id="bay-wash" gradientUnits="userSpaceOnUse" x1="0" y1="${BRIDGE.water}" x2="0" y2="${BRIDGE.water + 60}"><stop offset="0" stop-color="${WASH.water}"/><stop offset="1" stop-color="${WASH.water}" stop-opacity=".4"/></linearGradient>`)
  return [
    `<path d="${shape}" fill="${PAPER}" stroke="none"/>`,
    `<path d="${shape}" fill="url(#bay-wash)" stroke="none"/>`,
    `<g clip-path="url(#strait-water)">`,
    `<g opacity=".85">${oceanSvg(STRAIT_OCEAN, 0)}</g>`,
    `<path d="${reflections()}" stroke-width="1.3" opacity=".75"/>`,
    `</g>`,
    `<path d="M1000 ${BRIDGE.water}H${W + 10}" stroke-width=".9"/>`,
  ].join('')
}

export function renderStaticScene(): string {
  const rnd = rng(11)
  const out: string[] = []

  // sky: a faint haze of engraved rules low over the hills (a clear day: the upper sky stays open)
  for (let i = 0; i < 12; i++) {
    const y = 140 + i * 6
    let x = rnd() * 40, d = ''
    while (x < W) {
      const len = 40 + rnd() * 160
      d += `M${Math.round(x)} ${y}h${Math.round(len)}`
      x += len + 6 + rnd() * 40
    }
    out.push(`<path d="${d}" stroke-width=".5" opacity="${r(((i + 1) / 12) ** 2 * 0.28 * 100) / 100}"/>`)
  }

  // a faint warm haze low on the horizon behind the bridge, under its ink (the wash, see sea/wash.ts)
  const hx = (BRIDGE.t1 + BRIDGE.t2) / 2
  out.push(
    `<defs><radialGradient id="haze-wash"><stop offset="0" stop-color="${WASH.sky}" stop-opacity=".7"/><stop offset="1" stop-color="${WASH.sky}" stop-opacity="0"/></radialGradient></defs>`,
    `<ellipse cx="${hx}" cy="${BRIDGE.water}" rx="420" ry="34" fill="url(#haze-wash)" stroke="none"/>`,
  )

  // bridge (see bridge.ts). The old water rules drew from the shared rng; keep
  // consuming those values so the hills' hatching below stays exactly as it was.
  out.push(renderBridge(INK, PAPER))
  for (let i = 0; i < 20; i++) rnd()

  // hills: contour hatching, weight driven by slope (light from the left).
  // Segments are bucketed by stroke width so each hill is a handful of paths.
  const defs: string[] = []
  out.push(strait(defs))
  for (const h of HILLS) {
    defs.push(`<clipPath id="${h.id}"><path d="${area(h.fn)}"/></clipPath>`)
    const buckets = new Map<number, string>()
    for (let i = 0; i < h.lines; i++) {
      let x = rnd() * 10
      while (x < W) {
        const len = 8 + rnd() * 26
        const shade = Math.min(1, Math.max(0, slope(h.fn, x + len / 2) * 6 + 0.25 + (i / h.lines) * h.dark))
        const w = Math.round(h.base * (0.25 + shade * 1.2) * 5) / 5 // bucket to 0.2 steps
        if (w > 0.2) {
          const seg = `M${Math.round(x)} ${r(h.fn(x) + i * h.spacing)}L${Math.round(x + len)} ${r(h.fn(x + len) + i * h.spacing)}`
          buckets.set(w, (buckets.get(w) ?? '') + seg)
        }
        x += len + 1.5 + rnd() * 3
      }
    }
    out.push(`<path d="${area(h.fn)}" fill="${PAPER}" stroke="none"/>`)
    out.push(`<g clip-path="url(#${h.id})" opacity=".8">`)
    for (const [w, d] of buckets) out.push(`<path d="${d}" stroke-width="${w}"/>`)
    out.push(`</g>`, `<path d="${line(h.fn)}" stroke-width="${r(h.base * 1.6)}"/>`)
  }

  // foreground stipple (zero-length round-capped strokes = dots)
  const dots = new Map<number, string>()
  // (light: dense dark dots read as soot)
  for (let i = 0; i < 520; i++) {
    const y = 286 + rnd() ** 0.7 * 56
    const x = rnd() * W
    const w = Math.round((0.5 + rnd() * 0.8 * ((y - 280) / 60)) * 2) / 2
    dots.set(w, (dots.get(w) ?? '') + `M${Math.round(x)} ${Math.round(y)}h0`)
  }
  for (const [w, d] of dots) out.push(`<path d="${d}" stroke-width="${w}" opacity=".45"/>`)

  return compactPaths(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs.join('')}</defs><g fill="none" stroke="${INK}" stroke-linecap="round">${out.join('')}</g></svg>`)
}

/* ---------- animated layers (rendered inline by footer.tsx) ---------- */

export interface Tuft { x: number; y: number; d: string; width: number; delay: number; flower?: { cx: number; cy: number; r: number; kind: 'daisy' | 'poppy' } }

/**
 * Foreground grass: soft, curving tufts (a few blades each, finer than they
 * used to be: dense black spikes read as thistles on waste ground), with
 * wildflowers on taller stems here and there: daisies (open circles with a
 * dot) and California poppies (little cups).
 */
export function grassTufts(): Tuft[] {
  const rnd = rng(23)
  const tufts: Tuft[] = []
  for (let i = 0; i < 230; i++) {
    const y = 300 + rnd() ** 0.6 * 42
    const x = rnd() * W
    const k = (y - 292) / 50
    const n = 2 + Math.floor(rnd() * 4 * k + 1)
    let d = ''
    for (let b = 0; b < n; b++) {
      const lean = (rnd() - 0.5) * 18 * k
      const h = (4 + rnd() * 16) * k
      // blades curve over at the tip
      d += `M${r(x)} ${r(y)}q${r(lean * 0.15)} ${r(-h * 0.7)} ${r(lean)} ${r(-h)}`
    }
    const tuft: Tuft = { x: r(x), y: r(y), d, width: r(0.35 + k * 0.55), delay: r(-(x / W) * 4.5) }
    if (rnd() < 0.2) {
      // a flower on a taller, gently curving stem
      const h = (12 + rnd() * 14) * k, lean = (rnd() - 0.5) * 8 * k
      tuft.d += `M${r(x)} ${r(y)}q${r(lean * 0.2)} ${r(-h * 0.6)} ${r(lean)} ${r(-h)}`
      tuft.flower = { cx: r(x + lean), cy: r(y - h), r: r(1.2 + k * 1.6), kind: rnd() < 0.55 ? 'daisy' : 'poppy' }
    }
    tufts.push(tuft)
  }
  return tufts
}

/* ---------- the bay (rendered inline by footer.tsx so the boats can drift) ---------- */

/** small sailboats on the bay: hull, mast, mainsail + jib (one sail hatched, for shade) */
export const BOATS = [
  { x: 1290, y: 236, s: 1, delay: 0 },
  { x: 1520, y: 233, s: 0.75, delay: -31 },
]

export function sailboat(x: number, y: number, s: number) {
  const hull = `M${r(x - 9 * s)} ${r(y - 2 * s)}L${r(x + 9 * s)} ${r(y - 2 * s)}L${r(x + 6 * s)} ${r(y + 0.6 * s)}L${r(x - 6.5 * s)} ${r(y + 0.6 * s)}Z`
  const mast = `M${r(x - 1 * s)} ${r(y - 2 * s)}V${r(y - 21 * s)}`
  const main = `M${r(x - 1.6 * s)} ${r(y - 20 * s)}L${r(x - 1.6 * s)} ${r(y - 3.4 * s)}L${r(x - 9.5 * s)} ${r(y - 3.4 * s)}Z`
  const jib = `M${r(x - 0.2 * s)} ${r(y - 18 * s)}L${r(x + 7.5 * s)} ${r(y - 3.4 * s)}L${r(x - 0.2 * s)} ${r(y - 3.4 * s)}Z`
  let shade = ''
  for (let yy = y - 16 * s; yy < y - 4 * s; yy += 1.8 * s) {
    const t = (yy - (y - 18 * s)) / (14.6 * s)
    shade += `M${r(x + 0.6 * s)} ${r(yy)}H${r(x - 0.2 * s + 7.7 * s * t - 0.6 * s)}`
  }
  return { hull, mast, main, jib, shade }
}
