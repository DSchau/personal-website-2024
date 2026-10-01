// Throwaway helpers for /mocks/header. Seeded so output is stable between reloads.

const rng = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647
const r = (n: number) => Math.round(n * 10) / 10

// same far-hill ridge as the footer (src/components/footer/scene.ts)
export const farRidge = (x: number) =>
  205 + 20 * Math.sin(x * 0.004 + 1) + 9 * Math.sin(x * 0.011 + 2) + 4 * Math.sin(x * 0.03)

/** engraved sky rules; `fade` 'down' = darker toward bottom, 'up' = darker toward top */
export function skyRules(width: number, rows: number, gap: number, { seed = 3, fade = 'down', max = 0.4, y0 = 2 } = {}) {
  const rnd = rng(seed)
  let out = ''
  for (let i = 0; i < rows; i++) {
    const t = fade === 'down' ? i / rows : 1 - i / rows
    const y = y0 + i * gap
    let x = rnd() * 40, d = ''
    while (x < width) {
      const len = 30 + rnd() * 140
      d += `M${Math.round(x)} ${y}h${Math.round(len)}`
      x += len + 4 + rnd() * 26
    }
    out += `<path d="${d}" opacity="${(0.04 + t ** 1.6 * max).toFixed(2)}"/>`
  }
  return out
}

/** hatched sun: horizontal lines clipped to a circle, heavier toward the bottom */
export function sun(cx: number, cy: number, rad: number, gap = 3) {
  const lines: string[] = [`<circle cx="${cx}" cy="${cy}" r="${rad}" fill="#fefefe" stroke-width="1"/>`]
  for (let y = cy - rad + gap / 2; y <= cy + rad; y += gap) {
    const half = Math.sqrt(Math.max(0, rad * rad - (y - cy) ** 2))
    const w = (0.35 + ((y - (cy - rad)) / (2 * rad)) * 1.1).toFixed(2)
    lines.push(`<path d="M${r(cx - half)} ${r(y)}H${r(cx + half)}" stroke-width="${w}"/>`)
  }
  return lines.join('')
}

/** single-weight line drawing of the far ridge + Golden Gate (no hatching), offset by dy */
export function lineHorizon(dy = 0, { bridge = true } = {}) {
  let ridge = ''
  for (let x = 0; x <= 1600; x += 5) ridge += (x ? 'L' : 'M') + x + ' ' + r(farRidge(x) + dy)
  if (!bridge) return `<path d="${ridge}" stroke-width="1"/>`

  const t1 = 1150, t2 = 1370, deck = 196 + dy, top = 120 + dy, sag = 50
  const mid = (t1 + t2) / 2, half = (t2 - t1) / 2
  const cable = (x: number) =>
    x < t1 ? top + (deck - 4 - top) * ((t1 - x) / 150) ** 1.4
      : x > t2 ? top + (deck - 4 - top) * ((x - t2) / 150) ** 1.4
        : top + sag * (1 - ((x - mid) / half) ** 2)
  let c = ''
  for (let x = t1 - 150; x <= t2 + 150; x += 3) c += (c ? 'L' : 'M') + x + ' ' + r(cable(x))
  let hangers = ''
  for (let x = t1 - 140; x < t2 + 145; x += 10) if (Math.abs(x - t1) > 6 && Math.abs(x - t2) > 6) hangers += `M${x} ${r(cable(x))}V${deck}`
  let towers = ''
  for (const x of [t1, t2]) {
    towers += `M${x - 4} ${deck + 12}V${top - 2}M${x + 4} ${deck + 12}V${top - 2}`
    for (const y of [top + 4, top + 26, top + 50]) towers += `M${x - 4} ${y}h8`
  }
  return [
    // knock out the ridge behind the bridge deck so it reads in front
    `<path d="${ridge}" stroke-width="1"/>`,
    `<path d="M${t1 - 160} ${deck}H${t2 + 160}" stroke="#fefefe" stroke-width="5"/>`,
    `<path d="M${t1 - 160} ${deck}H${t2 + 160}" stroke-width="1"/>`,
    `<path d="${c}" stroke-width="1"/>`,
    `<path d="${hangers}" stroke-width=".4" opacity=".7"/>`,
    `<path d="${towers}" stroke-width="1.2"/>`,
  ].join('')
}

