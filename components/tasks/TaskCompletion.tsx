'use client'

import { useState, useRef } from 'react'
import { CompleteTaskForm } from '@/types'
import { Camera, Star, Upload, X } from 'lucide-react'

interface TaskCompletionProps {
  taskId: string
  taskTitle: string
  onComplete: (data: CompleteTaskForm) => void
  onCancel: () => void
  isLoading?: boolean
}

export function TaskCompletion({ 
  taskId, 
  taskTitle, 
  onComplete, 
  onCancel, 
  isLoading = false 
}: TaskCompletionProps) {
  const [formData, setFormData] = useState<CompleteTaskForm>({
    completionNotes: '',
    completionPhotos: [],
    qualityRating: undefined
  })
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validate files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`)
        return false
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large (max 5MB)`)
        return false
      }
      return true
    })

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])
      
      // Create preview URLs
      const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file))
      setPreviewUrls(prev => [...prev, ...newPreviewUrls])
    }
  }

  const removePhoto = (index: number) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(previewUrls[index])
    
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    let photoUrls: string[] = []
    
    // Upload photos if any are selected
    if (selectedFiles.length > 0) {
      try {
        const formDataForUpload = new FormData()
        selectedFiles.forEach(file => {
          formDataForUpload.append('photos', file)
        })

        const response = await fetch(`/api/tasks/${taskId}/photos`, {
          method: 'POST',
          body: formDataForUpload
        })

        if (!response.ok) {
          throw new Error('Failed to upload photos')
        }

        const result = await response.json()
        photoUrls = result.data.photos
      } catch (error) {
        console.error('Error uploading photos:', error)
        alert('Failed to upload photos. Please try again.')
        return
      }
    }

    // Complete the task
    onComplete({
      ...formData,
      completionPhotos: photoUrls
    })
  }

  const handleRatingClick = (rating: number) => {
    setFormData(prev => ({ 
      ...prev, 
      qualityRating: prev.qualityRating === rating ? undefined : rating 
    }))
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Complete Task</h2>
        <p className="text-sm text-gray-600 mt-1">{taskTitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Completion Notes */}
        <div>
          <label htmlFor="completionNotes" className="block text-sm font-medium text-gray-700 mb-2">
            Completion Notes (Optional)
          </label>
          <textarea
            id="completionNotes"
            rows={4}
            value={formData.completionNotes}
            onChange={(e) => setFormData(prev => ({ ...prev, completionNotes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add any notes about how the task was completed, issues encountered, etc."
          />
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Camera className="w-4 h-4 inline mr-1" />
            Completion Photos (Optional)
          </label>
          
          <div className="space-y-4">
            {/* Upload Button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <Upload className="w-5 h-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">
                  Click to upload photos or drag and drop
                </span>
              </button>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF up to 5MB each
              </p>
            </div>

            {/* Photo Previews */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-md border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quality Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Star className="w-4 h-4 inline mr-1" />
            Quality Rating (Optional)
          </label>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleRatingClick(rating)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  formData.qualityRating && rating <= formData.qualityRating
                    ? 'text-yellow-500'
                    : 'text-gray-300 hover:text-yellow-400'
                }`}
              >
                <Star 
                  className={`w-6 h-6 ${
                    formData.qualityRating && rating <= formData.qualityRating 
                      ? 'fill-current' 
                      : ''
                  }`} 
                />
              </button>
            ))}
            {formData.qualityRating && (
              <span className="ml-2 text-sm text-gray-600">
                {formData.qualityRating}/5
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Completing...' : 'Complete Task'}
          </button>
        </div>
      </form>
    </div>
  )
}
