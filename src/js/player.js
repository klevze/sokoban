/**
 * Player class for Sokoban
 * Handles player movement, collision detection, and rendering
 * 
 * This module implements the core player entity using a component-based approach
 * with animation system, movement mechanics, and collision detection.
 */

// Import dependencies
import { game } from './game.js';
import { PLAYER, GAME_STATES, PHYSICS } from './config/config.js';

/**
 * Player class represents the playable character in the game
 * 
 * The Player class handles:
 * - Sprite-based animations with multiple states (idle, walking, special)
 * - Smooth movement with easing functions
 * - Collision detection against walls and boxes
 * - Box pushing mechanics
 * - Automatic idle animations after inactivity
 */
export class Player {
    /**
     * Create a new Player instance
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {HTMLImageElement} imgPlayer - Player sprite sheet image
     * @param {number} tilesWidth - Width of each tile in the sprite sheet
     * @param {number} outputWidth - Output width for drawing on canvas
     * @param {number} extraAddon - Extra space to add when drawing (for visual effects)
     */
    constructor(ctx, imgPlayer, tilesWidth, outputWidth, extraAddon = 0) {
        // Canvas and rendering
        this.ctx = ctx;
        this.sprite = imgPlayer;
        this.tilesWidth = tilesWidth;
        this.outputWidth = outputWidth;
        this.extraAddon = extraAddon;
        
        // Position and movement state
        this.coord = { x: 0, y: 0 };
        this.pixelPos = { x: 0, y: 0 };
        this.moved = false;
        this.movement = PLAYER.DIRECTION.DOWN;
        this.drawShadow = true;
        this.movementDuration = PHYSICS.MOVEMENT_DURATION;
        
        // Animation properties
        this.animations = {};
        this.currentAnimation = 'idle';
        this.animStartTime = 0;
        this.animationFrameId = null;
        this.targetGridPos = { x: 0, y: 0 };
        this.lastWalkingFrame = 0;
        
        // Idle animation state
        this.idle = Date.now();
        this.idleFx = false;
        this.idleThreshold = PLAYER.IDLE_TIMEOUT; // Wait time before idle animation triggers
        this.lastWhistleTime = 0; // Track when the whistle sound was last played
        
        // Movement state
        this.isMoving = false;
        this.moveInterval = null;
        this.moveSpeed = 20; // Speed of movement animation in ms (lower = faster)
        
        // Initialize player animations
        this.initAnimations();
        this.findStartPosition();
    }

    /**
     * Creates animation configuration based on player sprite layout
     * Each direction has 4 frames for walking animation
     * 
     * Animation system uses:
     * - Named states (idle, walking, special)
     * - Frame sequences for each state
     * - Speed control for animation timing
     */
    initAnimations() {
        // Update walking animation frames using configured frame count
        this.animations = {
            idle: {
                frames: [0], // Just the first frame for idle
                speed: 500,  // Milliseconds between frames
                currentFrame: 0,
                lastFrameTime: 0
            },
            walking: {
                frames: Array.from({length: PLAYER.ANIMATION.FRAME_COUNT}, (_, i) => i), // 4 frames per direction
                speed: PLAYER.ANIMATION.WALKING_SPEED,
                currentFrame: 0,
                lastFrameTime: 0
            },
            special: {
                frames: [0, 1, 2, 3, 2, 1, 0], // Special idle animation sequence
                speed: 200,
                currentFrame: 0,
                lastFrameTime: 0
            }
        };
    }

    /**
     * Find the player's starting position in the level data
     * Searches for tile ID 88 which represents the player's spawn point
     * 
     * This is called during initialization and when loading a new level
     */
    findStartPosition() {
        const levelData = game.levelData;
        const { width, layers } = levelData;
        
        for (let y = 0; y < width; y++) {
            for (let x = 0; x < width; x++) {
                const tileIndex = y * width + x;
                if (layers[0].data[tileIndex] === 88) {
                    this.coord.x = x;
                    this.coord.y = y;
                    // Initialize pixel position to match grid position
                    this.pixelPos.x = x;
                    this.pixelPos.y = y;
                    // Reset moved flag to ensure timer starts on first move of new level
                    this.moved = false;
                    return; // Start position found, exit early
                }
            }
        }
    
        console.error("No player start position found in level data!");
    }

