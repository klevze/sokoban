/**
 * Score class for Sokoban
 * Handles game statistics and timer functionality
 */
import { TEXT_STYLES, ASSET_PATHS } from './config/config.js';
import { game } from './game.js';

export class Score {
    /**
     * Creates a new Score instance
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context for drawing
     * @param {Object} resources - Game resources containing images
     */
    constructor(ctx, resources) {
        this.ctx = ctx;
        this.resources = resources;
        
        // Game statistics
        this.level = 0;        // Current level number
        this.moves = 0;        // Total moves made by player
        this.pushes = 0;       // Total boxes pushed
        this.boxesOnGoal = 0;  // Number of boxes currently on goals
        this.totalBoxes = 0;   // Total boxes in the level
        
        // Timer properties
        this.startTime = null;     // Timestamp when timer started
        this.elapsedTime = 0;      // Time elapsed in milliseconds
        this.isRunning = false;    // Timer state flag
        
        // Text elements to display
        this.textElements = {
            level: "Level",
            moves: "Moves",
            pushes: "Pushes",
            time: "Time"
        };
    }
    
    /**
     * Updates text elements based on current language
     * @param {Object} i18n - Internationalization manager
     */
    updateTexts(i18n) {
        if (!i18n) return;
        
        this.textElements.level = i18n.get('game.level');
        this.textElements.moves = i18n.get('game.moves');
        this.textElements.pushes = i18n.get('game.pushes');
        this.textElements.time = i18n.get('game.time');
    }

    /**
     * Starts the game timer
     * Preserves elapsed time if timer was paused
     */
    startTimer() {
        if (!this.isRunning) {
            // Subtract elapsed time to account for previous time segments
            this.startTime = Date.now() - this.elapsedTime;
            this.isRunning = true;
        }
    }

    /**
     * Stops the game timer
     * Stores current elapsed time for potential resuming
     */
    stopTimer() {
        if (this.isRunning) {
            this.elapsedTime = Date.now() - this.startTime;
            this.isRunning = false;
        }
    }

    /**
     * Pauses the game timer
     * Same as stopTimer, but explicitly named for pausing the game
     */
    pauseTimer() {
        this.stopTimer();
    }

    /**
     * Resumes the game timer after being paused
     * Same as startTimer, but explicitly named for resuming after pause
     */
    resumeTimer() {
        this.startTimer();
    }

    /**
     * Resets the game timer
     * Clears all timer-related properties
     */
    resetTimer() {
        this.startTime = null;
        this.elapsedTime = 0;
        this.isRunning = false;
    }

    /**
     * Resets all game statistics
     * Called when starting a new level
     */
    resetStats() {
        this.moves = 0;
        this.pushes = 0;
        this.boxesOnGoal = 0;
        this.totalBoxes = 0;
        this.resetTimer();
    }

    /**
     * Formats elapsed time into MM:SS format
     * @param {number} milliseconds - Time in milliseconds
     * @returns {string} Formatted time string
     */
    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Increments the pushes counter
     * Called when player pushes a box
     */
    incrementPushes() {
        this.pushes++;
    }

    /**
     * Updates the timer in each frame when running
     * This should be called on each frame to keep the timer updated
     */
    updateTimer() {
        if (this.isRunning && this.startTime) {
            this.elapsedTime = Date.now() - this.startTime;
        }
    }

    /**
     * Updates box tracking information
     * @param {number} onGoal - Number of boxes currently on goals
     * @param {number} total - Total boxes in the level
     */
    updateBoxesCount(onGoal, total) {
        this.boxesOnGoal = onGoal;
        this.totalBoxes = total;
    }

    /**
     * Draws the score and timer information on the canvas
     */
    draw() {
        // Update timer on each frame
        this.updateTimer();
        
        const { ctx } = this;
        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;
        
        // Fixed panel height of 130px
        const panelHeight = 130;
        
        // Position the score panel at the bottom of the canvas
        const panelY = canvasHeight - panelHeight;
        
        // Draw the panel background with an image if available
        if (this.resources.images && this.resources.images.woodPanel && this.resources.images.woodPanel.image) {
            // Draw the wood panel background image
            ctx.drawImage(
                this.resources.images.woodPanel.image,
                0, 
                panelY, 
                canvasWidth, 
                panelHeight
            );
        } else {
            // Fallback to semi-transparent background if image isn't available
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, panelY, canvasWidth, panelHeight);
        }
        
