import Player from '../game/Player.js';
import TerrainGenerator from '../game/TerrainGenerator.js';
import VoiceController from '../audio/VoiceController.js';
import { defaultStage } from '../game/stages.js';

// Import asset images
import birdSpriteUrl from '../../assets/Pixel Art Bird 16x16/BirdSprite.png';
import backgroundUrl from '../../assets/Tiles/Assets/Background_1.png';
import obstaclesUrl from '../../assets/Tiles/Assets/Assets.png';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.player = null;
    this.terrain = null;
    this.voiceController = null;
    this.audioElement = null;
    this.baseScrollSpeed = 80; // base pixels per second (volume adds boost)
    this.startTime = 0;
    this.isGameStarted = false;
    this.isGameOver = false;
    this.statusText = null;
    this.frequencyVolumeText = null;
    this.stageNameText = null;
    this.distanceText = null;
    this.currentStage = null;
    this.endText = null;
    this.restartText = null;
    this.menuButton = null;
    this.modalOverlay = null;
    this.modalText = null;
    this.instructionsText = null;
    this.startButton = null;
    this.background = null; // Background sprite
  }
  
  preload() {
    console.log('[GameScene] Preloading assets...');
    
    // Add load event listeners for debugging BEFORE loading
    this.load.on('filecomplete', (key, type, data) => {
      console.log('[GameScene] Loaded:', key, type);
    });
    
    this.load.on('loaderror', (file) => {
      console.error('[GameScene] Error loading:', file.key, 'from', file.url);
    });
    
    this.load.on('complete', () => {
      console.log('[GameScene] All assets loaded!');
    });
    
    // Load animated bird sprite sheet (16x16 per frame)
    // Use imported URLs for Vite compatibility
    this.load.spritesheet('bird', birdSpriteUrl, {
      frameWidth: 16,
      frameHeight: 16
    });
    
    // Load sky background
    this.load.image('background', backgroundUrl);
    
    // Load obstacle tileset as spritesheet (16x16 tiles)
    this.load.spritesheet('assetTiles', obstaclesUrl, {
      frameWidth: 16,
      frameHeight: 16
    });
  }
  
  create(data) {
    console.log('[GameScene] create() called');
    
    // Add fixed sky background
    this.background = this.add.image(
      400, 300, // Center of screen (800x600)
      'background'
    );
    this.background.setDisplaySize(800, 600); // Fill entire screen
    this.background.setDepth(-10); // Behind everything
    this.background.setScrollFactor(0); // Fixed, doesn't scroll
    
    // Reset game state flags
    this.isGameStarted = false;
    this.isGameOver = false;
    this.startTime = 0;
    
    // Reset camera to origin
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.stopFollow();
    
    // Use selected stage from data, or fall back to default
    this.currentStage = data.selectedStage || defaultStage;
    
    // Debug: Check if stage loaded
    if (!this.currentStage) {
      console.error('Failed to load defaultStage:', defaultStage);
      throw new Error('Stage configuration failed to load');
    }
    
    console.log('[GameScene] Loaded stage:', this.currentStage.name);
    
    // Expand world bounds to match stage length
    const stageLength = this.currentStage.length;
    const gameHeight = this.game.config.height;
    this.physics.world.setBounds(0, 0, stageLength, gameHeight);
    console.log('[GameScene] World bounds set to:', stageLength, 'x', gameHeight);
    
    // Create terrain with pillar obstacles from stage config
    this.terrain = new TerrainGenerator(this, this.currentStage);
    this.terrain.generate();
    
    // Create bird animations BEFORE creating player
    // Flying animation (second row - 8 frames)
    if (!this.anims.exists('fly')) {
      this.anims.create({
        key: 'fly',
        frames: this.anims.generateFrameNumbers('bird', { 
          start: 8,   // Second row: flying animation starts at frame 8
          end: 15     // 8 frames for flying animation (8-15)
        }),
        frameRate: 8,
        repeat: -1
      });
    }
    
    // Ground animation (first row - 2 frames)
    if (!this.anims.exists('ground')) {
      this.anims.create({
        key: 'ground',
        frames: this.anims.generateFrameNumbers('bird', { 
          start: 6,   // First row: ground animation
          end: 7      // 2 frames (7-8)
        }),
        frameRate: 4,  // Slower animation for ground
        repeat: -1
      });
    }
    
    // Create player starting near bottom of screen
    const startY = this.game.config.height - 100; // Start near bottom
    this.player = new Player(this, 100, startY);
    this.player.sprite.clearTint(); // Ensure no tint on new player
    this.playerHit = false; // Reset collision flag
    
    // Create UI text - positioned on right upper side
    const rightX = this.game.config.width - 10; // Right edge with 10px margin
    
    this.statusText = this.add.text(rightX, 10, 'Initializing voice control...', {
      fontSize: '16px',
      fill: '#fff',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    this.statusText.setOrigin(1, 0); // Right-aligned
    
    this.stageNameText = this.add.text(rightX, 40, `Stage: ${this.currentStage.name}`, {
      fontSize: '14px',
      fill: '#00ff00',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    this.stageNameText.setOrigin(1, 0); // Right-aligned
    
    this.frequencyVolumeText = this.add.text(rightX, 70, 'Frequency: 0 Hz | Volume: 0.00', {
      fontSize: '16px',
      fill: '#888888',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    this.frequencyVolumeText.setOrigin(1, 0); // Right-aligned
    
    this.distanceText = this.add.text(rightX, 100, 'Distance: 0%', {
      fontSize: '14px',
      fill: '#fff',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    this.distanceText.setOrigin(1, 0); // Right-aligned
    
    // Set camera to follow player horizontally
    this.cameras.main.resetFX();
    this.cameras.main.startFollow(this.player.sprite, false, 1, 0);
    this.cameras.main.setFollowOffset(-300, 0);
    this.cameras.main.setScroll(0, 0); // Reset scroll after setting up follow
    
    // Initialize voice controller
    this.initVoiceControl();
    
    // Load audio from assets based on stage configuration
    if (this.currentStage.audioFile) {
      this.audioElement = new Audio(this.currentStage.audioFile);
      this.audioElement.volume = 0.4; // Set to 40% volume
    }
    
    // Show modal with headphone message and start button
    this.showStartModal();
  }
  
  showStartModal() {
    // Create semi-transparent black overlay
    this.modalOverlay = this.add.rectangle(
      this.game.config.width / 2,
      this.game.config.height / 2,
      this.game.config.width,
      this.game.config.height,
      0x000000,
      0.85
    );
    this.modalOverlay.setScrollFactor(0);
    this.modalOverlay.setDepth(1000);
    
    // Add headphone message
    this.modalText = this.add.text(
      this.game.config.width / 2,
      150,
      '🎧 Put your headphones!',
      {
        fontSize: '48px',
        fill: '#00ffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    this.modalText.setOrigin(0.5);
    this.modalText.setScrollFactor(0);
    this.modalText.setDepth(1001);
    
    // Add instructions
    this.instructionsText = this.add.text(
      this.game.config.width / 2,
      280,
      'Sing HIGHER pitch to fly UP!\nSing LOUDER to move FASTER forward!\nStop singing to fall DOWN!\nNavigate through pillar gaps!',
      {
        fontSize: '16px',
        fill: '#ffffff',
        align: 'center',
        lineSpacing: 8
      }
    );
    this.instructionsText.setOrigin(0.5);
    this.instructionsText.setScrollFactor(0);
    this.instructionsText.setDepth(1001);
    
    // Create start button
    this.startButton = this.add.text(
      this.game.config.width / 2,
      400,
      'Start Game',
      {
        fontSize: '32px',
        fill: '#ffffff',
        backgroundColor: '#00aa00',
        padding: { x: 30, y: 15 },
        fontStyle: 'bold'
      }
    );
    this.startButton.setOrigin(0.5);
    this.startButton.setScrollFactor(0);
    this.startButton.setDepth(1001);
    this.startButton.setInteractive({ useHandCursor: true });
    
    // Add hover effects
    this.startButton.on('pointerover', () => {
      this.startButton.setStyle({ fill: '#ffff00', backgroundColor: '#00cc00' });
    });
    
    this.startButton.on('pointerout', () => {
      this.startButton.setStyle({ fill: '#ffffff', backgroundColor: '#00aa00' });
    });
    
    // Start game on click
    this.startButton.on('pointerdown', () => {
      console.log('[GameScene] Start button clicked');
      this.hideStartModal();
      this.startGame();
    });
  }
  
  hideStartModal() {
    if (this.modalOverlay) {
      this.modalOverlay.destroy();
      this.modalOverlay = null;
    }
    if (this.modalText) {
      this.modalText.destroy();
      this.modalText = null;
    }
    if (this.instructionsText) {
      this.instructionsText.destroy();
      this.instructionsText = null;
    }
    if (this.startButton) {
      this.startButton.destroy();
      this.startButton = null;
    }
  }
  
  async initVoiceControl() {
    try {
      console.log('[GameScene] Initializing voice controller...');
      
      // Ensure any previous voice controller is destroyed
      if (this.voiceController) {
        console.log('[GameScene] Cleaning up previous voice controller');
        await this.voiceController.destroyAsync();
        this.voiceController = null;
        // Wait a bit for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      this.voiceController = new VoiceController();
      const success = await this.voiceController.initialize();
      
      console.log('[GameScene] Voice controller initialized:', success);
      
      if (success) {
        this.statusText.setText('Voice control active! Ready to play');
        this.statusText.setStyle({ fill: '#00ff00' });
      } else {
        this.statusText.setText('Voice control failed. Check microphone permissions');
        this.statusText.setStyle({ fill: '#ff0000' });
      }
    } catch (error) {
      console.error('[GameScene] Error initializing voice control:', error);
      this.statusText.setText('Voice control error. Refresh page and allow mic access');
      this.statusText.setStyle({ fill: '#ff0000' });
    }
  }
  
  startGame() {
    console.log('[GameScene] Starting game...');
    this.isGameStarted = true;
    this.isGameOver = false; // Ensure game over is false
    this.playerHit = false; // Reset collision flag
    this.startTime = this.time.now;
    
    // Start audio playback synchronized with game
    if (this.audioElement) {
      this.audioElement.currentTime = 0;
      this.audioElement.play().catch(err => {
        console.warn('Audio playback failed:', err);
      });
    }
    
    this.statusText.setText('Game started! Control volume to change lanes!');
    console.log('[GameScene] Game started - isGameStarted:', this.isGameStarted, 'isGameOver:', this.isGameOver);
  }
  
  update(time, delta) {
    // Safety check: if UI elements are destroyed, don't update
    if (!this.statusText || !this.player || !this.terrain) {
      return;
    }
    
    // Safety check: if delta is invalid, skip this frame
    if (!delta || delta <= 0 || !isFinite(delta) || delta > 1000) {
      console.warn('[GameScene] Invalid delta:', delta);
      return;
    }
    
    // Background is fixed, no scrolling needed
    
    // Make UI follow camera regardless of game state
    this.statusText.setScrollFactor(0);
    this.stageNameText.setScrollFactor(0);
    this.frequencyVolumeText.setScrollFactor(0);
    this.distanceText.setScrollFactor(0);
    
    // Don't run game logic until started
    if (!this.isGameStarted || this.isGameOver) {
      // Still update frequency/volume display even before game starts
      if (this.voiceController && this.voiceController.isActive && this.frequencyVolumeText) {
        const frequency = this.voiceController.getPitch();
        const volume = this.voiceController.getVolume();
        
        // Show frequency and volume
        this.frequencyVolumeText.setText(`Frequency: ${Math.round(frequency)} Hz | Volume: ${volume.toFixed(2)} | Ready!`);
        
        // Color code by frequency (higher frequency = brighter colors)
        const normalizedFreq = Phaser.Math.Clamp((frequency - 100) / (600 - 100), 0, 1);
        const hue = normalizedFreq * 120; // 0 = red, 120 = green
        this.frequencyVolumeText.setStyle({ fill: `hsl(${hue}, 100%, 50%)` });
      }
      return;
    }
    
    // Update player physics based on frequency and volume
    if (this.voiceController && this.voiceController.isActive) {
      const frequency = this.voiceController.getPitch();
      const volume = this.voiceController.getVolume();
      
      // Apply frequency-based upward force
      this.player.applyFrequencyForce(frequency);
      
      // Apply volume-based horizontal boost
      this.player.applyVolumeBoost(volume);
      
      // Show frequency and volume
      const boost = Math.round(this.player.getVolumeBoost());
      const currentSpeed = Math.round(this.baseScrollSpeed + boost);
      this.frequencyVolumeText.setText(`Frequency: ${Math.round(frequency)} Hz | Volume: ${volume.toFixed(2)} | Speed: ${currentSpeed}px/s`);
      
      // Color code by frequency (higher frequency = brighter colors)
      const normalizedFreq = Phaser.Math.Clamp((frequency - 100) / (600 - 100), 0, 1);
      const hue = normalizedFreq * 120; // 0 = red, 120 = green
      this.frequencyVolumeText.setStyle({ fill: `hsl(${hue}, 100%, 50%)` });
    } else {
      // If voice controller becomes inactive, apply defaults
      this.player.applyFrequencyForce(0);
      this.player.applyVolumeBoost(0);
      console.warn('[GameScene] Voice controller not active!');
    }
    
    // Update player physics
    this.player.update(delta);
    
    // Move player forward at base speed + volume boost (always move forward)
    const volumeBoost = this.player.getVolumeBoost();
    const currentSpeed = this.baseScrollSpeed + volumeBoost;
    const horizontalMovement = currentSpeed * delta / 1000;
    
    this.player.sprite.x += horizontalMovement;
    
    // Check collision with terrain
    this.checkTerrainCollision();
    
    // Update distance display
    const totalWidth = this.terrain.getTotalWidth();
    const progress = (this.player.sprite.x / totalWidth) * 100;
    this.distanceText.setText(`Distance: ${Math.min(100, progress).toFixed(1)}%`);
    
    // Check if game is complete
    if (this.player.sprite.x >= totalWidth) {
      this.endGame(true);
    }
  }
  
  checkTerrainCollision() {
    // Don't check collision if game is already over
    if (this.isGameOver) return;
    
    // Get player bounds
    const playerBounds = this.player.getBounds();
    const checkRange = 100; // Check obstacles within this range
    
    // Get nearby obstacles
    const nearbyObstacles = this.terrain.getObstaclesInRange(
      playerBounds.x - checkRange,
      playerBounds.x + checkRange
    );
    
    // Check collision with pillars using bounding box collision
    let hitObstacle = false;
    
    for (const obstacle of nearbyObstacles) {
      if (!obstacle.sprite || !obstacle.sprite.active || !obstacle.isPillar) continue;
      
      // Check X-axis overlap (horizontal collision)
      const obstacleLeft = obstacle.x - obstacle.width / 2;
      const obstacleRight = obstacle.x + obstacle.width / 2;
      const playerLeft = playerBounds.x;
      const playerRight = playerBounds.right;
      
      const overlapX = playerRight > obstacleLeft && playerLeft < obstacleRight;
      
      // Check Y-axis overlap (vertical collision)
      const obstacleTop = obstacle.minY;
      const obstacleBottom = obstacle.maxY;
      const playerTop = playerBounds.y;
      const playerBottom = playerBounds.bottom;
      
      const overlapY = playerBottom > obstacleTop && playerTop < obstacleBottom;
      
      // Collision occurs if BOTH X and Y overlap
      if (overlapX && overlapY) {
        hitObstacle = true;
        break;
      }
    }
    
    // Visual feedback for player - only apply once when collision is first detected
    if (hitObstacle && !this.playerHit) {
      this.playerHit = true; // Mark that player was hit to prevent repeated tint application
      this.endGame(false);
    }
  }
  
  endGame(success) {
    if (this.isGameOver) {
      return;
    }
    
    this.isGameOver = true;
    
    // Pause audio playback
    if (this.audioElement) {
      this.audioElement.pause();
      console.log('[GameScene] Audio paused');
    }
    
    // Show end message
    const message = success ? 'Level Complete!' : 'Game Over!';
    const color = success ? '#00ff00' : '#ff0000';
    
    // Show end modal
    this.showEndModal(message, color);
  }
  
  showEndModal(message, color) {
    console.log('[GameScene] showEndModal called with message:', message, 'color:', color);
    
    // Create semi-transparent black overlay
    this.modalOverlay = this.add.rectangle(
      this.game.config.width / 2,
      this.game.config.height / 2,
      this.game.config.width,
      this.game.config.height,
      0x000000,
      0.85
    );
    this.modalOverlay.setScrollFactor(0);
    this.modalOverlay.setDepth(1000);
    console.log('[GameScene] Modal overlay created');
    
    // Add end message
    this.endText = this.add.text(
      this.game.config.width / 2,
      250,
      message,
      {
        fontSize: '48px',
        fill: color,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    this.endText.setOrigin(0.5);
    this.endText.setScrollFactor(0);
    this.endText.setDepth(1001);
    
    // Create restart button
    this.restartText = this.add.text(
      this.game.config.width / 2,
      320,
      'Restart',
      {
        fontSize: '32px',
        fill: '#ffffff',
        backgroundColor: '#00aa00',
        padding: { x: 30, y: 15 },
        fontStyle: 'bold'
      }
    );
    this.restartText.setOrigin(0.5);
    this.restartText.setScrollFactor(0);
    this.restartText.setDepth(1001);
    this.restartText.setInteractive({ useHandCursor: true });
    
    // Add hover effects
    this.restartText.on('pointerover', () => {
      this.restartText.setStyle({ fill: '#ffff00', backgroundColor: '#00cc00' });
    });
    
    this.restartText.on('pointerout', () => {
      this.restartText.setStyle({ fill: '#ffffff', backgroundColor: '#00aa00' });
    });
    
    // Restart on click
    this.restartText.on('pointerdown', () => {
      console.log('[GameScene] Restart button clicked');
      this.hideEndModal();
      this.restartGame();
    });
    
    // Create back to menu button
    this.menuButton = this.add.text(
      this.game.config.width / 2,
      390,
      'Back to Menu',
      {
        fontSize: '28px',
        fill: '#ffffff',
        backgroundColor: '#ff6b00',
        padding: { x: 25, y: 12 },
        fontStyle: 'bold'
      }
    );
    this.menuButton.setOrigin(0.5);
    this.menuButton.setScrollFactor(0);
    this.menuButton.setDepth(1001);
    this.menuButton.setInteractive({ useHandCursor: true });
    
    // Add hover effects
    this.menuButton.on('pointerover', () => {
      this.menuButton.setStyle({ fill: '#ffff00', backgroundColor: '#ff8c00' });
    });
    
    this.menuButton.on('pointerout', () => {
      this.menuButton.setStyle({ fill: '#ffffff', backgroundColor: '#ff6b00' });
    });
    
    // Back to menu on click
    this.menuButton.on('pointerdown', () => {
      console.log('[GameScene] Back to menu button clicked');
      this.hideEndModal();
      this.backToMenu();
    });
  }
  
  hideEndModal() {
    if (this.modalOverlay) {
      this.modalOverlay.destroy();
      this.modalOverlay = null;
    }
    if (this.endText) {
      this.endText.destroy();
      this.endText = null;
    }
    if (this.restartText) {
      this.restartText.destroy();
      this.restartText = null;
    }
    if (this.menuButton) {
      this.menuButton.destroy();
      this.menuButton = null;
    }
  }
  
  async backToMenu() {
    // Clean up current game (will be async)
    await this.cleanupAsync();
    
    // Wait a bit more to ensure everything is cleaned up
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Stop this scene and start menu scene
    this.scene.stop('GameScene');
    this.scene.start('StageSelectScene');
  }
  
  async restartGame() {
    // Clean up current game resources
    await this.cleanupAsync();
    
    // Wait a bit for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Restart scene (Phaser will call create() automatically)
    this.scene.restart({ selectedStage: this.currentStage });
  }
  
  async cleanupAsync() {
    // Clean up voice controller and wait for AudioContext to close
    if (this.voiceController) {
      await this.voiceController.destroyAsync();
      this.voiceController = null;
    }
    
    // Clean up audio
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement = null;
    }
    
    // Clean up modal elements
    this.hideStartModal();
    this.hideEndModal();
    
    // Clean up terrain
    if (this.terrain) {
      this.terrain.destroy();
      this.terrain = null;
    }
    
    // Clean up player
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    
    // Clean up UI text
    if (this.statusText) {
      this.statusText.destroy();
      this.statusText = null;
    }
    if (this.stageNameText) {
      this.stageNameText.destroy();
      this.stageNameText = null;
    }
    if (this.frequencyVolumeText) {
      this.frequencyVolumeText.destroy();
      this.frequencyVolumeText = null;
    }
    if (this.distanceText) {
      this.distanceText.destroy();
      this.distanceText = null;
    }
    
    // Clear all game objects
    this.children.removeAll();
    
  }
  
  async shutdown() {
    // Clean up
    if (this.voiceController) {
      await this.voiceController.destroyAsync();
    }
    
    // Clean up audio
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    
    if (this.terrain) {
      this.terrain.destroy();
    }
    
    if (this.player) {
      this.player.destroy();
    }
  }
}

