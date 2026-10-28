/**
 * Lets a link icon's hover gesture play to the end even if the pointer leaves
 * (or focus moves) partway through, so it never snaps back mid-motion. Every
 * gesture ends on the resting drawing, so dropping the flag afterwards is seamless.
 * Without this script the gestures still play on hover/focus via CSS alone.
 */
function play(event: Event) {
  const link = (event.target as Element | null)?.closest?.('a')
  const icon = link?.querySelector<SVGSVGElement>('svg[data-icon]')
  if (!icon || 'playing' in icon.dataset) return

  icon.dataset.playing = ''
  Promise.allSettled(icon.getAnimations({ subtree: true }).map(animation => animation.finished)).then(() => {
    delete icon.dataset.playing
  })
}

document.addEventListener('pointerover', play)
document.addEventListener('focusin', play)
