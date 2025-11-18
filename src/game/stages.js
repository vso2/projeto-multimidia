// Stage configurations for force-based gameplay
// Stages can be manually created or generated using tools/generate_stage.py

// Import generated stages
import aPraieira from './generated/aPraieira.js';
import screamingForVengeance from './generated/screamingForVengeance.js';
import washingtonIsNext from './generated/washingtonIsNext.js';

export const stages = {
  aPraieira: aPraieira,
  screamingForVengeance: screamingForVengeance,
  washingtonIsNext: washingtonIsNext
};

// Default stage
export const defaultStage = stages.aPraieira;

