/**
 * An engraved ocean, the way banknote and woodcut engravers draw one: not wave
 * outlines but a consistent field of near-horizontal lines whose weight and
 * breaks describe the water. Lines swell and bunch on the faces turned toward
 * you, break into white at the crests, and nearer crests hide the water behind
 * them.
 *
 * Under the hood:
 * - a height field: a few swells at different angles and wavelengths, mostly
 *   rolling toward the viewer, plus a little chop;
 * - projected in perspective onto lines receding to the horizon, so waves
 *   shrink and flatten with distance;
 * - drawn nearest-first with a floating-horizon hidden-line pass, so a crest
 *   occludes the lines behind it (real depth, no paper fills);
 * - the bottom few lines thin out and fragment, so the sea ends the way an
 *   engraving vignettes, rather than fading or stopping on a hard edge.
 *
 * Pure and deterministic in `t`: the server renders t = 0 to SVG, and the
 * client (ocean-motion.ts) redraws it on a canvas as t advances.
 */

export interface Ocean {
  /** horizon, and the y the nearest line sits at (just past the bottom of the view) */
  hz: number
  bottom: number
  /** horizontal extent to draw */
  from: number
  to: number
  /** vanishing point x (centre of the view) */
  cx: number
  /** the sun (or moon), for the glitter path down the water */
  sun: { x: number }
  lines: number
  /** world swell height (scene units at the nearest line) */
  height: number
  /** how far the water is lifted on the faces you see (ink weight), at the near lines */
  ink: number
  /** wavelength scale (1 = the full-width seas; smaller for a small, distant patch of water like the footer's strait) */
  scale?: number
}

interface Swell { len: number; dir: number; amp: number; speed: number; phase: number }

// mostly rolling in toward the viewer (90° = straight at you), a couple of cross-swells, and chop
const SWELLS: Swell[] = [
  { len: 190, dir: 84, amp: 1, speed: 0.5, phase: 0 },
  { len: 110, dir: 62, amp: 0.5, speed: 0.62, phase: 1.7 },
  { len: 70, dir: 118, amp: 0.34, speed: 0.8, phase: 4.1 },
  { len: 38, dir: 97, amp: 0.16, speed: 1.15, phase: 2.6 },
].map(s => ({ ...s, dir: (s.dir * Math.PI) / 180 }))

/**
 * How fast the sea moves. Real swell physics (speed ∝ √wavelength) at this
 * scale is restless; scaled right down it's a calm, slow roll (the main swell
 * takes ~16s to pass a point).
 */
const CALM = 0.22

// depth foreshortening: world depth per unit of screen y at the nearest line (a low eye over the water)
const FOCAL = 440

const fract = (n: number) => n - Math.floor(n)
const hash = (n: number) => fract(Math.sin(n * 127.1) * 43758.5453)

export interface Run { w: number; pts: number[] }

interface Line { j: number; u: number; y0: number; amp: number; tail: number; base: number; xs: Float32Array; c: Float32Array[]; sn: Float32Array[]; fade: number[]; g: Float32Array; edge: Float32Array }

/**
 * The ocean, prepared: everything that doesn't change with time (each line's
 * samples, each swell's spatial phase there as cos/sin, the glitter column,
 * the ragged ending) is computed once, so a frame is just multiply-adds.
 */
export class OceanField {
  private lines: Line[] = []
  private ks: (Swell & { kx: number; kz: number; w: number })[]
  private top: Float32Array
  private mine: Float32Array
  private nBins: number
  private static BIN = 2

