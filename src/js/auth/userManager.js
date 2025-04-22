/**
 * User Account Manager for Sokoban
 * Handles account creation, authentication, and progress syncing
 */
import * as firebaseService from './firebase.js';
import { game } from '../game.js';

/**
 * User progress data structure
 * @typedef {Object} UserProgress
 * @property {number} currentLevel - Current level index
 * @property {Array<number>} completedLevels - Array of completed level indices
 * @property {Object} timeAttackBestTimes - Object mapping level keys to best times
 * @property {Object} levelStats - Object storing statistics for each level
 * @property {Object} levelStats.levelX - Stats for level X (where X is the level index)
 * @property {number} levelStats.levelX.bestMoves - Best (lowest) number of moves
 * @property {number} levelStats.levelX.bestPushes - Best (lowest) number of pushes
 * @property {number} levelStats.levelX.bestTime - Best (lowest) completion time in ms
 */

/**
 * User profile data structure
 * @typedef {Object} UserProfile
 * @property {string} displayName - User's display name
 * @property {string} email - User's email
 * @property {string} photoURL - User's profile photo URL (optional)
 */

class UserManager {
  constructor() {
    this.isAuthenticated = false;
    this.userProfile = null;
    this.progress = null;
    this.syncInProgress = false;
    this.unsubscribeAuth = null;
    this.onAuthStateChangedCallback = null;
    this.onProgressLoadedCallback = null;
  }
  
  /**
   * Initialize the user manager with callbacks
   * @param {Function} authStateChangedCallback - Callback for auth state changes
   * @param {Function} progressLoadedCallback - Callback for when progress is loaded
   */
  init(authStateChangedCallback, progressLoadedCallback) {
    this.onAuthStateChangedCallback = authStateChangedCallback;
    this.onProgressLoadedCallback = progressLoadedCallback;
    
    // Initialize auth listener
    this._initAuthListener();
  }
  
  /**
   * Initialize authentication state listener
   * @private
   */
  _initAuthListener() {
    this.unsubscribeAuth = firebaseService.onAuthChange(user => {
      if (user) {
        this.isAuthenticated = true;
        this.userProfile = {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL
        };
        
        // Load user progress when authenticated
        this._loadProgressFromCloud();
      } else {
        this.isAuthenticated = false;
        this.userProfile = null;
        this.progress = null;
      }
      
      // Notify the game that authentication state changed through the callback
      if (this.onAuthStateChangedCallback) {
        this.onAuthStateChangedCallback(this.isAuthenticated, this.userProfile);
      }
    });
  }
  
  /**
   * Register a new user account
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} displayName - User display name
   * @returns {Promise<boolean>} - Promise resolving to success status
   */
  async register(email, password, displayName) {
    try {
      await firebaseService.registerUser(email, password, displayName);
      return true;
    } catch (error) {
      console.error("Registration failed:", error.message);
      throw error;
    }
  }
  
  /**
   * Sign in an existing user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<boolean>} - Promise resolving to success status
   */
  async signIn(email, password) {
    try {
      await firebaseService.signInUser(email, password);
      return true;
    } catch (error) {
      console.error("Sign in failed:", error.message);
      throw error;
    }
  }
  
  /**
   * Sign out the current user
   * @returns {Promise<boolean>} - Promise resolving to success status
   */
  async signOut() {
    try {
      // Sync progress before signing out
      await this.syncProgress();
      await firebaseService.signOutUser();
      return true;
    } catch (error) {
      console.error("Sign out failed:", error.message);
      throw error;
    }
  }
  
  /**
   * Check if user is logged in
   * @returns {boolean} - True if user is logged in
   */
  isLoggedIn() {
    return this.isAuthenticated;
  }
  
  /**
   * Get current user profile
   * @returns {UserProfile|null} - User profile or null if not authenticated
   */
  getUserProfile() {
    return this.userProfile;
  }
  
  /**
   * Sync user progress between local storage and cloud
   * @param {boolean} [forceSync=false] - Force synchronization even if recently synced
   * @returns {Promise<boolean>} - Promise resolving to success status
   */
  async syncProgress(forceSync = false) {
    // Don't sync if not authenticated or sync is already in progress
    if (!this.isAuthenticated || this.syncInProgress) {
      return false;
    }
    
    this.syncInProgress = true;
    
    try {
      if (this.progress) {
        // We have local progress, update it with latest game state
        this._updateProgressFromGame();
        
        // Save the updated progress to the cloud
        await firebaseService.saveUserProgress(this.progress);
      } else {
        // No local progress, try to load from cloud
        await this._loadProgressFromCloud();
      }
      
      this.syncInProgress = false;
      return true;
    } catch (error) {
      console.error("Progress sync failed:", error);
      this.syncInProgress = false;
      throw error;
    }
  }
  
