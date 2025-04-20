/**
 * Level class for Sokoban
 * Handles level rendering and tile management
 */

import { game } from './game.js';
import { TILES, DEBUG } from './config/config.js';

/**
 * Level class manages the game board/map display and collision detection
 */
export class Level {
    /**
     * Create a new Level instance
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {HTMLImageElement} imgTiles - Tileset image containing all game tiles
     * @param {number} tilesWidth - Width of each tile in the tileset
     * @param {number} outputWidth - Output width for drawing tiles on canvas
     */
    constructor(ctx, imgTiles, tilesWidth, outputWidth) {
        this.ctx = ctx;
        this.tiles = imgTiles;
        this.tileWidth = tilesWidth;
        this.tilesPerRow = Math.floor(this.tiles.naturalWidth / tilesWidth);

        // List of tile IDs that the player can walk on - use constants from config
        this.walkableTiles = TILES.WALKABLE_TILES;

        this.outputWidth = outputWidth;
        this.baseOutputWidth = outputWidth; // Store the original output width
        
        // Tileset cache to improve rendering performance
        this.tileCache = new Map();

        // Initialize - level data will be available when the game loads
        this.startX = 0;
        this.startY = 0;
        this.scaleFactor = 1;
        
        // Define reserved spaces
        this.topReservedSpace = 100; // Space for logo and buttons
        this.bottomReservedSpace = 130; // Space for score panel - fixed at 130px
        
        // Initialize once we have level data
        this.initLevel();
    }

    /**
     * Initialize level properties once level data is available
     * This is called during construction and when level changes
     */
    initLevel() {
        // Safety check - make sure the game instance and levelData exist
        if (!game || !game.levelData) {
            console.warn('Level data not available yet - will initialize later');
            return;
        }

        const levelData = game.levelData;

        // Calculate available screen space (minus reserved areas)
        const availableWidth = this.ctx.canvas.width;
        const availableHeight = this.ctx.canvas.height - this.topReservedSpace - this.bottomReservedSpace;

        // Calculate the maximum tile size that will fit in the available space
        const maxWidthPerTile = availableWidth / levelData.width;
        const maxHeightPerTile = availableHeight / levelData.height;
        
        // Choose the smaller of the two to maintain aspect ratio
        const scaledTileSize = Math.floor(Math.min(maxWidthPerTile, maxHeightPerTile));
        
        // Calculate the scale factor relative to the base output width
        this.scaleFactor = scaledTileSize / this.baseOutputWidth;
        // Ensure minimum scale factor
        this.scaleFactor = Math.max(0.5, Math.min(this.scaleFactor, 1.5));
        
        // Update the output width based on the scale factor
        this.outputWidth = Math.floor(this.baseOutputWidth * this.scaleFactor);
        
        // Calculate the starting position to center the level on the canvas
        this.startX = Math.max(0, Math.floor((availableWidth - levelData.width * this.outputWidth) / 2));
        this.startY = Math.max(0, Math.floor(this.topReservedSpace + 
                                             (availableHeight - levelData.height * this.outputWidth) / 2));
        
        // Clear the tile cache when loading a new level or when scaling changes
        this.tileCache.clear();

        // Check if levelData is properly initialized and has layers
        if (!levelData.layers || !Array.isArray(levelData.layers)) {
            console.error('Error: levelData array is not properly initialized.');
            return;
        }
        
        // Check if levelData contains the expected data structure
        if (!levelData.layers.every(layer => layer && layer.data && Array.isArray(layer.data))) {
            console.error('Error: levelData data structure is invalid.');
            return;
        }
    }

    /**
     * Get or create a cached tile for the given tile number
     * @param {number} tileNum - The tile number to get from the tileset
     * @returns {HTMLCanvasElement} - A canvas containing the rendered tile
     */
    getCachedTile(tileNum) {
        if (tileNum <= 0) return null;
        
        // Use scale factor in cache key to ensure proper rendering at different scales
        const cacheKey = `${tileNum}_${this.scaleFactor.toFixed(2)}`;
        
        // Check if we already have this tile cached
        if (this.tileCache.has(cacheKey)) {
            return this.tileCache.get(cacheKey);
        }
        
        // Create a new canvas for this tile
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = this.outputWidth;
        tileCanvas.height = this.outputWidth;
        const tileCtx = tileCanvas.getContext('2d');
        
        // Calculate position in tileset
        const tilePos = this.calculateTilePosition(tileNum, this.tileWidth);
        
        // Draw the tile onto the cache canvas
        tileCtx.drawImage(
            this.tiles,               // Tilemap image file
            tilePos.x,                // source X
            tilePos.y,                // source Y
            this.tileWidth,           // source Width
            this.tileWidth,           // source Height
            0,                        // destination X (0 for the cache canvas)
            0,                        // destination Y (0 for the cache canvas)
            this.outputWidth,         // destination Width
            this.outputWidth          // destination Height
        );
        
        // Store in cache
        this.tileCache.set(cacheKey, tileCanvas);
        
        return tileCanvas;
    }

    /**
     * Check if a tile is walkable at the given coordinates
     * @param {number} x - X coordinate to check
     * @param {number} y - Y coordinate to check
     * @param {number} targetId - Layer ID to check in level data
     * @returns {boolean} - True if tile is walkable
     */
    isWakable(x, y, targetId) {
        const levelData = game.levelData;
        if (!levelData) return false;
        
        // Boundary check
        if (x < 0 || y < 0 || x >= levelData.width || y >= levelData.height) {
            return false;
        }
        
        const tileIndex = y * levelData.width + x;
        return this.walkableTiles.includes(levelData.layers[targetId].data[tileIndex]);
    }

