'use client'

import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Button, Card, Input, Modal } from '../ui'

export default function LoginForm({ isOpen, onClose, onSwitchToRegister }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(formData.username, formData.password)
    
    if (result.success) {
      onClose()
      setFormData({ username: '', password: '' })
    } else {
      setError(result.error)
    }
    
    setLoading(false)
  }

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-amber-100 mb-6 text-center font-serif">
          🗝️ Enter the Realm
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-amber-300 text-sm mb-1">Username</label>
            <Input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              required
            />
          </div>
          
          <div>
            <label className="block text-amber-300 text-sm mb-1">Password</label>
            <Input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>
          
          {error && (
            <div className="text-red-400 text-sm text-center bg-red-900/30 border border-red-500/30 rounded-lg p-3">
              {error}
            </div>
          )}
          
          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Entering...' : 'Enter Realm'}
            </Button>
            
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-amber-400 hover:text-amber-300 text-sm underline"
            >
              New to the realm? Create an account
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
