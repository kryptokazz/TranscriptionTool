// Image preprocessing utilities for better OCR accuracy
export interface PreprocessingOptions {
  enhanceContrast: boolean;
  removeNoise: boolean;
  binarize: boolean;
  deskew: boolean;
  scaleUp: boolean;
  sharpen: boolean;
  removeBackground: boolean;
}

export class ImagePreprocessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  async preprocessImage(
    file: File, 
    options: PreprocessingOptions = this.getDefaultOptions()
  ): Promise<File> {
    const img = await this.loadImage(file);
    
    // Set canvas size
    this.canvas.width = img.width;
    this.canvas.height = img.height;
    
    // Draw original image
    this.ctx.drawImage(img, 0, 0);
    
    // Get image data for processing
    let imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    // Apply preprocessing steps in optimal order
    if (options.scaleUp) {
      imageData = this.scaleUp(imageData, 2);
    }
    
    if (options.removeNoise) {
      imageData = this.removeNoise(imageData);
    }
    
    if (options.enhanceContrast) {
      imageData = this.enhanceContrast(imageData);
    }
    
    if (options.removeBackground) {
      imageData = this.removeBackground(imageData);
    }
    
    if (options.binarize) {
      imageData = this.binarize(imageData);
    }
    
    if (options.sharpen) {
      imageData = this.sharpen(imageData);
    }
    
    if (options.deskew) {
      imageData = this.deskew(imageData);
    }
    
    // Put processed image back on canvas
    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    this.ctx.putImageData(imageData, 0, 0);
    
    // Convert back to file
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => {
        if (blob) {
          const processedFile = new File([blob], `processed_${file.name}`, {
            type: 'image/png',
            lastModified: Date.now()
          });
          resolve(processedFile);
        }
      }, 'image/png');
    });
  }

  private async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private getDefaultOptions(): PreprocessingOptions {
    return {
      enhanceContrast: true,
      removeNoise: true,
      binarize: true,
      deskew: false,
      scaleUp: true,
      sharpen: true,
      removeBackground: true
    };
  }

  private scaleUp(imageData: ImageData, factor: number): ImageData {
    const { width, height, data } = imageData;
    const newWidth = width * factor;
    const newHeight = height * factor;
    
    const newCanvas = document.createElement('canvas');
    const newCtx = newCanvas.getContext('2d')!;
    newCanvas.width = newWidth;
    newCanvas.height = newHeight;
    
    // Use nearest neighbor for sharp text scaling
    newCtx.imageSmoothingEnabled = false;
    
    // Create temporary canvas with original image
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = width;
    tempCanvas.height = height;
    tempCtx.putImageData(imageData, 0, 0);
    
    // Scale up
    newCtx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, newWidth, newHeight);
    
    return newCtx.getImageData(0, 0, newWidth, newHeight);
  }

  private enhanceContrast(imageData: ImageData): ImageData {
    const data = imageData.data;
    const factor = 1.5; // Contrast enhancement factor
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply contrast enhancement to RGB channels
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128));     // R
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128)); // G
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128)); // B
    }
    
    return imageData;
  }

  private removeNoise(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    const newData = new Uint8ClampedArray(data);
    
    // Median filter for noise reduction
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB channels
          const neighbors = [];
          
          // Get 3x3 neighborhood
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const idx = ((y + dy) * width + (x + dx)) * 4 + c;
              neighbors.push(data[idx]);
            }
          }
          
          // Apply median filter
          neighbors.sort((a, b) => a - b);
          const median = neighbors[Math.floor(neighbors.length / 2)];
          
          const idx = (y * width + x) * 4 + c;
          newData[idx] = median;
        }
      }
    }
    
    return new ImageData(newData, width, height);
  }

  private binarize(imageData: ImageData): ImageData {
    const data = imageData.data;
    
    // Convert to grayscale and calculate histogram
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      histogram[gray]++;
    }
    
    // Otsu's method for automatic threshold
    const threshold = this.calculateOtsuThreshold(histogram, data.length / 4);
    
    // Apply threshold
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      const binary = gray > threshold ? 255 : 0;
      
      data[i] = binary;     // R
      data[i + 1] = binary; // G
      data[i + 2] = binary; // B
      // Alpha channel remains unchanged
    }
    
    return imageData;
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

  private removeBackground(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    
    // Detect background color (most common color in corners)
    const cornerSamples = [
      // Top-left corner
      ...this.sampleArea(data, width, 0, 0, 10, 10),
      // Top-right corner
      ...this.sampleArea(data, width, width - 10, 0, 10, 10),
      // Bottom-left corner
      ...this.sampleArea(data, width, 0, height - 10, 10, 10),
      // Bottom-right corner
      ...this.sampleArea(data, width, width - 10, height - 10, 10, 10)
    ];
    
    const bgColor = this.getMostCommonColor(cornerSamples);
    const tolerance = 30; // Color tolerance
    
    // Remove background by making it white
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const distance = Math.sqrt(
        Math.pow(r - bgColor.r, 2) +
        Math.pow(g - bgColor.g, 2) +
        Math.pow(b - bgColor.b, 2)
      );
      
      if (distance < tolerance) {
        data[i] = 255;     // R
        data[i + 1] = 255; // G
        data[i + 2] = 255; // B
      }
    }
    
    return imageData;
  }

  private sampleArea(data: Uint8ClampedArray, width: number, x: number, y: number, w: number, h: number): Array<{r: number, g: number, b: number}> {
    const samples = [];
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const idx = ((y + dy) * width + (x + dx)) * 4;
        if (idx < data.length) {
          samples.push({
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2]
          });
        }
      }
    }
    return samples;
  }

  private getMostCommonColor(colors: Array<{r: number, g: number, b: number}>): {r: number, g: number, b: number} {
    const colorMap = new Map<string, {color: {r: number, g: number, b: number}, count: number}>();
    
    colors.forEach(color => {
      // Quantize colors to reduce variations
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

  private sharpen(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    const newData = new Uint8ClampedArray(data);
    
    // Sharpening kernel
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB channels
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

  private deskew(imageData: ImageData): ImageData {
    // Simple deskew implementation
    // In a production app, you'd use more sophisticated algorithms
    return imageData;
  }

  // Method to analyze image and suggest best preprocessing options
  analyzeImage(imageData: ImageData): PreprocessingOptions {
    const { width, height, data } = imageData;
    
    // Calculate image statistics
    let totalBrightness = 0;
    let contrastSum = 0;
    let edgePixels = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      
      // Simple edge detection
      if (i > width * 4 && i < data.length - width * 4) {
        const prevBrightness = (data[i - width * 4] + data[i - width * 4 + 1] + data[i - width * 4 + 2]) / 3;
        const nextBrightness = (data[i + width * 4] + data[i + width * 4 + 1] + data[i + width * 4 + 2]) / 3;
        const diff = Math.abs(brightness - prevBrightness) + Math.abs(brightness - nextBrightness);
        contrastSum += diff;
        if (diff > 30) edgePixels++;
      }
    }
    
    const avgBrightness = totalBrightness / (data.length / 4);
    const avgContrast = contrastSum / (data.length / 4);
    const edgeRatio = edgePixels / (data.length / 4);
    
    // Determine optimal preprocessing based on image characteristics
    return {
      enhanceContrast: avgContrast < 50, // Low contrast images
      removeNoise: edgeRatio > 0.1, // Noisy images
      binarize: true, // Almost always helpful for text
      deskew: false, // Only if rotation detected
      scaleUp: width < 800 || height < 600, // Small images
      sharpen: avgContrast < 30, // Very low contrast
      removeBackground: avgBrightness > 200 || avgBrightness < 50 // Very light or dark backgrounds
    };
  }

  cleanup() {
    // Clean up canvas resources if needed
  }
}

export const imagePreprocessor = new ImagePreprocessor();