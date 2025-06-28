import React, { useState, useEffect } from 'react';
import * as Jimp from 'jimp'
import { Scan, Loader, Copy, Download, CheckCircle, AlertCircle, Languages, ArrowLeft, Eye, Zap, RefreshCw, Settings, Image as ImageIcon, Target, Grid, Layers } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { Button } from './ui/button';
import { ImagePreview } from './ImagePreview';
import { detectLanguageFromText, getSpeechLanguageCode, SUPPORTED_LANGUAGES, DetectedLanguage } from '../utils/languageDetection';
import { smartTextDetector, SmartOCROptions, TextRegion } from '../utils/textDetection';

async function preprocessImage(imageFile) {
  const image = await Jimp.read(Buffer.from(await imageFile.arrayBuffer()));
  await image.grayscale();
  return image;
}

interface OCRProcessorProps {
  file: File | null;
  onChineseAnalysis?: (text: string) => void;
  onBack?: () => void;
}

export const OCRProcessor: React.FC<OCRProcessorProps> = ({ file, onChineseAnalysis, onBack }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('chi_sim');
  const [currentStatus, setCurrentStatus] = useState('');
  const [detectedLanguages, setDetectedLanguages] = useState<DetectedLanguage[]>([]);
  const [showImagePreview, setShowImagePreview] = useState(true);
  const [hasAutoDetected, setHasAutoDetected] = useState(false);
  
  // Smart OCR states
  const [useSmartOCR, setUseSmartOCR] = useState(true);
  const [smartOCROptions, setSmartOCROptions] = useState<SmartOCROptions>({
    useTextDetection: true,
    multipleRegions: true,
    enhanceTextRegions: true,
    useDeepLearning: false,
    fallbackToOriginal: true
  });
  const [showSmartSettings, setShowSmartSettings] = useState(false);
  const [detectedRegions, setDetectedRegions] = useState<TextRegion[]>([]);
  const [processedImages, setProcessedImages] = useState<File[]>([]);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [currentProcessingStep, setCurrentProcessingStep] = useState('');
  const [allResults, setAllResults] = useState<Array<{text: string, confidence: number, source: string}>>([]);

  // Auto-start OCR when file is loaded
  useEffect(() => {
    if (file && !isProcessing && !extractedText) {
      setTimeout(() => {
        processOCR();
      }, 500);
    }
  }, [file]);

  // Auto-detect language from extracted text
  useEffect(() => {
    if (extractedText && !hasAutoDetected) {
      const detected = detectLanguageFromText(extractedText);
      setDetectedLanguages(detected);
      setHasAutoDetected(true);
      console.log('Detected languages:', detected);
    }
  }, [extractedText, hasAutoDetected]);

  const processOCR = async (languageCode?: string) => {
    if (!file) return;

    const langCode = languageCode || selectedLanguage;
    setIsProcessing(true);
    setProgress(0);
    setError('');
    setExtractedText('');
    setCurrentStatus('Starting OCR process...');
    setHasAutoDetected(false);
    setAllResults([]);

    try {
      let finalText = '';
      let bestResult = { text: '', confidence: 0, source: 'original' };

      if (useSmartOCR) {
        // Step 1: Smart text detection and region extraction
        setCurrentStatus('🔍 Analyzing image for text regions...');
        setIsAnalyzingImage(true);
        
        const { regions, processedImages: images } = await smartTextDetector.detectAndExtractText(file, smartOCROptions);
        setDetectedRegions(regions);
        setProcessedImages(images);
        setIsAnalyzingImage(false);
        
        setCurrentStatus(`📍 Found ${regions.length} potential text regions`);
        setProgress(20);

        // Step 2: Process each enhanced image
        const results: Array<{text: string, confidence: number, source: string}> = [];
        
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          const isRegion = i < regions.length;
          const source = isRegion ? `Region ${i + 1}` : 'Enhanced Global';
          
          setCurrentProcessingStep(`Processing ${source}...`);
          setCurrentStatus(`🔤 Extracting text from ${source.toLowerCase()}...`);
          setProgress(20 + (i / images.length) * 60);

          try {
            const worker = await createWorker(langCode, 1, {
              logger: m => {
                if (m.status === 'recognizing text') {
                  setProgress(20 + (i / images.length) * 60 + (m.progress * 60 / images.length));
                }
              }
            });

            const { data: { text, confidence } } = await worker.recognize(image);
            await worker.terminate();

            if (text.trim()) {
              results.push({
                text: text.trim(),
                confidence: confidence || 0,
                source
              });
            }
          } catch (err) {
            console.error(`Error processing ${source}:`, err);
          }
        }

        setAllResults(results);

        // Step 3: Select best result
        if (results.length > 0) {
          // Prioritize results with Chinese characters and higher confidence
          bestResult = results.reduce((best, current) => {
            const currentHasChinese = /[\u4e00-\u9fff]/.test(current.text);
            const bestHasChinese = /[\u4e00-\u9fff]/.test(best.text);
            
            // Prefer results with Chinese characters
            if (currentHasChinese && !bestHasChinese) return current;
            if (!currentHasChinese && bestHasChinese) return best;
            
            // If both have or don't have Chinese, prefer higher confidence
            return current.confidence > best.confidence ? current : best;
          });

          finalText = bestResult.text;
          setCurrentStatus(`✅ Best result from ${bestResult.source}`);
        } else {
          throw new Error('No text detected in any processed image');
        }
      } else {
        // Standard OCR processing
        setCurrentStatus('Processing with standard OCR...');
        const worker = await createWorker(langCode, 1, {
          logger: m => {
            console.log(m);
            
            if (m.status === 'loading tesseract core') {
              setCurrentStatus('Loading OCR engine...');
              setProgress(Math.round(m.progress * 20));
            } else if (m.status === 'initializing tesseract') {
              setCurrentStatus('Initializing engine...');
              setProgress(20 + Math.round(m.progress * 20));
            } else if (m.status === 'loading language traineddata') {
              const languageName = SUPPORTED_LANGUAGES.find(lang => lang.code === langCode)?.name || langCode;
              setCurrentStatus(`Loading ${languageName} language model...`);
              setProgress(40 + Math.round(m.progress * 30));
            } else if (m.status === 'initializing api') {
              setCurrentStatus('Preparing for text recognition...');
              setProgress(70 + Math.round(m.progress * 10));
            } else if (m.status === 'recognizing text') {
              setCurrentStatus('Extracting text from image...');
              setProgress(80 + Math.round(m.progress * 20));
            }
          }
        });

        setCurrentStatus('Processing complete!');
        const { data: { text } } = await worker.recognize(file);
        finalText = text.trim();
        await worker.terminate();
      }

      setExtractedText(finalText);
      setProgress(100);
      setCurrentStatus('✅ Text extraction completed!');
      
    } catch (err) {
      console.error('OCR Error:', err);
      if (err instanceof Error) {
        if (err.message.includes('network')) {
          setError('Network error: Failed to download language model. Please check your internet connection and try again.');
        } else if (err.message.includes('language')) {
          setError('Language model error: Failed to load the selected language. Please try a different language.');
        } else {
          setError(`OCR processing failed: ${err.message}`);
        }
      } else {
        setError('Failed to process image. Please try again with a different image or language.');
      }
    } finally {
      setIsProcessing(false);
      setIsAnalyzingImage(false);
      setProgress(0);
      setCurrentStatus('');
      setCurrentProcessingStep('');
    }
  };

  const copyToClipboard = async () => {
    if (!extractedText) return;
    
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const downloadText = () => {
    if (!extractedText) return;
    
    const languageName = SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage)?.name || selectedLanguage;
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted-text-${languageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleChineseAnalysis = () => {
    if (extractedText && onChineseAnalysis) {
      onChineseAnalysis(extractedText);
    }
  };

  const isChineseText = (text: string) => {
    return /[\u4e00-\u9fff]/.test(text);
  };

  const retryWithDifferentLanguage = (langCode: string) => {
    setSelectedLanguage(langCode);
    setHasAutoDetected(false);
    setDetectedLanguages([]);
    processOCR(langCode);
  };

  const handleManualLanguageChange = (langCode: string) => {
    setSelectedLanguage(langCode);
    setHasAutoDetected(false);
    setDetectedLanguages([]);
  };

  const toggleSmartOCROption = (option: keyof SmartOCROptions) => {
    setSmartOCROptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const renderSmartOCRSettings = () => (
    <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Target size={20} className="text-purple-600" />
          <h3 className="text-lg font-bold text-gray-900">Smart OCR for Memes & Complex Images</h3>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={useSmartOCR}
              onChange={(e) => setUseSmartOCR(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">Enable Smart OCR</span>
          </label>
          <Button
            onClick={() => setShowSmartSettings(!showSmartSettings)}
            variant="outline"
            size="sm"
          >
            {showSmartSettings ? 'Hide' : 'Show'} Settings
          </Button>
        </div>
      </div>

      {useSmartOCR && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Zap size={16} className="text-purple-600" />
            <span className="text-purple-800 font-medium text-sm">Smart OCR Features</span>
          </div>
          <ul className="text-purple-700 text-sm space-y-1">
            <li>• Detects text regions in complex backgrounds</li>
            <li>• Enhances each text area individually</li>
            <li>• Removes anime/meme backgrounds automatically</li>
            <li>• Processes multiple regions for better accuracy</li>
            <li>• Optimized for stylized fonts and overlays</li>
          </ul>
        </div>
      )}

      {showSmartSettings && useSmartOCR && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(smartOCROptions).map(([key, value]) => (
              <label key={key} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => toggleSmartOCROption(key as keyof SmartOCROptions)}
                  className="rounded border-gray-300"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                  <p className="text-xs text-gray-600">
                    {getSmartOCRDescription(key as keyof SmartOCROptions)}
                  </p>
                </div>
              </label>
            ))}
          </div>
          
          <Button
            onClick={() => processOCR()}
            disabled={isProcessing || isAnalyzingImage}
            size="sm"
            className="gap-2"
          >
            <RefreshCw size={16} />
            Apply Settings & Re-scan
          </Button>
        </div>
      )}
    </div>
  );

  const getSmartOCRDescription = (option: keyof SmartOCROptions): string => {
    const descriptions = {
      useTextDetection: 'Automatically find text regions',
      multipleRegions: 'Process multiple text areas separately',
      enhanceTextRegions: 'Enhance each text region individually',
      useDeepLearning: 'Use AI for better text detection (experimental)',
      fallbackToOriginal: 'Also process original image as backup'
    };
    return descriptions[option] || '';
  };

  const renderDetectedRegions = () => {
    if (!useSmartOCR || detectedRegions.length === 0) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <Grid size={20} className="text-green-600" />
          <h3 className="text-lg font-bold text-gray-900">Detected Text Regions</h3>
          <span className="text-sm px-3 py-1 bg-green-50 text-green-700 rounded-xl border border-green-200">
            {detectedRegions.length} regions found
          </span>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {detectedRegions.map((region, index) => (
            <div key={index} className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">Region {index + 1}</span>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                  {Math.round(region.confidence * 100)}% confidence
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Position: {region.x}, {region.y}</div>
                <div>Size: {region.width} × {region.height}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAllResults = () => {
    if (!useSmartOCR || allResults.length === 0) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <Layers size={20} className="text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">All OCR Results</h3>
          <span className="text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
            {allResults.length} results
          </span>
        </div>
        
        <div className="space-y-4">
          {allResults.map((result, index) => (
            <div key={index} className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{result.source}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    {Math.round(result.confidence)}% confidence
                  </span>
                  {result.text === extractedText && (
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                      Selected
                    </span>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-700 bg-white rounded-xl p-3 border border-gray-200">
                {result.text || 'No text detected'}
              </div>
              {result.text && result.text !== extractedText && (
                <Button
                  onClick={() => setExtractedText(result.text)}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Use This Result
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        {onBack && (
          <Button
            onClick={onBack}
            variant="outline"
            size="lg"
            className="gap-3"
          >
            <ArrowLeft size={20} />
            Choose Different Image
          </Button>
        )}
        
        {file && (
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-gray-900 font-semibold">{file.name}</p>
              <p className="text-gray-500 text-sm">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              onClick={() => setShowImagePreview(!showImagePreview)}
              variant="outline"
              size="icon"
            >
              <Eye size={16} />
            </Button>
          </div>
        )}
      </div>

      {/* Image Preview */}
      {file && showImagePreview && (
        <ImagePreview file={file} />
      )}

      {/* Smart OCR Settings */}
      {file && renderSmartOCRSettings()}

      {/* Detected Regions */}
      {renderDetectedRegions()}

      {/* Language Detection Results */}
      {detectedLanguages.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <Zap size={20} className="text-green-600" />
            <h3 className="text-lg font-bold text-gray-900">Detected Languages</h3>
            <span className="text-sm text-gray-500">(Click to retry with different language)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {detectedLanguages.slice(0, 6).map((lang) => (
              <button
                key={lang.code}
                onClick={() => retryWithDifferentLanguage(lang.code)}
                disabled={isProcessing || isAnalyzingImage}
                className={`p-4 rounded-2xl border-2 transition-all text-left hover:scale-105 ${
                  selectedLanguage === lang.code
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">{lang.flag}</span>
                  <span className="font-semibold text-gray-900 text-sm">{lang.name}</span>
                </div>
                <div className="text-xs text-gray-600">
                  {Math.round(lang.confidence * 100)}% match
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* OCR Processing */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-gray-900">Text Extraction</h3>
          {file && !isProcessing && !isAnalyzingImage && (
            <Button
              onClick={() => processOCR()}
              size="lg"
              className="gap-3"
            >
              <RefreshCw size={20} />
              Re-scan
            </Button>
          )}
        </div>

        {/* Language Selector */}
        <div className="mb-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Languages size={20} className="text-gray-600" />
              <label className="text-base font-semibold text-gray-900">
                OCR Language
              </label>
            </div>
            
            <div className="relative">
              <select
                value={selectedLanguage}
                onChange={(e) => handleManualLanguageChange(e.target.value)}
                disabled={isProcessing || isAnalyzingImage}
                className="w-full bg-white border-2 border-gray-200 rounded-2xl px-6 py-4 text-gray-900 text-base font-medium appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 shadow-sm"
              >
                {SUPPORTED_LANGUAGES.map((language) => (
                  <option
                    key={language.code}
                    value={language.code}
                    className="bg-white text-gray-900 py-2"
                  >
                    {language.flag} {language.name}
                  </option>
                ))}
              </select>
              
              <div className="absolute inset-y-0 right-0 flex items-center pr-6 pointer-events-none">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
            
            {selectedLanguage !== 'chi_sim' && !isProcessing && !isAnalyzingImage && extractedText && (
              <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <AlertCircle size={20} className="text-blue-600" />
                <span className="text-blue-700 flex-1">Language changed. Click "Re-scan" to extract text with the new language.</span>
              </div>
            )}
          </div>
        </div>

        {!file && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Scan size={36} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg">Select an image to extract text</p>
          </div>
        )}

        {(isProcessing || isAnalyzingImage) && (
          <div className="text-center py-16">
            <div className="relative mx-auto w-20 h-20 mb-8">
              <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center">
                <Loader size={36} className="text-green-600 animate-spin" />
              </div>
            </div>
            <p className="text-gray-900 mb-4 font-semibold text-lg">{currentStatus}</p>
            {currentProcessingStep && (
              <p className="text-gray-600 mb-4">{currentProcessingStep}</p>
            )}
            {isProcessing && (
              <>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-gray-600">{progress}% complete</p>
              </>
            )}
            
            {selectedLanguage !== 'eng' && progress < 70 && isProcessing && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <div className="flex items-center justify-center space-x-3">
                  <AlertCircle size={20} className="text-blue-600" />
                  <p className="text-blue-700">
                    First-time language model download may take a moment
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-700 mb-4">{error}</p>
                {detectedLanguages.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-red-600 font-medium">Try a different language:</p>
                    <div className="flex flex-wrap gap-2">
                      {detectedLanguages.slice(1, 4).map((lang) => (
                        <Button
                          key={lang.code}
                          onClick={() => retryWithDifferentLanguage(lang.code)}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          {lang.flag} {lang.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {extractedText && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h4 className="font-bold text-gray-900 text-lg">Extracted Text</h4>
                <span className="text-sm px-3 py-1.5 bg-green-50 text-green-700 rounded-xl border border-green-200 font-medium">
                  {SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage)?.flag}
                  {SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage)?.name}
                </span>
                {useSmartOCR && (
                  <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-200">
                    Smart OCR
                  </span>
                )}
              </div>
              <div className="flex space-x-3">
                {isChineseText(extractedText) && onChineseAnalysis && (
                  <Button
                    onClick={handleChineseAnalysis}
                    variant="secondary"
                    className="gap-2"
                  >
                    <Languages size={16} />
                    Pinyin Analysis
                  </Button>
                )}
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  onClick={downloadText}
                  variant="outline"
                  className="gap-2"
                >
                  <Download size={16} />
                  Download
                </Button>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 max-h-64 overflow-y-auto">
              <pre className="text-gray-900 whitespace-pre-wrap font-mono leading-relaxed">
                {extractedText}
              </pre>
            </div>
            
            {extractedText.length > 0 && (
              <div className="text-sm text-gray-500 text-center bg-gray-50 rounded-xl p-4">
                Extracted {extractedText.length} characters • {extractedText.split(/\s+/).filter(word => word.length > 0).length} words
                {isChineseText(extractedText) && (
                  <span className="ml-2">• {Array.from(extractedText).filter(char => /[\u4e00-\u9fff]/.test(char)).length} Chinese characters</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* All Results */}
      {renderAllResults()}
    </div>
  );
};
