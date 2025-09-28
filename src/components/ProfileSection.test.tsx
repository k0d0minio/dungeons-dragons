import { render, screen } from '@testing-library/react'
import { ProfileSection } from './ProfileSection'

// Mock the useProfile hook
jest.mock('@/hooks/useProfile', () => ({
  useProfile: jest.fn(),
}))

const mockUseProfile = jest.mocked(require('@/hooks/useProfile').useProfile)

describe('ProfileSection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows loading state', () => {
    mockUseProfile.mockReturnValue({
      profile: null,
      loading: true,
      error: null,
      refreshProfile: jest.fn(),
    })

    render(<ProfileSection />)
    
    expect(screen.getByText('Loading profile...')).toBeInTheDocument()
    // Note: Loading spinner doesn't have role="status" in the component
  })

  it('shows error state', () => {
    mockUseProfile.mockReturnValue({
      profile: null,
      loading: false,
      error: 'Failed to load profile',
      refreshProfile: jest.fn(),
    })

    render(<ProfileSection />)
    
    expect(screen.getByText('Error loading profile')).toBeInTheDocument()
    expect(screen.getByText('Failed to load profile')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('shows profile not found state', () => {
    mockUseProfile.mockReturnValue({
      profile: null,
      loading: false,
      error: null,
      refreshProfile: jest.fn(),
    })

    render(<ProfileSection />)
    
    expect(screen.getByText('Profile not found')).toBeInTheDocument()
    expect(screen.getByText('Creating your profile...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create profile/i })).toBeInTheDocument()
  })

  it('shows profile data when loaded', () => {
    const mockProfile = {
      id: 'test-profile-123',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      created_at: '2024-01-01T00:00:00Z',
    }

    mockUseProfile.mockReturnValue({
      profile: mockProfile,
      loading: false,
      error: null,
      refreshProfile: jest.fn(),
    })

    render(<ProfileSection />)
    
    expect(screen.getByText('✅ Profile Connected!')).toBeInTheDocument()
    expect(screen.getByText(/test@example\.com/)).toBeInTheDocument() // Use regex for partial match
    expect(screen.getByText(/Test User/)).toBeInTheDocument() // Use regex for partial match
    expect(screen.getByText(/test-pro/)).toBeInTheDocument() // Use regex for partial match
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
  })

  it('calls refreshProfile when retry button is clicked', () => {
    const mockRefreshProfile = jest.fn()
    
    mockUseProfile.mockReturnValue({
      profile: null,
      loading: false,
      error: 'Failed to load profile',
      refreshProfile: mockRefreshProfile,
    })

    render(<ProfileSection />)
    
    const retryButton = screen.getByRole('button', { name: /retry/i })
    retryButton.click()
    
    expect(mockRefreshProfile).toHaveBeenCalledTimes(1)
  })

  it('calls refreshProfile when create profile button is clicked', () => {
    const mockRefreshProfile = jest.fn()
    
    mockUseProfile.mockReturnValue({
      profile: null,
      loading: false,
      error: null,
      refreshProfile: mockRefreshProfile,
    })

    render(<ProfileSection />)
    
    const createButton = screen.getByRole('button', { name: /create profile/i })
    createButton.click()
    
    expect(mockRefreshProfile).toHaveBeenCalledTimes(1)
  })

  it('calls refreshProfile when refresh button is clicked', () => {
    const mockRefreshProfile = jest.fn()
    const mockProfile = {
      id: 'test-profile-123',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      created_at: '2024-01-01T00:00:00Z',
    }
    
    mockUseProfile.mockReturnValue({
      profile: mockProfile,
      loading: false,
      error: null,
      refreshProfile: mockRefreshProfile,
    })

    render(<ProfileSection />)
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    refreshButton.click()
    
    expect(mockRefreshProfile).toHaveBeenCalledTimes(1)
  })
})
