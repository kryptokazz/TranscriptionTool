import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from './ui/button';

interface ImagePreviewProps {
  file: File;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ file }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Image Preview</h3>
        <div className="flex space-x-3">
          <Button
            onClick={handleZoomOut}
            variant="outline"
            size="icon"
            disabled={zoom <= 0.5}
            className="h-10 w-10"
          >
            <ZoomOut size={16} />
          </Button>
          <Button
            onClick={handleZoomIn}
            variant="outline"
            size="icon"
            disabled={zoom >= 3}
            className="h-10 w-10"
          >
            <ZoomIn size={16} />
          </Button>
          <Button
            onClick={handleRotate}
            variant="outline"
            size="icon"
            className="h-10 w-10"
          >
            <RotateCw size={16} />
          </Button>
        </div>
      </div>
      
      <div className="overflow-hidden rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center min-h-[300px] max-h-[500px]">
        <img
          src={imageUrl}
          alt="Preview"
          className="max-w-full max-h-full object-contain transition-transform duration-300"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
        />
      </div>
    </div>
  );
};