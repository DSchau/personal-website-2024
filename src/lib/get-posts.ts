import { getCollection, type CollectionEntry } from 'astro:content'
import { tagSlug } from '@/lib/tags'

type Post = CollectionEntry<'posts'>

export type Tag = {
  slug: string;
  label: string;
  posts: Post[];
}

// published posts (drafts show in dev), newest first
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => import.meta.env.PROD ? data.draft !== true : true)
  return posts.sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime())
}

// every tag used by a published post, most used first
export async function getTags(): Promise<Tag[]> {
  const tags = new Map<string, Tag>()
  for (const post of await getPosts()) {
    for (const label of post.data.tags) {
      const slug = tagSlug(label)
      if (!slug) continue
      const tag = tags.get(slug) ?? { slug, label, posts: [] }
      if (!tag.posts.includes(post)) tag.posts.push(post)
      tags.set(slug, tag)
    }
  }
  return [...tags.values()].sort((a, b) => b.posts.length - a.posts.length || a.label.localeCompare(b.label))
}
