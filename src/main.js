import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';
import AudioAnalyzer from './audio/AudioAnalyzer.js';

let game = null;

// UI Elements
const uploadContainer = document.getElementById('upload-container');
const gameContainer = document.getElementById('game-container');
const audioUpload = document.getElementById('audio-upload');
const status = document.getElementById('status');

// Audio handling
audioUpload.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  status.textContent = 'Analyzing audio...';
  
  try {
    // Analyze the audio file
    const analyzer = new AudioAnalyzer();
    const audioData = await analyzer.analyzeFile(file);
    
    status.textContent = 'Starting game...';
    
    // Hide upload UI, show game
    setTimeout(() => {
      uploadContainer.classList.add('hidden');
      gameContainer.classList.add('visible');
      
      // Initialize Phaser game
      initGame(audioData);
    }, 500);
    
  } catch (error) {
    console.error('Error processing audio:', error);
    status.textContent = 'Error processing audio file. Please try again.';
  }
});

function initGame(audioData) {
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
    scene: GameScene
  };
  
  game = new Phaser.Game(config);
  
  // Pass audio data to the scene
  game.registry.set('audioData', audioData);
}

