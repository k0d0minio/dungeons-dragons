import { act, render } from '@testing-library/react'

const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

import { DiscoveredRefresh } from './discovered-refresh'

// The player's campaign view has no client-side data — it asks the server
// component to render again (`dm-run-suite/reveal-controls`). So what is worth
// testing is the beat, the pause, and that it draws nothing.

describe('DiscoveredRefresh', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockRefresh.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders nothing at all', () => {
    const { container } = render(<DiscoveredRefresh />)

    expect(container).toBeEmptyDOMElement()
  })

  it('asks the page to run again on the 15 s player rail (D25)', () => {
    render(<DiscoveredRefresh />)

    expect(mockRefresh).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(15_000)
    })
    expect(mockRefresh).toHaveBeenCalledTimes(1)

    act(() => {
      jest.advanceTimersByTime(15_000)
    })
    expect(mockRefresh).toHaveBeenCalledTimes(2)
  })

  it('holds off while the tab is hidden — a phone in a pocket is not polling', () => {
    const visibility = jest
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden' as DocumentVisibilityState)

    render(<DiscoveredRefresh />)

    act(() => {
      jest.advanceTimersByTime(45_000)
    })
    expect(mockRefresh).not.toHaveBeenCalled()

    visibility.mockReturnValue('visible' as DocumentVisibilityState)
    act(() => {
      jest.advanceTimersByTime(15_000)
    })
    expect(mockRefresh).toHaveBeenCalledTimes(1)

    visibility.mockRestore()
  })

  it('stops polling once the player leaves the page', () => {
    const { unmount } = render(<DiscoveredRefresh />)

    unmount()

    act(() => {
      jest.advanceTimersByTime(60_000)
    })
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
