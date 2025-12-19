'use client'

import { useSyncExternalStore, useCallback } from 'react'

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'

// Module-level state
type WakeUpStatus = 'idle' | 'waking' | 'awake' | 'error'

interface WakeUpState {
  status: WakeUpStatus
  latency: number | null
  error: string | null
}

let state: WakeUpState = { status: 'idle', latency: null, error: null }
const listeners: Set<() => void> = new Set()
let wakeUpStarted = false

function notifyListeners() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): WakeUpState {
  return state
}

function getServerSnapshot(): WakeUpState {
  // On server, return idle state
  return { status: 'idle', latency: null, error: null }
}

async function performWakeUp() {
  if (wakeUpStarted) return
  wakeUpStarted = true

  state = { status: 'waking', latency: null, error: null }
  notifyListeners()

  const startTime = Date.now()

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

    if (response.ok) {
      console.log(`[ServerWakeup] Server is awake! (${latency}ms)`)
      state = { status: 'awake', latency, error: null }
    } else {
      console.warn(`[ServerWakeup] Server responded with status ${response.status}`)
      state = { status: 'error', latency, error: `HTTP ${response.status}` }
    }
  } catch (error) {
    const latency = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (errorMessage.includes('abort')) {
      console.warn('[ServerWakeup] Request timed out (server may still be starting)')
      state = { status: 'error', latency, error: 'timeout' }
    } else {
      console.error('[ServerWakeup] Failed to reach server:', errorMessage)
      state = { status: 'error', latency, error: errorMessage }
    }
  }

  notifyListeners()
}

// Start wake-up immediately when this module is loaded (client-side only)
if (typeof window !== 'undefined') {
  performWakeUp()
}

interface ServerWakeupProps {
  /**
   * If true, shows a loading indicator while server is waking up
   */
  showStatus?: boolean
  /**
   * Callback when server wake-up completes
   */
  onWakeUp?: (success: boolean, latency?: number) => void
}

/**
 * ServerWakeup Component
 *
 * This component should be placed high in the component tree (e.g., in layout.tsx)
 * to ping the backend server as early as possible when the app loads.
 *
 * On Render's free tier, services spin down after inactivity. By pinging
 * immediately, the backend starts spinning up while the user sees the
 * frontend loading, reducing wait time.
 */
export function ServerWakeup({ showStatus = false, onWakeUp }: ServerWakeupProps) {
  const wakeUpState = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Call onWakeUp callback when status changes to awake or error
  const handleCallback = useCallback(() => {
    if (wakeUpState.status === 'awake') {
      onWakeUp?.(true, wakeUpState.latency ?? undefined)
    } else if (wakeUpState.status === 'error') {
      onWakeUp?.(false)
    }
  }, [wakeUpState.status, wakeUpState.latency, onWakeUp])

  // Trigger callback on status change
  if (wakeUpState.status === 'awake' || wakeUpState.status === 'error') {
    // This is safe because we're not calling setState
    handleCallback()
  }

  // If not showing status, render nothing
  if (!showStatus) {
    return null
  }

  const { status, latency } = wakeUpState

  // Render status indicator
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {(status === 'idle' || status === 'waking') && (
        <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-3 py-2 rounded-lg text-sm backdrop-blur-sm border border-yellow-500/20">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          <span>Connecting to server...</span>
        </div>
      )}
      {status === 'awake' && latency && latency > 5000 && (
        <div className="flex items-center gap-2 bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-2 rounded-lg text-sm backdrop-blur-sm border border-green-500/20 animate-fade-out">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span>Server ready ({(latency / 1000).toFixed(1)}s)</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-sm backdrop-blur-sm border border-red-500/20">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span>Server connection issue</span>
        </div>
      )}
    </div>
  )
}

export default ServerWakeup
