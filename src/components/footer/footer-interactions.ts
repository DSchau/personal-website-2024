/**
 * Progressive enhancement for the footer scene: a wind gust when the cursor
 * enters, and grass that parts around the cursor. CSS handles everything else.
 */
import { walk } from './family-walk'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

function init() {
  const svg = document.querySelector<SVGSVGElement>('[data-footer-scene]')
  const grass = svg?.querySelector<SVGGElement>('[data-footer-grass]')
  if (!svg || !grass || reduced.matches) return
  const family = walk(svg)

  const tufts = [...grass.querySelectorAll<SVGGElement>('[data-x]')].map(el => ({
    el,
    x: Number(el.dataset.x),
    y: Number(el.dataset.y),
    pushed: false,
  }))

  svg.addEventListener('pointerenter', () => {
    grass.classList.remove('gust')
    void grass.getBBox() // restart the animation
    grass.classList.add('gust')
  })

  const pt = svg.createSVGPoint()
  const R = 150
  let raf = 0
  let last: PointerEvent | undefined

  svg.addEventListener('pointermove', e => {
    last = e
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      const ctm = svg.getScreenCTM()
      if (!last || !ctm) return
      pt.x = last.clientX
      pt.y = last.clientY
      const p = pt.matrixTransform(ctm.inverse())
      family.greet(p.x, p.y)
      for (const t of tufts) {
        const dx = t.x - p.x
        const d = Math.hypot(dx, (t.y - p.y) * 0.6)
        if (d < R) {
          const f = (1 - d / R) ** 1.5
          t.el.style.transform = `skewX(${(Math.sign(dx) * -f * 38).toFixed(1)}deg) scaleY(${(1 - f * 0.25).toFixed(2)})`
          t.pushed = true
        } else if (t.pushed) {
          t.el.style.transform = ''
          t.pushed = false
        }
      }
    })
  })

  // a tap says hello too (touch has no hover)
  svg.addEventListener('pointerdown', e => {
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(ctm.inverse())
    family.greet(p.x, p.y, 22)
  })

  svg.addEventListener('pointerleave', () => {
    for (const t of tufts) {
      t.el.style.transform = ''
      t.pushed = false
    }
  })
}

init()
