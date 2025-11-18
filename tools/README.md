# Stage Generation Tools

This directory contains tools for generating game stages from audio files using librosa.

## Setup

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. Create a virtual environment (recommended):
```bash
python -m venv venv
```

2. Activate the virtual environment:
- Windows:
  ```bash
  venv\Scripts\activate
  ```
- macOS/Linux:
  ```bash
  source venv/bin/activate
  ```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Basic Usage

Generate a stage from an audio file:

```bash
python generate_stage.py "../src/assets/songs/04 - A praireira.mp3"
```

This will analyze the audio and print the JavaScript stage configuration to the console.

### Save to File

Save the generated configuration to a file:

```bash
python generate_stage.py "../src/assets/songs/04 - A praireira.mp3" --output stage_output.js
```

### Custom Parameters

Adjust generation parameters:

```bash
python generate_stage.py "song.mp3" \
  --name "My Custom Stage" \
  --scroll-speed 100 \
  --spacing 500
```

Parameters:
- `--name` / `-n`: Custom stage name (default: filename)
- `--scroll-speed` / `-s`: Game scroll speed in px/s (default: 80)
- `--spacing` / `-p`: Minimum pillar spacing in pixels (default: 400)

## How It Works

The stage generator:

1. **Loads the audio** using librosa
2. **Detects musical features**:
   - Tempo (BPM)
   - Beat positions
   - Onset times (note attacks, drums)
   - Amplitude envelope (RMS)
   - Spectral centroid (brightness)

3. **Generates pillars**:
   - Places pillars on musical beats
   - Uses amplitude for difficulty (more lanes blocked = harder)
   - Uses spectral features for top/bottom placement
   - Enforces minimum spacing for playability

4. **Outputs JavaScript config** ready to paste into `stages.js`

## Integration with Game

After generating a stage:

1. Copy the output JavaScript code
2. Paste into `src/game/stages.js`
3. Add to the `stages` export object
4. Update `defaultStage` if desired

Example `stages.js`:

```javascript
import { aPraieira } from './generated/aPraieira.js';

export const stages = {
  aPraieira: aPraireira,
  // ... other stages
};

export const defaultStage = stages.aPraieira;
```

## Tips

- **Too Easy?** Decrease `--spacing` to add more pillars
- **Too Hard?** Increase `--spacing` to reduce pillar density
- **Too Fast?** Increase `--scroll-speed` for longer stages
- **Better Sync?** Ensure audio file is high quality (higher bitrate)

## Troubleshooting

### ImportError: No module named 'librosa'

Make sure you've installed dependencies:
```bash
pip install -r requirements.txt
```

### Audio file not loading

Try converting to WAV format:
```bash
ffmpeg -i "input.mp3" "output.wav"
python generate_stage.py "output.wav"
```

### Pillars not synced well

Librosa's beat detection works best with:
- Clear rhythmic structure
- Good audio quality
- Prominent drums/percussion

You may need to manually adjust the generated pillars for some songs.

