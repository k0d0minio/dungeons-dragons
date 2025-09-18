'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useCampaign } from '../contexts/CampaignContext';
import WiseElderChat from './wise-elder/WiseElderChat';
import { Button } from './ui';

export default function ToolboxInterface() {
  const { user } = useAuth();
  const { 
    currentCampaign, 
    campaignMode, 
    getCurrentModeConfig,
    createCampaign,
    isDM,
    isLoading 
  } = useCampaign();
  
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    mode: 'PREPARATION'
  });

  const modeConfig = getCurrentModeConfig();

  // Direct navigation items
  const navigationItems = [
    { id: 'character', name: 'Character', icon: '👤', href: '/characters' },
    { id: 'preparation', name: 'Preparation', icon: '📚', href: '/preparation' },
    { id: 'dice', name: 'Dice', icon: '🎲', href: '/dice' },
    { id: 'resources', name: 'Resources', icon: '🛡️', href: '/equipment' }
  ];

  // Handle campaign creation
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!campaignForm.name.trim()) return;

    setIsCreatingCampaign(true);
    try {
      await createCampaign(campaignForm);
      setShowCreateCampaign(false);
      setCampaignForm({ name: '', description: '', mode: 'PREPARATION' });
    } catch (error) {
      console.error('Error creating campaign:', error);
    } finally {
      setIsCreatingCampaign(false);
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-amber-400 text-lg">Loading your toolbox...</div>
        </div>
      </div>
    );
  }

  if (!currentCampaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🧙‍♂️</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">D&D Toolbox</h1>
                  <p className="text-slate-400 text-sm">Your Digital Adventure Companion</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-slate-300 text-sm">
                  Welcome, <span className="font-semibold text-white">{user?.username}</span>
                </div>
                <button
                  onClick={() => {
                    fetch('/api/auth/logout', { method: 'POST' });
                    window.location.reload();
                  }}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* No Campaign State */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
              <span className="text-6xl">🏰</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">
              No Active Campaign
            </h2>
            <p className="text-slate-400 text-xl mb-8 max-w-2xl mx-auto">
              {isDM 
                ? 'Create a new campaign to begin your digital adventure'
                : 'No campaigns are currently available. Contact your DM to create a campaign for you to join.'
              }
            </p>
            {isDM && (
              <button
                onClick={() => setShowCreateCampaign(true)}
                className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg transition-all transform hover:scale-105 font-bold text-lg shadow-lg"
              >
                ➕ Create Campaign
              </button>
            )}
          </div>
        </main>

        {/* Create Campaign Modal */}
        {isDM && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${showCreateCampaign ? 'block' : 'hidden'}`}>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateCampaign(false)}></div>
            <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">🏰 Create New Campaign</h3>
                <button
                  onClick={() => setShowCreateCampaign(false)}
                  className="text-slate-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCampaign} className="space-y-6">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter campaign name..."
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    value={campaignForm.description}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your campaign world, setting, or story..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Initial Mode
                  </label>
                  <select
                    value={campaignForm.mode}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, mode: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="PREPARATION">📚 Campaign Preparation</option>
                    <option value="ACTIVE_CAMPAIGN">🗺️ Active Campaign</option>
                    <option value="GAMEPLAY_SESSION">⚔️ Gameplay Session</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateCampaign(false)}
                    className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!campaignForm.name.trim() || isCreatingCampaign}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:from-slate-600 disabled:to-slate-700 text-white rounded-lg transition-all font-medium"
                  >
                    {isCreatingCampaign ? '⏳ Creating...' : '➕ Create Campaign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 min-h-0">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 flex-1 flex flex-col min-h-0">
          <WiseElderChat 
            context="general"
            character={user?.character}
            additionalData={{ campaign: currentCampaign, mode: campaignMode }}
          />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden bg-slate-800/95 backdrop-blur-lg border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-around">
            {navigationItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 text-slate-300 hover:text-white hover:bg-slate-700/50 mobile-touch-target"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs font-semibold">{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>


    </div>
  );
}
