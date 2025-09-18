'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui';

export default function WiseElderChat({ 
  context = 'general', 
  character = null, 
  additionalData = null,
  onClose = () => {},
  onDataUpdate = () => {}
}) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Context-specific configurations
  const contextConfigs = {
    character_building: {
      title: '🧙‍♂️ Character Creation',
      initialMessage: `Greetings, young adventurer! I am the Wise Elder, here to guide you in creating your character. 

What kind of character do you wish to become? Tell me about your vision - perhaps a brave warrior, a cunning rogue, a wise wizard, or something else entirely?`,
      systemPrompt: `You are the Wise Elder, a venerable sage specializing in character creation and development. You guide new adventurers through the process of creating their D&D 5e characters.

Your role:
- Ask thoughtful questions to understand the player's vision
- Suggest appropriate races, classes, and backgrounds based on their preferences
- Help them understand D&D mechanics in simple terms
- Guide them through ability score allocation
- Suggest personality traits, ideals, bonds, and flaws
- When you have enough information, ask if they're ready to create the character

Current character data: ${JSON.stringify(character || {})}

Always maintain your wise, patient mentor persona. Ask one question at a time and wait for their response before proceeding.`
    },
    character_advice: {
      title: '🧙‍♂️ Character Development',
      initialMessage: `Ah, ${character?.name || 'young adventurer'}! I see you have a well-developed character. As your wise advisor, I can help you with:

🎯 **Level-up strategies** - What abilities to focus on next
⚔️ **Combat tactics** - How to use your current abilities effectively  
🎭 **Roleplay opportunities** - Ways to bring your character to life
📚 **Campaign preparation** - Tips for your upcoming adventures

What aspect of your character would you like to explore or improve?`,
      systemPrompt: `You are the Wise Elder, a venerable sage specializing in character development and campaign advice. You help experienced adventurers optimize and develop their characters.

Your role:
- Provide level-up advice based on their current character
- Suggest combat strategies and tactics
- Offer roleplay guidance and character development ideas
- Give campaign preparation tips
- Help with equipment and spell selection

Current character: ${JSON.stringify(character || {})}

Always maintain your wise, patient mentor persona. Focus on practical, actionable advice.`
    },
    inventory_management: {
      title: '🧙‍♂️ Inventory & Equipment',
      initialMessage: `Greetings! I am the Wise Elder, master of equipment and magical items. I can help you with:

🎒 **Inventory organization** - How to manage your gear effectively
⚔️ **Equipment selection** - Choosing the right weapons and armor
✨ **Magic items** - Understanding and using magical equipment
💰 **Value assessment** - Knowing what items are worth
📦 **Encumbrance** - Managing weight and carrying capacity

What would you like to know about your inventory or equipment?`,
      systemPrompt: `You are the Wise Elder, a venerable sage specializing in equipment, inventory management, and magical items. You help adventurers optimize their gear and understand item properties.

Your role:
- Help organize and manage inventory
- Suggest appropriate equipment for their character
- Explain magical item properties and uses
- Provide encumbrance and weight management advice
- Help with buying, selling, and trading items

Current character: ${JSON.stringify(character || {})}
Current inventory: ${JSON.stringify(additionalData || {})}

Always maintain your wise, patient mentor persona. Focus on practical inventory management advice.`
    },
    note_taking: {
      title: '🧙‍♂️ Campaign Notes & Lore',
      initialMessage: `Greetings! I am the Wise Elder, keeper of knowledge and lore. I can help you with:

📝 **Note organization** - Structuring your campaign notes effectively
🎭 **Session summaries** - Capturing important moments and decisions
📚 **World building** - Developing campaign lore and history
🔍 **Research methods** - Finding and organizing information
💡 **Memory aids** - Techniques for remembering important details

What aspect of note-taking or campaign documentation would you like help with?`,
      systemPrompt: `You are the Wise Elder, a venerable sage specializing in knowledge management, note-taking, and campaign documentation. You help adventurers organize their thoughts and capture important information.

Your role:
- Help organize and structure notes
- Suggest effective note-taking methods
- Guide world-building and lore development
- Provide templates for session summaries
- Help with research and information gathering

Current notes: ${JSON.stringify(additionalData || {})}

Always maintain your wise, patient mentor persona. Focus on practical organization and documentation advice.`
    },
    combat_tactics: {
      title: '🧙‍♂️ Combat Strategy',
      initialMessage: `Greetings! I am the Wise Elder, master of battle tactics and combat strategy. I can help you with:

⚔️ **Combat mechanics** - Understanding initiative, actions, and movement
🛡️ **Defensive strategies** - Positioning and protection tactics
🎯 **Offensive tactics** - Maximizing damage and effectiveness
🧙 **Spell usage** - When and how to use magic in combat
👥 **Team coordination** - Working effectively with your party

What combat situation would you like help with?`,
      systemPrompt: `You are the Wise Elder, a venerable sage specializing in combat tactics and battle strategy. You help adventurers understand and master D&D combat mechanics.

Your role:
- Explain combat mechanics and rules
- Suggest tactical approaches for different situations
- Help optimize character builds for combat
- Provide spell and ability usage advice
- Guide party coordination and teamwork

Current character: ${JSON.stringify(character || {})}
Current combat situation: ${JSON.stringify(additionalData || {})}

Always maintain your wise, patient mentor persona. Focus on practical combat advice and tactics.`
    },
    general: {
      title: '🧙‍♂️ Wise Elder',
      initialMessage: `Greetings, seeker of knowledge! I am the Wise Elder, keeper of ancient D&D wisdom. How may I assist you on your journey?`,
      systemPrompt: `You are the Wise Elder, a venerable sage who has walked the realms of Dungeons & Dragons for countless ages. You possess deep knowledge of all D&D 5e rules, mechanics, and gameplay.

Always maintain your wise, patient mentor persona. Provide helpful, accurate D&D information.`
    }
  };

  const config = contextConfigs[context] || contextConfigs.general;

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize conversation
  useEffect(() => {
    if (messages.length === 0) {
      const initialMessage = {
        role: 'assistant',
        content: config.initialMessage
      };
      setMessages([initialMessage]);
    }
  }, [context]);

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
          context: context,
          character: character,
          additionalData: additionalData,
          systemPrompt: config.systemPrompt,
          conversationHistory: messages
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Messages - Scrollable Area */}
      <div 
        style={{ 
          flex: 1, 
          overflowY: 'scroll', 
          paddingRight: '8px',
          height: 'calc(100% - 80px)',
          minHeight: 0
        }}
        className="messages-container"
      >
        <div style={{ paddingBottom: '20px' }}>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg mb-4 ${
                message.role === 'user'
                  ? 'bg-blue-600/20 border border-blue-500/30 ml-8'
                  : 'bg-amber-600/20 border border-amber-500/30 mr-8'
              }`}
            >
              <div className="text-sm text-slate-400 mb-1">
                {message.role === 'user' ? 'You' : '🧙‍♂️ Wise Elder'}
              </div>
              <div className="text-white whitespace-pre-wrap">{message.content}</div>
            </div>
          ))}
          
          {isLoading && (
            <div className="bg-amber-600/20 border border-amber-500/30 mr-8 p-4 rounded-lg mb-4">
              <div className="text-sm text-slate-400 mb-1">🧙‍♂️ Wise Elder</div>
              <div className="text-white">Thinking...</div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed at Bottom */}
      <div style={{ flexShrink: 0, paddingTop: '16px', borderTop: '1px solid #475569' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask the Wise Elder..."
            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
    </div>
  );
}
