import React, { useState } from 'react';
import { Mic, Loader, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

interface AudioProcessorProps {
  audioBlob: Blob;
  onTextExtracted: (text: string) => void;
  onBack: () => void;
}

export const AudioProcessor: React.FC<AudioProcessorProps> = ({
  audioBlob,
  onTextExtracted,
  onBack,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState<string>('');

  React.useEffect(() => {
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioBlob]);

  const processAudio = async () => {
    setIsProcessing(true);
    setError('');
    setExtractedText('');

    try {
      // Check if browser supports speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        throw new Error('Speech recognition not supported in this browser');
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN'; // Chinese language
      recognition.continuous = true;
      recognition.interimResults = false;

      // Create audio element and play the recorded audio
      const audio = new Audio(audioUrl);
      
      recognition.onstart = () => {
        console.log('Speech recognition started');
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setExtractedText(finalTranscript);
          onTextExtracted(finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition failed: ${event.error}`);
      };

      recognition.onend = () => {
        setIsProcessing(false);
      };

      // Start recognition and play audio
      recognition.start();
      await audio.play();

    } catch (err) {
      console.error('Audio processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process audio');
      setIsProcessing(false);
    }
  };

  React.useEffect(() => {
    // Auto-start processing when component mounts
    processAudio();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          onClick={onBack}
          variant="outline"
          size="lg"
          className="gap-3"
        >
          <ArrowLeft size={20} />
          Back to Input
        </Button>
        
        <h2 className="text-2xl font-bold text-gray-900">Audio Processing</h2>
        
        <div className="w-32"></div> {/* Spacer for centering */}
      </div>

      {/* Audio Player */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recorded Audio</h3>
        <audio controls src={audioUrl} className="w-full" />
      </div>

      {/* Processing Status */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200">
        <div className="text-center">
          {isProcessing ? (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-purple-50 rounded-3xl flex items-center justify-center mx-auto">
                <Loader size={36} className="text-purple-600 animate-spin" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Audio</h3>
                <p className="text-gray-600">Converting speech to text...</p>
              </div>
            </div>
          ) : error ? (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto">
                <AlertCircle size={36} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-700 mb-2">Processing Failed</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <Button
                  onClick={processAudio}
                  variant="outline"
                  className="gap-2"
                >
                  <Mic size={16} />
                  Try Again
                </Button>
              </div>
            </div>
          ) : extractedText ? (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto">
                <CheckCircle size={36} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-700 mb-2">Text Extracted Successfully</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mt-4">
                  <p className="text-gray-900 text-lg leading-relaxed">{extractedText}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto">
                <Mic size={36} className="text-gray-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Process</h3>
                <p className="text-gray-600 mb-4">Click to start speech recognition</p>
                <Button
                  onClick={processAudio}
                  size="lg"
                  className="gap-2"
                >
                  <Mic size={20} />
                  Process Audio
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Browser Compatibility Note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle size={20} className="text-yellow-600 mt-0.5" />
          <div>
            <p className="text-yellow-800 font-medium">Browser Compatibility</p>
            <p className="text-yellow-700 text-sm">
              Speech recognition works best in Chrome and Edge browsers. 
              For best results with Chinese audio, speak clearly and at a moderate pace.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};