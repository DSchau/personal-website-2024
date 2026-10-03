/**
 * Draws every engraved ocean on the site (the header, the 404, the /favorites
 * night sea) and sets it in motion: each [data-ocean] element carries its
 * config (see OceanConfig). With reduced motion: a single still frame.
 * Without JS, sea.tsx falls back to the prerendered /sea-ocean.svg.
 *
 * Redraws the ocean (ocean.ts) on a canvas laid exactly over the SVG, mapping
 * the SVG's viewBox + preserveAspectRatio "slice" onto the canvas by hand, so
 * the swells roll in toward you. Runs ~30fps, only while on screen. The 404's
 * bottle rides the surface: it rises, falls and tilts with the water under it.
 */
import { type OceanConfig, OceanField } from './ocean'

const INK = '#161616'

function start(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-ocean-canvas]')
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  const { ocean, box: BOX, align } = JSON.parse(root.dataset.ocean!) as OceanConfig
  const alignMid = align.startsWith('xMid')
  const field = new OceanField(ocean)

  const bottle = root.querySelector<SVGGElement>('[data-bottle]')
  const tilt = bottle?.querySelector<SVGGElement>('[data-bottle-tilt]')
  const bLine = Number(bottle?.dataset.bottle), bX = Number(bottle?.dataset.x)
  const bScale = tilt?.getAttribute('transform')?.match(/scale\(([\d.]+)\)/)?.[1] ?? '1'
  const sink = Number(bottle?.dataset.sink ?? 0)

  // viewBox → canvas pixels, matching preserveAspectRatio "xMaxYMax slice" / "xMidYMax slice"
  let k = 1, tx = 0, ty = 0, dpr = 1
  const resize = () => {
    const { width, height } = root.getBoundingClientRect()
    dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    k = Math.max(width / BOX.w, height / BOX.h)
    tx = alignMid ? (width - BOX.w * k) / 2 : width - BOX.w * k
    ty = height - BOX.h * k
  }
  resize()

  const draw = (t: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(k * dpr, 0, 0, k * dpr, (tx - BOX.x * k) * dpr, (ty - BOX.y * k) * dpr)
    ctx.strokeStyle = INK
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // batch by stroke width: one path per weight
    const paths = new Map<number, Path2D>()
    field.trace(t, ({ w, pts }) => {
      let p = paths.get(w)
      if (!p) paths.set(w, (p = new Path2D()))
      p.moveTo(pts[0], pts[1])
      for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1])
    })
    for (const [w, p] of paths) {
      ctx.lineWidth = w
      ctx.stroke(p)
    }
    if (bottle && tilt) {
      const here = field.surface(bX, bLine, t)
      const slope = (field.surface(bX + 8, bLine, t).y - field.surface(bX - 8, bLine, t).y) / 16
      bottle.setAttribute('transform', `translate(${bX} ${(here.y + sink).toFixed(2)})`)
      tilt.setAttribute('transform', `rotate(${((Math.atan(slope) * 180) / Math.PI - 6).toFixed(2)}) scale(${bScale})`)
    }
  }

  let raf = 0, last = 0, t = 0
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    // ~30fps is plenty for swells, and halves the work
    if (now - last < 31) return
    t += Math.min(0.1, (now - last) / 1000)
    last = now
    draw(t)
  }
  draw(0)
  // re-fit (and redraw, so a still frame stays sharp) on resize; with reduced motion that's all we do
  new ResizeObserver(() => { resize(); draw(t) }).observe(root)
  if (reduced) return
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !raf) { last = performance.now(); raf = requestAnimationFrame(frame) }
    else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0 }
  }).observe(root)
}

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
document.querySelectorAll<HTMLElement>('[data-ocean]').forEach(start)
