import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, CheckCircle, AlertCircle, X, Loader, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { voiceService } from '../services/voiceService';

interface VoiceSetupProps {
  onClose: () => void;
  onApiKeySet: () => void;
}

export const VoiceSetup: React.FC<VoiceSetupProps> = ({ onClose, onApiKeySet }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    // Check if there's already an API key
    const existingKey = voiceService.getApiKey();
    if (existingKey) {
      setHasExistingKey(true);
      setApiKey(''); // Don't show the actual key for security
    }
  }, []);

  const validateApiKey = async () => {
    const keyToValidate = apiKey.trim();
    
    if (!keyToValidate) {
      setError('Please enter an API key');
      return;
    }

    if (!keyToValidate.startsWith('sk_')) {
      setError('ElevenLabs API keys should start with "sk_"');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      console.log('Testing API key...');
      const isValid = await voiceService.testApiKey(keyToValidate);
      
      if (isValid) {
        console.log('API key is valid, saving...');
        const saved = voiceService.setApiKey(keyToValidate);
        
        if (saved) {
          setSuccess(true);
          setHasExistingKey(true);
          setTimeout(() => {
            onApiKeySet();
            onClose();
          }, 1500);
        } else {
          setError('Failed to save API key. Please try again.');
        }
      } else {
        setError('Invalid API key. Please check and try again.');
      }
    } catch (err: any) {
      console.error('API key validation error:', err);
      setError('Failed to validate API key. Please check your internet connection and try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const clearApiKey = () => {
    voiceService.clearApiKey();
    setHasExistingKey(false);
    setApiKey('');
    setError('');
    setSuccess(false);
  };

  const skipSetup = () => {
    onClose();
  };

  const testExistingKey = async () => {
    const existingKey = voiceService.getApiKey();
    if (!existingKey) {
      setError('No API key found');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const isValid = await voiceService.testApiKey(existingKey);
      if (isValid) {
        setSuccess(true);
        setTimeout(() => {
          onApiKeySet();
          onClose();
        }, 1500);
      } else {
        setError('Existing API key is invalid. Please enter a new one.');
        setHasExistingKey(false);
      }
    } catch (err) {
      setError('Failed to test existing API key.');
      setHasExistingKey(false);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">🎙️ Premium Voice Setup</h2>
          <Button
            onClick={onClose}
            variant="outline"
            size="icon"
            className="h-10 w-10"
          >
            <X size={16} />
          </Button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-green-700 mb-2">Setup Complete!</h3>
            <p className="text-green-600">Premium voices are now available.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Existing API Key Section */}
            {hasExistingKey && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle size={20} className="text-green-600" />
                    <h3 className="text-lg font-bold text-green-800">API Key Found</h3>
                  </div>
                  <Button
                    onClick={clearApiKey}
                    variant="outline"
                    size="sm"
                    className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    Remove
                  </Button>
                </div>
                <p className="text-green-700 mb-4">
                  An ElevenLabs API key is already configured. You can test it or replace it with a new one.
                </p>
                <div className="flex space-x-3">
                  <Button
                    onClick={testExistingKey}
                    disabled={isValidating}
                    className="gap-2"
                  >
                    {isValidating ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        Test & Use
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setHasExistingKey(false)}
                    variant="outline"
                    className="gap-2"
                  >
                    Replace Key
                  </Button>
                </div>
              </div>
            )}

            {/* Setup Instructions */}
            {!hasExistingKey && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-blue-900 mb-3">🚀 Get High-Quality Chinese Voices</h3>
                  <p className="text-blue-700 mb-4">
                    Unlock natural-sounding Mandarin voices with ElevenLabs AI. 
                    Much better than browser voices!
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-2">✨ Premium Features:</h4>
                      <ul className="text-blue-600 space-y-1">
                        <li>• Natural pronunciation</li>
                        <li>• Multiple Chinese voices</li>
                        <li>• Adjustable speech settings</li>
                        <li>• High-quality audio</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-2">💰 Pricing:</h4>
                      <ul className="text-blue-600 space-y-1">
                        <li>• Free tier: 10,000 characters/month</li>
                        <li>• Starter: $5/month</li>
                        <li>• Creator: $22/month</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">🔑 Setup Instructions</h3>
                  
                  <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                    <div className="flex items-start space-x-3">
                      <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                      <div>
                        <p className="font-semibold text-gray-900">Create ElevenLabs Account</p>
                        <p className="text-gray-600 text-sm">Sign up for a free account to get started</p>
                        <Button
                          onClick={() => window.open('https://elevenlabs.io/sign-up', '_blank')}
                          variant="outline"
                          size="sm"
                          className="mt-2 gap-2"
                        >
                          <ExternalLink size={14} />
                          Sign Up Free
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                      <div>
                        <p className="font-semibold text-gray-900">Get Your API Key</p>
                        <p className="text-gray-600 text-sm">Go to Profile → API Keys → Create new key</p>
                        <Button
                          onClick={() => window.open('https://elevenlabs.io/app/settings/api-keys', '_blank')}
                          variant="outline"
                          size="sm"
                          className="mt-2 gap-2"
                        >
                          <ExternalLink size={14} />
                          Get API Key
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 mb-2">Enter Your API Key</p>
                        <div className="space-y-3">
                          <div className="relative">
                            <Key size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                              type="password"
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              placeholder="sk_..."
                              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              onKeyPress={(e) => e.key === 'Enter' && validateApiKey()}
                            />
                          </div>
                          
                          {error && (
                            <div className="flex items-center space-x-2 text-red-600">
                              <AlertCircle size={16} />
                              <span className="text-sm">{error}</span>
                            </div>
                          )}
                          
                          <div className="flex space-x-3">
                            <Button
                              onClick={validateApiKey}
                              disabled={isValidating || !apiKey.trim()}
                              className="flex-1 gap-2"
                            >
                              {isValidating ? (
                                <>
                                  <Loader size={16} className="animate-spin" />
                                  Validating...
                                </>
                              ) : (
                                <>
                                  <CheckCircle size={16} />
                                  Validate & Save
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={skipSetup}
                              variant="outline"
                              className="gap-2"
                            >
                              Skip for Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle size={20} className="text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-yellow-800 font-medium">Privacy & Security</p>
                  <p className="text-yellow-700 text-sm">
                    Your API key is stored locally in your browser and never sent to our servers. 
                    You can remove it anytime from the voice settings.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle size={20} className="text-green-600 mt-0.5" />
                <div>
                  <p className="text-green-800 font-medium">Free Tier Available</p>
                  <p className="text-green-700 text-sm">
                    ElevenLabs offers 10,000 characters per month for free. Perfect for testing and light usage.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};