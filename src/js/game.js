/**
 * Main game controller for Sokoban
 * This file manages the core game logic, rendering, and state management
 */

// Import dependencies using ES modules
import { Stars3D } from './fx_stars_3d.js';
import { Player } from './player.js';
import { Level } from './level.js';
import { Boxes } from './boxes.js';
import { Goal } from './goal.js';
import { Score } from './score.js';
import { Resources } from './resources.js';
import { initEvents, hideLoadingText } from './events.js';
import { LevelEditor } from './editor.js';
import { GAME_STATES, PHYSICS, TILES, CANVAS, STATE_TRANSITIONS, VERSION, COPYRIGHT_YEAR, ASSET_PATHS, GAME_MODES } from './config/config.js';
import userManager from './auth/userManager.js';

/**
 * Game class - Main controller for the Sokoban game
 * Encapsulates all game logic and state
 */
class Game {
    /**
     * Creates a new Game instance
     * @param {HTMLCanvasElement} canvas - The canvas element to render on
     */
    constructor(canvas) {
        // Canvas and rendering
        this.canvas = canvas;
        
        // Use the width and height already set in main.js
        // (The canvas is now full-screen)
        
        this.ctx = canvas.getContext('2d');
        
        // Game components
        this.resources = new Resources();
        this.stars3d = new Stars3D(this.ctx, canvas.width, canvas.height, 130, 2, 64);
        
        // Game objects (initialized in setupGame)
        this.player = null;
        this.boxes = null;
        this.level = null;
        this.goal = null;
        this.score = null;
        this.editor = null;
        
        // Top action buttons clickable areas
        this.topButtonAreas = {};
        
        // Level management
        this.levelsData = null;
        this.levelData = null;
        // Input handling
        this.lastKeyPressTime = 0;
        this.keyThrottleDelay = PHYSICS.KEY_THROTTLE_DELAY;
        
        // Game state
        this.state = GAME_STATES.LOADING;
        
        // Game mode settings
        this.gameMode = GAME_MODES.NORMAL;
        this.gameModeSettings = {
            timeAttack: {
                bestTimes: {} // Store best times for each level
            },
            challenge: {
                movesLimit: 0,     // Maximum moves allowed (set per level)
                timeLimit: 0,      // Time limit in milliseconds (set per level)
                defaultMovesMultiplier: 2.0,  // Default moves limit = optimal solution * multiplier
                defaultTimeLimit: 120000,     // Default time limit: 2 minutes
            }
        };
        
        // Game settings
        this.settings = {
            movementSpeed: PHYSICS.DEFAULT_SPEED,
            soundEnabled: true,
            musicEnabled: true
        };
        
        // Set up animation frame
        this.animationFrameId = null;
        
        // Loading state
        this.loadingProgress = 0;
        this.loadingProgressBar = this._createLoadingProgressBar();
        this.logoAnimationStartTime = Date.now();
        this.logoAnimationDuration = 1500; // Animation duration in milliseconds
        
        // Language selector - create it after loading completes
        this.languageSelector = null;

        // Authentication state
        this.isUserAuthenticated = false;
        this.userProfile = null;
        
        // Set document title using i18n
        document.title = this.resources.i18n.get('title');
        
        // Add language change event handler
        this.resources.i18n.onLanguageChange = () => {
            this.updateAllTexts();
        };
    }

    /**
     * Handle authentication state changes
     * @param {boolean} isAuthenticated - Whether user is authenticated
     * @param {Object} userProfile - User profile data if authenticated
     */
    onAuthStateChanged(isAuthenticated, userProfile) {
        this.isUserAuthenticated = isAuthenticated;
        this.userProfile = userProfile;
        
        // Update UI to reflect auth state
        this._updateAuthUI();
        
        // If user just logged in, try to load their progress
        if (isAuthenticated && userProfile) {
            console.log(`User logged in: ${userProfile.displayName}`);
            
            // Start automatic progress syncing
            userManager.startAutoSync();
        } else {
            console.log('User logged out');
            userManager.stopAutoSync();
        }
    }

    /**
     * Update UI elements based on authentication state
     * @private
     */
    _updateAuthUI() {
        // This will be called when auth state changes to update UI elements
        const authButton = document.getElementById('auth-button');
        const userProfileDisplay = document.getElementById('user-profile');
        
        if (authButton && userProfileDisplay) {
            if (this.isUserAuthenticated && this.userProfile) {
                // User is logged in
                authButton.textContent = this.resources.i18n.get('auth.signOut');
                userProfileDisplay.textContent = this.userProfile.displayName;
                userProfileDisplay.style.display = 'block';
            } else {
                // User is not logged in
                authButton.textContent = this.resources.i18n.get('auth.signIn');
                userProfileDisplay.style.display = 'none';
            }
        }
    }

    /**
     * Process progress data loaded from cloud
     * @param {Object} progress - User progress data
     */
    onProgressLoaded(progress) {
        console.log('User progress loaded from cloud', progress);
        
        // Update Time Attack best times if available
        if (progress.timeAttackBestTimes) {
            this.gameModeSettings.timeAttack.bestTimes = {
                ...this.gameModeSettings.timeAttack.bestTimes,
                ...progress.timeAttackBestTimes
            };
        }
        
        // Store level statistics for later use
        if (progress.levelStats) {
            this.levelStats = progress.levelStats;
            
            // If we're currently in a level, update the score display with personal best
            if (this.score && this.state === GAME_STATES.PLAY && this.gameMode === GAME_MODES.NORMAL) {
                this.updatePersonalBest();
            }
        }
        
        // Show notification to user
        this._showNotification(this.resources.i18n.get('auth.progressLoaded'));
    }

    /**
     * Update personal best stats display in score panel
     * Called when starting a level or when progress is loaded
     */
    updatePersonalBest() {
        if (!this.score || !this.levelStats || this.gameMode !== GAME_MODES.NORMAL) {
            return;
        }
        
        const levelKey = `level_${this.currentLevel}`;
        const levelStats = this.levelStats[levelKey];
        
        if (levelStats) {
            // Set personal best data in score display
            this.score.setPersonalBest(levelStats);
            
            // Show notification about personal best
            this._showNotification(`Personal best loaded: ${levelStats.bestMoves} moves, ${this.score.formatTime(levelStats.bestTime)}`);
        }
    }

    /**
     * Show a temporary notification message to the user
     * @param {string} message - Message to display
     * @param {number} [duration=3000] - Duration in milliseconds
     * @private
     */
    _showNotification(message, duration = 3000) {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('game-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'game-notification';
            notification.style.position = 'absolute';
            notification.style.bottom = '10px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.padding = '10px 20px';
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            notification.style.color = 'white';
            notification.style.borderRadius = '5px';
            notification.style.fontFamily = 'Arial, sans-serif';
            notification.style.fontSize = '14px';
            notification.style.zIndex = '20'; // Lower z-index so it doesn't overlap clickable elements
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            document.body.appendChild(notification);
        }
        
        // Set message and show notification
        notification.textContent = message;
        notification.style.opacity = '1';
        
        // Hide notification after duration
        setTimeout(() => {
            notification.style.opacity = '0';
        }, duration);
    }

