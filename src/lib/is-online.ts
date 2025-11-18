const TIMEOUT_THRESHOLD = 2500

let cachedOnlineStatus: boolean | undefined

/*
 * Naive function that checks google.com status
 * presumes google and network will respond in <2.5s
 */
export async function isOnline(): Promise<boolean> {
  // During build time (CF_PAGES or import.meta.env.PROD), assume we're online
  // This prevents excessive requests during Cloudflare Pages builds
  if (import.meta.env.PROD || process.env.CF_PAGES) {
    return true
  }

  if (typeof cachedOnlineStatus === 'boolean') {
    return cachedOnlineStatus
  }
  try {
    const data = await Promise.race(
      [
        fetch('https://google.com'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Offline, timeout elapsed')), TIMEOUT_THRESHOLD))
      ]
    ) as Response

    if (data.ok) {
      cachedOnlineStatus = true
      return true
    }

    cachedOnlineStatus = false
    return false
  } catch (e) {
    console.error(e)
    cachedOnlineStatus = false

    return false
  }
}
