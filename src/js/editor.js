/**
 * Level Editor for Sokoban
 * 
 * Allows players to create custom levels with the following features:
 * - Drag and drop tile placement
 * - Separate editing for walls, goals, and boxes layers
 * - Save and load custom levels
 * - Test levels before saving
 * - Import/export levels in JSON format
 */

import { game } from './game.js';
import { TILES } from './config/config.js';

/**
 * LevelEditor class provides UI and functionality for creating custom Sokoban levels
 */
export class LevelEditor {
    /**
     * Create a new LevelEditor instance
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {HTMLImageElement} imgTiles - Tileset image containing all game tiles
     * @param {number} tilesWidth - Width of each tile in the tileset
     * @param {number} outputWidth - Output width for drawing tiles on canvas
     */
    constructor(ctx, imgTiles, tilesWidth, outputWidth) {
        this.ctx = ctx;
        this.tiles = imgTiles;
        this.tileWidth = tilesWidth;
        this.outputWidth = outputWidth;
        this.tilesPerRow = Math.floor(this.tiles.naturalWidth / tilesWidth);
        
        // Editor state
        this.active = false;
        this.currentLayer = 0; // 0: Maps, 1: Goals, 2: Boxes, 3: Player
        this.currentTile = 0;
        this.startX = 0;
        this.startY = 0;
        this.mouseDown = false;
        this.gridWidth = 16;
        this.gridHeight = 12;
        this.hasUnsavedChanges = false;
        this.scaleFactor = 1;
        this.showGrid = true;
        
        // Palette selection tracking (for arrow key navigation)
        this.selectedPaletteTileIndex = 0;
        
        // Palettes for each layer
        this.palettes = {
            0: [0, 11, 12, 13, 14, 15, 16, 21, 26, 31, 36, 41, 46, 57, 59, 61, 62, 63, 64, 65, 66, 67, 68, 90], // Wall/floor tiles
            1: [0, 10], // Goal tiles
            2: [0, 94], // Box tiles
            3: [0, 88]  // Player tile
        };
        
        // Layer names for UI display
        this.layerNames = ['Maps', 'Goals', 'Blocks', 'Player'];
        
        // Custom level data
        this.customLevel = this.createEmptyLevel();
        
        // Initialize mouse handlers
        this.initEventHandlers();
    }
    
    /**
     * Create an empty level structure
     * @returns {Object} Empty level data structure
     */
    createEmptyLevel() {
        const emptyLayer = Array(this.gridWidth * this.gridHeight).fill(0);
        
        return {
            compressionlevel: -1,
            height: this.gridHeight,
            infinite: false,
            layers: [
                {
                    data: [...emptyLayer],
                    height: this.gridHeight,
                    id: 1,
                    name: "Maps", // Maps layer (walls and floor)
                    opacity: 1,
                    type: "tilelayer",
                    visible: true,
                    width: this.gridWidth,
                    x: 0,
                    y: 0
                },
                {
                    data: [...emptyLayer],
                    height: this.gridHeight,
                    id: 2,
                    name: "Goals", // Goals layer
                    opacity: 1,
                    type: "tilelayer",
                    visible: true,
                    width: this.gridWidth,
                    x: 0,
                    y: 0
                },
                {
                    data: [...emptyLayer],
                    height: this.gridHeight,
                    id: 3,
                    name: "Blocks", // Boxes layer
                    opacity: 1,
                    type: "tilelayer",
                    visible: true,
                    width: this.gridWidth,
                    x: 0,
                    y: 0
                }
            ],
            nextlayerid: 4,
            nextobjectid: 1,
            orientation: "orthogonal",
            renderorder: "right-down",
            tiledversion: "1.10.2",
            tileheight: 96,
            tilesets: [
                {
                    firstgid: 1,
                    source: "tileset_96x96px.tsx"
                }
            ],
            tilewidth: 96,
            type: "map",
            version: "1.10",
            width: this.gridWidth
        };
    }
    
    /**
     * Initialize mouse event handlers for editor interactions
     */
    initEventHandlers() {
        const canvas = this.ctx.canvas;
        
        // Store bound methods to be able to remove them later
        this.handleMouseDown = this.onMouseDown.bind(this);
        this.handleMouseMove = this.onMouseMove.bind(this);
        this.handleMouseUp = this.onMouseUp.bind(this);
        this.handleKeyDown = this.onKeyDown.bind(this);
        
        // Add touch event handlers for mobile support
        this.handleTouchStart = this.onTouchStart.bind(this);
        this.handleTouchMove = this.onTouchMove.bind(this);
        this.handleTouchEnd = this.onTouchEnd.bind(this);
    }
    
