import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameViewport } from './components/GameViewport';
import { Inspector } from './components/Inspector';
import { EditorPalette } from './components/EditorPalette';
import { LEVELS } from './levels';
import { GameEntity, EntityType, GlobalPhysics, LevelData, Vector2 } from './types';
import { PLAYER_SIZE, CANVAS_HEIGHT, CANVAS_WIDTH, COLORS, DEFAULT_PHYSICS } from './constants';
import { Play, Info, ArrowLeft, Terminal, Hammer, Save, Code, Copy, Check } from 'lucide-react';

type GameState = 'MENU' | 'PLAYING' | 'ABOUT' | 'WON' | 'EDITOR';

// --- Audio Engine Class (Pure Code Synth) ---
class AudioEngine {
    ctx: AudioContext | null = null;
    musicOsc: OscillatorNode | null = null;
    musicGain: GainNode | null = null;
    musicInterval: number | null = null;
    isMuted: boolean = false;
    currentTrack: 'menu' | 'game' | 'none' = 'none';

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
        if (!this.ctx || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playNoise(duration: number) {
        if (!this.ctx || this.isMuted) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);
        noise.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }

    // SFX Methods
    sfxShoot() {
        this.playNoise(0.1);
        this.playTone(800, 'sawtooth', 0.1, 0.05);
    }

    sfxDie() {
        if (!this.ctx || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    sfxJump() {
        if (!this.ctx || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    sfxStep() {
        this.playNoise(0.03);
    }

    sfxClick() {
        this.playTone(1200, 'sine', 0.05, 0.05);
    }

    sfxLevelComplete() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        [440, 554, 659, 880].forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.3);
        });
    }

    sfxWin() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        // Victory fanfare
        [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50].forEach((freq, i) => {
             const osc = this.ctx!.createOscillator();
             const gain = this.ctx!.createGain();
             osc.type = 'triangle';
             osc.frequency.value = freq;
             const duration = i >= 4 ? 0.4 : 0.2;
             const start = now + i * 0.2;
             gain.gain.setValueAtTime(0.2, start);
             gain.gain.linearRampToValueAtTime(0, start + duration);
             osc.connect(gain);
             gain.connect(this.ctx!.destination);
             osc.start(start);
             osc.stop(start + duration);
        });
    }

    // Music Sequencer
    startMusic(track: 'menu' | 'game') {
        if (this.currentTrack === track) return;
        this.stopMusic();
        this.currentTrack = track;
        
        let noteIndex = 0;
        const tempo = track === 'menu' ? 300 : 200; // ms per note
        // Improved Menu Sequence: Louder, Triangle wave, Mid-range arpeggio
        const sequence = track === 'menu' 
            ? [130.81, 0, 155.56, 0, 196.00, 0, 233.08, 0] // C3, Eb3, G3, Bb3 (Cm7 Arp)
            : [110, 110, 220, 110, 87, 87, 98, 98]; // Driving bass

        this.musicInterval = window.setInterval(() => {
            if (this.isMuted || !this.ctx) return;
            const freq = sequence[noteIndex];
            if (freq > 0) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                // Switch Menu to Triangle for better audibility
                osc.type = track === 'menu' ? 'triangle' : 'sawtooth';
                osc.frequency.value = freq;
                
                // Envelope
                // Menu volume bumped to 0.15 from 0.05/0.2 logic previously
                const volume = track === 'menu' ? 0.1 : 0.05;
                gain.gain.setValueAtTime(volume, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (tempo/1000) * 0.9);
                
                // Filter for game music only
                if (track === 'game') {
                     const filter = this.ctx.createBiquadFilter();
                     filter.type = 'lowpass';
                     filter.frequency.setValueAtTime(800, this.ctx.currentTime);
                     filter.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.2);
                     osc.connect(filter);
                     filter.connect(gain);
                } else {
                     // Direct connect for menu to ensure clarity
                     osc.connect(gain);
                }
                
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + (tempo/1000));
            }
            noteIndex = (noteIndex + 1) % sequence.length;
        }, tempo);
    }

    stopMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
        this.currentTrack = 'none';
    }
}

