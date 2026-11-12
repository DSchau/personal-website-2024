import { CHANNELS, easeInOut, gestures, lerpFrame, restFrame, sample, type Frame, type Gesture } from './icon-gestures.ts';

/*
  Plays the link icons' hover gestures (icon-gestures.ts) from one
  requestAnimationFrame loop, writing each part's transform straight onto its
  group. Leaving the link (or moving focus off it) cuts the gesture short: the
  icon slides back to rest from wherever it is, quickly, rather than snapping.
  The cut waits a beat, so grazing the link's edge doesn't stop it. Coming back
  mid-way blends from the pose on screen into a fresh run. Parts
  marked `echo` leave fading copies of themselves a few frames behind, a comet
  smear that shows where they've been.
*/

/** stretches every gesture's clock so the motion has room to breathe; 1 plays them as authored */
const TEMPO = 1.25;
/** blend time when a gesture starts from a pose that isn't the resting one */
const BLEND = 0.2;
/** how long an interrupted gesture takes to get back to rest, in seconds */
const EXIT = 0.12;
/** how long the pointer can be off the link before the gesture is cut short, in ms */
const LEAVE_DELAY = 80;
/** [seconds behind, strength] for each echo */
const ECHOES = [[0.035, 0.32], [0.07, 0.18], [0.105, 0.08]] as const;

interface Run {
  svg: SVGSVGElement;
  gesture: Gesture;
  start: number;
  from?: Frame;
  parts: (SVGGElement | null)[];
  echoes: SVGGElement[][];
  /** set once the pointer or focus has left: heading back to rest from `from` */
  exit?: { start: number; from: Frame };
}

const runs = new Map<SVGSVGElement, Run>();
/** pending cuts, cancelled if the pointer or focus comes back in time */
const leaving = new Map<SVGSVGElement, number>();
let raf = 0;

const motion = matchMedia('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)');

const poseAt = (run: Run, t: number): Frame => {
  const frame = sample(run.gesture, t);
  return run.from && t < BLEND ? lerpFrame(run.from, frame, easeInOut(t / BLEND)) : frame;
};

const clock = (run: Run, now: number) => (now - run.start) / 1000 / TEMPO;
const exitClock = (run: Run, now: number) => (run.exit ? (now - run.exit.start) / 1000 / EXIT : 0);

/** the pose on screen right now */
const current = (run: Run, now: number): Frame =>
  run.exit
    ? lerpFrame(run.exit.from, restFrame(run.gesture), easeInOut(Math.min(exitClock(run, now), 1)))
    : poseAt(run, clock(run, now));

const paint = (g: SVGGElement, f: Frame, k: number, [ox, oy]: [number, number], fade = 1) => {
  const [x, y, r, sx, sy, sk, o, d0, d1] = f.slice(k * CHANNELS, (k + 1) * CHANNELS) as [number, number, number, number, number, number, number, number, number];
  g.setAttribute('transform', `translate(${ox + x} ${oy + y}) rotate(${r}) skewY(${sk}) scale(${sx} ${sy}) translate(${-ox} ${-oy})`);
  const drawn = d1 - d0;
  g.style.opacity = String(o * fade);
  for (const ink of g.querySelectorAll<SVGPathElement>(':scope > path[pathLength]')) {
    // a zero-length dash still draws the round caps as a dot
    ink.style.opacity = drawn <= 0.001 ? '0' : '';
    if (drawn >= 0.999) {
      ink.style.strokeDasharray = '';
      ink.style.strokeDashoffset = '';
    } else {
      ink.style.strokeDasharray = `${Math.max(drawn, 0)} 2`;
      ink.style.strokeDashoffset = String(-d0);
    }
  }
};

/** how far a part has moved between two frames, in rough viewBox units */
const distance = (a: Frame, b: Frame, k: number) => {
  const i = k * CHANNELS;
  const d = (j: number) => Math.abs((a[i + j] ?? 0) - (b[i + j] ?? 0));
  return Math.hypot(d(0), d(1)) + d(2) * 0.08 + (d(3) + d(4)) * 6;
};

