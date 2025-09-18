'use client';

import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { useCampaign } from '../../../contexts/CampaignContext';
import MobileWiseElderOverlay from '../../../components/wise-elder/MobileWiseElderOverlay';

export default function GameMechanicsPage() {
  const { user } = useAuth();
  const { currentCampaign } = useCampaign();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⚔️</div>
          <div className="text-amber-200 text-xl font-serif">Loading your adventure...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900/50 to-red-800/50 border-b border-red-500/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-red-100 font-serif">
                🎲 Game Mechanics
              </h1>
              <p className="text-red-300 mt-2">
                Master the rules and mechanics of D&D 5e
              </p>
            </div>
            <div className="text-right">
              <div className="text-red-200 font-medium">{user.username}</div>
              <div className="text-red-400 text-sm">
                {currentCampaign ? currentCampaign.name : 'No Active Campaign'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <Link
            href="/preparation"
            className="p-4 bg-gradient-to-r from-amber-800/50 to-amber-700/50 border border-amber-500/30 rounded-lg text-center hover:from-amber-700/60 hover:to-amber-600/60 transition-all duration-200"
          >
            <div className="text-2xl mb-2">🏠</div>
            <div className="text-amber-100 font-medium text-sm">Overview</div>
          </Link>
          <Link
            href="/preparation/character-building"
            className="p-4 bg-gradient-to-r from-purple-800/50 to-purple-700/50 border border-purple-500/30 rounded-lg text-center hover:from-purple-700/60 hover:to-purple-600/60 transition-all duration-200"
          >
            <div className="text-2xl mb-2">🧙‍♂️</div>
            <div className="text-purple-100 font-medium text-sm">Character Building</div>
          </Link>
          <Link
            href="/preparation/backstory-development"
            className="p-4 bg-gradient-to-r from-blue-800/50 to-blue-700/50 border border-blue-500/30 rounded-lg text-center hover:from-blue-700/60 hover:to-blue-600/60 transition-all duration-200"
          >
            <div className="text-2xl mb-2">📜</div>
            <div className="text-blue-100 font-medium text-sm">Backstory</div>
          </Link>
          <Link
            href="/preparation/leveling-strategies"
            className="p-4 bg-gradient-to-r from-green-800/50 to-green-700/50 border border-green-500/30 rounded-lg text-center hover:from-green-700/60 hover:to-green-600/60 transition-all duration-200"
          >
            <div className="text-2xl mb-2">⬆️</div>
            <div className="text-green-100 font-medium text-sm">Leveling</div>
          </Link>
          <Link
            href="/preparation/game-mechanics"
            className="p-4 bg-gradient-to-r from-red-800/50 to-red-700/50 border border-red-500/30 rounded-lg text-center hover:from-red-700/60 hover:to-red-600/60 transition-all duration-200"
          >
            <div className="text-2xl mb-2">🎲</div>
            <div className="text-red-100 font-medium text-sm">Mechanics</div>
          </Link>
        </div>

        {/* Game Mechanics Content */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-red-500/30 rounded-xl p-8 backdrop-blur-sm">
          <h2 className="text-3xl font-bold text-red-300 mb-6 text-center font-serif">
            Game Mechanics Guide
          </h2>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-red-200 mb-4">Core Mechanics</h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-700/30 rounded-lg border border-red-500/20">
                  <h4 className="text-red-100 font-medium mb-2">🎲 Dice Rolling</h4>
                  <p className="text-red-300 text-sm">
                    Roll a d20 + ability modifier + proficiency bonus. Beat the Difficulty Class (DC) to succeed.
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-red-500/20">
                  <h4 className="text-red-100 font-medium mb-2">⚔️ Combat</h4>
                  <p className="text-red-300 text-sm">
                    Initiative determines turn order. Attack rolls, damage rolls, and saving throws are key to survival.
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-red-500/20">
                  <h4 className="text-red-100 font-medium mb-2">🛡️ Armor Class</h4>
                  <p className="text-red-300 text-sm">
                    Your AC determines how hard you are to hit. Higher is better!
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-red-500/20">
                  <h4 className="text-red-100 font-medium mb-2">💖 Hit Points</h4>
                  <p className="text-red-300 text-sm">
                    Your health points. When they reach 0, you're unconscious and need help!
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-red-200 mb-4">Advanced Concepts</h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-700/30 rounded-lg border border-red-500/20">
                  <h4 className="text-red-100 font-medium mb-2">✨ Spells & Magic</h4>
                  <p className="text-red-300 text-sm">
                    Spell slots, spell levels, and components. Magic is powerful but limited by resources.
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-red-500/20">
                  <h4 className="text-red-100 font-medium mb-2">🎭 Skills & Abilities</h4>
                  <p className="text-red-300 text-sm">
                    Use your character's skills for non-combat challenges like persuasion, stealth, or investigation.
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-red-500/20">
                  <h4 className="text-red-100 font-medium mb-2">🏃 Movement & Actions</h4>
                  <p className="text-red-300 text-sm">
                    On your turn, you can move, take an action, and sometimes a bonus action or reaction.
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-red-500/20">
                  <h4 className="text-red-100 font-medium mb-2">🎯 Advantage & Disadvantage</h4>
                  <p className="text-red-300 text-sm">
                    Roll two d20s and take the higher (advantage) or lower (disadvantage) result.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-red-200 text-lg mb-4">
              Need help understanding specific mechanics? Tap the Wise Elder button for detailed explanations!
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Wise Elder Overlay */}
      <MobileWiseElderOverlay />
    </div>
  );
}
