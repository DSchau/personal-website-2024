import type { RSSFeedItem, RSSOptions } from '@astrojs/rss';

// Structurally matches CollectionEntry<'posts'>, without importing `astro:content`,
// so the feed logic can also be loaded directly by Node in tests.
export interface FeedPost {
  id: string;
  data: {
    title: string;
    date: Date;
    draft?: boolean;
    canonicalLink?: string;
    excerpt?: string;
    tags: string[];
  };
}

export interface FeedOptions {
  title: string;
  description: string;
  site: URL | string;
  posts: readonly FeedPost[];
}

// Drafts are left out in every environment, unlike the posts index, which shows them in dev.
export function isPublished(post: FeedPost): boolean {
  return post.data.draft !== true;
}

export function getPostUrl(post: FeedPost, site: URL | string): string {
  return new URL(post.data.canonicalLink || `/posts/${post.id}/`, site).href;
}

export function getFeedItems(posts: readonly FeedPost[], site: URL | string): RSSFeedItem[] {
  return posts
    .filter(isPublished)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .map((post) => {
      const item: RSSFeedItem = {
        title: post.data.title,
        pubDate: post.data.date,
        link: getPostUrl(post, site)
      };
      if (post.data.excerpt) item.description = post.data.excerpt;
      if (post.data.tags.length > 0) item.categories = [...post.data.tags];
      return item;
    });
}

export function getFeedOptions({ title, description, site, posts }: FeedOptions): RSSOptions {
  return { title, description, site, items: getFeedItems(posts, site) };
}
