/**
 * Particles system for Sokoban
 * Provides visual effects like fireworks when boxes are placed on goals
 * 
 * This module implements a simple particle system that can be used to create
 * visual effects like fireworks, explosions, etc.
 */

/**
 * ParticleSystem class manages collections of particles for visual effects
 * 
 * Key features:
 * - Creates and manages multiple particle emitters
 * - Updates particle physics (position, velocity, lifetime)
 * - Renders particles with customizable appearance
 * - Auto-removes expired particle systems
 */
export class ParticleSystem {
    /**
     * Create a new ParticleSystem
     */
    constructor() {
        // Store all active emitters
        this.emitters = [];
    }

    /**
     * Create a fireworks effect at the specified position
     * 
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {number} x - X coordinate in pixels
     * @param {number} y - Y coordinate in pixels
     * @param {number} count - Number of particles to create
     * @param {Array} colors - Array of colors to use for particles
     */
    createFireworks(ctx, x, y, count = 30, colors = ['#ffaa00', '#ff8800', '#ff5500', '#ff0000', '#ffff00']) {
        const emitter = {
            id: Date.now() + Math.random(),
            ctx,
            particles: [],
            startTime: Date.now(),
            duration: 1500, // 1.5 seconds lifetime
            isExpired: false
        };

        // Create particles with random velocities and colors
        for (let i = 0; i < count; i++) {
            // Random angle and speed
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            
            // Convert angle and speed to x,y velocity
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            // Random color from the provided colors array
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            // Create particle
            emitter.particles.push({
                x,
                y,
                vx,
                vy,
                radius: 1 + Math.random() * 2,
                color,
                alpha: 1,
                life: 1, // Life from 1 to 0
            });
        }

        // Add the emitter to the list of active emitters
        this.emitters.push(emitter);
    }

    /**
     * Update all particle emitters
     * Calculates new positions for all particles and removes expired ones
     * 
     * @param {number} deltaTime - Time elapsed since last update in milliseconds
     */
    update(deltaTime) {
        const dt = deltaTime / 1000; // Convert to seconds

        // Update each emitter
        for (let i = this.emitters.length - 1; i >= 0; i--) {
            const emitter = this.emitters[i];
            
            // Check if emitter has expired
            if (Date.now() - emitter.startTime > emitter.duration) {
                emitter.isExpired = true;
                this.emitters.splice(i, 1);
                continue;
            }

            // Update each particle in the emitter
            for (let j = emitter.particles.length - 1; j >= 0; j--) {
                const p = emitter.particles[j];
                
                // Update position based on velocity
                p.x += p.vx;
                p.y += p.vy;
                
                // Add gravity
                p.vy += 2 * dt;
                
                // Decrease life
                const lifeDecrease = dt * 1.5;
                p.life -= lifeDecrease;
                p.alpha = p.life; // Fade out as life decreases
                
                // Slowly decrease size
                p.radius *= 0.99;
                
                // Remove dead particles
                if (p.life <= 0 || p.radius < 0.1) {
                    emitter.particles.splice(j, 1);
                }
            }
        }
    }

    /**
     * Draw all active particle emitters
     * Renders all particles based on their current state
     */
    draw() {
        // Draw each emitter's particles
        for (const emitter of this.emitters) {
            const { ctx } = emitter;
            
            // Draw each particle
            for (const p of emitter.particles) {
                ctx.save();
                
                // Set opacity based on particle's alpha
                ctx.globalAlpha = p.alpha;
                
                // Draw the particle as a circle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
                
                ctx.restore();
            }
        }
    }

    /**
     * Check if there are any active particle emitters
     * 
     * @returns {boolean} - True if there are active emitters
     */
    hasActiveEmitters() {
        return this.emitters.length > 0;
    }
}