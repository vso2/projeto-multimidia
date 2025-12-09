export default class VoiceController {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.stream = null;
    this.isActive = false;
    this.currentPitch = 0;
    this.rawPitch = 0;
    this.smoothedRawPitch = 0;
    this.currentForce = 0;
    
    this.smoothingFactor = 0.75;
    
    this.minRMS = 0.01;
    this.minAmplitude = 0.01;
    this.minDynamicRange = 0.005;
    this.minForce = 0.01;
    
    this.validPitchRange = { min: 100, max: 600 };
  }
  
  async initialize() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      this.audioContext = new window.AudioContext();
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 4096;
      this.analyser.smoothingTimeConstant = 0.3;
      
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.stream = stream;
      this.microphone.connect(this.analyser);
      
      this.isActive = true;
      this.detectPitch();
      
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
      const pitch = this.autoCorrelate(buffer, this.audioContext.sampleRate);
      
      if (pitch > 0) {
        if (this.smoothedRawPitch === 0) {
          this.smoothedRawPitch = pitch;
        } else {
          this.smoothedRawPitch = this.smoothedRawPitch * this.smoothingFactor + pitch * (1 - this.smoothingFactor);
        }
      } else {
        if (this.smoothedRawPitch > 0) {
          this.smoothedRawPitch *= 0.95;
          if (this.smoothedRawPitch < 1) {
            this.smoothedRawPitch = 0;
          }
        }
      }
      
      this.rawPitch = this.smoothedRawPitch;

      if (this.rawPitch > 0 && this.rawPitch >= this.validPitchRange.min && this.rawPitch <= this.validPitchRange.max) {
        this.currentPitch = this.rawPitch;
      } else {
        this.currentPitch = 0;
      }
      
      requestAnimationFrame(detectLoop);
    };
    
    detectLoop();
  }
  
  calculateForce(rms, maxAmplitude) {
    return (rms * 0.90) + (maxAmplitude * 0.10);
  }
  
  autoCorrelate(buffer, sampleRate) {
    let size = buffer.length;
    let maxSamples = Math.floor(size / 2);
    let bestOffset = -1;
    let bestCorrelation = 0;
    
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
    
    const force = this.calculateForce(rms, maxAmplitude);
    this.currentForce = force;
    
    if (rms < 0.005 && maxAmplitude < 0.005) return -1;
    
    const dynamicRange = maxAmplitude - minAmplitude;
    if (dynamicRange < this.minDynamicRange && rms < 0.005) {
      return -1;
    }
    
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
    return this.currentForce;
  }
  
  async destroyAsync() {
    this.isActive = false;
    
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
      this.stream = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch (error) {
        console.error('[VoiceController] Error closing audio context:', error);
      }
      this.audioContext = null;
    }
    
    this.analyser = null;
  }
}

