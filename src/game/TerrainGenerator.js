export default class TerrainGenerator {
  constructor(scene, frequencyData) {
    this.scene = scene;
    this.frequencyData = frequencyData;
    this.obstacles = [];
    this.laneLines = [];
    this.segmentWidth = 60; // Width of each time segment
    this.numLanes = 7; // DO, RE, MI, FA, SOL, LA, SI
    
    // Calculate lane positions
    const gameHeight = scene.game.config.height;
    this.laneHeight = 70;
    this.topMargin = 50;
    
    // Lane Y positions (top to bottom: SI, LA, SOL, FA, MI, RE, DO)
    this.laneYPositions = [];
    for (let i = 0; i < this.numLanes; i++) {
      this.laneYPositions.push(this.topMargin + (i * this.laneHeight));
    }
  }
  
  generate() {
    // Draw lane dividers
    this.drawLanes();
    
    // Generate obstacles based on frequency data
    this.generateObstacles();
    
    return this.obstacles;
  }
  
  drawLanes() {
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(1, 0x444444, 0.5);
    
    const totalWidth = this.frequencyData.length * this.segmentWidth;
    
    // Draw horizontal lane lines
    this.laneYPositions.forEach((y, index) => {
      graphics.moveTo(0, y);
      graphics.lineTo(totalWidth, y);
      
      // Add lane labels centered on the lane
      const noteNames = ['SI', 'LA', 'SOL', 'FA', 'MI', 'RE', 'DO'];
      const label = this.scene.add.text(5, y, noteNames[index], {
        fontSize: '14px',
        fill: '#ffff00',
        fontStyle: 'bold',
        align: 'left'
      });
      label.setOrigin(0, 0.5); // Left aligned, vertically centered on lane
      label.setScrollFactor(0); // Keep labels fixed on screen
    });
    
    graphics.strokePath();
  }
  
  generateObstacles() {
    // Analyze frequency data to place obstacles in lanes
    let maxFreq = 0;
    let minFreq = Infinity;
    
    // First pass: find min/max for global normalization
    this.frequencyData.forEach(freq => {
      if (freq > maxFreq) maxFreq = freq;
      if (freq < minFreq) minFreq = freq;
    });
    
    const freqRange = maxFreq - minFreq;
    console.log(`Frequency range: min=${minFreq.toFixed(2)}, max=${maxFreq.toFixed(2)}, range=${freqRange.toFixed(2)}`);
    
    // Calculate average frequency for better distribution
    const avgFreq = this.frequencyData.reduce((a, b) => a + b, 0) / this.frequencyData.length;
    
    // Create obstacles at regular intervals to ensure distribution throughout
    const obstacleInterval = 15; // Create obstacle every N segments (increased spacing)
    const minObstacleDistance = 200; // Minimum distance between obstacles in pixels
    let lastObstacleX = -minObstacleDistance; // Track last obstacle position
    
    this.frequencyData.forEach((frequency, index) => {
      const x = index * this.segmentWidth;
      
      // Normalize frequency globally to determine which lanes get obstacles
      const globalNormalized = freqRange > 0 ? (frequency - minFreq) / freqRange : 0.5;
      
      // Map frequency to lanes (0-6)
      // Higher frequency = higher lanes (SI, LA, SOL)
      // Lower frequency = lower lanes (DO, RE, MI)
      const primaryLane = Math.floor(globalNormalized * (this.numLanes - 1));
      
      // Check minimum distance from last obstacle
      const isFarEnough = (x - lastObstacleX) >= minObstacleDistance;
      
      // Create obstacle if:
      // 1. It's a significant peak (using shouldCreateObstacle), OR
      // 2. It's at a regular interval (guaranteed obstacles throughout)
      // AND it's far enough from the last obstacle
      // Note: Removed "above average" condition to reduce density
      const isInterval = index % obstacleInterval === 0;
      const isPeak = this.shouldCreateObstacle(frequency, index);
      
      // Create obstacle if condition is met AND it's far enough
      const shouldCreate = (isPeak || isInterval) && isFarEnough;
      
      if (shouldCreate) {
        // Create obstacle in the determined lane
        this.createObstacle(x, primaryLane);
        lastObstacleX = x; // Update last obstacle position
        
        // Rarely create obstacles in adjacent lanes for very strong peaks (deterministic)
        // Use frequency value to determine direction deterministically
        const normalizedFreq = globalNormalized;
        // Only add adjacent obstacle for very strong peaks (top 15% of range)
        if (normalizedFreq > 0.85 && isPeak && (frequency % 10) > 7) {
          // Use frequency as deterministic seed for direction
          const direction = (Math.floor(frequency) % 2 === 0) ? 1 : -1;
          const adjacentLane = primaryLane + direction;
          
          // Only add adjacent obstacle if it's a valid lane
          if (adjacentLane >= 0 && adjacentLane < this.numLanes) {
            this.createObstacle(x, adjacentLane);
          }
        }
      }
    });
    
    console.log(`Generated ${this.obstacles.length} obstacles across ${this.numLanes} lanes`);
    
    // If no obstacles were created, create some default ones
    if (this.obstacles.length === 0) {
      console.warn('No obstacles generated! Creating default obstacles...');
      for (let i = 0; i < this.frequencyData.length; i += 10) {
        const x = i * this.segmentWidth;
        const lane = Math.floor((i / this.frequencyData.length) * this.numLanes);
        this.createObstacle(x, lane);
      }
    }
  }
  
  normalizeFrequency(frequency, index) {
    // Get local context for better normalization
    const windowSize = 10;
    const start = Math.max(0, index - windowSize);
    const end = Math.min(this.frequencyData.length, index + windowSize);
    const window = this.frequencyData.slice(start, end);
    
    const min = Math.min(...window);
    const max = Math.max(...window);
    const range = max - min;
    
    if (range === 0) return 0.5;
    
    return (frequency - min) / range;
  }
  
  shouldCreateObstacle(frequency, index) {
    // Create obstacles based on frequency peaks - deterministic
    // Check if this is a local peak
    if (index === 0 || index === this.frequencyData.length - 1) return false;
    
    const prev = this.frequencyData[index - 1];
    const next = this.frequencyData[index + 1];
    
    // Calculate average of neighbors for comparison
    const avgNeighbors = (prev + next) / 2;
    
    // It's a peak if it's significantly higher than neighbors (stricter threshold)
    // Use relative comparison - peak needs to be at least 20% higher than neighbors
    const isPeak = frequency > avgNeighbors * 1.2 && frequency > avgNeighbors + 15;
    
    return isPeak;
  }
  
  createObstacle(x, laneIndex) {
    // Get the exact Y position for this lane (center of lane)
    const y = this.laneYPositions[laneIndex];
    const obstacleWidth = 50;
    const obstacleHeight = 40;
    
    // Create obstacle rectangle centered on the lane
    const obstacle = this.scene.add.rectangle(
      x,
      y, // Center of the lane
      obstacleWidth,
      obstacleHeight,
      0xff0000,
      1
    );
    
    // Add a border to make it more visible
    obstacle.setStrokeStyle(2, 0xcc0000, 1);
    
    // Add physics
    this.scene.physics.add.existing(obstacle, true); // true = static
    
    // Store obstacle data
    this.obstacles.push({
      sprite: obstacle,
      x: x,
      y: y,
      lane: laneIndex,
      width: obstacleWidth,
      height: obstacleHeight
    });
  }
  
  getObstaclesInRange(startX, endX) {
    return this.obstacles.filter(obs => obs.x >= startX && obs.x <= endX);
  }
  
  getTotalWidth() {
    return this.frequencyData.length * this.segmentWidth;
  }
  
  getLaneYPosition(laneIndex) {
    return this.laneYPositions[laneIndex];
  }
  
  destroy() {
    this.obstacles.forEach(obstacle => {
      if (obstacle.sprite) {
        obstacle.sprite.destroy();
      }
    });
    this.obstacles = [];
  }
}

