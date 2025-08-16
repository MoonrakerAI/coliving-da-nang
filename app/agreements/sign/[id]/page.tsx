'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Clock, 
  Building, 
  User, 
  Mail,
  Phone,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { Agreement } from '@/lib/db/models/agreement'

interface AgreementSigningData {
  agreement: Agreement
  template: any
  property: any
  populatedContent: string
  docusignUrl?: string
}

export default function AgreementSigningPage() {
  const params = useParams()
  const agreementId = params.id as string
  
  const [data, setData] = useState<AgreementSigningData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initiatingSign, setInitiatingSign] = useState(false)

  useEffect(() => {
    loadAgreementData()
  }, [agreementId])

  const loadAgreementData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/agreements/${agreementId}/sign`)
      
      if (response.ok) {
        const agreementData = await response.json()
        setData(agreementData)
        
        // Mark as viewed if not already
        if (agreementData.agreement.status === 'Sent') {
          await fetch(`/api/agreements/${agreementId}/viewed`, { method: 'POST' })
        }
      } else if (response.status === 404) {
        setError('Agreement not found or has expired')
      } else if (response.status === 410) {
        setError('This agreement has already been signed or is no longer available')
      } else {
        setError('Failed to load agreement')
      }
    } catch (error) {
      console.error('Error loading agreement:', error)
      setError('Failed to load agreement')
    } finally {
      setLoading(false)
    }
  }

  const initiateDocuSignSigning = async () => {
    try {
      setInitiatingSign(true)
      
      const response = await fetch(`/api/agreements/${agreementId}/docusign`, {
        method: 'POST'
      })
      
      if (response.ok) {
        const { signingUrl } = await response.json()
        
        // Redirect to DocuSign signing URL
        window.location.href = signingUrl
      } else {
        const error = await response.json()
        setError(error.message || 'Failed to initiate signing process')
      }
    } catch (error) {
      console.error('Error initiating DocuSign signing:', error)
      setError('Failed to initiate signing process')
    } finally {
      setInitiatingSign(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'viewed': return 'bg-yellow-100 text-yellow-800'
      case 'signed': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-2xl mx-auto p-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Unable to Load Agreement</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const { agreement, template, property, populatedContent } = data
  const isExpired = new Date() > new Date(agreement.expirationDate)
  const isAlreadySigned = ['Signed', 'Completed'].includes(agreement.status)
  const canSign = !isExpired && !isAlreadySigned && ['Sent', 'Viewed'].includes(agreement.status)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Digital Lease Agreement</h1>
          <p className="text-gray-600">
            Please review and sign your lease agreement for {property.name}
          </p>
        </div>

        {/* Status Banner */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={getStatusColor(agreement.status)}>
                  {agreement.status}
                </Badge>
                <span className="text-sm text-gray-600">
                  Agreement ID: {agreement.id.slice(0, 8)}...
                </span>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div>Expires: {new Date(agreement.expirationDate).toLocaleDateString()}</div>
                <div>at {new Date(agreement.expirationDate).toLocaleTimeString()}</div>
              </div>
            </div>
            
            {isExpired && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">
                  ⚠️ This agreement has expired. Please contact the property owner for a new agreement.
                </p>
              </div>
            )}
            
            {isAlreadySigned && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">
                  ✅ This agreement has been successfully signed and completed.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agreement Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Property Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <strong>Property:</strong> {property.name}
                </div>
                <div>
                  <strong>Address:</strong> {property.address ? 
                    `${property.address.street}, ${property.address.city}, ${property.address.state} ${property.address.postalCode}` 
                    : 'Address not available'}
                </div>
                {agreement.roomNumber && (
                  <div>
                    <strong>Room:</strong> {agreement.roomNumber}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lease Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Lease Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {agreement.leaseStartDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span><strong>Start Date:</strong> {new Date(agreement.leaseStartDate).toLocaleDateString()}</span>
                  </div>
                )}
                {agreement.leaseEndDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span><strong>End Date:</strong> {new Date(agreement.leaseEndDate).toLocaleDateString()}</span>
                  </div>
                )}
                {agreement.monthlyRentCents && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span><strong>Monthly Rent:</strong> {formatCurrency(agreement.monthlyRentCents)}</span>
                  </div>
                )}
                {agreement.depositCents && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span><strong>Security Deposit:</strong> {formatCurrency(agreement.depositCents)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Agreement Content */}
            <Card>
              <CardHeader>
                <CardTitle>Agreement Content</CardTitle>
                <CardDescription>
                  Please review the complete agreement below
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white border rounded-lg p-6 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                    {populatedContent}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tenant Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Your Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>{agreement.prospectName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{agreement.prospectEmail}</span>
                </div>
                {agreement.prospectPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{agreement.prospectPhone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Signing Action */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Digital Signature
                </CardTitle>
                <CardDescription>
                  Sign your agreement securely with DocuSign
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {canSign ? (
                  <>
                    <div className="text-sm text-gray-600 space-y-2">
                      <p>✓ Industry-standard security</p>
                      <p>✓ Legally binding signature</p>
                      <p>✓ Mobile-friendly signing</p>
                      <p>✓ Instant completion</p>
                    </div>
                    
                    <Button 
                      onClick={initiateDocuSignSigning}
                      disabled={initiatingSign}
                      className="w-full"
                      size="lg"
                    >
                      {initiatingSign ? (
                        'Preparing Signature...'
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Sign with DocuSign
                        </>
                      )}
                    </Button>
                    
                    <p className="text-xs text-gray-500 text-center">
                      You'll be redirected to DocuSign's secure signing platform
                    </p>
                  </>
                ) : (
                  <div className="text-center text-gray-500">
                    {isExpired ? (
                      <p>Agreement has expired</p>
                    ) : isAlreadySigned ? (
                      <p>Agreement already signed</p>
                    ) : (
                      <p>Agreement not available for signing</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Sent: {new Date(agreement.sentDate).toLocaleDateString()}</span>
                  </div>
                  
                  {agreement.viewedDate && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Viewed: {new Date(agreement.viewedDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {agreement.signedDate && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Signed: {new Date(agreement.signedDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {agreement.completedDate && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Completed: {new Date(agreement.completedDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
