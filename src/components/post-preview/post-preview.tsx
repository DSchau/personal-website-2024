import { type CollectionEntry } from "astro:content"
import { Image } from 'astro:assets';
import styles from './post-preview.module.css';

type Post = CollectionEntry<"posts">

interface Props {
  item: Post;
  showImage?: boolean;
}

export function PostPreview({ item, showImage }: Props) {
  const slug = `/posts/${item.slug}`;
  return (
    <div className={styles.post}>
      <p className={styles.date}>{new Date(item.data.date).toLocaleDateString("en-us")}</p>
      <h3 className={styles.title}>
        <a href={slug}>{item.data.title}</a>
      </h3>
      {showImage && item.data.featuredImage && (
        <img src={item.data.featuredImage.src} alt={`Image for ${item.data.title}`} />
      )}
      <p className={styles.excerpt}>{item.data.excerpt}</p>
      <a className={styles.link} href={slug}>Read more</a>
    </div>
  )
}