  constructor(private o: Ocean) {
    const sc = o.scale ?? 1
    this.ks = SWELLS.map(s => ({ ...s, len: s.len * sc })).map(s => ({ ...s, kx: (Math.cos(s.dir) * Math.PI * 2) / s.len, kz: (Math.sin(s.dir) * Math.PI * 2) / s.len, w: CALM * s.speed * Math.PI * 2 * (60 / s.len) ** 0.5 }))
    this.nBins = Math.ceil((o.to - o.from) / OceanField.BIN) + 1
    this.top = new Float32Array(this.nBins)
    this.mine = new Float32Array(this.nBins)
    const span = o.bottom - o.hz
    for (let j = o.lines; j >= 1; j--) {
      // lines spaced so tone deepens gently toward the horizon
      const u = (j / o.lines) ** 1.45
      const Z = FOCAL / u
      const step = Math.max(1.6, Math.min(5, 5 * u))
      const n = Math.floor((o.to - o.from) / step) + 1
      const xs = new Float32Array(n)
      // anti-alias: swells too small to draw at this distance fade out (distant water is fine, smooth streaks)
      const fade = this.ks.map(s => Math.min(1, Math.max(0, (s.len * u - 10) / 40)))
      const c = this.ks.map(() => new Float32Array(n)), sn = this.ks.map(() => new Float32Array(n))
      const g = new Float32Array(n), edge = new Float32Array(n)
      const tail = Math.max(0, (u - 0.8) / 0.2)
      // haze: the farthest lines crowd into the last few px under the horizon and would merge into a solid band, so they thin out (the very farthest drop away)
      const haze = Math.min(1, u / 0.06) ** 0.8
      for (let i = 0; i < n; i++) {
        const x = o.from + i * step
        xs[i] = x
        const X = (x - o.cx) / u
        this.ks.forEach((k, s) => { const ph = k.kx * X + k.kz * Z + k.phase; c[s][i] = Math.cos(ph); sn[s][i] = Math.sin(ph) })
        // the sun's path: a widening column under it
        g[i] = Math.exp(-(((x - o.sun.x) / (16 + 150 * u)) ** 2))
        // the ragged ending, line by line (static in x, so it reads as the engraving's edge, not as moving water)
        edge[i] = 0.5 + 0.5 * Math.sin(x * 0.011 + j * 1.9) * Math.sin(x * 0.027 + j * 3.1)
      }
      this.lines.push({ j, u, y0: o.hz + span * u, amp: o.height * u, tail, base: (0.22 + 0.7 * u ** 0.8) * haze, xs, c, sn, fade, g, edge })
    }
  }

  /** the water's height (≈ -2 … 2) and its y on screen at line nearest `y0`, for floating things on it */
  surface(x: number, lineIndex: number, t: number) {
    const L = this.lines[lineIndex]
    const i = Math.max(0, Math.min(L.xs.length - 1, Math.round((x - L.xs[0]) / (L.xs[1] - L.xs[0]))))
    let h = 0
    this.ks.forEach((k, s) => { const a = k.amp * L.fade[s]; h += a * (L.c[s][i] * Math.cos(k.w * t) + L.sn[s][i] * Math.sin(k.w * t)) })
    const hs = h + 0.18 * h * h
    return { y: L.y0 - L.amp * hs, h: hs }
  }

  /** index of the line closest to screen y `y` */
  lineAt(y: number) {
    let best = 0
    this.lines.forEach((L, i) => { if (Math.abs(L.y0 - y) < Math.abs(this.lines[best].y0 - y)) best = i })
    return best
  }

