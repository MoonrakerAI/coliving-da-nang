import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SystemMonitoring } from '@/components/admin/SystemMonitoring';

export const metadata: Metadata = {
  title: 'System Monitoring - Admin',
  description: 'Monitor system health and performance metrics',
};

export default async function SystemMonitoringPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== 'PROPERTY_OWNER') {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
        <p className="text-gray-600 mt-2">
          Monitor system health, performance metrics, and operational status
        </p>
      </div>
      
      <SystemMonitoring />
    </div>
  );
}
