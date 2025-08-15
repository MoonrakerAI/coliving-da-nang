'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CameraButtonProps {
  onPhotoCapture: (file: File) => void
  disabled?: boolean
  className?: string
}

export function CameraButton({ onPhotoCapture, disabled, className }: CameraButtonProps) {
  const [isCapturing, setIsCapturing] = useState(false)

  const handleCameraClick = async () => {
    try {
      setIsCapturing(true)
      
      // Create a file input for camera capture
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.capture = 'environment' // Use rear camera
      
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (file) {
          onPhotoCapture(file)
        }
        setIsCapturing(false)
      }
      
      input.oncancel = () => {
        setIsCapturing(false)
      }
      
      input.click()
    } catch (error) {
      console.error('Camera capture error:', error)
      setIsCapturing(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleCameraClick}
      disabled={disabled || isCapturing}
      className={cn(
        "h-16 w-16 rounded-full p-0 border-2 border-primary",
        "active:scale-95 transition-transform duration-150",
        "shadow-lg hover:shadow-xl",
        className
      )}
    >
      {isCapturing ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : (
        <Camera className="w-6 h-6" />
      )}
    </Button>
  )
}
