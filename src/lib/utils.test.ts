import { cn, formatDate, formatDateTime, generateId, debounce, throttle } from './utils'

describe('utils', () => {
  describe('cn', () => {
    it('merges class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    it('handles conditional classes', () => {
      expect(cn('base', { 'conditional': true })).toBe('base conditional')
      expect(cn('base', { 'conditional': false })).toBe('base')
    })

    it('merges conflicting Tailwind classes', () => {
      expect(cn('p-2', 'p-4')).toBe('p-4')
    })
  })

  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = new Date('2024-01-15')
      expect(formatDate(date)).toBe('January 15, 2024')
    })

    it('handles string dates', () => {
      expect(formatDate('2024-01-15')).toBe('January 15, 2024')
    })
  })

  describe('formatDateTime', () => {
    it('formats date and time correctly', () => {
      const date = new Date('2024-01-15T14:30:00')
      expect(formatDateTime(date)).toContain('Jan 15, 2024')
      expect(formatDateTime(date)).toContain('2:30 PM')
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

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('delays function execution', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('test')
      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledWith('test')
    })

    it('cancels previous calls', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('first')
      debouncedFn('second')
      
      jest.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('second')
    })
  })

  describe('throttle', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('limits function execution frequency', () => {
      const mockFn = jest.fn()
      const throttledFn = throttle(mockFn, 100)

      throttledFn('first')
      throttledFn('second')
      throttledFn('third')

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('first')

      jest.advanceTimersByTime(100)
      throttledFn('fourth')
      expect(mockFn).toHaveBeenCalledTimes(2)
      expect(mockFn).toHaveBeenCalledWith('fourth')
    })
  })
})
