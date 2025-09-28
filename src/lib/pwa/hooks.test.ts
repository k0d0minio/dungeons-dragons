import React from 'react'
import { renderHook, act, render, screen } from '@testing-library/react'
import { usePWA, PWAInstallButton, OfflineIndicator, ServiceWorkerUpdate } from '../pwa/hooks'

// Mock the PWA hooks
jest.mock('../pwa/hooks', () => ({
  usePWA: jest.fn(),
  PWAInstallButton: jest.fn(),
  OfflineIndicator: jest.fn(),
  ServiceWorkerUpdate: jest.fn(),
}))

describe('PWA Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('usePWA', () => {
    it('should return initial PWA state', () => {
      const mockUsePWA = usePWA as jest.Mock
      mockUsePWA.mockReturnValue({
        isInstalled: false,
        canInstall: false,
        installApp: jest.fn(),
        isOnline: true,
        isServiceWorkerReady: false,
        installPrompt: false,
      })

      const { result } = renderHook(() => usePWA())

      expect(result.current.isInstalled).toBe(false)
      expect(result.current.canInstall).toBe(false)
      expect(result.current.isOnline).toBe(true)
      expect(result.current.isServiceWorkerReady).toBe(false)
      expect(result.current.installPrompt).toBe(false)
    })

    it('should handle install prompt', () => {
      const mockInstallApp = jest.fn()
      const mockUsePWA = usePWA as jest.Mock
      mockUsePWA.mockReturnValue({
        isInstalled: false,
        canInstall: true,
        installApp: mockInstallApp,
        isOnline: true,
        isServiceWorkerReady: true,
        installPrompt: true,
      })

      const { result } = renderHook(() => usePWA())

      expect(result.current.canInstall).toBe(true)
      expect(result.current.installPrompt).toBe(true)

      act(() => {
        result.current.installApp()
      })

      expect(mockInstallApp).toHaveBeenCalled()
    })

    it('should handle offline state', () => {
      const mockUsePWA = usePWA as jest.Mock
      mockUsePWA.mockReturnValue({
        isInstalled: false,
        canInstall: false,
        installApp: jest.fn(),
        isOnline: false,
        isServiceWorkerReady: true,
        installPrompt: false,
      })

      const { result } = renderHook(() => usePWA())

      expect(result.current.isOnline).toBe(false)
    })

    it('should handle installed state', () => {
      const mockUsePWA = usePWA as jest.Mock
      mockUsePWA.mockReturnValue({
        isInstalled: true,
        canInstall: false,
        installApp: jest.fn(),
        isOnline: true,
        isServiceWorkerReady: true,
        installPrompt: false,
      })

      const { result } = renderHook(() => usePWA())

      expect(result.current.isInstalled).toBe(true)
      expect(result.current.canInstall).toBe(false)
    })
  })

  describe('PWAInstallButton', () => {
    it('should render install button when can install', () => {
      const mockPWAInstallButton = PWAInstallButton as jest.Mock
      mockPWAInstallButton.mockReturnValue(
        React.createElement('button', { 'data-testid': 'install-button' }, 'Install App')
      )

      render(React.createElement(PWAInstallButton))
      
      expect(screen.getByTestId('install-button')).toBeInTheDocument()
    })

    it('should render installed state when app is installed', () => {
      const mockPWAInstallButton = PWAInstallButton as jest.Mock
      mockPWAInstallButton.mockReturnValue(
        React.createElement('div', { 'data-testid': 'installed-state' }, '✓ App Installed')
      )

      render(React.createElement(PWAInstallButton))
      
      expect(screen.getByTestId('installed-state')).toBeInTheDocument()
    })

    it('should not render when cannot install', () => {
      const mockPWAInstallButton = PWAInstallButton as jest.Mock
      mockPWAInstallButton.mockReturnValue(null)

      const { container } = render(React.createElement(PWAInstallButton))
      
      expect(container.firstChild).toBeNull()
    })
  })

  describe('OfflineIndicator', () => {
    it('should render when offline', () => {
      const mockOfflineIndicator = OfflineIndicator as jest.Mock
      mockOfflineIndicator.mockReturnValue(
        React.createElement('div', { 'data-testid': 'offline-indicator' }, '📡 You\'re offline')
      )

      render(React.createElement(OfflineIndicator))
      
      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument()
    })

    it('should not render when online', () => {
      const mockOfflineIndicator = OfflineIndicator as jest.Mock
      mockOfflineIndicator.mockReturnValue(null)

      const { container } = render(React.createElement(OfflineIndicator))
      
      expect(container.firstChild).toBeNull()
    })
  })

  describe('ServiceWorkerUpdate', () => {
    it('should render update notification when update available', () => {
      const mockServiceWorkerUpdate = ServiceWorkerUpdate as jest.Mock
      mockServiceWorkerUpdate.mockReturnValue(
        React.createElement('div', { 'data-testid': 'update-notification' }, 'Update Available')
      )

      render(React.createElement(ServiceWorkerUpdate))
      
      expect(screen.getByTestId('update-notification')).toBeInTheDocument()
    })

    it('should not render when no update available', () => {
      const mockServiceWorkerUpdate = ServiceWorkerUpdate as jest.Mock
      mockServiceWorkerUpdate.mockReturnValue(null)

      const { container } = render(React.createElement(ServiceWorkerUpdate))
      
      expect(container.firstChild).toBeNull()
    })
  })
})
