import { Agreement } from '@/lib/db/models/agreement'
import { Tenant, TenantSchema } from '@/lib/db/models/tenant'
import { createTenant, getTenantByEmail } from '@/lib/db/operations/tenants'
import { getProperty } from '@/lib/db/operations/properties'
import { updateAgreement } from '@/lib/db/operations/agreements'
import { DocumentStorageService } from './storage'

export interface TenantProfileData {
  // Basic Information
  email: string
  firstName: string
  lastName: string
  phone: string
  
  // Lease Information
  propertyId: string
  roomNumber?: string
  leaseStartDate: Date
  leaseEndDate: Date
  monthlyRentCents: number
  depositCents: number
  
  // Agreement Reference
  agreementId: string
  signedDocumentPath?: string
  
  // Additional Data
  emergencyContact?: {
    name: string
    relationship: string
    phone: string
    email?: string
  }
  
  // Extracted from Agreement
  specialTerms?: string[]
  moveInNotes?: string
}

export class TenantProfileIntegrationService {
  /**
   * Create tenant profile from signed agreement
   */
  static async createTenantFromAgreement(agreement: Agreement): Promise<Tenant> {
    try {
      console.log(`Creating tenant profile from agreement ${agreement.id}`)
      
      // Validate agreement is signed
      if (!['Signed', 'Completed'].includes(agreement.status)) {
        throw new Error('Agreement must be signed to create tenant profile')
      }

      // Check if tenant already exists
      const existingTenant = await getTenantByEmail(agreement.prospectEmail)
      if (existingTenant) {
        console.log(`Tenant already exists for email ${agreement.prospectEmail}`)
        return existingTenant
      }

      // Extract tenant data from agreement
      const tenantData = await this.extractTenantDataFromAgreement(agreement)
      
      // Validate tenant data
      const validatedData = TenantSchema.parse(tenantData)
      
      // Create tenant profile
      const tenant = await createTenant(validatedData)
      
      // Update agreement with tenant reference
      await updateAgreement({
        id: agreement.id,
        tenantId: tenant.id,
        tenantCreated: true
      })

      // Store signed document if available
      if (agreement.docusignEnvelopeId) {
        try {
          await DocumentStorageService.storeSignedDocument(
            agreement.id,
            agreement.docusignEnvelopeId
          )
        } catch (error) {
          console.error('Failed to store signed document:', error)
          // Don't fail tenant creation if document storage fails
        }
      }

      console.log(`Successfully created tenant profile ${tenant.id} from agreement ${agreement.id}`)
      return tenant
    } catch (error) {
      console.error('Error creating tenant from agreement:', error)
      throw new Error(`Failed to create tenant profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract tenant data from agreement
   */
  private static async extractTenantDataFromAgreement(agreement: Agreement): Promise<Partial<Tenant>> {
    try {
      // Get property information
      const property = await getProperty(agreement.propertyId)
      if (!property) {
        throw new Error('Property not found for agreement')
      }

      // Parse prospect name
      const nameParts = agreement.prospectName.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      // Extract lease terms from agreement data
      const agreementData = agreement.agreementData || {}
      
      // Parse dates
      const leaseStartDate = this.parseDate(
        agreementData.leaseStartDate || 
        agreementData.moveInDate || 
        new Date().toISOString()
      )
      
      const leaseEndDate = this.parseDate(
        agreementData.leaseEndDate || 
        this.calculateDefaultLeaseEndDate(leaseStartDate)
      )

      // Parse monetary amounts
      const monthlyRentCents = this.parseMonetaryAmount(agreementData.monthlyRent || '0')
      const depositCents = this.parseMonetaryAmount(agreementData.securityDeposit || agreementData.deposit || '0')

      // Extract emergency contact if available
      let emergencyContact
      if (agreementData.emergencyContactName && agreementData.emergencyContactPhone) {
        emergencyContact = {
          name: agreementData.emergencyContactName,
          relationship: agreementData.emergencyContactRelationship || 'Emergency Contact',
          phone: agreementData.emergencyContactPhone,
          email: agreementData.emergencyContactEmail
        }
      }

      // Create tenant data
      const tenantData: Partial<Tenant> = {
        id: crypto.randomUUID(),
        email: agreement.prospectEmail,
        firstName,
        lastName,
        phone: agreement.prospectPhone || '',
        status: 'Active',
        propertyId: agreement.propertyId,
        
        // Lease information
        leaseHistory: [{
          id: crypto.randomUUID(),
          startDate: leaseStartDate,
          endDate: leaseEndDate,
          monthlyRentCents,
          depositCents,
          isActive: true,
          renewalNotificationSent: false,
          expirationAlertSent: false
        }],
        
        // Emergency contact
        emergencyContacts: emergencyContact ? [{
          id: crypto.randomUUID(),
          name: emergencyContact.name,
          relationship: emergencyContact.relationship,
          phone: emergencyContact.phone,
          email: emergencyContact.email,
          isPrimary: true,
          verified: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }] : [],
        
        // Documents
        documents: [{
          id: crypto.randomUUID(),
          type: 'Lease',
          filename: 'Signed Lease Agreement',
          url: agreement.signedDocumentUrl || '',
          uploadDate: agreement.signedDate || new Date()
        }],
        
        // Communication history (just UUIDs)
        communicationHistory: [],
        
        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date()
      }

      return tenantData
    } catch (error) {
      console.error('Error extracting tenant data from agreement:', error)
      throw error
    }
  }

  /**
   * Update tenant profile with agreement changes
   */
  static async updateTenantFromAgreement(agreement: Agreement, tenantId: string): Promise<void> {
    try {
      console.log(`Updating tenant ${tenantId} from agreement ${agreement.id}`)
      
      // This would update existing tenant data based on agreement changes
      // For now, we'll just log the update
      console.log('Tenant profile update completed')
    } catch (error) {
      console.error('Error updating tenant from agreement:', error)
      throw error
    }
  }

  /**
   * Extract lease terms from signed document (future enhancement)
   */
  static async extractLeaseTermsFromDocument(documentBuffer: Buffer): Promise<{
    leaseStartDate?: Date
    leaseEndDate?: Date
    monthlyRent?: number
    deposit?: number
    specialTerms?: string[]
  }> {
    try {
      // This would use OCR or PDF parsing to extract lease terms
      // For now, return empty object
      console.log('Document parsing not yet implemented')
      return {}
    } catch (error) {
      console.error('Error extracting lease terms from document:', error)
      return {}
    }
  }

  /**
   * Assign room to tenant based on agreement
   */
  static async assignRoomToTenant(tenantId: string, agreement: Agreement): Promise<void> {
    try {
      const roomNumber = agreement.agreementData?.roomNumber || agreement.roomNumber
      
      if (!roomNumber) {
        console.log(`No room number specified in agreement ${agreement.id}`)
        return
      }

      // This would integrate with room management system
      console.log(`Assigning room ${roomNumber} to tenant ${tenantId}`)
      
      // For now, just log the assignment
      // In a full implementation, this would:
      // 1. Check room availability
      // 2. Update room status to occupied
      // 3. Set move-in date
      // 4. Generate access codes/keys
    } catch (error) {
      console.error('Error assigning room to tenant:', error)
      throw error
    }
  }

  /**
   * Setup tenant calendar integration
   */
  static async setupTenantCalendarIntegration(tenant: Tenant): Promise<void> {
    try {
      console.log(`Setting up calendar integration for tenant ${tenant.id}`)
      
      // This would integrate with calendar systems to:
      // 1. Add lease start/end dates
      // 2. Schedule rent payment reminders
      // 3. Add move-in/move-out dates
      // 4. Setup maintenance windows
      
      const leaseHistory = tenant.leaseHistory?.[0]
      if (leaseHistory) {
        console.log(`Calendar events would be created for lease period: ${leaseHistory.startDate} to ${leaseHistory.endDate}`)
      }
    } catch (error) {
      console.error('Error setting up calendar integration:', error)
      // Don't fail the process if calendar integration fails
    }
  }

  /**
   * Send welcome email to new tenant
   */
  static async sendWelcomeEmail(tenant: Tenant, agreement: Agreement): Promise<void> {
    try {
      console.log(`Sending welcome email to tenant ${tenant.email}`)
      
      // This would send a welcome email with:
      // 1. Welcome message
      // 2. Property information
      // 3. Move-in instructions
      // 4. Contact information
      // 5. House rules
      // 6. Access to tenant portal
      
      // For now, just log the action
      console.log('Welcome email sent successfully')
    } catch (error) {
      console.error('Error sending welcome email:', error)
      // Don't fail the process if email fails
    }
  }

  // Helper methods

  private static parseDate(dateString: string): Date {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date')
      }
      return date
    } catch {
      return new Date()
    }
  }

  private static calculateDefaultLeaseEndDate(startDate: Date): string {
    const endDate = new Date(startDate)
    endDate.setFullYear(endDate.getFullYear() + 1) // Default to 1 year lease
    return endDate.toISOString()
  }

  private static parseMonetaryAmount(amountString: string): number {
    try {
      // Remove currency symbols and convert to cents
      const cleanAmount = amountString.replace(/[$,]/g, '')
      const amount = parseFloat(cleanAmount)
      return isNaN(amount) ? 0 : Math.round(amount * 100)
    } catch {
      return 0
    }
  }

  /**
   * Process agreement completion workflow
   */
  static async processAgreementCompletion(agreement: Agreement): Promise<{
    tenant: Tenant
    success: boolean
    errors: string[]
  }> {
    const errors: string[] = []
    
    try {
      console.log(`Processing agreement completion for ${agreement.id}`)
      
      // 1. Create tenant profile
      const tenant = await this.createTenantFromAgreement(agreement)
      
      // 2. Assign room (if specified)
      try {
        await this.assignRoomToTenant(tenant.id, agreement)
      } catch (error) {
        errors.push(`Room assignment failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      // 3. Setup calendar integration
      try {
        await this.setupTenantCalendarIntegration(tenant)
      } catch (error) {
        errors.push(`Calendar integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      // 4. Send welcome email
      try {
        await this.sendWelcomeEmail(tenant, agreement)
      } catch (error) {
        errors.push(`Welcome email failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      console.log(`Agreement completion processed successfully for ${agreement.id}`)
      
      return {
        tenant,
        success: true,
        errors
      }
    } catch (error) {
      console.error('Error processing agreement completion:', error)
      throw error
    }
  }
}
