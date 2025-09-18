'use client';

import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { useCampaign } from '../../../contexts/CampaignContext';
import MobileWiseElderOverlay from '../../../components/wise-elder/MobileWiseElderOverlay';

export default function BackstoryDevelopmentPage() {
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
      <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 border-b border-blue-500/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-blue-100 font-serif">
                📜 Backstory Development
              </h1>
              <p className="text-blue-300 mt-2">
                Craft a compelling backstory that brings your character to life
              </p>
            </div>
            <div className="text-right">
              <div className="text-blue-200 font-medium">{user.username}</div>
              <div className="text-blue-400 text-sm">
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

        {/* Backstory Development Content */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-blue-500/30 rounded-xl p-8 backdrop-blur-sm">
          <h2 className="text-3xl font-bold text-blue-300 mb-6 text-center font-serif">
            Backstory Development Guide
          </h2>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-blue-200 mb-4">Key Elements</h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-700/30 rounded-lg border border-blue-500/20">
                  <h4 className="text-blue-100 font-medium mb-2">🏠 Origin & Homeland</h4>
                  <p className="text-blue-300 text-sm">
                    Where did your character grow up? What was their early life like? How does their homeland influence them?
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-blue-500/20">
                  <h4 className="text-blue-100 font-medium mb-2">👨‍👩‍👧‍👦 Family & Relationships</h4>
                  <p className="text-blue-300 text-sm">
                    Who are the important people in your character's life? What relationships shaped them?
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-blue-500/20">
                  <h4 className="text-blue-100 font-medium mb-2">🎯 Goals & Motivations</h4>
                  <p className="text-blue-300 text-sm">
                    What does your character want to achieve? What drives them to adventure?
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-blue-500/20">
                  <h4 className="text-blue-100 font-medium mb-2">⚔️ Past Adventures</h4>
                  <p className="text-blue-300 text-sm">
                    What experiences led your character to become an adventurer? Any significant events?
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-blue-200 mb-4">Storytelling Tips</h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-700/30 rounded-lg border border-blue-500/20">
                  <h4 className="text-blue-100 font-medium mb-2">📝 Keep It Concise</h4>
                  <p className="text-blue-300 text-sm">
                    A good backstory is 1-2 paragraphs. Leave room for the story to develop during play.
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-blue-500/20">
                  <h4 className="text-blue-100 font-medium mb-2">🎭 Create Hooks</h4>
                  <p className="text-blue-300 text-sm">
                    Include elements your DM can use - lost family members, old enemies, unfinished business.
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-blue-500/20">
                  <h4 className="text-blue-100 font-medium mb-2">🤝 Collaborate</h4>
                  <p className="text-blue-300 text-sm">
                    Work with your DM and other players to create connections between characters.
                  </p>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-blue-500/20">
                  <h4 className="text-blue-100 font-medium mb-2">💭 Personality Traits</h4>
                  <p className="text-blue-300 text-sm">
                    How does your backstory influence your character's personality, fears, and aspirations?
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-blue-200 text-lg mb-4">
              Need help crafting your backstory? Tap the Wise Elder button for personalized storytelling guidance!
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Wise Elder Overlay */}
      <MobileWiseElderOverlay />
    </div>
  );
}
