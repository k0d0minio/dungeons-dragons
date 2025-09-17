'use client';

import { useState, useEffect } from 'react';
import { fetchSampleData, fetchItem, fetchList } from '../lib/dnd-api';
import ClassDetailView from '../components/character/ClassDetailView';
import RaceDetailView from '../components/character/RaceDetailView';
import RaceViewer from '../components/races/RaceViewer';
import ClassViewer from '../components/classes/ClassViewer';
import EquipmentViewer from '../components/equipment/EquipmentViewer';
import DiceRoller from '../components/tools/DiceRoller';
import WiseElder from '../components/tools/WiseElder';
import CombatTrackerDB from '../components/combat/CombatTrackerDB';
import CharacterSheetSimple from '../components/character-sheet/CharacterSheetSimple';
import NoteTakingSystemDB from '../components/notes/NoteTakingSystemDB';
import InventorySystemDB from '../components/inventory/InventorySystemDB';
import AuthWrapper from '../components/auth/AuthWrapper';
import { useAuth } from '../contexts/AuthContext';

function DndPageContent() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { user, logout } = useAuth();

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
    if (category === 'races') {
      setActiveTab('races');
      return;
    }
    if (category === 'classes') {
      setActiveTab('classes');
      return;
    }
    if (category === 'equipment') {
      setActiveTab('equipment');
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

      {/* Compact Medieval Header */}
      <div className="relative bg-gradient-to-r from-amber-900/40 via-amber-800/30 to-amber-900/40 backdrop-blur-sm border-b-2 border-amber-600/50 px-3 py-2 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-2xl">⚔️</div>
            <div>
              <h1 className="text-lg font-bold text-amber-100 font-serif tracking-wider drop-shadow-lg">
                D&D TOOLBOX
              </h1>
              <p className="text-amber-300 text-xs">Medieval Adventure Companion</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-amber-200 text-xs">Welcome, {user.username}</div>
              <div className="text-amber-400 text-xs">{user.role === 'DM' ? 'DM' : 'Player'}</div>
            </div>
            <button
              onClick={logout}
              className="bg-slate-700/50 hover:bg-slate-600/50 text-amber-200 px-2 py-1 rounded text-xs transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 py-4 relative z-10">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Core Tools Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Character Sheet */}
              <button
                onClick={() => setActiveTab('character')}
                className="group bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 rounded-lg p-4 text-center transition-all duration-300 transform hover:scale-105 hover:shadow-xl border-2 border-amber-500/50 shadow-lg"
              >
                <div className="text-white">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">📋</div>
                  <div className="font-bold text-sm mb-1">Character</div>
                  <div className="text-amber-100 text-xs opacity-90">Sheet</div>
                </div>
              </button>

              {/* Notes */}
              <button 
                onClick={() => setActiveTab('notes')}
                className="group bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 rounded-lg p-4 text-center transition-all duration-300 transform hover:scale-105 hover:shadow-xl border-2 border-indigo-500/50 shadow-lg"
              >
                <div className="text-white">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">📝</div>
                  <div className="font-bold text-sm mb-1">Notes</div>
                  <div className="text-indigo-100 text-xs opacity-90">Adventure Log</div>
                </div>
              </button>

              {/* Inventory */}
              <button 
                onClick={() => setActiveTab('inventory')}
                className="group bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 rounded-lg p-4 text-center transition-all duration-300 transform hover:scale-105 hover:shadow-xl border-2 border-emerald-500/50 shadow-lg"
              >
                <div className="text-white">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">🎒</div>
                  <div className="font-bold text-sm mb-1">Inventory</div>
                  <div className="text-emerald-100 text-xs opacity-90">Equipment</div>
                </div>
              </button>

              {/* Combat Tracker */}
              <button 
                onClick={() => setActiveTab('combat')}
                className="group bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-lg p-4 text-center transition-all duration-300 transform hover:scale-105 hover:shadow-xl border-2 border-red-500/50 shadow-lg"
              >
                <div className="text-white">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">⚔️</div>
                  <div className="font-bold text-sm mb-1">Combat</div>
                  <div className="text-red-100 text-xs opacity-90">Tracker</div>
                </div>
              </button>

              {/* Dice Roller */}
              <button 
                onClick={() => setActiveTab('dice')}
                className="group bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-lg p-4 text-center transition-all duration-300 transform hover:scale-105 hover:shadow-xl border-2 border-purple-500/50 shadow-lg"
              >
                <div className="text-white">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">🎲</div>
                  <div className="font-bold text-sm mb-1">Dice</div>
                  <div className="text-purple-100 text-xs opacity-90">Roller</div>
                </div>
              </button>

              {/* Wise Elder */}
              <button 
                onClick={() => setActiveTab('wise-elder')}
                className="group bg-gradient-to-br from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 rounded-lg p-4 text-center transition-all duration-300 transform hover:scale-105 hover:shadow-xl border-2 border-cyan-500/50 shadow-lg"
              >
                <div className="text-white">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">🧙‍♂️</div>
                  <div className="font-bold text-sm mb-1">Wise</div>
                  <div className="text-cyan-100 text-xs opacity-90">Elder</div>
                </div>
              </button>
            </div>


            {/* Reference Library */}
            <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 rounded-lg p-4 border-2 border-amber-600/30 shadow-lg">
              <h3 className="text-amber-200 font-bold text-sm mb-3 text-center font-serif">📚 Reference Library</h3>
              <div className="grid grid-cols-3 gap-2">
                {categories.filter(cat => !['character', 'notes', 'inventory'].includes(cat.key)).map(category => {
                  const count = data[category.key]?.count || 0;
                  return (
                    <button
                      key={category.key}
                      onClick={() => handleCategorySelect(category.key)}
                      className={`${category.color} rounded-lg p-3 text-center transition-all duration-300 transform hover:scale-105 hover:shadow-lg border-2 border-white/20`}
                    >
                      <div className="text-white">
                        <div className="text-xl mb-1">{category.icon}</div>
                        <div className="font-bold text-xs">{category.name}</div>
                        <div className="text-xs opacity-90">{count}</div>
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
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <button
                onClick={() => setActiveTab('overview')}
                className="flex items-center text-amber-200 hover:text-amber-100 transition-colors text-sm"
              >
                ← Back
              </button>
              <h2 className="text-lg font-bold text-amber-100 font-serif">📋 Character Sheet</h2>
              <div></div>
            </div>
            <CharacterSheetSimple />
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <button
                onClick={() => setActiveTab('overview')}
                className="flex items-center text-amber-200 hover:text-amber-100 transition-colors text-sm"
              >
                ← Back
              </button>
              <h2 className="text-lg font-bold text-amber-100 font-serif">📝 Notes</h2>
              <div></div>
            </div>
            <NoteTakingSystemDB />
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <button
                onClick={() => setActiveTab('overview')}
                className="flex items-center text-amber-200 hover:text-amber-100 transition-colors text-sm"
              >
                ← Back
              </button>
              <h2 className="text-lg font-bold text-amber-100 font-serif">🎒 Inventory</h2>
              <div></div>
            </div>
            <InventorySystemDB />
          </div>
        )}

        {/* Races Tab */}
        {activeTab === 'races' && (
          <RaceViewer onBack={() => setActiveTab('overview')} />
        )}

        {/* Classes Tab */}
        {activeTab === 'classes' && (
          <ClassViewer onBack={() => setActiveTab('overview')} />
        )}

        {activeTab === 'equipment' && (
          <EquipmentViewer onBack={() => setActiveTab('overview')} />
        )}

        {/* Combat Tracker Tab */}
        {activeTab === 'combat' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <button
                onClick={() => setActiveTab('overview')}
                className="flex items-center text-amber-200 hover:text-amber-100 transition-colors text-sm"
              >
                ← Back
              </button>
              <h2 className="text-lg font-bold text-amber-100 font-serif">⚔️ Combat Tracker</h2>
              <div></div>
            </div>
            <CombatTrackerDB />
          </div>
        )}

        {/* Dice Roller Tab */}
        {activeTab === 'dice' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <button
                onClick={() => setActiveTab('overview')}
                className="flex items-center text-amber-200 hover:text-amber-100 transition-colors text-sm"
              >
                ← Back
              </button>
              <h2 className="text-lg font-bold text-amber-100 font-serif">🎲 Dice Roller</h2>
              <div></div>
            </div>
            <DiceRoller />
          </div>
        )}

        {/* Wise Elder Tab */}
        {activeTab === 'wise-elder' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <button
                onClick={() => setActiveTab('overview')}
                className="flex items-center text-amber-200 hover:text-amber-100 transition-colors text-sm"
              >
                ← Back
              </button>
              <h2 className="text-lg font-bold text-amber-100 font-serif">🧙‍♂️ Wise Elder</h2>
              <div></div>
            </div>
            <WiseElder />
          </div>
        )}

        {/* Category View */}
        {activeTab === 'category' && selectedCategory && (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <button
                onClick={() => setActiveTab('overview')}
                className="flex items-center text-amber-200 hover:text-amber-100 transition-colors text-sm"
              >
                ← Back
              </button>
              <h2 className="text-lg font-bold text-amber-100 font-serif">
                {categories.find(cat => cat.key === selectedCategory)?.icon} {categories.find(cat => cat.key === selectedCategory)?.name}
              </h2>
              <div></div>
            </div>

            <div className="space-y-2">
              {(data[selectedCategory]?.results || []).map(item => (
                <button
                  key={item.index}
                  onClick={() => handleItemSelect(item)}
                  className="w-full text-left bg-slate-800/50 hover:bg-slate-700 rounded-lg p-3 border border-amber-500/20 transition-colors"
                >
                  <div className="text-amber-100 font-medium text-sm">{item.name}</div>
                  <div className="text-amber-300 text-xs mt-1">{item.desc || 'No description available'}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Detail View */}
        {activeTab === 'detail' && selectedItem && (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <button
                onClick={() => setActiveTab('category')}
                className="flex items-center text-amber-200 hover:text-amber-100 transition-colors text-sm"
              >
                ← Back
              </button>
              <h2 className="text-lg font-bold text-amber-100 font-serif">{selectedItem.name}</h2>
              <div></div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/20">
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

export default function DndPage() {
  return (
    <AuthWrapper>
      <DndPageContent />
    </AuthWrapper>
  );
}
