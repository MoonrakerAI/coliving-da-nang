import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { SystemBackup } from '@/components/admin/SystemBackup';

export const metadata: Metadata = {
  title: 'System Backup - Admin',
  description: 'Backup and export system data',
};

export default async function SystemBackupPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== 'PROPERTY_OWNER') {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">System Backup</h1>
        <p className="text-gray-600 mt-2">
          Backup and export your system data for safekeeping
        </p>
      </div>
      
      <SystemBackup />
    </div>
  );
}
