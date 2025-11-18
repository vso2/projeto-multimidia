export default class TerrainGenerator {
  constructor(scene, stageConfig) {
    this.scene = scene;
    this.stageConfig = stageConfig;
    this.obstacles = [];
    this.laneLines = [];
    this.graphics = null;
    this.laneLabels = [];
    this.numLanes = 7; // 7 lanes for force levels (0-6)
    
    // Calculate lane positions
    const gameHeight = scene.game.config.height;
    this.laneHeight = 70;
    this.topMargin = 50;
    
    // Lane Y positions (top to bottom: lanes 6, 5, 4, 3, 2, 1, 0)
    this.laneYPositions = [];
    for (let i = 0; i < this.numLanes; i++) {
      this.laneYPositions.push(this.topMargin + (i * this.laneHeight));
    }
  }
  
  generate() {
    // Draw lane dividers
    this.drawLanes();
    
    // Generate pillar obstacles from stage configuration
    this.generatePillars();
    
    return this.obstacles;
  }
  
  drawLanes() {
    this.graphics = this.scene.add.graphics();
    this.graphics.lineStyle(1, 0x444444, 0.5);
    this.graphics.setScrollFactor(0); // Keep lane lines fixed on screen
    
    const screenWidth = this.scene.game.config.width;
    
    // Draw horizontal lane lines
    this.laneYPositions.forEach((y, index) => {
      this.graphics.moveTo(0, y);
      this.graphics.lineTo(screenWidth, y);
      
      // Add lane labels (6 = highest force, 0 = lowest force)
      const laneNumber = this.numLanes - index - 1; // Reverse: top lane = 6, bottom = 0
      const label = this.scene.add.text(5, y, `${laneNumber}`, {
        fontSize: '14px',
        fill: '#ffff00',
        fontStyle: 'bold',
        align: 'left'
      });
      label.setOrigin(0, 0.5); // Left aligned, vertically centered on lane
      label.setScrollFactor(0); // Keep labels fixed on screen
      label.setDepth(100); // Keep labels above other elements
      this.laneLabels.push(label);
    });
    
    this.graphics.strokePath();
  }
  
  generatePillars() {
    // Create pillar obstacles from stage configuration
    this.stageConfig.pillars.forEach(pillarConfig => {
      this.createPillar(pillarConfig.x, pillarConfig.blockedLanes, pillarConfig.width);
    });
    
    console.log(`Generated ${this.obstacles.length} pillar obstacles for stage: ${this.stageConfig.name}`);
  }
  
  createPillar(x, blockedLanes, width) {
    // Create a vertical pillar spanning multiple lanes
    // blockedLanes is an array of logical lanes like [0, 1, 2] (bottom) or [4, 5, 6] (top)
    
    if (blockedLanes.length === 0) return;
    
    // Get Y positions for all blocked lanes using the proper mapping
    const yPositions = blockedLanes.map(lane => this.getLaneYPosition(lane));
    const topY = Math.min(...yPositions);
    const bottomY = Math.max(...yPositions);
    
    // Calculate pillar dimensions
    const pillarHeight = bottomY - topY + this.laneHeight;
    const centerY = topY + pillarHeight / 2;
    
    // Create pillar rectangle
    const pillar = this.scene.add.rectangle(
      x,
      centerY,
      width,
      pillarHeight,
      0xff0000,
      1
    );
    
    // Add a border to make it more visible
    pillar.setStrokeStyle(3, 0xcc0000, 1);
    
    // Add physics
    this.scene.physics.add.existing(pillar, true); // true = static
    
    // Store ONE obstacle per pillar (not per lane)
    this.obstacles.push({
      sprite: pillar,
      x: x,
      y: centerY,
      width: width,
      height: pillarHeight,
      isPillar: true,
      blockedLanes: blockedLanes
    });
  }
  
  getObstaclesInRange(startX, endX) {
    return this.obstacles.filter(obs => obs.x >= startX && obs.x <= endX);
  }
  
  getTotalWidth() {
    return this.stageConfig.length;
  }
  
  getLaneYPosition(logicalLane) {
    // Map logical lanes to visual Y positions
    // Logical lane 0 (bottom/no force) = laneYPositions[6] (bottom of screen)
    // Logical lane 6 (top/max force) = laneYPositions[0] (top of screen)
    const visualIndex = this.numLanes - 1 - logicalLane;
    return this.laneYPositions[visualIndex];
  }
  
  destroy() {
    // Clean up obstacles
    this.obstacles.forEach(obstacle => {
      if (obstacle.sprite) {
        obstacle.sprite.destroy();
      }
    });
    this.obstacles = [];
    
    // Clean up graphics
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    
    // Clean up lane labels
    this.laneLabels.forEach(label => {
      if (label) {
        label.destroy();
      }
    });
    this.laneLabels = [];
  }
}

