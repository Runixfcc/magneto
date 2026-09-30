/** Magnetic Master — main entry point and game loop */

import { CameraManager } from './camera/camera';
import { HandTracker, TrackedHands } from './tracking/handTracker';
import { GestureManager, GestureState } from './gestures/gestureManager';
import { startCalibration, addCalibrationSample, finishCalibration, resetAim, setAimSensitivity, getAimSensitivity } from './gestures/aim';
import { ErrorCoach } from './coach/errorCoach';
import { GameWorld } from './game/world';
import { getScoreState } from './game/scoring';
import { getShieldState } from './gestures/shield';
import { HandOverlay } from './render/handOverlay';
import { HUD } from './ui/hud';
import { ScreenManager, showToast } from './ui/screens';
import { SFXManager } from './audio/sfx';
import { MockInput } from './debug/mockInput';
import { StoryNovelManager } from './ui/novel';
import { CameraCursorManager } from './ui/cameraCursor';

// ===== Game state machine =====
type GamePhase = 'START' | 'STORY_INTRO' | 'NOVEL' | 'CALIBRATING' | 'TUTORIAL' | 'PLAYING' | 'INTER_WAVE' | 'PAUSED' | 'RESULTS';

class Game {
  // Core systems
  private cameraManager: CameraManager | null = null;
  private handTracker: HandTracker;
  private gestureManager: GestureManager;
  private errorCoach: ErrorCoach;
  private world: GameWorld;
  private handOverlay: HandOverlay;
  private hud: HUD;
  private screenManager: ScreenManager;
  private mockInput: MockInput;
  private storyManager: StoryNovelManager;
  private cameraCursor: CameraCursorManager;
  private isCameraInitializing = false;

  // State
  private phase: GamePhase = 'START';
  private isStoryCampaign = true;
  private lastTime = 0;
  private calibrationTime = 0;
  private calibrationDuration = 3; // seconds
  private tutorialStep = 0;
  private tutorialSteps = [
    { icon: '✊', text: '1. Наведи прицел на предмет или врага и сожми ПРАВЫЙ кулак (или зажми ЛКМ), чтобы поднять его в воздух!' },
    { icon: '💨', text: '2. Раскрой ладонь (или отпусти кнопку), чтобы швырнуть его на огромной скорости куда угодно!' },
    { icon: '💥', text: '3. Сожми ЛЕВЫЙ кулак (или ПКМ / клавиша E): мощный МАГНИТНЫЙ ИМПУЛЬС раскидывает всех врагов волной!' }
  ];
  private tutorialComplete = false;
  private useMock = false;
  private pauseTimer = 0;
  private lastErrorToast = '';
  private lastHP = 100;
  private interWaveToastShown = false;

  // Tracked hand data (shared between tracking and render loops)
  private currentHands: TrackedHands = { left: null, right: null, timestamp: 0 };

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const handCanvas = document.getElementById('hand-canvas') as HTMLCanvasElement;

    const lowQuality = (document.getElementById('chk-quality') as HTMLInputElement)?.checked ?? false;

    this.handTracker = new HandTracker();
    this.gestureManager = new GestureManager();
    this.errorCoach = new ErrorCoach();
    this.world = new GameWorld(canvas, lowQuality);
    this.handOverlay = new HandOverlay(handCanvas);
    this.hud = new HUD();
    this.screenManager = new ScreenManager();
    this.mockInput = new MockInput();
    this.storyManager = new StoryNovelManager(this.world.sfx);
    this.cameraCursor = new CameraCursorManager(this.world.sfx);

    // Auto-arm camera if permission is already granted
    navigator.permissions?.query?.({ name: 'camera' as any })
      .then((status) => {
        if (status.state === 'granted') {
          this.ensureCameraInitialized().catch(() => {});
        }
      })
      .catch(() => {});

