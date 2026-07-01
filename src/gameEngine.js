let canvas, ctx;
let lastTime = 0;
let loopId = null;

function initializeEngine(canvasElement) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    
    // Clear old state loops if any
    if (loopId) {
        cancelAnimationFrame(loopId);
    }

    // Reset transient game objects
    state.fishList = [];
    state.particles = [];
    state.wakeParticles = [];
    state.brokenHooks = [];
    state.hookedFish = null;
    
    // Initialize stars
    state.stars = [];
    for(let i=0; i<150; i++) {
        state.stars.push({ 
            x: Math.random() * 4000 - 1000, 
            y: Math.random() * 1400 - 1000, 
            size: Math.random() * 2 + 0.5 
        });
    }
    
    // Initialize ambient ocean particles
    state.ambientParticles = [];
    for(let i=0; i<250; i++) {
        state.ambientParticles.push(new AmbientParticle());
    }
    
    // Initialize rain particles
    state.rainParticles = [];
    for(let i=0; i<300; i++) { // MAX_RAIN_PARTICLES = 300
        state.rainParticles.push(new RainParticle());
    }
    
    // Initialize clouds
    state.clouds = [];
    for(let i=0; i<18; i++) {
        state.clouds.push({
            x: Math.random() * 5000 - 1000,
            y: Math.random() * 400 - 150, 
            scale: Math.random() * 1.2 + 0.6,
            speed: Math.random() * 0.15 + 0.05,
            opacity: Math.random() * 0.3 + 0.1
        });
    }

    // Set rope points
    state.ropePoints = [];
    for(let i=0; i<60; i++) { // numRopeSegments = 60
        state.ropePoints.push({x:0, y:0, old_x:0, old_y:0});
    }
    
    resizeEngine();
    
    lastTime = performance.now();
    loopId = requestAnimationFrame(gameLoop);
}

function stopEngine() {
    if (loopId) {
        cancelAnimationFrame(loopId);
        loopId = null;
    }
}

function resizeEngine() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    state.logicalWidth = window.innerWidth;
    state.logicalHeight = window.innerHeight;

    canvas.width = state.logicalWidth * dpr;
    canvas.height = state.logicalHeight * dpr;
    canvas.style.width = state.logicalWidth + 'px';
    canvas.style.height = state.logicalHeight + 'px';

    if (state.gameState === 'HOME') {
        state.boatWorldX = state.logicalWidth / 2 - 800;
    } else if (state.gameState !== 'INTRO') {
        state.boatWorldX = state.logicalWidth / 2;
    }
}

function initializeCreatures() {
    state.fishList = [];
    state.assignedFishLanes = Array.from({ length: 50 }, (_, i) => i);
    state.assignedBirdLanes = Array.from({ length: 4 }, (_, i) => i);
    if (state.isTutorialMode) {
        let fish = new Fish(false);
        fish.x = state.logicalWidth / 2;
        fish.y = 400 + 150;
        fish.vx = fish.speed;
        state.fishList.push(fish);
    } else {
        for(let i=0; i<40; i++) state.fishList.push(new Fish(false));
        for(let i=0; i<5; i++) {
            let bird = new Fish(true);
            bird.x = Math.random() > 0.5 ? state.cameraX - 800 - Math.random() * 800 : state.cameraX + state.logicalWidth + 800 + Math.random() * 800;
            state.fishList.push(bird);
        }
    }
}

function resetHook() {
    state.gameState = 'IDLE';
    state.hookedFish = null;
    state.hook.vx = 0; state.hook.vy = 0;
    state.lineTension = 0;
    state.slackTimer = 0;
    state.lastPressedKey = null; 

    let dangleLength = 24;
    let swayAngle = state.boatTilt + Math.sin(Date.now() / 350) * 0.08;
    let targetX = state.rodTip.x + Math.sin(swayAngle) * dangleLength;
    let targetY = state.rodTip.y + Math.cos(swayAngle) * dangleLength;
    state.hook.x = targetX;
    state.hook.y = targetY;

    state.ropePoints = [];
    for (let i = 0; i < 60; i++) {
        state.ropePoints.push({x:0, y:0, old_x:0, old_y:0});
    }
    for (let i = 0; i < 60; i++) { // numRopeSegments = 60
        let lerpFactor = i / 59;
        state.ropePoints[i].x = state.rodTip.x + (state.hook.x - state.rodTip.x) * lerpFactor;
        state.ropePoints[i].y = state.rodTip.y + (state.hook.y - state.rodTip.y) * lerpFactor;
        state.ropePoints[i].old_x = state.ropePoints[i].x;
        state.ropePoints[i].old_y = state.ropePoints[i].y;
    }
}

function createBrokenHook(x, y, vx, vy) {
    state.brokenHooks.push({
        x: x,
        y: y,
        vx: vx * 0.4 + (Math.random() - 0.5) * 2,
        vy: vy * 0.4 - 1.5,
        angle: Math.random() * Math.PI * 2,
        decayLife: 1.0
    });
}

function applySort() {
    const RARITY_MAP = { 'COMMON': 1, 'RARE': 2, 'LEGENDARY': 3, 'MYTHIC': 4 };
    if (state.currentSortOption === 'newest') {
        state.caughtFishStack.sort((a, b) => b.catchId - a.catchId);
    } else if (state.currentSortOption === 'oldest') {
        state.caughtFishStack.sort((a, b) => a.catchId - b.catchId);
    } else if (state.currentSortOption === 'size_desc') {
        state.caughtFishStack.sort((a, b) => b.size - a.size);
    } else if (state.currentSortOption === 'rarity_desc') {
        state.caughtFishStack.sort((a, b) => {
            const rA = RARITY_MAP[a.rarity] || 0;
            const rB = RARITY_MAP[b.rarity] || 0;
            return rB - rA;
        });
    } else if (state.currentSortOption === 'value_desc') {
        state.caughtFishStack.sort((a, b) => b.value - a.value);
    }
}

function speakPhrase(text) {
    AudioManager.playFishermanTalk();
}

function checkGameOver() {
    if (state.isTutorialMode) return;
    if (state.playerHooks <= 0 && state.playerMoney < 10 && state.caughtFishStack.length === 0) {
        triggerEndgame('hookless');
    }
}

function loseHook() {
    if (state.isTutorialMode) {
        state.playerHooks = 10;
        const hooksDisplay = document.getElementById('player-hooks-display');
        if (hooksDisplay) hooksDisplay.textContent = state.playerHooks;
        return;
    }
    state.playerHooks = Math.max(0, state.playerHooks - 1);
    const hooksDisplay = document.getElementById('player-hooks-display');
    if (hooksDisplay) hooksDisplay.textContent = state.playerHooks;
    if (hooksDisplay && hooksDisplay.parentElement) {
        if (state.playerHooks <= 3) {
            hooksDisplay.parentElement.style.color = '#f87171';
        } else {
            hooksDisplay.parentElement.style.color = '';
        }
    }
    checkGameOver();
}

function triggerEndgame(type = 'hookless') {
    if (state.gameState === 'GAMEOVER') return; 
    state.gameState = 'GAMEOVER';

    if (type === 'hookless') {
        state.playerHooks = 0;
        const hooksDisplay = document.getElementById('player-hooks-display');
        if (hooksDisplay) hooksDisplay.textContent = '0';
    }

    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) {
        uiLayer.style.pointerEvents = 'none';
    }

    // Custom modal closing triggers
    const closeModalElements = ['collection-modal', 'store-modal', 'photo-modal'];
    closeModalElements.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }
    });
    const devConsole = document.getElementById('dev-console');
    if (devConsole) devConsole.classList.add('hidden');

    if (state.videoStream) {
        state.videoStream.getTracks().forEach(track => track.stop());
    }

    const elementsToFade = [
        document.getElementById('depth-hud'),
        document.getElementById('nav-hud'),
        document.getElementById('drum-controller'),
        document.getElementById('message-box')
    ];
    elementsToFade.forEach(el => {
        if (el) el.classList.add('fade-out-active');
    });

    const endgameContainer = document.getElementById('endgame-container');
    const hooklessPhase = document.getElementById('hookless-phase');
    const boatlessPhase = document.getElementById('boatless-phase');
    const summaryPhase = document.getElementById('summary-phase');

    if (endgameContainer && hooklessPhase && boatlessPhase && summaryPhase) {
        if (type === 'boatless') {
            boatlessPhase.style.opacity = '1';
            boatlessPhase.classList.remove('hidden');
            hooklessPhase.classList.add('hidden');
        } else {
            hooklessPhase.style.opacity = '1';
            hooklessPhase.classList.remove('hidden');
            boatlessPhase.classList.add('hidden');
        }

        summaryPhase.style.opacity = '0';
        summaryPhase.classList.add('hidden', 'opacity-0');

        endgameContainer.classList.remove('hidden', 'opacity-0');
        endgameContainer.style.opacity = '0';
        void endgameContainer.offsetWidth; 
        endgameContainer.style.transition = 'opacity 1.0s ease-in-out';
        endgameContainer.classList.add('fade-in-active');

        setTimeout(() => {
            const activePhase = (type === 'boatless') ? boatlessPhase : hooklessPhase;
            activePhase.style.transition = 'opacity 0.5s ease-in-out';
            activePhase.style.opacity = '0';

            setTimeout(() => {
                activePhase.classList.add('hidden');

                document.getElementById('summary-money').textContent = state.playerMoney.toLocaleString();
                document.getElementById('summary-count').textContent = state.sessionCaughtLog.length;
                
                const summaryList = document.getElementById('summary-catch-list');
                summaryList.innerHTML = '';
                
                if (state.sessionCaughtLog.length === 0) {
                    summaryList.innerHTML = `<div style="font-size: 10px; text-transform: uppercase; color: rgba(255, 255, 255, 0.3); text-align: center; padding: 16px 0;">No animals caught during this voyage.</div>`;
                } else {
                    state.sessionCaughtLog.forEach(c => {
                        let correctSVG = CREATURE_SVGS[c.creatureType] || CREATURE_SVGS['fish'];
                        let div = document.createElement('div');
                        div.className = "summary-catch-row";
                        div.innerHTML = `
                            <div class="summary-catch-row-left">
                                <div class="summary-catch-avatar" style="color: ${c.color}">
                                    ${correctSVG}
                                </div>
                                <span class="summary-catch-name">${c.name}</span>
                            </div>
                            <span class="summary-catch-meta">${c.rarity} &middot; ${Math.floor(c.size)}cm</span>
                        `;
                        summaryList.appendChild(div);
                    });
                }

                summaryPhase.classList.remove('hidden', 'opacity-0');
                void summaryPhase.offsetWidth; 
                summaryPhase.style.transition = 'opacity 0.8s ease-in-out';
                summaryPhase.style.opacity = '1';

                const summaryRestartBtn = document.getElementById('summary-restart-btn');
                const restartSplitContainer = document.getElementById('restart-split-container');
                if (summaryRestartBtn) summaryRestartBtn.classList.remove('hidden');
                if (restartSplitContainer) restartSplitContainer.classList.add('hidden');

                if (uiLayer) {
                    uiLayer.style.pointerEvents = 'auto';
                }
            }, 500); 
        }, 3000); 
    }
}

