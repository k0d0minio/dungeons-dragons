'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCampaign } from '../../contexts/CampaignContext';

export default function MobileWiseElderOverlay() {
  const { user } = useAuth();
  const { currentCampaign, campaignMode } = useCampaign();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [context, setContext] = useState('general');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 300);
    }
  }, [isOpen]);

  // Get context based on current campaign mode and URL
  const getContext = () => {
    // Check if we're on a preparation page
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      
      if (path.startsWith('/preparation/character-building')) {
        return 'preparation_character-building';
      } else if (path.startsWith('/preparation/backstory-development')) {
        return 'preparation_backstory-development';
      } else if (path.startsWith('/preparation/leveling-strategies')) {
        return 'preparation_leveling-strategies';
      } else if (path.startsWith('/preparation/game-mechanics')) {
        return 'preparation_game-mechanics';
      } else if (path.startsWith('/preparation')) {
        return 'preparation_overview';
      }
    }
    
    // Fallback to campaign mode
    if (campaignMode === 'PREPARATION') {
      return 'preparation_overview';
    } else if (campaignMode === 'ACTIVE_CAMPAIGN') {
      return 'active_campaign';
    } else if (campaignMode === 'GAMEPLAY_SESSION') {
      return 'gameplay_session';
    }
    return 'general';
  };

  // Send message to Wise Elder
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setError(null);

    // Add user message immediately
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    try {
      const response = await fetch('/api/wise-elder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
          context: getContext(),
          character: user?.character || null,
          additionalData: {
            campaignMode,
            currentCampaign: currentCampaign?.name || null
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Wise Elder');
      }

      const data = await response.json();
      
      if (data.success) {
        setMessages([...newMessages, { role: 'assistant', content: data.response }]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error sending message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Open overlay with initial greeting
  const openOverlay = () => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    setIsOpen(true);
    setContext(getContext());
    
    // Add initial greeting if no messages
    if (messages.length === 0) {
      const greeting = getInitialGreeting();
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  };

  // Get initial greeting based on context
  const getInitialGreeting = () => {
    const context = getContext();
    const greetings = {
      'preparation_overview': "Greetings, young adventurer! I am the Wise Elder, here to guide you through your D&D journey. What would you like to learn about today?",
      'preparation_character-building': "Welcome to character building! I'm here to help you create the perfect D&D character. What aspect would you like to work on - race, class, abilities, or something else?",
      'preparation_backstory-development': "Ah, backstory development! The soul of your character. I can help you craft a compelling history that brings your character to life. What's your character's story?",
      'preparation_leveling-strategies': "Leveling strategies! Planning your character's growth is crucial. I can help you understand how to advance and what choices to make. What level are you planning for?",
      'preparation_game-mechanics': "Game mechanics! Understanding the rules is key to enjoying D&D. I can explain any mechanic you're curious about. What would you like to learn?",
      'active_campaign': "Welcome back, brave soul! The campaign continues, and I'm here to help with your notes, inventory, and character development. What do you need assistance with?",
      'gameplay_session': "The battle rages on! I'm here to provide real-time guidance, help with dice rolls, and offer tactical advice. What's happening in your adventure?",
      'general': "Greetings! I am the Wise Elder, your guide through the realms of Dungeons & Dragons. How may I assist you today?"
    };
    
    return greetings[context] || greetings.general;
  };

  // Close overlay
  const closeOverlay = () => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    setIsOpen(false);
  };

  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={openOverlay}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center text-2xl fab-pulse mobile-touch-target"
        style={{
          boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)',
        }}
      >
        🧙‍♂️
      </button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={closeOverlay}
        />

        {/* Chat Container */}
        <div
          className={`absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 transition-all duration-300 transform ${
            isOpen ? 'translate-y-0 wise-elder-slide-up' : 'translate-y-full wise-elder-slide-down'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-amber-500/30 bg-gradient-to-r from-amber-900/50 to-amber-800/50">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🧙‍♂️</div>
              <div>
                <h2 className="text-xl font-bold text-amber-100 font-serif">Wise Elder</h2>
                <p className="text-sm text-amber-300">
                  {getContext() === 'preparation_character-building' && 'Character Building Guide'}
                  {getContext() === 'preparation_backstory-development' && 'Backstory Development Guide'}
                  {getContext() === 'preparation_leveling-strategies' && 'Leveling Strategies Guide'}
                  {getContext() === 'preparation_game-mechanics' && 'Game Mechanics Guide'}
                  {getContext() === 'preparation_overview' && 'Preparation Guide'}
                  {getContext() === 'active_campaign' && 'Campaign Assistant'}
                  {getContext() === 'gameplay_session' && 'Battle Advisor'}
                  {getContext() === 'general' && 'D&D Mentor'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearConversation}
                className="p-2 text-amber-400 hover:text-amber-300 transition-colors"
                title="Clear conversation"
              >
                🗑️
              </button>
              <button
                onClick={closeOverlay}
                className="p-2 text-amber-400 hover:text-amber-300 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 messages-container mobile-safe-area" style={{ height: 'calc(100vh - 140px)' }}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-4 rounded-2xl message-enter ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
                      : 'bg-gradient-to-r from-amber-800/50 to-amber-700/50 text-amber-100 border border-amber-500/30'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gradient-to-r from-amber-800/50 to-amber-700/50 text-amber-100 border border-amber-500/30 p-4 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin">⚔️</div>
                    <span className="text-sm typing-dots">The Wise Elder is thinking</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-start">
                <div className="bg-red-800/50 text-red-100 border border-red-500/30 p-4 rounded-2xl">
                  <div className="text-sm">
                    <div className="font-bold mb-1">⚠️ Error</div>
                    <div>{error}</div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Container */}
          <div className="p-4 border-t border-amber-500/30 bg-gradient-to-r from-slate-800/50 to-slate-900/50 mobile-safe-area">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask the Wise Elder anything..."
                  className="w-full p-4 pr-12 bg-slate-700/50 border border-amber-500/30 rounded-xl text-amber-100 placeholder-amber-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 mobile-input mobile-touch-target"
                  rows={3}
                  style={{ minHeight: '60px', maxHeight: '120px' }}
                />
                <div className="absolute bottom-2 right-2 text-xs text-amber-500">
                  {input.length}/500
                </div>
              </div>
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-slate-600 disabled:to-slate-700 text-white rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50 font-bold mobile-touch-target haptic-medium"
              >
                {isLoading ? '⏳' : '➤'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
