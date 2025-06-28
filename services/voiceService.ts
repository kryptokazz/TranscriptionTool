import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Voice service for high-quality text-to-speech
export interface VoiceOption {
  id: string;
  name: string;
  flag: string;
  language: string;
  gender: 'male' | 'female';
  description: string;
  provider: 'elevenlabs';
  premium: boolean;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

// ElevenLabs voice IDs (these are actual voice IDs from their API)
export const PREMIUM_VOICES: VoiceOption[] = [
  // ElevenLabs Chinese Voices (Premium) - Using actual voice IDs
  {
    id: 'JBFqnCBsd6RMkjVDRZzb', // George - multilingual
    name: 'George (Premium)',
    flag: '🇨🇳',
    language: 'Mandarin Chinese',
    gender: 'male',
    description: 'Natural, clear Mandarin pronunciation',
    provider: 'elevenlabs',
    premium: true
  },
  {
    id: 'pNInz6obpgDQGcFmaJgB', // Adam - multilingual
    name: 'Adam (Premium)',
    flag: '🇨🇳',
    language: 'Mandarin Chinese',
    gender: 'male',
    description: 'Professional male Mandarin voice',
    provider: 'elevenlabs',
    premium: true
  },
  {
    id: 'EXAVITQu4vr4xnSDxMaL', // Bella - multilingual
    name: 'Bella (Premium)',
    flag: '🇨🇳',
    language: 'Mandarin Chinese',
    gender: 'female',
    description: 'Expressive female Mandarin voice',
    provider: 'elevenlabs',
    premium: true
  },
  {
    id: 'IKne3meq5aSn9XLyUdCD', // Charlie - multilingual
    name: 'Charlie (Premium)',
    flag: '🇨🇳',
    language: 'Mandarin Chinese',
    gender: 'male',
    description: 'Warm male Mandarin voice',
    provider: 'elevenlabs',
    premium: true
  },
  {
    id: 'Xb7hH8MSUJpSbSDYk0k2', // Alice - multilingual
    name: 'Alice (Premium)',
    flag: '🇨🇳',
    language: 'Mandarin Chinese',
    gender: 'female',
    description: 'Clear female Mandarin voice',
    provider: 'elevenlabs',
    premium: true
  }
];

export class VoiceService {
  private apiKey: string | null = null;
  private client: ElevenLabsClient | null = null;
  private audioCache = new Map<string, string>();
  
  constructor() {
    // Try to get API key from localStorage
    this.loadApiKey();
  }
  
  private loadApiKey() {
    try {
      const storedKey = localStorage.getItem('elevenlabs_api_key');
      if (storedKey && storedKey.trim()) {
        this.apiKey = storedKey.trim();
        this.initializeClient();
        console.log('API key loaded from localStorage');
      }
    } catch (error) {
      console.error('Error loading API key from localStorage:', error);
    }
  }
  
  private initializeClient() {
    if (this.apiKey) {
      try {
        this.client = new ElevenLabsClient({
          apiKey: this.apiKey
        });
        console.log('ElevenLabs client initialized');
      } catch (error) {
        console.error('Error initializing ElevenLabs client:', error);
        this.client = null;
      }
    }
  }
  
  setApiKey(key: string): boolean {
    try {
      const trimmedKey = key.trim();
      if (!trimmedKey) {
        throw new Error('API key cannot be empty');
      }
      
      if (!trimmedKey.startsWith('sk_')) {
        throw new Error('Invalid API key format - should start with sk_');
      }
      
      this.apiKey = trimmedKey;
      localStorage.setItem('elevenlabs_api_key', trimmedKey);
      this.initializeClient();
      
      console.log('API key saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving API key:', error);
      return false;
    }
  }
  
  hasApiKey(): boolean {
    return !!(this.apiKey && this.apiKey.trim());
  }
  
  getApiKey(): string | null {
    return this.apiKey;
  }
  
  clearApiKey() {
    try {
      this.apiKey = null;
      this.client = null;
      localStorage.removeItem('elevenlabs_api_key');
      console.log('API key cleared');
    } catch (error) {
      console.error('Error clearing API key:', error);
    }
  }
  
  // Create audio stream from text using ElevenLabs streaming
  private async createAudioStreamFromText(text: string, voiceId: string, settings: VoiceSettings): Promise<Uint8Array> {
    if (!this.client || !this.apiKey) {
      throw new Error('ElevenLabs API key not set');
    }

    try {
      const audioStream = await this.client.textToSpeech.stream(voiceId, {
        modelId: 'eleven_multilingual_v2',
        text: text.substring(0, 1000), // Limit text length
        outputFormat: 'mp3_44100_128',
        voiceSettings: {
          stability: settings.stability,
          similarityBoost: settings.similarity_boost,
          useSpeakerBoost: settings.use_speaker_boost,
          speed: 1.0,
        },
      });

      const chunks: Uint8Array[] = [];
      for await (const chunk of audioStream) {
        chunks.push(chunk);
      }

      // Combine all chunks into a single Uint8Array
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    } catch (error: any) {
      console.error('ElevenLabs streaming error:', error);
      throw error;
    }
  }
  
  // Generate speech using ElevenLabs SDK with streaming
  async generateElevenLabsSpeech(
    text: string, 
    voiceId: string, 
    settings: VoiceSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true
    }
  ): Promise<string> {
    if (!this.client || !this.apiKey) {
      throw new Error('ElevenLabs API key not set');
    }
    
    // Check cache first
    const cacheKey = `elevenlabs-${voiceId}-${text.substring(0, 50)}-${JSON.stringify(settings)}`;
    if (this.audioCache.has(cacheKey)) {
      return this.audioCache.get(cacheKey)!;
    }
    
    try {
      // Generate speech using streaming
      const audioData = await this.createAudioStreamFromText(text, voiceId, settings);
      
      // Convert the audio data to a blob URL
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Cache the result
      this.audioCache.set(cacheKey, audioUrl);
      
      return audioUrl;
    } catch (error: any) {
      console.error('ElevenLabs API error:', error);
      
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        throw new Error('Invalid API key. Please check your ElevenLabs API key.');
      } else if (error.message?.includes('422')) {
        throw new Error('Invalid voice ID or settings. Please try a different voice.');
      } else if (error.message?.includes('429')) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else if (error.message?.includes('quota')) {
        throw new Error('API quota exceeded. Please check your ElevenLabs account.');
      }
      
      throw new Error(`ElevenLabs API error: ${error.message || 'Unknown error'}`);
    }
  }
  
  // Main method to generate speech
  async generateSpeech(text: string, voiceOption: VoiceOption, settings?: VoiceSettings): Promise<string | void> {
    if (!this.hasApiKey()) {
      throw new Error('ElevenLabs API key required for premium voices. Please set up your API key in voice settings.');
    }
    
    return await this.generateElevenLabsSpeech(text, voiceOption.id, settings);
  }
  
  // Test API key validity
  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const trimmedKey = apiKey.trim();
      
      if (!trimmedKey || !trimmedKey.startsWith('sk_')) {
        console.log('API key format validation failed');
        return false;
      }
      
      console.log('Testing API key with ElevenLabs...');
      
      // Test with a simple API call
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        method: 'GET',
        headers: {
          'xi-api-key': trimmedKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('API key validation successful');
        return true;
      } else {
        console.error('API key validation failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('API key test failed:', error);
      return false;
    }
  }
  
  // Clean up cached audio URLs
  cleanup() {
    this.audioCache.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    this.audioCache.clear();
  }
}

// Singleton instance
export const voiceService = new VoiceService();