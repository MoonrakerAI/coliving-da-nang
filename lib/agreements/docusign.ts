import { Agreement, AgreementTemplate } from '@/lib/db/models/agreement'
import { Property } from '@/lib/db/models/property'

// DocuSign API configuration
const DOCUSIGN_BASE_URL = process.env.DOCUSIGN_BASE_URL || 'https://demo.docusign.net/restapi'
const DOCUSIGN_ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID
const DOCUSIGN_INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY
const DOCUSIGN_USER_ID = process.env.DOCUSIGN_USER_ID
const DOCUSIGN_PRIVATE_KEY = process.env.DOCUSIGN_PRIVATE_KEY
const DOCUSIGN_WEBHOOK_URL = process.env.DOCUSIGN_WEBHOOK_URL

// DocuSign API interfaces
export interface DocuSignEnvelopeRequest {
  emailSubject: string
  emailBlurb: string
  documents: DocuSignDocument[]
  recipients: DocuSignRecipients
  status: 'sent' | 'created'
  eventNotification?: DocuSignEventNotification
}

export interface DocuSignDocument {
  documentBase64: string
  documentId: string
  fileExtension: string
  name: string
}

export interface DocuSignRecipients {
  signers: DocuSignSigner[]
}

export interface DocuSignSigner {
  email: string
  name: string
  recipientId: string
  routingOrder: string
  tabs?: DocuSignTabs
}

export interface DocuSignTabs {
  signHereTabs?: DocuSignSignHereTab[]
  dateSignedTabs?: DocuSignDateSignedTab[]
  textTabs?: DocuSignTextTab[]
}

export interface DocuSignSignHereTab {
  documentId: string
  pageNumber: string
  xPosition: string
  yPosition: string
  tabLabel?: string
}

export interface DocuSignDateSignedTab {
  documentId: string
  pageNumber: string
  xPosition: string
  yPosition: string
  tabLabel?: string
}

export interface DocuSignTextTab {
  documentId: string
  pageNumber: string
  xPosition: string
  yPosition: string
  tabLabel: string
  value?: string
  locked?: boolean
}

export interface DocuSignEventNotification {
  url: string
  loggingEnabled: boolean
  requireAcknowledgment: boolean
  envelopeEvents: DocuSignEnvelopeEvent[]
}

export interface DocuSignEnvelopeEvent {
  envelopeEventStatusCode: string
}

export interface DocuSignEnvelopeResponse {
  envelopeId: string
  status: string
  statusDateTime: string
  uri: string
}

export interface DocuSignWebhookEvent {
  event: string
  apiVersion: string
  uri: string
  retryCount: number
  configurationId: number
  generatedDateTime: string
  data: {
    accountId: string
    userId: string
    envelopeId: string
    envelopeSummary: {
      status: string
      documentsUri: string
      recipientsUri: string
      envelopeId: string
      customFieldsUri: string
      notificationUri: string
      enableWetSign: boolean
      allowMarkup: boolean
      allowReassign: boolean
      createdDateTime: string
      lastModifiedDateTime: string
      deliveredDateTime?: string
      sentDateTime?: string
      completedDateTime?: string
      statusChangedDateTime: string
      emailSubject: string
    }
  }
}

export class DocuSignService {
  private static accessToken: string | null = null
  private static tokenExpiry: Date | null = null

