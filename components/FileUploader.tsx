import React, { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { Button } from './ui/button';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  selectedFile,
  onClearFile,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      
      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find(file => file.type.startsWith('image/'));
      
      if (imageFile) {
        onFileSelect(imageFile);
      }
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  if (selectedFile) {
    return (
      <div className="relative bg-white rounded-3xl p-8 shadow-sm border border-gray-200">
        <Button
          onClick={onClearFile}
          variant="outline"
          size="icon"
          className="absolute top-6 right-6 h-10 w-10 rounded-full border-gray-300 hover:border-red-300 hover:bg-red-50"
        >
          <X size={16} className="text-gray-500 hover:text-red-500" />
        </Button>
        <div className="flex items-center space-x-6">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
              <ImageIcon size={28} className="text-blue-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 font-semibold text-lg truncate">{selectedFile.name}</p>
            <p className="text-gray-500 text-base mt-1">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-300 cursor-pointer bg-white ${
        isDragOver
          ? 'border-green-400 bg-green-50 shadow-lg scale-[1.02]'
          : 'border-gray-300 hover:border-gray-400 hover:shadow-md'
      }`}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div className="space-y-6">
        <div className={`mx-auto w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-300 ${
          isDragOver ? 'bg-green-100 scale-110' : 'bg-gray-100'
        }`}>
          <Upload size={36} className={`transition-colors duration-300 ${
            isDragOver ? 'text-green-600' : 'text-gray-500'
          }`} />
        </div>
        
        <div>
          <h3 className={`text-2xl font-bold mb-3 transition-colors duration-300 ${
            isDragOver ? 'text-green-700' : 'text-gray-900'
          }`}>
            Drop your image here
          </h3>
          <p className="text-gray-600 mb-6 text-lg">
            or click to browse your files
          </p>
          <p className="text-gray-500">
            Supports PNG, JPG, JPEG, GIF, BMP
          </p>
        </div>
      </div>
    </div>
  );
};