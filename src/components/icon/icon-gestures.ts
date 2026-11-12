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

/** the shared hop: crouch, spring up `height` units, and land with a squash (origin the part's base) */
const bounce = (t: number, height = 2.2): Pose => {
  const crouch = bell(span(t, 0, 0.16));
  const air = bell(span(t, 0.12, 0.5));
  const land = bell(span(t, 0.46, 0.64));
  return {
    y: -height * air,
    sx: 1 + 0.07 * crouch + 0.05 * land - 0.04 * air,
    sy: 1 - 0.1 * crouch - 0.07 * land + 0.06 * air,
  };
};

export const gestures: Record<string, Gesture> = {
  // home: the house crouches, bobs up, and rocks on its foundation like it's waving you in,
  // while the chimney gives a puff and two rings of smoke curl up out of it
  home: {
    duration: 1.2,
    parts: {
      all: { origin: [12, 20] },
      chimney: { origin: [17, 6.4] },
      smoke1: { origin: [17, -0.6], hidden: true, echo: true },
      smoke2: { origin: [18.9, -2], hidden: true, echo: true },
    },
    pose: t => {
      const crouch = bell(span(t, 0, 0.16));
      const lift = bell(span(t, 0.1, 0.46));
      const smoke = (start: number, drift: number): Pose => {
        const u = span(t, start, start + 0.7);
        const up = easeOut(u);
        return { x: drift * Math.sin(u * 3) * u, y: 2.2 - 2.6 * up, s: 0.3 + 0.8 * up, o: bell(u ** 0.6) };
      };
      return {
        all: {
          y: -1.6 * lift,
          sx: 1 + 0.07 * crouch - 0.03 * lift,
          sy: 1 - 0.1 * crouch + 0.05 * lift,
          r: -8 * flick(t - 0.08, 0.85, 1.8, 0.42),
        },
        chimney: { sy: 1 - 0.22 * bell(span(t, 0.2, 0.36)) + 0.1 * bell(span(t, 0.34, 0.5)) },
        smoke1: smoke(0.32, 0.8),
        smoke2: smoke(0.46, 0.6),
      };
    },
  },
  // posts: the lines fade away, then write themselves back in one after another,
  // left to right like a hand on the page, while the page hops like the others
  posts: {
    duration: 1,
    parts: {
      all: { origin: [12, 21] },
      line1: { origin: [9, 7] },
      line2: { origin: [9, 11] },
      line3: { origin: [9, 15] },
    },
    pose: t => {
      // the lines fade out together (retracting them would leave their round caps as dots)
      const wiped = 1 - easeIn(span(t, 0, 0.1));
      // then each writes in at the same speed, so the short last one finishes quickly
      const write = (start: number, length: number): Pose =>
        t < start ? { o: wiped } : { d1: easeInOut(span(t, start, start + 0.3 * length)) };
      return {
        all: bounce(t, 2),
        line1: write(0.14, 1),
        line2: write(0.36, 1),
        line3: write(0.58, 0.45),
      };
    },
  },
  // favorites: the heart crouches and beats twice, lub-dub, and sparks fly off it
  favorites: {
    duration: 0.95,
    parts: {
      heart: { origin: [12, 20.5] },
      spark1: { origin: [3.5, 2.5], hidden: true, echo: true },
      spark2: { origin: [12, 1.9], hidden: true, echo: true },
      spark3: { origin: [20.5, 2.5], hidden: true, echo: true },
    },
    pose: t => {
      const crouch = bell(span(t, 0, 0.16));
      const beat = bell(span(t, 0.12, 0.34)) + 0.6 * bell(span(t, 0.36, 0.56));
      return {
        heart: { sx: 1 + 0.08 * crouch - 0.06 * beat, sy: 1 - 0.12 * crouch + 0.14 * beat, y: -1 * beat },
        spark1: spark(t, 0.2, -1.2, -1.2),
        spark2: spark(t, 0.24, 0, -1.6),
        spark3: spark(t, 0.28, 1.2, -1.2),
      };
    },
  },
  // books: the open book hops, and the right-hand page lifts, turns over the spine,
  // and settles exactly onto the left one (the book is symmetric, so the mirrored page matches)
  books: {
    duration: 1.2,
    parts: {
      all: { origin: [12, 20.5] },
      page: { origin: [12, 13.5], hidden: true },
    },
    pose: t => {
      const turn = easeInOut(span(t, 0.2, 0.85));
      const sx = Math.cos(Math.PI * turn) - 0.05 * flick(t - 0.8, 0.3, 3);
      const on = span(t, 0.18, 0.22) * (1 - span(t, 1.08, 1.16));
      return {
        all: bounce(t, 2),
        page: { sx, k: -8 * Math.sin(Math.PI * turn), y: -0.8 * Math.sin(Math.PI * turn), o: on },
      };
    },
  },
  // work: the bag crouches, hops, and lands; the handle follows a beat late and the clasp rattles
  work: {
    duration: 0.9,
    parts: {
      all: { origin: [12, 20] },
      handle: { origin: [12, 8] },
      clasp: { origin: [12, 13] },
    },
    pose: t => {
      const crouch = bell(span(t, 0, 0.18));
      const air = bell(span(t, 0.14, 0.52));
      const land = bell(span(t, 0.48, 0.66));
      return {
        all: { y: -3 * air, sx: 1 + 0.08 * crouch + 0.06 * land - 0.05 * air, sy: 1 - 0.12 * crouch - 0.08 * land + 0.07 * air },
        handle: { sy: 1 - 0.3 * bell(span(t, 0.06, 0.22)), y: 1.2 * flick(t - 0.3, 0.55, 2.6) },
        clasp: { r: 30 * flick(t - 0.5, 0.38, 3.2, 0.35) },
      };
    },
  },
  // email: the plane draws back like a hand about to throw it, then flies a loop and lands where it started
  email: {
    duration: 1.4,
    parts: {
      plane: { origin: [12, 12], echo: true, period: 360 },
    },
    pose: t => {
      const back = bell(span(t, 0.15, 0.38));
      const loop = easeInOut(span(t, 0.3, 1.15));
      const a = 2 * Math.PI * loop;
      // forward is up-right, the loop curls up-left of it
      const R = 4.5;
      const along = R * Math.sin(a);
      const lift = R * (1 - Math.cos(a));
      return {
        plane: {
          x: (along - lift) / Math.SQRT2 - 1.6 * back,
          y: (-along - lift) / Math.SQRT2 + 1.6 * back,
          r: -360 * loop + 6 * back + 4 * flick(t - 1.1, 0.3, 3),
          s: 1 - 0.2 * bell(loop),
        },
      };
    },
  },
  // x: winds up, then spins a half turn (the mark is symmetric, so it lands as it started)
  x: {
    duration: 0.8,
    parts: { all: { origin: [12, 12], period: 180, echo: true } },
    pose: t => ({ all: { r: 180 * arrive(t - 0.12, 0.68, 1.8, 0.55) - 18 * bell(span(t, 0, 0.2)), s: 1 - 0.1 * bell(span(t, 0, 0.3)) } }),
  },
  // linkedin: the badge crouches, hops with a tilt, and lands with a squash
  linkedin: {
    duration: 0.85,
    parts: { all: { origin: [12, 21] } },
    pose: t => {
      const crouch = bell(span(t, 0, 0.14));
      const hop = bell(span(t, 0.1, 0.5));
      const land = bell(span(t, 0.46, 0.62));
      return {
        all: {
          y: -2.4 * hop,
          sx: 1 + 0.08 * crouch + 0.06 * land - 0.04 * hop,
          sy: 1 - 0.1 * crouch - 0.07 * land + 0.06 * hop,
          r: -8 * flick(t - 0.1, 0.7, 1.8, 0.45),
        },
      };
    },
  },
  // github: the octocat bobs up and tilts its head side to side, curious
  github: {
    duration: 0.9,
    parts: { all: { origin: [12, 21.5] } },
    pose: t => ({ all: { r: -10 * flick(t, 0.85, 2), y: -1.2 * bell(span(t, 0, 0.3)) } }),
  },
  // rss: the feed squeezes, then pulses, sending two rings of signal out from its edge
  rss: {
    duration: 0.95,
    parts: {
      all: { origin: [12, 12] },
      ring1: { origin: [12, 12], hidden: true },
      ring2: { origin: [12, 12], hidden: true },
    },
    pose: t => {
      const ring = (start: number): Pose => {
        const u = span(t, start, start + 0.6);
        return { s: 1 + 0.5 * easeOut(u), o: 0.9 * bell(u ** 0.5) };
      };
      return {
        all: { s: 1 - 0.12 * bell(span(t, 0, 0.18)) + 0.08 * bell(span(t, 0.14, 0.36)) },
        ring1: ring(0.14),
        ring2: ring(0.3),
      };
    },
  },
  // external links: the arrow pokes out of its box toward where the link goes, then springs back
  external: {
    duration: 0.8,
    parts: {
      box: { origin: [4, 20] },
      arrow: { origin: [20, 4] },
    },
    pose: t => {
      const poke = bell(span(t, 0.02, 0.36)) + 0.25 * flick(t - 0.36, 0.4, 3);
      return {
        box: { s: 1 - 0.06 * bell(span(t, 0.04, 0.3)) },
        arrow: { x: 1.8 * poke, y: -1.8 * poke },
      };
    },
  },
};
