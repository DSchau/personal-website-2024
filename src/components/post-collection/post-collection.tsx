import { type CollectionEntry } from 'astro:content';

import { PostPreview } from '@/components/post-preview/post-preview'
import styles from './post-collection.module.css';

type Post = CollectionEntry<"posts">

interface Props {
  posts: Post[];
}

export function PostCollection({ posts }: Props) {
  return (
    <ul className={styles.collection}>
      {
        posts.map((post: Post) => (
          <PostPreview key={post.id} post={post} />
        ))
      }
    </ul>
  )
  return null
}
