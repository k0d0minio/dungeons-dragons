'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Input, Modal } from '../ui';
import { useAuth } from '../../contexts/AuthContext';

export default function NoteTakingSystemDB() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('SESSION');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New note form state
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    type: 'SESSION',
    tags: [],
    isPrivate: false,
    priority: 'NORMAL'
  });

  // Load notes from database
  const loadNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notes');
      const data = await response.json();
      
      if (data.success) {
        setNotes(data.notes);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load notes');
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load notes on component mount
  useEffect(() => {
    loadNotes();
  }, []);

  // Create new note
  const handleCreateNote = async () => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newNote),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNotes(prev => [data.note, ...prev]);
        setNewNote({
          title: '',
          content: '',
          type: 'SESSION',
          tags: [],
          isPrivate: false,
          priority: 'NORMAL'
        });
        setShowCreateModal(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create note');
      console.error('Error creating note:', err);
    }
  };

  // Update note
  const handleUpdateNote = async () => {
    try {
      const response = await fetch(`/api/notes/${editingNote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingNote),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNotes(prev => prev.map(note => 
          note.id === editingNote.id ? data.note : note
        ));
        setEditingNote(null);
        setShowEditModal(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update note');
      console.error('Error updating note:', err);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNotes(prev => prev.filter(note => note.id !== noteId));
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to delete note');
      console.error('Error deleting note:', err);
    }
  };

  // Filter notes by active tab and search
  const filteredNotes = notes.filter(note => {
    const matchesTab = note.type === activeTab;
    const matchesSearch = searchQuery === '' || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Note type configuration
  const noteTypes = {
    SESSION: { name: 'Session Notes', emoji: '📝', color: 'bg-blue-500' },
    CAMPAIGN: { name: 'Campaign Notes', emoji: '📚', color: 'bg-purple-500' },
    PLAYER: { name: 'Player Notes', emoji: '👤', color: 'bg-green-500' },
    DM: { name: 'DM Notes', emoji: '🎭', color: 'bg-red-500' }
  };

  // Priority configuration
  const priorityConfig = {
    LOW: { name: 'Low', emoji: '🟢', color: 'text-green-400' },
    NORMAL: { name: 'Normal', emoji: '🟡', color: 'text-yellow-400' },
    HIGH: { name: 'High', emoji: '🔴', color: 'text-red-400' }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">📝</div>
          <div className="text-amber-300">Loading your notes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-amber-300 text-sm mb-4">Take notes and track your campaign</p>
        
        {/* Help Button */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHelp(true)}
            className="text-amber-400 hover:text-amber-300"
          >
            ❓ How to use Notes
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          size="lg"
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
        >
          ➕ New Note
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(noteTypes).map(([key, type]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              activeTab === key
                ? `${type.color} text-white shadow-lg`
                : 'bg-slate-700/50 text-amber-300 hover:bg-slate-600/50'
            }`}
          >
            {type.emoji} {type.name}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 text-red-400 text-center">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-300 hover:text-red-200 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-4">
        {filteredNotes.length === 0 ? (
          <Card variant="glass" size="md">
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📝</div>
              <div className="text-amber-300 text-lg">No notes found</div>
              <div className="text-amber-400 text-sm">
                {searchQuery ? 'Try adjusting your search' : 'Create your first note to get started!'}
              </div>
            </div>
          </Card>
        ) : (
          filteredNotes.map(note => (
            <Card key={note.id} variant="glass" size="md">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{noteTypes[note.type]?.emoji}</span>
                    <h3 className="text-amber-100 font-bold text-lg">{note.title}</h3>
                    {note.isPrivate && <span className="text-red-400">🔒</span>}
                    <span className={`text-sm ${priorityConfig[note.priority]?.color}`}>
                      {priorityConfig[note.priority]?.emoji}
                    </span>
                  </div>
                  
                  <div className="text-amber-300 text-sm mb-3 whitespace-pre-wrap">
                    {note.content}
                  </div>
                  
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {note.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-amber-400 text-xs">
                    Created: {new Date(note.createdAt).toLocaleDateString()}
                    {note.updatedAt !== note.createdAt && (
                      <span> • Updated: {new Date(note.updatedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    onClick={() => {
                      setEditingNote(note);
                      setShowEditModal(true);
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    onClick={() => handleDeleteNote(note.id)}
                    variant="danger"
                    size="sm"
                  >
                    🗑️ Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Note Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewNote({
            title: '',
            content: '',
            type: 'SESSION',
            tags: [],
            isPrivate: false,
            priority: 'NORMAL'
          });
        }}
        size="lg"
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-amber-100 mb-6">📝 Create New Note</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-amber-300 text-sm mb-1">Title *</label>
              <Input
                value={newNote.title}
                onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter note title"
              />
            </div>
            
            <div>
              <label className="block text-amber-300 text-sm mb-1">Type *</label>
              <select
                value={newNote.type}
                onChange={(e) => setNewNote(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
              >
                {Object.entries(noteTypes).map(([key, type]) => (
                  <option key={key} value={key}>{type.emoji} {type.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-amber-300 text-sm mb-1">Content *</label>
              <textarea
                value={newNote.content}
                onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter note content"
                className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100 resize-none"
                rows="6"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-amber-300 text-sm mb-1">Priority</label>
                <select
                  value={newNote.priority}
                  onChange={(e) => setNewNote(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
                >
                  {Object.entries(priorityConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.emoji} {config.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-amber-300">
                  <input
                    type="checkbox"
                    checked={newNote.isPrivate}
                    onChange={(e) => setNewNote(prev => ({ ...prev, isPrivate: e.target.checked }))}
                    className="rounded"
                  />
                  Private Note
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              onClick={() => setShowCreateModal(false)}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNote}
              variant="primary"
              disabled={!newNote.title.trim() || !newNote.content.trim()}
            >
              Create Note
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Note Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingNote(null);
        }}
        size="lg"
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-amber-100 mb-6">✏️ Edit Note</h2>
          
          {editingNote && (
            <div className="space-y-4">
              <div>
                <label className="block text-amber-300 text-sm mb-1">Title *</label>
                <Input
                  value={editingNote.title}
                  onChange={(e) => setEditingNote(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter note title"
                />
              </div>
              
              <div>
                <label className="block text-amber-300 text-sm mb-1">Type *</label>
                <select
                  value={editingNote.type}
                  onChange={(e) => setEditingNote(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
                >
                  {Object.entries(noteTypes).map(([key, type]) => (
                    <option key={key} value={key}>{type.emoji} {type.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-amber-300 text-sm mb-1">Content *</label>
                <textarea
                  value={editingNote.content}
                  onChange={(e) => setEditingNote(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter note content"
                  className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100 resize-none"
                  rows="6"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Priority</label>
                  <select
                    value={editingNote.priority}
                    onChange={(e) => setEditingNote(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
                  >
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <option key={key} value={key}>{config.emoji} {config.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-amber-300">
                    <input
                      type="checkbox"
                      checked={editingNote.isPrivate}
                      onChange={(e) => setEditingNote(prev => ({ ...prev, isPrivate: e.target.checked }))}
                      className="rounded"
                    />
                    Private Note
                  </label>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              onClick={() => setShowEditModal(false)}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateNote}
              variant="primary"
              disabled={!editingNote?.title.trim() || !editingNote?.content.trim()}
            >
              Update Note
            </Button>
          </div>
        </div>
      </Modal>

      {/* Help Modal */}
      <Modal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        size="lg"
      >
        <div>
          <h2 className="text-2xl font-bold text-amber-100 mb-6">📚 Notes System Help</h2>
          
          <div className="space-y-6 text-amber-300">
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-3">🎯 Getting Started</h3>
              <p className="mb-3">
                The notes system helps you track all aspects of your D&D campaign. 
                Your notes are automatically saved and synced across devices!
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-3">📝 Note Types</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Session Notes:</strong> Track what happened in each game session</li>
                <li><strong>Campaign Notes:</strong> Long-term campaign story and world building</li>
                <li><strong>Player Notes:</strong> Personal character notes and observations</li>
                <li><strong>DM Notes:</strong> Secret DM information and planning</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-3">🔍 Organization</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Search by title or content</li>
                <li>Filter by note type</li>
                <li>Set priority levels (Low, Normal, High)</li>
                <li>Mark notes as private for sensitive information</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-3">💡 Tips for Beginners</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Take notes during each session</li>
                <li>Use different note types to organize information</li>
                <li>Mark important information as high priority</li>
                <li>Use private notes for character secrets or DM planning</li>
                <li>Search your notes to quickly find information</li>
              </ul>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button
              onClick={() => setShowHelp(false)}
              variant="primary"
            >
              Got it!
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
