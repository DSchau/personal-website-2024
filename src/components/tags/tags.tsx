import styles from './tags.module.css'

type Tag = {
  label: string;
  href?: string;
}

interface Props {
  list?: Tag[]
}

export function Tags({ list }: Props) {
  if (list?.length === 0) {
    return null
  }
  return (
    <ul className={styles.tags}>
      {
        (list || []).map(item => {
          const content = item.href ? <a href={item.href}>{item.label}</a> : item.label
          return (
            <li key={item.label} className={styles.tag}>
              {content}
            </li>
          )
        })
      }
    </ul>
  )
}
