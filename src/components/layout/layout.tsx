import type { ReactNode } from 'react'

import '@/styles/globals.css'
import styles from './layout.module.css'

import { Header } from '@/components/header/header.tsx'
import { Footer } from '@/components/footer/footer.tsx'
import { Navigation } from '@/components/navigation/navigation.tsx'

interface Props {
  children: ReactNode;
  pathname: string;
  commits: number;
  showHeader?: boolean;
}

export function Layout({ children, commits, pathname, showHeader = true }: Props) {
  return (
    <div className={styles.container}>
      <Navigation pathname={pathname} />
      {showHeader && <Header commits={commits} className={styles.header} />}
      <main>
        {children}
      </main>
      <Footer />
    </div>
  )
}