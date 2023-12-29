import { Social } from '@/components/footer/social.tsx';
import { Heart } from 'phosphor-react'

import styles from './footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <p>Made with <Heart weight="fill" /> by yours truly</p>
      <Social />
    </footer>
  )
}
