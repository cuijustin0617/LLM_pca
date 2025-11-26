import { describe, it, expect } from 'vitest'
import { formatDate, formatPercentage, truncate } from '@/lib/utils'

describe('Invalid Input Edge Cases', () => {
  describe('formatDate', () => {
    it('should handle invalid date string', () => {
      const result = formatDate('invalid-date')
      expect(result).toBeTruthy() // Should not throw
    })

    it('should handle empty string', () => {
      const result = formatDate('')
      expect(result).toBeTruthy()
    })
  })

  describe('formatPercentage', () => {
    it('should handle negative numbers', () => {
      expect(formatPercentage(-0.5)).toBe('-50.0%')
    })

    it('should handle values > 1', () => {
      expect(formatPercentage(1.5)).toBe('150.0%')
    })

    it('should handle very small numbers', () => {
      expect(formatPercentage(0.001)).toBe('0.1%')
    })

    it('should handle NaN', () => {
      expect(formatPercentage(NaN)).toBe('NaN%')
    })

    it('should handle Infinity', () => {
      expect(formatPercentage(Infinity)).toBe('Infinity%')
    })
  })

  describe('truncate', () => {
    it('should handle negative length', () => {
      expect(truncate('Hello', -1)).toBe('...')
    })

    it('should handle zero length', () => {
      expect(truncate('Hello', 0)).toBe('...')
    })

    it('should handle empty string', () => {
      expect(truncate('', 5)).toBe('')
    })
  })
})

