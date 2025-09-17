'use client';

import { useState, useEffect } from 'react';
import { fetchSampleData, fetchItem, fetchList } from '../lib/dnd-api';

// Class Detail Component
function ClassDetailView({ classData }) {
  const [expandedSections, setExpandedSections] = useState({});
  const [fetchedData, setFetchedData] = useState({});

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const fetchRelatedData = async (url) => {
    if (!url || fetchedData[url]) return fetchedData[url];
    
    try {
      const response = await fetch(`/api/dnd?endpoint=${url.replace('/api/', '')}`);
      const data = await response.json();
      setFetchedData(prev => ({ ...prev, [url]: data }));
      return data;
    } catch (error) {
      console.error('Failed to fetch related data:', error);
      return null;
    }
  };

  const renderProficiencies = (proficienciesData) => {
    if (!Array.isArray(proficienciesData)) return null;

    return (
      <div className="space-y-2">
        {proficienciesData.map((prof, index) => {
          const profData = fetchedData[prof.url];
          
          return (
            <div key={index} className="bg-slate-800/50 rounded-lg p-3 border border-amber-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xl mr-3">🛡️</span>
                  <div>
                    <div className="text-amber-100 font-semibold">
                      {prof.name || 'Unknown Proficiency'}
                    </div>
                    <div className="text-amber-400 text-sm">
                      {prof.index || 'Unknown'}
                    </div>
                  </div>
                </div>
                {prof.url && (
                  <button
                    onClick={() => fetchRelatedData(prof.url)}
                    className="text-amber-400 hover:text-amber-300 text-xs underline"
                  >
                    View Details
                  </button>
                )}
              </div>
              
              {profData && (
                <div className="mt-3 pt-3 border-t border-amber-500/20">
                  <div className="text-amber-200 text-sm leading-relaxed">
                    {profData.desc && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Description:</strong><br />
                        {profData.desc}
                      </div>
                    )}
                    {profData.type && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Type:</strong> {profData.type}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSavingThrows = (savingThrowsData) => {
    if (!Array.isArray(savingThrowsData)) return null;

    return (
      <div className="space-y-2">
        {savingThrowsData.map((save, index) => {
          const saveData = fetchedData[save.url];
          
          return (
            <div key={index} className="bg-slate-800/50 rounded-lg p-3 border border-amber-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xl mr-3">💪</span>
                  <div>
                    <div className="text-amber-100 font-semibold">
                      {save.name || 'Unknown Ability'}
                    </div>
                    <div className="text-amber-400 text-sm">
                      {save.index || 'Unknown'}
                    </div>
                  </div>
                </div>
                {save.url && (
                  <button
                    onClick={() => fetchRelatedData(save.url)}
                    className="text-amber-400 hover:text-amber-300 text-xs underline"
                  >
                    View Details
                  </button>
                )}
              </div>
              
              {saveData && (
                <div className="mt-3 pt-3 border-t border-amber-500/20">
                  <div className="text-amber-200 text-sm leading-relaxed">
                    {saveData.desc && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Description:</strong><br />
                        {saveData.desc}
                      </div>
                    )}
                    {saveData.full_name && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Full Name:</strong> {saveData.full_name}
                      </div>
                    )}
                    {saveData.skills && saveData.skills.length > 0 && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Skills:</strong> {saveData.skills.map(skill => skill.name).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderStartingEquipment = (equipmentData) => {
    if (!Array.isArray(equipmentData)) return null;

    return (
      <div className="space-y-2">
        {equipmentData.map((item, index) => {
          const equipmentData = fetchedData[item.equipment?.url];
          
          return (
            <div key={index} className="bg-slate-800/50 rounded-lg p-3 border border-amber-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xl mr-3">⚔️</span>
                  <div>
                    <div className="text-amber-100 font-semibold">
                      {item.equipment?.name || 'Unknown Equipment'}
                    </div>
                    <div className="text-amber-400 text-sm">
                      Quantity: {item.quantity}
                    </div>
                  </div>
                </div>
                {item.equipment?.url && (
                  <button
                    onClick={() => fetchRelatedData(item.equipment.url)}
                    className="text-amber-400 hover:text-amber-300 text-xs underline"
                  >
                    View Details
                  </button>
                )}
              </div>
              
              {equipmentData && (
                <div className="mt-3 pt-3 border-t border-amber-500/20">
                  <div className="text-amber-200 text-sm leading-relaxed">
                    {equipmentData.desc && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Description:</strong><br />
                        {equipmentData.desc}
                      </div>
                    )}
                    {equipmentData.equipment_category && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Category:</strong> {equipmentData.equipment_category.name}
                      </div>
                    )}
                    {equipmentData.cost && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Cost:</strong> {equipmentData.cost.quantity} {equipmentData.cost.unit}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderEquipmentOptions = (optionsData) => {
    if (!Array.isArray(optionsData)) return null;

    return (
      <div className="space-y-3">
        {optionsData.map((option, index) => (
          <div key={index} className="bg-slate-700/50 rounded-lg p-4 border border-amber-500/20">
            <div className="text-amber-100 font-bold mb-3 flex items-center">
              <span className="text-lg mr-2">🎯</span>
              Choose {option.choose} {option.type || 'option'}{option.choose > 1 ? 's' : ''}
            </div>
            <div className="text-amber-200 text-sm mb-3">
              {option.desc}
            </div>
            
            {option.from && option.from.options && (
              <div className="space-y-2">
                {option.from.options.map((opt, optIndex) => (
                  <div key={optIndex} className="bg-slate-800/50 rounded p-3 border border-amber-500/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-amber-400 mr-2">•</span>
                        <div>
                          <div className="text-amber-100 font-semibold">
                            {opt.of?.name || opt.choice?.desc || 'Unknown Option'}
                          </div>
                          {opt.count && (
                            <div className="text-amber-400 text-sm">
                              Quantity: {opt.count}
                            </div>
                          )}
                        </div>
                      </div>
                      {opt.of?.url && (
                        <button
                          onClick={() => fetchRelatedData(opt.of.url)}
                          className="text-amber-400 hover:text-amber-300 text-xs underline"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderSpellcasting = (spellcastingData) => {
    if (!spellcastingData) return null;

    return (
      <div className="bg-slate-700/50 rounded-lg p-4 border border-amber-500/20">
        <div className="text-amber-100 font-bold mb-3 flex items-center">
          <span className="text-lg mr-2">🔮</span>
          Spellcasting
        </div>
        
        <div className="space-y-3">
          <div className="text-amber-200">
            <strong className="text-amber-100">Level:</strong> {spellcastingData.level}
          </div>
          
          {spellcastingData.spellcasting_ability && (
            <div className="text-amber-200">
              <strong className="text-amber-100">Spellcasting Ability:</strong> {spellcastingData.spellcasting_ability.name}
            </div>
          )}
          
          {spellcastingData.info && (
            <div className="space-y-3">
              {spellcastingData.info.map((info, index) => (
                <div key={index} className="bg-slate-800/50 rounded p-3 border border-amber-500/10">
                  <div className="text-amber-100 font-semibold mb-2">
                    {info.name}
                  </div>
                  <div className="text-amber-200 text-sm leading-relaxed">
                    {info.desc.map((desc, descIndex) => (
                      <div key={descIndex} className="mb-2">
                        {desc}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSubclasses = (subclassesData) => {
    if (!Array.isArray(subclassesData)) return null;

    return (
      <div className="space-y-2">
        {subclassesData.map((subclass, index) => {
          const subclassData = fetchedData[subclass.url];
          
          return (
            <div key={index} className="bg-slate-800/50 rounded-lg p-3 border border-amber-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xl mr-3">🌿</span>
                  <div>
                    <div className="text-amber-100 font-semibold">
                      {subclass.name || 'Unknown Subclass'}
                    </div>
                    <div className="text-amber-400 text-sm">
                      {subclass.index || 'Unknown'}
                    </div>
                  </div>
                </div>
                {subclass.url && (
                  <button
                    onClick={() => fetchRelatedData(subclass.url)}
                    className="text-amber-400 hover:text-amber-300 text-xs underline"
                  >
                    View Details
                  </button>
                )}
              </div>
              
              {subclassData && (
                <div className="mt-3 pt-3 border-t border-amber-500/20">
                  <div className="text-amber-200 text-sm leading-relaxed">
                    {subclassData.desc && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Description:</strong><br />
                        {subclassData.desc}
                      </div>
                    )}
                    {subclassData.subclass_levels && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Levels:</strong> {subclassData.subclass_levels}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSection = (title, data, sectionKey, icon = '📄') => {
    if (!data || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && Object.keys(data).length === 0)) {
      return null;
    }

    const isExpanded = expandedSections[sectionKey];
    const hasNestedData = typeof data === 'object' && data !== null;

    // Special handling for specific data types
    let specialContent = null;
    if (sectionKey === 'proficiencies' && Array.isArray(data)) {
      specialContent = renderProficiencies(data);
    } else if (sectionKey === 'saving_throws' && Array.isArray(data)) {
      specialContent = renderSavingThrows(data);
    } else if (sectionKey === 'starting_equipment' && Array.isArray(data)) {
      specialContent = renderStartingEquipment(data);
    } else if (sectionKey === 'starting_equipment_options' && Array.isArray(data)) {
      specialContent = renderEquipmentOptions(data);
    } else if (sectionKey === 'spellcasting' && typeof data === 'object') {
      specialContent = renderSpellcasting(data);
    } else if (sectionKey === 'subclasses' && Array.isArray(data)) {
      specialContent = renderSubclasses(data);
    }

    return (
      <div className="bg-slate-700/30 rounded-lg border border-amber-500/20">
        <button
          onClick={() => hasNestedData && !specialContent && toggleSection(sectionKey)}
          className={`w-full p-4 text-left ${hasNestedData && !specialContent ? 'hover:bg-slate-600/30 transition-colors' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-xl mr-3">{icon}</span>
              <h4 className="text-lg font-bold text-amber-100">{title}</h4>
            </div>
            {hasNestedData && !specialContent && (
              <span className="text-amber-400 text-lg">
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
          </div>
        </button>
        
        {specialContent ? (
          <div className="px-4 pb-4 border-t border-amber-500/20">
            <div className="mt-4">
              {specialContent}
            </div>
          </div>
        ) : hasNestedData ? (
          isExpanded && (
            <div className="px-4 pb-4 border-t border-amber-500/20">
              <div className="mt-4 font-mono text-sm">
                {formatValue(data)}
              </div>
            </div>
          )
        ) : (
          <div className="px-4 pb-4 border-t border-amber-500/20">
            <div className="mt-4 font-mono text-sm">
              {formatValue(data)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const formatValue = (value, depth = 0) => {
    if (value === null || value === undefined) {
      return <span className="text-amber-500 italic">null</span>;
    }
    
    if (typeof value === 'string') {
      if (value === '') {
        return <span className="text-amber-500 italic">(empty string)</span>;
      }
      return <span className="text-amber-200">&ldquo;{value}&rdquo;</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="text-amber-300">{value}</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className="text-amber-300">{value.toString()}</span>;
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-amber-500 italic">[] (empty array)</span>;
      }
      
      return (
        <div className="ml-4">
          <span className="text-amber-400">[</span>
          <div className="ml-4">
            {value.map((item, index) => (
              <div key={index} className="flex items-start">
                <span className="text-amber-400 mr-2">{index}:</span>
                <div className="flex-1">
                  {formatValue(item, depth + 1)}
                </div>
              </div>
            ))}
          </div>
          <span className="text-amber-400">]</span>
        </div>
      );
    }
    
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return <span className="text-amber-500 italic">{} (empty object)</span>;
      }
      
      return (
        <div className="ml-4">
          <span className="text-amber-400">{'{'}</span>
          <div className="ml-4">
            {keys.map((key, index) => (
              <div key={key} className="flex items-start">
                <span className="text-amber-100 font-semibold mr-2">&ldquo;{key}&rdquo;:</span>
                <div className="flex-1">
                  {formatValue(value[key], depth + 1)}
                </div>
              </div>
            ))}
          </div>
          <span className="text-amber-400">{'}'}</span>
        </div>
      );
    }
    
    return <span className="text-amber-200">{String(value)}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Class Header */}
      <div className="text-center border-b border-amber-500/30 pb-4">
        <h3 className="text-2xl font-bold text-amber-100 font-serif mb-2">
          {classData.name || 'Unknown Class'}
        </h3>
        <div className="text-amber-400 text-sm">
          Complete API Response Data
        </div>
      </div>

      {/* All Data Sections */}
      <div className="space-y-3">
        {Object.entries(classData).map(([key, value]) => {
          // Skip if value is empty/null/undefined
          if (value === null || value === undefined || value === '') {
            return null;
          }
          
          // Skip if it's an empty array or object
          if (Array.isArray(value) && value.length === 0) {
            return null;
          }
          if (typeof value === 'object' && Object.keys(value).length === 0) {
            return null;
          }

          // Skip name and index fields as they're redundant with the title
          if (key === 'name' || key === 'index') {
            return null;
          }

          const icons = {
            hit_die: '💀',
            proficiency_choices: '🎯',
            proficiencies: '🛡️',
            saving_throws: '💪',
            starting_equipment: '⚔️',
            starting_equipment_options: '🎯',
            class_levels: '📊',
            multi_classing: '🔄',
            subclasses: '🌿',
            spellcasting: '🔮',
            url: '🔗',
            updated_at: '📅'
          };

          return renderSection(
            key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value,
            key,
            icons[key] || '📄'
          );
        })}
      </div>

      {/* Raw JSON Toggle */}
      <div className="bg-slate-700/30 rounded-lg border border-amber-500/20">
        <button
          onClick={() => toggleSection('raw-json')}
          className="w-full p-4 text-left hover:bg-slate-600/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-xl mr-3">🔍</span>
              <h4 className="text-lg font-bold text-amber-100">Raw JSON Data</h4>
            </div>
            <span className="text-amber-400 text-lg">
              {expandedSections['raw-json'] ? '▼' : '▶'}
            </span>
          </div>
        </button>
        
        {expandedSections['raw-json'] && (
          <div className="px-4 pb-4 border-t border-amber-500/20">
            <div className="mt-4 font-mono text-xs bg-slate-800/50 p-4 rounded border border-amber-500/10 overflow-x-auto">
              <pre className="text-amber-200 whitespace-pre-wrap">
                {JSON.stringify(classData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Race Detail Component
function RaceDetailView({ raceData }) {
  const [expandedSections, setExpandedSections] = useState({});
  const [fetchedData, setFetchedData] = useState({});

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const fetchRelatedData = async (url) => {
    if (!url || fetchedData[url]) return fetchedData[url];
    
    try {
      const response = await fetch(`/api/dnd?endpoint=${url.replace('/api/', '')}`);
      const data = await response.json();
      setFetchedData(prev => ({ ...prev, [url]: data }));
      return data;
    } catch (error) {
      console.error('Failed to fetch related data:', error);
      return null;
    }
  };

  const formatValue = (value, depth = 0) => {
    if (value === null || value === undefined) {
      return <span className="text-amber-500 italic">null</span>;
    }
    
    if (typeof value === 'string') {
      if (value === '') {
        return <span className="text-amber-500 italic">(empty string)</span>;
      }
      return <span className="text-amber-200">&ldquo;{value}&rdquo;</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="text-amber-300">{value}</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className="text-amber-300">{value.toString()}</span>;
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-amber-500 italic">[] (empty array)</span>;
      }
      
      return (
        <div className="ml-4">
          <span className="text-amber-400">[</span>
          <div className="ml-4">
            {value.map((item, index) => (
              <div key={index} className="flex items-start">
                <span className="text-amber-400 mr-2">{index}:</span>
                <div className="flex-1">
                  {formatValue(item, depth + 1)}
                </div>
              </div>
            ))}
          </div>
          <span className="text-amber-400">]</span>
        </div>
      );
    }
    
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return <span className="text-amber-500 italic">{} (empty object)</span>;
      }
      
      return (
        <div className="ml-4">
          <span className="text-amber-400">{'{'}</span>
          <div className="ml-4">
            {keys.map((key, index) => (
              <div key={key} className="flex items-start">
                <span className="text-amber-100 font-semibold mr-2">&ldquo;{key}&rdquo;:</span>
                <div className="flex-1">
                  {formatValue(value[key], depth + 1)}
                </div>
              </div>
            ))}
          </div>
          <span className="text-amber-400">{'}'}</span>
        </div>
      );
    }
    
    return <span className="text-amber-200">{String(value)}</span>;
  };

  const renderAbilityScores = (asiData) => {
    if (!Array.isArray(asiData)) return null;

    return (
      <div className="space-y-3">
        {asiData.map((item, index) => {
          const abilityData = fetchedData[item.ability_score?.url];
          
          return (
            <div key={index} className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">📊</span>
                  <div>
                    <div className="text-amber-100 font-bold text-lg">
                      {item.ability_score?.name || 'Unknown Ability'}
                    </div>
                    <div className="text-amber-400 text-sm">
                      {item.ability_score?.index || 'Unknown'}
                    </div>
                  </div>
                </div>
                <div className="text-amber-300 text-xl font-bold">
                  +{item.bonus}
                </div>
              </div>
              
              {abilityData && (
                <div className="mt-3 pt-3 border-t border-amber-500/20">
                  <div className="text-amber-200 text-sm leading-relaxed">
                    {abilityData.desc && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Description:</strong><br />
                        {abilityData.desc}
                      </div>
                    )}
                    {abilityData.full_name && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Full Name:</strong> {abilityData.full_name}
                      </div>
                    )}
                    {abilityData.skills && abilityData.skills.length > 0 && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Skills:</strong> {abilityData.skills.map(skill => skill.name).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {!abilityData && item.ability_score?.url && (
                <button
                  onClick={() => fetchRelatedData(item.ability_score.url)}
                  className="mt-3 text-amber-400 hover:text-amber-300 text-sm underline"
                >
                  Load detailed information
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderLanguages = (languagesData) => {
    if (!Array.isArray(languagesData)) return null;

    return (
      <div className="space-y-3">
        {languagesData.map((lang, index) => {
          const languageData = fetchedData[lang.url];
          
          return (
            <div key={index} className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/10">
              <div className="flex items-center mb-3">
                <span className="text-xl mr-3">🗣️</span>
                <div>
                  <div className="text-amber-100 font-semibold text-lg">
                    {lang.name || 'Unknown Language'}
                  </div>
                  <div className="text-amber-400 text-sm">
                    {lang.index || 'Unknown'}
                  </div>
                </div>
              </div>
              
              {languageData && (
                <div className="mt-3 pt-3 border-t border-amber-500/20">
                  <div className="text-amber-200 text-sm leading-relaxed">
                    {languageData.desc && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Description:</strong><br />
                        {languageData.desc}
                      </div>
                    )}
                    {languageData.type && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Type:</strong> {languageData.type}
                      </div>
                    )}
                    {languageData.script && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Script:</strong> {languageData.script}
                      </div>
                    )}
                    {languageData.typical_speakers && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Typical Speakers:</strong> {languageData.typical_speakers}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {!languageData && lang.url && (
                <button
                  onClick={() => fetchRelatedData(lang.url)}
                  className="mt-3 text-amber-400 hover:text-amber-300 text-sm underline"
                >
                  Load detailed information
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTraitSpecific = (traitSpecific) => {
    if (!traitSpecific) return null;

    // Handle subtrait options (like Draconic Ancestry choices)
    if (traitSpecific.subtrait_options) {
      const options = traitSpecific.subtrait_options;
      return (
        <div className="bg-slate-700/50 rounded-lg p-4 border border-amber-500/20">
          <div className="text-amber-100 font-bold mb-3 flex items-center">
            <span className="text-lg mr-2">🎯</span>
            Choose {options.choose} {options.type || 'option'}{options.choose > 1 ? 's' : ''}
          </div>
          
          {options.from && options.from.options && (
            <div className="space-y-2">
              {options.from.options.map((option, index) => (
                <div key={index} className="bg-slate-800/50 rounded p-3 border border-amber-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-amber-400 mr-2">•</span>
                      <div>
                        <div className="text-amber-100 font-semibold">
                          {option.item?.name || 'Unknown Option'}
                        </div>
                        <div className="text-amber-400 text-sm">
                          {option.item?.index || 'Unknown'}
                        </div>
                      </div>
                    </div>
                    {option.item?.url && (
                      <button
                        onClick={() => fetchRelatedData(option.item.url)}
                        className="text-amber-400 hover:text-amber-300 text-xs underline"
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Handle other trait-specific data
    return (
      <div className="bg-slate-700/50 rounded-lg p-3 border border-amber-500/20">
        <div className="text-amber-200 text-sm">
          <pre className="whitespace-pre-wrap text-xs">
            {JSON.stringify(traitSpecific, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  const renderTraits = (traitsData) => {
    if (!Array.isArray(traitsData)) return null;

    return (
      <div className="space-y-3">
        {traitsData.map((trait, index) => {
          const traitData = fetchedData[trait.url];
          
          return (
            <div key={index} className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/10">
              <div className="flex items-center mb-3">
                <span className="text-xl mr-3">✨</span>
                <div>
                  <div className="text-amber-100 font-semibold text-lg">
                    {trait.name || 'Unknown Trait'}
                  </div>
                  <div className="text-amber-400 text-sm">
                    {trait.index || 'Unknown'}
                  </div>
                </div>
              </div>
              
              {traitData && (
                <div className="mt-3 pt-3 border-t border-amber-500/20">
                  <div className="text-amber-200 text-sm leading-relaxed">
                    {traitData.desc && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Description:</strong><br />
                        {traitData.desc}
                      </div>
                    )}
                    {traitData.races && traitData.races.length > 0 && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Races:</strong> {traitData.races.map(race => race.name).join(', ')}
                      </div>
                    )}
                    {traitData.subraces && traitData.subraces.length > 0 && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Subraces:</strong> {traitData.subraces.map(subrace => subrace.name).join(', ')}
                      </div>
                    )}
                    {traitData.proficiencies && traitData.proficiencies.length > 0 && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Proficiencies:</strong> {traitData.proficiencies.map(prof => prof.name).join(', ')}
                      </div>
                    )}
                    {traitData.trait_specific && (
                      <div className="mb-2">
                        <strong className="text-amber-100">Trait Specific:</strong><br />
                        <div className="ml-4 mt-2">
                          {renderTraitSpecific(traitData.trait_specific)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {!traitData && trait.url && (
                <button
                  onClick={() => fetchRelatedData(trait.url)}
                  className="mt-3 text-amber-400 hover:text-amber-300 text-sm underline"
                >
                  Load detailed information
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSection = (title, data, sectionKey, icon = '📄') => {
    if (!data || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && Object.keys(data).length === 0)) {
      return null;
    }

    const isExpanded = expandedSections[sectionKey];
    const hasNestedData = typeof data === 'object' && data !== null;

    // Special handling for specific data types
    let specialContent = null;
    if ((sectionKey === 'asi' || sectionKey === 'ability_bonuses' || title.toLowerCase().includes('ability')) && Array.isArray(data)) {
      specialContent = renderAbilityScores(data);
    } else if (sectionKey === 'languages' && Array.isArray(data)) {
      specialContent = renderLanguages(data);
    } else if (sectionKey === 'traits' && Array.isArray(data)) {
      specialContent = renderTraits(data);
    }

    return (
      <div className="bg-slate-700/30 rounded-lg border border-amber-500/20">
        <button
          onClick={() => hasNestedData && !specialContent && toggleSection(sectionKey)}
          className={`w-full p-4 text-left ${hasNestedData && !specialContent ? 'hover:bg-slate-600/30 transition-colors' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-xl mr-3">{icon}</span>
              <h4 className="text-lg font-bold text-amber-100">{title}</h4>
            </div>
            {hasNestedData && !specialContent && (
              <span className="text-amber-400 text-lg">
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
          </div>
        </button>
        
        {specialContent ? (
          <div className="px-4 pb-4 border-t border-amber-500/20">
            <div className="mt-4">
              {specialContent}
            </div>
          </div>
        ) : hasNestedData ? (
          isExpanded && (
            <div className="px-4 pb-4 border-t border-amber-500/20">
              <div className="mt-4 font-mono text-sm">
                {formatValue(data)}
              </div>
            </div>
          )
        ) : (
          <div className="px-4 pb-4 border-t border-amber-500/20">
            <div className="mt-4 font-mono text-sm">
              {formatValue(data)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Race Header */}
      <div className="text-center border-b border-amber-500/30 pb-4">
        <h3 className="text-2xl font-bold text-amber-100 font-serif mb-2">
          {raceData.name || 'Unknown Race'}
        </h3>
        <div className="text-amber-400 text-sm">
          Complete API Response Data
        </div>
      </div>

      {/* All Data Sections */}
      <div className="space-y-3">
        {Object.entries(raceData).map(([key, value]) => {
          // Skip if value is empty/null/undefined
          if (value === null || value === undefined || value === '') {
            return null;
          }
          
          // Skip if it's an empty array or object
          if (Array.isArray(value) && value.length === 0) {
            return null;
          }
          if (typeof value === 'object' && Object.keys(value).length === 0) {
            return null;
          }

          // Skip name and index fields as they're redundant with the title
          if (key === 'name' || key === 'index') {
            return null;
          }

          const icons = {
            slug: '🔗',
            desc: '📝',
            asi: '📊',
            ability_bonuses: '📊',
            asi_desc: '📊',
            age: '⏰',
            alignment: '⚖️',
            size: '📏',
            size_raw: '📏',
            speed: '🏃',
            speed_desc: '🏃',
            languages: '🗣️',
            vision: '👁️',
            traits: '✨',
            subraces: '🌿',
            document__title: '📚',
            document__slug: '📚',
            document__url: '🔗',
            document__license_url: '📄'
          };

          return renderSection(
            key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value,
            key,
            icons[key] || '📄'
          );
        })}
      </div>

      {/* Raw JSON Toggle */}
      <div className="bg-slate-700/30 rounded-lg border border-amber-500/20">
        <button
          onClick={() => toggleSection('raw-json')}
          className="w-full p-4 text-left hover:bg-slate-600/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-xl mr-3">🔍</span>
              <h4 className="text-lg font-bold text-amber-100">Raw JSON Data</h4>
            </div>
            <span className="text-amber-400 text-lg">
              {expandedSections['raw-json'] ? '▼' : '▶'}
            </span>
          </div>
        </button>
        
        {expandedSections['raw-json'] && (
          <div className="px-4 pb-4 border-t border-amber-500/20">
            <div className="mt-4 font-mono text-xs bg-slate-800/50 p-4 rounded border border-amber-500/10 overflow-x-auto">
              <pre className="text-amber-200 whitespace-pre-wrap">
                {JSON.stringify(raceData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
    { key: 'classes', name: 'Classes', icon: '⚔️', color: 'bg-red-500' },
    { key: 'races', name: 'Races', icon: '🧬', color: 'bg-blue-500' },
    { key: 'spells', name: 'Spells', icon: '✨', color: 'bg-purple-500' },
    { key: 'equipment', name: 'Equipment', icon: '🛡️', color: 'bg-green-500' },
    { key: 'monsters', name: 'Monsters', icon: '🐉', color: 'bg-orange-500' },
    { key: 'feats', name: 'Feats', icon: '⭐', color: 'bg-yellow-500' }
  ];

  const [diceResult, setDiceResult] = useState(null);
  const [combatData, setCombatData] = useState({
    initiative: [],
    currentTurn: 0,
    round: 1
  });

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

  const handleDiceRoll = (sides, count = 1) => {
    const result = rollDice(sides, count);
    setDiceResult(result);
  };

  const addToInitiative = (name, roll) => {
    setCombatData(prev => ({
      ...prev,
      initiative: [...prev.initiative, { name, roll, id: Date.now() }].sort((a, b) => b.roll - a.roll)
    }));
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

            <div className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/20">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => handleDiceRoll(20)}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg p-4 text-center transition-colors"
                >
                  <div className="text-2xl mb-1">🎲</div>
                  <div className="font-bold">d20</div>
                </button>
                <button
                  onClick={() => handleDiceRoll(12)}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-4 text-center transition-colors"
                >
                  <div className="text-2xl mb-1">🎲</div>
                  <div className="font-bold">d12</div>
                </button>
                <button
                  onClick={() => handleDiceRoll(10)}
                  className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-4 text-center transition-colors"
                >
                  <div className="text-2xl mb-1">🎲</div>
                  <div className="font-bold">d10</div>
                </button>
                <button
                  onClick={() => handleDiceRoll(8)}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-4 text-center transition-colors"
                >
                  <div className="text-2xl mb-1">🎲</div>
                  <div className="font-bold">d8</div>
                </button>
                <button
                  onClick={() => handleDiceRoll(6)}
                  className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg p-4 text-center transition-colors"
                >
                  <div className="text-2xl mb-1">🎲</div>
                  <div className="font-bold">d6</div>
                </button>
                <button
                  onClick={() => handleDiceRoll(4)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg p-4 text-center transition-colors"
                >
                  <div className="text-2xl mb-1">🎲</div>
                  <div className="font-bold">d4</div>
                </button>
              </div>

              {diceResult && (
                <div className="bg-slate-700 rounded-lg p-4 text-center">
                  <div className="text-amber-200 text-lg font-bold mb-2">
                    {diceResult.count}d{diceResult.sides}
                  </div>
                  <div className="text-amber-100 text-3xl font-bold mb-2">
                    {diceResult.total}
                  </div>
                  {diceResult.count > 1 && (
                    <div className="text-amber-300 text-sm">
                      ({diceResult.results.join(' + ')}) = {diceResult.total}
                    </div>
                  )}
                </div>
              )}
            </div>
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

            <div className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/20">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-amber-200 font-bold">Round {combatData.round}</span>
                  <button
                    onClick={() => setCombatData(prev => ({ ...prev, round: prev.round + 1, currentTurn: 0 }))}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Next Round
                  </button>
                </div>
                
                <div className="space-y-2">
                  {combatData.initiative.map((character, index) => (
                    <div
                      key={character.id}
                      className={`flex justify-between items-center p-2 rounded ${
                        index === combatData.currentTurn ? 'bg-amber-600 text-slate-900' : 'bg-slate-700 text-amber-100'
                      }`}
                    >
                      <span className="font-medium">{character.name}</span>
                      <span className="font-bold">{character.roll}</span>
                    </div>
                  ))}
                </div>

                {combatData.initiative.length > 0 && (
                  <div className="mt-4 flex justify-between">
                    <button
                      onClick={() => setCombatData(prev => ({ 
                        ...prev, 
                        currentTurn: prev.currentTurn > 0 ? prev.currentTurn - 1 : prev.initiative.length - 1 
                      }))}
                      className="bg-slate-600 hover:bg-slate-700 text-amber-100 px-3 py-1 rounded text-sm transition-colors"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={() => setCombatData(prev => ({ 
                        ...prev, 
                        currentTurn: prev.currentTurn < prev.initiative.length - 1 ? prev.currentTurn + 1 : 0 
                      }))}
                      className="bg-slate-600 hover:bg-slate-700 text-amber-100 px-3 py-1 rounded text-sm transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-amber-500/20 pt-4">
                <div className="text-amber-200 font-bold mb-2">Add Character</div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Name"
                    className="flex-1 bg-slate-700 border border-amber-500/30 rounded px-3 py-2 text-amber-100 placeholder-amber-300 focus:outline-none focus:border-amber-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const name = e.target.value;
                        const roll = rollDice(20).total;
                        addToInitiative(name, roll);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const name = prompt('Character name:');
                      if (name) {
                        const roll = rollDice(20).total;
                        addToInitiative(name, roll);
                      }
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
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

            <div className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/20">
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-amber-200 text-lg font-serif">Character Sheet</p>
                <p className="text-amber-300 text-sm mt-2">Coming soon - Quick reference for your character stats</p>
              </div>
            </div>
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