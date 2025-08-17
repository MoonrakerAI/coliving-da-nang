import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { UserManagement } from '@/components/admin/UserManagement';

export const metadata: Metadata = {
  title: 'User Management - Admin',
  description: 'Manage users, roles, and permissions',
};

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== 'PROPERTY_OWNER') {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-2">
          Manage users, assign roles, and configure permissions
        </p>
      </div>
      
      <UserManagement />
    </div>
  );
}
