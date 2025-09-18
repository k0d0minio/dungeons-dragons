'use client';

import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { useCampaign } from '../../../contexts/CampaignContext';
import MobileWiseElderOverlay from '../../../components/wise-elder/MobileWiseElderOverlay';

export default function LevelingStrategiesPage() {
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
      <div className="bg-gradient-to-r from-green-900/50 to-green-800/50 border-b border-green-500/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-green-100 font-serif">
                ⬆️ Leveling Strategies
              </h1>
              <p className="text-green-300 mt-2">
                Plan your character's growth and advancement
              </p>
            </div>
            <div className="text-right">
              <div className="text-green-200 font-medium">{user.username}</div>
              <div className="text-green-400 text-sm">
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

        {/* Leveling Strategies Content */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-green-500/30 rounded-xl p-8 backdrop-blur-sm">
          <h2 className="text-3xl font-bold text-green-300 mb-6 text-center font-serif">
            Leveling Strategies Guide
          </h2>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-green-200 mb-4">Leveling Basics</h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-700/30 rounded-lg border border-green-500/20">
                  <h4 className="text-green-100 font-medium mb-2">📊 Experience Points</h4>
                  <p className="text-green-300 text-sm">
                    Gain XP through combat, exploration, and roleplay. Each level requires more XP than the last.
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-green-500/20">
                  <h4 className="text-green-100 font-medium mb-2">⬆️ Ability Score Improvements</h4>
                  <p className="text-green-300 text-sm">
                    At certain levels, you can increase ability scores or choose feats to customize your character.
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-green-500/20">
                  <h4 className="text-green-100 font-medium mb-2">🎯 Class Features</h4>
                  <p className="text-green-300 text-sm">
                    Each level brings new class abilities, spells, and features that define your character's growth.
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-green-500/20">
                  <h4 className="text-green-100 font-medium mb-2">💪 Hit Points</h4>
                  <p className="text-green-300 text-sm">
                    Gain hit points each level based on your class's hit die and Constitution modifier.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-green-200 mb-4">Planning Your Growth</h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-700/30 rounded-lg border border-green-500/20">
                  <h4 className="text-green-100 font-medium mb-2">🎯 Set Goals</h4>
                  <p className="text-green-300 text-sm">
                    Think about what abilities or spells you want to gain. Plan your character's development path.
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-green-500/20">
                  <h4 className="text-green-100 font-medium mb-2">⚖️ Balance vs Specialization</h4>
                  <p className="text-green-300 text-sm">
                    Decide whether to improve multiple abilities or focus on one area of expertise.
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-green-500/20">
                  <h4 className="text-green-100 font-medium mb-2">🎭 Roleplay Considerations</h4>
                  <p className="text-green-300 text-sm">
                    How does your character's growth reflect their experiences and personality development?
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-green-500/20">
                  <h4 className="text-green-100 font-medium mb-2">🤝 Party Synergy</h4>
                  <p className="text-green-300 text-sm">
                    Consider how your character's growth complements the rest of your party.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-green-200 text-lg mb-4">
              Need help planning your character's growth? Tap the Wise Elder button for personalized leveling advice!
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Wise Elder Overlay */}
      <MobileWiseElderOverlay />
    </div>
  );
}
