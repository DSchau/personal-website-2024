/**
 * /work scene: a topographic map with a trail climbing it.
 *
 * Contours are traced (marching squares) from a smooth height field: a main
 * peak, a smaller peak and saddle, foothills. They're "illuminated" contours
 * (the Tanaka method): each line is thinner where its slope faces the light
 * and heavier where it faces away, which gives the flat map relief, the same
 * light-from-the-left as the footer's hills. Every fifth contour is a heavier
 * index line, as on a survey map.
 *
 * A dashed trail winds up from the lower left with a waypoint per chapter of
 * the career, and stops short of the summit: still climbing.
 *
 * Seeded/deterministic, rendered to SVG markup at build time; CSS
 * (trail.module.css) draws the trail.
 */
import { r } from '@/components/sea/scene'

/** compact number for path data: one decimal, no leading zero (0.8 → .8, -0.8 → -.8) */
const num = (n: number) => String(r(n)).replace(/^(-?)0\./, '$1.')

export const VIEW = { x: 0, y: 20, w: 1600, h: 250 }

/* ---------- terrain ---------- */

const G = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) =>
  Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2))

export const SUMMIT = { x: 1190, y: 112 }

const height = (x: number, y: number) =>
  1.0 * G(x, y, SUMMIT.x, SUMMIT.y, 250, 105) +
  0.5 * G(x, y, 560, 150, 210, 95) +
  0.32 * G(x, y, 880, 190, 260, 90) +
  0.22 * G(x, y, 200, 230, 260, 110) +
  0.18 * G(x, y, 1500, 210, 200, 120) +
  // a little ridge-and-gully texture, so the contours wander like real ground
  0.02 * Math.sin(x / 41 + y / 29) + 0.015 * Math.sin(x / 67 - y / 23 + 1.3) + 0.01 * Math.sin(x / 19 + 2.1)

/* ---------- contours (marching squares) ---------- */

const CELL = 6
const X0 = -20, X1 = VIEW.w + 20, Y0 = VIEW.y - 20, Y1 = VIEW.y + VIEW.h + 20

/** trace every contour at `level` into polylines */
function contour(level: number): [number, number][][] {
  const nx = Math.ceil((X1 - X0) / CELL), ny = Math.ceil((Y1 - Y0) / CELL)
  const v: number[][] = []
  for (let j = 0; j <= ny; j++) {
    v[j] = []
    for (let i = 0; i <= nx; i++) v[j][i] = height(X0 + i * CELL, Y0 + j * CELL) - level
  }
  // point on an edge, keyed so neighbouring cells share it
  const pt = (i0: number, j0: number, i1: number, j1: number): [string, [number, number]] => {
    const a = v[j0][i0], b = v[j1][i1], t = a / (a - b)
    const x = X0 + (i0 + (i1 - i0) * t) * CELL, y = Y0 + (j0 + (j1 - j0) * t) * CELL
    return [`${Math.min(i0, i1)},${Math.min(j0, j1)},${i0 === i1 ? 'v' : 'h'}`, [x, y]]
  }
  const links = new Map<string, string[]>()
  const pos = new Map<string, [number, number]>()
  const link = (a: [string, [number, number]], b: [string, [number, number]]) => {
    pos.set(a[0], a[1]); pos.set(b[0], b[1])
    links.set(a[0], [...(links.get(a[0]) ?? []), b[0]])
    links.set(b[0], [...(links.get(b[0]) ?? []), a[0]])
  }
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = (v[j][i] > 0 ? 8 : 0) | (v[j][i + 1] > 0 ? 4 : 0) | (v[j + 1][i + 1] > 0 ? 2 : 0) | (v[j + 1][i] > 0 ? 1 : 0)
      if (c === 0 || c === 15) continue
      const T = () => pt(i, j, i + 1, j), R = () => pt(i + 1, j, i + 1, j + 1)
      const B = () => pt(i, j + 1, i + 1, j + 1), L = () => pt(i, j, i, j + 1)
      switch (c) {
        case 1: case 14: link(L(), B()); break
        case 2: case 13: link(B(), R()); break
        case 3: case 12: link(L(), R()); break
        case 4: case 11: link(T(), R()); break
        case 6: case 9: link(T(), B()); break
        case 7: case 8: link(L(), T()); break
        case 5: link(L(), T()); link(B(), R()); break
        case 10: link(L(), B()); link(T(), R()); break
      }
    }
  }
  // walk the links into polylines
  const seen = new Set<string>()
  const lines: [number, number][][] = []
  const walk = (start: string) => {
    const line = [pos.get(start)!]
    seen.add(start)
    let cur = start
    while (true) {
      const next = (links.get(cur) ?? []).find(n => !seen.has(n))
      if (!next) break
      seen.add(next)
      line.push(pos.get(next)!)
      cur = next
    }
    return line
  }
  // open lines first (start at an end), then closed loops
  for (const [k, ns] of links) if (ns.length === 1 && !seen.has(k)) lines.push(walk(k))
  for (const k of links.keys()) if (!seen.has(k)) { const l = walk(k); l.push(l[0]); lines.push(l) }
  return lines.filter(l => l.length > 6)
}

