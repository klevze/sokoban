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
import { GAME_STATES, PHYSICS, TILES, CANVAS, STATE_TRANSITIONS, VERSION, COPYRIGHT_YEAR, ASSET_PATHS } from './config/config.js';

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
        
        // Set canvas dimensions from config (both attribute and actual size)
        this.canvas.width = CANVAS.WIDTH;
        this.canvas.height = CANVAS.HEIGHT;
        
        this.ctx = canvas.getContext('2d');
        
        // Game components
        this.resources = new Resources();
        this.stars3d = new Stars3D(this.ctx, CANVAS.WIDTH, CANVAS.HEIGHT, 130, 2, 64);
        
        // Game objects (initialized in setupGame)
        this.player = null;
        this.boxes = null;
        this.level = null;
        this.goal = null;
        this.score = null;
        
        // Level management
        this.levelsData = null;
        this.levelData = null;
        this.currentLevel = 0;
        
        // Input handling
        this.lastKeyPressTime = 0;
        this.keyThrottleDelay = PHYSICS.KEY_THROTTLE_DELAY;
        
        // Game state
        this.state = GAME_STATES.LOADING;
        
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
        
        // Set document title using i18n
        document.title = this.resources.i18n.get('title');
        
        // Add language change event handler
        this.resources.i18n.onLanguageChange = () => {
            this.updateAllTexts();
        };
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
        
        // Add resize event listener
        window.addEventListener('resize', () => {
            this._resizeCanvas();
            
            // Reinitialize level positions if game is already running
            if (this.level) {
                this.level.initLevel();
            }
        });
    }
    
    /**
     * Resize canvas to fit window while maintaining aspect ratio
     * @private
     */
    _resizeCanvas() {
        const container = this.canvas.parentElement;
        if (!container) return;
        
        const targetWidth = CANVAS.WIDTH;
        const targetHeight = CANVAS.HEIGHT;
        const targetRatio = targetWidth / targetHeight;
        
        let width = container.clientWidth;
        let height = container.clientHeight;
        
        // Adjust dimensions to maintain aspect ratio
        if (width / height > targetRatio) {
            width = height * targetRatio;
        } else {
            height = width / targetRatio;
        }
        
        // Apply new dimensions
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        
        // Update stars position if initialized
        if (this.stars3d) {
            this.stars3d.centerX = Math.floor(this.canvas.width / 2);
            this.stars3d.centerY = Math.floor(this.canvas.height / 2);
        }
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
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                this.levelsData = JSON.parse(JSON.stringify(data));
                this.levelData = JSON.parse(JSON.stringify(this.levelsData[this.currentLevel]));
                return data;
            });
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
            case GAME_STATES.PLAY:
                this.renderGameElements();
                break;
            case GAME_STATES.WIN:
                this.renderGameElements();
                this.showWinningLevelScreen();
                break;
            case GAME_STATES.PAUSED:
                this.renderGameElements();
                this.showPauseScreen();
                break;
        }
    }

    /**
     * Renders all game elements
     */
    renderGameElements() {
        // Draw background image for levels
        if (this.resources.images && this.resources.images.levelBackground && this.resources.images.levelBackground.image) {
            // Draw the background image to fill the canvas
            this.ctx.drawImage(
                this.resources.images.levelBackground.image, 
                0, 
                0, 
                this.canvas.width, 
                this.canvas.height
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
     * Display intro/title screen
     */
    showIntroScreen() {
        // Draw the background image to fill the entire canvas using the dimensions from config
        this.ctx.drawImage(
            this.resources.images.main.image, 
            0, 
            0, 
            this.canvas.width, 
            this.canvas.height
        );

        this.ctx.textAlign = "center";
        this.ctx.font = "20px Arial";

        // Position logo with wave effect
        const logoImg = this.resources.images.logo.image;
        const logoWidth = logoImg.width;
        const logoHeight = logoImg.height;
        const frame = Date.now() * 0.01;

        // Animate the logo with a wave effect
        for (let y = 0; y < logoHeight; y++) {
            const x = Math.sin(y * 0.05 + frame) * 5 + (this.ctx.canvas.width / 2 - logoWidth / 2);
            this.ctx.drawImage(logoImg, 0, y, logoWidth, 1, x, y + -20, logoWidth, 1);
        }

        // Draw the play button - positioned at 80% of canvas height instead of fixed Y
        const btnPlayImg = this.resources.images.btnPlay.image;
        const btnX = this.ctx.canvas.width / 2 - btnPlayImg.width / 2;
        const btnY = this.canvas.height * 0.8; // Dynamic position at 80% of canvas height
        this.ctx.drawImage(btnPlayImg, btnX, btnY);
        
        // Get "NEW GAME" text and convert to uppercase
        const newGameText = this.resources.i18n.get('buttons.play').toUpperCase();
        
        // Adjust font size based on text length to prevent overflow
        let fontSize = 30; // Default size
        if (newGameText.length > 10) {
            fontSize = 24; // Smaller text for longer strings (like French)
        }
        if (newGameText.length > 15) {
            fontSize = 20; // Even smaller for very long translations
        }
        
        this.ctx.font = `bold ${fontSize}px Arial`;
        
        // Position text centered in the button
        const btnCenterY = btnY + btnPlayImg.height/2 + 10; // +10 for optical centering
        const textX = this.ctx.canvas.width / 2;
        
        // Text shadow for better visibility
        this.ctx.fillStyle = "rgba(0,0,0,0.7)";
        this.ctx.fillText(newGameText, textX + 2, btnCenterY + 2);
        
        // Main text color
        this.ctx.fillStyle = "white";
        this.ctx.fillText(newGameText, textX, btnCenterY);
        
        // Draw version info at the bottom right corner of the canvas
        this.ctx.font = "10px Arial";
        this.ctx.textAlign = "right";
        
        // Dynamic position for version text - 10px from right and bottom edges
        const versionX = this.canvas.width - 10;
        const versionY = this.canvas.height - 10;
        
        this.ctx.fillStyle = "black";
        this.ctx.fillText(`© ${COPYRIGHT_YEAR} / Version: ${VERSION}`, versionX + 1, versionY + 1);
        this.ctx.fillStyle = "white";
        this.ctx.fillText(`© ${COPYRIGHT_YEAR} / Version: ${VERSION}`, versionX, versionY);
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
        // Semi-transparent overlay
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const textX = this.ctx.canvas.width / 2;
        const textY = this.ctx.canvas.height / 2 - 100;
        
        // Draw pause text
        this.ctx.font = "30px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillStyle = "white";
        this.ctx.fillText(this.resources.i18n.get('settings.paused'), textX, textY);
        
        // Draw movement speed setting
        this.ctx.font = "20px Arial";
        this.ctx.fillText(this.resources.i18n.get('settings.movementSpeed') || "Movement Speed", textX, textY + 60);
        
        // Draw speed settings buttons
        this._drawSpeedButtons(textX, textY + 100);
        
        this.ctx.font = "16px Arial";
        this.ctx.fillText(this.resources.i18n.get('settings.resumeHint'), textX, textY + 180);
    }
    
    /**
     * Draw speed setting buttons with visual indication of the selected option
     * @param {number} centerX - Center X position for the buttons
     * @param {number} y - Y position for the buttons
     * @private
     */
    _drawSpeedButtons(centerX, y) {
        const buttonWidth = 100;
        const buttonHeight = 40;
        const buttonGap = 20;
        const totalWidth = (buttonWidth * 4) + (buttonGap * 3);
        const startX = centerX - (totalWidth / 2);
        
        const speedOptions = [
            { key: 'SLOW', label: this.resources.i18n.get('speeds.slow') || 'Slow' },
            { key: 'NORMAL', label: this.resources.i18n.get('speeds.normal') || 'Normal' },
            { key: 'FAST', label: this.resources.i18n.get('speeds.fast') || 'Fast' },
            { key: 'VERY_FAST', label: this.resources.i18n.get('speeds.veryFast') || 'Very Fast' }
        ];
        
        this.ctx.font = "16px Arial";
        this.ctx.textAlign = "center";
        
        // Store button data for click handling
        if (!this.speedButtons) {
            this.speedButtons = [];
        } else {
            this.speedButtons.length = 0;
        }
        
        for (let i = 0; i < speedOptions.length; i++) {
            const x = startX + (i * (buttonWidth + buttonGap));
            const option = speedOptions[i];
            const isSelected = this.settings.movementSpeed === option.key;
            
            // Store button area for click detection
            this.speedButtons.push({
                x: x,
                y: y,
                width: buttonWidth,
                height: buttonHeight,
                value: option.key
            });
            
            // Draw button background
            this.ctx.fillStyle = isSelected ? "#4CAF50" : "#555555";
            this.ctx.fillRect(x, y, buttonWidth, buttonHeight);
            
            // Draw button border
            this.ctx.strokeStyle = isSelected ? "#FFFFFF" : "#888888";
            this.ctx.lineWidth = isSelected ? 2 : 1;
            this.ctx.strokeRect(x, y, buttonWidth, buttonHeight);
            
            // Draw button text
            this.ctx.fillStyle = "white";
            this.ctx.fillText(option.label, x + buttonWidth / 2, y + buttonHeight / 2 + 6);
        }
    }

    /**
     * Show error message on screen
     * @param {Error} error - The error that occurred
     */
    showErrorMessage(error) {
        const textX = this.ctx.canvas.width / 2;
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
            console.error("Number of boxes doesn't match number of goals!");
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
            this.setState(GAME_STATES.WIN);
            this.resources.sound.victory.currentTime = 0;
            this.resources.sound.victory.play();
            return true;
        }

        return false;
    }

    /**
     * Check if device is mobile
     * @returns {boolean} - True if mobile device
     */
    isMobileDevice() {
        return /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);
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
            
            // If player exists, update its movement duration
            if (this.player) {
                this.player.movementDuration = this.getMovementDuration();
            }
            
            // If boxes exist, update their movement duration
            if (this.boxes) {
                this.boxes.movementDuration = this.getMovementDuration();
            }
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