        // Add right padding to avoid the man in the background image
        const rightPadding = 120; // Pixels to leave for the man image on the right
        const usableWidth = canvasWidth - rightPadding;
        
        // Calculate section widths with the right padding taken into account 
        // Now with 5 sections to include boxes ratio
        const sectionWidth = Math.floor(usableWidth / 5);
        
        // Calculate section positions, distributing 5 elements evenly
        const section1X = Math.floor(sectionWidth * 0.5);
        const section2X = Math.floor(sectionWidth * 1.5);
        const section3X = Math.floor(sectionWidth * 2.5);
        const section4X = Math.floor(sectionWidth * 3.5);
        const section5X = Math.floor(sectionWidth * 4.5);
        
        // Define icon dimensions
        const iconSize = 32;
        
        // Calculate positions for top and bottom rows
        const topRowY = panelY + panelHeight * 0.35 + 22;
        const bottomRowY = panelY + panelHeight * 0.75 + 7;
        
        // Set up font for the values
        ctx.font = "22px Arial";
        ctx.textAlign = "center";
        
        // Prepare values to display
        const levelValue = `${this.level}`;
        const movesValue = `${this.moves}`;
        const pushesValue = `${this.pushes}`;
        const timeValue = this.formatTime(this.elapsedTime);
        const boxesValue = `${this.boxesOnGoal}/${this.totalBoxes}`;
        
        // Check if the icons are loaded
        if (this.resources.images) {
            // Section 1: Level
            if (this.resources.images.scoreLevel && this.resources.images.scoreLevel.image) {
                const iconX = section1X - iconSize/2;
                const iconY = topRowY - iconSize/2;
                
                ctx.drawImage(
                    this.resources.images.scoreLevel.image,
                    iconX,
                    iconY,
                    iconSize,
                    iconSize
                );
                
                // Draw level value
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillText(levelValue, section1X, bottomRowY + 1);
                
                ctx.fillStyle = '#ffaa00';
                ctx.fillText(levelValue, section1X, bottomRowY);
            }
            
            // Section 2: Moves
            if (this.resources.images.scoreMoves && this.resources.images.scoreMoves.image) {
                const iconX = section2X - iconSize/2;
                const iconY = topRowY - iconSize/2;
                
                ctx.drawImage(
                    this.resources.images.scoreMoves.image,
                    iconX,
                    iconY,
                    iconSize,
                    iconSize
                );
                
                // Draw moves value
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillText(movesValue, section2X, bottomRowY + 1);
                
                ctx.fillStyle = '#ffaa00';
                ctx.fillText(movesValue, section2X, bottomRowY);
            }
            
            // Section 3: Pushes
            if (this.resources.images.scorePushes && this.resources.images.scorePushes.image) {
                const iconX = section3X - iconSize/2;
                const iconY = topRowY - iconSize/2;
                
                ctx.drawImage(
                    this.resources.images.scorePushes.image,
                    iconX,
                    iconY,
                    iconSize,
                    iconSize
                );
                
                // Draw pushes value
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillText(pushesValue, section3X, bottomRowY + 1);
                
                ctx.fillStyle = '#ffaa00';
                ctx.fillText(pushesValue, section3X, bottomRowY);
            }
            
            // Section 4: Boxes
            if (this.resources.images.scoreBoxes && this.resources.images.scoreBoxes.image) {
                const iconX = section4X - iconSize/2;
                const iconY = topRowY - iconSize/2;
                
                ctx.drawImage(
                    this.resources.images.scoreBoxes.image,
                    iconX,
                    iconY,
                    iconSize,
                    iconSize
                );
                
                // Draw boxes ratio value
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillText(boxesValue, section4X, bottomRowY + 1);
                
                ctx.fillStyle = '#ffaa00';
                ctx.fillText(boxesValue, section4X, bottomRowY);
            }
            
            // Section 5: Timer
            if (this.resources.images.scoreTime && this.resources.images.scoreTime.image) {
                const iconX = section5X - iconSize/2;
                const iconY = topRowY - iconSize/2;
                
                ctx.drawImage(
                    this.resources.images.scoreTime.image,
                    iconX,
                    iconY,
                    iconSize,
                    iconSize
                );
                
                // Draw time value
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillText(timeValue, section5X, bottomRowY + 1);
                
                ctx.fillStyle = '#ffaa00';
                ctx.fillText(timeValue, section5X, bottomRowY);
            }
        }
    }
}
