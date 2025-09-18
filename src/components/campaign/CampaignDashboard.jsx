'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Card, Modal } from '../ui';
import { useCampaign } from '../../contexts/CampaignContext';
import { useAuth } from '../../contexts/AuthContext';
import CampaignModeSelector from './CampaignModeSelector';
import RealtimeDiceRoller from './RealtimeDiceRoller';
import NoteTakingSystemDB from '../notes/NoteTakingSystemDB';
import InventorySystemDB from '../inventory/InventorySystemDB';
import CombatTrackerDB from '../combat/CombatTrackerDB';
import CharacterDisplaySheet from '../character-sheet/CharacterDisplaySheet';

export default function CampaignDashboard() {
  const { 
    currentCampaign, 
    campaignMode, 
    getCurrentModeConfig,
    createCampaign,
    isDM,
    isLoading 
  } = useCampaign();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showWiseElder, setShowWiseElder] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    mode: 'PREPARATION'
  });

  const modeConfig = getCurrentModeConfig();

  // Get appropriate icon for each feature
  const getFeatureIcon = (featureId) => {
    const icons = {
      'characters': (
        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      'inventory': (
        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      'notes': (
        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      'combat': (
        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'dice': (
        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      'preparation': (
        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    };
    return icons[featureId] || (
      <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    );
  };

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
      // TODO: Show error message to user
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  // Get available features based on campaign mode
  const getAvailableFeatures = () => {
    const baseFeatures = [];

    switch (campaignMode) {
      case 'PREPARATION':
        return [
          { id: 'preparation', name: 'Preparation Guide', icon: '📚', isLink: true, href: '/preparation' },
          ...baseFeatures,
          { id: 'notes', name: 'Campaign Notes', icon: '📝', component: NoteTakingSystemDB },
        ];
      
      case 'ACTIVE_CAMPAIGN':
        return [
          ...baseFeatures,
          { id: 'notes', name: 'Session Notes', icon: '📝', component: NoteTakingSystemDB },
          { id: 'inventory', name: 'Inventory', icon: '🎒', component: InventorySystemDB },
        ];
      
      case 'GAMEPLAY_SESSION':
        return [
          ...baseFeatures,
          { id: 'dice', name: 'Dice Roller', icon: '🎲', component: RealtimeDiceRoller },
          { id: 'combat', name: 'Combat Tracker', icon: '⚔️', component: CombatTrackerDB },
          { id: 'notes', name: 'Live Notes', icon: '📝', component: NoteTakingSystemDB },
        ];
      
      default:
        return baseFeatures;
    }
  };

  const availableFeatures = getAvailableFeatures();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card variant="glass" size="lg" className="text-center py-8">
          <div className="text-amber-400 text-lg">Loading campaign...</div>
        </Card>
      </div>
    );
  }

  if (!currentCampaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Medieval Header */}
        <header className="bg-gradient-to-r from-amber-900/50 to-amber-800/50 border-b border-amber-500/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="text-3xl">⚔️</div>
                <div>
                  <h1 className="text-2xl font-bold text-amber-100 font-serif">
                    D&D Toolbox
                  </h1>
                  <p className="text-amber-300 text-sm">Your Digital Adventure Companion</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-amber-300 text-sm">
                  Welcome, <span className="font-bold text-amber-100">{user?.username}</span>
                </div>
                <button
                  onClick={() => {
                    fetch('/api/auth/logout', { method: 'POST' });
                    window.location.reload();
                  }}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-amber-100 rounded-lg transition-colors text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* No Campaign State */}
            <div className="text-center py-12">
              <div className="text-8xl mb-6">🏰</div>
              <h2 className="text-4xl font-bold text-amber-100 mb-4 font-serif">
                No Active Campaign
              </h2>
              <p className="text-amber-300 text-xl mb-8 max-w-2xl mx-auto">
                {isDM 
                  ? 'Create a new campaign to begin your digital adventure'
                  : 'No campaigns are currently available. Contact your DM to create a campaign for you to join.'
                }
              </p>
              {isDM && (
                <button
                  onClick={() => setShowCreateCampaign(true)}
                  className="px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-amber-100 rounded-lg transition-all transform hover:scale-105 font-bold text-lg shadow-lg"
                >
                  ➕ Create Campaign
                </button>
              )}
            </div>
          </div>
        </main>

        {/* Create Campaign Modal */}
        {isDM && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${showCreateCampaign ? 'block' : 'hidden'}`}>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateCampaign(false)}></div>
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-amber-100 font-serif">🏰 Create New Campaign</h3>
                <button
                  onClick={() => setShowCreateCampaign(false)}
                  className="text-amber-400 hover:text-amber-300 text-xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCampaign} className="space-y-6">
                <div>
                  <label className="block text-amber-100 text-sm font-medium mb-2">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter campaign name..."
                    className="w-full px-4 py-3 bg-slate-700/50 border border-amber-500/30 rounded-lg text-amber-100 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-amber-100 text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    value={campaignForm.description}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your campaign world, setting, or story..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-amber-500/30 rounded-lg text-amber-100 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-amber-100 text-sm font-medium mb-2">
                    Initial Mode
                  </label>
                  <select
                    value={campaignForm.mode}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, mode: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-amber-500/30 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                    className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-700 text-amber-100 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!campaignForm.name.trim() || isCreatingCampaign}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:from-slate-600 disabled:to-slate-700 text-amber-100 rounded-lg transition-all font-medium"
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-16 h-16 opacity-10">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-amber-600">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div className="absolute top-40 right-20 w-12 h-12 opacity-10">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-purple-600">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <div className="absolute bottom-32 left-20 w-20 h-20 opacity-10">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-emerald-600">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-gradient-to-r from-amber-900/90 to-orange-900/90 backdrop-blur-sm border-b border-amber-500/30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-amber-100 font-serif">D&D Campaign</h1>
                <p className="text-sm text-amber-200">Adventure awaits, {user?.username}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-1 bg-amber-500/20 rounded-full border border-amber-400/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-amber-100 font-medium">Online</span>
              </div>
              <button
                onClick={() => setShowWiseElder(true)}
                className="p-2 text-amber-200 hover:text-amber-100 hover:bg-amber-500/20 rounded-lg transition-all duration-200 border border-amber-400/30 hover:border-amber-400/50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <div className="space-y-8">
          {/* Campaign Overview */}
          <div className="bg-gradient-to-br from-amber-100/80 to-orange-100/80 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-300/50 p-6 relative overflow-hidden">
            {/* Decorative corner elements */}
            <div className="absolute top-0 right-0 w-20 h-20 opacity-20">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-amber-600">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            
            <div className="flex items-start justify-between relative z-10">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-amber-900 font-serif">
                      {currentCampaign?.name || 'No Active Campaign'}
                    </h2>
                    <p className="text-amber-700 text-lg">
                      {currentCampaign?.description || 'Create or join a campaign to begin your epic journey'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-200 to-orange-200 rounded-full border border-amber-400/50 shadow-sm">
                    <div className="w-3 h-3 bg-amber-600 rounded-full"></div>
                    <span className="text-sm font-semibold text-amber-800">{modeConfig.name}</span>
                  </div>
                  {isDM && (
                    <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-200 to-purple-300 rounded-full border border-purple-400/50 shadow-sm">
                      <svg className="w-4 h-4 text-purple-700" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-semibold text-purple-800">Dungeon Master</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Mode Selector */}
          <CampaignModeSelector />

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableFeatures.map((feature) => (
              <div
                key={feature.id}
                className="group bg-gradient-to-br from-white/90 to-amber-50/90 backdrop-blur-sm rounded-2xl border border-amber-200/50 hover:border-amber-300/70 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
              >
                {/* Decorative corner */}
                <div className="absolute top-0 right-0 w-16 h-16 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-amber-600">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                
                <div className="p-6 relative z-10">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      {getFeatureIcon(feature.id)}
                    </div>
                    <div>
                      <h3 className="font-bold text-amber-900 text-lg font-serif">{feature.name}</h3>
                      <p className="text-amber-700 text-sm">
                        {feature.description || `Manage ${feature.name.toLowerCase()}`}
                      </p>
                    </div>
                  </div>
                  
                  {feature.isLink ? (
                    <Link
                      href={feature.href}
                      className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-semibold rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Enter
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ) : (
                    <button
                      onClick={() => setActiveTab(feature.id)}
                      className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-semibold rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Open
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Area for Active Features */}
          {activeTab !== 'overview' && (
            <div className="bg-gradient-to-br from-white/95 to-amber-50/95 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-200/50 p-6 relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-24 h-24 opacity-10">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-amber-600">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div className="absolute bottom-0 right-0 w-20 h-20 opacity-10">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-orange-600">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              
              <div className="relative z-10">
                {activeTab === 'characters' && <CharacterDisplaySheet />}
                {activeTab === 'inventory' && <InventorySystemDB />}
                {activeTab === 'notes' && <NoteTakingSystemDB />}
                {activeTab === 'combat' && <CombatTrackerDB />}
                {activeTab === 'dice' && <RealtimeDiceRoller />}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-amber-900/95 to-orange-900/95 backdrop-blur-lg border-t border-amber-500/30 shadow-2xl z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-around">
            {availableFeatures.map((feature) => (
              feature.isLink ? (
                <Link
                  key={feature.id}
                  href={feature.href}
                  className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === feature.id
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg transform scale-105'
                      : 'text-amber-200 hover:text-amber-100 hover:bg-amber-500/20'
                  }`}
                >
                  <div className="w-6 h-6">
                    {getFeatureIcon(feature.id)}
                  </div>
                  <span className="text-xs font-semibold">{feature.name}</span>
                </Link>
              ) : (
                <button
                  key={feature.id}
                  onClick={() => setActiveTab(feature.id)}
                  className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === feature.id
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg transform scale-105'
                      : 'text-amber-200 hover:text-amber-100 hover:bg-amber-500/20'
                  }`}
                >
                  <div className="w-6 h-6">
                    {getFeatureIcon(feature.id)}
                  </div>
                  <span className="text-xs font-semibold">{feature.name}</span>
                </button>
              )
            ))}
            {/* Logout Button */}
            <button
              onClick={() => {
                fetch('/api/auth/logout', { method: 'POST' });
                window.location.reload();
              }}
              className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 text-amber-200 hover:text-red-300 hover:bg-red-500/20"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-xs font-semibold">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Wise Elder Chat Overlay */}
      {showWiseElder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
          <div className="h-full w-full flex flex-col bg-gradient-to-br from-amber-900 to-orange-900 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-32 h-32">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-amber-400">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div className="absolute bottom-10 right-10 w-24 h-24">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-orange-400">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-amber-500/30 relative z-10">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-amber-100 font-serif">Wise Elder</h2>
                  <p className="text-amber-200 text-sm">Your D&D Guide & Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setShowWiseElder(false)}
                className="p-3 text-amber-300 hover:text-amber-100 hover:bg-amber-500/20 rounded-xl transition-all duration-200 border border-amber-400/30 hover:border-amber-400/50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden relative z-10">
              <div className="flex-1 bg-gradient-to-br from-amber-100/90 to-orange-100/90 rounded-2xl p-6 border border-amber-300/50 overflow-y-auto shadow-inner">
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </div>
                    <div className="bg-white rounded-2xl p-4 max-w-[80%] border border-amber-200 shadow-lg">
                      <p className="text-amber-900 font-medium">
                        Greetings, adventurer! I am the Wise Elder, here to guide you through your D&D journey.
                        Whether you need help with character building, understanding game mechanics, campaign strategies,
                        or any other aspect of Dungeons & Dragons, I'm here to assist you.
                      </p>
                    </div>
                  </div>

                  <div className="text-center text-amber-600 text-sm font-medium">
                    Chat functionality coming soon! For now, I can provide guidance through the preparation sections.
                  </div>
                </div>
              </div>

              {/* Input Area */}
              <div className="flex space-x-3">
                <input
                  type="text"
                  placeholder="Ask the Wise Elder anything..."
                  className="flex-1 bg-white/90 border border-amber-300 rounded-xl px-4 py-3 text-amber-900 placeholder-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-lg"
                  disabled
                />
                <button
                  disabled
                  className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-amber-700 hover:to-orange-700 transition-all duration-200 shadow-lg"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
