/**
 * The Golden Gate, engraved, seen broadside from the city side.
 *
 * Proportions follow the real bridge (main span 1280 m, towers 227 m above the
 * water, deck 67 m up, side spans 343 m, the main cable dipping almost to the
 * deck at mid-span), with the towers stretched a little so they hold their own
 * at footer scale. The towers carry the Art Deco details that make it read as
 * *the* bridge: legs that step in at each portal strut, portal openings that
 * shrink toward the top, stepped caps, and X-bracing below the deck. The deck
 * gets its stiffening truss, and each side span comes down into an anchorage
 * pylon.
 */

const r = (n: number) => Math.round(n * 10) / 10

export const BRIDGE = (() => {
  const t1 = 1060, t2 = 1440 // tower centres (south / north)
  const span = t2 - t1 // 380 units ≈ 1280 m
  const m = span / 1280 // units per metre
  const water = 222
  const deck = Math.round(water - 67 * m) // ≈ 202
  const top = Math.round(water - 227 * m * 1.12) // towers a touch taller than life
  const side = Math.round(343 * m) // side-span length ≈ 102
  return { t1, t2, water, deck, top, side, truss: 3.2 }
})()

/** where the main cables run: tower saddles → near the deck at mid-span; side spans sag gently down to the anchorages */
export function cableY(x: number) {
  const { t1, t2, deck, top, side } = BRIDGE
  const saddle = top + 1.5
  if (x >= t1 && x <= t2) {
    const u = (x - (t1 + t2) / 2) / ((t2 - t1) / 2)
    return deck - 2.5 - (deck - 2.5 - saddle) * u * u
  }
  // side spans: chord from saddle to anchorage, with a shallow sag
  const [a, t] = x < t1 ? [t1 - side, t1] : [t2 + side, t2]
  const u = (x - t) / (a - t) // 0 at tower, 1 at anchorage
  return saddle + (deck - 4 - saddle) * u + 6 * u * (1 - u)
}

/**
 * One tower, as seen down the bridge's axis (the iconic portal view): two legs
 * joined by struts. Legs taper in steps at each strut; openings get shorter
 * toward the top.
 */
function tower(cx: number) {
  const { deck, top, water } = BRIDGE
  const h = deck - top
  // strut levels above the deck (fraction of tower height above deck): openings shrink as they rise
  const struts = [0.33, 0.6, 0.82].map(f => deck - h * f)
  const levels = [water, deck, ...struts, top] // bottoms of each setback segment, bottom → top
  const seg = (k: number) => ({ outer: 8.2 - k * 0.5, leg: 4 - k * 0.28 })

  let legs = '', hi = ''
  for (const side of [-1, 1]) {
    // walk up the outer edge (stepping in at each level), over the cap, and back down the inner edge
    let outer = '', inner = ''
    for (let k = 0; k < levels.length - 1; k++) {
      const { outer: o, leg } = seg(k)
      const y0 = levels[k], y1 = levels[k + 1]
      outer += `${outer ? 'L' : 'M'}${r(cx + side * o)} ${r(y0)}L${r(cx + side * o)} ${r(y1)}`
      inner = `L${r(cx + side * (o - leg))} ${r(y1)}L${r(cx + side * (o - leg))} ${r(y0)}` + inner
    }
    // stepped Art Deco cap
    const { outer: o, leg } = seg(levels.length - 2)
    const c = cx + side * (o - leg / 2)
    const cap =
      `L${r(cx + side * (o - 0.3))} ${top}L${r(cx + side * (o - 0.3))} ${r(top - 2.2)}` +
      `L${r(c + side * 0.7)} ${r(top - 2.2)}L${r(c + side * 0.7)} ${r(top - 4)}` +
      `L${r(c - side * 0.7)} ${r(top - 4)}L${r(c - side * 0.7)} ${r(top - 2.2)}` +
      `L${r(cx + side * (o - leg + 0.3))} ${r(top - 2.2)}L${r(cx + side * (o - leg + 0.3))} ${top}`
    legs += outer + cap + inner + 'Z'
    // a fine highlight down the sunlit (left) face of each leg
    for (let k = 0; k < levels.length - 1; k++) {
      const { outer: o2, leg: l2 } = seg(k)
      const x = cx + side * o2 - (side > 0 ? l2 : 0) + 0.7
      hi += `M${r(x)} ${r(levels[k] - 0.6)}L${r(x)} ${r(levels[k + 1] + 0.6)}`
    }
  }

  // portal struts between the legs (the top one deepest), plus the strut under the deck
  let strutD = ''
  const strut = (y: number, depth: number, k: number) => {
    const { outer: o, leg } = seg(k)
    const x0 = cx - (o - leg), x1 = cx + (o - leg)
    strutD += `M${r(x0)} ${r(y)}L${r(x1)} ${r(y)}L${r(x1)} ${r(y + depth)}L${r(x0)} ${r(y + depth)}Z`
  }
  strut(top, 3.4, levels.length - 2)
  struts.forEach((y, i) => strut(y - 1.1, 2.2, i + 1))
  strut(deck + BRIDGE.truss, 1.8, 0)

  // X-bracing below the deck, down to the water
  const { outer: o0, leg: l0 } = seg(0)
  const xi = cx - (o0 - l0), xo = cx + (o0 - l0), yb = deck + BRIDGE.truss + 1.8
  const brace = `M${r(xi)} ${r(yb)}L${r(xo)} ${water}M${r(xo)} ${r(yb)}L${r(xi)} ${water}`

  return { legs, hi, strutD, brace }
}

