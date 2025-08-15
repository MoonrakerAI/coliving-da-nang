import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PasswordSchema } from '@/lib/db/models/user'
import { activateUserInvitation } from '@/lib/db/operations/user'

// Registration schema
const RegisterSchema = z.object({
  token: z.string().min(1, 'Registration token is required'),
  password: PasswordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request data
    const validatedData = RegisterSchema.parse(body)
    
    // Activate user invitation with new password
    const user = await activateUserInvitation(validatedData.token, validatedData.password)
    
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid or expired invitation token' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ 
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
    
  } catch (error) {
    console.error('Registration error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Invalid registration data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: 'An error occurred during registration' },
      { status: 500 }
    )
  }
}
