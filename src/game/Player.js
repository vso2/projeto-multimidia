export default class Player {
  constructor(scene, x, y, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    
    // Create player sprite (cube like Geometry Dash)
    this.sprite = scene.add.rectangle(x, y, 40, 40, 0x00ffff);
    scene.physics.add.existing(this.sprite);
    
    // Physics properties
    this.sprite.body.setCollideWorldBounds(false);
    this.sprite.body.setVelocity(0, 0);
    
    // Movement properties - discrete lanes based on force/volume
    // Lanes: 0=bottom (no force), 1-5=middle, 6=top (max force)
    this.currentLane = 0; // Start at bottom lane
    this.targetY = y;
    this.smoothing = 0.08; // Slower, smoother transition between lanes
    this.numLanes = 7;
  }
  
  update() {
    // Smooth movement towards target Y
    const diff = this.targetY - this.sprite.y;
    this.sprite.y += diff * this.smoothing;
    
    // Add subtle rotation animation like Geometry Dash
    this.sprite.rotation += 0.03;
  }
  
  setLane(laneIndex) {
    // Set lane based on force level
    // Lane 0 = bottom (no force), Lane 6 = top (max force)
    this.currentLane = Phaser.Math.Clamp(laneIndex, 0, this.numLanes - 1);
    this.targetY = this.terrain.getLaneYPosition(this.currentLane);
  }
  
  getCurrentLane() {
    return this.currentLane;
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

