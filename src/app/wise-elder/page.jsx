'use client';

import { useState, useRef, useEffect } from 'react';

export default function WiseElderPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Greetings, young adventurer! I am the Wise Elder, keeper of ancient knowledge and master of all things Dungeons & Dragons. I have walked the realms for countless ages and know the deepest secrets of character creation, the most intricate rules of combat, and the richest lore of our beloved game.\n\nWhat wisdom do you seek today? Ask me about classes, races, spells, or any aspect of D&D that troubles your mind.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/wise-elder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue.trim(),
          conversationHistory: messages
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from the Wise Elder');
      }

      const data = await response.json();
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: "I apologize, young one, but the ancient magic seems to be faltering. Please try your question again, and I shall do my best to provide the wisdom you seek.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        type: 'ai',
        content: "Greetings, young adventurer! I am the Wise Elder, keeper of ancient knowledge and master of all things Dungeons & Dragons. I have walked the realms for countless ages and know the deepest secrets of character creation, the most intricate rules of combat, and the richest lore of our beloved game.\n\nWhat wisdom do you seek today? Ask me about classes, races, spells, or any aspect of D&D that troubles your mind.",
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-amber-500/20">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => window.history.back()}
                className="text-amber-200 hover:text-amber-100 transition-colors mr-4"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-xl font-bold text-amber-100 font-serif">🧙‍♂️ The Wise Elder</h1>
                <p className="text-amber-400 text-sm">Keeper of Ancient D&D Knowledge</p>
              </div>
            </div>
            <button
              onClick={clearChat}
              className="text-amber-400 hover:text-amber-300 text-sm underline"
            >
              Clear Chat
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="px-4 py-4 pb-24">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-4 ${
                  message.type === 'user'
                    ? 'bg-amber-600 text-slate-900'
                    : 'bg-slate-800/50 border border-amber-500/20 text-amber-100'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                <div
                  className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-slate-700' : 'text-amber-400'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800/50 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <span className="text-amber-400 text-sm ml-2">The Wise Elder is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-amber-500/20 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask the Wise Elder about D&D..."
            className="flex-1 bg-slate-700 border border-amber-500/30 rounded-lg px-4 py-3 text-amber-100 placeholder-amber-300 focus:outline-none focus:border-amber-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            {isLoading ? '...' : 'Ask'}
          </button>
        </form>
      </div>
    </div>
  );
}
