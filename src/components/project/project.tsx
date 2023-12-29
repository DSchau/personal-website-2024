import styles from './project.module.css';
import { ArrowArcLeft, Star } from 'phosphor-react'

interface Props {
  item: any;
}

export function Project({ item }: Props) {
  return (
    <div className={styles.project}>
      <h3 className={styles.header}>
        <p className={styles.date}>{new Date(item.createdAt).toLocaleDateString("en-us")}</p>
        <a href={item.url}>{item.name}</a>
      </h3>
      <div className={styles.content}>
        <p>{item.description}</p>
        {
          item.repositoryTopics?.nodes?.length > 0 && (
            <ul className={styles.topics}>
              {item.repositoryTopics.nodes.map(({ topic }: any) => {
                return <li className={styles.topic} key={topic.name}>{topic.name}</li>
              })}
            </ul>
          )
        }
  
      </div>
      <div className={styles.footer}>
        <span className="stars">
          <Star /> {item.stargazers.totalCount}
        </span>
        <span className="forks">
           <ArrowArcLeft /> {item.forks.totalCount}
        </span>
      </div>
    </div>
  )
}
