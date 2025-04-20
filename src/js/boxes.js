/**
 * Boxes class for Sokoban
 * Handles box objects, movement, and collision detection
 * 
 * This module implements the box entities which are the core puzzle elements
 * of Sokoban. It manages their state, movement, and interactions with goals.
 */
import { game } from './game.js';
import { PHYSICS } from './config/config.js';

/**
 * The Boxes class manages all crates/boxes in the Sokoban game
 * 
 * Key responsibilities:
 * - Box state management (position, movement, goal detection)
 * - Smooth animation of box movement with easing functions
 * - Collision detection with other game elements
 * - Visual effects for boxes on goals
 * - Score tracking for box-goal matches
 */
export class Boxes {
    /**
     * Create a new Boxes instance
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {HTMLImageElement} imgTiles - Tileset image containing box sprites
     * @param {number} tilesWidth - Width of each tile in the tileset
     * @param {number} outputWidth - Output width for drawing on canvas
     */
    constructor(ctx, imgTiles, tilesWidth, outputWidth) {
        // Core properties
        this.ctx = ctx;
        this.tiles = imgTiles;
        this.tileWidth = tilesWidth;
        this.outputWidth = outputWidth;
        this.tilesPerRow = Math.floor(this.tiles.naturalWidth / tilesWidth);
        
        // Movement state
        this.isMoving = false;
        this.moveSpeed = 25; // Speed of movement animation in ms (lower = faster)
        this.moveSmoothness = PHYSICS.ANIMATION_SMOOTHNESS; // Number of animation steps
        this.movementDuration = game.getMovementDuration(); // Use game's movement speed setting
        
        // Store box data and movement intervals
        this.boxes = this.parseBoxes();
        this.moveIntervals = {}; // Store movement intervals by box ID
        this.animationFrameIds = {}; // Store animation frame IDs for requestAnimationFrame
        
        // Box tile IDs
        this.NORMAL_BOX_TILE = 94;
        this.GOAL_BOX_TILE = 95;
        
        // Duration for the pulse effect when box is placed on goal (in ms)
        this.pulseEffectDuration = 2000;
    }
    
    /**
     * Extracts box positions from level data
     * Parses the level's box layer to create box objects with positions and states
     * 
     * @returns {Array} Array of box objects with positions
     */
    parseBoxes() {
        const boxes = [];
        const levelData = game.levelData;
        
        if (!levelData || !levelData.layers || levelData.layers.length < 3) {
            console.warn("Invalid level data for boxes");
            return boxes;
        }
        
        for (let y = 0; y < levelData.height; y++) {
            for (let x = 0; x < levelData.width; x++) {
                const tileIndex = y * levelData.width + x;
                if (levelData.layers[2].data[tileIndex] > 0) {
                    boxes.push({ 
                        id: `box_${boxes.length}`,
                        x: x, 
                        y: y,
                        // Add pixel position for smooth movement
                        pixelPos: {
                            x: x,
                            y: y
                        },
                        tile: levelData.layers[2].data[tileIndex], 
                        parked: false,
                        isMoving: false,
                        animStartTime: 0, // Animation start timestamp
                        goalEffectTimestamp: 0 // When box was placed on goal
                    });
                }
            }
        }
        return boxes;
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
        // Adjust index (tile indices are 1-based in the data format)
        tileIndex--;
        
        // Ensure valid index
        if (tileIndex < 0) {
            tileIndex = 0;
        }

        // Calculate tile position in tileset
        const x = Math.floor((tileIndex % this.tilesPerRow) * tileSize);
        const y = Math.floor(Math.floor(tileIndex / this.tilesPerRow) * tileSize);
        
        return { x, y };
    }

    /**
     * Checks if there's a box at the given coordinates
     * Used for collision detection by the player and other systems
     * 
     * @param {number} x - X coordinate to check
     * @param {number} y - Y coordinate to check
     * @returns {boolean} - True if a box exists at coordinates
     */
    isBlock(x, y) {
        return this.boxes.some(box => 
            Math.round(box.x) === x && 
            Math.round(box.y) === y &&
            !box.isMoving // Only count non-moving boxes as blocking
        );
    }
    
    /**
     * Gets a box at the specified coordinates
     * Returns the actual box object for manipulation rather than a boolean
     * 
     * @param {number} x - X coordinate to check
     * @param {number} y - Y coordinate to check
     * @returns {Object|null} - The box object if found, null otherwise
     */
    getBoxAt(x, y) {
        return this.boxes.find(box => 
            Math.round(box.x) === x && 
            Math.round(box.y) === y && 
            !box.isMoving
        ) || null;
    }

