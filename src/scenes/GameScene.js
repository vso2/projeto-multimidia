import Player from '../game/Player.js';
import TerrainGenerator from '../game/TerrainGenerator.js';
import VoiceController from '../audio/VoiceController.js';
import AudioAnalyzer from '../audio/AudioAnalyzer.js';

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
    this.pitchText = null;
    this.frequencyText = null;
    this.noteText = null;
    this.distanceText = null;
    this.endText = null;
    this.restartText = null;
    this.audioData = null; // Store audio data for restart
  }
  
  create() {
    // Get audio data from registry
    const audioData = this.registry.get('audioData');
    
    if (!audioData) {
      console.error('No audio data found');
      return;
    }
    
    // Store audio data for restart
    this.audioData = audioData;
    
    // Create terrain with lanes and obstacles
    this.terrain = new TerrainGenerator(this, audioData.frequencyData);
    this.terrain.generate();
    
    // Create player starting at lane 3 (FA - middle)
    const startY = this.terrain.getLaneYPosition(3);
    this.player = new Player(this, 150, startY, this.terrain);
    this.player.setLane(3); // Start at middle lane (FA)
    
    // Create UI text
    this.statusText = this.add.text(10, 10, 'Initializing voice control...', {
      fontSize: '16px',
      fill: '#fff',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    
    this.pitchText = this.add.text(10, 40, 'Note: DO', {
      fontSize: '14px',
      fill: '#fff',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    
    this.frequencyText = this.add.text(10, 65, 'Frequency: -- Hz', {
      fontSize: '18px',
      fill: '#00ffff',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 },
      fontStyle: 'bold'
    });
    
    this.distanceText = this.add.text(10, 95, 'Distance: 0%', {
      fontSize: '14px',
      fill: '#fff',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    
    this.noteText = this.add.text(10, 120, 'Sing: DO RE MI FA SOL LA SI\n(Octaves 3-4 supported)', {
      fontSize: '12px',
      fill: '#ffff00',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    
    // Set camera to follow player horizontally
    this.cameras.main.startFollow(this.player.sprite, false, 1, 0);
    this.cameras.main.setFollowOffset(-300, 0);
    
    // Initialize voice controller
    this.initVoiceControl();
    
    // Don't play audio - it interferes with microphone
    // Audio is only used for terrain generation (already done)
    this.audioElement = null;
    
    // Wait for user to click start button
    this.waitForStart();
  }
  
  waitForStart() {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.style.display = 'block';
      startBtn.onclick = () => {
        startBtn.style.display = 'none';
        this.startGame();
      };
    }
  }
  
  async initVoiceControl() {
    this.voiceController = new VoiceController();
    const success = await this.voiceController.initialize();
    
    if (success) {
      this.statusText.setText('Voice control active! Click "Start Game" to begin');
      this.statusText.setStyle({ fill: '#00ff00' });
    } else {
      this.statusText.setText('Voice control failed. Using default position. Click "Start Game" to begin');
      this.statusText.setStyle({ fill: '#ff0000' });
    }
  }
  
  startGame() {
    this.isGameStarted = true;
    this.startTime = this.time.now;
    // Audio playback removed - it interferes with microphone
    this.statusText.setText('Game started! Sing notes to switch lanes!');
  }
  
  update(time, delta) {
    // Make UI follow camera regardless of game state
    this.statusText.setScrollFactor(0);
    this.pitchText.setScrollFactor(0);
    this.frequencyText.setScrollFactor(0);
    this.noteText.setScrollFactor(0);
    this.distanceText.setScrollFactor(0);
    
    // Don't run game logic until started
    if (!this.isGameStarted || this.isGameOver) {
      // Still update note display even before game starts
      if (this.voiceController && this.voiceController.isActive) {
        const note = this.voiceController.getCurrentNote().toUpperCase();
        const pitch = this.voiceController.getPitch();
        const rawPitch = this.voiceController.getRawPitch();
        
        // Always show raw captured frequency (even if outside valid range)
        if (rawPitch > 0) {
          this.frequencyText.setText(`Frequency: ${Math.round(rawPitch)} Hz`);
          this.frequencyText.setStyle({ fill: '#00ffff' });
        } else {
          this.frequencyText.setText('Frequency: -- Hz');
          this.frequencyText.setStyle({ fill: '#888888' });
        }
        
        // Show current note
        if (pitch > 0) {
          this.pitchText.setText(`Note: ${note}`);
          this.pitchText.setStyle({ fill: '#00ff00' });
        }
      }
      return;
    }
    
    // Update player position based on voice note (instant lane changes)
    if (this.voiceController && this.voiceController.isActive) {
      const note = this.voiceController.getCurrentNote().toUpperCase();
      const pitch = this.voiceController.getPitch();
      const rawPitch = this.voiceController.getRawPitch();
      
      // Change lane instantly when a valid note is detected
      if (pitch > 0) {
        const laneIndex = this.voiceController.getNoteIndex();
        if (laneIndex >= 0) {
          this.player.setLane(laneIndex);
        }
      }
      
      // Always show raw captured frequency (even if outside valid range)
      if (rawPitch > 0) {
        this.frequencyText.setText(`Frequency: ${Math.round(rawPitch)} Hz`);
        this.frequencyText.setStyle({ fill: '#00ffff' });
      } else {
        this.frequencyText.setText('Frequency: -- Hz');
        this.frequencyText.setStyle({ fill: '#888888' });
      }
      
      // Show current note
      if (pitch > 0) {
        this.pitchText.setText(`Note: ${note}`);
        this.pitchText.setStyle({ fill: '#00ff00' });
      }
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
    // Get obstacles near the player
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;
    const checkRange = 80; // Check obstacles within this range
    
    const nearbyObstacles = this.terrain.getObstaclesInRange(
      playerX - checkRange,
      playerX + checkRange
    );
    
    // Get player bounds for actual pixel collision detection
    const playerBounds = this.player.getBounds();
    const playerWidth = playerBounds.width;
    const playerHeight = playerBounds.height;
    
    // Check collision with obstacles using actual pixel overlap
    let hitObstacle = false;
    
    for (const obstacle of nearbyObstacles) {
      if (!obstacle.sprite || !obstacle.sprite.active) continue;
      
      // Get obstacle bounds
      const obstacleBounds = obstacle.sprite.getBounds();
      const obstacleWidth = obstacle.width;
      const obstacleHeight = obstacle.height;
      
      // Calculate actual pixel positions
      const obstacleLeft = obstacle.x - obstacleWidth / 2;
      const obstacleRight = obstacle.x + obstacleWidth / 2;
      const obstacleTop = obstacle.y - obstacleHeight / 2;
      const obstacleBottom = obstacle.y + obstacleHeight / 2;
      
      const playerLeft = playerX - playerWidth / 2;
      const playerRight = playerX + playerWidth / 2;
      const playerTop = playerY - playerHeight / 2;
      const playerBottom = playerY + playerHeight / 2;
      
      // Check for actual pixel overlap (AABB collision detection)
      const overlapX = playerRight > obstacleLeft && playerLeft < obstacleRight;
      const overlapY = playerBottom > obstacleTop && playerTop < obstacleBottom;
      
      // Only game over if there's actual pixel collision
      if (overlapX && overlapY) {
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
    
    // Audio playback removed - no need to stop
    
    // Show end message
    const message = success ? 'Level Complete!' : 'Game Over!';
    const color = success ? '#00ff00' : '#ff0000';
    
    // Calculate screen center (not camera scroll position)
    const screenCenterX = this.game.config.width / 2;
    const screenCenterY = this.game.config.height / 2;
    
    this.endText = this.add.text(
      screenCenterX,
      screenCenterY,
      message,
      {
        fontSize: '48px',
        fill: color,
        backgroundColor: '#000',
        padding: { x: 20, y: 10 }
      }
    );
    this.endText.setOrigin(0.5);
    this.endText.setScrollFactor(0);
    
    // Show restart button
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.style.display = 'block';
      restartBtn.onclick = () => this.restartGame();
    }
  }
  
  restartGame() {
    // Hide restart button
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.style.display = 'none';
    }
    
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
    // Clean up voice controller
    if (this.voiceController) {
      this.voiceController.destroy();
      this.voiceController = null;
    }
    
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
    if (this.pitchText) {
      this.pitchText.destroy();
      this.pitchText = null;
    }
    if (this.frequencyText) {
      this.frequencyText.destroy();
      this.frequencyText = null;
    }
    if (this.noteText) {
      this.noteText.destroy();
      this.noteText = null;
    }
    if (this.distanceText) {
      this.distanceText.destroy();
      this.distanceText = null;
    }
    if (this.endText) {
      this.endText.destroy();
      this.endText = null;
    }
    
    // Clear all game objects
    this.children.removeAll();
  }
  
  recreate() {
    if (!this.audioData) {
      console.error('No audio data available for restart');
      return;
    }
    
    // Create terrain with lanes and obstacles
    this.terrain = new TerrainGenerator(this, this.audioData.frequencyData);
    this.terrain.generate();
    
    // Create player starting at lane 3 (FA - middle)
    const startY = this.terrain.getLaneYPosition(3);
    this.player = new Player(this, 150, startY, this.terrain);
    this.player.setLane(3); // Start at middle lane (FA)
    
    // Create UI text
    this.statusText = this.add.text(10, 10, 'Initializing voice control...', {
      fontSize: '16px',
      fill: '#fff',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    
    this.pitchText = this.add.text(10, 40, 'Note: DO', {
      fontSize: '14px',
      fill: '#fff',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    
    this.frequencyText = this.add.text(10, 65, 'Frequency: -- Hz', {
      fontSize: '18px',
      fill: '#00ffff',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 },
      fontStyle: 'bold'
    });
    
    this.distanceText = this.add.text(10, 95, 'Distance: 0%', {
      fontSize: '14px',
      fill: '#fff',
      backgroundColor: '#000',
      padding: { x: 10, y: 5 }
    });
    
    this.noteText = this.add.text(10, 120, 'Sing: DO RE MI FA SOL LA SI\n(Octaves 3-4 supported)', {
      fontSize: '12px',
      fill: '#ffff00',
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
    
    // Show start button
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.style.display = 'block';
      startBtn.onclick = () => {
        startBtn.style.display = 'none';
        this.startGame();
      };
    }
  }
  
  shutdown() {
    // Clean up
    if (this.voiceController) {
      this.voiceController.destroy();
    }
    
    // Audio playback removed - no cleanup needed
    
    if (this.terrain) {
      this.terrain.destroy();
    }
    
    if (this.player) {
      this.player.destroy();
    }
  }
}

