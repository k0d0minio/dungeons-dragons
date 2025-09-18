'use client';

import { useState, useEffect } from 'react';
import { Button, Card } from '../ui';
import { useCampaign } from '../../contexts/CampaignContext';
import { useAuth } from '../../contexts/AuthContext';

export default function RealtimeDiceRoller() {
  const { currentCampaign, campaignMode } = useCampaign();
  const { user } = useAuth();
  const [diceRolls, setDiceRolls] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [customDice, setCustomDice] = useState('1d20');

  // Common dice presets
  const dicePresets = [
    { label: 'd20', value: '1d20', description: 'Attack rolls, saves' },
    { label: 'd12', value: '1d12', description: 'Barbarian hit dice' },
    { label: 'd10', value: '1d10', description: 'Fighter hit dice' },
    { label: 'd8', value: '1d8', description: 'Rogue hit dice' },
    { label: 'd6', value: '1d6', description: 'Wizard hit dice' },
    { label: 'd4', value: '1d4', description: 'Damage dice' },
    { label: '2d6', value: '2d6', description: 'Greatsword damage' },
    { label: '3d6', value: '3d6', description: 'Ability scores' },
    { label: '4d6', value: '4d6', description: 'Drop lowest' },
  ];

  // Load recent dice rolls
  const loadDiceRolls = async () => {
    if (!currentCampaign) return;

    try {
      // TODO: Implement dice roll loading
      const response = await fetch(`/api/campaigns/${currentCampaign.id}/dice`);
      const data = await response.json();
      
      if (data.success) {
        setDiceRolls(data.diceRolls);
      }
    } catch (error) {
      console.error('Error loading dice rolls:', error);
    }
  };

  // Roll dice
  const rollDice = async (diceType, reason = '') => {
    if (!currentCampaign || isRolling) return;

    setIsRolling(true);
    try {
      // TODO: Implement dice rolling
      const response = await fetch(`/api/campaigns/${currentCampaign.id}/dice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diceType,
          reason,
          characterId: null, // TODO: Get current character
          isPublic: true
        })
      });

      const data = await response.json();
      if (data.success) {
        // Add to local state immediately for instant feedback
        setDiceRolls(prev => [data.roll, ...prev.slice(0, 9)]);
        
        // TODO: Broadcast to other devices via WebSocket
        console.log('Dice rolled:', data.rollDetails);
      }
    } catch (error) {
      console.error('Error rolling dice:', error);
    } finally {
      setIsRolling(false);
    }
  };

  // Format dice result for display
  const formatDiceResult = (roll) => {
    const { diceType, result, modifier, total } = roll;
    const baseRoll = result - modifier;
    return `${diceType}: ${baseRoll}${modifier ? (modifier > 0 ? '+' : '') + modifier : ''} = ${total}`;
  };

  // Get dice color based on result
  const getDiceColor = (roll) => {
    if (roll.diceType === '1d20') {
      if (roll.result === 20) return 'text-green-400'; // Natural 20
      if (roll.result === 1) return 'text-red-400';   // Natural 1
      if (roll.total >= 20) return 'text-yellow-400'; // High roll
    }
    return 'text-amber-100';
  };

  useEffect(() => {
    loadDiceRolls();
    
    // TODO: Set up WebSocket connection for real-time updates
    // const ws = new WebSocket(`ws://localhost:3000/campaigns/${currentCampaign.id}/dice`);
    // ws.onmessage = (event) => {
    //   const newRoll = JSON.parse(event.data);
    //   setDiceRolls(prev => [newRoll, ...prev.slice(0, 9)]);
    // };
    
    // return () => ws.close();
  }, [currentCampaign]);

  if (!currentCampaign) {
    return (
      <Card variant="glass" size="sm" className="text-center">
        <div className="text-amber-400 mb-2">No Active Campaign</div>
        <div className="text-amber-500 text-sm">Join a campaign to roll dice</div>
      </Card>
    );
  }

  if (campaignMode !== 'GAMEPLAY_SESSION') {
    return (
      <Card variant="glass" size="sm" className="text-center">
        <div className="text-amber-400 mb-2">🎲 Dice Rolling</div>
        <div className="text-amber-500 text-sm">
          Available during gameplay sessions
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dice Presets */}
      <Card variant="glass" size="sm">
        <div className="text-amber-100 font-bold mb-3">Quick Roll</div>
        <div className="grid grid-cols-3 gap-2">
          {dicePresets.map((preset) => (
            <Button
              key={preset.value}
              onClick={() => rollDice(preset.value)}
              disabled={isRolling}
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* Custom Dice Input */}
      <Card variant="glass" size="sm">
        <div className="text-amber-100 font-bold mb-3">Custom Roll</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customDice}
            onChange={(e) => setCustomDice(e.target.value)}
            placeholder="1d20+5"
            className="flex-1 px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100 placeholder-amber-400 text-sm"
          />
          <Button
            onClick={() => rollDice(customDice)}
            disabled={isRolling || !customDice}
            variant="primary"
            size="sm"
          >
            {isRolling ? '⏳' : '🎲'}
          </Button>
        </div>
      </Card>

      {/* Recent Rolls */}
      <Card variant="glass" size="sm">
        <div className="text-amber-100 font-bold mb-3">Recent Rolls</div>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {diceRolls.length === 0 ? (
            <div className="text-amber-500 text-sm text-center py-4">
              No rolls yet
            </div>
          ) : (
            diceRolls.map((roll, index) => (
              <div
                key={roll.id || index}
                className="flex justify-between items-center p-2 bg-slate-700/30 rounded text-sm"
              >
                <div>
                  <span className="text-amber-300">{roll.user?.username || 'Unknown'}</span>
                  <span className="text-amber-500 mx-2">•</span>
                  <span className={getDiceColor(roll)}>
                    {formatDiceResult(roll)}
                  </span>
                </div>
                <div className="text-amber-400 text-xs">
                  {roll.reason || 'No reason'}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
