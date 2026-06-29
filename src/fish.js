function freeLaneIndex(isBird, laneIdx) {
    if (laneIdx === undefined) return;
    if (isBird) {
        let idx = state.assignedBirdLanes.indexOf(laneIdx);
        if (idx !== -1) state.assignedBirdLanes.splice(idx, 1);
    } else {
        let idx = state.assignedFishLanes.indexOf(laneIdx);
        if (idx !== -1) state.assignedFishLanes.splice(idx, 1);
    }
}

class Fish {
    constructor(isBird = false) {
        this.isBird = isBird;
        this.reset(true); 
    }
    reset(forceOffscreen = false) {
        this.isDead = false;
        this.decayLife = 1.0; 
        this.isPhotoPreview = false; 
        this.renderTilt = 0;
        
        this.isFollowing = false;
        this.followTimer = 0;
        this.followCooldown = 0;
        this.fallVy = 0; 

        if (this.isBird) {
            this.creatureType = 'bird';
            let availableBirdLanes = Array.from({ length: 4 }, (_, i) => i) // BIRD_LANE_COUNT = 4
                .filter(l => !state.fishList.some(other => other !== this && other.isBird && other.laneIndex === l));
            this.laneIndex = availableBirdLanes.length > 0 
                ? availableBirdLanes[Math.floor(Math.random() * availableBirdLanes.length)] 
                : Math.floor(Math.random() * 4);
            
            this.y = 85 + this.laneIndex * 40 + Math.random() * 15;
            
            let spawnLeft = Math.random() > 0.5;
            this.x = spawnLeft ? state.cameraX - 450 : state.cameraX + state.logicalWidth + 450;
            
            let roll = Math.random();
            if (roll > 0.98) { 
                this.rarity = 4;
                this.rarityName = "MYTHIC";
                this.size = 35 + Math.random() * 10;
                this.baseColor = '#ffd700'; 
                this.maxHealth = 300; 
                this.drainRate = 0.9; 
                this.speed = 2.4;
                this.name = "Golden Albatross";
            } else if (roll > 0.88) { 
                this.rarity = 3;
                this.rarityName = "LEGENDARY";
                this.size = 28 + Math.random() * 8;
                if (Math.random() > 0.5) {
                    this.name = "Zephyr Falcon";
                    this.baseColor = '#f59e0b';
                    this.speed = 3.2; 
                } else {
                    this.name = "Abyssal Petrel";
                    this.baseColor = '#475569';
                    this.speed = 1.8;
                }
                this.maxHealth = 250; 
                this.drainRate = 0.75;
            } else if (roll > 0.65) { 
                this.rarity = 2;
                this.rarityName = "RARE";
                this.size = 24 + Math.random() * 8;
                if (Math.random() > 0.5) {
                    this.name = "Crimson Frigate";
                    this.baseColor = '#ef4444';
                    this.speed = 2.2;
                } else {
                    this.name = "Midnight Stormpetrel";
                    this.baseColor = '#6366f1';
                    this.speed = 2.0;
                }
                this.maxHealth = 180; 
                this.drainRate = 0.55;
            } else { 
                this.rarity = 1;
                this.rarityName = "COMMON";
                this.size = 18 + Math.random() * 6;
                if (Math.random() > 0.5) {
                    this.name = "Coastal Seagull";
                    this.baseColor = '#ffffff';
                    this.speed = 1.5;
                } else {
                    this.name = "Sea Tern";
                    this.baseColor = '#94a3b8';
                    this.speed = 1.7;
                }
                this.maxHealth = 110; 
                this.drainRate = 0.35;
            }

            this.health = this.maxHealth;
            this.vx = spawnLeft ? this.speed : -this.speed;
            this.animOffset = Math.random() * 10000;
            return;
        }

        let availableFishLanes = Array.from({ length: 15 }, (_, i) => i) // FISH_LANE_COUNT = 15
            .filter(l => !state.fishList.some(other => other !== this && !other.isBird && other.laneIndex === l));
        this.laneIndex = availableFishLanes.length > 0 
            ? availableFishLanes[Math.floor(Math.random() * availableFishLanes.length)] 
            : Math.floor(Math.random() * 15);

        this.y = 400 + 200 + this.laneIndex * ((5600 - 600 - 400) / 15) + (Math.random() * 40 - 20);
        
        let spawnLeft = Math.random() > 0.5;
        if (forceOffscreen) {
            this.x = spawnLeft ? state.cameraX - 300 : state.cameraX + state.logicalWidth + 300;
        } else {
            this.x = state.cameraX + Math.random() * (state.logicalWidth + 800) - 400;
            spawnLeft = this.x < (state.cameraX + state.logicalWidth / 2);
        }
        
        let ratio = (this.y - 400) / 5600;
        if (ratio > 0.8 && Math.random() > 0.85) {
            this.rarity = 4; this.rarityName = "MYTHIC";
            this.size = 55 + Math.random() * 30;
            this.baseColor = '#ffd700'; 
            this.maxHealth = 600; this.drainRate = 0.8; this.speed = 1.0;
        } else if (ratio > 0.75) {
            this.rarity = 3; this.rarityName = "LEGENDARY";
            this.size = 50 + Math.random() * 30;
            this.baseColor = `hsl(${280 + Math.random() * 40}, 80%, 40%)`;
            this.maxHealth = 400; this.drainRate = 0.6; this.speed = 1.2;
        } else if (ratio > 0.35) {
            this.rarity = 2; this.rarityName = "RARE";
            this.size = 30 + Math.random() * 15;
            this.baseColor = `hsl(${190 + Math.random() * 30}, 70%, 50%)`;
            this.maxHealth = 200; this.drainRate = 0.35; this.speed = 2.5;
        } else {
            this.rarity = 1; this.rarityName = "COMMON";
            this.size = 18 + Math.random() * 10;
            this.baseColor = `hsl(${210 + Math.random() * 20}, 40%, 60%)`;
            this.maxHealth = 100; this.drainRate = 0.2; this.speed = 3.5;
        }
        
        const creatures = CREATURE_LIST[this.rarity];
        const selected = creatures[Math.floor(Math.random() * creatures.length)];
        this.name = selected.name;
        this.creatureType = selected.type;
        this.health = this.maxHealth;
        this.vx = (spawnLeft ? 1 : -1) * this.speed;
        this.animOffset = Math.random() * 10000;
    }

