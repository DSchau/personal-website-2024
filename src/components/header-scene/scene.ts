/**
 * Homepage header scene: a calm engraved sea that borrows the footer's hand
 * (src/components/footer/scene.ts) — faint sky rules, a hatched sun sitting on
 * the horizon, and rows of waves engraved like the footer hills: contour
 * hatching that follows each wave, weighted by slope.
 *
 * Everything is seeded/deterministic and rendered to SVG markup at build time;
 * CSS (header-scene.module.css) handles the (very slow) motion.
 */

export const VIEW = { x: 0, y: 80, w: 1600, h: 192 }
export const PAPER = '#fefefe'

const rng = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647
const r = (n: number) => Math.round(n * 10) / 10

type Ridge = (x: number) => number
const slope = (fn: Ridge, x: number) => (fn(x + 2) - fn(x - 2)) / 4
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

// bands are wider than the view so they can drift without exposing an edge
const FROM = -120
const TO = 1720
const FLOOR = VIEW.y + VIEW.h + 10

export const HZ = 168
export const SUN = { x: 1300, y: HZ, r: 34 }

/** distance-from-sun-column factor (1 = right under the sun), for the reflection */
const glow = (x: number, y: number) => {
  const spread = 14 + (y - HZ) * 0.9
  const u = (x - SUN.x) / spread
  return Math.exp(-u * u)
}

/*
 * Rows of waves, receding to the horizon. Each row is a Stokes-like wave
 * (cos θ + k·cos 2θ): peaked crests, broad flat troughs — the shape that reads
 * as "water" at a glance. Wavelength, height, hatch depth and weight all grow
 * toward the viewer, and a slow amplitude envelope groups the crests into sets.
 */
interface Row { id: string; fn: Ridge; y: number; wl: number; amp: number; lines: number; spacing: number; base: number; dark: number }

const ROWS: Row[] = Array.from({ length: 6 }, (_, k) => {
  const t = k / 5
  const y = HZ + 7 + (248 - HZ - 7) * t ** 1.5
  const wl = 70 + t * 230
  const amp = 0.7 + t * 5.2
  const phase = k * 2.1
  const fn: Ridge = (x) => {
    const th = (x / wl) * Math.PI * 2 + phase
    const env = 0.7 + 0.3 * Math.sin(x * 0.0021 + k * 1.7)
    // a faint cross-swell at an unrelated wavelength so no two crests are quite alike
    const cross = 0.22 * Math.cos((x / (wl * 0.61)) * Math.PI * 2 + k * 0.9)
    return y - amp * env * (Math.cos(th) + 0.38 * Math.cos(2 * th) + cross)
  }
  return { id: `hs-${k}`, fn, y, wl, amp, lines: 2 + Math.round(t * 5), spacing: 1.8 + t * 1.7, base: 0.3 + t * 0.35, dark: 0.22 }
})

function area(fn: Ridge, step = 8) {
  let d = `M${FROM} ${FLOOR}L${FROM} ${r(fn(FROM))}`
  for (let x = FROM; x <= TO; x += step) d += `L${Math.round(x)} ${r(fn(x))}`
  return d + `L${TO} ${FLOOR}Z`
}

/** footer sky: faint engraved rules, darkening toward the horizon */
function sky(rnd: () => number) {
  let out = ''
  const rows = 9
  for (let i = 0; i < rows; i++) {
    const y = HZ - 4 - (rows - 1 - i) * 5
    let x = rnd() * 40, d = ''
    while (x < VIEW.w) {
      const len = 40 + rnd() * 160
      d += `M${Math.round(x)} ${y}h${Math.round(len)}`
      x += len + 4 + rnd() * 30
    }
    out += `<path d="${d}" stroke-width=".5" opacity="${r(((i + 1) / rows) ** 2 * 0.3 * 100) / 100}"/>`
  }
  return out
}

/** hatched sun: horizontal rules clipped to a disc, heavier toward the bottom (lower half sits behind the sea) */
function sun() {
  const { x: cx, y: cy, r: rad } = SUN
  const gap = 2.8
  let out = `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${PAPER}" stroke-width="1"/>`
  for (let y = cy - rad + gap / 2; y <= cy + rad; y += gap) {
    const half = Math.sqrt(Math.max(0, rad * rad - (y - cy) ** 2))
    const w = (0.35 + ((y - (cy - rad)) / (2 * rad)) * 1.1).toFixed(2)
    out += `<path d="M${r(cx - half)} ${r(y)}H${r(cx + half)}" stroke-width="${w}"/>`
  }
  return out
}

/** sun rays as two alternating rings (long/short) so they can twinkle + turn */
function rays(count = 32, long = 30, short = 14) {
  const { x: cx, y: cy } = SUN
  const inner = SUN.r + 7
  let a = '', b = ''
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2
    const len = i % 2 ? short : long
    const d = `M${r(cx + Math.cos(ang) * inner)} ${r(cy + Math.sin(ang) * inner)}L${r(cx + Math.cos(ang) * (inner + len))} ${r(cy + Math.sin(ang) * (inner + len))}`
    if (i % 2) b += d; else a += d
  }
  return { a, b }
}

/** sun glitter on the water: short strokes in a widening column under the sun */
function glitter(rnd: () => number, bottom = 236, rows = 7) {
  const out: { d: string; delay: number }[] = []
  for (let i = 0; i < rows; i++) {
    const t = i / (rows - 1)
    const y = HZ + 3 + (bottom - HZ - 4) * t ** 1.2
    const spread = 16 + t * 50
    let d = ''
    const n = 2 + Math.floor(rnd() * 2 + t * 2)
    for (let k = 0; k < n; k++) {
      const x = SUN.x + (rnd() - 0.5) * 2 * spread
      const len = 3 + rnd() * (6 + t * 10)
      d += `M${r(x - len / 2)} ${r(y)}h${r(len)}`
    }
    out.push({ d, delay: Math.round(-rnd() * 3 * 10) / 10 })
  }
  return out
}

