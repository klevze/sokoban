// Import dependencies
import { GAME_STATES, DEBUG, GAME_MODES } from './config/config.js';
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

    // Add explicit touch event for clicks, especially for the PLAY button on mobile
    mainCanvas.addEventListener("touchend", function(event) {
        // Prevent default to avoid double actions
        event.preventDefault();
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
    const dragHandle = virtualArrows ? virtualArrows.querySelector('.drag-handle') : null;
    
    // Initial setup for mobile devices only - keep hidden otherwise
    if (virtualArrows) {
        if (gameInstance.isMobileDevice()) {
            // Only initialize arrows on mobile devices
            updateArrowsVisibility(gameInstance.state);
            
            // Make the virtualArrows draggable
            makeDraggable(virtualArrows, dragHandle);
            
            // Try to load position from localStorage
            loadArrowPosition(virtualArrows);
        } else {
            // Ensure arrows remain hidden on desktop
            virtualArrows.style.display = 'none';
        }
    }
    
    // Set up continuous movement handling
    let activeDirection = null;
    let continuousMoveInterval = null;
    
    // Function to update visibility of arrows based on game state
    function updateArrowsVisibility(state) {
        if (virtualArrows) {
            // Only show arrows during active gameplay
            if (state === GAME_STATES.PLAY) {
                virtualArrows.style.display = 'block';
                virtualArrows.style.opacity = '1';
            } else {
                virtualArrows.style.opacity = '0';
                // Use a timeout to hide completely after fade out
                setTimeout(() => {
                    if (gameInstance.state !== GAME_STATES.PLAY) {
                        virtualArrows.style.display = 'none';
                    }
                }, 300);
            }
        }
    }
    
    // Function to start continuous movement
    function startContinuousMovement(direction) {
        if (continuousMoveInterval) {
            clearInterval(continuousMoveInterval);
        }
        
        activeDirection = direction;
        
        // Execute movement immediately
        executeMovement(direction);
        
        // Set interval for continuous movement
        continuousMoveInterval = setInterval(() => {
            executeMovement(direction);
        }, 200); // Adjust timing as needed for gameplay feel
    }
    
    // Function to stop continuous movement
    function stopContinuousMovement() {
        if (continuousMoveInterval) {
            clearInterval(continuousMoveInterval);
            continuousMoveInterval = null;
        }
        activeDirection = null;
        
        // Remove the active class from all buttons
        if (upButton) upButton.classList.remove('active');
        if (leftButton) leftButton.classList.remove('active');
        if (rightButton) rightButton.classList.remove('active');
        if (downButton) downButton.classList.remove('active');
    }
    
    // Function to execute the movement in the given direction
    function executeMovement(direction) {
        if (gameInstance.player && !gameInstance.player.isMoving && 
            gameInstance.state === GAME_STATES.PLAY && gameInstance.canProcessKeyPress()) {
            switch(direction) {
                case 'up': gameInstance.player.move(0, -1); break;
                case 'left': gameInstance.player.move(-1, 0); break;
                case 'right': gameInstance.player.move(1, 0); break;
                case 'down': gameInstance.player.move(0, 1); break;
            }
        }
    }
    
    // Add touch event listeners to the directional buttons
    if (upButton) {
        upButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            upButton.classList.add('active');
            startContinuousMovement('up');
        });
        
        upButton.addEventListener('touchend', () => {
            upButton.classList.remove('active');
            stopContinuousMovement();
        });
    }
    
    if (leftButton) {
        leftButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            leftButton.classList.add('active');
            startContinuousMovement('left');
        });
        
        leftButton.addEventListener('touchend', () => {
            leftButton.classList.remove('active');
            stopContinuousMovement();
        });
    }
    
    if (rightButton) {
        rightButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            rightButton.classList.add('active');
            startContinuousMovement('right');
        });
        
        rightButton.addEventListener('touchend', () => {
            rightButton.classList.remove('active');
            stopContinuousMovement();
        });
    }
    
    if (downButton) {
        downButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            downButton.classList.add('active');
            startContinuousMovement('down');
        });
        
        downButton.addEventListener('touchend', () => {
            downButton.classList.remove('active');
            stopContinuousMovement();
        });
    }
    
    // Make sure to stop continuous movement if we leave the game area
    mainCanvas.addEventListener('touchstart', stopContinuousMovement);
    
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
    
    // Ensure resources are loaded before accessing images
    if (!gameInstance.resources || !gameInstance.resources.images) {
        console.warn('Game resources not fully loaded yet');
        return;
    }
    
    // Add undo button using image asset
    const undoButton = document.createElement('button');
    undoButton.id = 'undo-button';
    undoButton.title = gameInstance.resources.i18n.get('buttons.undo') || 'Undo Move';
    
    // Check if the UNDO image is loaded
    if (gameInstance.resources.images.ACTION_UNDO && gameInstance.resources.images.ACTION_UNDO.image) {
        const undoImage = new Image();
        undoImage.src = gameInstance.resources.images.ACTION_UNDO.image.src;
        undoImage.alt = 'Undo';
        undoImage.style.width = '100%';
        undoImage.style.height = '100%';
        undoImage.style.objectFit = 'contain';
        undoButton.appendChild(undoImage);
    } else {
        undoButton.textContent = '↩️';
        console.warn('ACTION_UNDO image not loaded');
    }
    
    undoButton.style.padding = '6px';
    undoButton.style.backgroundColor = 'transparent';
    undoButton.style.border = 'none';
    undoButton.style.borderRadius = '50%';
    undoButton.style.cursor = 'pointer';
    undoButton.style.width = '48px';
    undoButton.style.height = '48px';
    
    undoButton.addEventListener('click', () => {
        if (gameInstance.player && gameInstance.state === GAME_STATES.PLAY) {
            gameInstance.player.undo();
        }
    });
    
    // Add settings button using image asset
    const settingsButton = document.createElement('button');
    settingsButton.id = 'settings-button';
    settingsButton.title = gameInstance.resources.i18n.get('buttons.settings') || 'Settings';
    
    // Check if the SETTINGS image is loaded
    if (gameInstance.resources.images.ACTION_SETTINGS && gameInstance.resources.images.ACTION_SETTINGS.image) {
        const settingsImage = new Image();
        settingsImage.src = gameInstance.resources.images.ACTION_SETTINGS.image.src;
        settingsImage.alt = 'Settings';
        settingsImage.style.width = '100%';
        settingsImage.style.height = '100%';
        settingsImage.style.objectFit = 'contain';
        settingsButton.appendChild(settingsImage);
    } else {
        settingsButton.textContent = '⚙️';
        console.warn('ACTION_SETTINGS image not loaded');
    }
    
    settingsButton.style.padding = '6px';
    settingsButton.style.backgroundColor = 'transparent';
    settingsButton.style.border = 'none';
    settingsButton.style.borderRadius = '50%';
    settingsButton.style.cursor = 'pointer';
    settingsButton.style.width = '48px';
    settingsButton.style.height = '48px';
    
    settingsButton.addEventListener('click', () => {
        if (gameInstance.state === GAME_STATES.PLAY) {
            // Pause game timer while in settings
            gameInstance.score.pauseTimer();
            showSettingsDialog(gameInstance);
        }
    });
    
    // Add pause button using image asset
    const pauseButton = document.createElement('button');
    pauseButton.id = 'pause-button';
    pauseButton.title = gameInstance.resources.i18n.get('buttons.pauseGame');
    
    // Check if the PAUSE image is loaded
    if (gameInstance.resources.images.ACTION_PAUSE && gameInstance.resources.images.ACTION_PAUSE.image) {
        const pauseImage = new Image();
        pauseImage.src = gameInstance.resources.images.ACTION_PAUSE.image.src;
        pauseImage.alt = 'Pause';
        pauseImage.style.width = '100%';
        pauseImage.style.height = '100%';
        pauseImage.style.objectFit = 'contain';
        pauseButton.appendChild(pauseImage);
    } else {
        pauseButton.textContent = '⏸️';
        console.warn('ACTION_PAUSE image not loaded');
    }
    
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
    controlsContainer.appendChild(undoButton);
    controlsContainer.appendChild(pauseButton);
    controlsContainer.appendChild(settingsButton);
    
    // Add to the document
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
        mainContent.appendChild(controlsContainer);
    } else {
        console.warn('Could not find mainContent element');
        document.body.appendChild(controlsContainer);
    }
    
    // Set up state change observer to show/hide buttons and arrows
    const originalSetState = gameInstance.setState;
    gameInstance.setState = function(newState) {
        const result = originalSetState.call(this, newState);
        
        // Show controls only in PLAY state
        if (newState === GAME_STATES.PLAY) {
            controlsContainer.style.opacity = '1';
            // Show virtual arrows in PLAY state
            updateArrowsVisibility(newState);
        } else {
            controlsContainer.style.opacity = '0';
            // Hide virtual arrows in other states
            updateArrowsVisibility(newState);
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

/**
 * Makes an element draggable
 * @param {HTMLElement} element - The element to make draggable
 * @param {HTMLElement} handle - Optional drag handle element (if null, the entire element is draggable)
 */
function makeDraggable(element, handle = null) {
    if (!element) return;
    
    const dragHandle = handle || element;
    let isDragging = false;
    let initialX, initialY, initialLeft, initialTop;
    
    // Touch events for mobile
    dragHandle.addEventListener('touchstart', startDrag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', endDrag);
    
    // Mouse events for desktop (for testing)
    dragHandle.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    function startDrag(e) {
        if (e.type === 'mousedown' && e.button !== 0) return; // Only left mouse button
        
        e.preventDefault();
        
        // Get the initial position
        const touch = e.touches ? e.touches[0] : e;
        initialX = touch.clientX;
        initialY = touch.clientY;
        
        // Get the current position of the element
        const rect = element.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        
        // Highlight the drag handle to indicate dragging
        dragHandle.style.color = '#ffd700';
        dragHandle.style.textShadow = '0 0 5px #ffd700';
        
        isDragging = true;
    }
    
    function drag(e) {
        if (!isDragging) return;
        
        e.preventDefault();
        
        // Calculate the new position
        const touch = e.touches ? e.touches[0] : e;
        const deltaX = touch.clientX - initialX;
        const deltaY = touch.clientY - initialY;
        
        // Update the position
        element.style.left = `${initialLeft + deltaX}px`;
        element.style.top = `${initialTop + deltaY}px`;
    }
    
    function endDrag() {
        if (!isDragging) return;
        
        isDragging = false;
        
        // Reset drag handle styling
        if (dragHandle) {
            dragHandle.style.color = '#ffd700';
            dragHandle.style.textShadow = '0 1px 2px rgba(0,0,0,0.8)';
        }
        
        // Save the position to localStorage
        saveArrowPosition(element);
    }
}

/**
 * Saves the arrow controls position to localStorage
 * @param {HTMLElement} element - The element to save position for
 */
function saveArrowPosition(element) {
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    
    try {
        // Store position as percentage of viewport width/height
        const data = {
            posX: rect.left / window.innerWidth,
            posY: rect.top / window.innerHeight
        };
        
        localStorage.setItem('sokoban_arrows_position', JSON.stringify(data));
    } catch (err) {
        console.warn('Could not save arrow position to localStorage', err);
    }
}

/**
 * Loads the arrow controls position from localStorage
 * @param {HTMLElement} element - The element to update position for
 */
function loadArrowPosition(element) {
    if (!element) return;
    
    try {
        const data = JSON.parse(localStorage.getItem('sokoban_arrows_position'));
        
        if (data && data.posX !== undefined && data.posY !== undefined) {
            // Convert percentage position back to pixels
            const posX = data.posX * window.innerWidth;
            const posY = data.posY * window.innerHeight;
            
            // Ensure the element isn't positioned off-screen
            const maxX = window.innerWidth - 100;
            const maxY = window.innerHeight - 100;
            const x = Math.max(0, Math.min(posX, maxX));
            const y = Math.max(0, Math.min(posY, maxY));
            
            // Apply the position with fixed positioning to ensure proper dragging
            element.style.position = 'fixed';
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
            // Clear any default right/bottom positioning that might interfere
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        }
    } catch (err) {
        console.warn('Could not load arrow position from localStorage', err);
    }
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
        const btnPlayImg = gameInstance.resources.images.btnPlay.image;
        const btnX = mainCanvas.width / 2 - btnPlayImg.width / 2;
        const btnY = mainCanvas.height * 0.7; // Use the same dynamic position as in showIntroScreen
        
        const btnWidth = btnPlayImg.width;
        const btnHeight = btnPlayImg.height;
        
        if (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= btnY && mouseY <= btnY + btnHeight) {
            // Stop all sounds including music when starting a new game
            gameInstance.resources.stopAllSounds(true);
            
            // Transition to game mode selection screen instead of directly starting the game
            gameInstance.setState(GAME_STATES.GAME_MODE_SELECT);
        }
        
        // Check if level editor button was clicked
        const editorY = btnY + btnPlayImg.height + 20;
        if (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= editorY && mouseY <= editorY + btnHeight) {
            // Open the level editor
            gameInstance.openLevelEditor();
        }
    } else if (gameInstance.state === GAME_STATES.WIN) {
        // Handle clicks on win screen (advance to next level)
        handleSpaceKey(gameInstance);
    } else if (gameInstance.state === GAME_STATES.PAUSED) {
        // Check for clicks on the continue button in pause menu
        if (gameInstance.resources.images.btnPlay && gameInstance.resources.images.btnPlay.image) {
            const btnPlayImg = gameInstance.resources.images.btnPlay.image;
            const textX = gameInstance.canvas.width / 2;
            const textY = gameInstance.canvas.height / 2 - 50;
            const btnX = textX - btnPlayImg.width / 2;
            const btnY = textY + 40;
            const btnWidth = btnPlayImg.width;
            const btnHeight = btnPlayImg.height;
            
            if (mouseX >= btnX && mouseX <= btnX + btnWidth && 
                mouseY >= btnY && mouseY <= btnY + btnHeight) {
                gameInstance.setState(GAME_STATES.PLAY);
                return;
            }
        }
    
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
    } else if (gameInstance.state === GAME_STATES.EDITOR) {
        // Let the editor handle its own clicks
        // No action needed here as the editor has its own event handlers
    } else if (gameInstance.state === GAME_STATES.GAME_MODE_SELECT) {
        handleGameModeSelectionClick(event, gameInstance);
    }
}

function handleSpaceKey(gameInstance) {
    switch (gameInstance.state) {
        case GAME_STATES.LOADING:
            gameInstance.setState(GAME_STATES.INTRO);
            break;
        case GAME_STATES.INTRO:
            // Stop all sounds including music when starting a new game
            gameInstance.resources.stopAllSounds(true);
            
            // Transition to game mode selection screen instead of directly starting the game
            gameInstance.setState(GAME_STATES.GAME_MODE_SELECT);
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

export function showLevelSelectDialog(gameInstance) {
    // First check if the modal already exists to prevent infinite loops
    const existingModal = document.getElementById('level-select-modal');
    if (existingModal) {
        // If the modal already exists, just make sure it's visible and return
        existingModal.style.display = 'flex';
        return;
    }
    
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
    textureOverlay.style.backgroundImage = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAAUVBMVEWFhYWDg4N3d3dtbW17e3t1dXWBgYGHh4d5eXlzc3OLi4ubm5uVlZWPj4+NjY19fX2JiYl/f39ra2uRkZGZmZlpaWmXl5dvb29xcXGTk5NnZ2c8TV1mAAAAG3RSTlNAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAvEOwtAAAFVklEQVR4XpWWB67c2BUFb3g557T/hRo9/WUMZHlgr4Bg8Z4qQgQJlHI4A8SzFVrapvmTF9O7dmYRFZ60YiBhJRCgh1FYhiLAmdvX0CzTOpNE77ME0Zty/nWWzchDtiqrmQDeuv3powQ5ta2eN0FY0InkqDD73lT9c9lEzwUNqgFHs9VQce3TVClFCQrSTfOiYkVJQBmpbq2L6iZavPnAPcoU0dSw0SUTqz/GtrGuXfbyyBniKykOWQWGqwwMA7QiYAxi+IlPdqo+hYHnUt5ZPfnsHJyNiDtnpJyayNBkF6cWoYGAMY92U2hXHF/C1M8uP/ZtYdiuj26UdAdQQSXQErwSOMzt/XWRWAz5GuSBIkwG1H3FabJ2OsUOUhGC6tK4EMtJO0ttC6IBD3kM0ve0tJwMdSfjZo+EEISaeTr9P3wYrGjXqyC1krcKdhMpxEnt5JetoulscpyzhXN5FRpuPHvbeQaKxFAEB6EN+cYN6xD7RYGpXpNndMmZgM5Dcs3YSNFDHUo2LGfZuukSWyUYirJAdYbF3MfqEKmjM+I2EfhA94iG3L7uKrR+GdWD73ydlIB+6hgref1QTlmgmbM3/LeX5GI1Ux1RWpgxpLuZ2+I+IjzZ8wqE4nilvQdkUdfhzI5QDWy+kw5Wgg2pGpeEVeCCA7b85BO3F9DzxB3cdqvBzWcmzbyMiqhzuYqtHRVG2y4x+KOlnyqla8AoWWpuBoYRxzXrfKuILl6SfiWCbjxoZJUaCBj1CjH7GIaDbc9kqBY3W/Rgjda1iqQcOJu2WW+76pZC9QG7M00dffe9hNnseupFL53r8F7YHSwJWUKP2q+k7RdsxyOB11n0xtOvnW4irMMFNV4H0uqwS5ExsmP9AxbDTc9JwgneAT5vTiUSm1E7BSflSt3bfa1tv8Di3R8n3Af7MNWzs49hmauE2wP+ttrq+AsWpFG2awvsuOqbipWHgtuvuaAE+A1Z/7gC9hesnr+7wqCwG8c5yAg3AL1fm8T9AZtp/bbJGwl1pNrE7RuOX7PeMRUERVaPpEs+yqeoSmuOlokqw49pgomjLeh7icHNlG19yjs6XXOMedYm5xH2YxpV2tc0Ro2jJfxC50ApuxGob7lMsxfTbeUv07TyYxpeLucEH1gNd4IKH2LAg5TdVhlCafZvpskfncCfx8pOhJzd76bJWeYFnFciwcYfubRc12Ip/ppIhA1/mSZ/RxjFDrJC5xifFjJpY2Xl5zXdguFqYyTR1zSp1Y9p+tktDYYSNflcxI0iyO4TPBdlRcpeqjK/piF5bklq77VSEaA+z8qmJTFzIWiitbnzR794USKBUaT0NTEsVjZqLaFVqJoPN9ODG70IPbfBHKK+/q/AWR0tJzYHRULOa4MP+W/HfGadZUbfw177G7j/OGbIs8TahLyynl4X4RinF793Oz+BU0saXtUHrVBFT/DnA3ctNPoGbs4hRIjTok8i+algT1lTHi4SxFvONKNrgQFAq2/gFnWMXgwffgYMJpiKYkmW3tTg3ZQ9Jq+f8XN+A5eeUKHWvJWJ2sgJ1Sop+wwhqFVijqWaJhwtD8MNlSBeWNNWTa5Z5kPZw5+LbVT99wqTdx29lMUH4OIG/D86ruKEauBjvH5xy6um/Sfj7ei6UUVk4AIl3MyD4MSSTOFgSwsH/QJWaQ5as7ZcmgBZkzjjU1UrQ74ci1gWBCSGHtuV1H2mhSnO3Wp/3fEV5a+4wz//6qy8JxjZsmxxy5+4w9CDNJY09T072iKG0EnOS0arEYgXqYnXcYHwjTtUNAcMelOd4xpkoqiTYICWFq0JSiPfPDQdnt+4/wuqcXY47QILbgAAAABJRU5ErkJggg==)';
    textureOverlay.style.opacity = '0.05';
    textureOverlay.style.pointerEvents = 'none';
    dialog.appendChild(textureOverlay);

    // Create title
    const title = document.createElement('h2');
    title.textContent = gameInstance.resources.i18n.get('levelSelect.title') || 'Select Level';
    title.style.color = '#ffd700';
    title.style.textAlign = 'center';
    title.style.margin = '10px 0 20px 0';
    title.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
    title.style.fontFamily = 'Arial, sans-serif';
    dialog.appendChild(title);

    // Create subtitle with game mode info
    const subtitle = document.createElement('h3');
    let gameModeText = '';
    switch (gameInstance.gameMode) {
        case GAME_MODES.NORMAL:
            gameModeText = 'Normal Mode';
            break;
        case GAME_MODES.TIME_ATTACK:
            gameModeText = 'Time Attack Mode';
            break;
        case GAME_MODES.CHALLENGE:
            gameModeText = 'Challenge Mode';
            break;
    }
    subtitle.textContent = gameModeText;
    subtitle.style.color = '#ffaa00';
    subtitle.style.textAlign = 'center';
    subtitle.style.margin = '0 0 20px 0';
    subtitle.style.fontFamily = 'Arial, sans-serif';
    dialog.appendChild(subtitle);

    // Create levels container
    const levelsContainer = document.createElement('div');
    levelsContainer.style.overflowY = 'auto';
    levelsContainer.style.maxHeight = '400px';
    levelsContainer.style.padding = '10px';
    levelsContainer.style.backgroundColor = 'rgba(0,0,0,0.2)';
    levelsContainer.style.borderRadius = '10px';
    levelsContainer.style.margin = '0 auto';
    levelsContainer.style.width = '95%';

    // Create a list layout for levels instead of grid
    const levelsList = document.createElement('div');
    levelsList.style.display = 'flex';
    levelsList.style.flexDirection = 'column';
    levelsList.style.gap = '8px';

    // Define function to format time for display
    const formatTime = (milliseconds) => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Create level rows
    for (let i = 0; i < gameInstance.levelsData.length; i++) {
        // Create level row container
        const levelRow = document.createElement('div');
        levelRow.style.display = 'flex';
        levelRow.style.alignItems = 'center';
        levelRow.style.backgroundColor = 'rgba(50, 30, 20, 0.7)';
        levelRow.style.borderRadius = '6px';
        levelRow.style.padding = '8px 12px';
        levelRow.style.cursor = 'pointer';
        levelRow.style.transition = 'all 0.2s';
        levelRow.style.border = i === gameInstance.currentLevel ? '2px solid #ffd700' : '2px solid transparent';
        
        // Highlight current level
        if (i === gameInstance.currentLevel) {
            levelRow.style.backgroundColor = 'rgba(70, 40, 20, 0.8)';
        }

        // Add hover effects
        levelRow.onmouseover = () => {
            levelRow.style.backgroundColor = 'rgba(80, 50, 20, 0.8)';
            levelRow.style.transform = 'translateY(-2px)';
        };
        
        levelRow.onmouseout = () => {
            levelRow.style.backgroundColor = i === gameInstance.currentLevel ? 'rgba(70, 40, 20, 0.8)' : 'rgba(50, 30, 20, 0.7)';
            levelRow.style.transform = 'translateY(0)';
        };

        // Level number indicator
        const levelNumber = document.createElement('div');
        levelNumber.textContent = (i + 1).toString();
        levelNumber.style.fontWeight = 'bold';
        levelNumber.style.fontSize = '18px';
        levelNumber.style.color = '#ffd700';
        levelNumber.style.minWidth = '40px';
        levelNumber.style.textAlign = 'center';
        levelNumber.style.padding = '5px';
        levelNumber.style.backgroundColor = 'rgba(0,0,0,0.3)';
        levelNumber.style.borderRadius = '4px';
        levelRow.appendChild(levelNumber);
        
        // Level details container
        const levelDetails = document.createElement('div');
        levelDetails.style.display = 'flex';
        levelDetails.style.flexDirection = 'column';
        levelDetails.style.flex = '1';
        levelDetails.style.marginLeft = '10px';
        
        // Level name
        const levelName = document.createElement('div');
        levelName.textContent = `Level ${i + 1}`;
        levelName.style.color = '#faf0dc';
        levelName.style.fontWeight = 'bold';
        levelName.style.fontSize = '16px';
        levelDetails.appendChild(levelName);
        
        // Get personal best stats for this level
        const levelKey = `level_${i}`;
        const levelStats = gameInstance.levelStats && gameInstance.levelStats[levelKey];
        
        // Best results container
        const bestResults = document.createElement('div');
        bestResults.style.color = '#ccc';
        bestResults.style.fontSize = '14px';
        bestResults.style.marginTop = '3px';
        
        if (levelStats) {
            // Format and display best results
            const bestMovesText = levelStats.bestMoves !== undefined ? `${levelStats.bestMoves} moves` : '';
            const bestPushesText = levelStats.bestPushes !== undefined ? `${levelStats.bestPushes} pushes` : '';
            const bestTimeText = levelStats.bestTime !== undefined ? formatTime(levelStats.bestTime) : '';
            
            const resultParts = [];
            if (bestMovesText) resultParts.push(bestMovesText);
            if (bestPushesText) resultParts.push(bestPushesText);
            if (bestTimeText) resultParts.push(bestTimeText);
            
            if (resultParts.length > 0) {
                bestResults.textContent = `Best: ${resultParts.join(' • ')}`;
                bestResults.style.color = '#9acd32'; // Light green color for completed levels
            } else {
                bestResults.textContent = 'Not completed yet';
            }
        } else {
            bestResults.textContent = 'Not completed yet';
        }
        
        levelDetails.appendChild(bestResults);
        levelRow.appendChild(levelDetails);
        
        // Click handler to load level
        levelRow.onclick = () => {
            // Prevent further click events while processing this one
            modal.style.pointerEvents = 'none';
            
            // First set the current level index
            gameInstance.setCurrentLevel(i);
            
            try {
                // Remove dialog first to avoid any potential race conditions
                document.body.removeChild(modal);
                
                // Then explicitly set the game state to PLAY first
                gameInstance.setState(GAME_STATES.PLAY);
                
                // Finally change the level which will initialize game elements
                gameInstance.changeLevel(i);
            } catch (error) {
                console.error("Error in level selection:", error);
                // Restore pointer events if there was an error
                modal.style.pointerEvents = 'auto';
            }
        };
        
        levelsList.appendChild(levelRow);
    }
    
    levelsContainer.appendChild(levelsList);
    dialog.appendChild(levelsContainer);

    // Create back button
    const backButton = document.createElement('button');
    backButton.textContent = gameInstance.resources.i18n.get('buttons.back') || 'Back';
    backButton.style.display = 'block';
    backButton.style.margin = '20px auto 0 auto';
    backButton.style.padding = '10px 30px'; // Increased horizontal padding
    backButton.style.fontSize = '16px';
    backButton.style.backgroundColor = '#654321';
    backButton.style.color = '#faf0dc';
    backButton.style.border = '2px solid #8B4513';
    backButton.style.borderRadius = '6px';
    backButton.style.cursor = 'pointer';
    backButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.4)';
    backButton.style.transition = 'all 0.2s';
    backButton.style.width = 'auto'; // Let width adjust to content
    backButton.style.minWidth = '120px'; // Slightly increased minimum width
    backButton.style.maxWidth = '250px'; // Increased maximum width for longer text

    // Add hover effects
    backButton.onmouseover = () => {
        backButton.style.backgroundColor = '#7B5731';
        backButton.style.transform = 'translateY(-2px)';
        backButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.5)';
    };
    
    backButton.onmouseout = () => {
        backButton.style.backgroundColor = '#654321';
        backButton.style.transform = 'translateY(0)';
        backButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.4)';
    };
    
    // Click handler to go back to game mode selection
    backButton.onclick = () => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
        gameInstance.setState(GAME_STATES.GAME_MODE_SELECT);
    };
    
    dialog.appendChild(backButton);
    modal.appendChild(dialog);
    document.body.appendChild(modal);

    // Add keyboard handler for escape key to close dialog
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
            gameInstance.setState(GAME_STATES.GAME_MODE_SELECT);
            document.removeEventListener('keydown', escHandler);
        }
    });
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