    /**
     * Show login dialog
     */
    showLoginDialog() {
        // Create dialog overlay
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '1000';
        
        // Create dialog container
        const dialog = document.createElement('div');
        dialog.className = 'login-dialog';
        
        // Use wood background like other dialogs
        dialog.style.backgroundImage = 'url(assets/images/background_levels_wood.png)';
        dialog.style.backgroundSize = 'cover';
        dialog.style.backgroundPosition = 'center';
        dialog.style.border = '8px solid #3a2214';
        dialog.style.borderRadius = '8px';
        dialog.style.padding = '20px';
        dialog.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
        dialog.style.maxWidth = '400px';
        dialog.style.width = '90%';
        dialog.style.position = 'relative';
        
        // Add texture overlay for more wood-like feel
        const textureOverlay = document.createElement('div');
        textureOverlay.style.position = 'absolute';
        textureOverlay.style.top = '0';
        textureOverlay.style.left = '0';
        textureOverlay.style.width = '100%';
        textureOverlay.style.height = '100%';
        textureOverlay.style.opacity = '0.05';
        textureOverlay.style.pointerEvents = 'none';
        dialog.appendChild(textureOverlay);
        
        // Create dialog header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '20px';
        header.style.position = 'relative';
        header.style.zIndex = '1';
        
        const title = document.createElement('h2');
        title.textContent = this.resources.i18n.get('auth.signIn');
        title.style.margin = '0';
        title.style.color = '#faf0dc';
        title.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.style.backgroundColor = 'rgba(150, 80, 30, 0.7)';
        closeButton.style.border = '2px solid #fbefd5';
        closeButton.style.borderRadius = '50%';
        closeButton.style.color = '#faf0dc';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.width = '30px';
        closeButton.style.height = '30px';
        closeButton.style.display = 'flex';
        closeButton.style.justifyContent = 'center';
        closeButton.style.alignItems = 'center';
        closeButton.style.padding = '0';
        closeButton.style.lineHeight = '0'; 
        closeButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
        
        // Hover effect for close button
        closeButton.onmouseover = () => {
            closeButton.style.background = 'rgba(180, 100, 40, 0.9)';
            closeButton.style.transform = 'scale(1.05)';
        };
        closeButton.onmouseout = () => {
            closeButton.style.background = 'rgba(150, 80, 30, 0.7)';
            closeButton.style.transform = 'scale(1)';
        };
        closeButton.onclick = () => document.body.removeChild(overlay);
        
        header.appendChild(title);
        header.appendChild(closeButton);
        dialog.appendChild(header);
        
        // Create content container
        const contentContainer = document.createElement('div');
        contentContainer.style.position = 'relative';
        contentContainer.style.zIndex = '1';
        
        // Create login form
        const loginForm = document.createElement('form');
        loginForm.id = 'login-form';
        loginForm.style.display = 'block';
        
        const loginEmail = this._createFormField('email', 'auth.email', 'email');
        const loginPassword = this._createFormField('password', 'auth.password', 'password');
        
        const loginSubmit = document.createElement('button');
        loginSubmit.type = 'submit';
        loginSubmit.textContent = this.resources.i18n.get('auth.signIn');
        loginSubmit.style.padding = '8px 15px';
        loginSubmit.style.height = '40px';
        loginSubmit.style.backgroundColor = '#8b673c';
        loginSubmit.style.color = 'white';
        loginSubmit.style.border = 'none';
        loginSubmit.style.borderRadius = '4px';
        loginSubmit.style.cursor = 'pointer';
        loginSubmit.style.fontSize = '16px';
        loginSubmit.style.width = '100%';
        loginSubmit.style.marginTop = '10px';
        loginSubmit.style.boxSizing = 'border-box';
        loginSubmit.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        
        // Button hover effects
        loginSubmit.onmouseover = () => {
            loginSubmit.style.backgroundColor = '#9b774c';
            loginSubmit.style.transform = 'translateY(-2px)';
            loginSubmit.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
        };
        
        loginSubmit.onmouseout = () => {
            loginSubmit.style.backgroundColor = '#8b673c';
            loginSubmit.style.transform = 'translateY(0)';
            loginSubmit.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        };
        
        loginForm.appendChild(loginEmail);
        loginForm.appendChild(loginPassword);
        loginForm.appendChild(loginSubmit);
        contentContainer.appendChild(loginForm);
        
        // Create error message display
        const errorDisplay = document.createElement('div');
        errorDisplay.id = 'auth-error';
        errorDisplay.style.color = '#ff6b6b';
        errorDisplay.style.marginTop = '10px';
        errorDisplay.style.fontSize = '14px';
        errorDisplay.style.display = 'none';
        errorDisplay.style.padding = '5px 10px';
        errorDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        errorDisplay.style.borderRadius = '4px';
        contentContainer.appendChild(errorDisplay);
        
        // Add "Register instead" link
        const registerLink = document.createElement('div');
        registerLink.style.marginTop = '15px';
        registerLink.style.textAlign = 'center';
        registerLink.style.fontSize = '14px';
        registerLink.style.color = '#faf0dc';
        
        const registerText = document.createElement('span');
        registerText.textContent = "Don't have an account? ";
        
        const registerAction = document.createElement('a');
        registerAction.textContent = 'Register here';
        registerAction.href = '#';
        registerAction.style.color = '#ffaa00';
        registerAction.style.textDecoration = 'underline';
        registerAction.style.cursor = 'pointer';
        
        registerAction.onclick = (e) => {
            e.preventDefault();
            document.body.removeChild(overlay);
            this.showRegistrationDialog();
        };
        
        registerLink.appendChild(registerText);
        registerLink.appendChild(registerAction);
        contentContainer.appendChild(registerLink);
        
        dialog.appendChild(contentContainer);
        
        // Add event listeners for form
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = loginForm.email.value.trim();
            const password = loginForm.password.value;
            
            if (!email || !password) {
                this._showAuthError(dialog, this.resources.i18n.get('auth.fillAllFields'));
                return;
            }
            
            try {
                loginSubmit.disabled = true;
                loginSubmit.textContent = this.resources.i18n.get('auth.signingIn');
                loginSubmit.style.backgroundColor = '#7b572c';
                
                await userManager.signIn(email, password);
                document.body.removeChild(overlay);
            } catch (error) {
                console.error('Login error:', error);
                // Show the actual error message instead of a generic one
                this._showAuthError(dialog, error.message || this.resources.i18n.get('auth.loginFailed'));
                
                loginSubmit.disabled = false;
                loginSubmit.textContent = this.resources.i18n.get('auth.signIn');
                loginSubmit.style.backgroundColor = '#8b673c';
            }
        });
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }
    
    /**
     * Show registration dialog
     */
    showRegistrationDialog() {
        // Create dialog overlay
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '1000';
        
        // Create dialog container
        const dialog = document.createElement('div');
        dialog.className = 'register-dialog';
        
        // Use wood background like other dialogs
        dialog.style.backgroundImage = 'url(assets/images/background_levels_wood.png)';
        dialog.style.backgroundSize = 'cover';
        dialog.style.backgroundPosition = 'center';
        dialog.style.border = '8px solid #3a2214';
        dialog.style.borderRadius = '8px';
        dialog.style.padding = '20px';
        dialog.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
        dialog.style.maxWidth = '400px';
        dialog.style.width = '90%';
        dialog.style.position = 'relative';
        
        // Add texture overlay for more wood-like feel
        const textureOverlay = document.createElement('div');
        textureOverlay.style.position = 'absolute';
        textureOverlay.style.top = '0';
        textureOverlay.style.left = '0';
        textureOverlay.style.width = '100%';
        textureOverlay.style.height = '100%';
        textureOverlay.style.opacity = '0.05';
        textureOverlay.style.pointerEvents = 'none';
        dialog.appendChild(textureOverlay);
        
        // Create dialog header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '20px';
        header.style.position = 'relative';
        header.style.zIndex = '1';
        
        const title = document.createElement('h2');
        title.textContent = this.resources.i18n.get('auth.register');
        title.style.margin = '0';
        title.style.color = '#faf0dc';
        title.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.style.backgroundColor = 'rgba(150, 80, 30, 0.7)';
        closeButton.style.border = '2px solid #fbefd5';
        closeButton.style.borderRadius = '50%';
        closeButton.style.color = '#faf0dc';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.width = '30px';
        closeButton.style.height = '30px';
        closeButton.style.display = 'flex';
        closeButton.style.justifyContent = 'center';
        closeButton.style.alignItems = 'center';
        closeButton.style.padding = '0';
        closeButton.style.lineHeight = '0';
        closeButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
        
        // Hover effect for close button
        closeButton.onmouseover = () => {
            closeButton.style.background = 'rgba(180, 100, 40, 0.9)';
            closeButton.style.transform = 'scale(1.05)';
        };
        closeButton.onmouseout = () => {
            closeButton.style.background = 'rgba(150, 80, 30, 0.7)';
            closeButton.style.transform = 'scale(1)';
        };
        closeButton.onclick = () => document.body.removeChild(overlay);
        
        header.appendChild(title);
        header.appendChild(closeButton);
        dialog.appendChild(header);
        
        // Create content container
        const contentContainer = document.createElement('div');
        contentContainer.style.position = 'relative';
        contentContainer.style.zIndex = '1';
        
        // Create register form
        const registerForm = document.createElement('form');
        registerForm.id = 'register-form';
        
        const registerName = this._createFormField('text', 'auth.name', 'displayName');
        // Update field style to match wood theme
        this._updateFieldStyle(registerName);
        
        const registerEmail = this._createFormField('email', 'auth.email', 'email');
        // Update field style to match wood theme
        this._updateFieldStyle(registerEmail);
        
        const registerPassword = this._createFormField('password', 'auth.password', 'password');
        // Update field style to match wood theme
        this._updateFieldStyle(registerPassword);
        
        const registerConfirmPassword = this._createFormField('password', 'auth.confirmPassword', 'confirmPassword');
        // Update field style to match wood theme
        this._updateFieldStyle(registerConfirmPassword);
        
        const registerSubmit = document.createElement('button');
        registerSubmit.type = 'submit';
        registerSubmit.textContent = this.resources.i18n.get('auth.register');
        registerSubmit.style.padding = '8px 15px';
        registerSubmit.style.height = '40px';
        registerSubmit.style.backgroundColor = '#8b673c';
        registerSubmit.style.color = 'white';
        registerSubmit.style.border = 'none';
        registerSubmit.style.borderRadius = '4px';
        registerSubmit.style.cursor = 'pointer';
        registerSubmit.style.fontSize = '16px';
        registerSubmit.style.width = '100%';
        registerSubmit.style.marginTop = '10px';
        registerSubmit.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        registerSubmit.style.boxSizing = 'border-box';
        
        // Button hover effects
        registerSubmit.onmouseover = () => {
            registerSubmit.style.backgroundColor = '#9b774c';
            registerSubmit.style.transform = 'translateY(-2px)';
            registerSubmit.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
        };
        
        registerSubmit.onmouseout = () => {
            registerSubmit.style.backgroundColor = '#8b673c';
            registerSubmit.style.transform = 'translateY(0)';
            registerSubmit.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        };
        
        registerForm.appendChild(registerName);
        registerForm.appendChild(registerEmail);
        registerForm.appendChild(registerPassword);
        registerForm.appendChild(registerConfirmPassword);
        registerForm.appendChild(registerSubmit);
        contentContainer.appendChild(registerForm);
        
        // Create error message display
        const errorDisplay = document.createElement('div');
        errorDisplay.id = 'auth-error';
        errorDisplay.style.color = '#ff6b6b';
        errorDisplay.style.marginTop = '10px';
        errorDisplay.style.fontSize = '14px';
        errorDisplay.style.display = 'none';
        errorDisplay.style.padding = '5px 10px';
        errorDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        errorDisplay.style.borderRadius = '4px';
        contentContainer.appendChild(errorDisplay);
        
        // Add "Login instead" link
        const loginLink = document.createElement('div');
        loginLink.style.marginTop = '15px';
        loginLink.style.textAlign = 'center';
        loginLink.style.fontSize = '14px';
        loginLink.style.color = '#faf0dc';
        
        const loginText = document.createElement('span');
        loginText.textContent = "Already have an account? ";
        
        const loginAction = document.createElement('a');
        loginAction.textContent = 'Sign in here';
        loginAction.href = '#';
        loginAction.style.color = '#ffaa00';
        loginAction.style.textDecoration = 'underline';
        loginAction.style.cursor = 'pointer';
        
        loginAction.onclick = (e) => {
            e.preventDefault();
            document.body.removeChild(overlay);
            this.showLoginDialog();
        };
        
        loginLink.appendChild(loginText);
        loginLink.appendChild(loginAction);
        contentContainer.appendChild(loginLink);
        
        dialog.appendChild(contentContainer);
        
        // Add event listeners for form
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const displayName = registerForm.displayName.value.trim();
            const email = registerForm.email.value.trim();
            const password = registerForm.password.value;
            const confirmPassword = registerForm.confirmPassword.value;
            
            if (!displayName || !email || !password || !confirmPassword) {
                this._showAuthError(dialog, this.resources.i18n.get('auth.fillAllFields'));
                return;
            }
            
            if (password !== confirmPassword) {
                this._showAuthError(dialog, this.resources.i18n.get('auth.passwordsDoNotMatch'));
                return;
            }
            
            // Simple password validation
            if (password.length < 6) {
                this._showAuthError(dialog, this.resources.i18n.get('auth.passwordTooShort'));
                return;
            }
            
            try {
                registerSubmit.disabled = true;
                registerSubmit.textContent = this.resources.i18n.get('auth.registering');
                registerSubmit.style.backgroundColor = '#7b572c';
                
                await userManager.register(email, password, displayName);
                document.body.removeChild(overlay);
                this._showNotification(this.resources.i18n.get('auth.registrationSuccess'));
            } catch (error) {
                console.error('Registration error:', error);
                this._showAuthError(dialog, error.message || this.resources.i18n.get('auth.registrationFailed'));
                
                registerSubmit.disabled = false;
                registerSubmit.textContent = this.resources.i18n.get('auth.register');
                registerSubmit.style.backgroundColor = '#8b673c';
            }
        });
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    /**
     * Show the account dialog for login/registration
     */
    showAccountDialog() {
        // Create dialog overlay
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '1000';
        
        // Create dialog container
        const dialog = document.createElement('div');
        dialog.className = 'account-dialog';
        
        // Use wood background like other dialogs
        dialog.style.backgroundImage = 'url(assets/images/background_levels_wood.png)';
        dialog.style.backgroundSize = 'cover';
        dialog.style.backgroundPosition = 'center';
        dialog.style.border = '8px solid #3a2214';
        dialog.style.borderRadius = '8px';
        dialog.style.padding = '20px';
        dialog.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
        dialog.style.maxWidth = '400px';
        dialog.style.width = '90%';
        dialog.style.position = 'relative';
        
        // Add texture overlay for more wood-like feel
        const textureOverlay = document.createElement('div');
        textureOverlay.style.position = 'absolute';
        textureOverlay.style.top = '0';
        textureOverlay.style.left = '0';
        textureOverlay.style.width = '100%';
        textureOverlay.style.height = '100%';
        textureOverlay.style.opacity = '0.05';
        textureOverlay.style.pointerEvents = 'none';
        dialog.appendChild(textureOverlay);
        
        // Create dialog header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '20px';
        header.style.position = 'relative';
        header.style.zIndex = '1';
        
        const title = document.createElement('h2');
        title.textContent = this.isUserAuthenticated ? 
            this.resources.i18n.get('auth.account') : 
            this.resources.i18n.get('auth.signIn');
        title.style.margin = '0';
        title.style.color = '#faf0dc';
        title.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.style.backgroundColor = 'rgba(150, 80, 30, 0.7)';
        closeButton.style.border = '2px solid #fbefd5';
        closeButton.style.borderRadius = '50%';
        closeButton.style.color = '#faf0dc';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.width = '30px';
        closeButton.style.height = '30px';
        closeButton.style.display = 'flex';
        closeButton.style.justifyContent = 'center';
        closeButton.style.alignItems = 'center';
        closeButton.style.padding = '0';
        closeButton.style.lineHeight = '0';
        closeButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
        
        // Hover effect for close button
        closeButton.onmouseover = () => {
            closeButton.style.background = 'rgba(180, 100, 40, 0.9)';
            closeButton.style.transform = 'scale(1.05)';
        };
        closeButton.onmouseout = () => {
            closeButton.style.background = 'rgba(150, 80, 30, 0.7)';
            closeButton.style.transform = 'scale(1)';
        };
        closeButton.onclick = () => document.body.removeChild(overlay);
        
        header.appendChild(title);
        header.appendChild(closeButton);
        dialog.appendChild(header);
        
        // Create content container
        const contentContainer = document.createElement('div');
        contentContainer.style.position = 'relative';
        contentContainer.style.zIndex = '1';
        
        if (this.isUserAuthenticated) {
            // User is logged in, show account info and sign out button
            const profileInfo = document.createElement('div');
            profileInfo.style.marginBottom = '20px';
            
            const nameDisplay = document.createElement('p');
            nameDisplay.innerHTML = `<strong>${this.resources.i18n.get('auth.name')}:</strong> ${this.userProfile.displayName}`;
            nameDisplay.style.color = '#faf0dc';
            nameDisplay.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
            
            const emailDisplay = document.createElement('p');
            emailDisplay.innerHTML = `<strong>${this.resources.i18n.get('auth.email')}:</strong> ${this.userProfile.email}`;
            emailDisplay.style.color = '#faf0dc';
            emailDisplay.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
            
            profileInfo.appendChild(nameDisplay);
            profileInfo.appendChild(emailDisplay);
            contentContainer.appendChild(profileInfo);
            
            // Add sign out button with fixed height
            const signOutButton = document.createElement('button');
            signOutButton.textContent = this.resources.i18n.get('auth.signOut');
            signOutButton.className = 'auth-button';
            signOutButton.style.padding = '8px 15px';
            signOutButton.style.height = '40px';
            signOutButton.style.backgroundColor = '#8b673c';
            signOutButton.style.color = 'white';
            signOutButton.style.border = 'none';
            signOutButton.style.borderRadius = '4px';
            signOutButton.style.cursor = 'pointer';
            signOutButton.style.fontSize = '16px';
            signOutButton.style.width = '100%';
            signOutButton.style.boxSizing = 'border-box';
            signOutButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            
            // Button hover effects
            signOutButton.onmouseover = () => {
                signOutButton.style.backgroundColor = '#9b774c';
                signOutButton.style.transform = 'translateY(-2px)';
                signOutButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
            };
            
            signOutButton.onmouseout = () => {
                signOutButton.style.backgroundColor = '#8b673c';
                signOutButton.style.transform = 'translateY(0)';
                signOutButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            };
            
            signOutButton.onclick = async () => {
                try {
                    await userManager.signOut();
                    document.body.removeChild(overlay);
                } catch (error) {
                    console.error('Error signing out:', error);
                    // Show error message
                    this._showAuthError(dialog, error.message);
                }
            };
            
            contentContainer.appendChild(signOutButton);
        } else {
            // User is not logged in, show login/register form
            
            // Create tabs for login and register
            const tabs = document.createElement('div');
            tabs.style.display = 'flex';
            tabs.style.marginBottom = '15px';
            
            const loginTab = document.createElement('div');
            loginTab.textContent = this.resources.i18n.get('auth.signIn');
            loginTab.style.padding = '10px';
            loginTab.style.cursor = 'pointer';
            loginTab.style.flex = '1';
            loginTab.style.textAlign = 'center';
            loginTab.style.borderBottom = '2px solid #8b673c';
            loginTab.style.color = '#faf0dc';
            loginTab.dataset.tab = 'login';
            
            const registerTab = document.createElement('div');
            registerTab.textContent = this.resources.i18n.get('auth.register');
            registerTab.style.padding = '10px';
            registerTab.style.cursor = 'pointer';
            registerTab.style.flex = '1';
            registerTab.style.textAlign = 'center';
            registerTab.style.borderBottom = '2px solid #ccc';
            registerTab.style.color = '#faf0dc';
            registerTab.dataset.tab = 'register';
            
            tabs.appendChild(loginTab);
            tabs.appendChild(registerTab);
            contentContainer.appendChild(tabs);
            
            // Create forms container
            const formsContainer = document.createElement('div');
            
            // Login form
            const loginForm = document.createElement('form');
            loginForm.id = 'login-form';
            loginForm.style.display = 'block';
            
            const loginEmail = this._createFormField('email', 'auth.email', 'email');
            this._updateFieldStyle(loginEmail);
            
            const loginPassword = this._createFormField('password', 'auth.password', 'password');
            this._updateFieldStyle(loginPassword);
            
            const loginSubmit = document.createElement('button');
            loginSubmit.type = 'submit';
            loginSubmit.textContent = this.resources.i18n.get('auth.signIn');
            loginSubmit.style.padding = '8px 15px';
            loginSubmit.style.height = '40px';
            loginSubmit.style.backgroundColor = '#8b673c';
            loginSubmit.style.color = 'white';
            loginSubmit.style.border = 'none';
            loginSubmit.style.borderRadius = '4px';
            loginSubmit.style.cursor = 'pointer';
            loginSubmit.style.fontSize = '16px';
            loginSubmit.style.width = '100%';
            loginSubmit.style.marginTop = '10px';
            loginSubmit.style.boxSizing = 'border-box';
            loginSubmit.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            
            // Button hover effects
            loginSubmit.onmouseover = () => {
                loginSubmit.style.backgroundColor = '#9b774c';
                loginSubmit.style.transform = 'translateY(-2px)';
                loginSubmit.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
            };
            
            loginSubmit.onmouseout = () => {
                loginSubmit.style.backgroundColor = '#8b673c';
                loginSubmit.style.transform = 'translateY(0)';
                loginSubmit.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            };
            
            loginForm.appendChild(loginEmail);
            loginForm.appendChild(loginPassword);
            loginForm.appendChild(loginSubmit);
            
            // Register form
            const registerForm = document.createElement('form');
            registerForm.id = 'register-form';
            registerForm.style.display = 'none';
            
            const registerName = this._createFormField('text', 'auth.name', 'displayName');
            this._updateFieldStyle(registerName);
            
            const registerEmail = this._createFormField('email', 'auth.email', 'email');
            this._updateFieldStyle(registerEmail);
            
            const registerPassword = this._createFormField('password', 'auth.password', 'password');
            this._updateFieldStyle(registerPassword);
            
            const registerConfirmPassword = this._createFormField('password', 'auth.confirmPassword', 'confirmPassword');
            this._updateFieldStyle(registerConfirmPassword);
            
            const registerSubmit = document.createElement('button');
            registerSubmit.type = 'submit';
            registerSubmit.textContent = this.resources.i18n.get('auth.register');
            registerSubmit.style.padding = '8px 15px';
            registerSubmit.style.height = '40px';
            registerSubmit.style.backgroundColor = '#8b673c';
            registerSubmit.style.color = 'white';
            registerSubmit.style.border = 'none';
            registerSubmit.style.borderRadius = '4px';
            registerSubmit.style.cursor = 'pointer';
            registerSubmit.style.fontSize = '16px';
            registerSubmit.style.width = '100%';
            registerSubmit.style.marginTop = '10px';
            registerSubmit.style.boxSizing = 'border-box';
            registerSubmit.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            
            // Button hover effects
            registerSubmit.onmouseover = () => {
                registerSubmit.style.backgroundColor = '#9b774c';
                registerSubmit.style.transform = 'translateY(-2px)';
                registerSubmit.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
            };
            
            registerSubmit.onmouseout = () => {
                registerSubmit.style.backgroundColor = '#8b673c';
                registerSubmit.style.transform = 'translateY(0)';
                registerSubmit.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            };
            
            registerForm.appendChild(registerName);
            registerForm.appendChild(registerEmail);
            registerForm.appendChild(registerPassword);
            registerForm.appendChild(registerConfirmPassword);
            registerForm.appendChild(registerSubmit);
            
            formsContainer.appendChild(loginForm);
            formsContainer.appendChild(registerForm);
            contentContainer.appendChild(formsContainer);
            
            // Create error message display
            const errorDisplay = document.createElement('div');
            errorDisplay.id = 'auth-error';
            errorDisplay.style.color = '#ff6b6b';
            errorDisplay.style.marginTop = '10px';
            errorDisplay.style.fontSize = '14px';
            errorDisplay.style.display = 'none';
            errorDisplay.style.padding = '5px 10px';
            errorDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
            errorDisplay.style.borderRadius = '4px';
            contentContainer.appendChild(errorDisplay);
            
            // Add event listeners for forms
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = loginForm.email.value.trim();
                const password = loginForm.password.value;
                
                if (!email || !password) {
                    this._showAuthError(dialog, this.resources.i18n.get('auth.fillAllFields'));
                    return;
                }
                
                try {
                    loginSubmit.disabled = true;
                    loginSubmit.textContent = this.resources.i18n.get('auth.signingIn');
                    loginSubmit.style.backgroundColor = '#7b572c';
                    
                    await userManager.signIn(email, password);
                    document.body.removeChild(overlay);
                } catch (error) {
                    console.error('Login error:', error);
                    // Show the actual error message instead of a generic one
                    this._showAuthError(dialog, error.message || this.resources.i18n.get('auth.loginFailed'));
                    
                    loginSubmit.disabled = false;
                    loginSubmit.textContent = this.resources.i18n.get('auth.signIn');
                    loginSubmit.style.backgroundColor = '#8b673c';
                }
            });
            
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const displayName = registerForm.displayName.value.trim();
                const email = registerForm.email.value.trim();
                const password = registerForm.password.value;
                const confirmPassword = registerForm.confirmPassword.value;
                
                if (!displayName || !email || !password || !confirmPassword) {
                    this._showAuthError(dialog, this.resources.i18n.get('auth.fillAllFields'));
                    return;
                }
                
                if (password !== confirmPassword) {
                    this._showAuthError(dialog, this.resources.i18n.get('auth.passwordsDoNotMatch'));
                    return;
                }
                
                // Simple password validation
                if (password.length < 6) {
                    this._showAuthError(dialog, this.resources.i18n.get('auth.passwordTooShort'));
                    return;
                }
                
                try {
                    registerSubmit.disabled = true;
                    registerSubmit.textContent = this.resources.i18n.get('auth.registering');
                    
                    await userManager.register(email, password, displayName);
                    document.body.removeChild(overlay);
                } catch (error) {
                    console.error('Registration error:', error);
                    this._showAuthError(dialog, error.message || this.resources.i18n.get('auth.registrationFailed'));
                    
                    registerSubmit.disabled = false;
                    registerSubmit.textContent = this.resources.i18n.get('auth.register');
                }
            });
            
            // Add event listeners for tabs
            loginTab.addEventListener('click', () => {
                loginTab.style.borderBottom = '2px solid #8b673c';
                registerTab.style.borderBottom = '2px solid #ccc';
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
                errorDisplay.style.display = 'none';
            });
            
            registerTab.addEventListener('click', () => {
                registerTab.style.borderBottom = '2px solid #8b673c';
                loginTab.style.borderBottom = '2px solid #ccc';
                registerForm.style.display = 'block';
                loginForm.style.display = 'none';
                errorDisplay.style.display = 'none';
            });
        }
        
        dialog.appendChild(contentContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    /**
     * Create a form field for authentication forms
     * @param {string} type - Input type
     * @param {string} labelKey - i18n key for label
     * @param {string} name - Input name
     * @returns {HTMLDivElement} - Form field container
     * @private
     */
    _createFormField(type, labelKey, name) {
        const field = document.createElement('div');
        field.style.marginBottom = '15px';
        
        const label = document.createElement('label');
        label.textContent = this.resources.i18n.get(labelKey);
        label.style.display = 'block';
        label.style.marginBottom = '5px';
        label.style.fontWeight = 'bold';
        label.style.color = '#5c4425';
        
        const input = document.createElement('input');
        input.type = type;
        input.name = name;
        input.style.width = '100%';
        input.style.padding = '8px';
        input.style.boxSizing = 'border-box';
        input.style.border = '1px solid #ccc';
        input.style.borderRadius = '4px';
        
        field.appendChild(label);
        field.appendChild(input);
        
        return field;
    }

    /**
     * Update form field style to match wood theme
     * @param {HTMLDivElement} field - The form field container to update
     * @private
     */
    _updateFieldStyle(field) {
        const label = field.querySelector('label');
        if (label) {
            label.style.color = '#faf0dc';
            label.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
        }
        
        const input = field.querySelector('input');
        if (input) {
            input.style.backgroundColor = 'rgba(250, 240, 220, 0.9)';
            input.style.border = '2px solid #3a2214';
            input.style.borderRadius = '4px';
            input.style.padding = '8px 12px';
            input.style.fontSize = '16px';
            input.style.color = '#3a2214';
            
            // Add focus styles
            input.addEventListener('focus', () => {
                input.style.outline = 'none';
                input.style.boxShadow = '0 0 5px rgba(255, 170, 0, 0.6)';
                input.style.borderColor = '#ffaa00';
            });
            
            input.addEventListener('blur', () => {
                input.style.boxShadow = 'none';
                input.style.borderColor = '#3a2214';
            });
        }
    }

    /**
     * Show an error message in the authentication dialog
     * @param {HTMLElement} dialog - Dialog container
     * @param {string} message - Error message
     * @private
     */
    _showAuthError(dialog, message) {
        const errorDisplay = dialog.querySelector('#auth-error');
        if (errorDisplay) {
            errorDisplay.textContent = message;
            errorDisplay.style.display = 'block';
        }
    }

    /**
     * Toggle the account dialog
     */
    toggleAccountDialog() {
        console.log("toggleAccountDialog called, current state:", this.state);
        try {
            // Allow the account dialog in most game states except for loading
            if (this.state !== GAME_STATES.LOADING) {
                console.log("Showing account dialog");
                this.showAccountDialog();
            } else {
                console.log("Not showing account dialog because game is in LOADING state");
            }
        } catch (error) {
            console.error("Error in toggleAccountDialog:", error);
        }
    }

    /**
     * Creates a loading progress bar element
     * @private
     * @returns {HTMLDivElement} The progress bar element
     */
    _createLoadingProgressBar() {
        const progressContainer = document.createElement('div');
        progressContainer.id = 'loading-progress-container';
        progressContainer.style.position = 'absolute';
        progressContainer.style.top = '70%'; // Moved down from 60% to 70% to avoid overlapping the logo
        progressContainer.style.left = '50%';
        progressContainer.style.transform = 'translate(-50%, -50%)';
        progressContainer.style.width = '300px';
        progressContainer.style.height = '20px';
        progressContainer.style.backgroundColor = '#333';
        progressContainer.style.borderRadius = '10px';
        progressContainer.style.overflow = 'hidden';
        progressContainer.style.zIndex = '100';
        
        const progressBar = document.createElement('div');
        progressBar.id = 'loading-progress-bar';
        progressBar.style.width = '0%';
        progressBar.style.height = '100%';
        progressBar.style.backgroundColor = '#4CAF50';
        progressBar.style.transition = 'width 0.3s';
        
        progressContainer.appendChild(progressBar);
        document.getElementById('mainContent').appendChild(progressContainer);
        
        return progressContainer;
    }

    /**
     * Update all text elements in the game
     */
    updateAllTexts() {
        // Set document title
        document.title = this.resources.i18n.get('title');
        
        // If score exists, update its text
        if (this.score) {
            this.score.updateTexts(this.resources.i18n);
        }
        
        // Force redraw to update all rendered text
        this.draw();
    }
    
    /**
     * Create the language selector UI
     */
    createLanguageSelector() {
        // Create language selector container
        this.languageSelector = document.createElement('div');
        this.languageSelector.id = 'language-selector';
        this.languageSelector.className = 'language-selector';
        this.languageSelector.style.position = 'absolute';
        this.languageSelector.style.top = '10px';
        this.languageSelector.style.right = '10px';
        this.languageSelector.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.languageSelector.style.padding = '5px';
        this.languageSelector.style.borderRadius = '5px';
        this.languageSelector.style.zIndex = '100';
        
        // Create select element
        const select = document.createElement('select');
        select.id = 'language-select';
        select.style.padding = '4px';
        select.style.paddingLeft = '28px'; // Space for flag
        select.style.backgroundColor = '#333';
        select.style.color = 'white';
        select.style.border = '1px solid #666';
        select.style.borderRadius = '3px';
        select.style.backgroundSize = '20px auto';
        select.style.backgroundRepeat = 'no-repeat';
        select.style.backgroundPosition = '4px center';
        
        // Add options for each language
        const languages = this.resources.i18n.getLanguages();
        for (const code in languages) {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = languages[code].name;
            option.dataset.flag = languages[code].flag;
            if (code === this.resources.i18n.getCurrentLanguage()) {
                option.selected = true;
                // Set current flag as background of select
                select.style.backgroundImage = `url(${languages[code].flag})`;
            }
            select.appendChild(option);
        }
        
        // Add change event listener
        select.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const flagUrl = selectedOption.dataset.flag;
            select.style.backgroundImage = `url(${flagUrl})`;
            this.resources.i18n.setLanguage(e.target.value);
        });
        
        this.languageSelector.appendChild(select);
        document.getElementById('mainContent').appendChild(this.languageSelector);
        
        return this.languageSelector;
    }

    /**
     * Initialize the game
     */
    init() {
        // Set up window resize handler
        this._setupResizeHandler();
        
        // Load settings from local storage
        this.loadSettings();
        
        // Start loading resources
        this.resources.loadAll(this.updateLoadingProgress.bind(this))
            .then(() => this.loadLevels())
            .then(() => {
                this.setupGame();
                initEvents(this); // Pass game instance to events
                hideLoadingText();
                this._hideLoadingProgressBar();
                this.startIdleCheck();
                this.startGameLoop();
                
                // Create language selector after loading completes
                this.createLanguageSelector();

                // Initialize user manager and listen for auth state changes
                userManager.init(this.onAuthStateChanged.bind(this), this.onProgressLoaded.bind(this));
            })
            .catch(error => {
                console.error('Error during game initialization:', error);
                this.showErrorMessage(error);
            });
    }
    
    /**
     * Set up resize handler for responsive canvas
     * @private
     */
    _setupResizeHandler() {
        // Initial sizing
        this._resizeCanvas();
        
        // Add resize event listener with debounce for better performance
        let resizeTimeout;
        window.addEventListener('resize', () => {
            // Clear previous timeout to prevent multiple rapid executions
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            
            // Set a timeout to avoid excessive updates during resize
            resizeTimeout = setTimeout(() => {
                this._resizeCanvas();
                
                // Reinitialize level positions if game is already running
                if (this.level) {
                    const previousOutputWidth = this.level.outputWidth;
                    
                    // Reinitialize level which will recalculate outputWidth
                    this.level.initLevel();
                    
                    // Reinitialize player positions to match new layout
                    if (this.player) {
                        this.player.outputWidth = this.level.outputWidth;
                        
                        // Make sure player's visual position matches its logical position
                        this.player.pixelPos = {
                            x: this.player.coord.x,
                            y: this.player.coord.y
                        };
                        
                        // Reset any active animation frame to prevent conflicts
                        if (this.player.animationFrameId) {
                            cancelAnimationFrame(this.player.animationFrameId);
                            this.player.animationFrameId = null;
                        }
                        
                        // Reset movement flags to ensure player is not stuck in moving state
                        this.player.isMoving = false;
                    }
                    
                    // Reinitialize boxes positions to match new layout
                    if (this.boxes) {
                        // Update boxes outputWidth
                        this.boxes.outputWidth = this.level.outputWidth;
                        
                        // Reset all boxes' pixel positions to match their logical positions
                        for (const box of this.boxes.boxes) {
                            // Make sure pixel positions match logical positions
                            box.pixelPos = {
                                x: box.x,
                                y: box.y
                            };
                            
                            // Reset movement flags for boxes as well
                            box.isMoving = false;
                        }
                    }
                    
                    if (this.goal) {
                        this.goal.outputWidth = this.level.outputWidth;
                    }
                    
                    // Ensure proper redraw
                    this.draw();
                }
            }, 250); // 250ms debounce time
        });
    }
    
    /**
     * Resize canvas to fit window while maintaining aspect ratio
     * @private
     */
    _resizeCanvas() {
        // Get the current window dimensions
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Update canvas dimensions to match window
        this.canvas.width = windowWidth;
        this.canvas.height = windowHeight;
        
        // Update stars position
        if (this.stars3d) {
            this.stars3d.width = windowWidth;
            this.stars3d.height = windowHeight;
            this.stars3d.centerX = Math.floor(windowWidth / 2);
            this.stars3d.centerY = Math.floor(windowHeight / 2);
        }
        
        // When level is initialized, tell it to recalculate positions
        if (this.level) {
            this.level.initLevel();
        }
        
        console.log(`Canvas resized to ${windowWidth}x${windowHeight}`);
    }

    /**
     * Update the loading progress display
     * @param {number} progress - Loading progress (0-100)
     */
    updateLoadingProgress(progress) {
        this.loadingProgress = progress;
        
        // Update visual progress bar
        const progressBar = document.getElementById('loading-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        console.log(`Loading: ${progress}%`);
    }
    
    /**
     * Hide loading progress bar when loading is complete
     * @private
     */
    _hideLoadingProgressBar() {
        if (this.loadingProgressBar && this.loadingProgressBar.parentNode) {
            this.loadingProgressBar.style.opacity = '0';
            this.loadingProgressBar.style.transition = 'opacity 0.5s';
            
            setTimeout(() => {
                if (this.loadingProgressBar.parentNode) {
                    this.loadingProgressBar.parentNode.removeChild(this.loadingProgressBar);
                }
            }, 500);
        }
    }

    /**
     * Load level data from JSON file
     * @returns {Promise} - Resolves when levels are loaded
     */
    loadLevels() {
        return fetch(ASSET_PATHS.LEVELS)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok, status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data) {
                    throw new Error('No level data received');
                }
                
                // Store the levels data and initialize the first level
                this.levelsData = data;
                
                // Validate that all levels have the same number of goals as boxes
                this.validateLevelsBoxesAndGoals();
                
                // Set initial level data if not already set
                if (!this.levelData && this.levelsData && this.levelsData.length > 0) {
                    this.levelData = JSON.parse(JSON.stringify(this.levelsData[0]));
                    this.currentLevel = 0;
                }
                
                console.log(`Successfully loaded ${this.levelsData.length} levels`);
                return data;
            })
            .catch(error => {
                console.error('Error loading levels:', error);
                // Provide fallback level data for testing if needed
                this.levelsData = [{
                    width: 5,
                    height: 5,
                    player: { x: 2, y: 2 },
                    walls: [
                        {x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}, {x: 3, y: 0}, {x: 4, y: 0},
                        {x: 0, y: 1}, {x: 0, y: 2}, {x: 0, y: 3}, {x: 0, y: 4},
                        {x: 4, y: 1}, {x: 4, y: 2}, {x: 4, y: 3}, {x: 4, y: 4},
                        {x: 1, y: 4}, {x: 2, y: 4}, {x: 3, y: 4}
                    ],
                    boxes: [{x: 1, y: 1}],
                    goals: [{x: 3, y: 3}]
                }];
                this.levelData = this.levelsData[0];
                return this.levelsData;
            });
    }

    /**
     * Validate that all levels have the same number of goals as boxes
     * @private
     */
    validateLevelsBoxesAndGoals() {
        if (!this.levelsData || !Array.isArray(this.levelsData)) {
            throw new Error('Invalid levels data');
        }

        const problemLevels = [];

        this.levelsData.forEach((level, index) => {
            // Count the number of boxes and goals in each level
            let numBoxes = 0;
            let numGoals = 0;

            // Parse the level data to find boxes and goals
            // Each level has 3 layers in the data: base, goals, boxes
            if (level.layers && Array.isArray(level.layers) && level.layers.length >= 3) {
                // Layer 1 (index 1) contains goals
                const goalLayer = level.layers[1].data;
                // Layer 2 (index 2) contains boxes
                const boxLayer = level.layers[2].data;

                if (goalLayer && boxLayer) {
                    // Count tiles > 0 in goal layer
                    goalLayer.forEach(tile => {
                        if (tile > 0) numGoals++;
                    });

                    // Count tiles > 0 in box layer (typically box is represented with tile ID 94)
                    boxLayer.forEach(tile => {
                        if (tile > 0) numBoxes++;
                    });
                }
            }

            // Check if boxes match goals for this level
            if (numBoxes !== numGoals) {
                problemLevels.push({
                    level: index + 1,
                    boxes: numBoxes,
                    goals: numGoals
                });
                
                console.warn(`Level ${index + 1} has mismatched boxes (${numBoxes}) and goals (${numGoals})`);
            }
        });

        // Report any problematic levels
        if (problemLevels.length > 0) {
            console.error('The following levels have mismatched boxes and goals:', problemLevels);
            
            // Create a warning message that will be shown to the user
            const warningMsg = document.createElement('div');
            warningMsg.id = 'level-validation-warning';
            warningMsg.style.position = 'fixed';
            warningMsg.style.top = '10px';
            warningMsg.style.left = '50%';
            warningMsg.style.transform = 'translateX(-50%)';
            warningMsg.style.backgroundColor = 'rgba(255, 50, 50, 0.9)';
            warningMsg.style.color = 'white';
            warningMsg.style.padding = '10px 20px';
            warningMsg.style.borderRadius = '5px';
            warningMsg.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
            warningMsg.style.zIndex = '1000';
            warningMsg.style.fontFamily = 'Arial, sans-serif';
            warningMsg.style.fontSize = '14px';
            warningMsg.style.fontWeight = 'bold';
            
            if (problemLevels.length === 1) {
                const level = problemLevels[0];
                warningMsg.textContent = `Warning: Level ${level.level} has ${level.boxes} boxes but ${level.goals} goals. Level may be unsolvable.`;
            } else {
                warningMsg.textContent = `Warning: ${problemLevels.length} levels have mismatched boxes and goals. These levels may be unsolvable.`;
            }
            
            // Add a close button
            const closeButton = document.createElement('span');
            closeButton.textContent = '×';
            closeButton.style.marginLeft = '10px';
            closeButton.style.cursor = 'pointer';
            closeButton.style.fontWeight = 'bold';
            closeButton.style.fontSize = '18px';
            closeButton.onclick = () => {
                if (document.body.contains(warningMsg)) {
                    document.body.removeChild(warningMsg);
                }
            };
            warningMsg.appendChild(closeButton);
            
            // Add to the document
            document.body.appendChild(warningMsg);
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                if (document.body.contains(warningMsg)) {
                    warningMsg.style.opacity = '0';
                    warningMsg.style.transition = 'opacity 1s';
                    setTimeout(() => {
                        if (document.body.contains(warningMsg)) {
                            document.body.removeChild(warningMsg);
                        }
                    }, 1000);
                }
            }, 10000);
        }
    }

    /**
     * Start the game loop
     */
    startGameLoop() {
        const loop = () => {
            this.draw();
            this.animationFrameId = requestAnimationFrame(loop);
        };
        loop();
    }

    /**
     * Start the idle check interval
     */
    startIdleCheck() {
        setInterval(() => this.checkPlayerIdle(), 1000);
    }

    /**
     * Main drawing function called on each animation frame
     */
    draw() {
        this.prepareScreen();

        switch (this.state) {
            case GAME_STATES.LOADING:
                this.showLoadingScreen();
                break;
            case GAME_STATES.INTRO:
                this.showIntroScreen();
                break;
            case GAME_STATES.GAME_MODE_SELECT:
                this.showGameModeScreen();
                break;
            case GAME_STATES.LEVEL_SELECT:
                // When in level selection state, show the level selection dialog and automatically transition to PLAY state
                this.showLevelSelectScreen();
                break;
            case GAME_STATES.PLAY:
                this.renderGameElements();
                
                // Check for challenge mode specific constraints
                if (this.gameMode === GAME_MODES.CHALLENGE) {
                    this.checkChallengeConstraints();
                }
                // Check Time Attack goal time constraints
                else if (this.gameMode === GAME_MODES.TIME_ATTACK) {
                    this.checkTimeAttackConstraints();
                }
                break;
            case GAME_STATES.WIN:
                this.renderGameElements();
                this.showWinningLevelScreen();
                break;
            case GAME_STATES.PAUSED:
                this.renderGameElements();
                this.showPauseScreen();
                break;
            case GAME_STATES.EDITOR:
                // Show editor interface
                this.editor?.draw();
                break;
        }
    }

    /**
     * Display intro/title screen
     */
    showIntroScreen() {
        // Get canvas dimensions
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Draw the background image with "cover" behavior
        if (this.resources.images && this.resources.images.main && this.resources.images.main.image) {
            const img = this.resources.images.main.image;
            const imgWidth = img.width;
            const imgHeight = img.height;
            
            // Calculate aspect ratios
            const imgAspect = imgWidth / imgHeight;
            const canvasAspect = canvasWidth / canvasHeight;
            
            // Variables for the crop/position calculation
            let sx = 0; // source x
            let sy = 0; // source y
            let sWidth = imgWidth; // source width
            let sHeight = imgHeight; // source height
            
            // Implement CSS "cover" behavior:
            // If image aspect ratio is greater than canvas aspect ratio,
            // we crop the image width (crop from sides)
            if (imgAspect > canvasAspect) {
                sWidth = imgHeight * canvasAspect;
                sx = (imgWidth - sWidth) / 2; // Center the cropped portion horizontally
            } 
            // If image aspect ratio is less than canvas aspect ratio,
            // we crop the image height (crop from top/bottom)
            else if (imgAspect < canvasAspect) {
                sHeight = imgWidth / canvasAspect;
                sy = (imgHeight - sHeight) / 2; // Center the cropped portion vertically
            }
            
            // Draw the image to fill the entire canvas
            this.ctx.drawImage(
                img,
                sx, sy, sWidth, sHeight, // Source rectangle (cropped portion)
                0, 0, canvasWidth, canvasHeight // Destination rectangle (full canvas)
            );
        } else {
            // Fallback if image isn't loaded - fill with a color
            this.ctx.fillStyle = "#000000";
            this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        this.ctx.textAlign = "center";
        this.ctx.font = "20px Arial";

        // Position logo with wave effect
        const logoImg = this.resources.images.logo.image;
        const logoWidth = logoImg.width;
        const logoHeight = logoImg.height;
        const frame = Date.now() * 0.01;

        // Animate the logo with a wave effect
        for (let y = 0; y < logoHeight; y++) {
            const x = Math.sin(y * 0.05 + frame) * 5 + (canvasWidth / 2 - logoWidth / 2);
            this.ctx.drawImage(logoImg, 0, y, logoWidth, 1, x, y + -20, logoWidth, 1);
        }

        // Calculate button dimensions and positions for horizontal layout
        const btnPlayImg = this.resources.images.btnPlay.image;
        const buttonWidth = btnPlayImg.width;
        const buttonHeight = btnPlayImg.height;
        const buttonSpacing = 20; // Space between buttons
        
        // Calculate total width of all buttons and spacing
        // If user is logged in, we'll show PLAY and LEVEL EDITOR buttons (2 buttons)
        // If user is NOT logged in, we'll show PLAY, LEVEL EDITOR, and SIGN IN buttons (3 buttons)
        const numButtons = this.isUserAuthenticated ? 2 : 3;
        const totalButtonsWidth = (buttonWidth * numButtons) + (buttonSpacing * (numButtons - 1));
        
        // Calculate starting X position to center all buttons as a group
        const startX = (canvasWidth - totalButtonsWidth) / 2;
        
        // Common Y position for all buttons - positioned at 70% of canvas height
        const buttonsY = canvasHeight * 0.7;
        
        // Draw the PLAY button (first button)
        const playX = startX;
        this.ctx.drawImage(btnPlayImg, playX, buttonsY);
        
        // Get "PLAY" text and convert to uppercase
        const newGameText = this.resources.i18n.get('buttons.play').toUpperCase();
        
        // Adjust font size based on text length to prevent overflow
        let fontSize = 30; // Default size
        if (newGameText.length > 10) {
            fontSize = 24;
        }
        if (newGameText.length > 15) {
            fontSize = 20;
        }
        
        this.ctx.font = `bold ${fontSize}px Arial`;
        
        // Position text centered in the button
        const playBtnCenterY = buttonsY + buttonHeight/2 + 10; // +10 for optical centering
        
        // Text shadow for better visibility
        this.ctx.fillStyle = "rgba(0,0,0,0.7)";
        this.ctx.fillText(newGameText, playX + buttonWidth/2 + 2, playBtnCenterY + 2);
        
        // Main text color
        this.ctx.fillStyle = "white";
        this.ctx.fillText(newGameText, playX + buttonWidth/2, playBtnCenterY);
        
        // Draw the LEVEL EDITOR button (second button)
        const editorX = playX + buttonWidth + buttonSpacing;
        this.ctx.drawImage(btnPlayImg, editorX, buttonsY);
        
        // Get "LEVEL EDITOR" text and convert to uppercase
        const editorText = this.resources.i18n.get('buttons.levelEditor').toUpperCase();
        
        // Adjust font size based on text length to prevent overflow
        let editorFontSize = 30; // Default size
        if (editorText.length > 10) {
            editorFontSize = 24;
        }
        if (editorText.length > 15) {
            editorFontSize = 20;
        }
        
        // Set the font size for editor button text
        this.ctx.font = `bold ${editorFontSize}px Arial`;
        
        // Text shadow for better visibility
        this.ctx.fillStyle = "rgba(0,0,0,0.7)";
        this.ctx.fillText(editorText, editorX + buttonWidth/2 + 2, playBtnCenterY + 2);
        
        // Main text color
        this.ctx.fillStyle = "white";
        this.ctx.fillText(editorText, editorX + buttonWidth/2, playBtnCenterY);
        
        // Initialize buttonAreas object
        this.buttonAreas = {
            play: { x: playX, y: buttonsY, width: buttonWidth, height: buttonHeight },
            editor: { x: editorX, y: buttonsY, width: buttonWidth, height: buttonHeight }
        };

        // If user is authenticated, display username
        if (this.isUserAuthenticated && this.userProfile) {
            // Draw user info above the buttons
            this.ctx.font = "bold 20px Arial";
            this.ctx.textAlign = "center";
            
            // Username with welcome message
            const displayName = this.userProfile.displayName || 'User';
            const welcomeMessage = `${this.resources.i18n.get('auth.welcome')}, ${displayName}`;
            
            const userInfoY = buttonsY - 60; // Increased from -30 to -60 for more space between welcome message and buttons
            
            // Text shadow for better visibility
            this.ctx.fillStyle = "rgba(0,0,0,0.7)";
            this.ctx.fillText(welcomeMessage, canvasWidth / 2 + 2, userInfoY + 2);
            
            // Main text color with a highlight color
            this.ctx.fillStyle = "#ffcc00"; // Gold/yellow color for the username
            this.ctx.fillText(welcomeMessage, canvasWidth / 2, userInfoY);
            
            // Add sign out text below (smaller)
            this.ctx.font = "16px Arial";
            const signOutText = `(${this.resources.i18n.get('auth.clickToSignOut')})`;
            
            // Text shadow for better visibility
            this.ctx.fillStyle = "rgba(0,0,0,0.7)";
            this.ctx.fillText(signOutText, canvasWidth / 2 + 2, userInfoY + 22 + 2);
            
            // Light gray for the sign out text
            this.ctx.fillStyle = "#cccccc";
            this.ctx.fillText(signOutText, canvasWidth / 2, userInfoY + 22);
            
            // Add clickable area for signing out
            this.buttonAreas.signOut = {
                x: canvasWidth / 2 - 100,
                y: userInfoY - 20,
                width: 200,
                height: 50
            };
        } else {
            // User is not authenticated, draw the LOGIN button (third button)
            const loginX = editorX + buttonWidth + buttonSpacing;
            this.ctx.drawImage(btnPlayImg, loginX, buttonsY);
            
            // Get "SIGN IN" text and convert to uppercase
            const loginText = this.resources.i18n.get('auth.signIn').toUpperCase();
            
            // Adjust font size based on text length to prevent overflow
            let loginFontSize = 30; // Default size
            if (loginText.length > 10) {
                loginFontSize = 24;
            }
            if (loginText.length > 15) {
                loginFontSize = 20;
            }
            
            // Set the font size for login button text
            this.ctx.font = `bold ${loginFontSize}px Arial`;
            
            // Text shadow for better visibility
            this.ctx.fillStyle = "rgba(0,0,0,0.7)";
            this.ctx.fillText(loginText, loginX + buttonWidth/2 + 2, playBtnCenterY + 2);
            
            // Main text color
            this.ctx.fillStyle = "white";
            this.ctx.fillText(loginText, loginX + buttonWidth/2, playBtnCenterY);
            
            // Add login button to clickable areas
            this.buttonAreas.login = { x: loginX, y: buttonsY, width: buttonWidth, height: buttonHeight };
        }
        
        // Draw version info at the bottom right corner of the canvas
        this.ctx.font = "10px Arial";
        this.ctx.textAlign = "right";
        
        // Dynamic position for version text - 10px from right and bottom edges
        const versionX = canvasWidth - 10;
        const versionY = canvasHeight - 10;
        
        this.ctx.fillStyle = "black";
        this.ctx.fillText(`© ${COPYRIGHT_YEAR} / Version: ${VERSION}`, versionX + 1, versionY + 1);
        this.ctx.fillStyle = "white";
        this.ctx.fillText(`© ${COPYRIGHT_YEAR} / Version: ${VERSION}`, versionX, versionY);
        
        console.log("Button areas:", this.buttonAreas);
    }

    /**
     * Display level selection screen
     * This screen allows selecting a level and automatically transitions to showing the dialog
     */
    showLevelSelectScreen() {
        // Draw the background image
        this.ctx.drawImage(
            this.resources.images.levelBackground.image, 
            0, 
            0, 
            this.canvas.width, 
            this.canvas.height
        );
        
        // Draw the wood panel in the center
        const panelWidth = 400;
        const panelHeight = 250;
        const panelX = this.canvas.width / 2 - panelWidth / 2;
        const panelY = this.canvas.height / 2 - panelHeight / 2;
        
        // Draw wooden background for the panel
        this.ctx.save();
        
        // Create a clip region for the panel
        this.ctx.beginPath();
        this.ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 15);
        this.ctx.clip();
        
        // Draw the background image inside the clipped region
        if (this.resources.images.levelBackground && this.resources.images.levelBackground.image) {
            this.ctx.drawImage(
                this.resources.images.levelBackground.image,
                panelX, 
                panelY, 
                panelWidth, 
                panelHeight
            );
            
            // Add a dark overlay for better text contrast
            this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
            this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        } else {
            // Fallback if image is not available
            this.ctx.fillStyle = "rgba(101, 67, 33, 0.9)";
            this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        }
        
        this.ctx.restore();
        
        // Draw border
        this.ctx.save();
        this.ctx.strokeStyle = "#3a2214";
        this.ctx.lineWidth = 8;
        this.ctx.beginPath();
        this.ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 15);
        this.ctx.stroke();
        this.ctx.restore();
        
        // Draw loading text
        this.ctx.font = "24px Arial";
        this.ctx.fillStyle = "#faf0dc";
        this.ctx.textAlign = "center";
        this.ctx.fillText(
            this.resources.i18n.get('loading.loadingLevels'),
            this.canvas.width / 2,
            this.canvas.height / 2
        );
        
        // Show the level selection dialog immediately
        // We do this via setTimeout to allow the frame to render before showing the dialog
        setTimeout(() => {
            import('./events.js').then(events => {
                // First check if we're still in the LEVEL_SELECT state
                // If the user has already clicked or pressed a key to exit, don't show the dialog
                if (this.state === GAME_STATES.LEVEL_SELECT) {
                    events.showLevelSelectDialog(this);
                }
            });
        }, 50);
    }

    /**
     * Renders all game elements
     */
    renderGameElements() {
        // Draw background image with "cover" behavior
        if (this.resources.images && this.resources.images.levelBackground && this.resources.images.levelBackground.image) {
            const img = this.resources.images.levelBackground.image;
            const imgWidth = img.width;
            const imgHeight = img.height;
            const canvasWidth = this.canvas.width;
            const canvasHeight = this.canvas.height;
            
            // Calculate aspect ratios
            const imgAspect = imgWidth / imgHeight;
            const canvasAspect = canvasWidth / canvasHeight;
            
            // Variables for the crop/position calculation
            let sx = 0;
            let sy = 0;
            let sWidth = imgWidth;
            let sHeight = imgHeight;
            
            // Implement CSS "cover" behavior
            if (imgAspect > canvasAspect) {
                sWidth = imgHeight * canvasAspect;
                sx = (imgWidth - sWidth) / 2;
            } else if (imgAspect < canvasAspect) {
                sHeight = imgWidth / canvasAspect;
                sy = (imgHeight - sHeight) / 2;
            }
            
            // Draw the image to fill the entire canvas
            this.ctx.drawImage(
                img,
                sx, sy, sWidth, sHeight,
                0, 0, canvasWidth, canvasHeight
            );
        }
        
        // Draw game elements without the inset border effect
        this.level?.draw();
        this.goal?.draw();
        this.boxes?.draw();
        this.player?.draw();
        this.score?.draw();
        
        // Draw small logo in the top-left corner during gameplay
        this.drawCornerLogo();
        
        // Draw top action buttons during gameplay
        if (this.state === GAME_STATES.PLAY) {
            this.drawTopActionButtons();
        }
    }
    
    /**
     * Draw top action buttons for game controls
     */
    drawTopActionButtons() {
        const buttonSize = 48;
        const spacing = 10;
        const topMargin = 10;
        
        // Button images from resources - use the correct keys that match how they were loaded
        const buttonImages = {
            pause: this.resources.images.ACTION_PAUSE?.image,
            undo: this.resources.images.ACTION_UNDO?.image,
            settings: this.resources.images.ACTION_SETTINGS?.image
        };
        
        // Calculate the total width needed for the buttons to be centered
        const totalButtonsCount = 3; // pause, undo, settings
        const totalWidth = (buttonSize * totalButtonsCount) + (spacing * (totalButtonsCount - 1));
        
        // Calculate starting X position to center the buttons
        const startX = (this.canvas.width - totalWidth) / 2;
        
        // Track clickable areas for each button
        this.topButtonAreas = {};
        
        // Current X position
        let currentX = startX;
        
        // Pause button (leftmost)
        if (buttonImages.pause) {
            this.ctx.drawImage(buttonImages.pause, currentX, topMargin, buttonSize, buttonSize);
            this.topButtonAreas.pause = { x: currentX, y: topMargin, width: buttonSize, height: buttonSize };
            currentX += (buttonSize + spacing);
        }
        
        // Undo button (middle)
        if (buttonImages.undo) {
            this.ctx.drawImage(buttonImages.undo, currentX, topMargin, buttonSize, buttonSize);
            this.topButtonAreas.undo = { x: currentX, y: topMargin, width: buttonSize, height: buttonSize };
            currentX += (buttonSize + spacing);
        }
        
        // Settings button (rightmost)
        if (buttonImages.settings) {
            this.ctx.drawImage(buttonImages.settings, currentX, topMargin, buttonSize, buttonSize);
            this.topButtonAreas.settings = { x: currentX, y: topMargin, width: buttonSize, height: buttonSize };
        }
    }

    /**
     * Draw a small logo in the top-left corner of the game screen
     */
    drawCornerLogo() {
        if (this.resources.images && this.resources.images.logo && this.resources.images.logo.image) {
            const logoImg = this.resources.images.logo.image;
            const padding = 10; // Increased padding from the corner
            const logoSize = 100; // Small size for the corner logo
            const aspectRatio = logoImg.width / logoImg.height;
            const logoWidth = logoSize * aspectRatio;
            const logoHeight = logoSize;
            
            // Draw logo with shadow for better visibility against different backgrounds
            this.ctx.save();
            
            // Draw shadow first
            this.ctx.globalAlpha = 0.3;
            this.ctx.drawImage(
                logoImg,
                padding + 2,
                padding + 2,
                logoWidth,
                logoHeight
            );
            
            // Draw actual logo
            this.ctx.globalAlpha = 0.8;
            this.ctx.drawImage(
                logoImg,
                padding,
                padding,
                logoWidth,
                logoHeight
            );
            
            this.ctx.restore();            
        }
    }

    /**
     * Prepare the screen with background
     */
    prepareScreen() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.ctx.canvas.height);
        gradient.addColorStop(0, CANVAS.BACKGROUND_COLOR);
        gradient.addColorStop(1, CANVAS.BACKGROUND_COLOR);

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }

    /**
     * Display loading screen
     */
    showLoadingScreen() {
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        this.stars3d.draw();

        const textX = this.ctx.canvas.width / 2;
        const textY = this.ctx.canvas.height / 2;

        // Check if logo is loaded
        if (this.resources.images && this.resources.images.logo && this.resources.images.logo.image) {
            const logoImg = this.resources.images.logo.image;
            const logoWidth = logoImg.width;
            const logoHeight = logoImg.height;
            
            // Calculate animation progress
            const elapsed = Date.now() - this.logoAnimationStartTime;
            const progress = Math.min(elapsed / this.logoAnimationDuration, 1);
            
            // Apply easing function for smoother animation
            const easedProgress = this._easeOutBack(progress);
            
            // Calculate scale factor from 0.5 to 1.0
            const scale = 0.5 + 0.5 * easedProgress;
            
            // Calculate opacity from 0 to 1
            const opacity = easedProgress;
            
            // Save context state before transformation
            this.ctx.save();
            
            // Set global alpha for fade-in
            this.ctx.globalAlpha = opacity;
            
            // Calculate scaled dimensions
            const scaledWidth = logoWidth * scale;
            const scaledHeight = logoHeight * scale;
            
            // Draw scaled and centered logo
            this.ctx.drawImage(
                logoImg, 
                textX - scaledWidth / 2, 
                textY - scaledHeight / 2, 
                scaledWidth, 
                scaledHeight
            );
            
            // Restore context state
            this.ctx.restore();
        } else {
            // Draw placeholder loading screen if logo isn't loaded yet
            this.ctx.font = "30px Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillStyle = "white";
            this.ctx.fillText(this.resources.i18n.get('loading.title'), textX, textY - 20);
        }
        
        // Position the "Press Space to Load Game" text much lower on the screen
        const instructionY = textY + 200; // Increased from +150 to +200 for even lower position
        
        this.ctx.font = "20px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillStyle = "black";
        this.ctx.fillText(this.resources.i18n.get('loading.preparing'), textX, instructionY);
        this.ctx.fillStyle = "white";
        this.ctx.fillText(this.resources.i18n.get('loading.preparing'), textX - 2, instructionY - 2);
    }
    
    /**
     * Easing function for smoother animations
     * @param {number} t - Progress value between 0 and 1
     * @returns {number} - Eased value
     * @private
     */
    _easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    /**
     * Display game mode selection screen
     */
    showGameModeScreen() {
        // Draw the background image with "cover" behavior
        if (this.resources.images && this.resources.images.levelBackground && this.resources.images.levelBackground.image) {
            const img = this.resources.images.levelBackground.image;
            const imgWidth = img.width;
            const imgHeight = img.height;
            const canvasWidth = this.canvas.width;
            const canvasHeight = this.canvas.height;
            
            // Calculate aspect ratios
            const imgAspect = imgWidth / imgHeight;
            const canvasAspect = canvasWidth / canvasHeight;
            
            // Variables for the crop/position calculation
            let sx = 0;
            let sy = 0;
            let sWidth = imgWidth;
            let sHeight = imgHeight;
            
            // Implement CSS "cover" behavior
            if (imgAspect > canvasAspect) {
                sWidth = imgHeight * canvasAspect;
                sx = (imgWidth - sWidth) / 2;
            } else if (imgAspect < canvasAspect) {
                sHeight = imgWidth / canvasAspect;
                sy = (imgHeight - sHeight) / 2;
            }
            
            // Draw the image to fill the entire canvas
            this.ctx.drawImage(
                img,
                sx, sy, sWidth, sHeight,
                0, 0, canvasWidth, canvasHeight
            );
        } else {
            // Fallback if image isn't loaded
            this.ctx.fillStyle = "#000000";
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Draw logo at the top
        const logoImg = this.resources.images.logo.image;
        const logoWidth = logoImg.width * 0.7; // Scale down a bit
        const logoHeight = logoImg.height * 0.7;
        
        const logoX = this.ctx.canvas.width / 2 - logoWidth / 2;
        const logoY = 50;
        this.ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
        
        // Title text
        this.ctx.font = "36px Arial";
        this.ctx.fillStyle = "#fff";
        this.ctx.textAlign = "center";
        
        // Draw title with shadow
        const titleY = logoY + logoHeight + 40;
        this.ctx.fillStyle = "rgba(0,0,0,0.7)";
        this.ctx.fillText(this.resources.i18n.get('gameModes.select'), this.canvas.width / 2 + 2, titleY + 2);
        this.ctx.fillStyle = "#ffaa00";
        this.ctx.fillText(this.resources.i18n.get('gameModes.select'), this.canvas.width / 2, titleY);
        
        // Draw buttons for different game modes
        const btnPlayImg = this.resources.images.btnPlay.image;
        const buttonWidth = btnPlayImg.width;
        const buttonHeight = btnPlayImg.height;
        
        // Calculate positions for 3 buttons with equal spacing
        const buttonsStartY = titleY + 60;
        const buttonSpacing = 20;
        
        // Normal Mode Button
        const normalModeX = this.canvas.width / 2 - buttonWidth / 2;
        const normalModeY = buttonsStartY;
        this.ctx.drawImage(btnPlayImg, normalModeX, normalModeY);
        
        // Get "NORMAL MODE" text and convert to uppercase
        const normalModeText = this.resources.i18n.get('gameModes.normal').toUpperCase();
        
        // Adjust font size based on text length to prevent overflow
        let normalModeFontSize = 30; // Default size
        if (normalModeText.length > 10) {
            normalModeFontSize = 24; // Smaller text for longer strings
        }
        if (normalModeText.length > 15) {
            normalModeFontSize = 20; // Even smaller for very long translations
        }
        
        this.ctx.font = `bold ${normalModeFontSize}px Arial`;
        
        // Position text centered in the button
        const normalModeCenterY = normalModeY + buttonHeight / 2 + 10; // +10 for optical centering
        
        // Text shadow for better visibility
        this.ctx.fillStyle = "rgba(0,0,0,0.7)";
        this.ctx.fillText(normalModeText, normalModeX + buttonWidth / 2 + 2, normalModeCenterY + 2);
        
        // Main text color
        this.ctx.fillStyle = "white";
        this.ctx.fillText(normalModeText, normalModeX + buttonWidth / 2, normalModeCenterY);
        
        // Time Attack Button
        const timeAttackX = normalModeX;
        const timeAttackY = normalModeY + buttonHeight + buttonSpacing;
        this.ctx.drawImage(btnPlayImg, timeAttackX, timeAttackY);
        
        // Get "TIME ATTACK" text and convert to uppercase
        const timeAttackText = this.resources.i18n.get('gameModes.timeAttack').toUpperCase();
        
        // Adjust font size based on text length to prevent overflow
        let timeAttackFontSize = 30; // Default size
        if (timeAttackText.length > 10) {
            timeAttackFontSize = 24; // Smaller text for longer strings
        }
        if (timeAttackText.length > 15) {
            timeAttackFontSize = 20; // Even smaller for very long translations
        }
        
        this.ctx.font = `bold ${timeAttackFontSize}px Arial`;
        
        // Position text centered in the button
        const timeAttackCenterY = timeAttackY + buttonHeight / 2 + 10; // +10 for optical centering
        
        // Text shadow for better visibility
        this.ctx.fillStyle = "rgba(0,0,0,0.7)";
        this.ctx.fillText(timeAttackText, timeAttackX + buttonWidth / 2 + 2, timeAttackCenterY + 2);
        
        // Main text color
        this.ctx.fillStyle = "white";
        this.ctx.fillText(timeAttackText, timeAttackX + buttonWidth / 2, timeAttackCenterY);
        
        // Challenge Mode Button
        const challengeModeX = normalModeX;
        const challengeModeY = timeAttackY + buttonHeight + buttonSpacing;
        this.ctx.drawImage(btnPlayImg, challengeModeX, challengeModeY);
        
        // Get "CHALLENGE MODE" text and convert to uppercase
        const challengeModeText = this.resources.i18n.get('gameModes.challenge').toUpperCase();
        
        // Adjust font size based on text length to prevent overflow
        let challengeModeFontSize = 30; // Default size
        if (challengeModeText.length > 10) {
            challengeModeFontSize = 24; // Smaller text for longer strings
        }
        if (challengeModeText.length > 15) {
            challengeModeFontSize = 20; // Even smaller for very long translations
        }
        
        this.ctx.font = `bold ${challengeModeFontSize}px Arial`;
        
        // Position text centered in the button
        const challengeModeCenterY = challengeModeY + buttonHeight / 2 + 10; // +10 for optical centering
        
        // Text shadow for better visibility
        this.ctx.fillStyle = "rgba(0,0,0,0.7)";
        this.ctx.fillText(challengeModeText, challengeModeX + buttonWidth / 2 + 2, challengeModeCenterY + 2);
        
        // Main text color
        this.ctx.fillStyle = "white";
        this.ctx.fillText(challengeModeText, challengeModeX + buttonWidth / 2, challengeModeCenterY);
        
        // Back button (smaller, centered at bottom)
        const backButtonScale = 0.8;
        const backButtonWidth = buttonWidth * backButtonScale;
        const backButtonHeight = buttonHeight * backButtonScale;
        const backButtonX = this.canvas.width / 2 - backButtonWidth / 2; // Center horizontally
        const backButtonY = this.canvas.height - backButtonHeight - 20;
        
        // Draw scaled back button
        this.ctx.save();
        this.ctx.translate(backButtonX, backButtonY);
        this.ctx.scale(backButtonScale, backButtonScale);
        this.ctx.drawImage(btnPlayImg, 0, 0);
        this.ctx.restore();
        
        // Back button label
        this.ctx.font = "bold 18px Arial";
        const backButtonCenterX = backButtonX + backButtonWidth / 2;
        const backButtonCenterY = backButtonY + backButtonHeight / 2 + 6;
        
        this.ctx.fillStyle = "rgba(0,0,0,0.7)";
        this.ctx.fillText(this.resources.i18n.get('buttons.back'), backButtonCenterX + 2, backButtonCenterY + 2);
        this.ctx.fillStyle = "white";
        this.ctx.fillText(this.resources.i18n.get('buttons.back'), backButtonCenterX, backButtonCenterY);
        
        // Mode descriptions
        this.ctx.font = "16px Arial";
        this.ctx.textAlign = "center";
        
        // Store clickable areas for the buttons
        this.buttonAreas = {
            normalMode: { x: normalModeX, y: normalModeY, width: buttonWidth, height: buttonHeight },
            timeAttack: { x: timeAttackX, y: timeAttackY, width: buttonWidth, height: buttonHeight },
            challengeMode: { x: challengeModeX, y: challengeModeY, width: buttonWidth, height: buttonHeight },
            back: { x: backButtonX, y: backButtonY, width: backButtonWidth, height: backButtonHeight }
        };
    }

    /**
     * Display winning level screen
     */
    showWinningLevelScreen() {
        this.ctx.font = "30px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillStyle = "black";

        const textX = this.ctx.canvas.width / 2;
        const textY = this.ctx.canvas.height / 2;

        this.ctx.fillText(this.resources.i18n.get('game.victory'), textX, textY);
        this.ctx.fillStyle = "white";
        this.ctx.fillText(this.resources.i18n.get('game.victory'), textX-3, textY-3);    

        this.ctx.font = "15px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillStyle = "black";
        
        this.ctx.fillText(this.resources.i18n.get('game.nextLevel'), textX, textY + 30);
        this.ctx.fillStyle = "white";
        this.ctx.fillText(this.resources.i18n.get('game.nextLevel'), textX-3, textY-3 + 30);
    }

    /**
     * Show pause screen overlay
     */
    showPauseScreen() {
        // Semi-transparent overlay for the background
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const textX = this.ctx.canvas.width / 2;
        const textY = this.ctx.canvas.height / 2 - 50;
        
        // Create a wooden panel for the pause menu (similar to settings dialog)
        const panelWidth = 400;
        const panelHeight = 200;
        const panelX = textX - panelWidth / 2;
        const panelY = textY - panelHeight / 4;
        
        // Draw wooden background
        if (this.resources.images && this.resources.images.levelBackground && this.resources.images.levelBackground.image) {
            // Draw the wood panel background
            this.ctx.save();
            
            // Create a clip region for the panel
            this.ctx.beginPath();
            this.ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 15);
            this.ctx.clip();
            
            // Draw the background image inside the clipped region
            this.ctx.drawImage(
                this.resources.images.levelBackground.image,
                panelX, 
                panelY, 
                panelWidth, 
                panelHeight
            );
            
            // Add a dark overlay for better text contrast
            this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
            this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
            
            this.ctx.restore();
            
            // Draw border
            this.ctx.save();
            this.ctx.strokeStyle = "#3a2214";
            this.ctx.lineWidth = 8;
            this.ctx.beginPath();
            this.ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 15);
            this.ctx.stroke();
            this.ctx.restore();
        } else {
            // Fallback if image is not available
            this.ctx.fillStyle = "rgba(101, 67, 33, 0.9)";
            this.ctx.beginPath();
            this.ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 15);
            this.ctx.fill();
            
            this.ctx.strokeStyle = "#3a2214";
            this.ctx.lineWidth = 8;
            this.ctx.beginPath();
            this.ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 15);
            this.ctx.stroke();
        }
        
        // Draw pause text with shadow for better visibility
        this.ctx.font = "30px Arial";
        this.ctx.textAlign = "center";
        
        // Text shadow
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        this.ctx.fillText(this.resources.i18n.get('settings.paused'), textX + 2, textY + 2);
        
        // Main text
        this.ctx.fillStyle = "#faf0dc";
        this.ctx.fillText(this.resources.i18n.get('settings.paused'), textX, textY);
        
        // Draw a play/continue button similar to the one on the main screen
        if (this.resources.images.btnPlay && this.resources.images.btnPlay.image) {
            const btnPlayImg = this.resources.images.btnPlay.image;
            const btnX = textX - btnPlayImg.width / 2;
            const btnY = textY + 40;
            this.ctx.drawImage(btnPlayImg, btnX, btnY);
            
            // Get "CONTINUE" text and convert to uppercase
            const continueText = this.resources.i18n.get('buttons.play').toUpperCase();
            
            // Adjust font size based on text length to prevent overflow
            let fontSize = 30; // Default size
            if (continueText.length > 10) {
                fontSize = 24; // Smaller text for longer strings (like French)
            }
            if (continueText.length > 15) {
                fontSize = 20; // Even smaller for very long translations
            }
            
            this.ctx.font = `bold ${fontSize}px Arial`;
            
            // Position text centered in the button
            const btnCenterY = btnY + btnPlayImg.height/2 + 10; // +10 for optical centering
            
            // Text shadow for better visibility
            this.ctx.fillStyle = "rgba(0,0,0,0.7)";
            this.ctx.fillText(continueText, textX + 2, btnCenterY + 2);
            
            // Main text color
            this.ctx.fillStyle = "white";
            this.ctx.fillText(continueText, textX, btnCenterY);
        } else {
            // Fallback hint if button image is not available
            this.ctx.font = "16px Arial";
            
            // Text shadow
            this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            this.ctx.fillText(this.resources.i18n.get('settings.resumeHint'), textX + 1, textY + 40 + 1);
            
            // Main text
            this.ctx.fillStyle = "#faf0dc";
            this.ctx.fillText(this.resources.i18n.get('settings.resumeHint'), textX, textY + 40);
        }
    }

    /**
     * Show error message on screen
     * @param {Error} error - The error that occurred
     */
    showErrorMessage(error) {
        const textX = this.ctx.canvas.width / 2 - 160;
        const textY = this.ctx.canvas.height / 2 + 120;
        this.ctx.font = "16px Arial";
        this.ctx.fillStyle = "red";
        this.ctx.fillText(this.resources.i18n.get('error.loading'), textX, textY);
    }

    /**
     * Set up a new game with all required objects
     */
    setupGame() {
        // Clean up existing objects
        this.player = null;
        this.boxes = null;
        this.level = null;
        this.goal = null;
        this.score = null;

        // Create new game objects
        const sizeBox = TILES.OUTPUT_SIZE;
        this.player = new Player(
            this.ctx, 
            this.resources.images.player.image, 
            TILES.PLAYER_SOURCE_SIZE, 
            sizeBox, 
            TILES.PLAYER_EXTRA_SIZE
        );
        this.level = new Level(
            this.ctx, 
            this.resources.images.tiles.image, 
            TILES.SOURCE_SIZE, 
            sizeBox
        );
        this.boxes = new Boxes(
            this.ctx, 
            this.resources.images.tiles.image, 
            TILES.SOURCE_SIZE, 
            sizeBox
        );
        this.goal = new Goal(
            this.ctx, 
            this.resources.images.tiles.image, 
            TILES.SOURCE_SIZE, 
            sizeBox
        );
        this.score = new Score(this.ctx, this.resources);
        this.score.level = this.currentLevel + 1;
    }

    /**
     * Check if enough time has passed to process a key press
     * @returns {boolean} - True if can process key press
     */
    canProcessKeyPress() {
        const now = Date.now();
        if (now - this.lastKeyPressTime >= this.keyThrottleDelay) {
            this.lastKeyPressTime = now;
            return true;
        }
        return false;
    }

    /**
     * Set game state using the state machine pattern
     * @param {string} newState - New game state
     * @returns {boolean} - True if state transition was successful
     */
    setState(newState) {
        // Check if the transition is allowed
        const allowedTransitions = STATE_TRANSITIONS[this.state];
        if (!allowedTransitions.includes(newState)) {
            console.warn(`Invalid state transition: ${this.state} -> ${newState}`);
            return false;
        }

        // Handle state-specific actions
        this._exitState(this.state);
        this._enterState(newState);
        
        // Update the state
        this.state = newState;
        return true;
    }
    
    /**
     * Handle actions when exiting a state
     * @param {string} state - The state being exited
     * @private
     */
    _exitState(state) {
        switch (state) {
            case GAME_STATES.PLAY:
                // Stop the game timer when leaving play state
                this.score?.stopTimer();
                break;
            case GAME_STATES.INTRO:
                // Stop intro music when leaving intro
                // Make sure to completely stop the music, not just pause it
                this.resources.sound.music.pause();
                this.resources.sound.music.currentTime = 0;
                break;
            case GAME_STATES.WIN:
                // Stop victory sound
                this.resources.sound.victory.pause();
                break;
        }
    }
    
    /**
     * Handle actions when entering a state
     * @param {string} state - The state being entered
     * @private
     */
    _enterState(state) {
        switch (state) {
            case GAME_STATES.PLAY:
                // Don't automatically start the timer when entering PLAY state
                // The timer will be started on the first player move instead
                break;
            case GAME_STATES.INTRO:
                // Play intro music
                this.resources.playBackgroundMusic(true); // Using our updated method
                break;
            case GAME_STATES.WIN:
                // Play victory sound using the updated playSound method
                this.resources.playSound('victory');
                break;
            case GAME_STATES.PAUSED:
                // Optional: Display pause screen elements
                break;
        }
    }

    /**
     * Add a pause/resume feature to the game
     * Can be called from UI or keyboard shortcuts
     */
    togglePause() {
        if (this.state === GAME_STATES.PLAY) {
            this.setState(GAME_STATES.PAUSED);
        } else if (this.state === GAME_STATES.PAUSED) {
            this.setState(GAME_STATES.PLAY);
        }
    }

    /**
     * Open the level editor
     */
    openLevelEditor() {
        if (!this.editor) {
            // Initialize the level editor if it doesn't exist
            this.editor = new LevelEditor(
                this.ctx,
                this.resources.images.tiles.image,
                TILES.SOURCE_SIZE,
                TILES.OUTPUT_SIZE
            );
        }
        
        // Switch to editor state
        this.setState(GAME_STATES.EDITOR);
        
        // Show the editor UI
        this.editor.show();
    }
    
    /**
     * Test a custom level from the level editor
     * @param {Object} levelData - The level data to test
     */
    testCustomLevel(levelData) {
        // Store the custom level
        this.levelData = levelData;
        this.isCustomLevel = true;
        
        // Set up the game with the custom level
        this.setupGame();
        this.state = GAME_STATES.PLAY;
        
        // Initialize the boxes score counter to show current boxes on goals
        if (this.boxes) {
            this.boxes.updateBoxesScore();
        }
    }
    
    /**
     * Return to the game from the editor
     */
    returnFromEditor() {
        // Return to the intro screen
        this.setState(GAME_STATES.INTRO);
    }

    /**
     * Set current level
     * @param {number} levelIndex - Level index to set
     */
    setCurrentLevel(levelIndex) {
        this.currentLevel = levelIndex;
    }

    /**
     * Restart current level
     */
    restartLevel() {
        this.changeLevel(this.currentLevel);
    }

    /**
     * Change to a different level
     * @param {number} levelIndex - Level to change to
     */
    changeLevel(levelIndex) {
        this.levelData = JSON.parse(JSON.stringify(this.levelsData[levelIndex]));
        this.currentLevel = levelIndex;
        this.setupGame();
        this.state = GAME_STATES.PLAY;
        
        // Initialize the boxes score counter to show current boxes on goals
        if (this.boxes) {
            this.boxes.updateBoxesScore();
        }
        
        // Set up game mode specific settings
        if (this.gameMode === GAME_MODES.TIME_ATTACK) {
            // Set time goal based on best time or default time
            this.setupTimeAttackMode(levelIndex);
        } else if (this.gameMode === GAME_MODES.CHALLENGE) {
            this.setupChallengeMode(levelIndex);
        } else if (this.gameMode === GAME_MODES.NORMAL) {
            // Load personal best statistics for normal mode
            this.updatePersonalBest();
        }
    }
    
    /**
     * Setup Time Attack mode for a specific level
     * @param {number} levelIndex - Level index to set up time attack mode for
     */
    setupTimeAttackMode(levelIndex) {
        const levelKey = `level_${levelIndex}`;
        let bestTime = this.gameModeSettings.timeAttack.bestTimes[levelKey];
        
        // If there's no best time yet, set a default goal based on level complexity
        if (!bestTime) {
            // Calculate a default time goal based on the level complexity
            const levelSize = this.levelData.width * this.levelData.height;
            const boxCount = this.boxes ? this.boxes.boxes.length : 0;
            
            // Base time: 2 minutes + adjustments for level size and box count
            const baseTime = 120000; // 2 minutes in ms
            const sizeAdjustment = levelSize * 100; // 100ms per tile
            const boxAdjustment = boxCount * 15000; // 15 seconds per box
            
            // Calculate time goal with minimum of 30 seconds
            bestTime = Math.max(30000, baseTime + sizeAdjustment + boxAdjustment);
            
            // Store it temporarily
            this.gameModeSettings.timeAttack.defaultTimes = this.gameModeSettings.timeAttack.defaultTimes || {};
            this.gameModeSettings.timeAttack.defaultTimes[levelKey] = bestTime;
        }
        
        // Set the time goal in the score display
        if (this.score) {
            this.score.setTimeGoal(bestTime);
        }
    }

    /**
     * Setup Challenge Mode constraints for a specific level
     * @param {number} levelIndex - Level index to set up challenge mode for
     */
    setupChallengeMode(levelIndex) {
        // Default number of moves allowed is the base solution length × multiplier
        // For simplicity, we'll use a formula based on level size
        const levelData = this.levelData;
        const levelWidth = levelData.width;
        const levelHeight = levelData.height;
        const levelSize = levelWidth * levelHeight;
        
        // More complex levels get more moves
        // Start with a base number of moves proportional to level size
        const baseMoves = Math.floor(levelSize * 0.8);
        const movesLimit = Math.max(30, baseMoves * this.gameModeSettings.challenge.defaultMovesMultiplier);
        
        // Set time limit based on level complexity
        const timeLimit = this.gameModeSettings.challenge.defaultTimeLimit * 
                         (levelSize / 100); // Larger levels get more time
        
        // Apply constraints
        this.gameModeSettings.challenge.movesLimit = Math.floor(movesLimit);
        this.gameModeSettings.challenge.timeLimit = Math.floor(timeLimit);
        
        // Show challenge mode UI with move/time limits
        this.showChallengeModeUI();
    }

    /**
     * Show Challenge Mode UI with move/time limits
     */
    showChallengeModeUI() {
        // Create a UI panel to display the challenge constraints
        const modal = document.createElement('div');
        modal.id = 'challenge-mode-info';
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.backgroundColor = '#8B4513';
        modal.style.borderRadius = '10px';
        modal.style.padding = '20px';
        modal.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
        modal.style.textAlign = 'center';
        modal.style.maxWidth = '500px';
        modal.style.width = '80%';
        modal.style.border = '8px solid #3a2214';
        modal.style.zIndex = '1000';
        modal.style.color = 'white';
        modal.style.fontFamily = 'Arial, sans-serif';
        
        // Create heading
        const heading = document.createElement('h2');
        heading.textContent = 'Challenge Mode';
        heading.style.color = '#ffaa00';
        heading.style.marginTop = '0';
        
        // Create challenge info
        const movesLimit = document.createElement('p');
        movesLimit.textContent = `Moves Limit: ${this.gameModeSettings.challenge.movesLimit}`;
        movesLimit.style.fontSize = '18px';
        movesLimit.style.marginBottom = '10px';
        
        const timeLimit = document.createElement('p');
        const formattedTime = this.score.formatTime(this.gameModeSettings.challenge.timeLimit);
        timeLimit.textContent = `Time Limit: ${formattedTime}`;
        timeLimit.style.fontSize = '18px';
        timeLimit.style.marginBottom = '20px';
        
        // Create start button
        const startBtn = document.createElement('button');
        startBtn.textContent = 'Start Challenge!';
        startBtn.style.backgroundColor = '#654321';
        startBtn.style.color = 'white';
        startBtn.style.border = 'none';
        startBtn.style.padding = '10px 20px';
        startBtn.style.borderRadius = '5px';
        startBtn.style.fontSize = '16px';
        startBtn.style.cursor = 'pointer';
        
        // Add hover effect
        startBtn.onmouseover = () => {
            startBtn.style.backgroundColor = '#755431';
        };
        startBtn.onmouseout = () => {
            startBtn.style.backgroundColor = '#654321';
        };
        
        // Start the challenge when clicked
        startBtn.onclick = () => {
            document.body.removeChild(modal);
            // Start the timer when challenge begins
            if (this.score) {
                this.score.resetTimer();
                this.score.startTimer();
            }
        };
        
        // Append elements
        modal.appendChild(heading);
        modal.appendChild(movesLimit);
        modal.appendChild(timeLimit);
        modal.appendChild(startBtn);
        
        document.body.appendChild(modal);
    }

    /**
     * Check for player idle
     */
    checkPlayerIdle() {
        if (this.state === GAME_STATES.PLAY && this.player) {
            if (Date.now() - this.player.idle > 30000) {
                this.player.idleDetector();
                this.player.idle = Date.now();
            }
        }
    }

    /**
     * Check if level is complete (all boxes on goals)
     * @returns {boolean} - True if level is complete
     */
    checkLevelComplete() {
        // Make sure we have the same number of boxes and goals
        if (this.boxes.boxes.length !== this.goal.goals.length) {
            console.error("Number of boxes doesn't match number of goals!", this.boxes.boxes.length, this.goal.goals.length);
            return false;
        }

        // Count matched box-goal pairs
        let matchedCount = 0;
        
        // Check each box to see if it's on a goal
        for (const box of this.boxes.boxes) {
            for (const goalPoint of this.goal.goals) {
                if (box.x === goalPoint.x && box.y === goalPoint.y) {
                    matchedCount++;
                    break; // Found a match for this box, move to next box
                }
            }
        }

        // Win condition: all boxes are on goals
        if (matchedCount === this.goal.goals.length) {
            // Save level statistics immediately before showing win screen
            if (this.score) {
                // Save level statistics for normal mode
                if (this.gameMode === GAME_MODES.NORMAL) {
                    if (!this.levelStats) {
                        this.levelStats = {};
                    }
                    
                    const levelKey = `level_${this.currentLevel}`;
                    const currentStats = {
                        moves: this.score.moves,
                        pushes: this.score.pushes,
                        time: this.score.elapsedTime
                    };
                    
                    // Get existing stats or initialize new ones
                    const existingStats = this.levelStats[levelKey] || {};
                    
                    // Update best stats
                    this.levelStats[levelKey] = {
                        bestMoves: existingStats.bestMoves ? Math.min(existingStats.bestMoves, currentStats.moves) : currentStats.moves,
                        bestPushes: existingStats.bestPushes ? Math.min(existingStats.bestPushes, currentStats.pushes) : currentStats.pushes,
                        bestTime: existingStats.bestTime ? Math.min(existingStats.bestTime, currentStats.time) : currentStats.time,
                    };
                }
            }
            
            // Handle Time Attack mode best time tracking
            if (this.gameMode === GAME_MODES.TIME_ATTACK && this.score) {
                this.trackTimeAttackAchievement();
            }
            
            // Always sync progress regardless of auth state
            if (userManager) {
                // Make sure level is added to completedLevels immediately
                if (!userManager.progress) {
                    userManager.progress = {
                        currentLevel: this.currentLevel,
                        completedLevels: [this.currentLevel],
                        timeAttackBestTimes: {},
                        levelStats: this.levelStats || {}
                    };
                } else if (userManager.progress.completedLevels && 
                          !userManager.progress.completedLevels.includes(this.currentLevel)) {
                    userManager.progress.completedLevels.push(this.currentLevel);
                    
                    // Make sure level stats are up to date
                    if (this.levelStats && this.levelStats[`level_${this.currentLevel}`]) {
                        if (!userManager.progress.levelStats) {
                            userManager.progress.levelStats = {};
                        }
                        userManager.progress.levelStats[`level_${this.currentLevel}`] = 
                            this.levelStats[`level_${this.currentLevel}`];
                    }
                }
                
                // Force sync to save our progress
                userManager.syncProgress(true).catch(err => 
                    console.warn('Failed to sync progress after level completion:', err)
                );
            }

            this.setState(GAME_STATES.WIN);
            this.resources.sound.victory.currentTime = 0;
            this.resources.sound.victory.play();
            return true;
        }

        return false;
    }

    /**
     * Track and potentially save best time for Time Attack mode
     */
    trackTimeAttackAchievement() {
        // Only process if we're in Time Attack mode and have a valid score
        if (this.gameMode !== GAME_MODES.TIME_ATTACK || !this.score) {
            return;
        }
        
        const levelKey = `level_${this.currentLevel}`;
        const currentTime = this.score.elapsedTime;
        let bestTime = this.gameModeSettings.timeAttack.bestTimes[levelKey];
        let isNewBestTime = false;
        
        // Check if this is a new best time
        if (!bestTime || currentTime < bestTime) {
            // Save the new best time
            this.gameModeSettings.timeAttack.bestTimes[levelKey] = currentTime;
            bestTime = currentTime;
            isNewBestTime = true;
            
            // Try to save to localStorage
            try {
                const savedData = localStorage.getItem('sokoban_time_attack') || '{}';
                const timeAttackData = JSON.parse(savedData);
                timeAttackData[levelKey] = currentTime;
                localStorage.setItem('sokoban_time_attack', JSON.stringify(timeAttackData));
            } catch (e) {
                console.warn('Failed to save best time to localStorage:', e);
            }
            
            // If user is authenticated, sync progress to cloud
            if (this.isUserAuthenticated) {
                userManager.syncProgress(true).catch(err => 
                    console.warn('Failed to sync progress after new best time:', err)
                );
            }
        }
        
        // Show achievement message
        this.showTimeAttackResult(currentTime, bestTime, isNewBestTime);
    }

    /**
     * Show Time Attack mode results
     * @param {number} currentTime - Current completion time in milliseconds
     * @param {number} bestTime - Best time in milliseconds
     * @param {boolean} isNewBestTime - Whether this is a new best time
     */
    showTimeAttackResult(currentTime, bestTime, isNewBestTime) {
        // Create modal container for the results
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        modal.style.zIndex = '1000';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.5s';
        
        // Create panel for results
        const panel = document.createElement('div');
        panel.style.backgroundColor = '#8B4513';
        panel.style.borderRadius = '10px';
        panel.style.padding = '30px';
        panel.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
        panel.style.textAlign = 'center';
        panel.style.maxWidth = '500px';
        panel.style.width = '80%';
        panel.style.border = isNewBestTime ? '8px solid #ffd700' : '8px solid #3a2214';
        panel.style.transform = 'scale(0.9)';
        panel.style.transition = 'transform 0.5s';
        
        // Create title
        const title = document.createElement('h2');
        title.textContent = isNewBestTime ? 'New Best Time!' : 'Level Complete!';
        title.style.color = isNewBestTime ? '#ffd700' : '#ffaa00';
        title.style.marginTop = '0';
        title.style.fontSize = '28px';
        title.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        panel.appendChild(title);
        
        // Create current time display
        const currentTimeElem = document.createElement('div');
        currentTimeElem.style.marginTop = '20px';
        currentTimeElem.style.marginBottom = '10px';
        panel.appendChild(currentTimeElem);
        
        const currentTimeLabel = document.createElement('div');
        currentTimeLabel.textContent = 'Your Time:';
        currentTimeLabel.style.fontSize = '18px';
        currentTimeLabel.style.color = '#faf0dc';
        currentTimeElem.appendChild(currentTimeLabel);
        
        const currentTimeValue = document.createElement('div');
        currentTimeValue.textContent = this.score.formatTime(currentTime);
        currentTimeValue.style.fontSize = '36px';
        currentTimeValue.style.fontWeight = 'bold';
        currentTimeValue.style.color = isNewBestTime ? '#ffd700' : '#ffffff';
        currentTimeValue.style.textShadow = isNewBestTime ? '0 0 10px rgba(255,215,0,0.7)' : 'none';
        currentTimeElem.appendChild(currentTimeValue);
        
        // If there's a best time and it's not a new one, show comparison
        if (!isNewBestTime && bestTime) {
            const bestTimeElem = document.createElement('div');
            bestTimeElem.style.marginTop = '20px';
            bestTimeElem.style.marginBottom = '20px';
            panel.appendChild(bestTimeElem);
            
            const bestTimeLabel = document.createElement('div');
            bestTimeLabel.textContent = 'Best Time:';
            bestTimeLabel.style.fontSize = '16px';
            bestTimeLabel.style.color = '#faf0dc';
            bestTimeElem.appendChild(bestTimeLabel);
            
            const bestTimeValue = document.createElement('div');
            bestTimeValue.textContent = this.score.formatTime(bestTime);
            bestTimeValue.style.fontSize = '24px';
            bestTimeValue.style.color = '#ffd700';
            bestTimeElem.appendChild(bestTimeValue);
            
            // Show difference
            const difference = currentTime - bestTime;
            const differenceElem = document.createElement('div');
            differenceElem.textContent = `(+${this.score.formatTime(difference)})`;
            differenceElem.style.fontSize = '18px';
            differenceElem.style.color = '#ff6b6b';
            bestTimeElem.appendChild(differenceElem);
        }
        
        // Create continue button
        const continueBtn = document.createElement('button');
        continueBtn.textContent = 'Continue';
        continueBtn.style.marginTop = '20px';
        continueBtn.style.padding = '10px 30px';
        continueBtn.style.fontSize = '18px';
        continueBtn.style.backgroundColor = '#654321';
        continueBtn.style.color = 'white';
        continueBtn.style.border = 'none';
        continueBtn.style.borderRadius = '5px';
        continueBtn.style.cursor = 'pointer';
        continueBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        
        // Button hover effects
        continueBtn.onmouseover = () => {
            continueBtn.style.backgroundColor = '#755431';
            continueBtn.style.transform = 'translateY(-2px)';
            continueBtn.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
        };
        
        continueBtn.onmouseout = () => {
            continueBtn.style.backgroundColor = '#654321';
            continueBtn.style.transform = 'translateY(0)';
            continueBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        };
        
        // Continue button click handler - close the modal
        continueBtn.onclick = () => {
            modal.style.opacity = '0';
            panel.style.transform = 'scale(0.9)';
            
            setTimeout(() => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            }, 500);
        };
        
        panel.appendChild(continueBtn);
        modal.appendChild(panel);
        document.body.appendChild(modal);
        
        // Trigger animations
        setTimeout(() => {
            modal.style.opacity = '1';
            panel.style.transform = 'scale(1)';
        }, 50);
        
        // Add keyboard handler to close with Enter or Space
        const keyHandler = (e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                e.preventDefault();
                continueBtn.click();
                document.removeEventListener('keydown', keyHandler);
            }
        };
        document.addEventListener('keydown', keyHandler);
    }

    /**
     * Check Time Attack mode constraints (goal time)
     */
    checkTimeAttackConstraints() {
        if (this.gameMode !== GAME_MODES.TIME_ATTACK || !this.score) {
            return;
        }

        const timeGoal = this.score.timeGoal;
        if (timeGoal > 0 && this.score.elapsedTime > timeGoal) {
            // Time's up! Show failure message
            this.showChallengeFailureMessage('time');
        }
    }

    /**
     * Check challenge mode constraints (time limit, moves limit)
     * Called every frame when in challenge mode
     */
    checkChallengeConstraints() {
        if (this.gameMode !== GAME_MODES.CHALLENGE || !this.score) {
            return;
        }

        // Check time limit
        if (this.gameModeSettings.challenge.timeLimit > 0) {
            if (this.score.elapsedTime >= this.gameModeSettings.challenge.timeLimit) {
                // Time's up! Show failure message
                this.showChallengeFailureMessage('time');
            }
        }

        // Check moves limit
        if (this.gameModeSettings.challenge.movesLimit > 0) {
            if (this.score.moves >= this.gameModeSettings.challenge.movesLimit) {
                // Out of moves! Show failure message
                this.showChallengeFailureMessage('moves');
            }
        }
    }

    /**
     * Show a failure message when a challenge constraint is violated
     * @param {string} reason - Reason for failure ('time' or 'moves')
     */
    showChallengeFailureMessage(reason) {
        // Only show the message once
        if (this.state !== GAME_STATES.PLAY) {
            return;
        }

        // Pause the game
        this.setState(GAME_STATES.PAUSED);

        // Create failure message overlay
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; // Semi-transparent overlay like pause screen
        modal.style.zIndex = '1000';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.color = 'white';
        modal.style.fontFamily = 'Arial, sans-serif';

        // Create message panel
        const panel = document.createElement('div');
        
        // Use similar styling to pause screen panel
        const panelWidth = 400;
        const panelHeight = 250;
        
        panel.style.width = `${panelWidth}px`;
        panel.style.maxWidth = '80%';
        panel.style.borderRadius = '15px';
        panel.style.padding = '30px';
        panel.style.boxSizing = 'border-box';
        
        // Add wooden background like pause screen
        if (this.resources.images && this.resources.images.levelBackground && this.resources.images.levelBackground.image) {
            // Create background div with clipped background image
            panel.style.background = `url(${this.resources.images.levelBackground.image.src})`;
            panel.style.backgroundSize = 'cover';
            panel.style.position = 'relative';
            
            // Add dark overlay for better text contrast
            const overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
            overlay.style.borderRadius = '15px';
            panel.appendChild(overlay);
        } else {
            // Fallback if image is not available
            panel.style.backgroundColor = 'rgba(101, 67, 33, 0.9)';
        }
        
        // Add border like pause screen
        panel.style.border = '8px solid #3a2214';
        panel.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
        panel.style.textAlign = 'center';
        
        // Create content container (to appear above the overlay)
        const content = document.createElement('div');
        content.style.position = 'relative';
        content.style.zIndex = '1';
        panel.appendChild(content);

        // Create heading
        const heading = document.createElement('h2');
        heading.textContent = 'Challenge Failed!';
        heading.style.color = '#ffaa00';
        heading.style.marginTop = '0';
        heading.style.fontSize = '28px';
        heading.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
        content.appendChild(heading);
        
        // Create message
        const message = document.createElement('p');
        if (reason === 'time') {
            message.textContent = 'You ran out of time!';
        } else {
            message.textContent = 'You ran out of moves!';
        }
        message.style.fontSize = '20px';
        message.style.marginBottom = '30px';
        message.style.color = '#faf0dc';
        content.appendChild(message);
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.gap = '15px';
        buttonContainer.style.marginTop = '20px';
        content.appendChild(buttonContainer);
        
        // Create retry button
        const retryBtn = document.createElement('button');
        retryBtn.textContent = 'Retry Level';
        retryBtn.style.backgroundColor = '#654321';
        retryBtn.style.color = 'white';
        retryBtn.style.border = 'none';
        retryBtn.style.padding = '12px 20px';
        retryBtn.style.borderRadius = '5px';
        retryBtn.style.fontSize = '16px';
        retryBtn.style.cursor = 'pointer';
        retryBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        
        // Add hover/active effects
        retryBtn.onmouseover = () => {
            retryBtn.style.backgroundColor = '#755431';
            retryBtn.style.transform = 'translateY(-2px)';
            retryBtn.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
        };
        retryBtn.onmouseout = () => {
            retryBtn.style.backgroundColor = '#654321';
            retryBtn.style.transform = 'translateY(0)';
            retryBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        };
        buttonContainer.appendChild(retryBtn);
        
        // Create main menu button
        const menuBtn = document.createElement('button');
        menuBtn.textContent = 'Main Menu';
        menuBtn.style.backgroundColor = '#654321';
        menuBtn.style.color = 'white';
        menuBtn.style.border = 'none';
        menuBtn.style.padding = '12px 20px';
        menuBtn.style.borderRadius = '5px';
        menuBtn.style.fontSize = '16px';
        menuBtn.style.cursor = 'pointer';
        menuBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        
        // Add hover/active effects
        menuBtn.onmouseover = () => {
            menuBtn.style.backgroundColor = '#755431';
            menuBtn.style.transform = 'translateY(-2px)';
            menuBtn.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
        };
        menuBtn.onmouseout = () => {
            menuBtn.style.backgroundColor = '#654321';
            menuBtn.style.transform = 'translateY(0)';
            menuBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        };
        buttonContainer.appendChild(menuBtn);
        
        // Add click event listeners
        retryBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            this.restartLevel();
        });
        
        menuBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            this.setState(GAME_STATES.INTRO);
        });
        
        // Add keyboard handler to close with Enter or Space
        const keyHandler = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                retryBtn.click();
                document.removeEventListener('keydown', keyHandler);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                menuBtn.click();
                document.removeEventListener('keydown', keyHandler);
            }
        };
        document.addEventListener('keydown', keyHandler);
        
        // Append modal to body
        modal.appendChild(panel);
        document.body.appendChild(modal);
        
        // Animate the panel appearance
        panel.style.transform = 'scale(0.9)';
        panel.style.opacity = '0';
        panel.style.transition = 'transform 0.3s, opacity 0.3s';
        
        setTimeout(() => {
            panel.style.transform = 'scale(1)';
            panel.style.opacity = '1';
        }, 50);
    }

    /**
     * Check if device is mobile
     * @returns {boolean} - True if mobile device
     */
    isMobileDevice() {
        // More reliable detection using multiple factors
        
        // Check for touch capability
        const hasTouchScreen = (
            ('ontouchstart' in window) ||
            ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) ||
            ('msMaxTouchPoints' in navigator && navigator.msMaxTouchPoints > 0) ||
            (window.matchMedia && window.matchMedia('(pointer:coarse)').matches)
        );
        
        // Check for mobile user agent
        const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Check for small screen (typical for mobile devices)
        const isSmallScreen = window.innerWidth <= 1024;
        
        // For better reliability, consider touch capability as the primary factor
        // This will make sure tablets are correctly identified as mobile devices
        return hasTouchScreen;
    }

    /**
     * Get the current movement speed value in milliseconds
     * @returns {number} - Movement duration in milliseconds
     */
    getMovementDuration() {
        return PHYSICS.MOVEMENT_SPEEDS[this.settings.movementSpeed];
    }

    /**
     * Set the movement speed to a new value
     * @param {string} speedSetting - One of: 'SLOW', 'NORMAL', 'FAST', 'VERY_FAST'
     */
    setMovementSpeed(speedSetting) {
        if (PHYSICS.MOVEMENT_SPEEDS[speedSetting]) {
            this.settings.movementSpeed = speedSetting;
            this.currentSpeedSetting = speedSetting; // Store the current setting name
            
            // If player exists, update its movement duration
            if (this.player) {
                this.player.movementDuration = this.getMovementDuration();
            }
            
            // If boxes exist, update their movement duration
            if (this.boxes) {
                this.boxes.movementDuration = this.getMovementDuration();
            }
            
            // Save to local storage
            this.saveSettings();
        }
    }
    
    /**
     * Save game settings to local storage
     */
    saveSettings() {
        try {
            const settings = {
                movementSpeed: this.settings.movementSpeed,
                musicEnabled: !this.resources.sound.music.paused
            };
            
            localStorage.setItem('sokoban_settings', JSON.stringify(settings));
            console.log('Settings saved to local storage');
        } catch (e) {
            console.warn('Could not save settings to local storage:', e);
        }
    }
    
    /**
     * Load game settings from local storage
     */
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('sokoban_settings');
            
            if (savedSettings) {
                try {
                    const settings = JSON.parse(savedSettings);
                    
                    // Apply movement speed if valid
                    if (settings.movementSpeed && PHYSICS.MOVEMENT_SPEEDS[settings.movementSpeed]) {
                        this.settings.movementSpeed = settings.movementSpeed;
                        this.currentSpeedSetting = settings.movementSpeed;
                        console.log(`Loaded movement speed: ${settings.movementSpeed}`);
                    }
                    
                    // Apply music setting if defined
                    if (settings.musicEnabled !== undefined) {
                        if (settings.musicEnabled) {
                            // Only play music automatically in intro screen
                            if (this.state === GAME_STATES.INTRO) {
                                this.resources.playBackgroundMusic();
                            }
                        } else {
                            this.resources.sound.music.pause();
                        }
                    }
                } catch (parseError) {
                    // Handle JSON parse error specifically
                    console.warn('Error parsing settings from local storage:', parseError);
                    // Remove invalid settings data to prevent future errors
                    localStorage.removeItem('sokoban_settings');
                }
            }
        } catch (e) {
            console.warn('Could not load settings from local storage:', e);
        }
    }
}

