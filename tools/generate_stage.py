#!/usr/bin/env python3
"""
Stage Generator for Voice Force Game

Analyzes audio files using librosa and generates stage configurations
with pillars synced to the music's rhythm and intensity.

Usage:
    python generate_stage.py <audio_file_path> [--output <output_file>]

Example:
    python generate_stage.py "../src/assets/songs/04 - A praireira.mp3"
"""

import librosa
import numpy as np
import json
import argparse
import os
from pathlib import Path


class StageGenerator:
    def __init__(self, scroll_speed=80, min_pillar_spacing=400):
        """
        Initialize stage generator.
        
        Args:
            scroll_speed: Pixels per second for game scrolling (default: 80)
            min_pillar_spacing: Minimum distance between pillars in pixels (default: 400)
        """
        self.scroll_speed = scroll_speed
        self.min_pillar_spacing = min_pillar_spacing
        
    def analyze_audio(self, audio_path):
        """
        Analyze audio file using librosa.
        
        Returns:
            dict: Audio analysis data including beats, onsets, tempo, etc.
        """
        print(f"Loading audio file: {audio_path}")
        y, sr = librosa.load(audio_path)
        duration = float(librosa.get_duration(y=y, sr=sr))
        
        print(f"Duration: {duration:.2f}s, Sample rate: {sr}Hz")
        
        # Detect tempo and beats
        print("Detecting tempo and beats...")
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        tempo = float(tempo)  # Convert to Python float
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        
        # Detect onsets (note attacks, drum hits, etc.)
        print("Detecting onsets...")
        onset_frames = librosa.onset.onset_detect(y=y, sr=sr, backtrack=True)
        onset_times = librosa.frames_to_time(onset_frames, sr=sr)
        onset_strength = librosa.onset.onset_strength(y=y, sr=sr)
        
        # Calculate RMS amplitude envelope
        print("Calculating amplitude envelope...")
        rms = librosa.feature.rms(y=y)[0]
        rms_times = librosa.times_like(rms, sr=sr)
        
        # Calculate spectral centroid (brightness/frequency content)
        print("Calculating spectral features...")
        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        
        # Normalize features
        rms_normalized = (rms - rms.min()) / (rms.max() - rms.min())
        spectral_normalized = (spectral_centroid - spectral_centroid.min()) / \
                             (spectral_centroid.max() - spectral_centroid.min())
        
        print(f"Analysis complete: {len(beat_times)} beats, {len(onset_times)} onsets, tempo: {tempo:.1f} BPM")
        
        return {
            'duration': duration,
            'tempo': tempo,
            'beat_times': beat_times,
            'onset_times': onset_times,
            'rms': rms_normalized,
            'rms_times': rms_times,
            'spectral_centroid': spectral_normalized,
            'sample_rate': sr
        }
    
    def generate_pillars(self, analysis):
        """
        Generate pillar configurations from audio analysis.
        
        Args:
            analysis: Dictionary from analyze_audio()
            
        Returns:
            list: Pillar configurations
        """
        pillars = []
        last_pillar_x = -self.min_pillar_spacing
        
        # Use beats as primary pillar positions (skip some for variety)
        print("Generating pillars from beats...")
        beat_times = analysis['beat_times']
        rms = analysis['rms']
        rms_times = analysis['rms_times']
        spectral = analysis['spectral_centroid']
        
        # Place pillars on beats (skip every other beat for playability)
        for i, beat_time in enumerate(beat_times):
            if i % 2 != 0:  # Use every other beat
                continue
                
            x_pos = int(float(beat_time) * self.scroll_speed)
            
            # Check minimum spacing
            if x_pos - last_pillar_x < self.min_pillar_spacing:
                continue
            
            # Get amplitude at this beat
            rms_idx = np.argmin(np.abs(rms_times - beat_time))
            amplitude = rms[rms_idx]
            
            # Get spectral centroid at this beat
            spectral_idx = min(rms_idx, len(spectral) - 1)
            brightness = spectral[spectral_idx]
            
            # Determine pillar properties based on amplitude
            blocked_lanes, width = self._get_pillar_difficulty(amplitude)
            
            # Determine top/bottom placement based on spectral brightness
            is_top = brightness > 0.5
            blocked_lanes = self._adjust_lane_position(blocked_lanes, is_top)
            
            pillars.append({
                'x': x_pos,
                'blockedLanes': blocked_lanes,
                'width': width
            })
            
            last_pillar_x = x_pos
        
        print(f"Generated {len(pillars)} pillars")
        return pillars
    
    def _get_pillar_difficulty(self, amplitude):
        """
        Determine pillar difficulty based on amplitude.
        
        Returns:
            tuple: (number_of_lanes_blocked, pillar_width)
        """
        if amplitude < 0.3:
            # Easy: block 2 lanes
            return 2, 50
        elif amplitude < 0.6:
            # Medium: block 3 lanes
            return 3, 70
        else:
            # Hard: block 4 lanes
            return 4, 90
    
    def _adjust_lane_position(self, num_lanes, is_top):
        """
        Create lane array blocking either top or bottom lanes.
        
        Args:
            num_lanes: Number of lanes to block
            is_top: If True, block top lanes; if False, block bottom lanes
            
        Returns:
            list: Lane indices to block
        """
        if is_top:
            # Block top lanes (higher force needed)
            return list(range(7 - num_lanes, 7))
        else:
            # Block bottom lanes (lower force needed)
            return list(range(num_lanes))
    
    def generate_stage_config(self, audio_path, stage_name=None):
        """
        Generate complete stage configuration from audio file.
        
        Args:
            audio_path: Path to audio file
            stage_name: Optional name for the stage
            
        Returns:
            dict: Complete stage configuration
        """
        # Get filename from path
        filename = os.path.basename(audio_path)
        if stage_name is None:
            stage_name = os.path.splitext(filename)[0]
        
        # Analyze audio
        analysis = self.analyze_audio(audio_path)
        
        # Generate pillars
        pillars = self.generate_pillars(analysis)
        
        # Calculate stage length
        stage_length = int(analysis['duration'] * self.scroll_speed)
        
        # Build stage config (ensure all values are Python native types)
        config = {
            'name': stage_name,
            'audioFile': filename,
            'duration': float(round(analysis['duration'], 2)),
            'bpm': float(round(analysis['tempo'], 1)),
            'length': int(stage_length),
            'forceMultiplier': 1.0,
            'pillars': pillars,
            'metadata': {
                'generatedFrom': 'librosa',
                'tempo': float(round(analysis['tempo'], 1)),
                'beats': int(len(analysis['beat_times'])),
                'onsets': int(len(analysis['onset_times'])),
                'pillarsGenerated': int(len(pillars))
            }
        }
        
        return config
    
    def export_to_json(self, config, output_file=None):
        """
        Export stage config to clean JSON format.
        
        Args:
            config: Stage configuration dictionary
            output_file: Output file path (optional)
            
        Returns:
            str: Path to the JSON file
        """
        if not output_file:
            # Auto-generate filename from stage name
            safe_name = self._to_camelcase(config['name'])
            output_file = f"../src/game/generated/{safe_name}.json"
            
            # Create directory if it doesn't exist
            output_dir = os.path.dirname(output_file)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir)
        
        # Write clean JSON file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        print(f"✓ JSON file created: {output_file}")
        return output_file
    
    def export_to_js(self, config, output_file=None):
        """
        Export stage config to JavaScript module format with inline data.
        
        Args:
            config: Stage configuration dictionary
            output_file: Output file path (optional)
            
        Returns:
            str: Path to the JS file
        """
        if not output_file:
            # Auto-generate filename from stage name
            safe_name = self._to_camelcase(config['name'])
            output_file = f"../src/game/generated/{safe_name}.js"
            
            # Create directory if it doesn't exist
            output_dir = os.path.dirname(output_file)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir)
        
        # Format as JavaScript module with inline data
        js_code = f"""// Auto-generated stage configuration
// Generated from: {config['audioFile']}
// Tempo: {config['bpm']} BPM, Duration: {config['duration']}s

export default {{
  "name": "{config['name']}",
  "audioFile": "{config['audioFile']}",
  "duration": {config['duration']},
  "bpm": {config['bpm']},
  "length": {config['length']},
  "forceMultiplier": {config['forceMultiplier']},
  "pillars": [
"""
        
        # Add pillars (compact format)
        for pillar in config['pillars']:
            lanes_str = json.dumps(pillar['blockedLanes'])
            js_code += f"    {{ \"x\": {pillar['x']}, \"blockedLanes\": {lanes_str}, \"width\": {pillar['width']} }},\n"
        
        js_code += f"""  ],
  "metadata": {{
    "generatedFrom": "{config['metadata']['generatedFrom']}",
    "tempo": {config['metadata']['tempo']},
    "beats": {config['metadata']['beats']},
    "onsets": {config['metadata']['onsets']},
    "pillarsGenerated": {config['metadata']['pillarsGenerated']}
  }}
}};
"""
        
        # Write JavaScript file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(js_code)
        
        print(f"✓ JS module created: {output_file}")
        return output_file
    
    def _to_camelcase(self, text):
        """Convert text to camelCase for JavaScript variable name."""
        # Remove special characters and split
        words = ''.join(c if c.isalnum() or c.isspace() else ' ' for c in text).split()
        if not words:
            return 'stage'
        
        # Filter out leading numbers and ensure valid JS identifier
        filtered_words = []
        for word in words:
            # Remove leading digits from each word
            word = word.lstrip('0123456789')
            if word:  # Only add if something remains
                filtered_words.append(word)
        
        if not filtered_words:
            return 'stage'
        
        # First word lowercase, rest capitalized
        return filtered_words[0].lower() + ''.join(w.capitalize() for w in filtered_words[1:])


