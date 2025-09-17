'use client';

import { useState, useEffect } from 'react';
import { fetchList, fetchItem, fetchMultipleByUrls } from '../../lib/dnd-api';

/**
 * ClassViewer Component
 * 
 * A mobile-first interface for browsing and viewing D&D 5e classes.
 * Handles both mock data and real API data gracefully with full related data fetching.
 */
export default function ClassViewer({ onBack }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classDetails, setClassDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load classes list on component mount
  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchList('classes');
      setClasses(data.results || []);
    } catch (err) {
      setError(err.message);
      console.error('Error loading classes:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClassDetails = async (classItem) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedClass(classItem);
      
      // Fetch detailed class data
      const details = await fetchItem('classes', classItem.index);
      
      // Extract all related URLs that need to be fetched
      const relatedUrls = [];
      
      // Collect URLs from various fields
      if (details.proficiencies) {
        relatedUrls.push(...details.proficiencies.map(prof => prof.url));
      }
      if (details.saving_throws) {
        relatedUrls.push(...details.saving_throws.map(save => save.url));
      }
      if (details.subclasses) {
        relatedUrls.push(...details.subclasses.map(subclass => subclass.url));
      }
      if (details.starting_equipment) {
        relatedUrls.push(...details.starting_equipment.map(item => item.equipment?.url).filter(Boolean));
      }
      if (details.spellcasting?.spellcasting_ability) {
        relatedUrls.push(details.spellcasting.spellcasting_ability.url);
      }
      if (details.proficiency_choices) {
        details.proficiency_choices.forEach(choice => {
          if (choice.from?.options) {
            choice.from.options.forEach(option => {
              if (option.option_type === 'reference' && option.item?.url) {
                relatedUrls.push(option.item.url);
              }
            });
          }
        });
      }
      
      // Add multi-classing data URLs
      if (details.multi_classing?.proficiencies) {
        relatedUrls.push(...details.multi_classing.proficiencies.map(prof => prof.url));
      }
      if (details.multi_classing?.prerequisites) {
        relatedUrls.push(...details.multi_classing.prerequisites.map(prereq => prereq.ability_score?.url).filter(Boolean));
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
          // Continue with basic class data even if related data fails
        }
      }
      
      // Fetch additional class data
      let classLevels = null;
      let spells = null;
      
      // Fetch class levels
      if (details.class_levels) {
        try {
          classLevels = await fetchByUrl(details.class_levels);
        } catch (err) {
          console.warn('Failed to fetch class levels:', err);
        }
      }
      
      // Fetch spells for spellcasting classes
      if (details.spells) {
        try {
          spells = await fetchByUrl(details.spells);
        } catch (err) {
          console.warn('Failed to fetch spells:', err);
        }
      }
      
      // Merge the class details with fetched related data
      const enrichedDetails = {
        ...details,
        _relatedData: relatedData,
        _classLevels: classLevels,
        _spells: spells
      };
      
      setClassDetails(enrichedDetails);
    } catch (err) {
      setError(err.message);
      console.error('Error loading class details:', err);
      // Set basic details from the class object if API fails
      setClassDetails({
        name: classItem.name,
        index: classItem.index,
        desc: 'Detailed information not available',
        _fallback: true
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter(classItem =>
    classItem.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const goBack = () => {
    if (selectedClass) {
      // If viewing a specific class, go back to class list
      setSelectedClass(null);
      setClassDetails(null);
      setError(null);
    } else if (onBack) {
      // If at class list level, go back to main overview
      onBack();
    }
  };

  if (loading && !selectedClass) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⚔️</div>
          <div className="text-amber-200 text-xl font-serif">Loading classes...</div>
        </div>
      </div>
    );
  }

  if (error && !selectedClass) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-red-400 text-xl font-serif">Error: {error}</div>
          <button
            onClick={loadClasses}
            className="mt-4 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Class List View
  if (!selectedClass) {
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
              <div className="text-2xl">⚔️</div>
              <div>
                <h1 className="text-lg font-bold text-amber-100 font-serif tracking-wider">
                  D&D Classes
                </h1>
                <p className="text-amber-300 text-sm">Choose your character&apos;s class</p>
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
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/50 border border-amber-500/30 rounded-lg px-4 py-3 text-amber-100 placeholder-amber-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
            <div className="absolute right-3 top-3 text-amber-400">
              🔍
            </div>
          </div>
        </div>

        {/* Classes Grid */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 gap-3">
            {filteredClasses.map((classItem) => (
              <button
                key={classItem.index}
                onClick={() => loadClassDetails(classItem)}
                className="group bg-gradient-to-r from-slate-800/60 to-slate-700/60 hover:from-slate-700/80 hover:to-slate-600/80 rounded-lg p-4 text-left transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg border border-amber-500/20 hover:border-amber-500/40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl group-hover:scale-110 transition-transform duration-300">
                      {getClassEmoji(classItem.index)}
                    </div>
                    <div>
                      <h3 className="text-amber-100 font-bold text-lg group-hover:text-amber-50">
                        {classItem.name}
                      </h3>
                      <p className="text-amber-300 text-sm">
                        {getClassDescription(classItem.index)}
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

          {filteredClasses.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🔍</div>
              <div className="text-amber-300 text-lg">No classes found</div>
              <div className="text-amber-400 text-sm">Try a different search term</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Class Detail View
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
              {classDetails?.name || selectedClass.name}
            </h1>
            <p className="text-amber-300 text-sm">Class Details</p>
          </div>
          <div className="w-12"></div>
        </div>
      </div>

      {/* Class Details */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4 animate-spin">⚔️</div>
            <div className="text-amber-200">Loading class details...</div>
          </div>
        ) : error ? (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
            <div className="text-red-200 text-center">
              <div className="text-xl mb-2">⚠️</div>
              <div className="font-semibold">Unable to load detailed information</div>
              <div className="text-sm text-red-300 mt-1">
                Using basic class information
              </div>
            </div>
          </div>
        ) : classDetails ? (
          <ClassDetails classData={classDetails} />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Class Details Component
 * Displays detailed class information in a profile-style format
 */
function ClassDetails({ classData }) {
  return (
    <div className="space-y-6">
      {/* Class Header */}
      <div className="text-center bg-gradient-to-br from-amber-800/30 to-amber-900/30 rounded-xl p-8 border-2 border-amber-500/30 shadow-lg">
        <div className="text-8xl mb-6">
          {getClassEmoji(classData.index)}
        </div>
        <h2 className="text-3xl font-bold text-amber-100 font-serif mb-3">
          {classData.name}
        </h2>
        {classData._fallback && (
          <div className="text-amber-400 text-sm bg-amber-900/30 rounded-lg px-3 py-1 inline-block">
            Basic information only - detailed data unavailable
          </div>
        )}
      </div>

      {/* Description */}
      {classData.desc && (
        <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📝</span>
            <h3 className="text-xl font-bold text-amber-100">Description</h3>
          </div>
          <div className="text-amber-200 leading-relaxed text-lg">
            {classData.desc}
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Hit Die */}
        {classData.hit_die && (
          <div className="bg-slate-800/60 rounded-xl p-4 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">💀</span>
              <h4 className="font-semibold text-amber-100">Hit Die</h4>
              <HitDieTooltip />
            </div>
            <div className="text-amber-200 text-sm font-bold">
              d{classData.hit_die}
            </div>
          </div>
        )}

        {/* Primary Ability */}
        {classData.spellcasting?.spellcasting_ability && (
          <div className="bg-slate-800/60 rounded-xl p-4 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🔮</span>
              <h4 className="font-semibold text-amber-100">Spellcasting</h4>
              <SpellcastingTooltip />
            </div>
            <div className="text-amber-200 text-sm font-bold">
              {classData.spellcasting.spellcasting_ability.name}
            </div>
          </div>
        )}
      </div>

      {/* Saving Throw Proficiencies */}
      {classData.saving_throws && classData.saving_throws.length > 0 && (
        <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💪</span>
            <h3 className="text-xl font-bold text-amber-100">Saving Throw Proficiencies</h3>
            <SavingThrowTooltip />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {classData.saving_throws.map((save, index) => {
              const saveData = classData._relatedData?.[save.url];
              return (
                <div key={index} className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-amber-100 font-medium">
                    {saveData?.name || save.name || 'Unknown'}
                  </span>
                  <span className="text-amber-300 font-bold text-lg">
                    ✓
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Proficiencies */}
      {classData.proficiencies && classData.proficiencies.length > 0 && (
        <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🛡️</span>
            <h3 className="text-xl font-bold text-amber-100">Proficiencies</h3>
            <ProficiencyTooltip />
          </div>
          <div className="space-y-3">
            {classData.proficiencies.map((prof, index) => {
              const profData = classData._relatedData?.[prof.url];
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

      {/* Proficiency Choices */}
      {classData.proficiency_choices && classData.proficiency_choices.length > 0 && (
        <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🎯</span>
            <h3 className="text-xl font-bold text-amber-100">Proficiency Choices</h3>
            <ProficiencyChoiceTooltip />
          </div>
          <div className="space-y-4">
            {classData.proficiency_choices.map((choice, index) => (
              <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-amber-100 font-semibold text-lg mb-2">
                  Choose {choice.choose} from:
                </div>
                <div className="text-amber-200 text-sm mb-3">
                  {choice.desc}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {choice.from?.options?.map((option, optIndex) => {
                    if (option.option_type === 'reference' && option.item) {
                      const optionData = classData._relatedData?.[option.item.url];
                      return (
                        <div key={optIndex} className="bg-slate-800/50 rounded p-2 text-amber-300 text-sm">
                          {optionData?.name || option.item.name}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Starting Equipment */}
      {classData.starting_equipment && classData.starting_equipment.length > 0 && (
        <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⚔️</span>
            <h3 className="text-xl font-bold text-amber-100">Starting Equipment</h3>
            <StartingEquipmentTooltip />
          </div>
          <div className="space-y-3">
            {classData.starting_equipment.map((item, index) => {
              const equipmentData = classData._relatedData?.[item.equipment?.url];
              return (
                <div key={index} className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-amber-100 font-medium mb-1">
                    {equipmentData?.name || item.equipment?.name || 'Unknown Item'}
                  </div>
                  {item.quantity && (
                    <div className="text-amber-300 text-sm">
                      Quantity: {item.quantity}
                    </div>
                  )}
                  {equipmentData?.desc && (
                    <div className="text-amber-300 text-sm mt-1">
                      {Array.isArray(equipmentData.desc) ? equipmentData.desc.join(' ') : equipmentData.desc}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spellcasting */}
      {classData.spellcasting && (
        <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔮</span>
            <h3 className="text-xl font-bold text-amber-100">Spellcasting</h3>
            <SpellcastingRulesTooltip />
          </div>
          <div className="space-y-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-amber-100 font-semibold text-lg mb-2">
                Spellcasting Ability
              </div>
              <div className="text-amber-200">
                {classData.spellcasting.spellcasting_ability.name}
              </div>
            </div>
            
            {classData.spellcasting.info && classData.spellcasting.info.map((info, index) => (
              <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-amber-100 font-semibold text-lg mb-2">
                  {info.name}
                </div>
                <div className="text-amber-200 leading-relaxed">
                  {Array.isArray(info.desc) ? info.desc.join(' ') : info.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subclasses */}
      {classData.subclasses && classData.subclasses.length > 0 && (
        <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🌿</span>
            <h3 className="text-xl font-bold text-amber-100">Subclasses</h3>
            <SubclassTooltip />
          </div>
          <div className="space-y-4">
            {classData.subclasses.map((subclass, index) => {
              const subclassData = classData._relatedData?.[subclass.url];
              return (
                <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-amber-100 font-semibold text-lg mb-2">
                    {subclass.name || subclass}
                  </div>
                  {subclassData?.desc && (
                    <div className="text-amber-200 leading-relaxed">
                      {Array.isArray(subclassData.desc) ? subclassData.desc.join(' ') : subclassData.desc}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Starting Equipment Options */}
      {classData.starting_equipment_options && classData.starting_equipment_options.length > 0 && (
        <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🎒</span>
            <h3 className="text-xl font-bold text-amber-100">Starting Equipment Options</h3>
            <StartingEquipmentOptionsTooltip />
          </div>
          <div className="space-y-4">
            {classData.starting_equipment_options.map((option, index) => (
              <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-amber-100 font-semibold text-lg mb-2">
                  Choose {option.choose} from:
                </div>
                <div className="text-amber-200 text-sm leading-relaxed mb-3">
                  {option.desc}
                </div>
                {option.from?.options && (
                  <div className="space-y-2">
                    {option.from.options.map((opt, optIndex) => (
                      <div key={optIndex} className="text-amber-300 text-sm">
                        {opt.option_type === 'counted_reference' && (
                          <span>{opt.count}x {opt.of?.name || 'Unknown Item'}</span>
                        )}
                        {opt.option_type === 'choice' && (
                          <span>{opt.choice?.desc || 'Choice option'}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-classing */}
      {classData.multi_classing && (
        <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔄</span>
            <h3 className="text-xl font-bold text-amber-100">Multi-classing</h3>
            <MultiClassingTooltip />
          </div>
          
          {/* Prerequisites */}
          {classData.multi_classing.prerequisites && classData.multi_classing.prerequisites.length > 0 && (
            <div className="mb-4">
              <div className="text-amber-100 font-semibold text-lg mb-2">Prerequisites</div>
              <div className="space-y-2">
                {classData.multi_classing.prerequisites.map((prereq, index) => {
                  const abilityData = classData._relatedData?.[prereq.ability_score?.url];
                  return (
                    <div key={index} className="bg-slate-700/50 rounded-lg p-3">
                      <div className="text-amber-200 text-sm">
                        <span className="font-medium">
                          {abilityData?.full_name || prereq.ability_score?.name || 'Unknown Ability'}
                        </span>
                        {' '}minimum score: {prereq.minimum_score}
                      </div>
                      {abilityData?.desc && (
                        <div className="text-amber-300 text-xs mt-1">
                          {abilityData.desc}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Multi-classing Proficiencies */}
          {classData.multi_classing.proficiencies && classData.multi_classing.proficiencies.length > 0 && (
            <div>
              <div className="text-amber-100 font-semibold text-lg mb-2">Gained Proficiencies</div>
              <div className="grid grid-cols-2 gap-2">
                {classData.multi_classing.proficiencies.map((prof, index) => {
                  const profData = classData._relatedData?.[prof.url];
                  return (
                    <div key={index} className="bg-slate-700/50 rounded-lg p-3">
                      <div className="text-amber-200 text-sm font-medium">
                        {profData?.name || prof.name || 'Unknown Proficiency'}
                      </div>
                      {profData?.desc && (
                        <div className="text-amber-300 text-xs mt-1">
                          {profData.desc}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Class Levels */}
      {classData._classLevels && classData._classLevels.length > 0 && (
        <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📈</span>
            <h3 className="text-xl font-bold text-amber-100">Class Levels</h3>
            <ClassLevelsTooltip />
          </div>
          <div className="space-y-3">
            {classData._classLevels.slice(0, 5).map((level, index) => (
              <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-amber-100 font-semibold text-lg">
                    Level {level.level}
                  </div>
                  <div className="text-amber-300 text-sm">
                    Proficiency Bonus: +{level.prof_bonus}
                  </div>
                </div>
                
                {level.features && level.features.length > 0 && (
                  <div className="mb-2">
                    <div className="text-amber-200 text-sm font-medium mb-1">Features:</div>
                    <div className="flex flex-wrap gap-1">
                      {level.features.map((feature, featIndex) => (
                        <span key={featIndex} className="bg-amber-500/20 text-amber-200 px-2 py-1 rounded text-xs">
                          {feature.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {level.class_specific && Object.keys(level.class_specific).length > 0 && (
                  <div>
                    <div className="text-amber-200 text-sm font-medium mb-1">Class Features:</div>
                    <div className="text-amber-300 text-xs">
                      {Object.entries(level.class_specific).map(([key, value]) => (
                        <div key={key}>
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {classData._classLevels.length > 5 && (
              <div className="text-amber-400 text-sm text-center">
                ... and {classData._classLevels.length - 5} more levels
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spells */}
      {classData._spells && classData._spells.length > 0 && (
        <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">✨</span>
            <h3 className="text-xl font-bold text-amber-100">Available Spells</h3>
            <SpellsTooltip />
          </div>
          <div className="space-y-3">
            {classData._spells.slice(0, 10).map((spell, index) => (
              <div key={index} className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="text-amber-100 font-medium">
                    {spell.name}
                  </div>
                  <div className="text-amber-300 text-sm">
                    Level {spell.level}
                  </div>
                </div>
              </div>
            ))}
            {classData._spells.length > 10 && (
              <div className="text-amber-400 text-sm text-center">
                ... and {classData._spells.length - 10} more spells
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hit Die Tooltip Component
 */
function HitDieTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
        aria-label="Hit Die information"
      >
        ℹ️
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-amber-500/30 rounded-lg p-3 shadow-lg z-10">
          <div className="text-amber-100 text-sm font-medium mb-1">
            Hit Die
          </div>
          <div className="text-amber-200 text-xs leading-relaxed">
            The type of die you roll to determine your hit points when you gain a level. 
            You add your Constitution modifier to this roll.
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Spellcasting Tooltip Component
 */
function SpellcastingTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
        aria-label="Spellcasting information"
      >
        ℹ️
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-amber-500/30 rounded-lg p-3 shadow-lg z-10">
          <div className="text-amber-100 text-sm font-medium mb-1">
            Spellcasting Ability
          </div>
          <div className="text-amber-200 text-xs leading-relaxed">
            The ability score used to determine your spell attack bonus and spell save DC. 
            This affects how powerful your spells are.
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Saving Throw Tooltip Component
 */
function SavingThrowTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() =>setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
        aria-label="Saving throw information"
      >
        ℹ️
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-amber-500/30 rounded-lg p-3 shadow-lg z-10">
          <div className="text-amber-100 text-sm font-medium mb-1">
            Saving Throw Proficiencies
          </div>
          <div className="text-amber-200 text-xs leading-relaxed">
            You add your proficiency bonus to these ability score rolls. 
            This makes you better at avoiding certain types of danger.
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Proficiency Tooltip Component
 */
function ProficiencyTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
        aria-label="Proficiency information"
      >
        ℹ️
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-amber-500/30 rounded-lg p-3 shadow-lg z-10">
          <div className="text-amber-100 text-sm font-medium mb-1">
            Proficiencies
          </div>
          <div className="text-amber-200 text-xs leading-relaxed">
            You can add your proficiency bonus to rolls with these weapons, armor, or skills. 
            This represents your training and expertise.
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Proficiency Choice Tooltip Component
 */
function ProficiencyChoiceTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
        aria-label="Proficiency choice information"
      >
        ℹ️
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-amber-500/30 rounded-lg p-3 shadow-lg z-10">
          <div className="text-amber-100 text-sm font-medium mb-1">
            Proficiency Choices
          </div>
          <div className="text-amber-200 text-xs leading-relaxed">
            You get to choose a limited number of proficiencies from the listed options. 
            This allows you to customize your character&apos;s abilities.
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Starting Equipment Tooltip Component
 */
function StartingEquipmentTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
        aria-label="Starting equipment information"
      >
        ℹ️
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-amber-500/30 rounded-lg p-3 shadow-lg z-10">
          <div className="text-amber-100 text-sm font-medium mb-1">
            Starting Equipment
          </div>
          <div className="text-amber-200 text-xs leading-relaxed">
            The gear your character begins with. This represents the equipment 
            typical for someone of your class and background.
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Spellcasting Rules Tooltip Component
 */
function SpellcastingRulesTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
        aria-label="Spellcasting rules information"
      >
        ℹ️
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-amber-500/30 rounded-lg p-3 shadow-lg z-10">
          <div className="text-amber-100 text-sm font-medium mb-1">
            Spellcasting Rules
          </div>
          <div className="text-amber-200 text-xs leading-relaxed">
            How your class learns and casts spells. This includes spell slots, 
            spell preparation, and any special class features related to magic.
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Subclass Tooltip Component
 */
function SubclassTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
        aria-label="Subclass information"
      >
        ℹ️
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-amber-500/30 rounded-lg p-3 shadow-lg z-10">
          <div className="text-amber-100 text-sm font-medium mb-1">
            Subclasses
          </div>
          <div className="text-amber-200 text-xs leading-relaxed">
            Specializations within your class that you choose at 1st, 2nd, or 3rd level. 
            Each subclass offers unique features and abilities.
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Starting Equipment Options Tooltip Component
 */
function StartingEquipmentOptionsTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
        aria-label="Starting equipment options information"
      >
        ℹ️
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-amber-500/30 rounded-lg p-3 shadow-lg z-10">
          <div className="text-amber-100 text-sm font-medium mb-1">
            Starting Equipment Options
          </div>
          <div className="text-amber-200 text-xs leading-relaxed">
            When creating your character, you can choose from these equipment packages. 
            Each option gives you different gear to start your adventure with.
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Multi-classing Tooltip Component
 */
function MultiClassingTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
        aria-label="Multi-classing information"
      >
        ℹ️
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-amber-500/30 rounded-lg p-3 shadow-lg z-10">
          <div className="text-amber-100 text-sm font-medium mb-1">
            Multi-classing
          </div>
          <div className="text-amber-200 text-xs leading-relaxed">
            Rules for combining this class with others. Shows ability score requirements 
            and what proficiencies you gain when taking this class as a second class.
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Class Levels Tooltip Component
 */
function ClassLevelsTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
        aria-label="Class levels information"
      >
        ℹ️
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-amber-500/30 rounded-lg p-3 shadow-lg z-10">
          <div className="text-amber-100 text-sm font-medium mb-1">
            Class Levels
          </div>
          <div className="text-amber-200 text-xs leading-relaxed">
            Shows what features and abilities you gain at each level. 
            This helps you plan your character&apos;s progression and understand 
            when you unlock new powers.
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Spells Tooltip Component
 */
function SpellsTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
        aria-label="Spells information"
      >
        ℹ️
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-amber-500/30 rounded-lg p-3 shadow-lg z-10">
          <div className="text-amber-100 text-sm font-medium mb-1">
            Available Spells
          </div>
          <div className="text-amber-200 text-xs leading-relaxed">
            Spells that this class can learn. The level indicates how powerful 
            the spell is, with higher levels being more potent but requiring 
            more spell slots to cast.
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Get class emoji based on class index
 */
function getClassEmoji(classIndex) {
  const emojiMap = {
    'barbarian': '🗡️',
    'bard': '🎭',
    'cleric': '⛪',
    'druid': '🌿',
    'fighter': '⚔️',
    'monk': '🥋',
    'paladin': '🛡️',
    'ranger': '🏹',
    'rogue': '🗡️',
    'sorcerer': '✨',
    'warlock': '👹',
    'wizard': '🧙'
  };
  return emojiMap[classIndex] || '⚔️';
}

/**
 * Get class description based on class index
 */
function getClassDescription(classIndex) {
  const descriptions = {
    'barbarian': 'Fierce warrior with primal rage',
    'bard': 'Charismatic performer and spellcaster',
    'cleric': 'Divine spellcaster and healer',
    'druid': 'Nature-based spellcaster and shapeshifter',
    'fighter': 'Master of weapons and armor',
    'monk': 'Martial artist with ki powers',
    'paladin': 'Divine warrior with holy powers',
    'ranger': 'Wilderness warrior and tracker',
    'rogue': 'Sneaky master of stealth and skills',
    'sorcerer': 'Innate spellcaster with magical bloodline',
    'warlock': 'Pact-based spellcaster with otherworldly patron',
    'wizard': 'Scholar of arcane magic and spells'
  };
  return descriptions[classIndex] || 'A player character class';
}
