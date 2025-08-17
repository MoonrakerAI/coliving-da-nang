'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Trash2,
  Shield,
  Clock,
  User,
  FileCheck,
  AlertCircle,
  Plus,
  ExternalLink
} from 'lucide-react'
import { StoredDocument } from '@/lib/agreements/storage'

interface DocumentWithUrls extends StoredDocument {
  secureUrl: string | null
  downloadUrl: string
}

interface DocumentListResponse {
  agreementId: string
  documents: DocumentWithUrls[]
  totalDocuments: number
  totalSize: number
}

export default function AgreementDocumentsPage() {
  const params = useParams()
  const agreementId = params.id as string
  
  const [documents, setDocuments] = useState<DocumentWithUrls[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadDocumentType, setUploadDocumentType] = useState('amendment')
  const [totalSize, setTotalSize] = useState(0)

  useEffect(() => {
    loadDocuments()
  }, [agreementId])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/agreements/${agreementId}/documents`)
      
      if (response.ok) {
        const data: DocumentListResponse = await response.json()
        setDocuments(data.documents)
        setTotalSize(data.totalSize)
      } else {
        console.error('Failed to load documents')
      }
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setUploading(true)
      
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('description', uploadDescription)
      formData.append('documentType', uploadDocumentType)

      const response = await fetch(`/api/agreements/${agreementId}/documents`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        await loadDocuments()
        setUploadDialogOpen(false)
        setSelectedFile(null)
        setUploadDescription('')
        setUploadDocumentType('amendment')
      } else {
        const error = await response.json()
        console.error('Upload failed:', error.error)
      }
    } catch (error) {
      console.error('Error uploading document:', error)
    } finally {
      setUploading(false)
    }
  }

  const downloadDocument = async (doc: DocumentWithUrls) => {
    try {
      const response = await fetch(doc.downloadUrl)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = doc.fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error('Failed to download document')
      }
    } catch (error) {
      console.error('Error downloading document:', error)
    }
  }

  const getDocumentTypeColor = (source: string) => {
    switch (source) {
      case 'docusign': return 'bg-green-100 text-green-800'
      case 'upload': return 'bg-blue-100 text-blue-800'
      case 'generated': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDocumentTypeIcon = (source: string) => {
    switch (source) {
      case 'docusign': return <FileCheck className="h-4 w-4" />
      case 'upload': return <Upload className="h-4 w-4" />
      case 'generated': return <FileText className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileTypeIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('image')) return '🖼️'
    if (mimeType.includes('word')) return '📝'
    return '📁'
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Agreement Documents</h1>
          <p className="text-gray-600">Manage all documents related to this agreement</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadDocuments} variant="outline">
            Refresh
          </Button>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Upload New Document</DialogTitle>
                <DialogDescription>
                  Add a new document to this agreement. Supported formats: PDF, images, Word documents.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="file">File</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileSelect}
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-600">
                      Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="documentType">Document Type</Label>
                  <Select value={uploadDocumentType} onValueChange={setUploadDocumentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amendment">Amendment</SelectItem>
                      <SelectItem value="addendum">Addendum</SelectItem>
                      <SelectItem value="receipt">Receipt</SelectItem>
                      <SelectItem value="notice">Notice</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the document..."
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleUpload} 
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Storage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold">{documents.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Signed Documents</p>
                <p className="text-2xl font-bold text-green-600">
                  {documents.filter(doc => doc.source === 'docusign').length}
                </p>
              </div>
              <FileCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Uploaded Files</p>
                <p className="text-2xl font-bold text-blue-600">
                  {documents.filter(doc => doc.source === 'upload').length}
                </p>
              </div>
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Size</p>
                <p className="text-2xl font-bold">{formatFileSize(totalSize)}</p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Document History</CardTitle>
          <CardDescription>
            All documents associated with this agreement, including signed contracts and uploaded files
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
              <p className="text-gray-600 mb-4">
                Upload your first document or wait for the signed agreement to be completed.
              </p>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Stored</TableHead>
                    <TableHead>Security</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {getFileTypeIcon(document.mimeType)}
                          </span>
                          <div>
                            <div className="font-medium">{document.fileName}</div>
                            {document.metadata.description && (
                              <div className="text-sm text-gray-500">
                                {document.metadata.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={`${getDocumentTypeColor(document.source)} flex items-center gap-1 w-fit`}>
                          {getDocumentTypeIcon(document.source)}
                          {document.source === 'docusign' ? 'Signed' : 
                           document.source === 'upload' ? 'Uploaded' : 'Generated'}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <span className="font-mono text-sm">v{document.version}</span>
                      </TableCell>
                      
                      <TableCell>
                        {formatFileSize(document.fileSize)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">
                            {new Date(document.storedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">
                            {document.encryptedPath ? 'Encrypted' : 'Secure'}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadDocument(document)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          
                          {document.secureUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(document.secureUrl!, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Document Security</h3>
              <p className="text-sm text-blue-700 mt-1">
                All documents are stored securely with encryption and access controls. 
                Signed documents are automatically retrieved from DocuSign and stored with 
                integrity verification. Access is logged and monitored for compliance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
