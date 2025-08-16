import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  DocuSignService,
  createDocuSignEnvelope,
  processDocuSignWebhook,
  DocuSignWebhookEvent
} from '@/lib/agreements/docusign'
import { Agreement, AgreementTemplate } from '@/lib/db/models/agreement'
import { Property } from '@/lib/db/models/property'

// Mock environment variables
process.env.DOCUSIGN_BASE_URL = 'https://demo.docusign.net/restapi'
process.env.DOCUSIGN_ACCOUNT_ID = 'test-account-id'
process.env.DOCUSIGN_INTEGRATION_KEY = 'test-integration-key'
process.env.DOCUSIGN_USER_ID = 'test-user-id'
process.env.DOCUSIGN_PRIVATE_KEY = 'test-private-key'
process.env.DOCUSIGN_WEBHOOK_URL = 'https://example.com/api/docusign/webhook'

// Mock fetch globally
global.fetch = vi.fn()

describe('DocuSign Integration', () => {
  let mockAgreement: Agreement
  let mockTemplate: AgreementTemplate
  let mockProperty: Property
  let mockPopulatedContent: string

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockAgreement = {
      id: 'agreement-123',
      templateId: 'template-123',
      propertyId: 'property-123',
      prospectName: 'John Doe',
      prospectEmail: 'john.doe@example.com',
      prospectPhone: '+1234567890',
      status: 'Sent',
      agreementData: {
        tenantName: 'John Doe',
        monthlyRent: '$1,500',
        leaseStartDate: '2024-01-01',
        leaseEndDate: '2024-12-31'
      },
      sentDate: new Date('2024-01-01'),
      expirationDate: new Date('2024-01-15'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }

    mockTemplate = {
      id: 'template-123',
      name: 'Standard Lease Agreement',
      description: 'Standard lease agreement template',
      content: 'This is a lease agreement for {{tenantName}} with rent of {{monthlyRent}}',
      variables: [
        {
          id: 'var-1',
          name: 'tenantName',
          type: 'text',
          label: 'Tenant Name',
          required: true,
          defaultValue: ''
        },
        {
          id: 'var-2',
          name: 'monthlyRent',
          type: 'currency',
          label: 'Monthly Rent',
          required: true,
          defaultValue: ''
        }
      ],
      isActive: true,
      version: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }

    mockProperty = {
      id: 'property-123',
      name: 'Downtown Coliving Space',
      address: {
        street: '123 Main St',
        city: 'Da Nang',
        state: 'Vietnam',
        postalCode: '550000',
        country: 'Vietnam'
      },
      roomCount: 10,
      settings: {
        checkInTime: '15:00',
        checkOutTime: '11:00',
        allowPets: false,
        smokingAllowed: false
      },
      houseRules: ['No smoking', 'No pets'],
      ownerId: 'owner-123',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }

    mockPopulatedContent = 'This is a lease agreement for John Doe with rent of $1,500'
  })

  describe('DocuSignService', () => {
    describe('getAccessToken', () => {
      it('should generate and return access token', async () => {
        const mockResponse = {
          access_token: 'mock-access-token',
          token_type: 'Bearer',
          expires_in: 3600
        }

        ;(fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        } as Response)

        const token = await DocuSignService.getAccessToken()
        
        expect(token).toBe('mock-access-token')
        expect(fetch).toHaveBeenCalledWith(
          'https://demo.docusign.net/restapi/v2.1/oauth/token',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/x-www-form-urlencoded'
            })
          })
        )
      })

      it('should throw error when token request fails', async () => {
        ;(fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized'
        } as Response)

        await expect(DocuSignService.getAccessToken()).rejects.toThrow('Failed to get DocuSign access token')
      })
    })

    describe('createEnvelope', () => {
      it('should create envelope successfully', async () => {
        const mockEnvelopeResponse = {
          envelopeId: 'envelope-123',
          status: 'sent',
          statusDateTime: '2024-01-01T10:00:00Z'
        }

        // Mock access token request
        ;(fetch as any)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'mock-token' })
          } as Response)
          // Mock envelope creation
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockEnvelopeResponse
          } as Response)

        const envelopeData = {
          emailSubject: 'Please sign your lease agreement',
          documents: [{
            documentId: '1',
            name: 'Lease Agreement',
            documentBase64: Buffer.from(mockPopulatedContent).toString('base64')
          }],
          recipients: {
            signers: [{
              email: mockAgreement.prospectEmail,
              name: mockAgreement.prospectName,
              recipientId: '1',
              tabs: {
                signHereTabs: [{
                  documentId: '1',
                  pageNumber: '1',
                  xPosition: '100',
                  yPosition: '100'
                }]
              }
            }]
          },
          status: 'sent'
        }

        const result = await DocuSignService.createEnvelope(envelopeData)
        
        expect(result).toEqual(mockEnvelopeResponse)
        expect(fetch).toHaveBeenCalledTimes(2)
      })

      it('should throw error when envelope creation fails', async () => {
        // Mock access token request
        ;(fetch as any)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'mock-token' })
          } as Response)
          // Mock failed envelope creation
          .mockResolvedValueOnce({
            ok: false,
            status: 400,
            text: async () => 'Bad Request'
          } as Response)

        const envelopeData = {
          emailSubject: 'Test',
          documents: [],
          recipients: { signers: [] },
          status: 'sent'
        }

        await expect(DocuSignService.createEnvelope(envelopeData)).rejects.toThrow('Failed to create DocuSign envelope')
      })
    })

    describe('getEnvelopeStatus', () => {
      it('should get envelope status successfully', async () => {
        const mockStatusResponse = {
          envelopeId: 'envelope-123',
          status: 'completed',
          statusDateTime: '2024-01-01T12:00:00Z'
        }

        // Mock access token and status requests
        ;(fetch as any)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'mock-token' })
          } as Response)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockStatusResponse
          } as Response)

        const result = await DocuSignService.getEnvelopeStatus('envelope-123')
        
        expect(result).toEqual(mockStatusResponse)
      })
    })

    describe('downloadSignedDocument', () => {
      it('should download signed document successfully', async () => {
        const mockDocumentBuffer = Buffer.from('signed document content')

        // Mock access token and document download
        ;(fetch as any)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'mock-token' })
          } as Response)
          .mockResolvedValueOnce({
            ok: true,
            arrayBuffer: async () => mockDocumentBuffer
          } as Response)

        const result = await DocuSignService.downloadSignedDocument('envelope-123', '1')
        
        expect(result).toEqual(mockDocumentBuffer)
      })
    })
  })

  describe('createDocuSignEnvelope', () => {
    it('should create envelope with correct data', async () => {
      const mockEnvelopeResponse = {
        envelopeId: 'envelope-123',
        status: 'sent',
        statusDateTime: '2024-01-01T10:00:00Z'
      }

      // Mock DocuSign service
      const createEnvelopeSpy = vi.spyOn(DocuSignService, 'createEnvelope')
        .mockResolvedValue(mockEnvelopeResponse)

      const result = await createDocuSignEnvelope(
        mockAgreement,
        mockTemplate,
        mockProperty,
        mockPopulatedContent
      )

      expect(result).toEqual(mockEnvelopeResponse)
      expect(createEnvelopeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          emailSubject: `Lease Agreement for ${mockProperty.name}`,
          documents: expect.arrayContaining([
            expect.objectContaining({
              documentId: '1',
              name: 'Lease Agreement',
              documentBase64: expect.any(String)
            })
          ]),
          recipients: expect.objectContaining({
            signers: expect.arrayContaining([
              expect.objectContaining({
                email: mockAgreement.prospectEmail,
                name: mockAgreement.prospectName,
                recipientId: '1'
              })
            ])
          }),
          status: 'sent'
        })
      )

      createEnvelopeSpy.mockRestore()
    })

    it('should throw error for invalid agreement data', async () => {
      const invalidAgreement = { ...mockAgreement, prospectEmail: '' }

      await expect(
        createDocuSignEnvelope(invalidAgreement, mockTemplate, mockProperty, mockPopulatedContent)
      ).rejects.toThrow('Invalid agreement data for DocuSign envelope')
    })
  })

  describe('processDocuSignWebhook', () => {
    it('should process webhook event successfully', async () => {
      const mockWebhookEvent: DocuSignWebhookEvent = {
        event: 'envelope-completed',
        apiVersion: '2.1',
        uri: '/restapi/v2.1/accounts/test-account/envelopes/envelope-123',
        retryCount: 0,
        configurationId: 'config-123',
        generatedDateTime: '2024-01-01T12:00:00Z',
        data: {
          accountId: 'test-account',
          envelopeId: 'envelope-123',
          envelopeSummary: {
            status: 'completed',
            documentsUri: '/documents',
            recipientsUri: '/recipients',
            attachmentsUri: '/attachments',
            envelopeUri: '/envelopes/envelope-123',
            emailSubject: 'Please sign your lease agreement',
            envelopeId: 'envelope-123',
            signingLocation: 'online',
            customFieldsUri: '/custom_fields',
            notificationUri: '/notification',
            enableWetSign: 'false',
            allowMarkup: 'false',
            allowReassign: 'false',
            createdDateTime: '2024-01-01T10:00:00Z',
            lastModifiedDateTime: '2024-01-01T12:00:00Z',
            initialSentDateTime: '2024-01-01T10:00:00Z',
            sentDateTime: '2024-01-01T10:00:00Z',
            completedDateTime: '2024-01-01T12:00:00Z',
            statusChangedDateTime: '2024-01-01T12:00:00Z',
            documentsCombinedUri: '/documents/combined',
            certificateUri: '/documents/certificate',
            templatesUri: '/templates'
          }
        }
      }

      // Mock console.log to verify logging
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await processDocuSignWebhook(mockWebhookEvent)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Processing DocuSign webhook:',
        expect.objectContaining({
          event: 'envelope-completed',
          envelopeId: 'envelope-123',
          status: 'completed'
        })
      )

      consoleSpy.mockRestore()
    })

    it('should handle webhook processing errors gracefully', async () => {
      const invalidWebhookEvent = {} as DocuSignWebhookEvent

      // Mock console.error to verify error logging
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(processDocuSignWebhook(invalidWebhookEvent)).rejects.toThrow()
      
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Integration scenarios', () => {
    it('should handle complete signing workflow', async () => {
      // 1. Create envelope
      const mockEnvelopeResponse = {
        envelopeId: 'envelope-123',
        status: 'sent',
        statusDateTime: '2024-01-01T10:00:00Z'
      }

      const createEnvelopeSpy = vi.spyOn(DocuSignService, 'createEnvelope')
        .mockResolvedValue(mockEnvelopeResponse)

      const envelope = await createDocuSignEnvelope(
        mockAgreement,
        mockTemplate,
        mockProperty,
        mockPopulatedContent
      )

      expect(envelope.envelopeId).toBe('envelope-123')

      // 2. Process completion webhook
      const completionEvent: DocuSignWebhookEvent = {
        event: 'envelope-completed',
        apiVersion: '2.1',
        uri: '/restapi/v2.1/accounts/test-account/envelopes/envelope-123',
        retryCount: 0,
        configurationId: 'config-123',
        generatedDateTime: '2024-01-01T12:00:00Z',
        data: {
          accountId: 'test-account',
          envelopeId: 'envelope-123',
          envelopeSummary: {
            status: 'completed',
            documentsUri: '/documents',
            recipientsUri: '/recipients',
            attachmentsUri: '/attachments',
            envelopeUri: '/envelopes/envelope-123',
            emailSubject: 'Please sign your lease agreement',
            envelopeId: 'envelope-123',
            signingLocation: 'online',
            customFieldsUri: '/custom_fields',
            notificationUri: '/notification',
            enableWetSign: 'false',
            allowMarkup: 'false',
            allowReassign: 'false',
            createdDateTime: '2024-01-01T10:00:00Z',
            lastModifiedDateTime: '2024-01-01T12:00:00Z',
            initialSentDateTime: '2024-01-01T10:00:00Z',
            sentDateTime: '2024-01-01T10:00:00Z',
            completedDateTime: '2024-01-01T12:00:00Z',
            statusChangedDateTime: '2024-01-01T12:00:00Z',
            documentsCombinedUri: '/documents/combined',
            certificateUri: '/documents/certificate',
            templatesUri: '/templates'
          }
        }
      }

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      await processDocuSignWebhook(completionEvent)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Processing DocuSign webhook:',
        expect.objectContaining({
          event: 'envelope-completed',
          envelopeId: 'envelope-123',
          status: 'completed'
        })
      )

      createEnvelopeSpy.mockRestore()
      consoleSpy.mockRestore()
    })

    it('should handle envelope decline workflow', async () => {
      const declineEvent: DocuSignWebhookEvent = {
        event: 'envelope-declined',
        apiVersion: '2.1',
        uri: '/restapi/v2.1/accounts/test-account/envelopes/envelope-123',
        retryCount: 0,
        configurationId: 'config-123',
        generatedDateTime: '2024-01-01T12:00:00Z',
        data: {
          accountId: 'test-account',
          envelopeId: 'envelope-123',
          envelopeSummary: {
            status: 'declined',
            documentsUri: '/documents',
            recipientsUri: '/recipients',
            attachmentsUri: '/attachments',
            envelopeUri: '/envelopes/envelope-123',
            emailSubject: 'Please sign your lease agreement',
            envelopeId: 'envelope-123',
            signingLocation: 'online',
            customFieldsUri: '/custom_fields',
            notificationUri: '/notification',
            enableWetSign: 'false',
            allowMarkup: 'false',
            allowReassign: 'false',
            createdDateTime: '2024-01-01T10:00:00Z',
            lastModifiedDateTime: '2024-01-01T12:00:00Z',
            initialSentDateTime: '2024-01-01T10:00:00Z',
            sentDateTime: '2024-01-01T10:00:00Z',
            declinedDateTime: '2024-01-01T12:00:00Z',
            statusChangedDateTime: '2024-01-01T12:00:00Z',
            documentsCombinedUri: '/documents/combined',
            certificateUri: '/documents/certificate',
            templatesUri: '/templates'
          }
        }
      }

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      await processDocuSignWebhook(declineEvent)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'DocuSign webhook: Envelope envelope-123 status changed to declined'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      ;(fetch as any).mockRejectedValue(new Error('Network error'))

      await expect(DocuSignService.getAccessToken()).rejects.toThrow('Network error')
    })

    it('should handle malformed webhook events', async () => {
      const malformedEvent = {
        event: 'envelope-completed'
        // Missing required fields
      } as DocuSignWebhookEvent

      await expect(processDocuSignWebhook(malformedEvent)).rejects.toThrow()
    })
  })
})
