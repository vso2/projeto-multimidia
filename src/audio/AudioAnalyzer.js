export default class AudioAnalyzer {
  constructor() {
    this.audioContext = null;
    this.sampleRate = 5; // samples per second (reduced for shorter levels)
    this.maxDuration = 60; // limit to 60 seconds for prototype
  }
  
  async analyzeFile(file) {
    // Create audio context
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Decode audio data
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    // Analyze frequencies across the entire audio
    const frequencyData = await this.extractFrequencyData(audioBuffer);
    
    return {
      buffer: audioBuffer,
      frequencyData: frequencyData,
      duration: audioBuffer.duration,
      audioFile: file
    };
  }
  
  async extractFrequencyData(audioBuffer) {
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    // Create source
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Create analyzer
    const analyzer = offlineContext.createAnalyser();
    analyzer.fftSize = 256;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    source.connect(analyzer);
    analyzer.connect(offlineContext.destination);
    
    // Calculate number of samples (limit duration for prototype)
    const duration = Math.min(audioBuffer.duration, this.maxDuration);
    const sampleInterval = 1 / this.sampleRate;
    const numSamples = Math.floor(duration * this.sampleRate);
    
    const frequencyData = [];
    
    // Sample at intervals
    for (let i = 0; i < numSamples; i++) {
      const time = i * sampleInterval;
      const sampleIndex = Math.floor(time * audioBuffer.sampleRate);
      
      // Get frequency data at this point
      const frequency = this.getFrequencyAtSample(audioBuffer, sampleIndex, bufferLength);
      frequencyData.push(frequency);
    }
    
    // Smooth the data to reduce extreme variations
    const smoothedData = this.smoothData(frequencyData);
    
    return smoothedData;
  }
  
  smoothData(data) {
    // Apply simple moving average to smooth terrain
    const windowSize = 3;
    const smoothed = [];
    
    for (let i = 0; i < data.length; i++) {
      let sum = 0;
      let count = 0;
      
      for (let j = Math.max(0, i - Math.floor(windowSize / 2)); 
           j <= Math.min(data.length - 1, i + Math.floor(windowSize / 2)); 
           j++) {
        sum += data[j];
        count++;
      }
      
      smoothed.push(sum / count);
    }
    
    return smoothed;
  }
  
  getFrequencyAtSample(audioBuffer, sampleIndex, fftSize) {
    // Get a chunk of samples around this point
    const chunkSize = fftSize * 2;
    const startIndex = Math.max(0, sampleIndex - chunkSize / 2);
    const channelData = audioBuffer.getChannelData(0);
    
    // Calculate average amplitude in this chunk
    let sum = 0;
    let count = 0;
    
    for (let i = startIndex; i < Math.min(startIndex + chunkSize, channelData.length); i++) {
      sum += Math.abs(channelData[i]);
      count++;
    }
    
    const avgAmplitude = count > 0 ? sum / count : 0;
    
    // Simple frequency estimation based on zero-crossings and amplitude
    let zeroCrossings = 0;
    for (let i = startIndex + 1; i < Math.min(startIndex + chunkSize, channelData.length); i++) {
      if ((channelData[i] >= 0 && channelData[i - 1] < 0) || 
          (channelData[i] < 0 && channelData[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    
    // Combine amplitude and frequency for terrain height
    // Normalize to 0-255 range
    const frequency = Math.min(255, (avgAmplitude * 500 + zeroCrossings * 5));
    
    return frequency;
  }
  
  createAudioElement(file) {
    const audio = new Audio(URL.createObjectURL(file));
    return audio;
  }
}

