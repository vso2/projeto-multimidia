export default class VoiceController {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.isActive = false;
    this.currentPitch = 0;
    this.rawPitch = 0; // Raw captured frequency at the moment (no filtering)
    this.smoothedRawPitch = 0; // Smoothed raw pitch for display
    this.currentNote = 'do'; // default starting note
    
    // Basic smoothing factor (0-1, higher = more smoothing)
    this.smoothingFactor = 0.7;
    
    // Basic noise filtering thresholds
    this.minRMS = 0.01; // Minimum RMS (signal strength) to consider valid
    this.minAmplitude = 0.01; // Minimum peak amplitude
    this.minDynamicRange = 0.005; // Minimum dynamic range (to filter flat noise)
    
    // Musical notes with their frequency ranges (Hz)
    // Octaves 3 and 4 - NO overlapping frequencies
    this.musicalNotes = {
      // Octave 3 (C3-B3) - lower octave
      'do3': { min: 130, max: 145, freq: 130.81 }, // C3: 130-145 Hz
      're3': { min: 145, max: 163, freq: 146.83 }, // D3: 145-163 Hz
      'mi3': { min: 163, max: 182, freq: 164.81 }, // E3: 163-182 Hz
      'fa3': { min: 182, max: 195, freq: 174.61 }, // F3: 182-195 Hz
      'sol3': { min: 195, max: 218, freq: 196.00 }, // G3: 195-218 Hz
      'la3': { min: 218, max: 245, freq: 220.00 }, // A3: 218-245 Hz
      'si3': { min: 245, max: 270, freq: 246.94 }, // B3: 245-270 Hz
      
      // Octave 4 (C4-B4) - higher octave
      'do': { min: 270, max: 287, freq: 261.63 }, // C4: 270-287 Hz
      're': { min: 287, max: 310, freq: 293.66 }, // D4: 287-310 Hz
      'mi': { min: 310, max: 337, freq: 329.63 }, // E4: 310-337 Hz
      'fa': { min: 337, max: 360, freq: 349.23 }, // F4: 337-360 Hz
      'sol': { min: 360, max: 407, freq: 392.00 }, // G4: 360-407 Hz
      'la': { min: 407, max: 457, freq: 440.00 }, // A4: 407-457 Hz
      'si': { min: 457, max: 520, freq: 493.88 }  // B4: 457-520 Hz
    };
    
    this.validPitchRange = { min: 130, max: 520 }; // Octaves 3-4 range (no overlaps)
  }
  
  async initialize() {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 4096; // Higher FFT for better frequency resolution
      this.analyser.smoothingTimeConstant = 0.3; // Lower smoothing for more responsive detection
      
      // Connect microphone
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);
      
      this.isActive = true;
      
      // Start pitch detection loop
      this.detectPitch();
      
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      return false;
    }
  }
  
  detectPitch() {
    if (!this.isActive) return;
    
    const bufferLength = this.analyser.fftSize;
    const buffer = new Float32Array(bufferLength);
    
    const detectLoop = () => {
      if (!this.isActive) return;
      
      this.analyser.getFloatTimeDomainData(buffer);
      
      // Use autocorrelation to detect pitch
      const pitch = this.autoCorrelate(buffer, this.audioContext.sampleRate);
      
      // Apply basic smoothing to raw pitch (always smooth, even if pitch is 0)
      if (pitch > 0) {
        // Exponential smoothing: blend new value with previous smoothed value
        if (this.smoothedRawPitch === 0) {
          this.smoothedRawPitch = pitch; // First value
        } else {
          // Smooth the raw pitch: 70% old value, 30% new value
          this.smoothedRawPitch = this.smoothedRawPitch * this.smoothingFactor + pitch * (1 - this.smoothingFactor);
        }
      } else {
        // No pitch detected, gradually decay smoothed value
        if (this.smoothedRawPitch > 0) {
          this.smoothedRawPitch *= 0.95; // Decay slowly
          if (this.smoothedRawPitch < 1) {
            this.smoothedRawPitch = 0;
          }
        }
      }
      
      // Always use smoothed value for raw pitch display
      this.rawPitch = this.smoothedRawPitch;
      
      // Only use pitch for game logic if it's in valid range
      if (this.rawPitch > 0 && this.rawPitch >= this.validPitchRange.min && this.rawPitch <= this.validPitchRange.max) {
        this.currentPitch = this.rawPitch;
        this.updateCurrentNote();
      } else {
        // Reset pitch if outside valid range
        this.currentPitch = 0;
      }
      
      requestAnimationFrame(detectLoop);
    };
    
    detectLoop();
  }
  
  autoCorrelate(buffer, sampleRate) {
    // Autocorrelation algorithm for pitch detection with basic noise filtering
    let size = buffer.length;
    let maxSamples = Math.floor(size / 2);
    let bestOffset = -1;
    let bestCorrelation = 0;
    
    // Basic noise filtering: check signal strength
    let rms = 0;
    let maxAmplitude = 0;
    let minAmplitude = Infinity;
    
    for (let i = 0; i < size; i++) {
      const val = buffer[i];
      const absVal = Math.abs(val);
      rms += val * val;
      if (absVal > maxAmplitude) maxAmplitude = absVal;
      if (absVal < minAmplitude) minAmplitude = absVal;
    }
    rms = Math.sqrt(rms / size);
    
    // Filter out noise: signal too weak, too flat, or too quiet
    if (rms < this.minRMS) return -1; // Too quiet
    if (maxAmplitude < this.minAmplitude) return -1; // Too weak
    if (maxAmplitude - minAmplitude < this.minDynamicRange) return -1; // Too flat (likely noise)
    
    // Find the best offset
    let lastCorrelation = 1;
    for (let offset = 1; offset < maxSamples; offset++) {
      let correlation = 0;
      
      for (let i = 0; i < maxSamples; i++) {
        correlation += Math.abs(buffer[i] - buffer[i + offset]);
      }
      
      correlation = 1 - (correlation / maxSamples);
      
      if (correlation > 0.9 && correlation > lastCorrelation) {
        if (correlation > bestCorrelation) {
          bestCorrelation = correlation;
          bestOffset = offset;
        }
      }
      
      lastCorrelation = correlation;
    }
    
    // Return pitch if correlation is good enough
    if (bestCorrelation > 0.08 && bestOffset !== -1) {
      const fundamentalFreq = sampleRate / bestOffset;
      return fundamentalFreq;
    }
    
    return -1;
  }
  
  getPitch() {
    return this.currentPitch;
  }
  
  getRawPitch() {
    return this.rawPitch;
  }
  
  getCurrentNote() {
    return this.currentNote;
  }
  
  detectNoteFromPitch(pitch) {
    if (pitch <= 0 || pitch < 130 || pitch > 520) return null;
    
    // Find which musical note this pitch corresponds to
    // Check each note range (all octaves)
    for (const [note, range] of Object.entries(this.musicalNotes)) {
      if (pitch >= range.min && pitch <= range.max) {
        return note;
      }
    }
    
    // If pitch is close to a note (within 25 Hz), match it anyway
    for (const [note, range] of Object.entries(this.musicalNotes)) {
      const distance = Math.abs(pitch - range.freq);
      if (distance < 25) { // Within 25 Hz of the note frequency
        return note;
      }
    }
    
    return null;
  }
  
  updateCurrentNote() {
    const detectedNote = this.detectNoteFromPitch(this.currentPitch);
    
    // Update note immediately when detected
    if (detectedNote && this.currentPitch > 0) {
      this.currentNote = detectedNote;
    }
  }
  
  getNoteIndex() {
    // Return the lane index (0-6) for the current note
    // Map all octaves to the same 7 lanes based on note name
    const baseNote = this.currentNote.replace(/[0-9]/g, ''); // Remove octave number
    const notes = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'];
    const index = notes.indexOf(baseNote);
    return index >= 0 ? index : 3; // Default to FA if not found
  }
  
  destroy() {
    this.isActive = false;
    
    if (this.microphone) {
      this.microphone.disconnect();
    }
    
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

