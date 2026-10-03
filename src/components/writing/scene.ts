/**
 * /posts scene: writing that turns into the sea.
 *
 * Every row is a trochoid, the curve traced by a point on a rolling wheel:
 *
 *   x = Rθ − d·sin θ      y = baseline − d·cos θ
 *
 * When d > R it loops, which reads as cursive handwriting ("ellell"); at d = R
 * the loops shrink to cusps; when d < R it's the classic trochoidal water wave,
 * with sharp crests and broad troughs. So the top rows are lines of "text" and,
 * row by row, the same curve eases into the homepage's sea: the letters
 * stretch, the gaps between words close, and the rows pick up swell.
 *
 * Seeded/deterministic, rendered to SVG markup at build time; CSS
 * (writing.module.css) writes the top line and drifts the waves.
 */
import { r } from '@/components/sea/scene'
import { WATER_INK } from '@/components/sea/wash'

const rng = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647

export const VIEW = { x: 0, y: 20, w: 1600, h: 250 }

// rows run wider than the view so the waves can drift without showing an end
const FROM = -80
const TO = 1680
const ROWS = 10
const TOP = 46
const BOTTOM = 252

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** compact number for path data: one decimal, no leading zero (0.8 → .8, -0.8 → -.8) */
const num = (n: number) => String(r(n)).replace(/^(-?)0\./, '$1.')
const smooth = (a: number, b: number, t: number) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u) }

export interface Row { d: string; hatch: string; width: number; wl: number; writing: boolean; base: number; ink: string }

const INK = '#161616'

/** mix two #rrggbb colours */
const mix = (a: string, b: string, t: number) => {
  const c = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16)
  return '#' + [0, 1, 2].map(i => Math.round(lerp(c(a, i), c(b, i), t)).toString(16).padStart(2, '0')).join('')
}

function row(k: number, rnd: () => number): Row {
  const t = k / (ROWS - 1)
  const base = TOP + (BOTTOM - TOP) * t ** 1.25
  // how far along from handwriting (0) to sea (1)
  const sea = smooth(0.22, 0.85, t)

  // wheel radius: a letter's width at the top, a swell's wavelength at the bottom (geometric ease)
  const R0 = 7 / (2 * Math.PI), R1 = (70 + t * 200) / (2 * Math.PI)
  const R = R0 * (R1 / R0) ** sea
  // loopiness: d/R ≈ 1.9 for cursive loops, ≈ 0.22 for a calm trochoidal sea.
  // Eased so the in-between cusp stage (scallops) passes quickly.
  const ratio = lerp(1.9, 0.22, smooth(0, 1, sea) ** 0.8)
  // words: letters per word, and the pen-up gap between words, which closes as it becomes sea
  const gapChance = 1 - smooth(0.3, 0.6, t)

  // Handwriting character, all fading out as it becomes sea (and all smooth, so
  // the line never jumps): letter heights wobble with frequent tall ascender
  // loops, letter widths vary, and the whole hand leans forward.
  const p1 = rnd() * 9, p2 = rnd() * 9, p3 = rnd() * 9
  const hand = 1 - sea
  const height = (th: number) =>
    1 + hand * (0.18 * Math.sin(th * 0.41 + p1) + 1.1 * Math.max(0, Math.sin(th * 0.33 + p2)) ** 8 - 0.12)
  const width = (th: number) => 1 + hand * 0.3 * Math.sin(th * 0.27 + p3)
  const slant = 0.32 * hand

  // text rows only need to span the view; wave rows run wider so they can drift
  const [from, to] = sea < 0.5 ? [-10, VIEW.w + 10] : [FROM, TO]
  const step = sea < 0.5 ? 0.68 : 0.4 // radians per sample
  let d = '', cx = from + rnd() * 16, theta = 0, pen = false, letter = 0
  let wordEnd = 3 + Math.floor(rnd() * 6)
  const pts: [number, number][] = []
  let last: [number, number] = [0, 0]

  while (true) {
    const a = ratio * R * height(theta)
    const lift = a * Math.cos(theta)
    const x = cx - a * Math.sin(theta) + slant * lift
    if (x > to) break
    const y = base - lift
    // relative steps keep the (long) handwriting paths small
    const rx = r(x), ry = r(y)
    // (after the first `l`, further pairs can omit the command letter)
    d += pen ? `${d.endsWith(`M${last[0]} ${last[1]}`) ? 'l' : ' '}${num(rx - last[0])} ${num(ry - last[1])}` : `M${rx} ${ry}`
    last = [rx, ry]
    pts.push([x, y])
    pen = true
    cx += R * width(theta) * step
    theta += step

    // between words (at the bottom of a stroke), lift the pen and skip a space
    const n = Math.floor(theta / (Math.PI * 2) + 0.5)
    if (n !== letter) {
      letter = n
      if (letter >= wordEnd) {
        wordEnd = letter + 2 + Math.floor(rnd() * 7)
        if (rnd() < gapChance) { cx += (6 + rnd() * 9) * (1 + sea * 3); pen = false }
      }
    }
  }

  // once it's sea, engrave the front (right-facing) face under each crest, like the homepage
  let hatch = ''
  if (sea > 0.6) {
    const depth = Math.round(2 + sea * 3)
    for (let i = 1; i <= depth; i++) {
      let seg = ''
      for (let j = 1; j < pts.length; j++) {
        const [x, y] = pts[j], [px, py] = pts[j - 1]
        const down = (y - py) / Math.max(0.01, x - px) // + = descending to the right (the shaded face)
        const keep = down > 0.06 && rnd() > 0.15 + i * 0.1
        if (keep) seg += (seg.endsWith(`${r(px)} ${r(py + i * 2.4)}`) ? '' : `M${r(px)} ${r(py + i * 2.4)}`) + `L${r(x)} ${r(y + i * 2.4)}`
      }
      hatch += seg
    }
  }

  return { d, hatch, width: r(lerp(0.55, 1.1, t ** 1.2) * 100) / 100, wl: r(2 * Math.PI * R), writing: sea < 0.5, base: r(base),
    // as the writing becomes sea, its ink turns the homepage water's indigo (sea/wash.ts)
    ink: mix(INK, WATER_INK, smooth(0.15, 0.7, sea)) }
}

export function writingScene(): Row[] {
  const rnd = rng(23)
  return Array.from({ length: ROWS }, (_, k) => row(k, rnd))
}
