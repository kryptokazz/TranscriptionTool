// Language detection utilities
export interface DetectedLanguage {
  code: string;
  name: string;
  confidence: number;
  flag: string;
}

export const LANGUAGE_PATTERNS = {
  // Chinese characters (CJK Unified Ideographs)
  chinese: /[\u4e00-\u9fff]/,
  // Japanese (Hiragana, Katakana, and Kanji)
  japanese: /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/,
  // Korean (Hangul)
  korean: /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/,
  // Cyrillic (Russian, etc.)
  cyrillic: /[\u0400-\u04ff]/,
  // Latin characters
  latin: /[a-zA-Z]/,
  // Arabic
  arabic: /[\u0600-\u06ff]/,
  // Thai
  thai: /[\u0e00-\u0e7f]/,
  // Vietnamese (with diacritics)
  vietnamese: /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i
};

export const SUPPORTED_LANGUAGES = [
  { code: 'chi_sim', name: 'Chinese (Simplified)', flag: '🇨🇳', patterns: [LANGUAGE_PATTERNS.chinese] },
  { code: 'chi_tra', name: 'Chinese (Traditional)', flag: '🇹🇼', patterns: [LANGUAGE_PATTERNS.chinese] },
  { code: 'eng', name: 'English', flag: '🇺🇸', patterns: [LANGUAGE_PATTERNS.latin] },
  { code: 'jpn', name: 'Japanese', flag: '🇯🇵', patterns: [LANGUAGE_PATTERNS.japanese] },
  { code: 'kor', name: 'Korean', flag: '🇰🇷', patterns: [LANGUAGE_PATTERNS.korean] },
  { code: 'rus', name: 'Russian', flag: '🇷🇺', patterns: [LANGUAGE_PATTERNS.cyrillic] },
  { code: 'ara', name: 'Arabic', flag: '🇸🇦', patterns: [LANGUAGE_PATTERNS.arabic] },
  { code: 'tha', name: 'Thai', flag: '🇹🇭', patterns: [LANGUAGE_PATTERNS.thai] },
  { code: 'vie', name: 'Vietnamese', flag: '🇻🇳', patterns: [LANGUAGE_PATTERNS.vietnamese] }
];

export function detectLanguageFromText(text: string): DetectedLanguage[] {
  const results: DetectedLanguage[] = [];
  const totalChars = text.length;
  
  if (totalChars === 0) {
    return [{ code: 'chi_sim', name: 'Chinese (Simplified)', confidence: 1.0, flag: '🇨🇳' }];
  }

  SUPPORTED_LANGUAGES.forEach(lang => {
    let matches = 0;
    
    lang.patterns.forEach(pattern => {
      const patternMatches = text.match(new RegExp(pattern.source, 'g'));
      if (patternMatches) {
        matches += patternMatches.length;
      }
    });
    
    const confidence = matches / totalChars;
    
    if (confidence > 0.05) { // Lower threshold to catch more languages
      results.push({
        code: lang.code,
        name: lang.name,
        confidence,
        flag: lang.flag
      });
    }
  });

  // Sort by confidence (highest first)
  results.sort((a, b) => b.confidence - a.confidence);
  
  // Always include Chinese as default if no specific language detected
  if (results.length === 0 || results[0].confidence < 0.3) {
    // Add Chinese as the primary option
    const chineseDefault = { code: 'chi_sim', name: 'Chinese (Simplified)', confidence: 0.8, flag: '🇨🇳' };
    const englishFallback = { code: 'eng', name: 'English', confidence: 0.6, flag: '🇺🇸' };
    
    if (results.length === 0) {
      return [chineseDefault, englishFallback];
    } else {
      // Insert Chinese at the top if it's not already there
      const hasChineseVariant = results.some(r => r.code.startsWith('chi_'));
      if (!hasChineseVariant) {
        results.unshift(chineseDefault);
      }
    }
  }
  
  return results.slice(0, 6); // Limit to top 6 results
}

export function detectLanguageFromImage(imageData: ImageData): Promise<DetectedLanguage[]> {
  return new Promise((resolve) => {
    // For now, we'll use a simple heuristic based on image characteristics
    // In a real implementation, you might use a more sophisticated ML model
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve([{ code: 'chi_sim', name: 'Chinese (Simplified)', confidence: 1.0, flag: '🇨🇳' }]);
      return;
    }
    
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
    
    // Analyze image characteristics (this is a simplified approach)
    const data = imageData.data;
    let complexity = 0;
    
    // Calculate image complexity (more complex scripts tend to have more varied pixel patterns)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      
      if (brightness < 128) { // Dark pixels (likely text)
        complexity++;
      }
    }
    
    const complexityRatio = complexity / (imageData.width * imageData.height);
    
    // Default to Chinese first, then other languages
    resolve([
      { code: 'chi_sim', name: 'Chinese (Simplified)', confidence: 0.8, flag: '🇨🇳' },
      { code: 'chi_tra', name: 'Chinese (Traditional)', confidence: 0.7, flag: '🇹🇼' },
      { code: 'eng', name: 'English', confidence: 0.6, flag: '🇺🇸' },
      { code: 'jpn', name: 'Japanese', confidence: 0.5, flag: '🇯🇵' },
      { code: 'kor', name: 'Korean', confidence: 0.4, flag: '🇰🇷' }
    ]);
  });
}

export function getSpeechLanguageCode(ocrLanguageCode: string): string {
  const mapping: Record<string, string> = {
    'chi_sim': 'zh-CN',
    'chi_tra': 'zh-TW',
    'eng': 'en-US',
    'jpn': 'ja-JP',
    'kor': 'ko-KR',
    'rus': 'ru-RU',
    'ara': 'ar-SA',
    'tha': 'th-TH',
    'vie': 'vi-VN'
  };
  
  return mapping[ocrLanguageCode] || 'zh-CN';
}