import { Social } from '@/components/footer/social.tsx';
import Heart from 'phosphor-react/src/icons/Heart.tsx'
import pkg from '../../../package.json' assert { type: 'json' }

import styles from './footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.copyright}>Made with <Heart weight="fill" /> by yours truly</p>
      <Social />
      <p className={styles.version}>v{pkg.version}</p>
    </footer>
  )
}