function showSettingsDialog(gameInstance) {
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'settings-modal';
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

    // Pause game timer
    gameInstance.score.pauseTimer();

    // Create dialog content with wood background
    const dialog = document.createElement('div');
    // Use the specific wood background image with correct path
    dialog.style.backgroundImage = 'url(assets/images/background_levels_wood.png)';
    dialog.style.backgroundSize = 'cover';
    dialog.style.backgroundPosition = 'center';
    dialog.style.border = '8px solid #3a2214';
    dialog.style.borderRadius = '15px';
    dialog.style.padding = '20px';
    dialog.style.width = '80%';
    dialog.style.maxWidth = '400px';
    dialog.style.boxShadow = '0 10px 30px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.5)';
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

    // Add title
    const title = document.createElement('h2');
    title.textContent = gameInstance.resources.i18n.get('menu.settings') || 'Settings';
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
    closeButton.style.padding = '0';
    closeButton.style.lineHeight = '0';  // Fix vertical alignment
    closeButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
    closeButton.style.zIndex = '2';
    closeButton.title = gameInstance.resources.i18n.get('buttons.close');
    closeButton.onclick = () => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
            gameInstance.score.resumeTimer();
        }
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
    
    // Create settings container
    const settingsContainer = document.createElement('div');
    settingsContainer.style.position = 'relative';
    settingsContainer.style.zIndex = '2';
    settingsContainer.style.display = 'flex';
    settingsContainer.style.flexDirection = 'column';
    settingsContainer.style.gap = '15px';
    settingsContainer.style.marginTop = '20px';
    
    // Function to create a button group
    function createButtonGroup(label, buttons) {
        const group = document.createElement('div');
        group.style.display = 'flex';
        group.style.alignItems = 'center';
        group.style.gap = '10px';
        
        const labelElem = document.createElement('div');
        labelElem.textContent = label;
        labelElem.style.color = '#faf0dc';
        labelElem.style.fontFamily = 'Arial, sans-serif';
        labelElem.style.fontSize = '16px';
        labelElem.style.textShadow = '1px 1px 2px rgba(0,0,0,0.7)';
        labelElem.style.flexBasis = '40%';
        group.appendChild(labelElem);
        
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '10px';
        btnContainer.style.flexBasis = '60%';
        btnContainer.style.justifyContent = 'flex-end';
        
        buttons.forEach(button => {
            btnContainer.appendChild(button);
        });
        
        group.appendChild(btnContainer);
        return group;
    }
    
    // Function to create a wooden button
    function createWoodenButton(icon, label, onClick, size = 'medium') {
        const button = document.createElement('button');
        button.title = label;
        
        // Set button dimensions based on size
        let width, height, fontSize;
        switch(size) {
            case 'small':
                width = '45px';
                height = '45px';
                fontSize = '15px';
                break;
            case 'large':
                width = '80px';
                height = '80px';
                fontSize = '20px';
                break;
            case 'medium':
            default:
                width = '60px';
                height = '60px';
                fontSize = '18px';
                break;
        }
        
        button.style.width = width;
        button.style.height = height;
        button.style.backgroundColor = '#654321';
        button.style.backgroundImage = 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.1) 100%)';
        button.style.border = '2px solid #8B4513';
        button.style.borderRadius = '8px';
        button.style.cursor = 'pointer';
        button.style.display = 'flex';
        button.style.justifyContent = 'center';
        button.style.alignItems = 'center';
        button.style.padding = '0';
        button.style.color = '#faf0dc';
        button.style.fontSize = fontSize;
        button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.4)';
        button.style.transition = 'all 0.15s ease-in-out';
        
        // If icon is an image, use it
        if (icon && typeof icon === 'object' && icon.tagName === 'IMG') {
            icon.style.width = '80%';
            icon.style.height = '80%';
            icon.style.objectFit = 'contain';
            button.appendChild(icon);
        } else {
            // Otherwise use text/emoji
            button.textContent = icon || label;
        }
        
        // Hover effects
        button.onmouseover = () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.5)';
            button.style.backgroundColor = '#755431';
        };
        
        button.onmouseout = () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.4)';
            button.style.backgroundColor = '#654321';
        };
        
        // Active state
        button.onmousedown = () => {
            button.style.transform = 'translateY(1px)';
            button.style.boxShadow = '0 1px 2px rgba(0,0,0,0.5)';
        };
        
        button.onmouseup = () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.5)';
        };
        
        // Click handler
        button.onclick = onClick;
        
        return button;
    }
    
    // 1. Back to home (main menu) button
    const homeButton = createWoodenButton(
        gameInstance.resources.images.ACTION_HOME && gameInstance.resources.images.ACTION_HOME.image ? 
        (() => {
            const img = new Image();
            img.src = gameInstance.resources.images.ACTION_HOME.image.src;
            return img;
        })() : '🏠',
        gameInstance.resources.i18n.get('buttons.home') || 'Home',
        () => {
            const confirmed = window.confirm(gameInstance.resources.i18n.get('game.confirmExit') || "Return to main menu?");
            if (confirmed) {
                document.body.removeChild(modal);
                gameInstance.setState(GAME_STATES.INTRO);
            }
        }
    );
    
    // 2. Level select button
    const levelSelectButton = createWoodenButton(
        gameInstance.resources.images.ACTION_LEVEL && gameInstance.resources.images.ACTION_LEVEL.image ? 
        (() => {
            const img = new Image();
            img.src = gameInstance.resources.images.ACTION_LEVEL.image.src;
            return img;
        })() : '📋',
        gameInstance.resources.i18n.get('buttons.levelSelect') || 'Level Select',
        () => {
            document.body.removeChild(modal);
            showLevelSelectDialog(gameInstance);
        }
    );
    
    // 3. Restart button
    const restartButton = createWoodenButton(
        gameInstance.resources.images.ACTION_RESTART && gameInstance.resources.images.ACTION_RESTART.image ? 
        (() => {
            const img = new Image();
            img.src = gameInstance.resources.images.ACTION_RESTART.image.src;
            return img;
        })() : '🔄',
        gameInstance.resources.i18n.get('buttons.restart') || 'Restart',
        () => {
            const confirmed = window.confirm(gameInstance.resources.i18n.get('game.confirmRestart') || "Restart level?");
            if (confirmed) {
                document.body.removeChild(modal);
                gameInstance.restartLevel();
            }
        }
    );
    
    // 4. Group navigation buttons
    const navigationGroup = createButtonGroup(
        gameInstance.resources.i18n.get('settings.navigation') || 'Navigate',
        [homeButton, levelSelectButton, restartButton]
    );
    settingsContainer.appendChild(navigationGroup);
    
    // 5. Player speed buttons
    const slowButton = createWoodenButton(
        '1x', 
        gameInstance.resources.i18n.get('settings.slowSpeed') || 'Slow',
        () => {
            gameInstance.setMovementSpeed('SLOW');
            saveSpeedSetting('SLOW');
            updateSpeedButtonsState();
        },
        'small'
    );
    
    const normalButton = createWoodenButton(
        '2x', 
        gameInstance.resources.i18n.get('settings.normalSpeed') || 'Normal',
        () => {
            gameInstance.setMovementSpeed('NORMAL');
            saveSpeedSetting('NORMAL');
            updateSpeedButtonsState();
        },
        'small'
    );
    
    const fastButton = createWoodenButton(
        '3x', 
        gameInstance.resources.i18n.get('settings.fastSpeed') || 'Fast',
        () => {
            gameInstance.setMovementSpeed('FAST');
            saveSpeedSetting('FAST');
            updateSpeedButtonsState();
        },
        'small'
    );
    
    const veryFastButton = createWoodenButton(
        '4x', 
        gameInstance.resources.i18n.get('settings.veryFastSpeed') || 'Very Fast',
        () => {
            gameInstance.setMovementSpeed('VERY_FAST');
            saveSpeedSetting('VERY_FAST');
            updateSpeedButtonsState();
        },
        'small'
    );
    
    // Helper function to save speed setting
    function saveSpeedSetting(speed) {
        gameInstance.currentSpeedSetting = speed;
    }
    
    // Update button states based on current speed
    function updateSpeedButtonsState() {
        const currentSpeed = gameInstance.currentSpeedSetting || gameInstance.settings.movementSpeed;
        [slowButton, normalButton, fastButton, veryFastButton].forEach(btn => {
            btn.style.border = '2px solid #8B4513';
            btn.style.opacity = '0.7';
        });
        
        let activeButton;
        switch(currentSpeed) {
            case 'SLOW': activeButton = slowButton; break;
            case 'NORMAL': activeButton = normalButton; break;
            case 'FAST': activeButton = fastButton; break;
            case 'VERY_FAST': activeButton = veryFastButton; break;
        }
        
        if (activeButton) {
            activeButton.style.border = '2px solid #ffd700';
            activeButton.style.opacity = '1';
        }
    }
    
    // Group speed buttons
    const speedGroup = createButtonGroup(
        gameInstance.resources.i18n.get('settings.playerSpeed') || 'Player Speed',
        [slowButton, normalButton, fastButton, veryFastButton]
    );
    settingsContainer.appendChild(speedGroup);
    
    // Initialize speed button states
    updateSpeedButtonsState();
    
    // 6. Music toggle button
    const musicOnButton = createWoodenButton(
        '🔊', 
        gameInstance.resources.i18n.get('settings.musicOn') || 'Music On',
        () => {
            if (gameInstance.resources.sound.music.paused) {
                gameInstance.resources.playBackgroundMusic();
                updateMusicButtonsState();
                gameInstance.saveSettings(); // Save music preference
            }
        },
        'small'
    );
    
    const musicOffButton = createWoodenButton(
        '🔇', 
        gameInstance.resources.i18n.get('settings.musicOff') || 'Music Off',
        () => {
            if (!gameInstance.resources.sound.music.paused) {
                gameInstance.resources.sound.music.pause();
                updateMusicButtonsState();
                gameInstance.saveSettings(); // Save music preference
            }
        },
        'small'
    );
    
    // Update music button states
    function updateMusicButtonsState() {
        const isMusicOn = !gameInstance.resources.sound.music.paused;
        musicOnButton.style.border = isMusicOn ? '2px solid #ffd700' : '2px solid #8B4513';
        musicOnButton.style.opacity = isMusicOn ? '1' : '0.7';
        
        musicOffButton.style.border = !isMusicOn ? '2px solid #ffd700' : '2px solid #8B4513';
        musicOffButton.style.opacity = !isMusicOn ? '1' : '0.7';
    }
    
    // Group music buttons
    const musicGroup = createButtonGroup(
        gameInstance.resources.i18n.get('settings.music') || 'Music',
        [musicOnButton, musicOffButton]
    );
    settingsContainer.appendChild(musicGroup);
    
    dialog.appendChild(settingsContainer);
    modal.appendChild(dialog);
    
    // First remove any existing modal to prevent duplicates
    const existingModal = document.getElementById('settings-modal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }
    
    document.body.appendChild(modal);
    
    // Add keyboard event to close on Escape
    const handleEscKey = (event) => {
        if (event.key === 'Escape') {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
                gameInstance.score.resumeTimer();
                document.removeEventListener('keydown', handleEscKey);
            }
        }
    };
    document.addEventListener('keydown', handleEscKey);
}

