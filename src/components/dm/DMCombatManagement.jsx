'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Input, LoadingSkeleton } from '../ui';

export default function DMCombatManagement() {
  const [combatSessions, setCombatSessions] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    currentRound: 1,
    currentTurn: 1,
    status: 'PREPARATION'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [combatRes, charactersRes] = await Promise.all([
        fetch('/api/combat'),
        fetch('/api/characters')
      ]);
      
      if (!combatRes.ok || !charactersRes.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const combatData = await combatRes.json();
      const charactersData = await charactersRes.json();
      
      setCombatSessions(combatData.combatSessions || []);
      setCharacters(charactersData.characters || []);
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
      const url = editingSession ? `/api/combat/${editingSession.id}` : '/api/combat';
      const method = editingSession ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save combat session');
      }
      
      await fetchData();
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (sessionId) => {
    if (!confirm('Are you sure you want to delete this combat session? This will also delete all participants.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/combat/${sessionId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete combat session');
      
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      currentRound: 1,
      currentTurn: 1,
      status: 'PREPARATION'
    });
    setShowCreateForm(false);
    setEditingSession(null);
    setError(null);
  };

  const startEdit = (session) => {
    setEditingSession(session);
    setFormData({
      name: session.name || '',
      description: session.description || '',
      currentRound: session.currentRound || 1,
      currentTurn: session.currentTurn || 1,
      status: session.status || 'PREPARATION'
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
          <h2 className="text-2xl font-bold text-purple-200">⚔️ Combat Management</h2>
          <p className="text-purple-300 text-sm">Manage all combat sessions</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          variant="primary"
          size="md"
        >
          ➕ Create Combat Session
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
              {editingSession ? '✏️ Edit Combat Session' : '➕ Create New Combat Session'}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Session Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Goblin Ambush, Dragon Encounter"
              />
              
              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-amber-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="PREPARATION">Preparation</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>
            
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the combat encounter..."
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Current Round"
                type="number"
                min="1"
                value={formData.currentRound}
                onChange={(e) => setFormData({ ...formData, currentRound: parseInt(e.target.value) || 1 })}
              />
              
              <Input
                label="Current Turn"
                type="number"
                min="1"
                value={formData.currentTurn}
                onChange={(e) => setFormData({ ...formData, currentTurn: parseInt(e.target.value) || 1 })}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {editingSession ? '💾 Update Session' : '➕ Create Session'}
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

      {/* Combat Sessions List */}
      <Card variant="glass" size="lg">
        <h3 className="text-lg font-bold text-purple-200 mb-4">⚔️ All Combat Sessions</h3>
        
        {combatSessions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">⚔️</div>
            <div className="text-purple-300">No combat sessions found</div>
            <div className="text-purple-400 text-sm">Create your first combat session to get started</div>
          </div>
        ) : (
          <div className="space-y-3">
            {combatSessions.map(session => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-purple-200 font-bold text-xl">⚔️</span>
                  </div>
                  <div>
                    <div className="text-amber-200 font-bold text-lg">{session.name}</div>
                    <div className="text-amber-300">
                      Round {session.currentRound}, Turn {session.currentTurn}
                    </div>
                    <div className="text-amber-400 text-sm">
                      Status: {session.status} • 
                      Participants: {session.participants?.length || 0}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => startEdit(session)}
                    variant="ghost"
                    size="sm"
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(session.id)}
                    variant="danger"
                    size="sm"
                  >
                    🗑️ Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
