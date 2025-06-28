// Advanced text detection and extraction for memes and complex images
export interface TextRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  text?: string;
}

export interface SmartOCROptions {
  useTextDetection: boolean;
  multipleRegions: boolean;
  enhanceTextRegions: boolean;
  useDeepLearning: boolean;
  fallbackToOriginal: boolean;
}

export class SmartTextDetector {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  async detectAndExtractText(
    file: File, 
    options: SmartOCROptions = this.getDefaultOptions()
  ): Promise<{ regions: TextRegion[], processedImages: File[] }> {
    const img = await this.loadImage(file);
    
    // Set up canvas
    this.canvas.width = img.width;
    this.canvas.height = img.height;
    this.ctx.drawImage(img, 0, 0);
    
    const imageData = this.ctx.getImageData(0, 0, img.width, img.height);
    
    // Step 1: Detect text regions using multiple methods
    let textRegions: TextRegion[] = [];
    
    if (options.useTextDetection) {
      // Method 1: Edge-based text detection
      const edgeRegions = this.detectTextByEdges(imageData);
      textRegions.push(...edgeRegions);
      
      // Method 2: Color clustering for text
      const colorRegions = this.detectTextByColor(imageData);
      textRegions.push(...colorRegions);
      
      // Method 3: Stroke width transform (simplified)
      const strokeRegions = this.detectTextByStroke(imageData);
      textRegions.push(...strokeRegions);
      
      // Merge overlapping regions
      textRegions = this.mergeOverlappingRegions(textRegions);
    }
    
    // Step 2: Create optimized images for each region
    const processedImages: File[] = [];
    
    if (textRegions.length > 0 && options.enhanceTextRegions) {
      for (const region of textRegions) {
        const regionImage = await this.extractAndEnhanceRegion(img, region);
        processedImages.push(regionImage);
      }
    }
    
    // Step 3: Create a global enhanced version
    if (options.fallbackToOriginal || textRegions.length === 0) {
      const globalEnhanced = await this.createGlobalEnhancedImage(img);
      processedImages.push(globalEnhanced);
    }
    
    return { regions: textRegions, processedImages };
  }

  private async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private getDefaultOptions(): SmartOCROptions {
    return {
      useTextDetection: true,
      multipleRegions: true,
      enhanceTextRegions: true,
      useDeepLearning: false, // Would require external API
      fallbackToOriginal: true
    };
  }

  private detectTextByEdges(imageData: ImageData): TextRegion[] {
    const { width, height, data } = imageData;
    const edges = this.sobelEdgeDetection(imageData);
    const regions: TextRegion[] = [];
    
    // Find horizontal and vertical edge patterns typical of text
    const blockSize = 20;
    for (let y = 0; y < height - blockSize; y += blockSize) {
      for (let x = 0; x < width - blockSize; x += blockSize) {
        const edgeScore = this.calculateEdgeScore(edges, x, y, blockSize, width);
        
        if (edgeScore > 0.3) { // Threshold for text-like edge patterns
          regions.push({
            x,
            y,
            width: blockSize,
            height: blockSize,
            confidence: edgeScore
          });
        }
      }
    }
    
    return this.mergeNearbyRegions(regions);
  }

  private detectTextByColor(imageData: ImageData): TextRegion[] {
    const { width, height, data } = imageData;
    const regions: TextRegion[] = [];
    
    // Find areas with consistent text-like colors
    const blockSize = 30;
    for (let y = 0; y < height - blockSize; y += blockSize) {
      for (let x = 0; x < width - blockSize; x += blockSize) {
        const colorAnalysis = this.analyzeColorBlock(data, x, y, blockSize, width);
        
        if (colorAnalysis.isTextLike) {
          regions.push({
            x,
            y,
            width: blockSize,
            height: blockSize,
            confidence: colorAnalysis.confidence
          });
        }
      }
    }
    
    return this.mergeNearbyRegions(regions);
  }

