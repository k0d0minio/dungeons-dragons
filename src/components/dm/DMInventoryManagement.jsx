'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Input, LoadingSkeleton } from '../ui';

export default function DMInventoryManagement() {
  const [inventories, setInventories] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingInventory, setEditingInventory] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    characterId: '',
    userId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [inventoriesRes, charactersRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/characters')
      ]);
      
      if (!inventoriesRes.ok || !charactersRes.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const inventoriesData = await inventoriesRes.json();
      const charactersData = await charactersRes.json();
      
      setInventories(inventoriesData.inventories || []);
      setCharacters(charactersData.characters || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const url = editingInventory ? `/api/inventory/${editingInventory.id}` : '/api/inventory';
      const method = editingInventory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save inventory');
      }
      
      await fetchData();
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (inventoryId) => {
    if (!confirm('Are you sure you want to delete this inventory? This will also delete all items in it.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/inventory/${inventoryId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete inventory');
      
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      characterId: '',
      userId: ''
    });
    setShowCreateForm(false);
    setEditingInventory(null);
    setError(null);
  };

  const startEdit = (inventory) => {
    setEditingInventory(inventory);
    setFormData({
      name: inventory.name || '',
      description: inventory.description || '',
      characterId: inventory.characterId || '',
      userId: inventory.userId || ''
    });
    setShowCreateForm(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton type="card" />
        <LoadingSkeleton type="card" />
        <LoadingSkeleton type="card" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-purple-200">🎒 Inventory Management</h2>
          <p className="text-purple-300 text-sm">Manage all player inventories</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          variant="primary"
          size="md"
        >
          ➕ Create Inventory
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
          <div className="text-red-200">❌ {error}</div>
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card variant="glass" size="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-purple-200">
              {editingInventory ? '✏️ Edit Inventory' : '➕ Create New Inventory'}
            </h3>
            <Button
              onClick={resetForm}
              variant="ghost"
              size="sm"
            >
              ✕ Cancel
            </Button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Inventory Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Backpack, Treasure Chest"
              />
              
              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">
                  Character
                </label>
                <select
                  value={formData.characterId}
                  onChange={(e) => setFormData({ ...formData, characterId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-amber-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">General Inventory</option>
                  {characters.map(character => (
                    <option key={character.id} value={character.id}>
                      {character.name} ({character.user?.username})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <Input
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe this inventory..."
            />
            
            <div className="flex gap-3">
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {editingInventory ? '💾 Update Inventory' : '➕ Create Inventory'}
              </Button>
              <Button
                type="button"
                onClick={resetForm}
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Inventories List */}
      <Card variant="glass" size="lg">
        <h3 className="text-lg font-bold text-purple-200 mb-4">🎒 All Inventories</h3>
        
        {inventories.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎒</div>
            <div className="text-purple-300">No inventories found</div>
            <div className="text-purple-400 text-sm">Create your first inventory to get started</div>
          </div>
        ) : (
          <div className="space-y-3">
            {inventories.map(inventory => (
              <div key={inventory.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-purple-200 font-bold text-xl">🎒</span>
                  </div>
                  <div>
                    <div className="text-amber-200 font-bold text-lg">{inventory.name}</div>
                    <div className="text-amber-300">
                      {inventory.character?.name || 'General Inventory'}
                    </div>
                    <div className="text-amber-400 text-sm">
                      Player: {inventory.user?.username || 'Unknown'} • 
                      Items: {inventory.items?.length || 0}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => startEdit(inventory)}
                    variant="ghost"
                    size="sm"
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(inventory.id)}
                    variant="danger"
                    size="sm"
                  >
                    🗑️ Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
