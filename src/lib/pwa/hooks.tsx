// PWA Registration and Management
'use client'

import { useEffect, useState } from 'react'

interface PWAInstallPrompt {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const usePWA = () => {
  const [isInstalled, setIsInstalled] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<PWAInstallPrompt | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as Navigator & { standalone?: boolean }).standalone
      
      setIsInstalled(isStandalone || (isIOS && isInStandaloneMode))
    }

    checkInstalled()

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as Event & PWAInstallPrompt)
    }

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    // Register service worker
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js')
          console.log('Service Worker registered:', registration)
          
          // Check if service worker is ready
          if (registration.active) {
            setIsServiceWorkerReady(true)
          } else {
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'activated') {
                    setIsServiceWorkerReady(true)
                  }
                })
              }
            })
          }
        } catch (error) {
          console.error('Service Worker registration failed:', error)
        }
      }
    }

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Register service worker
    registerServiceWorker()

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const installApp = async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      const choiceResult = await installPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      
      setInstallPrompt(null)
    }
  }

  const canInstall = installPrompt !== null && !isInstalled

  return {
    isInstalled,
    canInstall,
    installApp,
    isOnline,
    isServiceWorkerReady,
    installPrompt: installPrompt !== null
  }
}

// PWA Install Button Component
export const PWAInstallButton = () => {
  const { canInstall, installApp, isInstalled } = usePWA()

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <span>✓</span>
        <span>App Installed</span>
      </div>
    )
  }

  if (!canInstall) {
    return null
  }

  return (
    <button
      onClick={installApp}
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
    >
      Install App
    </button>
  )
}

// Offline Indicator Component
export const OfflineIndicator = () => {
  const { isOnline } = usePWA()

  if (isOnline) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white text-center py-2 z-50">
      <span className="text-sm font-medium">
        📡 You&apos;re offline - Some features may be limited
      </span>
    </div>
  )
}

// Service Worker Update Component
export const ServiceWorkerUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })

      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true)
                }
              })
            }
          })
        }
      })
    }
  }, [])

  const updateApp = async () => {
    setIsUpdating(true)
    
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    }
  }

  if (!updateAvailable) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h3 className="font-medium">Update Available</h3>
          <p className="text-sm opacity-90">
            A new version of the app is ready to install.
          </p>
        </div>
        <button
          onClick={updateApp}
          disabled={isUpdating}
          className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
        >
          {isUpdating ? 'Updating...' : 'Update'}
        </button>
      </div>
    </div>
  )
}