function showMessage(text, styleContext = "default", duration = 200) {
    const msgText = document.getElementById('msg-text');
    const msgMeta = document.getElementById('msg-meta');
    const messageBox = document.getElementById('message-box');
    if (!msgText || !msgMeta || !messageBox) return;
    
    msgText.textContent = text;
    let metaLabel = "SYSTEM UPDATE";

    if (text.includes("SNAP") || text.includes("escaped") || text.includes("died") || styleContext === "danger" || text.includes("FULL") || text.includes("OUT OF HOOKS") || text.includes("DANGER") || text.includes("CRITICAL")) {
        metaLabel = "ALERT SIGNAL";
    } else if (text.includes("CAUGHT") || text.includes("HOOKED")) {
        if (text.includes("MYTHIC")) {
            metaLabel = "MYTHIC SIGNAL";
        } else if (text.includes("LEGENDARY")) {
            metaLabel = "LEGENDARY SIGNAL";
        } else if (text.includes("RARE")) {
            metaLabel = "RARE SIGNAL";
        } else {
            metaLabel = "COMMON SIGNAL";
        }
    } else if (text.includes("SOLD") || text.includes("Purchased") || styleContext === "success") {
        metaLabel = "MARKET SIGNAL";
    } else if (text.includes("Equipped")) {
        metaLabel = "GEAR SIGNAL";
    } else if (text.includes("TRUE FISHERMAN") || text.includes("UNLOCKED")) {
        metaLabel = "ACHIEVEMENT DETECTED";
    }

    msgMeta.textContent = metaLabel;
    messageBox.classList.remove('hidden');
    state.msgTimer = duration;
}

function resampleRopePoints(newCount) {
    let oldCount = state.ropePoints.length;
    if (oldCount === 0) {
        state.ropePoints = [];
        for (let i = 0; i < newCount; i++) {
            state.ropePoints.push({ x: state.rodTip.x, y: state.rodTip.y, old_x: state.rodTip.x, old_y: state.rodTip.y });
        }
        return;
    }
    if (oldCount === newCount) return;
    
    if (newCount > oldCount) {
        let diff = newCount - oldCount;
        let p0 = state.ropePoints[0];
        let p1 = state.ropePoints[1] || p0;
        
        let inserted = [];
        for (let i = 1; i <= diff; i++) {
            let t = i / (diff + 1);
            inserted.push({
                x: p0.x + (p1.x - p0.x) * t,
                y: p0.y + (p1.y - p0.y) * t,
                old_x: p0.old_x + (p1.old_x - p0.old_x) * t,
                old_y: p0.old_y + (p1.old_y - p0.old_y) * t
            });
        }
        state.ropePoints.splice(1, 0, ...inserted);
    } else if (newCount < oldCount) {
        let diff = oldCount - newCount;
        state.ropePoints.splice(1, diff);
    }
}

