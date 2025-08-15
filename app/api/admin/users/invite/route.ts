import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, UserRole } from '@/lib/auth'
import { UserInvitationSchema } from '@/lib/db/models/user'
import { createUserInvitation, getUserByEmail } from '@/lib/db/operations/user'
import { sendUserInvitationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only property owners can invite users
    if (session.user.role !== UserRole.PROPERTY_OWNER) {
      return NextResponse.json(
        { message: 'Forbidden - Only property owners can invite users' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate request data
    const validatedData = UserInvitationSchema.parse(body)
    
    // Check if user already exists
    const existingUser = await getUserByEmail(validatedData.email)
    if (existingUser) {
      return NextResponse.json(
        { message: 'A user with this email already exists' },
        { status: 400 }
      )
    }
    
    // Create user invitation
    const invitedUser = await createUserInvitation(validatedData, session.user.id)
    
    // Send invitation email
    if (invitedUser.emailVerificationToken) {
      const inviteUrl = `${process.env.NEXTAUTH_URL}/register?token=${invitedUser.emailVerificationToken}`
      await sendUserInvitationEmail(
        invitedUser.email,
        invitedUser.name,
        inviteUrl,
        session.user.name || 'System Administrator'
      )
    }
    
    return NextResponse.json({
      message: 'User invitation sent successfully',
      user: {
        id: invitedUser.id,
        email: invitedUser.email,
        name: invitedUser.name,
        role: invitedUser.role,
        status: invitedUser.status
      }
    })
    
  } catch (error) {
    console.error('User invitation error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Invalid invitation data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: 'An error occurred while sending the invitation' },
      { status: 500 }
    )
  }
}