/** a few short contour hatches under the ridge, light — "engraved" but sparse */
export function ridgeHatch(dy = 0, { lines = 5, spacing = 3.5, seed = 9 } = {}) {
  const rnd = rng(seed)
  let d = ''
  for (let i = 1; i <= lines; i++) {
    let x = rnd() * 20
    while (x < 1600) {
      const len = 6 + rnd() * 22
      // only hatch the shadow side (descending slope), like the footer
      const s = (farRidge(x + len / 2 + 2) - farRidge(x + len / 2 - 2)) / 4
      if (s > -0.02 && rnd() > i / (lines + 2)) {
        d += `M${Math.round(x)} ${r(farRidge(x) + dy + i * spacing)}L${Math.round(x + len)} ${r(farRidge(x + len) + dy + i * spacing)}`
      }
      x += len + 2 + rnd() * 6
    }
  }
  return `<path d="${d}" stroke-width=".6" opacity=".8"/>`
}

export const birds = (pts: [number, number][], delay = -8) =>
  pts.map(([x, y], i) => `<g style="animation-delay:${delay - i * 1.4}s"><path d="M${x} ${y}q4 -4 8 0q4 -4 8 0"/></g>`).join('')

/**
 * Engraved cumulus, built the same way as the sun and sky: horizontal strokes
 * whose extent follows the silhouette. Tops are lit (sparse, hairline), the
 * underside is shaded (dense, heavier). A fine contour traces the top edge.
 * Silhouette = union of a few circles, flattened at the base `cy`.
 */
export function cloud(_id: string, cx: number, cy: number, s = 1, seed = 1) {
  const rnd = rng(seed)
  const w = 150 * s
  const n = 5 + Math.floor(rnd() * 2)
  const bumps: { x: number; y: number; r: number }[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const lift = Math.sin(t * Math.PI) // taller in the middle
    const rad = (11 + lift * 20 + rnd() * 6) * s
    bumps.push({ x: cx - w / 2 + t * w + (rnd() - 0.5) * 8 * s, y: cy - rad * 0.35 - lift * 8 * s, r: rad })
  }
  // one extra high puff, slightly left of center, for an asymmetric crown
  bumps.push({ x: cx - w * 0.12, y: cy - 30 * s, r: 19 * s })

  const top = Math.min(...bumps.map(b => b.y - b.r))
  const left = Math.min(...bumps.map(b => b.x - b.r))
  const right = Math.max(...bumps.map(b => b.x + b.r))

  const spans = (y: number) => {
    const iv = bumps
      .filter(b => Math.abs(y - b.y) < b.r)
      .map(b => { const h = Math.sqrt(b.r * b.r - (y - b.y) ** 2); return [b.x - h, b.x + h] as [number, number] })
      .sort((p, q) => p[0] - q[0])
    const out: [number, number][] = []
    for (const v of iv) {
      const last = out[out.length - 1]
      if (last && v[0] <= last[1]) last[1] = Math.max(last[1], v[1])
      else out.push([...v])
    }
    return out
  }
  const topAt = (x: number) => Math.min(...bumps.filter(b => Math.abs(x - b.x) < b.r).map(b => b.y - Math.sqrt(b.r * b.r - (x - b.x) ** 2)), Infinity)

  // white backing so anything behind (sun rays) is hidden
  let fill = ''
  for (const b of bumps) fill += `M${r(b.x - b.r)} ${r(b.y)}a${r(b.r)} ${r(b.r)} 0 1 0 ${r(2 * b.r)} 0a${r(b.r)} ${r(b.r)} 0 1 0 ${r(-2 * b.r)} 0Z`

  // hatch rows, bucketed by weight
  const buckets = new Map<number, string>()
  const gap = 2.3
  for (let y = top + gap; y <= cy; y += gap) {
    const t = (y - top) / (cy - top) // 0 at the crown, 1 at the base
    const weight = Math.round((0.3 + t ** 1.4 * 1.0) * 10) / 10
    for (const [a0, a1] of spans(y)) {
      let x = a0 + 1.5
      while (x < a1 - 1.5) {
        const len = 4 + rnd() * 16
        const x2 = Math.min(x + len, a1 - 1.5)
        // light comes from the upper left: lit tops + left side get fewer strokes
        const side = (x - left) / (right - left)
        const shade = t * 0.85 + side * 0.25
        if (rnd() < 0.15 + shade) buckets.set(weight, (buckets.get(weight) ?? '') + `M${r(x)} ${r(y)}H${r(x2)}`)
        x = x2 + 1.5 + rnd() * 3.5
      }
    }
  }
  let hatch = ''
  for (const [wt, d] of buckets) hatch += `<path d="${d}" stroke-width="${wt}"/>`

  // contour along the top edge only (base stays soft)
  let edge = ''
  let pen = false
  for (let x = left; x <= right; x += 1.5) {
    const y = topAt(x)
    if (!isFinite(y) || y > cy - 1) { pen = false; continue }
    edge += (pen ? 'L' : 'M') + r(x) + ' ' + r(y)
    pen = true
  }

  // a couple of wispy trailing strokes under the base
  let wisps = ''
  for (let i = 0; i < 3; i++) {
    const y = cy + 3 + i * 2.6
    const x0 = left + 10 * s + rnd() * 30 * s
    wisps += `M${r(x0)} ${r(y)}h${r((right - left) * (0.55 - i * 0.15))}`
  }

  const body = [
    `<path d="${fill}" fill="#fefefe" stroke="none"/>`,
    hatch,
    `<path d="${edge}" stroke-width=".7"/>`,
    `<path d="${wisps}" stroke-width=".5" stroke-dasharray="22 4 8 5" opacity=".7"/>`,
  ].join('')
  return { clip: '', body }
}

