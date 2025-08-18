import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { getPaymentById, updatePayment, deletePayment } from '@/lib/db/operations/payments';
import { UpdatePaymentSchema } from '@/lib/db/models/payment';

async function checkAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const authError = await checkAuth();
    if (authError) return authError;

    const payment = await getPaymentById(params.paymentId);
    if (!payment) {
      return NextResponse.json({ message: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({ payment });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const authError = await checkAuth();
    if (authError) return authError;

    const body = await request.json();
    const validatedData = UpdatePaymentSchema.parse(body);

    const updatedPayment = await updatePayment({ id: params.paymentId, ...validatedData });
    if (!updatedPayment) {
      return NextResponse.json({ message: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({ payment: updatedPayment });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const authError = await checkAuth();
    if (authError) return authError;

    const success = await deletePayment(params.paymentId);
    if (!success) {
      return NextResponse.json({ message: 'Payment not found or could not be deleted' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
