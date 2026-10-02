import styles from './header.module.css'
import logo from '@/assets/logos/adapt.svg'

interface Props {
  commits: number;
  showCopy?: boolean;
  className?: string;
  /** page copy as HTML (Layout.astro renders it from inline markdown) */
  copy?: string;
  byline?: string;
  photo?: boolean;
}

export function Header({ commits, showCopy = true, copy: customizedCopy, byline: customizedByline, className, photo = false }: Props) {
  const year = new Date().getFullYear()
  const frequency = <span className={styles.frequency}><strong>{commits} update{commits === 1 ? '' : 's'}</strong> in {year}</span>
  const updateWord = commits >= 10 ? 'occasionally' : 'infrequently'
  const copy = customizedCopy ? customizedCopy : (
    <>
      Welcome to my website! I update it... {updateWord} ({frequency}). I like to build things, teams, and products and occasionally <a href="/posts/">write</a> about those topics. I live in San Francisco, California with my lovely wife and two children.
    </>
  )
  const byline = customizedByline !== undefined ? customizedByline : (
    <>
      Product & Engineering Leader at <a className={styles.employer} href="https://adapt.com" target="_blank"><img className={styles.logo} src={logo.src} alt="The logo of my employer Adapt, an AI-native operating system for teams" /> Adapt</a>
    </>
  )
  const titleBlock = (
    <>
      <h1 className={styles.title}>Hi! I'm Dustin.</h1>
      {byline && <h2 className={styles.byline}>{byline}</h2>}
      {showCopy && (customizedCopy ? <p dangerouslySetInnerHTML={{ __html: customizedCopy }} /> : <p>{copy}</p>)}
    </>
  )

  return (
    <header className={[styles.header, className].filter(Boolean).join(' ')}>
      {photo ? (
        <div className={styles.withPhoto}>
          <img
            className={styles.photo}
            src="https://dschau-website.imgix.net/me.jpeg?w=128&h=128&fit=crop&auto=format"
            width={64}
            height={64}
            alt="Headshot portrait of Dustin Schau"
          />
          <div>{titleBlock}</div>
        </div>
      ) : titleBlock}
    </header>
  )
}
