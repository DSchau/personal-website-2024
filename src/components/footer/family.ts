/**
 * The footer's family, drawn abstractly in line like the
 * birds: open-circle heads, single-stroke bodies, two-segment legs.
 *
 * Pure geometry, shared by the server (which renders a resting pose, so it
 * looks right with no JS or reduced motion) and the client walker in
 * family-walk.ts (which animates the poses every frame).
 */

const r = (n: number) => Math.round(n * 10) / 10

/** the footer scene's size, in scene units (shared with scene.ts) */
export const W = 1600
export const H = 340

/** the middle hill's ridge (the same curve as in scene.ts): the family's footpath */
export const midRidge = (x: number) =>
  244 + 15 * Math.sin(x * 0.0035 + 3) + 8 * Math.sin(x * 0.009 + 1) + 3 * Math.sin(x * 0.04 + 2)

export type Kind = 'man' | 'woman' | 'boy' | 'girl'
export interface Spec { id: string; kind: Kind; h: number; offset: number }

/** left → right, walking right: dad, the little one between the parents, mom, then the older kid holding mom's hand */
export const FAMILY: Spec[] = [
  { id: 'dad', kind: 'man', h: 27, offset: -20 },
  { id: 'little', kind: 'boy', h: 12.5, offset: -7 },
  { id: 'mom', kind: 'woman', h: 25, offset: 7 },
  { id: 'big', kind: 'girl', h: 17, offset: 20 },
]

/** where the family stands with no JS / reduced motion: on the ridge in front of the bay, inside even the narrowest crop */
export const REST_X = 1240

export type Arm =
  | { type: 'swing' }
  | { type: 'hold'; x: number; y: number }
  | { type: 'wave'; t: number }
  | { type: 'point'; at: number }

export interface Pose {
  x: number
  /** lift off the ground (jumps, being swung) */
  lift: number
  /** walk-cycle phase, and how much of a stride is in it (0 standing, 1 strolling, ~1.4 running) */
  phase: number
  amp: number
  /** 1 facing right, -1 facing left */
  dir: number
  /** knees up (being swung, mid-hop) */
  tuck: number
  back: Arm
  front: Arm
}

/** standing: feet a little apart (a sliver of stride, frozen mid-step), arms down */
export const restPose = (x: number): Pose => ({ x, lift: 0, phase: Math.PI / 2, amp: 0.3, dir: 1, tuck: 0, back: { type: 'swing' }, front: { type: 'swing' } })

const dims = (s: Spec) => {
  const kid = s.kind === 'boy' || s.kind === 'girl'
  return {
    leg: s.h * (kid ? 0.42 : 0.47),
    torso: s.h * (kid ? 0.28 : 0.3),
    // kids get bigger heads for their size: reads as "kid" even this small
    head: s.h * (kid ? 0.13 : 0.085),
    arm: s.h * 0.33,
  }
}

/** the points other figures need (hands are held between shoulders) */
export function shoulder(s: Spec, p: Pose) {
  const { leg, torso } = dims(s)
  const a = 0.45 * p.amp * Math.sin(p.phase)
  const hipY = midRidge(p.x) - p.lift - leg * Math.cos(a)
  const lean = p.dir * Math.max(0, p.amp - 1) * 0.35
  return { x: p.x + Math.sin(lean) * torso * 0.85, y: hipY - Math.cos(lean) * torso * 0.85 }
}

