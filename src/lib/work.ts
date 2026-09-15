import type { ImageMetadata } from 'astro'
import { marked } from 'marked'

import work from '@/assets/work.yaml'
import adapt from '@/assets/logos/adapt.svg'
import postman from '@/assets/logos/postman.svg'
import netlify from '@/assets/logos/netlify.svg'
import gatsby from '@/assets/logos/gatsby.svg'
import opi from '@/assets/logos/opi.png'
import up from '@/assets/logos/up.svg'

export interface WorkExperience {
	title: string
	location: string
	employer: string
	logo?: string
	date: string
	description: string
	highlights?: string[]
}

export interface ProcessedWorkExperience {
	title: string
	location: string
	employer: string
	date: string
	description: string
	highlights?: string[]
}

export const WORK_LOGOS: Record<string, ImageMetadata> = {
	Adapt: adapt,
	Postman: postman,
	Netlify: netlify,
	Gatsby: gatsby,
	'Object Partners': opi,
	'Union Pacific': up,
}

export function getWorkHistory(): ProcessedWorkExperience[] {
	return (work as WorkExperience[]).map((experience) => ({
		...experience,
		description: String(marked.parseInline(experience.description)),
		highlights: experience.highlights?.map((highlight) => String(marked.parseInline(highlight))),
	}))
}
