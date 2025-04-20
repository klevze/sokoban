// Import dependencies
import { GAME_STATES, DEBUG } from './config/config.js';
import { game } from './game.js';

// Track if loading text element has been created
let loadingTextElement = null;

// Track pressed keys to prevent key repeating issues while still allowing continuous movement
const pressedKeys = new Set();
let continuousMovementInterval = null;

// Improved event handling for Sokoban game
export function initEvents(gameInstance) {
    const mainCanvas = document.getElementById("mainCanvas");
    const ctx = mainCanvas.getContext("2d");
    
    // Add loading text element for better user feedback
    if (!loadingTextElement) {
        loadingTextElement = document.createElement('div');
        loadingTextElement.id = 'loadingText';
        loadingTextElement.innerText = gameInstance.resources.i18n.get('game.loading');
        // Add styles directly to ensure it works
        loadingTextElement.style.position = 'absolute';
        loadingTextElement.style.top = '55%';
        loadingTextElement.style.left = '50%';
        loadingTextElement.style.transform = 'translate(-50%, -50%)';
        loadingTextElement.style.color = 'white';
        loadingTextElement.style.fontFamily = 'Arial, sans-serif';
        loadingTextElement.style.fontSize = '18px';
        loadingTextElement.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        loadingTextElement.style.zIndex = '10';
        document.getElementById('mainContent').appendChild(loadingTextElement);
    }
    
    // Set up touch controls for mobile devices
    setupTouchControls(gameInstance);
    
    // Mouse click event for buttons and game interactions
    mainCanvas.addEventListener("click", function(event) {
        handleCanvasClick(event, gameInstance);
    });

    // Function to process movement based on currently held keys
    function processContinuousMovement() {
        if (gameInstance.player && !gameInstance.player.isMoving &&
            gameInstance.state === GAME_STATES.PLAY) {
            
            // Process arrow keys in this priority order (first one found is executed)
            if (pressedKeys.has(37)) { // Left
                gameInstance.player.move(-1, 0);
            } else if (pressedKeys.has(38)) { // Up
                gameInstance.player.move(0, -1);
            } else if (pressedKeys.has(39)) { // Right
                gameInstance.player.move(1, 0);
            } else if (pressedKeys.has(40)) { // Down
                gameInstance.player.move(0, 1);
            }
        }
    }
    
    // Start continuous movement with a key press
    function startContinuousMovement() {
        stopContinuousMovement();
        // Initial movement occurs immediately
        processContinuousMovement();
        // Then set interval for continuous movement
        continuousMovementInterval = setInterval(processContinuousMovement, 50);
    }
    
    // Stop continuous movement
    function stopContinuousMovement() {
        if (continuousMovementInterval) {
            clearInterval(continuousMovementInterval);
            continuousMovementInterval = null;
        }
    }

    // Keyboard controls for desktop
    document.addEventListener("keydown", function(e) {
        // Prevent default actions for game keys to avoid page scrolling
        if ([27, 32, 37, 38, 39, 40, 80, 82, 68].includes(e.keyCode)) {
            e.preventDefault();
        }
        
        // Add key to pressed keys set
        pressedKeys.add(e.keyCode);
        
        // Debug mode toggle (D key)
        if (e.keyCode === 68 && e.ctrlKey) { // Ctrl+D
            toggleDebugMode();
            return;
        }
        
        // Always process ESC and P keys for pause functionality
        if (e.keyCode === 27 || e.keyCode === 80) { // ESC or P key
            gameInstance.togglePause();
            return;
        }
        
        // Don't process other keys when paused
        if (gameInstance.state === GAME_STATES.PAUSED) {
            return;
        }
        
        // Handle arrow keys for continuous movement
        if ([37, 38, 39, 40].includes(e.keyCode)) {
            startContinuousMovement();
            return;
        }
        
        // Handle other keys (non-directional)
        if (e.keyCode === 32) { // Space
            handleSpaceKey(gameInstance);
        } else if (e.keyCode === 82) { // R key
            handleRKey(gameInstance);
        }
    });
    
    // Add keyup event to track when keys are released
    document.addEventListener("keyup", function(e) {
        // Remove key from pressed keys set
        pressedKeys.delete(e.keyCode);
        
        // If all arrow keys are released, stop continuous movement
        if (![37, 38, 39, 40].some(key => pressedKeys.has(key))) {
            stopContinuousMovement();
        } else if ([37, 38, 39, 40].includes(e.keyCode)) {
            // If any arrow key was released but others are still pressed,
            // restart continuous movement to reflect the new direction
            startContinuousMovement();
        }
    });
    
    // Clear pressed keys and stop movement when window loses focus
    window.addEventListener("blur", function() {
        pressedKeys.clear();
        stopContinuousMovement();
    });
}

