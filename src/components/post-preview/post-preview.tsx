import { type CollectionEntry } from "astro:content"
import type { CSSProperties } from 'react';

import marker from '@/components/marker/marker.module.css'
import styles from './post-preview.module.css';

type Post = CollectionEntry<"posts">

interface Props {
  showImage?: boolean;
  id: string;
  data: Post["data"];
}

export function PostPreview({ id, data, showImage }: Props) {
  const slug = `/posts/${id}`;
  return (
    <div className={styles.post}>
      <p className={styles.date}>{new Date(data.date).toLocaleDateString("en-us", {timeZone: 'UTC'})}</p>
      <h3 className={styles.title}>
        <a href={slug}>{data.title}</a>
      </h3>
      {data.tags.length > 0 && (
        <p className={styles.tags}>
          {data.tags.map(tag => <span key={tag}>{tag}</span>)}
        </p>
      )}
      {showImage && data.featuredImage && (
        <img src={data.featuredImage.src} alt={`Image for ${data.title}`} />
      )}
      <p className={styles.excerpt}>{data.excerpt}</p>
      <a className={styles.link} href={slug}>
        <span className={`${marker.marker} ${marker.resting}`} style={{ '--len': 16 } as CSSProperties}>Continue reading</span>
      </a>
    </div>
  )
}
