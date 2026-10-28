/**
 * "Headroom" for the sticky nav: it slides away while you scroll down to read
 * and comes back as soon as you scroll up. It always shows near the top of the
 * page and whenever focus moves into it, so keyboard users never tab into a
 * hidden bar. Without this script the nav just stays stuck.
 */
const nav = document.querySelector<HTMLElement>('nav[data-headroom]')

if (nav) {
  // ignore tiny scroll jitter (trackpad wobble, iOS bounce)
  const TOLERANCE = 8
  let lastY = window.scrollY

  const show = () => delete nav.dataset.hidden

  window.addEventListener('scroll', () => {
    const y = window.scrollY
    const delta = y - lastY

    if (y <= nav.offsetHeight) {
      show()
    } else if (Math.abs(delta) < TOLERANCE) {
      // keep lastY so slow scrolls still add up past the tolerance
      return
    } else if (delta > 0 && !nav.contains(document.activeElement)) {
      nav.dataset.hidden = ''
    } else if (delta < 0) {
      show()
    }

    lastY = y
  }, { passive: true })

  nav.addEventListener('focusin', show)
}
