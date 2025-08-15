import { NextRequest, NextResponse } from 'next/server'
import { PasswordResetRequestSchema } from '@/lib/db/models/user'
import { initiatePasswordReset } from '@/lib/db/operations/user'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request data
    const validatedData = PasswordResetRequestSchema.parse(body)
    
    // Initiate password reset (returns token or null)
    const resetToken = await initiatePasswordReset(validatedData.email)
    
    if (resetToken) {
      // Send password reset email
      const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`
      await sendPasswordResetEmail(validatedData.email, resetUrl)
    }
    
    // Always return success to prevent email enumeration
    return NextResponse.json({ 
      message: 'If an account with that email exists, we have sent you a password reset link.' 
    })
    
  } catch (error) {
    console.error('Password reset request error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: 'An error occurred while processing your request' },
      { status: 500 }
    )
  }
}