/** sun rays as two alternating rings (long/short) so they can twinkle + rotate */
export function rays(cx: number, cy: number, inner: number, count = 24, long = 22, short = 11) {
  let a = '', b = ''
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2
    const len = i % 2 ? short : long
    const d = `M${r(cx + Math.cos(ang) * inner)} ${r(cy + Math.sin(ang) * inner)}L${r(cx + Math.cos(ang) * (inner + len))} ${r(cy + Math.sin(ang) * (inner + len))}`
    if (i % 2) b += d; else a += d
  }
  return { a, b }
}

/** white area under the far ridge (hides anything "behind the hills") */
export function belowRidge(dy = 0) {
  let d = 'M0 400'
  for (let x = 0; x <= 1600; x += 8) d += `L${x} ${r(farRidge(x) + dy)}`
  return d + 'L1600 400Z'
}

/**
 * A loose flock: same "m"-shaped birds as the footer, but varied in size
 * (depth), spacing and flap speed so it reads as a living group, not a stamp.
 * Each bird is wrapped so the group can fly while the bird bobs + flaps.
 */
export function flock(x0: number, y0: number, count = 6, seed = 21) {
  const rnd = rng(seed)
  let out = ''
  for (let i = 0; i < count; i++) {
    // loose chevron trailing up-left behind the leader
    const row = Math.ceil(i / 2), side = i % 2 ? -1 : 1
    const x = x0 - row * (16 + rnd() * 10)
    const y = y0 + side * row * (5 + rnd() * 4) + (rnd() - 0.5) * 4
    const s = 0.7 + rnd() * 0.6
    const flap = (0.38 + rnd() * 0.25).toFixed(2)
    const bob = (1.6 + rnd() * 1.4).toFixed(2)
    const w = (4 * s).toFixed(1), h = (4 * s).toFixed(1)
    out += `<g class="bob" style="animation-duration:${bob}s;animation-delay:${(-rnd() * 2).toFixed(2)}s">` +
      `<path d="M${r(x)} ${r(y)}q${w} -${h} ${(8 * s).toFixed(1)} 0q${w} -${h} ${(8 * s).toFixed(1)} 0" stroke-width="${(0.7 + s * 0.4).toFixed(2)}" style="animation-duration:${flap}s;animation-delay:${(-rnd()).toFixed(2)}s"/></g>`
  }
  return out
}

/**
 * Engraved sea: rows of broken sine strokes below a flat horizon. Rows get
 * further apart, taller and heavier toward the viewer (perspective). Each row
 * is its own path so CSS can swell them sideways in alternating directions.
 */