    this.setupStoryCallbacks();
    this.setupEventListeners();
  }

  private setupStoryCallbacks(): void {
    this.storyManager.onPractice((stepType) => {
      switch (stepType) {
        case 'throw':
          this.world.setMission('mission_1_javelin');
          this.phase = 'PLAYING';
          this.screenManager.hideAll();
          this.hud.show();
          this.world.startCameraSwoop();
          showToast('Миссия 1: «Копьё» — Порази 5 мишеней на поле!', 'info');
          break;

        case 'lock':
          showToast('Замок сорван! Сила магнетизма сокрушила сталь!', 'info');
          setTimeout(() => this.startStoryChapter(3), 1000); // Interlude 2: «Красная ночь Освенцима»
          break;

        case 'escape':
        case 'shield':
          this.world.setMission('mission_3_escape');
          this.phase = 'PLAYING';
          this.screenManager.hideAll();
          this.hud.show();
          this.world.startCameraSwoop();
          showToast('Миссия 3: «Побег» — Беги вперед к северным воротам (W / ☝️) и отбивайся от нацистов!', 'info');
          break;

        case 'battle':
          this.world.setMission('mission_4_marionette');
          this.phase = 'PLAYING';
          this.screenManager.hideAll();
          this.hud.show();
          this.world.startCameraSwoop();
          showToast('Миссия 4: «Марионетка» — Разорви нити [T] и сокруши Астрального Кукловода!', 'info');
          break;

        case 'heroes':
          this.world.setMission('mission_6_heroes');
          this.phase = 'PLAYING';
          this.screenManager.hideAll();
          this.hud.show();
          this.world.startCameraSwoop();
          showToast('Миссия 6: «Битва с Героями Земли» — Сокруши Мстителей и Стражей!', 'info');
          break;

        case 'ultimatum':
          this.world.setMission('mission_7_ultimatum');
          this.phase = 'PLAYING';
          this.screenManager.hideAll();
          this.hud.show();
          this.world.startCameraSwoop();
          showToast('Миссия 7: «Ультиматум Мутантов» — Уничтожь Халка и тяжелых Стражей!', 'info');
          break;
      }
    });

    this.storyManager.onComplete(() => {
      this.showResults();
    });
  }

  private startStoryChapter(index: number): void {
    this.phase = 'NOVEL';
    this.screenManager.hideAll();
    this.hud.hide();

    // Dynamically set authentic 3D environment for each chapter
    switch (index) {
      case 0: // Миссия 1: «Копьё» -> 1930s Nuremberg Athletics Stadium
      case 1: // Экспозиция 1: «Холодный пепел»
        this.world.setMission('mission_1_javelin');
        break;
      case 2: // Миссия 2: «Замок» -> Underground Vault Bunker with Iron Door
        this.world.setMission('mission_2_lock');
        break;
      case 3: // Экспозиция 2: «Красная ночь Освенцима»
      case 4: // Миссия 3: «Побег» -> Nighttime Prison Camp with Searchlights & Barbed Wire
        this.world.setMission('mission_3_escape');
        break;
      case 5: // Экспозиция 3: «Пепел десятилетий и Тень Аракко»
      case 6: // Миссия 4: «Марионетка» -> Astral Mindscape Boss Duel
        this.world.setMission('mission_4_marionette');
        break;
      case 7: // Экспозиция 4: «Разорванные нити»
      case 8: // Миссия 5: «Пробуждение» -> Astral Mindscape
        this.world.setMission('mission_5_awakening');
        break;
      case 9: // Экспозиция 5: «Крах мирного диалога»
      case 10: // Миссия 6: «Битва с Героями Земли» -> Manhattan NYC Street
        this.world.setMission('mission_6_heroes');
        break;
      case 11: // Экспозиция 6: «Манифест свободы мутантов»
      case 12: // Миссия 7: «Ультиматум мутантов» -> Manhattan NYC Street
      case 13: // Финал: «Триумф Homo Superior»
        this.world.setMission('mission_7_ultimatum');
        break;
    }

    this.storyManager.playChapter(index);
  }

  private setupEventListeners(): void {
    // Story campaign button
    document.getElementById('btn-story')?.addEventListener('click', () => {
      this.isStoryCampaign = true;
      this.useMock = false;
      this.storyManager.setMouseMode(false);
      this.startStoryCampaign();
    });

    // Play button (Quick Arena)
    document.getElementById('btn-play')!.addEventListener('click', () => {
      this.isStoryCampaign = false;
      this.useMock = false;
      this.storyManager.setMouseMode(false);
      this.startGame();
    });

    // Mock mode button (Mouse story campaign)
    document.getElementById('btn-mock')!.addEventListener('click', () => {
      this.isStoryCampaign = true;
      this.useMock = true;
      this.mockInput.enable();
      this.storyManager.setMouseMode(true);
      this.startStoryCampaignMock();
    });

    // Duel Mode button (1v1 on White Plane)
    document.getElementById('btn-duel')?.addEventListener('click', () => {
      this.isStoryCampaign = false;
      this.useMock = false;
      this.storyManager.setMouseMode(false);
      this.startDuelMode();
    });

    // Prevent context menu from interrupting right click
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        (window as any).__magneto_space_down = true;
      }
      if (e.button === 2) {
        (window as any).__magneto_right_mouse_down = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        (window as any).__magneto_space_down = false;
      }
      if (e.button === 2) {
        (window as any).__magneto_right_mouse_down = false;
      }
    });

    // Space key for dialogue advancing or lock minigame in mouse mode
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        (window as any).__magneto_space_down = true;
        if (this.phase === 'NOVEL') {
          if (this.storyManager.isLockActive) {
            this.storyManager.triggerLockYank();
          } else {
            this.storyManager.advanceDialogue();
          }
        }
      }
      if (e.code === 'KeyE' || e.code === 'KeyQ' || e.code === 'KeyF' || e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У') {
        (window as any).__magneto_right_mouse_down = true;
      }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф') {
        (window as any).__magneto_dodge_left = true;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
        (window as any).__magneto_dodge_right = true;
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        (window as any).__magneto_space_down = false;
      }
      if (e.code === 'KeyE' || e.code === 'KeyQ' || e.code === 'KeyF' || e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У') {
        (window as any).__magneto_right_mouse_down = false;
      }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф') {
        (window as any).__magneto_dodge_left = false;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
        (window as any).__magneto_dodge_right = false;
      }
    });

    // Restart button
    document.getElementById('btn-restart')!.addEventListener('click', () => {
      this.restart();
    });

    // Skip tutorial / current story mission
    document.getElementById('btn-skip-tutorial')!.addEventListener('click', () => {
      this.tutorialComplete = true;
      if (this.isStoryCampaign) {
        if (this.world.currentMission === 'mission_1_javelin') {
          showToast('Миссия 1 пропущена. Экспозиция: «Холодный пепел»...', 'info');
          this.startStoryChapter(1);
        } else if (this.world.currentMission === 'mission_3_escape') {
          showToast('Побег завершён. Переход: «Пепел десятилетий и Тень Аракко»...', 'info');
          this.startStoryChapter(5);
        } else if (this.world.currentMission === 'mission_4_marionette') {
          showToast('Миссия 4 завершена. Переход: «Разорванные нити»...', 'info');
          this.startStoryChapter(7);
        } else if (this.world.currentMission === 'mission_6_heroes') {
          showToast('Миссия 6 завершена. Переход: «Манифест Свободы Мутантов»...', 'info');
          this.startStoryChapter(11);
        } else if (this.world.currentMission === 'mission_7_ultimatum') {
          showToast('Миссия 7 завершена. Переход: «Триумф Homo Superior»...', 'info');
          this.startStoryChapter(13);
        } else {
          this.startPlaying();
        }
      } else {
        this.startPlaying();
      }
    });

    // Fullscreen
    document.getElementById('btn-fullscreen')!.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });

    // Keyboard shortcuts: R = recalibrate, T = Magnetic Tear, Q = Implosion Clap
    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        if (this.phase === 'CALIBRATING' || this.phase === 'PLAYING') {
          this.startCalibration();
        }
      }
      if ((e.code === 'KeyT' || e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е') && this.phase === 'PLAYING') {
        this.world.triggerMagneticTear();
      }
      if ((e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q' || e.key === 'й' || e.key === 'Й') && this.phase === 'PLAYING') {
        this.world.triggerScrapImplosion();
      }
    });

    // Sensitivity sliders
    const savedSens = localStorage.getItem('magneto_sensitivity');
    const initialSens = savedSens ? parseInt(savedSens, 10) : 130;
    setAimSensitivity(initialSens / 100);

    const sliderStart = document.getElementById('slider-sensitivity') as HTMLInputElement | null;
    const labelStart = document.getElementById('label-sensitivity') as HTMLElement | null;
    const sliderPause = document.getElementById('slider-sensitivity-pause') as HTMLInputElement | null;
    const labelPause = document.getElementById('label-sensitivity-pause') as HTMLElement | null;

    const updateSensUI = (val: number) => {
      setAimSensitivity(val / 100);
      localStorage.setItem('magneto_sensitivity', val.toString());
      if (sliderStart) sliderStart.value = val.toString();
      if (labelStart) labelStart.textContent = `${val}%`;
      if (sliderPause) sliderPause.value = val.toString();
      if (labelPause) labelPause.textContent = `${val}%`;
    };

    updateSensUI(initialSens);

    sliderStart?.addEventListener('input', (e) => {
      updateSensUI(parseInt((e.target as HTMLInputElement).value, 10));
    });
    sliderPause?.addEventListener('input', (e) => {
      updateSensUI(parseInt((e.target as HTMLInputElement).value, 10));
    });

    // Check URL for mock mode
    if (window.location.search.includes('mock=1')) {
      this.useMock = true;
      this.mockInput.enable();
    }
  }

  private async ensureCameraInitialized(): Promise<void> {
    if (this.cameraManager?.isRunning) return;
    if (this.isCameraInitializing) return;

    this.isCameraInitializing = true;
    try {
      const videoEl = document.getElementById('camera-video') as HTMLVideoElement;
      if (!this.cameraManager) {
        this.cameraManager = new CameraManager(videoEl);
      }
      await this.cameraManager.start();
      document.getElementById('camera-overlay')?.classList.add('visible');

      await this.handTracker.init();

      this.cameraManager.onFrame((video, timestamp) => {
        this.currentHands = this.handTracker.processFrame(video, timestamp);
      });
    } catch (err) {
      this.isCameraInitializing = false;
      throw err;
    } finally {
      this.isCameraInitializing = false;
    }
  }

  private async startGame(): Promise<void> {
    this.screenManager.hideAll();
    
    // Show loading state
    showToast('Загрузка...', 'info');

    try {
      await this.ensureCameraInitialized();

      // Init 3D world
      this.world.setMission('quick_arena');
      await this.world.init();
      this.world.sfx.resume();

      // Start calibration
      this.startCalibration();

    } catch (err) {
      console.error('Failed to start:', err);
      showToast(`Ошибка: ${(err as Error).message}`, 'error');
      this.screenManager.show('start');
    }
  }

  private async startGameMock(): Promise<void> {
    this.screenManager.hideAll();
    showToast('Режим мыши: ЛКМ = захват/бросок, ПКМ = притяжение / сжатие врага / репульсия', 'info');

    try {
      this.world.setMission('quick_arena');
      await this.world.init();
      this.world.sfx.resume();

      // Skip calibration in mock mode
      resetAim();
      startCalibration();
      // Provide fake calibration samples
      for (let i = 0; i < 20; i++) {
        addCalibrationSample({
          closure: 1.8, yaw: 0, pitch: 0, roll: 0,
          palmSize: 0.08, screenPalmSize: 0.08, wristScreen: { x: 0.5, y: 0.5 },
          wristSpeed: 0, palmNormal: { x: 0, y: 0, z: 1 },
          fingerDistances: [1.8, 1.9, 2.0, 1.8, 1.6],
          palmFacingCamera: true, isPointingIndex: false, confidence: 0.95
        });
      }
      finishCalibration();

      // First teach how to pick up and throw, then start battle!
      if (!this.tutorialComplete) {
        this.startTutorial();
      } else {
        this.startPlaying();
      }

    } catch (err) {
      console.error('Failed to start mock:', err);
      showToast(`Ошибка: ${(err as Error).message}`, 'error');
      this.screenManager.show('start');
    }
  }

  private async startDuelMode(): Promise<void> {
    this.screenManager.hideAll();
    showToast('⚔️ РЕЖИМ «ДУЭЛИ»: Уклоняйся [A/D / Стрелки] и метай встречный металл [КУЛАК]!', 'info');

    try {
      await this.ensureCameraInitialized();

      resetAim();
      this.world.setMission('duel_mode');
      await this.world.init();
      this.world.sfx.resume();

      this.phase = 'PLAYING';
      this.hud.show();
      if (!this.useMock) {
        document.getElementById('camera-overlay')!.classList.add('visible');
      }
      this.world.startCameraSwoop(2.0);

    } catch (err) {
      console.error('Failed to start duel mode:', err);
      showToast(`Ошибка: ${(err as Error).message}`, 'error');
      this.screenManager.show('start');
    }
  }

  private async startStoryCampaign(): Promise<void> {
    this.screenManager.hideAll();
    this.hud.hide();
    this.phase = 'STORY_INTRO';

    // Start camera immediately in background so it's live during intro video!
    this.ensureCameraInitialized().catch(err => {
      console.warn('Camera auto-start notice:', err);
    });

    this.storyManager.startIntroVideo(async () => {
      showToast('Инициализация сенсоров разума...', 'info');
      try {
        await this.ensureCameraInitialized();

        this.world.setMission('mission_1_javelin');
        await this.world.init();
        this.world.sfx.resume();

        this.startCalibration();
      } catch (err) {
        console.error('Failed to start story campaign:', err);
        showToast(`Ошибка: ${(err as Error).message}`, 'error');
        this.screenManager.show('start');
      }
    });
  }

  private async startStoryCampaignMock(): Promise<void> {
    this.screenManager.hideAll();
    this.hud.hide();
    this.phase = 'STORY_INTRO';

    this.storyManager.startIntroVideo(async () => {
      try {
        this.world.setMission('mission_1_javelin');
        await this.world.init();
        this.world.sfx.resume();

        resetAim();
        startCalibration();
        for (let i = 0; i < 20; i++) {
          addCalibrationSample({
            closure: 1.8, yaw: 0, pitch: 0, roll: 0,
            palmSize: 0.08, screenPalmSize: 0.08, wristScreen: { x: 0.5, y: 0.5 },
            wristSpeed: 0, palmNormal: { x: 0, y: 0, z: 1 },
            fingerDistances: [1.8, 1.9, 2.0, 1.8, 1.6],
            palmFacingCamera: true, isPointingIndex: false, confidence: 0.95
          });
        }
        finishCalibration();

        this.startStoryChapter(0);
      } catch (err) {
        console.error('Failed to start story mock:', err);
        showToast(`Ошибка: ${(err as Error).message}`, 'error');
        this.screenManager.show('start');
      }
    });
  }

  private startCalibration(): void {
    this.phase = 'CALIBRATING';
    this.calibrationTime = 0;
    startCalibration();
    this.screenManager.show('calibration');
    this.hud.hide();
  }

  private startTutorial(): void {
    this.phase = 'TUTORIAL';
    this.tutorialStep = 0;
    this.screenManager.show('tutorial');
    this.updateTutorialUI();
    this.hud.show();
    showToast('Наведи прицел на цветной блок и сожми кулак (или зажми ЛКМ), чтобы поднять его!', 'info');
  }

  private startPlaying(): void {
    this.phase = 'PLAYING';
    this.screenManager.hideAll();
    this.hud.show();
    this.world.startCameraSwoop();
    // Start wave manager battle ONLY when actual arcade gameplay begins!
    if (!this.isStoryCampaign) {
      this.world.waveManager?.startBattle('nyc');
    }

    if (!this.useMock) {
      document.getElementById('camera-overlay')!.classList.add('visible');
    }
  }

  private showResults(): void {
    this.phase = 'RESULTS';
    this.hud.hide();
    this.screenManager.showResults(getScoreState(), this.errorCoach);
    this.world.sfx.playWaveComplete();
  }

  private restart(): void {
    this.world.reset();
    this.gestureManager.reset();
    this.errorCoach.reset();
    this.tutorialComplete = false;
    this.tutorialStep = 0;

    if (this.isStoryCampaign) {
      this.startStoryChapter(0);
    } else if (this.useMock) {
      this.startGameMock();
    } else {
      this.startCalibration();
    }
  }

  private updateTutorialUI(): void {
    const step = this.tutorialSteps[this.tutorialStep];
    if (step) {
      this.screenManager.updateTutorial(
        this.tutorialStep + 1,
        this.tutorialSteps.length,
        step.icon,
        step.text
      );
    }
  }

  /** Main game loop */
  run(): void {
    const loop = (time: number) => {
      requestAnimationFrame(loop);

      const dt = this.lastTime ? Math.min((time - this.lastTime) / 1000, 1 / 20) : 1 / 60;
      this.lastTime = time;

      // Get hand data
      const hands = this.useMock
        ? this.mockInput.getHands()
        : this.currentHands;

      // Update optical camera hand cursor for UI button navigation and fist-clicking
      const isCursorPhase = this.phase === 'START' ||
                            this.phase === 'STORY_INTRO' ||
                            this.phase === 'NOVEL' ||
                            this.phase === 'TUTORIAL' ||
                            this.phase === 'RESULTS' ||
                            this.phase === 'PAUSED' ||
                            this.phase === 'CALIBRATING';

      this.cameraCursor.update(hands, dt, isCursorPhase);

      // Render live hand skeleton on camera overlay during UI navigation
      if (!this.useMock && (hands.left || hands.right)) {
        if (
          this.phase === 'START' ||
          this.phase === 'STORY_INTRO' ||
          (this.phase === 'NOVEL' && !this.storyManager.isLockActive && !this.storyManager.isAwakeningActive) ||
          this.phase === 'RESULTS' ||
          this.phase === 'PAUSED'
        ) {
          this.handOverlay.draw(hands, 'none');
        }
      }

      switch (this.phase) {
        case 'START':
        case 'STORY_INTRO':
          // Just render the scene for background
          if (this.world.initialized) {
            this.world.render();
          }
          break;

        case 'NOVEL':
          if (this.storyManager.isLockActive) {
            const gestures = this.gestureManager.update(hands, dt);
            this.storyManager.updateLockMinigame(hands, gestures, dt);
            if (!this.useMock) {
              this.handOverlay.draw(hands, 'none');
            }
          } else if (this.storyManager.isAwakeningActive) {
            const gestures = this.gestureManager.update(hands, dt);
            this.storyManager.updateAwakeningMinigame(hands, gestures, dt);
            if (!this.useMock) {
              this.handOverlay.draw(hands, 'none');
            }
          }
          if (this.world.initialized) {
            this.world.render();
          }
          break;

        case 'CALIBRATING':
          this.updateCalibration(hands, dt);
          if (this.world.initialized) this.world.render();
          break;

        case 'TUTORIAL':
          if (this.world.initialized) {
            this.gestureManager.setHoveredObject(
              this.world.getHoveredObjectId(),
              this.world.getHoveredObjectMass()
            );
            const gestures = this.gestureManager.update(hands, dt);
            this.updateTutorial(gestures, dt);
            this.world.update(dt, gestures);
            this.world.render();

            // Draw hand overlay
            if (!this.useMock) {
              this.handOverlay.draw(hands, 'none');
            }
          }
          break;

        case 'PLAYING':
          this.updatePlaying(hands, dt);
          break;

        case 'PAUSED':
          this.updatePaused(hands, dt);
          if (this.world.initialized) this.world.render();
          break;

        case 'RESULTS':
          if (this.world.initialized) this.world.render();
          break;
      }
    };

    requestAnimationFrame(loop);
  }

  private updateCalibration(hands: TrackedHands, dt: number): void {
    if (hands.left) {
      this.calibrationTime += dt;
      addCalibrationSample(hands.left.features);
    } else {
      // Reset if hand lost
      this.calibrationTime = Math.max(0, this.calibrationTime - dt * 2);
    }

    const progress = Math.min(this.calibrationTime / this.calibrationDuration, 1);
    const secondsLeft = Math.max(0, this.calibrationDuration - this.calibrationTime);
    this.screenManager.updateCalibration(progress, secondsLeft);

    // Draw hand skeleton
    if (!this.useMock) {
      this.handOverlay.draw(hands, 'none');
    }

    if (this.calibrationTime >= this.calibrationDuration) {
      if (finishCalibration()) {
        showToast('Калибровка завершена!', 'info');
        if (this.isStoryCampaign) {
          this.startStoryChapter(0);
        } else if (this.tutorialComplete) {
          this.startPlaying();
        } else {
          this.startTutorial();
        }
      }
    }
  }

  private updateTutorial(gestures: GestureState, _dt: number): void {
    // Check tutorial completion
    switch (this.tutorialStep) {
      case 0: // Grab a javelin/block
        if (gestures.grab.phase === 'GRAB') {
          this.tutorialStep = 1;
          this.updateTutorialUI();
          if (this.isStoryCampaign) {
            showToast('Копьё захвачено! Раскрой ладонь (или отпусти кнопку), чтобы метнуть его в мишень!', 'info');
          } else {
            showToast('Предмет захвачен! Раскрой ладонь (или отпусти кнопку), чтобы метнуть его!', 'info');
          }
        }
        break;
      case 1: // Throw javelin / block
        if (gestures.throw.triggered || (window as any).__magneto_target_hit) {
          (window as any).__magneto_target_hit = false;
          if (this.isStoryCampaign) {
            this.tutorialStep = 2;
            showToast('🎯 Копьё вонзилось в мишень! Первый бросок Макса!', 'info');
            setTimeout(() => this.startStoryChapter(1), 1400); // Chapter 2: «Замок»
          } else {
            this.tutorialStep = 2;
            this.updateTutorialUI();
            showToast('Отличный выстрел! Теперь активируй щит (левый кулак / ПКМ)!', 'info');
          }
        }
        break;
      case 2: // Shield / Impulse
        if (gestures.shield.active || (window as any).__magneto_right_mouse_down) {
          if (this.isStoryCampaign) {
            this.tutorialComplete = true;
            showToast('Щит выдержал огонь! Воспоминание о побеге завершено!', 'info');
            setTimeout(() => this.startStoryChapter(3), 1500); // Chapter 4: «Марионетка»
          } else {
            this.tutorialComplete = true;
            showToast('Щит работает! Все навыки освоены — начинаем бой с манекенами!', 'info');
            setTimeout(() => this.startPlaying(), 1500);
          }
        }
        break;
    }
  }

  private updatePlaying(hands: TrackedHands, dt: number): void {
    if (!this.world.initialized) return;

    // Check for hand loss → pause
    if (!this.useMock && this.handTracker.bothHandsLost) {
      this.pauseTimer += dt;
      if (this.pauseTimer > 5) {
        this.phase = 'PAUSED';
        this.screenManager.show('pause');
        return;
      }
    } else {
      this.pauseTimer = 0;
    }

    // Show "hand lost" toast
    if (!this.useMock) {
      if (this.handTracker.leftLostDuration > 0.3) {
        showToast('Левая рука вне кадра', 'error');
      }
      if (this.handTracker.rightLostDuration > 0.3) {
        showToast('Правая рука вне кадра', 'error');
      }
    }

    // Update gesture manager with hover info
    this.gestureManager.setHoveredObject(
      this.world.getHoveredObjectId(),
      this.world.getHoveredObjectMass()
    );
    this.gestureManager.setEnemyAimPositions(this.world.getEnemyAimPositions());

    // Update gestures
    const gestures = this.gestureManager.update(hands, dt);

    // Update error coach
    const error = this.errorCoach.update(gestures, dt);
    if (error && error.message !== this.lastErrorToast) {
      showToast(error.message, 'error');
      this.lastErrorToast = error.message;
    } else if (!error) {
      this.lastErrorToast = '';
    }

    // Update game world
    this.world.update(dt, gestures);

    // Update HUD
    this.hud.update(
      this.world.playerHP,
      getScoreState(),
      getShieldState(),
      this.world.getWaveState(),
      this.world.getBoss(),
      this.world.getTearState(),
      this.world.getImplosionState(),
      this.world.getWalkMode(),
      this.world.getMissionObjective()
    );

    // Damage flash
    if (this.world.playerHP < this.lastHP) {
      this.hud.flashDamage();
    }
    this.lastHP = this.world.playerHP;

    // Draw hand overlay
    if (!this.useMock) {
      this.handOverlay.draw(hands, this.errorCoach.getHighlightTarget());
    }

    // Render
    this.world.render();

    // Story mission sequential completion handlers
    if (this.isStoryCampaign) {
      if (this.world.currentMission === 'mission_1_javelin') {
        if ((window as any).__magneto_javelin_complete) {
          (window as any).__magneto_javelin_complete = false;
          showToast('🎯 Миссия 1 пройдена! Экспозиция: «Холодный пепел»...', 'info');
          this.phase = 'NOVEL';
          this.hud.hide();
          setTimeout(() => this.startStoryChapter(1), 1200); // Interlude 1: «Холодный пепел»
          return;
        }
      } else if (this.world.currentMission === 'mission_3_escape') {
        if ((window as any).__magneto_escape_complete) {
          (window as any).__magneto_escape_complete = false;
          showToast('🏃 Побег удался! Связь разума: «Пепел десятилетий и Тень Аракко»...', 'info');
          this.phase = 'NOVEL';
          this.hud.hide();
          setTimeout(() => this.startStoryChapter(5), 1200); // Interlude 3: «Пепел десятилетий и Тень Аракко»
          return;
        }
      } else if (this.world.currentMission === 'mission_4_marionette') {
        if ((window as any).__magneto_marionette_complete) {
          (window as any).__magneto_marionette_complete = false;
          showToast('⚡ Астральный Кукловод повержен! Нити разорваны!', 'info');
          this.phase = 'NOVEL';
          this.hud.hide();
          setTimeout(() => this.startStoryChapter(7), 1200); // Interlude 4: «Разорванные нити»
          return;
        }
      } else if (this.world.currentMission === 'mission_6_heroes') {
        if ((window as any).__magneto_heroes_complete) {
          (window as any).__magneto_heroes_complete = false;
          showToast('⚡ Герои Земли повержены! Переход: «Манифест Свободы Мутантов»...', 'info');
          this.phase = 'NOVEL';
          this.hud.hide();
          setTimeout(() => this.startStoryChapter(11), 1200); // Interlude 6: «Манифест Свободы Мутантов»
          return;
        }
      } else if (this.world.currentMission === 'mission_7_ultimatum') {
        if ((window as any).__magneto_ultimatum_complete) {
          (window as any).__magneto_ultimatum_complete = false;
          showToast('👑 Ультиматум принят! Переход: «Триумф Homo Superior»...', 'info');
          this.phase = 'NOVEL';
          this.hud.hide();
          setTimeout(() => this.startStoryChapter(13), 1200); // Epilogue: «Триумф Homo Superior»
          return;
        }
      }
    }

    // Check game over / victory
    if (this.world.isGameOver()) {
      showToast('Поражение!', 'error');
      setTimeout(() => this.showResults(), 1500);
      this.phase = 'RESULTS';
    } else if (this.world.isVictory()) {
      if (this.isStoryCampaign) {
        showToast('Все волны отбиты! Разум освобождается...', 'info');
        setTimeout(() => this.startStoryChapter(4), 1500); // Chapter 5: «Пробуждение»
        this.phase = 'NOVEL';
      } else {
        showToast('Победа!', 'info');
        setTimeout(() => this.showResults(), 1500);
        this.phase = 'RESULTS';
      }
    }

    // Inter-wave toast (fire once per wave)
    const waveState = this.world.getWaveState();
    if (waveState.phase === 'INTER_WAVE' && !this.interWaveToastShown) {
      this.interWaveToastShown = true;
      const topError = this.errorCoach.getTopError();
      if (topError) {
        showToast(`Совет: ${topError.advice}`, 'info');
      }
      this.world.sfx.playWaveComplete();
    } else if (waveState.phase !== 'INTER_WAVE') {
      this.interWaveToastShown = false;
    }
  }

  private updatePaused(hands: TrackedHands, _dt: number): void {
    // Check if hands returned
    if (hands.left && hands.right) {
      this.phase = 'PLAYING';
      this.screenManager.hideAll();
      this.pauseTimer = 0;
    }
  }
}

// ===== Bootstrap =====
const game = new Game();
game.run();
