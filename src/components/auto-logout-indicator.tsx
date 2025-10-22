'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Clock, LogOut } from 'lucide-react'

interface AutoLogoutIndicatorProps {
  enabled: boolean
  timeoutMinutes: number
}

export function AutoLogoutIndicator({ enabled, timeoutMinutes }: AutoLogoutIndicatorProps) {
  const [timeLeft, setTimeLeft] = useState<number>(timeoutMinutes * 60) // in seconds
  const [isActive, setIsActive] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setIsActive(false)
      setTimeLeft(timeoutMinutes * 60)
      return
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsActive(false)
          return timeoutMinutes * 60
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [enabled, timeoutMinutes])

  useEffect(() => {
    const handleActivity = () => {
      if (enabled) {
        setTimeLeft(timeoutMinutes * 60)
        setIsActive(true)
      }
    }

    const events = ['mousedown', 'click', 'keypress', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [enabled, timeoutMinutes])

  if (!enabled) return null

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const isWarning = timeLeft < 60 // Less than 1 minute

  return (
    <div 
      className="fixed bottom-4 right-4 z-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Badge 
        variant={isWarning ? "destructive" : "secondary"} 
        className={`flex items-center gap-2 px-3 py-2 shadow-lg cursor-default transition-all duration-300 ease-in-out ${
          isHovered ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        <Clock className="h-4 w-4" />
        <span className="text-sm font-mono">
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </span>
        {isWarning && <LogOut className="h-4 w-4 animate-pulse" />}
      </Badge>
    </div>
  )
}