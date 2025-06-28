import React, { useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { InputSelector } from './components/InputSelector';
import { OCRProcessor } from './components/OCRProcessor';
import { AudioProcessor } from './components/AudioProcessor';
import { ChineseAnalysis } from './components/ChineseAnalysis';

type AppView = 'input' | 'ocr' | 'audio' | 'chinese-analysis';
type InputType = 'image' | 'text' | 'audio';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('input');
  const [chineseText, setChineseText] = useState('');
  const [inputType, setInputType] = useState<InputType>('image');

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setInputType('image');
    setCurrentView('ocr');
  };

  const handleTextInput = (text: string) => {
    setChineseText(text);
    setInputType('text');
    setCurrentView('chinese-analysis');
  };

  const handleAudioInput = (blob: Blob) => {
    setAudioBlob(blob);
    setInputType('audio');
    setCurrentView('audio');
  };

  const handleClearAll = () => {
    setSelectedFile(null);
    setAudioBlob(null);
    setChineseText('');
    setCurrentView('input');
  };

  const handleChineseAnalysis = (text: string) => {
    setChineseText(text);
    setCurrentView('chinese-analysis');
  };

  const handleBackToInput = () => {
    setCurrentView('input');
  };

  const handleBackToOCR = () => {
    setCurrentView('ocr');
  };

  const handleAudioTextExtracted = (text: string) => {
    setChineseText(text);
    setCurrentView('chinese-analysis');
  };

  if (currentView === 'chinese-analysis') {
    return (
      <ChineseAnalysis 
        text={chineseText} 
        onBack={inputType === 'text' ? handleBackToInput : handleBackToOCR} 
      />
    );
  }

  if (currentView === 'audio') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-6 py-12 max-w-6xl">
          <AudioProcessor
            audioBlob={audioBlob!}
            onTextExtracted={handleAudioTextExtracted}
            onBack={handleBackToInput}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'ocr') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-6 py-12 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="relative">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center border border-gray-100">
                  <FileText size={28} className="text-gray-800" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                  <Sparkles size={12} className="text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              Text Extraction
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              AI-powered text recognition with automatic language detection
            </p>
          </div>

          {/* OCR Processor */}
          <OCRProcessor 
            file={selectedFile} 
            onChineseAnalysis={handleChineseAnalysis}
            onBack={handleBackToInput}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <div className="relative">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-lg flex items-center justify-center border border-gray-100">
                <FileText size={36} className="text-gray-800" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                <Sparkles size={16} className="text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
            Chinese Text Analyzer
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            Extract and analyze Chinese text from images, direct input, or audio recordings with AI-powered tools
          </p>
        </div>

        {/* Input Selector */}
        <InputSelector
          onFileSelect={handleFileSelect}
          onTextInput={handleTextInput}
          onAudioInput={handleAudioInput}
        />
      </div>
    </div>
  );
}

export default App;