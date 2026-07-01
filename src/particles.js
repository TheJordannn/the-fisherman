class RainParticle {
    constructor() {
        this.reset(true);
    }
    reset(randomY = false) {
        this.x = state.cameraX + Math.random() * (state.logicalWidth + 1200) - 600;
        this.y = randomY ? state.cameraY - 200 + Math.random() * state.logicalHeight : state.cameraY - 200;
        this.vy = 18 + Math.random() * 8;
        this.vx = -1 - Math.random() * 3;
        this.opacity = Math.random() * 0.3 + 0.2;
    }
    update(waterSurfaceWorldY) {
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.y > waterSurfaceWorldY) {
            this.reset(false);
            return true; 
        }
        if (this.y > state.cameraY + state.logicalHeight) {
            this.reset(false);
            return false;
        }
        return false;
    }
    draw(ctx, camX, camY) {
        ctx.save();
        ctx.strokeStyle = `rgba(200, 220, 255, ${this.opacity * state.currentRainIntensity})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.x - camX, this.y - camY);
        ctx.lineTo((this.x - this.vx * 1.5) - camX, (this.y - this.vy * 1.5) - camY);
        ctx.stroke();
        ctx.restore();
    }
}

class AmbientParticle {
    constructor() {
        this.x = Math.random() * 4000 - 1000;
        let maxD = state.isTutorialMode ? 900 : 5600;
        this.y = 400 + Math.random() * (maxD - 400); // waterSurfaceY = 400, maxDepth = 5600
        this.size = Math.random() * 2 + 0.5;
        this.vy = -Math.random() * 0.8 - 0.1;
        this.phase = Math.random() * Math.PI * 2;
        this.opacity = Math.random() * 0.3 + 0.05;
    }
    update() {
        this.y += this.vy;
        this.x += Math.sin(Date.now() / 1000 + this.phase) * 0.4;
        let maxD = state.isTutorialMode ? 900 : 5600;
        if (this.y < 400) {
            this.y = maxD; 
            this.x = state.cameraX + Math.random() * state.logicalWidth * 2 - state.logicalWidth / 2;
        }
    }
    draw(ctx) {
        let px = this.x - state.cameraX * 0.5; 
        px = ((px % 4000) + 4000) % 4000 - 1000;
        let py = this.y - state.cameraY;
        
        if (py > 400 - state.cameraY && py < state.logicalHeight && px > -50 && px < state.logicalWidth + 50) {
            ctx.fillStyle = `rgba(255,255,255,${this.opacity})`;
            ctx.beginPath();
            ctx.arc(px, py, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class Particle {
    constructor(x, y, color, vx, vy) {
        this.x = x; this.y = y;
        this.vx = vx !== undefined ? vx : (Math.random() - 0.5) * 6;
        this.vy = vy !== undefined ? vy : (Math.random() - 0.5) * 6;
        this.color = color;
        this.life = 1.0;
        this.decay = 0.02 + Math.random() * 0.02;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.life -= this.decay;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - state.cameraX, this.y - state.cameraY, 3, 3);
        ctx.restore();
    }
}

class WakeParticle {
    constructor(x, y, baseVx, size) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * size * 0.08 + 0.5; 
        this.vx = baseVx + (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.life = 1.0;
        this.decay = 0.015 + Math.random() * 0.01;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }
    draw(ctx) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${this.life * 0.55})`;
        ctx.beginPath();
        ctx.arc(this.x - state.cameraX, this.y - state.cameraY, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        state.particles.push(new Particle(x, y, color));
    }
}

function createBloodParticles(x, y, count = 12) {
    let bloodColors = ['#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'];
    for (let i = 0; i < count; i++) {
        let color = bloodColors[Math.floor(Math.random() * bloodColors.length)];
        let vx = (Math.random() - 0.5) * 8;
        let vy = -2 - Math.random() * 4; 
        state.particles.push(new Particle(x, y, color, vx, vy));
    }
}

function createWoodExplosion(x, y, count = 25) {
    let woodColors = ['#8d6e63', '#6d4c41', '#5d4037', '#4e342e', '#3e2723'];
    for (let i = 0; i < count; i++) {
        let color = woodColors[Math.floor(Math.random() * woodColors.length)];
        let vx = (Math.random() - 0.5) * 12;
        let vy = -4 - Math.random() * 6;
        state.particles.push(new Particle(x, y, color, vx, vy));
    }
}

// Bind to window for global access
window.RainParticle = RainParticle;
window.AmbientParticle = AmbientParticle;
window.Particle = Particle;
window.WakeParticle = WakeParticle;
window.createParticles = createParticles;
window.createBloodParticles = createBloodParticles;
window.createWoodExplosion = createWoodExplosion;
