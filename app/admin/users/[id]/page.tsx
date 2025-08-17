import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { UserDetails } from '@/components/admin/UserDetails';

interface UserDetailsPageProps {
  params: {
    id: string;
  };
}

export const metadata: Metadata = {
  title: 'User Details - Admin',
  description: 'View and edit user details',
};

export default async function UserDetailsPage({ params }: UserDetailsPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== 'PROPERTY_OWNER') {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto p-6">
      <UserDetails userId={params.id} />
    </div>
  );
}
