'use client'

import { useState } from 'react'

export function DateTimeDisplay() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className="fixed bottom-4 left-4 z-40"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="relative transition-all duration-300 ease-in-out cursor-default"
        style={{ minWidth: '160px', minHeight: '60px' }}
      >
        {/* Empty hover area - no visible date or clock */}
      </div>
    </div>
  )
}