const draw = (run: Run, now: number) => {
  const frame = current(run, now);
  const t = clock(run, now);
  Object.values(run.gesture.parts).forEach((spec, k) => {
    const part = run.parts[k];
    if (part) paint(part, frame, k, spec.origin);
    run.echoes[k]?.forEach((echo, e) => {
      // the smear trails the gesture; heading back to rest leaves none
      if (run.exit) return void (echo.style.opacity = '0');
      const [lag, strength] = ECHOES[e] ?? ECHOES[0];
      const behind = poseAt(run, t - lag);
      paint(echo, behind, k, spec.origin, strength * Math.min(1, distance(frame, behind, k) / 1.5));
    });
  });
};

const start = (svg: SVGSVGElement, gesture: Gesture, now: number, from?: Frame) => {
  const names = Object.keys(gesture.parts);
  const parts = names.map(name => svg.querySelector<SVGGElement>(`[data-part="${name}"]`));
  const echoes = names.map((name, k) => {
    const part = parts[k];
    if (!part || !gesture.parts[name]?.echo) return [];
    return ECHOES.map(() => {
      const echo = part.cloneNode(true) as SVGGElement;
      echo.removeAttribute('data-part');
      echo.dataset.echo = '';
      part.before(echo);
      return echo;
    });
  });
  const run: Run = { svg, gesture, start: now, from, parts, echoes };
  runs.set(svg, run);
  svg.dataset.playing = '';
  draw(run, now);
  raf ||= requestAnimationFrame(tick);
};

const stop = (run: Run) => {
  for (const part of run.parts) {
    part?.removeAttribute('transform');
    part?.style.removeProperty('opacity');
    for (const ink of part?.querySelectorAll<SVGPathElement>(':scope > path[pathLength]') ?? []) {
      ink.style.removeProperty('stroke-dasharray');
      ink.style.removeProperty('stroke-dashoffset');
      ink.style.removeProperty('opacity');
    }
  }
  for (const echo of run.echoes.flat()) echo.remove();
  runs.delete(run.svg);
  delete run.svg.dataset.playing;
};

function tick() {
  const now = performance.now();
  for (const run of runs.values()) {
    const done = run.exit ? exitClock(run, now) >= 1 : clock(run, now) >= run.gesture.duration;
    if (!run.svg.isConnected || done) stop(run);
    else draw(run, now);
  }
  raf = runs.size ? requestAnimationFrame(tick) : 0;
}

const play = (svg: SVGSVGElement) => {
  // back within the grace period: the gesture never stopped
  clearTimeout(leaving.get(svg));
  leaving.delete(svg);
  const gesture = gestures[svg.dataset.icon ?? ''];
  if (!gesture || !motion.matches) return;
  const now = performance.now();
  const run = runs.get(svg);
  if (!run) return start(svg, gesture, now, restFrame(gesture));
  // already playing for this hover: let it be
  if (!run.exit) return;
  // back before it got home: carry on from where it is
  const from = current(run, now);
  stop(run);
  start(svg, gesture, now, from);
};

const cut = (svg: SVGSVGElement) => {
  leaving.delete(svg);
  const run = runs.get(svg);
  if (!run || run.exit) return;
  const now = performance.now();
  run.exit = { start: now, from: current(run, now) };
};

const leave = (svg: SVGSVGElement) => {
  if (!runs.has(svg) || leaving.has(svg)) return;
  leaving.set(svg, window.setTimeout(() => cut(svg), LEAVE_DELAY));
};

const linkOf = (target: EventTarget | null) => (target as Element | null)?.closest?.('a') ?? null;
const iconIn = (target: EventTarget | null) => linkOf(target)?.querySelector<SVGSVGElement>('svg[data-icon]') ?? null;

// only when the pointer crosses the link's edge, not when it moves between its children
document.addEventListener('pointerover', event => {
  const svg = iconIn(event.target);
  if (svg && iconIn(event.relatedTarget) !== svg) play(svg);
});
document.addEventListener('pointerout', event => {
  const svg = iconIn(event.target);
  if (svg && iconIn(event.relatedTarget) !== svg && !linkOf(event.target)?.matches(':focus-visible')) leave(svg);
});
document.addEventListener('focusin', event => {
  const svg = iconIn(event.target);
  if (svg && (event.target as Element).matches(':focus-visible')) play(svg);
});
document.addEventListener('focusout', event => {
  const svg = iconIn(event.target);
  if (svg && !linkOf(event.target)?.matches(':hover')) leave(svg);
});
