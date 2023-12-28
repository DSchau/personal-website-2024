import { navigation } from './navigation.module.css'

import links from '@/assets/navigation.yaml'

export function Navigation() {
  return (
    <nav className={navigation}>
      <ul>
        {
          links.map(link => (
            <li key={link.name}>
              <a href={link.to}>{link.name}</a>
            </li>
          ))
        }
      </ul>
    </nav>
  )
}
