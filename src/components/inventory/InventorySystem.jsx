'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Input, Modal } from '../ui';

export default function InventorySystem() {
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);

  // Character stats for encumbrance calculation
  const [characterStats, setCharacterStats] = useState({
    strength: 10,
    size: 'medium' // small, medium, large
  });

  // Equipment slots
  const [equipmentSlots, setEquipmentSlots] = useState({
    head: null,
    neck: null,
    shoulders: null,
    chest: null,
    arms: null,
    hands: null,
    ring1: null,
    ring2: null,
    waist: null,
    feet: null,
    mainHand: null,
    offHand: null
  });

  // New item form
  const [newItem, setNewItem] = useState({
    name: '',
    type: 'misc',
    weight: 0,
    quantity: 1,
    value: 0,
    description: '',
    isMagic: false,
    magicProperties: '',
    rarity: 'common',
    attunement: false,
    equipped: false,
    equippedSlot: null
  });

  // Item types with emojis
  const itemTypes = {
    weapon: { name: 'Weapon', emoji: '⚔️', color: 'bg-red-500' },
    armor: { name: 'Armor', emoji: '🛡️', color: 'bg-blue-500' },
    shield: { name: 'Shield', emoji: '🛡️', color: 'bg-blue-500' },
    tool: { name: 'Tool', emoji: '🔧', color: 'bg-gray-500' },
    consumable: { name: 'Consumable', emoji: '🧪', color: 'bg-green-500' },
    misc: { name: 'Miscellaneous', emoji: '📦', color: 'bg-amber-500' },
    magic: { name: 'Magic Item', emoji: '✨', color: 'bg-purple-500' }
  };

  // Rarity colors
  const rarityColors = {
    common: 'text-gray-300',
    uncommon: 'text-green-300',
    rare: 'text-blue-300',
    very_rare: 'text-purple-300',
    legendary: 'text-yellow-300',
    artifact: 'text-red-300'
  };

  // Calculate encumbrance
  const calculateEncumbrance = () => {
    const totalWeight = inventory.reduce((total, item) => total + (item.weight * item.quantity), 0);
    const strength = characterStats.strength;
    const size = characterStats.size;
    
    // Base carrying capacity
    let baseCapacity = strength * 15;
    if (size === 'small') baseCapacity = strength * 7.5;
    if (size === 'large') baseCapacity = strength * 30;
    
    const encumbrance = {
      totalWeight,
      baseCapacity,
      lightLoad: baseCapacity,
      mediumLoad: baseCapacity * 2,
      heavyLoad: baseCapacity * 3,
      pushDragLift: baseCapacity * 5
    };
    
    let status = 'light';
    if (totalWeight > encumbrance.heavyLoad) status = 'overloaded';
    else if (totalWeight > encumbrance.mediumLoad) status = 'heavy';
    else if (totalWeight > encumbrance.lightLoad) status = 'medium';
    
    return { ...encumbrance, status };
  };

  const encumbrance = calculateEncumbrance();

  // Filter inventory
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  // Add new item
  const handleAddItem = () => {
    if (!newItem.name.trim()) return;
    
    const item = {
      ...newItem,
      id: Date.now(),
      weight: parseFloat(newItem.weight) || 0,
      quantity: parseInt(newItem.quantity) || 1,
      value: parseFloat(newItem.value) || 0
    };
    
    setInventory(prev => [...prev, item]);
    setNewItem({
      name: '',
      type: 'misc',
      weight: 0,
      quantity: 1,
      value: 0,
      description: '',
      isMagic: false,
      magicProperties: '',
      rarity: 'common',
      attunement: false,
      equipped: false,
      equippedSlot: null
    });
    setShowAddModal(false);
  };

  // Edit item
  const handleEditItem = (item) => {
    setEditingItem(item);
    setNewItem(item);
    setShowAddModal(true);
  };

  // Update item
  const handleUpdateItem = () => {
    if (!newItem.name.trim()) return;
    
    const updatedItem = {
      ...newItem,
      weight: parseFloat(newItem.weight) || 0,
      quantity: parseInt(newItem.quantity) || 1,
      value: parseFloat(newItem.value) || 0
    };
    
    setInventory(prev => prev.map(item => 
      item.id === editingItem.id ? updatedItem : item
    ));
    
    setEditingItem(null);
    setNewItem({
      name: '',
      type: 'misc',
      weight: 0,
      quantity: 1,
      value: 0,
      description: '',
      isMagic: false,
      magicProperties: '',
      rarity: 'common',
      attunement: false,
      equipped: false,
      equippedSlot: null
    });
    setShowAddModal(false);
  };

  // Delete item
  const handleDeleteItem = (itemId) => {
    setInventory(prev => prev.filter(item => item.id !== itemId));
    setShowDeleteModal(null);
  };

  // Toggle equipped status
  const toggleEquipped = (item) => {
    setInventory(prev => prev.map(i => 
      i.id === item.id 
        ? { ...i, equipped: !i.equipped, equippedSlot: !i.equipped ? null : i.equippedSlot }
        : i
    ));
  };

  // Get encumbrance status color
  const getEncumbranceColor = (status) => {
    switch (status) {
      case 'light': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'heavy': return 'text-orange-400';
      case 'overloaded': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-amber-300 text-sm mb-4">Manage your equipment and track encumbrance</p>
        
        {/* Help Button */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHelpModal(true)}
            className="text-amber-400 hover:text-amber-300"
          >
            ❓ How to use Inventory
          </Button>
        </div>
      </div>

      {/* Character Stats */}
      <Card variant="glass" size="md">
        <div className="text-center mb-4">
          <h3 className="text-amber-200 font-bold text-lg mb-2">📊 Character Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-amber-300 text-sm mb-1">Strength</label>
              <Input
                type="number"
                value={characterStats.strength}
                onChange={(e) => setCharacterStats(prev => ({ ...prev, strength: parseInt(e.target.value) || 10 }))}
                className="text-center"
                size="sm"
              />
            </div>
            <div>
              <label className="block text-amber-300 text-sm mb-1">Size</label>
              <select
                value={characterStats.size}
                onChange={(e) => setCharacterStats(prev => ({ ...prev, size: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100 text-center"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Encumbrance Status */}
      <Card variant="glass" size="md">
        <div className="text-center">
          <h3 className="text-amber-200 font-bold text-lg mb-3">⚖️ Encumbrance</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-amber-300">Current Weight</div>
              <div className={`text-xl font-bold ${getEncumbranceColor(encumbrance.status)}`}>
                {encumbrance.totalWeight.toFixed(1)} lbs
              </div>
            </div>
            <div>
              <div className="text-amber-300">Status</div>
              <div className={`text-xl font-bold ${getEncumbranceColor(encumbrance.status)}`}>
                {encumbrance.status.toUpperCase()}
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-amber-400">
            Light: {encumbrance.lightLoad} | Medium: {encumbrance.mediumLoad} | Heavy: {encumbrance.heavyLoad}
          </div>
        </div>
      </Card>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
        >
          <option value="all">All Types</option>
          {Object.entries(itemTypes).map(([key, type]) => (
            <option key={key} value={key}>{type.emoji} {type.name}</option>
          ))}
        </select>
      </div>

      {/* Add Item Button */}
      <div className="flex justify-center">
        <Button
          onClick={() => setShowAddModal(true)}
          variant="primary"
          size="lg"
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
        >
          ➕ Add Item
        </Button>
      </div>

      {/* Inventory List */}
      <div className="space-y-3">
        {filteredInventory.length === 0 ? (
          <Card variant="glass" size="md">
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📦</div>
              <div className="text-amber-300 text-lg">No items found</div>
              <div className="text-amber-400 text-sm">Add some items to get started!</div>
            </div>
          </Card>
        ) : (
          filteredInventory.map(item => (
            <Card key={item.id} variant="glass" size="md">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{itemTypes[item.type]?.emoji || '📦'}</span>
                    <h3 className="text-amber-100 font-bold text-lg">{item.name}</h3>
                    {item.isMagic && <span className="text-purple-400">✨</span>}
                    {item.attunement && <span className="text-blue-400">🔗</span>}
                    {item.equipped && <span className="text-green-400">⚡</span>}
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-amber-300 mb-2">
                    <div>Type: {itemTypes[item.type]?.name || 'Misc'}</div>
                    <div>Weight: {item.weight} lbs</div>
                    <div>Qty: {item.quantity}</div>
                    <div>Value: {item.value} gp</div>
                  </div>
                  
                  {item.description && (
                    <div className="text-amber-400 text-sm mb-2">{item.description}</div>
                  )}
                  
                  {item.isMagic && item.magicProperties && (
                    <div className="text-purple-300 text-sm mb-2">
                      <strong>Magic Properties:</strong> {item.magicProperties}
                    </div>
                  )}
                  
                  {item.rarity !== 'common' && (
                    <div className={`text-sm ${rarityColors[item.rarity]}`}>
                      Rarity: {item.rarity.replace('_', ' ').toUpperCase()}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    onClick={() => toggleEquipped(item)}
                    variant={item.equipped ? "success" : "secondary"}
                    size="sm"
                  >
                    {item.equipped ? '⚡ Equipped' : '📦 Equip'}
                  </Button>
                  <Button
                    onClick={() => handleEditItem(item)}
                    variant="ghost"
                    size="sm"
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    onClick={() => setShowDeleteModal(item.id)}
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

      {/* Add/Edit Item Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingItem(null);
          setNewItem({
            name: '',
            type: 'misc',
            weight: 0,
            quantity: 1,
            value: 0,
            description: '',
            isMagic: false,
            magicProperties: '',
            rarity: 'common',
            attunement: false,
            equipped: false,
            equippedSlot: null
          });
        }}
        size="lg"
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-amber-100 mb-6">
            {editingItem ? '✏️ Edit Item' : '➕ Add New Item'}
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-amber-300 text-sm mb-1">Item Name *</label>
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter item name"
                />
              </div>
              
              <div>
                <label className="block text-amber-300 text-sm mb-1">Type</label>
                <select
                  value={newItem.type}
                  onChange={(e) => setNewItem(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
                >
                  {Object.entries(itemTypes).map(([key, type]) => (
                    <option key={key} value={key}>{type.emoji} {type.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-amber-300 text-sm mb-1">Weight (lbs)</label>
                <Input
                  type="number"
                  value={newItem.weight}
                  onChange={(e) => setNewItem(prev => ({ ...prev, weight: e.target.value }))}
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-amber-300 text-sm mb-1">Quantity</label>
                <Input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="1"
                />
              </div>
              
              <div>
                <label className="block text-amber-300 text-sm mb-1">Value (gp)</label>
                <Input
                  type="number"
                  value={newItem.value}
                  onChange={(e) => setNewItem(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-amber-300 text-sm mb-1">Description</label>
              <textarea
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter item description"
                className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100 resize-none"
                rows="3"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-amber-300 text-sm mb-1">Rarity</label>
                <select
                  value={newItem.rarity}
                  onChange={(e) => setNewItem(prev => ({ ...prev, rarity: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100"
                >
                  <option value="common">Common</option>
                  <option value="uncommon">Uncommon</option>
                  <option value="rare">Rare</option>
                  <option value="very_rare">Very Rare</option>
                  <option value="legendary">Legendary</option>
                  <option value="artifact">Artifact</option>
                </select>
              </div>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-amber-300">
                  <input
                    type="checkbox"
                    checked={newItem.isMagic}
                    onChange={(e) => setNewItem(prev => ({ ...prev, isMagic: e.target.checked }))}
                    className="rounded"
                  />
                  Magic Item
                </label>
                
                <label className="flex items-center gap-2 text-amber-300">
                  <input
                    type="checkbox"
                    checked={newItem.attunement}
                    onChange={(e) => setNewItem(prev => ({ ...prev, attunement: e.target.checked }))}
                    className="rounded"
                  />
                  Requires Attunement
                </label>
              </div>
            </div>
            
            {newItem.isMagic && (
              <div>
                <label className="block text-amber-300 text-sm mb-1">Magic Properties</label>
                <textarea
                  value={newItem.magicProperties}
                  onChange={(e) => setNewItem(prev => ({ ...prev, magicProperties: e.target.value }))}
                  placeholder="Describe the magic properties"
                  className="w-full px-3 py-2 bg-slate-700 border border-amber-500/30 rounded-lg text-amber-100 resize-none"
                  rows="2"
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              onClick={() => {
                setShowAddModal(false);
                setEditingItem(null);
                setNewItem({
                  name: '',
                  type: 'misc',
                  weight: 0,
                  quantity: 1,
                  value: 0,
                  description: '',
                  isMagic: false,
                  magicProperties: '',
                  rarity: 'common',
                  attunement: false,
                  equipped: false,
                  equippedSlot: null
                });
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={editingItem ? handleUpdateItem : handleAddItem}
              variant="primary"
              disabled={!newItem.name.trim()}
            >
              {editingItem ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal !== null}
        onClose={() => setShowDeleteModal(null)}
        size="sm"
      >
        <div className="p-6 text-center">
          <div className="text-4xl mb-4">🗑️</div>
          <h2 className="text-xl font-bold text-amber-100 mb-2">Delete Item</h2>
          <p className="text-amber-300 mb-6">
            Are you sure you want to delete this item? This action cannot be undone.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              onClick={() => setShowDeleteModal(null)}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleDeleteItem(showDeleteModal)}
              variant="danger"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Help Modal */}
      <Modal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        size="lg"
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-amber-100 mb-6">📚 Inventory System Help</h2>
          
          <div className="space-y-6 text-amber-300">
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-3">🎯 Getting Started</h3>
              <p className="mb-3">
                The inventory system helps you track all your equipment, manage weight/encumbrance, 
                and organize magic items. Perfect for both players and DMs!
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-3">⚖️ Encumbrance System</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Light Load:</strong> No penalties, normal movement</li>
                <li><strong>Medium Load:</strong> Speed reduced by 10 feet</li>
                <li><strong>Heavy Load:</strong> Speed reduced by 20 feet, disadvantage on ability checks, attack rolls, and saving throws</li>
                <li><strong>Overloaded:</strong> Speed reduced to 5 feet, cannot run or take dash action</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-3">✨ Magic Items</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Mark items as magic to track special properties</li>
                <li>Set rarity levels (Common to Artifact)</li>
                <li>Mark if item requires attunement</li>
                <li>Add detailed magic properties descriptions</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-3">🔍 Organization</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Search by name or description</li>
                <li>Filter by item type (weapon, armor, tool, etc.)</li>
                <li>Mark items as equipped for quick reference</li>
                <li>Track quantity and value for each item</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-amber-200 mb-3">💡 Tips for Beginners</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Start by adding your starting equipment</li>
                <li>Update your character's Strength score for accurate encumbrance</li>
                <li>Use the search and filter to find items quickly during play</li>
                <li>Mark important items as equipped for easy reference</li>
                <li>Don't forget to track consumables like potions and scrolls</li>
              </ul>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button
              onClick={() => setShowHelpModal(false)}
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
