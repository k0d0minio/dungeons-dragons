import { formatDate, truncateText, validateEmail, generateId, capitalizeFirst } from './helpers'

describe('Utility Functions', () => {
  describe('formatDate', () => {
    it('formats date string correctly', () => {
      const dateString = '2024-01-15T10:30:00Z'
      const result = formatDate(dateString)
      expect(result).toBe('1/15/2024')
    })

    it('formats Date object correctly', () => {
      const date = new Date('2024-12-25T15:45:00Z')
      const result = formatDate(date)
      expect(result).toBe('12/25/2024')
    })

    it('handles invalid date gracefully', () => {
      const invalidDate = 'invalid-date'
      const result = formatDate(invalidDate)
      expect(result).toBe('Invalid Date')
    })
  })

  describe('truncateText', () => {
    it('returns original text when shorter than maxLength', () => {
      const text = 'Short text'
      const result = truncateText(text, 20)
      expect(result).toBe('Short text')
    })

    it('truncates text when longer than maxLength', () => {
      const text = 'This is a very long text that should be truncated'
      const result = truncateText(text, 20)
      expect(result).toBe('This is a very long ...')
    })

    it('truncates text exactly at maxLength', () => {
      const text = 'This is exactly twenty characters long'
      const result = truncateText(text, 20)
      expect(result).toBe('This is exactly twen...')
    })

    it('handles empty string', () => {
      const text = ''
      const result = truncateText(text, 10)
      expect(result).toBe('')
    })

    it('handles zero maxLength', () => {
      const text = 'Some text'
      const result = truncateText(text, 0)
      expect(result).toBe('...')
    })
  })

  describe('validateEmail', () => {
    it('validates correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com',
      ]

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true)
      })
    })

    it('rejects invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com',
        'user@example..com',
        '',
        'user@example',
        'user name@example.com',
      ]

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false)
      })
    })

    it('handles edge cases', () => {
      expect(validateEmail('a@b.c')).toBe(true) // Minimal valid email
      expect(validateEmail('user@sub.domain.com')).toBe(true) // Subdomain
      expect(validateEmail('user@domain-name.com')).toBe(true) // Hyphen in domain
    })
  })

  describe('generateId', () => {
    it('generates a string', () => {
      const id = generateId()
      expect(typeof id).toBe('string')
    })

    it('generates different IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })

    it('generates ID of correct length', () => {
      const id = generateId()
      expect(id.length).toBe(9)
    })

    it('generates alphanumeric IDs', () => {
      const id = generateId()
      expect(/^[a-z0-9]+$/i.test(id)).toBe(true)
    })
  })

  describe('capitalizeFirst', () => {
    it('capitalizes first letter and lowercases rest', () => {
      const result = capitalizeFirst('hello')
      expect(result).toBe('Hello')
    })

    it('handles already capitalized text', () => {
      const result = capitalizeFirst('HELLO')
      expect(result).toBe('Hello')
    })

    it('handles mixed case text', () => {
      const result = capitalizeFirst('hELLo WoRLd')
      expect(result).toBe('Hello world')
    })

    it('handles single character', () => {
      const result = capitalizeFirst('a')
      expect(result).toBe('A')
    })

    it('handles empty string', () => {
      const result = capitalizeFirst('')
      expect(result).toBe('')
    })

    it('handles string with numbers', () => {
      const result = capitalizeFirst('hello123')
      expect(result).toBe('Hello123')
    })
  })
})
