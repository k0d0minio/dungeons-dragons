// Utility functions for the application

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString()
}

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && !email.includes('..')
}

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9)
}

export const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}
