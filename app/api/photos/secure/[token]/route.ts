import { NextRequest, NextResponse } from 'next/server';
import { validateSecurePhotoToken, logPhotoAccess } from '@/lib/storage/access-control';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Validate the secure token
    const validation = validateSecurePhotoToken(params.token, clientIp);
    
    if (!validation.valid) {
      // Log failed access attempt
      if (session?.user?.id) {
        await logPhotoAccess({
          userId: session.user.id,
          propertyId: 'unknown',
          photoId: 'unknown',
          operation: 'view',
          timestamp: new Date(),
          ipAddress: clientIp,
          userAgent: request.headers.get('user-agent') || undefined,
          success: false,
          error: validation.error,
        });
      }

      return NextResponse.json(
        { error: validation.error || 'Invalid token' },
        { status: 403 }
      );
    }

    // Log successful access
    if (session?.user?.id) {
      await logPhotoAccess({
        userId: session.user.id,
        propertyId: 'extracted-from-token', // Would extract from token in real implementation
        photoId: 'extracted-from-token',
        operation: 'view',
        timestamp: new Date(),
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || undefined,
        success: true,
      });
    }

    // Redirect to the actual photo URL
    return NextResponse.redirect(validation.photoUrl!);

  } catch (error) {
    console.error('Secure photo access error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
