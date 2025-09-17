'use client';

import { useState } from 'react';

/**
 * ClassDetailView Component
 * 
 * Displays detailed information about a D&D 5e class including:
 * - Proficiencies and saving throws
 * - Starting equipment and equipment options
 * - Spellcasting information (if applicable)
 * - Subclasses
 * - All other class data in an organized, collapsible format
 * 
 * @param {Object} props - Component props
 * @param {Object} props.classData - The class data object from D&D API
 * @param {string} props.classData.name - Class name
 * @param {string} props.classData.index - Class index/identifier
 * @param {Array} props.classData.proficiencies - Class proficiencies
 * @param {Array} props.classData.saving_throws - Saving throw proficiencies
 * @param {Array} props.classData.starting_equipment - Starting equipment
 * @param {Array} props.classData.starting_equipment_options - Equipment choices
 * @param {Object} props.classData.spellcasting - Spellcasting information
 * @param {Array} props.classData.subclasses - Available subclasses
 * @param {Object} props.classData.hit_die - Hit die information
 * @param {Array} props.classData.class_levels - Class level progression
 * @param {Object} props.classData.multi_classing - Multiclassing rules
 * @param {string} props.classData.url - API URL for this class
 * @param {string} props.classData.updated_at - Last update timestamp
 */
export default function ClassDetailView({ classData }) {
  const [expandedSections, setExpandedSections] = useState({});
  const [fetchedData, setFetchedData] = useState({});

  // Validate classData prop
  if (!classData || typeof classData !== 'object') {
    return (
      <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
        <div className="text-red-200 text-center">
          <div className="text-xl mb-2">⚠️</div>
          <div className="font-semibold">Invalid Class Data</div>
          <div className="text-sm text-red-300 mt-1">
            No class data provided or data is invalid
          </div>
        </div>
      </div>
    );
  }

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
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
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
        {Object.entries(classData)
          .filter(([key, value]) => {
            // Skip if value is empty/null/undefined
            if (value === null || value === undefined || value === '') {
              return false;
            }
            
            // Skip if it's an empty array or object
            if (Array.isArray(value) && value.length === 0) {
              return false;
            }
            if (typeof value === 'object' && Object.keys(value).length === 0) {
              return false;
            }

            // Skip name and index fields as they're redundant with the title
            if (key === 'name' || key === 'index') {
              return false;
            }

            return true;
          })
          .map(([key, value], index) => {
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

            return (
              <div key={index}>
                {renderSection(
                  key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  value,
                  key,
                  icons[key] || '📄'
                )}
              </div>
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