// Function to hide the loading text
export function hideLoadingText() {
    if (loadingTextElement) {
        loadingTextElement.style.opacity = '0';
        loadingTextElement.style.pointerEvents = 'none';
        
        // Remove from DOM after fade out
        setTimeout(() => {
            if (loadingTextElement && loadingTextElement.parentNode) {
                loadingTextElement.parentNode.removeChild(loadingTextElement);
                loadingTextElement = null;
            }
        }, 500);
    }
}

function setupTouchControls(gameInstance) {
    const mainCanvas = document.getElementById("mainCanvas");
    const upButton = document.getElementById('upButton');
    const leftButton = document.getElementById('leftButton');
    const rightButton = document.getElementById('rightButton');
    const downButton = document.getElementById('downButton');
    const virtualArrows = document.getElementById('virtualArrows');
    
    // Show virtual arrows on mobile devices
    if (gameInstance.isMobileDevice()) {
        virtualArrows.removeAttribute('hidden');
    }
    
    // Add touch event listeners to the directional buttons
    upButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameInstance.player && !gameInstance.player.isMoving && 
            gameInstance.state === GAME_STATES.PLAY && gameInstance.canProcessKeyPress()) {
            gameInstance.player.move(0, -1);
        }
    });
    
    leftButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameInstance.player && !gameInstance.player.isMoving && 
            gameInstance.state === GAME_STATES.PLAY && gameInstance.canProcessKeyPress()) {
            gameInstance.player.move(-1, 0);
        }
    });
    
    rightButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameInstance.player && !gameInstance.player.isMoving && 
            gameInstance.state === GAME_STATES.PLAY && gameInstance.canProcessKeyPress()) {
            gameInstance.player.move(1, 0);
        }
    });
    
    downButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameInstance.player && !gameInstance.player.isMoving && 
            gameInstance.state === GAME_STATES.PLAY && gameInstance.canProcessKeyPress()) {
            gameInstance.player.move(0, 1);
        }
    });
    
    // Create game control buttons container
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'game-controls';
    controlsContainer.style.position = 'absolute';
    controlsContainer.style.top = '20px';
    controlsContainer.style.left = '50%';
    controlsContainer.style.transform = 'translateX(-50%)';
    controlsContainer.style.display = 'flex';
    controlsContainer.style.gap = '15px';
    controlsContainer.style.zIndex = '100';
    controlsContainer.style.opacity = '0'; // Start hidden
    controlsContainer.style.transition = 'opacity 0.3s';
    
    // Add back to menu button using image asset
    const backToMenuButton = document.createElement('button');
    backToMenuButton.id = 'menu-button';
    backToMenuButton.title = gameInstance.resources.i18n.get('buttons.home');
    
    const homeImage = new Image();
    homeImage.src = gameInstance.resources.images.ACTION_HOME.image.src;
    homeImage.alt = 'Home';
    homeImage.style.width = '100%';
    homeImage.style.height = '100%';
    homeImage.style.objectFit = 'contain';
    backToMenuButton.appendChild(homeImage);
    
    backToMenuButton.style.padding = '6px';
    backToMenuButton.style.backgroundColor = 'transparent';
    backToMenuButton.style.border = 'none';
    backToMenuButton.style.borderRadius = '50%';
    backToMenuButton.style.cursor = 'pointer';
    backToMenuButton.style.width = '48px';
    backToMenuButton.style.height = '48px';
    
    backToMenuButton.addEventListener('click', () => {
        const confirmed = window.confirm(gameInstance.resources.i18n.get('game.confirmExit') || "Return to main menu?");
        if (confirmed) {
            gameInstance.setState(GAME_STATES.INTRO);
        }
    });
    
    // Add level select button using image asset
    const levelSelectButton = document.createElement('button');
    levelSelectButton.id = 'level-select-button';
    levelSelectButton.title = gameInstance.resources.i18n.get('buttons.levelSelect');
    
    const levelImage = new Image();
    levelImage.src = gameInstance.resources.images.ACTION_LEVEL.image.src;
    levelImage.alt = 'Level Select';
    levelImage.style.width = '100%';
    levelImage.style.height = '100%';
    levelImage.style.objectFit = 'contain';
    levelSelectButton.appendChild(levelImage);
    
    levelSelectButton.style.padding = '6px';
    levelSelectButton.style.backgroundColor = 'transparent';
    levelSelectButton.style.border = 'none';
    levelSelectButton.style.borderRadius = '50%';
    levelSelectButton.style.cursor = 'pointer';
    levelSelectButton.style.width = '48px';
    levelSelectButton.style.height = '48px';
    
    levelSelectButton.addEventListener('click', () => {
        showLevelSelectDialog(gameInstance);
    });
    
    // Add restart level button using image asset
    const restartButton = document.createElement('button');
    restartButton.id = 'restart-button';
    restartButton.title = gameInstance.resources.i18n.get('buttons.restart');
    
    const restartImage = new Image();
    restartImage.src = gameInstance.resources.images.ACTION_RESTART.image.src;
    restartImage.alt = 'Restart';
    restartImage.style.width = '100%';
    restartImage.style.height = '100%';
    restartImage.style.objectFit = 'contain';
    restartButton.appendChild(restartImage);
    
    restartButton.style.padding = '6px';
    restartButton.style.backgroundColor = 'transparent';
    restartButton.style.border = 'none';
    restartButton.style.borderRadius = '50%';
    restartButton.style.cursor = 'pointer';
    restartButton.style.width = '48px';
    restartButton.style.height = '48px';
    
    restartButton.addEventListener('click', () => {
        handleRKey(gameInstance);
    });
    
    // Add music toggle button using image asset
    const musicButton = document.createElement('button');
    musicButton.id = 'music-button';
    musicButton.title = gameInstance.resources.i18n.get('buttons.toggleMusic');
    
    const muteImage = new Image();
    muteImage.src = gameInstance.resources.images.ACTION_MUTE.image.src;
    muteImage.alt = 'Toggle Music';
    muteImage.style.width = '100%';
    muteImage.style.height = '100%';
    muteImage.style.objectFit = 'contain';
    musicButton.appendChild(muteImage);
    
    musicButton.style.padding = '6px';
    musicButton.style.backgroundColor = 'transparent';
    musicButton.style.border = 'none';
    musicButton.style.borderRadius = '50%';
    musicButton.style.cursor = 'pointer';
    musicButton.style.width = '48px';
    musicButton.style.height = '48px';
    
    // Initialize button state based on current music state
    if (gameInstance.resources.sound.music.paused) {
        musicButton.style.opacity = '0.5';
    }
    
    musicButton.addEventListener('click', () => {
        const isMusicOn = gameInstance.resources.toggleMusic();
        // Change opacity based on music state
        musicButton.style.opacity = isMusicOn ? '1' : '0.5';
    });
    
    // Add pause button using image asset
    const pauseButton = document.createElement('button');
    pauseButton.id = 'pause-button';
    pauseButton.title = gameInstance.resources.i18n.get('buttons.pauseGame');
    
    const pauseImage = new Image();
    pauseImage.src = gameInstance.resources.images.ACTION_PAUSE.image.src;
    pauseImage.alt = 'Pause';
    pauseImage.style.width = '100%';
    pauseImage.style.height = '100%';
    pauseImage.style.objectFit = 'contain';
    pauseButton.appendChild(pauseImage);
    
    pauseButton.style.padding = '6px';
    pauseButton.style.backgroundColor = 'transparent';
    pauseButton.style.border = 'none';
    pauseButton.style.borderRadius = '50%';
    pauseButton.style.cursor = 'pointer';
    pauseButton.style.width = '48px';
    pauseButton.style.height = '48px';
    
    pauseButton.addEventListener('click', () => {
        gameInstance.togglePause();
    });
    
    // Add buttons to container
    controlsContainer.appendChild(backToMenuButton);
    controlsContainer.appendChild(levelSelectButton);
    controlsContainer.appendChild(restartButton);
    controlsContainer.appendChild(musicButton);
    controlsContainer.appendChild(pauseButton);
    
    // Add to the document
    document.getElementById('mainContent').appendChild(controlsContainer);
    
    // Set up state change observer to show/hide buttons
    const originalSetState = gameInstance.setState;
    gameInstance.setState = function(newState) {
        const result = originalSetState.call(this, newState);
        
        // Show controls only in PLAY state
        if (newState === GAME_STATES.PLAY) {
            controlsContainer.style.opacity = '1';
        } else {
            controlsContainer.style.opacity = '0';
        }
        
        return result;
    };
    
    // Add touch event for game state transitions (loading, intro, win screens)
    mainCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const gameState = gameInstance.state;
        if (gameState === GAME_STATES.LOADING || gameState === GAME_STATES.INTRO || gameState === GAME_STATES.WIN) {
            handleCanvasClick(e, gameInstance);
        }
    });
}

