import type { APIRoute } from 'astro'

import { NIGHT_OCEAN, VIEW } from '@/components/moonlit-sea/scene'
import { oceanFile } from '@/components/sea/ocean-file'

export const prerender = true

/** the /favorites night sea's first frame, for visitors without JS (see ocean-file.ts) */
export const GET: APIRoute = () => oceanFile({ ocean: NIGHT_OCEAN, box: VIEW })
