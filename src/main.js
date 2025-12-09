import Phaser from 'phaser';
import StageSelectScene from './scenes/StageSelectScene.js';
import GameScene from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game',
  backgroundColor: '#87CEEB',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [StageSelectScene, GameScene]
};

const game = new Phaser.Game(config);

