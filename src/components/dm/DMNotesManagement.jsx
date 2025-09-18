'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Input, LoadingSkeleton } from '../ui';

export default function DMNotesManagement() {
  const [notes, setNotes] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'SESSION',
    privacy: 'PLAYER_VISIBLE',
    characterId: '',
    userId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [notesRes, charactersRes] = await Promise.all([
        fetch('/api/notes'),
        fetch('/api/characters')
      ]);
      
      if (!notesRes.ok || !charactersRes.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const notesData = await notesRes.json();
      const charactersData = await charactersRes.json();
      
      setNotes(notesData.notes || []);
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
      const url = editingNote ? `/api/notes/${editingNote.id}` : '/api/notes';
      const method = editingNote ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save note');
      }
      
      await fetchData();
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete note');
      
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'SESSION',
      privacy: 'PLAYER_VISIBLE',
      characterId: '',
      userId: ''
    });
    setShowCreateForm(false);
    setEditingNote(null);
    setError(null);
  };

  const startEdit = (note) => {
    setEditingNote(note);
    setFormData({
      title: note.title || '',
      content: note.content || '',
      type: note.type || 'SESSION',
      privacy: note.privacy || 'PLAYER_VISIBLE',
      characterId: note.characterId || '',
      userId: note.userId || ''
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
          <h2 className="text-2xl font-bold text-purple-200">📝 Notes Management</h2>
          <p className="text-purple-300 text-sm">Manage all campaign notes</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          variant="primary"
          size="md"
        >
          ➕ Create Note
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
              {editingNote ? '✏️ Edit Note' : '➕ Create New Note'}
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
                label="Note Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Enter note title"
              />
              
              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-amber-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="SESSION">Session Notes</option>
                  <option value="CAMPAIGN">Campaign Notes</option>
                  <option value="PLAYER">Player Notes</option>
                  <option value="DM">DM Notes</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">
                  Privacy
                </label>
                <select
                  value={formData.privacy}
                  onChange={(e) => setFormData({ ...formData, privacy: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-amber-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="PLAYER_VISIBLE">Player Visible</option>
                  <option value="DM_ONLY">DM Only</option>
                </select>
              </div>
              
              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">
                  Character
                </label>
                <select
                  value={formData.characterId}
                  onChange={(e) => setFormData({ ...formData, characterId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-amber-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">General Note</option>
                  {characters.map(character => (
                    <option key={character.id} value={character.id}>
                      {character.name} ({character.user?.username})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">
                Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-amber-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[120px]"
                placeholder="Enter note content..."
                required
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {editingNote ? '💾 Update Note' : '➕ Create Note'}
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

      {/* Notes List */}
      <Card variant="glass" size="lg">
        <h3 className="text-lg font-bold text-purple-200 mb-4">📝 All Notes</h3>
        
        {notes.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📝</div>
            <div className="text-purple-300">No notes found</div>
            <div className="text-purple-400 text-sm">Create your first note to get started</div>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map(note => (
              <div key={note.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-purple-200 font-bold text-xl">📝</span>
                  </div>
                  <div>
                    <div className="text-amber-200 font-bold text-lg">{note.title}</div>
                    <div className="text-amber-300">
                      {note.type} • {note.privacy}
                    </div>
                    <div className="text-amber-400 text-sm">
                      Author: {note.user?.username || 'Unknown'} • 
                      {note.character && `Character: ${note.character.name}`}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => startEdit(note)}
                    variant="ghost"
                    size="sm"
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(note.id)}
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
