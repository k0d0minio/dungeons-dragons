'use client';

import { useState } from 'react';

/**
 * DiceRoller Component
 * 
 * A D&D dice roller with support for d4, d6, d8, d10, d12, and d20.
 * Includes smooth animations and enhanced UX for better user experience.
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onRoll - Optional callback function when dice are rolled
 * @param {Object} props.initialResult - Optional initial dice result to display
 */
export default function DiceRoller({ onRoll, initialResult = null }) {
  const [diceResult, setDiceResult] = useState(initialResult);
  const [isRolling, setIsRolling] = useState(false);
  const [lastRolled, setLastRolled] = useState(null);

  // Validate props
  if (onRoll && typeof onRoll !== 'function') {
    console.warn('DiceRoller: onRoll prop must be a function');
  }

  const rollDice = (sides, count = 1) => {
    const results = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      results.push(roll);
      total += roll;
    }
    return { results, total, sides, count };
  };

  const handleDiceRoll = (sides, count = 1) => {
    // Prevent multiple rapid rolls
    if (isRolling) return;

    setIsRolling(true);
    setLastRolled({ sides, count });
    
    // Add a small delay for animation effect
    setTimeout(() => {
      const result = rollDice(sides, count);
      setDiceResult(result);
      setIsRolling(false);
      
      // Call the onRoll callback if provided
      if (onRoll && typeof onRoll === 'function') {
        onRoll(result);
      }
    }, 800); // Increased delay for better animation
  };

  const clearResult = () => {
    setDiceResult(null);
    setLastRolled(null);
  };

  const rollAgain = () => {
    if (lastRolled) {
      handleDiceRoll(lastRolled.sides, lastRolled.count);
    }
  };

  const diceButtons = [
    { sides: 20, color: 'from-red-500 to-red-600', hoverColor: 'hover:from-red-600 hover:to-red-700', label: 'd20', description: 'Attack Rolls' },
    { sides: 12, color: 'from-blue-500 to-blue-600', hoverColor: 'hover:from-blue-600 hover:to-blue-700', label: 'd12', description: 'Damage' },
    { sides: 10, color: 'from-green-500 to-green-600', hoverColor: 'hover:from-green-600 hover:to-green-700', label: 'd10', description: 'Damage' },
    { sides: 8, color: 'from-purple-500 to-purple-600', hoverColor: 'hover:from-purple-600 hover:to-purple-700', label: 'd8', description: 'Damage' },
    { sides: 6, color: 'from-orange-500 to-orange-600', hoverColor: 'hover:from-orange-600 hover:to-orange-700', label: 'd6', description: 'Damage' },
    { sides: 4, color: 'from-yellow-500 to-yellow-600', hoverColor: 'hover:from-yellow-600 hover:to-yellow-700', label: 'd4', description: 'Damage' }
  ];

  const quickRolls = [
    { sides: 20, count: 2, label: '2d20', description: 'Advantage' },
    { sides: 6, count: 4, label: '4d6', description: 'Ability Score' },
    { sides: 8, count: 2, label: '2d8', description: 'Damage' },
    { sides: 6, count: 3, label: '3d6', description: 'Damage' }
  ];

  return (
    <div className="space-y-4">
      {/* Main Dice Buttons */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-amber-500/20 shadow-lg">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {diceButtons.map((dice) => (
            <button
              key={dice.sides}
              onClick={() => handleDiceRoll(dice.sides)}
              disabled={isRolling}
              className={`
                relative
                bg-gradient-to-br ${dice.color} ${dice.hoverColor}
                text-white 
                rounded-lg 
                p-3 
                text-center 
                transition-all 
                duration-300
                transform
                hover:scale-105
                active:scale-95
                disabled:opacity-50 
                disabled:cursor-not-allowed
                disabled:transform-none
                shadow-lg
                hover:shadow-xl
                ${isRolling && lastRolled?.sides === dice.sides ? 'animate-pulse ring-2 ring-amber-400' : ''}
              `}
            >
              <div className={`text-2xl mb-1 transition-transform duration-300 ${isRolling && lastRolled?.sides === dice.sides ? 'animate-spin' : 'hover:scale-110'}`}>
                🎲
              </div>
              <div className="font-bold text-sm mb-1">{dice.label}</div>
              <div className="text-xs opacity-90">{dice.description}</div>
            </button>
          ))}
        </div>

        {/* Rolling indicator */}
        {isRolling && (
          <div className="bg-gradient-to-r from-amber-600/20 to-amber-500/20 rounded-lg p-4 text-center border border-amber-500/30 mb-4">
            <div className="text-amber-200 text-sm font-bold mb-2">
              Rolling {lastRolled?.count}d{lastRolled?.sides}...
            </div>
            <div className="text-3xl animate-spin mb-1">🎲</div>
            <div className="text-amber-300 text-xs">The dice are tumbling...</div>
          </div>
        )}

        {/* Dice Result Display */}
        {diceResult && !isRolling && (
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-4 text-center border border-amber-500/30 shadow-lg animate-fadeIn mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-amber-200 text-lg font-bold">
                {diceResult.count}d{diceResult.sides}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={rollAgain}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded text-xs transition-colors"
                >
                  Again
                </button>
                <button
                  onClick={clearResult}
                  className="bg-slate-600 hover:bg-slate-700 text-amber-100 px-2 py-1 rounded text-xs transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="text-amber-100 text-4xl font-bold mb-2 animate-bounce">
              {diceResult.total}
            </div>
            
            {diceResult.count > 1 && (
              <div className="text-amber-300 text-sm mb-2">
                ({diceResult.results.join(' + ')}) = {diceResult.total}
              </div>
            )}
            
            {/* Special result messages for d20 */}
            {diceResult.sides === 20 && (
              <div className="mt-2">
                {diceResult.total === 20 && (
                  <div className="bg-green-600/20 border border-green-500/50 rounded-lg p-2">
                    <span className="text-green-400 font-bold text-sm animate-pulse">🎉 NATURAL 20! 🎉</span>
                    <div className="text-green-300 text-xs mt-1">Critical Success!</div>
                  </div>
                )}
                {diceResult.total === 1 && (
                  <div className="bg-red-600/20 border border-red-500/50 rounded-lg p-2">
                    <span className="text-red-400 font-bold text-sm animate-pulse">💀 NATURAL 1! 💀</span>
                    <div className="text-red-300 text-xs mt-1">Critical Failure!</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Roll Buttons */}
      <div className="bg-slate-800/30 rounded-lg p-3 border border-amber-500/10">
        <div className="text-amber-200 text-xs font-semibold mb-2 text-center">
          Quick Rolls
        </div>
        <div className="grid grid-cols-4 gap-2">
          {quickRolls.map((roll) => (
            <button
              key={roll.label}
              onClick={() => handleDiceRoll(roll.sides, roll.count)}
              disabled={isRolling}
              className="bg-slate-700 hover:bg-slate-600 text-amber-100 px-2 py-2 rounded text-xs transition-colors disabled:opacity-50 text-center"
            >
              <div className="font-semibold">{roll.label}</div>
              <div className="text-xs text-amber-300">{roll.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Roll History */}
      {diceResult && (
        <div className="bg-slate-800/20 rounded-lg p-2 border border-amber-500/10">
          <div className="text-amber-300 text-xs text-center">
            Last roll: {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}

// Add custom CSS animations via style tag
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
`;

// Inject styles into the document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
