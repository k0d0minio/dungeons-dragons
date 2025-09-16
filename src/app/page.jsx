'use client';

import { useState, useEffect } from 'react';
import { fetchSampleData, fetchList, fetchItem, DND_ENDPOINTS } from '@/lib/dnd-api';

export default function DndPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('overview');
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemLoading, setItemLoading] = useState(false);

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

  const loadCategoryData = async (category) => {
    try {
      setLoading(true);
      const categoryData = await fetchList(category);
      setData(prev => ({
        ...prev,
        [category]: categoryData.results || []
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadItemDetails = async (category, index) => {
    try {
      setItemLoading(true);
      const itemData = await fetchItem(category, index);
      setSelectedItem(itemData);
    } catch (err) {
      setError(err.message);
    } finally {
      setItemLoading(false);
    }
  };

  const categories = [
    { key: 'overview', name: 'Grand Archive', icon: '📜', description: 'Master index of all knowledge' },
    { key: 'classes', name: 'Warrior Classes', icon: '⚔️', description: 'Paths of martial prowess' },
    { key: 'races', name: 'Ancestral Bloodlines', icon: '🧙‍♂️', description: 'Peoples of the realm' },
    { key: 'spells', name: 'Arcane Arts', icon: '✨', description: 'Mystical incantations' },
    { key: 'monsters', name: 'Bestiary', icon: '🐉', description: 'Creatures of legend' },
    { key: 'equipment', name: 'Arms & Armor', icon: '🛡️', description: 'Tools of adventure' },
    { key: 'magic-items', name: 'Enchanted Relics', icon: '💎', description: 'Artifacts of power' },
    { key: 'weapon-properties', name: 'Weapon Mastery', icon: '⚡', description: 'Special techniques' },
    { key: 'damage-types', name: 'Elemental Forces', icon: '🔥', description: 'Types of destruction' },
    { key: 'conditions', name: 'Afflictions', icon: '😵', description: 'States of being' },
    { key: 'skills', name: 'Proficiencies', icon: '🎯', description: 'Learned abilities' }
  ];

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-yellow-900 to-orange-900 relative overflow-hidden">
        {/* Ancient parchment texture overlay */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4af37' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        {/* Floating magical orbs */}
        <div className="absolute top-20 left-20 w-4 h-4 bg-yellow-400 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-40 right-32 w-6 h-6 bg-amber-400 rounded-full animate-pulse opacity-40" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-32 left-40 w-3 h-3 bg-orange-400 rounded-full animate-pulse opacity-50" style={{animationDelay: '2s'}}></div>
        
        <div className="flex items-center justify-center min-h-screen relative z-10">
          <div className="text-center">
            {/* Ancient tome with magical glow */}
            <div className="relative mb-8">
              <div className="w-24 h-32 bg-gradient-to-b from-amber-800 to-amber-900 rounded-lg shadow-2xl mx-auto transform rotate-3 animate-pulse">
                <div className="absolute inset-2 bg-gradient-to-b from-yellow-200 to-amber-300 rounded border-2 border-amber-700">
                  <div className="h-full w-full bg-gradient-to-b from-transparent to-black opacity-20 rounded"></div>
                </div>
                <div className="absolute top-2 left-2 right-2 h-1 bg-amber-600 rounded"></div>
                <div className="absolute top-4 left-2 right-2 h-1 bg-amber-600 rounded"></div>
                <div className="absolute top-6 left-2 right-2 h-1 bg-amber-600 rounded"></div>
              </div>
              {/* Magical sparkles around the tome */}
              <div className="absolute -top-2 -right-2 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
              <div className="absolute -bottom-2 -left-2 w-1 h-1 bg-amber-300 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
            </div>
            
            <h1 className="text-4xl font-bold text-amber-100 mb-4 font-serif tracking-wider">
              📚 Ancient Tome Awakens 📚
            </h1>
            <p className="text-amber-200 text-lg font-serif">
              Summoning the knowledge of ages past...
            </p>
            
            {/* Magical loading bar */}
            <div className="mt-8 w-64 mx-auto">
              <div className="h-2 bg-amber-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-indigo-900 relative overflow-hidden">
        {/* Dark magical texture */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ff0000' fill-opacity='0.1'%3E%3Cpath d='M20 20c0-11 9-20 20-20v20h-20z'/%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        {/* Cracked magical circles */}
        <div className="absolute top-20 left-20 w-16 h-16 border-2 border-red-400 rounded-full opacity-30 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-12 h-12 border-2 border-purple-400 rounded-full opacity-40 animate-pulse" style={{animationDelay: '1s'}}></div>
        
        <div className="flex items-center justify-center min-h-screen relative z-10">
          <div className="text-center">
            {/* Broken magical tome */}
            <div className="relative mb-8">
              <div className="w-24 h-32 bg-gradient-to-b from-red-800 to-red-900 rounded-lg shadow-2xl mx-auto transform -rotate-3">
                <div className="absolute inset-2 bg-gradient-to-b from-red-200 to-red-300 rounded border-2 border-red-700">
                  <div className="h-full w-full bg-gradient-to-b from-transparent to-black opacity-30 rounded"></div>
                  {/* Crack lines */}
                  <div className="absolute top-4 left-2 w-16 h-0.5 bg-red-800 transform rotate-12"></div>
                  <div className="absolute top-8 right-2 w-12 h-0.5 bg-red-800 transform -rotate-6"></div>
                </div>
                <div className="absolute top-2 left-2 right-2 h-1 bg-red-600 rounded"></div>
                <div className="absolute top-4 left-2 right-2 h-1 bg-red-600 rounded"></div>
              </div>
              {/* Dark sparkles */}
              <div className="absolute -top-2 -right-2 w-2 h-2 bg-red-400 rounded-full animate-ping"></div>
              <div className="absolute -bottom-2 -left-2 w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
            </div>
            
            <h1 className="text-4xl font-bold text-red-100 mb-4 font-serif tracking-wider">
              ⚡ Ancient Curse Detected ⚡
            </h1>
            <p className="text-red-200 text-lg font-serif mb-2">
              The mystical energies have been disrupted...
            </p>
            <p className="text-red-300 text-sm mb-6 font-mono">
              {error}
            </p>
            
            <button 
              onClick={loadInitialData}
              className="px-8 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-amber-100 font-serif font-bold rounded-lg hover:from-amber-500 hover:to-yellow-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-amber-400"
            >
              🔮 Attempt Ritual Again 🔮
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-yellow-900 to-orange-900 relative overflow-hidden">
      {/* Ancient parchment texture overlay */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4af37' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      
      {/* Floating magical orbs */}
      <div className="absolute top-20 left-20 w-4 h-4 bg-yellow-400 rounded-full animate-pulse opacity-60"></div>
      <div className="absolute top-40 right-32 w-6 h-6 bg-amber-400 rounded-full animate-pulse opacity-40" style={{animationDelay: '1s'}}></div>
      <div className="absolute bottom-32 left-40 w-3 h-3 bg-orange-400 rounded-full animate-pulse opacity-50" style={{animationDelay: '2s'}}></div>
      <div className="absolute top-60 left-1/2 w-5 h-5 bg-yellow-300 rounded-full animate-pulse opacity-30" style={{animationDelay: '3s'}}></div>
      
      {/* Header */}
      <div className="relative z-10 bg-gradient-to-r from-amber-800/30 to-yellow-800/30 backdrop-blur-sm border-b-4 border-amber-600 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-amber-100 mb-4 font-serif tracking-wider drop-shadow-lg">
              📚 The Grand Archive 📚
            </h1>
            <p className="text-amber-200 text-xl font-serif italic">
              &ldquo;Within these ancient tomes lies the knowledge of ages past, the wisdom of warriors, 
              and the mysteries of the arcane arts&hellip;&rdquo;
            </p>
            <div className="mt-4 flex justify-center space-x-4">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="relative">
              {/* Ancient scroll background */}
              <div className="absolute inset-0 bg-gradient-to-b from-amber-100 to-yellow-100 rounded-lg transform rotate-1 shadow-2xl"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-amber-200 to-yellow-200 rounded-lg transform -rotate-1 shadow-xl"></div>
              <div className="relative bg-gradient-to-b from-amber-50 to-yellow-50 rounded-lg p-6 border-4 border-amber-600 shadow-2xl">
                {/* Scroll edges */}
                <div className="absolute -left-2 top-0 bottom-0 w-4 bg-gradient-to-b from-amber-600 to-amber-800 rounded-l-lg"></div>
                <div className="absolute -right-2 top-0 bottom-0 w-4 bg-gradient-to-b from-amber-600 to-amber-800 rounded-r-lg"></div>
                
                <h2 className="text-2xl font-bold text-amber-900 mb-6 font-serif text-center border-b-2 border-amber-700 pb-2">
                  📜 Table of Contents 📜
                </h2>
                <div className="space-y-3">
                  {categories.map((category) => (
                    <button
                      key={category.key}
                      onClick={() => {
                        setSelectedCategory(category.key);
                        if (category.key !== 'overview' && (!data || !data[category.key])) {
                          loadCategoryData(category.key);
                        }
                      }}
                      className={`w-full text-left px-4 py-4 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                        selectedCategory === category.key
                          ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-amber-100 shadow-lg border-2 border-amber-400'
                          : 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900 hover:from-amber-200 hover:to-yellow-200 border-2 border-amber-300 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex items-center mb-1">
                        <span className="text-2xl mr-3">{category.icon}</span>
                        <span className="font-bold font-serif text-lg">{category.name}</span>
                      </div>
                      <p className="text-sm italic text-amber-700 ml-8">
                        {category.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="relative">
              {/* Ancient tome background */}
              <div className="absolute inset-0 bg-gradient-to-b from-amber-800 to-amber-900 rounded-lg transform rotate-1 shadow-2xl"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-amber-700 to-amber-800 rounded-lg transform -rotate-1 shadow-xl"></div>
              <div className="relative bg-gradient-to-b from-amber-100 to-yellow-100 rounded-lg p-8 border-4 border-amber-600 shadow-2xl">
                {/* Tome spine */}
                <div className="absolute -left-3 top-0 bottom-0 w-6 bg-gradient-to-b from-amber-800 to-amber-900 rounded-l-lg shadow-lg">
                  <div className="absolute inset-2 bg-gradient-to-b from-amber-600 to-amber-700 rounded-l-lg"></div>
                  <div className="absolute top-4 left-1 right-1 h-0.5 bg-amber-400"></div>
                  <div className="absolute top-8 left-1 right-1 h-0.5 bg-amber-400"></div>
                  <div className="absolute top-12 left-1 right-1 h-0.5 bg-amber-400"></div>
                </div>
                
                {/* Page content */}
                <div className="ml-4">
                  {selectedCategory === 'overview' ? (
                    <OverviewContent data={data} />
                  ) : (
                    <CategoryContent 
                      category={selectedCategory}
                      data={data?.[selectedCategory] || []}
                      loading={loading}
                      onItemClick={(index) => loadItemDetails(selectedCategory, index)}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Item Details Modal */}
            {selectedItem && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  {/* Magical scroll background */}
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-100 to-yellow-100 rounded-lg transform rotate-1 shadow-2xl"></div>
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-200 to-yellow-200 rounded-lg transform -rotate-1 shadow-xl"></div>
                  <div className="relative bg-gradient-to-b from-amber-50 to-yellow-50 rounded-lg p-8 border-4 border-amber-600 shadow-2xl">
                    {/* Scroll edges */}
                    <div className="absolute -left-2 top-0 bottom-0 w-4 bg-gradient-to-b from-amber-600 to-amber-800 rounded-l-lg"></div>
                    <div className="absolute -right-2 top-0 bottom-0 w-4 bg-gradient-to-b from-amber-600 to-amber-800 rounded-r-lg"></div>
                    
                    <div className="flex justify-between items-center mb-6 border-b-2 border-amber-700 pb-4">
                      <h3 className="text-3xl font-bold text-amber-900 font-serif">
                        📖 {selectedItem.name || selectedItem.title}
                      </h3>
                      <button
                        onClick={() => setSelectedItem(null)}
                        className="text-amber-700 hover:text-amber-900 text-3xl font-bold transform hover:scale-110 transition-all duration-200"
                      >
                        ✕
                      </button>
                    </div>
                    
                    {itemLoading ? (
                      <div className="text-center py-12">
                        <div className="relative mb-6">
                          <div className="w-16 h-20 bg-gradient-to-b from-amber-800 to-amber-900 rounded-lg shadow-2xl mx-auto transform rotate-2 animate-pulse">
                            <div className="absolute inset-2 bg-gradient-to-b from-yellow-200 to-amber-300 rounded border-2 border-amber-700">
                              <div className="h-full w-full bg-gradient-to-b from-transparent to-black opacity-20 rounded"></div>
                            </div>
                            <div className="absolute top-2 left-2 right-2 h-1 bg-amber-600 rounded"></div>
                            <div className="absolute top-4 left-2 right-2 h-1 bg-amber-600 rounded"></div>
                          </div>
                        </div>
                        <p className="text-amber-800 text-lg font-serif">Consulting the ancient texts...</p>
                      </div>
                    ) : (
                      <div className="text-amber-900">
                        <div className="bg-gradient-to-b from-amber-100 to-yellow-100 border-2 border-amber-400 rounded-lg p-6 shadow-inner">
                          <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed overflow-x-auto">
                            {JSON.stringify(selectedItem, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewContent({ data }) {
  if (!data) return <div className="text-amber-800 font-serif">Consulting the ancient archives...</div>;

  return (
    <div>
      <h2 className="text-3xl font-bold text-amber-900 mb-8 font-serif text-center border-b-2 border-amber-700 pb-4">
        📚 Master Index of Arcane Knowledge 📚
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(data).map(([category, items]) => (
          <div key={category} className="relative">
            {/* Mini scroll background */}
            <div className="absolute inset-0 bg-gradient-to-b from-amber-200 to-yellow-200 rounded-lg transform rotate-1 shadow-lg"></div>
            <div className="relative bg-gradient-to-b from-amber-100 to-yellow-100 rounded-lg p-6 border-2 border-amber-400 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <h3 className="text-xl font-bold text-amber-900 mb-4 font-serif capitalize text-center border-b border-amber-600 pb-2">
                {category.replace('-', ' ')}
              </h3>
              <div className="space-y-2">
                {items.slice(0, 5).map((item, index) => (
                  <div key={index} className="text-amber-800 text-sm font-serif flex items-center">
                    <span className="text-amber-600 mr-2">✦</span>
                    {item.name}
                  </div>
                ))}
                {items.length > 5 && (
                  <div className="text-amber-600 text-sm font-serif italic text-center mt-3 pt-2 border-t border-amber-300">
                    +{items.length - 5} more entries in the archives
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryContent({ category, data, loading, onItemClick }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="relative mb-6">
          <div className="w-16 h-20 bg-gradient-to-b from-amber-800 to-amber-900 rounded-lg shadow-2xl mx-auto transform rotate-2 animate-pulse">
            <div className="absolute inset-2 bg-gradient-to-b from-yellow-200 to-amber-300 rounded border-2 border-amber-700">
              <div className="h-full w-full bg-gradient-to-b from-transparent to-black opacity-20 rounded"></div>
            </div>
            <div className="absolute top-2 left-2 right-2 h-1 bg-amber-600 rounded"></div>
            <div className="absolute top-4 left-2 right-2 h-1 bg-amber-600 rounded"></div>
          </div>
        </div>
        <p className="text-amber-800 text-lg font-serif">Summoning the ancient knowledge...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-amber-900 mb-8 font-serif text-center border-b-2 border-amber-700 pb-4 capitalize">
        {category.replace('-', ' ')} ({data.length} entries)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((item, index) => (
          <button
            key={index}
            onClick={() => onItemClick(item.index)}
            className="relative group transition-all duration-300 transform hover:scale-105"
          >
            {/* Card background */}
            <div className="absolute inset-0 bg-gradient-to-b from-amber-200 to-yellow-200 rounded-lg transform rotate-1 shadow-lg group-hover:shadow-xl"></div>
            <div className="relative bg-gradient-to-b from-amber-100 to-yellow-100 rounded-lg p-6 border-2 border-amber-400 group-hover:border-amber-500 shadow-lg group-hover:shadow-xl">
              <h3 className="text-amber-900 font-bold text-lg font-serif group-hover:text-amber-700 transition-colors mb-2">
                {item.name}
              </h3>
              {item.url && (
                <p className="text-amber-600 text-sm font-serif italic">
                  📖 Click to consult the ancient texts
                </p>
              )}
              {/* Decorative elements */}
              <div className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute bottom-2 left-2 w-1 h-1 bg-amber-400 rounded-full opacity-40 group-hover:opacity-80 transition-opacity"></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
