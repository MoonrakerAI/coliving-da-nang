'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Upload, 
  FileText, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  X 
} from 'lucide-react'

interface BatchUploadResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    error: string
  }>
}

export function BatchUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<BatchUploadResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile)
      } else {
        alert('Please upload a CSV file')
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const removeFile = () => {
    setFile(null)
    setUploadResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadTemplate = () => {
    const csvContent = [
      'tenantId,propertyId,amountCents,currency,paymentMethod,status,dueDate,paidDate,reference,description,notes',
      '550e8400-e29b-41d4-a716-446655440001,550e8400-e29b-41d4-a716-446655440000,150000,USD,Stripe,Paid,2025-01-01,2025-01-01,RENT-JAN-001,"Monthly Rent - January 2025",',
      '550e8400-e29b-41d4-a716-446655440002,550e8400-e29b-41d4-a716-446655440000,120000,USD,PayPal,Pending,2025-01-01,,,Monthly Rent - January 2025,',
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'payment_upload_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/payments/batch', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Upload failed')
      }

      const result = await response.json()
      setUploadResult(result)

    } catch (error) {
      console.error('Upload error:', error)
      setUploadResult({
        success: 0,
        failed: 1,
        errors: [{
          row: 0,
          error: error instanceof Error ? error.message : 'Upload failed'
        }]
      })
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 2000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Template Download */}
      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div>
          <h3 className="font-medium text-blue-900">Need a template?</h3>
          <p className="text-sm text-blue-700">
            Download our CSV template with the correct format and sample data
          </p>
        </div>
        <Button variant="outline" onClick={downloadTemplate} className="text-blue-700 border-blue-300">
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* File Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        {!file ? (
          <div className="space-y-4">
            <Upload className="h-12 w-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-lg font-medium">Drop your CSV file here</p>
              <p className="text-sm text-muted-foreground">
                or click to browse files
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Supports CSV files up to 10MB
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <FileText className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={removeFile}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uploading payments...</span>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Results */}
      {uploadResult && (
        <div className="space-y-4">
          {uploadResult.success > 0 && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Successfully processed {uploadResult.success} payment{uploadResult.success !== 1 ? 's' : ''}
              </AlertDescription>
            </Alert>
          )}

          {uploadResult.failed > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Failed to process {uploadResult.failed} payment{uploadResult.failed !== 1 ? 's' : ''}
              </AlertDescription>
            </Alert>
          )}

          {uploadResult.errors.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-3 text-red-800">Upload Errors:</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {uploadResult.errors.map((error, index) => (
                    <div key={index} className="text-sm p-2 bg-red-50 rounded border border-red-200">
                      <span className="font-medium">Row {error.row}:</span> {error.error}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Upload Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleUpload} 
          disabled={!file || isUploading}
          className="min-w-[120px]"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Payments
            </>
          )}
        </Button>
      </div>

      {/* Instructions */}
      <div className="text-sm text-muted-foreground space-y-2">
        <h4 className="font-medium">CSV Format Requirements:</h4>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Amount should be in cents (e.g., 150000 for $1,500)</li>
          <li>Dates should be in YYYY-MM-DD format</li>
          <li>Payment methods: Stripe, PayPal, Venmo, Wise, Revolut, Wire, Cash</li>
          <li>Status: Pending, Paid, Overdue, Refunded</li>
          <li>Currency should be 3-letter code (e.g., USD)</li>
        </ul>
      </div>
    </div>
  )
}
