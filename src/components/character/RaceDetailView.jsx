'use client';

import { useState } from 'react';

/**
 * RaceDetailView Component
 * 
 * Displays detailed information about a D&D 5e race including:
 * - Ability score improvements (ASI)
 * - Languages and traits
 * - Racial features and subraces
 * - All other race data in an organized, collapsible format
 * 
 * @param {Object} props - Component props
 * @param {Object} props.raceData - The race data object from D&D API
 * @param {string} props.raceData.name - Race name
 * @param {string} props.raceData.index - Race index/identifier
 * @param {Array} props.raceData.asi - Ability score improvements
 * @param {Array} props.raceData.ability_bonuses - Alternative ability bonuses
 * @param {Array} props.raceData.languages - Known languages
 * @param {Array} props.raceData.traits - Racial traits
 * @param {Array} props.raceData.subraces - Available subraces
 * @param {string} props.raceData.desc - Race description
 * @param {string} props.raceData.age - Age information
 * @param {string} props.raceData.alignment - Typical alignment
 * @param {string} props.raceData.size - Creature size
 * @param {number} props.raceData.speed - Movement speed
 * @param {string} props.raceData.url - API URL for this race
 * @param {string} props.raceData.updated_at - Last update timestamp
 */
export default function RaceDetailView({ raceData }) {
  const [expandedSections, setExpandedSections] = useState({});
  const [fetchedData, setFetchedData] = useState({});

  // Validate raceData prop
  if (!raceData || typeof raceData !== 'object') {
    return (
      <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
        <div className="text-red-200 text-center">
          <div className="text-xl mb-2">⚠️</div>
          <div className="font-semibold">Invalid Race Data</div>
          <div className="text-sm text-red-300 mt-1">
            No race data provided or data is invalid
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
        {Object.entries(raceData).map(([key, value], index) => {
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
                {JSON.stringify(raceData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