    update(isClosestCandidate) {
        if (this.isDead) {
            if (this.isBird) {
                if (this.y < 400) { // waterSurfaceY = 400
                    if (!this.fallVy) this.fallVy = 1.5;
                    this.fallVy += 0.3; 
                    let nextY = this.y + this.fallVy;
                    
                    if (nextY >= 400) {
                        createParticles(this.x, 400, '#ffffff', 18);
                        AudioManager.playSplash();
                        this.fallVy = 0.8; 
                    }
                    this.y = nextY;
                    this.x += Math.sin(Date.now() / 80) * 0.8; 
                } else {
                    this.y += 1.0;
                }
            } else {
                this.y += 1.0;
            }
            
            if (this.y > 5600) this.y = 5600; // maxDepth = 5600
            this.decayLife -= 0.003; 
            if (this.decayLife < 0) this.decayLife = 0;

            if (Math.random() < 0.1 && this.decayLife > 0) {
                const bloodColors = ['#7f1d1d', '#991b1b', '#b91c1c', '#ef4444'];
                let essenceColor = bloodColors[Math.floor(Math.random() * bloodColors.length)];
                state.particles.push(new Particle(
                    this.x + (Math.random() - 0.5) * this.size,
                    this.y + (Math.random() - 0.5) * this.size,
                    essenceColor,
                    (Math.random() - 0.5) * 1.5,
                    -Math.random() * 0.8 
                ));
            }
            return;
        }
        
        let isStruggling = (state.gameState === 'REELING' && state.hookedFish === this);
        if (this.y > 400) {
            let normalSwim = (state.gameState !== 'REELING' && Math.random() < 0.25);
            let franticStruggle = (isStruggling && Math.random() < 0.8); 
            
            if (normalSwim || franticStruggle) {
                let particlesToSpawn = franticStruggle ? Math.floor(Math.random() * 4) + 2 : Math.floor(Math.random() * 2);
                for(let i=0; i<particlesToSpawn; i++) {
                    let px = this.x + (Math.random() - 0.5) * (this.size * 1.5);
                    let py = this.y + (Math.random() - 0.5) * (this.size * 1.5);
                    let pVx = franticStruggle ? (Math.random() - 0.5) * 6 : this.vx * -0.2;
                    
                    let wp = new WakeParticle(px, py, pVx, this.size);
                    if (franticStruggle) {
                        wp.vy = (Math.random() - 0.5) * 6; 
                    }
                    state.wakeParticles.push(wp);
                }
            }
        }

        if (this.followCooldown > 0) this.followCooldown--;

        if (!isStruggling) {
            let separationX = 0;
            let separationY = 0;
            let neighbors = 0;
            const minAllowedDistance = (this.size + 40);

            state.fishList.forEach(other => {
                if (other !== this && !other.isDead && (other.isBird === this.isBird)) {
                    let dx = this.x - other.x;
                    let dy = this.y - other.y;
                    let dist = Math.sqrt(dx*dx + dy*dy) || 0.1;
                    if (dist < minAllowedDistance) {
                        let force = (minAllowedDistance - dist) / minAllowedDistance;
                        separationX += (dx / dist) * force * 1.2;
                        separationY += (dy / dist) * force * 0.8;
                        neighbors++;
                    }
                }
            });

            if (neighbors > 0) {
                this.x += separationX / neighbors;
                this.y += separationY / neighbors;
            }

            if (this.isBird) {
                this.x += this.vx;
                this.y += Math.sin(Date.now() / 150 + this.animOffset) * 0.15; 
                
                if (this.y < 45) this.y = 45;
                if (this.y > 400 - 70) this.y = 400 - 70;
            } else {
                if (isClosestCandidate && this.followCooldown <= 0 && state.gameState !== 'REELING' && state.gameState === 'SINKING') {
                    if (!this.isFollowing && Math.random() < 0.015) {
                        this.isFollowing = true;
                        this.followTimer = Math.random() * 180 + 120; 
                    }
                }

                if (this.isFollowing) {
                    this.followTimer--;
                    let dx = state.hook.x - this.x;
                    let dy = state.hook.y - this.y; 
                    let dist = Math.sqrt(dx*dx + dy*dy) || 1;
                    
                    if (dist > 450) {
                        this.isFollowing = false;
                        this.followCooldown = 180;
                    }

                    let targetAngle = Math.atan2(dy, dx);
                    if (this.vx < 0) {
                        targetAngle = Math.atan2(-dy, -dx);
                    }

                    if (Math.abs(Math.sin(targetAngle)) > 0.65 || this.followTimer <= 0) {
                        this.isFollowing = false;
                        this.followCooldown = 220;
                    } else {
                        let steerX = (dx / dist) * this.speed * 0.45;
                        let steerY = (dy / dist) * this.speed * 0.45;
                        
                        this.vx += (steerX - this.vx) * 0.05;
                        this.y += steerY;
                        this.renderTilt += (targetAngle - this.renderTilt) * 0.08;
                    }

                    if (this.y < 400 + 50) this.y = 400 + 50;
                    if (this.y > 5600 - 20) this.y = 5600 - 20;
                } else {
                    let targetVx = (this.vx > 0 ? 1 : -1) * this.speed;
                    this.vx += (targetVx - this.vx) * 0.02;
                    this.renderTilt += (0 - this.renderTilt) * 0.05;
                }

                this.x += this.vx;
            }

            if (this.x < state.cameraX - 450 || this.x > state.cameraX + state.logicalWidth + 450) {
                this.reset(true);
            }
        } else {
            this.x = state.hook.x;
            this.y = state.hook.y + this.size * 0.4;
            this.renderTilt += (0 - this.renderTilt) * 0.1;
        }
    }

