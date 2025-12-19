/**
 * Server Wake-up Utility
 *
 * This utility pings the backend server as soon as the frontend starts loading.
 * On Render's free tier, services spin down after inactivity. By sending a
 * wake-up ping immediately, we can start the backend spinning up while the
 * frontend is still loading, reducing perceived wait time for users.
 */

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'

interface WakeUpResult {
  success: boolean
  latency?: number
  status?: string
  error?: string
}

let wakeUpPromise: Promise<WakeUpResult> | null = null
let lastWakeUpTime: number | null = null
const WAKEUP_COOLDOWN = 30000 // Don't ping again if we pinged within 30 seconds

/**
 * Pings the server health endpoint to wake it up.
 * This is idempotent - multiple calls will return the same promise
 * if a wake-up is already in progress.
 */
export const wakeUpServer = async (): Promise<WakeUpResult> => {
  // If we recently woke up the server, skip
  if (lastWakeUpTime && Date.now() - lastWakeUpTime < WAKEUP_COOLDOWN) {
    return { success: true, status: 'recently_pinged' }
  }

  // If a wake-up is already in progress, return that promise
  if (wakeUpPromise) {
    return wakeUpPromise
  }

  const startTime = Date.now()

  wakeUpPromise = (async () => {
    try {
      console.log('[ServerWakeup] Pinging server to wake it up...')

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s timeout for cold starts

      const response = await fetch(`${SERVER_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const latency = Date.now() - startTime
      lastWakeUpTime = Date.now()

      if (response.ok) {
        console.log(`[ServerWakeup] Server is awake! (${latency}ms)`)
        return { success: true, latency, status: 'ok' }
      } else {
        console.warn(`[ServerWakeup] Server responded with status ${response.status}`)
        return { success: false, latency, status: `http_${response.status}` }
      }
    } catch (error) {
      const latency = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (errorMessage.includes('abort')) {
        console.warn('[ServerWakeup] Request timed out (server may still be starting)')
        return { success: false, latency, error: 'timeout' }
      }

      console.error('[ServerWakeup] Failed to reach server:', errorMessage)
      return { success: false, latency, error: errorMessage }
    } finally {
      wakeUpPromise = null
    }
  })()

  return wakeUpPromise
}

/**
 * Background wake-up that doesn't block - fire and forget
 */
export const wakeUpServerBackground = (): void => {
  wakeUpServer().catch(() => {
    // Silently ignore errors in background mode
  })
}

/**
 * Check if the server appears to be awake based on recent pings
 */
export const isServerAwake = (): boolean => {
  return lastWakeUpTime !== null && Date.now() - lastWakeUpTime < WAKEUP_COOLDOWN
}

/**
 * Get the server URL for display purposes
 */
export const getServerUrl = (): string => SERVER_URL
