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
 * Sets up the canvas with full screen dimensions
 */
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('mainCanvas');
    if (canvas) {
        // Set canvas to fill the entire viewport
        resizeCanvas(canvas);
        
        // Add resize event listener
        window.addEventListener('resize', () => resizeCanvas(canvas));
        
        console.log(`Canvas dimensions set to ${canvas.width}x${canvas.height}`);
    } else {
        console.error('Canvas element not found! Check if the HTML includes an element with id="mainCanvas"');
    }

    // Initialize auth state listener directly without creating UI
    initAuthStateListener();
});

/**
 * Resize canvas to fill the viewport
 * @param {HTMLCanvasElement} canvas - The canvas element to resize
 */
function resizeCanvas(canvas) {
    // Set display size to match viewport
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    
    // Set actual canvas dimensions to match display size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

/**
 * Create the user authentication UI elements
 */
function createAuthUI() {
    // Create container for auth UI
    const authContainer = document.createElement('div');
    authContainer.id = 'auth-container';
    authContainer.style.position = 'absolute';
    authContainer.style.top = '10px';
    authContainer.style.right = '10px'; // Changed from left to right for better visibility
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

    // Create auth buttons container (for login/register)
    const authButtonsContainer = document.createElement('div');
    authButtonsContainer.id = 'auth-buttons';
    authButtonsContainer.style.display = 'flex';
    authButtonsContainer.style.gap = '8px';
    
    // Create login button
    const loginButton = document.createElement('button');
    loginButton.id = 'login-button';
    loginButton.textContent = 'Sign In';
    loginButton.className = 'auth-btn';
    styleAuthButton(loginButton);
    
    // Create register button
    const registerButton = document.createElement('button');
    registerButton.id = 'register-button';
    registerButton.textContent = 'Register';
    registerButton.className = 'auth-btn';
    styleAuthButton(registerButton);
    
    // Create signout button (initially hidden)
    const signoutButton = document.createElement('button');
    signoutButton.id = 'signout-button';
    signoutButton.textContent = 'Sign Out';
    signoutButton.className = 'auth-btn';
    signoutButton.style.display = 'none';
    styleAuthButton(signoutButton);

    // Add click handlers
    loginButton.addEventListener('click', () => {
        if (game && game.showLoginDialog) {
            game.showLoginDialog();
        }
    });

    registerButton.addEventListener('click', () => {
        if (game && game.showRegistrationDialog) {
            game.showRegistrationDialog();
        }
    });
    
    signoutButton.addEventListener('click', () => {
        if (game) {
            // Sign out the user
            userManager.signOut()
                .then(() => {
                    console.log('User signed out successfully');
                })
                .catch(error => {
                    console.error('Sign out failed:', error);
                });
        }
    });

    // Add buttons to container
    authButtonsContainer.appendChild(loginButton);
    authButtonsContainer.appendChild(registerButton);
    authButtonsContainer.appendChild(signoutButton);
    authContainer.appendChild(authButtonsContainer);

    // Add to the document
    document.body.appendChild(authContainer);
    
    // Initialize auth state listener
    initAuthStateListener();
}

/**
 * Apply common styles to authentication buttons
 * @param {HTMLButtonElement} button - The button to style
 */
function styleAuthButton(button) {
    button.style.padding = '5px 10px';
    button.style.backgroundColor = '#8b673c';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '15px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    button.style.fontWeight = 'bold';

    // Add hover effects
    button.addEventListener('mouseover', () => {
        button.style.backgroundColor = '#a07c50';
    });
    button.addEventListener('mouseout', () => {
        button.style.backgroundColor = '#8b673c';
    });
}

/**
 * Initialize the authentication state listener to update UI
 */
function initAuthStateListener() {
    userManager.init(
        // Auth state change callback
        (isAuthenticated, userProfile) => {
            // We removed the UI elements, so just let the Game instance handle the auth state
            if (game) {
                game.onAuthStateChanged(isAuthenticated, userProfile);
            }
        },
        // Progress loaded callback
        (progress) => {
            console.log('User progress loaded:', progress);
            // Game instance will handle progress updates
            if (game) {
                game.onProgressLoaded(progress);
            }
        }
    );
}

// Log startup info
console.log('Sokoban game initialized');