function updatePhysics() {
    state.reelEnergy *= 0.94; 
    let intensity = 0;
    let activeRod = storeInventory.rods.find(r => r.id === state.playerEquipment.rod);
    
    if (Date.now() - state.lastReelTime > 400) {
        state.lastPressedKey = null;
    }

    if (state.reelEnergy > 10 && state.gameState !== 'CASTING') {
        intensity = Math.min(1, state.reelEnergy / 220);
        if (state.gameState === 'SINKING' || state.gameState === 'WAITING' || state.gameState === 'REELING') {
            let dx = state.rodTip.x - state.hook.x;
            let dy = state.rodTip.y - state.hook.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                let dirX = dx / dist;
                let dirY = dy / dist;
                let strength = state.baseReelStrength; 
                state.hook.vx += dirX * intensity * strength; 
                state.hook.vy += dirY * intensity * strength; 
            }
        }
    }

    if (state.gameState === 'PULLING') {
        let dx = state.pullCurrentX - state.pullStartX;
        let dy = state.pullCurrentY - state.pullStartY;
        let dist = Math.sqrt(dx*dx + dy*dy) || 0.001;
        let pullRatio = Math.min(1.0, dist / 180); // MAX_PULL_DIST = 180

        let targetRotation = -pullRatio * (Math.PI / 2.3); 
        state.rodRotation += (targetRotation - state.rodRotation) * 0.22;
    } else {
        let springK = 0.16;
        let damping = 0.82;
        let accel = -springK * state.rodRotation;
        state.rodWhipVelocity += accel;
        state.rodWhipVelocity *= damping;
        state.rodRotation += state.rodWhipVelocity;
    }

    state.rodRotation = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 5, state.rodRotation));

    if (state.gameState === 'IDLE' || state.gameState === 'HOME' || state.gameState === 'INTRO' || state.gameState === 'PULLING') {
        let dangleLength = 24; 
        let swayAngle = state.boatTilt + Math.sin(Date.now() / 350) * 0.08;
        let targetX = state.rodTip.x + Math.sin(swayAngle) * dangleLength;
        let targetY = state.rodTip.y + Math.cos(swayAngle) * dangleLength;
        
        state.hook.x += (targetX - state.hook.x) * 0.15;
        state.hook.y += (targetY - state.hook.y) * 0.15;
        state.hook.vx = 0;
        state.hook.vy = 0;
    } else {
        state.hook.vy += 0.12; 
        state.hook.x += state.hook.vx;
        state.hook.y += state.hook.vy;
        
        if (state.hook.y > 400) { // waterSurfaceY = 400
            state.hook.vx *= 0.90; 
            state.hook.vy *= 0.90; 
            if (state.gameState === 'CASTING') {
                state.gameState = 'SINKING';
                AudioManager.playSplash(); 
            }
        } else if (state.gameState === 'CASTING') {
            state.hook.vx *= 0.99; 
            state.hook.vy *= 0.99;
        }

        let maxD = state.isTutorialMode ? 900 : 5600;
        if (state.hook.y >= maxD) { // maxDepth = 5600
            state.hook.y = maxD;
            state.hook.vy *= 0.5; 
            state.hook.vx *= 0.8; 
        }

        if (state.hook.y < -1100) {
            state.hook.y = -1100;
            state.hook.vy = 0;
        }

        if (state.hook.x < state.cameraX - 1200 || state.hook.x > state.cameraX + state.logicalWidth + 1200 || state.hook.y > maxD + 200) {
            resetHook();
        }

        if (state.gameState === 'REELING' && state.hookedFish) {
            let tensionMod = activeRod ? activeRod.tensionMod : 1.25;
            
            if (!state.hookedFish.struggleTimer) {
                state.hookedFish.struggleTimer = 240 + Math.random() * 180; 
                state.hookedFish.isStrugglingAI = false;
            }

            state.hookedFish.struggleTimer--;
            if (state.hookedFish.struggleTimer <= 0) {
                if (!state.hookedFish.isStrugglingAI) {
                    state.hookedFish.isStrugglingAI = true;
                    state.hookedFish.struggleTimer = 90 + Math.random() * 60; 
                } else {
                    state.hookedFish.isStrugglingAI = false;
                    state.hookedFish.struggleTimer = 240 + Math.random() * 180; 
                }
            }

            if (state.hookedFish.isBird) {
                let pullForce = 0.12 + (state.hookedFish.rarity * 0.04); 
                if (state.hookedFish.isStrugglingAI) {
                    pullForce += 0.08; 
                }
                state.hook.vy -= pullForce; 
                if (state.hook.vy < -3.5) {
                    state.hook.vy = -3.5;
                }
                state.hook.vx += Math.sin(Date.now() / 250) * 0.22;
                if (Math.abs(state.hook.vx) > 2.5) state.hook.vx = Math.sign(state.hook.vx) * 2.5;
            } else {
                if (state.hookedFish.isStrugglingAI && state.hookedFish.rarity >= 2) {
                    let pullForce = (state.hookedFish.rarity === 4) ? 0.58 : (state.hookedFish.rarity === 3 ? 0.38 : 0.18);
                    state.hook.vy += pullForce; 
                }
            }

            if (!state.hookedFish.tensionShiftTimer) {
                state.hookedFish.tensionShiftTimer = 210 + Math.random() * 150; 
                state.hookedFish.anticipationTimer = 0;
            }

            state.hookedFish.tensionShiftTimer--;
            if (state.hookedFish.tensionShiftTimer <= 0 && state.hookedFish.anticipationTimer <= 0 && state.hookedFish.rarity >= 2) {
                let targetOffset = (Math.random() - 0.45) * 35; 
                state.hookedFish.anticipatedTension = Math.max(15, Math.min(85, state.lineTension + targetOffset));
                state.hookedFish.anticipationTimer = 45; 
            }

            if (state.hookedFish.anticipationTimer > 0) {
                state.hookedFish.anticipationTimer--;
                if (state.hookedFish.anticipationTimer <= 0) {
                    state.lineTension = state.hookedFish.anticipatedTension;
                    state.hookedFish.tensionShiftTimer = 210 + Math.random() * 150;
                }
            }

            let fishResistance = state.hookedFish.isBird ? (2.4 + state.hookedFish.rarity * 0.65) : (1.1 + state.hookedFish.rarity * 0.35);
            let baseSensitivity = 5.5; 
            let tensionIncrease = intensity * fishResistance * baseSensitivity * tensionMod;
            
            state.lineTension += tensionIncrease;
            state.lineTension -= 0.65 + (state.hookedFish.drainRate * 1.1); 
            
            if (state.lineTension > 75) {
                AudioManager.playWarning(state.lineTension);
            }

             if (state.lineTension > 100) { // MAX_TENSION = 100
                showMessage("SNAP! Tension exceeded. " + state.hookedFish.name + " broke the line!", "danger");
                AudioManager.playSnap();
                createParticles(state.hook.x, state.hook.y, '#ffffff', 20);
                state.playerStats.escapesCount++;
                
                if (state.hookedFish.isBird) {
                    state.hookedFish.isDead = true;
                    state.hookedFish.vx = 0;
                    state.hookedFish.vy = 0.6; 
                }
                createBrokenHook(state.hook.x, state.hook.y, state.hook.vx, state.hook.vy);
                loseHook();
                resetHook(); 

                if (state.isTutorialMode && state.tutorialStep === 7) {
                    showMessage("The line snapped! Cast and try again.", "danger");
                    state.spawnedExhaustionFish = false;
                    state.tutorialStep = 4;
                    state.exhaustionSucceeded = false;
                }
            } else if (state.lineTension <= 0) {
                state.lineTension = 0;
                state.slackTimer++;
                if (state.slackTimer > 90) { 
                    showMessage("SLACK LINE! The " + state.hookedFish.name + " escaped!", "danger");
                    AudioManager.playSplash(); 
                    state.playerStats.escapesCount++;
                    if (state.hookedFish.isBird) {
                        state.hookedFish.isDead = true;
                        state.hookedFish.vx = 0;
                        state.hookedFish.vy = 0.6; 
                    }
                    resetHook();

                    if (state.isTutorialMode && state.tutorialStep === 7) {
                        showMessage("The fish escaped! Cast and try again.", "danger");
                        state.spawnedExhaustionFish = false;
                        state.tutorialStep = 4;
                        state.exhaustionSucceeded = false;
                    }
                }
            } else {
                state.slackTimer = 0;
            }

            if (state.hook.y < 400 - 450) { // waterSurfaceY = 400
                showMessage("SNAP! Hook dragged too high. " + state.hookedFish.name + " snapped the line!", "danger");
                AudioManager.playSnap();
                createParticles(state.hook.x, state.hook.y, '#ffffff', 20);
                state.playerStats.escapesCount++;
                
                if (state.hookedFish.isBird) {
                    state.hookedFish.isDead = true;
                    state.hookedFish.vx = 0;
                    state.hookedFish.vy = 0.6; 
                }
                createBrokenHook(state.hook.x, state.hook.y, state.hook.vx, state.hook.vy);
                loseHook();
                resetHook(); 

                if (state.isTutorialMode && state.tutorialStep === 7) {
                    showMessage("The line snapped! Cast and try again.", "danger");
                    state.spawnedExhaustionFish = false;
                    state.tutorialStep = 4;
                    state.exhaustionSucceeded = false;
                }
                return;
            }
            
            let distToRod = Math.sqrt((state.hook.x - state.rodTip.x)**2 + (state.hook.y - state.rodTip.y)**2);
            if (state.gameState === 'REELING' && distToRod < 45) {
                if (state.isTutorialMode && state.tutorialStep === 7) {
                    showMessage("You caught the fish without exhausting it! Cast and try again.", "danger");
                    state.spawnedExhaustionFish = false;
                    state.tutorialStep = 4;
                    state.exhaustionSucceeded = false;
                    resetHook();
                    return;
                }
                const currentBoat = storeInventory.boatTypes.find(b => b.id === state.playerEquipment.boatType);
                const maxCap = currentBoat ? currentBoat.capacity : 5;
                
                let willBoatBreakThisTurn = false;
                if (state.caughtFishStack.length >= maxCap) {
                    state.overCapacityCount++;
                    let breakChance = 1 - Math.pow(0.5, state.overCapacityCount);
                    
                    if (Math.random() < breakChance) {
                        willBoatBreakThisTurn = true;
                    }
                }

                let valueMultipliers = {1: 15, 2: 75, 3: 450, 4: 2500};
                let reward = Math.floor(state.hookedFish.size * (valueMultipliers[state.hookedFish.rarity] / 30));

                const capturedItem = {
                    name: state.hookedFish.name, rarity: state.hookedFish.rarityName,
                    color: state.hookedFish.baseColor, size: state.hookedFish.size, value: reward,
                    creatureType: state.hookedFish.creatureType,
                    catchId: Date.now() + Math.random()
                };

                state.caughtFishStack.push(capturedItem);
                state.sessionCaughtLog.push(capturedItem); 
                
                applySort(); 
                if (typeof window.updateBucketHUD === 'function') window.updateBucketHUD(); 
                
                state.playerStats.catchesCount++;
                if (state.hookedFish.rarity >= 2) state.playerStats.rareCaught = true;
                if (state.hookedFish.name === "Golden Albatross") state.playerStats.goldAlbatross = true;
                if (state.hookedFish.name === "The Leviathan") state.playerStats.goldLeviathan = true;
                if (state.hookedFish.name === "Ancient Terror") state.playerStats.goldTerror = true;
                if (state.hookedFish.name === "Sun Ray") state.playerStats.goldSunray = true;
                if (state.hookedFish.name === "Chronos Turtle") state.playerStats.goldTurtle = true;

                if (state.playerStats.goldAlbatross && state.playerStats.goldLeviathan && 
                    state.playerStats.goldTerror && state.playerStats.goldSunray && state.playerStats.goldTurtle) {
                    if (!state.playerStats.forbiddenMammalEarned) {
                        state.playerStats.forbiddenMammalEarned = true;
                        
                        const mammalItem = {
                            name: "The Forbidden Mammal",
                            rarity: "MYTHIC",
                            color: "#ffd700",
                            size: 135,
                            value: 50000,
                            creatureType: "dolphin",
                            catchId: Date.now()
                        };

                        state.caughtFishStack.push(mammalItem);
                        state.sessionCaughtLog.push(mammalItem); 
                        applySort();
                        if (typeof window.updateBucketHUD === 'function') window.updateBucketHUD();
                    }
                }
                
                if (willBoatBreakThisTurn) {
                    showMessage("CRITICAL: THE BOAT SPLIT UNDER THE INTENSE CARGO WEIGHT!", "danger");
                    state.boatBroken = true;
                    state.boatBrokenTimer = 20; 
                    
                    let bColor = storeInventory.boatColors.find(c => c.id === state.playerEquipment.boatColor).color;
                    createWoodExplosion(state.boatWorldX, 400 + state.boatBob, bColor, 120); // waterSurfaceY = 400
                    createParticles(state.boatWorldX, 400, '#ffffff', 40); 
                    
                    AudioManager.playExplosion();
                    AudioManager.playSplash();
                    
                    resetHook();
                } else {
                    if (state.caughtFishStack.length > maxCap) {
                        showMessage(`CAUGHT: ${state.hookedFish.name}! CRITICAL LOAD: ${state.caughtFishStack.length}/${maxCap} fish. Boat strain increased!`, "danger", 240);
                    } else {
                        showMessage("CAUGHT: " + state.hookedFish.rarityName + " " + state.hookedFish.name + "! Saved in Bucket.", "info");
                    }
                    
                    let filteredPhrases = HAPPY_PHRASES.filter(p => {
                        if (p === "Amazing bird catch!") return state.hookedFish.isBird;
                        return true;
                    });
                    state.fishermanSpeech = filteredPhrases[Math.floor(Math.random() * filteredPhrases.length)];
                    state.fishermanSpeechTimer = 180; 
                    speakPhrase(state.fishermanSpeech);
                    
                    let caughtIsBird = state.hookedFish.isBird;
                    if (state.hookedFish.laneIndex !== undefined) {
                        freeLaneIndex(state.hookedFish.isBird, state.hookedFish.laneIndex);
                    }
                    state.fishList.splice(state.fishList.indexOf(state.hookedFish), 1);
                    if (!state.isTutorialMode) {
                        state.fishList.push(new Fish(caughtIsBird)); 
                    }
                    resetHook();
                }
            }
        } else if (state.gameState === 'SINKING' || state.gameState === 'WAITING' || state.gameState === 'CASTING') {
            state.fishList.forEach(f => {
                if (!f.isDead) {
                    if (state.gameState === 'CASTING' && !f.isBird) return;
                    let dx = state.hook.x - f.x; let dy = state.hook.y - f.y;
                    if (Math.sqrt(dx*dx + dy*dy) < f.size * 1.5) { 
                        state.hookedFish = f; state.gameState = 'REELING';
                        state.lastPressedKey = null; 
                        state.lineTension = 40; 
                        state.slackTimer = 0;
                        AudioManager.playBite(f.rarity); 
                        if (f.isBird) {
                            showMessage("HOOKED AERIAL: " + f.rarityName + " " + f.name + "! Reeling downward!", "info");
                        } else {
                            showMessage("HOOKED DEEP: " + f.rarityName + " " + f.name + "!", "info");
                        }
                    }
                }
            });

            if ((state.gameState === 'SINKING' || state.gameState === 'WAITING') && state.hook.y < 400 - 40 && state.hook.vy < 0) { // waterSurfaceY = 400
                resetHook(); 
            }
        }
    }

    let startPoint = { x: state.rodTip.x, y: state.rodTip.y };
    let endPoint = { x: state.hook.x, y: state.hook.y };
    
    let dxTotal = endPoint.x - startPoint.x;
    let dyTotal = endPoint.y - startPoint.y;
    let totalDist = Math.sqrt(dxTotal*dxTotal + dyTotal*dyTotal);
    
    // Dynamically adjust rope vertex points to stay close and consistent at any depth
    let desiredPoints = Math.min(300, Math.max(60, Math.floor(totalDist / 15) + 1));
    resampleRopePoints(desiredPoints);
    
    let numRopeSegments = state.ropePoints.length - 1;
    let slackMultiplier = (state.gameState === 'REELING' ? 1.02 : 1.15);
    let targetLength = (totalDist / numRopeSegments) * slackMultiplier;
    if (targetLength < 1) targetLength = 1;

    for(let i = 1; i < numRopeSegments; i++) { 
        let p = state.ropePoints[i];
        if (state.gameState === 'IDLE' || state.gameState === 'HOME' || state.gameState === 'INTRO' || state.gameState === 'PULLING') {
            let rFactor = i / numRopeSegments;
            p.x = startPoint.x + (endPoint.x - startPoint.x) * rFactor;
            p.y = startPoint.y + (endPoint.y - startPoint.y) * rFactor;
            p.old_x = p.x;
            p.old_y = p.y;
        } else {
            let vx = p.x - p.old_x; let vy = p.y - p.old_y;
            p.old_x = p.x; p.old_y = p.y;
            
            if (p.y > 400) { // waterSurfaceY = 400
                vx *= 0.80; vy *= 0.80;
                p.x += Math.sin(Date.now() / 300 + i * 0.4) * 0.6; 
                p.y += vy + 0.02; 
            } else {
                vx *= 0.98; vy *= 0.98;
                p.y += vy + 0.6; 
            }
            
            let maxD = state.isTutorialMode ? 900 : 5600;
            if (p.y >= maxD) { // maxDepth = 5600
                p.y = maxD; p.old_y = maxD; 
                vx *= 0.5; 
            }
            p.x += vx;
        }
    }

    state.ropePoints[0].x = startPoint.x; state.ropePoints[0].y = startPoint.y;
    state.ropePoints[numRopeSegments].x = endPoint.x; state.ropePoints[numRopeSegments].y = endPoint.y;

    if (state.gameState !== 'IDLE' && state.gameState !== 'HOME' && state.gameState !== 'INTRO' && state.gameState !== 'PULLING') {
        for(let iter = 0; iter < 25; iter++) { 
            for(let i = 0; i < numRopeSegments; i++) {
                let p1 = state.ropePoints[i]; let p2 = state.ropePoints[i+1];
                let dx = p2.x - p1.x; let dy = p2.y - p1.y;
                let dist = Math.sqrt(dx*dx + dy*dy) || 0.001;
                let diff = (dist - targetLength) / dist;
                let offsetX = dx * diff * 0.5; let offsetY = dy * diff * 0.5;
                
                let maxD = state.isTutorialMode ? 900 : 5600;
                if (i !== 0) { p1.x += offsetX; p1.y += offsetY; if (p1.y > maxD) p1.y = maxD; }
                if (i + 1 !== numRopeSegments) { p2.x -= offsetX; p2.y -= offsetY; if (p2.y > maxD) p2.y = maxD; }
            }
        }
    }

    for (let i = state.brokenHooks.length - 1; i >= 0; i--) {
        let bh = state.brokenHooks[i];
        bh.vy += 0.12; 
        
        if (bh.y > 400) { // waterSurfaceY = 400
            bh.vx *= 0.90; 
            bh.vy *= 0.90;
            bh.angle += bh.vx * 0.02 + 0.01; 
        } else {
            bh.vx *= 0.99; 
            bh.vy *= 0.99;
            bh.angle += bh.vx * 0.05;
        }

        bh.x += bh.vx;
        bh.y += bh.vy;
        bh.decayLife -= 0.005; 

        let maxD = state.isTutorialMode ? 900 : 5600;
        if (bh.y >= maxD) { // maxDepth = 5600
            bh.y = maxD;
            bh.vx *= 0.8;
            bh.vy = 0;
        }

        if (Math.random() < 0.12 && bh.decayLife > 0 && bh.y > 400) {
            state.particles.push(new Particle(
                bh.x,
                bh.y,
                'rgba(255, 255, 255, 0.45)',
                (Math.random() - 0.5) * 1,
                -Math.random() * 0.8
            ));
        }

        if (bh.decayLife <= 0 || bh.x < state.cameraX - 1200 || bh.x > state.cameraX + state.logicalWidth + 1200) {
            state.brokenHooks.splice(i, 1);
        }
    }
}

