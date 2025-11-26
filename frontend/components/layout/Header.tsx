'use client'

import { Moon, Sun, Loader2 } from 'lucide-react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import Link from 'next/link'

export function Header() {
  const { theme, toggleTheme, extraction } = useStore()
  const isExtractionRunning = extraction.step === 'running' && extraction.jobId
  
  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])
  
  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center justify-between px-6">
      <div className="flex-1" />
      
      <div className="flex items-center gap-4">
        {/* Extraction Running Indicator */}
        {isExtractionRunning && (
          <Link href="/extract">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              style={{ color: 'var(--burgundy-light)' }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Extraction Running...</span>
            </Button>
          </Link>
        )}
        
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </Button>
      </div>
    </header>
  )
}