const audio = new AudioEngine();

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [currentLevelId, setCurrentLevelId] = useState(1);
  const [entities, setEntities] = useState<GameEntity[]>([]);
  const [physics, setPhysics] = useState<GlobalPhysics>(LEVELS[0].physics);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [gameMessage, setGameMessage] = useState<string | null>(null);
  
  // Editor State
  const [editorLevel, setEditorLevel] = useState<LevelData>({
      id: 99,
      name: "CUSTOM_LEVEL",
      description: "User defined environment.",
      startPos: { x: 50, y: 400 },
      entities: [],
      physics: { ...DEFAULT_PHYSICS }
  });
  const [isEditorTesting, setIsEditorTesting] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const entitiesRef = useRef<GameEntity[]>([]);
  const physicsRef = useRef<GlobalPhysics>(LEVELS[0].physics);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const targetXRef = useRef<number | null>(null);
  const lastStepTimeRef = useRef<number>(0);

  // Try to initialize audio on mount
  useEffect(() => {
      audio.init();
      if (audio.ctx && audio.ctx.state === 'running' && gameState === 'MENU') {
          audio.startMusic('menu');
      }
  }, []);

  // Initialize Audio Context on user gesture
  useEffect(() => {
      const handleUserGesture = () => {
          audio.init();
          if (gameState === 'MENU' || gameState === 'ABOUT' || gameState === 'WON') {
              audio.startMusic('menu');
          } else if (gameState === 'PLAYING' || (gameState === 'EDITOR' && isEditorTesting)) {
              audio.startMusic('game');
          } else if (gameState === 'EDITOR' && !isEditorTesting) {
              audio.stopMusic();
          }
          window.removeEventListener('click', handleUserGesture);
          window.removeEventListener('keydown', handleUserGesture);
      };
      window.addEventListener('click', handleUserGesture);
      window.addEventListener('keydown', handleUserGesture);
      return () => {
          window.removeEventListener('click', handleUserGesture);
          window.removeEventListener('keydown', handleUserGesture);
      };
  }, [gameState, isEditorTesting]);

  // Manage Music
  useEffect(() => {
      if (audio.ctx && audio.ctx.state === 'running') {
          if (gameState === 'MENU' || gameState === 'ABOUT' || gameState === 'WON') {
              audio.startMusic('menu');
          } else if (gameState === 'PLAYING' || (gameState === 'EDITOR' && isEditorTesting)) {
              audio.startMusic('game');
          } else if (gameState === 'EDITOR' && !isEditorTesting) {
              audio.stopMusic(); // Quiet for building
          }
      } else if (gameState === 'MENU') {
           audio.startMusic('menu');
      }
  }, [gameState, isEditorTesting]);

  // Level Setup Logic
  const setupLevel = (level: LevelData) => {
    const player: GameEntity = {
      id: 'player_1',
      type: EntityType.PLAYER,
      name: 'UserAgent',
      pos: { ...level.startPos },
      size: { ...PLAYER_SIZE },
      velocity: { x: 0, y: 0 },
      color: COLORS.player,
      isStatic: false,
      isSolid: true,
      isVisible: true,
      gravityScale: 1,
      description: "The runner instance. High mobility."
    };

    const initialEntities: GameEntity[] = level.entities.map(e => ({
        ...e,
        velocity: e.velocity || { x: 0, y: 0 },
        gravityScale: e.gravityScale !== undefined ? e.gravityScale : 1,
        origin: { ...e.pos },
        behavior: e.behavior || 'DEFAULT'
    }));

    initialEntities.push(player);

    setEntities(initialEntities);
    setPhysics({ ...level.physics });
    entitiesRef.current = initialEntities;
    physicsRef.current = { ...level.physics };
    setSelectedEntityId(null);
    targetXRef.current = null;
  };

  // Init Playing State
  useEffect(() => {
    if (gameState === 'PLAYING') {
        const level = LEVELS.find(l => l.id === currentLevelId) || LEVELS[0];
        setupLevel(level);
        setGameMessage(level.name + ": " + level.description);
        setTimeout(() => setGameMessage(null), 4000);
    } else if (gameState === 'EDITOR') {
        // If testing, setup logic handled by toggle
        if (!isEditorTesting) {
             // Editor Build Mode: Just show raw entities plus a 'ghost' player start
             const editorEntities = [...editorLevel.entities];
             // Add ghost player at start pos
             editorEntities.push({
                 id: 'ghost_player',
                 type: EntityType.PLAYER,
                 name: 'Start_Position',
                 pos: { ...editorLevel.startPos },
                 size: { ...PLAYER_SIZE },
                 velocity: { x: 0, y: 0 },
                 color: COLORS.player,
                 isStatic: true,
                 isSolid: false,
                 isVisible: true,
                 gravityScale: 0
             });
             setEntities(editorEntities);
             entitiesRef.current = editorEntities;
             setPhysics(editorLevel.physics);
             physicsRef.current = editorLevel.physics;
             setGameMessage(null);
        }
    }
  }, [currentLevelId, gameState, isEditorTesting, editorLevel]); 

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleSceneClick = (x: number) => {
    if (!isPaused && (gameState === 'PLAYING' || (gameState === 'EDITOR' && isEditorTesting))) {
      targetXRef.current = x;
    }
  };

  const gameLoop = useCallback((time: number) => {
    // Only run loop logic if Playing OR Editor Testing
    const isRunning = (gameState === 'PLAYING' || (gameState === 'EDITOR' && isEditorTesting)) && !isPaused;

    if (!isRunning) {
      requestRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const deltaTime = Math.min((time - lastTimeRef.current) / 1000, 0.05) * physicsRef.current.timeScale;
    lastTimeRef.current = time;

    const currentEntities = [...entitiesRef.current];
    const phys = physicsRef.current;
    const newProjectiles: GameEntity[] = [];
    
    // Physics Sub-step
    for (let i = 0; i < currentEntities.length; i++) {
        let ent = { ...currentEntities[i] };
        
        // --- AI LOGIC ---
        if (ent.behavior === 'PATROL' && ent.patrolStart && ent.patrolEnd && !ent.isStatic) {
            const speed = ent.patrolSpeed || 100;
            const path = { x: ent.patrolEnd.x - ent.patrolStart.x, y: ent.patrolEnd.y - ent.patrolStart.y };
            const pathLen = Math.sqrt(path.x ** 2 + path.y ** 2);
            
            if (pathLen > 0) {
                 // Current progress
                 const toPos = { x: ent.pos.x - ent.patrolStart.x, y: ent.pos.y - ent.patrolStart.y };
                 const dot = toPos.x * path.x + toPos.y * path.y;
                 const proj = dot / (pathLen * pathLen);

                 // Check direction
                 const velocityDot = ent.velocity.x * path.x + ent.velocity.y * path.y;
                 const movingTowardsEnd = velocityDot >= 0;

                 // Initialize velocity if stopped or wrong direction
                 if (ent.velocity.x === 0 && ent.velocity.y === 0) {
                      ent.velocity = {
                          x: (path.x / pathLen) * speed,
                          y: (path.y / pathLen) * speed
                      };
                 } else if (movingTowardsEnd && proj >= 1) {
                      // Reached End, turn back
                      ent.velocity = {
                          x: -(path.x / pathLen) * speed,
                          y: -(path.y / pathLen) * speed
                      };
                 } else if (!movingTowardsEnd && proj <= 0) {
                      // Reached Start, go forward
                      ent.velocity = {
                          x: (path.x / pathLen) * speed,
                          y: (path.y / pathLen) * speed
                      };
                 }
            }
        } 
        
        if (ent.behavior === 'TURRET' && ent.fireRate) {
            const now = time;
            const player = currentEntities.find(e => e.type === EntityType.PLAYER);
            let shouldFire = false;
            let fireVelocity = { x: 0, y: 0 };
            let spawnPos = { x: ent.pos.x + ent.size.x/2, y: ent.pos.y + ent.size.y/2 };

            if (player && player.isVisible) {
                const turretCenter = { x: ent.pos.x + ent.size.x/2, y: ent.pos.y + ent.size.y/2 };
                const playerCenter = { x: player.pos.x + player.size.x/2, y: player.pos.y + player.size.y/2 };
                const dx = playerCenter.x - turretCenter.x;
                const dy = playerCenter.y - turretCenter.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 500) {
                     const angle = Math.atan2(dy, dx);
                     const projSpeed = ent.projectileSpeed || 300;
                     fireVelocity = { x: Math.cos(angle) * projSpeed, y: Math.sin(angle) * projSpeed };
                     const spawnOffset = 35; 
                     spawnPos = {
                         x: turretCenter.x + Math.cos(angle) * spawnOffset - 5,
                         y: turretCenter.y + Math.sin(angle) * spawnOffset - 5
                     };
                     shouldFire = true;
                }
            }

            if (shouldFire && (!ent.lastFireTime || now - ent.lastFireTime > ent.fireRate)) {
                ent.lastFireTime = now;
                audio.sfxShoot(); // Play Shoot SFX
                newProjectiles.push({
                    id: `proj_${ent.id}_${now}`,
                    type: EntityType.PROJECTILE,
                    name: 'Projectile',
                    pos: spawnPos,
                    size: { x: 10, y: 10 },
                    velocity: fireVelocity,
                    color: COLORS.projectile,
                    isStatic: false,
                    isSolid: false,
                    isVisible: true,
                    isDeadly: true,
                    gravityScale: 0
                });
            }
        }

        if (ent.isStatic) {
            currentEntities[i] = ent;
            continue; 
        }

        // Apply Forces
        const gravityMultiplier = ent.gravityScale !== undefined ? ent.gravityScale : 1;
        ent.velocity.y += phys.gravity * 2000 * gravityMultiplier * deltaTime;

        // Player Control & SFX
        if (ent.type === EntityType.PLAYER) {
            const MOVE_ACCEL = 300;
            const MAX_WALK_SPEED = 200;
            const keys = keysRef.current;
            let manualInput = false;

            if (keys['ArrowRight'] || keys['KeyD']) {
                ent.velocity.x += MOVE_ACCEL * deltaTime;
                manualInput = true;
            }
            if (keys['ArrowLeft'] || keys['KeyA']) {
                ent.velocity.x -= MOVE_ACCEL * deltaTime;
                manualInput = true;
            }

            if (manualInput) {
                targetXRef.current = null;
                ent.velocity.x *= phys.friction;
                if (Math.abs(ent.velocity.x) > 10 && time - lastStepTimeRef.current > 300 && Math.abs(ent.velocity.y) < 5) {
                    audio.sfxStep();
                    lastStepTimeRef.current = time;
                }
            } else if (targetXRef.current !== null) {
                const targetX = targetXRef.current;
                const center = ent.pos.x + ent.size.x / 2;
                const diff = targetX - center;
                if (Math.abs(diff) < 5) {
                    targetXRef.current = null;
                    ent.velocity.x = 0;
                } else {
                    ent.velocity.x = Math.sign(diff) * MAX_WALK_SPEED;
                    if (time - lastStepTimeRef.current > 300 && Math.abs(ent.velocity.y) < 5) {
                        audio.sfxStep();
                        lastStepTimeRef.current = time;
                    }
                }
            } else {
                ent.velocity.x *= phys.friction;
            }
        }

        // Collision Logic
        let nextX = ent.pos.x + ent.velocity.x * deltaTime;
        if (nextX < -100 || nextX > CANVAS_WIDTH + 100) {
             if (ent.type === EntityType.PROJECTILE) ent.isVisible = false;
        }
        if (nextX < 0) { nextX = 0; ent.velocity.x = 0; }
        if (nextX > CANVAS_WIDTH - ent.size.x) { nextX = CANVAS_WIDTH - ent.size.x; ent.velocity.x = 0; }

        const entRectX = { ...ent, pos: { x: nextX, y: ent.pos.y } };
        for (const other of currentEntities) {
            if (ent.id === other.id) continue;
            if (!other.isSolid && !other.isDeadly) continue;
            if (!other.isVisible) continue;

            if (checkCollision(entRectX, other)) {
                if (ent.type === EntityType.PLAYER && other.isDeadly) {
                    audio.sfxDie();
                    resetLevel();
                    return; 
                }
                if (ent.type === EntityType.PROJECTILE && other.type === EntityType.PLAYER) {
                    audio.sfxDie();
                    resetLevel();
                    return;
                }
                if (ent.type === EntityType.PROJECTILE && other.type === EntityType.WALL) {
                    ent.isVisible = false;
                }
                if (other.isSolid) {
                    if (ent.behavior === 'PATROL') ent.velocity.x = -ent.velocity.x;
                    else ent.velocity.x = 0;
                    nextX = ent.pos.x;
                    if (ent.type === EntityType.PLAYER) targetXRef.current = null;
                }
            }
        }
        ent.pos.x = nextX;

        let nextY = ent.pos.y + ent.velocity.y * deltaTime;
        let grounded = false;
        const entRectY = { ...ent, pos: { x: ent.pos.x, y: nextY } };

        for (const other of currentEntities) {
            if (ent.id === other.id) continue;
            if (!other.isSolid && !other.isDeadly) continue;
            if (!other.isVisible) continue;

            if (checkCollision(entRectY, other)) {
                if (ent.type === EntityType.PLAYER && other.isDeadly) {
                    audio.sfxDie();
                    resetLevel();
                    return;
                }
                if (ent.type === EntityType.PROJECTILE && other.type === EntityType.PLAYER) {
                    audio.sfxDie();
                    resetLevel();
                    return;
                }
                if (ent.type === EntityType.PROJECTILE && other.type === EntityType.WALL) {
                    ent.isVisible = false;
                }
                if (other.isSolid) {
                    if (ent.velocity.y > 0) { 
                        nextY = other.pos.y - ent.size.y;
                        grounded = true;
                        ent.velocity.y = 0;
                    } else if (ent.velocity.y < 0) { 
                        nextY = other.pos.y + other.size.y;
                        ent.velocity.y = 0;
                    }
                }
            }
        }
        ent.pos.y = nextY;

        if (ent.pos.y > CANVAS_HEIGHT + 200) {
             if (ent.type === EntityType.PLAYER) {
                 audio.sfxDie();
                 resetLevel();
                 return;
             } else if (ent.type === EntityType.PROJECTILE) {
                 ent.isVisible = false;
             }
        }

        if (ent.type === EntityType.PLAYER && grounded) {
             const keys = keysRef.current;
             if (keys['ArrowUp'] || keys['KeyW'] || keys['Space']) {
                  audio.sfxJump();
                  ent.velocity.y = -600;
             }
        }

        if (ent.type === EntityType.PLAYER) {
             const exit = currentEntities.find(e => e.type === EntityType.EXIT);
             if (exit && checkCollision(ent, exit)) {
                 if (gameState === 'EDITOR') {
                     // In editor test, just reset
                     audio.sfxWin();
                     setIsEditorTesting(false);
                 } else {
                     handleLevelComplete();
                 }
                 return;
             }
        }

        currentEntities[i] = ent;
    }

    const activeEntities = currentEntities.filter(e => e.isVisible !== false || (e.type !== EntityType.PROJECTILE && !e.isVisible)).concat(newProjectiles);
    entitiesRef.current = activeEntities;
    setEntities(activeEntities);
    requestRef.current = requestAnimationFrame(gameLoop);
  }, [isPaused, currentLevelId, gameState, isEditorTesting, editorLevel]);

  useEffect(() => {
    if (gameState === 'PLAYING' || gameState === 'EDITOR') {
        requestRef.current = requestAnimationFrame(gameLoop);
    }
    return () => cancelAnimationFrame(requestRef.current!);
  }, [gameLoop, gameState]);

  const checkCollision = (a: GameEntity, b: GameEntity) => {
    return (
      a.pos.x < b.pos.x + b.size.x &&
      a.pos.x + a.size.x > b.pos.x &&
      a.pos.y < b.pos.y + b.size.y &&
      a.pos.y + a.size.y > b.pos.y
    );
  };

  const handleLevelComplete = () => {
    audio.sfxLevelComplete();
    setGameMessage("LEVEL SEQUENCE COMPLETE. INITIALIZING NEXT...");
    cancelAnimationFrame(requestRef.current!);
    setTimeout(() => {
        if (currentLevelId < LEVELS.length) {
            setCurrentLevelId(prev => prev + 1);
        } else {
            setGameState('WON');
            audio.sfxWin();
        }
    }, 1500);
  };

  const resetLevel = () => {
    setGameMessage("CRITICAL FAILURE. SYSTEM RESET.");
    if (gameState === 'EDITOR' && isEditorTesting) {
        setupLevel(editorLevel);
    } else {
        const level = LEVELS.find(l => l.id === currentLevelId) || LEVELS[0];
        setupLevel(level);
    }
    
    targetXRef.current = null;
    setTimeout(() => setGameMessage(null), 1000);
    cancelAnimationFrame(requestRef.current!);
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const handleUpdateEntity = (id: string, updates: Partial<GameEntity>) => {
    // If in editor build mode, update the blueprint state
    if (gameState === 'EDITOR' && !isEditorTesting) {
        if (id === 'ghost_player') {
             // If we moved the ghost player, update startPos
             if (updates.pos) {
                 setEditorLevel(prev => ({ ...prev, startPos: updates.pos as Vector2 }));
             }
             // Ghost player doesn't have other props to save really
        } else {
            const newEntities = editorLevel.entities.map(e => e.id === id ? { ...e, ...updates } : e);
            setEditorLevel(prev => ({ ...prev, entities: newEntities }));
        }
        
        // Also update local view for immediate feedback
        const newRefEntities = entitiesRef.current.map(ent => 
             ent.id === id ? { ...ent, ...updates } : ent
        );
        entitiesRef.current = newRefEntities;
        setEntities(newRefEntities);
        return;
    }

    // Default Runtime Update
    const newEntities = entitiesRef.current.map(ent => 
      ent.id === id ? { ...ent, ...updates } : ent
    );
    entitiesRef.current = newEntities;
    setEntities(newEntities);
    if (updates.isLocked === false) {
       const ent = newEntities.find(e => e.id === id);
       if (ent && ent.type === EntityType.DOOR) {
           ent.color = COLORS.doorUnlocked;
       }
    }
  };

  const handleUpdatePhysics = (updates: Partial<GlobalPhysics>) => {
    if (gameState === 'EDITOR' && !isEditorTesting) {
        setEditorLevel(prev => ({ ...prev, physics: { ...prev.physics, ...updates }}));
    }
    physicsRef.current = { ...physicsRef.current, ...updates };
    setPhysics(physicsRef.current);
  };

  // Editor: Drag Start (From Palette)
  const handleEditorDragStart = (type: EntityType, e: React.DragEvent) => {
      e.dataTransfer.setData("entityType", type);
  };

  // Editor: Drop (To Canvas)
  const handleEditorDrop = (e: React.DragEvent, x: number, y: number) => {
      const type = e.dataTransfer.getData("entityType") as EntityType;
      if (!type) return;
      audio.sfxClick();

      const newEntity: GameEntity = {
          id: `custom_${type}_${Date.now()}`,
          type: type,
          name: `New_${type}`,
          pos: { x, y },
          size: type === EntityType.WALL ? { x: 100, y: 50 } : 
                type === EntityType.PLATFORM ? { x: 100, y: 20 } :
                type === EntityType.DOOR ? { x: 40, y: 150 } :
                type === EntityType.EXIT ? { x: 50, y: 100 } :
                { x: 30, y: 30 },
          velocity: { x: 0, y: 0 },
          color: type === EntityType.WALL ? COLORS.wall :
                 type === EntityType.ENEMY ? COLORS.enemy :
                 type === EntityType.DOOR ? COLORS.doorLocked :
                 type === EntityType.EXIT ? '#ffffff' :
                 type === EntityType.PROJECTILE ? COLORS.turret : // Projectile type used for Turret
                 COLORS.text,
          isStatic: type !== EntityType.ENEMY, // Enemies dynamic by default
          isSolid: type !== EntityType.TEXT && type !== EntityType.EXIT,
          isVisible: true,
          // Turret Defaults
          ...(type === EntityType.PROJECTILE ? { 
              type: EntityType.ENEMY, // Convert to enemy type internally
              behavior: 'TURRET',
              name: 'Turret',
              fireRate: 2000,
              isStatic: true,
              isSolid: true
          } : {}),
          // Door Defaults
          ...(type === EntityType.DOOR ? { isLocked: true, isSolid: true, isStatic: true } : {}),
          // Enemy Defaults
          ...(type === EntityType.ENEMY ? { 
              behavior: 'PATROL', 
              patrolStart: { x, y }, 
              patrolEnd: { x: x + 100, y },
              isDeadly: true 
          } : {}),
           // Text Defaults
           ...(type === EntityType.TEXT ? { label: "EDIT_ME", isSolid: false } : {})
      };

      setEditorLevel(prev => ({
          ...prev,
          entities: [...prev.entities, newEntity]
      }));
  };

  // Editor: Move Existing
  const handleEntityMove = (id: string, newPos: Vector2) => {
     handleUpdateEntity(id, { pos: newPos });
     // Special case: update patrol start if moving a patrolling enemy to keep them synced loosely
     const ent = entities.find(e => e.id === id);
     if (ent && ent.behavior === 'PATROL' && ent.patrolStart) {
         // This is a rough UX enhancement, real implementation might be more complex
         const diffX = newPos.x - ent.pos.x;
         const diffY = newPos.y - ent.pos.y;
         handleUpdateEntity(id, { 
             patrolStart: { x: ent.patrolStart.x + diffX, y: ent.patrolStart.y + diffY },
             patrolEnd: { x: (ent.patrolEnd?.x || 0) + diffX, y: (ent.patrolEnd?.y || 0) + diffY }
         });
     }
  };

  // Editor: Delete
  const handleDeleteEntity = (id: string) => {
      if (id === 'ghost_player') return; // Cannot delete start pos
      setEditorLevel(prev => ({
          ...prev,
          entities: prev.entities.filter(e => e.id !== id)
      }));
      setSelectedEntityId(null);
      audio.sfxDie(); // Reuse die sound for delete
  };

  // Editor: Export JSON
  const handleExportJson = () => {
      // Create a clean level object that matches the LevelData interface
      const exportLevelData: LevelData = {
          id: 99, // Placeholder ID
          name: editorLevel.name,
          description: editorLevel.description,
          startPos: editorLevel.startPos,
          physics: editorLevel.physics,
          entities: editorLevel.entities.map(e => {
              // Create a clean copy of the entity
              const cleanEntity: GameEntity = {
                  id: e.id,
                  type: e.type,
                  name: e.name,
                  pos: e.pos,
                  size: e.size,
                  velocity: { x: 0, y: 0 }, // Reset velocity for start
                  color: e.color,
                  isStatic: e.isStatic,
                  isSolid: e.isSolid,
                  isVisible: e.isVisible,
                  // Include optional properties if they are set/relevant
                  ...(e.isLocked !== undefined && { isLocked: e.isLocked }),
                  ...(e.isDeadly !== undefined && { isDeadly: e.isDeadly }),
                  ...(e.isAlwaysVisible !== undefined && { isAlwaysVisible: e.isAlwaysVisible }),
                  ...(e.gravityScale !== undefined && e.gravityScale !== 1 && { gravityScale: e.gravityScale }),
                  ...(e.behavior && e.behavior !== 'DEFAULT' && { behavior: e.behavior }),
                  ...(e.behavior === 'PATROL' && {
                      patrolStart: e.patrolStart,
                      patrolEnd: e.patrolEnd,
                      patrolSpeed: e.patrolSpeed
                  }),
                  ...(e.behavior === 'TURRET' && {
                      fireRate: e.fireRate,
                      projectileSpeed: e.projectileSpeed
                  }),
                  ...(e.label && { label: e.label }),
                  ...(e.description && { description: e.description })
              };
              return cleanEntity;
          })
      };

      // Transform to pseudo-code for levels.ts
      let jsonOutput = JSON.stringify(exportLevelData, null, 2);
      
      // 1. Unquote keys: "key": value -> key: value
      jsonOutput = jsonOutput.replace(/"(\w+)":/g, '$1:');
      
      // 2. Replace EntityType strings: type: "WALL" -> type: EntityType.WALL
      jsonOutput = jsonOutput.replace(/type: "(\w+)"/g, 'type: EntityType.$1');

      // 3. Replace Hex Colors with Constants: color: "#123456" -> color: COLORS.name
      // We sort colors by length desc to avoid partial matches if any (unlikely with hex)
      Object.entries(COLORS).forEach(([key, value]) => {
          // Escape logic not strictly needed for simple hex, but good practice if generic
          // value is like "#334155"
          // We want to replace occurrences of "#334155" (with quotes) with COLORS.wall
          // We must be careful about regex special chars in hex (none usually, just #)
          const regex = new RegExp(`"${value}"`, 'g');
          jsonOutput = jsonOutput.replace(regex, `COLORS.${key}`);
      });

      navigator.clipboard.writeText(jsonOutput);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
      audio.sfxClick();
  };

  const handleTestToggle = () => {
      audio.sfxClick();
      if (isEditorTesting) {
          setIsEditorTesting(false);
          // Revert to blueprint
          setupLevel(editorLevel); // Should trigger effect
      } else {
          // Setup test
          setupLevel(editorLevel);
          setIsEditorTesting(true);
      }
  };

  const selectedEntity = entities.find(e => e.id === selectedEntityId) || null;

  // --- RENDER SCREEN LOGIC ---
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-slate-300 font-mono select-none overflow-hidden relative">
       <div className="scanline z-50 pointer-events-none fixed inset-0"></div>

       {gameState === 'MENU' && (
           <div className="flex flex-col items-center gap-8 z-40 animate-in fade-in duration-700">
               <h1 className="text-6xl font-bold text-cyan-400 tracking-tighter drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] crt-flicker border-b-4 border-cyan-800 pb-2">
                   GLITCH_RUNNER
               </h1>
               <div className="flex flex-col gap-4 w-64">
                   <button 
                        onClick={() => { audio.sfxClick(); setGameState('PLAYING'); }}
                        className="group flex items-center justify-between px-4 py-3 bg-slate-900 border border-slate-700 hover:border-cyan-500 hover:bg-slate-800 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all text-cyan-500"
                   >
                       <span className="font-bold tracking-widest">EXECUTE</span>
                       <Play className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                   </button>
                    <button 
                        onClick={() => { audio.sfxClick(); setGameState('EDITOR'); }}
                        className="group flex items-center justify-between px-4 py-3 bg-slate-900 border border-slate-700 hover:border-yellow-500 hover:bg-slate-800 hover:shadow-[0_0_10px_rgba(234,179,8,0.3)] transition-all text-yellow-500"
                   >
                       <span className="font-bold tracking-widest">LEVEL_EDITOR</span>
                       <Hammer className="w-4 h-4 group-hover:-rotate-12 transition-transform" />
                   </button>
                   <button 
                        onClick={() => { audio.sfxClick(); setGameState('ABOUT'); }}
                        className="group flex items-center justify-between px-4 py-3 bg-slate-900 border border-slate-700 hover:border-cyan-500 hover:bg-slate-800 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all text-slate-400 hover:text-cyan-400"
                   >
                       <span className="font-bold tracking-widest">README.TXT</span>
                       <Info className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                   </button>
               </div>
               <div className="text-xs text-slate-600 mt-8 font-mono">
                   v1.3.3 // SYSTEM_READY
               </div>
           </div>
       )}

       {gameState === 'ABOUT' && (
           <div className="max-w-2xl p-8 bg-slate-900 border border-slate-700 rounded shadow-2xl z-40 animate-in slide-in-from-bottom-4 duration-300">
               <div className="flex items-center gap-2 mb-6 text-cyan-500 border-b border-slate-700 pb-4">
                   <Terminal className="w-6 h-6" />
                   <h2 className="text-2xl font-bold tracking-widest">SYSTEM DOCUMENTATION</h2>
               </div>
               <div className="space-y-4 text-sm leading-relaxed text-slate-300 mb-8 font-mono">
                   <p>
                       <strong className="text-cyan-400">GLITCH_RUNNER</strong> is a meta-hacking puzzle platformer. You are an autonomous agent injected into a hostile server environment.
                   </p>
                   <p>
                       The world is not static. Everything is a Javascript Object. To progress, you must select entities in the world and <strong className="text-yellow-400">rewrite their properties</strong> in real-time.
                   </p>
                   <ul className="list-disc pl-5 space-y-2 text-slate-400">
                       <li>Locked door? Set <code>isLocked: false</code>.</li>
                       <li>Wall in your way? Set <code>isSolid: false</code>.</li>
                       <li>Gap too wide? Lower <code>gravity_constant</code>.</li>
                       <li>Turret firing too fast? Hack its <code>fire_rate</code>.</li>
                   </ul>
               </div>
               
               <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-800">
                    <button 
                            onClick={() => { audio.sfxClick(); setGameState('MENU'); }}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-900/20 border border-cyan-800 text-cyan-400 hover:bg-cyan-900/40 hover:border-cyan-500 transition-all rounded"
                    >
                        <ArrowLeft className="w-4 h-4" /> RETURN_TO_ROOT
                    </button>
                    
                    <a 
                        href="https://moeez404.github.io/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
                    >
                        {'>'}_{'<'} Architect: Moeez Ahmed
                    </a>
               </div>
           </div>
       )}

       {gameState === 'WON' && (
           <div className="flex flex-col items-center justify-center z-40 animate-in zoom-in duration-500">
               <div className="relative">
                   <div className="absolute -inset-10 bg-green-500/20 blur-xl rounded-full animate-pulse"></div>
                   <h1 className="text-8xl font-black text-green-500 tracking-tighter mb-4 relative z-10 crt-flicker">
                       SYSTEM ROOTED
                   </h1>
               </div>
               <p className="text-xl text-green-300 tracking-[0.5em] mb-12 animate-pulse">ACCESS GRANTED</p>
               <button 
                    onClick={() => { 
                        audio.sfxClick(); 
                        setCurrentLevelId(1);
                        setGameState('MENU'); 
                    }}
                    className="px-8 py-3 bg-slate-900 border border-green-500 text-green-400 hover:bg-green-900/20 hover:scale-105 transition-all font-bold tracking-widest shadow-[0_0_20px_rgba(34,197,94,0.3)]"
               >
                   REBOOT SYSTEM
               </button>
           </div>
       )}

       {(gameState === 'PLAYING' || gameState === 'EDITOR') && (
         <>
             {/* Header / Toolbar */}
             <div className="flex items-center justify-between w-full max-w-[1150px] mb-2 px-4">
                 <div className="flex items-center gap-4">
                     {gameState === 'PLAYING' && (
                        <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur border border-slate-700 p-2 rounded-full z-40">
                            <span className="text-xs text-cyan-500 font-bold px-2 tracking-widest">:: LEVEL_SELECT ::</span>
                            <div className="flex gap-1">
                                {LEVELS.map(level => (
                                    <button
                                        key={level.id}
                                        onClick={() => { audio.sfxClick(); setCurrentLevelId(level.id); }}
                                        className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-full transition-all
                                            ${currentLevelId === level.id 
                                                ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.5)] scale-110' 
                                                : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'}
                                        `}
                                    >
                                        {level.id}
                                    </button>
                                ))}
                            </div>
                        </div>
                     )}
                     {gameState === 'EDITOR' && (
                         <div className="flex gap-2">
                             <button 
                                onClick={() => { audio.sfxClick(); setGameState('MENU'); }}
                                className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 px-3 py-1 rounded text-xs flex items-center gap-2"
                             >
                                 <ArrowLeft size={14} /> EXIT EDITOR
                             </button>
                             <div className="bg-slate-900 border border-slate-700 rounded flex items-center p-1 gap-2">
                                 <button
                                    onClick={handleTestToggle}
                                    className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-2 transition-all ${isEditorTesting ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-cyan-400'}`}
                                 >
                                     {isEditorTesting ? <Code size={14}/> : <Play size={14}/>}
                                     {isEditorTesting ? 'EDIT' : 'TEST'}
                                 </button>
                                 <button
                                    onClick={handleExportJson}
                                    className="px-3 py-1 rounded text-xs font-bold bg-slate-800 text-slate-400 hover:text-green-400 flex items-center gap-2 transition-all"
                                 >
                                     {copiedJson ? <Check size={14} /> : <Copy size={14}/>}
                                     {copiedJson ? 'COPIED!' : 'GET JSON'}
                                 </button>
                             </div>
                         </div>
                     )}
                 </div>
                 
                 {gameState === 'PLAYING' && (
                    <button 
                        onClick={() => { audio.sfxClick(); setGameState('MENU'); }}
                        className="bg-slate-900/50 hover:bg-slate-800 text-slate-500 hover:text-slate-300 p-2 rounded-full transition-all z-40"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                 )}
             </div>

            <div 
                className="flex flex-row bg-slate-900 border border-slate-700 shadow-2xl rounded-lg overflow-hidden shrink-0 relative z-30" 
                style={{ width: `${CANVAS_WIDTH + 320 + (gameState === 'EDITOR' && !isEditorTesting ? 256 : 0)}px`, height: `${CANVAS_HEIGHT}px` }}
            >
                {/* Editor Sidebar */}
                {gameState === 'EDITOR' && !isEditorTesting && (
                    <EditorPalette onDragStart={handleEditorDragStart} />
                )}

                <div className="relative shrink-0" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
                    <GameViewport 
                        entities={entities} 
                        playerId="player_1"
                        onSelectEntity={setSelectedEntityId}
                        selectedEntityId={selectedEntityId}
                        onSceneClick={handleSceneClick}
                        isEditor={gameState === 'EDITOR' && !isEditorTesting}
                        onEntityMove={handleEntityMove}
                        onDropEntity={handleEditorDrop}
                    />
                    
                    {gameMessage && (
                        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-black/80 border border-cyan-500/50 text-cyan-400 px-6 py-2 rounded text-sm backdrop-blur-sm animate-pulse z-40">
                            {gameMessage}
                        </div>
                    )}
                    
                    <div className="absolute bottom-2 left-2 text-[10px] text-slate-500 z-30 pointer-events-none">
                        COORD: {entities.find(e => e.type === EntityType.PLAYER)?.pos.x.toFixed(0)}, {entities.find(e => e.type === EntityType.PLAYER)?.pos.y.toFixed(0)}
                    </div>
                </div>

                <Inspector 
                    entity={selectedEntity}
                    physics={physics}
                    onUpdateEntity={handleUpdateEntity}
                    onUpdatePhysics={handleUpdatePhysics}
                    isPaused={isPaused}
                    onTogglePause={() => {
                        setIsPaused(!isPaused);
                    }}
                    onPlayClickSound={() => audio.sfxClick()}
                    isEditor={gameState === 'EDITOR' && !isEditorTesting}
                    onDeleteEntity={handleDeleteEntity}
                />
            </div>
            
            <div className="mt-4 text-[10px] text-slate-600 font-mono">
                {gameState === 'EDITOR' && !isEditorTesting 
                    ? "DRAG FROM LEFT • DRAG ON CANVAS • CLICK TO EDIT PROPERTIES" 
                    : "USE [W,A,S,D] OR ARROWS TO MOVE • CLICK OBJECTS TO HACK"
                }
            </div>
         </>
       )}
    </div>
  );
};

export default App;