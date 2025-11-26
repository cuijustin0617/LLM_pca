import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function downloadFile(content: string, filename: string, type: string = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadJSON(data: any, filename: string) {
  downloadFile(JSON.stringify(data, null, 2), filename, 'application/json')
}

export function downloadCSV(data: any[], filename: string) {
  if (data.length === 0) return
  
  const headers = Object.keys(data[0])
  const csv = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        const stringValue = value === null || value === undefined ? '' : String(value)
        // Escape quotes and wrap in quotes if contains comma
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    )
  ].join('\n')
  
  downloadFile(csv, filename, 'text/csv')
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function getRecallColor(recall: number): string {
  if (recall >= 0.8) return 'text-green-600 dark:text-green-400'
  if (recall >= 0.5) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

export function getRecallBgColor(recall: number): string {
  if (recall >= 0.8) return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
  if (recall >= 0.5) return 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'
  return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
}

