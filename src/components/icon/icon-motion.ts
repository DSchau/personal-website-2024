import { CHANNELS, easeInOut, gestures, lerpFrame, restFrame, sample, type Frame, type Gesture } from './icon-gestures.ts';

/*
  Plays the link icons' hover gestures (icon-gestures.ts) from one
  requestAnimationFrame loop, writing each part's transform straight onto its
  group. A gesture plays to the end even if the pointer leaves, and
  `data-playing` keeps the icon's colour in until it lands. Hovering again late
  in a gesture blends from the pose on screen into a fresh run, so the motion
  never restarts or snaps. Parts marked `echo` leave fading copies of
  themselves a few frames behind, a comet smear that shows where they've been.
*/

/** stretches every gesture's clock so the motion has room to breathe; 1 plays them as authored */
const TEMPO = 1.4;
/** blend time when a gesture is retriggered from a frozen pose */
const BLEND = 0.2;
/** [seconds behind, strength] for each echo */
const ECHOES = [[0.035, 0.32], [0.07, 0.18], [0.105, 0.08]] as const;

interface Run {
  svg: SVGSVGElement;
  gesture: Gesture;
  start: number;
  from?: Frame;
  parts: (SVGGElement | null)[];
  echoes: SVGGElement[][];
}

const runs = new Map<SVGSVGElement, Run>();
let raf = 0;

const motion = matchMedia('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)');

const poseAt = (run: Run, t: number): Frame => {
  const frame = sample(run.gesture, t);
  return run.from && t < BLEND ? lerpFrame(run.from, frame, easeInOut(t / BLEND)) : frame;
};

const paint = (g: SVGGElement, f: Frame, k: number, [ox, oy]: [number, number], fade = 1) => {
  const [x, y, r, sx, sy, sk, o, d0, d1] = f.slice(k * CHANNELS, (k + 1) * CHANNELS) as [number, number, number, number, number, number, number, number, number];
  g.setAttribute('transform', `translate(${ox + x} ${oy + y}) rotate(${r}) skewY(${sk}) scale(${sx} ${sy}) translate(${-ox} ${-oy})`);
  const drawn = d1 - d0;
  g.style.opacity = String(o * fade);
  const ink = g.querySelector<SVGPathElement>(':scope > path[pathLength]');
  if (!ink) return;
  // a zero-length dash still draws the round caps as a dot
  ink.style.opacity = drawn <= 0.001 ? '0' : '';
  if (drawn >= 0.999) {
    ink.style.strokeDasharray = '';
    ink.style.strokeDashoffset = '';
  } else {
    ink.style.strokeDasharray = `${Math.max(drawn, 0)} 2`;
    ink.style.strokeDashoffset = String(-d0);
  }
};

/** how far a part has moved between two frames, in rough viewBox units */
const distance = (a: Frame, b: Frame, k: number) => {
  const i = k * CHANNELS;
  const d = (j: number) => Math.abs((a[i + j] ?? 0) - (b[i + j] ?? 0));
  return Math.hypot(d(0), d(1)) + d(2) * 0.08 + (d(3) + d(4)) * 6;
};

const draw = (run: Run, t: number) => {
  const frame = poseAt(run, t);
  const specs = Object.values(run.gesture.parts);
  specs.forEach((spec, k) => {
    const part = run.parts[k];
    if (part) paint(part, frame, k, spec.origin);
    run.echoes[k]?.forEach((echo, e) => {
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
  draw(run, 0);
  raf ||= requestAnimationFrame(tick);
};

const stop = (run: Run) => {
  for (const part of run.parts) {
    part?.removeAttribute('transform');
    part?.style.removeProperty('opacity');
    const ink = part?.querySelector<SVGPathElement>(':scope > path[pathLength]');
    ink?.style.removeProperty('stroke-dasharray');
    ink?.style.removeProperty('stroke-dashoffset');
    ink?.style.removeProperty('opacity');
  }
  for (const echo of run.echoes.flat()) echo.remove();
  runs.delete(run.svg);
  delete run.svg.dataset.playing;
};

function tick() {
  const now = performance.now();
  for (const run of runs.values()) {
    const t = (now - run.start) / 1000 / TEMPO;
    if (!run.svg.isConnected || t >= run.gesture.duration) stop(run);
    else draw(run, t);
  }
  raf = runs.size ? requestAnimationFrame(tick) : 0;
}

const play = (svg: SVGSVGElement) => {
  const gesture = gestures[svg.dataset.icon ?? ''];
  if (!gesture || !motion.matches) return;
  const now = performance.now();
  const run = runs.get(svg);
  if (!run) return start(svg, gesture, now, restFrame(gesture));
  // let it play out; late in the gesture, blend from where it is into a fresh run
  const t = (now - run.start) / 1000 / TEMPO;
  if (t < run.gesture.duration * 0.6) return;
  const from = poseAt(run, t);
  stop(run);
  start(svg, gesture, now, from);
};

const iconIn = (target: EventTarget | null) =>
  (target as Element | null)?.closest?.('a')?.querySelector<SVGSVGElement>('svg[data-icon]') ?? null;

document.addEventListener('pointerover', event => {
  const svg = iconIn(event.target);
  // only when the pointer arrives from outside the link, not moving between its children
  if (svg && iconIn(event.relatedTarget) !== svg) play(svg);
});
document.addEventListener('focusin', event => {
  const svg = iconIn(event.target);
  if (svg && (event.target as Element).matches(':focus-visible')) play(svg);
});
