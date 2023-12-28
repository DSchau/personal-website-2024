import styles from './project.module.css';
import { GoStarFill, GoRepoForked } from "react-icons/go";


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
      <p className={styles.excerpt}>{item.description}</p>
      <div className={styles.footer}>
        <span className="stars">
          <GoStarFill /> {item.stargazers.totalCount}
        </span>
        <span className="forks">
          <GoRepoForked /> {item.forks.totalCount}
        </span>
      </div>
    </div>
  )
}
