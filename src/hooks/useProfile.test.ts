import { renderHook, waitFor, act } from '@testing-library/react'
import { useProfile } from './useProfile'

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
}))

const mockUseUser = jest.mocked(require('@clerk/nextjs').useUser)

describe('useProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset fetch mock
    global.fetch = jest.fn()
  })

  it('returns loading state when user is not loaded', () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: false,
    })

    const { result } = renderHook(() => useProfile())

    expect(result.current.loading).toBe(false) // Changed: loading is false when user is not loaded
    expect(result.current.profile).toBe(null)
    expect(result.current.error).toBe(null)
    expect(result.current.isLoaded).toBe(false)
  })

  it('returns loading state when user is null', () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
    })

    const { result } = renderHook(() => useProfile())

    expect(result.current.loading).toBe(false)
    expect(result.current.profile).toBe(null)
    expect(result.current.error).toBe(null)
    expect(result.current.isLoaded).toBe(true)
  })

  it('fetches profile successfully', async () => {
    const mockUser = { id: 'test-user-123', email: 'test@example.com' }
    const mockProfile = { id: 'test-profile-123', email: 'test@example.com' }

    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
    })

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockProfile),
    })

    const { result } = renderHook(() => useProfile())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.profile).toEqual(mockProfile)
    expect(result.current.error).toBe(null)
    expect(global.fetch).toHaveBeenCalledWith('/api/profile')
  })

  it('creates profile when profile does not exist', async () => {
    const mockUser = { id: 'test-user-123', email: 'test@example.com' }
    const mockProfile = { id: 'test-profile-123', email: 'test@example.com' }

    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
    })

    // First call returns 404 (profile not found)
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    })

    // Second call creates profile successfully
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve(mockProfile),
    })

    const { result } = renderHook(() => useProfile())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.profile).toEqual(mockProfile)
    expect(result.current.error).toBe(null)
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/profile')
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/profile', {
      method: 'POST',
    })
  })

  it('handles fetch error', async () => {
    const mockUser = { id: 'test-user-123', email: 'test@example.com' }

    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
    })

    global.fetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useProfile())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.profile).toBe(null)
    expect(result.current.error).toBe('Network error')
  })

  it('handles profile creation error', async () => {
    const mockUser = { id: 'test-user-123', email: 'test@example.com' }

    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
    })

    // First call returns 404 (profile not found)
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    })

    // Second call fails to create profile
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() => useProfile())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.profile).toBe(null)
    expect(result.current.error).toBe('Failed to create profile')
  })

  it('handles non-404 fetch error', async () => {
    const mockUser = { id: 'test-user-123', email: 'test@example.com' }

    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
    })

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() => useProfile())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.profile).toBe(null)
    expect(result.current.error).toBe('Failed to fetch profile')
  })

  it('refreshProfile creates profile successfully', async () => {
    const mockUser = { id: 'test-user-123', email: 'test@example.com' }
    const mockProfile = { id: 'test-profile-123', email: 'test@example.com' }

    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
    })

    global.fetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve(mockProfile),
    })

    const { result } = renderHook(() => useProfile())

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Call refreshProfile
    await act(async () => {
      await result.current.refreshProfile()
    })

    expect(result.current.profile).toEqual(mockProfile)
    expect(result.current.error).toBe(null)
    expect(global.fetch).toHaveBeenCalledWith('/api/profile', {
      method: 'POST',
    })
  })

  it('refreshProfile handles error', async () => {
    const mockUser = { id: 'test-user-123', email: 'test@example.com' }

    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
    })

    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() => useProfile())

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Call refreshProfile
    await act(async () => {
      await result.current.refreshProfile()
    })

    expect(result.current.profile).toBe(null)
    expect(result.current.error).toBe('Failed to refresh profile')
  })

  it('refreshProfile does nothing when user is null', async () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
    })

    const { result } = renderHook(() => useProfile())

    await act(async () => {
      await result.current.refreshProfile()
    })

    expect(global.fetch).not.toHaveBeenCalled()
  })
})
