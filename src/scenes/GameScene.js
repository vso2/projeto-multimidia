import Player from '../game/Player.js';
import TerrainGenerator from '../game/TerrainGenerator.js';
import VoiceController from '../audio/VoiceController.js';
import { defaultStage } from '../game/stages.js';

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
    this.background = null;
  }
  
  preload() {
    this.load.spritesheet('bird', birdSpriteUrl, {
      frameWidth: 16,
      frameHeight: 16
    });
    
    this.load.image('background', backgroundUrl);
    
    this.load.spritesheet('assetTiles', obstaclesUrl, {
      frameWidth: 16,
      frameHeight: 16
    });
  }
  
  create(data) {
    this.background = this.add.image(400, 300, 'background');
    this.background.setDisplaySize(800, 600);
    this.background.setDepth(-10);
    this.background.setScrollFactor(0);
    
    this.isGameStarted = false;
    this.isGameOver = false;
    this.startTime = 0;
    
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.stopFollow();
    
    this.currentStage = data.selectedStage || defaultStage;
    
    if (!this.currentStage) {
      console.error('Failed to load defaultStage:', defaultStage);
      throw new Error('Stage configuration failed to load');
    }
    
    const stageLength = this.currentStage.length;
    const gameHeight = this.game.config.height;
    this.physics.world.setBounds(0, 0, stageLength, gameHeight);
    
    this.terrain = new TerrainGenerator(this, this.currentStage);
    this.terrain.generate();
    
    if (!this.anims.exists('fly')) {
      this.anims.create({
        key: 'fly',
        frames: this.anims.generateFrameNumbers('bird', { 
          start: 8,
          end: 15
        }),
        frameRate: 8,
        repeat: -1
      });
    }
    
    if (!this.anims.exists('ground')) {
      this.anims.create({
        key: 'ground',
        frames: this.anims.generateFrameNumbers('bird', { 
          start: 6,
          end: 7
        }),
        frameRate: 4,
        repeat: -1
      });
    }
    
    const startY = this.game.config.height - 100;
    this.player = new Player(this, 100, startY);
    this.player.sprite.clearTint();
    this.playerHit = false;
    
    const rightX = this.game.config.width - 10;
    
    this.statusText = this.add.text(rightX, 10, 'Initializing voice control...', {
      fontSize: '16px',
      fill: '#fff',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    this.statusText.setOrigin(1, 0);
    
    this.stageNameText = this.add.text(rightX, 40, `Stage: ${this.currentStage.name}`, {
      fontSize: '14px',
      fill: '#00ff00',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    this.stageNameText.setOrigin(1, 0);
    
    this.frequencyVolumeText = this.add.text(rightX, 70, 'Frequency: 0 Hz | Volume: 0.00', {
      fontSize: '16px',
      fill: '#888888',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    this.frequencyVolumeText.setOrigin(1, 0);
    
    this.distanceText = this.add.text(rightX, 100, 'Distance: 0%', {
      fontSize: '14px',
      fill: '#fff',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    this.distanceText.setOrigin(1, 0);
    
    this.cameras.main.resetFX();
    this.cameras.main.startFollow(this.player.sprite, false, 1, 0);
    this.cameras.main.setFollowOffset(-300, 0);
    this.cameras.main.setScroll(0, 0);
    
    this.initVoiceControl();
    
    if (this.currentStage.audioFile) {
      this.audioElement = new Audio(this.currentStage.audioFile);
      this.audioElement.volume = 0.4;
    }
    
    this.showStartModal();
  }
  
  showStartModal() {
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
    
    this.startButton.on('pointerover', () => {
      this.startButton.setStyle({ fill: '#ffff00', backgroundColor: '#00cc00' });
    });
    
    this.startButton.on('pointerout', () => {
      this.startButton.setStyle({ fill: '#ffffff', backgroundColor: '#00aa00' });
    });
    
    this.startButton.on('pointerdown', () => {
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
      if (this.voiceController) {
        await this.voiceController.destroyAsync();
        this.voiceController = null;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      this.voiceController = new VoiceController();
      const success = await this.voiceController.initialize();
      
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
    this.isGameStarted = true;
    this.isGameOver = false;
    this.playerHit = false;
    this.startTime = this.time.now;
    
    if (this.audioElement) {
      this.audioElement.currentTime = 0;
      this.audioElement.play().catch(err => {
        console.warn('Audio playback failed:', err);
      });
    }
    
    this.statusText.setText('Game started! Control volume to change lanes!');
  }
  
  update(time, delta) {
    if (!this.statusText || !this.player || !this.terrain) {
      return;
    }
    
    if (!delta || delta <= 0 || !isFinite(delta) || delta > 1000) {
      console.warn('[GameScene] Invalid delta:', delta);
      return;
    }
    
    this.statusText.setScrollFactor(0);
    this.stageNameText.setScrollFactor(0);
    this.frequencyVolumeText.setScrollFactor(0);
    this.distanceText.setScrollFactor(0);
    
    if (!this.isGameStarted || this.isGameOver) {
      if (this.voiceController && this.voiceController.isActive && this.frequencyVolumeText) {
        const frequency = this.voiceController.getPitch();
        const volume = this.voiceController.getVolume();
        
        this.frequencyVolumeText.setText(`Frequency: ${Math.round(frequency)} Hz | Volume: ${volume.toFixed(2)} | Ready!`);
        
        const normalizedFreq = Phaser.Math.Clamp((frequency - 100) / (600 - 100), 0, 1);
        const hue = normalizedFreq * 120;
        this.frequencyVolumeText.setStyle({ fill: `hsl(${hue}, 100%, 50%)` });
      }
      return;
    }
    
    if (this.voiceController && this.voiceController.isActive) {
      const frequency = this.voiceController.getPitch();
      const volume = this.voiceController.getVolume();
      
      this.player.applyFrequencyForce(frequency);
      this.player.applyVolumeBoost(volume);
      
      const boost = Math.round(this.player.getVolumeBoost());
      const currentSpeed = Math.round(this.baseScrollSpeed + boost);
      this.frequencyVolumeText.setText(`Frequency: ${Math.round(frequency)} Hz | Volume: ${volume.toFixed(2)} | Speed: ${currentSpeed}px/s`);
      
      const normalizedFreq = Phaser.Math.Clamp((frequency - 100) / (600 - 100), 0, 1);
      const hue = normalizedFreq * 120;
      this.frequencyVolumeText.setStyle({ fill: `hsl(${hue}, 100%, 50%)` });
    } else {
      this.player.applyFrequencyForce(0);
      this.player.applyVolumeBoost(0);
      console.warn('[GameScene] Voice controller not active!');
    }
    
    this.player.update(delta);
    
    const volumeBoost = this.player.getVolumeBoost();
    const currentSpeed = this.baseScrollSpeed + volumeBoost;
    const horizontalMovement = currentSpeed * delta / 1000;
    
    this.player.sprite.x += horizontalMovement;
    
    this.checkTerrainCollision();
    
    const totalWidth = this.terrain.getTotalWidth();
    const progress = (this.player.sprite.x / totalWidth) * 100;
    this.distanceText.setText(`Distance: ${Math.min(100, progress).toFixed(1)}%`);
    
    if (this.player.sprite.x >= totalWidth) {
      this.endGame(true);
    }
  }
  
  checkTerrainCollision() {
    if (this.isGameOver) return;
    
    const playerBounds = this.player.getBounds();
    const checkRange = 100;
    
    const nearbyObstacles = this.terrain.getObstaclesInRange(
      playerBounds.x - checkRange,
      playerBounds.x + checkRange
    );
    
    let hitObstacle = false;
    
    for (const obstacle of nearbyObstacles) {
      if (!obstacle.sprite || !obstacle.sprite.active || !obstacle.isPillar) continue;
      
      const obstacleLeft = obstacle.x - obstacle.width / 2;
      const obstacleRight = obstacle.x + obstacle.width / 2;
      const playerLeft = playerBounds.x;
      const playerRight = playerBounds.right;
      
      const overlapX = playerRight > obstacleLeft && playerLeft < obstacleRight;
      
      const obstacleTop = obstacle.minY;
      const obstacleBottom = obstacle.maxY;
      const playerTop = playerBounds.y;
      const playerBottom = playerBounds.bottom;
      
      const overlapY = playerBottom > obstacleTop && playerTop < obstacleBottom;
      
      if (overlapX && overlapY) {
        hitObstacle = true;
        break;
      }
    }
    
    if (hitObstacle && !this.playerHit) {
      this.playerHit = true;
      this.endGame(false);
    }
  }
  
  endGame(success) {
    if (this.isGameOver) {
      return;
    }
    
    this.isGameOver = true;
    
    if (this.audioElement) {
      this.audioElement.pause();
    }
    
    const message = success ? 'Level Complete!' : 'Game Over!';
    const color = success ? '#00ff00' : '#ff0000';
    
    this.showEndModal(message, color);
  }
  
  showEndModal(message, color) {
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
    
    this.restartText.on('pointerover', () => {
      this.restartText.setStyle({ fill: '#ffff00', backgroundColor: '#00cc00' });
    });
    
    this.restartText.on('pointerout', () => {
      this.restartText.setStyle({ fill: '#ffffff', backgroundColor: '#00aa00' });
    });
    
    this.restartText.on('pointerdown', () => {
      this.hideEndModal();
      this.restartGame();
    });
    
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
    
    this.menuButton.on('pointerover', () => {
      this.menuButton.setStyle({ fill: '#ffff00', backgroundColor: '#ff8c00' });
    });
    
    this.menuButton.on('pointerout', () => {
      this.menuButton.setStyle({ fill: '#ffffff', backgroundColor: '#ff6b00' });
    });
    
    this.menuButton.on('pointerdown', () => {
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
    await this.cleanupAsync();
    await new Promise(resolve => setTimeout(resolve, 200));
    this.scene.stop('GameScene');
    this.scene.start('StageSelectScene');
  }
  
  async restartGame() {
    await this.cleanupAsync();
    await new Promise(resolve => setTimeout(resolve, 100));
    this.scene.restart({ selectedStage: this.currentStage });
  }
  
  async cleanupAsync() {
    if (this.voiceController) {
      await this.voiceController.destroyAsync();
      this.voiceController = null;
    }
    
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement = null;
    }
    
    this.hideStartModal();
    this.hideEndModal();
    
    if (this.terrain) {
      this.terrain.destroy();
      this.terrain = null;
    }
    
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    
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
    
    this.children.removeAll();
  }
  
  async shutdown() {
    if (this.voiceController) {
      await this.voiceController.destroyAsync();
    }
    
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

