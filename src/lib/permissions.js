// Permission system for role-based access control
// DM has full access, Players have limited access to their own data

/**
 * Check if user can access a resource
 * @param {Object} user - The authenticated user
 * @param {string} resourceType - Type of resource (character, note, inventory, combat)
 * @param {Object} resource - The resource being accessed
 * @param {string} action - Action being performed (read, write, delete)
 * @returns {boolean} - Whether user has permission
 */
export function hasPermission(user, resourceType, resource, action = 'read') {
  if (!user) return false;
  
  // DM has full access to everything
  if (user.role === 'DM') {
    return true;
  }
  
  // Players can only access their own data
  if (user.role === 'PLAYER') {
    switch (resourceType) {
      case 'character':
        return resource.userId === user.id;
      
      case 'note':
        // Players can read their own notes and DM notes
        // Players can write their own notes
        if (action === 'read') {
          return resource.userId === user.id || resource.type === 'DM';
        }
        if (action === 'write' || action === 'delete') {
          return resource.userId === user.id;
        }
        break;
      
      case 'inventory':
        return resource.userId === user.id;
      
      case 'combat':
        // Players can read combat sessions but not modify them
        if (action === 'read') {
          return true; // All players can see combat
        }
        if (action === 'write' || action === 'delete') {
          return false; // Only DM can modify combat
        }
        break;
      
      default:
        return false;
    }
  }
  
  return false;
}

/**
 * Filter resources based on user permissions
 * @param {Object} user - The authenticated user
 * @param {Array} resources - Array of resources to filter
 * @param {string} resourceType - Type of resources
 * @returns {Array} - Filtered resources user can access
 */
export function filterByPermissions(user, resources, resourceType) {
  if (!user || !resources) return [];
  
  // DM sees everything
  if (user.role === 'DM') {
    return resources;
  }
  
  // Players only see their own data + DM notes
  if (user.role === 'PLAYER') {
    return resources.filter(resource => {
      switch (resourceType) {
        case 'character':
          return resource.userId === user.id;
        
        case 'note':
          return resource.userId === user.id || resource.type === 'DM';
        
        case 'inventory':
          return resource.userId === user.id;
        
        case 'combat':
          return true; // All players can see combat
        
        default:
          return false;
      }
    });
  }
  
  return [];
}

/**
 * Get user's character (since each player has only 1 character)
 * @param {Object} user - The authenticated user
 * @param {Array} characters - Array of characters
 * @returns {Object|null} - User's character or null
 */
export function getUserCharacter(user, characters) {
  if (!user || !characters) return null;
  
  if (user.role === 'DM') {
    // DM can see all characters, return first one for reference
    return characters[0] || null;
  }
  
  if (user.role === 'PLAYER') {
    // Players have only one character
    return characters.find(char => char.userId === user.id) || null;
  }
  
  return null;
}

/**
 * Check if user can create a resource
 * @param {Object} user - The authenticated user
 * @param {string} resourceType - Type of resource
 * @returns {boolean} - Whether user can create this resource
 */
export function canCreate(user, resourceType) {
  if (!user) return false;
  
  // DM can create anything
  if (user.role === 'DM') {
    return true;
  }
  
  // Players can create their own data
  if (user.role === 'PLAYER') {
    switch (resourceType) {
      case 'character':
        return true; // Players can create their character
      
      case 'note':
        return true; // Players can create notes
      
      case 'inventory':
        return true; // Players can create inventory
      
      case 'combat':
        return false; // Only DM can create combat sessions
      
      default:
        return false;
    }
  }
  
  return false;
}

/**
 * Get DM-specific data for overview
 * @param {Object} user - The authenticated user
 * @param {Object} data - All data
 * @returns {Object} - DM-specific data view
 */
export function getDMView(user, data) {
  if (!user || user.role !== 'DM') {
    return null;
  }
  
  return {
    allCharacters: data.characters || [],
    allNotes: data.notes || [],
    allInventories: data.inventories || [],
    allCombatSessions: data.combatSessions || [],
    playerCount: data.characters?.length || 0,
    activeCombat: data.combatSessions?.find(session => session.isActive) || null
  };
}

/**
 * Get Player-specific data view
 * @param {Object} user - The authenticated user
 * @param {Object} data - All data
 * @returns {Object} - Player-specific data view
 */
export function getPlayerView(user, data) {
  if (!user || user.role !== 'PLAYER') {
    return null;
  }
  
  const userCharacter = getUserCharacter(user, data.characters || []);
  const userNotes = (data.notes || []).filter(note => 
    note.userId === user.id || note.type === 'DM'
  );
  const userInventory = (data.inventories || []).find(inv => 
    inv.userId === user.id
  );
  
  return {
    character: userCharacter,
    notes: userNotes,
    inventory: userInventory,
    combatSessions: data.combatSessions || [], // Players can see combat
    dmNotes: (data.notes || []).filter(note => note.type === 'DM')
  };
}

/**
 * Check if user is DM
 * @param {Object} user - The authenticated user
 * @returns {boolean} - Whether user is DM
 */
export function isDM(user) {
  return user && user.role === 'DM';
}

/**
 * Check if user is Player
 * @param {Object} user - The authenticated user
 * @returns {boolean} - Whether user is Player
 */
export function isPlayer(user) {
  return user && user.role === 'PLAYER';
}

/**
 * Get appropriate UI variant based on user role
 * @param {Object} user - The authenticated user
 * @param {string} defaultVariant - Default variant for players
 * @returns {string} - UI variant
 */
export function getUIVariant(user, defaultVariant = 'default') {
  if (isDM(user)) {
    return 'dm';
  }
  return defaultVariant;
}

/**
 * Get user-specific CSS classes based on role
 * @param {Object} user - The authenticated user
 * @returns {string} - CSS classes
 */
export function getRoleClasses(user) {
  if (isDM(user)) {
    return 'dm-view border-purple-500/30 bg-purple-900/10';
  }
  return 'player-view border-amber-500/30 bg-amber-900/10';
}
