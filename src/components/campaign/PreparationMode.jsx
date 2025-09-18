'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCampaign } from '../../contexts/CampaignContext';
import CharacterDisplaySheet from '../character-sheet/CharacterDisplaySheet';

export default function PreparationMode() {
  const { user } = useAuth();
  const { currentCampaign, campaignMode } = useCampaign();
  const [activeSection, setActiveSection] = useState('overview');

  const preparationSections = [
    {
      id: 'character-building',
      title: 'Character Building',
      icon: '🧙‍♂️',
      description: 'Create and develop your character with guided assistance',
      color: 'from-blue-600 to-blue-700',
      hoverColor: 'hover:from-blue-700 hover:to-blue-800'
    },
    {
      id: 'backstory-development',
      title: 'Backstory Development',
      icon: '📖',
      description: 'Craft compelling backstories and character motivations',
      color: 'from-purple-600 to-purple-700',
      hoverColor: 'hover:from-purple-700 hover:to-purple-800'
    },
    {
      id: 'leveling-strategies',
      title: 'Leveling Strategies',
      icon: '⚡',
      description: 'Learn how to level up and choose abilities effectively',
      color: 'from-green-600 to-green-700',
      hoverColor: 'hover:from-green-700 hover:to-green-800'
    },
    {
      id: 'game-mechanics',
      title: 'Game Mechanics',
      icon: '🎲',
      description: 'Understand D&D rules, combat, and gameplay mechanics',
      color: 'from-amber-600 to-amber-700',
      hoverColor: 'hover:from-amber-700 hover:to-amber-800'
    },
    {
      id: 'roleplay-examples',
      title: 'Roleplay Examples',
      icon: '🎭',
      description: 'Learn how to roleplay and interact in character',
      color: 'from-pink-600 to-pink-700',
      hoverColor: 'hover:from-pink-700 hover:to-pink-800'
    }
  ];

  const handleSectionClick = (sectionId) => {
    setActiveSection(sectionId);
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'character-building':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-amber-100 mb-4 font-serif">
                Character Building Assistant
              </h3>
              <p className="text-amber-300 text-lg mb-6">
                Let the Wise Elder guide you through creating your perfect D&D character
              </p>
            </div>
            
            <CharacterDisplaySheet />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-amber-500/30 rounded-xl p-6">
                <h4 className="text-xl font-bold text-amber-100 mb-3 font-serif">Character Creation Steps</h4>
                <ul className="space-y-2 text-amber-300">
                  <li>• Choose your race and class</li>
                  <li>• Determine ability scores</li>
                  <li>• Select skills and proficiencies</li>
                  <li>• Choose equipment and spells</li>
                  <li>• Calculate combat stats</li>
                </ul>
              </div>
              
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-amber-500/30 rounded-xl p-6">
                <h4 className="text-xl font-bold text-amber-100 mb-3 font-serif">Beginner Tips</h4>
                <ul className="space-y-2 text-amber-300">
                  <li>• Start with a simple class like Fighter or Rogue</li>
                  <li>• Focus on one main ability score</li>
                  <li>• Don't worry about optimization initially</li>
                  <li>• Choose a personality that interests you</li>
                  <li>• Ask the Wise Elder for guidance!</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'backstory-development':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-amber-100 mb-4 font-serif">
                Backstory Development
              </h3>
              <p className="text-amber-300 text-lg mb-6">
                Create a rich backstory that brings your character to life
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-amber-500/30 rounded-xl p-6">
                <h4 className="text-xl font-bold text-amber-100 mb-4 font-serif">Backstory Elements</h4>
                <div className="space-y-4">
                  <div>
                    <h5 className="font-bold text-amber-200 mb-2">Origin Story</h5>
                    <p className="text-amber-300 text-sm">Where did your character come from? What shaped their early life?</p>
                  </div>
                  <div>
                    <h5 className="font-bold text-amber-200 mb-2">Motivations</h5>
                    <p className="text-amber-300 text-sm">What drives your character? What do they want to achieve?</p>
                  </div>
                  <div>
                    <h5 className="font-bold text-amber-200 mb-2">Connections</h5>
                    <p className="text-amber-300 text-sm">Who are the important people in their life? Friends, family, enemies?</p>
                  </div>
                  <div>
                    <h5 className="font-bold text-amber-200 mb-2">Secrets</h5>
                    <p className="text-amber-300 text-sm">What hidden aspects make your character interesting?</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-amber-500/30 rounded-xl p-6">
                <h4 className="text-xl font-bold text-amber-100 mb-4 font-serif">Example Prompts</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-600/30 rounded-lg">
                    <p className="text-amber-300 text-sm">"I was raised by [family/mentor] who taught me [skill/values]..."</p>
                  </div>
                  <div className="p-3 bg-slate-600/30 rounded-lg">
                    <p className="text-amber-300 text-sm">"The defining moment of my life was when [event] happened..."</p>
                  </div>
                  <div className="p-3 bg-slate-600/30 rounded-lg">
                    <p className="text-amber-300 text-sm">"I'm searching for [person/object/knowledge] because..."</p>
                  </div>
                  <div className="p-3 bg-slate-600/30 rounded-lg">
                    <p className="text-amber-300 text-sm">"My greatest fear is [fear] because of [past experience]..."</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'leveling-strategies':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-amber-100 mb-4 font-serif">
                Leveling Up Strategies
              </h3>
              <p className="text-amber-300 text-lg mb-6">
                Learn how to make the most of your character's growth
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-amber-500/30 rounded-xl p-6">
                <h4 className="text-xl font-bold text-amber-100 mb-4 font-serif">Leveling Up Process</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
                    <p className="text-amber-300">Gain enough experience points (XP)</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
                    <p className="text-amber-300">Increase hit points and ability scores</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
                    <p className="text-amber-300">Gain new class features and abilities</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">4</div>
                    <p className="text-amber-300">Learn new spells (if applicable)</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-amber-500/30 rounded-xl p-6">
                <h4 className="text-xl font-bold text-amber-100 mb-4 font-serif">Strategic Tips</h4>
                <ul className="space-y-2 text-amber-300">
                  <li>• Focus on your class's primary ability score</li>
                  <li>• Consider multiclassing for unique combinations</li>
                  <li>• Plan your spell selection carefully</li>
                  <li>• Balance offense and defense</li>
                  <li>• Think about roleplay opportunities</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-amber-500/30 rounded-xl p-6">
              <h4 className="text-xl font-bold text-amber-100 mb-4 font-serif">Example Leveling Scenarios</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-600/30 rounded-lg">
                  <h5 className="font-bold text-amber-200 mb-2">Level 1-3: Learning</h5>
                  <p className="text-amber-300 text-sm">Focus on basic abilities and understanding your class</p>
                </div>
                <div className="p-4 bg-slate-600/30 rounded-lg">
                  <h5 className="font-bold text-amber-200 mb-2">Level 4-7: Growing</h5>
                  <p className="text-amber-300 text-sm">Gain powerful features and start specializing</p>
                </div>
                <div className="p-4 bg-slate-600/30 rounded-lg">
                  <h5 className="font-bold text-amber-200 mb-2">Level 8+: Mastering</h5>
                  <p className="text-amber-300 text-sm">Become a true expert in your chosen path</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'game-mechanics':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-amber-100 mb-4 font-serif">
                D&D Game Mechanics
              </h3>
              <p className="text-amber-300 text-lg mb-6">
                Learn the core rules and mechanics of D&D
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-amber-500/30 rounded-xl p-6">
                <h4 className="text-xl font-bold text-amber-100 mb-4 font-serif">Core Concepts</h4>
                <div className="space-y-3">
                  <div>
                    <h5 className="font-bold text-amber-200 mb-1">Ability Scores</h5>
                    <p className="text-amber-300 text-sm">Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma</p>
                  </div>
                  <div>
                    <h5 className="font-bold text-amber-200 mb-1">Dice Rolling</h5>
                    <p className="text-amber-300 text-sm">d20 for most actions, d6 for damage, d100 for random events</p>
                  </div>
                  <div>
                    <h5 className="font-bold text-amber-200 mb-1">Advantage/Disadvantage</h5>
                    <p className="text-amber-300 text-sm">Roll twice, take higher (advantage) or lower (disadvantage)</p>
                  </div>
                  <div>
                    <h5 className="font-bold text-amber-200 mb-1">Saving Throws</h5>
                    <p className="text-amber-300 text-sm">Roll to resist effects, based on ability scores</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-amber-500/30 rounded-xl p-6">
                <h4 className="text-xl font-bold text-amber-100 mb-4 font-serif">Combat Basics</h4>
                <div className="space-y-3">
                  <div>
                    <h5 className="font-bold text-amber-200 mb-1">Initiative</h5>
                    <p className="text-amber-300 text-sm">Roll d20 + Dex modifier to determine turn order</p>
                  </div>
                  <div>
                    <h5 className="font-bold text-amber-200 mb-1">Attack Roll</h5>
                    <p className="text-amber-300 text-sm">d20 + ability modifier + proficiency bonus vs AC</p>
                  </div>
                  <div>
                    <h5 className="font-bold text-amber-200 mb-1">Damage Roll</h5>
                    <p className="text-amber-300 text-sm">Weapon/spell dice + ability modifier</p>
                  </div>
                  <div>
                    <h5 className="font-bold text-amber-200 mb-1">Hit Points</h5>
                    <p className="text-amber-300 text-sm">Your character's health - when it reaches 0, you're unconscious</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'roleplay-examples':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-amber-100 mb-4 font-serif">
                Roleplay Examples
              </h3>
              <p className="text-amber-300 text-lg mb-6">
                Learn how to bring your character to life through roleplay
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-amber-500/30 rounded-xl p-6">
                <h4 className="text-xl font-bold text-amber-100 mb-4 font-serif">Character Voice</h4>
                <div className="space-y-3">
                  <div>
                    <h5 className="font-bold text-amber-200 mb-2">Speech Patterns</h5>
                    <p className="text-amber-300 text-sm">"Aye, lass, I've seen many a battle in me time..." (Dwarf)</p>
                  </div>
                  <div>
                    <h5 className="font-bold text-amber-200 mb-2">Vocabulary</h5>
                    <p className="text-amber-300 text-sm">"The arcane mysteries unfold before us..." (Wizard)</p>
                  </div>
                  <div>
                    <h5 className="font-bold text-amber-200 mb-2">Catchphrases</h5>
                    <p className="text-amber-300 text-sm">"By the gods!" or "Well, well, well..."</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-amber-500/30 rounded-xl p-6">
                <h4 className="text-xl font-bold text-amber-100 mb-4 font-serif">Interaction Examples</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-600/30 rounded-lg">
                    <p className="text-amber-300 text-sm"><strong>Meeting NPCs:</strong> "Greetings, friend. I am [Name], a [class] from [place]."</p>
                  </div>
                  <div className="p-3 bg-slate-600/30 rounded-lg">
                    <p className="text-amber-300 text-sm"><strong>In Combat:</strong> "For glory and honor!" or "This ends now!"</p>
                  </div>
                  <div className="p-3 bg-slate-600/30 rounded-lg">
                    <p className="text-amber-300 text-sm"><strong>Problem Solving:</strong> "Perhaps we should consider..." or "I have an idea!"</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <div className="text-8xl mb-6">📚</div>
            <h3 className="text-4xl font-bold text-amber-100 mb-4 font-serif">
              Campaign Preparation
            </h3>
            <p className="text-amber-300 text-xl mb-8 max-w-2xl mx-auto">
              Welcome to your D&D learning journey! Choose a section below to get started with guided assistance.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {preparationSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  className={`p-6 rounded-xl text-left transition-all transform hover:scale-105 bg-gradient-to-br ${section.color} ${section.hoverColor} shadow-lg`}
                >
                  <div className="text-3xl mb-3">{section.icon}</div>
                  <h4 className="text-xl font-bold text-white mb-2 font-serif">{section.title}</h4>
                  <p className="text-white/90 text-sm">{section.description}</p>
                </button>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setActiveSection('overview')}
          className={`px-4 py-3 rounded-lg font-medium transition-all transform hover:scale-105 ${
            activeSection === 'overview'
              ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-100 shadow-lg'
              : 'bg-slate-700/50 hover:bg-slate-600/50 text-amber-200 border border-amber-500/30'
          }`}
        >
          📚 Overview
        </button>
        {preparationSections.map((section) => (
          <button
            key={section.id}
            onClick={() => handleSectionClick(section.id)}
            className={`px-4 py-3 rounded-lg font-medium transition-all transform hover:scale-105 ${
              activeSection === section.id
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-100 shadow-lg'
                : 'bg-slate-700/50 hover:bg-slate-600/50 text-amber-200 border border-amber-500/30'
            }`}
          >
            {section.icon} {section.title}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div className="min-h-96">
        {renderSectionContent()}
      </div>


    </div>
  );
}
