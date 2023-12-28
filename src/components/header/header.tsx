import styles from './header.module.css'
import logo from './assets/postman.svg'

export function Header() {
  return (
    <header className={styles.header}>
      <h1>Hi! I'm Dustin.</h1>
      <h2 className={styles.byline}>Product & Engineering Leader at <a className={styles.employer} href="https://getpostman.com" target="_blank"><img className={styles.logo} src={logo.src} alt="The logo of my employer Postman, an API Platform and REST Client" /> Postman</a></h2>
      <p>Welcome to my website! I update it... infrequently. I like to build things, teams, and products and occasionally blog about each.</p>
    </header>
  )
}