export function seaRows(horizon: number, bottom: number, rows = 14, seed = 31) {
  const rnd = rng(seed)
  const out: { d: string; w: number; dir: 'a' | 'b'; delay: number }[] = []
  for (let i = 0; i < rows; i++) {
    const t = i / (rows - 1)
    const y = horizon + 2 + (bottom - horizon - 2) * t ** 1.35
    const amp = 0.3 + t * 1.5
    const wl = 16 + t * 30
    let d = '', x = -120 + rnd() * 20
    while (x < 1720) {
      const len = wl * (0.6 + rnd() * 1.6)
      const phase = rnd() * Math.PI * 2
      let seg = ''
      for (let xx = 0; xx <= len; xx += 3) {
        const yy = y + Math.sin(((x + xx) / wl) * Math.PI * 2 + phase) * amp
        seg += (seg ? 'L' : 'M') + r(x + xx) + ' ' + r(yy)
      }
      // more breaks far away, longer strokes up close
      if (rnd() < 0.38 + t * 0.4) d += seg
      x += len + 4 + rnd() * (22 - t * 10)
    }
    out.push({ d, w: Math.round((0.3 + t * 0.6) * 100) / 100, dir: i % 2 ? 'a' : 'b', delay: Math.round(-rnd() * 8 * 10) / 10 })
  }
  return out
}

/** sun glitter on the water: short strokes in a widening column under the sun */
export function glitter(cx: number, horizon: number, bottom: number, rows = 12, seed = 13) {
  const rnd = rng(seed)
  const out: { d: string; delay: number }[] = []
  for (let i = 0; i < rows; i++) {
    const t = i / (rows - 1)
    const y = horizon + 3 + (bottom - horizon - 4) * t ** 1.2
    const spread = 16 + t * 60
    let d = ''
    const n = 2 + Math.floor(rnd() * 3 + t * 3)
    for (let k = 0; k < n; k++) {
      const x = cx + (rnd() - 0.5) * 2 * spread
      const len = 3 + rnd() * (6 + t * 12)
      d += `M${r(x - len / 2)} ${r(y)}h${r(len)}`
    }
    out.push({ d, delay: Math.round(-rnd() * 3 * 10) / 10 })
  }
  return out
}

/** long, low swell for the sea horizon (wider than the view so it can slide) */
export function swellLine(y: number, amp = 1.6, wl = 240, from = -400, to = 2000) {
  let d = ''
  for (let x = from; x <= to; x += 4) {
    const yy = y + Math.sin((x / wl) * Math.PI * 2) * amp + Math.sin((x / (wl * 0.37)) * Math.PI * 2 + 1) * amp * 0.35
    d += (d ? 'L' : 'M') + x + ' ' + r(yy)
  }
  return d
}

/** same as swellLine but closed downward, for masking whatever sits "below the sea" */
export function swellArea(y: number, amp = 1.6, wl = 240) {
  return swellLine(y, amp, wl) + 'L2000 400L-400 400Z'
}

/**
 * Rolling sea rows: continuous-ish sine strokes with real amplitude, getting
 * taller, longer and heavier toward the viewer.
 */
export function rollingRows(horizon: number, bottom: number, rows = 9, seed = 41) {
  const rnd = rng(seed)
  const out: { d: string; w: number; delay: number; dur: number }[] = []
  for (let i = 0; i < rows; i++) {
    const t = i / (rows - 1)
    const y = horizon + 4 + (bottom - horizon - 4) * t ** 1.3
    const amp = 1 + t * 4
    const wl = 34 + t * 70
    const phase = rnd() * Math.PI * 2
    let d = '', x = -160 + rnd() * 30
    while (x < 1760) {
      // each stroke covers roughly one crest -> trough, so the line reads as a wave, not noise
      const len = wl * (0.7 + rnd() * 1.1)
      if (rnd() < 0.5 + t * 0.3) {
        let seg = ''
        for (let xx = 0; xx <= len; xx += 3) seg += (seg ? 'L' : 'M') + r(x + xx) + ' ' + r(y + Math.sin(((x + xx) / wl) * Math.PI * 2 + phase) * amp)
        d += seg
      }
      x += len + 6 + rnd() * (26 - t * 14)
    }
    out.push({ d, w: Math.round((0.35 + t * 0.75) * 100) / 100, delay: Math.round(-rnd() * 6 * 10) / 10, dur: Math.round((5 + rnd() * 3) * 10) / 10 })
  }
  return out
}

