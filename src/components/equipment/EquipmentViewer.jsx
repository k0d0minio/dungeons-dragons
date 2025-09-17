import React, { useState, useEffect } from 'react';
import { fetchList, fetchByUrl, fetchMultipleByUrls } from '../../lib/dnd-api';

export default function EquipmentViewer({ onBack }) {
  const [equipmentCategories, setEquipmentCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [equipmentItems, setEquipmentItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadEquipmentCategories();
  }, []);

  const loadEquipmentCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const categories = await fetchList('equipment-categories');
      setEquipmentCategories(categories.results || []);
    } catch (err) {
      setError(err.message);
      console.error('Error loading equipment categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryItems = async (category) => {
    try {
      setLoading(true);
      setError(null);
      
      const categoryData = await fetchByUrl(category.url);
      setEquipmentItems(categoryData.equipment || []);
      setSelectedCategory(category);
    } catch (err) {
      setError(err.message);
      console.error('Error loading category items:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadItemDetails = async (item) => {
    try {
      setLoading(true);
      setError(null);
      
      const details = await fetchByUrl(item.url);
      
      // Extract all related URLs that need to be fetched
      const relatedUrls = [];
      
      // Add damage type URLs
      if (details.damage?.damage_type?.url) {
        relatedUrls.push(details.damage.damage_type.url);
      }
      if (details.two_handed_damage?.damage_type?.url) {
        relatedUrls.push(details.two_handed_damage.damage_type.url);
      }
      
      // Add weapon property URLs
      if (details.properties) {
        details.properties.forEach(prop => {
          if (prop.url) relatedUrls.push(prop.url);
        });
      }
      
      // Add equipment category URLs
      if (details.equipment_category?.url) {
        relatedUrls.push(details.equipment_category.url);
      }
      if (details.gear_category?.url) {
        relatedUrls.push(details.gear_category.url);
      }
      if (details.weapon_category) {
        // Weapon category is a string, not a URL
      }
      if (details.armor_category) {
        // Armor category is a string, not a URL
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
        }
      }
      
      // Merge the item details with fetched related data
      const enrichedDetails = {
        ...details,
        _relatedData: relatedData
      };
      
      setItemDetails(enrichedDetails);
    } catch (err) {
      setError(err.message);
      console.error('Error loading item details:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = equipmentCategories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredItems = equipmentItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const goBack = () => {
    if (selectedItem) {
      // If viewing a specific item, go back to item list
      setSelectedItem(null);
      setItemDetails(null);
      setError(null);
    } else if (selectedCategory) {
      // If viewing items in a category, go back to category list
      setSelectedCategory(null);
      setEquipmentItems([]);
      setError(null);
    } else if (onBack) {
      // If at category list level, go back to main overview
      onBack();
    }
  };

  if (loading && !selectedItem && !selectedCategory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⚔️</div>
          <div className="text-amber-200 text-xl font-serif">Loading equipment...</div>
        </div>
      </div>
    );
  }

  if (error && !selectedItem && !selectedCategory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-red-400 text-xl font-serif mb-4">Error loading equipment</div>
          <div className="text-amber-200 text-sm mb-4">{error}</div>
          <button
            onClick={loadEquipmentCategories}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show item details
  if (selectedItem && itemDetails) {
    return (
      <EquipmentDetails 
        item={selectedItem} 
        itemData={itemDetails} 
        onBack={goBack}
        loading={loading}
        error={error}
      />
    );
  }

  // Show items in category
  if (selectedCategory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={goBack}
              className="bg-slate-700 hover:bg-slate-600 text-amber-200 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              ← Back
            </button>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{getCategoryEmoji(selectedCategory.index)}</span>
              <div>
                <h1 className="text-3xl font-bold text-amber-100">{selectedCategory.name}</h1>
                <p className="text-amber-300 text-sm">Equipment Category</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-amber-500/30 rounded-lg px-4 py-3 text-amber-100 placeholder-amber-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Items Grid */}
          {loading ? (
            <div className="text-center py-8">
              <div className="text-amber-200">Loading items...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setSelectedItem(item);
                    loadItemDetails(item);
                  }}
                  className="bg-slate-800/60 hover:bg-slate-700/60 rounded-xl p-4 border border-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getItemEmoji(item.index)}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-amber-100">{item.name}</h3>
                      <p className="text-amber-300 text-sm">Click to view details</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredItems.length === 0 && !loading && (
            <div className="text-center py-8">
              <div className="text-amber-400">No items found</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show categories list
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={goBack}
            className="bg-slate-700 hover:bg-slate-600 text-amber-200 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <span className="text-4xl">⚔️</span>
            <div>
              <h1 className="text-3xl font-bold text-amber-100">Equipment</h1>
              <p className="text-amber-300 text-sm">Browse D&D 5e Equipment</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search equipment categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-amber-500/30 rounded-lg px-4 py-3 text-amber-100 placeholder-amber-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category, index) => (
            <div
              key={index}
              onClick={() => loadCategoryItems(category)}
              className="bg-slate-800/60 hover:bg-slate-700/60 rounded-xl p-6 border border-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{getCategoryEmoji(category.index)}</span>
                <div>
                  <h3 className="text-xl font-semibold text-amber-100">{category.name}</h3>
                  <p className="text-amber-300 text-sm">Click to browse items</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-8">
            <div className="text-amber-400">No categories found</div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Equipment Details Component
 */
function EquipmentDetails({ item, itemData, onBack, loading, error }) {
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⚔️</div>
          <div className="text-amber-200 text-xl font-serif">Loading item details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-red-400 text-xl font-serif mb-4">Error loading item details</div>
          <div className="text-amber-200 text-sm mb-4">{error}</div>
          <button
            onClick={onBack}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="bg-slate-700 hover:bg-slate-600 text-amber-200 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{getItemEmoji(itemData.index)}</span>
            <div>
              <h1 className="text-3xl font-bold text-amber-100">{itemData.name}</h1>
              <p className="text-amber-300 text-sm">
                {itemData.equipment_category?.name || 'Equipment'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
            <h2 className="text-xl font-bold text-amber-100 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Cost */}
              {itemData.cost && (
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-amber-200 text-sm font-medium mb-1">Cost</div>
                  <div className="text-amber-100 font-bold">
                    {itemData.cost.quantity} {itemData.cost.unit}
                  </div>
                </div>
              )}

              {/* Weight */}
              {itemData.weight && (
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-amber-200 text-sm font-medium mb-1">Weight</div>
                  <div className="text-amber-100 font-bold">{itemData.weight} lbs</div>
                </div>
              )}

              {/* Equipment Category */}
              {itemData.equipment_category && (
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-amber-200 text-sm font-medium mb-1">Category</div>
                  <div className="text-amber-100 font-bold">
                    {itemData.equipment_category.name}
                  </div>
                </div>
              )}

              {/* Gear Category */}
              {itemData.gear_category && (
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-amber-200 text-sm font-medium mb-1">Gear Type</div>
                  <div className="text-amber-100 font-bold">
                    {itemData.gear_category.name}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Weapon Information */}
          {itemData.weapon_category && (
            <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">⚔️</span>
                <h2 className="text-xl font-bold text-amber-100">Weapon Information</h2>
                <WeaponTooltip />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Weapon Category */}
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-amber-200 text-sm font-medium mb-1">Weapon Category</div>
                  <div className="text-amber-100 font-bold">{itemData.weapon_category}</div>
                </div>

                {/* Weapon Range */}
                {itemData.weapon_range && (
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-amber-200 text-sm font-medium mb-1">Range</div>
                    <div className="text-amber-100 font-bold">{itemData.weapon_range}</div>
                  </div>
                )}

                {/* Damage */}
                {itemData.damage && (
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-amber-200 text-sm font-medium mb-1">Damage</div>
                    <div className="text-amber-100 font-bold">
                      {itemData.damage.damage_dice} {itemData.damage.damage_type?.name || 'damage'}
                    </div>
                  </div>
                )}

                {/* Range */}
                {itemData.range && (
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-amber-200 text-sm font-medium mb-1">Range</div>
                    <div className="text-amber-100 font-bold">
                      {itemData.range.normal} ft
                      {itemData.range.long && ` / ${itemData.range.long} ft`}
                    </div>
                  </div>
                )}
              </div>

              {/* Two-handed Damage */}
              {itemData.two_handed_damage && (
                <div className="mt-4 bg-slate-700/50 rounded-lg p-3">
                  <div className="text-amber-200 text-sm font-medium mb-1">Two-handed Damage</div>
                  <div className="text-amber-100 font-bold">
                    {itemData.two_handed_damage.damage_dice} {itemData.two_handed_damage.damage_type?.name || 'damage'}
                  </div>
                </div>
              )}

              {/* Properties */}
              {itemData.properties && itemData.properties.length > 0 && (
                <div className="mt-4">
                  <div className="text-amber-200 text-sm font-medium mb-2">Properties</div>
                  <div className="flex flex-wrap gap-2">
                    {itemData.properties.map((prop, index) => (
                      <span key={index} className="bg-amber-500/20 text-amber-200 px-3 py-1 rounded-full text-sm">
                        {prop.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Armor Information */}
          {itemData.armor_category && (
            <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🛡️</span>
                <h2 className="text-xl font-bold text-amber-100">Armor Information</h2>
                <ArmorTooltip />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Armor Category */}
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-amber-200 text-sm font-medium mb-1">Armor Category</div>
                  <div className="text-amber-100 font-bold">{itemData.armor_category}</div>
                </div>

                {/* Armor Class */}
                {itemData.armor_class && (
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-amber-200 text-sm font-medium mb-1">Armor Class</div>
                    <div className="text-amber-100 font-bold">
                      {itemData.armor_class.base}
                      {itemData.armor_class.dex_bonus && ' + Dex modifier'}
                    </div>
                  </div>
                )}

                {/* Strength Minimum */}
                {itemData.str_minimum && (
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-amber-200 text-sm font-medium mb-1">Strength Required</div>
                    <div className="text-amber-100 font-bold">{itemData.str_minimum}</div>
                  </div>
                )}

                {/* Stealth Disadvantage */}
                {itemData.stealth_disadvantage !== undefined && (
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-amber-200 text-sm font-medium mb-1">Stealth</div>
                    <div className="text-amber-100 font-bold">
                      {itemData.stealth_disadvantage ? 'Disadvantage' : 'No penalty'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contents */}
          {itemData.contents && itemData.contents.length > 0 && (
            <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">📦</span>
                <h2 className="text-xl font-bold text-amber-100">Contents</h2>
                <ContentsTooltip />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {itemData.contents.map((content, index) => (
                  <div key={index} className="bg-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-amber-100 font-medium">
                        {content.item?.name || 'Unknown Item'}
                      </div>
                      <div className="text-amber-300 text-sm font-bold">
                        {content.quantity}x
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {itemData.desc && itemData.desc.length > 0 && (
            <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
              <h2 className="text-xl font-bold text-amber-100 mb-4">Description</h2>
              <div className="text-amber-200 leading-relaxed">
                {Array.isArray(itemData.desc) ? itemData.desc.join(' ') : itemData.desc}
              </div>
            </div>
          )}

          {/* Properties */}
          {itemData.properties && itemData.properties.length > 0 && (
            <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">⚡</span>
                <h2 className="text-xl font-bold text-amber-100">Properties</h2>
                <PropertiesTooltip />
              </div>
              <div className="flex flex-wrap gap-2">
                {itemData.properties.map((prop, index) => (
                  <span key={index} className="bg-amber-500/20 text-amber-200 px-3 py-1 rounded-full text-sm">
                    {prop.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Special Properties */}
          {itemData.special && itemData.special.length > 0 && (
            <div className="bg-slate-800/60 rounded-xl p-6 border border-amber-500/20">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">✨</span>
                <h2 className="text-xl font-bold text-amber-100">Special Properties</h2>
                <SpecialPropertiesTooltip />
              </div>
              <div className="text-amber-200 leading-relaxed">
                {Array.isArray(itemData.special) ? itemData.special.join(' ') : itemData.special}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Weapon Tooltip Component
 */
function WeaponTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
        aria-label="Weapon information"
      >
        ℹ️
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-amber-500/30 rounded-lg p-3 shadow-lg z-10">
          <div className="text-amber-100 text-sm font-medium mb-1">
            Weapon Information
          </div>
          <div className="text-amber-200 text-xs leading-relaxed">
            Shows weapon category, damage dice, range, and special properties. 
            Damage dice determine how much damage the weapon deals on a hit.
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Armor Tooltip Component
 */
function ArmorTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
        aria-label="Armor information"
      >
        ℹ️
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-amber-500/30 rounded-lg p-3 shadow-lg z-10">
          <div className="text-amber-100 text-sm font-medium mb-1">
            Armor Information
          </div>
          <div className="text-amber-200 text-xs leading-relaxed">
            Shows armor class (AC), strength requirements, and stealth penalties. 
            AC determines how hard you are to hit in combat.
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Contents Tooltip Component
 */
function ContentsTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
        aria-label="Contents information"
      >
        ℹ️
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-amber-500/30 rounded-lg p-3 shadow-lg z-10">
          <div className="text-amber-100 text-sm font-medium mb-1">
            Contents
          </div>
          <div className="text-amber-200 text-xs leading-relaxed">
            Lists all items included in this equipment pack. Equipment packs 
            are pre-made collections of useful adventuring gear.
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Properties Tooltip Component
 */
function PropertiesTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
        aria-label="Properties information"
      >
        ℹ️
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-amber-500/30 rounded-lg p-3 shadow-lg z-10">
          <div className="text-amber-100 text-sm font-medium mb-1">
            Properties
          </div>
          <div className="text-amber-200 text-xs leading-relaxed">
            Special characteristics of this item. These can affect how the item 
            is used, its effectiveness, or any special rules that apply.
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Special Properties Tooltip Component
 */
function SpecialPropertiesTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-amber-400 hover:text-amber-300 transition-colors text-sm"
        aria-label="Special properties information"
      >
        ℹ️
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-amber-500/30 rounded-lg p-3 shadow-lg z-10">
          <div className="text-amber-100 text-sm font-medium mb-1">
            Special Properties
          </div>
          <div className="text-amber-200 text-xs leading-relaxed">
            Unique abilities or effects of this item. These often include 
            detailed rules for how the item works in the game.
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Get category emoji based on category index
 */
function getCategoryEmoji(categoryIndex) {
  const emojiMap = {
    'adventuring-gear': '🎒',
    'ammunition': '🏹',
    'arcane-foci': '🔮',
    'armor': '🛡️',
    'artisans-tools': '🔨',
    'druidic-foci': '🌿',
    'equipment-packs': '🎒',
    'gaming-sets': '🎲',
    'heavy-armor': '🛡️',
    'holy-symbols': '⛪',
    'light-armor': '🛡️',
    'martial-melee-weapons': '⚔️',
    'martial-ranged-weapons': '🏹',
    'medium-armor': '🛡️',
    'musical-instruments': '🎵',
    'potion': '🧪',
    'ring': '💍',
    'rod': '🪄',
    'scroll': '📜',
    'shield': '🛡️',
    'simple-melee-weapons': '⚔️',
    'simple-ranged-weapons': '🏹',
    'staff': '🪄',
    'standard-gear': '🎒',
    'tool': '🔧',
    'wand': '🪄',
    'weapon': '⚔️',
    'wondrous-items': '✨'
  };
  return emojiMap[categoryIndex] || '⚔️';
}

/**
 * Get item emoji based on item index
 */
function getItemEmoji(itemIndex) {
  const emojiMap = {
    'longsword': '⚔️',
    'shortsword': '🗡️',
    'greatsword': '⚔️',
    'rapier': '🗡️',
    'dagger': '🗡️',
    'longbow': '🏹',
    'shortbow': '🏹',
    'crossbow': '🏹',
    'chain-mail': '🛡️',
    'leather-armor': '🛡️',
    'studded-leather': '🛡️',
    'plate-armor': '🛡️',
    'shield': '🛡️',
    'backpack': '🎒',
    'rope': '🪢',
    'torch': '🔥',
    'lantern': '🕯️',
    'potion': '🧪',
    'scroll': '📜',
    'wand': '🪄',
    'staff': '🪄',
    'ring': '💍',
    'amulet': '🔮',
    'cloak': '🧥',
    'boots': '👢',
    'gloves': '🧤',
    'belt': '🪢',
    'helmet': '⛑️',
    'gauntlets': '🧤',
    'bracers': '🧤'
  };
  return emojiMap[itemIndex] || '⚔️';
}