function handleCanvasClick(event, gameInstance) {
    const mainCanvas = document.getElementById("mainCanvas");
    const ctx = mainCanvas.getContext("2d");
    
    // Get click/touch coordinates relative to canvas
    const rect = mainCanvas.getBoundingClientRect();
    const clientX = event.clientX || (event.touches && event.touches[0].clientX);
    const clientY = event.clientY || (event.touches && event.touches[0].clientY);
    
    if (!clientX || !clientY) return;
    
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    if (gameInstance.state === GAME_STATES.LOADING) {
        gameInstance.setState(GAME_STATES.INTRO);
    } else if (gameInstance.state === GAME_STATES.INTRO) {
        // Check if play button was clicked
        const btnX = ctx.canvas.width / 2 - gameInstance.resources.images.btnPlay.image.width / 2;
        const btnY = gameInstance.canvas.height * 0.8; // Use the same dynamic position as in showIntroScreen
        const btnWidth = gameInstance.resources.images.btnPlay.image.width;
        const btnHeight = gameInstance.resources.images.btnPlay.image.height;
        
        if (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= btnY && mouseY <= btnY + btnHeight) {
            // Stop all sounds including music when starting a new game
            gameInstance.resources.stopAllSounds(true);
            
            // Reset to level 1 when clicking the PLAY button
            gameInstance.setCurrentLevel(0); // Level 0 is the first level (displayed as level 1)
            gameInstance.changeLevel(0);
            gameInstance.setState(GAME_STATES.PLAY);
        }
    } else if (gameInstance.state === GAME_STATES.WIN) {
        // Handle clicks on win screen (advance to next level)
        handleSpaceKey(gameInstance);
    } else if (gameInstance.state === GAME_STATES.PAUSED) {
        // Check for clicks on speed setting buttons
        if (gameInstance.speedButtons) {
            for (const button of gameInstance.speedButtons) {
                if (mouseX >= button.x && mouseX <= button.x + button.width &&
                    mouseY >= button.y && mouseY <= button.y + button.height) {
                    // Change the movement speed setting
                    gameInstance.setMovementSpeed(button.value);
                    break;
                }
            }
        }
        
        // Resume game if clicked outside of settings area
        // Check if click is far from the speed buttons
        const buttonAreaTop = gameInstance.canvas.height / 2 - 100 + 60;
        const buttonAreaBottom = buttonAreaTop + 140;
        const buttonAreaWidth = 440; // Approximate width of all buttons
        const buttonAreaLeft = gameInstance.canvas.width / 2 - buttonAreaWidth / 2;
        const buttonAreaRight = buttonAreaLeft + buttonAreaWidth;
        
        const isOutsideButtonArea = mouseY < buttonAreaTop - 30 || mouseY > buttonAreaBottom + 30 ||
                                  mouseX < buttonAreaLeft - 30 || mouseX > buttonAreaRight + 30;
        
        if (isOutsideButtonArea) {
            gameInstance.setState(GAME_STATES.PLAY);
        }
    }
}

