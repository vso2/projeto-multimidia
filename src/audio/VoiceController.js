export default class VoiceController {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.stream = null;
    this.isActive = false;
    this.currentPitch = 0;
    this.rawPitch = 0; // Raw captured frequency at the moment (no filtering)
    this.smoothedRawPitch = 0; // Smoothed raw pitch for display
    this.currentForce = 0; // Current force value (combines volume and amplitude)
    
    // Basic smoothing factor (0-1, higher = more smoothing)
    this.smoothingFactor = 0.75;
    
    // Basic noise filtering thresholds
    this.minRMS = 0.01; // Minimum RMS (signal strength) to consider valid
    this.minAmplitude = 0.01; // Minimum peak amplitude
    this.minDynamicRange = 0.005; // Minimum dynamic range (to filter flat noise)
    this.minForce = 0.01; // Minimum force threshold (combines RMS and amplitude)
    
    this.validPitchRange = { min: 100, max: 600 }; // Valid pitch range for gameplay
  }
  
  async initialize() {
    try {
      console.log('[VoiceController] Requesting microphone access...');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      console.log('[VoiceController] Microphone access granted');
      
      // Create audio context
      this.audioContext = new window.AudioContext();
      console.log('[VoiceController] AudioContext created, state:', this.audioContext.state);
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 4096; // Higher FFT for better frequency resolution
      this.analyser.smoothingTimeConstant = 0.3; // Lower smoothing for more responsive detection
      
      // Connect microphone
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.stream = stream; // Store stream reference for cleanup
      this.microphone.connect(this.analyser);
      
      console.log('[VoiceController] Microphone connected to analyser');
      
      this.isActive = true;
      
      // Start pitch detection loop
      this.detectPitch();
      
      console.log('[VoiceController] Initialization complete');
      return true;
    } catch (error) {
      console.error('[VoiceController] Error accessing microphone:', error);
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
          // Smooth the raw pitch: 75% old value, 25% new value
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
      } else {
        // Reset pitch if outside valid range
        this.currentPitch = 0;
      }
      
      requestAnimationFrame(detectLoop);
    };
    
    detectLoop();
  }
  
  calculateForce(rms, maxAmplitude) {
    // Combine RMS (volume) and peak amplitude into a single force metric
    // Weight RMS heavily (90%) as it represents sustained volume - crucial for force-based gameplay
    return (rms * 0.90) + (maxAmplitude * 0.10);
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
    
    // Calculate force (combines volume and amplitude)
    const force = this.calculateForce(rms, maxAmplitude);
    this.currentForce = force;
    
    // For force-based gameplay, we want all force levels (including 0)
    // Only filter out actual noise with very specific checks
    if (rms < 0.005 && maxAmplitude < 0.005) return -1; // Complete silence/noise
    

    
    const dynamicRange = maxAmplitude - minAmplitude;
    if (dynamicRange < this.minDynamicRange && rms < 0.005) {
      return -1;
    }
    
    // Find the best offset
    let lastCorrelation = 1;
    for (let offset = 1; offset < maxSamples; offset++) {
      let correlation = 0;
      
      for (let i = 0; i < maxSamples; i++) {
        correlation += Math.abs(buffer[i] - buffer[i + offset]);
      }
      
      correlation = 1 - (correlation / maxSamples);
      
      // Lowered threshold from 0.8 to 0.7 to better detect sustained notes
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
  
  getForce() {
    return this.currentForce;
  }
  
  getVolume() {
    // Return the RMS value (volume) separately for clarity
    // This is essentially the same as force for now
    return this.currentForce;
  }
  
  async destroyAsync() {
    console.log('[VoiceController] Destroying voice controller...');
    this.isActive = false;
    
    // Disconnect microphone
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    // Stop all tracks in the stream
    if (this.stream) {
      console.log('[VoiceController] Stopping media stream tracks');
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('[VoiceController] Track stopped:', track.kind);
      });
      this.stream = null;
    }
    
    // Close audio context and wait for it to complete
    if (this.audioContext && this.audioContext.state !== 'closed') {
      console.log('[VoiceController] Closing audio context...');
      try {
        await this.audioContext.close();
        console.log('[VoiceController] Audio context closed successfully');
      } catch (error) {
        console.error('[VoiceController] Error closing audio context:', error);
      }
      this.audioContext = null;
    }
    
    this.analyser = null;
    console.log('[VoiceController] Destroy complete');
  }
}

