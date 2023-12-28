import { Social } from '@/components/footer/social.tsx';
import { FaHeart } from 'react-icons/fa6'

import styles from './footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <p>Made with <FaHeart /> by yours truly</p>
      <Social />
    </footer>
  )
}