    draw(ctx) {
        ctx.save();
        if (this.isDead) {
            ctx.globalAlpha = Math.max(0, this.decayLife);
        }

        ctx.translate(this.x - state.cameraX, this.y - state.cameraY);
        let timeOffset = this.isDead ? this.animOffset : (Date.now() + this.animOffset);

        if (state.gameState === 'REELING' && state.hookedFish === this) {
            let thrashTime = Date.now() + this.animOffset;
            let _jerkX = (Math.random() - 0.5) * this.size * 0.12; 
            let _jerkY = (Math.random() - 0.5) * this.size * 0.12;
            ctx.translate(_jerkX, _jerkY);

            let thrashAngle = Math.sin(thrashTime / 90) * 0.25; 
            ctx.rotate(thrashAngle);

            let intensity = Math.min(1.0, Math.max(0, state.reelEnergy / 220));
            if (intensity > 0) {
                let shakeX = (Math.random() - 0.5) * 4 * intensity;
                let shakeY = (Math.random() - 0.5) * 4 * intensity;
                ctx.translate(shakeX, shakeY);

                ctx.save();
                let numRings = Math.max(1, Math.floor(intensity * 3)); 
                let echoDuration = 700; 
                
                for (let r = 0; r < numRings; r++) {
                    let delay = r * (echoDuration / numRings); 
                    let age = (Date.now() + delay) % echoDuration;
                    let linearProgress = age / echoDuration; 
                    let progress = 1 - Math.pow(1 - linearProgress, 2);
                    
                    let maxRadius = 30 + (this.size * 0.6) + (intensity * 25); 
                    let radius = progress * maxRadius; 
                    let alpha = (1 - linearProgress) * Math.min(1, intensity * 1.2); 
                    let strokeWidth = 3 * (1 - linearProgress) + 0.5; 
                    
                    if (radius > 0) {
                        ctx.beginPath();
                        ctx.arc(0, 0, radius, 0, Math.PI * 2);
                        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                        ctx.lineWidth = strokeWidth;
                        ctx.stroke();
                    }
                }
                ctx.restore();
            }
        } else {
            ctx.rotate(this.renderTilt);
            if (this.vx < 0 && !this.isDead) {
                ctx.scale(-1, 1); 
            }
        }

        ctx.shadowBlur = 0;
        if (state.hookedFish === this || this.isPhotoPreview) {
            ctx.fillStyle = this.baseColor;
            ctx.strokeStyle = this.baseColor;
        } else if (this.rarity === 4 && !this.isDead) {
            ctx.fillStyle = '#ffd700';
            ctx.strokeStyle = '#ffd700';
            ctx.shadowBlur = 35;
            ctx.shadowColor = '#ffea00';
        } else {
            ctx.fillStyle = this.isDead ? 'rgba(50,50,50,0.3)' : 'rgba(0, 5, 20, 0.9)';
            ctx.strokeStyle = ctx.fillStyle;
        }

        ctx.beginPath();
        if (this.creatureType === 'jellyfish') {
            ctx.arc(this.size*0.2, 0, this.size*0.5, -Math.PI/2, Math.PI/2);
            ctx.lineTo(-this.size*0.3, this.size*0.5);
            ctx.lineTo(-this.size*0.3, -this.size*0.5);
            ctx.fill();
            ctx.beginPath(); ctx.lineWidth = 2;
            let animDiv = this.isDead ? 0 : Math.sin(timeOffset/200);
            for(let i=-2; i<=2; i++) {
                ctx.moveTo(-this.size*0.3, i*this.size*0.15);
                let wave = animDiv * this.size*0.3;
                ctx.lineTo(-this.size*1.2 + wave, i*this.size*0.2);
            }
            ctx.stroke();
        } else if (this.creatureType === 'squid') {
            ctx.ellipse(this.size*0.2, 0, this.size*0.6, this.size*0.3, 0, -Math.PI/2, Math.PI/2);
            ctx.lineTo(-this.size*0.6, this.size*0.2); ctx.lineTo(-this.size*0.6, -this.size*0.2);
            ctx.fill();
            ctx.beginPath(); ctx.lineWidth = 3;
            let animDiv = this.isDead ? 0 : Math.sin(timeOffset/150);
            for(let i=-2; i<=2; i++) {
                ctx.moveTo(-this.size*0.6, i*this.size*0.08);
                let wave = animDiv * this.size*0.2;
                ctx.lineTo(-this.size*1.4 + wave, i*this.size*0.1);
            }
            ctx.stroke();
        } else if (this.creatureType === 'octopus') {
            ctx.arc(this.size*0.2, 0, this.size*0.6, 0, Math.PI*2); 
            ctx.fill();
            ctx.lineWidth = this.size * 0.15;
            ctx.lineCap = 'round';
            ctx.beginPath();
            let animDiv = this.isDead ? 0 : Math.sin(timeOffset/200);
            for(let i=-3; i<=3; i++) {
                ctx.moveTo(this.size*0.1, i*this.size*0.15);
                let wave = animDiv * this.size*0.3;
                ctx.quadraticCurveTo(-this.size*0.5, i*this.size*0.3 + wave, -this.size*1.2, i*this.size*0.4 + wave*1.5);
            }
            ctx.stroke();
        } else if (this.creatureType === 'turtle') {
            ctx.ellipse(0, 0, this.size*0.7, this.size*0.5, 0, 0, Math.PI*2); 
            ctx.fill();
            ctx.beginPath(); ctx.arc(this.size*0.8, 0, this.size*0.2, 0, Math.PI*2); ctx.fill(); 
            let flap = this.isDead ? 0 : Math.sin(timeOffset/150) * 0.5; 
            ctx.beginPath(); ctx.ellipse(this.size*0.3, -this.size*0.5, this.size*0.4, this.size*0.15, Math.PI/4 + flap, 0, Math.PI*2); ctx.fill(); 
            ctx.beginPath(); ctx.ellipse(this.size*0.3, this.size*0.5, this.size*0.4, this.size*0.15, -Math.PI/4 - flap, 0, Math.PI*2); ctx.fill(); 
        } else if (this.creatureType === 'ray') {
            ctx.moveTo(this.size*0.7, 0); ctx.lineTo(-this.size*0.2, this.size*0.8); 
            ctx.lineTo(-this.size*0.5, 0); ctx.lineTo(-this.size*0.2, -this.size*0.8); 
            ctx.fill();
            ctx.beginPath(); ctx.lineWidth = 2; ctx.moveTo(-this.size*0.5, 0);
            let wave = this.isDead ? 0 : Math.sin(timeOffset/200) * this.size*0.3;
            ctx.lineTo(-this.size*1.8, wave);
            ctx.stroke();
        } else if (this.creatureType === 'crab') {
            ctx.ellipse(0, 0, this.size*0.6, this.size*0.4, 0, 0, Math.PI*2); 
            ctx.fill();
            ctx.beginPath(); ctx.arc(this.size*0.4, -this.size*0.4, this.size*0.2, 0, Math.PI*2); ctx.fill(); 
            ctx.beginPath(); ctx.arc(this.size*0.4, this.size*0.4, this.size*0.2, 0, Math.PI*2); ctx.fill(); 
            ctx.beginPath(); ctx.lineWidth = 2;
            let scurry = this.isDead ? 0 : Math.sin(timeOffset/80) * this.size * 0.2; 
            for(let i=0; i<3; i++) {
                ctx.moveTo(0, this.size*0.3); ctx.lineTo(-this.size*0.2 - i*this.size*0.15 + scurry, this.size*0.6 + Math.abs(scurry));
                ctx.moveTo(0, -this.size*0.3); ctx.lineTo(-this.size*0.2 - i*this.size*0.15 + scurry, -this.size*0.6 - Math.abs(scurry));
            }
            ctx.stroke();
        } else if (this.creatureType === 'eel') {
            ctx.lineWidth = this.size * 0.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath();
            let animDiv = this.isDead ? 0 : Math.sin(timeOffset/150);
            for(let i=0; i<12; i++) {
                let px = this.size*0.8 - i*(this.size*0.25);
                let py = animDiv * Math.sin(i*0.4) * this.size*0.3;
                if(i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        } else if (this.creatureType === 'shark') {
            ctx.ellipse(0, 0, this.size, this.size*0.4, 0, 0, Math.PI * 2);
            let wag = this.isDead ? 0 : Math.sin(timeOffset/150) * this.size * 0.3; 
            ctx.moveTo(-this.size + 5, 0);
            ctx.lineTo(-this.size - this.size*0.6, -this.size*0.4 + wag); 
            ctx.lineTo(-this.size - this.size*0.6, this.size*0.4 + wag); 
            ctx.fill();
            ctx.beginPath(); ctx.moveTo(this.size*0.2, -this.size*0.3); ctx.lineTo(-this.size*0.2, -this.size*0.9); ctx.lineTo(-this.size*0.4, -this.size*0.3); ctx.fill();
            ctx.beginPath(); ctx.moveTo(this.size*0.3, this.size*0.3); ctx.lineTo(0, this.size*0.8); ctx.lineTo(-this.size*0.2, this.size*0.3); ctx.fill();
        } else if (this.creatureType === 'seahorse') {
            let _bob = this.isDead ? 0 : Math.sin(timeOffset/300) * 0.15;
            ctx.rotate(_bob); 
            ctx.ellipse(0, 0, this.size*0.3, this.size*0.6, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.beginPath(); ctx.arc(this.size*0.2, -this.size*0.7, this.size*0.25, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(this.size*0.2, -this.size*0.8); ctx.lineTo(this.size*0.6, -this.size*0.7); ctx.lineTo(this.size*0.2, -this.size*0.6); ctx.fill();
            ctx.beginPath(); ctx.moveTo(0, this.size*0.5); ctx.quadraticCurveTo(-this.size*0.4, this.size*0.8, -this.size*0.1, this.size*1.1); ctx.quadraticCurveTo(this.size*0.2, this.size*0.9, 0, this.size*0.7); ctx.fill();
        } else if (this.creatureType === 'anglerfish') {
            ctx.arc(0, 0, this.size*0.7, 0, Math.PI*2); ctx.fill();
            let _wag = this.isDead ? 0 : Math.sin(timeOffset/150) * this.size * 0.3;
            ctx.beginPath(); ctx.moveTo(-this.size*0.6, 0); ctx.lineTo(-this.size*1.2, -this.size*0.4 + _wag); ctx.lineTo(-this.size*1.2, this.size*0.4 + _wag); ctx.fill();
            let sway = this.isDead ? 0 : Math.sin(timeOffset/200) * this.size * 0.3;
            ctx.beginPath(); ctx.lineWidth = 2; ctx.moveTo(this.size*0.2, -this.size*0.6); ctx.quadraticCurveTo(this.size*0.8 + sway, -this.size*1.2, this.size*1.1 + sway, -this.size*0.3); ctx.stroke();
            ctx.beginPath(); ctx.arc(this.size*1.1 + sway, -this.size*0.3, this.size*0.15, 0, Math.PI*2);
            let oldFill = ctx.fillStyle; ctx.fillStyle = (state.hookedFish === this || this.isPhotoPreview) ? '#fff' : '#ffea00';
            if (!this.isDead && state.hookedFish !== this && !this.isPhotoPreview) { ctx.shadowBlur = 15; ctx.shadowColor = '#ffea00'; }
            ctx.fill(); ctx.fillStyle = oldFill; ctx.shadowBlur = 0;
        } else if (this.creatureType === 'dolphin') {
            ctx.ellipse(0, 0, this.size, this.size * 0.38, 0, 0, Math.PI * 2);
            let _wag = Math.sin(timeOffset / 120) * this.size * 0.22;
            
            ctx.moveTo(-this.size + 5, 0);
            ctx.quadraticCurveTo(-this.size - this.size * 0.4, _wag, -this.size - this.size * 0.7, -this.size * 0.3 + _wag);
            ctx.lineTo(-this.size - this.size * 0.5, _wag);
            ctx.lineTo(-this.size - this.size * 0.7, this.size * 0.3 + _wag);
            ctx.closePath();
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(-this.size * 0.2, -this.size * 0.35);
            ctx.quadraticCurveTo(0, -this.size * 0.85, this.size * 0.3, -this.size * 0.3);
            ctx.closePath();
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(this.size * 0.1, this.size * 0.25);
            ctx.quadraticCurveTo(this.size * 0.3, this.size * 0.7, this.size * 0.5, this.size * 0.25);
            ctx.closePath();
            ctx.fill();
            
            ctx.beginPath();
            ctx.ellipse(this.size * 0.9, this.size * 0.05, this.size * 0.2, this.size * 0.08, Math.PI * 0.05, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.creatureType === 'bird') {
            if (this.isPhotoPreview) {
                ctx.fillStyle = this.baseColor || '#fff';
                ctx.beginPath();
                ctx.ellipse(0, 0, this.size * 0.45, this.size * 0.3, 0, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(this.size * 0.3, -this.size * 0.15, this.size * 0.18, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.moveTo(this.size * 0.45, -this.size * 0.18);
                ctx.lineTo(this.size * 0.65, -this.size * 0.12);
                ctx.lineTo(this.size * 0.42, -this.size * 0.08);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(this.size * 0.32, -this.size * 0.18, this.size * 0.03, 0, Math.PI * 2);
                ctx.fill();
            } else {
                let flap = this.isDead ? 0 : Math.sin(timeOffset / 110) * 0.35;
                ctx.lineWidth = (state.hookedFish === this) ? 3 : 1.3;
                if (state.hookedFish === this) {
                    ctx.strokeStyle = '#ffffff';
                } else {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)'; 
                }

                ctx.beginPath();
                ctx.moveTo(-this.size * 0.8, -this.size * 0.15 + flap * this.size * 0.5);
                ctx.quadraticCurveTo(-this.size * 0.3, -this.size * 0.45 - flap * this.size * 0.1, 0, 0);
                ctx.quadraticCurveTo(this.size * 0.3, -this.size * 0.45 - flap * this.size * 0.1, this.size * 0.8, -this.size * 0.15 + flap * this.size * 0.5);
                ctx.stroke();
            }
        } else {
            ctx.ellipse(0, 0, this.size, this.size*0.5, 0, 0, Math.PI * 2);
            let _wag = this.isDead ? 0 : Math.sin(timeOffset/150) * this.size * 0.3;
            ctx.moveTo(-this.size + 5, 0);
            ctx.lineTo(-this.size - this.size*0.6, -this.size*0.4 + _wag);
            ctx.lineTo(-this.size - this.size*0.6, this.size*0.4 + _wag);
            ctx.fill();
        }
        ctx.lineWidth = 1;

        if ((state.hookedFish === this || this.isPhotoPreview) && this.creatureType !== 'bird') {
            ctx.fillStyle = '#fff';
            let eyeX = this.size*0.6; let eyeY = -this.size*0.1; let eyeRad = this.size*0.12;
            if (this.creatureType === 'turtle') { eyeX = this.size*0.8; eyeY = -this.size*0.05; eyeRad = this.size*0.08; }
            if (this.creatureType === 'squid') { eyeX = this.size*0.1; eyeY = -this.size*0.15; eyeRad = this.size*0.12; }
            if (this.creatureType === 'crab') { eyeX = this.size*0.3; eyeY = -this.size*0.15; eyeRad = this.size*0.08; }
            if (this.creatureType === 'ray') { eyeX = this.size*0.2; eyeY = -this.size*0.2; eyeRad = this.size*0.08; }
            if (this.creatureType === 'eel') { eyeX = this.size*0.7; eyeY = (this.isDead ? 0 : Math.sin(timeOffset/150)*this.size*0.3) - this.size*0.1; eyeRad = this.size*0.08; }
            if (this.creatureType === 'jellyfish') { eyeX = this.size*0.1; eyeY = -this.size*0.1; eyeRad = this.size*0.08; }
            if (this.creatureType === 'shark') { eyeX = this.size*0.7; eyeY = -this.size*0.1; eyeRad = this.size*0.06; }
            if (this.creatureType === 'octopus') { eyeX = this.size*0.4; eyeY = -this.size*0.2; eyeRad = this.size*0.1; }
            if (this.creatureType === 'seahorse') { eyeX = this.size*0.25; eyeY = -this.size*0.75; eyeRad = this.size*0.06; }
            if (this.creatureType === 'anglerfish') { eyeX = this.size*0.3; eyeY = -this.size*0.2; eyeRad = this.size*0.1; }
            if (this.creatureType === 'dolphin') { eyeX = this.size*0.6; eyeY = -this.size*0.12; eyeRad = this.size*0.05; }

            ctx.beginPath(); ctx.arc(eyeX, eyeY, eyeRad, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(eyeX + eyeRad*0.3, eyeY, eyeRad*0.4, 0, Math.PI*2); ctx.fill();
        }

        ctx.shadowBlur = 0; 
        ctx.restore();
    }
}

// Bind to window for global access
window.freeLaneIndex = freeLaneIndex;
window.Fish = Fish;
