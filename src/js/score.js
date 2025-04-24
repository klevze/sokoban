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
        this.timeGoal = null;  // Time goal for Time Attack mode
        this.personalBest = null; // Personal best statistics
        
        // Timer properties
        this.startTime = null;     // Timestamp when timer started
        this.elapsedTime = 0;      // Time elapsed in milliseconds
        this.isRunning = false;    // Timer state flag
        
        // Text elements to display
        this.textElements = {
            level: "Level",
            moves: "Moves",
            pushes: "Pushes",
            time: "Time",
            boxes: "Boxes",
            timeGoal: "Goal"
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
        this.textElements.timeGoal = i18n.get('game.timeGoal') || 'Goal';
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
     * Sets the time goal for Time Attack mode
     * @param {number} timeGoal - Time goal in milliseconds
     */
    setTimeGoal(timeGoal) {
        this.timeGoal = timeGoal;
    }

    /**
     * Set personal best statistics from user progress
     * @param {Object} personalBest - Object containing best moves, pushes, and time
     */
    setPersonalBest(personalBest) {
        this.personalBest = personalBest;
    }

    /**
     * Check if the current stats are better than personal best
     * @returns {Object} - Object with isNewBestMoves, isNewBestPushes, isNewBestTime booleans
     */
    checkForNewBests() {
        if (!this.personalBest) return { isNewBestMoves: false, isNewBestPushes: false, isNewBestTime: false };
        
        return {
            isNewBestMoves: this.moves < this.personalBest.bestMoves,
            isNewBestPushes: this.pushes < this.personalBest.bestPushes,
            isNewBestTime: this.elapsedTime < this.personalBest.bestTime
        };
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
        
        // Define panel dimensions with proper aspect ratio
        const originalPanelWidth = 800; // Original design width
        const originalPanelHeight = 130; // Original design height
        const panelAspectRatio = originalPanelWidth / originalPanelHeight;
        
        // Calculate panel size based on screen width with some margins
        const maxPanelWidth = Math.min(canvasWidth * 0.95, 900); // Limit max width
        const panelWidth = maxPanelWidth;
        const panelHeight = panelWidth / panelAspectRatio;
        
        // Center the panel horizontally
        const panelX = (canvasWidth - panelWidth) / 2;
        
        // Position the panel at the bottom of the canvas with some margin
        const panelY = canvasHeight - panelHeight - 10;
        
        // Draw the panel background with an image if available
        if (this.resources.images && this.resources.images.woodPanel && this.resources.images.woodPanel.image) {
            // Draw the wood panel background image, centered and with proper aspect ratio
            ctx.drawImage(
                this.resources.images.woodPanel.image,
                panelX, 
                panelY, 
                panelWidth, 
                panelHeight
            );
        } else {
            // Fallback to semi-transparent background if image isn't available
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        }
        
        // Adjust right padding proportionally
        const rightPadding = 120 * (panelWidth / originalPanelWidth);
        const usableWidth = panelWidth - rightPadding;
        
        // Calculate section widths with the right padding taken into account
        let sectionWidth;
        let sections;
        
        // If we have a time goal (Time Attack mode), adjust the sections to make space
        if (this.timeGoal !== null) {
            sections = 6; // Add one more section for the time goal
            sectionWidth = Math.floor(usableWidth / sections);
        } else {
            sections = 5;
            sectionWidth = Math.floor(usableWidth / sections);
        }
        
        // Calculate section positions (adjusted for panelX)
        const section1X = panelX + Math.floor(sectionWidth * 0.5);
        const section2X = panelX + Math.floor(sectionWidth * 1.5);
        const section3X = panelX + Math.floor(sectionWidth * 2.5);
        const section4X = panelX + Math.floor(sectionWidth * 3.5);
        const section5X = panelX + Math.floor(sectionWidth * 4.5);
        const section6X = this.timeGoal !== null ? panelX + Math.floor(sectionWidth * 5.5) : 0;
        
        // Calculate icon size proportionally to panel height
        const iconSize = Math.floor(32 * (panelHeight / originalPanelHeight));
        
        // Calculate positions for top and bottom rows
        const topRowY = panelY + panelHeight * 0.35 + 22 * (panelHeight / originalPanelHeight);
        const bottomRowY = panelY + panelHeight * 0.75 + 7 * (panelHeight / originalPanelHeight);
        
        // Scale font size proportionally
        const fontSize = Math.floor(22 * (panelHeight / originalPanelHeight));
        const smallFontSize = Math.floor(14 * (panelHeight / originalPanelHeight));
        const tinyFontSize = Math.floor(12 * (panelHeight / originalPanelHeight));
        
        // Set up font for the values
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = "center";
        
        // Prepare values to display
        const levelValue = `${this.level}`;
        const movesValue = `${this.moves}`;
        const pushesValue = `${this.pushes}`;
        const timeValue = this.formatTime(this.elapsedTime);
        const boxesValue = `${this.boxesOnGoal}/${this.totalBoxes}`;
        const timeGoalValue = this.timeGoal !== null ? this.formatTime(this.timeGoal) : '';
        
        // Check if we have personal bests to display
        const haveBests = this.personalBest && 
            (this.personalBest.bestMoves !== undefined || 
             this.personalBest.bestPushes !== undefined || 
             this.personalBest.bestTime !== undefined);
        
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
                
                // Draw best moves if available
                if (haveBests && this.personalBest.bestMoves !== undefined) {
                    const bestLabel = "BEST";
                    const bestValue = this.personalBest.bestMoves.toString();
                    
                    // Draw "BEST" label
                    ctx.font = `${tinyFontSize}px Arial`;
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.fillText(bestLabel, section2X, topRowY - 18 * (panelHeight / originalPanelHeight) + 1);
                    ctx.fillStyle = '#00ffcc';
                    ctx.fillText(bestLabel, section2X, topRowY - 18 * (panelHeight / originalPanelHeight));
                    
                    // Draw best value
                    ctx.font = `${smallFontSize}px Arial`;
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.fillText(bestValue, section2X, bottomRowY + 20 * (panelHeight / originalPanelHeight) + 1);
                    
                    // Color coding for comparing to best
                    const isBetter = this.moves < this.personalBest.bestMoves;
                    const isTied = this.moves === this.personalBest.bestMoves;
                    const color = isBetter ? '#00ff00' : (isTied ? '#00ffcc' : '#ffffff');
                    
                    ctx.fillStyle = color;
                    ctx.fillText(bestValue, section2X, bottomRowY + 20 * (panelHeight / originalPanelHeight));
                }
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
                
                // Draw best pushes if available
                if (haveBests && this.personalBest.bestPushes !== undefined) {
                    const bestLabel = "BEST";
                    const bestValue = this.personalBest.bestPushes.toString();
                    
                    // Draw "BEST" label
                    ctx.font = `${tinyFontSize}px Arial`;
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.fillText(bestLabel, section3X, topRowY - 18 * (panelHeight / originalPanelHeight) + 1);
                    ctx.fillStyle = '#00ffcc';
                    ctx.fillText(bestLabel, section3X, topRowY - 18 * (panelHeight / originalPanelHeight));
                    
                    // Draw best value
                    ctx.font = `${smallFontSize}px Arial`;
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.fillText(bestValue, section3X, bottomRowY + 20 * (panelHeight / originalPanelHeight) + 1);
                    
                    // Color coding for comparing to best
                    const isBetter = this.pushes < this.personalBest.bestPushes;
                    const isTied = this.pushes === this.personalBest.bestPushes;
                    const color = isBetter ? '#00ff00' : (isTied ? '#00ffcc' : '#ffffff');
                    
                    ctx.fillStyle = color;
                    ctx.fillText(bestValue, section3X, bottomRowY + 20 * (panelHeight / originalPanelHeight));
                }
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
                
                // Draw best time if available
                if (haveBests && this.personalBest.bestTime !== undefined) {
                    const bestLabel = "BEST";
                    const bestValue = this.formatTime(this.personalBest.bestTime);
                    
                    // Draw "BEST" label
                    ctx.font = `${tinyFontSize}px Arial`;
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.fillText(bestLabel, section5X, topRowY - 18 * (panelHeight / originalPanelHeight) + 1);
                    ctx.fillStyle = '#00ffcc';
                    ctx.fillText(bestLabel, section5X, topRowY - 18 * (panelHeight / originalPanelHeight));
                    
                    // Draw best value
                    ctx.font = `${smallFontSize}px Arial`;
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.fillText(bestValue, section5X, bottomRowY + 20 * (panelHeight / originalPanelHeight) + 1);
                    
                    // Color coding for comparing to best
                    const isBetter = this.elapsedTime < this.personalBest.bestTime;
                    const isTied = this.elapsedTime === this.personalBest.bestTime;
                    const color = isBetter ? '#00ff00' : (isTied ? '#00ffcc' : '#ffffff');
                    
                    ctx.fillStyle = color;
                    ctx.fillText(bestValue, section5X, bottomRowY + 20 * (panelHeight / originalPanelHeight));
                }
            }
            
            // Section 6: Time Goal (only in Time Attack mode)
            if (this.timeGoal !== null) {
                // Use the same time icon or a trophy icon if available
                const iconX = section6X - iconSize/2;
                const iconY = topRowY - iconSize/2;
                
                // Use scoreTime image or trophy if available
                const timeGoalIcon = this.resources.images.scoreTrophy || this.resources.images.scoreTime;
                
                if (timeGoalIcon && timeGoalIcon.image) {
                    ctx.drawImage(
                        timeGoalIcon.image,
                        iconX,
                        iconY,
                        iconSize,
                        iconSize
                    );
                }
                
                // Draw goal label
                const labelSize = Math.floor(16 * (panelHeight / originalPanelHeight));
                ctx.font = `${labelSize}px Arial`;
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillText(this.textElements.timeGoal, section6X, topRowY - 18 * (panelHeight / originalPanelHeight) + 1);
                
                ctx.fillStyle = '#ffdd00';
                ctx.fillText(this.textElements.timeGoal, section6X, topRowY - 18 * (panelHeight / originalPanelHeight));
                
                // Draw time goal value
                ctx.font = `${fontSize}px Arial`;
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillText(timeGoalValue, section6X, bottomRowY + 1);
                
                // Color the time goal based on whether we're beating it or not
                const timeColor = this.elapsedTime <= this.timeGoal ? '#00ff00' : '#ff6666';
                ctx.fillStyle = timeColor;
                ctx.fillText(timeGoalValue, section6X, bottomRowY);
            }
        }
    }
}
