/*
  What each nav and footer icon does on hover, as pure functions of time.

  A gesture moves named parts of an icon (the `data-part` groups in icon.tsx,
  plus `all`, which wraps the whole drawing). `pose(t)` says where every part is
  at `t` seconds, so the animator can sample any moment, freeze it, and blend from
  it: nothing is a keyframe, so nothing restarts or snaps. Motion is built from
  springs and bells whose velocity is continuous, and every gesture starts and
  ends exactly on the resting drawing (tests/icon-gestures.test.mjs checks this).
*/

export interface Pose {
  x?: number;
  y?: number;
  /** rotation in degrees */
  r?: number;
  /** uniform scale, multiplied into sx and sy */
  s?: number;
  sx?: number;
  sy?: number;
  /** skewY in degrees */
  k?: number;
  o?: number;
  /** the drawn span of the outline, 0–1 along its length */
  d0?: number;
  d1?: number;
}

export interface PartSpec {
  /** the point the part turns and scales about, in viewBox units */
  origin: [number, number];
  /** only shown mid-gesture */
  hidden?: boolean;
  /** leaves faint copies behind as it moves */
  echo?: boolean;
  /** turning it this many degrees leaves it looking the same */
  period?: number;
}

export interface Gesture {
  duration: number;
  parts: Record<string, PartSpec>;
  pose: (t: number) => Record<string, Pose>;
}

/** x, y, r, sx, sy, k, o, d0, d1 */
export const CHANNELS = 9;
export type Frame = number[];

const channels = (p: Pose = {}, hidden = false) => {
  const s = p.s ?? 1;
  return [p.x ?? 0, p.y ?? 0, p.r ?? 0, (p.sx ?? 1) * s, (p.sy ?? 1) * s, p.k ?? 0, p.o ?? (hidden ? 0 : 1), p.d0 ?? 0, p.d1 ?? 1];
};

export const sample = (g: Gesture, t: number): Frame => {
  const pose = g.pose(Math.min(Math.max(t, 0), g.duration));
  return Object.entries(g.parts).flatMap(([name, spec]) => channels(pose[name], spec.hidden));
};

export const restFrame = (g: Gesture): Frame =>
  Object.values(g.parts).flatMap(spec => channels({}, spec.hidden));

export const lerpFrame = (a: Frame, b: Frame, w: number): Frame => a.map((v, i) => v + ((b[i] ?? v) - v) * w);

export const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
export const span = (t: number, start: number, end: number) => clamp01((t - start) / (end - start));

export const cubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
  const at = (a: number, b: number, u: number) => 3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3;
  return (x: number) => {
    if (x <= 0 || x >= 1) return clamp01(x);
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (at(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return at(y1, y2, (lo + hi) / 2);
  };
};

export const easeInOut = cubicBezier(0.65, 0, 0.35, 1);
const easeOut = cubicBezier(0.16, 1, 0.3, 1);
const easeIn = cubicBezier(0.5, 0, 0.75, 0);

/** 0 → 1 → 0 with zero velocity at both ends */
const bell = (u: number) => Math.sin(Math.PI * clamp01(u)) ** 2;

/** eases `v` onto `to` over the last 40% of the motion, so a spring lands exactly */
const settle = (v: number, to: number, t: number, end: number) => v + (to - v) * easeInOut(span(t, end * 0.6, end));

/** a kick that rings out: a damped sine that leaps to about ±1, recoils, and dies to exactly 0 by `end` */
const flick = (t: number, end: number, hz = 2.2, damping = 0.34) => {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * hz;
  const v = (Math.exp(-damping * w * t) * Math.sin(w * Math.sqrt(1 - damping ** 2) * t)) / 0.62;
  return settle(v, 0, t, end);
};

/** a spring from 0 to 1 that overshoots and lands exactly by `end` */
const arrive = (t: number, end: number, hz = 2, damping = 0.5) => {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * hz;
  const wd = w * Math.sqrt(1 - damping ** 2);
  const v = 1 - Math.exp(-damping * w * t) * (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t));
  return settle(v, 1, t, end);
};