  /** trace the ocean at time `t` (seconds): `emit` gets polyline runs of constant (bucketed) stroke width, nearest lines first */
  trace(t: number, emit: (run: Run) => void) {
    const { o, ks, top, mine, nBins } = this
    const BIN = OceanField.BIN
    top.fill(Infinity)
    // per-swell rotation for this frame: cos(φ − ωt) = cos φ·cos ωt + sin φ·sin ωt
    const cw = ks.map(k => Math.cos(k.w * t)), sw = ks.map(k => Math.sin(k.w * t))
    const S = ks.length

    for (const L of this.lines) {
      const { j, xs, c, sn, fade, g, edge, amp, base, tail, y0 } = L
      const a = ks.map((k, s) => k.amp * fade[s])
      const dzk = ks.map((k, s) => a[s] * k.kz)
      let run: number[] = []
      let runW = -1
      const flush = () => { if (run.length >= 4) emit({ w: runW, pts: run }); run = [] }
      let prevBin = -1
      mine.fill(Infinity)

      for (let i = 0; i < xs.length; i++) {
        const x = xs[i]
        let h = 0, dz = 0
        for (let s = 0; s < S; s++) {
          if (!a[s]) continue
          const cs = c[s][i] * cw[s] + sn[s][i] * sw[s] // cos(φ − ωt)
          const ss = sn[s][i] * cw[s] - c[s][i] * sw[s] // sin(φ − ωt)
          h += a[s] * cs
          dz -= dzk[s] * ss
        }
        // sharpen crests a touch (real swells are peaked, troughs broad)
        const hs = h + 0.18 * h * h
        const y = y0 - amp * hs
        // ink: faces turned toward the viewer (height rising away from us) go dark; crests + backs go white
        const facing = Math.max(0, Math.min(1, 0.45 + dz * 34))
        const gi = g[i]
        let w = base * (0.25 + facing * 1.55) * o.ink * (1 - gi * 0.6)
        // glitter: under the sun the lines break into shifting glints
        if (gi > 0.2 && fract(hash(j) * 7 + x * 0.07 + Math.sin(t * 0.6 + j + x * 0.05) * 0.35) < gi * 0.5) w = 0
        // crest highlights: the top of a lit crest breaks into paper
        if (facing < 0.1 && hs > 0.9) w = 0
        if (tail > 0) {
          if (edge[i] < tail * 0.95) w = 0
          w *= 1 - tail * 0.55
        }
        w = Math.round(w * 10) / 10

        // hidden lines: only ink what sits above everything nearer
        const b = Math.round((x - o.from) / BIN)
        const visible = y < top[b] - 0.35
        const b0 = prevBin < 0 ? b : prevBin
        for (let k = Math.min(b0, b); k <= Math.max(b0, b); k++) if (k >= 0 && k < nBins && y < mine[k]) mine[k] = y
        prevBin = b

        if (!visible || w < 0.15) { flush(); runW = -1; continue }
        if (w !== runW) {
          // join runs of different weight so the line stays continuous
          const lx = run.length ? run[run.length - 2] : NaN, ly = run.length ? run[run.length - 1] : NaN
          flush()
          if (!Number.isNaN(lx)) run.push(lx, ly)
          runW = w
        }
        run.push(Math.round(x * 10) / 10, Math.round(y * 10) / 10)
      }
      flush()
      for (let k = 0; k < nBins; k++) if (mine[k] < top[k]) top[k] = mine[k]
    }
  }
}

/** the ocean at time `t`, as SVG paths (one per stroke width) */
export function oceanSvg(o: Ocean, t = 0) {
  const buckets = new Map<number, string>()
  new OceanField(o).trace(t, ({ w, pts }) => {
    let d = `M${pts[0]} ${pts[1]}`
    for (let i = 2; i < pts.length; i += 2) d += `L${pts[i]} ${pts[i + 1]}`
    buckets.set(w, (buckets.get(w) ?? '') + d)
  })
  return [...buckets].map(([w, d]) => `<path d="${d}" stroke-width="${w}"/>`).join('')
}

/** what a [data-ocean] element tells ocean-motion.ts: the ocean, the viewBox it's drawn in, and how that's fitted (preserveAspectRatio) */
export interface OceanConfig {
  ocean: Ocean
  box: { x: number; y: number; w: number; h: number }
  align: string
  /** the lines' ink (default: the site's black; the homepage inks its water indigo, see wash.ts) */
  color?: string
}

/** the part of the sea drawing shown under the header + on the 404 (matches the other pages' illustrations) */
export const SEA_BOX = { x: 0, y: 100, w: 1600, h: 250 }

/** the homepage + 404 sea (sky, sun + horizon come from scene.ts's SEA) */
export const HOME_OCEAN: Ocean = {
  hz: 196,
  bottom: 356,
  from: -20,
  to: 1620,
  cx: 800,
  sun: { x: 1120 },
  lines: 56,
  height: 6.5,
  ink: 1,
}

/** the 404's bottle floats dead centre, on the line nearest this y */
export const BOTTLE_AT = { x: 800, y: 286 }
