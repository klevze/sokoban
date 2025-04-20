/**
 * Resources class for Sokoban
 * Handles loading and management of game assets (images and sounds)
 */

import { ASSET_PATHS } from './config/config.js';
import { I18n } from './i18n/i18n.js';

export class Resources {
    /**
     * Creates a new Resources instance
     * Initializes asset paths and containers
     */
    constructor() {
        // Image paths to load
        this.toLoad = {
            player: ASSET_PATHS.IMAGES.PLAYER,
            tiles: ASSET_PATHS.IMAGES.TILES,
            main: ASSET_PATHS.IMAGES.MAIN_BG,
            logo: ASSET_PATHS.IMAGES.LOGO,
            btnPlay: ASSET_PATHS.IMAGES.BTN_PLAY,
            woodPanel: ASSET_PATHS.IMAGES.WOOD_PANEL,
            levelBackground: ASSET_PATHS.IMAGES.LEVEL_BG,
            // Score icons
            scoreLevel: ASSET_PATHS.IMAGES.SCORE_LEVEL,
            scoreMoves: ASSET_PATHS.IMAGES.SCORE_MOVES,
            scorePushes: ASSET_PATHS.IMAGES.SCORE_PUSHES,
            scoreTime: ASSET_PATHS.IMAGES.SCORE_TIME,
            scoreBoxes: ASSET_PATHS.IMAGES.SCORE_BOXES,
            // Top action buttons
            ACTION_HOME: ASSET_PATHS.IMAGES.ACTION_HOME,
            ACTION_LEVEL: ASSET_PATHS.IMAGES.ACTION_LEVEL,
            ACTION_MUTE: ASSET_PATHS.IMAGES.ACTION_MUTE,
            ACTION_PAUSE: ASSET_PATHS.IMAGES.ACTION_PAUSE,
            ACTION_RESTART: ASSET_PATHS.IMAGES.ACTION_RESTART,
        };

        // Container for loaded images
        this.images = {};
        this.loadPromise = null;
        this.loadingProgress = 0;
        this.totalAssets = Object.keys(this.toLoad).length;
        
        // Initialize internationalization
        this.i18n = new I18n();
        
        // Audio elements for game sounds and music - use relative paths without leading slash
        this.sound = {
            //running: new Audio("./assets/sound/16_human_walk_stone_1.wav"),  // Player movement sound
            //pushing: new Audio("./assets/sound/04_sack_open_1.wav"),         // Box pushing sound
            //boxOnGoal: new Audio("./assets/sound/08_human_charge_1.wav"),    // Box placed on goal
            
            running: new Audio(this._makeRelativePath(ASSET_PATHS.SOUNDS.RUNNING)),  // Player movement sound
            pushing: new Audio(this._makeRelativePath(ASSET_PATHS.SOUNDS.PUSHING)),         // Box pushing sound
            boxOnGoal: new Audio(this._makeRelativePath(ASSET_PATHS.SOUNDS.BOXONGOAL)),    // Box placed on goal

            victory: new Audio(this._makeRelativePath(ASSET_PATHS.SOUNDS.VICTORY)),  // Level completion
            music: new Audio(this._makeRelativePath(ASSET_PATHS.SOUNDS.MUSIC)),      // Background music
            whistle: new Audio(this._makeRelativePath(ASSET_PATHS.SOUNDS.WHISTLE))   // Idle player sound
        };
        
        // Configure audio settings
        this._configureAudio();
    }
    
    /**
     * Configures default audio settings for game sounds
     * @private
     */
    _configureAudio() {
        // Set background music to loop and lower volume
        this.sound.music.loop = true;
        this.sound.music.volume = 0.4;
        
        // Configure other sounds
        this.sound.running.volume = 0.7;
        this.sound.pushing.volume = 0.6;
        this.sound.boxOnGoal.volume = 0.6;
        this.sound.victory.volume = 0.8;
        this.sound.whistle.volume = 0.7;
        
        // Add error handling for audio elements
        Object.values(this.sound).forEach(audio => {
            audio.addEventListener('error', (e) => {
                console.warn(`Audio failed to load: ${audio.src}`, e);
            });
        });
    }

    /**
     * Loads all game images with progress tracking
     * @param {Function} [progressCallback] - Optional callback for loading progress updates
     * @returns {Promise} A promise that resolves when all images are loaded
     */
    loadImages(progressCallback = null) {
        let loadedCount = 0;
        
        const promises = Object.entries(this.toLoad).map(([key, path]) => {
            return new Promise((resolve) => {
                const img = new Image();
                
                img.onload = () => {
                    this.images[key] = {
                        image: img,
                        isLoaded: true
                    };
                    
                    // Update loading progress
                    loadedCount++;
                    this.loadingProgress = Math.floor((loadedCount / this.totalAssets) * 100);
                    
                    // Call progress callback if provided
                    if (progressCallback && typeof progressCallback === 'function') {
                        progressCallback(this.loadingProgress);
                    }
                    
                    resolve();
                };
                
                img.onerror = (e) => {
                    console.error(`Failed to load image: ${path}`, e);
                    
                    // Create placeholder for failed image to prevent errors
                    this.images[key] = {
                        image: new Image(),
                        isLoaded: false,
                        error: true
                    };
                    
                    // Update loading progress even on error
                    loadedCount++;
                    this.loadingProgress = Math.floor((loadedCount / this.totalAssets) * 100);
                    
                    // Still resolve to continue game loading despite error
                    resolve();
                };
                
                // Start loading the image
                img.src = path;
            });
        });

        this.loadPromise = Promise.all(promises);
        return this.loadPromise;
    }
    
