/**
 * Procedurally "engraved" footer landscape: rolling hills, the Golden Gate in
 * the distance, and a field of grass. Everything is seeded so output is
 * deterministic between builds.
 *
 * The heavy, static layers (sky, bridge, hills, stipple) are rendered to a
 * standalone SVG served from /footer-scene.svg so it's cached across pages.
 * The animated layers (fog, birds, family, grass) are rendered inline by
 * footer.tsx so CSS can animate them.
 */

export const W = 1600
export const H = 340
export const INK = '#161616'
export const PAPER = '#fefefe'

import { BRIDGE, renderBridge, withStrait } from './bridge'

const rng = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647

type Ridge = (x: number) => number
const ridge = (base: number, amps: [number, number, number][]): Ridge => (x) =>
  base + amps.reduce((t, [a, f, p]) => t + a * Math.sin(x * f + p), 0)
const slope = (fn: Ridge, x: number) => (fn(x + 2) - fn(x - 2)) / 4
const r = (n: number) => Math.round(n * 10) / 10

const HILLS = [
  // the far ridge opens into the strait under the bridge
  { id: 'far', fn: withStrait(ridge(205, [[20, 0.004, 1], [9, 0.011, 2], [4, 0.03, 0]])), lines: 30, spacing: 3, base: 0.55, dark: 0.5 },
  { id: 'mid', fn: ridge(244, [[15, 0.0035, 3], [8, 0.009, 1], [3, 0.04, 2]]), lines: 24, spacing: 3.6, base: 0.7, dark: 0.4 },
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

export function renderStaticScene(): string {
  const rnd = rng(11)
  const out: string[] = []

  // sky: faint engraved rules near the horizon
  for (let i = 0; i < 26; i++) {
    const y = 60 + i * 6
    let x = 0, d = ''
    while (x < W) {
      const len = 40 + rnd() * 160
      d += `M${Math.round(x)} ${y}h${Math.round(len)}`
      x += len + 4 + rnd() * 30
    }
    out.push(`<path d="${d}" stroke-width=".5" opacity="${r((i / 26) ** 2 * 0.35 * 100) / 100}"/>`)
  }

  // bridge (see bridge.ts). The old water rules drew from the shared rng; keep
  // consuming those values so the hills' hatching below stays exactly as it was.
  out.push(renderBridge(INK, PAPER))
  for (let i = 0; i < 20; i++) rnd()

  // hills: contour hatching, weight driven by slope (light from the left).
  // Segments are bucketed by stroke width so each hill is a handful of paths.
  const defs: string[] = []
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
  for (let i = 0; i < 1400; i++) {
    const y = 286 + rnd() ** 0.7 * 56
    const x = rnd() * W
    const w = Math.round((0.6 + rnd() * 1.4 * ((y - 280) / 60)) * 2) / 2
    dots.set(w, (dots.get(w) ?? '') + `M${Math.round(x)} ${Math.round(y)}h0`)
  }
  for (const [w, d] of dots) out.push(`<path d="${d}" stroke-width="${w}" opacity=".75"/>`)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs.join('')}</defs><g fill="none" stroke="${INK}" stroke-linecap="round">${out.join('')}</g></svg>`
}

/* ---------- animated layers (rendered inline by footer.tsx) ---------- */

export interface Tuft { x: number; y: number; d: string; width: number; delay: number }

export function grassTufts(): Tuft[] {
  const rnd = rng(23)
  const tufts: Tuft[] = []
  for (let i = 0; i < 260; i++) {
    const y = 300 + rnd() ** 0.6 * 42
    const x = rnd() * W
    const k = (y - 292) / 50
    const n = 3 + Math.floor(rnd() * 6 * k + 1)
    let d = ''
    for (let b = 0; b < n; b++) {
      const lean = (rnd() - 0.5) * 16 * k
      const h = (5 + rnd() * 20) * k
      d += `M${r(x)} ${r(y)}q${r(lean / 2)} ${r(-h / 1.6)} ${r(lean)} ${r(-h)}`
    }
    tufts.push({ x: r(x), y: r(y), d, width: r(0.4 + k), delay: r(-(x / W) * 4.5) })
  }
  return tufts
}

export interface Fog { className: 'a' | 'b'; d: string; opacity: number }

export function fogBands(): Fog[] {
  const rnd = rng(5)
  return ([['a', 184, 0.5], ['b', 192, 0.35]] as const).map(([className, y, opacity]) => {
    let d = ''
    for (let i = 0; i < 3; i++) d += `M${Math.round(980 + rnd() * 120)} ${r(y + i * 3.2)}h${Math.round(380 + rnd() * 200)}`
    return { className, d, opacity }
  })
}

export interface Person { x: number; h: number; dress?: boolean; delay: number }

const GROUND = 318
export const FAMILY: Person[] = [
  { x: 300, h: 54, delay: -0.1 },
  { x: 322, h: 33, delay: -0.55 },
  { x: 346, h: 50, dress: true, delay: -0.3 },
  { x: 366, h: 25, dress: true, delay: -0.8 },
]

export function personGeometry({ x, h, dress }: Person) {
  const legs = h * 0.44, body = h * 0.36, head = h * 0.12
  const hip = GROUND - legs, sh = hip - body
  const torso = dress
    ? `M${r(x - head * 0.8)} ${r(sh)}L${r(x + head * 0.8)} ${r(sh)}L${r(x + head * 1.4)} ${r(hip + 2)}L${r(x - head * 1.4)} ${r(hip + 2)}Z`
    : `M${r(x - head * 0.95)} ${r(sh)}L${r(x + head * 0.95)} ${r(sh)}L${r(x + head * 0.75)} ${r(hip)}L${r(x - head * 0.75)} ${r(hip)}Z`
  return { ground: GROUND, hip: r(hip), sh: r(sh), head: r(head), headY: r(sh - head * 1.15), torso, legWidth: r(h * 0.075) }
}

export function handPaths(): string {
  const g = FAMILY.map(p => ({ x: p.x, sh: personGeometry(p).sh }))
  const sags = [18, 14, 12]
  return sags
    .map((sag, i) => {
      const a = g[i], b = g[i + 1]
      return `M${a.x + 5} ${r(a.sh + 9)}Q${(a.x + b.x) / 2} ${r(Math.max(a.sh, b.sh) + sag)} ${b.x - 5} ${r(b.sh + 7)}`
    })
    .join('')
}