/** a small engraved breaking crest: rising face, curl, back slope, a few face hatches */
export function crest(x: number, y: number, s = 1) {
  const p = (dx: number, dy: number) => `${r(x + dx * s)} ${r(y + dy * s)}`
  const body = `M${p(0, 0)}C${p(10, -1)} ${p(18, -6)} ${p(24, -12)}C${p(28, -16)} ${p(34, -17)} ${p(37, -13)}C${p(38.5, -10.5)} ${p(36, -8.5)} ${p(33, -9.5)}` +
    `M${p(37, -13)}C${p(44, -7)} ${p(54, -1.5)} ${p(68, 0)}`
  const face = `M${p(13, -2.6)}h${r(7 * s)}M${p(17, -5.2)}h${r(6 * s)}M${p(20.5, -8)}h${r(4.5 * s)}M${p(9, -1)}h${r(6 * s)}`
  return `<path d="${body}" stroke-width="${r(0.6 + s * 0.35)}"/><path d="${face}" stroke-width=".5" opacity=".8"/>`
}

/**
 * Shadow under a crest: a few short wave-following strokes in the trough just
 * in front of / below the crest, darkest right under the curl. Gives the swell volume.
 */
export function crestShade(x: number, y: number, s = 1, seed = 1) {
  const rnd = rng(seed)
  let d = ''
  const rows = 5
  for (let i = 0; i < rows; i++) {
    const yy = y + (1.4 + i * 1.8) * s
    // shade sits mostly under the curl (dx ~ 20–45), tapering out
    const x0 = x + (14 + i * 3 + rnd() * 4) * s
    const len = (30 - i * 5 + rnd() * 6) * s
    let seg = ''
    for (let xx = 0; xx <= len; xx += 2.5) seg += (seg ? 'L' : 'M') + r(x0 + xx) + ' ' + r(yy + Math.sin((xx / (14 * s)) * Math.PI) * 0.7 * s)
    d += seg
  }
  return `<path d="${d}" stroke-width="${r(0.45 + s * 0.25)}"/>`
}

/**
 * Generic engraved band (like the footer hills): white area under `fn`, contour
 * hatching that follows it with weight from slope, plus the top line.
 */
export function band(id: string, fn: (x: number) => number, { lines = 8, spacing = 2.6, base = 0.55, from = -200, to = 1800, seed = 2, light = 1, floor = 400 } = {}) {
  const rnd = rng(seed)
  // area under the line, down to `floor` (lets a headland sit on the horizon without hiding the sea)
  const f = (x: number) => Math.min(fn(x), floor)
  let area = `M${from} ${floor}L${from} ${r(f(from))}`
  for (let x = from; x <= to; x += 6) area += `L${x} ${r(f(x))}`
  area += `L${to} ${floor}Z`
  const buckets = new Map<number, string>()
  for (let i = 1; i <= lines; i++) {
    let x = from + rnd() * 10
    while (x < to) {
      const len = 6 + rnd() * 20
      const sl = (fn(x + len / 2 + 2) - fn(x + len / 2 - 2)) / 4
      const shade = Math.min(1, Math.max(0, sl * 3 * light + 0.15 + (i / lines) * 0.5))
      const w = Math.round(base * (0.3 + shade * 1.5) * 5) / 5
      if (w > 0.2 && rnd() < 0.35 + shade * 0.75) {
        const seg = `M${Math.round(x)} ${r(fn(x) + i * spacing)}L${Math.round(x + len)} ${r(fn(x + len) + i * spacing)}`
        buckets.set(w, (buckets.get(w) ?? '') + seg)
      }
      x += len + 1.5 + rnd() * 4
    }
  }
  let hatch = ''
  for (const [w, d] of buckets) hatch += `<path d="${d}" stroke-width="${w}"/>`
  let top = ''
  for (let x = from; x <= to; x += 4) { if (fn(x) < floor) top += (top ? 'L' : 'M') + x + ' ' + r(fn(x)) }
  return {
    clip: `<clipPath id="${id}"><path d="${area}"/></clipPath>`,
    html: `<path d="${area}" fill="#fefefe" stroke="none"/><g clip-path="url(#${id})">${hatch}</g><path d="${top}" stroke-width="${r(base * 1.6)}"/>`,
  }
}
