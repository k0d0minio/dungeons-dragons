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

    </div>
  );
}