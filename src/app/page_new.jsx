'use client';

import { useState, useEffect } from 'react';
import { fetchSampleData, fetchItem, fetchList } from '../lib/dnd-api';
import ClassDetailView from '../components/character/ClassDetailView';
import RaceDetailView from '../components/character/RaceDetailView';
import DiceRoller from '../components/tools/DiceRoller';
import CombatTracker from '../components/combat/CombatTracker';
import CharacterSheet from '../components/character-sheet/CharacterSheet';
import NoteTakingSystem from '../components/notes/NoteTakingSystem';
import InventorySystem from '../components/inventory/InventorySystem';

export default function DndPage() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const sampleData = await fetchSampleData();
      setData(sampleData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = async (category) => {
    // Special cases that should go directly to their tabs
    if (category === 'notes') {
      setActiveTab('notes');
      return;
    }
    if (category === 'character') {
      setActiveTab('character');
      return;
    }
    if (category === 'inventory') {
      setActiveTab('inventory');
      return;
    }
    
    setSelectedCategory(category);
    setSelectedItem(null);
    setActiveTab('category');
    
    try {
      const categoryData = await fetchList(category);
      setData(prev => ({ 
        ...prev, 
        [category]: {
          count: categoryData.count,
          results: categoryData.results
        }
      }));
    } catch (err) {
      console.error(`Error loading ${category}:`, err);
    }
  };

  const handleItemSelect = async (item) => {
    setSelectedItem(item);
    setActiveTab('detail');
    
    try {
      const itemData = await fetchItem(item.url);
      setData(prev => ({ 
        ...prev, 
        [item.index]: itemData
      }));
    } catch (err) {
      console.error(`Error loading item:`, err);
    }
  };

  const categories = [
    { key: 'character', name: 'Character Sheet', icon: '📋', color: 'bg-amber-500' },
    { key: 'notes', name: 'Notes', icon: '📝', color: 'bg-indigo-500' },
    { key: 'inventory', name: 'Inventory', icon: '🎒', color: 'bg-emerald-500' },
    { key: 'classes', name: 'Classes', icon: '⚔️', color: 'bg-red-500' },
    { key: 'races', name: 'Races', icon: '🧬', color: 'bg-blue-500' },
    { key: 'spells', name: 'Spells', icon: '✨', color: 'bg-purple-500' },
    { key: 'equipment', name: 'Equipment', icon: '🛡️', color: 'bg-green-500' },
    { key: 'monsters', name: 'Monsters', icon: '🐉', color: 'bg-orange-500' },
    { key: 'feats', name: 'Feats', icon: '⭐', color: 'bg-yellow-500' }
  ];

  const rollDice = (sides, count = 1) => {
    const results = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      results.push(roll);
      total += roll;
    }
    return { results, total, sides, count };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⚔️</div>
          <div className="text-amber-200 text-xl font-serif">Loading your adventure...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-red-400 text-xl font-serif">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-amber-100 relative overflow-hidden">
      {/* Medieval Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fbbf24' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Medieval Header */}
      <div className="relative bg-gradient-to-r from-amber-900/40 via-amber-800/30 to-amber-900/40 backdrop-blur-sm border-b-2 border-amber-600/50 p-4 shadow-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-amber-100 font-serif mb-2 tracking-wider drop-shadow-lg">
            ⚔️ D&D TOOLBOX ⚔️
          </h1>
          <p className="text-amber-300 text-sm font-medium">Your Medieval Adventure Companion</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 relative z-10">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Welcome Message */}
            <div className="text-center mb-8">
              <div className="bg-gradient-to-r from-amber-800/30 to-amber-900/30 rounded-xl p-6 border-2 border-amber-600/40 shadow-xl">
                <h2 className="text-2xl font-bold text-amber-100 font-serif mb-2">Welcome, Adventurer!</h2>
                <p className="text-amber-300 text-sm">Choose your tools for the journey ahead</p>
              </div>
            </div>

            {/* Core Tools Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {/* Character Sheet */}
              <button
                onClick={() => setActiveTab('character')}
                className="group bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 rounded-xl p-6 text-left transition-all duration-300 transform hover:scale-105 hover:shadow-2xl border-2 border-amber-500/50 shadow-lg"
              >
                <div className="text-white">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">📋</div>
                  <div className="font-bold text-xl mb-2">Character Sheet</div>
                  <div className="text-amber-100 text-sm opacity-90">Create and manage your hero</div>
                </div>
              </button>

              {/* Notes */}
              <button
                onClick={() => setActiveTab('notes')}
                className="group bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 rounded-xl p-6 text-left transition-all duration-300 transform hover:scale-105 hover:shadow-2xl border-2 border-indigo-500/50 shadow-lg"
              >
                <div className="text-white">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">📝</div>
                  <div className="font-bold text-xl mb-2">Notes</div>
                  <div className="text-indigo-100 text-sm opacity-90">Track your adventures</div>
                </div>
              </button>

              {/* Inventory */}
              <button
                onClick={() => setActiveTab('inventory')}
                className="group bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 rounded-xl p-6 text-left transition-all duration-300 transform hover:scale-105 hover:shadow-2xl border-2 border-emerald-500/50 shadow-lg"
              >
                <div className="text-white">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">🎒</div>
                  <div className="font-bold text-xl mb-2">Inventory</div>
                  <div className="text-emerald-100 text-sm opacity-90">Manage your equipment</div>
                </div>
              </button>

              {/* Combat Tracker */}
              <button
                onClick={() => setActiveTab('combat')}
                className="group bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-xl p-6 text-left transition-all duration-300 transform hover:scale-105 hover:shadow-2xl border-2 border-red-500/50 shadow-lg"
              >
                <div className="text-white">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">⚔️</div>
                  <div className="font-bold text-xl mb-2">Combat Tracker</div>
                  <div className="text-red-100 text-sm opacity-90">Manage battles</div>
                </div>
              </button>
            </div>

            {/* Quick Tools */}
            <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 rounded-xl p-6 border-2 border-amber-600/30 shadow-xl">
              <h3 className="text-amber-200 font-bold text-lg mb-4 text-center font-serif">⚡ Quick Tools</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setActiveTab('dice')}
                  className="bg-slate-700/80 hover:bg-slate-600/80 rounded-lg p-4 transition-all duration-300 transform hover:scale-105 border border-amber-500/30"
                >
                  <div className="text-amber-100 font-medium text-center">🎲</div>
                  <div className="text-amber-300 text-sm text-center">Dice Roller</div>
                </button>
                <button 
                  onClick={() => window.open('/wise-elder', '_blank')}
                  className="bg-slate-700/80 hover:bg-slate-600/80 rounded-lg p-4 transition-all duration-300 transform hover:scale-105 border border-amber-500/30"
                >
                  <div className="text-amber-100 font-medium text-center">🧙‍♂️</div>
                  <div className="text-amber-300 text-sm text-center">Wise Elder</div>
                </button>
              </div>
            </div>

            {/* Reference Library */}
            <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 rounded-xl p-6 border-2 border-amber-600/30 shadow-xl">
              <h3 className="text-amber-200 font-bold text-lg mb-4 text-center font-serif">📚 Reference Library</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.filter(cat => !['character', 'notes', 'inventory'].includes(cat.key)).map(category => {
                  const count = data[category.key]?.count || 0;
                  return (
                    <button
                      key={category.key}
                      onClick={() => handleCategorySelect(category.key)}
                      className={`${category.color} rounded-lg p-4 text-left transition-all duration-300 transform hover:scale-105 hover:shadow-lg border-2 border-white/20`}
                    >
                      <div className="text-white">
                        <div className="text-2xl mb-1">{category.icon}</div>
                        <div className="font-bold text-sm">{category.name}</div>
                        <div className="text-xs opacity-90">{count} entries</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Character Sheet Tab */}
        {activeTab === 'character' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab('overview')}
                className="flex items-center text-amber-200 hover:text-amber-100 transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-xl font-bold text-amber-100 font-serif">📋 Character Sheet</h2>
              <div></div>
            </div>
            <CharacterSheet rollDice={rollDice} />
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab('overview')}
                className="flex items-center text-amber-200 hover:text-amber-100 transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-xl font-bold text-amber-100 font-serif">📝 Notes</h2>
              <div></div>
            </div>
            <NoteTakingSystem />
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab('overview')}
                className="flex items-center text-amber-200 hover:text-amber-100 transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-xl font-bold text-amber-100 font-serif">🎒 Inventory</h2>
              <div></div>
            </div>
            <InventorySystem />
          </div>
        )}

        {/* Combat Tracker Tab */}
        {activeTab === 'combat' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab('overview')}
                className="flex items-center text-amber-200 hover:text-amber-100 transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-xl font-bold text-amber-100 font-serif">⚔️ Combat Tracker</h2>
              <div></div>
            </div>
            <CombatTracker rollDice={rollDice} />
          </div>
        )}

        {/* Dice Roller Tab */}
        {activeTab === 'dice' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab('overview')}
                className="flex items-center text-amber-200 hover:text-amber-100 transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-xl font-bold text-amber-100 font-serif">🎲 Dice Roller</h2>
              <div></div>
            </div>
            <DiceRoller />
          </div>
        )}

        {/* Category View */}
        {activeTab === 'category' && selectedCategory && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab('overview')}
                className="flex items-center text-amber-200 hover:text-amber-100 transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-xl font-bold text-amber-100 font-serif">
                {categories.find(cat => cat.key === selectedCategory)?.icon} {categories.find(cat => cat.key === selectedCategory)?.name}
              </h2>
              <div></div>
            </div>

            <div className="space-y-3">
              {(data[selectedCategory]?.results || []).map(item => (
                <button
                  key={item.index}
                  onClick={() => handleItemSelect(item)}
                  className="w-full text-left bg-slate-800/50 hover:bg-slate-700 rounded-lg p-4 border border-amber-500/20 transition-colors"
                >
                  <div className="text-amber-100 font-medium text-lg">{item.name}</div>
                  <div className="text-amber-300 text-sm mt-1">{item.desc || 'No description available'}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Detail View */}
        {activeTab === 'detail' && selectedItem && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab('category')}
                className="flex items-center text-amber-200 hover:text-amber-100 transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-xl font-bold text-amber-100 font-serif">{selectedItem.name}</h2>
              <div></div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-6 border border-amber-500/20">
              {selectedItem.index === 'class' && (
                <ClassDetailView classData={data[selectedItem.index]} />
              )}
              {selectedItem.index === 'race' && (
                <RaceDetailView raceData={data[selectedItem.index]} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
