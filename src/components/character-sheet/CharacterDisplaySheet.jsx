'use client';

import { useState, useEffect } from 'react';
import { Card, Button } from '../ui';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { useAuth } from '../../contexts/AuthContext';
import { isDM } from '../../lib/permissions';

export default function CharacterDisplaySheet() {
  const { user } = useAuth();
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load character from database
  const loadCharacter = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/characters');
      const data = await response.json();
      
      if (data.success) {
        const characterData = isDM(user) ? data.characters[0] : data.characters[0];
        setCharacter(characterData);
        
        // Check if character is incomplete and show Wise Elder
        if (characterData && isCharacterIncomplete(characterData)) {
          setShowWiseElder(true);
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load character');
      console.error('Error loading character:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check if character has missing essential data
  const isCharacterIncomplete = (char) => {
    if (!char) return true;
    
    const essentialFields = ['name', 'class', 'race', 'level'];
    return essentialFields.some(field => !char[field] || char[field] === '');
  };

  // Get ability modifier
  const getAbilityModifier = (score) => {
    return Math.floor((score - 10) / 2);
  };

  // Format ability score display
  const formatAbilityScore = (score) => {
    const modifier = getAbilityModifier(score);
    return `${score} (${modifier >= 0 ? '+' : ''}${modifier})`;
  };

  useEffect(() => {
    loadCharacter();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="card" />
        <LoadingSkeleton type="card" />
        <LoadingSkeleton type="card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-6 text-center">
        <div className="text-red-400 text-lg mb-2">❌ Error Loading Character</div>
        <div className="text-red-300">{error}</div>
        <Button 
          onClick={loadCharacter}
          variant="primary"
          className="mt-4"
        >
          🔄 Retry
        </Button>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="bg-slate-800/50 border border-amber-500/30 rounded-xl p-8 text-center">
        <div className="text-6xl mb-4">❓</div>
        <div className="text-amber-400 text-xl mb-2">No Character Found</div>
        <div className="text-amber-500 mb-4">Contact your DM to create a character</div>
        <Button 
          onClick={() => setShowWiseElder(true)}
          variant="primary"
          size="lg"
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
        >
          🧙‍♂️ Create Character with Wise Elder
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Character Header */}
      <Card variant="glass" size="lg">
        <div className="text-center py-6">
          <div className="text-6xl mb-4">🧙‍♂️</div>
          <h1 className="text-4xl font-bold text-amber-100 mb-2">{character.name || 'Unnamed Character'}</h1>
          <div className="text-amber-300 text-xl mb-4">
            Level {character.level || '?'} {character.race || 'Unknown Race'} {character.class || 'Unknown Class'}
          </div>
          {character.background && (
            <div className="text-amber-400 text-lg italic">{character.background}</div>
          )}
          {character.alignment && (
            <div className="text-amber-500 text-sm mt-2">{character.alignment}</div>
          )}
        </div>
      </Card>

      {/* Character Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Ability Scores */}
        <Card variant="glass" size="md">
          <h3 className="text-xl font-bold text-amber-100 mb-4 text-center">⚔️ Ability Scores</h3>
          <div className="space-y-3">
            {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map(ability => (
              <div key={ability} className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                <div className="text-amber-300 capitalize font-medium">{ability}</div>
                <div className="text-amber-100 font-bold">
                  {character[ability] ? formatAbilityScore(character[ability]) : 'Not Set'}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Combat Stats */}
        <Card variant="glass" size="md">
          <h3 className="text-xl font-bold text-amber-100 mb-4 text-center">🛡️ Combat Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
              <div className="text-amber-300">Armor Class</div>
              <div className="text-amber-100 font-bold">{character.armorClass || 'Not Set'}</div>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
              <div className="text-amber-300">Hit Points</div>
              <div className="text-amber-100 font-bold">
                {character.hitPoints || '?'} / {character.maxHitPoints || '?'}
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
              <div className="text-amber-300">Speed</div>
              <div className="text-amber-100 font-bold">{character.speed || 'Not Set'} ft</div>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
              <div className="text-amber-300">Experience</div>
              <div className="text-amber-100 font-bold">{character.experience || 0} XP</div>
            </div>
          </div>
        </Card>

        {/* Character Details */}
        <Card variant="glass" size="md">
          <h3 className="text-xl font-bold text-amber-100 mb-4 text-center">📋 Character Details</h3>
          <div className="space-y-3">
            <div className="p-3 bg-slate-700/30 rounded-lg">
              <div className="text-amber-300 text-sm mb-1">Personality</div>
              <div className="text-amber-100">{character.personality || 'Not defined'}</div>
            </div>
            <div className="p-3 bg-slate-700/30 rounded-lg">
              <div className="text-amber-300 text-sm mb-1">Ideals</div>
              <div className="text-amber-100">{character.ideals || 'Not defined'}</div>
            </div>
            <div className="p-3 bg-slate-700/30 rounded-lg">
              <div className="text-amber-300 text-sm mb-1">Bonds</div>
              <div className="text-amber-100">{character.bonds || 'Not defined'}</div>
            </div>
            <div className="p-3 bg-slate-700/30 rounded-lg">
              <div className="text-amber-300 text-sm mb-1">Flaws</div>
              <div className="text-amber-100">{character.flaws || 'Not defined'}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        {isDM(user) && (
          <Button
            onClick={() => window.location.href = '/?tab=management'}
            variant="secondary"
            size="lg"
          >
            🛠️ Manage Characters
          </Button>
        )}
      </div>

    </div>
  );
}

