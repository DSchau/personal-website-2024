import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import metayaml from '@/assets/meta.yaml';
import { getFeedOptions } from '@/lib/rss-feed';

export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    throw new Error('The RSS feed needs `site` to be set in astro.config.mjs');
  }
  const posts = await getCollection('posts');
  return rss(getFeedOptions({ title: metayaml.title, description: metayaml.description, site, posts }));
};
