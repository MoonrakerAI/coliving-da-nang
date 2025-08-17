import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { PropertySettings } from '@/components/admin/PropertySettings';

export const metadata: Metadata = {
  title: 'Property Settings - Admin',
  description: 'Configure property details and preferences',
};

export default async function PropertySettingsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== 'PROPERTY_OWNER') {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Property Settings</h1>
        <p className="text-gray-600 mt-2">
          Configure property details, house rules, and system preferences
        </p>
      </div>
      
      <PropertySettings />
    </div>
  );
}