function handleSpaceKey(gameInstance) {
    switch (gameInstance.state) {
        case GAME_STATES.LOADING:
            gameInstance.setState(GAME_STATES.INTRO);
            break;
        case GAME_STATES.INTRO:
            gameInstance.setState(GAME_STATES.PLAY);
            break;
        case GAME_STATES.WIN:
            // Stop all sounds including music when progressing to next level
            gameInstance.resources.stopAllSounds(true);
            
            let nextLevel = gameInstance.currentLevel + 1;
            
            // Check if we've completed all levels
            if (nextLevel >= gameInstance.levelsData.length) {
                alert(gameInstance.resources.i18n.get('game.allLevelsComplete'));
                nextLevel = 0;
            }
            
            gameInstance.setCurrentLevel(nextLevel);
            gameInstance.changeLevel(nextLevel);
            // Explicitly set the state to PLAY to ensure action icons are displayed
            gameInstance.setState(GAME_STATES.PLAY);
            break;
        case GAME_STATES.PAUSED:
            gameInstance.setState(GAME_STATES.PLAY);
            break;
    }
}

function handleRKey(gameInstance) {
    if (gameInstance.state === GAME_STATES.PLAY) {
        const confirmed = window.confirm(gameInstance.resources.i18n.get('game.confirmRestart'));
        if (confirmed) {
            gameInstance.restartLevel();
        }
    }
}

