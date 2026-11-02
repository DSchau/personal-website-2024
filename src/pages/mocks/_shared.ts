import type { CollectionEntry } from 'astro:content'

type Post = CollectionEntry<'posts'>

export const postHref = (post: Post) => post.data.canonicalLink ?? `/posts/${post.id}/`
export const year = (post: Post) => new Date(post.data.date).getUTCFullYear()
export const shortTitle = (post: Post) => post.data.title.replace(/^"|"$/g, '')
