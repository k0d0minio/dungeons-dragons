'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Input, Modal } from '../ui';

/**
 * NoteTakingSystem Component
 * 
 * A comprehensive note-taking system for D&D campaigns.
 * Supports different note types: session notes, campaign notes, player notes, and DM notes.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.initialNotes - Optional initial notes data
 * @param {Function} props.onNotesChange - Callback when notes data changes
 * @param {boolean} props.isDM - Whether the user is a DM (affects note visibility)
 */
export default function NoteTakingSystem({ 
  initialNotes = null, 
  onNotesChange,
  isDM = false 
}) {
  // Notes data structure
  const [notes, setNotes] = useState(initialNotes || {
    sessions: [],
    campaign: [],
    player: [],
    dm: []
  });

  const [activeTab, setActiveTab] = useState('sessions');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New note form state
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    type: 'sessions',
    tags: [],
    isPrivate: false,
    priority: 'normal'
  });

  // Validate props
  if (onNotesChange && typeof onNotesChange !== 'function') {
    console.warn('NoteTakingSystem: onNotesChange prop must be a function');
  }

  // Update notes data
  const updateNotes = (newNotes) => {
    setNotes(newNotes);
    if (onNotesChange && typeof onNotesChange === 'function') {
      onNotesChange(newNotes);
    }
  };

  // Add new note
  const addNote = () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return;

    const note = {
      id: Date.now(),
      title: newNote.title.trim(),
      content: newNote.content.trim(),
      type: newNote.type,
      tags: newNote.tags,
      isPrivate: newNote.isPrivate,
      priority: newNote.priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newNotes = {
      ...notes,
      [newNote.type]: [...notes[newNote.type], note]
    };

    updateNotes(newNotes);
    setNewNote({
      title: '',
      content: '',
      type: 'sessions',
      tags: [],
      isPrivate: false,
      priority: 'normal'
    });
    setShowCreateModal(false);
  };

  // Edit note
  const editNote = (note) => {
    setEditingNote(note);
    setNewNote({
      title: note.title,
      content: note.content,
      type: note.type,
      tags: note.tags,
      isPrivate: note.isPrivate,
      priority: note.priority
    });
    setShowEditModal(true);
  };

  // Update edited note
  const updateNote = () => {
    if (!editingNote || !newNote.title.trim() || !newNote.content.trim()) return;

    const updatedNote = {
      ...editingNote,
      title: newNote.title.trim(),
      content: newNote.content.trim(),
      type: newNote.type,
      tags: newNote.tags,
      isPrivate: newNote.isPrivate,
      priority: newNote.priority,
      updatedAt: new Date().toISOString()
    };

    const newNotes = {
      ...notes,
      [editingNote.type]: notes[editingNote.type].map(note => 
        note.id === editingNote.id ? updatedNote : note
      )
    };

    updateNotes(newNotes);
    setShowEditModal(false);
    setEditingNote(null);
    setNewNote({
      title: '',
      content: '',
      type: 'sessions',
      tags: [],
      isPrivate: false,
      priority: 'normal'
    });
  };

  // Delete note
  const deleteNote = (noteId, noteType) => {
    const newNotes = {
      ...notes,
      [noteType]: notes[noteType].filter(note => note.id !== noteId)
    };
    updateNotes(newNotes);
  };

  // Filter notes based on search query
  const getFilteredNotes = (noteType) => {
    const noteList = notes[noteType] || [];
    if (!searchQuery.trim()) return noteList;
    
    return noteList.filter(note => 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  // Tab configuration
  const tabs = [
    { key: 'sessions', name: 'Session Notes', icon: '📝', description: 'Notes from each game session' },
    { key: 'campaign', name: 'Campaign Notes', icon: '🗺️', description: 'Overall campaign information' },
    { key: 'player', name: 'Player Notes', icon: '👤', description: 'Personal character notes' },
    { key: 'dm', name: 'DM Notes', icon: '🎭', description: 'Dungeon Master only notes' }
  ];

  // Priority colors
  const priorityColors = {
    low: 'text-green-400',
    normal: 'text-amber-400',
    high: 'text-red-400'
  };

  // Priority icons
  const priorityIcons = {
    low: '🟢',
    normal: '🟡',
    high: '🔴'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-amber-300 text-sm mb-4">Take notes and track your campaign</p>
        
        {/* Help Button */}
        <div className="flex justify-center">
          <Button
            onClick={() => setShowHelp(true)}
            variant="ghost"
            size="sm"
            icon="❓"
          >
            Help
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card variant="glass" size="md">
        <Input
          placeholder="🔍 Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Card>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 justify-center">
        {tabs.map(tab => (
          <Button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            variant={activeTab === tab.key ? 'primary' : 'ghost'}
            size="sm"
            icon={tab.icon}
            title={tab.description}
          >
            {tab.name}
          </Button>
        ))}
      </div>

      {/* Create Note Button */}
      <div className="flex justify-center">
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          size="lg"
          icon="➕"
        >
          Create New Note
        </Button>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {getFilteredNotes(activeTab).length > 0 ? (
          getFilteredNotes(activeTab).map(note => (
            <Card key={note.id} variant="elevated" size="md" hover>
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-amber-100 font-bold text-lg">{note.title}</h3>
                      <span className={`text-sm ${priorityColors[note.priority]}`}>
                        {priorityIcons[note.priority]}
                      </span>
                      {note.isPrivate && (
                        <span className="text-red-400 text-sm">🔒</span>
                      )}
                    </div>
                    <p className="text-amber-300 text-sm mb-2 line-clamp-3">
                      {note.content}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-amber-400">
                      <span>Created: {new Date(note.createdAt).toLocaleDateString()}</span>
                      <span>Updated: {new Date(note.updatedAt).toLocaleDateString()}</span>
                      {note.tags.length > 0 && (
                        <span>Tags: {note.tags.join(', ')}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    onClick={() => editNote(note)}
                    variant="secondary"
                    size="sm"
                    icon="✏️"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => deleteNote(note.id, note.type)}
                    variant="danger"
                    size="sm"
                    icon="🗑️"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card variant="glass" size="lg">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <div className="text-amber-200 text-xl font-bold mb-2">No Notes Yet</div>
              <div className="text-amber-300 text-sm mb-4">
                {searchQuery ? 'No notes match your search' : `Create your first ${tabs.find(t => t.key === activeTab)?.name.toLowerCase()}`}
              </div>
              {!searchQuery && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  variant="primary"
                  size="md"
                  icon="➕"
                >
                  Create Note
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Create Note Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Note"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Note Title"
            value={newNote.title}
            onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
            placeholder="Enter note title"
            required
          />
          
          <div>
            <label className="block text-amber-200 text-sm font-semibold mb-2">Note Type</label>
            <select
              value={newNote.type}
              onChange={(e) => setNewNote({ ...newNote, type: e.target.value })}
              className="w-full bg-slate-700 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-100 focus:outline-none focus:border-amber-500"
            >
              {tabs.map(tab => (
                <option key={tab.key} value={tab.key}>
                  {tab.icon} {tab.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-amber-200 text-sm font-semibold mb-2">Content</label>
            <textarea
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              placeholder="Enter your note content..."
              className="w-full bg-slate-700 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-100 placeholder-amber-300 focus:outline-none focus:border-amber-500 h-32 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-amber-200 text-sm font-semibold mb-2">Priority</label>
              <select
                value={newNote.priority}
                onChange={(e) => setNewNote({ ...newNote, priority: e.target.value })}
                className="w-full bg-slate-700 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-100 focus:outline-none focus:border-amber-500"
              >
                <option value="low">🟢 Low</option>
                <option value="normal">🟡 Normal</option>
                <option value="high">🔴 High</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPrivate"
                checked={newNote.isPrivate}
                onChange={(e) => setNewNote({ ...newNote, isPrivate: e.target.checked })}
                className="w-4 h-4 text-amber-600 bg-slate-700 border-amber-500 rounded focus:ring-amber-500"
              />
              <label htmlFor="isPrivate" className="text-amber-200 text-sm">
                Private Note
              </label>
            </div>
          </div>

          <div>
            <label className="block text-amber-200 text-sm font-semibold mb-2">Tags (comma-separated)</label>
            <Input
              value={newNote.tags.join(', ')}
              onChange={(e) => setNewNote({ 
                ...newNote, 
                tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
              })}
              placeholder="e.g., combat, npc, location"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            onClick={() => setShowCreateModal(false)}
            variant="secondary"
            size="md"
          >
            Cancel
          </Button>
          <Button
            onClick={addNote}
            variant="primary"
            size="md"
            disabled={!newNote.title.trim() || !newNote.content.trim()}
          >
            Create Note
          </Button>
        </div>
      </Modal>

      {/* Edit Note Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Note"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Note Title"
            value={newNote.title}
            onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
            placeholder="Enter note title"
            required
          />
          
          <div>
            <label className="block text-amber-200 text-sm font-semibold mb-2">Note Type</label>
            <select
              value={newNote.type}
              onChange={(e) => setNewNote({ ...newNote, type: e.target.value })}
              className="w-full bg-slate-700 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-100 focus:outline-none focus:border-amber-500"
            >
              {tabs.map(tab => (
                <option key={tab.key} value={tab.key}>
                  {tab.icon} {tab.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-amber-200 text-sm font-semibold mb-2">Content</label>
            <textarea
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              placeholder="Enter your note content..."
              className="w-full bg-slate-700 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-100 placeholder-amber-300 focus:outline-none focus:border-amber-500 h-32 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-amber-200 text-sm font-semibold mb-2">Priority</label>
              <select
                value={newNote.priority}
                onChange={(e) => setNewNote({ ...newNote, priority: e.target.value })}
                className="w-full bg-slate-700 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-100 focus:outline-none focus:border-amber-500"
              >
                <option value="low">🟢 Low</option>
                <option value="normal">🟡 Normal</option>
                <option value="high">🔴 High</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPrivateEdit"
                checked={newNote.isPrivate}
                onChange={(e) => setNewNote({ ...newNote, isPrivate: e.target.checked })}
                className="w-4 h-4 text-amber-600 bg-slate-700 border-amber-500 rounded focus:ring-amber-500"
              />
              <label htmlFor="isPrivateEdit" className="text-amber-200 text-sm">
                Private Note
              </label>
            </div>
          </div>

          <div>
            <label className="block text-amber-200 text-sm font-semibold mb-2">Tags (comma-separated)</label>
            <Input
              value={newNote.tags.join(', ')}
              onChange={(e) => setNewNote({ 
                ...newNote, 
                tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
              })}
              placeholder="e.g., combat, npc, location"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            onClick={() => setShowEditModal(false)}
            variant="secondary"
            size="md"
          >
            Cancel
          </Button>
          <Button
            onClick={updateNote}
            variant="primary"
            size="md"
            disabled={!newNote.title.trim() || !newNote.content.trim()}
          >
            Update Note
          </Button>
        </div>
      </Modal>

      {/* Help Modal */}
      <Modal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Note-Taking System Help"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <div className="text-amber-200 font-semibold text-sm mb-1">Session Notes</div>
            <div className="text-amber-300 text-xs">Record what happened in each game session, including combat, roleplay, and important events.</div>
          </div>
          <div>
            <div className="text-amber-200 font-semibold text-sm mb-1">Campaign Notes</div>
            <div className="text-amber-300 text-xs">Track overall campaign information, world lore, NPCs, and story arcs.</div>
          </div>
          <div>
            <div className="text-amber-200 font-semibold text-sm mb-1">Player Notes</div>
            <div className="text-amber-300 text-xs">Personal notes about your character, goals, and observations.</div>
          </div>
          <div>
            <div className="text-amber-200 font-semibold text-sm mb-1">DM Notes</div>
            <div className="text-amber-300 text-xs">Dungeon Master only notes for planning, secrets, and campaign management.</div>
          </div>
          <div>
            <div className="text-amber-200 font-semibold text-sm mb-1">Search & Tags</div>
            <div className="text-amber-300 text-xs">Use the search bar to find notes by title, content, or tags. Add tags to organize your notes.</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => setShowHelp(false)}
            variant="primary"
            size="md"
          >
            Got it!
          </Button>
        </div>
      </Modal>
    </div>
  );
}