def main():
    parser = argparse.ArgumentParser(
        description='Generate stage configuration from audio file using librosa'
    )
    parser.add_argument(
        'audio_file',
        help='Path to audio file (MP3, WAV, etc.)'
    )
    parser.add_argument(
        '--output', '-o',
        help='Output file for JavaScript configuration (default: auto-generated in src/game/generated/)',
        default=None
    )
    parser.add_argument(
        '--name', '-n',
        help='Stage name (default: filename)',
        default=None
    )
    parser.add_argument(
        '--scroll-speed', '-s',
        type=int,
        help='Game scroll speed in pixels/second (default: 80)',
        default=80
    )
    parser.add_argument(
        '--spacing', '-p',
        type=int,
        help='Minimum pillar spacing in pixels (default: 400)',
        default=400
    )
    
    args = parser.parse_args()
    
    # Check if audio file exists
    if not os.path.exists(args.audio_file):
        print(f"Error: Audio file not found: {args.audio_file}")
        return 1
    
    # Generate stage
    generator = StageGenerator(
        scroll_speed=args.scroll_speed,
        min_pillar_spacing=args.spacing
    )
    
    print(f"\nGenerating stage from: {args.audio_file}")
    print(f"Scroll speed: {args.scroll_speed}px/s")
    print(f"Min pillar spacing: {args.spacing}px\n")
    
    config = generator.generate_stage_config(args.audio_file, args.name)
    
    # Export to JSON first (clean data format for reference)
    json_path = generator.export_to_json(config, args.output if args.output and args.output.endswith('.json') else None)
    
    # Export to JS module (for importing in game)
    js_path = generator.export_to_js(config, args.output if args.output and args.output.endswith('.js') else None)
    
    # Print summary
    print(f"\n{'='*80}")
    print(f"STAGE GENERATED SUCCESSFULLY")
    print(f"{'='*80}")
    print(f"Stage: {config['name']}")
    print(f"Duration: {config['duration']}s")
    print(f"Tempo: {config['bpm']} BPM")
    print(f"Pillars: {len(config['pillars'])}")
    print(f"JSON: {json_path}")
    print(f"JS Module: {js_path}")
    print(f"{'='*80}\n")
    
    safe_name = generator._to_camelcase(config['name'])
    print(f"To use this stage in your game:")
    print(f"1. Import it in src/game/stages.js:")
    print(f"   import {safe_name} from './generated/{safe_name}.js';")
    print(f"2. Add to stages object:")
    print(f"   export const stages = {{ {safe_name} }};")
    
    return 0


if __name__ == '__main__':
    exit(main())