/** a part flying out from `from` along (dx, dy), appearing and fading as it goes */
const spark = (t: number, start: number, dx: number, dy: number): Pose => {
  const u = span(t, start, start + 0.45);
  const go = easeOut(u);
  return { x: dx * (2 * go - 1), y: dy * (2 * go - 1), s: 0.2 + 0.8 * go, o: bell(u ** 0.7), d1: 0.3 + 0.7 * go };
};

export const gestures: Record<string, Gesture> = {
  // home: the door swings open onto the lit hall and shuts, the chimney puffs, and smoke curls up
  home: {
    duration: 1.25,
    parts: {
      door: { origin: [10, 17.75] },
      chimney: { origin: [17.25, 9.4] },
      smoke: { origin: [17.3, 3], hidden: true, echo: true },
    },
    pose: t => {
      const open = easeInOut(span(t, 0.15, 0.42)) - easeInOut(span(t, 0.62, 0.9)) + 0.06 * flick(t - 0.9, 0.3, 3);
      const u = span(t, 0.38, 1.2);
      return {
        door: { sx: 1 - 0.85 * open, k: -14 * open },
        chimney: { sy: 1 - 0.18 * bell(span(t, 0.22, 0.42)) + 0.08 * bell(span(t, 0.38, 0.56)) },
        smoke: { x: 1.2 * Math.sin(u * 3) * u, y: 1.5 - 3.5 * easeOut(u), s: 0.3 + 0.9 * easeOut(u), o: bell(u ** 0.6) },
      };
    },
  },
  // posts: the page lifts toward you, its corner flicks, and the lines rewind and write themselves back in
  posts: {
    duration: 0.95,
    parts: {
      all: { origin: [12, 20] },
      fold: { origin: [18.5, 3.5] },
      line1: { origin: [8.5, 12.5] },
      line2: { origin: [8.5, 16] },
    },
    pose: t => {
      const write = (start: number) => ({
        d1: t < start + 0.1 ? 1 - easeIn(span(t, start, start + 0.1)) : easeOut(span(t, start + 0.12, start + 0.42)),
      });
      return {
        all: { y: -1.6 * bell(span(t, 0, 0.55)), r: -7 * flick(t, 0.8, 1.6, 0.5) },
        fold: { s: 1 - 0.3 * bell(span(t, 0.04, 0.4)) },
        line1: write(0.08),
        line2: write(0.22),
      };
    },
  },
  // favorites: the heart crouches and beats twice, lub-dub, and sparks fly off it
  favorites: {
    duration: 0.95,
    parts: {
      heart: { origin: [12, 20] },
      spark1: { origin: [2.75, 3.25], hidden: true, echo: true },
      spark2: { origin: [12, 2.6], hidden: true, echo: true },
      spark3: { origin: [21.25, 3.25], hidden: true, echo: true },
    },
    pose: t => {
      const crouch = bell(span(t, 0, 0.16));
      const beat = bell(span(t, 0.12, 0.34)) + 0.6 * bell(span(t, 0.36, 0.56));
      return {
        heart: { sx: 1 + 0.08 * crouch - 0.06 * beat, sy: 1 - 0.12 * crouch + 0.14 * beat, y: -1 * beat },
        spark1: spark(t, 0.2, -1.5, -1.5),
        spark2: spark(t, 0.24, 0, -2),
        spark3: spark(t, 0.28, 1.5, -1.5),
      };
    },
  },
  // books: the right-hand page lifts, turns over the spine showing its blue back, and settles on the left
  books: {
    duration: 1.2,
    parts: {
      page: { origin: [12, 12.5], hidden: true },
      back: { origin: [12, 12.5], hidden: true },
    },
    pose: t => {
      const turn = easeInOut(span(t, 0.22, 0.85));
      const sx = Math.cos(Math.PI * turn) - 0.05 * flick(t - 0.8, 0.35, 3);
      const k = -10 * Math.sin(Math.PI * turn);
      const on = span(t, 0.2, 0.24) * (1 - span(t, 1.12, 1.18));
      // the front shows until the page is edge-on over the spine, then the back
      const side = clamp01(0.5 - sx * 6);
      return { page: { sx, k, o: on * (1 - side) }, back: { sx, k, o: on * side } };
    },
  },
  // work: the briefcase crouches, hops, and lands; the handle follows a beat late
  work: {
    duration: 0.85,
    parts: {
      all: { origin: [12, 20] },
      handle: { origin: [12, 7.5] },
    },
    pose: t => {
      const crouch = bell(span(t, 0, 0.18));
      const air = bell(span(t, 0.14, 0.52));
      const land = bell(span(t, 0.48, 0.66));
      return {
        all: { y: -3 * air, sx: 1 + 0.08 * crouch + 0.06 * land - 0.05 * air, sy: 1 - 0.12 * crouch - 0.08 * land + 0.07 * air },
        handle: { sy: 1 - 0.3 * bell(span(t, 0.06, 0.22)), y: 1.2 * flick(t - 0.3, 0.5, 2.6) },
      };
    },
  },
  // email: the plane draws back like a hand about to throw it, then flies a loop and lands where it started
  email: {
    duration: 1.4,
    parts: {
      plane: { origin: [12, 12], echo: true, period: 360 },
      crease: { origin: [12, 12], echo: true, period: 360 },
    },
    pose: t => {
      const back = bell(span(t, 0.15, 0.38));
      const loop = easeInOut(span(t, 0.3, 1.15));
      const a = 2 * Math.PI * loop;
      // forward is up-right, the loop curls up-left of it
      const R = 4.5;
      const along = R * Math.sin(a);
      const lift = R * (1 - Math.cos(a));
      const plane: Pose = {
        x: (along - lift) / Math.SQRT2 - 1.6 * back,
        y: (-along - lift) / Math.SQRT2 + 1.6 * back,
        r: -360 * loop + 6 * back + 4 * flick(t - 1.1, 0.3, 3),
        s: 1 - 0.2 * bell(loop),
      };
      return { plane, crease: plane };
    },
  },
  // x: winds up, then spins a half turn (the mark is symmetric, so it lands as it started)
  x: {
    duration: 0.8,
    parts: { all: { origin: [12, 12], period: 180, echo: true } },
    pose: t => ({ all: { r: 180 * arrive(t - 0.12, 0.68, 1.8, 0.55) - 18 * bell(span(t, 0, 0.2)), s: 1 - 0.1 * bell(span(t, 0, 0.3)) } }),
  },
  // linkedin: the badge tips back while the letters of "in" hop one after another
  linkedin: {
    duration: 0.8,
    parts: {
      all: { origin: [12, 20.5] },
      dot: { origin: [8, 8] },
      i: { origin: [8, 16.5] },
      n: { origin: [13.9, 16.5] },
    },
    pose: t => {
      const hop = (start: number): Pose => {
        const u = span(t, start, start + 0.42);
        return { y: -2.2 * bell(u) + 0.5 * bell(span(u, 0.7, 1)), sy: 1 + 0.12 * bell(u) - 0.1 * bell(span(u, 0.65, 1)) };
      };
      return { all: { r: -9 * flick(t, 0.75, 1.8, 0.45) }, dot: hop(0.04), i: hop(0.1), n: hop(0.16) };
    },
  },
  // github: the octocat wiggles its head and wags its tail
  github: {
    duration: 0.9,
    parts: {
      all: { origin: [12, 20.4] },
      tail: { origin: [9, 18.6] },
    },
    pose: t => ({ all: { r: -8 * flick(t, 0.8, 2) }, tail: { r: 38 * flick(t - 0.05, 0.85, 3.2, 0.4) } }),
  },
  // rss: the waves go quiet, the dot pings, and the signal sweeps back out from it one wave at a time
  rss: {
    duration: 0.95,
    parts: {
      dot: { origin: [8, 16] },
      wave1: { origin: [8, 16] },
      wave2: { origin: [8, 16] },
    },
    pose: t => {
      const wave = (start: number): Pose => {
        const out = 1 - easeIn(span(t, 0, 0.14));
        const sweep = easeOut(span(t, start, start + 0.3));
        return { d1: t < start ? out : sweep, s: 1 + 0.12 * flick(t - start - 0.18, 0.4, 2.6) };
      };
      return { dot: { s: 1 + 0.9 * bell(span(t, 0.1, 0.34)) }, wave1: wave(0.2), wave2: wave(0.34) };
    },
  },
};
