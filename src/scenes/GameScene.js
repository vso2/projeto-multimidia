import Player from '../game/Player.js';
import TerrainGenerator from '../game/TerrainGenerator.js';
import VoiceController from '../audio/VoiceController.js';
import { defaultStage } from '../game/stages.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.player = null;
    this.terrain = null;
    this.voiceController = null;
    this.audioElement = null;
    this.scrollSpeed = 80; // pixels per second (slower for better control)
    this.startTime = 0;
    this.isGameStarted = false;
    this.isGameOver = false;
    this.statusText = null;
    this.forceText = null;
    this.stageNameText = null;
    this.distanceText = null;
    this.currentStage = null;
    this.forceThresholds = [];
    this.endText = null;
    this.restartText = null;
    this.menuButton = null;
    this.audioData = null; // Store audio data for restart
    this.modalOverlay = null;
    this.modalText = null;
    this.instructionsText = null;
    this.startButton = null;
  }
  
  create(data) {
    console.log('[GameScene] create() called');
    
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
    
    // Calculate force thresholds based on stage difficulty
    this.calculateForceThresholds();
    
    // Create terrain with lanes and pillar obstacles from stage config
    this.terrain = new TerrainGenerator(this, this.currentStage);
    this.terrain.generate();
    
    // Create player starting at lane 0 (bottom - no force)
    const startY = this.terrain.getLaneYPosition(0);
    this.player = new Player(this, 100, startY, this.terrain);
    this.player.setLane(0); // Start at bottom lane
    
    // Create UI text
    this.statusText = this.add.text(10, 10, 'Initializing voice control...', {
      fontSize: '16px',
      fill: '#fff',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    
    this.stageNameText = this.add.text(10, 40, `Stage: ${this.currentStage.name}`, {
      fontSize: '14px',
      fill: '#00ff00',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    
    this.forceText = this.add.text(10, 70, 'Force: 0.000 | Lane: 0', {
      fontSize: '16px',
      fill: '#888888',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    
    this.distanceText = this.add.text(10, 100, 'Distance: 0%', {
      fontSize: '14px',
      fill: '#fff',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    
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
  
  calculateForceThresholds() {
    // Base thresholds for force-to-lane mapping
    const baseThresholds = [0.00, 0.02, 0.04, 0.06, 0.09, 0.12, 0.16, Infinity];
    
    // Apply stage difficulty multiplier
    this.forceThresholds = baseThresholds.map(threshold => 
      threshold === Infinity ? Infinity : threshold * this.currentStage.forceMultiplier
    );
  }
  
  getLaneFromForce(force) {
    // Map force value to lane (0-6)
    for (let lane = 0; lane < 7; lane++) {
      if (force >= this.forceThresholds[lane] && force < this.forceThresholds[lane + 1]) {
        return lane;
      }
    }
    return 0; // Default to bottom lane
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
      'Sing LOUDER to move UP to higher lanes\nStop singing to drop DOWN to bottom lane\nNavigate through pillar gaps!\nSustain your volume to maintain lane position!',
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
        this.voiceController.destroy();
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
    
    // Make UI follow camera regardless of game state
    this.statusText.setScrollFactor(0);
    this.stageNameText.setScrollFactor(0);
    this.forceText.setScrollFactor(0);
    this.distanceText.setScrollFactor(0);
    
    // Don't run game logic until started
    if (!this.isGameStarted || this.isGameOver) {
      // Debug log to see why game is paused
      if (this.isGameOver) {
        console.log('[GameScene] Update skipped - game is over');
      }
      // Still update force display even before game starts
      if (this.voiceController && this.voiceController.isActive && this.forceText) {
        const force = this.voiceController.getForce();
        const currentLane = this.getLaneFromForce(force);
        
        // Show force and lane
        this.forceText.setText(`Force: ${force.toFixed(3)} | Lane: ${currentLane}`);
        
        // Color code by lane (higher lanes = brighter colors)
        const laneColors = ['#444444', '#666666', '#888888', '#aaaaaa', '#00ff00', '#00ffff', '#ffff00'];
        this.forceText.setStyle({ fill: laneColors[currentLane] });
      }
      return;
    }
    
    // Update player position based on force (volume-based lane control)
    if (this.voiceController && this.voiceController.isActive) {
      const force = this.voiceController.getForce();
      
      // Map force to lane
      const targetLane = this.getLaneFromForce(force);
      this.player.setLane(targetLane);
      
      // Show force and current lane
      this.forceText.setText(`Force: ${force.toFixed(3)} | Lane: ${targetLane}`);
      
      // Color code by lane (higher lanes = brighter colors)
      const laneColors = ['#444444', '#666666', '#888888', '#aaaaaa', '#00ff00', '#00ffff', '#ffff00'];
      this.forceText.setStyle({ fill: laneColors[targetLane] });
    }
    
    // Update player
    this.player.update();
    
    // Auto-scroll camera
    const elapsedTime = (time - this.startTime) / 1000; // seconds
    const targetX = this.scrollSpeed * elapsedTime;
    
    // Move player forward
    this.player.sprite.x = 100 + targetX;
    
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
    // Get player position and current lane
    const playerX = this.player.sprite.x;
    const playerLane = this.player.getCurrentLane();
    const playerWidth = 40; // Player sprite width
    const checkRange = 100; // Check obstacles within this range
    
    // Get nearby obstacles
    const nearbyObstacles = this.terrain.getObstaclesInRange(
      playerX - checkRange,
      playerX + checkRange
    );
    
    // Check collision with pillars using lane-based detection
    let hitObstacle = false;
    
    for (const obstacle of nearbyObstacles) {
      if (!obstacle.sprite || !obstacle.sprite.active || !obstacle.isPillar) continue;
      
      // Check X-axis overlap (horizontal collision)
      const obstacleLeft = obstacle.x - obstacle.width / 2;
      const obstacleRight = obstacle.x + obstacle.width / 2;
      const playerLeft = playerX - playerWidth / 2;
      const playerRight = playerX + playerWidth / 2;
      
      const overlapX = playerRight > obstacleLeft && playerLeft < obstacleRight;
      
      // Check if player's lane is blocked by this pillar
      const laneBlocked = obstacle.blockedLanes.includes(playerLane);
      
      // Collision occurs only if BOTH conditions are true
      if (overlapX && laneBlocked) {
        hitObstacle = true;
        // Visual feedback - flash the obstacle
        obstacle.sprite.setFillStyle(0xffff00);
        this.time.delayedCall(100, () => {
          if (obstacle.sprite) obstacle.sprite.setFillStyle(0xff0000);
        });
        break;
      }
    }
    
    // Visual feedback for player
    if (hitObstacle) {
      this.player.sprite.setFillStyle(0xff0000); // Red when hit
      this.endGame(false);
    } else {
      this.player.sprite.setFillStyle(0x00ffff); // Cyan when safe
    }
  }
  
  endGame(success) {
    if (this.isGameOver) return;
    
    this.isGameOver = true;
    
    // Pause audio playback
    if (this.audioElement) {
      this.audioElement.pause();
    }
    
    // Show end message
    const message = success ? 'Level Complete!' : 'Game Over!';
    const color = success ? '#00ff00' : '#ff0000';
    
    // Show end modal
    this.showEndModal(message, color);
  }
  
  showEndModal(message, color) {
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
    console.log('[GameScene] Going back to menu...');
    console.log('[GameScene] Current state - isGameStarted:', this.isGameStarted, 'isGameOver:', this.isGameOver);
    
    // Clean up current game (will be async)
    await this.cleanupAsync();
    
    // Wait a bit more to ensure everything is cleaned up
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log('[GameScene] Cleanup complete, switching to menu...');
    
    // Stop this scene and start menu scene
    this.scene.stop('GameScene');
    this.scene.start('StageSelectScene');
  }
  
  restartGame() {
    // Clean up current game
    this.cleanup();
    
    // Reset game state
    this.isGameOver = false;
    this.isGameStarted = false;
    this.startTime = 0;
    
    // Recreate the game with same audio data
    this.recreate();
  }
  
  cleanup() {
    console.log('[GameScene] cleanup() called');
    
    // Clean up voice controller
    if (this.voiceController) {
      console.log('[GameScene] Destroying voice controller');
      this.voiceController.destroy();
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
    if (this.forceText) {
      this.forceText.destroy();
      this.forceText = null;
    }
    if (this.distanceText) {
      this.distanceText.destroy();
      this.distanceText = null;
    }
    
    // Clear all game objects
    this.children.removeAll();
  }
  
  async cleanupAsync() {
    console.log('[GameScene] cleanupAsync() called');
    
    // Clean up voice controller and wait for AudioContext to close
    if (this.voiceController) {
      console.log('[GameScene] Destroying voice controller async');
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
    if (this.forceText) {
      this.forceText.destroy();
      this.forceText = null;
    }
    if (this.distanceText) {
      this.distanceText.destroy();
      this.distanceText = null;
    }
    
    // Clear all game objects
    this.children.removeAll();
    
    console.log('[GameScene] cleanupAsync() complete');
  }
  
  recreate() {
    // Recalculate force thresholds
    this.calculateForceThresholds();
    
    // Create terrain with lanes and pillar obstacles from stage config
    this.terrain = new TerrainGenerator(this, this.currentStage);
    this.terrain.generate();
    
    // Create player starting at lane 0 (bottom - no force)
    const startY = this.terrain.getLaneYPosition(0);
    this.player = new Player(this, 100, startY, this.terrain);
    this.player.setLane(0); // Start at bottom lane
    
    // Create UI text
    this.statusText = this.add.text(10, 10, 'Initializing voice control...', {
      fontSize: '16px',
      fill: '#fff',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    
    this.stageNameText = this.add.text(10, 40, `Stage: ${this.currentStage.name}`, {
      fontSize: '14px',
      fill: '#00ff00',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    
    this.forceText = this.add.text(10, 70, 'Force: 0.000 | Lane: 0', {
      fontSize: '16px',
      fill: '#888888',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    
    this.distanceText = this.add.text(10, 100, 'Distance: 0%', {
      fontSize: '14px',
      fill: '#fff',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    
    // Reset camera
    this.cameras.main.resetFX();
    this.cameras.main.startFollow(this.player.sprite, false, 1, 0);
    this.cameras.main.setFollowOffset(-300, 0);
    this.cameras.main.setScroll(0, 0);
    
    // Initialize voice controller
    this.initVoiceControl();
    
    // Recreate audio element
    if (this.currentStage.audioFile) {
      this.audioElement = new Audio(this.currentStage.audioFile);
      this.audioElement.volume = 0.4; // Set to 40% volume
    }
    
    // Show modal with headphone message and start button
    this.showStartModal();
  }
  
  shutdown() {
    // Clean up
    if (this.voiceController) {
      this.voiceController.destroy();
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

