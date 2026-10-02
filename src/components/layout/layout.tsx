import type { ReactNode } from 'react'

import '@/styles/globals.css'
import styles from './layout.module.css'

import { Header } from '@/components/header/header.tsx'
import { Footer } from '@/components/footer/footer.tsx'
import { Navigation } from '@/components/navigation/navigation.tsx'
import { Sea } from '@/components/sea/sea.tsx'
import { Writing } from '@/components/writing/writing.tsx'
import { Trail } from '@/components/trail/trail.tsx'
import { MoonlitSea } from '@/components/moonlit-sea/moonlit-sea.tsx'

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
  /** a large display heading above the scene + page content (e.g. the 404) */
  display?: string;
  /** a full-bleed illustration under the header: the 404's sea (with a message in a bottle), the /posts writing-into-waves, the /work trail, or the /favorites moonlit sea */
  scene?: 'lost-at-sea' | 'writing' | 'trail' | 'moonlit-sea';
}

export function Layout({ children, commits, totalCommits, pathname, showCopy, showHeader = true, copy, byline, updated, photo, display, scene }: Props) {
  return (
    <>
      <div className={styles.container}>
        <Navigation pathname={pathname} />
        {showHeader && <Header commits={commits} className={styles.header} showCopy={showCopy} copy={copy} byline={byline} photo={photo} />}
        {display && <h1 className={styles.display}>{display}</h1>}
        {pathname === '' && <Sea />}
        {scene === 'lost-at-sea' && <Sea bottle />}
        {scene === 'writing' && <Writing />}
        {scene === 'trail' && <Trail />}
        {scene === 'moonlit-sea' && <MoonlitSea />}
        <main>
          {children}
        </main>
      </div>
      {/* outside the container so it's full-bleed and identical on every page */}
      <Footer updated={updated} commits={totalCommits} />
    </>
  )
}