import { compactPaths } from '@/components/footer/compact-path'
import { type OceanConfig, oceanSvg } from './ocean'

/**
 * An ocean's first frame as a standalone SVG file, for visitors without JS
 * (each scene shows it in a <noscript>; with JS, ocean-motion.ts draws it on
 * a canvas instead). Served as a cached file rather than inlined, so it
 * doesn't weigh down every page's HTML.
 */
export const oceanFile = ({ ocean, box }: Pick<OceanConfig, 'ocean' | 'box'>) =>
  new Response(
    compactPaths(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${box.w}" height="${box.h}">` +
      `<g fill="none" stroke="#161616" stroke-linecap="round" stroke-linejoin="round">${oceanSvg(ocean, 0)}</g></svg>`,
    ),
    { headers: { 'Content-Type': 'image/svg+xml' } },
  )
