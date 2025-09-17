'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Input, Modal } from '../ui';
import { useAuth } from '../../contexts/AuthContext';

export default function InventorySystemDB() {
  const { user } = useAuth();
  const [inventories, setInventories] = useState([]);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');

  // New inventory form state
  const [newInventory, setNewInventory] = useState({
    name: 'Main Inventory',
    characterId: null
  });

  // New item form state
  const [newItem, setNewItem] = useState({
    name: '',
    type: 'MISC',
    weight: 0,
    quantity: 1,
    value: 0,
    description: '',
    isMagic: false,
    rarity: 'COMMON',
    attunement: false,
    magicProperties: '',
    equipped: false,
    equippedSlot: null
  });

  // Item types
  const itemTypes = [
    { value: 'WEAPON', label: 'Weapon', emoji: '⚔️' },
    { value: 'ARMOR', label: 'Armor', emoji: '🛡️' },
    { value: 'SHIELD', label: 'Shield', emoji: '🛡️' },
    { value: 'TOOL', label: 'Tool', emoji: '🔧' },
    { value: 'CONSUMABLE', label: 'Consumable', emoji: '🧪' },
    { value: 'MISC', label: 'Miscellaneous', emoji: '📦' },
    { value: 'MAGIC', label: 'Magic Item', emoji: '✨' }
  ];

  // Rarity levels
  const rarities = [
    { value: 'COMMON', label: 'Common', color: 'text-gray-400' },
    { value: 'UNCOMMON', label: 'Uncommon', color: 'text-green-400' },
    { value: 'RARE', label: 'Rare', color: 'text-blue-400' },
    { value: 'VERY_RARE', label: 'Very Rare', color: 'text-purple-400' },
    { value: 'LEGENDARY', label: 'Legendary', color: 'text-orange-400' },
    { value: 'ARTIFACT', label: 'Artifact', color: 'text-red-400' }
  ];

  // Load inventories from database
  const loadInventories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory');
      const data = await response.json();
      
      if (data.success) {
        setInventories(data.inventories);
        if (data.inventories.length > 0 && !selectedInventory) {
          setSelectedInventory(data.inventories[0]);
          loadItems(data.inventories[0].id);
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load inventories');
      console.error('Error loading inventories:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load items for selected inventory
  const loadItems = async (inventoryId) => {
    try {
      const response = await fetch(`/api/inventory/items?inventoryId=${inventoryId}`);
      const data = await response.json();
      
      if (data.success) {
        setItems(data.items);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load items');
      console.error('Error loading items:', err);
    }
  };

  // Load inventories on component mount
  useEffect(() => {
    loadInventories();
  }, []);

  // Load items when inventory changes
  useEffect(() => {
    if (selectedInventory) {
      loadItems(selectedInventory.id);
    }
  }, [selectedInventory]);

  // Create new inventory
  const handleCreateInventory = async () => {
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newInventory),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setInventories(prev => [data.inventory, ...prev]);
        setSelectedInventory(data.inventory);
        setNewInventory({ name: 'Main Inventory', characterId: null });
        setShowCreateModal(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create inventory');
      console.error('Error creating inventory:', err);
    }
  };

  // Create new item
  const handleCreateItem = async () => {
    if (!selectedInventory) return;
    
    try {
      const response = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newItem,
          inventoryId: selectedInventory.id
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setItems(prev => [data.item, ...prev]);
        setNewItem({
          name: '',
          type: 'MISC',
          weight: 0,
          quantity: 1,
          value: 0,
          description: '',
          isMagic: false,
          rarity: 'COMMON',
          attunement: false,
          magicProperties: '',
          equipped: false,
          equippedSlot: null
        });
        setShowItemModal(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create item');
      console.error('Error creating item:', err);
    }
  };

  // Update item
  const handleUpdateItem = async (itemId, updates) => {
    try {
      const response = await fetch(`/api/inventory/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setItems(prev => prev.map(item => 
          item.id === itemId ? data.item : item
        ));
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update item');
      console.error('Error updating item:', err);
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId) => {
    try {
      const response = await fetch(`/api/inventory/items/${itemId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setItems(prev => prev.filter(item => item.id !== itemId));
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to delete item');
      console.error('Error deleting item:', err);
    }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === '' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  // Calculate total weight
  const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">🎒</div>
          <div className="text-amber-300">Loading your inventory...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-amber-300 text-sm mb-4">Manage your equipment and items</p>
        
        {/* Help Button */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHelp(true)}
            className="text-amber-400 hover:text-amber-300"
          >
            ❓ How to use Inventory
          </Button>
        </div>
      </div>

      {/* Inventory Selection */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selectedInventory?.id || ''}
          onChange={(e) => {
            const inventory = inventories.find(inv => inv.id === e.target.value);
            setSelectedInventory(inventory);
          }}
          className="flex-1 px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
        >
          <option value="">Select an inventory...</option>
          {inventories.map(inventory => (
            <option key={inventory.id} value={inventory.id}>
              {inventory.name} {inventory.character ? `(${inventory.character.name})` : ''}
            </option>
          ))}
        </select>
        
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          size="lg"
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
        >
          ➕ New Inventory
        </Button>
      </div>

      {/* Search and Filter */}
      {selectedInventory && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
          >
            <option value="">All Types</option>
            {itemTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.emoji} {type.label}
              </option>
            ))}
          </select>
          <Button
            onClick={() => setShowItemModal(true)}
            variant="primary"
            size="lg"
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
          >
            ➕ Add Item
          </Button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 text-red-400 text-center">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-300 hover:text-red-200 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Inventory Content */}
      {selectedInventory ? (
        <div className="space-y-6">
          {/* Inventory Stats */}
          <Card variant="glass" size="md">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-amber-100">{selectedInventory.name}</h2>
                {selectedInventory.character && (
                  <p className="text-amber-300 text-sm">Character: {selectedInventory.character.name}</p>
                )}
              </div>
              <div className="text-right">
                <div className="text-amber-300 text-sm">Total Weight: {totalWeight.toFixed(1)} lbs</div>
                <div className="text-amber-400 text-sm">{items.length} items</div>
              </div>
            </div>
          </Card>

          {/* Items List */}
          <div className="space-y-4">
            {filteredItems.length === 0 ? (
              <Card variant="glass" size="md">
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🎒</div>
                  <div className="text-amber-300 text-lg">No items found</div>
                  <div className="text-amber-400 text-sm">
                    {searchQuery || filterType ? 'Try adjusting your search' : 'Add your first item to get started!'}
                  </div>
                </div>
              </Card>
            ) : (
              filteredItems.map(item => (
                <Card key={item.id} variant="glass" size="md">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{itemTypes.find(t => t.value === item.type)?.emoji}</span>
                        <h3 className="text-amber-100 font-bold text-lg">{item.name}</h3>
                        {item.equipped && <span className="text-green-400">⚡</span>}
                        {item.isMagic && <span className="text-purple-400">✨</span>}
                        {item.attunement && <span className="text-blue-400">🔗</span>}
                      </div>
                      
                      <div className="text-amber-300 text-sm mb-2">
                        {itemTypes.find(t => t.value === item.type)?.label} • 
                        Qty: {item.quantity} • 
                        Weight: {item.weight} lbs • 
                        Value: {item.value} gp
                        {item.isMagic && (
                          <span className={`ml-2 ${rarities.find(r => r.value === item.rarity)?.color}`}>
                            {rarities.find(r => r.value === item.rarity)?.label}
                          </span>
                        )}
                      </div>
                      
                      {item.description && (
                        <div className="text-amber-400 text-sm mb-2">{item.description}</div>
                      )}
                      
                      {item.magicProperties && (
                        <div className="text-purple-300 text-sm mb-2">
                          <strong>Magic Properties:</strong> {item.magicProperties}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        onClick={() => handleUpdateItem(item.id, { equipped: !item.equipped })}
                        variant={item.equipped ? "primary" : "secondary"}
                        size="sm"
                      >
                        {item.equipped ? '⚡ Equipped' : '⚡ Equip'}
                      </Button>
                      <Button
                        onClick={() => handleDeleteItem(item.id)}
                        variant="danger"
                        size="sm"
                      >
                        🗑️ Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      ) : (
        <Card variant="glass" size="md">
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🎒</div>
            <div className="text-amber-300 text-lg">No inventory selected</div>
            <div className="text-amber-400 text-sm">
              {inventories.length === 0 ? 'Create your first inventory to get started!' : 'Select an inventory from the dropdown above'}
            </div>
          </div>
        </Card>
      )}

      {/* Create Inventory Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewInventory({ name: 'Main Inventory', characterId: null });
        }}
        size="md"
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-amber-100 mb-6">🎒 Create New Inventory</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-amber-300 text-sm mb-1">Inventory Name</label>
              <Input
                value={newInventory.name}
                onChange={(e) => setNewInventory(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter inventory name"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              onClick={() => setShowCreateModal(false)}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateInventory}
              variant="primary"
              disabled={!newInventory.name.trim()}
            >
              Create Inventory
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Item Modal */}
      <Modal
        isOpen={showItemModal}
        onClose={() => {
          setShowItemModal(false);
          setNewItem({
            name: '',
            type: 'MISC',
            weight: 0,
            quantity: 1,
            value: 0,
            description: '',
            isMagic: false,
            rarity: 'COMMON',
            attunement: false,
            magicProperties: '',
            equipped: false,
            equippedSlot: null
          });
        }}
        size="lg"
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-amber-100 mb-6">📦 Add New Item</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-amber-300 text-sm mb-1">Item Name *</label>
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter item name"
                />
              </div>
              <div>
                <label className="block text-amber-300 text-sm mb-1">Type *</label>
                <select
                  value={newItem.type}
                  onChange={(e) => setNewItem(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
                >
                  {itemTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.emoji} {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-amber-300 text-sm mb-1">Weight (lbs)</label>
                <Input
                  type="number"
                  value={newItem.weight}
                  onChange={(e) => setNewItem(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-amber-300 text-sm mb-1">Quantity</label>
                <Input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  min="1"
                />
              </div>
              <div>
                <label className="block text-amber-300 text-sm mb-1">Value (gp)</label>
                <Input
                  type="number"
                  value={newItem.value}
                  onChange={(e) => setNewItem(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-amber-300 text-sm mb-1">Rarity</label>
                <select
                  value={newItem.rarity}
                  onChange={(e) => setNewItem(prev => ({ ...prev, rarity: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
                >
                  {rarities.map(rarity => (
                    <option key={rarity.value} value={rarity.value}>
                      {rarity.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-amber-300 text-sm mb-1">Description</label>
              <textarea
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100 resize-none"
                rows="3"
                placeholder="Enter item description..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newItem.isMagic}
                  onChange={(e) => setNewItem(prev => ({ ...prev, isMagic: e.target.checked }))}
                  className="rounded"
                />
                <label className="text-amber-300">Magic Item</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newItem.attunement}
                  onChange={(e) => setNewItem(prev => ({ ...prev, attunement: e.target.checked }))}
                  className="rounded"
                />
                <label className="text-amber-300">Requires Attunement</label>
              </div>
            </div>
            
            {newItem.isMagic && (
              <div>
                <label className="block text-amber-300 text-sm mb-1">Magic Properties</label>
                <textarea
                  value={newItem.magicProperties}
                  onChange={(e) => setNewItem(prev => ({ ...prev, magicProperties: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100 resize-none"
                  rows="2"
                  placeholder="Describe the magic properties..."
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              onClick={() => setShowItemModal(false)}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateItem}
              variant="primary"
              disabled={!newItem.name.trim()}
            >
              Add Item
            </Button>
          </div>
        </div>
      </Modal>

      {/* Help Modal */}
      <Modal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        size="lg"
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-amber-100 mb-6">📚 Inventory System Help</h2>
          
          <div className="space-y-6 text-amber-300">
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-3">🎯 Getting Started</h3>
              <p className="mb-3">
                The inventory system helps you track all your equipment and items. 
                All inventory data is automatically saved and synced across devices!
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-3">🎒 Inventory Management</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Create multiple inventories for different characters or purposes</li>
                <li>Add items with detailed properties and descriptions</li>
                <li>Track weight, value, and quantity of items</li>
                <li>Mark items as equipped or magic items</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-3">📦 Item Types</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Weapons:</strong> Swords, bows, magic weapons</li>
                <li><strong>Armor:</strong> Light, medium, heavy armor</li>
                <li><strong>Tools:</strong> Thieves&apos; tools, artisan tools</li>
                <li><strong>Consumables:</strong> Potions, scrolls, food</li>
                <li><strong>Magic Items:</strong> Items with special properties</li>
                <li><strong>Miscellaneous:</strong> General items and equipment</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-3">💡 Tips for Beginners</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Start by creating a main inventory for your character</li>
                <li>Add items as you acquire them during gameplay</li>
                <li>Use the search and filter features to find items quickly</li>
                <li>Mark important items as equipped for easy reference</li>
                <li>Track weight to avoid encumbrance penalties</li>
              </ul>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button
              onClick={() => setShowHelp(false)}
              variant="primary"
            >
              Got it!
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
