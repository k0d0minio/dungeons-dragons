'use client';

import { useState } from 'react';
import { Button, Card, Modal } from '../ui';
import { useCampaign } from '../../contexts/CampaignContext';

export default function CampaignModeSelector() {
  const { 
    currentCampaign, 
    campaignMode, 
    modeConfigs, 
    getCurrentModeConfig,
    changeCampaignMode,
    isDM,
    isLoading 
  } = useCampaign();
  
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [changingMode, setChangingMode] = useState(false);

  const currentConfig = getCurrentModeConfig();

  const handleModeChange = async (newMode) => {
    if (!isDM) return;
    
    setChangingMode(true);
    try {
      await changeCampaignMode(newMode);
      setShowModeSelector(false);
    } catch (error) {
      console.error('Error changing mode:', error);
      // TODO: Show error message to user
    } finally {
      setChangingMode(false);
    }
  };

  if (!currentCampaign) {
    return (
      <div className="bg-gradient-to-r from-amber-800/20 to-amber-700/20 border border-amber-500/30 rounded-lg p-2 backdrop-blur-sm text-center">
        <div className="text-amber-400 text-sm mb-1">No Active Campaign</div>
        <div className="text-amber-500 text-xs">Contact your DM to join a campaign</div>
      </div>
    );
  }

  return (
    <>
      {/* Compact Mode Display */}
      <div 
        className={`bg-gradient-to-r from-amber-800/20 to-amber-700/20 border border-amber-500/30 rounded-lg p-2 backdrop-blur-sm cursor-pointer transition-all hover:scale-105 ${
          isDM ? 'hover:bg-amber-600/20' : ''
        }`}
        onClick={() => isDM && setShowModeSelector(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-lg">{currentConfig.icon}</div>
            <div>
              <div className="font-bold text-amber-100 text-sm font-serif">{currentConfig.name}</div>
              <div className="text-amber-300 text-xs truncate max-w-48">{currentConfig.description}</div>
            </div>
          </div>
          {isDM && (
            <div className="text-amber-400 text-xs">
              {isLoading ? '⏳' : '⚙️'}
            </div>
          )}
        </div>
      </div>

      {/* Mode Selector Modal (DM Only) */}
      {isDM && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${showModeSelector ? 'block' : 'hidden'}`}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModeSelector(false)}></div>
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-amber-500/30">
              <h3 className="text-2xl font-bold text-amber-100 font-serif">🎭 Campaign Mode Selector</h3>
              <button
                onClick={() => setShowModeSelector(false)}
                className="text-amber-400 hover:text-amber-300 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                <div className="text-amber-300 text-center mb-6">
                  Choose the current mode for your campaign. This affects what features are available and how the Wise Elder responds.
                </div>
                
                <div className="grid gap-4">
                  {Object.entries(modeConfigs).map(([mode, config]) => (
                    <div
                      key={mode}
                      className={`bg-gradient-to-r from-slate-700/50 to-slate-800/50 border rounded-xl p-4 cursor-pointer transition-all hover:scale-105 ${
                        campaignMode === mode 
                          ? 'bg-amber-600/20 border-amber-500' 
                          : 'border-amber-500/30 hover:bg-slate-700/50'
                      }`}
                      onClick={() => handleModeChange(mode)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">{config.icon}</div>
                        <div className="flex-1">
                          <div className="font-bold text-amber-100 mb-1 font-serif">
                            {config.name}
                            {campaignMode === mode && ' (Current)'}
                          </div>
                          <div className="text-amber-300 text-sm mb-2">
                            {config.description}
                          </div>
                          <div className="text-amber-400 text-xs">
                            Features: {config.features.join(', ')}
                          </div>
                        </div>
                        {changingMode && campaignMode === mode && (
                          <div className="text-amber-400">⏳</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center text-amber-500 text-sm mt-6">
                  💡 The Wise Elder will adapt its responses based on the selected mode
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