function gameLoop(timestamp) {
    if (!canvas) return;
    if (!timestamp) timestamp = performance.now();
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min(100, timestamp - lastTime);
    lastTime = timestamp;

    let now = Date.now();

    if (state.gameState === 'HOME' || state.gameState === 'INTRO' || state.isTutorialMode) {
        state.cycleTime = 0.5; 
        state.isRaining = false;
        state.currentRainIntensity = 0;
        state.nextRainChange = now + 15000;

        const watermark = document.getElementById('watermark');
        if (watermark) {
            if (state.gameState === 'HOME') {
                watermark.classList.remove('opacity-0');
            } else {
                watermark.classList.add('opacity-0');
            }
        }
    } else {
        state.cycleTime = (state.cycleTime + dt / 120000) % 1;
        
        const watermark = document.getElementById('watermark');
        if (watermark) watermark.classList.add('opacity-0');
        
        if (now > state.nextRainChange) {
            state.isRaining = !state.isRaining;
            state.nextRainChange = now + (state.isRaining ? (Math.random() * 20000 + 20000) : (Math.random() * 40000 + 30000));
        }

        if (state.isRaining) {
            state.currentRainIntensity = Math.min(1, state.currentRainIntensity + 0.002);
        } else {
            state.currentRainIntensity = Math.max(0, state.currentRainIntensity - 0.002);
        }
    }

    let currentBoatWorldX = state.boatWorldX;
    let wC = Math.sin(currentBoatWorldX * 0.02 + now * 0.002) * 4 + Math.sin(currentBoatWorldX * 0.008 + now * 0.001) * 6;
    let wL = Math.sin((currentBoatWorldX - 30) * 0.02 + now * 0.002) * 4 + Math.sin((currentBoatWorldX - 30) * 0.008 + now * 0.001) * 6;
    let wR = Math.sin((currentBoatWorldX + 30) * 0.02 + now * 0.002) * 4 + Math.sin((currentBoatWorldX + 30) * 0.008 + now * 0.001) * 6;

    if (state.currentRainIntensity > 0) {
        state.rainParticles.forEach(p => {
            let wave = Math.sin(p.x * 0.02 + now * 0.002) * 4 + Math.sin(p.x * 0.008 + now * 0.001) * 6;
            let localWaterY = 400 + wave; // waterSurfaceY = 400
            let hitWater = p.update(localWaterY);
            if (hitWater && Math.random() < (0.3 * state.currentRainIntensity)) {
                state.particles.push(new Particle(p.x, localWaterY, 'rgba(200, 230, 255, 0.6)', p.vx * 0.2 + (Math.random()-0.5), -Math.random() * 2 - 1));
            }
        });
    }

    state.boatVy += 0.15; 
    let buoyancyForce = (state.boatBob - wC + 12.5) * 0.06; 
    state.boatVy -= buoyancyForce;
    state.boatVy *= 0.88; 
    state.boatBob += state.boatVy;

    let targetTilt = Math.atan2(wR - wL, 60); 
    state.boatVTilt += (targetTilt - state.boatTilt) * 0.08; 
    state.boatVTilt *= 0.85; 
    state.boatTilt += state.boatVTilt;

    if (state.gameState === 'INTRO') {
        state.boatWorldX += 3.2; 
        state.boatBob += Math.sin(Date.now() / 100) * 0.4;
        state.boatTilt += (0.05 - state.boatTilt) * 0.1;

        if (Math.random() < 0.45) {
            state.wakeParticles.push(new WakeParticle(
                state.boatWorldX - 45,
                400 + state.boatBob + 10,
                -1.5 - Math.random() * 1.5,
                15
            ));
        }

        if (state.boatWorldX >= state.logicalWidth / 2) {
            state.boatWorldX = state.logicalWidth / 2;
            state.gameState = 'IDLE';
            initializeCreatures(); 
            showMessage("Casting line unlocked. Pull to aim!", "default", 180);
            
            const depthHud = document.getElementById('depth-hud');
            const navHud = document.getElementById('nav-hud');
            const drumController = document.getElementById('drum-controller');
            if (depthHud) depthHud.classList.remove('hidden');
            if (navHud) navHud.classList.remove('hidden');
            if (window.isTouchDevice && drumController) {
                drumController.classList.remove('hidden');
            }
        }
    }

    if (state.boatBroken) {
        state.boatBrokenTimer--;
        if (state.boatBrokenTimer <= 0) {
            triggerEndgame('boatless');
        }
    }

    if (state.gameState === 'PULLING') {
        let dx = state.pullCurrentX - state.pullStartX;
        state.manFacingRight = ((-dx) >= 0);
    } else if (state.gameState === 'INTRO') {
        state.manFacingRight = true;
    }

    let manOffset = BOAT_OFFSETS[state.playerEquipment.boatType] || 0;
    let cy = 400 + state.boatBob; // waterSurfaceY = 400

    let rx_neutral = 40;
    let ry_neutral = -50;
    let rx_rotated = rx_neutral * Math.cos(state.rodRotation) - ry_neutral * Math.sin(state.rodRotation);
    let ry_rotated = rx_neutral * Math.sin(state.rodRotation) + ry_neutral * Math.cos(state.rodRotation);

    let flipScale = state.manFacingRight ? 1 : -1;
    let tip_boatX = -15 + (10 * flipScale) + (rx_rotated * flipScale);
    let tip_boatY = -15 + manOffset + ry_rotated;

    if (state.gameState === 'HOME' || state.gameState === 'INTRO') {
        state.rodTip.x = state.boatWorldX + tip_boatX * Math.cos(state.boatTilt) - tip_boatY * Math.sin(state.boatTilt);
        state.rodTip.y = cy + tip_boatX * Math.sin(state.boatTilt) + tip_boatY * Math.cos(state.boatTilt);
    } else {
        state.rodTip.x = state.logicalWidth / 2 + tip_boatX * Math.cos(state.boatTilt) - tip_boatY * Math.sin(state.boatTilt);
        state.rodTip.y = cy + tip_boatX * Math.sin(state.boatTilt) + tip_boatY * Math.cos(state.boatTilt);
    }

    if (state.ropePoints[0] && state.ropePoints[0].x === 0 && state.ropePoints[0].y === 0) {
        for (let i = 0; i < 60; i++) { // numRopeSegments = 60
            state.ropePoints[i].x = state.rodTip.x;
            state.ropePoints[i].y = state.rodTip.y;
            state.ropePoints[i].old_x = state.rodTip.x;
            state.ropePoints[i].old_y = state.rodTip.y;
        }
        state.hook.x = state.rodTip.x;
        state.hook.y = state.rodTip.y + 24;
    }

    updatePhysics();
    if (state.isTutorialMode) {
        updateTutorial();
    }

    let mouseOffsetX = (state.mouseX - state.logicalWidth / 2) * 0.15;
    let mouseOffsetY = (state.mouseY - state.logicalHeight / 2) * 0.15;

    let targetZoom = 1.0;
    if (state.developerZoomOverride !== null) {
        targetZoom = state.developerZoomOverride;
        if (state.gameState === 'HOME' || state.gameState === 'INTRO') {
            let midPoint = (state.logicalWidth / 2 - 900 + state.boatWorldX) / 2;
            let targetCamX = midPoint - state.logicalWidth / 2;
            state.cameraY += (400 - state.logicalHeight / 2 - 130 - state.cameraY) * 0.08; // waterSurfaceY = 400
            state.cameraX += (targetCamX - state.cameraX) * 0.08;
        } else {
            let minCamY = (state.hook.y < 400) ? -1200 : 0;
            let targetCamY = Math.max(minCamY, state.hook.y - state.logicalHeight / 2 + mouseOffsetY - 50);
            state.cameraY += (targetCamY - state.cameraY) * 0.08;

            let targetCamX = state.hook.x - state.logicalWidth / 2 + mouseOffsetX;
            state.cameraX += (targetCamX - state.cameraX) * 0.08;
        }
    } else if (state.gameState === 'HOME' || state.gameState === 'INTRO') {
        let midPoint = (state.logicalWidth / 2 - 900 + state.boatWorldX) / 2;
        let targetCamX = midPoint - state.logicalWidth / 2;
        
        state.cameraY += (400 - state.logicalHeight / 2 - 130 - state.cameraY) * 0.08;
        state.cameraX += (targetCamX - state.cameraX) * 0.08;
        
        targetZoom = Math.max(0.55, Math.min(0.9, state.logicalWidth / 1150));
    } else {
        let minCamY = (state.hook.y < 400) ? -1200 : 0;
        let targetCamY = Math.max(minCamY, state.hook.y - state.logicalHeight / 2 + mouseOffsetY - 50);
        state.cameraY += (targetCamY - state.cameraY) * 0.08;

        let targetCamX = state.hook.x - state.logicalWidth / 2 + mouseOffsetX;
        state.cameraX += (targetCamX - state.cameraX) * 0.08;
        
        targetZoom = 1.0;
    }

    state.cameraZoom += (targetZoom - state.cameraZoom) * 0.04;

    let depthVal = Math.max(0, (state.hook.y - 400) / 10);
    const persistentDepthEl = document.getElementById('persistent-depth');
    if (persistentDepthEl) {
        persistentDepthEl.textContent = Math.floor(depthVal);
    }
    
    const dotLine = document.getElementById('depth-dot-line');
    if (dotLine) {
        dotLine.style.backgroundPositionY = `${-(depthVal * 2.0) % 5}px`; // PIXELS_PER_METER = 2.0
    }

    AudioManager.updateAmbient(depthVal);
    if (depthVal > state.playerStats.maxDepthReached) {
        state.playerStats.maxDepthReached = depthVal;
    }

    if (state.msgTimer > 0) {
        state.msgTimer--;
        if (state.msgTimer <= 0) {
            const messageBoxEl = document.getElementById('message-box');
            if (messageBoxEl) messageBoxEl.classList.add('hidden');
        }
    }

    state.clouds.forEach(c => {
        c.x += c.speed;
    });

    state.ambientParticles.forEach(p => {
        p.update();
    });

    drawEngine();
    loopId = requestAnimationFrame(gameLoop);
}

