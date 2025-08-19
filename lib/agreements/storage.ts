import { DocuSignService } from './docusign'
import { getAgreement, updateAgreement } from '@/lib/db/operations/agreements'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'

// Document storage configuration
const STORAGE_BASE_PATH = process.env.DOCUMENT_STORAGE_PATH || '/tmp/agreements'
const ENCRYPTION_KEY = process.env.DOCUMENT_ENCRYPTION_KEY || 'default-key-change-in-production'

export interface StoredDocument {
  id: string
  agreementId: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  checksum: string
  encryptedPath?: string
  storedAt: Date
  version: number
  source: 'docusign' | 'upload' | 'generated'
  metadata: {
    docusignEnvelopeId?: string
    docusignDocumentId?: string
    originalFileName?: string
    uploadedBy?: string
  }
}

export class DocumentStorageService {
  /**
   * Store a signed document from DocuSign
   */
  static async storeSignedDocument(
    agreementId: string,
    docusignEnvelopeId: string,
    docusignDocumentId: string = '1'
  ): Promise<StoredDocument> {
    try {
      // Download document from DocuSign
      // TODO: Implement downloadSignedDocument method in DocuSignService
      const documentBuffer = Buffer.from('placeholder document content')

      // Generate file metadata
      const fileName = `agreement-${agreementId}-signed.pdf`
      const checksum = crypto.createHash('sha256').update(documentBuffer).digest('hex')
      
      // Store document
      const storedDoc = await this.storeDocument(
        agreementId,
        fileName,
        documentBuffer,
        'application/pdf',
        {
          docusignEnvelopeId,
          docusignDocumentId,
          originalFileName: fileName
        },
        'docusign'
      )

      // Update agreement with stored document reference
      await updateAgreement({
        id: agreementId,
        signedDocumentUrl: storedDoc.filePath
      })

      return storedDoc
    } catch (error) {
      console.error('Error storing signed document:', error)
      throw new Error(`Failed to store signed document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Store a document with encryption and version control
   */
  static async storeDocument(
    agreementId: string,
    fileName: string,
    documentBuffer: Buffer,
    mimeType: string,
    metadata: Record<string, any> = {},
    source: 'docusign' | 'upload' | 'generated' = 'upload'
  ): Promise<StoredDocument> {
    try {
      // Ensure storage directory exists
      await this.ensureStorageDirectory(agreementId)

      // Generate unique document ID
      const documentId = crypto.randomUUID()
      
      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(documentBuffer).digest('hex')
      
      // Determine version number
      const version = await this.getNextVersion(agreementId, fileName)
      
      // Generate file paths
      const versionedFileName = this.generateVersionedFileName(fileName, version)
      const relativePath = path.join(agreementId, versionedFileName)
      const fullPath = path.join(STORAGE_BASE_PATH, relativePath)
      
      // Encrypt document if encryption is enabled
      let finalBuffer = documentBuffer
      let encryptedPath: string | undefined
      
      if (process.env.ENCRYPT_DOCUMENTS === 'true') {
        finalBuffer = this.encryptDocument(documentBuffer)
        encryptedPath = relativePath
      }

      // Write document to storage
      await fs.writeFile(fullPath, finalBuffer)

      // Create document record
      const storedDocument: StoredDocument = {
        id: documentId,
        agreementId,
        fileName: versionedFileName,
        filePath: relativePath,
        fileSize: documentBuffer.length,
        mimeType,
        checksum,
        encryptedPath,
        storedAt: new Date(),
        version,
        source,
        metadata
      }

      // Store document metadata in database
      await this.saveDocumentMetadata(storedDocument)

      return storedDocument
    } catch (error) {
      console.error('Error storing document:', error)
      throw new Error(`Failed to store document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Retrieve a stored document
   */
  static async retrieveDocument(documentId: string): Promise<{
    document: StoredDocument
    buffer: Buffer
  }> {
    try {
      // Get document metadata
      const document = await this.getDocumentMetadata(documentId)
      if (!document) {
        throw new Error('Document not found')
      }

      // Read document from storage
      const fullPath = path.join(STORAGE_BASE_PATH, document.filePath)
      let buffer = await fs.readFile(fullPath)

      // Decrypt if necessary
      if (document.encryptedPath) {
        buffer = this.decryptDocument(buffer)
      }

      // Verify checksum
      const currentChecksum = crypto.createHash('sha256').update(buffer).digest('hex')
      if (currentChecksum !== document.checksum) {
        throw new Error('Document integrity check failed')
      }

      return { document, buffer }
    } catch (error) {
      console.error('Error retrieving document:', error)
      throw new Error(`Failed to retrieve document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * List all documents for an agreement
   */
  static async listAgreementDocuments(agreementId: string): Promise<StoredDocument[]> {
    try {
      // This would typically query a database table
      // For now, we'll implement a basic file-based approach
      const agreementPath = path.join(STORAGE_BASE_PATH, agreementId)
      
      try {
        const files = await fs.readdir(agreementPath)
        const documents: StoredDocument[] = []
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const metadataPath = path.join(agreementPath, file)
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'))
            documents.push(metadata)
          }
        }
        
        return documents.sort((a, b) => b.version - a.version)
      } catch (error) {
        // Directory doesn't exist or is empty
        return []
      }
    } catch (error) {
      console.error('Error listing agreement documents:', error)
      throw new Error(`Failed to list documents: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete a document (soft delete with retention)
   */
  static async deleteDocument(documentId: string, reason: string = 'User requested'): Promise<void> {
    try {
      const document = await this.getDocumentMetadata(documentId)
      if (!document) {
        throw new Error('Document not found')
      }

      // Move to deleted folder instead of permanent deletion
      const deletedPath = path.join(STORAGE_BASE_PATH, 'deleted', document.agreementId)
      await this.ensureDirectory(deletedPath)
      
      const originalPath = path.join(STORAGE_BASE_PATH, document.filePath)
      const deletedFilePath = path.join(deletedPath, `${Date.now()}-${document.fileName}`)
      
      // Move file to deleted folder
      await fs.rename(originalPath, deletedFilePath)
      
      // Update metadata with deletion info
      const updatedDocument = {
        ...document,
        deletedAt: new Date(),
        deletedReason: reason,
        deletedPath: deletedFilePath
      }
      
      await this.saveDocumentMetadata(updatedDocument)
      
      console.log(`Document ${documentId} moved to deleted folder: ${deletedFilePath}`)
    } catch (error) {
      console.error('Error deleting document:', error)
      throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get document access URL with authentication token
   */
  static async getSecureDocumentUrl(
    documentId: string,
    expiresInMinutes: number = 60
  ): Promise<string> {
    try {
      // Generate secure access token
      const payload = {
        documentId,
        exp: Math.floor(Date.now() / 1000) + (expiresInMinutes * 60),
        iat: Math.floor(Date.now() / 1000)
      }
      
      const token = this.generateAccessToken(payload)
      
      return `${process.env.NEXT_PUBLIC_APP_URL}/api/documents/secure/${documentId}?token=${token}`
    } catch (error) {
      console.error('Error generating secure document URL:', error)
      throw new Error('Failed to generate secure document URL')
    }
  }

  // Private helper methods

  private static async ensureStorageDirectory(agreementId: string): Promise<void> {
    const agreementPath = path.join(STORAGE_BASE_PATH, agreementId)
    await this.ensureDirectory(agreementPath)
  }

  private static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath)
    } catch {
      await fs.mkdir(dirPath, { recursive: true })
    }
  }

  private static async getNextVersion(agreementId: string, fileName: string): Promise<number> {
    try {
      const documents = await this.listAgreementDocuments(agreementId)
      const baseFileName = this.getBaseFileName(fileName)
      
      const versions = documents
        .filter(doc => this.getBaseFileName(doc.fileName) === baseFileName)
        .map(doc => doc.version)
      
      return versions.length > 0 ? Math.max(...versions) + 1 : 1
    } catch {
      return 1
    }
  }

  private static generateVersionedFileName(fileName: string, version: number): string {
    const ext = path.extname(fileName)
    const base = path.basename(fileName, ext)
    return `${base}-v${version}${ext}`
  }

  private static getBaseFileName(fileName: string): string {
    const ext = path.extname(fileName)
    const base = path.basename(fileName, ext)
    return base.replace(/-v\d+$/, '')
  }

  private static encryptDocument(buffer: Buffer): Buffer {
    try {
      const algorithm = 'aes-256-gcm'
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
      const iv = crypto.randomBytes(16)
      
      const cipher = crypto.createCipher(algorithm, key)
      const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()])
      
      return Buffer.concat([iv, encrypted])
    } catch (error) {
      console.error('Error encrypting document:', error)
      throw new Error('Failed to encrypt document')
    }
  }

  private static decryptDocument(encryptedBuffer: Buffer): Buffer {
    try {
      const algorithm = 'aes-256-gcm'
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
      const iv = encryptedBuffer.slice(0, 16)
      const encrypted = encryptedBuffer.slice(16)
      
      const decipher = crypto.createDecipher(algorithm, key)
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
      
      return decrypted
    } catch (error) {
      console.error('Error decrypting document:', error)
      throw new Error('Failed to decrypt document')
    }
  }

  private static async saveDocumentMetadata(document: StoredDocument): Promise<void> {
    try {
      const metadataPath = path.join(
        STORAGE_BASE_PATH,
        document.agreementId,
        `${document.id}.json`
      )
      
      await fs.writeFile(metadataPath, JSON.stringify(document, null, 2))
    } catch (error) {
      console.error('Error saving document metadata:', error)
      throw new Error('Failed to save document metadata')
    }
  }

  private static async getDocumentMetadata(documentId: string): Promise<StoredDocument | null> {
    try {
      // This is a simplified implementation
      // In production, this would query a database
      const agreementDirs = await fs.readdir(STORAGE_BASE_PATH)
      
      for (const agreementId of agreementDirs) {
        if (agreementId === 'deleted') continue
        
        try {
          const metadataPath = path.join(STORAGE_BASE_PATH, agreementId, `${documentId}.json`)
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'))
          return metadata
        } catch {
          // File doesn't exist, continue searching
          continue
        }
      }
      
      return null
    } catch (error) {
      console.error('Error getting document metadata:', error)
      return null
    }
  }

  private static generateAccessToken(payload: any): string {
    // Simple token generation - in production, use proper JWT library
    const data = JSON.stringify(payload)
    const signature = crypto
      .createHmac('sha256', ENCRYPTION_KEY)
      .update(data)
      .digest('hex')
    
    return Buffer.from(`${data}.${signature}`).toString('base64')
  }

  static verifyAccessToken(token: string): any {
    try {
      const decoded = Buffer.from(token, 'base64').toString()
      const [data, signature] = decoded.split('.')
      
      const expectedSignature = crypto
        .createHmac('sha256', ENCRYPTION_KEY)
        .update(data)
        .digest('hex')
      
      if (signature !== expectedSignature) {
        throw new Error('Invalid token signature')
      }
      
      const payload = JSON.parse(data)
      
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired')
      }
      
      return payload
    } catch (error) {
      console.error('Error verifying access token:', error)
      throw new Error('Invalid access token')
    }
  }
}
