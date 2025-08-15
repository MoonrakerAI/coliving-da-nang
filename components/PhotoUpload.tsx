'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Camera, X, AlertCircle, CheckCircle, ArrowUp, ArrowDown, RotateCw, Trash2 } from 'lucide-react';

interface PhotoUploadProps {
  expenseId: string;
  propertyId: string;
  onUploadSuccess?: (result: UploadResult) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  enableOCR?: boolean;
  enableOrdering?: boolean;
  captureMode?: 'single' | 'front-back' | 'multiple';
  className?: string;
}

interface UploadResult {
  urls: {
    original: string;
    compressed: string;
    thumbnail: string;
  };
  metadata: {
    original: ImageMetadata;
    compressed: ImageMetadata;
    thumbnails: {
      small: ImageMetadata;
      medium: ImageMetadata;
      large: ImageMetadata;
    };
  };
  compression: {
    originalSize: number;
    compressedSize: number;
    ratio: string;
    savings: number;
  };
  ocr?: {
    amount?: number;
    merchant?: string;
    date?: Date;
    confidence: number;
    rawText: string;
    validation: {
      isValid: boolean;
      confidence: number;
      issues: string[];
    };
  };
}

interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

export default function PhotoUpload({
  expenseId,
  propertyId,
  onUploadSuccess,
  onUploadError,
  maxFiles = 5,
  enableOCR = true,
  enableOrdering = true,
  captureMode = 'multiple',
  className = '',
}: PhotoUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: false,
  });
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList) => {
    if (files.length === 0) return;
    
    if (uploadedFiles.length + files.length > maxFiles) {
      const error = `Maximum ${maxFiles} files allowed`;
      setUploadState(prev => ({ ...prev, error }));
      onUploadError?.(error);
      return;
    }

    setUploadState({
      isUploading: true,
      progress: 0,
      error: null,
      success: false,
    });

    try {
      const uploadPromises = Array.from(files).map(async (file, index) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('expenseId', expenseId);
        formData.append('propertyId', propertyId);
        formData.append('processOCR', enableOCR.toString());

        const response = await fetch('/api/upload/receipt', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const result = await response.json();
        
        // Update progress
        const progressPercent = ((index + 1) / files.length) * 100;
        setUploadState(prev => ({ ...prev, progress: progressPercent }));
        
        return result.data as UploadResult;
      });

      const results = await Promise.all(uploadPromises);
      
      setUploadedFiles(prev => [...prev, ...results]);
      setUploadState({
        isUploading: false,
        progress: 100,
        error: null,
        success: true,
      });

      // Call success callback for each result
      results.forEach(result => onUploadSuccess?.(result));

      // Reset success state after 3 seconds
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, success: false, progress: 0 }));
      }, 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState({
        isUploading: false,
        progress: 0,
        error: errorMessage,
        success: false,
      });
      onUploadError?.(errorMessage);
    }
  }, [expenseId, propertyId, enableOCR, maxFiles, uploadedFiles.length, onUploadSuccess, onUploadError]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const movePhoto = (fromIndex: number, toIndex: number) => {
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      const [movedFile] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, movedFile);
      return newFiles;
    });
  };

  const movePhotoUp = (index: number) => {
    if (index > 0) movePhoto(index, index - 1);
  };

  const movePhotoDown = (index: number) => {
    if (index < uploadedFiles.length - 1) movePhoto(index, index + 1);
  };

  const clearAllPhotos = () => {
    if (confirm('Remove all uploaded photos?')) {
      setUploadedFiles([]);
    }
  };

  const clearError = () => {
    setUploadState(prev => ({ ...prev, error: null }));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${uploadState.isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />
        
        <div className="space-y-3">
          <div className="flex justify-center">
            {uploadState.isUploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            ) : (
              <Upload className="h-8 w-8 text-gray-400" />
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-900">
              {uploadState.isUploading 
                ? `Uploading... ${uploadState.progress.toFixed(0)}%`
                : 'Upload receipt photos'
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Drag and drop or click to select files
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PNG, JPG, HEIC up to 10MB • Max {maxFiles} files
            </p>
          </div>
          
          {enableOCR && (
            <div className="flex items-center justify-center space-x-1 text-xs text-blue-600">
              <Camera className="h-3 w-3" />
              <span>OCR text extraction enabled</span>
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        {uploadState.isUploading && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Status Messages */}
      {uploadState.error && (
        <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700">{uploadState.error}</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {uploadState.success && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700">
            {uploadedFiles.length} file(s) uploaded successfully
          </span>
        </div>
      )}

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              Uploaded Photos ({uploadedFiles.length})
              {captureMode === 'front-back' && uploadedFiles.length === 2 && (
                <span className="ml-2 text-xs text-green-600">✓ Front & Back</span>
              )}
            </h4>
            {uploadedFiles.length > 1 && (
              <button
                onClick={clearAllPhotos}
                className="text-xs text-red-600 hover:text-red-800 flex items-center space-x-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="relative group bg-white rounded-lg border border-gray-200 overflow-hidden">
                <img
                  src={file.urls.thumbnail}
                  alt={`Receipt ${index + 1}`}
                  className="w-full h-24 object-cover"
                />
                
                {/* Photo Controls */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity">
                  <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => removeUploadedFile(index)}
                      className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  
                  {/* Ordering Controls */}
                  {enableOrdering && uploadedFiles.length > 1 && (
                    <div className="absolute bottom-1 left-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {index > 0 && (
                        <button
                          onClick={() => movePhotoUp(index)}
                          className="bg-blue-500 text-white rounded p-1 hover:bg-blue-600"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                      )}
                      {index < uploadedFiles.length - 1 && (
                        <button
                          onClick={() => movePhotoDown(index)}
                          className="bg-blue-500 text-white rounded p-1 hover:bg-blue-600"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Photo Label */}
                <div className="absolute top-1 left-1">
                  <div className="bg-black bg-opacity-70 text-white text-xs px-1 py-0.5 rounded">
                    {captureMode === 'front-back' 
                      ? (index === 0 ? 'Front' : 'Back')
                      : `${index + 1}`
                    }
                  </div>
                </div>
                
                {/* OCR Results Indicator */}
                {file.ocr && (
                  <div className="absolute bottom-1 right-1">
                    <div className={`
                      text-xs px-1 py-0.5 rounded text-white
                      ${file.ocr.validation.isValid 
                        ? 'bg-green-600' 
                        : 'bg-yellow-600'
                      }
                    `}>
                      {file.ocr.amount ? `$${file.ocr.amount}` : 'OCR'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Capture Mode Instructions */}
          {captureMode === 'front-back' && uploadedFiles.length < 2 && (
            <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
              💡 Tip: Upload both front and back of the receipt for complete documentation
            </div>
          )}
        </div>
      )}
    </div>
  );
}
