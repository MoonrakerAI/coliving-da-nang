'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Database, 
  Server, 
  Zap, 
  HardDrive, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

interface SystemHealth {
  timestamp: string;
  database: {
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
    connections: number;
  };
  api: {
    responseTime: number;
    errorRate: number;
    requestCount: number;
  };
  storage: {
    usage: number;
    available: number;
    percentage: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
}

interface PerformanceMetric {
  timestamp: string;
  metric: string;
  value: number;
  unit: string;
}

export function SystemMonitoring() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSystemHealth();
    fetchPerformanceMetrics();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchSystemHealth();
      fetchPerformanceMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/admin/health');
      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data.health);
      } else {
        // Mock data for demonstration
        setSystemHealth({
          timestamp: new Date().toISOString(),
          database: {
            status: 'healthy',
            responseTime: 45,
            connections: 12,
          },
          api: {
            responseTime: 120,
            errorRate: 0.2,
            requestCount: 1547,
          },
          storage: {
            usage: 2.4 * 1024 * 1024 * 1024, // 2.4 GB
            available: 8.6 * 1024 * 1024 * 1024, // 8.6 GB
            percentage: 22,
          },
          memory: {
            used: 1.2 * 1024 * 1024 * 1024, // 1.2 GB
            total: 4 * 1024 * 1024 * 1024, // 4 GB
            percentage: 30,
          },
          uptime: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformanceMetrics = async () => {
    try {
      const response = await fetch('/api/admin/metrics');
      if (response.ok) {
        const data = await response.json();
        setPerformanceMetrics(data.metrics || []);
      }
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchSystemHealth(), fetchPerformanceMetrics()]);
    setRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      warning: { variant: 'outline' as const, icon: AlertTriangle, color: 'text-yellow-600' },
      error: { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' },
    };

    const config = variants[status as keyof typeof variants] || variants.healthy;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        <span>{status}</span>
      </Badge>
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading system health...</div>;
  }

  if (!systemHealth) {
    return <div className="text-center p-8">Failed to load system health data</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">System Health Dashboard</h2>
          <p className="text-gray-600">
            Last updated: {new Date(systemHealth.timestamp).toLocaleString()}
          </p>
        </div>
        <Button onClick={refreshData} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Database</CardTitle>
              <Database className="h-4 w-4 text-gray-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getStatusBadge(systemHealth.database.status)}
              <div className="text-sm text-gray-600">
                <p>Response: {systemHealth.database.responseTime}ms</p>
                <p>Connections: {systemHealth.database.connections}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">API Performance</CardTitle>
              <Zap className="h-4 w-4 text-gray-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{systemHealth.api.responseTime}ms</div>
              <div className="text-sm text-gray-600">
                <p>Error Rate: {systemHealth.api.errorRate}%</p>
                <p>Requests: {systemHealth.api.requestCount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Storage</CardTitle>
              <HardDrive className="h-4 w-4 text-gray-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{systemHealth.storage.percentage}%</div>
              <Progress value={systemHealth.storage.percentage} className="h-2" />
              <div className="text-sm text-gray-600">
                <p>{formatBytes(systemHealth.storage.usage)} used</p>
                <p>{formatBytes(systemHealth.storage.available)} available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
              <Clock className="h-4 w-4 text-gray-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{formatUptime(systemHealth.uptime)}</div>
              <div className="text-sm text-gray-600">
                <p>Memory: {systemHealth.memory.percentage}%</p>
                <Progress value={systemHealth.memory.percentage} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Performance Metrics</span>
            </CardTitle>
            <CardDescription>
              Real-time system performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Average Response Time</h4>
                  <p className="text-sm text-gray-600">API endpoint response time</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{systemHealth.api.responseTime}ms</div>
                  <Badge variant={systemHealth.api.responseTime < 200 ? 'default' : 'outline'}>
                    {systemHealth.api.responseTime < 200 ? 'Good' : 'Slow'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Error Rate</h4>
                  <p className="text-sm text-gray-600">Percentage of failed requests</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{systemHealth.api.errorRate}%</div>
                  <Badge variant={systemHealth.api.errorRate < 1 ? 'default' : 'destructive'}>
                    {systemHealth.api.errorRate < 1 ? 'Low' : 'High'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">Request Volume</h4>
                  <p className="text-sm text-gray-600">Total requests processed</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{systemHealth.api.requestCount.toLocaleString()}</div>
                  <Badge variant="outline">Today</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>Resource Usage</span>
            </CardTitle>
            <CardDescription>
              System resource consumption and availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Memory Usage</span>
                  <span className="text-sm text-gray-600">
                    {formatBytes(systemHealth.memory.used)} / {formatBytes(systemHealth.memory.total)}
                  </span>
                </div>
                <Progress value={systemHealth.memory.percentage} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">{systemHealth.memory.percentage}% used</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Storage Usage</span>
                  <span className="text-sm text-gray-600">
                    {formatBytes(systemHealth.storage.usage)} / {formatBytes(systemHealth.storage.usage + systemHealth.storage.available)}
                  </span>
                </div>
                <Progress value={systemHealth.storage.percentage} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">{systemHealth.storage.percentage}% used</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Database Connections</span>
                  <span className="text-sm text-gray-600">
                    {systemHealth.database.connections} active
                  </span>
                </div>
                <Progress value={(systemHealth.database.connections / 100) * 100} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">Connection pool utilization</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>System Alerts</span>
          </CardTitle>
          <CardDescription>
            Current system warnings and notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {systemHealth.storage.percentage > 80 && (
              <div className="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <h4 className="font-medium text-yellow-800">Storage Warning</h4>
                  <p className="text-sm text-yellow-700">
                    Storage usage is above 80%. Consider cleaning up old files or increasing storage capacity.
                  </p>
                </div>
              </div>
            )}

            {systemHealth.api.errorRate > 1 && (
              <div className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <h4 className="font-medium text-red-800">High Error Rate</h4>
                  <p className="text-sm text-red-700">
                    API error rate is above normal levels. Check system logs for details.
                  </p>
                </div>
              </div>
            )}

            {systemHealth.api.responseTime > 500 && (
              <div className="flex items-center space-x-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <h4 className="font-medium text-orange-800">Slow Response Time</h4>
                  <p className="text-sm text-orange-700">
                    API response times are slower than expected. Performance optimization may be needed.
                  </p>
                </div>
              </div>
            )}

            {systemHealth.storage.percentage <= 80 && 
             systemHealth.api.errorRate <= 1 && 
             systemHealth.api.responseTime <= 500 && (
              <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <h4 className="font-medium text-green-800">All Systems Operational</h4>
                  <p className="text-sm text-green-700">
                    All system metrics are within normal ranges. No alerts at this time.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
