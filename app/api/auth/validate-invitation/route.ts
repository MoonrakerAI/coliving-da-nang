import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers } from '@/lib/db/operations/user'
import { UserStatus } from '@/lib/db/models/user'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json(
        { message: 'Token is required' },
        { status: 400 }
      )
    }
    
    // Find user with matching invitation token
    const users = await getAllUsers()
    const user = users.find(u => 
      u.emailVerificationToken === token && 
      u.status === UserStatus.PENDING
    )
    
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid or expired invitation token' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      message: 'Valid invitation token',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
    
  } catch (error) {
    console.error('Invitation validation error:', error)
    
    return NextResponse.json(
      { message: 'An error occurred while validating the invitation' },
      { status: 500 }
    )
  }
}