  /**
   * Update local progress data from current game state
   * @private
   */
  _updateProgressFromGame() {
    if (!game || !this.progress) {
      return;
    }
    
    // Update current level
    this.progress.currentLevel = game.currentLevel;
    
    // Update completed levels if current level is completed
    const currentLevelIndex = game.currentLevel;
    if (!this.progress.completedLevels.includes(currentLevelIndex)) {
      this.progress.completedLevels.push(currentLevelIndex);
    }
    
    // Update time attack best times
    if (game.gameMode === 'time_attack' && game.gameModeSettings && 
        game.gameModeSettings.timeAttack && game.gameModeSettings.timeAttack.bestTimes) {
      
      this.progress.timeAttackBestTimes = {
        ...this.progress.timeAttackBestTimes,
        ...game.gameModeSettings.timeAttack.bestTimes
      };
    }
    
    // Save level statistics (for normal mode)
    if (game.gameMode === 'normal' && game.state === 'win' && game.score) {
      // Initialize levelStats if it doesn't exist
      if (!this.progress.levelStats) {
        this.progress.levelStats = {};
      }
      
      const levelKey = `level_${currentLevelIndex}`;
      const currentStats = {
        moves: game.score.moves,
        pushes: game.score.pushes,
        time: game.score.elapsedTime
      };
      
      // Get existing stats or initialize new ones
      const existingStats = this.progress.levelStats[levelKey] || {};
      
      // Update best stats
      this.progress.levelStats[levelKey] = {
        bestMoves: existingStats.bestMoves ? Math.min(existingStats.bestMoves, currentStats.moves) : currentStats.moves,
        bestPushes: existingStats.bestPushes ? Math.min(existingStats.bestPushes, currentStats.pushes) : currentStats.pushes,
        bestTime: existingStats.bestTime ? Math.min(existingStats.bestTime, currentStats.time) : currentStats.time,
      };
    }
  }
  
  /**
   * Load progress data from cloud storage
   * @private
   * @returns {Promise<void>}
   */
  async _loadProgressFromCloud() {
    if (!this.isAuthenticated) {
      return;
    }
    
    try {
      // Load progress from cloud
      this.progress = await firebaseService.loadUserProgress();
      
      // Notify the callback that progress was loaded
      if (this.onProgressLoadedCallback && this.progress) {
        this.onProgressLoadedCallback(this.progress);
      }
    } catch (error) {
      console.warn("Failed to load progress from cloud:", error);
      
      // Initialize default progress if loading failed - don't prevent the app from working
      if (!this.progress) {
        this.progress = {
          currentLevel: 0,
          completedLevels: [],
          timeAttackBestTimes: {},
          levelStats: {}
        };
        
        // Attempt to initialize the user document with default progress
        try {
          if (firebaseService.getCurrentUser()) {
            await firebaseService.saveUserProgress(this.progress);
            console.log("Created initial progress document for user");
          }
        } catch (saveError) {
          console.warn("Could not save initial progress:", saveError);
        }
      }
      
      // Still notify the callback with the default progress
      if (this.onProgressLoadedCallback && this.progress) {
        this.onProgressLoadedCallback(this.progress);
      }
    }
  }
  
  /**
   * Apply loaded progress data to the current game
   * @private
   */
  _applyProgressToGame() {
    if (!game || !this.progress) {
      return;
    }
    
    // Apply current level
    if (game.setCurrentLevel && typeof this.progress.currentLevel === 'number') {
      game.setCurrentLevel(this.progress.currentLevel);
    }
    
    // Apply time attack best times
    if (game.gameModeSettings && game.gameModeSettings.timeAttack && this.progress.timeAttackBestTimes) {
      game.gameModeSettings.timeAttack.bestTimes = {
        ...game.gameModeSettings.timeAttack.bestTimes,
        ...this.progress.timeAttackBestTimes
      };
    }
    
    // Notify game that progress was loaded
    if (game.onProgressLoaded) {
      game.onProgressLoaded(this.progress);
    }
  }
  
  /**
   * Schedule periodic progress synchronization
   * @param {number} [intervalMs=60000] - Sync interval in milliseconds (default: 1 minute)
   */
  startAutoSync(intervalMs = 60000) {
    // Clear any existing sync intervals
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      if (this.isAuthenticated) {
        this.syncProgress().catch(err => console.warn('Auto sync failed:', err));
      }
    }, intervalMs);
  }
  
  /**
   * Stop automatic progress synchronization
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  /**
   * Clean up resources before destruction
   */
  destroy() {
    this.stopAutoSync();
    
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
      this.unsubscribeAuth = null;
    }
  }
}

// Create and export a singleton instance
const userManager = new UserManager();
export default userManager;