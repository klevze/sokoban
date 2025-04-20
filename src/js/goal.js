// filepath: d:\Sites\canvas\games\sokoban\src\js\goal.js
/**
 * Goal class for Sokoban
 * Handles goal positions where boxes need to be placed
 * 
 * This module implements the goal positions that determine win conditions in Sokoban.
 * Goals are stored in a separate layer of the level data and are rendered under boxes.
 */
import { game } from './game.js';

/**
 * Goal class manages all target positions where boxes need to be placed
 * 
 * Key responsibilities:
 * - Extract goal positions from level data
 * - Render goal tiles on the game board
 * - Provide goal position data for win condition detection
 */
export class Goal {
    /**
     * Create a new Goal instance
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {HTMLImageElement} imgTiles - Tileset image containing goal sprites
     * @param {number} tilesWidth - Width of each tile in the tileset
     * @param {number} outputWidth - Output width for drawing on canvas
     */
    constructor(ctx, imgTiles, tilesWidth, outputWidth) {
        this.ctx = ctx;
        this.tiles = imgTiles;
        this.tileWidth = tilesWidth;
        this.tilesPerRow = Math.floor(this.tiles.naturalWidth / tilesWidth);
        this.outputWidth = outputWidth;
        this.goals = this.parseGoals();
    }

    /**
     * Extract goal positions from level data
     * Goals are stored in layer 1 of the level data (Tiled format)
     * 
     * This method analyzes the level file and identifies all goal positions
     * required for level completion
     * 
     * @returns {Array} Array of goal objects with positions
     */
    parseGoals() {
        const layerID = 1; // Goals are in layer 1 (zero-indexed)
        const goals = [];
        const levelData = game.levelData;
        
        if (!levelData || !levelData.layers || levelData.layers.length < 2) {
            console.warn("Invalid level data for goals");
            return goals;
        }

        for (let y = 0; y < levelData.height; y++) {
            for (let x = 0; x < levelData.width; x++) {
                const tileIndex = y * levelData.width + x;
                const tileID = levelData.layers[layerID].data[tileIndex];
                if (tileID > 0) {
                    goals.push({ x: x, y: y, tile: tileID });
                }
            }
        }
        return goals;
    }

    /**
     * Calculate the position of a tile in the tileset image
     * Converts tile index to x,y coordinates within the sprite sheet
     * 
     * @param {number} tileIndex - Index of the tile
     * @param {number} tileSize - Size of each tile
     * @returns {object} - {x, y} coordinates of the tile in the tileset
     */
    calculateTilePosition(tileIndex, tileSize) {
        // Adjust index (tile indices are 1-based in the Tiled format)
        tileIndex--;

        // Ensure valid index
        if (tileIndex < 0) {
            tileIndex = 0;
        }

        // Calculate position within the tileset image
        const x = Math.floor((tileIndex % this.tilesPerRow) * tileSize);
        const y = Math.floor(Math.floor(tileIndex / this.tilesPerRow) * tileSize);
        return { x, y };
    }

    /**
     * Convert 2D coordinates to a 1D array index
     * Used for looking up tiles in the level data arrays
     * 
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
     * Reset goals for a new level
     * Called when changing levels or restarting the current level
     * Ensures goal positions are updated to match new level data
     */
    resetGoals() {
        this.goals = this.parseGoals();
    }

    /**
     * Draws all goals on the canvas
     * These are the target positions where boxes need to be placed to complete the level
     * 
     * Goals are rendered below boxes to create a visual hierarchy indicating
     * that boxes should be placed on goals
     */
    draw() {
        // Safety check
        if (!game.level) return;
        
        const { ctx } = this;

        for (const goal of this.goals) {
            // Get the position of the tile in the tileset
            const tilePos = this.calculateTilePosition(goal.tile, this.tileWidth);

            // Use level's output width for consistent scaling
            const outputWidth = game.level.outputWidth;

            // Draw the goal tile
            ctx.drawImage(
                this.tiles,                 // Tilemap image file
                tilePos.x,                  // source X
                tilePos.y,                  // source Y
                this.tileWidth,             // source Width
                this.tileWidth,             // source Height
                game.level.startX + goal.x * outputWidth,       // destination X
                game.level.startY + goal.y * outputWidth,       // destination Y
                outputWidth,                // destination Width
                outputWidth                 // destination Height
            );
        }
    }
}