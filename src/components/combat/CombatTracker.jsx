'use client';

import { useState, useRef, useEffect } from 'react';
import { Button, Card, Input, Modal } from '../ui';

/**
 * CombatTracker Component
 * 
 * A D&D combat tracker for managing initiative order, rounds, and character turns.
 * Includes enhanced UX with better visual feedback and character management.
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onCombatChange - Optional callback when combat data changes
 * @param {Object} props.initialCombatData - Optional initial combat data
 * @param {Function} props.rollDice - Function to roll dice (passed from parent)
 */
export default function CombatTracker({ 
  onCombatChange, 
  initialCombatData = null, 
  rollDice 
}) {
  const [combatData, setCombatData] = useState(initialCombatData || {
    initiative: [],
    currentTurn: 0,
    round: 1
  });
  const [newCharacterName, setNewCharacterName] = useState('');
  const [isAddingCharacter, setIsAddingCharacter] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const inputRef = useRef(null);
  const helpRef = useRef(null);

  // Tutorial steps for beginners
  const tutorialSteps = [
    {
      title: "Welcome to Combat Tracker! 🎲",
      content: "This tool helps you manage combat in D&D. It tracks who goes first (initiative) and whose turn it is.",
      action: "Let's start by adding a character!"
    },
    {
      title: "Adding Characters 👥",
      content: "Click 'Add Character' to add players and monsters. Each character gets a random initiative roll (1-20).",
      action: "Try adding your first character!"
    },
    {
      title: "Initiative Order 📋",
      content: "Characters are sorted by their initiative roll (highest first). The current turn is highlighted in gold.",
      action: "Add a few more characters to see the order!"
    },
    {
      title: "Managing Turns ⚔️",
      content: "Use Previous/Next buttons to move between turns. Click 'Next Round' when everyone has had their turn.",
      action: "You're ready to start combat!"
    }
  ];

  // Help content
  const helpContent = {
    title: "Combat Tracker Help",
    sections: [
      {
        title: "What is Initiative?",
        content: "Initiative determines the order characters act in combat. Everyone rolls a d20 + their Dexterity modifier. Higher rolls go first!"
      },
      {
        title: "How to Use This Tool",
        content: "1. Add all characters (players and monsters)\n2. Characters are automatically sorted by initiative\n3. Use Previous/Next to move between turns\n4. Click 'Next Round' when everyone has acted"
      },
      {
        title: "Tips for Beginners",
        content: "• Add monsters with simple names like 'Goblin 1', 'Goblin 2'\n• You can remove characters by clicking the X\n• The current turn is highlighted in gold\n• Start each round by clicking 'Next Round'"
      },
      {
        title: "Keyboard Shortcuts",
        content: "• Press Enter to add a character\n• Press Escape to cancel adding\n• Use the Quick Add button for faster entry"
      }
    ]
  };

  // Validate props
  if (onCombatChange && typeof onCombatChange !== 'function') {
    console.warn('CombatTracker: onCombatChange prop must be a function');
  }
  if (rollDice && typeof rollDice !== 'function') {
    console.warn('CombatTracker: rollDice prop must be a function');
  }

  // Close help when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (helpRef.current && !helpRef.current.contains(event.target)) {
        setShowHelp(false);
      }
    };

    if (showHelp) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHelp]);

  const updateCombatData = (newData) => {
    setCombatData(newData);
    if (onCombatChange && typeof onCombatChange === 'function') {
      onCombatChange(newData);
    }
  };

  const addToInitiative = (name, roll) => {
    if (!name || !name.trim()) return;
    
    const newCharacter = {
      id: Date.now(),
      name: name.trim(),
      roll: roll,
      hp: null, // Will be added later
      ac: null, // Will be added later
      conditions: []
    };

    const newInitiative = [...combatData.initiative, newCharacter]
      .sort((a, b) => b.roll - a.roll);

    updateCombatData({
      ...combatData,
      initiative: newInitiative
    });
  };

  const removeFromInitiative = (characterId) => {
    const newInitiative = combatData.initiative.filter(char => char.id !== characterId);
    const newCurrentTurn = Math.min(combatData.currentTurn, newInitiative.length - 1);
    
    updateCombatData({
      ...combatData,
      initiative: newInitiative,
      currentTurn: Math.max(0, newCurrentTurn)
    });
  };

  const nextTurn = () => {
    const nextTurnIndex = combatData.currentTurn < combatData.initiative.length - 1 
      ? combatData.currentTurn + 1 
      : 0;
    
    updateCombatData({
      ...combatData,
      currentTurn: nextTurnIndex
    });
  };

  const previousTurn = () => {
    const prevTurnIndex = combatData.currentTurn > 0 
      ? combatData.currentTurn - 1 
      : combatData.initiative.length - 1;
    
    updateCombatData({
      ...combatData,
      currentTurn: prevTurnIndex
    });
  };

  const nextRound = () => {
    updateCombatData({
      ...combatData,
      round: combatData.round + 1,
      currentTurn: 0
    });
  };

  const clearCombat = () => {
    updateCombatData({
      initiative: [],
      currentTurn: 0,
      round: 1
    });
  };

  const handleAddCharacter = () => {
    if (!newCharacterName.trim()) return;
    
    const roll = rollDice ? rollDice(20).total : Math.floor(Math.random() * 20) + 1;
    addToInitiative(newCharacterName, roll);
    setNewCharacterName('');
    setIsAddingCharacter(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddCharacter();
    } else if (e.key === 'Escape') {
      setNewCharacterName('');
      setIsAddingCharacter(false);
    }
  };

  const currentCharacter = combatData.initiative[combatData.currentTurn];

  const nextTutorialStep = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setShowTutorial(false);
      setTutorialStep(0);
    }
  };

  const prevTutorialStep = () => {
    if (tutorialStep > 0) {
      setTutorialStep(tutorialStep - 1);
    }
  };

  const startTutorial = () => {
    setShowTutorial(true);
    setTutorialStep(0);
    setShowHelp(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Help */}
      <div className="text-center relative">
        <p className="text-amber-300 text-sm mb-3">Track initiative order and manage combat turns</p>
        
        {/* Help and Tutorial Buttons */}
        <div className="flex justify-center space-x-3">
          <Button
            onClick={() => setShowHelp(!showHelp)}
            variant="ghost"
            size="sm"
            icon="❓"
            title="Get help with combat tracking"
          >
            Help
          </Button>
          <Button
            onClick={startTutorial}
            variant="success"
            size="sm"
            icon="🎓"
            title="Take a quick tutorial"
          >
            Tutorial
          </Button>
        </div>

        {/* Help Modal */}
        <Modal
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
          title={helpContent.title}
          size="lg"
        >
          <div className="space-y-4">
            {helpContent.sections.map((section, index) => (
              <div key={index}>
                <div className="text-amber-200 font-semibold text-sm mb-1">{section.title}</div>
                <div className="text-amber-300 text-xs whitespace-pre-line">{section.content}</div>
              </div>
            ))}
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

      {/* Tutorial Modal */}
      <Modal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        size="md"
        showCloseButton={false}
      >
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">{tutorialSteps[tutorialStep].title.split(' ')[0]}</div>
          <div className="text-amber-100 font-bold text-lg">{tutorialSteps[tutorialStep].title}</div>
        </div>
        <div className="text-amber-300 text-sm mb-6 leading-relaxed">
          {tutorialSteps[tutorialStep].content}
        </div>
        <div className="bg-amber-600/20 border border-amber-500/30 rounded-lg p-3 mb-6">
          <div className="text-amber-200 text-sm font-semibold">💡 {tutorialSteps[tutorialStep].action}</div>
        </div>
        <div className="flex justify-between items-center">
          <Button
            onClick={prevTutorialStep}
            disabled={tutorialStep === 0}
            variant="secondary"
            size="sm"
          >
            ← Previous
          </Button>
          <div className="flex space-x-1">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === tutorialStep ? 'bg-amber-500' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
          <Button
            onClick={nextTutorialStep}
            variant="primary"
            size="sm"
          >
            {tutorialStep === tutorialSteps.length - 1 ? 'Finish' : 'Next →'}
          </Button>
        </div>
      </Modal>

      {/* Round Counter - More Friendly */}
      <Card variant="elevated" size="lg">
        <div className="flex justify-between items-center mb-6">
          <div className="text-center">
            <div className="text-amber-200 text-sm font-semibold mb-1">🎯 Round</div>
            <div className="text-amber-100 text-4xl font-bold">{combatData.round}</div>
            <div className="text-amber-300 text-xs">of combat</div>
          </div>
          <div className="flex flex-col space-y-2">
            <Button
              onClick={nextRound}
              variant="primary"
              size="lg"
              icon="🎲"
            >
              Next Round
            </Button>
            {combatData.initiative.length > 0 && (
              <Button
                onClick={clearCombat}
                variant="danger"
                size="md"
                icon="🗑️"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Current Turn Indicator - More Prominent */}
        {currentCharacter && (
          <div className="bg-gradient-to-r from-amber-500/30 to-amber-600/30 rounded-xl p-4 mb-6 border-2 border-amber-500/50 shadow-lg">
            <div className="text-center">
              <div className="text-amber-200 text-sm font-semibold mb-2">🎯 It&apos;s Their Turn!</div>
              <div className="text-amber-100 text-2xl font-bold mb-1">{currentCharacter.name}</div>
              <div className="text-amber-300 text-sm">Rolled initiative: {currentCharacter.roll}</div>
            </div>
          </div>
        )}

        {/* Initiative Order - More Friendly */}
        {combatData.initiative.length > 0 ? (
          <div className="space-y-3">
            <div className="text-amber-200 text-sm font-semibold mb-3 flex items-center">
              <span className="mr-2">📋</span>
              Initiative Order (highest first)
            </div>
            {combatData.initiative.map((character, index) => (
              <div
                key={character.id}
                className={`
                  flex justify-between items-center p-4 rounded-xl transition-all duration-300 border-2
                  ${index === combatData.currentTurn 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-xl transform scale-105 border-amber-400' 
                    : 'bg-slate-700/80 text-amber-100 hover:bg-slate-600/80 border-slate-600 hover:border-amber-500/50'
                  }
                `}
              >
                <div className="flex items-center space-x-4">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg
                    ${index === combatData.currentTurn 
                      ? 'bg-slate-900 text-amber-500 ring-2 ring-amber-300' 
                      : 'bg-amber-500 text-slate-900'
                    }
                  `}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{character.name}</div>
                    <div className="text-xs opacity-80">Initiative: {character.roll}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="font-bold text-xl">{character.roll}</div>
                    <div className="text-xs opacity-75">initiative</div>
                  </div>
                  <button
                    onClick={() => removeFromInitiative(character.id)}
                    className="text-red-400 hover:text-red-300 text-lg p-2 rounded-lg hover:bg-red-500/20 transition-all duration-200"
                    title="Remove character"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚔️</div>
            <div className="text-amber-200 text-xl font-bold mb-2">No Characters in Combat</div>
            <div className="text-amber-300 text-sm mb-4">Add characters to start tracking initiative</div>
            <div className="text-amber-400 text-xs">💡 Try the Tutorial button above to learn how!</div>
          </div>
        )}

        {/* Turn Navigation - More Friendly */}
        {combatData.initiative.length > 1 && (
          <div className="mt-6 flex justify-between">
            <Button
              onClick={previousTurn}
              variant="secondary"
              size="lg"
            >
              ← Previous Turn
            </Button>
            <Button
              onClick={nextTurn}
              variant="secondary"
              size="lg"
            >
              Next Turn →
            </Button>
          </div>
        )}
      </Card>

      {/* Add Character Section - More Friendly */}
      <Card variant="glass" size="lg">
        <div className="text-amber-200 text-lg font-bold mb-4 flex items-center">
          <span className="mr-2">👥</span>
          Add Characters
        </div>
        
        {!isAddingCharacter ? (
          <div className="text-center">
            <Button
              onClick={() => {
                setIsAddingCharacter(true);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              variant="primary"
              size="xl"
              icon="🎲"
            >
              Add Character
            </Button>
            <div className="text-amber-300 text-sm mt-3">
              Each character gets a random initiative roll (1-20)
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex space-x-3">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Enter character name..."
                value={newCharacterName}
                onChange={(e) => setNewCharacterName(e.target.value)}
                onKeyPress={handleKeyPress}
                size="lg"
                className="flex-1"
                autoFocus
              />
              <Button
                onClick={handleAddCharacter}
                disabled={!newCharacterName.trim()}
                variant="success"
                size="lg"
                icon="✅"
              >
                Add
              </Button>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  const name = prompt('Character name:');
                  if (name) {
                    const roll = rollDice ? rollDice(20).total : Math.floor(Math.random() * 20) + 1;
                    addToInitiative(name, roll);
                  }
                }}
                variant="secondary"
                size="md"
                icon="⚡"
                className="flex-1"
              >
                Quick Add
              </Button>
              <Button
                onClick={() => {
                  setNewCharacterName('');
                  setIsAddingCharacter(false);
                }}
                variant="secondary"
                size="md"
                icon="❌"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
            <div className="text-amber-400 text-xs text-center">
              💡 Press Enter to add, Escape to cancel
            </div>
          </div>
        )}
      </Card>

      {/* Combat Stats - More Friendly */}
      {combatData.initiative.length > 0 && (
        <Card variant="glass" size="md">
          <div className="grid grid-cols-2 gap-6 text-center">
            <div>
              <div className="text-amber-300 text-sm font-semibold mb-1">👥 Characters</div>
              <div className="text-amber-100 text-2xl font-bold">{combatData.initiative.length}</div>
            </div>
            <div>
              <div className="text-amber-300 text-sm font-semibold mb-1">🎯 Current Turn</div>
              <div className="text-amber-100 text-2xl font-bold">{combatData.currentTurn + 1}</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
