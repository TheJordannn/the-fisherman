window.onload = () => {
    AudioManager.init();
    const canvas = document.getElementById('gameCanvas');
    initializeEngine(canvas);

    window.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    function handleMove(e) {
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        state.mouseX = clientX;
        state.mouseY = clientY;
        
        if (state.gameState === 'PULLING') {
            state.pullCurrentX = clientX;
            state.pullCurrentY = clientY;
        }
        
        const cursorDot = document.getElementById('cursor-dot');
        if (cursorDot && !e.type.includes('touch')) {
            cursorDot.style.opacity = '1';
            cursorDot.style.left = clientX + 'px';
            cursorDot.style.top = clientY + 'px';
        }
    }

    function handleUp(e) {
        if (state.gameState === 'HOME' || state.gameState === 'INTRO' || state.gameState === 'GAMEOVER') return; 
        if (state.gameState === 'PULLING') {
            let dx = state.pullCurrentX - state.pullStartX;
            let dy = state.pullCurrentY - state.pullStartY;
            let dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 10) {
                state.gameState = 'IDLE'; 
                return;
            }

            if (dist > 180) { // MAX_PULL_DIST = 180
                dx = (dx / dist) * 180;
                dy = (dy / dist) * 180;
            }

            state.rodWhipVelocity = -state.rodRotation * 0.95; 
            state.gameState = 'CASTING';
            AudioManager.playCast();

            state.hook.x = state.rodTip.x;
            state.hook.y = state.rodTip.y;

            let rawSpeedX = -dx * 0.045; // THROW_MULT = 0.045
            let rawSpeedY = -dy * 0.045;

            let spreadAngle = (Math.random() - 0.5) * 0.28; // THROW_SPREAD = 0.28
            let cosA = Math.cos(spreadAngle);
            let sinA = Math.sin(spreadAngle);

            state.hook.vx = rawSpeedX * cosA - rawSpeedY * sinA;
            state.hook.vy = (rawSpeedX * sinA + rawSpeedY * cosA) - 1.2; 
            
            for(let i=0; i<60; i++) { // numRopeSegments = 60
                let t = i / 60;
                state.ropePoints[i].x = state.rodTip.x + (state.hook.vx * 3.5 * t);
                state.ropePoints[i].y = state.rodTip.y + (state.hook.vy * 3.5 * t);
                state.ropePoints[i].old_x = state.ropePoints[i].x;
                state.ropePoints[i].old_y = state.ropePoints[i].y;
            }
        }
    }

    function handleCanvasDown(e) {
        AudioManager.init(); 
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        if (state.gameState === 'HOME') {
            let cx = state.logicalWidth / 2;
            let cy = state.logicalHeight / 2;
            let Z = state.cameraZoom;

            let START_UI_X_OFFSET = -850; 
            let screenBtnX_world = (cx + START_UI_X_OFFSET - state.cameraX);
            let screenBtnY_world = (400 - 140 - state.cameraY); // waterSurfaceY = 400
            
            let buttonProjX = (screenBtnX_world - cx) * Z + cx;
            let buttonProjY = (screenBtnY_world - cy) * Z + cy;

            let hitboxW = (window.isTouchDevice ? 180 : 120) * Z;
            let hitboxH = (window.isTouchDevice ? 80 : 45) * Z;

            let dx = clientX - buttonProjX;
            let dy = clientY - buttonProjY;
            if (Math.abs(dx) < hitboxW / 2 && Math.abs(dy) < hitboxH / 2) {
                state.gameState = 'INTRO';
                AudioManager.playCast();
                for (let i = 0; i < 15; i++) {
                    state.wakeParticles.push(new WakeParticle(
                        state.boatWorldX - 30,
                        400, // waterSurfaceY = 400
                        -2 - Math.random() * 2,
                        15
                    ));
                }
            }
            return;
        }

        if (state.gameState === 'INTRO' || state.gameState === 'GAMEOVER') return; 

        if (state.gameState === 'IDLE') {
            const currentBoat = storeInventory.boatTypes.find(b => b.id === state.playerEquipment.boatType);
            const maxCap = currentBoat ? currentBoat.capacity : 5;
            
            if (state.caughtFishStack.length >= maxCap) {
                let breakChance = 1 - Math.pow(0.5, state.overCapacityCount + 1);
                let riskWord = "a slight chance";
                if (state.overCapacityCount + 1 === 2) riskWord = "a moderate chance";
                if (state.overCapacityCount + 1 === 3) riskWord = "a major threat";
                if (state.overCapacityCount + 1 === 4) riskWord = "an extreme hazard";
                if (state.overCapacityCount + 1 > 4) riskWord = "imminent catastrophe";
                showMessage(`DANGER: Boat Overloaded! Next catch has ${riskWord} to shatter the vessel!`, "danger", 240);
            }
            
            if (state.playerHooks <= 0) {
                const canAffordHook = state.playerMoney >= 10;
                const hasCargoToSell = state.caughtFishStack.length > 0;
                
                if (!canAffordHook && hasCargoToSell) {
                    showMessage("OUT OF HOOKS! Sell fish first, then purchase hooks.", "danger");
                    triggerShiver('btn-open-store');
                    triggerShiver('btn-open-collection');
                } else if (canAffordHook) {
                    showMessage("OUT OF HOOKS! Purchase hooks at Marketplace.", "danger");
                    triggerShiver('btn-open-store');
                } else {
                    if (state.gameState !== 'GAMEOVER') {
                        triggerEndgame('hookless');
                    }
                }
                return;
            }
            state.gameState = 'PULLING';
            state.pullStartX = clientX;
            state.pullStartY = clientY;
            state.pullCurrentX = clientX;
            state.pullCurrentY = clientY;
        } else if (state.gameState === 'REELING' && state.hookedFish) {
            let rx = (state.hookedFish.x - state.cameraX - state.logicalWidth / 2) * state.cameraZoom + state.logicalWidth / 2;
            let ry = (state.hookedFish.y - state.cameraY - state.logicalHeight / 2) * state.cameraZoom + state.logicalHeight / 2;
            let dx = clientX - rx;
            let dy = clientY - ry;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < state.hookedFish.size * 2 * state.cameraZoom) {
                state.hookedFish.health -= 25;
                createBloodParticles(state.hookedFish.x, state.hookedFish.y, 4);
                AudioManager.playReelTick();
                
                if (state.hookedFish.health <= 0) {
                    state.hookedFish.isDead = true;
                    createBloodParticles(state.hookedFish.x, state.hookedFish.y, 35);
                    AudioManager.playDeath();
                    showMessage(`${state.hookedFish.name} died from exhaustion! Released.`, "danger");
                    
                    if (state.hookedFish.isBird) {
                        state.hookedFish.vx = 0;
                        state.hookedFish.vy = 0.6; 
                    }
                    
                    freeLaneIndex(state.hookedFish.isBird, state.hookedFish.laneIndex);
                    state.hookedFish = null;
                    state.gameState = 'SINKING';
                    state.lineTension = 0;
                    state.slackTimer = 0;
                }
            }
        }
    }

    function handleGlobalDown(e) {
        AudioManager.init();
        if (e.target.closest && e.target.closest('.pointer-events-auto')) return;
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        const echo = document.createElement('div');
        echo.className = 'echo-ring';
        echo.style.left = clientX + 'px';
        echo.style.top = clientY + 'px';
        document.body.appendChild(echo);
        
        const cursorDot = document.getElementById('cursor-dot');
        if (cursorDot && !e.type.includes('touch')) {
            cursorDot.style.transform = 'translate(-50%, -50%) scale(1.8)';
            setTimeout(() => {
                if (cursorDot) cursorDot.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 100);
        }
        
        setTimeout(() => echo.remove(), 400);
    }

    function triggerShiver(elementId) {
        const el = document.getElementById(elementId);
        if (el) {
            el.classList.add('shiver-active');
            setTimeout(() => el.classList.remove('shiver-active'), 400);
        }
    }

    // Modal Helpers
    function openModal(id, contentId) {
        const modal = document.getElementById(id);
        const content = document.getElementById(contentId);
        if (modal && content) {
            modal.classList.remove('hidden');
            void modal.offsetWidth;
            modal.classList.remove('opacity-0', 'pointer-events-none');
            modal.classList.add('opacity-100', 'pointer-events-auto');
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }
    }

    function closeModal(id, contentId) {
        const modal = document.getElementById(id);
        const content = document.getElementById(contentId);
        if (modal && content) {
            modal.classList.remove('opacity-100', 'pointer-events-auto');
            modal.classList.add('opacity-0', 'pointer-events-none');
            content.classList.remove('scale-100');
            content.classList.add('scale-95');
            setTimeout(() => {
                if (modal.classList.contains('opacity-0')) {
                    modal.classList.add('hidden');
                }
            }, 300);
        }
    }

    function updateBucketHUD() {
        const currentBoat = storeInventory.boatTypes.find(b => b.id === state.playerEquipment.boatType);
        const maxCap = currentBoat ? currentBoat.capacity : 5;
        
        const collectionBtn = document.getElementById('btn-open-collection');
        const collectionCountEl = document.getElementById('collection-count');
        if (collectionBtn) {
            collectionBtn.textContent = `My Bucket (${state.caughtFishStack.length}/${maxCap})`;
        }
        if (collectionCountEl) {
            collectionCountEl.textContent = `TOTAL: ${state.caughtFishStack.length} / ${maxCap} FISH`;
        }
        if (state.caughtFishStack.length <= maxCap) {
            state.overCapacityCount = 0;
        }
    }
    window.updateBucketHUD = updateBucketHUD;
    updateBucketHUD();

    function updateMoney(amount) {
        state.playerMoney = Math.min(1000000000, Math.max(0, state.playerMoney + amount));
        const playerMoneyDisplay = document.getElementById('player-money-display');
        const storeMoneyDisplay = document.getElementById('store-money-display');
        if (playerMoneyDisplay) playerMoneyDisplay.textContent = state.playerMoney.toLocaleString();
        if (storeMoneyDisplay) storeMoneyDisplay.textContent = state.playerMoney.toLocaleString();
    }
    window.updateMoney = updateMoney;

    function checkAndRenderBadges() {
        if (state.playerStats.catchesCount >= 1) BADGES.first_catch.earned = true;
        if (state.playerStats.maxDepthReached >= 300) BADGES.deep_diver.earned = true;
        if (state.playerStats.rareCaught) BADGES.rare_hunter.earned = true;
        if (state.playerStats.escapesCount >= 5) BADGES.escape_survivor.earned = true;
        if (state.playerStats.goldAlbatross) BADGES.gold_albatross.earned = true;
        if (state.playerStats.goldLeviathan) BADGES.gold_leviathan.earned = true;
        if (state.playerStats.goldTerror) BADGES.gold_terror.earned = true;
        if (state.playerStats.goldSunray) BADGES.gold_sunray.earned = true;
        if (state.playerStats.goldTurtle) BADGES.gold_turtle.earned = true;

        if (BADGES.gold_albatross.earned && BADGES.gold_leviathan.earned && 
            BADGES.gold_terror.earned && BADGES.gold_sunray.earned && BADGES.gold_turtle.earned) {
            if (!BADGES.true_fisherman.earned) {
                BADGES.true_fisherman.earned = true;
                showMessage("TRUE FISHERMAN BADGE UNLOCKED! Golden Rod Orb activated!", "success", 300);
                AudioManager.playFishermanTalk();
            }
        }

        const badgesGrid = document.getElementById('badges-grid');
        if (!badgesGrid) return;
        badgesGrid.innerHTML = '';
        Object.values(BADGES).forEach(badge => {
            const badgeCard = document.createElement('div');
            const glowClass = badge.earned 
                ? 'earned' 
                : 'locked';
            badgeCard.className = `badge-card ${glowClass}`;
            badgeCard.innerHTML = `
                <div class="badge-header">
                    <span class="badge-name ${badge.earned ? 'earned' : 'locked'}">${badge.name}</span>
                    <span class="badge-status">${badge.earned ? '★ UNLOCKED' : '☆ LOCKED'}</span>
                </div>
                <p class="badge-desc">${badge.desc}</p>
            `;
            badgesGrid.appendChild(badgeCard);
        });
    }
    window.checkAndRenderBadges = checkAndRenderBadges;

    function openCollection() {
        const collectionList = document.getElementById('collection-list');
        if (!collectionList) return;
        collectionList.innerHTML = '';
        updateBucketHUD();
        
        const currentBoat = storeInventory.boatTypes.find(b => b.id === state.playerEquipment.boatType);
        const maxCap = currentBoat ? currentBoat.capacity : 5;

        if (state.caughtFishStack.length === 0) {
            collectionList.innerHTML = `<div style="grid-column: 1 / -1; padding: 48px 0; text-align: center; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; font-family: monospace;">The bucket is empty. Go catch something!</div>`;
        } else {
            state.caughtFishStack.forEach((fish, index) => {
                const card = document.createElement('div');
                let rarityClass = `rarity-${fish.rarity.toLowerCase()}`;
                let correctSVG = CREATURE_SVGS[fish.creatureType] || CREATURE_SVGS['fish'];
                card.className = `catch-card ${rarityClass}`;
                card.innerHTML = `
                    <div class="catch-card-header">
                        <div class="catch-card-avatar" style="color: ${fish.color}">
                            ${correctSVG}
                        </div>
                        <div class="catch-card-info">
                            <div class="catch-card-title-row">
                                <h4 class="catch-card-title">${fish.name}</h4>
                                <span class="rarity-label ${rarityClass}">${fish.rarity}</span>
                            </div>
                            <div class="catch-card-meta">Size: ${Math.floor(fish.size)}cm &nbsp;|&nbsp; Value: $${fish.value || 0}</div>
                        </div>
                    </div>
                    <div class="catch-card-actions">
                        <button class="sell-item-btn btn-catch-action primary">
                            Sell
                        </button>
                        <button class="shoot-photo-btn btn-catch-action secondary">
                            Photo
                        </button>
                    </div>
                `;
                
                card.querySelector('.sell-item-btn').onclick = (e) => {
                    e.stopPropagation();
                    sellSingleFish(index);
                };

                card.querySelector('.shoot-photo-btn').onclick = (e) => {
                    e.stopPropagation();
                    AudioManager.playClick();
                    initiatePhotoSession(fish);
                };

                collectionList.appendChild(card);
            });
        }
        checkAndRenderBadges();
        openModal('collection-modal', 'collection-modal-content');
    }

    function sellSingleFish(index) {
        if (index >= 0 && index < state.caughtFishStack.length) {
            let sold = state.caughtFishStack.splice(index, 1)[0];
            updateMoney(sold.value);
            AudioManager.playCoins();
            showMessage(`SOLD: ${sold.name} for $${sold.value}`, "success");
            updateBucketHUD();
            openCollection(); 
        }
    }

    function openStore() {
        AudioManager.playClick();
        const storeList = document.getElementById('store-list');
        if (!storeList) return;
        storeList.innerHTML = '';
        
        const storeMoneyDisplay = document.getElementById('store-money-display');
        if (storeMoneyDisplay) storeMoneyDisplay.textContent = state.playerMoney.toLocaleString();
        
        const categories = [
            { key: 'supplies', title: 'Hook Supplies', type: 'supply' },
            { key: 'rods', title: 'Gear & Rods', type: 'rod' },
            { key: 'hats', title: 'Headwear', type: 'hat' },
            { key: 'shirts', title: 'Clothing', type: 'shirt' },
            { key: 'boatColors', title: 'Boat Stain', type: 'boatColor' },
            { key: 'boatTypes', title: 'Vessel Types & Capacity', type: 'boatType' }
        ];

        categories.forEach(cat => {
            const section = document.createElement('div');
            section.innerHTML = `<h3 class="modal-section-title">${cat.title}</h3>`;
            
            const grid = document.createElement('div');
            grid.className = 'modal-grid';
            
            storeInventory[cat.key].forEach(item => {
                const isSupply = cat.type === 'supply';
                const isEquipped = !isSupply && state.playerEquipment[cat.type] === item.id;
                const isOwned = !isSupply && state.ownedItems[cat.key].includes(item.id);
                
                const btn = document.createElement('div');
                
                if (item.id === 'hook') {
                    let totalCost = state.hookBuyQty * 10;
                    let canAfford = state.playerMoney >= totalCost;
                    
                    btn.className = canAfford ? `store-item-full` : `store-item-full unaffordable`;
                    
                    let maxAffordable = Math.floor(state.playerMoney / 10);
                    if (state.hookBuyQty < 1) state.hookBuyQty = 1;
                    if (state.hookBuyQty > maxAffordable && maxAffordable > 0) {
                        state.hookBuyQty = maxAffordable;
                    }
                    
                    totalCost = state.hookBuyQty * 10;
                    canAfford = state.playerMoney >= totalCost;
                    let buyBtnClass = canAfford 
                        ? 'buyable' 
                        : 'disabled';

                    btn.innerHTML = `
                        <div style="display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 16px; width: 100%; box-sizing: border-box; flex-wrap: wrap;">
                            <div class="store-qty-controls">
                                <button id="hook-qty-minus" class="btn-qty">-</button>
                                <span id="hook-qty-display" class="qty-display">${state.hookBuyQty}</span>
                                <button id="hook-qty-plus" class="btn-qty">+</button>
                            </div>
                            <button id="hook-buy-btn" class="btn-store-buy ${buyBtnClass}">
                                Buy ${state.hookBuyQty} for $${totalCost}
                            </button>
                        </div>
                    `;

                    setTimeout(() => {
                        const btnMinus = document.getElementById('hook-qty-minus');
                        const btnPlus = document.getElementById('hook-qty-plus');
                        const btnBuy = document.getElementById('hook-buy-btn');
                        const display = document.getElementById('hook-qty-display');

                        if (btnMinus && btnPlus && btnBuy && display) {
                            btnMinus.onclick = (e) => {
                                e.stopPropagation();
                                AudioManager.playClick();
                                if (state.hookBuyQty > 1) {
                                    state.hookBuyQty--;
                                    updateHookQtyUI();
                                }
                            };
                            btnPlus.onclick = (e) => {
                                e.stopPropagation();
                                AudioManager.playClick();
                                if (state.hookBuyQty < 99) {
                                    state.hookBuyQty++;
                                    updateHookQtyUI();
                                }
                            };
                            btnBuy.onclick = (e) => {
                                e.stopPropagation();
                                let cost = state.hookBuyQty * 10;
                                if (state.playerMoney >= cost) {
                                    state.playerHooks += state.hookBuyQty;
                                    updateMoney(-cost);
                                    const hooksDisplay = document.getElementById('player-hooks-display');
                                    if (hooksDisplay) hooksDisplay.textContent = state.playerHooks;
                                    AudioManager.playCoins();
                                    showMessage(`Purchased ${state.hookBuyQty} hooks!`, "success", 120);
                                    state.hookBuyQty = 1; 
                                    openStore(); 
                                } else {
                                    AudioManager.playClick();
                                    showMessage("Sufficient money is not available!", "danger", 100);
                                }
                            };
                        }

                        function updateHookQtyUI() {
                            let cost = state.hookBuyQty * 10;
                            let canAfford = state.playerMoney >= cost;
                            display.textContent = state.hookBuyQty;
                            btnBuy.textContent = `Buy ${state.hookBuyQty} for $${cost}`;
                            if (canAfford) {
                                btnBuy.className = 'btn-store-buy buyable';
                                btn.className = 'store-item-full';
                            } else {
                                btnBuy.className = 'btn-store-buy disabled';
                                btn.className = 'store-item-full unaffordable';
                            }
                        }
                    }, 0);

                } else {
                    const isUnaffordable = !isOwned && state.playerMoney < item.price;
                    btn.className = `store-item-card ${isEquipped ? 'equipped' : 'unequipped'} ${isUnaffordable ? 'unaffordable' : ''}`;
                    
                    let btnText = isEquipped ? 'EQUIPPED' : (isOwned ? 'EQUIP' : `$${item.price.toLocaleString()}`);
                    let btnClass = isEquipped ? 'equipped-state' : (isOwned ? 'equipable' : 'buyable');
                    
                    if (isUnaffordable) {
                        btnClass = 'disabled';
                    }

                    btn.innerHTML = `
                        <div style="padding-right: 8px; min-w: 0; text-align: left; font-family: monospace;">
                            <h4 style="font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; font-size: 11px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: inherit;">${item.name}</h4>
                            <p style="font-size: 9px; letter-spacing: 0.05em; margin: 4px 0 0 0; line-height: 1.35; color: inherit; opacity: 0.8;">${item.desc}</p>
                            ${item.tensionMod && item.tensionMod < 1.0 ? `<p style="font-size: 8px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em; color: inherit; opacity: 0.6;">Tension: -${Math.round((1 - item.tensionMod) * 100)}%</p>` : ''}
                        </div>
                        <button class="btn-store-buy ${btnClass}">
                            ${btnText}
                        </button>
                    `;

                    btn.onclick = () => {
                        if (isEquipped) return;
                        if (isOwned) {
                            state.playerEquipment[cat.type] = item.id;
                            AudioManager.playClick();
                            showMessage(`Equipped ${item.name}!`, "info");
                            updateBucketHUD();
                            openStore();
                        } else if (state.playerMoney >= item.price) {
                            updateMoney(-item.price);
                            state.ownedItems[cat.key].push(item.id);
                            state.playerEquipment[cat.type] = item.id;
                            AudioManager.playCoins();
                            showMessage(`Purchased & Equipped ${item.name}!`, "success");
                            updateBucketHUD();
                            openStore();
                        } else {
                            AudioManager.playClick();
                            showMessage("Not enough money!", "danger", 100);
                        }
                    };
                }
                grid.appendChild(btn);
            });
            
            section.appendChild(grid);
            storeList.appendChild(section);
        });
        
        openModal('store-modal', 'store-modal-content');
    }

    // Interactive Manual Photo Booth logic
    function getPhotoEventPos(e) {
        const photoCanvas = document.getElementById('photo-canvas');
        if (!photoCanvas) return { x: 320, y: 240 };
        const rect = photoCanvas.getBoundingClientRect();
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return {
            x: ((clientX - rect.left) / rect.width) * photoCanvas.width,
            y: ((clientY - rect.top) / rect.height) * photoCanvas.height
        };
    }

    function startDragPhotoFish(e) {
        e.preventDefault();
        const pos = getPhotoEventPos(e);
        state.isDraggingPhotoFish = true;
        state.lastPhotoDragPos = pos;
    }

    function dragPhotoFish(e) {
        if (!state.isDraggingPhotoFish || !state.lastPhotoDragPos) return;
        const pos = getPhotoEventPos(e);
        const dx = pos.x - state.lastPhotoDragPos.x;
        const dy = pos.y - state.lastPhotoDragPos.y;

        if (state.photoControlMode === 'move') {
            state.photoFishX += dx;
            state.photoFishY += dy;
        } else if (state.photoControlMode === 'rotate') {
            const lastAngle = Math.atan2(state.lastPhotoDragPos.y - state.photoFishY, state.lastPhotoDragPos.x - state.photoFishX);
            const currentAngle = Math.atan2(pos.y - state.photoFishY, pos.x - state.photoFishX);
            state.photoFishRotation += (currentAngle - lastAngle);
        } else if (state.photoControlMode === 'scale') {
            const lastDist = Math.sqrt((state.lastPhotoDragPos.x - state.photoFishX)**2 + (state.lastPhotoDragPos.y - state.photoFishY)**2);
            const currentDist = Math.sqrt((pos.x - state.photoFishX)**2 + (pos.y - state.photoFishY)**2);
            if (lastDist > 5) {
                state.photoFishScale *= (currentDist / lastDist);
                state.photoFishScale = Math.max(0.2, Math.min(5.0, state.photoFishScale));
            }
        }

        state.lastPhotoDragPos = pos;
    }

    function stopDragPhotoFish() {
        state.isDraggingPhotoFish = false;
        state.lastPhotoDragPos = null;
    }

    const btnMove = document.getElementById('photo-control-move');
    const btnRotate = document.getElementById('photo-control-rotate');
    const btnScale = document.getElementById('photo-control-scale');

    function selectPhotoControlMode(mode) {
        state.photoControlMode = mode;
        
        [btnMove, btnRotate, btnScale].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });

        if (mode === 'move' && btnMove) btnMove.classList.add('active');
        if (mode === 'rotate' && btnRotate) btnRotate.classList.add('active');
        if (mode === 'scale' && btnScale) btnScale.classList.add('active');
        
        AudioManager.playClick();
    }

    if (btnMove) btnMove.onclick = () => selectPhotoControlMode('move');
    if (btnRotate) btnRotate.onclick = () => selectPhotoControlMode('rotate');
    if (btnScale) btnScale.onclick = () => selectPhotoControlMode('scale');

    function initiatePhotoSession(fishSpec) {
        closeModal('collection-modal', 'collection-modal-content');
        openModal('photo-modal', 'photo-modal-content');
        state.photoModalOpen = true;
        
        const photoStatus = document.getElementById('photo-status');
        const photoSkeleton = document.getElementById('photo-skeleton');
        const webcamVideo = document.getElementById('webcam-video');
        const photoCanvas = document.getElementById('photo-canvas');

        if (photoStatus) photoStatus.textContent = "Requesting webcam permissions...";
        if (photoSkeleton) photoSkeleton.classList.remove('hidden');
        
        state.photoFishInstance = {
            name: fishSpec.name,
            rarity: fishSpec.rarity,
            color: fishSpec.color,
            size: fishSpec.size * 2.8, 
            creatureType: fishSpec.creatureType || 'fish', 
            x: 320,
            y: 240,
            vx: 0,
            vy: 0,
            isDead: false
        };

        state.photoFishX = 320;
        state.photoFishY = 240;
        state.photoFishRotation = 0;
        state.photoFishScale = 1.0;
        selectPhotoControlMode('move');

        navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } })
            .then(stream => {
                state.videoStream = stream;
                if (webcamVideo) {
                    webcamVideo.srcObject = stream;
                    webcamVideo.play();
                }

                const track = stream.getVideoTracks()[0];
                const settings = track ? track.getSettings() : {};
                const streamWidth = settings.width || 640;
                const streamHeight = settings.height || 480;

                if (photoCanvas) {
                    photoCanvas.width = streamWidth;
                    photoCanvas.height = streamHeight;
                }
                
                state.photoFishX = streamWidth / 2;
                state.photoFishY = streamHeight / 2;
                if (photoStatus) photoStatus.textContent = "Drag, rotate, or scale your trophy to compose the perfect shot!";
                requestAnimationFrame(photoRenderLoop);
            })
            .catch(err => {
                console.error("Webcam failed:", err);
                if (photoStatus) photoStatus.textContent = "Webcam inactive. Drag, rotate, or scale your trophy!";
                if (photoSkeleton) photoSkeleton.classList.add('hidden');
                if (photoCanvas) {
                    photoCanvas.width = 640;
                    photoCanvas.height = 480;
                }
                state.photoFishX = 320;
                state.photoFishY = 240;
                requestAnimationFrame(photoRenderLoop);
            });
    }

    function photoRenderLoop() {
        if (!state.photoModalOpen) return;
        const photoCanvas = document.getElementById('photo-canvas');
        const photoCtx = photoCanvas ? photoCanvas.getContext('2d') : null;
        const webcamVideo = document.getElementById('webcam-video');
        const photoSkeleton = document.getElementById('photo-skeleton');

        if (!photoCanvas || !photoCtx) return;
        photoCtx.clearRect(0, 0, photoCanvas.width, photoCanvas.height);

        if (webcamVideo && webcamVideo.readyState >= 2) {
            if (photoSkeleton) photoSkeleton.classList.add('hidden');
            photoCtx.save();
            photoCtx.translate(photoCanvas.width, 0);
            photoCtx.scale(-1, 1);
            photoCtx.drawImage(webcamVideo, 0, 0, photoCanvas.width, photoCanvas.height);
            photoCtx.restore();
        } else {
            if (photoSkeleton) photoSkeleton.classList.add('hidden');
            photoCtx.fillStyle = '#111827';
            photoCtx.fillRect(0, 0, photoCanvas.width, photoCanvas.height);
        }

        if (state.photoFishInstance) {
            let dummy = new Fish(state.photoFishInstance.creatureType === 'bird');
            dummy.x = state.cameraX;
            dummy.y = state.cameraY;
            
            dummy.size = state.photoFishInstance.size; 
            dummy.baseColor = state.photoFishInstance.color;
            dummy.creatureType = state.photoFishInstance.creatureType;
            dummy.name = state.photoFishInstance.name;
            dummy.rarity = state.photoFishInstance.rarity;
            dummy.isPhotoPreview = true; 
            dummy.vx = 1.0; 
            
            photoCtx.save();
            photoCtx.translate(state.photoFishX, state.photoFishY);
            photoCtx.rotate(state.photoFishRotation);
            photoCtx.scale(state.photoFishScale, state.photoFishScale);
            dummy.draw(photoCtx);
            photoCtx.restore();
        }

        requestAnimationFrame(photoRenderLoop);
    }

    function terminatePhotoSession() {
        state.photoModalOpen = false;
        if (state.videoStream) {
            state.videoStream.getTracks().forEach(track => track.stop());
        }
        const photoSkeleton = document.getElementById('photo-skeleton');
        if (photoSkeleton) photoSkeleton.classList.add('hidden');
        closeModal('photo-modal', 'photo-modal-content');
        AudioManager.playClick();
        openCollection();
    }

    // Action attachments
    const btnOpenStore = document.getElementById('btn-open-store');
    const btnOpenCollection = document.getElementById('btn-open-collection');
    const btnOpenGuide = document.getElementById('btn-open-guide');

    if (btnOpenStore) btnOpenStore.onclick = openStore;
    if (btnOpenCollection) btnOpenCollection.onclick = () => {
        AudioManager.playClick();
        openCollection();
    };
    if (btnOpenGuide) btnOpenGuide.onclick = () => {
        AudioManager.playClick();
        openModal('guide-modal', 'guide-modal-content');
    };

    const colModal = document.getElementById('collection-modal');
    if (colModal) {
        colModal.onclick = (e) => {
            if (e.target === colModal) {
                AudioManager.playClick();
                closeModal('collection-modal', 'collection-modal-content');
                checkGameOver();
            }
        };
    }

    const stModal = document.getElementById('store-modal');
    if (stModal) {
        stModal.onclick = (e) => {
            if (e.target === stModal) {
                AudioManager.playClick();
                closeModal('store-modal', 'store-modal-content');
                checkGameOver();
            }
        };
    }

    const gdModal = document.getElementById('guide-modal');
    if (gdModal) {
        gdModal.onclick = (e) => {
            if (e.target === gdModal) {
                AudioManager.playClick();
                closeModal('guide-modal', 'guide-modal-content');
                checkGameOver();
            }
        };
    }

    const sellAllBtn = document.getElementById('sell-all-btn');
    if (sellAllBtn) {
        sellAllBtn.onclick = () => {
            if (state.caughtFishStack.length === 0) return;
            let totalPayout = 0;
            state.caughtFishStack.forEach(f => totalPayout += f.value);
            state.caughtFishStack = []; 
            updateMoney(totalPayout); 
            AudioManager.playCoins();
            showMessage(`SOLD ALL ANIMALS FOR $${totalPayout}`, "success");
            updateBucketHUD();
            openCollection(); 
        };
    }

    const sortSelectElement = document.getElementById('bucket-sort-select');
    if (sortSelectElement) {
        sortSelectElement.onchange = (e) => {
            state.currentSortOption = e.target.value;
            applySort();
            AudioManager.playClick();
            openCollection();
        };
    }

    const btnSnap = document.getElementById('btn-snap');
    if (btnSnap) {
        btnSnap.onclick = () => {
            const photoCanvas = document.getElementById('photo-canvas');
            if (!photoCanvas || !state.photoFishInstance) return;
            const dataURL = photoCanvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = "Fisherman_Trophy_" + state.photoFishInstance.name.replace(/\s+/g, '_') + ".png";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            AudioManager.playSuccess();
            showMessage("Trophy photo captured and saved!", "success");
        };
    }

    const btnClosePhotoEl = document.getElementById('close-photo');
    if (btnClosePhotoEl) {
        btnClosePhotoEl.onclick = terminatePhotoSession;
    }

    const summaryRestartBtn = document.getElementById('summary-restart-btn');
    const restartSplitContainer = document.getElementById('restart-split-container');
    if (summaryRestartBtn && restartSplitContainer) {
        summaryRestartBtn.onclick = () => {
            AudioManager.playClick();
            summaryRestartBtn.classList.add('hidden');
            restartSplitContainer.classList.remove('hidden');
        };
    }

    const restartConfirmCancelBtn = document.getElementById('restart-confirm-cancel-btn');
    if (restartConfirmCancelBtn) {
        restartConfirmCancelBtn.onclick = () => {
            AudioManager.playClick();
            if (restartSplitContainer) restartSplitContainer.classList.add('hidden');
            if (summaryRestartBtn) summaryRestartBtn.classList.remove('hidden');
        };
    }

    const restartConfirmOkBtn = document.getElementById('restart-confirm-ok-btn');
    if (restartConfirmOkBtn) {
        restartConfirmOkBtn.onclick = () => {
            AudioManager.playSuccess();
            if (restartSplitContainer) restartSplitContainer.classList.add('hidden');
            if (summaryRestartBtn) summaryRestartBtn.classList.remove('hidden');
            
            // 1. Reset all state properties back to default values
            state.cameraX = 0;
            state.cameraY = 0;
            state.mouseX = 0;
            state.mouseY = 0;
            state.boatBob = 0;
            state.boatVy = 0;
            state.boatTilt = 0;
            state.boatVTilt = 0;
            state.rodRotation = 0;
            state.rodWhipVelocity = 0;
            state.manFacingRight = true;
            state.rodTip = { x: 0, y: 0 };
            state.msgTimer = 0;
            state.cycleTime = 0.5;
            state.pullStartX = 0;
            state.pullStartY = 0;
            state.pullCurrentX = 0;
            state.pullCurrentY = 0;
            state.hook = { x: 0, y: 0, vx: 0, vy: 0 };
            state.hookedFish = null;
            state.lineTension = 0;
            state.slackTimer = 0;
            state.cameraZoom = 1.0;
            state.brokenHooks = [];
            state.isRaining = false;
            state.currentRainIntensity = 0;
            state.playerMoney = 0;
            state.playerHooks = 10;
            state.hookBuyQty = 1;
            state.overCapacityCount = 0;
            state.boatBroken = false;
            state.boatBrokenTimer = 0;
            state.fishermanSpeech = "";
            state.fishermanSpeechTimer = 0;
            state.caughtFishStack = [];
            state.fishList = []; // FIX: Clear fish/birds pool completely on reset!
            state.sessionCaughtLog = [];
            state.currentSortOption = 'newest';
            state.photoModalOpen = false;
            state.photoFishInstance = null;
            state.isDraggingPhotoFish = false;
            state.computedDistanceScale = 1.0;
            state.assignedFishLanes = [];
            state.assignedBirdLanes = [];
            state.lastPressedKey = null;
            state.lastReelTime = 0;
            state.reelEnergy = 0;
            state.baseReelStrength = 2.0;
            state.gameState = 'HOME';
            state.playerStats = {
                catchesCount: 0,
                escapesCount: 0,
                maxDepthReached: 0,
                rareCaught: false,
                goldAlbatross: false,
                goldLeviathan: false,
                goldTerror: false,
                goldSunray: false,
                goldTurtle: false,
                forbiddenMammalEarned: false
            };
            state.playerEquipment = {
                rod: 'wood_rod',
                hat: 'none',
                shirt: 'blue',
                boatColor: 'brown',
                boatType: 'wood'
            };
            state.ownedItems = {
                rods: ['wood_rod'],
                hats: ['none'],
                shirts: ['blue'],
                boatColors: ['brown'],
                boatTypes: ['wood'],
                supplies: []
            };

            // Reset badges
            Object.keys(BADGES).forEach(key => {
                BADGES[key].earned = false;
            });

            // 2. Hide endgame/gameover containers & modals
            const endgameContainer = document.getElementById('endgame-container');
            if (endgameContainer) {
                endgameContainer.classList.add('hidden');
                endgameContainer.classList.remove('fade-in-active');
                endgameContainer.style.opacity = '0';
            }

            const summaryPhase = document.getElementById('summary-phase');
            if (summaryPhase) summaryPhase.classList.add('hidden');

            const hooklessPhase = document.getElementById('hookless-phase');
            if (hooklessPhase) hooklessPhase.classList.add('hidden');

            const boatlessPhase = document.getElementById('boatless-phase');
            if (boatlessPhase) boatlessPhase.classList.add('hidden');

            // 3. Remove fade-out-active and hide all HUD elements
            const elementsToReset = [
                document.getElementById('depth-hud'),
                document.getElementById('nav-hud'),
                document.getElementById('drum-controller'),
                document.getElementById('message-box')
            ];
            elementsToReset.forEach(el => {
                if (el) {
                    el.classList.remove('fade-out-active');
                    el.classList.add('hidden');
                }
            });

            // 4. Reset modals
            closeModal('collection-modal', 'collection-modal-content');
            closeModal('store-modal', 'store-modal-content');
            closeModal('guide-modal', 'guide-modal-content');

            // 5. Update React/DOM HUD displays
            updateBucketHUD();
            updateMoney(0);
            checkAndRenderBadges();

            // 6. Re-initialize the game engine canvas
            const canvas = document.getElementById('gameCanvas');
            initializeEngine(canvas);
        };
    }

    function triggerTouchDrum(side) {
        if (state.gameState === 'HOME' || state.gameState === 'INTRO' || state.gameState === 'GAMEOVER') return; 
        AudioManager.init(); 
        if (side !== state.lastPressedKey) {
            state.lastPressedKey = side;
            state.lastReelTime = Date.now(); 
            
            let energyGain = 45; 
            state.reelEnergy = Math.min(220, state.reelEnergy + energyGain);
            AudioManager.playReelTick();
            
            const btnId = side === 'ControlLeft' ? 'btn-drum-left' : 'btn-drum-right';
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.style.backgroundColor = '#ffffff';
                btn.style.color = '#000000';
                setTimeout(() => {
                    btn.style.backgroundColor = '';
                    btn.style.color = '';
                }, 80);
            }
        }
    }

    const handleDrumLeft = (e) => {
        e.preventDefault();
        triggerTouchDrum('ControlLeft');
    };
    const handleDrumRight = (e) => {
        e.preventDefault();
        triggerTouchDrum('ControlRight');
    };

    const btnDrumLeft = document.getElementById('btn-drum-left');
    const btnDrumRight = document.getElementById('btn-drum-right');
    if (btnDrumLeft) {
        btnDrumLeft.addEventListener('touchstart', handleDrumLeft, {passive: false});
        btnDrumLeft.addEventListener('mousedown', handleDrumLeft);
    }
    if (btnDrumRight) {
        btnDrumRight.addEventListener('touchstart', handleDrumRight, {passive: false});
        btnDrumRight.addEventListener('mousedown', handleDrumRight);
    }

    // Developer Console commands
    const consoleInput = document.getElementById('console-input');
    if (consoleInput) {
        consoleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || e.key === 'Esc') {
                const devConsole = document.getElementById('dev-console');
                if (devConsole) devConsole.classList.add('hidden');
            }
            if (e.key === 'Enter') {
                const val = consoleInput.value.trim();
                const giveMoneyPattern = /^\/give\s+money\s+(\d+)$/i;
                const setZoomPattern = /^\/set\s+zoom\s+([0-9.]+|default)$/i;
                const endPattern = /^\/set\s+end\s+(hook|boat)$/i;
                
                const match = val.match(giveMoneyPattern);
                const zoomMatch = val.match(setZoomPattern);
                const endMatch = val.match(endPattern);
                
                const devConsole = document.getElementById('dev-console');

                if (match) {
                    const amount = parseInt(match[1], 10);
                    if (amount > 1000000000 || state.playerMoney + amount > 1000000000) {
                        showMessage("Developer Mode: Capped balance at $1,000,000,000 limit!", "danger");
                    } else {
                        showMessage("Developer Mode: Granted $" + amount.toLocaleString(), "success");
                    }
                    updateMoney(amount);
                    AudioManager.playCoins();
                } else if (zoomMatch) {
                    const zoomValStr = zoomMatch[1].toLowerCase();
                    if (zoomValStr === 'default') {
                        state.developerZoomOverride = null;
                        showMessage("Developer Mode: Camera zoom reset", "success");
                    } else {
                        const zoomVal = parseFloat(zoomValStr);
                        if (!isNaN(zoomVal) && zoomVal >= 0.1 && zoomVal <= 5.0) {
                            state.developerZoomOverride = zoomVal;
                            showMessage("Developer Mode: Camera zoom set to " + zoomVal + "x", "success");
                        } else {
                            showMessage("Developer Mode: Choose a zoom factor between 0.1 and 5.0", "danger");
                        }
                    }
                } else if (endMatch) {
                    let isBoat = endMatch[1].toLowerCase() === 'boat';
                    if (isBoat) {
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
                        triggerEndgame('hookless');
                    }
                    if (devConsole) devConsole.classList.add('hidden');
                } else if (val === '/give forbidden gold') {
                    state.playerStats.goldAlbatross = true;
                    state.playerStats.goldLeviathan = true;
                    state.playerStats.goldTerror = true;
                    state.playerStats.goldSunray = true;
                    state.playerStats.goldTurtle = true;
                    state.playerStats.rareCaught = true;
                    state.playerStats.catchesCount = Math.max(state.playerStats.catchesCount, 1);
                    state.playerStats.maxDepthReached = Math.max(state.playerStats.maxDepthReached, 300);
                    state.playerStats.escapesCount = Math.max(state.playerStats.escapesCount, 5);
                    
                    if (!state.playerStats.forbiddenMammalEarned) {
                        state.playerStats.forbiddenMammalEarned = true;
                        
                        const cheatFish = {
                            name: "The Forbidden Mammal",
                            rarity: "MYTHIC",
                            color: "#ffd700",
                            size: 135,
                            value: 50000,
                            creatureType: "dolphin",
                            catchId: Date.now()
                        };

                        state.caughtFishStack.push(cheatFish);
                        state.sessionCaughtLog.push(cheatFish); 
                        applySort();
                        updateBucketHUD();
                    }
                    
                    checkAndRenderBadges();
                    AudioManager.playSuccess();
                    showMessage("Developer Mode: Unlocked True Fisherman & Golden Rod Orb!", "success");
                } else {
                    showMessage("Command unknown or incorrectly formatted", "danger");
                }
                if (devConsole) devConsole.classList.add('hidden');
            }
        });
    }

    // Global Listeners
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove, {passive: false});
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    
    canvas.addEventListener('mousedown', handleCanvasDown);
    canvas.addEventListener('touchstart', handleCanvasDown, {passive: false});
    
    window.addEventListener('mousedown', handleGlobalDown);
    window.addEventListener('touchstart', handleGlobalDown, {passive: false});
    
    const photoCanvas = document.getElementById('photo-canvas');
    if (photoCanvas) {
        photoCanvas.addEventListener('mousedown', startDragPhotoFish);
        photoCanvas.addEventListener('touchstart', startDragPhotoFish, {passive: false});
    }
    
    window.addEventListener('mousemove', dragPhotoFish);
    window.addEventListener('touchmove', dragPhotoFish, {passive: false});
    window.addEventListener('mouseup', stopDragPhotoFish);
    window.addEventListener('touchend', stopDragPhotoFish);

    function handleKeyDown(e) {
        if (state.gameState === 'HOME' || state.gameState === 'INTRO' || state.gameState === 'GAMEOVER') return; 
        const devConsole = document.getElementById('dev-console');
        if (devConsole && !devConsole.classList.contains('hidden')) return;
        let virtualCode = null;
        
        if (e.code === 'ControlLeft' || e.code === 'KeyA' || e.code === 'ArrowLeft') {
            virtualCode = 'ControlLeft';
        } else if (e.code === 'ControlRight' || e.code === 'KeyD' || e.code === 'ArrowRight') {
            virtualCode = 'ControlRight';
        }

        if (virtualCode) {
            e.preventDefault();
            if (e.repeat) return; 

            if (virtualCode !== state.lastPressedKey) {
                state.lastPressedKey = virtualCode;
                state.lastReelTime = Date.now(); 
                
                let energyGain = 45; 
                state.reelEnergy = Math.min(220, state.reelEnergy + energyGain);
                AudioManager.playReelTick();
                
                const btn = document.getElementById(virtualCode === 'ControlLeft' ? 'btn-drum-left' : 'btn-drum-right');
                if (btn) {
                    btn.style.backgroundColor = '#ffffff';
                    btn.style.color = '#000000';
                    setTimeout(() => {
                        btn.style.backgroundColor = '';
                        btn.style.color = '';
                    }, 80);
                }
            }
        }
    }

    function handleSlashKey(e) {
        if (state.gameState === 'HOME' || state.gameState === 'INTRO') return; 
        const devConsole = document.getElementById('dev-console');
        
        if (devConsole && !devConsole.classList.contains('hidden')) {
            if (e.key === 'Escape' || e.key === 'Esc') {
                e.preventDefault();
                devConsole.classList.add('hidden');
            }
            return;
        }
        
        if (e.key === '/') {
            e.preventDefault();
            const devConsoleEl = document.getElementById('dev-console');
            const consoleInputEl = document.getElementById('console-input');
            if (devConsoleEl) {
                devConsoleEl.classList.remove('hidden');
                if (consoleInputEl) {
                    consoleInputEl.value = '/'; 
                    setTimeout(() => consoleInputEl.focus(), 50);
                }
            }
        }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleSlashKey);

    const handleResize = () => {
        resizeEngine();
    };
    window.addEventListener('resize', handleResize);

    // Hide glowing cursor dot when leaving bounds
    const handleMouseLeave = () => {
        const dot = document.getElementById('cursor-dot');
        if (dot) dot.style.opacity = '0';
    };
    const handleMouseEnter = () => {
        const dot = document.getElementById('cursor-dot');
        if (dot && !window.isTouchDevice) dot.style.opacity = '1';
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
};
