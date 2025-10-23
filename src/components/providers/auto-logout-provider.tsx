'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAutoLogout } from '@/hooks/use-auto-logout'
import { AutoLogoutIndicator } from '@/components/auto-logout-indicator'

interface UserSettings {
  autoLogoutEnabled: boolean
  autoLogoutMinutes: number
}

interface AutoLogoutProviderProps {
  children: React.ReactNode
}

export function AutoLogoutProvider({ children }: AutoLogoutProviderProps) {
  const pathname = usePathname()
  const [userSettings, setUserSettings] = useState<UserSettings>({
    autoLogoutEnabled: false,
    autoLogoutMinutes: 15
  })
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Check if current page should have auto logout disabled
  const shouldDisableAutoLogout = pathname === '/login'

  useEffect(() => {
    // Fetch user settings on mount
    const fetchSettings = async () => {
      try {
        const userStr = localStorage.getItem('user')
        setIsLoggedIn(!!userStr)
        if (!userStr) {
          setLoading(false)
          return
        }
        
        const user = JSON.parse(userStr)
        const token = Buffer.from(JSON.stringify(user)).toString('base64')
        
        const response = await fetch('/api/user-settings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const settings = await response.json()
          setUserSettings({
            autoLogoutEnabled: settings.autoLogoutEnabled || false,
            autoLogoutMinutes: settings.autoLogoutMinutes || 15
          })
        }
      } catch (error) {
        console.error('Failed to fetch auto logout settings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()

    // Listen for storage changes (login/logout events)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        console.log('User storage changed, refetching settings...')
        fetchSettings()
      }
    }

    // Also listen for custom login events
    const handleLoginEvent = () => {
      console.log('Login event detected, refetching settings...')
      fetchSettings()
    }

    // Listen for user settings updates
    const handleSettingsUpdated = () => {
      console.log('User settings updated, refetching settings...')
      fetchSettings()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('userLoggedIn', handleLoginEvent)
    window.addEventListener('userSettingsUpdated', handleSettingsUpdated)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('userLoggedIn', handleLoginEvent)
      window.removeEventListener('userSettingsUpdated', handleSettingsUpdated)
    }
  }, [])

  // Re-fetch settings when pathname changes (from login to other pages)
  useEffect(() => {
    if (!shouldDisableAutoLogout) {
      const userStr = localStorage.getItem('user')
      setIsLoggedIn(!!userStr)
      if (userStr && !loading) {
        console.log('Pathname changed away from login, refetching settings...')
        const fetchSettings = async () => {
          try {
            const user = JSON.parse(userStr)
            const token = Buffer.from(JSON.stringify(user)).toString('base64')
            
            const response = await fetch('/api/user-settings', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            
            if (response.ok) {
              const settings = await response.json()
              setUserSettings({
                autoLogoutEnabled: settings.autoLogoutEnabled || false,
                autoLogoutMinutes: settings.autoLogoutMinutes || 15
              })
            }
          } catch (error) {
            console.error('Failed to fetch auto logout settings after navigation:', error)
          }
        }

        fetchSettings()
      }
    }
  }, [pathname, shouldDisableAutoLogout, loading])

  // Set up auto logout hook (only if not on login page and user is logged in)
  useAutoLogout({
    enabled: !shouldDisableAutoLogout && isLoggedIn && userSettings.autoLogoutEnabled,
    timeoutMinutes: userSettings.autoLogoutMinutes,
    onLogout: () => {
      console.log('User logged out due to inactivity')
    }
  })

  // Don't render children until settings are loaded to prevent flicker
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <>
      {children}
      {!shouldDisableAutoLogout && isLoggedIn && (
        <AutoLogoutIndicator 
          enabled={userSettings.autoLogoutEnabled}
          timeoutMinutes={userSettings.autoLogoutMinutes}
        />
      )}
    </>
  )
}