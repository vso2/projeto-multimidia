export default class TerrainGenerator {
  constructor(scene, stageConfig) {
    this.scene = scene;
    this.stageConfig = stageConfig;
    this.obstacles = [];
    this.gameHeight = scene.game.config.height;
  }
  
  generate() {
    this.generatePillars();
    return this.obstacles;
  }
  
  generatePillars() {
    this.stageConfig.pillars.forEach(pillarConfig => {
      if (pillarConfig.blockedLanes) {
        const { minY, maxY } = this.convertLanesToYRange(pillarConfig.blockedLanes);
        this.createPillar(pillarConfig.x, minY, maxY, pillarConfig.width);
      } else {
        this.createPillar(pillarConfig.x, pillarConfig.minY, pillarConfig.maxY, pillarConfig.width);
      }
    });
    
    console.log(`Generated ${this.obstacles.length} pillar obstacles for stage: ${this.stageConfig.name}`);
  }
  
  convertLanesToYRange(blockedLanes) {
    const laneHeight = 70;
    const topMargin = 50;
    
    const minLane = Math.min(...blockedLanes);
    const maxLane = Math.max(...blockedLanes);
    
    const isBottomPillar = blockedLanes.includes(0);
    
    if (isBottomPillar) {
      const visualIndex = 6 - maxLane;
      const minY = topMargin + (visualIndex * laneHeight);
      const maxY = this.gameHeight;
      return { minY, maxY };
    } else {
      const visualIndex = 6 - minLane;
      const minY = 0;
      const maxY = topMargin + ((visualIndex + 1) * laneHeight);
      return { minY, maxY };
    }
  }
  
  createPillar(x, minY, maxY, width) {
    const pillarHeight = maxY - minY;
    const isTopPillar = minY === 0;
    
    const topFrame = 3;
    const bodyFrame = 33;
    
    const bodyHeight = pillarHeight - 16;
    let bodyCenterY, capCenterY;
    
    if (isTopPillar) {
      bodyCenterY = minY + (bodyHeight / 2);
      capCenterY = maxY - 8;
    } else {
      bodyCenterY = minY + 16 + (bodyHeight / 2);
      capCenterY = minY + 8;
    }
    
    const body = this.scene.add.tileSprite(
      x,
      bodyCenterY,
      width,
      bodyHeight,
      'assetTiles'
    );
    body.setFrame(bodyFrame);
    
    const top = this.scene.add.sprite(x, capCenterY, 'assetTiles', topFrame);
    top.setDisplaySize(width, 16);
    
    if (isTopPillar) {
      top.setRotation(Math.PI);
    }
    
    this.scene.physics.add.existing(body, true);
    
    this.obstacles.push({
      body: body,
      top: top,
      sprite: body,
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