/** slope normalised by the row's steepness: ~±1 on the faces, + = front (descending to the right) */
const norm = (row: Row, x: number) => slope(row.fn, x) * row.wl / (2 * Math.PI * row.amp)

/**
 * One row, engraved like a footer hill: white area, contour hatching that
 * follows the wave (weight from slope, light from the left), plus a crest line.
 * Under the sun the strokes get shorter and sparser, which reads as a reflection.
 */
function waveRow(row: Row, rnd: () => number) {
  const step = Math.max(3, row.wl / 14)
  const buckets = new Map<number, string>()
  for (let i = 1; i <= row.lines; i++) {
    let x = FROM + rnd() * 10
    while (x < TO) {
      const g = glow(x, row.fn(x))
      const len = (row.wl * (0.15 + rnd() * 0.3)) * (1 - g * 0.6)
      const mid = x + len / 2
      // shadow sits on the front (right-facing, descending) face, strongest just under the crest
      const face = clamp01(norm(row, mid) * 0.7)
      const high = clamp01((row.y - row.fn(mid)) / row.amp)
      const shade = clamp01(face * (0.55 + high * 0.6) + (i / row.lines) * row.dark)
      const w = Math.round(row.base * (0.25 + shade * 1.6) * (1 - g * 0.5) * 5) / 5
      if (w > 0.32 && rnd() > g * 0.5) {
        let seg = ''
        for (let xx = x; xx < x + len + step / 2; xx += step) {
          const px = Math.min(xx, x + len)
          seg += (seg ? 'L' : 'M') + Math.round(px) + ' ' + r(row.fn(px) + i * row.spacing)
        }
        buckets.set(w, (buckets.get(w) ?? '') + seg)
      }
      x += len + 1.5 + rnd() * 3 + g * 6
    }
  }
  let hatch = ''
  for (const [w, d] of buckets) hatch += `<path d="${d}" stroke-width="${w}"/>`
  // crest line as a swelling engraved stroke: thin on the lit back of each wave, heavy on the shadowed front
  const tops = new Map<number, string>()
  let run = '', runW = -1
  for (let x = FROM; x < TO; x += step) {
    const w = Math.round(row.base * 1.7 * (0.35 + clamp01(0.5 + norm(row, x + step / 2) * 0.6) * 1.05) * 10) / 10
    if (w !== runW) {
      if (run) tops.set(runW, (tops.get(runW) ?? '') + run)
      run = `M${Math.round(x)} ${r(row.fn(x))}`
      runW = w
    }
    run += `L${Math.round(x + step)} ${r(row.fn(x + step))}`
  }
  if (run) tops.set(runW, (tops.get(runW) ?? '') + run)
  let top = ''
  for (const [w, d] of tops) top += `<path d="${d}" stroke-width="${w}"/>`
  return {
    clip: `<clipPath id="${row.id}"><path d="${area(row.fn, step)}"/></clipPath>`,
    html: `<path d="${area(row.fn, step)}" fill="${PAPER}" stroke="none"/><g clip-path="url(#${row.id})">${hatch}</g>${top}`,
  }
}

export interface SceneParts {
  defs: string
  sky: string
  sun: string
  raysA: string
  raysB: string
  glint: { d: string; delay: number }[]
  horizon: string
  rows: { html: string; wl: number }[]
}

export function swellScene(): SceneParts {
  const rnd = rng(11)
  const ray = rays()
  const rows = ROWS.map(row => ({ ...waveRow(row, rnd), wl: row.wl }))
  return {
    defs: rows.map(b => b.clip).join(''),
    sky: sky(rnd),
    sun: sun(),
    raysA: ray.a,
    raysB: ray.b,
    glint: glitter(rnd),
    horizon: `M${FROM} ${HZ}H${TO}`,
    rows: rows.map(({ html, wl }) => ({ html, wl: r(wl) })),
  }
}

/**
 * A loose flock (from the mocks): the footer's "m"-shaped birds, varied in
 * size (depth), spacing and flap speed so it reads as a living group, not a
 * stamp. Each bird is wrapped so the group can fly while the bird bobs + flaps.
 */
function flock(x0: number, y0: number, count: number, seed: number) {
  const rnd = rng(seed)
  let out = ''
  for (let i = 0; i < count; i++) {
    // loose chevron trailing behind the leader
    const row = Math.ceil(i / 2), side = i % 2 ? -1 : 1
    const x = x0 - row * (16 + rnd() * 10)
    const y = y0 + side * row * (5 + rnd() * 4) + (rnd() - 0.5) * 4
    const sc = 0.7 + rnd() * 0.6
    const flap = (0.38 + rnd() * 0.25).toFixed(2)
    const bob = (1.6 + rnd() * 1.4).toFixed(2)
    const w = (4 * sc).toFixed(1)
    out += `<g class="bob" style="animation-duration:${bob}s;animation-delay:${(-rnd() * 2).toFixed(2)}s">` +
      `<path d="M${r(x)} ${r(y)}q${w} -${w} ${(8 * sc).toFixed(1)} 0q${w} -${w} ${(8 * sc).toFixed(1)} 0" stroke-width="${(0.7 + sc * 0.4).toFixed(2)}" style="animation-duration:${flap}s;animation-delay:${(-rnd()).toFixed(2)}s"/></g>`
  }
  return out
}

export const FLOCK_NEAR = flock(0, 130, 7, 21)
export const FLOCK_FAR = flock(0, 116, 3, 5)