    /**
     * Loads all game assets (images and sounds)
     * @param {Function} [progressCallback] - Optional callback for loading progress updates
     * @returns {Promise} A promise that resolves when all assets are loaded
     */
    loadAll(progressCallback = null) {
        // Load both images and prepare sounds
        return this.loadImages(progressCallback).then(() => {
            // Preload sounds with error handling
            const audioPromises = Object.values(this.sound).map(audio => {
                return new Promise((resolve) => {
                    // Use the load() method to preload audio
                    audio.load();
                    
                    // Set up event listeners for audio
                    const handleLoaded = () => {
                        audio.removeEventListener('canplaythrough', handleLoaded);
                        audio.removeEventListener('error', handleError);
                        resolve();
                    };
                    
                    const handleError = () => {
                        audio.removeEventListener('canplaythrough', handleLoaded);
                        audio.removeEventListener('error', handleError);
                        console.warn(`Audio preload issue: ${audio.src}`);
                        resolve(); // Resolve anyway to not block game loading
                    };
                    
                    // Set timeout to avoid waiting too long for audio loading
                    const timeout = setTimeout(() => {
                        audio.removeEventListener('canplaythrough', handleLoaded);
                        audio.removeEventListener('error', handleError);
                        resolve();
                    }, 3000);
                    
                    // Listen for the canplaythrough event
                    audio.addEventListener('canplaythrough', handleLoaded, { once: true });
                    audio.addEventListener('error', handleError, { once: true });
                });
            });
            
            return Promise.all(audioPromises);
        });
    }
    
    /**
     * Gets an image by key
     * @param {string} key - The key of the image to get
     * @returns {HTMLImageElement|null} - The requested image or null if not found
     */
    getImage(key) {
        if (this.images[key] && this.images[key].isLoaded) {
            return this.images[key].image;
        }
        console.warn(`Image not found or not loaded: ${key}`);
        return null;
    }
    
    /**
     * Plays background music if it's not already playing
     * @param {boolean} [restart=false] - Whether to restart the music if it's already playing
     */
    playBackgroundMusic(restart = false) {
        try {
            // Restart music if requested
            if (restart) {
                this.sound.music.currentTime = 0;
            }
            
            // Only play if paused to avoid overlapping playback
            if (this.sound.music.paused) {
                // Modern way: use the Promise returned by play()
                this.sound.music.play()
                    .catch(error => {
                        // This is expected on some browsers that block autoplay
                        console.warn("Background music couldn't autoplay:", error);
                    });
            }
        } catch (error) {
            console.warn("Error playing background music:", error);
        }
    }
    
    /**
     * Toggles the background music on/off
     * @returns {boolean} - The new music state (true if music is playing)
     */
    toggleMusic() {
        const music = this.sound.music;
        
        if (music.paused) {
            this.playBackgroundMusic();
            return true;
        } else {
            music.pause();
            return false;
        }
    }
    
    /**
     * Plays a sound with optional volume and playback rate variation for more natural effect
     * @param {string} soundKey - Key of the sound in the sound object
     * @param {number} [volumeBase=0.8] - Base volume for the sound
     * @param {number} [volumeVariation=0.2] - Random variation in volume
     */
    playSound(soundKey, volumeBase = 0.8, volumeVariation = 0.2) {
        try {
            if (!this.sound[soundKey]) {
                console.warn(`Sound not found: ${soundKey}`);
                return;
            }
            
            const sound = this.sound[soundKey];
            
            // Add slight variation to volume for more natural sound
            sound.volume = Math.min(1, Math.max(0, volumeBase + (Math.random() - 0.5) * volumeVariation));
            
            // Reset playback position and play
            sound.currentTime = 0;
            
            // Modern way: use the Promise returned by play()
            sound.play()
                .catch(error => {
                    console.warn(`Couldn't play sound ${soundKey}:`, error);
                });
        } catch (error) {
            console.warn(`Error playing sound ${soundKey}:`, error);
        }
    }
    
    /**
     * Stops all game sounds (useful when changing game states)
     * @param {boolean} [includeMusic=true] - Whether to also stop the background music
     */
    stopAllSounds(includeMusic = true) {
        Object.entries(this.sound).forEach(([key, audio]) => {
            try {
                // Skip music if includeMusic is false
                if (!includeMusic && key === 'music') {
                    return;
                }
                
                audio.pause();
                audio.currentTime = 0;
            } catch (error) {
                console.warn(`Error stopping sound ${key}:`, error);
            }
        });
    }

    /**
     * Converts an absolute path to a relative path
     * @param {string} path - The absolute path to convert
     * @returns {string} - The relative path
     * @private
     */
    _makeRelativePath(path) {
        return path.startsWith("/") ? `.${path}` : path;
    }
}
