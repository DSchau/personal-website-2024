import styles from './favorites.module.css'

type Favorite = {
  key: string;
  title: string;
  image: string;
  subtitle?: string;
}

interface FavoriteProps {
  list: Favorite[]
}

export function Favorites({ list }: FavoriteProps) {
  if (!list || list.length === 0) {
    return null
  }
  return (
    <ul className={styles.container}>
      {
        list.map(item => (
          <li className={styles.item} key={item.key}>
            {(/^https?/.test(item.image) && (<img src={item.image} alt={`${item.title}${item.subtitle ? ` by ${item.subtitle} poster` : ''}`} />))}
            <span className={styles.title}>
              {item.title}
              {item.subtitle && <span className={styles.subtitle}>{item.subtitle}</span>}
            </span>
          </li>
        ))
      }
    </ul>
  )
}