function drawEngine() {
    let maxD = state.isTutorialMode ? 900 : 5600;
    let nowDraw = Date.now();
    const dpr = window.devicePixelRatio || 1;

    ctx.save();
    ctx.scale(dpr, dpr);
    
    ctx.clearRect(0, 0, state.logicalWidth, state.logicalHeight);
    
    let dayAmount = Math.max(0, -Math.cos(state.cycleTime * Math.PI * 2));
    let twilightAmount = Math.abs(Math.sin(state.cycleTime * Math.PI * 2));
    let twilightAlpha = twilightAmount * Math.min(1, (1 - dayAmount) * 2);

    let skyBottom = 400 - state.cameraY; // waterSurfaceY = 400

    let Z = state.cameraZoom;
    let cx = state.logicalWidth / 2;
    let cy = state.logicalHeight / 2;
    let minX = cx - (cx / Z) - 200;
    let maxX = cx + (cx / Z) + 200;
    let minY = cy - (cy / Z) - 200;
    let maxY = cy + (cy / Z) + 200;
    let drawWidth = maxX - minX;

    function getDepthColor(y) {
        let maxD = state.isTutorialMode ? 900 : 5600;
        let ratio = Math.max(0, Math.min(1, (y - 400) / (maxD - 400)));
        let lightInfluence = dayAmount * Math.max(0, 1 - ratio * 5); 
        let r = Math.floor(2 + lightInfluence * 20);
        let g = Math.floor(8 + lightInfluence * 80);
        let b = Math.floor(18 + lightInfluence * 140);
        let darkFactor = 1 - Math.min(1, ratio * 2.5); 
        return "rgb(" + Math.floor(r * darkFactor) + "," + Math.floor(g * darkFactor) + "," + Math.floor(b * darkFactor) + ")";
    }

    ctx.save(); 
    ctx.translate(cx, cy);
    ctx.scale(Z, Z);
    ctx.translate(-cx, -cy);

    ctx.fillStyle = '#050810'; 
    ctx.fillRect(minX, minY, drawWidth, maxY - minY);

    let starAlpha = 1 - dayAmount - twilightAlpha * 0.5;
    if(starAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = starAlpha;
        ctx.fillStyle = '#fff';
        state.stars.forEach(s => {
            let sx = s.x - state.cameraX * 0.05; 
            sx = ((sx % drawWidth) + drawWidth) % drawWidth + minX;
            let sy = s.y - state.cameraY * 0.3; 
            if(sy < skyBottom + 50 && sy > minY) ctx.fillRect(sx, sy, s.size, s.size);
        });
        ctx.restore();
    }

    if (twilightAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = twilightAlpha;
        let twGrad = ctx.createLinearGradient(0, minY, 0, skyBottom);
        twGrad.addColorStop(0, '#1e1b4b');
        twGrad.addColorStop(0.5, '#7e22ce');
        twGrad.addColorStop(1, '#f43f5e');
        ctx.fillStyle = twGrad;
        ctx.fillRect(minX, minY, drawWidth, Math.max(0, skyBottom + 50 - minY));
        ctx.restore();
    }

    if (dayAmount > 0) {
        ctx.save();
        ctx.globalAlpha = dayAmount;
        let dayGrad = ctx.createLinearGradient(0, minY, 0, skyBottom);
        dayGrad.addColorStop(0, '#38bdf8');
        dayGrad.addColorStop(1, '#bae6fd');
        ctx.fillStyle = dayGrad;
        ctx.fillRect(minX, minY, drawWidth, Math.max(0, skyBottom + 50 - minY));
        ctx.restore();
    }

    let sunAngle = (state.cycleTime - 0.25) * Math.PI * 2;
    let sunX = state.logicalWidth/2 + Math.sin(sunAngle) * state.logicalWidth * 0.4 - state.cameraX*0.05;
    let sunY = skyBottom + 100 - Math.cos(sunAngle) * 350;

    if (Math.cos(sunAngle) > -0.2) {
        ctx.beginPath(); ctx.arc(sunX, sunY, 40, 0, Math.PI*2);
        ctx.fillStyle = "rgba(253, 224, 71, " + (dayAmount + twilightAlpha) + ")";
        ctx.shadowBlur = 50; ctx.shadowColor = '#fde047'; ctx.fill(); ctx.shadowBlur = 0;
    }

    let moonAngle = sunAngle + Math.PI;
    let moonX = state.logicalWidth/2 + Math.sin(moonAngle) * state.logicalWidth * 0.4 - state.cameraX*0.05;
    let moonY = skyBottom + 100 - Math.cos(moonAngle) * 350;
    if (Math.cos(moonAngle) > -0.2) {
        ctx.beginPath(); ctx.arc(moonX, moonY, 30, 0, Math.PI*2);
        ctx.fillStyle = "rgba(226, 232, 240, " + (1 - dayAmount) + ")";
        ctx.shadowBlur = 30; ctx.shadowColor = '#e2e8f0'; ctx.fill(); ctx.shadowBlur = 0;
    }

    if (state.currentRainIntensity > 0 && skyBottom > minY) {
        ctx.fillStyle = "rgba(40, 50, 65, " + (state.currentRainIntensity * 0.6) + ")";
        ctx.fillRect(minX, minY, drawWidth, skyBottom + 50 - minY);
    }

    state.clouds.forEach(c => {
        let cx_val = (c.x - state.cameraX * 0.1); 
        cx_val = ((cx_val % 5000) + 5000) % 5000 - 1000;
        let cy_val = c.y - state.cameraY * 0.05;

        if (cy_val < skyBottom + 100 && cy_val > minY - 100) {
            ctx.fillStyle = "rgba(255, 255, 255, " + (c.opacity * (dayAmount * 0.8 + 0.2)) + ")";
            ctx.beginPath();
            ctx.arc(cx_val, cy_val, 30 * c.scale, 0, Math.PI * 2);
            ctx.arc(cx_val + 40 * c.scale, cy_val + 10 * c.scale, 25 * c.scale, 0, Math.PI * 2);
            ctx.arc(cx_val - 35 * c.scale, cy_val + 15 * c.scale, 20 * c.scale, 0, Math.PI * 2);
            ctx.arc(cx_val + 15 * c.scale, cy_val - 15 * c.scale, 22 * c.scale, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    if (state.gameState === 'HOME' || state.gameState === 'INTRO' || state.cameraX < state.logicalWidth / 2) {
        let islandX = state.logicalWidth / 2 - 1000 - state.cameraX;
        let islandY = 400 - state.cameraY; 
        
        // Render tree first (behind island) with a subtle swaying animation
        let treeX = islandX - 25;
        let treeBaseY = islandY + 25;
        
        ctx.save();
        ctx.translate(treeX, treeBaseY);
        let sway = Math.sin(nowDraw * 0.0015) * 0.035; // subtle sway
        ctx.rotate(sway);
        
        ctx.strokeStyle = '#4e3e35'; 
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0); 
        ctx.quadraticCurveTo(-18, -120, -5, -150);
        ctx.stroke();

        let leafX = -5;
        let leafY = -150;
        ctx.fillStyle = '#48bb78'; 
        
        ctx.beginPath();
        ctx.ellipse(leafX - 18, leafY - 4, 16, 7, -Math.PI/6, 0, Math.PI*2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(leafX + 18, leafY - 4, 16, 7, Math.PI/6, 0, Math.PI*2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(leafX, leafY - 14, 7, 15, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = '#2f2520';
        ctx.beginPath();
        ctx.arc(leafX - 4, leafY, 4.5, 0, Math.PI*2);
        ctx.arc(leafX + 4, leafY + 2, 4, 0, Math.PI*2);
        ctx.fill();
        
        ctx.restore();

        // Render island second (in front of tree base) with clean sand color
        ctx.fillStyle = '#eed19c';
        ctx.beginPath();
        ctx.moveTo(islandX - 220, islandY + 25);
        ctx.quadraticCurveTo(islandX - 10, islandY - 95, islandX + 180, islandY + 25);
        ctx.closePath();
        ctx.fill();
    }

    let introFade = Math.max(0, Math.min(1, (state.logicalWidth / 2 - state.boatWorldX) / 800));
    if (state.gameState === 'HOME' || (state.gameState === 'INTRO' && introFade > 0)) {
        let START_UI_X_OFFSET = -850; 
        let uiX = state.logicalWidth / 2 + START_UI_X_OFFSET - state.cameraX;
        let uiY = 400 - 220 - state.cameraY; 

        ctx.save();
        ctx.globalAlpha = introFade;

        // Title - clean white, no text shadow
        ctx.font = "900 52px 'Inter', sans-serif";
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText("THE FISHERMAN", uiX, uiY);

        let cx = state.logicalWidth / 2;
        let cy = state.logicalHeight / 2;
        let Z = state.cameraZoom;

        let screenBtnX = (state.logicalWidth / 2 + START_UI_X_OFFSET - state.cameraX);
        let startBtnX = screenBtnX - 100;
        let tutorialBtnX = screenBtnX + 100;
        let startBtnY = (400 - 150 - state.cameraY);
        let tutorialBtnY = (400 - 150 - state.cameraY);
        
        let startProjX = (startBtnX - cx) * Z + cx;
        let startProjY = (startBtnY - cy) * Z + cy;
        let tutorialProjX = (tutorialBtnX - cx) * Z + cx;
        let tutorialProjY = (tutorialBtnY - cy) * Z + cy;

        let btnW = 160 * Z;
        let btnH = 40 * Z;

        let dxStart = state.mouseX - startProjX;
        let dyStart = state.mouseY - startProjY;
        let dxTutorial = state.mouseX - tutorialProjX;
        let dyTutorial = state.mouseY - tutorialProjY;

        let isStartHovered = (Math.abs(dxStart) < btnW / 2 && Math.abs(dyStart) < btnH / 2 && state.gameState === 'HOME');
        let isTutorialHovered = (Math.abs(dxTutorial) < btnW / 2 && Math.abs(dyTutorial) < btnH / 2 && state.gameState === 'HOME');
 
        const cursorDot = document.getElementById('cursor-dot');
        if (cursorDot) {
            if (isStartHovered || isTutorialHovered) {
                cursorDot.style.width = '14px';
                cursorDot.style.height = '14px';
            } else {
                cursorDot.style.width = '8px';
                cursorDot.style.height = '8px';
            }
        }

        ctx.save();
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.font = "900 24px monospace";
        
        // Start Button ("GAME")
        ctx.fillStyle = isStartHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
        ctx.fillText("GAME", startBtnX, startBtnY);
        if (isStartHovered) {
            let textW = ctx.measureText("GAME").width;
            ctx.beginPath();
            ctx.moveTo(startBtnX - textW/2, startBtnY + 12);
            ctx.lineTo(startBtnX + textW/2, startBtnY + 12);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.0; // 1px clean line
            ctx.stroke();
        }

        // Tutorial Button ("TUTORIAL")
        ctx.fillStyle = isTutorialHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
        ctx.fillText("TUTORIAL", tutorialBtnX, tutorialBtnY);
        if (isTutorialHovered) {
            let textW = ctx.measureText("TUTORIAL").width;
            ctx.beginPath();
            ctx.moveTo(tutorialBtnX - textW/2, tutorialBtnY + 12);
            ctx.lineTo(tutorialBtnX + textW/2, tutorialBtnY + 12);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.0; // 1px clean line
            ctx.stroke();
        }
        ctx.restore();
        ctx.restore();
    }

    if (!state.boatBroken) {
        ctx.save();
        ctx.translate(state.boatWorldX - state.cameraX, 400 - state.cameraY + state.boatBob); 
        ctx.rotate(state.boatTilt);

        let bColor = storeInventory.boatColors.find(c => c.id === state.playerEquipment.boatColor).color;
        ctx.fillStyle = bColor;

        if (state.playerEquipment.boatType === 'wood' || state.playerEquipment.boatType === 'dory') {
            let hullWidth = state.playerEquipment.boatType === 'dory' ? 80 : 70;
            let hullDepth = state.playerEquipment.boatType === 'dory' ? 25 : 20;
            ctx.beginPath(); 
            ctx.moveTo(-hullWidth, -10); 
            ctx.lineTo(hullWidth, -10); 
            ctx.lineTo(hullWidth - 20, hullDepth); 
            ctx.lineTo(-(hullWidth - 20), hullDepth); 
            ctx.closePath(); ctx.fill();
            
            ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-hullWidth + 10, 0); ctx.lineTo(hullWidth - 10, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-hullWidth + 15, 10); ctx.lineTo(hullWidth - 15, 10); ctx.stroke();
        } else if (state.playerEquipment.boatType === 'punt') {
            ctx.beginPath(); 
            ctx.moveTo(-85, -12); ctx.lineTo(85, -12); 
            ctx.lineTo(85, 18); ctx.lineTo(-85, 18); 
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
            ctx.strokeRect(-85, -2, 170, 10);
        } else if (state.playerEquipment.boatType === 'canoe') {
            ctx.beginPath();
            ctx.moveTo(-90, -10);
            ctx.lineTo(90, -10);
            ctx.quadraticCurveTo(0, 55, -90, -10);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-69, 0); ctx.lineTo(69, 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-50, 10); ctx.lineTo(50, 10); ctx.stroke();
        } else if (state.playerEquipment.boatType === 'schooner') {
            ctx.beginPath(); 
            ctx.moveTo(-110, -25); ctx.lineTo(110, -25); 
            ctx.lineTo(80, 25); ctx.lineTo(-90, 25); 
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = bColor; 
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.fillRect(-60, -45, 80, 20);
            ctx.restore();
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-100, -10); ctx.lineTo(97, -10); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-95, 0); ctx.lineTo(93, 0); ctx.stroke();
        }

        let manOffset = BOAT_OFFSETS[state.playerEquipment.boatType] || 0;
        ctx.save();
        ctx.translate(0, manOffset);

        let flipScale = state.manFacingRight ? 1 : -1;
        ctx.save();
        ctx.translate(-15, 0);
        ctx.scale(flipScale, 1);

        // Draw Head base
        ctx.fillStyle = '#ffcc80'; 
        ctx.beginPath(); 
        ctx.arc(0, -35, 10, 0, Math.PI*2); 
        ctx.fill(); 

        // Draw Shirt
        let sColor = storeInventory.shirts.find(c => c.id === state.playerEquipment.shirt).color;
        ctx.fillStyle = sColor; ctx.fillRect(-10, -25, 20, 15); 

        let activeShirtId = state.playerEquipment.shirt;
        if (activeShirtId === 'yellow') {
            ctx.strokeStyle = '#854d0e';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -25);
            ctx.lineTo(0, -10);
            ctx.stroke();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.moveTo(-10, -25);
            ctx.quadraticCurveTo(-14, -18, -10, -14);
            ctx.fill();
        } else if (activeShirtId === 'stripes') {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-10, -21); ctx.lineTo(10, -21);
            ctx.moveTo(-10, -15); ctx.lineTo(10, -15);
            ctx.stroke();
        } else if (activeShirtId === 'flannel') {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.moveTo(-5, -25); ctx.lineTo(-5, -10);
            ctx.moveTo(0, -25); ctx.lineTo(0, -10);
            ctx.moveTo(5, -25); ctx.lineTo(5, -10);
            ctx.moveTo(-10, -21); ctx.lineTo(10, -21);
            ctx.moveTo(-10, -15); ctx.lineTo(10, -15);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        } else if (activeShirtId === 'suspenders') {
            ctx.fillStyle = '#5c4033'; 
            ctx.fillRect(-6, -25, 3, 15);
            ctx.fillRect(3, -25, 3, 15);
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(-4.5, -18, 1, 0, Math.PI * 2);
            ctx.arc(4.5, -18, 1, 0, Math.PI * 2);
            ctx.fill();
        } else if (activeShirtId === 'tuxedo') {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(-4, -25);
            ctx.lineTo(4, -25);
            ctx.lineTo(0, -15);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.moveTo(-1.5, -24);
            ctx.lineTo(1.5, -24);
            ctx.lineTo(2, -18);
            ctx.lineTo(0, -14); 
            ctx.lineTo(-2, -18);
            ctx.closePath();
            ctx.fill();
        } else if (activeShirtId === 'black') {
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -25);
            ctx.lineTo(0, -18);
            ctx.stroke();
        }

        if (state.playerEquipment.hat === 'none') {
            // Bareheaded
        } else if (state.playerEquipment.hat === 'cap') {
            ctx.fillStyle = '#ef4444'; 
            ctx.beginPath(); 
            ctx.arc(0, -39, 10, Math.PI, 0); 
            ctx.fill();
            ctx.fillRect(-10, -40, 12, 2.5);
            ctx.fillRect(0, -40, 17, 2.5);
        } else if (state.playerEquipment.hat === 'straw') {
            ctx.fillStyle = '#d4af37'; 
            ctx.fillRect(-18, -44, 36, 3); 
            ctx.beginPath(); 
            ctx.arc(0, -44, 8, Math.PI, 0); 
            ctx.fill();
            ctx.fillStyle = '#b41c1c'; 
            ctx.fillRect(-8, -47, 16, 3); 
        } else if (state.playerEquipment.hat === 'beanie') {
            ctx.fillStyle = '#22c55e'; 
            ctx.beginPath(); ctx.arc(0, -40, 10.5, Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#fef08a'; 
            ctx.beginPath(); ctx.arc(0, -50, 3.5, 0, Math.PI*2); ctx.fill(); 
        } else if (state.playerEquipment.hat === 'captain') {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, -40, 10.5, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-11, -41, 22, 3.5);
            ctx.fillStyle = '#eab308';
            ctx.beginPath();
            ctx.arc(0, -43.5, 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, -41, 16, 3);
        } else if (state.playerEquipment.hat === 'bandana') {
            ctx.fillStyle = '#b91c1c';
            ctx.beginPath();
            ctx.arc(0, -42, 9, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(-10, -43, 20, 4);
            ctx.beginPath();
            ctx.moveTo(-10, -41);
            ctx.lineTo(-14, -38);
            ctx.lineTo(-11, -36);
            ctx.closePath();
            ctx.fill();
        } else if (state.playerEquipment.hat === 'crown') {
            ctx.fillStyle = '#4e342e'; 
            ctx.beginPath();
            ctx.arc(0, -39, 8, Math.PI, 0);
            ctx.fill();

            ctx.fillStyle = '#eab308';
            ctx.beginPath();
            ctx.moveTo(-10, -39);
            ctx.lineTo(-10, -48);
            ctx.lineTo(-5, -43);
            ctx.lineTo(0, -51);
            ctx.lineTo(5, -43);
            ctx.lineTo(10, -48);
            ctx.lineTo(10, -39);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#ca8a04'; 
            ctx.beginPath();
            ctx.fillRect(-10, -41, 20, 2);
            ctx.fill();
        }

        let bScreenX = (state.gameState === 'HOME' || state.gameState === 'INTRO') ? (state.boatWorldX - state.cameraX) : (state.logicalWidth / 2);
        let bScreenY = 400 - state.cameraY + state.boatBob; // waterSurfaceY = 400
        let hLocalX = -15 * flipScale;
        let hLocalY = -35 + manOffset;
        let hScreenX = bScreenX + hLocalX * Math.cos(state.boatTilt) - hLocalY * Math.sin(state.boatTilt);
        let hScreenY = bScreenY + hLocalX * Math.sin(state.boatTilt) + hLocalY * Math.cos(state.boatTilt);
        let hProjX = (hScreenX - (state.logicalWidth / 2)) * state.cameraZoom + (state.logicalWidth / 2);
        let hProjY = (hScreenY - (state.logicalHeight / 2)) * state.cameraZoom + (state.logicalHeight / 2);
        
        let angleToMouse;
        if (state.gameState === 'PULLING') {
            let dx = state.pullCurrentX - state.pullStartX;
            let dy = state.pullCurrentY - state.pullStartY;
            angleToMouse = Math.atan2(-dy, -dx);
        } else {
            angleToMouse = Math.atan2(state.mouseY - hProjY, state.mouseX - hProjX);
        }
        
        let localAngle = angleToMouse - state.boatTilt;
        if (!state.manFacingRight) {
            localAngle = Math.PI - localAngle;
        }
        
        let eyeXOffset = 2.5 + Math.cos(localAngle) * 2.5;
        let eyeYOffset = Math.sin(localAngle) * 2.0;

        // Mustache
        ctx.save();
        let mcx = eyeXOffset;
        let mcy = -31.0 + eyeYOffset; 
        ctx.translate(mcx, mcy);

        ctx.fillStyle = '#120a08'; 
        ctx.strokeStyle = '#050201'; 
        ctx.lineWidth = 0.5;
        ctx.lineJoin = 'round';

        let tingleX = 0;
        let tingleY = 0;
        if (state.fishermanSpeechTimer > 120) {
            tingleY = Math.sin(Date.now() / 35) * 1.0;
            tingleX = Math.cos(Date.now() / 35) * 0.5;
        }

        ctx.beginPath();
        ctx.moveTo(0, 1.0); 
        let leftTipX = -8.5 + tingleX;
        let leftTipY = 2.0 + tingleY; 
        ctx.bezierCurveTo(-3, 2.0, -6, 2.5, leftTipX, leftTipY);
        ctx.bezierCurveTo(-6, -1.5, -3, -2.5, 0, -0.5); 
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, 1.0); 
        let rightTipX = 8.5 - tingleX;
        let rightTipY = 2.0 + tingleY; 
        ctx.bezierCurveTo(3, 2.0, 6, 2.5, rightTipX, rightTipY);
        ctx.bezierCurveTo(6, -1.5, 3, -2.5, 0, -0.5); 
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        let isBlinking = (Date.now() % 4000) < 150; 
        let isAiming = (state.gameState === 'PULLING');

        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.2;

        if (isBlinking || isAiming) {
            ctx.beginPath();
            ctx.moveTo(eyeXOffset - 3.5, -35 + eyeYOffset);
            ctx.lineTo(eyeXOffset - 0.5, -35 + eyeYOffset);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(eyeXOffset - 2, -35 + eyeYOffset, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        if (isBlinking) {
            ctx.beginPath();
            ctx.moveTo(eyeXOffset + 0.5, -35 + eyeYOffset);
            ctx.lineTo(eyeXOffset + 3.5, -35 + eyeYOffset);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(eyeXOffset + 2, -35 + eyeYOffset, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        let activeRodColor = '#607d8b';
        if (state.playerEquipment.rod === 'carbon_rod') activeRodColor = '#374151';
        if (state.playerEquipment.rod === 'titan_rod') activeRodColor = '#94a3b8';
        if (state.playerEquipment.rod === 'mythic_rod') activeRodColor = '#e2e8f0';

        ctx.strokeStyle = activeRodColor; ctx.lineWidth = 4;
        let rx_neutral = 40;
        let ry_neutral = -50;
        let rx_rotated = rx_neutral * Math.cos(state.rodRotation) - ry_neutral * Math.sin(state.rodRotation);
        let ry_rotated = rx_neutral * Math.sin(state.rodRotation) + ry_neutral * Math.cos(state.rodRotation);

        ctx.beginPath(); 
        ctx.moveTo(10, -15); 
        ctx.lineTo(10 + rx_rotated, -15 + ry_rotated); 
        ctx.stroke();

        let hasForbiddenBadge = state.playerStats.forbiddenMammalEarned;
        if (hasForbiddenBadge) {
            ctx.save();
            ctx.translate(10 + rx_rotated, -15 + ry_rotated); 
            let pulse = Math.sin(nowDraw / 200) * 2 + 7.5; 
            ctx.beginPath();
            ctx.arc(0, 0, pulse, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd700';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ffd700';
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(0, 0, pulse * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.restore();
        }

        ctx.restore(); 
        
        let currentY = -10; 
        const gapBetweenEdges = 0; 

        state.caughtFishStack.forEach((f) => {
            if (f.creatureType !== 'dolphin') {
                let ry = f.size * 0.15; 
                currentY -= ry; 
                
                ctx.fillStyle = f.color;
                ctx.beginPath();
                ctx.ellipse(25, currentY, f.size * 0.4, ry, 0, 0, Math.PI * 2);
                ctx.fill();
                
                currentY -= (ry + gapBetweenEdges); 
            }
        });
        
        if (state.fishermanSpeechTimer > 0) {
            state.fishermanSpeechTimer--;
            ctx.save();
            ctx.translate(-15, -85); 
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let alpha = Math.min(1.0, state.fishermanSpeechTimer / 30);
            ctx.font = "bold 11px 'Courier New', monospace";
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            
            ctx.fillText(state.fishermanSpeech.toUpperCase(), 0, 0);
            ctx.restore();
        }

        if (state.gameState !== 'HOME' && state.gameState !== 'GAMEOVER') {
            ctx.save();
            ctx.translate(-15, -62);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.font = "bold 12px 'Courier New', monospace";
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`$${state.playerMoney.toLocaleString()}`, 0, -6);

            ctx.font = "bold 10px 'Courier New', monospace";
            let warningColor = state.playerHooks <= 3 ? '#ef4444' : '#ffffff';
            ctx.fillStyle = warningColor;
            ctx.fillText(`H: ${state.playerHooks}`, 0, 6);
            
            ctx.restore();
        }

        ctx.restore(); 
        ctx.restore(); 
    }

    state.fishList.forEach(f => {
        if (f.isBird && f.y < 400) f.draw(ctx); // waterSurfaceY = 400
    });

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(minX, maxY); 
    ctx.lineTo(minX, Math.max(minY, skyBottom)); 
    
    for(let x = minX - 20; x <= maxX + 20; x += 20) {
        let worldX = x + state.cameraX;
        let wave = Math.sin(worldX * 0.02 + nowDraw * 0.002) * 4 + Math.sin(worldX * 0.008 + nowDraw * 0.001) * 6;
        let wy = skyBottom + wave;
        ctx.lineTo(x, wy); 
    }
    
    ctx.lineTo(maxX + 20, maxY); 
    ctx.lineTo(minX - 20, maxY); 
    ctx.closePath();
    ctx.clip(); 

    let waterVisibleTop = Math.max(minY, skyBottom - 50); 
    let depthGrad = ctx.createLinearGradient(0, waterVisibleTop, 0, maxY);
    depthGrad.addColorStop(0, getDepthColor(Math.max(400, state.cameraY + minY)));
    depthGrad.addColorStop(1, getDepthColor(state.cameraY + maxY));
    ctx.fillStyle = depthGrad;
    ctx.fillRect(minX, minY, drawWidth, maxY - minY); 

    state.ambientParticles.forEach(p => p.draw(ctx));
    state.wakeParticles.forEach(wp => wp.draw(ctx, state.cameraX, state.cameraY));

    if (dayAmount > 0 && skyBottom < maxY) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 7; i++) {
            let rayX = (Math.sin(nowDraw * 0.0003 + i * 2) * 500) + (state.logicalWidth / 2) - (state.cameraX * 0.15 * (i%2 ? 1 : -1));
            rayX = ((rayX % (drawWidth + 1500)) + (drawWidth + 1500)) % (drawWidth + 1500) - 750 + minX;

            let rayGrad = ctx.createLinearGradient(rayX, waterVisibleTop, rayX + 400, waterVisibleTop + 1200);
            rayGrad.addColorStop(0, "rgba(120, 200, 255, " + (dayAmount * 0.015) + ")"); 
            rayGrad.addColorStop(1, 'rgba(120, 200, 255, 0)');

            ctx.fillStyle = rayGrad;
            ctx.beginPath();
            ctx.moveTo(rayX, waterVisibleTop); 
            ctx.lineTo(rayX + (100 + i * 20), waterVisibleTop);
            ctx.lineTo(rayX + 500, waterVisibleTop + 1200);
            ctx.lineTo(rayX + 200, waterVisibleTop + 1200);
            ctx.fill();
        }
        ctx.restore();
    }

    let floorY = maxD - state.cameraY; // maxDepth = 5600
    if (floorY < maxY && floorY > minY) {
        let floorGlow = ctx.createLinearGradient(0, floorY - 150, 0, floorY);
        floorGlow.addColorStop(0, 'rgba(10, 16, 24, 0)');
        floorGlow.addColorStop(1, 'rgba(15, 25, 20, 0.6)');
        ctx.fillStyle = floorGlow;
        ctx.fillRect(minX, floorY - 150, drawWidth, 150);

        ctx.fillStyle = '#050a08'; 
        ctx.beginPath();
        ctx.moveTo(minX, maxY);
        for(let x = minX; x <= maxX + 50; x += 30) {
            let worldX = x + state.cameraX;
            let rockHeight = Math.sin(worldX * 0.04) * 12 + Math.sin(worldX * 0.015) * 20;
            ctx.lineTo(x, floorY + 10 + rockHeight);
        }
        ctx.lineTo(maxX, maxY);
        ctx.closePath();
        ctx.fill();
    }

    for(let i=state.particles.length-1; i>=0; i--) {
        state.particles[i].update();
        if(state.particles[i].life <= 0) state.particles.splice(i, 1);
    }
    
    for(let i=state.wakeParticles.length-1; i>=0; i--) {
        state.wakeParticles[i].update();
        if(state.wakeParticles[i].life <= 0) state.wakeParticles.splice(i, 1);
    }

    let closestFish = [];
    if (state.gameState === 'SINKING' || state.gameState === 'WAITING') {
        closestFish = state.fishList
            .filter(f => !f.isDead && !f.isBird)
            .map(f => {
                let dx = state.hook.x - f.x;
                let dy = state.hook.y - f.y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                return { fish: f, dist: dist };
            })
            .filter(item => item.dist < 350) 
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 3) 
            .map(item => item.fish);
    }
    
    for(let i = state.fishList.length - 1; i >= 0; i--) {
        let f = state.fishList[i];
        let isClosestCandidate = closestFish.includes(f);
        f.update(isClosestCandidate);

        let maxD = state.isTutorialMode ? 900 : 5600;
        if (f.isDead && (f.decayLife <= 0 || f.y >= maxD)) { // maxDepth = 5600
            let isBird = f.isBird;
            if (f.laneIndex !== undefined) {
                freeLaneIndex(f.isBird, f.laneIndex);
            }
            state.fishList.splice(i, 1);
            
            if (!state.isTutorialMode) {
                let replacement = new Fish(isBird);
                replacement.reset(true); 
                state.fishList.push(replacement); 
            }
        }
    }

    state.fishList.forEach(f => {
        if (!f.isBird || (f.isBird && f.y >= 400)) f.draw(ctx); // waterSurfaceY = 400
    });

    let hookDepthRatio = Math.max(0, Math.min(1, (state.hook.y - 400) / (maxD - 400)));
    let glowIntensity = Math.min(1, hookDepthRatio * 2.5); 
    
    if (glowIntensity > 0.05) {
        let hookScreenX = state.hook.x - state.cameraX;
        let hookScreenY = state.hook.y - state.cameraY;
        let pulse = Math.sin(nowDraw * 0.003) * 0.1 + 0.9;
        let radius = 250 * pulse;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        let glowGrad = ctx.createRadialGradient(hookScreenX, hookScreenY, 0, hookScreenX, hookScreenY, radius);
        glowGrad.addColorStop(0, "rgba(100, 200, 255, " + (0.4 * glowIntensity) + ")");
        glowGrad.addColorStop(0.3, "rgba(50, 100, 220, " + (0.15 * glowIntensity) + ")");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(hookScreenX, hookScreenY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    ctx.restore(); 

    ctx.strokeStyle = "rgba(255, 255, 255, " + (0.15 + dayAmount * 0.2) + ")";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for(let x = minX - 20; x <= maxX + 20; x += 20) {
        let worldX = x + state.cameraX;
        let wave = Math.sin(worldX * 0.02 + nowDraw * 0.002) * 4 + Math.sin(worldX * 0.008 + nowDraw * 0.001) * 6;
        if(x === minX - 20) ctx.moveTo(x, skyBottom + wave);
        else ctx.lineTo(x, skyBottom + wave);
    }
    ctx.stroke();

    if (state.currentRainIntensity > 0) {
        state.rainParticles.forEach(p => p.draw(ctx, state.cameraX, state.cameraY));
    }
    state.particles.forEach(p => p.draw(ctx));

    const isHooklessEndState = (state.playerHooks <= 0);
    if (!state.boatBroken) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (state.ropePoints[0]) {
            let numPoints = state.ropePoints.length;
            ctx.moveTo(state.ropePoints[0].x - state.cameraX, state.ropePoints[0].y - state.cameraY);
            
            for (let i = 1; i < numPoints - 2; i++) {
                let xc = (state.ropePoints[i].x + state.ropePoints[i + 1].x) / 2;
                let yc = (state.ropePoints[i].y + state.ropePoints[i + 1].y) / 2;
                ctx.quadraticCurveTo(state.ropePoints[i].x - state.cameraX, state.ropePoints[i].y - state.cameraY, xc - state.cameraX, yc - state.cameraY);
            }
            if (numPoints >= 2) {
                let pPenultimate = state.ropePoints[numPoints - 2];
                let pLast = state.ropePoints[numPoints - 1];
                ctx.quadraticCurveTo(
                    pPenultimate.x - state.cameraX, pPenultimate.y - state.cameraY,
                    pLast.x - state.cameraX, pLast.y - state.cameraY
                );
            }
            ctx.stroke();
        }

        if (!isHooklessEndState) {
            ctx.save();
            ctx.translate(state.hook.x - state.cameraX, state.hook.y - state.cameraY);
            let hookAngle = state.hook.vx * 0.1;
            if (state.hook.vy > 0 && state.gameState !== 'CASTING') hookAngle -= state.hook.vy * 0.05; 
            else if (state.hook.vy < 0) hookAngle += state.hook.vy * 0.05;
            ctx.rotate(hookAngle);
            
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 10); ctx.stroke(); 
            ctx.beginPath(); ctx.arc(-4, 10, 4, 0, Math.PI); ctx.stroke(); 
            ctx.beginPath(); ctx.moveTo(-8, 10); ctx.lineTo(-6, 7); ctx.stroke(); 
            ctx.restore();
        }
    }

    state.brokenHooks.forEach(bh => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, bh.decayLife);
        ctx.translate(bh.x - state.cameraX, bh.y - state.cameraY);
        ctx.rotate(bh.angle);
        
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 10); ctx.stroke(); 
        ctx.beginPath(); ctx.arc(-4, 10, 4, 0, Math.PI); ctx.stroke(); 
        ctx.beginPath(); ctx.moveTo(-8, 10); ctx.lineTo(-6, 7); ctx.stroke(); 
        ctx.restore();
    });

    if (state.gameState === 'PULLING') {
        let dx = state.pullCurrentX - state.pullStartX;
        let dy = state.pullCurrentY - state.pullStartY;
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 180) { // MAX_PULL_DIST = 180
            dx = (dx / dist) * 180;
            dy = (dy / dist) * 180;
        }
        
        let angle = Math.atan2(-dy, -dx);
        let coneLen = Math.min(220, dist * 1.6); 
        let angleStart = angle - 0.28 / 2; // THROW_SPREAD = 0.28
        let angleEnd = angle + 0.28 / 2;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(state.rodTip.x - state.cameraX, state.rodTip.y - state.cameraY);
        ctx.lineTo(
            state.rodTip.x - state.cameraX + Math.cos(angleStart) * coneLen,
            state.rodTip.y - state.cameraY + Math.sin(angleStart) * coneLen
        );
        ctx.arc(
            state.rodTip.x - state.cameraX,
            state.rodTip.y - state.cameraY,
            coneLen,
            angleStart,
            angleEnd
        );
        ctx.lineTo(state.rodTip.x - state.cameraX, state.rodTip.y - state.cameraY);
        ctx.closePath();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(state.rodTip.x - state.cameraX, state.rodTip.y - state.cameraY);
        ctx.lineTo(
            state.rodTip.x - state.cameraX + Math.cos(angle) * coneLen,
            state.rodTip.y - state.cameraY + Math.sin(angle) * coneLen
        );
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.setLineDash([2, 4]);
        ctx.stroke();

        ctx.restore();
    }

    if (state.gameState === 'REELING' && state.hookedFish) {
        let fx = state.hookedFish.x - state.cameraX;
        let fy = state.hookedFish.y - state.cameraY - state.hookedFish.size * 0.5 - 20; 

        let barW = 80;
        let barH_stamina = 4;
        let barH_tension = 6;
        let gap = 4;
        let px = fx - barW / 2;
        let py = fy;

        if (px < 10) px = 10;
        if (px + barW > state.logicalWidth - 10) px = state.logicalWidth - 10 - barW;
        if (py < 20) py = 20;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.rect(px, py, barW, barH_stamina);
        ctx.fill();
        
        let staminaRatio = Math.max(0, Math.min(1, state.hookedFish.health / state.hookedFish.maxHealth));
        ctx.fillStyle = '#22c55e'; 
        ctx.beginPath();
        ctx.rect(px, py, barW * staminaRatio, barH_stamina);
        ctx.fill();

        let tensionY = py + barH_stamina + gap;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.rect(px, tensionY, barW, barH_tension);
        ctx.fill();

        let tensionRatio = Math.max(0, Math.min(1, state.lineTension / 100)); // MAX_TENSION = 100
        let tensionColor = 'rgba(255, 255, 255, 0.9)';
        if (state.lineTension > 75) {
            tensionColor = '#ef4444'; 
        } else if (state.lineTension > 50) {
            tensionColor = '#f97316'; 
        }
        ctx.fillStyle = tensionColor;
        ctx.beginPath();
        ctx.rect(px, tensionY, barW * tensionRatio, barH_tension);
        ctx.fill();

        if (state.hookedFish.anticipationTimer > 0 && state.hookedFish.anticipatedTension !== undefined) {
            let markerRatio = state.hookedFish.anticipatedTension / 100;
            let mx = px + barW * markerRatio;
            let flash = Math.floor(Date.now() / 150) % 2 === 0;
            if (flash) {
                ctx.fillStyle = '#facc15';
                ctx.beginPath();
                ctx.arc(mx, tensionY + barH_tension / 2, barH_tension * 0.7, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    // Tutorial overlay call removed to put instructions inside standard notifications as requested

    ctx.restore(); 
    ctx.restore(); 
}

function showTutorialMessage(title, desc) {
    const msgText = document.getElementById('msg-text');
    const msgMeta = document.getElementById('msg-meta');
    const messageBox = document.getElementById('message-box');
    if (!msgText || !msgMeta || !messageBox) return;

    msgMeta.textContent = "TUTORIAL: " + title;
    msgText.innerHTML = desc; 
    messageBox.classList.remove('hidden');
    state.msgTimer = 999999; // Don't auto-dismiss
}

function updateTutorial() {
    if (!state.isTutorialMode) return;

    const colModal = document.getElementById('collection-modal');
    const storeModal = document.getElementById('store-modal');

    // Manage step notifications and transitions
    switch (state.tutorialStep) {
        case 0: // Step 0: Winding instruction
            state.tutorialPaused = (state.gameState === 'IDLE');
            showTutorialMessage("WINDING", "Pull your rod back by dragging or holding press on the screen.");
            if (state.gameState === 'PULLING') {
                state.tutorialPaused = false;
                state.tutorialStep = 1;
                AudioManager.playSuccess();
            }
            break;

        case 1: // Step 1: Casting instruction (while pulling)
            showTutorialMessage("CASTING", "Release your click/touch to cast the hook out into the sea!");
            if (state.gameState === 'CASTING' || state.gameState === 'SINKING') {
                state.tutorialStep = 2;
                AudioManager.playSuccess();
            }
            break;

        case 2: // Step 2: Sinking / Hooking instruction
            state.tutorialPaused = false;
            showTutorialMessage("HOOKING", "Let the hook sink. Wait for the fish to touch the hook to bite!");
            if (state.gameState === 'REELING' && state.hookedFish) {
                state.tutorialStep = 3;
                AudioManager.playSuccess();
            }
            break;

        case 3: // Step 3: Reeling / Catching instruction
            state.tutorialPaused = false;
            showTutorialMessage("REELING & CATCHING", "Rhythmic alternate presses! Press <span style='border:1px solid #fff; padding:1px 4px; border-radius:4px; background:rgba(255,255,255,0.1); font-weight:bold;'>L</span> and <span style='border:1px solid #fff; padding:1px 4px; border-radius:4px; background:rgba(255,255,255,0.1); font-weight:bold;'>R</span> keys alternately (or click the buttons) to reel the fish in! Keep tension out of the RED!");
            if (state.caughtFishStack.length > 0) {
                state.tutorialStep = 4;
                AudioManager.playSuccess();
            }
            break;

        case 4: // Step 4: First fish caught. Teach exhaustion intro (winding/casting second fish)
            state.tutorialPaused = (state.gameState === 'IDLE');
            if (!state.spawnedExhaustionFish) {
                state.spawnedExhaustionFish = true;
                state.fishList = []; // Clear other fish
                let fish = new Fish(false);
                fish.x = state.logicalWidth / 2;
                fish.y = 400 + 150;
                fish.size = 35;
                fish.maxHealth = 150;
                fish.health = 150;
                fish.vx = fish.speed;
                state.fishList.push(fish);
            }
            showTutorialMessage("EXHAUSTION INTRO", "Great catch! Let's learn how to exhaust a strong fish. Hold & drag to cast again.");
            if (state.gameState === 'PULLING') {
                state.tutorialPaused = false;
                state.tutorialStep = 5;
                AudioManager.playSuccess();
            }
            break;

        case 5: // Step 5: Casting second fish
            showTutorialMessage("EXHAUSTION CAST", "Release your click/touch to cast and hook the newly spawned fish.");
            if (state.gameState === 'CASTING' || state.gameState === 'SINKING') {
                state.tutorialStep = 6;
                AudioManager.playSuccess();
            }
            break;

        case 6: // Step 6: Hooking second fish
            state.tutorialPaused = false;
            showTutorialMessage("EXHAUSTION HOOKING", "Wait for the fish to touch the hook to bite.");
            if (state.gameState === 'REELING' && state.hookedFish) {
                state.tutorialStep = 7;
                AudioManager.playSuccess();
            }
            break;

        case 7: // Step 7: Exhaustion attacking instructions
            state.tutorialPaused = false;
            showTutorialMessage("EXHAUST THE FISH", "This fish is too strong! <span style='color: #22c55e; font-weight:bold;'>RAPIDLY CLICK/TAP DIRECTLY ON THE STRUGGLING FISH</span> to attack and exhaust it. Drain its green health bar to 0!");
            if (state.exhaustionSucceeded) {
                state.tutorialStep = 8;
                AudioManager.playSuccess();
            }
            break;

        case 8: // Step 8: Sell catching / Open Bucket instructions
            state.tutorialPaused = (state.gameState === 'IDLE');
            showTutorialMessage("MY BUCKET", "Excellent work! You have caught a fish. Click <span style='color:#ca8a04; font-weight:bold;'>'MY BUCKET'</span> at the top right to view your catch.");
            if (colModal && !colModal.classList.contains('hidden') && colModal.classList.contains('opacity-100')) {
                state.tutorialStep = 9;
                AudioManager.playSuccess();
            }
            break;

        case 9: // Step 9: Selling fish inside bucket
            state.tutorialPaused = false;
            showTutorialMessage("SELLING CATCH", "Click the <span style='background:#18181b; color:#fff; padding:1px 6px; border-radius:4px; font-weight:bold;'>SELL</span> button next to your fish to earn cash!");
            if (state.caughtFishStack.length === 0 && state.playerMoney > 0) {
                state.tutorialStep = 10;
                AudioManager.playSuccess();
            }
            break;

        case 10: // Step 10: Open Marketplace
            state.tutorialPaused = (state.gameState === 'IDLE');
            if (colModal && colModal.classList.contains('hidden')) {
                showTutorialMessage("MARKETPLACE", "Now let's visit the shop. Click <span style='color:#ca8a04; font-weight:bold;'>'MARKETPLACE'</span> at the top right.");
                if (storeModal && !storeModal.classList.contains('hidden') && storeModal.classList.contains('opacity-100')) {
                    state.tutorialStep = 11;
                    AudioManager.playSuccess();
                }
            } else {
                showTutorialMessage("SELL CATCH", "Awesome! Close the bucket modal by clicking outside of it.");
            }
            break;

        case 11: // Step 11: Buy hook resupply
            state.tutorialPaused = false;
            showTutorialMessage("HOOK SUPPLIES", "Purchase a <span style='font-weight:bold; color:#18181b;'>HOOK RESUPPLY</span> using your cash. In the real game, you need hooks in stock to go on voyages!");
            if (state.playerHooks > 10) {
                state.tutorialStep = 12;
                AudioManager.playSuccess();
                if (typeof window.closeModal === 'function') {
                    window.closeModal('store-modal', 'store-modal-content');
                } else {
                    const storeModalEl = document.getElementById('store-modal');
                    if (storeModalEl) storeModalEl.classList.add('hidden');
                }
            }
            break;

        case 12: // Step 12: Ending mechanics explanation & click to complete
            state.tutorialPaused = true;
            showTutorialMessage("ENDINGS & GOALS", "EXPEDITION ENDINGS:<br>• <b>Hookless:</b> Run out of hooks & cash.<br>• <b>Boatless:</b> Overload boat capacity, cracking the vessel.<br><br><span style='color:#fbbf24; animation: pulseAnim 2s infinite ease-in-out;'>CLICK ANYWHERE ON THE SCREEN TO FINISH.</span>");
            break;
    }
}

// Bind engine functions globally
window.initializeEngine = initializeEngine;
window.stopEngine = stopEngine;
window.resizeEngine = resizeEngine;
window.initializeCreatures = initializeCreatures;
window.resetHook = resetHook;
window.createBrokenHook = createBrokenHook;
window.applySort = applySort;
window.checkGameOver = checkGameOver;
window.loseHook = loseHook;
window.triggerEndgame = triggerEndgame;
window.showMessage = showMessage;
window.updatePhysics = updatePhysics;

