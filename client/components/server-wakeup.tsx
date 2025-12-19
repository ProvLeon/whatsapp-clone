'use client'

import { useEffect, useState, useRef } from 'react'

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'

type WakeUpStatus = 'idle' | 'waking' | 'awake' | 'error'

interface WakeUpState {
  status: WakeUpStatus
  latency: number | null
  error: string | null
}

// Module-level cache to persist across component remounts
let cachedState: WakeUpState | null = null
let wakeUpPromise: Promise<WakeUpState> | null = null

async function performWakeUp(): Promise<WakeUpState> {
  // Return cached result if available
  if (cachedState && cachedState.status !== 'idle' && cachedState.status !== 'waking') {
    return cachedState
  }

  // Return existing promise if wake-up is in progress
  if (wakeUpPromise) {
    return wakeUpPromise
  }

  const startTime = Date.now()

  wakeUpPromise = (async (): Promise<WakeUpState> => {
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
        cachedState = { status: 'awake', latency, error: null }
      } else {
        console.warn(`[ServerWakeup] Server responded with status ${response.status}`)
        cachedState = { status: 'error', latency, error: `HTTP ${response.status}` }
      }
    } catch (error) {
      const latency = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (errorMessage.includes('abort')) {
        console.warn('[ServerWakeup] Request timed out (server may still be starting)')
        cachedState = { status: 'error', latency, error: 'timeout' }
      } else {
        console.error('[ServerWakeup] Failed to reach server:', errorMessage)
        cachedState = { status: 'error', latency, error: errorMessage }
      }
    }

    return cachedState!
  })()

  return wakeUpPromise
}

// Start wake-up immediately when module loads on client
if (typeof window !== 'undefined') {
  performWakeUp()
}

interface ServerWakeupProps {
  showStatus?: boolean
  onWakeUp?: (success: boolean, latency?: number) => void
}

function getInitialState(): WakeUpState {
  // Check cache first - this handles component remounts
  if (cachedState) {
    return cachedState
  }
  // If wake-up already started, show waking status
  if (wakeUpPromise) {
    return { status: 'waking', latency: null, error: null }
  }
  return { status: 'idle', latency: null, error: null }
}

export function ServerWakeup({ showStatus = false, onWakeUp }: ServerWakeupProps) {
  const [state, setState] = useState<WakeUpState>(getInitialState)
  const mountedRef = useRef(true)
  const hasCalledBackRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true

    // If we already have a final state from cache, call the callback
    if (cachedState && (cachedState.status === 'awake' || cachedState.status === 'error')) {
      if (!hasCalledBackRef.current) {
        hasCalledBackRef.current = true
        const isSuccess = cachedState.status === 'awake'
        onWakeUp?.(isSuccess, cachedState.latency ?? undefined)
      }
      return
    }

    // Otherwise, wait for the wake-up to complete
    performWakeUp().then((result) => {
      if (mountedRef.current) {
        setState(result)
        if (!hasCalledBackRef.current) {
          hasCalledBackRef.current = true
          const isSuccess = result.status === 'awake'
          onWakeUp?.(isSuccess, result.latency ?? undefined)
        }
      }
    })

    return () => {
      mountedRef.current = false
    }
  }, [onWakeUp])

  if (!showStatus) {
    return null
  }

  const { status, latency } = state

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