export function figure(s: Spec, p: Pose) {
  const { leg, torso, head, arm } = dims(s)
  const f = p.dir
  const ground = midRidge(p.x) - p.lift
  const a0 = 0.45 * p.amp * Math.sin(p.phase)
  const hip = { x: p.x, y: ground - leg * Math.cos(a0) }
  // a forward lean when running
  const lean = f * Math.max(0, p.amp - 1) * 0.35
  const neck = { x: hip.x + Math.sin(lean) * torso, y: hip.y - Math.cos(lean) * torso }
  const sh = { x: hip.x + Math.sin(lean) * torso * 0.85, y: hip.y - Math.cos(lean) * torso * 0.85 }
  let d = ''
  const M = (x: number, y: number) => (d += `M${r(x)} ${r(y)}`)
  const L = (x: number, y: number) => (d += `L${r(x)} ${r(y)}`)

  // legs: thigh swings, knee bends as the leg comes forward
  for (const side of [0, Math.PI]) {
    const ph = p.phase + side
    const thigh = f * (0.45 * p.amp * Math.sin(ph) + p.tuck * 0.9)
    const bend = p.amp * 0.9 * Math.max(0, Math.cos(ph)) + p.tuck * 1.6
    const knee = { x: hip.x + Math.sin(thigh) * leg / 2, y: hip.y + Math.cos(thigh) * leg / 2 }
    const shin = thigh - f * bend
    M(hip.x, hip.y)
    L(knee.x, knee.y)
    L(knee.x + Math.sin(shin) * leg / 2, knee.y + Math.cos(shin) * leg / 2)
  }

  // body (a dress is an open triangle from the shoulders)
  M(hip.x, hip.y)
  L(neck.x, neck.y)
  if (s.kind === 'woman' || s.kind === 'girl') {
    const w = s.h * 0.13
    M(sh.x - w * 0.15, sh.y)
    L(hip.x - w, hip.y + leg * 0.2)
    L(hip.x + w, hip.y + leg * 0.2)
    L(sh.x + w * 0.15, sh.y)
  }

  // arms
  const swing = (side: number) => -0.5 * Math.max(p.amp, 0.15) * Math.sin(p.phase + side) * f
  for (const [i, arm_] of [[0, p.back], [Math.PI, p.front]] as const) {
    M(sh.x, sh.y)
    if (arm_.type === 'hold') L(arm_.x, arm_.y)
    else if (arm_.type === 'wave') {
      // upper arm out and up, forearm waving overhead
      const elbow = { x: sh.x + f * arm * 0.35, y: sh.y - arm * 0.4 }
      const fa = 0.35 * Math.sin(arm_.t * 14)
      L(elbow.x, elbow.y)
      L(elbow.x + Math.sin(fa) * arm * 0.55 * f, elbow.y - Math.cos(fa) * arm * 0.55)
    } else if (arm_.type === 'point') {
      const ang = Math.atan2(-14, arm_.at - sh.x)
      L(sh.x + Math.cos(ang) * arm, sh.y + Math.sin(ang) * arm)
    } else {
      const ang = swing(i) + (i ? 0.08 : -0.08) * f
      L(sh.x + Math.sin(ang) * arm, sh.y + Math.cos(ang) * arm)
    }
  }

  const headC = { x: neck.x + Math.sin(lean) * head, y: neck.y - head - 0.4 }
  // the girl's ponytail bounces as she goes
  if (s.kind === 'girl') {
    const bob = Math.sin(p.phase * 2) * 0.6 * p.amp
    M(headC.x - f * head * 0.8, headC.y - head * 0.3)
    d += `q${r(-f * head * 0.9)} ${r(head * 0.2 + bob)} ${r(-f * head * 1.1)} ${r(head * 1.3 + bob)}`
  }
  return { d, head: { cx: r(headC.x), cy: r(headC.y), r: r(head) } }
}

/** where two neighbours' hands meet: between their shoulders, sagging a little, swinging with the walk */
export function handBetween(a: Spec, pa: Pose, b: Spec, pb: Pose) {
  const sa = shoulder(a, pa), sb = shoulder(b, pb)
  const reach = Math.min(a.h, b.h) * 0.33
  return { x: (sa.x + sb.x) / 2, y: Math.max(sa.y, sb.y) + reach * 0.55 + Math.sin(pa.phase) * 0.5 * Math.min(1, pa.amp) }
}

/** join hands along the line: dad–little–mom always; mom–big when `bigHolding` */
export function holdHands(poses: Pose[], bigHolding = true) {
  for (const p of poses) { p.back = { type: 'swing' }; p.front = { type: 'swing' } }
  const pairs = bigHolding ? [[0, 1], [1, 2], [2, 3]] : [[0, 1], [1, 2]]
  for (const [i, j] of pairs) {
    const arm: Arm = { type: 'hold', ...handBetween(FAMILY[i], poses[i], FAMILY[j], poses[j]) }
    poses[i].front = arm
    poses[j].back = arm
  }
}

/** the whole family standing together at `x` (the server-rendered pose) */
export function restFamily(x: number) {
  const poses = FAMILY.map(s => restPose(x + s.offset))
  holdHands(poses)
  return FAMILY.map((s, i) => ({ id: s.id, ...figure(s, poses[i]) }))
}
