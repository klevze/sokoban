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

// Import the user manager service
import userManager from './auth/userManager.js';

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

    // Add UI elements for user authentication
    createAuthUI();
});

/**
 * Create the user authentication UI elements
 */
function createAuthUI() {
    // Create container for auth UI
    const authContainer = document.createElement('div');
    authContainer.id = 'auth-container';
    authContainer.style.position = 'absolute';
    authContainer.style.top = '10px';
    authContainer.style.left = '10px';
    authContainer.style.zIndex = '100';
    authContainer.style.display = 'flex';
    authContainer.style.alignItems = 'center';
    authContainer.style.gap = '10px';

    // Create user profile display
    const userProfile = document.createElement('div');
    userProfile.id = 'user-profile';
    userProfile.style.color = 'white';
    userProfile.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    userProfile.style.padding = '5px 10px';
    userProfile.style.borderRadius = '15px';
    userProfile.style.fontSize = '14px';
    userProfile.style.display = 'none'; // Hidden initially
    authContainer.appendChild(userProfile);

    // Create auth button
    const authButton = document.createElement('button');
    authButton.id = 'auth-button';
    authButton.textContent = 'Sign In';
    authButton.style.padding = '5px 10px';
    authButton.style.backgroundColor = '#8b673c';
    authButton.style.color = 'white';
    authButton.style.border = 'none';
    authButton.style.borderRadius = '15px';
    authButton.style.cursor = 'pointer';
    authButton.style.fontSize = '14px';
    authButton.style.fontWeight = 'bold';

    // Add hover effect
    authButton.addEventListener('mouseover', () => {
        authButton.style.backgroundColor = '#a07c50';
    });
    authButton.addEventListener('mouseout', () => {
        authButton.style.backgroundColor = '#8b673c';
    });

    // Add click handler
    authButton.addEventListener('click', () => {
        // Use the imported game instance instead of window.gameInstance
        if (game && game.toggleAccountDialog) {
            game.toggleAccountDialog();
        } else {
            console.error('Game instance or toggleAccountDialog method not available');
        }
    });

    authContainer.appendChild(authButton);

    // Add to the document
    document.body.appendChild(authContainer);
}

// Log startup info
console.log('Sokoban game initialized');