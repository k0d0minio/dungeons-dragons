'use client';

import { useState, useEffect } from 'react';
import { Card, Button, LoadingSkeleton } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { isDM, getDMView } from '../../lib/permissions';

export default function DMDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({
    characters: [],
    notes: [],
    inventories: [],
    combatSessions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Load all data for DM view
  useEffect(() => {
    if (!isDM(user)) return;
    
    const loadDMData = async () => {
      try {
        setLoading(true);
        
        // Load all data in parallel
        const [charactersRes, notesRes, inventoriesRes, combatRes] = await Promise.all([
          fetch('/api/characters'),
          fetch('/api/notes'),
          fetch('/api/inventory'),
          fetch('/api/combat')
        ]);
        
        const [charactersData, notesData, inventoriesData, combatData] = await Promise.all([
          charactersRes.json(),
          notesRes.json(),
          inventoriesRes.json(),
          combatRes.json()
        ]);
        
        if (charactersData.success && notesData.success && inventoriesData.success && combatData.success) {
          setData({
            characters: charactersData.characters || [],
            notes: notesData.notes || [],
            inventories: inventoriesData.inventories || [],
            combatSessions: combatData.combatSessions || []
          });
        } else {
          setError('Failed to load some data');
        }
      } catch (err) {
        setError('Failed to load DM data');
        console.error('Error loading DM data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadDMData();
  }, [user]);

  if (!isDM(user)) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">🔒</div>
        <div className="text-amber-300">DM access required</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton type="card" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">❌</div>
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  const dmView = getDMView(user, data);
  const activeCombat = dmView.activeCombat;
  const playerCount = dmView.playerCount;

  return (
    <div className="space-y-6">
      {/* DM Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-purple-200 mb-2">🎭 DM Dashboard</h2>
        <p className="text-purple-300 text-sm">Overview of all player data and campaign management</p>
        <div className="mt-4">
          <Button
            onClick={() => window.location.href = '/?tab=management'}
            variant="primary"
            size="lg"
            className="bg-purple-600 hover:bg-purple-700"
          >
            🛠️ Management Tools
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="glass" size="md" className="text-center border-purple-500/30">
          <div className="text-2xl mb-1">👥</div>
          <div className="text-purple-200 font-bold">{playerCount}</div>
          <div className="text-purple-300 text-xs">Players</div>
        </Card>
        
        <Card variant="glass" size="md" className="text-center border-purple-500/30">
          <div className="text-2xl mb-1">📝</div>
          <div className="text-purple-200 font-bold">{dmView.allNotes.length}</div>
          <div className="text-purple-300 text-xs">Notes</div>
        </Card>
        
        <Card variant="glass" size="md" className="text-center border-purple-500/30">
          <div className="text-2xl mb-1">🎒</div>
          <div className="text-purple-200 font-bold">{dmView.allInventories.length}</div>
          <div className="text-purple-300 text-xs">Inventories</div>
        </Card>
        
        <Card variant="glass" size="md" className="text-center border-purple-500/30">
          <div className="text-2xl mb-1">⚔️</div>
          <div className="text-purple-200 font-bold">{dmView.allCombatSessions.length}</div>
          <div className="text-purple-300 text-xs">Combat Sessions</div>
        </Card>
      </div>

      {/* Active Combat Alert */}
      {activeCombat && (
        <Card variant="elevated" size="md" className="border-red-500/50 bg-red-900/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-red-200 font-bold">⚔️ Active Combat</div>
              <div className="text-red-300 text-sm">{activeCombat.name} - Round {activeCombat.round}</div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveTab('combat')}
            >
              Manage Combat
            </Button>
          </div>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
        {[
          { key: 'overview', label: 'Overview', icon: '📊' },
          { key: 'characters', label: 'Characters', icon: '👥' },
          { key: 'notes', label: 'Notes', icon: '📝' },
          { key: 'inventories', label: 'Inventories', icon: '🎒' },
          { key: 'combat', label: 'Combat', icon: '⚔️' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-purple-600 text-white'
                : 'text-purple-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-purple-200">Campaign Overview</h3>
          
          {/* Recent Characters */}
          <Card variant="glass" size="md">
            <h4 className="text-purple-200 font-bold mb-3">Recent Characters</h4>
            <div className="space-y-2">
              {(dmView.allCharacters || []).slice(0, 3).map(character => (
                <div key={character.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                  <div>
                    <div className="text-amber-200 font-medium">{character.name}</div>
                    <div className="text-amber-300 text-sm">
                      {character.race} {character.class} (Level {character.level})
                    </div>
                  </div>
                  <div className="text-amber-400 text-sm">
                    {character.user?.username || 'Unknown Player'}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Notes */}
          <Card variant="glass" size="md">
            <h4 className="text-purple-200 font-bold mb-3">Recent Notes</h4>
            <div className="space-y-2">
              {(dmView.allNotes || []).slice(0, 3).map(note => (
                <div key={note.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                  <div>
                    <div className="text-amber-200 font-medium">{note.title}</div>
                    <div className="text-amber-300 text-sm">{note.type} • {note.user?.username || 'Unknown User'}</div>
                  </div>
                  <div className="text-amber-400 text-xs">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'characters' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-purple-200">All Characters</h3>
          <div className="grid gap-4">
            {(dmView.allCharacters || []).map(character => (
              <Card key={character.id} variant="glass" size="md">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-amber-200 font-bold text-lg">{character.name}</div>
                    <div className="text-amber-300">
                      {character.race} {character.class} (Level {character.level})
                    </div>
                    <div className="text-amber-400 text-sm">
                      Player: {character.user?.username || 'Unknown Player'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-200">AC: {character.armorClass}</div>
                    <div className="text-amber-200">HP: {character.hitPoints}/{character.maxHitPoints}</div>
                    <div className="text-amber-300 text-sm">Init: +{Math.floor((character.dexterity - 10) / 2)}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-purple-200">All Notes</h3>
          <div className="space-y-2">
            {(dmView.allNotes || []).map(note => (
              <Card key={note.id} variant="glass" size="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-amber-200 font-medium">{note.title}</div>
                    <div className="text-amber-300 text-sm">
                      {note.type} • {note.user?.username || 'Unknown User'}
                      {note.character && ` • ${note.character.name}`}
                    </div>
                  </div>
                  <div className="text-amber-400 text-xs">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'inventories' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-purple-200">All Inventories</h3>
          <div className="space-y-2">
            {(dmView.allInventories || []).map(inventory => (
              <Card key={inventory.id} variant="glass" size="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-amber-200 font-medium">{inventory.name}</div>
                    <div className="text-amber-300 text-sm">
                      {inventory.character?.name || 'General Inventory'} • {inventory.user?.username || 'Unknown User'}
                    </div>
                    <div className="text-amber-400 text-xs">
                      {inventory.items?.length || 0} items
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'combat' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-purple-200">Combat Management</h3>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">⚔️</div>
            <div className="text-amber-300">Combat tracker will be integrated here</div>
          </div>
        </div>
      )}
    </div>
  );
}
