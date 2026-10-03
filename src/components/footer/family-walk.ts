/**
 * Brings the footer's family to life (progressive enhancement: without JS, or
 * with reduced motion, they stand on the ridge in their server-rendered pose).
 *
 * They stroll along the middle hill's ridge, feet planted (the walk cycle
 * advances with distance travelled, so nobody slides), each at their own
 * cadence. Now and then they stop to take in the bridge (dad points), swing
 * the little one between them, or the older kid lets go and runs ahead and
 * back. Hover (or tap) someone and they wave; the kids jump.
 */
import { BRIDGE } from './bridge'
import { FAMILY, H, W, type Pose, figure, holdHands, midRidge, restPose } from './family'

const WALK = 9 // scene units per second: a stroll
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const approach = (v: number, target: number, rate: number, dt: number) => v + (target - v) * Math.min(1, rate * dt)

interface Person { spec: (typeof FAMILY)[number]; pose: Pose; offset: number; wave: number; hop: number; hopV: number; path: SVGPathElement; head: SVGCircleElement }

export function walk(svg: SVGSVGElement) {
  const root = svg.querySelector<SVGGElement>('[data-family]')
  if (!root) return { greet: () => {} }

  const people: Person[] = FAMILY.map(spec => {
    const g = root.querySelector<SVGGElement>(`[data-figure="${spec.id}"]`)!
    return { spec, pose: restPose(0), offset: spec.offset, wave: 0, hop: 0, hopV: 0, path: g.querySelector('path')!, head: g.querySelector('circle')! }
  })
  const [dad, little, mom, big] = people

  // the visible slice of the scene (narrow screens crop from the left)
  let xmin = 0
  const measure = () => {
    const { width, height } = svg.getBoundingClientRect()
    xmin = height ? Math.max(0, W - (H * width) / height) : 0
  }
  measure()
  addEventListener('resize', measure)

  // start them at the left edge of the visible scene, so the walk begins there instead of popping in mid-view
  let gx = xmin
  let speed = WALK
  // what the family is up to
  let mode: 'walk' | 'pause' = 'walk'
  let modeLeft = rand(12, 20)
  let swingT = -1, nextSwing = rand(6, 10)
  let bigMode: 'hold' | 'run' | 'play' | 'back' = 'hold', bigTimer = rand(14, 22)

  const groundHop = (o: { hop: number; hopV: number }, dt: number) => {
    if (o.hop > 0 || o.hopV > 0) {
      o.hopV -= 260 * dt
      o.hop = Math.max(0, o.hop + o.hopV * dt)
      if (o.hop === 0) o.hopV = 0
    }
  }
  const jump = (o: { hop: number; hopV: number }, v = 42) => { if (o.hop === 0) o.hopV = v }

  const step = (p: Pose, dx: number, leg: number, amp: number, dt: number) => {
    p.amp = approach(p.amp, amp, 6, dt)
    // one full cycle (two steps) covers ~1.7 leg lengths at a stroll; feet stay planted
    if (Math.abs(dx) > 1e-4) p.phase += (Math.abs(dx) / (1.7 * leg * Math.max(0.6, p.amp))) * Math.PI * 2
    else p.phase = approach(p.phase, Math.round(p.phase / Math.PI) * Math.PI, 4, dt)
    if (Math.abs(dx) > 1e-3) p.dir = Math.sign(dx)
  }

  function tick(dt: number, t: number) {
    // the family's plan
    modeLeft -= dt
    if (modeLeft <= 0) {
      mode = mode === 'walk' ? 'pause' : 'walk'
      modeLeft = mode === 'walk' ? rand(14, 24) : rand(3.5, 5.5)
    }
    speed = approach(speed, mode === 'walk' ? WALK : 0, 2.5, dt)
    const dx = speed * dt
    gx += dx

    // wrap: once everyone is off the right edge, come back in on the left
    if (gx - 40 > W) {
      gx = xmin - 70
      bigMode = 'hold'; big.offset = big.spec.offset
    }

    // one, two, three, whee: the little one gets swung between mom and dad
    nextSwing -= dt
    if (nextSwing <= 0 && swingT < 0 && mode === 'walk') { swingT = 0; nextSwing = rand(12, 20) }
    let swingLift = 0, swingTuck = 0
    if (swingT >= 0) {
      swingT += dt
      const u = swingT / 1.1
      if (u >= 1) swingT = -1
      else { swingLift = Math.sin(Math.PI * u) * 7; swingTuck = Math.sin(Math.PI * u) }
    }

    // the older kid lets go, runs ahead, plays, and runs back
    bigTimer -= dt
    const bigHold = big.spec.offset
    if (bigMode === 'hold' && bigTimer <= 0) bigMode = 'run'
    let bigTarget = bigHold, bigSpeed = WALK
    if (bigMode === 'run') { bigTarget = bigHold + 60; bigSpeed = WALK * 2.8 }
    if (bigMode === 'back') { bigTarget = bigHold; bigSpeed = WALK * 2.4 }
    if (bigMode === 'play') { bigTarget = big.offset; if (bigTimer <= 0) bigMode = 'back' }
    const bigDelta = bigTarget - big.offset
    const bigMove = Math.sign(bigDelta) * Math.min(Math.abs(bigDelta), bigSpeed * dt)
    big.offset += bigMove
    if (bigMode === 'run' && Math.abs(bigDelta) < 0.5) { bigMode = 'play'; bigTimer = 1.6; jump(big); }
    if (bigMode === 'back' && Math.abs(bigDelta) < 0.5) { bigMode = 'hold'; bigTimer = rand(18, 30) }
    const bigRunning = bigMode === 'run' || bigMode === 'back'

    // poses
    for (const p of people) {
      p.wave = Math.max(0, p.wave - dt)
      groundHop(p, dt)
      const own = p === big ? bigMove : 0
      p.pose.x = gx + p.offset
      const moving = dx + own
      const amp = p === big && bigRunning ? 1.4 : speed / WALK
      step(p.pose, moving, p.spec.h * 0.45, amp, dt)
      if (p !== big || !bigRunning) p.pose.dir = 1
      p.pose.lift = p.hop + (p === little ? swingLift : 0)
      p.pose.tuck = p === little ? swingTuck : p.hop > 0 ? 0.5 : 0
    }

    // hands: held between neighbours' shoulders (the older kid only when she's back at mom's side)
    holdHands(people.map(p => p.pose), bigMode === 'hold' && Math.abs(big.offset - bigHold) < 0.5)
    // taking in the view: dad points at the bridge
    if (mode === 'pause' && modeLeft > 1) dad.pose.back = { type: 'point', at: (BRIDGE.t1 + BRIDGE.t2) / 2 }
    // waves (hover/tap)
    for (const p of people) if (p.wave > 0) {
      const free = p.pose.back.type === 'swing' ? 'back' : p.pose.front.type === 'swing' ? 'front' : 'back'
      p.pose[free] = { type: 'wave', t }
    }
    if (bigMode === 'play' && big.wave <= 0) big.pose.back = { type: 'wave', t }

    // draw
    for (const p of people) {
      const f = figure(p.spec, p.pose)
      p.path.setAttribute('d', f.d)
      p.head.setAttribute('cx', String(f.head.cx))
      p.head.setAttribute('cy', String(f.head.cy))
    }
  }

  // only run while the footer is on screen
  let raf = 0, last = 0, t = 0
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0)
    last = now
    t += dt
    tick(dt, t)
    raf = requestAnimationFrame(frame)
  }
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !raf) { last = performance.now(); raf = requestAnimationFrame(frame) }
    else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0 }
  }).observe(svg)

  /** someone near (x, y) in scene units waves; the kids jump too */
  function greet(x: number, y: number, radius = 10) {
    for (const p of people) {
      const ground = midRidge(p.pose.x) - p.pose.lift
      if (Math.abs(x - p.pose.x) < radius && y > ground - p.spec.h - 6 && y < ground + 6) {
        if (p.wave <= 0.3) p.wave = 1.6
        if (p.spec.kind === 'boy' || p.spec.kind === 'girl') jump(p)
      }
    }
  }
  return { greet }
}
