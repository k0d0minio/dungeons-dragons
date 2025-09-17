'use client';

import { useState, useEffect } from 'react';
import { fetchList, fetchItem, fetchMultipleByUrls } from '../../lib/dnd-api';

/**
 * RaceViewer Component
 * 
 * A mobile-first interface for browsing and viewing D&D 5e races.
 * Handles both mock data and real API data gracefully.
 */
export default function RaceViewer({ onBack }) {
  const [races, setRaces] = useState([]);
  const [selectedRace, setSelectedRace] = useState(null);
  const [raceDetails, setRaceDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load races list on component mount
  useEffect(() => {
    loadRaces();
  }, []);

  const loadRaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchList('races');
      setRaces(data.results || []);
    } catch (err) {
      setError(err.message);
      console.error('Error loading races:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRaceDetails = async (race) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedRace(race);
      
      // Fetch detailed race data
      const details = await fetchItem('races', race.index);
      
      // Extract all related URLs that need to be fetched
      const relatedUrls = [];
      
      // Collect URLs from various fields
      if (details.traits) {
        relatedUrls.push(...details.traits.map(trait => trait.url));
      }
      if (details.languages) {
        relatedUrls.push(...details.languages.map(lang => lang.url));
      }
      if (details.subraces) {
        relatedUrls.push(...details.subraces.map(subrace => subrace.url));
      }
      if (details.starting_proficiencies) {
        relatedUrls.push(...details.starting_proficiencies.map(prof => prof.url));
      }
      if (details.ability_bonuses) {
        relatedUrls.push(...details.ability_bonuses.map(asi => asi.ability_score?.url).filter(Boolean));
      }
      
      // Fetch all related data in parallel
      let relatedData = {};
      if (relatedUrls.length > 0) {
        try {
          const fetchedData = await fetchMultipleByUrls(relatedUrls);
          // Create a map of URL to data for easy lookup
          relatedData = relatedUrls.reduce((acc, url, index) => {
            if (fetchedData[index]) {
              acc[url] = fetchedData[index];
            }
            return acc;
          }, {});
        } catch (relatedErr) {
          console.warn('Some related data failed to load:', relatedErr);
          // Continue with basic race data even if related data fails
        }
      }
      
      // Merge the race details with fetched related data
      const enrichedDetails = {
        ...details,
        _relatedData: relatedData
      };
      
      setRaceDetails(enrichedDetails);
    } catch (err) {
      setError(err.message);
      console.error('Error loading race details:', err);
      // Set basic details from the race object if API fails
      setRaceDetails({
        name: race.name,
        index: race.index,
        desc: 'Detailed information not available',
        _fallback: true
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRaces = races.filter(race =>
    race.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const goBack = () => {
    if (selectedRace) {
      // If viewing a specific race, go back to race list
      setSelectedRace(null);
      setRaceDetails(null);
      setError(null);
    } else if (onBack) {
      // If at race list level, go back to main overview
      onBack();
    }
  };

  if (loading && !selectedRace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">🧬</div>
          <div className="text-amber-200 text-xl font-serif">Loading races...</div>
        </div>
      </div>
    );
  }

  if (error && !selectedRace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-red-400 text-xl font-serif">Error: {error}</div>
          <button
            onClick={loadRaces}
            className="mt-4 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Race List View
  if (!selectedRace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-amber-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900/40 via-amber-800/30 to-amber-900/40 backdrop-blur-sm border-b-2 border-amber-600/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={goBack}
              className="flex items-center text-amber-200 hover:text-amber-100 transition-colors"
            >
              ← Back
            </button>
            <div className="flex items-center gap-3">
              <div className="text-2xl">🧬</div>
              <div>
                <h1 className="text-lg font-bold text-amber-100 font-serif tracking-wider">
                  D&D Races
                </h1>
                <p className="text-amber-300 text-sm">Choose your character&apos;s race</p>
              </div>
            </div>
            <div className="w-12"></div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search races..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/50 border border-amber-500/30 rounded-lg px-4 py-3 text-amber-100 placeholder-amber-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
            <div className="absolute right-3 top-3 text-amber-400">
              🔍
            </div>
          </div>
        </div>

        {/* Races Grid */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 gap-3">
            {filteredRaces.map((race) => (
              <button
                key={race.index}
                onClick={() => loadRaceDetails(race)}
                className="group bg-gradient-to-r from-slate-800/60 to-slate-700/60 hover:from-slate-700/80 hover:to-slate-600/80 rounded-lg p-4 text-left transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg border border-amber-500/20 hover:border-amber-500/40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl group-hover:scale-110 transition-transform duration-300">
                      {getRaceEmoji(race.index)}
                    </div>
                    <div>
                      <h3 className="text-amber-100 font-bold text-lg group-hover:text-amber-50">
                        {race.name}
                      </h3>
                      <p className="text-amber-300 text-sm">
                        {getRaceDescription(race.index)}
                      </p>
                    </div>
                  </div>
                  <div className="text-amber-400 group-hover:text-amber-300">
                    →
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredRaces.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🔍</div>
              <div className="text-amber-300 text-lg">No races found</div>
              <div className="text-amber-400 text-sm">Try a different search term</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Race Detail View
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-amber-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900/40 via-amber-800/30 to-amber-900/40 backdrop-blur-sm border-b-2 border-amber-600/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={goBack}
            className="flex items-center text-amber-200 hover:text-amber-100 transition-colors"
          >
            ← Back
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-amber-100 font-serif">
              {raceDetails?.name || selectedRace.name}
            </h1>
            <p className="text-amber-300 text-sm">Race Details</p>
          </div>
          <div className="w-12"></div>
        </div>
      </div>

      {/* Race Details */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4 animate-spin">🧬</div>
            <div className="text-amber-200">Loading race details...</div>
          </div>
        ) : error ? (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
            <div className="text-red-200 text-center">
              <div className="text-xl mb-2">⚠️</div>
              <div className="font-semibold">Unable to load detailed information</div>
              <div className="text-sm text-red-300 mt-1">
                Using basic race information
              </div>
            </div>
          </div>
        ) : raceDetails ? (
          <RaceDetails race={raceDetails} />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Race Details Component
 * Displays detailed race information in a profile-style format
 */
function RaceDetails({ race }) {
  return (
    <div className="space-y-6">
      {/* Race Header */}
      <div className="text-center bg-gradient-to-br from-amber-800/30 to-amber-900/30 rounded-xl p-8 border-2 border-amber-500/30 shadow-lg">
        <div className="text-8xl mb-6">
          {getRaceEmoji(race.index)}
        </div>
        <h2 className="text-3xl font-bold text-amber-100 font-serif mb-3">
          {race.name}
        </h2>
        {race._fallback && (
          <div className="text-amber-400 text-sm bg-amber-900/30 rounded-lg px-3 py-1 inline-block">
            Basic information only - detailed data unavailable
          </div>
        )}
      </div>

      {/* Description */}
      {race.desc && (
        <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📝</span>
            <h3 className="text-xl font-bold text-amber-100">Description</h3>
          </div>
          <div className="text-amber-200 leading-relaxed text-lg">
            {race.desc}
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Age */}
        {race.age && (
          <div className="bg-slate-800/60 rounded-xl p-4 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">⏰</span>
              <h4 className="font-semibold text-amber-100">Age</h4>
            </div>
            <div className="text-amber-200 text-sm">
              {race.age}
            </div>
          </div>
        )}

        {/* Alignment */}
        {race.alignment && (
          <div className="bg-slate-800/60 rounded-xl p-4 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">⚖️</span>
              <h4 className="font-semibold text-amber-100">Alignment</h4>
            </div>
            <div className="text-amber-200 text-sm">
              {race.alignment}
            </div>
          </div>
        )}

        {/* Size */}
        {(race.size || race.size_raw) && (
          <div className="bg-slate-800/60 rounded-xl p-4 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">📏</span>
              <h4 className="font-semibold text-amber-100">Size</h4>
            </div>
            <div className="text-amber-200 text-sm">
              {race.size || race.size_raw}
            </div>
          </div>
        )}

        {/* Speed */}
        {race.speed && (
          <div className="bg-slate-800/60 rounded-xl p-4 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🏃</span>
              <h4 className="font-semibold text-amber-100">Speed</h4>
              <SpeedTooltip />
            </div>
            <div className="text-amber-200 text-sm font-bold">
              {typeof race.speed === 'number' ? `${race.speed} feet` : race.speed}
            </div>
          </div>
        )}
      </div>

      {/* Ability Score Increases */}
      {(race.ability_bonuses || race.asi) && (
        <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📊</span>
            <h3 className="text-xl font-bold text-amber-100">Ability Score Increases</h3>
          </div>
          <div className="space-y-4">
            {(race.ability_bonuses || race.asi).map((bonus, index) => {
              const abilityData = race._relatedData?.[bonus.ability_score?.url];
              return (
                <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-amber-100 font-semibold text-lg">
                        {abilityData?.full_name || bonus.ability_score?.name || bonus.name || 'Unknown'}
                      </div>
                      <div className="text-amber-300 text-sm">
                        {abilityData?.name || bonus.ability_score?.name || bonus.name || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-amber-300 font-bold text-2xl">
                      +{bonus.bonus || 1}
                    </div>
                  </div>
                  
                  {abilityData?.desc && (
                    <div className="text-amber-200 text-sm leading-relaxed mb-3">
                      {Array.isArray(abilityData.desc) ? abilityData.desc.join(' ') : abilityData.desc}
                    </div>
                  )}
                  
                  {abilityData?.skills && abilityData.skills.length > 0 && (
                    <div className="mt-3">
                      <div className="text-amber-300 text-sm font-medium mb-2">Related Skills:</div>
                      <div className="flex flex-wrap gap-2">
                        {abilityData.skills.map((skill, skillIndex) => (
                          <span key={skillIndex} className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded text-xs">
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Languages */}
      {race.languages && race.languages.length > 0 && (
        <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🗣️</span>
            <h3 className="text-xl font-bold text-amber-100">Languages</h3>
          </div>
          <div className="space-y-3">
            {race.languages.map((lang, index) => {
              const langData = race._relatedData?.[lang.url];
              return (
                <div key={index} className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-amber-100 font-medium mb-1">
                    {lang.name || lang}
                  </div>
                  {langData?.desc && (
                    <div className="text-amber-300 text-sm">
                      {Array.isArray(langData.desc) ? langData.desc.join(' ') : langData.desc}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {race.language_desc && (
            <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
              <div className="text-amber-200 text-sm leading-relaxed">
                {race.language_desc}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Racial Traits */}
      {race.traits && race.traits.length > 0 && (
        <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">✨</span>
            <h3 className="text-xl font-bold text-amber-100">Racial Traits</h3>
          </div>
          <div className="space-y-4">
            {race.traits.map((trait, index) => {
              const traitData = race._relatedData?.[trait.url];
              return (
                <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-amber-100 font-semibold text-lg mb-2">
                    {trait.name || trait}
                  </div>
                  {traitData?.desc && (
                    <div className="text-amber-200 leading-relaxed">
                      {Array.isArray(traitData.desc) ? traitData.desc.join(' ') : traitData.desc}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Starting Proficiencies */}
      {race.starting_proficiencies && race.starting_proficiencies.length > 0 && (
        <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🛡️</span>
            <h3 className="text-xl font-bold text-amber-100">Starting Proficiencies</h3>
          </div>
          <div className="space-y-3">
            {race.starting_proficiencies.map((prof, index) => {
              const profData = race._relatedData?.[prof.url];
              return (
                <div key={index} className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-amber-100 font-medium mb-1">
                    {prof.name || prof}
                  </div>
                  {profData?.desc && (
                    <div className="text-amber-300 text-sm">
                      {Array.isArray(profData.desc) ? profData.desc.join(' ') : profData.desc}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subraces */}
      {race.subraces && race.subraces.length > 0 && (
        <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🌿</span>
            <h3 className="text-xl font-bold text-amber-100">Subraces</h3>
          </div>
          <div className="space-y-4">
            {race.subraces.map((subrace, index) => {
              const subraceData = race._relatedData?.[subrace.url];
              return (
                <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-amber-100 font-semibold text-lg mb-2">
                    {subrace.name || subrace}
                  </div>
                  {subraceData?.desc && (
                    <div className="text-amber-200 leading-relaxed">
                      {Array.isArray(subraceData.desc) ? subraceData.desc.join(' ') : subraceData.desc}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Speed Tooltip Component
 * Shows a popover explaining that speed is measured in feet per round
 */
function SpeedTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
        aria-label="Speed information"
      >
        ℹ️
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-slate-900 border border-amber-500/30 rounded-lg p-3 shadow-lg z-10">
          <div className="text-amber-100 text-sm font-medium mb-1">
            Speed in D&D
          </div>
          <div className="text-amber-200 text-xs leading-relaxed">
            Speed is measured in feet per round. A round is 6 seconds, so this represents how far the character can move in one turn.
          </div>
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Get race emoji based on race index
 */
function getRaceEmoji(raceIndex) {
  const emojiMap = {
    'dragonborn': '🐉',
    'dwarf': '⛏️',
    'elf': '🧝',
    'gnome': '🧙',
    'half-elf': '🧝‍♂️',
    'half-orc': '👹',
    'halfling': '🧌',
    'human': '👤',
    'tiefling': '😈'
  };
  return emojiMap[raceIndex] || '🧬';
}

/**
 * Get race description based on race index
 */
function getRaceDescription(raceIndex) {
  const descriptions = {
    'dragonborn': 'Draconic heritage with breath weapon',
    'dwarf': 'Sturdy mountain dwellers',
    'elf': 'Graceful and long-lived',
    'gnome': 'Small and clever inventors',
    'half-elf': 'Versatile and adaptable',
    'half-orc': 'Strong and resilient',
    'halfling': 'Small but brave adventurers',
    'human': 'Ambitious and diverse',
    'tiefling': 'Infernal heritage with magical gifts'
  };
  return descriptions[raceIndex] || 'A player character race';
}