function showLevelSelectDialog(gameInstance) {
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'level-select-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
    modal.style.zIndex = '1000';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';

    // Create dialog content with wood background
    const dialog = document.createElement('div');
    // Use the specific wood background image
    dialog.style.backgroundImage = 'url(assets/images/background_levels_wood.png)';
    dialog.style.backgroundSize = 'cover';
    dialog.style.backgroundPosition = 'center';
    dialog.style.border = '8px solid #3a2214';
    dialog.style.borderRadius = '15px';
    dialog.style.padding = '20px';
    dialog.style.width = '80%';
    dialog.style.maxWidth = '600px';
    dialog.style.overflow = 'hidden';
    dialog.style.boxShadow = '0 10px 30px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.5)';
    dialog.style.position = 'relative';

    // Add texture overlay for more wood-like feel
    const textureOverlay = document.createElement('div');
    textureOverlay.style.position = 'absolute';
    textureOverlay.style.top = '0';
    textureOverlay.style.left = '0';
    textureOverlay.style.width = '100%';
    textureOverlay.style.height = '100%';
    textureOverlay.style.backgroundImage = 'url(data:image/png;base64,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)';
    textureOverlay.style.opacity = '0.05';
    textureOverlay.style.pointerEvents = 'none';
    dialog.appendChild(textureOverlay);

    // Add title with better styling
    const title = document.createElement('h2');
    title.textContent = gameInstance.resources.i18n.get('menu.selectLevel');
    title.style.color = '#faf0dc';
    title.style.textAlign = 'center';
    title.style.margin = '0 0 15px 0';
    title.style.fontFamily = 'Arial, sans-serif';
    title.style.fontSize = '24px';
    title.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.7)';
    title.style.position = 'relative';
    title.style.zIndex = '2';
    dialog.appendChild(title);

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';  // × symbol
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.background = 'rgba(150, 80, 30, 0.7)';
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
    closeButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
    closeButton.style.zIndex = '2';
    closeButton.title = gameInstance.resources.i18n.get('buttons.close');
    closeButton.onclick = () => {
        document.body.removeChild(modal);
    };
    // Hover effect for close button
    closeButton.onmouseover = () => {
        closeButton.style.background = 'rgba(180, 100, 40, 0.9)';
        closeButton.style.transform = 'scale(1.05)';
    };
    closeButton.onmouseout = () => {
        closeButton.style.background = 'rgba(150, 80, 30, 0.7)';
        closeButton.style.transform = 'scale(1)';
    };
    dialog.appendChild(closeButton);

    // Create level container for the grid - no scrolling needed now
    const levelsContainer = document.createElement('div');
    levelsContainer.style.position = 'relative';
    levelsContainer.style.zIndex = '2';
    levelsContainer.style.backgroundColor = 'rgba(0,0,0,0.1)';
    levelsContainer.style.borderRadius = '8px';
    levelsContainer.style.padding = '15px';
    levelsContainer.style.boxShadow = 'inset 0 0 5px rgba(0,0,0,0.3)';
    
    // Create level grid container - adjust the columns based on total levels
    const levelsGrid = document.createElement('div');
    const totalLevels = gameInstance.levelsData.length;
    
    // Determine optimal grid columns (more columns for more levels)
    let columns = 5;
    if (totalLevels > 25) columns = 8;
    else if (totalLevels > 15) columns = 6;
    
    levelsGrid.style.display = 'grid';
    levelsGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    levelsGrid.style.gap = '8px';
    
    // Generate smaller level buttons
    for (let i = 0; i < totalLevels; i++) {
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.position = 'relative';
        buttonContainer.style.width = '100%';
        buttonContainer.style.paddingBottom = '100%'; // Keep aspect ratio square
        
        // Create the styled button
        const levelNumber = document.createElement('div');
        levelNumber.textContent = (i + 1).toString();
        levelNumber.style.position = 'absolute';
        levelNumber.style.top = '0';
        levelNumber.style.left = '0';
        levelNumber.style.width = '100%';
        levelNumber.style.height = '100%';
        levelNumber.style.display = 'flex';
        levelNumber.style.justifyContent = 'center';
        levelNumber.style.alignItems = 'center';
        levelNumber.style.fontSize = '16px';
        levelNumber.style.fontWeight = 'bold';
        levelNumber.style.color = '#faf0dc';
        levelNumber.style.textShadow = '1px 1px 1px #000';
        
        // Style for current level vs other levels
        const isCurrentLevel = i === gameInstance.currentLevel;
        
        // Create a wooden button appearance (smaller)
        levelNumber.style.backgroundColor = isCurrentLevel ? '#8B4513' : '#654321';
        levelNumber.style.backgroundImage = 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.1) 100%)';
        levelNumber.style.border = isCurrentLevel ? '2px solid #ffd700' : '2px solid #8B4513';
        levelNumber.style.borderRadius = '6px';
        levelNumber.style.boxShadow = '0 2px 4px rgba(0,0,0,0.4)';
        levelNumber.style.cursor = 'pointer';
        levelNumber.style.transition = 'all 0.15s ease-in-out';
        
        buttonContainer.appendChild(levelNumber);
        
        // Hover effects
        buttonContainer.onmouseover = () => {
            levelNumber.style.transform = 'translateY(-2px)';
            levelNumber.style.boxShadow = '0 4px 8px rgba(0,0,0,0.5)';
            levelNumber.style.backgroundColor = isCurrentLevel ? '#9B5523' : '#755431';
        };
        
        buttonContainer.onmouseout = () => {
            levelNumber.style.transform = 'translateY(0)';
            levelNumber.style.boxShadow = '0 2px 4px rgba(0,0,0,0.4)';
            levelNumber.style.backgroundColor = isCurrentLevel ? '#8B4513' : '#654321';
        };
        
        // Active state
        buttonContainer.onmousedown = () => {
            levelNumber.style.transform = 'translateY(1px)';
            levelNumber.style.boxShadow = '0 1px 2px rgba(0,0,0,0.5)';
        };
        
        buttonContainer.onmouseup = () => {
            levelNumber.style.transform = 'translateY(-2px)';
            levelNumber.style.boxShadow = '0 4px 8px rgba(0,0,0,0.5)';
        };
        
        // Click handler to load level
        buttonContainer.onclick = () => {
            gameInstance.setCurrentLevel(i);
            gameInstance.changeLevel(i);
            document.body.removeChild(modal);
        };
        
        levelsGrid.appendChild(buttonContainer);
    }
    
    levelsContainer.appendChild(levelsGrid);
    dialog.appendChild(levelsContainer);
    modal.appendChild(dialog);
    document.body.appendChild(modal);
    
    // Add keyboard event to close on Escape
    const handleEscKey = (event) => {
        if (event.key === 'Escape') {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);
}

