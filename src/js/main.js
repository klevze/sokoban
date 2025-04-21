/**
 * Main entry point for the Sokoban game
 * This file initializes the game and connects all components
 * 
 * The Sokoban game is structured using an ES6 module architecture where:
 * - main.js: Entry point that bootstraps the application
 * - game.js: Core game controller managing state and game flow
 * - Other modules: Handle specific functionality (player, boxes, level, etc.)
 */

// Import config to get canvas dimensions
// The config module centralizes all game constants and settings
import { CANVAS } from './config/config.js';

// Import the game module (this will load all other dependencies indirectly)
// The game object is a singleton instance that manages the entire game logic
import { game } from './game.js';

/**
 * Register service worker for PWA functionality
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./js/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
                console.error('ServiceWorker registration failed: ', error);
            });
    });
}

/**
 * Initialize the game when the DOM is fully loaded
 * Sets up the canvas with dimensions from configuration
 */
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('mainCanvas');
    if (canvas) {
        // Apply dimensions from configuration to ensure consistency
        canvas.width = CANVAS.WIDTH;
        canvas.height = CANVAS.HEIGHT;
        console.log(`Canvas dimensions set to ${CANVAS.WIDTH}x${CANVAS.HEIGHT} from config`);
    } else {
        console.error('Canvas element not found! Check if the HTML includes an element with id="mainCanvas"');
    }
});

// Log startup info
console.log('Sokoban game initialized');