    /**
     * Show the editor and initialize the UI
     */
    show() {
        this.active = true;
        this.clearLevel();
        
        // Add event listeners - both mouse (for desktop) and touch (for mobile)
        const canvas = this.ctx.canvas;
        
        // Mouse events
        canvas.addEventListener('mousedown', this.handleMouseDown);
        canvas.addEventListener('mousemove', this.handleMouseMove);
        canvas.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('keydown', this.handleKeyDown);
        
        // Touch events
        canvas.addEventListener('touchstart', this.handleTouchStart);
        canvas.addEventListener('touchmove', this.handleTouchMove);
        canvas.addEventListener('touchend', this.handleTouchEnd);
    }
    
    /**
     * Hide the editor and clean up
     */
    hide() {
        this.active = false;
        
        // Remove event listeners
        const canvas = this.ctx.canvas;
        
        // Mouse events
        canvas.removeEventListener('mousedown', this.handleMouseDown);
        canvas.removeEventListener('mousemove', this.handleMouseMove);
        canvas.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('keydown', this.handleKeyDown);
        
        // Touch events
        canvas.removeEventListener('touchstart', this.handleTouchStart);
        canvas.removeEventListener('touchmove', this.handleTouchMove);
        canvas.removeEventListener('touchend', this.handleTouchEnd);
    }
    
    /**
     * Handle mouse down event
     * @param {MouseEvent} e - The mouse event
     */
    onMouseDown(e) {
        if (!this.active) return;
        
        this.mouseDown = true;
        
        // Check if click is in tile palette area
        if (e.clientY > this.ctx.canvas.height - 100) {
            this.handlePaletteClick(e);
            return;
        }
        
        // Otherwise place tile
        this.placeTile(e);
    }
    
    /**
     * Handle mouse move event
     * @param {MouseEvent} e - The mouse event
     */
    onMouseMove(e) {
        if (!this.active || !this.mouseDown) return;
        
        // Prevent placing tiles when over the palette area
        if (e.clientY > this.ctx.canvas.height - 100) {
            return;
        }
        
        // Place tile on drag
        this.placeTile(e);
    }
    
    /**
     * Handle mouse up event
     * @param {MouseEvent} e - The mouse event
     */
    onMouseUp(e) {
        this.mouseDown = false;
    }
    
    /**
     * Handle touch start event (equivalent to mouse down)
     * @param {TouchEvent} e - The touch event
     */
    onTouchStart(e) {
        if (!this.active) return;
        
        e.preventDefault(); // Prevent scrolling and default touch behaviors
        
        this.mouseDown = true;
        
        // Get the first touch point
        const touch = e.touches[0];
        const rect = this.ctx.canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        
        // Create a synthetic mouse event to reuse existing code
        const simulatedEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {}
        };
        
        // Check if touch is in tile palette area
        if (touchY > this.ctx.canvas.height - 100) {
            this.handlePaletteClick(simulatedEvent);
            return;
        }
        