function toggleDebugMode() {
    // Toggle the main debug flag
    DEBUG.ENABLED = !DEBUG.ENABLED;
    
    // If enabling debug, turn on all debug features
    if (DEBUG.ENABLED) {
        DEBUG.SHOW_TILE_NUMBERS = true;
        DEBUG.SHOW_COORDINATES = true;
        
        // Show debug panel
        showDebugPanel();
    } else {
        // Hide debug panel when turning off debug mode
        DEBUG.SHOW_TILE_NUMBERS = false;
        DEBUG.SHOW_COORDINATES = false;
        hideDebugPanel();
    }
    
    console.log(`Debug mode ${DEBUG.ENABLED ? 'enabled' : 'disabled'}`);
}

function showDebugPanel() {
    let debugPanel = document.getElementById('debug-panel');
    
    // Create the panel if it doesn't exist
    if (!debugPanel) {
        debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.style.position = 'absolute';
        debugPanel.style.top = '60px';
        debugPanel.style.right = '10px';
        debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        debugPanel.style.padding = '10px';
        debugPanel.style.borderRadius = '5px';
        debugPanel.style.color = 'white';
        debugPanel.style.fontFamily = 'monospace';
        debugPanel.style.fontSize = '12px';
        debugPanel.style.zIndex = '1000';
        debugPanel.style.minWidth = '200px';
        debugPanel.style.textAlign = 'left';
        
        // Add title
        const title = document.createElement('div');
        title.textContent = 'DEBUG MODE';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '5px';
        title.style.textAlign = 'center';
        title.style.borderBottom = '1px solid #666';
        title.style.paddingBottom = '5px';
        debugPanel.appendChild(title);
        
        // Add options
        const tileNumbersOption = createDebugOption('SHOW_TILE_NUMBERS', 'Show Tile Numbers');
        const coordinatesOption = createDebugOption('SHOW_COORDINATES', 'Show Coordinates');
        
        debugPanel.appendChild(tileNumbersOption);
        debugPanel.appendChild(coordinatesOption);
        
        // Add key info
        const keyInfo = document.createElement('div');
        keyInfo.style.marginTop = '10px';
        keyInfo.style.fontSize = '10px';
        keyInfo.style.color = '#aaa';
        keyInfo.textContent = 'Toggle Debug Mode: Ctrl+D';
        debugPanel.appendChild(keyInfo);
        
        document.getElementById('mainContent').appendChild(debugPanel);
    } else {
        debugPanel.style.display = 'block';
    }
    
    // Update checkbox states
    updateDebugPanelOptions();
}

function createDebugOption(option, label) {
    const container = document.createElement('div');
    container.style.margin = '5px 0';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `debug-${option}`;
    checkbox.checked = DEBUG[option];
    checkbox.addEventListener('change', () => {
        DEBUG[option] = checkbox.checked;
    });
    
    const labelElement = document.createElement('label');
    labelElement.htmlFor = `debug-${option}`;
    labelElement.textContent = ` ${label}`;
    
    container.appendChild(checkbox);
    container.appendChild(labelElement);
    return container;
}

function updateDebugPanelOptions() {
    const tileNumbersCheckbox = document.getElementById('debug-SHOW_TILE_NUMBERS');
    const coordinatesCheckbox = document.getElementById('debug-SHOW_COORDINATES');
    
    if (tileNumbersCheckbox) tileNumbersCheckbox.checked = DEBUG.SHOW_TILE_NUMBERS;
    if (coordinatesCheckbox) coordinatesCheckbox.checked = DEBUG.SHOW_COORDINATES;
}

function hideDebugPanel() {
    const debugPanel = document.getElementById('debug-panel');
    if (debugPanel) {
        debugPanel.style.display = 'none';
    }
}
