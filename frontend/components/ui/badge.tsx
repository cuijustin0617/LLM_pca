import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'outline'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantClasses = {
    default: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
    success: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
    warning: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
    error: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
    outline: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300',
  }
  
  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: 'var(--cream)',
      color: 'var(--navy-dark)',
    },
    success: {
      backgroundColor: 'var(--navy-dark)',
      color: 'white',
    },
    warning: {
      backgroundColor: 'var(--cream)',
      color: 'var(--burgundy-dark)',
    },
    error: {
      backgroundColor: 'var(--burgundy-dark)',
      color: 'white',
    },
  }
  
  return (
    <div
      className={cn(variantClasses[variant], className)}
      style={variant !== 'outline' ? variantStyles[variant] : undefined}
      {...props}
    />
  )
}

export { Badge }

