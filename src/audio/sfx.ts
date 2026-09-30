/** Sound effects using Web Audio API */

export class SFXManager {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private fieldOsc: OscillatorNode | null = null;
  private fieldGain: GainNode | null = null;
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 0.3;
      this.gainNode.connect(this.ctx.destination);
      this.initialized = true;
    } catch {
      console.warn('Web Audio API not available');
    }
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /** Play a generated sound effect */
  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.2,
    attack: number = 0.01,
    decay: number = 0.1
  ): void {
    if (!this.ctx || !this.gainNode) return;

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.value = frequency;
    
    env.gain.setValueAtTime(0, this.ctx.currentTime);
    env.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + attack);
    env.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    
    osc.connect(env);
    env.connect(this.gainNode);
    
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  /** Magnetic field hum (continuous) */
  startFieldHum(): void {
    if (!this.ctx || !this.gainNode || this.fieldOsc) return;

    this.fieldOsc = this.ctx.createOscillator();
    this.fieldGain = this.ctx.createGain();
    
    this.fieldOsc.type = 'sawtooth';
    this.fieldOsc.frequency.value = 55;
    this.fieldGain.gain.value = 0;
    
    this.fieldOsc.connect(this.fieldGain);
    this.fieldGain.connect(this.gainNode);
    this.fieldOsc.start();
  }

  /** Set field hum intensity */
  setFieldIntensity(intensity: number): void {
    if (this.fieldGain) {
      this.fieldGain.gain.setTargetAtTime(
        Math.min(intensity * 0.08, 0.1),
        this.ctx!.currentTime,
        0.05
      );
    }
  }

  stopFieldHum(): void {
    if (this.fieldOsc) {
      this.fieldOsc.stop();
      this.fieldOsc = null;
      this.fieldGain = null;
    }
  }

  /** Grab sound */
  playGrab(): void {
    this.playTone(120, 0.2, 'sine', 0.15, 0.01, 0.15);
    this.playTone(180, 0.15, 'triangle', 0.1, 0.02, 0.1);
  }

  /** Throw whoosh */
  playThrow(): void {
    if (!this.ctx || !this.gainNode) return;

    // Noise-based whoosh
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 1;
    
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.2, this.ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    
    noise.connect(filter);
    filter.connect(env);
    env.connect(this.gainNode);
    noise.start();
  }

  /** Metal impact */
  playImpact(force: number): void {
    const vol = Math.min(force / 1000, 0.3);
    this.playTone(80 + Math.random() * 40, 0.3, 'triangle', vol, 0.005, 0.2);
    this.playTone(200 + Math.random() * 100, 0.15, 'square', vol * 0.5, 0.005, 0.1);
    
    // Metal clang noise
    if (!this.ctx || !this.gainNode) return;
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const env = this.ctx.createGain();
    env.gain.value = vol * 0.5;
    noise.connect(env);
    env.connect(this.gainNode);
    noise.start();
  }

  /** Gunshot */
  playGunshot(): void {
    if (!this.ctx || !this.gainNode) return;

    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.03));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const env = this.ctx.createGain();
    env.gain.value = 0.15;
    noise.connect(env);
    env.connect(this.gainNode);
    noise.start();
  }

  /** Shield activate */
  playShield(): void {
    this.playTone(200, 0.3, 'sine', 0.1, 0.05, 0.2);
    this.playTone(300, 0.2, 'sine', 0.08, 0.1, 0.15);
  }

  /** Shield reflect */
  playReflect(): void {
    this.playTone(600, 0.15, 'triangle', 0.15, 0.01, 0.1);
    this.playTone(900, 0.1, 'sine', 0.1, 0.02, 0.08);
  }

  /** Pull activation */
  playPull(): void {
    this.playTone(60, 0.5, 'sawtooth', 0.15, 0.1, 0.3);
    this.playTone(90, 0.4, 'sine', 0.1, 0.15, 0.25);
  }

  /** Magnetic Crush: visceral metallic implosion + explosion */
  playCrush(): void {
    // Metal screech / crumple
    this.playTone(480, 0.18, 'sawtooth', 0.25, 0.005, 0.15);
    this.playTone(220, 0.25, 'square', 0.2, 0.01, 0.2);
    // Sub-bass detonation
    setTimeout(() => {
      this.playTone(45, 0.5, 'triangle', 0.35, 0.005, 0.45);
      this.playImpact(800);
    }, 80);
  }

  /** Magnetic Repulsion: explosive kinetic shockwave */
  playRepulsion(): void {
    if (!this.ctx || !this.gainNode) return;
    // Sub-bass thump
    this.playTone(40, 0.6, 'sine', 0.35, 0.005, 0.55);
    this.playTone(70, 0.4, 'triangle', 0.25, 0.01, 0.35);

    // Sonic shockwave blast
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.4);
    const env = this.ctx.createGain();
    env.gain.value = 0.3;
    noise.connect(filter);
    filter.connect(env);
    env.connect(this.gainNode);
    noise.start();
  }

  /** Magnetic Vortex sweep */
  playVortex(): void {
    this.playTone(75, 0.4, 'sawtooth', 0.12, 0.05, 0.3);
    this.playTone(110, 0.35, 'sine', 0.12, 0.08, 0.25);
  }

  /** Enemy death */
  playEnemyDeath(): void {
    this.playTone(300, 0.3, 'sawtooth', 0.1, 0.01, 0.2);
    this.playTone(150, 0.4, 'triangle', 0.08, 0.05, 0.3);
  }

  /** Player hit */
  playPlayerHit(): void {
    this.playTone(100, 0.2, 'sawtooth', 0.2, 0.01, 0.15);
    this.playTone(50, 0.3, 'square', 0.1, 0.02, 0.2);
  }

  /** UI click */
  playClick(): void {
    this.playTone(950, 0.06, 'triangle', 0.18, 0.003, 0.05);
    this.playTone(1900, 0.04, 'sine', 0.12, 0.002, 0.03);
  }

  /** UI magnetic hover blip */
  playUIHover(): void {
    this.playTone(640, 0.035, 'sine', 0.08, 0.003, 0.03);
  }

  /** Wave complete */
  playWaveComplete(): void {
    this.playTone(440, 0.2, 'sine', 0.15, 0.01, 0.1);
    setTimeout(() => this.playTone(660, 0.2, 'sine', 0.15, 0.01, 0.1), 150);
    setTimeout(() => this.playTone(880, 0.3, 'sine', 0.15, 0.01, 0.15), 300);
  }

  /** Iron Man repulsor energy blast */
  playRepulsor(): void {
    this.playTone(380, 0.22, 'sawtooth', 0.2, 0.005, 0.15);
    this.playTone(760, 0.14, 'sine', 0.15, 0.01, 0.1);
  }

  /** Captain America vibranium shield throw */
  playShieldThrow(): void {
    this.playTone(520, 0.35, 'sine', 0.18, 0.02, 0.28);
    this.playTone(780, 0.25, 'triangle', 0.14, 0.03, 0.2);
  }

  /** Wanda scarlet chaos magic */
  playHexMagic(): void {
    this.playTone(190, 0.4, 'sawtooth', 0.2, 0.02, 0.35);
    this.playTone(340, 0.3, 'sine', 0.15, 0.05, 0.25);
  }

  /** Hawkeye archery arrow release */
  playArrowShot(): void {
    this.playTone(920, 0.09, 'triangle', 0.2, 0.001, 0.08);
    this.playTone(260, 0.12, 'sine', 0.1, 0.01, 0.1);
  }

  /** Hulk leaping ground smash impact */
  playHulkSmash(): void {
    this.playTone(45, 0.65, 'sawtooth', 0.4, 0.005, 0.6);
    this.playTone(85, 0.45, 'square', 0.3, 0.01, 0.4);
    this.playImpact(950);
  }

  /** Thanos Infinity Stone cosmic power activation */
  playInfinityStone(): void {
    this.playTone(55, 0.55, 'sine', 0.35, 0.01, 0.5);
    this.playTone(480, 0.35, 'sawtooth', 0.25, 0.02, 0.3);
    this.playTone(1250, 0.2, 'sine', 0.2, 0.05, 0.15);
  }

  /** Cinematic metal gong for intro title cards */
  playMetalGong(): void {
    this.playTone(65, 2.2, 'sawtooth', 0.35, 0.01, 2.0);
    this.playTone(130, 1.8, 'sine', 0.25, 0.02, 1.6);
    this.playTone(260, 1.2, 'triangle', 0.15, 0.05, 1.0);
  }

  /** Telepathic voice chime for Charles Xavier */
  playPsychicVoice(): void {
    this.playTone(523.25, 0.45, 'sine', 0.15, 0.03, 0.4);
    setTimeout(() => this.playTone(659.25, 0.4, 'sine', 0.12, 0.03, 0.35), 80);
    setTimeout(() => this.playTone(783.99, 0.5, 'sine', 0.12, 0.03, 0.45), 160);
    setTimeout(() => this.playTone(1046.5, 0.6, 'triangle', 0.08, 0.05, 0.5), 240);
  }

  /** Straining metal / lock crack sound for Lock minigame */
  playLockCrack(): void {
    this.playTone(120, 0.25, 'sawtooth', 0.25, 0.005, 0.2);
    this.playTone(240, 0.15, 'square', 0.15, 0.01, 0.12);
  }

  /** Explosive lock shatter & magnetic field burst */
  playLockBreak(): void {
    this.playTone(70, 0.9, 'sawtooth', 0.4, 0.005, 0.85);
    this.playTone(180, 0.6, 'square', 0.3, 0.01, 0.5);
    this.playTone(880, 0.5, 'sine', 0.25, 0.02, 0.45);
    this.playImpact(800);
  }

  private lastBlipTime = 0;
  /** Soft typewriter click for visual novel text */
  playTypewriterBlip(): void {
    const now = performance.now();
    if (now - this.lastBlipTime < 60) return;
    this.lastBlipTime = now;
    this.playTone(1400 + Math.random() * 300, 0.03, 'sine', 0.04, 0.001, 0.025);
  }

  /** Sky dive swooping sound when camera falls from the sky into player */
  playSkyDive(): void {
    if (!this.ctx || !this.gainNode) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 2.2);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);
      osc.connect(gain);
      gain.connect(this.gainNode);
      osc.start(now);
      osc.stop(now + 2.4);
    } catch {
      // Audio fallback
    }
  }

  /** Heavy pulsing biological heartbeat */
  playHeartbeat(): void {
    this.playTone(46, 0.22, 'sine', 0.45, 0.01, 0.2);
    setTimeout(() => this.playTone(40, 0.28, 'sine', 0.38, 0.01, 0.26), 180);
  }

  /** High-tension razor-sharp snap of crimson puppet strings */
  playPuppetStringSnap(): void {
    this.playTone(1150, 0.12, 'sawtooth', 0.35, 0.005, 0.1);
    this.playTone(320, 0.35, 'square', 0.28, 0.01, 0.3);
    this.playTone(85, 0.45, 'sawtooth', 0.4, 0.01, 0.4);
  }

  /** Ominous WW2 camp warning siren */
  playCampAlarm(): void {
    this.playTone(440, 0.7, 'sawtooth', 0.22, 0.08, 0.6);
    setTimeout(() => this.playTone(554.37, 0.8, 'sawtooth', 0.24, 0.08, 0.7), 400);
  }

  /** Dissonant psychic voice whisper from the puppetmaster */
  playPsychicWhisper(): void {
    this.playTone(185, 0.6, 'sawtooth', 0.18, 0.05, 0.55);
    this.playTone(196, 0.6, 'sine', 0.2, 0.05, 0.55);
    setTimeout(() => this.playTone(138, 0.7, 'triangle', 0.15, 0.05, 0.65), 150);
  }

  dispose(): void {
    this.stopFieldHum();
    this.ctx?.close();
    this.ctx = null;
    this.initialized = false;
  }
}

