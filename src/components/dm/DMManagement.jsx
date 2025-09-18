'use client';

import { useState } from 'react';
import { Card, Button } from '../ui';
import DMCharacterManagement from './DMCharacterManagement';
import DMInventoryManagement from './DMInventoryManagement';
import DMCombatManagement from './DMCombatManagement';
import DMNotesManagement from './DMNotesManagement';

export default function DMManagement() {
  const [activeTab, setActiveTab] = useState('characters');

  const tabs = [
    { id: 'characters', label: '🧙 Characters', component: DMCharacterManagement },
    { id: 'inventories', label: '🎒 Inventories', component: DMInventoryManagement },
    { id: 'combat', label: '⚔️ Combat', component: DMCombatManagement },
    { id: 'notes', label: '📝 Notes', component: DMNotesManagement }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-purple-200 mb-2">🎭 DM Management</h2>
        <p className="text-purple-300">Full control over your campaign</p>
      </div>

      {/* Tab Navigation */}
      <Card variant="glass" size="lg">
        <div className="flex flex-wrap gap-2 justify-center">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              variant={activeTab === tab.id ? 'primary' : 'ghost'}
              size="md"
              className="flex-1 min-w-0"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* Active Tab Content */}
      {ActiveComponent && <ActiveComponent />}
    </div>
  );
}