    /**
     * Check if a specific tile ID exists at coordinates in a layer
     * @param {number} x - X coordinate to check
     * @param {number} y - Y coordinate to check
     * @param {number} layerIndex - Layer index to check in level data
     * @param {number} targetId - Target tile ID to look for
     * @returns {boolean} - True if tile at coordinate matches target ID
     */
    checkTile(x, y, layerIndex, targetId) {
        const levelData = game.levelData;
        // Boundary check to prevent errors
        if (x < 0 || y < 0 || x >= levelData.width || y >= levelData.height) {
            return false;
        }
        
        const tileIndex = y * levelData.width + x;
        return levelData.layers[layerIndex].data[tileIndex] === targetId;
    }

    /**
     * Check if a tile is walkable at the given coordinates
     * Uses the Level class's walkability check
     * 
     * @param {number} x - X coordinate to check
     * @param {number} y - Y coordinate to check 
     * @returns {boolean} - True if tile is walkable
     */
    checkCoord(x, y) {
        return game.level.isWakable(x, y, 0);
    }

    /**
     * Check if there's a box at the given coordinates
     * Delegates to the Boxes class for collision detection
     * 
     * @param {number} x - X coordinate to check
     * @param {number} y - Y coordinate to check
     * @returns {boolean} - True if a box exists at this position
     */
    checkBox(x, y) {
        return game.boxes.isBlock(x, y);
    }

    /**
     * Set up the player's movement direction and animation frame
     * Changes the direction the player sprite faces based on movement inputs
     * 
     * @param {number} x - Horizontal movement direction (-1, 0, 1)
     * @param {number} y - Vertical movement direction (-1, 0, 1)
     */
    setupMovement(x, y) {
        // Set the direction the player is facing based on movement
        if (x === 1) {
            this.movement = PLAYER.DIRECTION.RIGHT;
        } else if (x === -1) {
            this.movement = PLAYER.DIRECTION.LEFT;
        } else if (y === 1) {
            this.movement = PLAYER.DIRECTION.DOWN;
        } else if (y === -1) {
            this.movement = PLAYER.DIRECTION.UP;
        }

        // Start walking animation
        this.setAnimation('walking');
    }
    
