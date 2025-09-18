'use client';

import { useState, useEffect } from 'react';
import { Button, Modal } from '../ui';
import { useCampaign } from '../../contexts/CampaignContext';
import { useAuth } from '../../contexts/AuthContext';

export default function CampaignWiseElder({ 
  context = 'general', 
  character = null, 
  additionalData = null,
  onClose = () => {},
  onDataUpdate = () => {}
}) {
  const { campaignMode, getCurrentModeConfig, currentCampaign } = useCampaign();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get campaign-aware context
  const modeConfig = getCurrentModeConfig();
  const campaignContext = modeConfig.wiseElderContext;

  // Campaign mode specific configurations
  const campaignModeConfigs = {
    campaign_preparation: {
      title: '🧙‍♂️ Campaign Preparation Guide',
      initialMessage: `Greetings, ${user?.role === 'DM' ? 'Dungeon Master' : 'adventurer'}! I am the Wise Elder, here to guide you through campaign preparation.

${user?.role === 'DM' 
  ? `As the DM, I can help you with:
📚 **World Building** - Creating rich, detailed campaign settings
👥 **Player Onboarding** - Guiding new players through character creation
🎭 **Campaign Planning** - Structuring your adventure and story arcs
⚖️ **Game Balance** - Ensuring fair and engaging encounters

What aspect of campaign preparation would you like to work on?`
  : `As a player, I can help you with:
⚔️ **Character Creation** - Building your perfect adventurer
🎯 **Character Development** - Understanding your class and abilities
📖 **World Knowledge** - Learning about the campaign setting
🎭 **Roleplay Preparation** - Developing your character's personality

What would you like to focus on for your character?`}`,
      systemPrompt: `You are the Wise Elder, a venerable sage specializing in campaign preparation and character creation. You help both DMs and players prepare for an upcoming D&D campaign.

Your role:
- Guide DMs through world building and campaign planning
- Help players create and develop their characters
- Provide advice on game balance and encounter design
- Suggest campaign hooks and story elements
- Assist with player onboarding and character optimization

Current campaign: ${currentCampaign?.name || 'New Campaign'}
User role: ${user?.role}
Current character: ${JSON.stringify(character || {})}

Always maintain your wise, patient mentor persona. Focus on preparation and planning advice.`
    },
    active_campaign: {
      title: '🧙‍♂️ Campaign Advisor',
      initialMessage: `Greetings! I am the Wise Elder, your campaign advisor between sessions. I can help you with:

📝 **Session Summaries** - Capturing important moments and decisions
🎒 **Inventory Management** - Organizing equipment and magical items
📚 **World Development** - Expanding on campaign lore and history
⚔️ **Character Growth** - Planning level-ups and character development
🗺️ **Campaign Planning** - Preparing for upcoming sessions

What aspect of your campaign would you like to work on?`,
      systemPrompt: `You are the Wise Elder, a venerable sage specializing in active campaign management. You help both DMs and players manage their ongoing D&D campaign between sessions.

Your role:
- Help with session summaries and note-taking
- Assist with inventory and equipment management
- Guide character development and leveling
- Provide campaign planning and preparation advice
- Suggest story hooks and character development opportunities

Current campaign: ${currentCampaign?.name || 'Active Campaign'}
Campaign mode: ${campaignMode}
User role: ${user?.role}
Current character: ${JSON.stringify(character || {})}

Always maintain your wise, patient mentor persona. Focus on campaign management and character development advice.`
    },
    gameplay_session: {
      title: '🧙‍♂️ Live Game Advisor',
      initialMessage: `Greetings! I am the Wise Elder, your live game advisor. I'm here to help during active gameplay with:

⚔️ **Combat Tactics** - Real-time battle strategy and advice
🎲 **Dice Rolling** - Understanding mechanics and outcomes
📖 **Rule Clarification** - Quick D&D rule references
🎭 **Roleplay Guidance** - Character decision-making support
⚡ **Quick Decisions** - Fast advice for time-sensitive situations

What do you need help with during your current session?`,
      systemPrompt: `You are the Wise Elder, a venerable sage specializing in live gameplay assistance. You help both DMs and players during active D&D sessions with real-time advice and support.

Your role:
- Provide quick combat tactics and strategy advice
- Help with dice rolling and understanding results
- Clarify D&D rules and mechanics on the fly
- Guide character decision-making in real-time
- Offer quick solutions for time-sensitive situations

Current campaign: ${currentCampaign?.name || 'Live Session'}
Campaign mode: ${campaignMode}
User role: ${user?.role}
Current character: ${JSON.stringify(character || {})}

Always maintain your wise, patient mentor persona. Keep responses concise and actionable for live gameplay.`
    }
  };

  // Get the appropriate configuration
  const config = campaignModeConfigs[campaignContext] || campaignModeConfigs.campaign_preparation;

  // Initialize conversation
  useEffect(() => {
    if (messages.length === 0) {
      const initialMessage = {
        role: 'assistant',
        content: config.initialMessage
      };
      setMessages([initialMessage]);
    }
  }, [campaignContext]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputMessage
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/wise-elder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          context: campaignContext,
          character: character,
          additionalData: additionalData,
          systemPrompt: config.systemPrompt,
          conversationHistory: messages,
          campaignMode: campaignMode,
          currentCampaign: currentCampaign
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: data.response
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Handle data updates if provided
        if (data.characterUpdate) {
          onDataUpdate(data.characterUpdate);
        }
      } else {
        const errorMessage = {
          role: 'assistant',
          content: 'I apologize, but I encountered an issue. Please try again.'
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an issue. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-96">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-amber-500/30">
        <h3 className="text-lg font-bold text-amber-100">{config.title}</h3>
        <div className="flex items-center gap-2">
          <div className="text-xs text-amber-400 bg-amber-600/20 px-2 py-1 rounded">
            {modeConfig.name}
          </div>
          <Button
            onClick={onClose}
            variant="secondary"
            size="sm"
          >
            ✕
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-600/20 border border-blue-500/30 ml-8'
                : 'bg-purple-600/20 border border-purple-500/30 mr-8'
            }`}
          >
            <div className="text-sm text-gray-400 mb-1">
              {message.role === 'user' ? 'You' : '🧙‍♂️ Wise Elder'}
            </div>
            <div className="text-amber-100 whitespace-pre-wrap">{message.content}</div>
          </div>
        ))}
        
        {isLoading && (
          <div className="bg-purple-600/20 border border-purple-500/30 mr-8 p-4 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">🧙‍♂️ Wise Elder</div>
            <div className="text-amber-100">Thinking...</div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask the Wise Elder..."
          className="flex-1 px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100 placeholder-amber-400"
          disabled={isLoading}
        />
        <Button
          onClick={sendMessage}
          disabled={!inputMessage.trim() || isLoading}
          variant="primary"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
