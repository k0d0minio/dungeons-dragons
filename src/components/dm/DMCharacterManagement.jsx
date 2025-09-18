'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Input, LoadingSkeleton } from '../ui';

export default function DMCharacterManagement() {
  const [characters, setCharacters] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    // Character details (name = username)
    name: '',
    class: '',
    race: '',
    level: 1,
    experience: 0,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    hitPoints: 8,
    maxHitPoints: 8,
    armorClass: 10,
    speed: 30,
    background: '',
    alignment: '',
    personality: '',
    ideals: '',
    bonds: '',
    flaws: '',
    // User credentials
    password: '',
    role: 'PLAYER'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const charactersRes = await fetch('/api/characters');
      
      if (!charactersRes.ok) {
        throw new Error('Failed to fetch characters');
      }
      
      const charactersData = await charactersRes.json();
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
      if (editingCharacter) {
        // Update existing character
        const response = await fetch(`/api/characters/${editingCharacter.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update character');
        }
      } else {
        // Create new character with user
        const response = await fetch('/api/characters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create character');
        }
      }
      
      await fetchData();
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (characterId) => {
    if (!confirm('Are you sure you want to delete this character? This will also delete all their notes and inventory.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/characters/${characterId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete character');
      
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      // Character details (name = username)
      name: '',
      class: '',
      race: '',
      level: 1,
      experience: 0,
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      hitPoints: 8,
      maxHitPoints: 8,
      armorClass: 10,
      speed: 30,
      background: '',
      alignment: '',
      personality: '',
      ideals: '',
      bonds: '',
      flaws: '',
      // User credentials
      password: '',
      role: 'PLAYER'
    });
    setShowCreateForm(false);
    setEditingCharacter(null);
    setError(null);
  };

  const startEdit = (character) => {
    setEditingCharacter(character);
    setFormData({
      // Character details (name = username)
      name: character.name || '',
      class: character.class || '',
      race: character.race || '',
      level: character.level || 1,
      experience: character.experience || 0,
      strength: character.strength || 10,
      dexterity: character.dexterity || 10,
      constitution: character.constitution || 10,
      intelligence: character.intelligence || 10,
      wisdom: character.wisdom || 10,
      charisma: character.charisma || 10,
      hitPoints: character.hitPoints || 8,
      maxHitPoints: character.maxHitPoints || 8,
      armorClass: character.armorClass || 10,
      speed: character.speed || 30,
      background: character.background || '',
      alignment: character.alignment || '',
      personality: character.personality || '',
      ideals: character.ideals || '',
      bonds: character.bonds || '',
      flaws: character.flaws || '',
      // User credentials
      password: '', // Don't pre-fill password
      role: character.user?.role || 'PLAYER'
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
          <h2 className="text-2xl font-bold text-purple-200">🧙 Character Management</h2>
          <p className="text-purple-300 text-sm">Create and manage characters (character name = username)</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          variant="primary"
          size="md"
        >
          ➕ Create Character
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
              {editingCharacter ? '✏️ Edit Character' : '➕ Create New Character'}
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
            {/* Essential fields for character creation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Character Name (Username)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Enter character name (this will be the username)"
              />
              
              <Input
                label={editingCharacter ? "New Password (leave blank to keep current)" : "Password"}
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingCharacter}
                placeholder="Enter login password"
              />
            </div>
            
            {/* Optional character details - only show if editing or if user wants to fill them */}
            {(editingCharacter || formData.name) && (
              <>
                <div className="border-t border-slate-600 pt-4">
                  <h4 className="text-purple-200 font-bold mb-3">Character Details (Optional)</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <Input
                label="Class"
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                placeholder="e.g., Fighter, Wizard"
              />
              
              <Input
                label="Race"
                value={formData.race}
                onChange={(e) => setFormData({ ...formData, race: e.target.value })}
                placeholder="e.g., Human, Elf"
              />
              
              <Input
                label="Level"
                type="number"
                min="1"
                max="20"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
              />
              
              <Input
                label="Experience Points"
                type="number"
                min="0"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: parseInt(e.target.value) || 0 })}
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input
                label="Strength"
                type="number"
                min="1"
                max="30"
                value={formData.strength}
                onChange={(e) => setFormData({ ...formData, strength: parseInt(e.target.value) || 10 })}
              />
              <Input
                label="Dexterity"
                type="number"
                min="1"
                max="30"
                value={formData.dexterity}
                onChange={(e) => setFormData({ ...formData, dexterity: parseInt(e.target.value) || 10 })}
              />
              <Input
                label="Constitution"
                type="number"
                min="1"
                max="30"
                value={formData.constitution}
                onChange={(e) => setFormData({ ...formData, constitution: parseInt(e.target.value) || 10 })}
              />
              <Input
                label="Intelligence"
                type="number"
                min="1"
                max="30"
                value={formData.intelligence}
                onChange={(e) => setFormData({ ...formData, intelligence: parseInt(e.target.value) || 10 })}
              />
              <Input
                label="Wisdom"
                type="number"
                min="1"
                max="30"
                value={formData.wisdom}
                onChange={(e) => setFormData({ ...formData, wisdom: parseInt(e.target.value) || 10 })}
              />
              <Input
                label="Charisma"
                type="number"
                min="1"
                max="30"
                value={formData.charisma}
                onChange={(e) => setFormData({ ...formData, charisma: parseInt(e.target.value) || 10 })}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Hit Points"
                type="number"
                min="1"
                value={formData.hitPoints}
                onChange={(e) => setFormData({ ...formData, hitPoints: parseInt(e.target.value) || 1 })}
              />
              <Input
                label="Max Hit Points"
                type="number"
                min="1"
                value={formData.maxHitPoints}
                onChange={(e) => setFormData({ ...formData, maxHitPoints: parseInt(e.target.value) || 1 })}
              />
              <Input
                label="Armor Class"
                type="number"
                min="1"
                value={formData.armorClass}
                onChange={(e) => setFormData({ ...formData, armorClass: parseInt(e.target.value) || 10 })}
              />
            </div>
            </>
            )}
            
            <div className="flex gap-3">
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {editingCharacter ? '💾 Update Character' : '➕ Create Character'}
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

      {/* Characters List */}
      <Card variant="glass" size="lg">
        <h3 className="text-lg font-bold text-purple-200 mb-4">🧙 All Characters</h3>
        
        {characters.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🧙</div>
            <div className="text-purple-300">No characters found</div>
            <div className="text-purple-400 text-sm">Create your first character to get started</div>
          </div>
        ) : (
          <div className="space-y-3">
            {characters.map(character => (
              <div key={character.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-purple-200 font-bold text-xl">🧙</span>
                  </div>
                  <div>
                    <div className="text-amber-200 font-bold text-lg">{character.name}</div>
                    <div className="text-amber-300">
                      {character.race} {character.class} (Level {character.level})
                    </div>
                    <div className="text-amber-400 text-sm">
                      Player: {character.user?.username || 'Unknown'} • 
                      HP: {character.hitPoints}/{character.maxHitPoints} • 
                      AC: {character.armorClass}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => startEdit(character)}
                    variant="ghost"
                    size="sm"
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(character.id)}
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
