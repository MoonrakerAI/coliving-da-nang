import { NextRequest, NextResponse } from 'next/server'
import { PasswordResetSchema } from '@/lib/db/models/user'
import { resetPassword } from '@/lib/db/operations/user'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request data
    const validatedData = PasswordResetSchema.parse(body)
    
    // Reset password
    const success = await resetPassword(validatedData.token, validatedData.password)
    
    if (!success) {
      return NextResponse.json(
        { message: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ 
      message: 'Password reset successfully' 
    })
    
  } catch (error) {
    console.error('Password reset error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Invalid request data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: 'An error occurred while resetting your password' },
      { status: 500 }
    )
  }
}
