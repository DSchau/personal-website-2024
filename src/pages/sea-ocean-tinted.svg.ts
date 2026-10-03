import type { APIRoute } from 'astro'

import { HOME_OCEAN, SEA_BOX } from '@/components/sea/ocean'
import { oceanFile } from '@/components/sea/ocean-file'
import { WATER_INK } from '@/components/sea/wash'

export const prerender = true

/** the homepage ocean's first frame in its indigo ink, for visitors without JS (see ocean-file.ts, wash.ts) */
export const GET: APIRoute = () => oceanFile({ ocean: HOME_OCEAN, box: SEA_BOX, color: WATER_INK })
