import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Volume2, Copy, Download, Eye, EyeOff, Type, Languages, Loader, RefreshCw, VolumeX, Play, Pause, AlertTriangle, Settings, Crown, Zap, Scissors, Plus, X, Edit3 } from 'lucide-react';
import { pinyin } from 'pinyin-pro';
import { Button } from './ui/button';
import { VoiceSetup } from './VoiceSetup';
import { voiceService, PREMIUM_VOICES, VoiceOption, VoiceSettings } from '../services/voiceService';
import { getSpeechLanguageCode } from '../utils/languageDetection';

interface ChineseAnalysisProps {
  text: string;
  onBack: () => void;
}

type PinyinStyle = 'tone' | 'num' | 'none';
type DisplayMode = 'inline' | 'above' | 'below' | 'inline-translation';

export const ChineseAnalysis: React.FC<ChineseAnalysisProps> = ({ text, onBack }) => {
  const [showPinyin, setShowPinyin] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [pinyinStyle, setPinyinStyle] = useState<PinyinStyle>('tone');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('above');
  const [fontSize, setFontSize] = useState(16);
  const [copied, setCopied] = useState<'text' | 'pinyin' | 'translation' | null>(null);
  const [translation, setTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [retryCount, setRetryCount] = useState(0);
  
  // Manual sentence separation states
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [customSentences, setCustomSentences] = useState<string[]>([]);
  const [editingText, setEditingText] = useState('');
  
  // Voice service states
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(PREMIUM_VOICES[0]);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true
  });
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [showVoiceSetup, setShowVoiceSetup] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);

  // Initialize editing text and custom sentences
  useEffect(() => {
    setEditingText(text);
    // Auto-split by common Chinese punctuation
    const autoSentences = text.split(/[。！？；\n]+/).filter(s => s.trim().length > 0);
    setCustomSentences(autoSentences);
  }, [text]);

  // Split text into lines for individual playback - use custom sentences if available
  const textLines = useMemo(() => {
    if (customSentences.length > 0) {
      return customSentences.filter(sentence => sentence.trim().length > 0);
    }
    return text.split('\n').filter(line => line.trim().length > 0);
  }, [text, customSentences]);

  // Generate pinyin for the text
  const pinyinText = useMemo(() => {
    const textToProcess = customSentences.length > 0 ? customSentences.join(' ') : text;
    if (!textToProcess) return '';
    
    const options = {
      toneType: pinyinStyle === 'tone' ? 'symbol' : pinyinStyle === 'num' ? 'num' : 'none',
      type: 'array',
      v: true
    } as const;
    
    return pinyin(textToProcess, options).join(' ');
  }, [text, customSentences, pinyinStyle]);

  // Generate character-by-character analysis
  const characterAnalysis = useMemo(() => {
    const textToProcess = customSentences.length > 0 ? customSentences.join('') : text;
    if (!textToProcess) return [];
    
    return Array.from(textToProcess).map(char => {
      if (/[\u4e00-\u9fff]/.test(char)) {
        // Chinese character
        const charPinyin = pinyin(char, {
          toneType: pinyinStyle === 'tone' ? 'symbol' : pinyinStyle === 'num' ? 'num' : 'none',
          v: true
        });
        return {
          char,
          pinyin: charPinyin,
          isChinese: true
        };
      } else {
        // Non-Chinese character (punctuation, numbers, etc.)
        return {
          char,
          pinyin: '',
          isChinese: false
        };
      }
    });
  }, [text, customSentences, pinyinStyle]);

  // Check if user has premium access
  const hasPremiumAccess = voiceService.hasApiKey();

  // Get available voices based on access level
  const availableVoices = useMemo(() => {
    return PREMIUM_VOICES;
  }, []);

  // Auto-select best available voice
  useEffect(() => {
    if (availableVoices.length > 0) {
      // Prefer premium Chinese voices if available
      const chineseVoice = availableVoices.find(v => 
        v.language.includes('Chinese') && (hasPremiumAccess || !v.premium)
      );
      
      if (chineseVoice && chineseVoice.id !== selectedVoice.id) {
        setSelectedVoice(chineseVoice);
      }
    }
  }, [availableVoices, hasPremiumAccess]);

  // Manual sentence editing functions
  const handleStartEditing = () => {
    setIsEditingMode(true);
    setEditingText(customSentences.join('\n'));
  };

  const handleSaveEditing = () => {
    const newSentences = editingText.split('\n').filter(s => s.trim().length > 0);
    setCustomSentences(newSentences);
    setIsEditingMode(false);
  };

  const handleCancelEditing = () => {
    setIsEditingMode(false);
    setEditingText(customSentences.join('\n'));
  };

  const handleAutoSplit = () => {
    // Smart split by Chinese punctuation and natural breaks
    const sentences = text.split(/[。！？；\n]+/).filter(s => s.trim().length > 0);
    setCustomSentences(sentences);
    setEditingText(sentences.join('\n'));
  };

  const addNewSentence = () => {
    setCustomSentences([...customSentences, '']);
    setEditingText(customSentences.join('\n') + '\n');
  };

  const removeSentence = (index: number) => {
    const newSentences = customSentences.filter((_, i) => i !== index);
    setCustomSentences(newSentences);
    setEditingText(newSentences.join('\n'));
  };

  const updateSentence = (index: number, newText: string) => {
    const newSentences = [...customSentences];
    newSentences[index] = newText;
    setCustomSentences(newSentences);
  };

  const translateText = async (isRetry = false) => {
    const textToTranslate = customSentences.length > 0 ? customSentences.join(' ') : text;
    if (!textToTranslate.trim()) return;
    
    setIsTranslating(true);
    setTranslationError('');
    
    const maxRetries = 3;
    const currentRetry = isRetry ? retryCount + 1 : 0;
    
    try {
      // Add a small delay for retries to avoid hitting rate limits
      if (isRetry && currentRetry > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * currentRetry));
      }
      
      // Using Google Translate API via MyMemory (free service)
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=zh|${targetLanguage}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Translation service returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
        setTranslation(data.responseData.translatedText);
        setShowTranslation(true);
        setRetryCount(0); // Reset retry count on success
        setTranslationError(''); // Clear any previous errors
      } else if (data.responseStatus === 403) {
        throw new Error('Translation service quota exceeded. Please try again later.');
      } else if (data.responseStatus === 429) {
        throw new Error('Too many requests. Please wait a moment and try again.');
      } else {
        throw new Error(data.responseDetails || 'Translation service returned an invalid response');
      }
    } catch (error) {
      console.error('Translation error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (currentRetry < maxRetries && !errorMessage.includes('quota') && !errorMessage.includes('Too many')) {
        // Retry for network errors or temporary issues
        setRetryCount(currentRetry);
        setTimeout(() => translateText(true), 2000 * (currentRetry + 1));
        setTranslationError(`Translation failed (attempt ${currentRetry + 1}/${maxRetries + 1}). Retrying...`);
      } else {
        // Final failure or quota/rate limit error
        if (errorMessage.includes('quota') || errorMessage.includes('Too many')) {
          setTranslationError('Translation service is temporarily unavailable due to high usage. Please try again in a few minutes.');
        } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
          setTranslationError('Network error. Please check your internet connection and try again.');
        } else {
          setTranslationError(`Translation failed: ${errorMessage}. Please try again later.`);
        }
        setRetryCount(0);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const copyToClipboard = async (content: string, type: 'text' | 'pinyin' | 'translation') => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadContent = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    const finalText = customSentences.length > 0 ? customSentences.join('\n') : text;
    const content = [
      'Chinese Text:',
      finalText,
      '',
      'Pinyin:',
      pinyinText,
      '',
      'Translation:',
      translation || 'Not translated'
    ].join('\n');
    
    downloadContent(content, `chinese-analysis-${Date.now()}.txt`);
  };

  const retryTranslation = () => {
    setRetryCount(0);
    translateText(false);
  };

  const stopCurrentAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    setCurrentlyPlaying(null);
    setAutoPlay(false);
  };

  const speakText = async (textToSpeak: string, lineId?: string) => {
    try {
      // Stop any current audio
      stopCurrentAudio();
      
      if (lineId) {
        setCurrentlyPlaying(lineId);
      }
      
      setIsGeneratingSpeech(true);
      
      // Generate speech using the voice service
      const audioUrl = await voiceService.generateSpeech(textToSpeak, selectedVoice, voiceSettings);
      
      if (audioUrl) {
        // Play the generated audio
        const audio = new Audio(audioUrl);
        setCurrentAudio(audio);
        
        audio.onended = () => {
          setCurrentlyPlaying(null);
          setCurrentAudio(null);
        };
        
        audio.onerror = () => {
          console.error('Audio playback error');
          setCurrentlyPlaying(null);
          setCurrentAudio(null);
        };
        
        await audio.play();
      } else {
        // Browser speech was used (no URL returned)
        setCurrentlyPlaying(null);
      }
    } catch (error) {
      console.error('Speech generation error:', error);
      setCurrentlyPlaying(null);
      
      // Show user-friendly error message
      if (error instanceof Error && error.message.includes('API key')) {
        setShowVoiceSetup(true);
      }
    } finally {
      setIsGeneratingSpeech(false);
    }
  };

  const speakAllLines = async () => {
    if (autoPlay) {
      stopCurrentAudio();
      return;
    }
    
    setAutoPlay(true);
    
    for (let i = 0; i < textLines.length; i++) {
      if (!autoPlay) break;
      
      const line = textLines[i];
      const lineId = `line-${i}`;
      
      try {
        await speakText(line, lineId);
        
        // Wait for current audio to finish
        if (currentAudio) {
          await new Promise<void>((resolve) => {
            const audio = currentAudio;
            if (audio) {
              audio.onended = () => resolve();
              audio.onerror = () => resolve();
            } else {
              resolve();
            }
          });
        }
        
        // Small pause between lines
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Error in speakAllLines:', error);
        break;
      }
    }
    
    setAutoPlay(false);
  };

  const handleVoiceSetupComplete = () => {
    setShowVoiceSetup(false);
    // Refresh available voices
    const premiumVoice = PREMIUM_VOICES.find(v => v.premium && v.language.includes('Chinese'));
    if (premiumVoice) {
      setSelectedVoice(premiumVoice);
    }
  };

  const renderSentenceEditor = () => (
    <div className="bg-white border border-gray-200 rounded-3xl p-8 mb-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">✂️ Sentence Management</h3>
        <div className="flex space-x-3">
          {!isEditingMode ? (
            <>
              <Button
                onClick={handleAutoSplit}
                variant="outline"
                className="gap-2"
              >
                <Scissors size={16} />
                Auto Split
              </Button>
              <Button
                onClick={handleStartEditing}
                variant="secondary"
                className="gap-2"
              >
                <Edit3 size={16} />
                Edit Sentences
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleCancelEditing}
                variant="outline"
                className="gap-2"
              >
                <X size={16} />
                Cancel
              </Button>
              <Button
                onClick={handleSaveEditing}
                className="gap-2"
              >
                <Download size={16} />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditingMode ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-blue-700 text-sm">
              <strong>Editing Mode:</strong> Each line will become a separate sentence for individual audio playback. 
              You can split long paragraphs into smaller, more manageable pieces.
            </p>
          </div>
          
          <textarea
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            className="w-full h-64 p-4 border-2 border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Enter each sentence on a new line..."
          />
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{editingText.split('\n').filter(s => s.trim().length > 0).length} sentences</span>
            <span>{editingText.length} characters</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                Current Sentences ({textLines.length})
              </span>
              <Button
                onClick={addNewSentence}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Plus size={14} />
                Add Sentence
              </Button>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {textLines.map((sentence, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-xl border border-gray-200">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium min-w-[2rem] text-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-sm leading-relaxed break-words">
                      {sentence}
                    </p>
                  </div>
                  <Button
                    onClick={() => removeSentence(index)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50 p-1 h-8 w-8"
                  >
                    <X size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <p className="text-yellow-800 text-sm">
              <strong>Tip:</strong> Breaking text into sentences allows for better pronunciation practice 
              and more precise audio playback. Each sentence can be played individually.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderVoiceControls = () => (
    <div className="border-t border-gray-200 pt-8">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-bold text-gray-900">🎙️ Voice Settings</h4>
        <div className="flex items-center space-x-3">
          {!hasPremiumAccess && (
            <Button
              onClick={() => setShowVoiceSetup(true)}
              variant="secondary"
              size="sm"
              className="gap-2"
            >
              <Crown size={16} />
              Setup ElevenLabs
            </Button>
          )}
          <Button
            onClick={() => setShowVoiceSetup(true)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Settings size={16} />
            Settings
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Voice Selection */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-900">Voice Selection</label>
          <div className="space-y-2">
            {availableVoices.map((voice) => (
              <button
                key={voice.id}
                onClick={() => setSelectedVoice(voice)}
                disabled={voice.premium && !hasPremiumAccess}
                className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                  selectedVoice.id === voice.id
                    ? 'border-green-500 bg-green-50'
                    : voice.premium && !hasPremiumAccess
                    ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{voice.flag}</span>
                    <span className="font-semibold text-gray-900">{voice.name}</span>
                    {voice.premium && (
                      <Crown size={14} className="text-yellow-500" />
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                    {voice.gender}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{voice.description}</p>
                <p className="text-xs text-blue-600 mt-1">{voice.language}</p>
                {voice.premium && !hasPremiumAccess && (
                  <p className="text-xs text-yellow-600 mt-1">Requires ElevenLabs API</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Settings (for premium voices) */}
        {selectedVoice.premium && hasPremiumAccess && (
          <div className="space-y-4">
            <label className="text-sm font-semibold text-gray-900">Voice Settings</label>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">Stability</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={voiceSettings.stability}
                  onChange={(e) => setVoiceSettings(prev => ({ ...prev, stability: Number(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500">{voiceSettings.stability}</div>
              </div>
              
              <div>
                <label className="text-xs text-gray-600">Similarity Boost</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={voiceSettings.similarity_boost}
                  onChange={(e) => setVoiceSettings(prev => ({ ...prev, similarity_boost: Number(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500">{voiceSettings.similarity_boost}</div>
              </div>
              
              <div>
                <label className="text-xs text-gray-600">Style</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={voiceSettings.style}
                  onChange={(e) => setVoiceSettings(prev => ({ ...prev, style: Number(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500">{voiceSettings.style}</div>
              </div>
            </div>
          </div>
        )}

        {/* Audio Controls */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-900">Controls</label>
          <div className="space-y-3">
            <Button
              onClick={() => speakText("你好，这是语音测试。Hello, voice test.")}
              disabled={isGeneratingSpeech || (selectedVoice.premium && !hasPremiumAccess)}
              variant="outline"
              className="w-full gap-2"
            >
              {isGeneratingSpeech ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Volume2 size={16} />
                  Test Voice
                </>
              )}
            </Button>
            
            <Button
              onClick={stopCurrentAudio}
              variant="outline"
              className="w-full gap-2"
            >
              <VolumeX size={16} />
              Stop Audio
            </Button>
            
            {!hasPremiumAccess && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-center space-x-2 mb-2">
                  <Crown size={16} className="text-yellow-600" />
                  <span className="text-yellow-800 font-medium text-sm">Premium Voices</span>
                </div>
                <p className="text-yellow-700 text-xs">
                  Get natural-sounding Chinese voices with ElevenLabs API
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderLineWithAudio = (line: string, lineIndex: number) => {
    const lineId = `line-${lineIndex}`;
    const isPlaying = currentlyPlaying === lineId;
    
    return (
      <div key={lineIndex} className="group relative">
        <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
          <Button
            onClick={() => speakText(line, lineId)}
            disabled={isPlaying || isGeneratingSpeech || (selectedVoice.premium && !hasPremiumAccess)}
            variant="outline"
            size="icon"
            className="flex-shrink-0 mt-1"
          >
            {isPlaying || (isGeneratingSpeech && currentlyPlaying === lineId) ? (
              <Loader size={16} className="animate-spin" />
            ) : (
              <Volume2 size={16} />
            )}
          </Button>
          
          <div className="flex-1 min-w-0">
            {displayMode === 'inline-translation' ? (
              <div className="space-y-3">
                {/* Pinyin line */}
                {showPinyin && (
                  <div className="text-blue-600 leading-relaxed text-sm">
                    {Array.from(line).map((char, charIndex) => {
                      const analysis = characterAnalysis.find(item => item.char === char);
                      if (!analysis) return null;
                      
                      if (analysis.isChinese) {
                        return (
                          <span key={charIndex} className="mr-1">
                            {analysis.pinyin}
                          </span>
                        );
                      } else {
                        return (
                          <span key={charIndex} className="mr-1 opacity-50">
                            {char}
                          </span>
                        );
                      }
                    })}
                  </div>
                )}
                
                {/* Chinese text line */}
                <div style={{ fontSize: `${fontSize}px` }} className="text-gray-900 leading-relaxed font-medium">
                  {line}
                </div>
                
                {/* Translation line */}
                {showTranslation && translation && (
                  <div style={{ fontSize: `${fontSize - 2}px` }} className="text-green-600 leading-relaxed italic">
                    {translation.split('\n')[lineIndex] || ''}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: `${fontSize}px` }} className="text-gray-900 leading-relaxed">
                {line}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderInlineMode = () => (
    <div className="space-y-3">
      {textLines.map((line, lineIndex) => (
        <div key={lineIndex} className="space-y-2">
          {renderLineWithAudio(line, lineIndex)}
          <div className="flex flex-wrap items-baseline gap-1 ml-16">
            {Array.from(line).map((char, charIndex) => {
              const analysis = characterAnalysis.find(item => item.char === char);
              if (!analysis) return null;
              
              if (analysis.isChinese && showPinyin) {
                return (
                  <span key={charIndex} className="inline-flex flex-col items-center mx-0.5">
                    <span className="text-xs text-blue-600 leading-none mb-1">
                      {analysis.pinyin}
                    </span>
                    <span style={{ fontSize: `${fontSize}px` }} className="text-gray-900 leading-none">
                      {char}
                    </span>
                  </span>
                );
              } else {
                return (
                  <span key={charIndex} style={{ fontSize: `${fontSize}px` }} className="text-gray-900">
                    {char}
                  </span>
                );
              }
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const renderInlineTranslationMode = () => (
    <div className="space-y-6">
      {textLines.map((line, lineIndex) => renderLineWithAudio(line, lineIndex))}
    </div>
  );

  const renderAboveMode = () => (
    <div className="space-y-8">
      {showPinyin && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h4 className="text-blue-700 font-bold mb-4 text-lg">Pinyin</h4>
          <div style={{ fontSize: `${fontSize - 2}px` }} className="text-blue-600 leading-relaxed">
            {pinyinText}
          </div>
        </div>
      )}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-gray-900 font-bold text-lg">Chinese Text</h4>
          <Button
            onClick={speakAllLines}
            disabled={isGeneratingSpeech || (selectedVoice.premium && !hasPremiumAccess)}
            variant={autoPlay ? "destructive" : "secondary"}
            className="gap-2"
          >
            {autoPlay ? (
              <>
                <Pause size={16} />
                Stop All
              </>
            ) : isGeneratingSpeech ? (
              <>
                <Loader size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play size={16} />
                Play All
              </>
            )}
          </Button>
        </div>
        <div className="space-y-4">
          {textLines.map((line, lineIndex) => renderLineWithAudio(line, lineIndex))}
        </div>
      </div>
      {showTranslation && translation && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
          <h4 className="text-green-700 font-bold mb-4 text-lg">Translation</h4>
          <div style={{ fontSize: `${fontSize - 2}px` }} className="text-green-600 leading-relaxed whitespace-pre-wrap">
            {translation}
          </div>
        </div>
      )}
    </div>
  );

  const renderBelowMode = () => (
    <div className="space-y-8">
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-gray-900 font-bold text-lg">Chinese Text</h4>
          <Button
            onClick={speakAllLines}
            disabled={isGeneratingSpeech || (selectedVoice.premium && !hasPremiumAccess)}
            variant={autoPlay ? "destructive" : "secondary"}
            className="gap-2"
          >
            {autoPlay ? (
              <>
                <Pause size={16} />
                Stop All
              </>
            ) : isGeneratingSpeech ? (
              <>
                <Loader size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play size={16} />
                Play All
              </>
            )}
          </Button>
        </div>
        <div className="space-y-4">
          {textLines.map((line, lineIndex) => renderLineWithAudio(line, lineIndex))}
        </div>
      </div>
      {showPinyin && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h4 className="text-blue-700 font-bold mb-4 text-lg">Pinyin</h4>
          <div style={{ fontSize: `${fontSize - 2}px` }} className="text-blue-600 leading-relaxed">
            {pinyinText}
          </div>
        </div>
      )}
      {showTranslation && translation && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
          <h4 className="text-green-700 font-bold mb-4 text-lg">Translation</h4>
          <div style={{ fontSize: `${fontSize - 2}px` }} className="text-green-600 leading-relaxed whitespace-pre-wrap">
            {translation}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <Button
            onClick={onBack}
            variant="outline"
            size="lg"
            className="gap-3"
          >
            <ArrowLeft size={20} />
            Back
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900">Chinese Text Analysis</h1>
          
          <div className="flex space-x-3">
            <Button
              onClick={() => translateText(false)}
              disabled={isTranslating}
              variant="secondary"
              size="lg"
              className="gap-3"
            >
              {isTranslating ? (
                <Loader size={20} className="animate-spin" />
              ) : (
                <Languages size={20} />
              )}
              {isTranslating ? 'Translating...' : 'Translate'}
            </Button>
            
            <Button
              onClick={() => speakText(customSentences.length > 0 ? customSentences.join(' ') : text)}
              disabled={isGeneratingSpeech || (selectedVoice.premium && !hasPremiumAccess)}
              size="lg"
              className="gap-3"
            >
              {isGeneratingSpeech ? (
                <Loader size={20} className="animate-spin" />
              ) : (
                <Volume2 size={20} />
              )}
              Speak All
            </Button>
          </div>
        </div>

        {/* Premium Voice Status */}
        {!hasPremiumAccess && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-3xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center">
                  <Crown size={24} className="text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-yellow-800">Upgrade to Premium Voices</h3>
                  <p className="text-yellow-700">Get natural-sounding Chinese pronunciation with ElevenLabs AI</p>
                </div>
              </div>
              <Button
                onClick={() => setShowVoiceSetup(true)}
                className="gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              >
                <Zap size={16} />
                Setup Now
              </Button>
            </div>
          </div>
        )}

        {/* Sentence Editor */}
        {renderSentenceEditor()}

        {/* Controls */}
        <div className="bg-white border border-gray-200 rounded-3xl p-8 mb-12 shadow-sm">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Pinyin Toggle */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-900">Pinyin Display</label>
              <Button
                onClick={() => setShowPinyin(!showPinyin)}
                variant={showPinyin ? "default" : "outline"}
                className="w-full gap-2"
              >
                {showPinyin ? <Eye size={16} /> : <EyeOff size={16} />}
                {showPinyin ? 'Hide' : 'Show'} Pinyin
              </Button>
            </div>

            {/* Translation Toggle */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-900">Translation Display</label>
              <Button
                onClick={() => setShowTranslation(!showTranslation)}
                disabled={!translation}
                variant={showTranslation ? "default" : "outline"}
                className="w-full gap-2"
              >
                {showTranslation ? <Eye size={16} /> : <EyeOff size={16} />}
                {showTranslation ? 'Hide' : 'Show'} Translation
              </Button>
            </div>

            {/* Pinyin Style */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-900">Pinyin Style</label>
              <select
                value={pinyinStyle}
                onChange={(e) => setPinyinStyle(e.target.value as PinyinStyle)}
                className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="tone">Tone Marks (mā)</option>
                <option value="num">Numbers (ma1)</option>
                <option value="none">No Tones (ma)</option>
              </select>
            </div>

            {/* Display Mode */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-900">Layout</label>
              <select
                value={displayMode}
                onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
                className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="inline">Inline (pinyin above)</option>
                <option value="inline-translation">Inline (all together)</option>
                <option value="above">Separate (pinyin first)</option>
                <option value="below">Separate (text first)</option>
              </select>
            </div>
          </div>

          {/* Voice Controls */}
          {renderVoiceControls()}

          {/* Other Controls */}
          <div className="border-t border-gray-200 pt-8 mt-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Translation Language */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-900">Translate to</label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="en">🇺🇸 English</option>
                  <option value="es">🇪🇸 Spanish</option>
                  <option value="fr">🇫🇷 French</option>
                  <option value="de">🇩🇪 German</option>
                  <option value="ja">🇯🇵 Japanese</option>
                  <option value="ko">🇰🇷 Korean</option>
                  <option value="ru">🇷🇺 Russian</option>
                  <option value="pt">🇵🇹 Portuguese</option>
                  <option value="it">🇮🇹 Italian</option>
                </select>
              </div>

              {/* Font Size */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-900">Font Size</label>
                <div className="flex items-center space-x-3">
                  <Type size={16} className="text-gray-500" />
                  <input
                    type="range"
                    min="12"
                    max="24"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-gray-600 text-sm w-10">{fontSize}px</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Translation Error */}
        {translationError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle size={20} className="text-red-600" />
                <p className="text-red-700 font-medium">{translationError}</p>
              </div>
              {!isTranslating && !translationError.includes('Retrying') && (
                <Button
                  onClick={retryTranslation}
                  variant="outline"
                  size="sm"
                  className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <RefreshCw size={16} />
                  Retry
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Text Display */}
        <div className="bg-white border border-gray-200 rounded-3xl p-8 mb-12 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-900">
              {displayMode === 'inline-translation' ? 'Complete Analysis' : 'Text with Audio'}
            </h3>
            <div className="flex space-x-3">
              <Button
                onClick={() => copyToClipboard(customSentences.length > 0 ? customSentences.join('\n') : text, 'text')}
                variant="outline"
                className="gap-2"
              >
                <Copy size={16} />
                {copied === 'text' ? 'Copied!' : 'Copy Text'}
              </Button>
              <Button
                onClick={() => copyToClipboard(pinyinText, 'pinyin')}
                variant="outline"
                className="gap-2"
              >
                <Copy size={16} />
                {copied === 'pinyin' ? 'Copied!' : 'Copy Pinyin'}
              </Button>
              {translation && (
                <Button
                  onClick={() => copyToClipboard(translation, 'translation')}
                  variant="outline"
                  className="gap-2"
                >
                  <Copy size={16} />
                  {copied === 'translation' ? 'Copied!' : 'Copy Translation'}
                </Button>
              )}
              <Button
                onClick={downloadAll}
                variant="outline"
                className="gap-2"
              >
                <Download size={16} />
                Download All
              </Button>
            </div>
          </div>

          <div className="min-h-[200px]">
            {displayMode === 'inline' && renderInlineMode()}
            {displayMode === 'inline-translation' && renderInlineTranslationMode()}
            {displayMode === 'above' && renderAboveMode()}
            {displayMode === 'below' && renderBelowMode()}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {(customSentences.length > 0 ? customSentences.join('') : text).length}
            </div>
            <div className="text-gray-600 font-medium">Total Characters</div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {Array.from(customSentences.length > 0 ? customSentences.join('') : text).filter(char => /[\u4e00-\u9fff]/.test(char)).length}
            </div>
            <div className="text-gray-600 font-medium">Chinese Characters</div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {textLines.length}
            </div>
            <div className="text-gray-600 font-medium">Audio Segments</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {translation ? translation.split(/\s+/).filter(word => word.length > 0).length : '—'}
            </div>
            <div className="text-gray-600 font-medium">Translated Words</div>
          </div>
        </div>
      </div>

      {/* Voice Setup Modal */}
      {showVoiceSetup && (
        <VoiceSetup
          onClose={() => setShowVoiceSetup(false)}
          onApiKeySet={handleVoiceSetupComplete}
        />
      )}
    </div>
  );
};