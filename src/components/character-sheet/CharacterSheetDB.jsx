'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Input, Modal } from '../ui';
import { useAuth } from '../../contexts/AuthContext';

export default function CharacterSheetDB() {
  const { user } = useAuth();
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // New character form state
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    class: '',
    level: 1,
    race: '',
    background: '',
    alignment: '',
    experience: 0,
    abilityScores: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    },
    proficiencyBonus: 2,
    armorClass: 10,
    hitPoints: {
      current: 8,
      maximum: 8,
      temporary: 0
    },
    speed: 30,
    skills: {
      acrobatics: { proficient: false, modifier: 0 },
      animalHandling: { proficient: false, modifier: 0 },
      arcana: { proficient: false, modifier: 0 },
      athletics: { proficient: false, modifier: 0 },
      deception: { proficient: false, modifier: 0 },
      history: { proficient: false, modifier: 0 },
      insight: { proficient: false, modifier: 0 },
      intimidation: { proficient: false, modifier: 0 },
      investigation: { proficient: false, modifier: 0 },
      medicine: { proficient: false, modifier: 0 },
      nature: { proficient: false, modifier: 0 },
      perception: { proficient: false, modifier: 0 },
      performance: { proficient: false, modifier: 0 },
      persuasion: { proficient: false, modifier: 0 },
      religion: { proficient: false, modifier: 0 },
      sleightOfHand: { proficient: false, modifier: 0 },
      stealth: { proficient: false, modifier: 0 },
      survival: { proficient: false, modifier: 0 }
    },
    initiative: 0,
    savingThrows: {
      strength: { proficient: false, modifier: 0 },
      dexterity: { proficient: false, modifier: 0 },
      constitution: { proficient: false, modifier: 0 },
      intelligence: { proficient: false, modifier: 0 },
      wisdom: { proficient: false, modifier: 0 },
      charisma: { proficient: false, modifier: 0 }
    },
    equipment: [],
    weapons: [],
    armor: null,
    shield: null,
    spells: {
      known: [],
      prepared: [],
      spellSlots: {
        level1: { total: 0, used: 0 },
        level2: { total: 0, used: 0 },
        level3: { total: 0, used: 0 },
        level4: { total: 0, used: 0 },
        level5: { total: 0, used: 0 },
        level6: { total: 0, used: 0 },
        level7: { total: 0, used: 0 },
        level8: { total: 0, used: 0 },
        level9: { total: 0, used: 0 }
      }
    },
    features: [],
    traits: [],
    languages: [],
    notes: {
      personality: '',
      ideals: '',
      bonds: '',
      flaws: '',
      backstory: '',
      dmNotes: ''
    }
  });

  // Load characters from database
  const loadCharacters = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/characters');
      const data = await response.json();
      
      if (data.success) {
        setCharacters(data.characters);
        if (data.characters.length > 0 && !selectedCharacter) {
          setSelectedCharacter(data.characters[0]);
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
          abilityScores: {
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 10,
            wisdom: 10,
            charisma: 10
          },
          proficiencyBonus: 2,
          armorClass: 10,
          hitPoints: {
            current: 8,
            maximum: 8,
            temporary: 0
          },
          speed: 30,
          skills: {
            acrobatics: { proficient: false, modifier: 0 },
            animalHandling: { proficient: false, modifier: 0 },
            arcana: { proficient: false, modifier: 0 },
            athletics: { proficient: false, modifier: 0 },
            deception: { proficient: false, modifier: 0 },
            history: { proficient: false, modifier: 0 },
            insight: { proficient: false, modifier: 0 },
            intimidation: { proficient: false, modifier: 0 },
            investigation: { proficient: false, modifier: 0 },
            medicine: { proficient: false, modifier: 0 },
            nature: { proficient: false, modifier: 0 },
            perception: { proficient: false, modifier: 0 },
            performance: { proficient: false, modifier: 0 },
            persuasion: { proficient: false, modifier: 0 },
            religion: { proficient: false, modifier: 0 },
            sleightOfHand: { proficient: false, modifier: 0 },
            stealth: { proficient: false, modifier: 0 },
            survival: { proficient: false, modifier: 0 }
          },
          initiative: 0,
          savingThrows: {
            strength: { proficient: false, modifier: 0 },
            dexterity: { proficient: false, modifier: 0 },
            constitution: { proficient: false, modifier: 0 },
            intelligence: { proficient: false, modifier: 0 },
            wisdom: { proficient: false, modifier: 0 },
            charisma: { proficient: false, modifier: 0 }
          },
          equipment: [],
          weapons: [],
          armor: null,
          shield: null,
          spells: {
            known: [],
            prepared: [],
            spellSlots: {
              level1: { total: 0, used: 0 },
              level2: { total: 0, used: 0 },
              level3: { total: 0, used: 0 },
              level4: { total: 0, used: 0 },
              level5: { total: 0, used: 0 },
              level6: { total: 0, used: 0 },
              level7: { total: 0, used: 0 },
              level8: { total: 0, used: 0 },
              level9: { total: 0, used: 0 }
            }
          },
          features: [],
          traits: [],
          languages: [],
          notes: {
            personality: '',
            ideals: '',
            bonds: '',
            flaws: '',
            backstory: '',
            dmNotes: ''
          }
        });
        setShowCreateModal(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create character');
      console.error('Error creating character:', err);
    }
  };

  // Update character
  const handleUpdateCharacter = async (characterData) => {
    if (!selectedCharacter) return;
    
    try {
      const response = await fetch(`/api/characters/${selectedCharacter.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(characterData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCharacters(prev => prev.map(char => 
          char.id === selectedCharacter.id ? data.character : char
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

  // Calculate skill modifiers
  const getSkillModifier = (skillName) => {
    if (!selectedCharacter) return 0;
    const skill = selectedCharacter.skills[skillName];
    const abilityScore = getAbilityScoreForSkill(skillName);
    const abilityModifier = getAbilityModifier(abilityScore);
    const proficiencyBonus = skill.proficient ? selectedCharacter.proficiencyBonus : 0;
    return abilityModifier + proficiencyBonus;
  };

  // Get ability score for skill
  const getAbilityScoreForSkill = (skillName) => {
    if (!selectedCharacter) return 10;
    const skillAbilityMap = {
      acrobatics: 'dexterity',
      animalHandling: 'wisdom',
      arcana: 'intelligence',
      athletics: 'strength',
      deception: 'charisma',
      history: 'intelligence',
      insight: 'wisdom',
      intimidation: 'charisma',
      investigation: 'intelligence',
      medicine: 'wisdom',
      nature: 'intelligence',
      perception: 'wisdom',
      performance: 'charisma',
      persuasion: 'charisma',
      religion: 'intelligence',
      sleightOfHand: 'dexterity',
      stealth: 'dexterity',
      survival: 'wisdom'
    };
    return selectedCharacter.abilityScores[skillAbilityMap[skillName]] || 10;
  };

  // Roll dice function
  const rollDice = (dice, modifier = 0) => {
    const [num, sides] = dice.split('d').map(Number);
    let total = 0;
    for (let i = 0; i < num; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }
    return total + modifier;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">⚔️</div>
          <div className="text-amber-300">Loading your characters...</div>
        </div>
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

      {/* Character Selection */}
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
      {selectedCharacter ? (
        <div className="space-y-6">
          {/* Character Header */}
          <Card variant="glass" size="md">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-amber-100">
                  {selectedCharacter.name}
                </h2>
                <p className="text-amber-300">
                  Level {selectedCharacter.level} {selectedCharacter.race} {selectedCharacter.class}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleDeleteCharacter(selectedCharacter.id)}
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
              { id: 'skills', name: 'Skills', emoji: '🎯' },
              { id: 'combat', name: 'Combat', emoji: '⚔️' },
              { id: 'equipment', name: 'Equipment', emoji: '🎒' },
              { id: 'spells', name: 'Spells', emoji: '✨' },
              { id: 'notes', name: 'Notes', emoji: '📝' }
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
                    value={selectedCharacter.name}
                    onChange={(e) => handleUpdateCharacter({ ...selectedCharacter, name: e.target.value })}
                    placeholder="Enter character name"
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Class</label>
                  <Input
                    value={selectedCharacter.class}
                    onChange={(e) => handleUpdateCharacter({ ...selectedCharacter, class: e.target.value })}
                    placeholder="Enter class"
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Level</label>
                  <Input
                    type="number"
                    value={selectedCharacter.level}
                    onChange={(e) => handleUpdateCharacter({ ...selectedCharacter, level: parseInt(e.target.value) || 1 })}
                    min="1"
                    max="20"
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Race</label>
                  <Input
                    value={selectedCharacter.race}
                    onChange={(e) => handleUpdateCharacter({ ...selectedCharacter, race: e.target.value })}
                    placeholder="Enter race"
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Background</label>
                  <Input
                    value={selectedCharacter.background}
                    onChange={(e) => handleUpdateCharacter({ ...selectedCharacter, background: e.target.value })}
                    placeholder="Enter background"
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Alignment</label>
                  <Input
                    value={selectedCharacter.alignment}
                    onChange={(e) => handleUpdateCharacter({ ...selectedCharacter, alignment: e.target.value })}
                    placeholder="Enter alignment"
                  />
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'abilities' && (
            <Card variant="glass" size="md">
              <h3 className="text-xl font-bold text-amber-100 mb-4">💪 Ability Scores</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(selectedCharacter.abilityScores).map(([ability, score]) => (
                  <div key={ability} className="text-center">
                    <div className="text-amber-300 text-sm capitalize mb-1">{ability}</div>
                    <Input
                      type="number"
                      value={score}
                      onChange={(e) => handleUpdateCharacter({
                        ...selectedCharacter,
                        abilityScores: {
                          ...selectedCharacter.abilityScores,
                          [ability]: parseInt(e.target.value) || 10
                        }
                      })}
                      className="text-center text-lg font-bold"
                    />
                    <div className="text-amber-400 text-sm mt-1">
                      {getAbilityModifier(score) >= 0 ? '+' : ''}{getAbilityModifier(score)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'skills' && (
            <Card variant="glass" size="md">
              <h3 className="text-xl font-bold text-amber-100 mb-4">🎯 Skills</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(selectedCharacter.skills).map(([skillName, skill]) => (
                  <div key={skillName} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={skill.proficient}
                        onChange={(e) => handleUpdateCharacter({
                          ...selectedCharacter,
                          skills: {
                            ...selectedCharacter.skills,
                            [skillName]: {
                              ...skill,
                              proficient: e.target.checked
                            }
                          }
                        })}
                        className="rounded"
                      />
                      <span className="text-amber-300 capitalize">
                        {skillName.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                    <span className="text-amber-400 font-bold">
                      {getSkillModifier(skillName) >= 0 ? '+' : ''}{getSkillModifier(skillName)}
                    </span>
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
                    value={selectedCharacter.armorClass}
                    onChange={(e) => handleUpdateCharacter({ ...selectedCharacter, armorClass: parseInt(e.target.value) || 10 })}
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Hit Points (Current)</label>
                  <Input
                    type="number"
                    value={selectedCharacter.hitPoints.current}
                    onChange={(e) => handleUpdateCharacter({
                      ...selectedCharacter,
                      hitPoints: {
                        ...selectedCharacter.hitPoints,
                        current: parseInt(e.target.value) || 0
                      }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Hit Points (Maximum)</label>
                  <Input
                    type="number"
                    value={selectedCharacter.hitPoints.maximum}
                    onChange={(e) => handleUpdateCharacter({
                      ...selectedCharacter,
                      hitPoints: {
                        ...selectedCharacter.hitPoints,
                        maximum: parseInt(e.target.value) || 0
                      }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Speed</label>
                  <Input
                    type="number"
                    value={selectedCharacter.speed}
                    onChange={(e) => handleUpdateCharacter({ ...selectedCharacter, speed: parseInt(e.target.value) || 30 })}
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Initiative</label>
                  <Input
                    type="number"
                    value={selectedCharacter.initiative}
                    onChange={(e) => handleUpdateCharacter({ ...selectedCharacter, initiative: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Proficiency Bonus</label>
                  <Input
                    type="number"
                    value={selectedCharacter.proficiencyBonus}
                    onChange={(e) => handleUpdateCharacter({ ...selectedCharacter, proficiencyBonus: parseInt(e.target.value) || 2 })}
                  />
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'notes' && (
            <Card variant="glass" size="md">
              <h3 className="text-xl font-bold text-amber-100 mb-4">📝 Character Notes</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Personality</label>
                  <textarea
                    value={selectedCharacter.notes.personality}
                    onChange={(e) => handleUpdateCharacter({
                      ...selectedCharacter,
                      notes: {
                        ...selectedCharacter.notes,
                        personality: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100 resize-none"
                    rows="3"
                    placeholder="Describe your character's personality..."
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Ideals</label>
                  <textarea
                    value={selectedCharacter.notes.ideals}
                    onChange={(e) => handleUpdateCharacter({
                      ...selectedCharacter,
                      notes: {
                        ...selectedCharacter.notes,
                        ideals: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100 resize-none"
                    rows="3"
                    placeholder="What does your character believe in?"
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Bonds</label>
                  <textarea
                    value={selectedCharacter.notes.bonds}
                    onChange={(e) => handleUpdateCharacter({
                      ...selectedCharacter,
                      notes: {
                        ...selectedCharacter.notes,
                        bonds: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100 resize-none"
                    rows="3"
                    placeholder="What is your character connected to?"
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Flaws</label>
                  <textarea
                    value={selectedCharacter.notes.flaws}
                    onChange={(e) => handleUpdateCharacter({
                      ...selectedCharacter,
                      notes: {
                        ...selectedCharacter.notes,
                        flaws: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100 resize-none"
                    rows="3"
                    placeholder="What are your character's weaknesses?"
                  />
                </div>
                <div>
                  <label className="block text-amber-300 text-sm mb-1">Backstory</label>
                  <textarea
                    value={selectedCharacter.notes.backstory}
                    onChange={(e) => handleUpdateCharacter({
                      ...selectedCharacter,
                      notes: {
                        ...selectedCharacter.notes,
                        backstory: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100 resize-none"
                    rows="4"
                    placeholder="Tell your character's story..."
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

      {/* Create Character Modal */}
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
            abilityScores: {
              strength: 10,
              dexterity: 10,
              constitution: 10,
              intelligence: 10,
              wisdom: 10,
              charisma: 10
            },
            proficiencyBonus: 2,
            armorClass: 10,
            hitPoints: {
              current: 8,
              maximum: 8,
              temporary: 0
            },
            speed: 30,
            skills: {
              acrobatics: { proficient: false, modifier: 0 },
              animalHandling: { proficient: false, modifier: 0 },
              arcana: { proficient: false, modifier: 0 },
              athletics: { proficient: false, modifier: 0 },
              deception: { proficient: false, modifier: 0 },
              history: { proficient: false, modifier: 0 },
              insight: { proficient: false, modifier: 0 },
              intimidation: { proficient: false, modifier: 0 },
              investigation: { proficient: false, modifier: 0 },
              medicine: { proficient: false, modifier: 0 },
              nature: { proficient: false, modifier: 0 },
              perception: { proficient: false, modifier: 0 },
              performance: { proficient: false, modifier: 0 },
              persuasion: { proficient: false, modifier: 0 },
              religion: { proficient: false, modifier: 0 },
              sleightOfHand: { proficient: false, modifier: 0 },
              stealth: { proficient: false, modifier: 0 },
              survival: { proficient: false, modifier: 0 }
            },
            initiative: 0,
            savingThrows: {
              strength: { proficient: false, modifier: 0 },
              dexterity: { proficient: false, modifier: 0 },
              constitution: { proficient: false, modifier: 0 },
              intelligence: { proficient: false, modifier: 0 },
              wisdom: { proficient: false, modifier: 0 },
              charisma: { proficient: false, modifier: 0 }
            },
            equipment: [],
            weapons: [],
            armor: null,
            shield: null,
            spells: {
              known: [],
              prepared: [],
              spellSlots: {
                level1: { total: 0, used: 0 },
                level2: { total: 0, used: 0 },
                level3: { total: 0, used: 0 },
                level4: { total: 0, used: 0 },
                level5: { total: 0, used: 0 },
                level6: { total: 0, used: 0 },
                level7: { total: 0, used: 0 },
                level8: { total: 0, used: 0 },
                level9: { total: 0, used: 0 }
              }
            },
            features: [],
            traits: [],
            languages: [],
            notes: {
              personality: '',
              ideals: '',
              bonds: '',
              flaws: '',
              backstory: '',
              dmNotes: ''
            }
          });
        }}
        size="lg"
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-amber-100 mb-6">⚔️ Create New Character</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-amber-300 text-sm mb-1">Character Name *</label>
                <Input
                  value={newCharacter.name}
                  onChange={(e) => setNewCharacter(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter character name"
                />
              </div>
              <div>
                <label className="block text-amber-300 text-sm mb-1">Class *</label>
                <Input
                  value={newCharacter.class}
                  onChange={(e) => setNewCharacter(prev => ({ ...prev, class: e.target.value }))}
                  placeholder="Enter class"
                />
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
                <Input
                  value={newCharacter.race}
                  onChange={(e) => setNewCharacter(prev => ({ ...prev, race: e.target.value }))}
                  placeholder="Enter race"
                />
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
                <Input
                  value={newCharacter.alignment}
                  onChange={(e) => setNewCharacter(prev => ({ ...prev, alignment: e.target.value }))}
                  placeholder="Enter alignment"
                />
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
              disabled={!newCharacter.name.trim() || !newCharacter.class.trim() || !newCharacter.race.trim()}
            >
              Create Character
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
                <li>Click "New Character" to create a new character</li>
                <li>Fill in basic information (name, class, race are required)</li>
                <li>Set ability scores and other stats</li>
                <li>Add skills, equipment, and notes as needed</li>
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
              <h3 className="text-xl font-bold text-amber-200 mb-3">🎯 Skills</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Check the box to mark a skill as proficient</li>
                <li>Proficient skills add your proficiency bonus</li>
                <li>Skill modifiers are calculated automatically</li>
                <li>Each skill is tied to a specific ability score</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-3">💡 Tips for Beginners</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Start with basic information and work your way through each tab</li>
                <li>Use the Notes section to track character development</li>
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
