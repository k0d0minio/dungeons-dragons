'use client'

import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Button, Card, Input, Modal } from '../ui'

export default function RegisterForm({ isOpen, onClose, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'PLAYER'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    setLoading(true)

    const result = await register(formData.username, formData.password, formData.role)
    
    if (result.success) {
      onClose()
      setFormData({ username: '', password: '', confirmPassword: '', role: 'PLAYER' })
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
          ⚔️ Join the Adventure
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-amber-300 text-sm mb-1">Username</label>
            <Input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
              required
            />
          </div>
          
          <div>
            <label className="block text-amber-300 text-sm mb-1">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
            >
              <option value="PLAYER">Player</option>
              <option value="DM">Dungeon Master</option>
            </select>
          </div>
          
          <div>
            <label className="block text-amber-300 text-sm mb-1">Password</label>
            <Input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
              required
            />
          </div>
          
          <div>
            <label className="block text-amber-300 text-sm mb-1">Confirm Password</label>
            <Input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
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
              {loading ? 'Creating Account...' : 'Join Adventure'}
            </Button>
            
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-amber-400 hover:text-amber-300 text-sm underline"
            >
              Already have an account? Sign in
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
