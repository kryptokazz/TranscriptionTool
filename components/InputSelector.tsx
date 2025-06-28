import React, { useState, useRef } from 'react';
import { Upload, FileText, Mic, Image as ImageIcon, Type, MicOff, Square } from 'lucide-react';
import { Button } from './ui/button';

interface InputSelectorProps {
  onFileSelect: (file: File) => void;
  onTextInput: (text: string) => void;
  onAudioInput: (audioBlob: Blob) => void;
}

type InputMode = 'image' | 'text' | 'audio';

export const InputSelector: React.FC<InputSelectorProps> = ({
  onFileSelect,
  onTextInput,
  onAudioInput,
}) => {
  const [selectedMode, setSelectedMode] = useState<InputMode>('image');
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file);
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onTextInput(textInput.trim());
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        onAudioInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderImageInput = () => (
    <div className="space-y-6">
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-3xl p-16 text-center cursor-pointer hover:border-gray-400 hover:shadow-md transition-all duration-300 bg-white"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="space-y-6">
          <div className="mx-auto w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center">
            <Upload size={36} className="text-gray-500" />
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Upload Image for OCR
            </h3>
            <p className="text-gray-600 mb-6 text-lg">
              Extract text from images with AI-powered recognition
            </p>
            <p className="text-gray-500">
              Supports PNG, JPG, JPEG, GIF, BMP
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTextInput = () => (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200">
      <div className="space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
            <Type size={24} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Direct Text Input</h3>
            <p className="text-gray-600">Enter Chinese text for pinyin analysis</p>
          </div>
        </div>
        
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="输入中文文本进行拼音分析..."
          className="w-full h-40 p-6 border-2 border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
        />
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {textInput.length} characters
          </span>
          <Button
            onClick={handleTextSubmit}
            disabled={!textInput.trim()}
            size="lg"
            className="gap-2"
          >
            <FileText size={20} />
            Analyze Text
          </Button>
        </div>
      </div>
    </div>
  );

  const renderAudioInput = () => (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200">
      <div className="space-y-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
            <Mic size={24} className="text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Audio Recording</h3>
            <p className="text-gray-600">Record audio for speech-to-text conversion</p>
          </div>
        </div>
        
        <div className="text-center py-12">
          {isRecording ? (
            <div className="space-y-6">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <div className="w-8 h-8 bg-red-500 rounded-full"></div>
              </div>
              <div>
                <p className="text-red-600 font-semibold text-lg mb-2">Recording...</p>
                <p className="text-gray-600 text-2xl font-mono">{formatTime(recordingTime)}</p>
              </div>
              <Button
                onClick={stopRecording}
                variant="destructive"
                size="lg"
                className="gap-2"
              >
                <Square size={20} />
                Stop Recording
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <Mic size={36} className="text-purple-600" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-lg mb-2">Ready to Record</p>
                <p className="text-gray-600">Click to start recording audio</p>
              </div>
              <Button
                onClick={startRecording}
                size="lg"
                className="gap-2 bg-purple-500 hover:bg-purple-600"
              >
                <Mic size={20} />
                Start Recording
              </Button>
            </div>
          )}
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <p className="text-yellow-800 text-sm">
            <strong>Note:</strong> Audio will be converted to text using speech recognition, 
            then analyzed for Chinese characters and pinyin.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Mode Selector */}
      <div className="flex justify-center">
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-200 inline-flex">
          <button
            onClick={() => setSelectedMode('image')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all ${
              selectedMode === 'image'
                ? 'bg-green-500 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <ImageIcon size={20} />
            <span className="font-medium">Image OCR</span>
          </button>
          <button
            onClick={() => setSelectedMode('text')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all ${
              selectedMode === 'text'
                ? 'bg-green-500 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Type size={20} />
            <span className="font-medium">Text Input</span>
          </button>
          <button
            onClick={() => setSelectedMode('audio')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all ${
              selectedMode === 'audio'
                ? 'bg-green-500 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Mic size={20} />
            <span className="font-medium">Audio Input</span>
          </button>
        </div>
      </div>

      {/* Input Content */}
      {selectedMode === 'image' && renderImageInput()}
      {selectedMode === 'text' && renderTextInput()}
      {selectedMode === 'audio' && renderAudioInput()}
    </div>
  );
};