// Create and export game instance
let gameInstance;

// Initialize the game when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById("mainCanvas");
    gameInstance = new Game(canvas);
    gameInstance.init();
});

// Export game functions and properties for other modules
export {
    gameInstance as game
};

// Legacy exports for compatibility with existing modules
// These should eventually be refactored to use the game instance
export function canProcessKeyPress() {
    return gameInstance.canProcessKeyPress();
}

export function hasMatchingCoordinates() {
    return gameInstance.checkLevelComplete();
}

export function restartLevel() {
    gameInstance.restartLevel();
}

export function changeLevel(num) {
    gameInstance.changeLevel(num);
}

export function setGameState(newState) {
    gameInstance.setState(newState);
}

export function setCurrentLevel(newLevel) {
    gameInstance.setCurrentLevel(newLevel);
}

export function isMobileDevice() {
    return gameInstance.isMobileDevice();
}

// Legacy exports - these should be accessed through gameInstance in refactored code
export const resources = gameInstance ? gameInstance.resources : null;
export let gameState = GAME_STATES.LOADING;
export let currentLevel = 0;
export let levelData = null;
export let levelsData = null;
export let player = null;
export let boxes = null;
export let goal = null;
export let level = null;
export let score = null;

// Update exports when game instance is ready
if (gameInstance) {
    Object.defineProperty(exports, 'gameState', {
        get: () => gameInstance.state
    });
    Object.defineProperty(exports, 'currentLevel', {
        get: () => gameInstance.currentLevel
    });
    Object.defineProperty(exports, 'levelData', {
        get: () => gameInstance.levelData
    });
    Object.defineProperty(exports, 'levelsData', {
        get: () => gameInstance.levelsData
    });
    Object.defineProperty(exports, 'player', {
        get: () => gameInstance.player
    });
    Object.defineProperty(exports, 'boxes', {
        get: () => gameInstance.boxes
    });
    Object.defineProperty(exports, 'goal', {
        get: () => gameInstance.goal
    });
    Object.defineProperty(exports, 'level', {
        get: () => gameInstance.level
    });
    Object.defineProperty(exports, 'score', {
        get: () => gameInstance.score
    });
}