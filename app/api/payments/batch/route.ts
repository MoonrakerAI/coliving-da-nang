import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createPayment } from '@/lib/db/operations/payment'
import { CreatePaymentSchema } from '@/lib/db/models/payment'

interface BatchUploadResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    error: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      )
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { message: 'File must be a CSV' },
        { status: 400 }
      )
    }

    // Read and parse CSV
    const csvText = await file.text()
    const lines = csvText.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json(
        { message: 'CSV must contain header and at least one data row' },
        { status: 400 }
      )
    }

    // Parse header
    const header = lines[0].split(',').map(col => col.trim().replace(/"/g, ''))
    const expectedColumns = [
      'tenantId', 'propertyId', 'amountCents', 'currency', 'paymentMethod', 
      'status', 'dueDate', 'paidDate', 'reference', 'description', 'notes'
    ]

    // Validate header
    const missingColumns = expectedColumns.filter(col => !header.includes(col))
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { message: `Missing required columns: ${missingColumns.join(', ')}` },
        { status: 400 }
      )
    }

    const result: BatchUploadResult = {
      success: 0,
      failed: 0,
      errors: []
    }

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const rowNumber = i + 1
      const values = lines[i].split(',').map(val => val.trim().replace(/"/g, ''))
      
      try {
        // Create payment object from CSV row
        const paymentData: any = {}
        
        header.forEach((column, index) => {
          const value = values[index]
          
          switch (column) {
            case 'amountCents':
              paymentData[column] = parseInt(value) || 0
              break
            case 'dueDate':
            case 'paidDate':
              if (value && value !== '') {
                paymentData[column] = new Date(value)
              }
              break
            case 'reference':
            case 'notes':
              paymentData[column] = value || undefined
              break
            default:
              paymentData[column] = value
          }
        })

        // Validate and create payment
        const validatedData = CreatePaymentSchema.parse(paymentData)
        await createPayment(validatedData)
        
        result.success++
        
      } catch (error) {
        result.failed++
        result.errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error processing batch upload:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
