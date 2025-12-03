'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Settings,
  Play,
  FileText,
  TrendingUp,
  FlaskConical,
} from 'lucide-react'

const navigation = [
  { name: 'Configuration', href: '/configuration', icon: Settings },
  { name: 'Extract', href: '/extract', icon: Play },
  { name: 'Prompts & Benchmark', href: '/prompts', icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()
  
  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ 
            background: `linear-gradient(135deg, var(--navy-dark) 0%, var(--burgundy-light) 100%)`
          }}>
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">PCA Extract</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">v1.0.0</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                !isActive && 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
              style={isActive ? {
                backgroundColor: 'var(--cream)',
                color: 'var(--navy-dark)'
              } : undefined}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          © 2025 PCA Extractor
        </p>
      </div>
    </aside>
  )
}

