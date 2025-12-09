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
    // Lane 0 (bottom) = ~520px, Lane 6 (top) = ~50px
    // Each lane is ~70px apart
    const laneHeight = 70;
    const topMargin = 50;
    
    const minLane = Math.min(...blockedLanes);  // Lowest lane number
    const maxLane = Math.max(...blockedLanes);  // Highest lane number
    
    // Detect if this is a bottom pillar or top pillar
    // If pillar blocks lane 0 (bottom lane), it's a bottom pillar (extends from floor upward)
    // Otherwise, it's a top pillar (extends from ceiling downward)
    const isBottomPillar = blockedLanes.includes(0);
    
    if (isBottomPillar) {
      // BOTTOM PILLAR: Extends from floor upward
      const visualIndex = 6 - maxLane;
      const minY = topMargin + (visualIndex * laneHeight);
      const maxY = this.gameHeight;  // Extends to floor (600px)
      return { minY, maxY };
    } else {
      // TOP PILLAR: Extends from ceiling downward
      const visualIndex = 6 - minLane;
      const minY = 0;  // Starts at ceiling
      const maxY = topMargin + ((visualIndex + 1) * laneHeight);
      return { minY, maxY };
    }
  }
  
  createPillar(x, minY, maxY, width) {
    // Create a vertical pillar spanning a Y-range using tiles from Assets.png
    const pillarHeight = maxY - minY;
    
    // Detect if this is a top pillar (starts at ceiling) or bottom pillar (ends at floor)
    const isTopPillar = minY === 0;
    
    // Use specific frame numbers from Assets.png
    const topFrame = 3;    // Frame 3 for top cap (Row 1, Col 1)
    const bodyFrame = 33;   // Frame 33 for body (Row 2, Col 1)
    
    // Create body with repeating tile (leaves 16px for cap)
    const bodyHeight = pillarHeight - 16;
    let bodyCenterY, capCenterY;
    
    if (isTopPillar) {
      // TOP PILLAR: Cap goes at the bottom (where pillar ends)
      bodyCenterY = minY + (bodyHeight / 2);
      capCenterY = maxY - 8; // Center of 16px tall cap at bottom
    } else {
      // BOTTOM PILLAR: Cap goes at the top (where pillar starts)
      bodyCenterY = minY + 16 + (bodyHeight / 2);
      capCenterY = minY + 8; // Center of 16px tall cap at top
    }
    
    const body = this.scene.add.tileSprite(
      x,
      bodyCenterY,
      width,
      bodyHeight,
      'assetTiles'
    );
    body.setFrame(bodyFrame); // Set to body tile (row 2, col 1)
    
    // Create cap sprite (leaf sprite) at appropriate position
    const top = this.scene.add.sprite(x, capCenterY, 'assetTiles', topFrame);
    top.setDisplaySize(width, 16); // Scale to match pillar width
    
    // Rotate the cap 180 degrees if it's a top pillar (so it appears upside down at the bottom)
    if (isTopPillar) {
      top.setRotation(Math.PI); // 180 degrees in radians
    }
    
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