/** Chaikin smoothing: round off the marching-squares corners */
function smooth(line: [number, number][], passes = 2) {
  let pts = line
  for (let p = 0; p < passes; p++) {
    const out: [number, number][] = [pts[0]]
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1]
      out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75])
    }
    out.push(pts[pts.length - 1])
    pts = out
  }
  return pts
}

/** drop points closer than `min` to the last kept one (keeps the markup small) */
function thin(line: [number, number][], min = 3.5) {
  const out = [line[0]]
  for (const p of line) {
    const q = out[out.length - 1]
    if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= min) out.push(p)
  }
  out.push(line[line.length - 1])
  return out
}

// light from the upper left (as in the footer); a contour faces away from it where the ground falls toward the lower right
const LIGHT = (() => { const a = (-135 * Math.PI) / 180; return [Math.cos(a), Math.sin(a)] })()

export interface Contours { buckets: { w: number; d: string }[] }

export function contours(): Contours {
  const LEVELS = 22, lo = 0.06, hi = 0.98
  const buckets = new Map<number, string>()
  for (let n = 0; n < LEVELS; n++) {
    const level = lo + ((hi - lo) * n) / (LEVELS - 1)
    const index = n % 5 === 0
    for (const raw of contour(level)) {
      const line = thin(smooth(raw))
      // split each line into runs of equal (bucketed) weight
      let run = '', runW = -1, last: [number, number] = [0, 0]
      for (let i = 1; i < line.length; i++) {
        const [ax, ay] = line[i - 1], [bx, by] = line[i]
        // downhill direction here ≈ −gradient
        const mx = (ax + bx) / 2, my = (ay + by) / 2
        const gx = height(mx + 1, my) - height(mx - 1, my), gy = height(mx, my + 1) - height(mx, my - 1)
        const len = Math.hypot(gx, gy) || 1
        const facing = -(gx / len) * LIGHT[0] - (gy / len) * LIGHT[1] // 1 = slope faces the light
        const shade = (1 - facing) / 2 // 0 lit … 1 in shadow
        const base = index ? 0.9 : 0.45
        const w = Math.round(base * (0.35 + shade * 1.3) * 10) / 10
        if (w !== runW) {
          if (run) buckets.set(runW, (buckets.get(runW) ?? '') + run)
          run = `M${r(ax)} ${r(ay)}l`
          last = [r(ax), r(ay)]
          runW = w
        } else run += ' '
        // relative steps keep the many contour paths small
        run += `${num(r(bx) - last[0])} ${num(r(by) - last[1])}`
        last = [r(bx), r(by)]
      }
      if (run) buckets.set(runW, (buckets.get(runW) ?? '') + run)
    }
  }
  return { buckets: [...buckets].map(([w, d]) => ({ w, d })).filter(b => b.w >= 0.2) }
}

/* ---------- the trail ---------- */

// hand-placed route: up the foothills, over the small peak's shoulder, through the saddle, switchbacks up the main peak
const ROUTE: [number, number][] = [
  [30, 262], [150, 244], [260, 238], [350, 214], [430, 196], [500, 186], [590, 180],
  [680, 192], [780, 196], [870, 186], [960, 176], [1040, 166], [1080, 154],
  [1030, 145], [1060, 134], [1120, 128], [1150, 122],
]

/** career chapters, in order, as fractions along the trail */
export const WAYPOINTS = [
  { name: 'Union Pacific', at: 0.06 },
  { name: 'Object Partners', at: 0.22 },
  { name: 'Gatsby', at: 0.47 },
  { name: 'Netlify', at: 0.62 },
  { name: 'Postman', at: 0.8 },
  { name: 'Adapt', at: 1 },
]

/** Catmull-Rom through the route, then resampled evenly so fractions are along true length */
export function trail() {
  const dense: [number, number][] = []
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const p0 = ROUTE[Math.max(0, i - 1)], p1 = ROUTE[i], p2 = ROUTE[i + 1], p3 = ROUTE[Math.min(ROUTE.length - 1, i + 2)]
    for (let s = 0; s < 1; s += 0.05) {
      const s2 = s * s, s3 = s2 * s
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s2 + (-a + 3 * b - 3 * c + d) * s3)
      dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  dense.push(ROUTE[ROUTE.length - 1])
  // cumulative length, to place waypoints by true distance
  const acc = [0]
  for (let i = 1; i < dense.length; i++) acc.push(acc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]))
  const total = acc[acc.length - 1]
  const at = (f: number): [number, number] => {
    const target = f * total
    let i = acc.findIndex(a => a >= target)
    if (i <= 0) return dense[0]
    const t = (target - acc[i - 1]) / (acc[i] - acc[i - 1])
    return [dense[i - 1][0] + (dense[i][0] - dense[i - 1][0]) * t, dense[i - 1][1] + (dense[i][1] - dense[i - 1][1]) * t]
  }
  let d = ''
  for (const [x, y] of thin(dense, 3)) d += (d ? 'L' : 'M') + r(x) + ' ' + r(y)
  return {
    d,
    waypoints: WAYPOINTS.map(w => { const [x, y] = at(w.at); return { ...w, x: r(x), y: r(y) } }),
  }
}