    /**
     * Move a box from one position to another
     * Public method that finds the box at starting coordinates and initiates movement
     * 
     * @param {number} x1 - Starting X coordinate
     * @param {number} y1 - Starting Y coordinate
     * @param {number} x2 - Target X coordinate
     * @param {number} y2 - Target Y coordinate
     * @returns {boolean} - True if movement was successful
     */
    move(x1, y1, x2, y2) {
        const boxIndex = this.boxes.findIndex(box => 
            Math.round(box.x) === x1 && 
            Math.round(box.y) === y1 && 
            !box.isMoving
        );
        
        if (boxIndex !== -1) {
            return this.moveObject(boxIndex, x1, y1, x2, y2);
        }
        return false; // Box not found or is already moving
    }

    /**
     * Checks if the given position is a goal
     * Delegates to the Goal class to determine if coordinates match a goal position
     * 
     * @param {number} x - X coordinate to check
     * @param {number} y - Y coordinate to check
     * @returns {boolean} - True if position is a goal
     */
    isGoalPosition(x, y) {
        return game.goal.goals.some(goalPos => goalPos.x === x && goalPos.y === y);
    }

    /**
     * Handles smooth animation of box movement
     * Implements interpolated motion between grid positions using requestAnimationFrame
     * 
     * @param {number} index - Index of the box in the boxes array
     * @param {number} x1 - Starting X coordinate
     * @param {number} y1 - Starting Y coordinate
     * @param {number} x2 - Target X coordinate
     * @param {number} y2 - Target Y coordinate
     * @returns {boolean} - True if movement started successfully
     */
    moveObject(index, x1, y1, x2, y2) {
        const box = this.boxes[index];
        
        // Don't allow moving if already in motion
        if (box.isMoving || this.isMoving) {
            return false;
        }
        
        // Play push sound with slight variation
        game.resources.playSound('pushing', 0.7, 0.3);
        
        // Set starting pixel position
        box.pixelPos.x = x1;
        box.pixelPos.y = y1;

        // Set movement flags
        this.isMoving = true;
        box.isMoving = true;
        
        // Cancel any existing animation frame
        if (this.animationFrameIds[box.id]) {
            cancelAnimationFrame(this.animationFrameIds[box.id]);
            this.animationFrameIds[box.id] = null;
        }
        
        // Set animation start time
        box.animStartTime = performance.now();
        
        // Create animation function
        const animateMovement = (timestamp) => {
            if (!box.animStartTime) box.animStartTime = timestamp;
            
            // Calculate elapsed time
            const elapsed = timestamp - box.animStartTime;
            const duration = this.movementDuration;
            
            // Calculate progress (0 to 1)
            let progress = Math.min(elapsed / duration, 1);
            
            // Apply easing function for smoother movement
            progress = this._easeInOutQuad(progress);
            
            // Update pixel position
            box.pixelPos.x = x1 + (x2 - x1) * progress;
            box.pixelPos.y = y1 + (y2 - y1) * progress;
            
            // Continue animation if not complete
            if (progress < 1) {
                this.animationFrameIds[box.id] = requestAnimationFrame(animateMovement);
            } else {
                // Animation complete
                this.isMoving = false;
                box.isMoving = false;
                
                // Update grid position
                box.x = x2;
                box.y = y2;
                
                // Make sure pixel position matches exactly
                box.pixelPos.x = x2;
                box.pixelPos.y = y2;
                
                // Increment push counter
                game.score.pushes++;
                
                // Reset animation state
                this.animationFrameIds[box.id] = null;
                box.animStartTime = 0;
                
                // Update box appearance if on goal
                this.updateBoxState(box, x2, y2);
                
                // Check win condition
                game.checkLevelComplete();
            }
        };
        
        // Start the animation loop
        this.animationFrameIds[box.id] = requestAnimationFrame(animateMovement);
        
        return true;
    }
    
    /**
     * Easing function for smoother movements
     * Uses quadratic easing for natural-looking motion
     * 
     * @param {number} t - Progress value between 0 and 1
     * @returns {number} - Eased value
     * @private
     */
    _easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
    
    /**
     * Updates box state when it reaches a new position
     * Checks if box is on a goal and updates appearance and game state accordingly
     * 
     * @param {Object} box - Box object to update
     * @param {number} x - X position 
     * @param {number} y - Y position
     */
    updateBoxState(box, x, y) {
        // Reset parked state
        box.parked = false;
        
        // Check if box is now on a goal
        for (const goalPos of game.goal.goals) {
            if (goalPos.x === x && goalPos.y === y) {
                // Update box appearance and state
                box.tile = this.GOAL_BOX_TILE; 
                box.parked = true;
                
                // Set timestamp for goal effect (for temporary highlight)
                box.goalEffectTimestamp = Date.now();
                
                // Play sound for box reaching goal
                game.resources.playSound('boxOnGoal', 0.8, 0.2);
                
                // Update box score after state change
                this.updateBoxesScore();
                return;
            }       
        }
        
        // Box is not on goal, use normal appearance
        box.tile = this.NORMAL_BOX_TILE;
        
        // Update box score after state change
        this.updateBoxesScore();
    }
    
