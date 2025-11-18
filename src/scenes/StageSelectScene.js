import { stages } from '../game/stages.js';

export default class StageSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StageSelectScene' });
  }
  
  create() {
    // Add title
    const title = this.add.text(
      this.game.config.width / 2,
      80,
      'Select Your Stage',
      {
        fontSize: '48px',
        fill: '#00ffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    title.setOrigin(0.5);
    
    // Convert stages object to array for easy iteration
    const stageEntries = Object.entries(stages);
    const startY = 200;
    const spacing = 120;
    
    // Create a button for each stage
    stageEntries.forEach(([key, stage], index) => {
      const yPos = startY + (index * spacing);
      
      // Create button background
      const button = this.add.rectangle(
        this.game.config.width / 2,
        yPos,
        600,
        100,
        0x0066cc
      );
      button.setInteractive({ useHandCursor: true });
      
      // Stage name
      const stageName = this.add.text(
        this.game.config.width / 2,
        yPos - 20,
        stage.name,
        {
          fontSize: '24px',
          fill: '#ffffff',
          fontStyle: 'bold'
        }
      );
      stageName.setOrigin(0.5);
      
      // Stage info (duration and tempo)
      const minutes = Math.floor(stage.duration / 60);
      const seconds = Math.floor(stage.duration % 60);
      const infoText = `${minutes}:${seconds.toString().padStart(2, '0')} • ${stage.bpm.toFixed(0)} BPM • ${stage.pillars.length} Obstacles`;
      
      const stageInfo = this.add.text(
        this.game.config.width / 2,
        yPos + 15,
        infoText,
        {
          fontSize: '16px',
          fill: '#cccccc'
        }
      );
      stageInfo.setOrigin(0.5);
      
      // Hover effects
      button.on('pointerover', () => {
        button.setFillStyle(0x0088ff);
        stageName.setStyle({ fill: '#ffff00' });
      });
      
      button.on('pointerout', () => {
        button.setFillStyle(0x0066cc);
        stageName.setStyle({ fill: '#ffffff' });
      });
      
      // Click to start game with selected stage
      button.on('pointerdown', () => {
        this.scene.start('GameScene', { selectedStage: stage });
      });
    });
    
    // Add instructions at bottom
    const instructions = this.add.text(
      this.game.config.width / 2,
      this.game.config.height - 30,
      'Click a stage to begin',
      {
        fontSize: '18px',
        fill: '#888888'
      }
    );
    instructions.setOrigin(0.5);
  }
}