/** a small stepped anchorage pylon where a side span's cable comes down to the deck */
function pylon(x: number) {
  const { deck } = BRIDGE
  const w = 5, h = 11
  return `M${x - w} ${deck}L${x - w} ${deck - h + 2}L${x - w + 1.2} ${deck - h + 2}L${x - w + 1.2} ${deck - h}` +
    `L${x + w - 1.2} ${deck - h}L${x + w - 1.2} ${deck - h + 2}L${x + w} ${deck - h + 2}L${x + w} ${deck}Z`
}

export function renderBridge(INK: string, PAPER: string) {
  const { t1, t2, deck, top, side, truss } = BRIDGE
  const a1 = t1 - side, a2 = t2 + side
  // the south approach runs on into the hill; the north approach runs on over the water, off the edge of the scene
  const from = a1 - 70, to = a2 + 140

  // main + side-span cables
  let cable = ''
  for (let x = a1; x <= a2; x += 2) cable += (cable ? 'L' : 'M') + x + ' ' + r(cableY(x))

  // suspender ropes, every ~15 m, skipping right by the towers and anchorages
  const gap = 15 * ((t2 - t1) / 1280)
  let hangers = ''
  for (let x = a1 + gap; x < a2 - gap / 2; x += gap) {
    if (Math.abs(x - t1) < 8 || Math.abs(x - t2) < 8) continue
    hangers += `M${r(x)} ${r(cableY(x) + 0.6)}V${deck}`
  }

  // deck: roadway + bottom chord, with the Warren stiffening truss between them
  const chords = `M${from} ${deck}H${to}M${from} ${deck + truss}H${to}`
  let web = ''
  for (let x = from; x < to; x += 3) web += `M${x} ${deck + truss}L${x + 1.5} ${deck}L${x + 3} ${deck + truss}`

  const towers = [tower(t1), tower(t2)]
  // the north end stands in the water, so its anchorage gets a pier down to the waterline
  const pw = 6, py = deck + truss
  const pierAt = (x: number, w: number) => `M${x - w} ${py}L${x - w - 1.5} ${BRIDGE.water}L${x + w + 1.5} ${BRIDGE.water}L${x + w} ${py}Z`
  let pier = pierAt(a2, pw), pierHatch = ''
  for (let y = py + 2; y < BRIDGE.water; y += 2.2) pierHatch += `M${a2 - pw + 1.5} ${r(y)}H${a2 + pw}`
  // slimmer approach piers beyond it, carrying the roadway on toward Marin
  for (let x = a2 + 26; x < to; x += 26) {
    pier += pierAt(x, 2.2)
    pierHatch += `M${x - 0.6} ${py + 1}V${BRIDGE.water}`
  }
  const pylons = pylon(a1) + pylon(a2)
  let pylonHatch = ''
  for (const a of [a1, a2]) for (const dx of [-2.2, 0, 2.2]) pylonHatch += `M${a + dx} ${deck - 8}V${deck - 1}`

  return [
    `<g fill="none" opacity=".8">`,
    // below-deck bracing first, so the deck truss sits in front of it
    `<path d="${towers.map(t => t.brace).join('')}" stroke-width=".7"/>`,
    `<path d="${hangers}" stroke-width=".35" opacity=".85"/>`,
    `<path d="${cable}" stroke-width="1.15"/>`,
    `<path d="${web}" stroke-width=".35"/>`,
    `<path d="${chords}" stroke-width="1"/>`,
    `<path d="${pier}" fill="${PAPER}" stroke-width=".8"/>`,
    `<path d="${pierHatch}" stroke-width=".45"/>`,
    `<path d="${pylons}" fill="${PAPER}" stroke-width=".8"/>`,
    `<path d="${pylonHatch}" stroke-width=".4"/>`,
    `<path d="${towers.map(t => t.strutD).join('')}" fill="${INK}" stroke="none"/>`,
    `<path d="${towers.map(t => t.legs).join('')}" fill="${INK}" stroke-width=".4" stroke-linejoin="round"/>`,
    `<path d="${towers.map(t => t.hi).join('')}" stroke="${PAPER}" stroke-width=".45" opacity=".7"/>`,
    `</g>`,
  ].join('')
}

/**
 * The strait: the far ridge eases down to Fort Point, then keeps sloping
 * down in front of the water (the hill overlaps the bay, which is drawn behind it).
 * Past its foot there's no ridge at all, just open water
 * under the bridge.
 */
export function withStrait(base: (x: number) => number) {
  const { water } = BRIDGE
  // Catmull-Rom through hand-placed points (x, y)
  const pts: [number, number][] = [
    [860, base(860)], [930, 194], [975, 203], [1015, 214], [1045, 223], [1075, 233], [1105, 246], [1140, 266], [1180, 300], [1220, 360],
  ]
  const end = pts[pts.length - 1][0]
  const target = (x: number) => {
    let i = 0
    while (i < pts.length - 2 && x > pts[i + 1][0]) i++
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
    const t = (x - p1[0]) / (p2[0] - p1[0])
    const t2 = t * t, t3 = t2 * t
    // uniform Catmull-Rom on y, x assumed roughly uniform per segment
    return 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
  }
  const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
  return (x: number) => {
    if (x <= 860) return base(x)
    if (x >= end) return 360 // past the bluff: no hill, below the bottom of the scene
    const y = target(x)
    // keep a little of the ridge's texture on the headlands, none on the water
    const rough = (Math.sin(x * 0.03) * 1.2 + Math.sin(x * 0.071 + 1) * 0.6) * Math.min(1, Math.max(0, (water - y) / 12))
    const w = smooth(860, 940, x)
    return base(x) * (1 - w) + (y + rough) * w
  }
}
