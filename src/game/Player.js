export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    
    // Create animated bird sprite
    this.sprite = scene.add.sprite(x, y, 'bird');
    this.sprite.setScale(2.5); // Scale 16x16 to 40x40 (16 * 2.5 = 40)
    this.sprite.setVisible(true);
    this.sprite.setAlpha(1);
    
    scene.physics.add.existing(this.sprite);
    
    // Start animation after a small delay to ensure everything is ready
    scene.time.delayedCall(50, () => {
      if (this.sprite && this.sprite.active) {
        // Check if starting on ground or in air
        const groundLevel = scene.game.config.height - 80;
        const isOnGround = y >= groundLevel;
        
        if (isOnGround && scene.anims.exists('ground')) {
          this.sprite.play('ground', true); // Start with ground animation
        } else if (scene.anims.exists('fly')) {
          this.sprite.play('fly', true); // Start with flying animation
        } else {
          console.warn('[Player] Animations do not exist yet');
        }
      }
    });
    
    // Physics properties
    this.sprite.body.setCollideWorldBounds(true);
    this.sprite.body.setBounce(0, 0);
    
    // Ensure sprite is always visible and active
    this.sprite.setActive(true);
    this.sprite.setVisible(true);
    this.sprite.setAlpha(1);
    
    // Physics constants
    this.gravity = 500; // pixels/s² downward
    this.maxUpwardVelocity = 600; // max upward speed
    this.maxDownwardVelocity = 600; // max downward speed
    
    // Frequency-based force
    this.smoothedFrequency = 0; // Smoothed frequency to prevent jitter
    this.frequencySmoothingFactor = 0.95; // Higher = more smoothing
    this.minFrequency = 100; // Hz
    this.maxFrequency = 600; // Hz
    
    // Volume-based horizontal boost
    this.volumeBoost = 0; // Current boost from volume (0-500 px/s)
    this.maxVolumeBoost = 500; // Max boost from volume (increased for exponential curve)
    
    // Don't set horizontal velocity here - game controls movement
    
    // Enable gravity
    this.sprite.body.setGravityY(this.gravity);
  }
  
  update(delta) {
    // Safety check
    if (!this.sprite) {
      console.error('[Player] Sprite is missing!');
      return;
    }
    
    // Force sprite to always be visible and active - do this FIRST
    this.sprite.setActive(true);
    this.sprite.setVisible(true);
    this.sprite.setAlpha(1);
    
    // Ensure physics body exists
    if (!this.sprite.body) {
      console.error('[Player] Physics body is missing!');
      return;
    }
    
    // Ensure sprite is not being destroyed
    if (!this.sprite.scene) {
      console.error('[Player] Sprite lost scene reference!');
      return;
    }
    
    // Switch animation based on position (ground vs flying)
    const groundLevel = this.scene.game.config.height - 80; // ~520px
    const isOnGround = this.sprite.y >= groundLevel;
    
    if (isOnGround) {
      // On ground - use ground animation
      if (this.scene.anims.exists('ground')) {
        const anims = this.sprite.anims;
        if (!anims || !anims.isPlaying || (anims.currentAnim && anims.currentAnim.key !== 'ground')) {
          this.sprite.play('ground', true);
        }
      }
    } else {
      // Flying - use fly animation
      if (this.scene.anims.exists('fly')) {
        const anims = this.sprite.anims;
        if (!anims || !anims.isPlaying || (anims.currentAnim && anims.currentAnim.key !== 'fly')) {
          this.sprite.play('fly', true);
        }
      }
    }
    
    // Clamp vertical velocity
    if (this.sprite.body.velocity.y < -this.maxUpwardVelocity) {
      this.sprite.body.setVelocityY(-this.maxUpwardVelocity);
    }
    if (this.sprite.body.velocity.y > this.maxDownwardVelocity) {
      this.sprite.body.setVelocityY(this.maxDownwardVelocity);
    }
    
    // No rotation for bird sprite (was for cube/rectangle only)
  }
  
  applyFrequencyForce(frequency) {
    // Safety check
    if (!this.sprite || !this.sprite.body) {
      return;
    }
    
    // Ensure frequency is a valid number
    if (!isFinite(frequency) || isNaN(frequency)) {
      frequency = 0;
    }
    
    if (frequency > 0) {
      this.smoothedFrequency = this.smoothedFrequency * this.frequencySmoothingFactor + frequency * (1 - this.frequencySmoothingFactor);
    } else {
      // Decay smoothed frequency when no input
      this.smoothedFrequency *= 0.95;
      if (this.smoothedFrequency < 1) {
        this.smoothedFrequency = 0;
      }
    }
    
    
    if (this.smoothedFrequency >= this.minFrequency) {
      // Normalize frequency to 0-1 range
      const normalizedFreq = Phaser.Math.Clamp((this.smoothedFrequency - this.minFrequency) / (this.maxFrequency - this.minFrequency),0,1);
      
      const upwardVelocity = normalizedFreq * this.maxUpwardVelocity;
      
      this.sprite.body.setVelocityY(-upwardVelocity);
    }
  }
  
  applyVolumeBoost(volume) {
    // Ensure volume is a valid number
    if (!isFinite(volume) || isNaN(volume)) {
      volume = 0;
    }
    
    // Clamp volume to valid range
    volume = Phaser.Math.Clamp(volume, 0, 1);
    
    
    const amplifiedVolume = Math.min(volume * 3, 1.0);
    
    const exponentialFactor = Math.pow(amplifiedVolume, 1.5);
    this.volumeBoost = exponentialFactor * this.maxVolumeBoost;
  }
  
  getVolumeBoost() {
    return this.volumeBoost;
  }
  
  getSmoothedFrequency() {
    return this.smoothedFrequency;
  }
  
  getX() {
    return this.sprite.x;
  }
  
  getY() {
    return this.sprite.y;
  }
  
  getBounds() {
    return this.sprite.getBounds();
  }
  
  destroy() {
    this.sprite.destroy();
  }
}

