import styles from './favorites.module.css'

type Favorite = {
  key: string;
  title: string;
  image: string;
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
        list.map(item => (<li key={item.key}>{item.title}</li>))
      }
    </ul>
  )
}
