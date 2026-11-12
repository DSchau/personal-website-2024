import styles from './project.module.css';
import { Icon } from '@/components/icon/icon.tsx';

import { Tags } from '@/components/tags/tags.tsx';

interface Props {
  createdAt: string;
  name: string;
  url: string;
  description: string;
  repositoryTopics: {
    nodes: {
      topic: {
        name: string;
      }
    }[]
  }
  stargazers: {
    totalCount: number;
  }
  forks: {
    totalCount: number
  }
}

export function Project({ createdAt, description, name, url, repositoryTopics, stargazers, forks }: Props) {
  return (
    <div className={styles.project}>
      <h3 className={styles.header}>
        <p className={styles.date}>{new Date(createdAt).toLocaleDateString("en-us", {timeZone: 'UTC'})}</p>
        <a href={url}>{name}</a>
      </h3>
      <div className={styles.content}>
        <p className={styles.description}>{description}</p>
        <Tags list={repositoryTopics?.nodes.map(node => {
          return {
            label: node.topic.name
          }
        })} />
      </div>
      <div className={styles.footer}>
        <span className="stars">
          <Icon name="star" />{stargazers?.totalCount || 0}
        </span>
        <span className="forks">
           <Icon name="fork" />{forks?.totalCount || 0}
        </span>
      </div>
    </div>
  )
}