/**
 * Handle click on the game mode selection screen
 * @param {MouseEvent} e - Mouse click event
 */
function handleGameModeSelectionClick(e, gameInstance) {
    if (gameInstance.state !== GAME_STATES.GAME_MODE_SELECT) return;
    
    const rect = gameInstance.canvas.getBoundingClientRect();
    const scaleX = gameInstance.canvas.width / rect.width;
    const scaleY = gameInstance.canvas.height / rect.height;
    
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    
    // Check if any button was clicked
    Object.entries(gameInstance.buttonAreas).forEach(([key, area]) => {
        if (clickX >= area.x && clickX <= area.x + area.width &&
            clickY >= area.y && clickY <= area.y + area.height) {
            
            // Handle button click based on the button key
            switch (key) {
                case 'normalMode':
                    gameInstance.gameMode = GAME_MODES.NORMAL;
                    gameInstance.setState(GAME_STATES.LEVEL_SELECT);
                    break;
                    
                case 'timeAttack':
                    gameInstance.gameMode = GAME_MODES.TIME_ATTACK;
                    gameInstance.setState(GAME_STATES.LEVEL_SELECT);
                    break;
                    
                case 'challengeMode':
                    gameInstance.gameMode = GAME_MODES.CHALLENGE;
                    gameInstance.setState(GAME_STATES.LEVEL_SELECT);
                    break;
                    
                case 'back':
                    gameInstance.setState(GAME_STATES.INTRO);
                    break;
            }
        }
    });
}
