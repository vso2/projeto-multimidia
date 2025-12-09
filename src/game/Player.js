export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    
    this.sprite = scene.add.sprite(x, y, 'bird');
    this.sprite.setScale(2.5);
    
    scene.physics.add.existing(this.sprite);
    
    scene.time.delayedCall(50, () => {
      if (this.sprite && this.sprite.active) {
        const groundLevel = scene.game.config.height - 80;
        const isOnGround = y >= groundLevel;
        
        if (isOnGround && scene.anims.exists('ground')) {
          this.sprite.play('ground', true);
        } else if (scene.anims.exists('fly')) {
          this.sprite.play('fly', true);
        } else {
          console.warn('[Player] Animations do not exist yet');
        }
      }
    });
    
    this.sprite.body.setCollideWorldBounds(true);
    this.sprite.body.setBounce(0, 0);
    this.sprite.setActive(true);
    
    this.gravity = 500;
    this.maxUpwardVelocity = 600;
    this.maxDownwardVelocity = 600;
    
    this.smoothedFrequency = 0;
    this.frequencySmoothingFactor = 0.95;
    this.minFrequency = 100;
    this.maxFrequency = 600;
    
    this.volumeBoost = 0;
    this.maxVolumeBoost = 500;
    
    this.sprite.body.setGravityY(this.gravity);
  }
  
  update(delta) {
    if (!this.sprite) {
      console.error('[Player] Sprite is missing!');
      return;
    }
    
    this.sprite.setActive(true);
    
    if (!this.sprite.body) {
      console.error('[Player] Physics body is missing!');
      return;
    }
    
    if (!this.sprite.scene) {
      console.error('[Player] Sprite lost scene reference!');
      return;
    }
    
    const groundLevel = this.scene.game.config.height - 80;
    const isOnGround = this.sprite.y >= groundLevel;
    
    if (isOnGround) {
      if (this.scene.anims.exists('ground')) {
        const anims = this.sprite.anims;
        if (!anims || !anims.isPlaying || (anims.currentAnim && anims.currentAnim.key !== 'ground')) {
          this.sprite.play('ground', true);
        }
      }
    } else {
      if (this.scene.anims.exists('fly')) {
        const anims = this.sprite.anims;
        if (!anims || !anims.isPlaying || (anims.currentAnim && anims.currentAnim.key !== 'fly')) {
          this.sprite.play('fly', true);
        }
      }
    }
    
    if (this.sprite.body.velocity.y < -this.maxUpwardVelocity) {
      this.sprite.body.setVelocityY(-this.maxUpwardVelocity);
    }
    if (this.sprite.body.velocity.y > this.maxDownwardVelocity) {
      this.sprite.body.setVelocityY(this.maxDownwardVelocity);
    }
  }
  
  applyFrequencyForce(frequency) {
    if (!this.sprite || !this.sprite.body) {
      return;
    }
    
    if (!isFinite(frequency) || isNaN(frequency)) {
      frequency = 0;
    }
    
    if (frequency > 0) {
      this.smoothedFrequency = this.smoothedFrequency * this.frequencySmoothingFactor + frequency * (1 - this.frequencySmoothingFactor);
    } else {
      this.smoothedFrequency *= 0.95;
      if (this.smoothedFrequency < 1) {
        this.smoothedFrequency = 0;
      }
    }
    
    if (this.smoothedFrequency >= this.minFrequency) {
      const normalizedFreq = Phaser.Math.Clamp((this.smoothedFrequency - this.minFrequency) / (this.maxFrequency - this.minFrequency),0,1);
      const upwardVelocity = normalizedFreq * this.maxUpwardVelocity;
      this.sprite.body.setVelocityY(-upwardVelocity);
    }
  }
  
  applyVolumeBoost(volume) {
    if (!isFinite(volume) || isNaN(volume)) {
      volume = 0;
    }
    
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