    /**
     * Sets the current animation to the specified type
     * Handles animation state transitions and resets frames appropriately
     * 
     * @param {string} animationType - The animation to play ('idle', 'walking', 'special')
     */
    setAnimation(animationType) {
        if (!this.animations[animationType]) {
            console.warn(`Animation type '${animationType}' doesn't exist`);
            return;
        }
        
        // Only change animation if it's different from current
        if (this.currentAnimation !== animationType) {
            this.currentAnimation = animationType;
            
            // If switching to walking animation, use last walking frame
            if (animationType === 'walking') {
                this.animations[animationType].currentFrame = this.lastWalkingFrame;
            } else {
                this.animations[animationType].currentFrame = 0;
            }
            
            this.animations[animationType].lastFrameTime = performance.now();
            
            // Cancel any existing animation frame
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
            }
        }
    }

    /**
     * Updates the current animation frame based on elapsed time
     * Provides time-based animation rather than frame-rate dependent
     * 
     * @param {number} now - Current timestamp from performance.now()
     */
    updateAnimation(now) {
        const anim = this.animations[this.currentAnimation];
        
        // Check if enough time has passed to advance the frame
        if (now - anim.lastFrameTime >= anim.speed) {
            // Move to next frame
            anim.currentFrame = (anim.currentFrame + 1) % anim.frames.length;
            anim.lastFrameTime = now;
        }
    }

    /**
     * Move player with smooth animation using requestAnimationFrame
     * Implements interpolated movement between grid positions
     * 
     * @param {object} entity - Entity to move (player or box)
     * @param {number} x - Horizontal movement direction (-1, 0, 1)
     * @param {number} y - Vertical movement direction (-1, 0, 1)
     * @returns {boolean} - True if movement was successful
     */
    movePlayer(entity, x, y) {
        if (entity.isMoving) {
            return false;
        }

        // Reset idle timer and state
        this.idle = Date.now();
        this.idleFx = false;
        
        // Play movement sound
        game.resources.playSound('running', 0.8, 0.2);
        
        // Store the target grid position
        this.targetGridPos = {
            x: entity.coord.x + x,
            y: entity.coord.y + y
        };
        
        // Set starting pixel position (current grid position)
        if (!this.isMoving) {
            this.pixelPos.x = entity.coord.x;
            this.pixelPos.y = entity.coord.y;
        }

        // Flag entity as moving
        entity.isMoving = true;
        this.isMoving = true;
        
        // Cancel any existing animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Start walking animation
        this.setAnimation('walking');
        this.animStartTime = performance.now();
        
        // Use requestAnimationFrame for smoother animation
        const animateMovement = (timestamp) => {
            if (!this.animStartTime) this.animStartTime = timestamp;
            
            // Calculate elapsed time
            const elapsed = timestamp - this.animStartTime;
            const duration = this.movementDuration;
            
            // Calculate progress (0 to 1)
            let progress = Math.min(elapsed / duration, 1);
            
            // Apply easing function for smoother movement
            progress = this._easeInOutQuad(progress);
            
            // Update pixel position
            this.pixelPos.x = entity.coord.x + (x * progress);
            this.pixelPos.y = entity.coord.y + (y * progress);
            
            // Update sprite animation
            const anim = this.animations[this.currentAnimation];
            const frameCount = anim.frames.length;
            
            // Calculate which frame to show based on progress
            const frameIndex = Math.floor(progress * frameCount) % frameCount;
            anim.currentFrame = frameIndex;
            this.lastWalkingFrame = frameIndex;
            
            // Continue animation if not complete
            if (progress < 1) {
                this.animationFrameId = requestAnimationFrame(animateMovement);
            } else {
                // Animation complete
                entity.isMoving = false;
                this.isMoving = false;
                
                // Update grid position
                entity.coord.x = this.targetGridPos.x;
                entity.coord.y = this.targetGridPos.y;
                
                // Make sure pixel position matches exactly
                this.pixelPos.x = entity.coord.x;
                this.pixelPos.y = entity.coord.y;
                
                // Increment movement counter
                game.score.moves++;
                
                // Reset animation state
                this.animationFrameId = null;
                this.animStartTime = 0;
                
                // Switch back to idle animation
                this.setAnimation('idle');
                
                // Check for win condition
                game.checkLevelComplete();
            }
        };
        
        // Start the animation loop
        this.animationFrameId = requestAnimationFrame(animateMovement);
        
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
     * Main movement function - handles player movement and box pushing
     * This is the primary method called by input handlers when moving the player
     * 
     * Movement logic:
     * 1. Check if movement is allowed
     * 2. Check if destination has a box
     * 3. If box exists, check if it can be pushed
     * 4. Move player and box if possible
     * 
     * @param {number} x - Horizontal movement direction (-1, 0, 1)
     * @param {number} y - Vertical movement direction (-1, 0, 1)
     * @returns {boolean} - True if movement was successful
     */
    move(x, y) {
        // Don't process moves if player is already moving or game isn't in play state
        if (this.isMoving || game.state !== GAME_STATES.PLAY) {
            return false;
        }

        this.setupMovement(x, y);

        const newX = this.coord.x + x;
        const newY = this.coord.y + y;

        // Check if movement is possible
        if (!this.checkCoord(newX, newY)) {
            // Hit a wall - can't move, reset to idle animation
            this.setAnimation('idle');
            return false;
        }

        // Check if there's a box in the target position
        if (this.checkBox(newX, newY)) {
            const boxTargetX = newX + x;
            const boxTargetY = newY + y;

            // Check if box can be pushed
            const isFreeSpace = this.checkCoord(boxTargetX, boxTargetY);
            const hasNoBox = !this.checkBox(boxTargetX, boxTargetY);
        
            if (isFreeSpace && hasNoBox) {
                // Update box data in level map
                const levelData = game.levelData;
                const tileIndex1 = newY * levelData.width + newX;
                const tileIndex2 = boxTargetY * levelData.width + boxTargetX;
                levelData.layers[2].data[tileIndex1] = 0;
                levelData.layers[2].data[tileIndex2] = 94;
                
                // Try to move the box
                if (!game.boxes.move(newX, newY, boxTargetX, boxTargetY)) {
                    // Failed to move box - reset animation
                    this.setAnimation('idle');
                    return false;
                }
            } else {
                // Can't push box - path blocked, reset to idle animation
                this.setAnimation('idle');
                return false;
            }
        }

        // Start timer on first move
        if (this.moved === false) {
            this.moved = true;
            game.score.startTimer();
        }
        
        // Move the player
        return this.movePlayer(this, x, y);
    }

    /**
     * Trigger idle animation/sound when player hasn't moved for a while
     * Called periodically from the game loop to add visual interest
     * during periods of player inactivity
     */
    idleDetector() {
        const now = Date.now(); 
        // Only trigger idle if:
        // 1. Not already in idle animation
        // 2. Game is in play state
        // 3. Player has been inactive for threshold time
        // 4. Player is not currently moving
        // 5. Whistle hasn't been played recently (at least 30 seconds since last whistle)
        if (
            !this.idleFx && 
            game.state === GAME_STATES.PLAY && 
            now - this.idle > this.idleThreshold &&
            !this.isMoving &&
            (now - this.lastWhistleTime > this.idleThreshold)
        ) {
            // Face player downward for idle animation
            this.movement = PLAYER.DIRECTION.DOWN;
            
            // Play idle sound and update last whistle time
            game.resources.playSound('whistle', 0.8, 0.1);
            this.lastWhistleTime = now;
            
            // Start special idle animation
            this.setAnimation('special');
            
            // Mark idle state as active
            this.idleFx = true;
            
            // Reset idle state after animation completes
            setTimeout(() => {
                this.idleFx = false;
                this.setAnimation('idle');
            }, this.animations.special.speed * this.animations.special.frames.length + 500);
        }
    }

    /**
     * Draw the player on the canvas
     * Uses the appropriate sprite frame based on direction and animation frame
     * 
     * Rendering features:
     * - Direction-based sprite selection
     * - Frame-based animation
     * - Shadow effect for depth
     * - Smooth position interpolation during movement
     */
    draw() {
        // Update animation frame based on current time
        if (!this.isMoving) {
            this.updateAnimation(performance.now());
        }
        
        // Get current frame from animation
        const frameIndex = this.animations[this.currentAnimation].frames[
            this.animations[this.currentAnimation].currentFrame
        ];

        // Use level's output width for consistent scaling
        const outputWidth = game.level.outputWidth;
        
        // Calculate scaled extra addon size
        const scaledExtraAddon = this.extraAddon * game.level.scaleFactor;
        
        // Calculate bounce effect if jumping
        let yOffset = 0;
        if (this.currentAnimation === 'jump') {
            // Calculate bounce height based on animation frame
            const currentFrame = this.animations[this.currentAnimation].currentFrame;
            const totalFrames = this.animations[this.currentAnimation].frames.length;
            
            // Simple sine curve for bounce: 0 → peak → 0
            const bounceHeight = Math.sin(Math.PI * currentFrame / (totalFrames - 1)) * 10;
            
            // Scale the bounce height based on the overall scale
            yOffset = -bounceHeight * game.level.scaleFactor;
        }
        
        // Draw shadow beneath player for better visual effect
        if (this.drawShadow) {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.ellipse(
                game.level.startX + this.pixelPos.x * outputWidth + outputWidth / 2,
                game.level.startY + this.pixelPos.y * outputWidth + outputWidth * 0.9,
                outputWidth * 0.3,
                outputWidth * 0.1,
                0,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
            this.ctx.restore();
        }
        
        // Draw the player sprite using pixelPos for smooth movement
        this.ctx.drawImage(
            this.sprite,                                // Tilemap image file
            frameIndex * this.tilesWidth,              // source X
            this.movement * this.tilesWidth,           // source Y
            this.tilesWidth,                           // source Width
            this.tilesWidth,                           // source Height
            game.level.startX + this.pixelPos.x * outputWidth - scaledExtraAddon / 2,  // destination X using pixelPos
            game.level.startY + this.pixelPos.y * outputWidth - scaledExtraAddon + yOffset,  // destination Y using pixelPos
            outputWidth + scaledExtraAddon,        // destination Width
            outputWidth + scaledExtraAddon         // destination Height
        );
    }
}
