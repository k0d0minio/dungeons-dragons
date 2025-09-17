'use client'

import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import { Button } from '../ui'

export default function AuthWrapper({ children }) {
  const { user, loading } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⚔️</div>
          <div className="text-amber-200 text-xl font-serif">Loading your adventure...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-gradient-to-r from-amber-800/30 to-amber-900/30 rounded-xl p-8 border-2 border-amber-600/40 shadow-xl">
            <h1 className="text-4xl font-bold text-amber-100 font-serif mb-4">
              ⚔️ D&D TOOLBOX ⚔️
            </h1>
            <p className="text-amber-300 text-lg mb-8">
              Welcome, Adventurer! Enter the realm to begin your journey.
            </p>
            
            <div className="space-y-4">
              <Button
                onClick={() => setShowLogin(true)}
                variant="primary"
                size="lg"
                className="w-full"
              >
                🗝️ Enter Realm
              </Button>
              
              <Button
                onClick={() => setShowRegister(true)}
                variant="secondary"
                size="lg"
                className="w-full"
              >
                ⚔️ Join Adventure
              </Button>
            </div>
          </div>
        </div>

        <LoginForm
          isOpen={showLogin}
          onClose={() => setShowLogin(false)}
          onSwitchToRegister={() => {
            setShowLogin(false)
            setShowRegister(true)
          }}
        />

        <RegisterForm
          isOpen={showRegister}
          onClose={() => setShowRegister(false)}
          onSwitchToLogin={() => {
            setShowRegister(false)
            setShowLogin(true)
          }}
        />
      </div>
    )
  }

  return children
}