    /**
     * Calculate the position of a tile in the tileset image
     * @param {number} tileIndex - Index of the tile
     * @param {number} tileSize - Size of each tile
     * @returns {object} - {x, y} coordinates of the tile in the tileset
     */
    calculateTilePosition(tileIndex, tileSize) {
        tileIndex--;
        
        if(tileIndex < 0) {
            tileIndex = 0;
        }

        const x = Math.floor((tileIndex % this.tilesPerRow) * tileSize);
        const y = Math.floor(Math.floor(tileIndex / this.tilesPerRow) * tileSize);
        return { x, y };
    }

    /**
     * Convert 2D coordinates to a 1D array index
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} - Index in the level data array
     */
    getTileIdFromCoords(x, y) {
        const levelData = game.levelData;
        if (!levelData) return 0;
        
        return y * levelData.width + x;
    }

    /**
     * Draw the level on the canvas
     * Renders all tiles from the base layer (layer 0)
     */
    draw() {
        const { ctx } = this;
        const levelData = game.levelData;
        
        if (!levelData || !levelData.layers) {
            return;
        }
        
        // Ensure our start position is updated (in case of window resize)
        if (this.startX === 0 && this.startY === 0) {
            this.initLevel();
        }
    
        // Pre-process tiles to render - collect all tiles needed for this level
        const baseLayer = levelData.layers[0];
        
        // Draw each tile from the base layer
        for (let y = 0; y < levelData.height; y++) {
            for (let x = 0; x < levelData.width; x++) {
                const index = this.getTileIdFromCoords(x, y);
                const tileNum = baseLayer.data[index];
                
                if (tileNum > 0) {
                    const cachedTile = this.getCachedTile(tileNum);
                    if (cachedTile) {
                        // Calculate the drawing position to center the level
                        const drawX = this.startX + x * this.outputWidth;
                        const drawY = this.startY + y * this.outputWidth;
                        
                        // Draw from cache
                        ctx.drawImage(cachedTile, drawX, drawY);
                        
                        // Debug mode: Show tile numbers if enabled
                        if (DEBUG.ENABLED && DEBUG.SHOW_TILE_NUMBERS) {
                            ctx.save();
                            // Draw semi-transparent background for better readability
                            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                            ctx.fillRect(
                                drawX + 2, 
                                drawY + 2, 
                                this.outputWidth - 4, 
                                16
                            );
                            
                            // Draw tile number text
                            ctx.font = '10px Arial';
                            ctx.fillStyle = 'white';
                            ctx.textAlign = 'center';
                            ctx.fillText(
                                tileNum.toString(),
                                drawX + this.outputWidth / 2,
                                drawY + 14
                            );
                            ctx.restore();
                        }
                        
                        // Debug mode: Show grid coordinates if enabled
                        if (DEBUG.ENABLED && DEBUG.SHOW_COORDINATES) {
                            ctx.save();
                            // Draw coordinate text
                            ctx.font = '10px Arial';
                            ctx.fillStyle = 'yellow';
                            ctx.textAlign = 'center';
                            ctx.fillText(
                                `${x},${y}`,
                                drawX + this.outputWidth / 2,
                                drawY + this.outputWidth - 5
                            );
                            ctx.restore();
                        }
                    }
                }
            }
        }
        
        // Debug mode: Draw grid lines if enabled
        if (DEBUG.ENABLED && DEBUG.SHOW_GRID_LINES) {
            this.drawGrid(levelData.width, levelData.height);
        }
    }

    /**
     * Draw grid lines over the level for debug purposes
     * @param {number} width - Width of level in tiles
     * @param {number} height - Height of level in tiles
     */
    drawGrid(width, height) {
        const { ctx } = this;
        
        // Save context state
        ctx.save();
        
        // Set line style
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x <= width; x++) {
            const drawX = this.startX + x * this.outputWidth;
            ctx.beginPath();
            ctx.moveTo(drawX, this.startY);
            ctx.lineTo(drawX, this.startY + height * this.outputWidth);
            ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= height; y++) {
            const drawY = this.startY + y * this.outputWidth;
            ctx.beginPath();
            ctx.moveTo(this.startX, drawY);
            ctx.lineTo(this.startX + width * this.outputWidth, drawY);
            ctx.stroke();
        }
        
        // Restore context state
        ctx.restore();
    }
    
    /**
     * Get tile data from all layers at specific coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Array} - Array of tile IDs from all layers at the given coordinates
     */
    getCoordData(x, y) {
        const levelData = game.levelData;
        if (!levelData || !levelData.layers) {
            return [0, 0, 0]; // Default to empty data
        }
        
        const tileIndex = y * levelData.width + x;
        const tileData = [];

        levelData.layers.forEach(layer => {
            if (layer.data && Array.isArray(layer.data) && tileIndex < layer.data.length) {
                tileData.push(layer.data[tileIndex]);
            }
        });

        return tileData;    
    }

    /**
     * Check if an array contains any number greater than 1
     * Used for collision detection
     * @param {Array} array - Array of numbers to check
     * @returns {boolean} - True if any number is greater than 1
     */
    hasNumberHigherThanOne(array) {
        return array.some(number => number > 1);
    }

    /**
     * Check if coordinates are walkable based on all layer data
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} - 0 if not walkable, 1 if walkable
     */
    isWalkableCord(x, y) {
        const levelData = game.levelData;
        if (!levelData) return 0;
        
        // Boundary check
        if (x < 0 || y < 0 || x >= levelData.width || y >= levelData.height) {
            return 0;
        }
        
        const data = this.getCoordData(x, y);
        const p = this.hasNumberHigherThanOne(data);

        if(p == true) {
            return 0;
        }

        return 1;
    }
}
