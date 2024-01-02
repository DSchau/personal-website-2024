import { type FormEvent, useState } from 'react'

import styles from './contact-form.module.css';

enum Status {
  idle = "IDLE",
  in_progress = "IN_PROGRESS",
  success = "SUCCESS",
  failed = "FAILED"
}

const delay = (duration: number) => new Promise(resolve => {
  setTimeout(resolve, duration)
})

export function ContactForm() {
  const [status, setStatus] = useState(Status.idle)

  async function submit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();

    setStatus(Status.in_progress)

    const formData = new FormData(ev.target as HTMLFormElement)

    const response = await fetch("/api/email", {
      method: 'POST',
      body: formData
    })
    if (response.ok) {
      setStatus(Status.success)
  
      await delay(5000)

      setStatus(Status.idle)
    } else {
      setStatus(Status.failed)
    }
  }

  const getButtonText = () => {
    switch (status) {
      case Status.success:
        return 'Message sent. Thanks!';
      case Status.failed:
          return 'Failed. E-mail me@dustinschau.com';
      case Status.in_progress:
        return 'Sending message';
      default:
        return 'Send message'
    }
  }
  return (
    <form className={styles.container} name="contact-me" action="/api/email" method="POST" onSubmit={submit}>
      <div className={styles.row}>
        <input name="name" type="text" placeholder="Your name" required />
        <input name="email" type="email" placeholder="Your e-mail" required />
      </div>
      <div className={styles.row}>
        <textarea name="message" className={styles.message} placeholder="Your message" required></textarea>
      </div>
      <div className={styles.row}>
        <button className={styles.button} type="submit" disabled={status !== Status.idle} data-state={status}>
          {getButtonText()}
        </button>
      </div>
    </form>
  )
}
