export default class TerrainGenerator {
  constructor(scene, stageConfig) {
    this.scene = scene;
    this.stageConfig = stageConfig;
    this.obstacles = [];
    this.gameHeight = scene.game.config.height;
  }
  
  generate() {
    // Generate pillar obstacles from stage configuration
    this.generatePillars();
    
    return this.obstacles;
  }
  
  generatePillars() {
    // Create pillar obstacles from stage configuration
    this.stageConfig.pillars.forEach(pillarConfig => {
      // Convert old blockedLanes format to minY/maxY if needed
      if (pillarConfig.blockedLanes) {
        const { minY, maxY } = this.convertLanesToYRange(pillarConfig.blockedLanes);
        this.createPillar(pillarConfig.x, minY, maxY, pillarConfig.width);
      } else {
        // New format already has minY/maxY
        this.createPillar(pillarConfig.x, pillarConfig.minY, pillarConfig.maxY, pillarConfig.width);
      }
    });
    
    console.log(`Generated ${this.obstacles.length} pillar obstacles for stage: ${this.stageConfig.name}`);
  }
  
  convertLanesToYRange(blockedLanes) {
    // Convert old lane-based format to Y-coordinates
    // Pillars should extend from the BOTTOM of screen upward
    // Lane 0 (bottom) = ~520px, Lane 6 (top) = ~50px
    // Each lane is ~70px apart
    const laneHeight = 70;
    const topMargin = 50;
    
    // Find the highest blocked lane to determine how tall the pillar should be
    const maxBlockedLane = Math.max(...blockedLanes);
    
    // Map the highest lane to Y position (this is the TOP of the pillar)
    const visualIndex = 6 - maxBlockedLane;
    const minY = topMargin + (visualIndex * laneHeight);
    
    // Pillar extends from top of highest lane to bottom of screen
    const maxY = this.gameHeight;
    
    return { minY, maxY };
  }
  
  createPillar(x, minY, maxY, width) {
    // Create a vertical pillar spanning a Y-range using tiles from Assets.png
    const pillarHeight = maxY - minY;
    
    // Use specific frame numbers from Assets.png
    const topFrame = 3;    // Frame 3 for top cap (Row 1, Col 1)
    const bodyFrame = 33;   // Frame 33 for body (Row 2, Col 1)
    
    // Create body with repeating tile (leaves 16px at top for cap)
    const bodyHeight = pillarHeight - 16;
    const bodyCenterY = minY + 16 + (bodyHeight / 2);
    const body = this.scene.add.tileSprite(
      x,
      bodyCenterY,
      width,
      bodyHeight,
      'assetTiles'
    );
    body.setFrame(bodyFrame); // Set to body tile (row 2, col 1)
    
    // Create top cap (single sprite at the top)
    const topCenterY = minY + 8; // Center of 16px tall top piece
    const top = this.scene.add.sprite(x, topCenterY, 'assetTiles', topFrame);
    top.setDisplaySize(width, 16); // Scale to match pillar width
    
    // Add physics to body (main collision object)
    this.scene.physics.add.existing(body, true); // true = static
    
    // Store obstacle with both body and top sprites
    this.obstacles.push({
      body: body,
      top: top,
      sprite: body, // For backward compatibility with collision code
      x: x,
      y: bodyCenterY,
      width: width,
      height: pillarHeight,
      minY: minY,
      maxY: maxY,
      isPillar: true
    });
  }
  
  getObstaclesInRange(startX, endX) {
    return this.obstacles.filter(obs => obs.x >= startX && obs.x <= endX);
  }
  
  getTotalWidth() {
    return this.stageConfig.length;
  }
  
  destroy() {
    // Clean up obstacles (both body and top sprites)
    this.obstacles.forEach(obstacle => {
      if (obstacle.body) {
        obstacle.body.destroy();
      }
      if (obstacle.top) {
        obstacle.top.destroy();
      }
      if (obstacle.sprite && obstacle.sprite !== obstacle.body) {
        obstacle.sprite.destroy();
      }
    });
    this.obstacles = [];
  }
}

