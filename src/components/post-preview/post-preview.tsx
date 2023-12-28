import { type CollectionEntry } from "astro:content"
import { Image } from 'astro:assets';
import styles from './post-preview.module.css';

type Post = CollectionEntry<"posts">

interface Props {
  post: Post;
  showImage?: boolean;
}

export function PostPreview({ post, showImage }: Props) {
  return (
    <div className={styles.post}>
      <p className={styles.date}>{new Date(post.data.date).toLocaleDateString("en-us")}</p>
      <h3 className={styles.title}>{post.data.title}</h3>
      {showImage && post.data.featuredImage && (
        <img src={post.data.featuredImage.src} alt={`Image for ${post.data.title}`} />
      )}
      <p className={styles.excerpt}>{post.data.excerpt}</p>
      <a className={styles.link} href={`/posts/${post.slug}`}>Read more</a>
    </div>
  )
}
