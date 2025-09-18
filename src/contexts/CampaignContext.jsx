'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CampaignContext = createContext();

export function CampaignProvider({ children }) {
  const { user } = useAuth();
  const [currentCampaign, setCurrentCampaign] = useState(null);
  const [campaignMode, setCampaignMode] = useState('PREPARATION');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Campaign mode configurations
  const modeConfigs = {
    PREPARATION: {
      name: 'Campaign Preparation',
      description: 'Guided character creation, backstory building, and D&D learning for beginners',
      color: 'blue',
      icon: '📚',
      features: [
        'Character Creation & Development',
        'Backstory Building & Storytelling',
        'Leveling Up Strategies & Examples',
        'D&D Rules & Mechanics Learning',
        'Campaign World Exploration',
        'Player Onboarding & Tutorials'
      ],
      wiseElderContext: 'campaign_preparation',
      beginnerFriendly: true,
      focusAreas: [
        'Character Building',
        'Backstory Development', 
        'Game Mechanics',
        'Leveling Strategies',
        'Roleplay Examples'
      ]
    },
    ACTIVE_CAMPAIGN: {
      name: 'Active Campaign',
      description: 'Between sessions, note taking, and inventory management',
      color: 'green',
      icon: '🗺️',
      features: [
        'Note taking and session summaries',
        'Inventory management',
        'Character development',
        'Campaign planning between sessions'
      ],
      wiseElderContext: 'active_campaign'
    },
    GAMEPLAY_SESSION: {
      name: 'Gameplay Session',
      description: 'Active gameplay, dice rolling, and real-time advice',
      color: 'red',
      icon: '⚔️',
      features: [
        'Real-time dice rolling',
        'Combat tracking',
        'Live gameplay advice',
        'Synchronized multi-device play'
      ],
      wiseElderContext: 'gameplay_session'
    }
  };

  // Load current campaign
  const loadCurrentCampaign = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/campaigns');
      const data = await response.json();
      
      if (data.success && data.campaigns.length > 0) {
        // For DMs, use their own campaign. For players, use the first available campaign
        if (user.role === 'DM') {
          const dmCampaign = data.campaigns.find(c => c.dmId === user.id);
          if (dmCampaign) {
            setCurrentCampaign(dmCampaign);
            setCampaignMode(dmCampaign.mode);
          } else {
            setCurrentCampaign(null);
            setCampaignMode('PREPARATION');
          }
        } else {
          // Players can join any campaign
          setCurrentCampaign(data.campaigns[0]);
          setCampaignMode(data.campaigns[0].mode);
        }
      } else {
        setCurrentCampaign(null);
        setCampaignMode('PREPARATION');
      }
    } catch (err) {
      setError('Failed to load campaign');
      console.error('Error loading campaign:', err);
      setCurrentCampaign(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Change campaign mode (DM only)
  const changeCampaignMode = async (newMode) => {
    if (!user || user.role !== 'DM') {
      throw new Error('Only DMs can change campaign mode');
    }

    if (!currentCampaign) {
      throw new Error('No active campaign');
    }

    setIsLoading(true);
    try {
      // TODO: Implement mode change logic
      const response = await fetch(`/api/campaigns/${currentCampaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      });

      const data = await response.json();
      if (data.success) {
        setCampaignMode(newMode);
        setCurrentCampaign(data.campaign);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError('Failed to change campaign mode');
      console.error('Error changing campaign mode:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create new campaign (DM only)
  const createCampaign = async (campaignData) => {
    if (!user || user.role !== 'DM') {
      throw new Error('Only DMs can create campaigns');
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      });

      const data = await response.json();
      if (data.success) {
        setCurrentCampaign(data.campaign);
        setCampaignMode(data.campaign.mode);
        setError(null);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError('Failed to create campaign');
      console.error('Error creating campaign:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Get current mode configuration
  const getCurrentModeConfig = () => {
    return modeConfigs[campaignMode] || modeConfigs.PREPARATION;
  };

  // Check if user can perform action in current mode
  const canPerformAction = (action) => {
    // TODO: Implement permission logic based on mode and user role
    return true; // Placeholder
  };

  useEffect(() => {
    if (user) {
      loadCurrentCampaign();
    }
  }, [user]);

  const value = {
    // State
    currentCampaign,
    campaignMode,
    isLoading,
    error,
    
    // Mode configuration
    modeConfigs,
    getCurrentModeConfig,
    
    // Actions
    loadCurrentCampaign,
    changeCampaignMode,
    createCampaign,
    canPerformAction,
    
    // Utilities
    isDM: user?.role === 'DM',
    isPlayer: user?.role === 'PLAYER'
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
}
