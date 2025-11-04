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
    
    // Movement properties - discrete lanes
    // Lanes: 0=SI (top), 1=LA, 2=SOL, 3=FA, 4=MI, 5=RE, 6=DO (bottom)
    this.currentLane = 3; // Start at FA (middle)
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
    // Map note index to visual lane
    // Note: do=0, re=1, mi=2, fa=3, sol=4, la=5, si=6
    // Visual lane: SI=0 (top), LA=1, SOL=2, FA=3, MI=4, RE=5, DO=6 (bottom)
    
    // Invert the mapping: note DO (0) -> lane 6, note SI (6) -> lane 0
    const visualLane = this.numLanes - 1 - laneIndex;
    
    this.currentLane = Phaser.Math.Clamp(visualLane, 0, this.numLanes - 1);
    this.targetY = this.terrain.getLaneYPosition(this.currentLane);
  }
  
  getCurrentLane() {
    return this.numLanes - 1 - this.currentLane; // Convert visual lane back to note index
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

