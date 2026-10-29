import styles from './navigation.module.css'

import links from '@/assets/navigation.yaml'
import { Icon, isIconName } from '@/components/icon/icon.tsx'

type Link = {
  name: string;
  to: string;
}

interface Props {
  pathname: string;
}

const isActive = (link: Link, pathname: string) => {
  if (pathname === '') {
    return link.name === 'home'
  }
  return pathname === link.name || pathname.includes(link.name)
}

export function Navigation({ pathname }: Props) {
  return (
    <nav className={styles.navigation} data-headroom>
      <ul>
        {
          links.map((link: Link) => {
            const active = isActive(link, pathname)
            return (
              <li key={link.name} className={active ? styles.active : ''}>
                <a href={link.to}>
                  {isIconName(link.name) && <Icon name={link.name} active={active} />}
                  <span data-text={link.name}>{link.name}</span>
                </a>
              </li>
            )
          })
        }
      </ul>
    </nav>
  )
}
