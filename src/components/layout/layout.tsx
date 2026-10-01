import type { ReactNode } from 'react'

import '@/styles/globals.css'
import styles from './layout.module.css'

import { Header } from '@/components/header/header.tsx'
import { Footer } from '@/components/footer/footer.tsx'
import { Navigation } from '@/components/navigation/navigation.tsx'
import { HeaderScene } from '@/components/header-scene/header-scene.tsx'

interface Props {
  children: ReactNode;
  pathname: string;
  commits: number;
  totalCommits: number;
  showHeader?: boolean;
  showCopy?: boolean;
  updated: string | undefined;
  copy: string | undefined
  byline: string | undefined;
  photo?: boolean;
}

export function Layout({ children, commits, totalCommits, pathname, showCopy, showHeader = true, copy, byline, updated, photo }: Props) {
  return (
    <>
      <div className={styles.container}>
        <Navigation pathname={pathname} />
        {showHeader && <Header commits={commits} className={styles.header} showCopy={showCopy} copy={copy} byline={byline} photo={photo} />}
        {pathname === '' && <HeaderScene />}
        <main>
          {children}
        </main>
      </div>
      {/* outside the container so it's full-bleed and identical on every page */}
      <Footer updated={updated} commits={totalCommits} />
    </>
  )
}