        // Otherwise place tile
        this.placeTile(simulatedEvent);
    }
    
    /**
     * Handle touch move event (equivalent to mouse move)
     * @param {TouchEvent} e - The touch event
     */
    onTouchMove(e) {
        if (!this.active || !this.mouseDown) return;
        
        e.preventDefault(); // Prevent scrolling
        
        // Get the first touch point
        const touch = e.touches[0];
        
        // Create a synthetic mouse event
        const simulatedEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {}
        };
        
        // Prevent placing tiles when over the palette area
        const rect = this.ctx.canvas.getBoundingClientRect();
        const touchY = touch.clientY - rect.top;
        if (touchY > this.ctx.canvas.height - 100) {
            return;
        }
        
        // Place tile on drag
        this.placeTile(simulatedEvent);
    }
    
    /**
     * Handle touch end event (equivalent to mouse up)
     * @param {TouchEvent} e - The touch event
     */
    onTouchEnd(e) {
        e.preventDefault();
        this.mouseDown = false;
    }
    
    /**
     * Handle key down event
     * @param {KeyboardEvent} e - The keyboard event
     */
    onKeyDown(e) {
        if (!this.active) return;
        
        // Layer switching with number keys
        if (e.key >= '1' && e.key <= '4') {
            this.switchLayer(parseInt(e.key) - 1);
            e.preventDefault();
        }
        
        // Test level with T
        if (e.key === 't' || e.key === 'T') {
            this.testLevel();
            e.preventDefault();
        }
        
        // Save level with S
        if (e.key === 's' || e.key === 'S') {
            this.saveLevel();
            e.preventDefault();
        }
        
        // New level with N
        if (e.key === 'n' || e.key === 'N') {
            if (confirm('Create a new level? Unsaved changes will be lost.')) {
                this.clearLevel();
            }
            e.preventDefault();
        }
        
        // Exit editor with Escape
        if (e.key === 'Escape') {
            this.exitEditor();
            e.preventDefault();
        }
        
        // Toggle grid with G
        if (e.key === 'g' || e.key === 'G') {
            this.showGrid = !this.showGrid;
            e.preventDefault();
        }
        
        // Navigate palette with arrow keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            this.navigatePalette(e.key);
            e.preventDefault();
        }
    }
    
    /**
     * Switch the current editing layer
     * @param {number} layerId - The layer to switch to
     */
    switchLayer(layerId) {
        if (layerId >= 0 && layerId <= 3) {
            this.currentLayer = layerId;
            this.currentTile = 0; // Reset selected tile when switching layers
        }
    }
    
    /**
     * Handle clicks in the tile palette area
     * @param {MouseEvent} e - The mouse event
     */
    handlePaletteClick(e) {
        // Get mouse position
        const rect = this.ctx.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Make sure paletteInfo is initialized
        if (!this.paletteInfo) return;
        
        const paletteY = this.paletteInfo.startY;
        const palette = this.palettes[this.currentLayer];
        
        // Check if click is in layer buttons or action buttons area
        if (x > this.paletteInfo.buttonAreaX) {
            // Handle layer button clicks
            const buttonWidth = 120;
            
            // Check if clicked in the row with layer buttons
            if (y >= paletteY + 10 && y <= paletteY + 46) {
                for (let i = 0; i < this.layerNames.length; i++) {
                    const buttonX = this.ctx.canvas.width - (this.layerNames.length - i) * buttonWidth - 10;
                    const buttonWidth = 110;
                    
                    if (x >= buttonX && x <= buttonX + buttonWidth) {
                        this.switchLayer(i);
                        return;
                    }
                }
            }
            
            // Check if clicked in the row with action buttons
            if (y >= paletteY + 60 && y <= paletteY + 90) {
                const actionButtons = ['test', 'save', 'new', 'exit'];
                for (let i = 0; i < actionButtons.length; i++) {
                    const buttonX = this.ctx.canvas.width - (actionButtons.length - i) * buttonWidth - 10;
                    const buttonWidth = 110;
                    
                    if (x >= buttonX && x <= buttonX + buttonWidth) {
                        // Perform action based on button clicked
                        switch (actionButtons[i]) {
                            case 'test':
                                this.testLevel();
                                break;
                            case 'save':
                                this.saveLevel();
                                break;
                            case 'new':
                                if (confirm('Create a new level? Unsaved changes will be lost.')) {
                                    this.clearLevel();
                                }
                                break;
                            case 'exit':
                                this.exitEditor();
                                break;
                        }
                        return;
                    }
                }
            }
            
            return;
        }
        
        // If not clicking on buttons, then handle tile selection
        // Check if click is outside palette tile area
        if (x < 10 || x > this.paletteInfo.availableWidth + 10) return;
        
        // Check precise tile positions for click detection
        for (let i = 0; i < this.paletteInfo.tilePositions.length; i++) {
            const tile = this.paletteInfo.tilePositions[i];
            if (
                x >= tile.x &&
                x <= tile.x + tile.width &&
                y >= tile.y &&
                y <= tile.y + tile.height
            ) {
                this.currentTile = tile.tileId;
                return;
            }
        }
    }
    
    /**
     * Place a tile on the grid at the mouse position
     * @param {MouseEvent} e - The mouse event
     */
    placeTile(e) {
        // Get mouse position relative to canvas
        const rect = this.ctx.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check if click is in the palette area at the bottom
        const paletteY = this.ctx.canvas.height - 100;
        if (y >= paletteY) {
            console.log("Click is in palette area, not placing tile");
            return;
        }
        
        // Calculate grid position based on scaled tile size
        const scaledOutputWidth = Math.floor(this.outputWidth * this.scaleFactor);
        const gridX = Math.floor((x - this.startX) / scaledOutputWidth);
        const gridY = Math.floor((y - this.startY) / scaledOutputWidth);
        
        // Log coordinates for debugging
        console.log(`Mouse: x=${x}, y=${y}`);
        console.log(`Grid: x=${gridX}, y=${gridY}`);
        console.log(`startX=${this.startX}, startY=${this.startY}, scaledWidth=${scaledOutputWidth}`);
        
        // Ensure position is within grid
        if (gridX >= 0 && gridX < this.customLevel.width && 
            gridY >= 0 && gridY < this.customLevel.height) {
            
            // Calculate index in data array
            const index = gridY * this.customLevel.width + gridX;
            
            // Special case for player position (only one allowed)
            if (this.currentLayer === 3) {
                if (this.currentTile > 0) {
                    // Remove any existing player position
                    const existingPlayerPos = this.findPlayerPosition();
                    if (existingPlayerPos !== null) {
                        const existingIndex = existingPlayerPos.y * this.customLevel.width + existingPlayerPos.x;
                        this.customLevel.layers[2].data[existingIndex] = 0;
                    }
                    
                    // Place player in boxes layer with special tile ID
                    this.customLevel.layers[2].data[index] = 88; // Player tile
                }
            } else {
                // Regular tile placement
                if (this.customLevel.layers[this.currentLayer].data[index] !== this.currentTile) {
                    this.customLevel.layers[this.currentLayer].data[index] = this.currentTile;
                    this.hasUnsavedChanges = true;
                }
            }
        } else {
            console.log(`Out of bounds: gridX=${gridX}, gridY=${gridY}, width=${this.customLevel.width}, height=${this.customLevel.height}`);
        }
    }
    
    /**
     * Find the player position in the level data
     * @returns {Object|null} Player position {x, y} or null if not found
     */
    findPlayerPosition() {
        const boxesLayer = this.customLevel.layers[2].data;
        for (let y = 0; y < this.customLevel.height; y++) {
            for (let x = 0; x < this.customLevel.width; x++) {
                const index = y * this.customLevel.width + x;
                if (boxesLayer[index] === 88) { // Player tile ID
                    return { x, y };
                }
            }
        }
        return null;
    }
    
    /**
     * Calculate the position of a tile in the tileset image
     * @param {number} tileIndex - Index of the tile
     * @returns {object} - {x, y} coordinates of the tile in the tileset
     */
    calculateTilePosition(tileIndex) {
        tileIndex--;
        
        if (tileIndex < 0) {
            tileIndex = 0;
        }

        const x = Math.floor((tileIndex % this.tilesPerRow) * this.tileWidth);
        const y = Math.floor(Math.floor(tileIndex / this.tilesPerRow) * this.tileWidth);
        return { x, y };
    }
    
    /**
     * Find the index of a tile in the current palette by its tile ID
     * @param {number} tileId - The tile ID to find
     * @returns {number} The index of the tile in the palette, or -1 if not found
     */
    findTileIndexInPalette(tileId) {
        const palette = this.palettes[this.currentLayer];
        return palette.indexOf(tileId);
    }

    /**
     * Navigate palette using arrow keys
     * @param {string} direction - The direction key: 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
     */
    navigatePalette(direction) {
        const palette = this.palettes[this.currentLayer];
        if (palette.length === 0) return;
        
        // Get the current selected tile index
        let currentIndex = this.findTileIndexInPalette(this.currentTile);
        
        // If no tile is selected, select the first one
        if (currentIndex === -1) {
            this.currentTile = palette[0];
            return;
        }
        
        // Calculate the number of tiles per row
        const tilesPerRow = this.paletteInfo.tilesPerRow;
        
        // Calculate the new index based on direction
        let newIndex = currentIndex;
        
        switch (direction) {
            case 'ArrowUp':
                newIndex = currentIndex - tilesPerRow;
                break;
            case 'ArrowDown':
                newIndex = currentIndex + tilesPerRow;
                break;
            case 'ArrowLeft':
                newIndex = currentIndex - 1;
                // Wrap around to previous row if at the beginning of a row
                if (newIndex >= 0 && Math.floor(newIndex / tilesPerRow) !== Math.floor(currentIndex / tilesPerRow)) {
                    newIndex = (Math.floor(currentIndex / tilesPerRow) * tilesPerRow) + tilesPerRow - 1;
                    if (newIndex >= palette.length) newIndex = palette.length - 1;
                }
                break;
            case 'ArrowRight':
                newIndex = currentIndex + 1;
                // Wrap around to next row if at the end of a row
                if (newIndex < palette.length && Math.floor(newIndex / tilesPerRow) !== Math.floor(currentIndex / tilesPerRow)) {
                    newIndex = Math.floor(currentIndex / tilesPerRow + 1) * tilesPerRow;
                }
                break;
        }
        
        // Make sure the new index is valid
        if (newIndex >= 0 && newIndex < palette.length) {
            this.currentTile = palette[newIndex];
        }
    }
    
    /**
     * Test the current level
     */
    testLevel() {
        // Validate the level
        if (!this.validateLevel()) {
            return;
        }
        
        // Create a deep copy of the level data
        const levelToTest = JSON.parse(JSON.stringify(this.customLevel));
        
        // Load the level in the game
        game.testCustomLevel(levelToTest);
    }
    
    /**
     * Validate the level is playable
     * @returns {boolean} - True if the level is valid
     */
    validateLevel() {
        // Check if there's a player on the level
        const playerPos = this.findPlayerPosition();
        if (!playerPos) {
            alert('Error: Level must have a player position.');
            return false;
        }
        
        // Count boxes and goals
        let boxCount = 0;
        let goalCount = 0;
        
        for (let i = 0; i < this.customLevel.width * this.customLevel.height; i++) {
            if (this.customLevel.layers[1].data[i] > 0) {
                goalCount++;
            }
            if (this.customLevel.layers[2].data[i] === 94) { // Box tile ID
                boxCount++;
            }
        }
        
        // Check if there are any boxes
        if (boxCount === 0) {
            alert('Error: Level must have at least one box.');
            return false;
        }
        
        // Check if boxes match goals
        if (boxCount !== goalCount) {
            alert(`Error: Number of boxes (${boxCount}) must match number of goals (${goalCount}).`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Save the current level to local storage
     */
    saveLevel() {
        // Validate the level
        if (!this.validateLevel()) {
            return;
        }
        
        // Create a deep copy of the level data
        const levelToSave = JSON.parse(JSON.stringify(this.customLevel));
        
        // Get saved levels from local storage
        let savedLevels = localStorage.getItem('sokoban_custom_levels');
        savedLevels = savedLevels ? JSON.parse(savedLevels) : [];
        
        // Prompt for level name
        const levelName = prompt('Enter a name for this level:', 'My Custom Level');
        if (!levelName) {
            return;
        }
        
        // Add metadata to the level
        levelToSave.levelName = levelName;
        levelToSave.authorName = localStorage.getItem('sokoban_author_name') || 'Unknown';
        levelToSave.createdDate = new Date().toISOString();
        
        // Add to saved levels
        savedLevels.push(levelToSave);
        localStorage.setItem('sokoban_custom_levels', JSON.stringify(savedLevels));
        
        alert('Level saved successfully!');
        this.hasUnsavedChanges = false;
    }
    
    /**
     * Clear the current level and start from scratch
     */
    clearLevel() {
        this.customLevel = this.createEmptyLevel();
        this.hasUnsavedChanges = false;
    }
    
    /**
     * Exit the editor and return to the main menu
     */
    exitEditor() {
        if (this.hasUnsavedChanges) {
            const confirmed = confirm('You have unsaved changes. Are you sure you want to exit?');
            if (!confirmed) {
                return;
            }
        }
        
        this.hide();
        game.returnFromEditor();
    }
    
    /**
     * Draw the grid for level editing
     */
    drawGrid() {
        if (!this.showGrid) return;
        
        const { ctx } = this;
        const scaledOutputWidth = Math.floor(this.outputWidth * this.scaleFactor);
        
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        
        // Draw vertical grid lines
        for (let x = 0; x <= this.customLevel.width; x++) {
            const drawX = this.startX + x * scaledOutputWidth;
            ctx.beginPath();
            ctx.moveTo(drawX, this.startY);
            ctx.lineTo(drawX, this.startY + this.customLevel.height * scaledOutputWidth);
            ctx.stroke();
        }
        
        // Draw horizontal grid lines
        for (let y = 0; y <= this.customLevel.height; y++) {
            const drawY = this.startY + y * scaledOutputWidth;
            ctx.beginPath();
            ctx.moveTo(this.startX, drawY);
            ctx.lineTo(this.startX + this.customLevel.width * scaledOutputWidth, drawY);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    /**
     * Draw the tile palette for selection
     */
    drawPalette() {
        const { ctx } = this;
        const paletteY = ctx.canvas.height - 100;
        const palette = this.palettes[this.currentLayer];
        
        // Store palette layout information for click detection
        this.paletteInfo = {
            startY: paletteY,
            tileSize: 36,
            tileMargin: 4,
            availableWidth: ctx.canvas.width - 490,
            buttonAreaX: ctx.canvas.width - 490,
            tilePositions: [] // Will store positions of each tile for precise click detection
        };
        
        // Calculate tiles per row
        this.paletteInfo.tilesPerRow = Math.floor(this.paletteInfo.availableWidth / (this.paletteInfo.tileSize + this.paletteInfo.tileMargin));
        
        // Draw palette background
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, paletteY, ctx.canvas.width, 100);
        
        // Draw each tile in the palette - in a grid layout
        for (let i = 0; i < palette.length; i++) {
            const tileId = palette[i];
            const rowIndex = Math.floor(i / this.paletteInfo.tilesPerRow);
            const colIndex = i % this.paletteInfo.tilesPerRow;
            
            const drawX = 10 + colIndex * (this.paletteInfo.tileSize + this.paletteInfo.tileMargin);
            const drawY = paletteY + 10 + rowIndex * (this.paletteInfo.tileSize + this.paletteInfo.tileMargin);
            
            // Skip if we're out of vertical space
            if (drawY + this.paletteInfo.tileSize > ctx.canvas.height) continue;
            
            // Store the tile position for click detection
            this.paletteInfo.tilePositions[i] = {
                x: drawX,
                y: drawY,
                width: this.paletteInfo.tileSize,
                height: this.paletteInfo.tileSize,
                tileId: tileId
            };
            
            // Draw tile background with highlight if selected
            ctx.fillStyle = this.currentTile === tileId ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(drawX, drawY, this.paletteInfo.tileSize, this.paletteInfo.tileSize);
            
            // Draw red border around currently selected tile
            if (this.currentTile === tileId) {
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 2;
                ctx.strokeRect(drawX, drawY, this.paletteInfo.tileSize, this.paletteInfo.tileSize);
            }
            
            // Draw tile if it's not empty (0)
            if (tileId > 0) {
                const tilePos = this.calculateTilePosition(tileId);
                ctx.drawImage(
                    this.tiles,
                    tilePos.x,
                    tilePos.y,
                    this.tileWidth,
                    this.tileWidth,
                    drawX,
                    drawY,
                    this.paletteInfo.tileSize,
                    this.paletteInfo.tileSize
                );
                
                // Draw tile ID in small text for reference
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.font = '8px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(tileId.toString(), drawX + this.paletteInfo.tileSize - 2, drawY + this.paletteInfo.tileSize - 2);
            } else {
                // Draw X for empty tile
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.moveTo(drawX + 5, drawY + 5);
                ctx.lineTo(drawX + this.paletteInfo.tileSize - 5, drawY + this.paletteInfo.tileSize - 5);
                ctx.moveTo(drawX + this.paletteInfo.tileSize - 5, drawY + 5);
                ctx.lineTo(drawX + 5, drawY + this.paletteInfo.tileSize - 5);
                ctx.stroke();
            }
        }
        
        // Draw layer selection buttons
        const buttonWidth = 120;
        
        for (let i = 0; i < this.layerNames.length; i++) {
            const buttonX = ctx.canvas.width - (this.layerNames.length - i) * buttonWidth - 10;
            const buttonY = paletteY + 10;
            
            // Draw button background
            ctx.fillStyle = this.currentLayer === i ? 'rgba(0, 100, 255, 0.7)' : 'rgba(100, 100, 100, 0.7)';
            ctx.fillRect(buttonX, buttonY, buttonWidth - 10, 36);
            
            // Draw button text
            ctx.fillStyle = 'white';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.layerNames[i], buttonX + (buttonWidth - 10) / 2, buttonY + 24);
            
            // Draw keyboard shortcut
            ctx.font = '10px Arial';
            ctx.fillText(`[${i + 1}]`, buttonX + (buttonWidth - 10) / 2, buttonY + 46);
        }
        
        // Draw action buttons
        const actionButtons = [
            { text: 'Test [T]', action: 'test' },
            { text: 'Save [S]', action: 'save' },
            { text: 'New [N]', action: 'new' },
            { text: 'Exit [Esc]', action: 'exit' }
        ];
        
        for (let i = 0; i < actionButtons.length; i++) {
            const buttonX = ctx.canvas.width - (actionButtons.length - i) * buttonWidth - 10;
            const buttonY = paletteY + 60;
            
            // Draw button background
            ctx.fillStyle = 'rgba(50, 50, 50, 0.7)';
            ctx.fillRect(buttonX, buttonY, buttonWidth - 10, 30);
            
            // Draw button text
            ctx.fillStyle = 'white';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(actionButtons[i].text, buttonX + (buttonWidth - 10) / 2, buttonY + 20);
        }
        
        ctx.restore();
    }
    
    /**
     * Draw the editor interface
     */
    draw() {
        if (!this.active) return;
        
        const { ctx } = this;
        
        // Calculate available screen space
        const availableWidth = ctx.canvas.width;
        const availableHeight = ctx.canvas.height - 100; // Reserve space for palette
        
        // Calculate the maximum tile size that will fit
        const maxWidthPerTile = availableWidth / this.customLevel.width;
        const maxHeightPerTile = availableHeight / this.customLevel.height;
        
        // Choose the smaller of the two to maintain aspect ratio
        const scaledTileSize = Math.floor(Math.min(maxWidthPerTile, maxHeightPerTile));
        
        // Calculate the scale factor and apply it
        this.scaleFactor = scaledTileSize / this.outputWidth;
        this.scaleFactor = Math.max(0.5, Math.min(this.scaleFactor, 1.5));
        const scaledOutputWidth = Math.floor(this.outputWidth * this.scaleFactor);
        
        // Calculate the starting position to center the level
        this.startX = Math.max(0, Math.floor((availableWidth - this.customLevel.width * scaledOutputWidth) / 2));
        this.startY = Math.max(0, Math.floor((availableHeight - this.customLevel.height * scaledOutputWidth) / 2));
        
        // Clear the canvas
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Draw the grid background
        this.drawGrid();
        
        // Draw each layer
        for (let layerId = 0; layerId < this.customLevel.layers.length; layerId++) {
            const layer = this.customLevel.layers[layerId];
            
            for (let y = 0; y < this.customLevel.height; y++) {
                for (let x = 0; x < this.customLevel.width; x++) {
                    const index = y * this.customLevel.width + x;
                    const tileNum = layer.data[index];
                    
                    if (tileNum > 0) {
                        // Calculate position in tileset
                        const tilePos = this.calculateTilePosition(tileNum);
                        
                        // Draw the tile
                        const drawX = this.startX + x * scaledOutputWidth;
                        const drawY = this.startY + y * scaledOutputWidth;
                        
                        ctx.drawImage(
                            this.tiles,
                            tilePos.x,
                            tilePos.y,
                            this.tileWidth,
                            this.tileWidth,
                            drawX,
                            drawY,
                            scaledOutputWidth,
                            scaledOutputWidth
                        );
                        
                        // If this is the currently edited layer, highlight it
                        if (layerId === this.currentLayer) {
                            ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
                            ctx.fillRect(drawX, drawY, scaledOutputWidth, scaledOutputWidth);
                        }
                    }
                }
            }
        }
        
        // Draw the palette
        this.drawPalette();
        
        // Draw editor info
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Editing Layer: ${this.layerNames[this.currentLayer] || 'Unknown'}`, 10, 20);
        ctx.fillText(`Grid: ${this.customLevel.width}x${this.customLevel.height}`, 10, 40);
        ctx.fillText(`Tile Size: ${Math.round(scaledOutputWidth)}px (${this.customLevel.tilewidth}px in game)`, 10, 60);
        if (this.hasUnsavedChanges) {
            ctx.fillStyle = 'yellow';
            ctx.fillText('Unsaved Changes', 10, 80);
        }
        ctx.restore();
    }
}