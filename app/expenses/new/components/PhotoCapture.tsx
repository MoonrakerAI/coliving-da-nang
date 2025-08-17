'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { X, Camera, Image, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhotoCaptureProps {
  photos: File[]
  onPhotosChange: (photos: File[]) => void
}

export function PhotoCapture({ photos, onPhotosChange }: PhotoCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleCameraCapture = async () => {
    try {
      setIsCapturing(true)
      // Trigger camera input
      cameraInputRef.current?.click()
    } catch (error) {
      console.error('Camera access error:', error)
      alert('Camera access denied. Please check permissions.')
    } finally {
      setIsCapturing(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      // Compress and add photos
      const newPhotos = [...photos, ...files].slice(0, 5) // Max 5 photos
      onPhotosChange(newPhotos)
    }
    // Reset input
    if (event.target) {
      event.target.value = ''
    }
  }

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    onPhotosChange(newPhotos)
  }

  return (
    <div className="space-y-3" data-testid="photo-capture">
      {/* Photo Preview Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo, index) => (
            <PhotoPreview
              key={index}
              photo={photo}
              onRemove={() => removePhoto(index)}
            />
          ))}
        </div>
      )}

      {/* Capture Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCameraCapture}
          disabled={isCapturing || photos.length >= 5}
          className="h-14 flex flex-col items-center gap-1"
        >
          <Camera className="w-5 h-5" />
          <span className="text-xs">
            {isCapturing ? 'Opening...' : 'Camera'}
          </span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={photos.length >= 5}
          className="h-14 flex flex-col items-center gap-1"
        >
          <Image className="w-5 h-5" />
          <span className="text-xs">Gallery</span>
        </Button>
      </div>

      {/* Add More Button */}
      {photos.length > 0 && photos.length < 5 && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-12 border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add More Photos ({photos.length}/5)
        </Button>
      )}

      {/* Photo Limit Message */}
      {photos.length >= 5 && (
        <p className="text-sm text-muted-foreground text-center">
          Maximum 5 photos reached
        </p>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}

interface PhotoPreviewProps {
  photo: File
  onRemove: () => void
}

function PhotoPreview({ photo, onRemove }: PhotoPreviewProps) {
  const [imageUrl, setImageUrl] = useState<string>('')

  // Create preview URL
  useState(() => {
    const url = URL.createObjectURL(photo)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  })

  return (
    <div className="relative group">
      <div className="aspect-square rounded-lg overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Receipt preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
      </div>
      
      {/* Remove Button */}
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onRemove}
        className={cn(
          "absolute -top-2 -right-2 w-6 h-6 rounded-full p-0",
          "opacity-0 group-hover:opacity-100 transition-opacity"
        )}
      >
        <X className="w-3 h-3" />
      </Button>

      {/* File Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg">
        {(photo.size / 1024).toFixed(0)}KB
      </div>
    </div>
  )
}
