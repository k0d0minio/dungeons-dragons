'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Input, LoadingSkeleton } from '../ui';

export default function DMUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'PLAYER'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const url = editingUser ? `/api/auth/users/${editingUser.id}` : '/api/auth/register';
      const method = editingUser ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save user');
      }
      
      await fetchUsers();
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This will also delete all their characters, notes, and inventory.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/auth/users/${userId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete user');
      
      await fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({ username: '', password: '', role: 'PLAYER' });
    setShowCreateForm(false);
    setEditingUser(null);
    setError(null);
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // Don't pre-fill password
      role: user.role
    });
    setShowCreateForm(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton type="card" />
        <LoadingSkeleton type="card" />
        <LoadingSkeleton type="card" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-purple-200">👥 User Management</h2>
          <p className="text-purple-300 text-sm">Manage player accounts and permissions</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          variant="primary"
          size="md"
        >
          ➕ Create User
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
          <div className="text-red-200">❌ {error}</div>
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card variant="glass" size="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-purple-200">
              {editingUser ? '✏️ Edit User' : '➕ Create New User'}
            </h3>
            <Button
              onClick={resetForm}
              variant="ghost"
              size="sm"
            >
              ✕ Cancel
            </Button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              placeholder="Enter username"
            />
            
            <Input
              label={editingUser ? "New Password (leave blank to keep current)" : "Password"}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
              placeholder="Enter password"
            />
            
            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-amber-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="PLAYER">Player</option>
                <option value="DM">Dungeon Master</option>
              </select>
            </div>
            
            <div className="flex gap-3">
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {editingUser ? '💾 Update User' : '➕ Create User'}
              </Button>
              <Button
                type="button"
                onClick={resetForm}
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Users List */}
      <Card variant="glass" size="lg">
        <h3 className="text-lg font-bold text-purple-200 mb-4">👥 All Users</h3>
        
        {users.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">👤</div>
            <div className="text-purple-300">No users found</div>
            <div className="text-purple-400 text-sm">Create your first user to get started</div>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-purple-200 font-bold text-lg">
                      {user.role === 'DM' ? '🎭' : '👤'}
                    </span>
                  </div>
                  <div>
                    <div className="text-amber-200 font-bold">{user.username}</div>
                    <div className="text-amber-300 text-sm">
                      {user.role === 'DM' ? 'Dungeon Master' : 'Player'}
                    </div>
                    <div className="text-amber-400 text-xs">
                      Created: {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => startEdit(user)}
                    variant="ghost"
                    size="sm"
                  >
                    ✏️ Edit
                  </Button>
                  {user.role !== 'DM' && (
                    <Button
                      onClick={() => handleDelete(user.id)}
                      variant="danger"
                      size="sm"
                    >
                      🗑️ Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
