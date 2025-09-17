'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Input, Modal } from '../ui';

/**
 * CharacterSheet Component
 * 
 * A comprehensive D&D 5e character sheet component with all essential elements.
 * Designed for both character creation and ongoing character management.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.initialCharacter - Optional initial character data
 * @param {Function} props.onCharacterChange - Callback when character data changes
 * @param {Function} props.rollDice - Function to roll dice (passed from parent)
 */
export default function CharacterSheet({ 
  initialCharacter = null, 
  onCharacterChange,
  rollDice 
}) {
  // Character data structure
  const [character, setCharacter] = useState(initialCharacter || {
    // Basic Info
    name: '',
    class: '',
    level: 1,
    race: '',
    background: '',
    alignment: '',
    experience: 0,
    
    // Ability Scores
    abilityScores: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    },
    
    // Calculated Stats
    proficiencyBonus: 2,
    armorClass: 10,
    hitPoints: {
      current: 8,
      maximum: 8,
      temporary: 0
    },
    speed: 30,
    
    // Skills
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
    
    // Combat
    initiative: 0,
    savingThrows: {
      strength: { proficient: false, modifier: 0 },
      dexterity: { proficient: false, modifier: 0 },
      constitution: { proficient: false, modifier: 0 },
      intelligence: { proficient: false, modifier: 0 },
      wisdom: { proficient: false, modifier: 0 },
      charisma: { proficient: false, modifier: 0 }
    },
    
    // Equipment
    equipment: [],
    weapons: [],
    armor: null,
    shield: null,
    
    // Spells (if applicable)
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
    
    // Features & Traits
    features: [],
    traits: [],
    languages: [],
    
    // Notes
    notes: {
      personality: '',
      ideals: '',
      bonds: '',
      flaws: '',
      backstory: '',
      dmNotes: ''
    }
  });

  const [activeTab, setActiveTab] = useState('basic');
  const [showHelp, setShowHelp] = useState(false);
  const [showDiceRoller, setShowDiceRoller] = useState(false);

  // Validate props
  if (onCharacterChange && typeof onCharacterChange !== 'function') {
    console.warn('CharacterSheet: onCharacterChange prop must be a function');
  }
  if (rollDice && typeof rollDice !== 'function') {
    console.warn('CharacterSheet: rollDice prop must be a function');
  }

  // Calculate ability score modifiers
  const getAbilityModifier = (score) => {
    return Math.floor((score - 10) / 2);
  };

  // Calculate skill modifiers
  const getSkillModifier = (skillName) => {
    const skill = character.skills[skillName];
    const abilityScore = getAbilityScoreForSkill(skillName);
    const abilityModifier = getAbilityModifier(abilityScore);
    const proficiencyBonus = skill.proficient ? character.proficiencyBonus : 0;
    return abilityModifier + proficiencyBonus;
  };

  // Get ability score for skill
  const getAbilityScoreForSkill = (skillName) => {
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
    return character.abilityScores[skillAbilityMap[skillName]];
  };

  // Update character data
  const updateCharacter = (updates) => {
    const newCharacter = { ...character, ...updates };
    setCharacter(newCharacter);
    if (onCharacterChange && typeof onCharacterChange === 'function') {
      onCharacterChange(newCharacter);
    }
  };

  // Update ability score
  const updateAbilityScore = (ability, value) => {
    const newScores = { ...character.abilityScores, [ability]: parseInt(value) || 0 };
    updateCharacter({ abilityScores: newScores });
  };

  // Toggle skill proficiency
  const toggleSkillProficiency = (skillName) => {
    const newSkills = {
      ...character.skills,
      [skillName]: {
        ...character.skills[skillName],
        proficient: !character.skills[skillName].proficient
      }
    };
    updateCharacter({ skills: newSkills });
  };

  // Roll ability score
  const rollAbilityScore = () => {
    if (!rollDice) return;
    const rolls = [];
    for (let i = 0; i < 4; i++) {
      rolls.push(rollDice(6).total);
    }
    rolls.sort((a, b) => b - a);
    return rolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0);
  };

  // Roll all ability scores
  const rollAllAbilityScores = () => {
    const newScores = {};
    Object.keys(character.abilityScores).forEach(ability => {
      newScores[ability] = rollAbilityScore();
    });
    updateAbilityScore('strength', newScores.strength);
    updateAbilityScore('dexterity', newScores.dexterity);
    updateAbilityScore('constitution', newScores.constitution);
    updateAbilityScore('intelligence', newScores.intelligence);
    updateAbilityScore('wisdom', newScores.wisdom);
    updateAbilityScore('charisma', newScores.charisma);
  };

  // Tab configuration
  const tabs = [
    { key: 'basic', name: 'Basic Info', icon: '📝' },
    { key: 'abilities', name: 'Abilities', icon: '💪' },
    { key: 'skills', name: 'Skills', icon: '🎯' },
    { key: 'combat', name: 'Combat', icon: '⚔️' },
    { key: 'equipment', name: 'Equipment', icon: '🎒' },
    { key: 'spells', name: 'Spells', icon: '✨' },
    { key: 'notes', name: 'Notes', icon: '📄' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-amber-300 text-sm mb-4">Create and manage your D&D character</p>
        
        {/* Help and Dice Roller Buttons */}
        <div className="flex justify-center space-x-3">
          <Button
            onClick={() => setShowHelp(true)}
            variant="ghost"
            size="sm"
            icon="❓"
          >
            Help
          </Button>
          <Button
            onClick={() => setShowDiceRoller(true)}
            variant="secondary"
            size="sm"
            icon="🎲"
          >
            Dice Roller
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 justify-center">
        {tabs.map(tab => (
          <Button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            variant={activeTab === tab.key ? 'primary' : 'ghost'}
            size="sm"
            icon={tab.icon}
          >
            {tab.name}
          </Button>
        ))}
      </div>

      {/* Basic Info Tab */}
      {activeTab === 'basic' && (
        <Card variant="elevated" size="lg">
          <div className="space-y-6">
            <h4 className="text-lg font-bold text-amber-100 mb-4">Basic Information</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Character Name"
                value={character.name}
                onChange={(e) => updateCharacter({ name: e.target.value })}
                placeholder="Enter character name"
                required
              />
              
              <Input
                label="Class"
                value={character.class}
                onChange={(e) => updateCharacter({ class: e.target.value })}
                placeholder="e.g., Fighter, Wizard"
              />
              
              <Input
                label="Level"
                type="number"
                value={character.level}
                onChange={(e) => updateCharacter({ level: parseInt(e.target.value) || 1 })}
                min="1"
                max="20"
              />
              
              <Input
                label="Race"
                value={character.race}
                onChange={(e) => updateCharacter({ race: e.target.value })}
                placeholder="e.g., Human, Elf"
              />
              
              <Input
                label="Background"
                value={character.background}
                onChange={(e) => updateCharacter({ background: e.target.value })}
                placeholder="e.g., Soldier, Scholar"
              />
              
              <Input
                label="Alignment"
                value={character.alignment}
                onChange={(e) => updateCharacter({ alignment: e.target.value })}
                placeholder="e.g., Lawful Good"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Abilities Tab */}
      {activeTab === 'abilities' && (
        <Card variant="elevated" size="lg">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-bold text-amber-100">Ability Scores</h4>
              <Button
                onClick={rollAllAbilityScores}
                variant="primary"
                size="sm"
                icon="🎲"
              >
                Roll All
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(character.abilityScores).map(([ability, score]) => (
                <div key={ability} className="text-center">
                  <div className="text-amber-200 text-sm font-semibold mb-2 capitalize">
                    {ability}
                  </div>
                  <Input
                    type="number"
                    value={score}
                    onChange={(e) => updateAbilityScore(ability, e.target.value)}
                    className="text-center text-lg font-bold"
                    min="1"
                    max="30"
                  />
                  <div className="text-amber-300 text-sm mt-1">
                    Modifier: {getAbilityModifier(score) >= 0 ? '+' : ''}{getAbilityModifier(score)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Skills Tab */}
      {activeTab === 'skills' && (
        <Card variant="elevated" size="lg">
          <div className="space-y-6">
            <h4 className="text-lg font-bold text-amber-100">Skills</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(character.skills).map(([skillName, skill]) => (
                <div key={skillName} className="flex items-center space-x-3 p-2 rounded-lg bg-slate-700/50">
                  <input
                    type="checkbox"
                    checked={skill.proficient}
                    onChange={() => toggleSkillProficiency(skillName)}
                    className="w-4 h-4 text-amber-600 bg-slate-700 border-amber-500 rounded focus:ring-amber-500"
                  />
                  <div className="flex-1">
                    <div className="text-amber-100 font-medium capitalize">
                      {skillName.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-amber-300 text-sm">
                      {getSkillModifier(skillName) >= 0 ? '+' : ''}{getSkillModifier(skillName)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Combat Tab */}
      {activeTab === 'combat' && (
        <Card variant="elevated" size="lg">
          <div className="space-y-6">
            <h4 className="text-lg font-bold text-amber-100">Combat Stats</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-amber-200 text-sm font-semibold mb-2">Armor Class</div>
                <Input
                  type="number"
                  value={character.armorClass}
                  onChange={(e) => updateCharacter({ armorClass: parseInt(e.target.value) || 10 })}
                  className="text-center text-2xl font-bold"
                />
              </div>
              
              <div className="text-center">
                <div className="text-amber-200 text-sm font-semibold mb-2">Hit Points</div>
                <div className="space-y-2">
                  <Input
                    type="number"
                    value={character.hitPoints.current}
                    onChange={(e) => updateCharacter({ 
                      hitPoints: { 
                        ...character.hitPoints, 
                        current: parseInt(e.target.value) || 0 
                      }
                    })}
                    className="text-center"
                    placeholder="Current"
                  />
                  <div className="text-amber-300 text-sm">
                    / {character.hitPoints.maximum}
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-amber-200 text-sm font-semibold mb-2">Speed</div>
                <Input
                  type="number"
                  value={character.speed}
                  onChange={(e) => updateCharacter({ speed: parseInt(e.target.value) || 30 })}
                  className="text-center text-xl font-bold"
                />
                <div className="text-amber-300 text-xs">feet</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Equipment Tab */}
      {activeTab === 'equipment' && (
        <Card variant="elevated" size="lg">
          <div className="space-y-6">
            <h4 className="text-lg font-bold text-amber-100">Equipment</h4>
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎒</div>
              <div className="text-amber-200 text-lg font-semibold mb-1">Equipment Management</div>
              <div className="text-amber-300 text-sm">Coming soon! Equipment tracking will be added here.</div>
            </div>
          </div>
        </Card>
      )}

      {/* Spells Tab */}
      {activeTab === 'spells' && (
        <Card variant="elevated" size="lg">
          <div className="space-y-6">
            <h4 className="text-lg font-bold text-amber-100">Spells</h4>
            <div className="text-center py-8">
              <div className="text-4xl mb-2">✨</div>
              <div className="text-amber-200 text-lg font-semibold mb-1">Spell Management</div>
              <div className="text-amber-300 text-sm">Coming soon! Spell tracking will be added here.</div>
            </div>
          </div>
        </Card>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <Card variant="elevated" size="lg">
          <div className="space-y-6">
            <h4 className="text-lg font-bold text-amber-100">Character Notes</h4>
            
            <div className="space-y-4">
              <Input
                label="Personality Traits"
                value={character.notes.personality}
                onChange={(e) => updateCharacter({ 
                  notes: { ...character.notes, personality: e.target.value }
                })}
                placeholder="Describe your character's personality..."
              />
              
              <Input
                label="Ideals"
                value={character.notes.ideals}
                onChange={(e) => updateCharacter({ 
                  notes: { ...character.notes, ideals: e.target.value }
                })}
                placeholder="What does your character believe in?"
              />
              
              <Input
                label="Bonds"
                value={character.notes.bonds}
                onChange={(e) => updateCharacter({ 
                  notes: { ...character.notes, bonds: e.target.value }
                })}
                placeholder="What is your character connected to?"
              />
              
              <Input
                label="Flaws"
                value={character.notes.flaws}
                onChange={(e) => updateCharacter({ 
                  notes: { ...character.notes, flaws: e.target.value }
                })}
                placeholder="What are your character's weaknesses?"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Help Modal */}
      <Modal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Character Sheet Help"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <div className="text-amber-200 font-semibold text-sm mb-1">Basic Info</div>
            <div className="text-amber-300 text-xs">Fill in your character&apos;s name, class, level, race, background, and alignment.</div>
          </div>
          <div>
            <div className="text-amber-200 font-semibold text-sm mb-1">Abilities</div>
            <div className="text-amber-300 text-xs">Set your ability scores (Strength, Dexterity, etc.). Use &quot;Roll All&quot; to generate random scores.</div>
          </div>
          <div>
            <div className="text-amber-200 font-semibold text-sm mb-1">Skills</div>
            <div className="text-amber-300 text-xs">Check the skills your character is proficient in. Modifiers are calculated automatically.</div>
          </div>
          <div>
            <div className="text-amber-200 font-semibold text-sm mb-1">Combat</div>
            <div className="text-amber-300 text-xs">Set your Armor Class, Hit Points, and Speed for combat.</div>
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

      {/* Dice Roller Modal */}
      <Modal
        isOpen={showDiceRoller}
        onClose={() => setShowDiceRoller(false)}
        title="Dice Roller"
        size="md"
      >
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎲</div>
          <div className="text-amber-200 text-lg font-semibold mb-2">Dice Roller</div>
          <div className="text-amber-300 text-sm">Use the main dice roller in the tools section for rolling dice.</div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => setShowDiceRoller(false)}
            variant="primary"
            size="md"
          >
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
}
