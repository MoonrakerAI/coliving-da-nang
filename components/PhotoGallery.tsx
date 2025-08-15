'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Eye, 
  Download, 
  Trash2, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  X,
  Calendar,
  DollarSign,
  Store,
  FileText,
  AlertTriangle
} from 'lucide-react';

interface PhotoData {
  id: string;
  urls: {
    original: string;
    compressed: string;
    thumbnail: string;
  };
  metadata: {
    originalName: string;
    size: number;
    dimensions: { width: number; height: number };
    uploadedAt: string;
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

interface PhotoGalleryProps {
  photos: PhotoData[];
  onDelete?: (photoId: string) => void;
  onPhotoClick?: (photo: PhotoData) => void;
  className?: string;
}

interface LazyImageProps {
  src: string;
  fallbackSrc: string;
  alt: string;
  className?: string;
}

function LazyImage({ src, fallbackSrc, alt, className }: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isInView && !imageSrc) {
      setImageSrc(src);
    }
  }, [isInView, src, imageSrc]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    if (!hasError && fallbackSrc !== imageSrc) {
      setImageSrc(fallbackSrc);
      setHasError(true);
    } else {
      setHasError(true);
      setIsLoaded(true);
    }
  };

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 bg-gray-300 rounded" />
        </div>
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      {hasError && isLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-400 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto mb-1" />
            <p className="text-xs">Failed to load</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface PhotoViewerProps {
  photo: PhotoData;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (photoId: string) => void;
}

function PhotoViewer({ photo, isOpen, onClose, onDelete }: PhotoViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showMetadata, setShowMetadata] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      // Use secure download endpoint if available
      const downloadUrl = photo.urls.original;
      
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.metadata.originalName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      // Show success feedback
      const event = new CustomEvent('photo-downloaded', {
        detail: { photoId: photo.id, filename: photo.metadata.originalName }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this photo?')) {
      onDelete?.(photo.id);
      onClose();
    }
  };

  const zoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const rotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black bg-opacity-50">
          <h3 className="text-white font-medium">{photo.metadata.originalName}</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded"
            >
              <FileText className="h-5 w-5" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded"
            >
              <Download className="h-5 w-5" />
            </button>
            {onDelete && (
              <button
                onClick={handleDelete}
                className="p-2 text-red-400 hover:bg-red-500 hover:bg-opacity-20 rounded"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="relative">
            <img
              src={photo.urls.original}
              alt={photo.metadata.originalName}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4 p-4 bg-black bg-opacity-50">
          <button
            onClick={zoomOut}
            className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <span className="text-white text-sm">{Math.round(zoom * 100)}%</span>
          <button
            onClick={zoomIn}
            className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            onClick={rotate}
            className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded"
          >
            <RotateCw className="h-5 w-5" />
          </button>
        </div>

        {/* Metadata Panel */}
        {showMetadata && (
          <div className="absolute right-4 top-16 bottom-16 w-80 bg-white rounded-lg shadow-lg overflow-y-auto">
            <div className="p-4 space-y-4">
              <h4 className="font-semibold text-gray-900">Photo Details</h4>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">File:</span>
                  <span className="ml-2 text-gray-600">{photo.metadata.originalName}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Size:</span>
                  <span className="ml-2 text-gray-600">
                    {(photo.metadata.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Dimensions:</span>
                  <span className="ml-2 text-gray-600">
                    {photo.metadata.dimensions.width} × {photo.metadata.dimensions.height}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Uploaded:</span>
                  <span className="ml-2 text-gray-600">
                    {new Date(photo.metadata.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* OCR Results */}
              {photo.ocr && (
                <div className="border-t pt-4">
                  <h5 className="font-semibold text-gray-900 mb-3">Extracted Information</h5>
                  
                  <div className="space-y-3">
                    {photo.ocr.amount && (
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          <span className="font-medium">Amount:</span> ${photo.ocr.amount}
                        </span>
                      </div>
                    )}
                    
                    {photo.ocr.merchant && (
                      <div className="flex items-center space-x-2">
                        <Store className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">
                          <span className="font-medium">Merchant:</span> {photo.ocr.merchant}
                        </span>
                      </div>
                    )}
                    
                    {photo.ocr.date && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <span className="text-sm">
                          <span className="font-medium">Date:</span> {new Date(photo.ocr.date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    <div className="text-sm">
                      <span className="font-medium">Confidence:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        photo.ocr.confidence > 0.8 
                          ? 'bg-green-100 text-green-800'
                          : photo.ocr.confidence > 0.6
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {Math.round(photo.ocr.confidence * 100)}%
                      </span>
                    </div>

                    {photo.ocr.validation.issues.length > 0 && (
                      <div className="text-sm">
                        <div className="flex items-center space-x-1 mb-1">
                          <AlertTriangle className="h-3 w-3 text-yellow-600" />
                          <span className="font-medium text-yellow-700">Issues:</span>
                        </div>
                        <ul className="text-xs text-gray-600 space-y-1 ml-4">
                          {photo.ocr.validation.issues.map((issue, index) => (
                            <li key={index}>• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {photo.ocr.rawText && (
                      <div className="text-sm">
                        <span className="font-medium">Raw Text:</span>
                        <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono max-h-32 overflow-y-auto">
                          {photo.ocr.rawText}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PhotoGallery({ 
  photos, 
  onDelete, 
  onPhotoClick, 
  className = '' 
}: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null);

  const handlePhotoClick = useCallback((photo: PhotoData) => {
    setSelectedPhoto(photo);
    onPhotoClick?.(photo);
  }, [onPhotoClick]);

  const handleCloseViewer = useCallback(() => {
    setSelectedPhoto(null);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (photos.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-400 mb-2">
          <Eye className="h-12 w-12 mx-auto" />
        </div>
        <p className="text-gray-500">No photos uploaded yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Upload receipt photos to see them here
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Receipt Photos ({photos.length})
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handlePhotoClick(photo)}
            >
              {/* Thumbnail */}
              <div className="aspect-square overflow-hidden bg-gray-100">
                <LazyImage
                  src={photo.urls.thumbnail}
                  fallbackSrc={photo.urls.compressed}
                  alt={photo.metadata.originalName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* OCR Badge */}
              {photo.ocr && (
                <div className="absolute top-2 left-2">
                  <div className={`
                    px-2 py-1 rounded text-xs font-medium
                    ${photo.ocr.validation.isValid 
                      ? 'bg-green-500 text-white' 
                      : 'bg-yellow-500 text-white'
                    }
                  `}>
                    {photo.ocr.amount ? `$${photo.ocr.amount}` : 'OCR'}
                  </div>
                </div>
              )}

              {/* Delete Button */}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this photo?')) {
                      onDelete(photo.id);
                    }
                  }}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}

              {/* Info Bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2">
                <p className="text-xs truncate">{photo.metadata.originalName}</p>
                <p className="text-xs text-gray-300">
                  {formatFileSize(photo.metadata.size)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <PhotoViewer
          photo={selectedPhoto}
          isOpen={!!selectedPhoto}
          onClose={handleCloseViewer}
          onDelete={onDelete}
        />
      )}
    </>
  );
}
