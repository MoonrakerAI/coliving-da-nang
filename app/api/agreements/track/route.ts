import { NextRequest, NextResponse } from 'next/server'
import { 
  getAllAgreements,
  getAgreementTemplate,
} from '@/lib/db/operations/agreements'
import { getProperty } from '@/lib/db/operations/properties'
import { requireAuth } from '@/lib/auth-config'

// GET /api/agreements/track - Get all agreements with tracking details
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all agreements
    const agreements = await getAllAgreements()
    
    // Enrich agreements with additional details
    const enrichedAgreements = await Promise.all(
      agreements.map(async (agreement) => {
        try {
          // Get template and property details
          const [template, property] = await Promise.all([
            getAgreementTemplate(agreement.templateId),
            getProperty(agreement.propertyId)
          ])

          // Calculate days until expiry
          const now = new Date()
          const expiryDate = new Date(agreement.expirationDate)
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

          // Determine last status change date
          let lastStatusChange = new Date(agreement.sentDate)
          if (agreement.viewedDate && new Date(agreement.viewedDate) > lastStatusChange) {
            lastStatusChange = new Date(agreement.viewedDate)
          }
          if (agreement.signedDate && new Date(agreement.signedDate) > lastStatusChange) {
            lastStatusChange = new Date(agreement.signedDate)
          }
          if (agreement.completedDate && new Date(agreement.completedDate) > lastStatusChange) {
            lastStatusChange = new Date(agreement.completedDate)
          }

          return {
            ...agreement,
            templateName: template?.name || 'Unknown Template',
            propertyName: property?.name || 'Unknown Property',
            daysUntilExpiry,
            lastStatusChange
          }
        } catch (error) {
          console.error(`Error enriching agreement ${agreement.id}:`, error)
          
          // Return basic agreement data if enrichment fails
          return {
            ...agreement,
            templateName: 'Unknown Template',
            propertyName: 'Unknown Property',
            daysUntilExpiry: 0,
            lastStatusChange: new Date(agreement.sentDate)
          }
        }
      })
    )

    // Calculate summary statistics
    const statusCounts = enrichedAgreements.reduce((acc, agreement) => {
      acc[agreement.status] = (acc[agreement.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const urgentAgreements = enrichedAgreements.filter(
      agreement => 
        ['Sent', 'Viewed'].includes(agreement.status) && 
        agreement.daysUntilExpiry <= 3
    )

    const expiredAgreements = enrichedAgreements.filter(
      agreement => agreement.daysUntilExpiry < 0 && !['Signed', 'Completed', 'Cancelled'].includes(agreement.status)
    )

    return NextResponse.json({
      agreements: enrichedAgreements,
      summary: {
        total: enrichedAgreements.length,
        statusCounts,
        urgent: urgentAgreements.length,
        expired: expiredAgreements.length,
        completionRate: enrichedAgreements.length > 0 
          ? Math.round(((statusCounts['Signed'] || 0) + (statusCounts['Completed'] || 0)) / enrichedAgreements.length * 100)
          : 0
      }
    })
  } catch (error) {
    console.error('Error tracking agreements:', error)
    return NextResponse.json(
      { error: 'Failed to load agreement tracking data' },
      { status: 500 }
    )
  }
}
