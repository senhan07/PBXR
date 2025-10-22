'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface AutoLogoutOptions {
  enabled: boolean
  timeoutMinutes: number
  onLogout?: () => void
}

export function useAutoLogout({ enabled, timeoutMinutes, onLogout }: AutoLogoutOptions) {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const visibilityCheckRef = useRef<NodeJS.Timeout | null>(null)
  const eventsRef = useRef<string[]>([
    'mousedown',
    'click',
    'keypress',
    'touchstart'
  ])

  const logout = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem('user')
    
    // Call custom logout handler if provided
    if (onLogout) {
      onLogout()
    }
    
    // Redirect to login
    router.push('/login')
  }, [router, onLogout])

  const resetTimeout = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Update last activity time
    lastActivityRef.current = Date.now()
    
    // Set new timeout if enabled
    if (enabled && timeoutMinutes > 0) {
      const timeoutMs = timeoutMinutes * 60 * 1000
      timeoutRef.current = setTimeout(logout, timeoutMs)
    }
  }, [enabled, timeoutMinutes, logout])

  const handleActivity = useCallback((event?: Event) => {
    resetTimeout()
  }, [resetTimeout])

  const handleVisibilityChange = useCallback(() => {
    if (!enabled) return
    
    if (document.visibilityState === 'visible') {
      // Check how long the tab has been hidden
      const timeSinceLastActivity = Date.now() - lastActivityRef.current
      const timeoutMs = timeoutMinutes * 60 * 1000
      
      if (timeSinceLastActivity >= timeoutMs) {
        logout()
      } else {
        resetTimeout()
      }
    }
  }, [enabled, timeoutMinutes, logout, resetTimeout])

  useEffect(() => {
    // Only set up auto logout if enabled
    if (!enabled) {
      // Clean up any existing timeout if disabled
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (visibilityCheckRef.current) {
        clearInterval(visibilityCheckRef.current)
        visibilityCheckRef.current = null
      }
      return
    }

    // Initial timeout setup
    resetTimeout()

    // Add event listeners for user activity
    eventsRef.current.forEach(event => {
      document.addEventListener(event, (e) => handleActivity(e), { passive: true })
    })

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup function
    return () => {
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (visibilityCheckRef.current) {
        clearInterval(visibilityCheckRef.current)
        visibilityCheckRef.current = null
      }
      
      // Remove event listeners
      eventsRef.current.forEach(event => {
        document.removeEventListener(event, (e) => handleActivity(e))
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, timeoutMinutes, resetTimeout, handleActivity, handleVisibilityChange])

  // Return a manual reset function for external use
  return {
    resetTimeout,
    logout
  }
}