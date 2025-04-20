/**
 * Stars3D class for Sokoban
 * Creates a 3D star field background effect
 */
import { STARS_EFFECT } from './config/config.js';

/**
 * Creates a 3D star field effect
 */
export class Stars3D {
    /**
     * Initialize the 3D star field
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @param {number} [numStars=STARS_EFFECT.COUNT] - Number of stars to generate
     * @param {number} [starWidth=STARS_EFFECT.SIZE] - Width of each star in pixels
     * @param {number} [maxDepth=STARS_EFFECT.SPEED] - Maximum depth for stars in the z-axis
     */
    constructor(ctx, width, height, 
                numStars = STARS_EFFECT.COUNT, 
                starWidth = STARS_EFFECT.SIZE, 
                maxDepth = STARS_EFFECT.SPEED) {
        // Star field properties
        this.starWidth = starWidth;
        this.width = width;
        this.height = height;
        this.numStars = numStars;
        this.stars = new Array(numStars);
        this.ctx = ctx;
        this.depthFactor = 128.0;
        this.angle = 0;
        this.centerX = Math.floor(this.width / 2);
        this.centerY = Math.floor(this.height / 2);
        this.maxDepth = maxDepth;
        
        // Infinity path movement parameters
        this.infinityPathTime = 0;
        this.baseInfinityPathSpeed = 0.012; // Base speed that will be modified
        this.infinityPathSpeed = this.baseInfinityPathSpeed;
        this.speedVariationFactor = 0.8; // How much the speed can vary (0-1)
        this.speedCycleTime = 0; // Time counter for speed variation cycle
        this.speedCycleRate = 0.021; // How fast the speed cycle changes
        this.infinityPathWidth = 250;
        this.infinityPathHeight = 150;
        
        // Additional movement parameters for complexity
        this.secondaryPathTime = 0;
        this.secondaryPathSpeed = 0.001;
        this.secondaryPathScale = 50;
        
        // Rotation parameters
        this.rotationDirection = -1; // Start rotating counter-clockwise
        this.rotationSpeed = 2;      // Base rotation speed
        this.rotationCycleTime = 0;  // Cycle time for rotation direction changes
        this.rotationCycleRate = 0.005; // How fast the rotation direction cycle changes
        
        // Color map for star types
        this.starColors = ['#fff', '#aaa', '#999', '#777', '#555', '#444'];
        
        // Initialize stars on creation
        this.init();
    }
    
    /**
     * Star data class
     */
    createStar() {
        return {
            x: 0,
            y: 0,
            z: 0,
            type: 1,
            speed: 1
        };
    }
    
    /**
     * Generates random value within specified range
     * @param {number} minVal - Minimum value
     * @param {number} maxVal - Maximum value
     * @returns {number} Random integer between minVal and maxVal
     */
    randomRange(minVal, maxVal) {
        return Math.floor(Math.random() * (maxVal - minVal - 1)) + minVal;
    }
    
    /**
     * Initialize all stars with random positions and properties
     */
    init() {
        for (let i = 0; i < this.stars.length; i++) {
            this.stars[i] = this.createStar();
            this.updateStar(i, true);
        }
    }
    
    /**
     * Updates a star's position and properties
     * @param {number} i - Index of the star to update
     * @param {boolean} [randomizeZ=false] - Whether to randomize Z position or set to MAX_DEPTH
     */
    updateStar(i, randomizeZ = false) {
        this.stars[i].x = this.randomRange(-25, 25);
        this.stars[i].y = this.randomRange(-25, 25);
        this.stars[i].z = randomizeZ ? 
                         this.randomRange(1, this.maxDepth) : 
                         this.maxDepth;
        this.stars[i].type = Math.floor(Math.random() * 5);
        this.stars[i].speed = Math.floor(Math.random() * 5) + 1; // Ensure minimum speed of 1
    }
    
    /**
     * Rotates a 2D point around the origin
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} angle - Rotation angle in degrees
     * @returns {Array} Array with rotated [x, y] coordinates
     */
    rotate2DPoint(x, y, angle) {
        // Convert angle to radians for Math.cos and Math.sin
        const radians = angle * Math.PI / 180;
        const c = Math.cos(radians);
        const s = Math.sin(radians);
        
        // Apply rotation matrix
        const xOut = Math.floor((x * c - y * s));
        const yOut = Math.floor((x * s + y * c));
        
        return [xOut, yOut]; 
    }
    
    /**
     * Calculate the center point based on infinity path
     * Updates the center coordinates of the star field origin
     */
    updateInfinityCenter() {
        // Update the speed variation cycle
        this.speedCycleTime += this.speedCycleRate;
        
        // Calculate a sine wave between 0 and 1 for speed variation
        const speedMultiplier = 0.5 + 0.5 * Math.sin(this.speedCycleTime);
        
        // Apply speed variation - from (1-factor) to (1+factor) times the base speed
        this.infinityPathSpeed = this.baseInfinityPathSpeed * 
            (1 - this.speedVariationFactor + 2 * this.speedVariationFactor * speedMultiplier);
        
        // Update primary infinity path time parameter with variable speed
        this.infinityPathTime += this.infinityPathSpeed;
        
        // Update secondary path time for additional movement
        this.secondaryPathTime += this.secondaryPathSpeed * speedMultiplier;
        
        // Calculate position on infinity curve using parametric equation
        const a = this.infinityPathWidth;
        const b = this.infinityPathHeight;
        const t = this.infinityPathTime;
        
        // Basic infinity pattern
        const baseX = a * Math.sin(t);
        const baseY = b * Math.sin(t) * Math.cos(t);
        
        // Add secondary movement pattern
        const secondT = this.secondaryPathTime;
        const secondX = this.secondaryPathScale * Math.sin(2 * secondT);
        const secondY = this.secondaryPathScale * Math.cos(3 * secondT);
        
        // Combine movements for a more complex pattern
        const offsetX = baseX + secondX;
        const offsetY = baseY + secondY;
        
        // Update center position based on the base center and the calculated offsets
        this.originX = Math.floor(this.width / 2) + offsetX;
        this.originY = Math.floor(this.height / 2) + offsetY;
    }
    
    /**
     * Draws all stars in their current positions
     */
    draw() {
        // Update rotation cycle and direction
        this.rotationCycleTime += this.rotationCycleRate;
        const rotationMultiplier = Math.sin(this.rotationCycleTime);
        
        // Change rotation direction and speed based on sine wave
        this.angle += this.rotationSpeed * rotationMultiplier;
        
        // Update the center point based on infinity path
        this.updateInfinityCenter();
        
        for (let i = 0; i < this.stars.length; i++) {
            const star = this.stars[i]; // Cache star reference for better performance
            
            // Get color based on star type
            const color = this.starColors[star.type] || '#fff';
            
            // Move star based on its speed
            star.z -= star.speed;
            
            // Reset star if it's too close
            if (star.z <= 0) {
                this.updateStar(i);
                continue;
            }
            
            // Apply rotation to star coordinates
            const pos = this.rotate2DPoint(star.x, star.y, this.angle);
            
            // Calculate perspective projection
            const k = this.depthFactor / star.z;
            const px = Math.floor(pos[0] * k + this.originX); // Use moving origin
            const py = Math.floor(pos[1] * k + this.originY); // Use moving origin
            
            // Draw star only if it's within canvas boundaries
            if (px >= 0 && px <= this.width && py >= 0 && py <= this.height) {
                this.ctx.fillStyle = color;
                this.ctx.fillRect(px, py, this.starWidth, this.starWidth);
            }
        }
    }
}