import type { APIRoute } from 'astro'

import { HOME_OCEAN, SEA_BOX } from '@/components/sea/ocean'
import { oceanFile } from '@/components/sea/ocean-file'

export const prerender = true

/** the header / 404 ocean's first frame, for visitors without JS (see ocean-file.ts) */
export const GET: APIRoute = () => oceanFile({ ocean: HOME_OCEAN, box: SEA_BOX })
