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
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

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

  useEffect(() => {
    loadInitialData();
  }, []);

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
          results: categoryData.results || []
        }
      }));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleItemSelect = async (item) => {
    setSelectedItem(item);
    setActiveTab('item');
    
    try {
      const itemData = await fetchItem(selectedCategory, item.index);
      setData(prev => ({ ...prev, [item.index]: itemData }));
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredItems = (items) => {
    if (!searchTerm) return items;
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getAllItems = () => {
    const allItems = [];
    Object.keys(data).forEach(category => {
      if (data[category]?.results) {
        allItems.push(...data[category].results);
      }
    });
    return allItems;
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-amber-200 text-lg font-serif">Loading the ancient tomes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center bg-red-900/30 border border-red-500 rounded-lg p-6 max-w-sm">
          <p className="text-red-200 text-lg font-serif mb-2">⚠️ Error Loading Data</p>
          <p className="text-red-300 text-sm">{error}</p>
          <button 
            onClick={loadInitialData}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-amber-500/20">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-amber-100 font-serif">🎲 D&D Toolbox</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  activeTab === 'overview' 
                    ? 'bg-amber-500 text-slate-900' 
                    : 'bg-slate-700 text-amber-200 hover:bg-slate-600'
                }`}
              >
                📚
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  activeTab === 'search' 
                    ? 'bg-amber-500 text-slate-900' 
                    : 'bg-slate-700 text-amber-200 hover:bg-slate-600'
                }`}
              >
                🔍
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {activeTab === 'search' && (
        <div className="px-4 py-3 bg-slate-800/50">
          <div className="relative">
            <input
              type="text"
              placeholder="Search spells, classes, races..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-700 border border-amber-500/30 rounded-lg px-4 py-3 text-amber-100 placeholder-amber-300 focus:outline-none focus:border-amber-500"
            />
            <div className="absolute right-3 top-3 text-amber-400">🔍</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-4 py-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              {categories.map(category => {
                const count = data[category.key]?.count || 0;
                return (
                  <button
                    key={category.key}
                    onClick={() => handleCategorySelect(category.key)}
                    className={`${category.color} rounded-lg p-4 text-left transition-transform hover:scale-105 active:scale-95`}
                  >
                    <div className="text-white">
                      <div className="text-2xl mb-1">{category.icon}</div>
                      <div className="font-bold text-lg">{category.name}</div>
                      <div className="text-sm opacity-90">{count} entries</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Recent/Favorites */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/20">
              <h3 className="text-amber-200 font-bold mb-3">⚡ Quick Access</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => setActiveTab('dice')}
                  className="w-full text-left bg-slate-700 hover:bg-slate-600 rounded-lg p-3 transition-colors"
                >
                  <div className="text-amber-100 font-medium">🎲 Roll Dice</div>
                  <div className="text-amber-300 text-sm">Quick dice roller</div>
                </button>
                <button 
                  onClick={() => setActiveTab('character')}
                  className="w-full text-left bg-slate-700 hover:bg-slate-600 rounded-lg p-3 transition-colors"
                >
                  <div className="text-amber-100 font-medium">📋 Character Sheet</div>
                  <div className="text-amber-300 text-sm">Quick reference</div>
                </button>
                <button 
                  onClick={() => setActiveTab('combat')}
                  className="w-full text-left bg-slate-700 hover:bg-slate-600 rounded-lg p-3 transition-colors"
                >
                  <div className="text-amber-100 font-medium">⚔️ Combat Tracker</div>
                  <div className="text-amber-300 text-sm">Initiative & HP</div>
                </button>
                <button 
                  onClick={() => window.location.href = '/wise-elder'}
                  className="w-full text-left bg-slate-700 hover:bg-slate-600 rounded-lg p-3 transition-colors"
                >
                  <div className="text-amber-100 font-medium">🧙‍♂️ Wise Elder</div>
                  <div className="text-amber-300 text-sm">AI D&D Expert</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-4">
            {searchTerm ? (
              <div className="space-y-3">
                {categories.map(category => {
                  const items = data[category.key]?.results || [];
                  const filtered = filteredItems(items);
                  
                  if (filtered.length === 0) return null;
                  
                  return (
                    <div key={category.key} className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/20">
                      <h3 className="text-amber-200 font-bold mb-3 flex items-center">
                        {category.icon} {category.name} ({filtered.length})
                      </h3>
                      <div className="space-y-2">
                        {filtered.slice(0, 5).map(item => (
                          <button
                            key={item.index}
                            onClick={() => handleItemSelect(item)}
                            className="w-full text-left bg-slate-700 hover:bg-slate-600 rounded-lg p-3 transition-colors"
                          >
                            <div className="text-amber-100 font-medium">{item.name}</div>
                          </button>
                        ))}
                        {filtered.length > 5 && (
                          <div className="text-amber-300 text-sm text-center py-2">
                            +{filtered.length - 5} more...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-amber-200 text-lg font-serif">Search for anything D&D related</p>
                <p className="text-amber-300 text-sm mt-2">Classes, spells, races, equipment, monsters...</p>
              </div>
            )}
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
                {categories.find(c => c.key === selectedCategory)?.icon} {categories.find(c => c.key === selectedCategory)?.name}
              </h2>
              <div></div>
            </div>

            <div className="space-y-2">
              {(data[selectedCategory]?.results || []).map(item => (
                <button
                  key={item.index}
                  onClick={() => handleItemSelect(item)}
                  className="w-full text-left bg-slate-800/50 hover:bg-slate-700 rounded-lg p-4 border border-amber-500/20 transition-colors"
                >
                  <div className="text-amber-100 font-medium text-lg">{item.name}</div>
                  <div className="text-amber-300 text-sm mt-1">Tap to view details</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Item Detail View */}
        {activeTab === 'item' && selectedItem && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab('category')}
                className="flex items-center text-amber-200 hover:text-amber-100 transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-xl font-bold text-amber-100 font-serif">
                {selectedItem.name}
              </h2>
              <div></div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/20">
              {data[selectedItem.index] ? (
                <div className="space-y-6">
                  {selectedCategory === 'races' ? (
                    <RaceDetailView raceData={data[selectedItem.index]} />
                  ) : selectedCategory === 'classes' ? (
                    <ClassDetailView classData={data[selectedItem.index]} />
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center border-b border-amber-500/30 pb-4">
                        <h3 className="text-2xl font-bold text-amber-100 font-serif mb-2">
                          {data[selectedItem.index]?.name || 'Unknown Item'}
                        </h3>
                        <div className="text-amber-400 text-sm">
                          Complete API Response Data
                        </div>
                      </div>
                      
                      <div className="bg-slate-700/30 rounded-lg border border-amber-500/20 p-4">
                        <div className="font-mono text-xs bg-slate-800/50 p-4 rounded border border-amber-500/10 overflow-x-auto">
                          <pre className="text-amber-200 whitespace-pre-wrap">
                            {JSON.stringify(data[selectedItem.index], null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-amber-200">Loading details...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-amber-500/20 p-4">
        <div className="flex justify-around">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
              activeTab === 'overview' ? 'bg-amber-500 text-slate-900' : 'text-amber-200 hover:bg-slate-700'
            }`}
          >
            <span className="text-xl">📚</span>
            <span className="text-xs font-medium">Library</span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
              activeTab === 'search' ? 'bg-amber-500 text-slate-900' : 'text-amber-200 hover:bg-slate-700'
            }`}
          >
            <span className="text-xl">🔍</span>
            <span className="text-xs font-medium">Search</span>
          </button>
          <button
            onClick={() => setActiveTab('dice')}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
              activeTab === 'dice' ? 'bg-amber-500 text-slate-900' : 'text-amber-200 hover:bg-slate-700'
            }`}
          >
            <span className="text-xl">🎲</span>
            <span className="text-xs font-medium">Dice</span>
          </button>
          <button
            onClick={() => setActiveTab('combat')}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
              activeTab === 'combat' ? 'bg-amber-500 text-slate-900' : 'text-amber-200 hover:bg-slate-700'
            }`}
          >
            <span className="text-xl">⚔️</span>
            <span className="text-xs font-medium">Combat</span>
          </button>
        </div>
      </div>

      {/* Bottom padding to account for fixed navigation */}
      <div className="h-20"></div>
    </div>
  );
}