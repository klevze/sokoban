/**
 * Sokoban Game Configuration
 * This file centralizes all game constants and settings for easier maintenance
 */

// Canvas and Display Settings
export const CANVAS = {
  WIDTH: 1000,
  HEIGHT: 800,
  BACKGROUND_COLOR: "#000000",
};

// Game Physics and Animation
export const PHYSICS = {
  ANIMATION_SMOOTHNESS: 20,    // Increase from 4 to 20 for smoother pixel movement
  ANIMATION_FRAME_RATE: 16,    // Decrease for more frequent updates (around 60fps)
  KEY_THROTTLE_DELAY: 150,    // Minimum time (ms) between key press actions
  MOVEMENT_DURATION: 300,     // Duration of movement animation in milliseconds
  MOVEMENT_SPEEDS: {
    SLOW: 450,               // Slow movement speed (450ms per tile)
    NORMAL: 300,             // Normal movement speed (300ms per tile)
    FAST: 150,               // Fast movement speed (150ms per tile)
    VERY_FAST: 80            // Very fast movement speed (80ms per tile)
  },
  DEFAULT_SPEED: 'NORMAL'    // Default movement speed setting
};

// Tile and Sprite Settings
export const TILES = {
  SOURCE_SIZE: 96,           // Size of tiles in the source image (px) - Updated from 32px to 96px
  OUTPUT_SIZE: 40,           // Size of tiles when rendered on screen (px)
  PLAYER_SOURCE_SIZE: 32,    // Size of player sprite in source image
  PLAYER_EXTRA_SIZE: 4,     // Extra pixels added to player sprite for better appearance
  WALKABLE_TILES: [10, 17, 18, 19, 20, 71, 72, 73, 74, 81, 82, 83, 84, 88, 89, 90, 22, 23, 24, 25, 32, 33, 34, 35, 42, 43, 44, 45],
};

// Game State Constants
export const GAME_STATES = {
  LOADING: 'loading',
  INTRO: 'intro',
  PLAY: 'play',
  WIN: 'win',
  PAUSED: 'paused',  // New state for game pausing
  LEVEL_SELECT: 'level_select', // New state for level selection
};

// State transition map - defines allowed transitions between states
export const STATE_TRANSITIONS = {
  [GAME_STATES.LOADING]: [GAME_STATES.INTRO],
  [GAME_STATES.INTRO]: [GAME_STATES.PLAY, GAME_STATES.LEVEL_SELECT],
  [GAME_STATES.PLAY]: [GAME_STATES.WIN, GAME_STATES.PAUSED, GAME_STATES.INTRO],
  [GAME_STATES.WIN]: [GAME_STATES.PLAY, GAME_STATES.INTRO],
  [GAME_STATES.PAUSED]: [GAME_STATES.PLAY, GAME_STATES.INTRO],
  [GAME_STATES.LEVEL_SELECT]: [GAME_STATES.PLAY, GAME_STATES.INTRO]
};

// Player Settings
export const PLAYER = {
  IDLE_TIMEOUT: 30000,       // Time in ms before player idle animation triggers
  DIRECTION: {
    RIGHT: 0,
    LEFT: 1,
    DOWN: 2,
    UP: 3,
  },
  FRAMES_PER_ROW: 4,         // 4 frames per direction in the sprite sheet
  ANIMATION: {
    WALKING_SPEED: 40,       // Animation speed in ms between frames (lower = faster)
    FRAME_COUNT: 4,          // Number of animation frames per direction
    CYCLE_DURING_MOVEMENT: true, // Enable frame cycling during movement
  }
};

// Stars Background Effect
export const STARS_EFFECT = {
  COUNT: 130,
  SIZE: 2,
  SPEED: 64,
};

// Make all asset paths relative instead of absolute for proper loading in non-root paths
// Convert absolute paths to relative
const relativizeAssetPaths = (paths) => {
  const result = {};
  for (const key in paths) {
    if (typeof paths[key] === 'string') {
      // Replace leading slash with ./ for relative path
      result[key] = paths[key].startsWith('/') ? paths[key].replace('/', './') : paths[key];
    } else {
      // Recursively process nested objects
      result[key] = relativizeAssetPaths(paths[key]);
    }
  }
  return result;
};

// Asset Paths
export const ASSET_PATHS = relativizeAssetPaths({
  LEVELS: '/assets/level/levels.json',
  IMAGES: {
    PLAYER: '/assets/images/players.png',
    TILES: '/assets/images/tileset_96x96px.png', // Updated to use the new 96x96 tileset
    LOGO: '/assets/images/logo.webp',
    MAIN_BG: '/assets/images/main.webp',
    BTN_PLAY: '/assets/images/btn_play.png',
    WOOD_PANEL: '/assets/images/wood_panel.webp',
    LEVEL_BG: '/assets/images/background_levels_wood.png',
    // Score icons
    SCORE_LEVEL: '/assets/images/level_score_level.png',
    SCORE_MOVES: '/assets/images/level_score_moves.png',
    SCORE_PUSHES: '/assets/images/level_score_pushes.png',
    SCORE_TIME: '/assets/images/level_score_time.png',
    SCORE_BOXES: '/assets/images/level_score_boxes.png',
    // Top action buttons
    ACTION_HOME: '/assets/images/top_action_home.png',
    ACTION_LEVEL: '/assets/images/top_action_level.png',
    ACTION_MUTE: '/assets/images/top_action_mute.png',
    ACTION_PAUSE: '/assets/images/top_action_pause.png',
    ACTION_RESTART: '/assets/images/top_action_restart.png',
    ACTION_UNDO: '/assets/images/top_action_undo.png',
    ACTION_SETTINGS: '/assets/images/top_action_settings.png',
  },
  SOUNDS: {
    MUSIC: '/assets/sound/Dreamcatcher.mp3',
    VICTORY: '/assets/sound/369252__funwithsound__victory-celebration-movie-score.wav',
    RUNNING: '/assets/sound/16_human_walk_stone_1.wav',
    PUSHING: '/assets/sound/04_sack_open_1.wav',
    BOXONGOAL: '/assets/sound/08_human_charge_1.wav',
    WHISTLE: '/assets/sound/mixkit-cartoon-whistling-738.wav',
            
  },
});

// Text styles
export const TEXT_STYLES = {
  TITLE: {
    FONT: "30px Arial",
    ALIGN: "center",
    FILL_STYLE: "white",
  },
  BUTTON: {
    FONT: "20px Arial",
    ALIGN: "center",
    FILL_STYLE: "white",
  },
  COPYRIGHT: {
    FONT: "10px Arial",
    FILL_STYLE: "white",
  },
};

// Debug settings
export const DEBUG = {
  ENABLED: false,
  SHOW_TILE_NUMBERS: false,
  SHOW_COORDINATES: false,
  SHOW_GRID_LINES: false,
};

// Version information
export const VERSION = "0.1.0";
export const COPYRIGHT_YEAR = 2025;