  // Get OAuth access token using JWT
  static async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken
    }

    try {
      const jwt = await this.generateJWT()
      
      const response = await fetch(`${DOCUSIGN_BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt
        })
      })

      if (!response.ok) {
        throw new Error(`DocuSign OAuth failed: ${response.statusText}`)
      }

      const data = await response.json()
      this.accessToken = data.access_token
      this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000))
      
      return this.accessToken
    } catch (error) {
      console.error('Error getting DocuSign access token:', error)
      throw error
    }
  }

  // Generate JWT for OAuth
  private static async generateJWT(): Promise<string> {
    // In a real implementation, you would use a proper JWT library
    // This is a simplified version for demonstration
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    }

    const payload = {
      iss: DOCUSIGN_INTEGRATION_KEY,
      sub: DOCUSIGN_USER_ID,
      aud: 'account-d.docusign.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      scope: 'signature impersonation'
    }

    // This would normally use crypto.sign with the private key
    // For demo purposes, return a placeholder
    return 'jwt_token_placeholder'
  }

  // Create and send envelope
  static async createEnvelope(
    agreement: Agreement,
    template: AgreementTemplate,
    property: Property,
    documentContent: string
  ): Promise<DocuSignEnvelopeResponse> {
    try {
      const accessToken = await this.getAccessToken()
      
      // Convert document content to base64
      const documentBase64 = Buffer.from(documentContent).toString('base64')
      
      const envelopeRequest: DocuSignEnvelopeRequest = {
        emailSubject: `Lease Agreement - ${property.name}`,
        emailBlurb: `Please review and sign your lease agreement for ${property.name}.`,
        status: 'sent',
        documents: [{
          documentBase64,
          documentId: '1',
          fileExtension: 'pdf',
          name: `Lease Agreement - ${property.name}.pdf`
        }],
        recipients: {
          signers: [{
            email: agreement.prospectEmail,
            name: agreement.prospectName,
            recipientId: '1',
            routingOrder: '1',
            tabs: this.generateSigningTabs()
          }]
        },
        eventNotification: {
          url: `${DOCUSIGN_WEBHOOK_URL}/api/docusign/webhook`,
          loggingEnabled: true,
          requireAcknowledgment: true,
          envelopeEvents: [
            { envelopeEventStatusCode: 'sent' },
            { envelopeEventStatusCode: 'delivered' },
            { envelopeEventStatusCode: 'completed' },
            { envelopeEventStatusCode: 'declined' },
            { envelopeEventStatusCode: 'voided' }
          ]
        }
      }

      const response = await fetch(
        `${DOCUSIGN_BASE_URL}/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(envelopeRequest)
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`DocuSign envelope creation failed: ${errorData.message || response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating DocuSign envelope:', error)
      throw error
    }
  }

  // Generate signing tabs for the document
  private static generateSigningTabs(): DocuSignTabs {
    return {
      signHereTabs: [
        {
          documentId: '1',
          pageNumber: '1',
          xPosition: '100',
          yPosition: '700',
          tabLabel: 'TenantSignature'
        }
      ],
      dateSignedTabs: [
        {
          documentId: '1',
          pageNumber: '1',
          xPosition: '300',
          yPosition: '700',
          tabLabel: 'TenantSignDate'
        }
      ]
    }
  }

  // Get envelope status
  static async getEnvelopeStatus(envelopeId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken()
      
      const response = await fetch(
        `${DOCUSIGN_BASE_URL}/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes/${envelopeId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to get envelope status: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting envelope status:', error)
      throw error
    }
  }

  // Get signed document
  static async getSignedDocument(envelopeId: string, documentId: string = '1'): Promise<Buffer> {
    try {
      const accessToken = await this.getAccessToken()
      
      const response = await fetch(
        `${DOCUSIGN_BASE_URL}/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes/${envelopeId}/documents/${documentId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to get signed document: ${response.statusText}`)
      }

      return Buffer.from(await response.arrayBuffer())
    } catch (error) {
      console.error('Error getting signed document:', error)
      throw error
    }
  }

  // Get envelope recipients
  static async getEnvelopeRecipients(envelopeId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken()
      
      const response = await fetch(
        `${DOCUSIGN_BASE_URL}/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes/${envelopeId}/recipients`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to get envelope recipients: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting envelope recipients:', error)
      throw error
    }
  }

  // Void envelope
  static async voidEnvelope(envelopeId: string, reason: string): Promise<void> {
    try {
      const accessToken = await this.getAccessToken()
      
      const response = await fetch(
        `${DOCUSIGN_BASE_URL}/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes/${envelopeId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'voided',
            voidedReason: reason
          })
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to void envelope: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error voiding envelope:', error)
      throw error
    }
  }

  // Process webhook event
  static async processWebhookEvent(event: DocuSignWebhookEvent): Promise<void> {
    try {
      const { envelopeId } = event.data
      const status = event.data.envelopeSummary.status

      console.log(`DocuSign webhook: Envelope ${envelopeId} status changed to ${status}`)

      // Handle different envelope statuses
      switch (status.toLowerCase()) {
        case 'sent':
          // Envelope was sent to recipient
          break
        case 'delivered':
          // Envelope was delivered to recipient's email
          break
        case 'completed':
          // All recipients have signed
          await this.handleEnvelopeCompleted(envelopeId)
          break
        case 'declined':
          // Recipient declined to sign
          await this.handleEnvelopeDeclined(envelopeId)
          break
        case 'voided':
          // Envelope was voided
          await this.handleEnvelopeVoided(envelopeId)
          break
        default:
          console.log(`Unhandled envelope status: ${status}`)
      }
    } catch (error) {
      console.error('Error processing DocuSign webhook:', error)
      throw error
    }
  }

  private static async handleEnvelopeCompleted(envelopeId: string): Promise<void> {
    // This would update the agreement status and trigger completion workflow
    console.log(`Envelope ${envelopeId} completed - updating agreement status`)
  }

  private static async handleEnvelopeDeclined(envelopeId: string): Promise<void> {
    // This would update the agreement status and notify property owner
    console.log(`Envelope ${envelopeId} declined - updating agreement status`)
  }

  private static async handleEnvelopeVoided(envelopeId: string): Promise<void> {
    // This would update the agreement status
    console.log(`Envelope ${envelopeId} voided - updating agreement status`)
  }

  // Test DocuSign connection
  static async testConnection(): Promise<boolean> {
    try {
      await this.getAccessToken()
      
      // Test API call to get account info
      const response = await fetch(
        `${DOCUSIGN_BASE_URL}/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return response.ok
    } catch (error) {
      console.error('DocuSign connection test failed:', error)
      return false
    }
  }
}

// Utility functions for external use
export async function createDocuSignEnvelope(
  agreement: Agreement,
  template: AgreementTemplate,
  property: Property,
  documentContent: string
): Promise<DocuSignEnvelopeResponse> {
  return DocuSignService.createEnvelope(agreement, template, property, documentContent)
}

export async function getDocuSignEnvelopeStatus(envelopeId: string): Promise<any> {
  return DocuSignService.getEnvelopeStatus(envelopeId)
}

export async function getDocuSignSignedDocument(envelopeId: string): Promise<Buffer> {
  return DocuSignService.getSignedDocument(envelopeId)
}

export async function processDocuSignWebhook(event: DocuSignWebhookEvent): Promise<void> {
  return DocuSignService.processWebhookEvent(event)
}

export async function testDocuSignConnection(): Promise<boolean> {
  return DocuSignService.testConnection()
}
