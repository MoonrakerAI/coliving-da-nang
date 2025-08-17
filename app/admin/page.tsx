import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Settings, 
  Database, 
  Activity, 
  Shield, 
  BarChart3,
  Plug,
  Bell
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'System Administration',
  description: 'Manage users, settings, and system configuration',
};

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== 'PROPERTY_OWNER') {
    redirect('/dashboard');
  }

  const adminSections = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: Users,
      href: '/admin/users',
      color: 'text-blue-600',
    },
    {
      title: 'Property Settings',
      description: 'Configure property details and preferences',
      icon: Settings,
      href: '/admin/properties/settings',
      color: 'text-green-600',
    },
    {
      title: 'Notifications',
      description: 'Configure notification preferences and templates',
      icon: Bell,
      href: '/admin/notifications',
      color: 'text-yellow-600',
    },
    {
      title: 'Integrations',
      description: 'Manage external service connections',
      icon: Plug,
      href: '/admin/integrations',
      color: 'text-purple-600',
    },
    {
      title: 'System Backup',
      description: 'Backup and export system data',
      icon: Database,
      href: '/admin/system/backup',
      color: 'text-indigo-600',
    },
    {
      title: 'Audit Log',
      description: 'View system activity and user actions',
      icon: Activity,
      href: '/admin/audit',
      color: 'text-orange-600',
    },
    {
      title: 'System Health',
      description: 'Monitor system performance and health',
      icon: BarChart3,
      href: '/admin/system/monitoring',
      color: 'text-red-600',
    },
    {
      title: 'Security',
      description: 'Security settings and access control',
      icon: Shield,
      href: '/admin/security',
      color: 'text-gray-600',
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">System Administration</h1>
        <p className="text-gray-600 mt-2">
          Manage your coliving property system settings and configuration
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {adminSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.href} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <Icon className={`h-6 w-6 ${section.color}`} />
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {section.description}
                </CardDescription>
                <Button asChild variant="outline" className="w-full">
                  <Link href={section.href}>
                    Manage
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-yellow-600" />
          <h3 className="font-medium text-yellow-800">Security Notice</h3>
        </div>
        <p className="text-yellow-700 mt-1 text-sm">
          Administrative functions require property owner privileges. All actions are logged for security and audit purposes.
        </p>
      </div>
    </div>
  );
}
