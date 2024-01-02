import styles from './header.module.css'
import logo from '@/assets/logos/postman.svg'

interface Props {
  commits: number;
  className?: string;
}

export function Header({ commits, className }: Props) {
  const year = new Date().getFullYear()
  const frequency = <span className={styles.frequency}><strong>{commits} update{commits === 1 ? '' : 's'}</strong> in {year}</span>
  return (
    <header className={[styles.header, className].filter(Boolean).join(' ')}>
      <h1 className={styles.title}>Hi! I'm Dustin.</h1>
      <h2 className={styles.byline}>Product & Engineering Leader at <a className={styles.employer} href="https://getpostman.com" target="_blank"><img className={styles.logo} src={logo.src} alt="The logo of my employer Postman, an API Platform and REST Client" /> Postman</a></h2>
      <p>Welcome to my website! I update it... infrequently ({frequency}). I like to build things, teams, and products and occasionally <a href="/posts/">blog</a> about those topics. I live in San Francisco, CA with my lovely wife and son.</p>
    </header>
  )
}