  private detectTextByStroke(imageData: ImageData): TextRegion[] {
    // Simplified stroke width transform
    const { width, height } = imageData;
    const regions: TextRegion[] = [];
    
    // This is a simplified version - real SWT is quite complex
    const blockSize = 25;
    for (let y = 0; y < height - blockSize; y += blockSize) {
      for (let x = 0; x < width - blockSize; x += blockSize) {
        const strokeScore = this.calculateStrokeScore(imageData, x, y, blockSize);
        
        if (strokeScore > 0.4) {
          regions.push({
            x,
            y,
            width: blockSize,
            height: blockSize,
            confidence: strokeScore
          });
        }
      }
    }
    
    return regions;
  }

  private sobelEdgeDetection(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    const edges = new Uint8ClampedArray(data.length);
    
    // Sobel kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            
            gx += gray * sobelX[kernelIdx];
            gy += gray * sobelY[kernelIdx];
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const idx = (y * width + x) * 4;
        
        edges[idx] = edges[idx + 1] = edges[idx + 2] = Math.min(255, magnitude);
        edges[idx + 3] = 255;
      }
    }
    
    return new ImageData(edges, width, height);
  }

  private calculateEdgeScore(edges: ImageData, x: number, y: number, size: number, width: number): number {
    const { data } = edges;
    let edgeSum = 0;
    let pixelCount = 0;
    
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const idx = ((y + dy) * width + (x + dx)) * 4;
        if (idx < data.length) {
          edgeSum += data[idx];
          pixelCount++;
        }
      }
    }
    
    return pixelCount > 0 ? (edgeSum / pixelCount) / 255 : 0;
  }

  private analyzeColorBlock(data: Uint8ClampedArray, x: number, y: number, size: number, width: number): { isTextLike: boolean, confidence: number } {
    const colors: Array<{r: number, g: number, b: number}> = [];
    
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const idx = ((y + dy) * width + (x + dx)) * 4;
        if (idx < data.length) {
          colors.push({
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2]
          });
        }
      }
    }
    
    // Analyze color distribution
    const colorVariance = this.calculateColorVariance(colors);
    const dominantColors = this.findDominantColors(colors, 3);
    
    // Text typically has:
    // 1. Low color variance (consistent text color)
    // 2. High contrast with background
    // 3. Few dominant colors
    
    const hasLowVariance = colorVariance < 50;
    const hasFewColors = dominantColors.length <= 2;
    const hasHighContrast = this.hasHighContrast(dominantColors);
    
    const isTextLike = hasLowVariance && hasFewColors && hasHighContrast;
    const confidence = (hasLowVariance ? 0.4 : 0) + (hasFewColors ? 0.3 : 0) + (hasHighContrast ? 0.3 : 0);
    
    return { isTextLike, confidence };
  }

  private calculateStrokeScore(imageData: ImageData, x: number, y: number, size: number): number {
    // Simplified stroke width analysis
    // Real implementation would be much more complex
    const { width, data } = imageData;
    let strokeLikePixels = 0;
    let totalPixels = 0;
    
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const idx = ((y + dy) * width + (x + dx)) * 4;
        if (idx < data.length) {
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          
          // Look for stroke-like patterns (dark pixels with consistent width)
          if (gray < 128) { // Dark pixel
            strokeLikePixels++;
          }
          totalPixels++;
        }
      }
    }
    
    const darkRatio = strokeLikePixels / totalPixels;
    // Text typically has 10-40% dark pixels
    return darkRatio > 0.1 && darkRatio < 0.4 ? darkRatio : 0;
  }

  private calculateColorVariance(colors: Array<{r: number, g: number, b: number}>): number {
    if (colors.length === 0) return 0;
    
    const avgR = colors.reduce((sum, c) => sum + c.r, 0) / colors.length;
    const avgG = colors.reduce((sum, c) => sum + c.g, 0) / colors.length;
    const avgB = colors.reduce((sum, c) => sum + c.b, 0) / colors.length;
    
    const variance = colors.reduce((sum, c) => {
      return sum + Math.pow(c.r - avgR, 2) + Math.pow(c.g - avgG, 2) + Math.pow(c.b - avgB, 2);
    }, 0) / colors.length;
    
    return Math.sqrt(variance);
  }

  private findDominantColors(colors: Array<{r: number, g: number, b: number}>, maxColors: number): Array<{r: number, g: number, b: number, count: number}> {
    const colorMap = new Map<string, {color: {r: number, g: number, b: number}, count: number}>();
    
    colors.forEach(color => {
      // Quantize to reduce color variations
      const quantized = {
        r: Math.round(color.r / 32) * 32,
        g: Math.round(color.g / 32) * 32,
        b: Math.round(color.b / 32) * 32
      };
      
      const key = `${quantized.r},${quantized.g},${quantized.b}`;
      
      if (colorMap.has(key)) {
        colorMap.get(key)!.count++;
      } else {
        colorMap.set(key, { color: quantized, count: 1 });
      }
    });
    
    return Array.from(colorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, maxColors)
      .map(entry => ({ ...entry.color, count: entry.count }));
  }

  private hasHighContrast(colors: Array<{r: number, g: number, b: number, count: number}>): boolean {
    if (colors.length < 2) return false;
    
    const color1 = colors[0];
    const color2 = colors[1];
    
    const distance = Math.sqrt(
      Math.pow(color1.r - color2.r, 2) +
      Math.pow(color1.g - color2.g, 2) +
      Math.pow(color1.b - color2.b, 2)
    );
    
    return distance > 100; // High contrast threshold
  }

  private mergeNearbyRegions(regions: TextRegion[]): TextRegion[] {
    const merged: TextRegion[] = [];
    const used = new Set<number>();
    
    for (let i = 0; i < regions.length; i++) {
      if (used.has(i)) continue;
      
      let currentRegion = { ...regions[i] };
      used.add(i);
      
      // Find nearby regions to merge
      for (let j = i + 1; j < regions.length; j++) {
        if (used.has(j)) continue;
        
        const distance = Math.sqrt(
          Math.pow(currentRegion.x - regions[j].x, 2) +
          Math.pow(currentRegion.y - regions[j].y, 2)
        );
        
        if (distance < 50) { // Merge threshold
          // Expand region to include both
          const minX = Math.min(currentRegion.x, regions[j].x);
          const minY = Math.min(currentRegion.y, regions[j].y);
          const maxX = Math.max(currentRegion.x + currentRegion.width, regions[j].x + regions[j].width);
          const maxY = Math.max(currentRegion.y + currentRegion.height, regions[j].y + regions[j].height);
          
          currentRegion = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            confidence: Math.max(currentRegion.confidence, regions[j].confidence)
          };
          
          used.add(j);
        }
      }
      
      merged.push(currentRegion);
    }
    
    return merged.filter(region => region.width > 20 && region.height > 10); // Filter tiny regions
  }

  private mergeOverlappingRegions(regions: TextRegion[]): TextRegion[] {
    // Similar to mergeNearbyRegions but checks for overlap
    return this.mergeNearbyRegions(regions);
  }

  private async extractAndEnhanceRegion(img: HTMLImageElement, region: TextRegion): Promise<File> {
    // Create a new canvas for the region
    const regionCanvas = document.createElement('canvas');
    const regionCtx = regionCanvas.getContext('2d')!;
    
    // Add padding around the region
    const padding = 10;
    const regionWidth = region.width + padding * 2;
    const regionHeight = region.height + padding * 2;
    
    regionCanvas.width = regionWidth;
    regionCanvas.height = regionHeight;
    
    // Fill with white background
    regionCtx.fillStyle = 'white';
    regionCtx.fillRect(0, 0, regionWidth, regionHeight);
    
    // Draw the region with padding
    regionCtx.drawImage(
      img,
      region.x - padding, region.y - padding, region.width + padding * 2, region.height + padding * 2,
      0, 0, regionWidth, regionHeight
    );
    
    // Apply text-specific enhancements
    const imageData = regionCtx.getImageData(0, 0, regionWidth, regionHeight);
    const enhanced = this.enhanceTextRegion(imageData);
    regionCtx.putImageData(enhanced, 0, 0);
    
    // Convert to file
    return new Promise((resolve) => {
      regionCanvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `text_region_${region.x}_${region.y}.png`, {
            type: 'image/png',
            lastModified: Date.now()
          });
          resolve(file);
        }
      }, 'image/png');
    });
  }

  private enhanceTextRegion(imageData: ImageData): ImageData {
    // Apply aggressive text enhancement
    let enhanced = this.increaseContrast(imageData, 2.0);
    enhanced = this.removeColorNoise(enhanced);
    enhanced = this.sharpenText(enhanced);
    enhanced = this.binarizeForText(enhanced);
    
    return enhanced;
  }

  private async createGlobalEnhancedImage(img: HTMLImageElement): Promise<File> {
    this.canvas.width = img.width;
    this.canvas.height = img.height;
    this.ctx.drawImage(img, 0, 0);
    
    const imageData = this.ctx.getImageData(0, 0, img.width, img.height);
    
    // Apply global enhancements optimized for memes
    let enhanced = this.removeComplexBackground(imageData);
    enhanced = this.enhanceTextContrast(enhanced);
    enhanced = this.reduceColorComplexity(enhanced);
    
    this.ctx.putImageData(enhanced, 0, 0);
    
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'enhanced_global.png', {
            type: 'image/png',
            lastModified: Date.now()
          });
          resolve(file);
        }
      }, 'image/png');
    });
  }

  private increaseContrast(imageData: ImageData, factor: number): ImageData {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128));
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128));
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128));
    }
    
    return imageData;
  }

  private removeColorNoise(imageData: ImageData): ImageData {
    // Convert to grayscale to remove color distractions
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    
    return imageData;
  }

  private sharpenText(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    const newData = new Uint8ClampedArray(data);
    
    // Aggressive sharpening kernel for text
    const kernel = [
      0, -1, 0,
      -1, 6, -1,
      0, -1, 0
    ];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              const kernelIdx = (ky + 1) * 3 + (kx + 1);
              sum += data[idx] * kernel[kernelIdx];
            }
          }
          
          const idx = (y * width + x) * 4 + c;
          newData[idx] = Math.min(255, Math.max(0, sum));
        }
      }
    }
    
    return new ImageData(newData, width, height);
  }

  private binarizeForText(imageData: ImageData): ImageData {
    const data = imageData.data;
    
    // Use adaptive threshold for better text extraction
    const threshold = this.calculateAdaptiveThreshold(imageData);
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const binary = gray > threshold ? 255 : 0;
      
      data[i] = binary;
      data[i + 1] = binary;
      data[i + 2] = binary;
    }
    
    return imageData;
  }

  private calculateAdaptiveThreshold(imageData: ImageData): number {
    const data = imageData.data;
    const histogram = new Array(256).fill(0);
    
    // Build histogram
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
      histogram[gray]++;
    }
    
    // Find peaks (likely text and background)
    const peaks = this.findHistogramPeaks(histogram);
    
    if (peaks.length >= 2) {
      // Use midpoint between two largest peaks
      return Math.round((peaks[0] + peaks[1]) / 2);
    }
    
    // Fallback to Otsu's method
    return this.calculateOtsuThreshold(histogram, data.length / 4);
  }

  private findHistogramPeaks(histogram: number[]): number[] {
    const peaks: Array<{value: number, count: number}> = [];
    
    for (let i = 1; i < histogram.length - 1; i++) {
      if (histogram[i] > histogram[i - 1] && histogram[i] > histogram[i + 1] && histogram[i] > 100) {
        peaks.push({ value: i, count: histogram[i] });
      }
    }
    
    return peaks
      .sort((a, b) => b.count - a.count)
      .slice(0, 2)
      .map(peak => peak.value);
  }

  private calculateOtsuThreshold(histogram: number[], totalPixels: number): number {
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }
    
    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let varMax = 0;
    let threshold = 0;
    
    for (let i = 0; i < 256; i++) {
      wB += histogram[i];
      if (wB === 0) continue;
      
      wF = totalPixels - wB;
      if (wF === 0) break;
      
      sumB += i * histogram[i];
      
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      
      const varBetween = wB * wF * (mB - mF) * (mB - mF);
      
      if (varBetween > varMax) {
        varMax = varBetween;
        threshold = i;
      }
    }
    
    return threshold;
  }

  private removeComplexBackground(imageData: ImageData): ImageData {
    // More sophisticated background removal for memes
    const { width, height, data } = imageData;
    
    // Find the most common background color
    const bgColor = this.findBackgroundColor(imageData);
    
    // Create mask for text regions
    const textMask = this.createTextMask(imageData, bgColor);
    
    // Apply mask to isolate text
    for (let i = 0; i < data.length; i += 4) {
      const maskValue = textMask[i / 4];
      
      if (maskValue < 0.5) { // Background pixel
        data[i] = 255;     // Make white
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
    }
    
    return imageData;
  }

  private findBackgroundColor(imageData: ImageData): {r: number, g: number, b: number} {
    const { width, height, data } = imageData;
    
    // Sample from edges and corners
    const samples: Array<{r: number, g: number, b: number}> = [];
    
    // Top and bottom edges
    for (let x = 0; x < width; x += 10) {
      samples.push({
        r: data[x * 4],
        g: data[x * 4 + 1],
        b: data[x * 4 + 2]
      });
      
      const bottomIdx = ((height - 1) * width + x) * 4;
      samples.push({
        r: data[bottomIdx],
        g: data[bottomIdx + 1],
        b: data[bottomIdx + 2]
      });
    }
    
    // Left and right edges
    for (let y = 0; y < height; y += 10) {
      const leftIdx = (y * width) * 4;
      samples.push({
        r: data[leftIdx],
        g: data[leftIdx + 1],
        b: data[leftIdx + 2]
      });
      
      const rightIdx = (y * width + width - 1) * 4;
      samples.push({
        r: data[rightIdx],
        g: data[rightIdx + 1],
        b: data[rightIdx + 2]
      });
    }
    
    return this.getMostCommonColor(samples);
  }

  private getMostCommonColor(colors: Array<{r: number, g: number, b: number}>): {r: number, g: number, b: number} {
    const colorMap = new Map<string, {color: {r: number, g: number, b: number}, count: number}>();
    
    colors.forEach(color => {
      const quantized = {
        r: Math.round(color.r / 16) * 16,
        g: Math.round(color.g / 16) * 16,
        b: Math.round(color.b / 16) * 16
      };
      
      const key = `${quantized.r},${quantized.g},${quantized.b}`;
      
      if (colorMap.has(key)) {
        colorMap.get(key)!.count++;
      } else {
        colorMap.set(key, { color: quantized, count: 1 });
      }
    });
    
    let mostCommon = { color: { r: 255, g: 255, b: 255 }, count: 0 };
    colorMap.forEach(entry => {
      if (entry.count > mostCommon.count) {
        mostCommon = entry;
      }
    });
    
    return mostCommon.color;
  }

  private createTextMask(imageData: ImageData, bgColor: {r: number, g: number, b: number}): Float32Array {
    const { width, height, data } = imageData;
    const mask = new Float32Array(width * height);
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate distance from background color
      const distance = Math.sqrt(
        Math.pow(r - bgColor.r, 2) +
        Math.pow(g - bgColor.g, 2) +
        Math.pow(b - bgColor.b, 2)
      );
      
      // Normalize to 0-1 (1 = likely text, 0 = likely background)
      mask[i / 4] = Math.min(1, distance / 100);
    }
    
    return mask;
  }

  private enhanceTextContrast(imageData: ImageData): ImageData {
    // Enhance contrast specifically for text
    return this.increaseContrast(imageData, 1.8);
  }

  private reduceColorComplexity(imageData: ImageData): ImageData {
    // Reduce to fewer colors to help OCR
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Quantize colors to reduce complexity
      data[i] = Math.round(data[i] / 64) * 64;
      data[i + 1] = Math.round(data[i + 1] / 64) * 64;
      data[i + 2] = Math.round(data[i + 2] / 64) * 64;
    }
    
    return imageData;
  }

  cleanup() {
    // Clean up resources
  }
}

export const smartTextDetector = new SmartTextDetector();