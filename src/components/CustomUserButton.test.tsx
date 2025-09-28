import { render, screen, waitFor } from '@testing-library/react'
import { CustomUserButton } from './CustomUserButton'

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  UserButton: ({ afterSignOutUrl }: { afterSignOutUrl?: string }) => (
    <div data-testid="clerk-user-button">
      UserButton (afterSignOutUrl: {afterSignOutUrl})
    </div>
  ),
}))

// Mock window.Clerk
const mockClerk = {
  user: { id: 'test-user' },
  loaded: true,
}

describe('CustomUserButton', () => {
  beforeEach(() => {
    // Reset window.Clerk
    delete (window as unknown as { Clerk?: unknown }).Clerk
  })

  it('shows loading state initially', () => {
    render(<CustomUserButton />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows error state when Clerk fails to load', async () => {
    render(<CustomUserButton />)
    
    await waitFor(() => {
      expect(screen.getByText('Auth Error')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('renders UserButton when Clerk is loaded', async () => {
    // Mock Clerk being available
    ;(window as unknown as { Clerk?: unknown }).Clerk = mockClerk

    render(<CustomUserButton />)
    
    await waitFor(() => {
      expect(screen.getByTestId('clerk-user-button')).toBeInTheDocument()
    })
  })

  it('passes props to UserButton', async () => {
    ;(window as unknown as { Clerk?: unknown }).Clerk = mockClerk

    render(<CustomUserButton afterSignOutUrl="/custom-url" />)
    
    await waitFor(() => {
      expect(screen.getByText('UserButton (afterSignOutUrl: /custom-url)')).toBeInTheDocument()
    })
  })
})
