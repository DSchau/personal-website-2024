import rss from '@astrojs/rss'
import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'

import metayaml from '@/assets/meta.yaml'

export const prerender = true

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    throw new Error('The RSS feed needs `site` to be set in astro.config.mjs')
  }

  const posts = (await getCollection('posts', ({ data }) => data.draft !== true))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())

  return rss({
    title: metayaml.title,
    description: metayaml.description,
    site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.excerpt,
      categories: post.data.tags,
      // cross-posted entries point at the original article
      link: post.data.canonicalLink ?? `/posts/${post.id}/`,
    })),
    customData: '<language>en-us</language>',
  })
}
