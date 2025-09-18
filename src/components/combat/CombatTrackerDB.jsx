'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Input, Modal } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { fetchList } from '../../lib/dnd-api';

export default function CombatTrackerDB() {
  const { user } = useAuth();
  const [combatSessions, setCombatSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [monsters, setMonsters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [participantType, setParticipantType] = useState('character'); // 'character' or 'monster'

  // New combat session form state
  const [newSession, setNewSession] = useState({
    name: '',
    participants: []
  });

  // New participant form state
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    initiative: 0,
    armorClass: null,
    hitPoints: null,
    maxHitPoints: null,
    isPlayer: false,
    isActive: false,
    type: 'character' // 'character' or 'monster'
  });

  // Load characters and monsters
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load user's characters
        const charactersResponse = await fetch('/api/characters');
        const charactersData = await charactersResponse.json();
        if (charactersData.success) {
          setCharacters(charactersData.characters);
        }

        // Load monsters from D&D API
        const monstersResponse = await fetchList('monsters');
        setMonsters(monstersResponse.results || []);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };
    
    loadData();
  }, []);

  // Load combat sessions from database
  const loadCombatSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/combat');
      const data = await response.json();
      
      if (data.success) {
        setCombatSessions(data.combatSessions);
        if (data.combatSessions.length > 0 && !selectedSession) {
          setSelectedSession(data.combatSessions[0]);
          setParticipants(data.combatSessions[0].participants || []);
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load combat sessions');
      console.error('Error loading combat sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load participants for selected session
  const loadParticipants = async (sessionId) => {
    try {
      const response = await fetch(`/api/combat/participants?combatSessionId=${sessionId}`);
      const data = await response.json();
      
      if (data.success) {
        setParticipants(data.participants);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load participants');
      console.error('Error loading participants:', err);
    }
  };

  // Load combat sessions on component mount
  useEffect(() => {
    loadCombatSessions();
  }, []);

  // Load participants when session changes
  useEffect(() => {
    if (selectedSession) {
      loadParticipants(selectedSession.id);
    }
  }, [selectedSession]);

  // Create new combat session
  const handleCreateSession = async () => {
    try {
      const response = await fetch('/api/combat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSession),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCombatSessions(prev => [data.combatSession, ...prev]);
        setSelectedSession(data.combatSession);
        setNewSession({ name: '', participants: [] });
        setShowCreateModal(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create combat session');
      console.error('Error creating combat session:', err);
    }
  };

  // Create new participant
  const handleCreateParticipant = async () => {
    if (!selectedSession) return;
    
    try {
      const response = await fetch('/api/combat/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newParticipant,
          combatSessionId: selectedSession.id
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setParticipants(prev => [...prev, data.participant].sort((a, b) => b.initiative - a.initiative));
        setNewParticipant({
          name: '',
          initiative: 0,
          armorClass: null,
          hitPoints: null,
          maxHitPoints: null,
          isPlayer: false,
          isActive: false,
          type: 'character'
        });
        setShowParticipantModal(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create participant');
      console.error('Error creating participant:', err);
    }
  };

  // Update participant
  const handleUpdateParticipant = async (participantId, updates) => {
    try {
      const response = await fetch(`/api/combat/participants/${participantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setParticipants(prev => prev.map(p => 
          p.id === participantId ? data.participant : p
        ).sort((a, b) => b.initiative - a.initiative));
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update participant');
      console.error('Error updating participant:', err);
    }
  };

  // Delete participant
  const handleDeleteParticipant = async (participantId) => {
    try {
      const response = await fetch(`/api/combat/participants/${participantId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setParticipants(prev => prev.filter(p => p.id !== participantId));
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to delete participant');
      console.error('Error deleting participant:', err);
    }
  };

  // Update combat session
  const handleUpdateSession = async (updates) => {
    if (!selectedSession) return;
    
    try {
      const response = await fetch(`/api/combat/${selectedSession.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCombatSessions(prev => prev.map(s => 
          s.id === selectedSession.id ? data.combatSession : s
        ));
        setSelectedSession(data.combatSession);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update combat session');
      console.error('Error updating combat session:', err);
    }
  };

  // Start combat
  const handleStartCombat = () => {
    if (participants.length === 0) {
      setError('Add at least one participant to start combat');
      return;
    }
    
    // Set first participant as active
    const firstParticipant = participants[0];
    handleUpdateParticipant(firstParticipant.id, { isActive: true });
    handleUpdateSession({ isActive: true, round: 1, turn: 1 });
  };

  // End combat
  const handleEndCombat = () => {
    // Deactivate all participants
    participants.forEach(participant => {
      if (participant.isActive) {
        handleUpdateParticipant(participant.id, { isActive: false });
      }
    });
    handleUpdateSession({ isActive: false, round: 1, turn: 1 });
  };

  // Next turn
  const handleNextTurn = () => {
    if (!selectedSession || !selectedSession.isActive) return;
    
    const currentIndex = participants.findIndex(p => p.isActive);
    const nextIndex = (currentIndex + 1) % participants.length;
    
    // Deactivate current participant
    if (currentIndex >= 0) {
      handleUpdateParticipant(participants[currentIndex].id, { isActive: false });
    }
    
    // Activate next participant
    handleUpdateParticipant(participants[nextIndex].id, { isActive: true });
    
    // Update turn/round
    const newTurn = nextIndex === 0 ? selectedSession.turn + 1 : selectedSession.turn;
    const newRound = nextIndex === 0 ? selectedSession.round + 1 : selectedSession.round;
    
    handleUpdateSession({ turn: newTurn, round: newRound });
  };

  // Handle character/monster selection
  const handleParticipantSelect = (selectedItem) => {
    if (participantType === 'character') {
      const character = characters.find(c => c.name === selectedItem);
      setNewParticipant(prev => ({
        ...prev,
        name: character.name,
        armorClass: character.armorClass,
        hitPoints: character.hitPoints,
        maxHitPoints: character.maxHitPoints,
        isPlayer: true,
        type: 'character'
      }));
    } else {
      setNewParticipant(prev => ({
        ...prev,
        name: selectedItem,
        isPlayer: false,
        type: 'monster'
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="text-3xl mb-2 animate-spin">⚔️</div>
          <div className="text-amber-300">Loading combat sessions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 mobile-full-height mobile-safe-area">
      {/* Compact Header */}
      <div className="text-center">
        <p className="text-amber-300 text-xs mb-1">Track initiative and manage combat encounters</p>
        
        {/* Help Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowHelp(true)}
          className="text-amber-400 hover:text-amber-300 text-xs"
        >
          ❓ Help
        </Button>
      </div>

      {/* Session Selection - Mobile Optimized */}
      <div className="mobile-button-group">
        <select
          value={selectedSession?.id || ''}
          onChange={(e) => {
            const session = combatSessions.find(s => s.id === e.target.value);
            setSelectedSession(session);
          }}
          className="mobile-form w-full px-3 py-3 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100 text-base"
        >
          <option value="">Select a combat session...</option>
          {combatSessions.map(session => (
            <option key={session.id} value={session.id}>
              {session.name} {session.isActive ? '(Active)' : ''}
            </option>
          ))}
        </select>
        
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          size="md"
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 w-full"
        >
          ➕ New Session
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-red-400 text-center text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-300 hover:text-red-200 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Combat Session Content */}
      {selectedSession ? (
        <div className="space-y-4">
          {/* Session Header - Compact */}
          <Card variant="glass" size="sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-amber-100">{selectedSession.name}</h2>
                <p className="text-amber-300 text-sm">
                  Round {selectedSession.round} • Turn {selectedSession.turn}
                  {selectedSession.isActive && <span className="text-green-400 ml-2">● Active</span>}
                </p>
              </div>
              <div className="flex gap-2">
                {!selectedSession.isActive ? (
                  <Button
                    onClick={handleStartCombat}
                    variant="primary"
                    size="sm"
                    disabled={participants.length === 0}
                  >
                    ▶️ Start
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleNextTurn}
                      variant="primary"
                      size="sm"
                    >
                      ⏭️ Next
                    </Button>
                    <Button
                      onClick={handleEndCombat}
                      variant="danger"
                      size="sm"
                    >
                      ⏹️ End
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Participants List - Compact */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-bold text-amber-100">Participants ({participants.length})</h3>
              <Button
                onClick={() => setShowParticipantModal(true)}
                variant="primary"
                size="sm"
              >
                ➕ Add
              </Button>
            </div>
            
            {participants.length === 0 ? (
              <Card variant="glass" size="sm">
                <div className="text-center py-3">
                  <div className="text-xl mb-1">⚔️</div>
                  <div className="text-amber-300 text-xs">No participants</div>
                </div>
              </Card>
            ) : (
              <div className="mobile-list">
                {participants.map((participant, index) => (
                  <Card key={participant.id} variant="glass" size="sm" className="mobile-list-item">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="text-base font-bold text-amber-400 flex-shrink-0">
                          #{index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <h4 className="text-amber-100 font-bold text-xs truncate">{participant.name}</h4>
                            {participant.isActive && <span className="text-green-400 text-xs flex-shrink-0">●</span>}
                            {participant.isPlayer && <span className="text-blue-400 text-xs flex-shrink-0">👤</span>}
                          </div>
                          <div className="text-amber-300 text-xs">
                            Init: {participant.initiative}
                            {participant.armorClass && ` • AC: ${participant.armorClass}`}
                            {participant.hitPoints && ` • HP: ${participant.hitPoints}/${participant.maxHitPoints}`}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          onClick={() => handleUpdateParticipant(participant.id, { isActive: !participant.isActive })}
                          variant={participant.isActive ? "primary" : "secondary"}
                          size="sm"
                          className="text-xs px-2 py-1 min-h-[32px] min-w-[32px]"
                        >
                          {participant.isActive ? '●' : '○'}
                        </Button>
                        <Button
                          onClick={() => handleDeleteParticipant(participant.id)}
                          variant="danger"
                          size="sm"
                          className="text-xs px-2 py-1 min-h-[32px] min-w-[32px]"
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <Card variant="glass" size="sm">
          <div className="text-center py-4">
            <div className="text-2xl mb-1">⚔️</div>
            <div className="text-amber-300 text-sm">No combat session selected</div>
            <div className="text-amber-400 text-xs">
              {combatSessions.length === 0 ? 'Create your first combat session!' : 'Select a session above'}
            </div>
          </div>
        </Card>
      )}

      {/* Create Session Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewSession({ name: '', participants: [] });
        }}
        size="md"
      >
        <div className="p-4">
          <h2 className="text-xl font-bold text-amber-100 mb-4">⚔️ Create Combat Session</h2>
          
          <div className="space-y-3">
            <div>
              <label className="block text-amber-300 text-sm mb-1">Session Name</label>
              <Input
                value={newSession.name}
                onChange={(e) => setNewSession(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter session name"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={() => setShowCreateModal(false)}
              variant="secondary"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSession}
              variant="primary"
              size="sm"
              disabled={!newSession.name.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Participant Modal */}
      <Modal
        isOpen={showParticipantModal}
        onClose={() => {
          setShowParticipantModal(false);
          setNewParticipant({
            name: '',
            initiative: 0,
            armorClass: null,
            hitPoints: null,
            maxHitPoints: null,
            isPlayer: false,
            isActive: false,
            type: 'character'
          });
        }}
        size="lg"
      >
        <div className="p-4">
          <h2 className="text-xl font-bold text-amber-100 mb-4">👤 Add Combat Participant</h2>
          
          <div className="space-y-3">
            {/* Participant Type Selection */}
            <div>
              <label className="block text-amber-300 text-sm mb-2">Participant Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setParticipantType('character')}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    participantType === 'character'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-700 text-amber-300 hover:bg-slate-600'
                  }`}
                >
                  👤 Character
                </button>
                <button
                  onClick={() => setParticipantType('monster')}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    participantType === 'monster'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-700 text-amber-300 hover:bg-slate-600'
                  }`}
                >
                  👹 Monster
                </button>
              </div>
            </div>

            {/* Character/Monster Selection */}
            <div>
              <label className="block text-amber-300 text-sm mb-1">
                {participantType === 'character' ? 'Select Character' : 'Select Monster'}
              </label>
              <select
                value={newParticipant.name}
                onChange={(e) => handleParticipantSelect(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100 text-sm"
              >
                <option value="">Choose {participantType === 'character' ? 'character' : 'monster'}...</option>
                {participantType === 'character' 
                  ? characters.map(character => (
                      <option key={character.id} value={character.name}>
                        {character.name} - Level {character.level} {character.race} {character.class}
                      </option>
                    ))
                  : monsters.map(monster => (
                      <option key={monster.index} value={monster.name}>
                        {monster.name}
                      </option>
                    ))
                }
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-amber-300 text-sm mb-1">Initiative *</label>
                <Input
                  type="number"
                  value={newParticipant.initiative}
                  onChange={(e) => setNewParticipant(prev => ({ ...prev, initiative: parseInt(e.target.value) || 0 }))}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-amber-300 text-sm mb-1">Armor Class</label>
                <Input
                  type="number"
                  value={newParticipant.armorClass || ''}
                  onChange={(e) => setNewParticipant(prev => ({ ...prev, armorClass: e.target.value ? parseInt(e.target.value) : null }))}
                  placeholder="Optional"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-amber-300 text-sm mb-1">Hit Points</label>
                <Input
                  type="number"
                  value={newParticipant.hitPoints || ''}
                  onChange={(e) => setNewParticipant(prev => ({ ...prev, hitPoints: e.target.value ? parseInt(e.target.value) : null }))}
                  placeholder="Optional"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-amber-300 text-sm mb-1">Max Hit Points</label>
                <Input
                  type="number"
                  value={newParticipant.maxHitPoints || ''}
                  onChange={(e) => setNewParticipant(prev => ({ ...prev, maxHitPoints: e.target.value ? parseInt(e.target.value) : null }))}
                  placeholder="Optional"
                  className="text-sm"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={() => setShowParticipantModal(false)}
              variant="secondary"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateParticipant}
              variant="primary"
              size="sm"
              disabled={!newParticipant.name.trim()}
            >
              Add Participant
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
        <div className="p-4">
          <h2 className="text-xl font-bold text-amber-100 mb-4">📚 Combat Tracker Help</h2>
          
          <div className="space-y-4 text-amber-300 text-sm">
            <div>
              <h3 className="text-lg font-bold text-amber-200 mb-2">🎯 Getting Started</h3>
              <p className="mb-2">
                The combat tracker helps you manage initiative order and track combat encounters. 
                All combat data is automatically saved!
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-amber-200 mb-2">⚔️ Combat Management</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Create combat sessions for different encounters</li>
                <li>Add participants from your characters or D&D monsters</li>
                <li>Start combat to begin tracking turns</li>
                <li>Use &quot;Next Turn&quot; to advance through initiative order</li>
                <li>End combat when the encounter is over</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-amber-200 mb-2">👤 Participants</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Characters:</strong> Select from your created characters</li>
                <li><strong>Monsters:</strong> Choose from official D&D monsters</li>
                <li>Set initiative scores (higher goes first)</li>
                <li>Track AC and hit points for reference</li>
                <li>Mark participants as active during their turn</li>
              </ul>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button
              onClick={() => setShowHelp(false)}
              variant="primary"
              size="sm"
            >
              Got it!
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}