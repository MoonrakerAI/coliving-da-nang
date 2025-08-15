import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, validateEmail, slugify, generateId } from '../utils'

describe('utils', () => {
  describe('formatCurrency', () => {
    it('formats USD currency correctly', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00')
      expect(formatCurrency(1000.50)).toBe('$1,000.50')
    })

    it('formats different currencies correctly', () => {
      expect(formatCurrency(1000, 'EUR')).toBe('€1,000.00')
    })
  })

  describe('formatDate', () => {
    it('formats date objects correctly', () => {
      const date = new Date('2023-12-25')
      expect(formatDate(date)).toBe('December 25, 2023')
    })

    it('formats date strings correctly', () => {
      expect(formatDate('2023-12-25')).toBe('December 25, 2023')
    })
  })

  describe('validateEmail', () => {
    it('validates correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@domain.co.uk')).toBe(true)
    })

    it('rejects invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
    })
  })

  describe('slugify', () => {
    it('converts text to slug format', () => {
      expect(slugify('Hello World')).toBe('hello-world')
      expect(slugify('Test Property Name!')).toBe('test-property-name')
    })

    it('handles special characters', () => {
      expect(slugify('Property #1 & Co.')).toBe('property-1-co')
    })
  })

  describe('generateId', () => {
    it('generates unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
      expect(typeof id1).toBe('string')
      expect(id1.length).toBeGreaterThan(0)
    })
  })
})
