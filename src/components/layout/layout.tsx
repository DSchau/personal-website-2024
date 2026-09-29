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
  showCopy?: boolean;
  updated: string | undefined;
  copy: string | undefined
  byline: string | undefined;
  photo?: boolean;
}

export function Layout({ children, commits, pathname, showCopy, showHeader = true, copy, byline, updated, photo }: Props) {
  return (
    <div className={styles.container}>
      <Navigation pathname={pathname} />
      {showHeader && <Header commits={commits} className={styles.header} showCopy={showCopy} copy={copy} byline={byline} photo={photo} />}
      <main>
        {children}
      </main>
      <Footer updated={updated} />
    </div>
  )
}