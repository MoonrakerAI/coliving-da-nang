'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';
import { 
  Download, 
  Upload, 
  Database, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Settings
} from 'lucide-react';

interface BackupJob {
  id: string;
  type: 'full' | 'incremental' | 'selective';
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  size?: number;
  downloadUrl?: string;
  error?: string;
}

interface BackupSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  retention: number;
  autoCleanup: boolean;
}

export function SystemBackup() {
  const [backupJobs, setBackupJobs] = useState<BackupJob[]>([]);
  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    enabled: false,
    frequency: 'weekly',
    retention: 30,
    autoCleanup: true,
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [backupType, setBackupType] = useState<'full' | 'incremental' | 'selective'>('full');

  useEffect(() => {
    fetchBackupJobs();
    fetchBackupSettings();
  }, []);

  const fetchBackupJobs = async () => {
    try {
      const response = await fetch('/api/admin/backup');
      if (response.ok) {
        const data = await response.json();
        setBackupJobs(data.backups || []);
      }
    } catch (error) {
      console.error('Failed to fetch backup jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBackupSettings = async () => {
    try {
      const response = await fetch('/api/admin/backup/settings');
      if (response.ok) {
        const data = await response.json();
        setBackupSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch backup settings:', error);
    }
  };

  const createBackup = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: backupType }),
      });

      if (!response.ok) {
        throw new Error('Failed to create backup');
      }

      toast({
        title: 'Success',
        description: 'Backup job started successfully',
      });

      fetchBackupJobs();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create backup',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const updateBackupSettings = async (newSettings: Partial<BackupSettings>) => {
    try {
      const updatedSettings = { ...backupSettings, ...newSettings };
      
      const response = await fetch('/api/admin/backup/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to update backup settings');
      }

      setBackupSettings(updatedSettings);
      toast({
        title: 'Success',
        description: 'Backup settings updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update backup settings',
        variant: 'destructive',
      });
    }
  };

  const downloadBackup = async (backupId: string) => {
    try {
      const response = await fetch(`/api/admin/backup/${backupId}/download`);
      if (!response.ok) {
        throw new Error('Failed to download backup');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${backupId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download backup',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'outline' as const, icon: Clock },
      running: { variant: 'default' as const, icon: Database },
      completed: { variant: 'default' as const, icon: CheckCircle },
      failed: { variant: 'destructive' as const, icon: AlertCircle },
    };

    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className="h-3 w-3" />
        <span>{status}</span>
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading backup information...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Backup Settings</span>
          </CardTitle>
          <CardDescription>
            Configure automatic backup schedules and retention policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="backupEnabled">Automatic Backups</Label>
                <p className="text-sm text-gray-600">Enable scheduled backups</p>
              </div>
              <Switch
                id="backupEnabled"
                checked={backupSettings.enabled}
                onCheckedChange={(checked) => updateBackupSettings({ enabled: checked })}
              />
            </div>

            <div>
              <Label htmlFor="frequency">Backup Frequency</Label>
              <Select
                value={backupSettings.frequency}
                onValueChange={(value: any) => updateBackupSettings({ frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="retention">Retention Period (days)</Label>
              <Select
                value={backupSettings.retention.toString()}
                onValueChange={(value) => updateBackupSettings({ retention: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoCleanup">Auto Cleanup</Label>
                <p className="text-sm text-gray-600">Delete old backups automatically</p>
              </div>
              <Switch
                id="autoCleanup"
                checked={backupSettings.autoCleanup}
                onCheckedChange={(checked) => updateBackupSettings({ autoCleanup: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Backup */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Backup</CardTitle>
          <CardDescription>
            Generate a backup of your system data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={backupType} onValueChange={(value: any) => setBackupType(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Backup</SelectItem>
                <SelectItem value="incremental">Incremental Backup</SelectItem>
                <SelectItem value="selective">Selective Backup</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={createBackup} disabled={creating} className="w-full sm:w-auto">
              <Database className="h-4 w-4 mr-2" />
              {creating ? 'Creating...' : 'Create Backup'}
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800">Backup Types</h4>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li><strong>Full:</strong> Complete backup of all system data</li>
              <li><strong>Incremental:</strong> Only changes since last backup</li>
              <li><strong>Selective:</strong> Choose specific data to backup</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
          <CardDescription>
            View and manage your backup files
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backupJobs.length > 0 ? (
            <div className="space-y-4">
              {backupJobs.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium">
                        {backup.type.charAt(0).toUpperCase() + backup.type.slice(1)} Backup
                      </h4>
                      {getStatusBadge(backup.status)}
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(backup.createdAt).toLocaleString()}</span>
                      </span>
                      {backup.size && (
                        <span>{formatFileSize(backup.size)}</span>
                      )}
                      {backup.completedAt && (
                        <span>
                          Completed: {new Date(backup.completedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {backup.error && (
                      <p className="text-sm text-red-600 mt-1">{backup.error}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {backup.status === 'running' && (
                      <Progress value={65} className="w-24" />
                    )}
                    {backup.status === 'completed' && backup.downloadUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadBackup(backup.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No backup jobs found. Create your first backup above.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Import */}
      <Card>
        <CardHeader>
          <CardTitle>Data Import</CardTitle>
          <CardDescription>
            Import data from backup files or external sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <h4 className="font-medium text-yellow-800">Import Feature</h4>
            </div>
            <p className="text-yellow-700 mt-1 text-sm">
              Data import functionality will be available in a future update. 
              Please contact support if you need to restore from a backup.
            </p>
          </div>
          
          <Button variant="outline" disabled className="mt-4">
            <Upload className="h-4 w-4 mr-2" />
            Import Data (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
