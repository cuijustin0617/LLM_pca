import { describe, it, expect } from 'vitest'
import {
  cn,
  formatDate,
  formatTime,
  formatDateTime,
  formatPercentage,
  truncate,
  debounce,
  getRecallColor,
  getRecallBgColor,
} from '@/lib/utils'

describe('Utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    })

    it('should merge tailwind classes', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4')
    })
  })

  describe('formatDate', () => {
    it('should format date string', () => {
      const result = formatDate('2025-01-01T00:00:00Z')
      expect(result).toMatch(/Jan/)
      expect(result).toMatch(/2025/)
    })

    it('should format Date object', () => {
      const date = new Date('2025-01-01T00:00:00Z')
      const result = formatDate(date)
      expect(result).toMatch(/Jan/)
    })
  })

  describe('formatTime', () => {
    it('should format time', () => {
      const result = formatTime('2025-01-01T12:30:00Z')
      expect(result).toMatch(/12|PM/)
    })
  })

  describe('formatDateTime', () => {
    it('should format both date and time', () => {
      const result = formatDateTime('2025-01-01T12:30:00Z')
      expect(result).toMatch(/Jan/)
      expect(result).toMatch(/12|PM/)
    })
  })

  describe('formatPercentage', () => {
    it('should format decimal as percentage', () => {
      expect(formatPercentage(0.856)).toBe('85.6%')
    })

    it('should handle 0', () => {
      expect(formatPercentage(0)).toBe('0.0%')
    })

    it('should handle 1', () => {
      expect(formatPercentage(1)).toBe('100.0%')
    })
  })

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('Hello World', 8)).toBe('Hello Wo...')
    })

    it('should not truncate short strings', () => {
      expect(truncate('Hello', 10)).toBe('Hello')
    })

    it('should handle exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello')
    })
  })

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      let count = 0
      const debouncedFn = debounce(() => count++, 100)
      
      debouncedFn()
      debouncedFn()
      debouncedFn()
      
      await new Promise(resolve => setTimeout(resolve, 150))
      expect(count).toBe(1)
    })
  })

  describe('getRecallColor', () => {
    it('should return green for high recall', () => {
      expect(getRecallColor(0.85)).toContain('green')
    })

    it('should return amber for medium recall', () => {
      expect(getRecallColor(0.6)).toContain('amber')
    })

    it('should return red for low recall', () => {
      expect(getRecallColor(0.3)).toContain('red')
    })
  })

  describe('getRecallBgColor', () => {
    it('should return appropriate background for recall', () => {
      expect(getRecallBgColor(0.9)).toContain('green')
      expect(getRecallBgColor(0.6)).toContain('amber')
      expect(getRecallBgColor(0.2)).toContain('red')
    })
  })
})