    /**
     * Count boxes on goals and update score
     * Updates the score display with current box/goal statistics
     * 
     * @returns {Object} - Object with boxesOnGoal and totalBoxes counts
     */
    updateBoxesScore() {
        // Count boxes that are on goals (parked)
        const boxesOnGoal = this.boxes.filter(box => box.parked).length;
        
        // Total number of boxes in the level
        const totalBoxes = this.boxes.length;
        
        // Update the score display
        if (game.score) {
            game.score.updateBoxesCount(boxesOnGoal, totalBoxes);
        }
        
        return { boxesOnGoal, totalBoxes };
    }
    
    /**
     * Reset all boxes to their initial positions
     * Called when restarting a level
     * 
     * Cancels any ongoing animations and rebuilds the box collection from level data
     */
    resetBoxes() {
        // Clear all movement intervals (legacy cleanup)
        Object.values(this.moveIntervals).forEach(interval => {
            clearInterval(interval);
        });
        
        // Cancel all animation frames
        Object.values(this.animationFrameIds).forEach(frameId => {
            if (frameId) {
                cancelAnimationFrame(frameId);
            }
        });
        
        // Reset movement state
        this.isMoving = false;
        this.moveIntervals = {};
        this.animationFrameIds = {};
        
        // Recreate boxes from level data
        this.boxes = this.parseBoxes();
        
        // Update box score after reset
        this.updateBoxesScore();
    }
    
    /**
     * Draws all boxes on the canvas
     * Uses different sprites for boxes on goals
     * 
     * Rendering features:
     * - Boxes have different appearances on/off goals
     * - Smooth position interpolation during movement
     * - Visual effects when boxes are placed on goals
     */
    draw() {
        // Safety check
        if (!game.level) return;
        
        const { ctx } = this;
        
        for (const box of this.boxes) {
            // Get the position of the tile in the tileset
            const tilePos = this.calculateTilePosition(box.tile, this.tileWidth);
            
            // Use level's scale factor and output width for consistent scaling
            const outputWidth = game.level.outputWidth;
            
            // Draw the box using pixel position for smooth movement
            ctx.drawImage(
                this.tiles,                 // Tilemap image file
                tilePos.x,                  // source X
                tilePos.y,                  // source Y
                this.tileWidth,             // source Width
                this.tileWidth,             // source Height
                game.level.startX + box.pixelPos.x * outputWidth,       // destination X using pixelPos
                game.level.startY + box.pixelPos.y * outputWidth,       // destination Y using pixelPos
                outputWidth,                // destination Width
                outputWidth                 // destination Height
            );
            
            // Draw effect for boxes on goals if parked AND within effect duration
            const now = Date.now();
            if (box.parked && box.goalEffectTimestamp > 0 && 
                now - box.goalEffectTimestamp < this.pulseEffectDuration) {
                this.drawPulseEffect(box);
            }
        }
    }
    
    /**
     * Draw a subtle pulse effect around a parked box
     * Creates a visual highlight effect when a box reaches a goal
     * 
     * @param {Object} box - The box object to draw effect for
     */
    drawPulseEffect(box) {
        // Get the output width from the game level for consistent scaling
        const outputWidth = game.level.outputWidth;
        
        // Calculate time elapsed since box placed on goal
        const elapsed = Date.now() - box.goalEffectTimestamp;
        const progress = elapsed / this.pulseEffectDuration;
        
        // Fade out effect near the end of its duration
        const fadeOutFactor = Math.max(0, 1 - progress * 1.5);
        
        // Calculate pulse intensity based on time
        const pulse = Math.sin(Date.now() / 200) * 0.1 + 0.9;
        const size = outputWidth * pulse;
        const offset = (outputWidth - size) / 2;
        
        // Save context state
        this.ctx.save();
        
        // Set up visual effect with fading opacity
        this.ctx.globalAlpha = 0.3 * fadeOutFactor;
        this.ctx.strokeStyle = '#ffaa00';
        this.ctx.lineWidth = 2;
        
        // Draw effect
        this.ctx.strokeRect(
            game.level.startX + box.pixelPos.x * outputWidth + offset,
            game.level.startY + box.pixelPos.y * outputWidth + offset,
            size,
            size
        );
        
        // Restore context state
        this.ctx.restore();
    }
}