'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Input, Modal } from '../ui';
import { LoadingSkeleton, LoadingSpinner } from '../ui/LoadingSkeleton';
import { useAuth } from '../../contexts/AuthContext';
import { fetchList } from '../../lib/dnd-api';
import { validateCharacterName, validateLevel, validateAbilityScore, validateArmorClass, validateSpeed, validateHitPoints } from '../../lib/validation';
import { isDM } from '../../lib/permissions';

export default function CharacterSheetSimple() {
  const { user } = useAuth();
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [validationErrors, setValidationErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // For players, we'll work with a single character directly
  const playerCharacter = isDM(user) ? null : characters[0] || null;
  const currentCharacter = isDM(user) ? selectedCharacter : playerCharacter;

  // API data
  const [races, setRaces] = useState([]);
  const [classes, setClasses] = useState([]);
  const [alignments] = useState([
    { value: 'lawful-good', label: 'Lawful Good' },
    { value: 'neutral-good', label: 'Neutral Good' },
    { value: 'chaotic-good', label: 'Chaotic Good' },
    { value: 'lawful-neutral', label: 'Lawful Neutral' },
    { value: 'true-neutral', label: 'True Neutral' },
    { value: 'chaotic-neutral', label: 'Chaotic Neutral' },
    { value: 'lawful-evil', label: 'Lawful Evil' },
    { value: 'neutral-evil', label: 'Neutral Evil' },
    { value: 'chaotic-evil', label: 'Chaotic Evil' }
  ]);

  // New character form state
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    class: '',
    level: 1,
    race: '',
    background: '',
    alignment: '',
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
    speed: 30
  });

  // Load races and classes from D&D API
  useEffect(() => {
    const loadApiData = async () => {
      try {
        const [racesData, classesData] = await Promise.all([
          fetchList('races'),
          fetchList('classes')
        ]);
        
        setRaces(racesData.results || []);
        setClasses(classesData.results || []);
      } catch (err) {
        console.error('Error loading API data:', err);
        // Fallback to basic options if API fails
        setRaces([
          { name: 'Human', index: 'human' },
          { name: 'Elf', index: 'elf' },
          { name: 'Dwarf', index: 'dwarf' },
          { name: 'Halfling', index: 'halfling' }
        ]);
        setClasses([
          { name: 'Fighter', index: 'fighter' },
          { name: 'Wizard', index: 'wizard' },
          { name: 'Rogue', index: 'rogue' },
          { name: 'Cleric', index: 'cleric' }
        ]);
      }
    };
    
    loadApiData();
  }, []);

  // Load characters from database
  const loadCharacters = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/characters');
      const data = await response.json();
      
      if (data.success) {
        setCharacters(data.characters);
        
        if (isDM(user)) {
          // DM: Select first character if none selected
          if (data.characters.length > 0 && !selectedCharacter) {
            setSelectedCharacter(data.characters[0]);
          }
        } else {
          // Player: Automatically set their single character
          if (data.characters.length > 0) {
            setSelectedCharacter(data.characters[0]);
          }
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load characters');
      console.error('Error loading characters:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load characters on component mount
  useEffect(() => {
    loadCharacters();
  }, []);

  // Create new character
  const handleCreateCharacter = async () => {
    // Validate form
    const errors = {};
    
    const nameValidation = validateCharacterName(newCharacter.name);
    if (!nameValidation.isValid) errors.name = nameValidation.message;
    
    const levelValidation = validateLevel(newCharacter.level);
    if (!levelValidation.isValid) errors.level = levelValidation.message;
    
    if (!newCharacter.class) errors.class = 'Class is required';
    if (!newCharacter.race) errors.race = 'Race is required';
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setIsCreating(true);
    setValidationErrors({});
    
    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCharacter),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCharacters(prev => [data.character, ...prev]);
        setSelectedCharacter(data.character);
        setNewCharacter({
          name: '',
          class: '',
          level: 1,
          race: '',
          background: '',
          alignment: '',
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
          speed: 30
        });
        setShowCreateModal(false);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create character');
      console.error('Error creating character:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Update character
  const handleUpdateCharacter = async (field, value) => {
    if (!currentCharacter) return;
    
    try {
      const updateData = { [field]: value };
      
      const response = await fetch(`/api/characters/${currentCharacter.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCharacters(prev => prev.map(char => 
          char.id === currentCharacter.id ? data.character : char
        ));
        setSelectedCharacter(data.character);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update character');
      console.error('Error updating character:', err);
    }
  };

  // Delete character
  const handleDeleteCharacter = async (characterId) => {
    try {
      const response = await fetch(`/api/characters/${characterId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCharacters(prev => prev.filter(char => char.id !== characterId));
        if (selectedCharacter?.id === characterId) {
          setSelectedCharacter(characters.length > 1 ? characters.find(c => c.id !== characterId) : null);
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to delete character');
      console.error('Error deleting character:', err);
    }
  };

  // Calculate ability score modifiers
  const getAbilityModifier = (score) => {
    return Math.floor((score - 10) / 2);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-amber-300 text-sm mb-4">Create and manage your D&D characters</p>
        </div>
        <LoadingSkeleton type="character" count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-amber-300 text-sm mb-4">Create and manage your D&D characters</p>
        
        {/* Help Button */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHelp(true)}
            className="text-amber-400 hover:text-amber-300"
          >
            ❓ How to use Character Sheets
          </Button>
        </div>
      </div>

      {/* Character Selection - Role-aware */}
      {isDM(user) ? (
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedCharacter?.id || ''}
            onChange={(e) => {
              const character = characters.find(c => c.id === e.target.value);
              setSelectedCharacter(character);
            }}
            className="flex-1 px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
          >
            <option value="">Select a character...</option>
            {characters.map(character => (
              <option key={character.id} value={character.id}>
                {character.name} - Level {character.level} {character.race} {character.class}
              </option>
            ))}
          </select>
          
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            size="lg"
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
          >
            ➕ New Character
          </Button>
        </div>
      ) : (
        /* Player Character Header */
        <div className="text-center py-4">
          {currentCharacter ? (
            <div className="bg-gradient-to-r from-amber-600/20 to-amber-700/20 border border-amber-500/30 rounded-xl p-6">
              <div className="text-4xl mb-3">🧙</div>
              <div className="font-bold text-2xl text-amber-100 mb-2">{currentCharacter.name}</div>
              <div className="text-amber-300 text-lg">
                Level {currentCharacter.level} {currentCharacter.race} {currentCharacter.class}
              </div>
              {currentCharacter.background && (
                <div className="text-amber-400 text-sm mt-2 italic">{currentCharacter.background}</div>
              )}
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-amber-500/30 rounded-xl p-6">
              <div className="text-4xl mb-3">❓</div>
              <div className="text-amber-400 text-lg">No character found</div>
              <div className="text-amber-500 text-sm mt-2">Contact your DM to create a character</div>
            </div>
          )}
        </div>
      )}

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

      {/* Character Sheet Content */}
      {currentCharacter ? (
        <div className="space-y-6">
          {/* Character Header */}
          <Card variant="glass" size="md">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-amber-100">
                  {currentCharacter.name}
                </h2>
                <p className="text-amber-300">
                  Level {currentCharacter.level} {currentCharacter.race} {currentCharacter.class}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleDeleteCharacter(currentCharacter.id)}
                  variant="danger"
                  size="sm"
                >
                  🗑️ Delete
                </Button>
              </div>
            </div>
          </Card>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'basic', name: 'Basic Info', emoji: '📋' },
              { id: 'abilities', name: 'Abilities', emoji: '💪' },
              { id: 'combat', name: 'Combat', emoji: '⚔️' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-amber-500 text-white shadow-lg'
                    : 'bg-slate-700/50 text-amber-300 hover:bg-slate-600/50'
                }`}
              >
                {tab.emoji} {tab.name}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'basic' && (
            <Card variant="glass" size="md">
              <h3 className="text-xl font-bold text-amber-100 mb-4">📋 Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Character Name</label>
                  <Input
                    value={currentCharacter.name}
                    onChange={(e) => handleUpdateCharacter('name', e.target.value)}
                    placeholder="Enter character name"
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Class</label>
                  <select
                    value={currentCharacter.class}
                    onChange={(e) => handleUpdateCharacter('class', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
                  >
                    <option value="">Select class...</option>
                    {classes.map(cls => (
                      <option key={cls.index} value={cls.name}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Level</label>
                  <Input
                    type="number"
                    value={currentCharacter.level}
                    onChange={(e) => handleUpdateCharacter('level', parseInt(e.target.value) || 1)}
                    min="1"
                    max="20"
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Race</label>
                  <select
                    value={currentCharacter.race}
                    onChange={(e) => handleUpdateCharacter('race', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
                  >
                    <option value="">Select race...</option>
                    {races.map(race => (
                      <option key={race.index} value={race.name}>
                        {race.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Background</label>
                  <Input
                    value={currentCharacter.background || ''}
                    onChange={(e) => handleUpdateCharacter('background', e.target.value)}
                    placeholder="Enter background"
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Alignment</label>
                  <select
                    value={currentCharacter.alignment || ''}
                    onChange={(e) => handleUpdateCharacter('alignment', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
                  >
                    <option value="">Select alignment...</option>
                    {alignments.map(alignment => (
                      <option key={alignment.value} value={alignment.label}>
                        {alignment.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'abilities' && (
            <Card variant="glass" size="md">
              <h3 className="text-xl font-bold text-amber-100 mb-4">💪 Ability Scores</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map(ability => (
                  <div key={ability} className="text-center">
                    <div className="text-amber-300 text-sm capitalize mb-1">{ability}</div>
                    <Input
                      type="number"
                      value={currentCharacter[ability]}
                      onChange={(e) => handleUpdateCharacter(ability, parseInt(e.target.value) || 10)}
                      className="text-center text-lg font-bold"
                    />
                    <div className="text-amber-400 text-sm mt-1">
                      {getAbilityModifier(currentCharacter[ability]) >= 0 ? '+' : ''}{getAbilityModifier(currentCharacter[ability])}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'combat' && (
            <Card variant="glass" size="md">
              <h3 className="text-xl font-bold text-amber-100 mb-4">⚔️ Combat Stats</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Armor Class</label>
                  <Input
                    type="number"
                    value={currentCharacter.armorClass}
                    onChange={(e) => handleUpdateCharacter('armorClass', parseInt(e.target.value) || 10)}
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Hit Points (Current)</label>
                  <Input
                    type="number"
                    value={currentCharacter.hitPoints}
                    onChange={(e) => handleUpdateCharacter('hitPoints', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Hit Points (Maximum)</label>
                  <Input
                    type="number"
                    value={currentCharacter.maxHitPoints}
                    onChange={(e) => handleUpdateCharacter('maxHitPoints', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Speed</label>
                  <Input
                    type="number"
                    value={currentCharacter.speed}
                    onChange={(e) => handleUpdateCharacter('speed', parseInt(e.target.value) || 30)}
                  />
                </div>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card variant="glass" size="md">
          <div className="text-center py-8">
            <div className="text-4xl mb-2">⚔️</div>
            <div className="text-amber-300 text-lg">No character selected</div>
            <div className="text-amber-400 text-sm">
              {characters.length === 0 ? 'Create your first character to get started!' : 'Select a character from the dropdown above'}
            </div>
          </div>
        </Card>
      )}

      {/* Create Character Modal - DM Only */}
      {isDM(user) && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
          setNewCharacter({
            name: '',
            class: '',
            level: 1,
            race: '',
            background: '',
            alignment: '',
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
            speed: 30
          });
        }}
        size="lg"
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-amber-100 mb-6">⚔️ Create New Character</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Character Name"
                    value={newCharacter.name}
                    onChange={(e) => setNewCharacter(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter character name"
                    error={validationErrors.name}
                    required
                  />
                </div>
              <div>
                <label className="block text-amber-300 text-sm mb-1">Class *</label>
                <select
                  value={newCharacter.class}
                  onChange={(e) => setNewCharacter(prev => ({ ...prev, class: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
                >
                  <option value="">Select class...</option>
                  {classes.map(cls => (
                    <option key={cls.index} value={cls.name}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-amber-300 text-sm mb-1">Level</label>
                <Input
                  type="number"
                  value={newCharacter.level}
                  onChange={(e) => setNewCharacter(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                  min="1"
                  max="20"
                />
              </div>
              <div>
                <label className="block text-amber-300 text-sm mb-1">Race *</label>
                <select
                  value={newCharacter.race}
                  onChange={(e) => setNewCharacter(prev => ({ ...prev, race: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
                >
                  <option value="">Select race...</option>
                  {races.map(race => (
                    <option key={race.index} value={race.name}>
                      {race.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-amber-300 text-sm mb-1">Background</label>
                <Input
                  value={newCharacter.background}
                  onChange={(e) => setNewCharacter(prev => ({ ...prev, background: e.target.value }))}
                  placeholder="Enter background"
                />
              </div>
              <div>
                <label className="block text-amber-300 text-sm mb-1">Alignment</label>
                <select
                  value={newCharacter.alignment}
                  onChange={(e) => setNewCharacter(prev => ({ ...prev, alignment: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
                >
                  <option value="">Select alignment...</option>
                  {alignments.map(alignment => (
                    <option key={alignment.value} value={alignment.label}>
                      {alignment.label}
                    </option>
                  ))}
                </select>
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
              onClick={handleCreateCharacter}
              variant="primary"
              disabled={isCreating || !newCharacter.name.trim() || !newCharacter.class.trim() || !newCharacter.race.trim()}
            >
              {isCreating ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Creating...
                </div>
              ) : (
                'Create Character'
              )}
            </Button>
          </div>
        </div>
      </Modal>
      )}

      {/* Help Modal */}
      <Modal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        size="lg"
      >
        <div>
          <h2 className="text-2xl font-bold text-amber-100 mb-6">📚 Character Sheet Help</h2>
          
          <div className="space-y-6 text-amber-300">
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-3">🎯 Getting Started</h3>
              <p className="mb-3">
                The character sheet system helps you create and manage your D&D characters. 
                All character data is automatically saved and synced across devices!
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-3">📋 Character Creation</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Click &quot;New Character&quot; to create a new character</li>
                <li>Fill in basic information (name, class, race are required)</li>
                <li>Set ability scores and combat stats</li>
                <li>All changes are saved automatically</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-3">💪 Ability Scores</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Strength: Physical power and athletic ability</li>
                <li>Dexterity: Agility, reflexes, and balance</li>
                <li>Constitution: Health, stamina, and vital force</li>
                <li>Intelligence: Reasoning and memory</li>
                <li>Wisdom: Awareness, intuition, and insight</li>
                <li>Charisma: Force of personality and leadership</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-3">💡 Tips for Beginners</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Start with basic information and work your way through each tab</li>
                <li>Use dropdowns to select races and classes from official D&D data</li>
                <li>Update your character sheet after each session</li>
                <li>Save frequently - changes are auto-saved to the database</li>
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
