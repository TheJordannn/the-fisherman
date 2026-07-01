const AudioManager = window.AudioManager = {
    ctx: null,
    ambientFilter: null,
    ambientGain: null,
    _lastWarningTime: 0,

    init() {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().then(() => {
                    this.setupAmbientSong();
                }).catch(e => console.warn(e));
            } else {
                this.setupAmbientSong();
            }
            return;
        }
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.setupAmbientHum();
            this.setupAmbientSong();
        } catch (e) {
            console.warn("Web Audio API blocked.", e);
        }
    },

    setupAmbientHum() {
        if (!this.ctx) return;
        try {
            const bufferSize = 2 * this.ctx.sampleRate;
            const staticBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = staticBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            const whiteNoise = this.ctx.createBufferSource();
            whiteNoise.buffer = staticBuffer;
            whiteNoise.loop = true;

            this.ambientFilter = this.ctx.createBiquadFilter();
            this.ambientFilter.type = 'lowpass';
            this.ambientFilter.frequency.value = 280;
            this.ambientFilter.Q.value = 1.2;

            this.ambientGain = this.ctx.createGain();
            this.ambientGain.gain.value = 0.04;

            whiteNoise.connect(this.ambientFilter);
            this.ambientFilter.connect(this.ambientGain);
            this.ambientGain.connect(this.ctx.destination);
            
            whiteNoise.start();
        } catch (e) {
            console.error("Ambient audio build error:", e);
        }
    },

    updateAmbient(depthVal) {
        if (!this.ctx || !this.ambientFilter) return;
        let maxF = 280;
        let minF = 75;
        let ratio = Math.min(1, depthVal / 500); 
        let currentCutoff = maxF - (maxF - minF) * ratio;
        this.ambientFilter.frequency.setTargetAtTime(currentCutoff, this.ctx.currentTime, 0.2);
    },

    playClick() {
        if (!this.ctx) return;
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime); 
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    },

    playSplash() {
        if (!this.ctx) return;
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.22);
        gain.gain.setValueAtTime(0.28, this.ctx.currentTime); 
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.22);
    },

    playCast() {
        if (!this.ctx) return;
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1100, this.ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.16, this.ctx.currentTime); 
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    },

    playBite(rarity) {
        if (!this.ctx) return;
        let count = rarity; 
        let basePitches = [440, 554.37, 659.25, 880]; 
        for (let i = 0; i < count; i++) {
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.type = rarity === 4 ? 'sine' : 'triangle';
            let pitch = basePitches[i % basePitches.length] * (1.0 + (rarity * 0.1));
            osc.frequency.setValueAtTime(pitch, this.ctx.currentTime + i * 0.08);
            gain.gain.setValueAtTime(0.22, this.ctx.currentTime + i * 0.08); 
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.08 + 0.22);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + i * 0.08);
            osc.stop(this.ctx.currentTime + i * 0.08 + 0.25);
        }
    },

    playReelTick() {
        if (!this.ctx) return;
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
        osc.frequency.setValueAtTime(4500, this.ctx.currentTime + 0.004);
        gain.gain.setValueAtTime(0.10, this.ctx.currentTime); 
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.015);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.02);
    },

    playRopeTick() {
        if (!this.ctx) return;
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.012);
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime); 
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.012);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.015);
    },

    playWarning(tension) {
        if (!this.ctx) return;
        let interval = tension > 88 ? 160 : 350; 
        if (Date.now() - this._lastWarningTime < interval) return;
        this._lastWarningTime = Date.now();

        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(tension > 88 ? 920 : 580, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.14, this.ctx.currentTime); 
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.13);
    },

    playFishermanTalk() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const speed = 0.08; 
        const numBlips = 4 + Math.floor(Math.random() * 3); 
        
        for (let i = 0; i < numBlips; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = (i % 2 === 0) ? 'triangle' : 'square'; 
            
            let basePitch;
            if (Math.random() > 0.75) {
                basePitch = 480 + Math.random() * 250; 
            } else {
                basePitch = 160 + Math.random() * 120; 
            }
            
            const startTime = now + i * speed;
            osc.frequency.setValueAtTime(basePitch, startTime);
            
            const bendTarget = basePitch * (Math.random() > 0.5 ? 0.4 : 1.8);
            osc.frequency.exponentialRampToValueAtTime(bendTarget, startTime + speed * 0.8);
            
            const volume = osc.type === 'square' ? 0.09 : 0.45;
            gain.gain.setValueAtTime(volume, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + speed * 0.95);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + speed);
        }
    },

    playSnap() {
        if (!this.ctx) return;
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.35, this.ctx.currentTime); 
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
    },

    playSuccess() {
        if (!this.ctx) return;
        let pitches = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; 
        pitches.forEach((freq, idx) => {
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.05);
            gain.gain.setValueAtTime(0.20, this.ctx.currentTime + idx * 0.05); 
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.05 + 0.42);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + idx * 0.05);
            osc.stop(this.ctx.currentTime + idx * 0.05 + 0.45);
        });
    },

    playCoins() {
        if (!this.ctx) return;
        let pitches = [1046.50, 1318.51, 1567.98, 2093.00]; 
        pitches.forEach((freq, idx) => {
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.06);
            gain.gain.setValueAtTime(0.18, this.ctx.currentTime + idx * 0.06); 
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.06 + 0.18);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + idx * 0.06);
            osc.stop(this.ctx.currentTime + idx * 0.06 + 0.22);
        });
    },

    playDeath() {
        if (!this.ctx) return;
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(25, this.ctx.currentTime + 0.32);
        gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.32);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.35);
    },

    playExplosion() {
        if (!this.ctx) return;
        for (let i = 0; i < 4; i++) {
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
            osc.frequency.setValueAtTime(90 - (i * 20), this.ctx.currentTime + (i * 0.04));
            osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.4);
            gain.gain.setValueAtTime(0.4 - (i * 0.08), this.ctx.currentTime + (i * 0.04));
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + (i * 0.04));
            osc.stop(this.ctx.currentTime + 0.45);
        }
    },

    setupAmbientSong() {
        if (!this.ctx || this.songStarted) return;
        this.songStarted = true;

        const scale = [155.56, 174.61, 196.00, 233.08, 261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 622.25];
        
        let step = 0;
        const playAmbientNote = () => {
            if (!this.ctx || this.ctx.state === 'suspended') return;
            
            try {
                const now = this.ctx.currentTime;
                
                const baseNote = scale[step % 4];
                const oscBase = this.ctx.createOscillator();
                const gainBase = this.ctx.createGain();
                
                oscBase.type = 'sine';
                oscBase.frequency.setValueAtTime(baseNote, now);
                
                gainBase.gain.setValueAtTime(0, now);
                gainBase.gain.linearRampToValueAtTime(0.012, now + 1.5);
                gainBase.gain.setValueAtTime(0.012, now + 3.0);
                gainBase.gain.exponentialRampToValueAtTime(0.0001, now + 5.8);
                
                const lp = this.ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.setValueAtTime(320, now);
                
                oscBase.connect(lp);
                lp.connect(gainBase);
                gainBase.connect(this.ctx.destination);
                
                oscBase.start(now);
                oscBase.stop(now + 6.0);
                
                if (Math.random() > 0.15) {
                    const melodyIndex = 4 + Math.floor(Math.random() * (scale.length - 4));
                    const melodyNote = scale[melodyIndex];
                    
                    const oscMelody = this.ctx.createOscillator();
                    const gainMelody = this.ctx.createGain();
                    
                    oscMelody.type = 'sine';
                    const delay = 0.5 + Math.random() * 1.5;
                    const noteStart = now + delay;
                    
                    oscMelody.frequency.setValueAtTime(melodyNote, noteStart);
                    
                    gainMelody.gain.setValueAtTime(0, noteStart);
                    gainMelody.gain.linearRampToValueAtTime(0.015, noteStart + 0.3);
                    gainMelody.gain.exponentialRampToValueAtTime(0.0001, noteStart + 3.8);
                    
                    const melodyLp = this.ctx.createBiquadFilter();
                    melodyLp.type = 'lowpass';
                    melodyLp.frequency.setValueAtTime(1000, noteStart);
                    
                    oscMelody.connect(melodyLp);
                    melodyLp.connect(gainMelody);
                    gainMelody.connect(this.ctx.destination);
                    
                    oscMelody.start(noteStart);
                    oscMelody.stop(noteStart + 4.0);
                }
                
                step++;
            } catch (e) {
                console.error("Ambient song playback error:", e);
            }
        };
        
        playAmbientNote();
        setInterval(playAmbientNote, 4200);
    }
};
