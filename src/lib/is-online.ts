const TIMEOUT_THRESHOLD = 2500

let cachedOnlineStatus: boolean | undefined

/*
 * Naive function that checks google.com status
 * presumes google and network will respond in <2.5s
 */
export async function isOnline(): Promise<boolean> {
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
