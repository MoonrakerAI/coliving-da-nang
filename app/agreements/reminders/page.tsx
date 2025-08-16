'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { 
  Bell, 
  Clock, 
  Settings, 
  TrendingUp,
  Mail,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Calendar,
  Users,
  Activity
} from 'lucide-react'
import { ReminderConfig } from '@/lib/agreements/reminders'

interface ReminderStats {
  totalReminders: number
  remindersByType: Record<string, number>
  remindersByUrgency: Record<string, number>
  successRate: number
  averageResponseTime: number
}

interface ConfigData {
  config: ReminderConfig
  stats: ReminderStats
  lastUpdated: string
}

export default function ReminderManagementPage() {
  const [configData, setConfigData] = useState<ConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<ReminderConfig | null>(null)

  useEffect(() => {
    loadConfiguration()
  }, [])

  const loadConfiguration = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/agreements/reminders/config')
      
      if (response.ok) {
        const data: ConfigData = await response.json()
        setConfigData(data)
        setConfig(data.config)
      } else {
        console.error('Failed to load reminder configuration')
      }
    } catch (error) {
      console.error('Error loading configuration:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveConfiguration = async () => {
    if (!config) return

    try {
      setSaving(true)
      const response = await fetch('/api/agreements/reminders/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })

      if (response.ok) {
        const result = await response.json()
        setConfigData(prev => prev ? { ...prev, config: result.config, lastUpdated: result.updatedAt } : null)
        console.log('Configuration saved successfully')
      } else {
        const error = await response.json()
        console.error('Failed to save configuration:', error.error)
      }
    } catch (error) {
      console.error('Error saving configuration:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (updates: Partial<ReminderConfig>) => {
    if (!config) return
    setConfig({ ...config, ...updates })
  }

  const updateSchedules = (scheduleUpdates: Partial<ReminderConfig['schedules']>) => {
    if (!config) return
    setConfig({
      ...config,
      schedules: { ...config.schedules, ...scheduleUpdates }
    })
  }

  const updateFollowupSchedule = (index: number, value: number) => {
    if (!config) return
    const newFollowup = [...config.schedules.followup]
    newFollowup[index] = value
    updateSchedules({ followup: newFollowup })
  }

  const addFollowupSchedule = () => {
    if (!config) return
    const newFollowup = [...config.schedules.followup, 21]
    updateSchedules({ followup: newFollowup })
  }

  const removeFollowupSchedule = (index: number) => {
    if (!config) return
    const newFollowup = config.schedules.followup.filter((_, i) => i !== index)
    updateSchedules({ followup: newFollowup })
  }

  const triggerManualProcessing = async () => {
    try {
      const response = await fetch('/api/cron/reminders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'dev-secret'}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Manual reminder processing completed:', result.stats)
        // Reload configuration to get updated stats
        await loadConfiguration()
      } else {
        console.error('Failed to trigger manual processing')
      }
    } catch (error) {
      console.error('Error triggering manual processing:', error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!configData || !config) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Failed to Load Configuration</h2>
            <p className="text-gray-600 mb-4">Unable to load reminder configuration.</p>
            <Button onClick={loadConfiguration}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = configData.stats

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Automated Reminder System</h1>
          <p className="text-gray-600">Configure and monitor automated reminder emails for unsigned agreements</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadConfiguration} variant="outline">
            Refresh
          </Button>
          <Button onClick={triggerManualProcessing} variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            Run Now
          </Button>
          <Button onClick={saveConfiguration} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Status</p>
                <p className="text-2xl font-bold">
                  {config.enabled ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-red-600">Disabled</span>
                  )}
                </p>
              </div>
              {config.enabled ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reminders (30d)</p>
                <p className="text-2xl font-bold">{stats.totalReminders}</p>
              </div>
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{stats.successRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold">{stats.averageResponseTime}h</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Reminder Configuration
            </CardTitle>
            <CardDescription>
              Configure when and how reminder emails are sent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* System Enable/Disable */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Enable Automated Reminders</Label>
                <p className="text-sm text-gray-600">Turn the automated reminder system on or off</p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(enabled) => updateConfig({ enabled })}
              />
            </div>

            <Separator />

            {/* Reminder Schedules */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Reminder Schedule</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="initial">Initial Reminder (days after sent)</Label>
                  <Input
                    id="initial"
                    type="number"
                    min="1"
                    max="30"
                    value={config.schedules.initial}
                    onChange={(e) => updateSchedules({ initial: parseInt(e.target.value) })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="urgent">Urgent Reminder (days before expiry)</Label>
                  <Input
                    id="urgent"
                    type="number"
                    min="1"
                    max="14"
                    value={config.schedules.urgent}
                    onChange={(e) => updateSchedules({ urgent: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label>Follow-up Reminders (days after initial)</Label>
                <div className="space-y-2 mt-2">
                  {config.schedules.followup.map((days, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="60"
                        value={days}
                        onChange={(e) => updateFollowupSchedule(index, parseInt(e.target.value))}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600">days</span>
                      {config.schedules.followup.length > 1 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFollowupSchedule(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addFollowupSchedule}
                    disabled={config.schedules.followup.length >= 5}
                  >
                    Add Follow-up
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="final">Final Reminder (days before expiry)</Label>
                <Input
                  id="final"
                  type="number"
                  min="1"
                  max="7"
                  value={config.schedules.final}
                  onChange={(e) => updateSchedules({ final: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <Separator />

            {/* Advanced Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Advanced Settings</h3>
              
              <div>
                <Label htmlFor="maxAttempts">Maximum Reminder Attempts</Label>
                <Input
                  id="maxAttempts"
                  type="number"
                  min="1"
                  max="10"
                  value={config.maxAttempts}
                  onChange={(e) => updateConfig({ maxAttempts: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Business Hours Only</Label>
                    <p className="text-xs text-gray-600">Send reminders only during 9 AM - 6 PM</p>
                  </div>
                  <Switch
                    checked={config.businessHoursOnly}
                    onCheckedChange={(businessHoursOnly) => updateConfig({ businessHoursOnly })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Exclude Weekends</Label>
                    <p className="text-xs text-gray-600">Don't send reminders on Saturday/Sunday</p>
                  </div>
                  <Switch
                    checked={config.excludeWeekends}
                    onCheckedChange={(excludeWeekends) => updateConfig({ excludeWeekends })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Escalation Enabled</Label>
                    <p className="text-xs text-gray-600">Increase urgency over time</p>
                  </div>
                  <Switch
                    checked={config.escalationEnabled}
                    onCheckedChange={(escalationEnabled) => updateConfig({ escalationEnabled })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics and Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Reminder Analytics
            </CardTitle>
            <CardDescription>
              Performance metrics for the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Reminder Types */}
            <div>
              <h3 className="text-lg font-medium mb-3">Reminders by Type</h3>
              <div className="space-y-2">
                {Object.entries(stats.remindersByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="capitalize">{type}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Urgency Levels */}
            <div>
              <h3 className="text-lg font-medium mb-3">Reminders by Urgency</h3>
              <div className="space-y-2">
                {Object.entries(stats.remindersByUrgency).map(([urgency, count]) => (
                  <div key={urgency} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{urgency}</span>
                      {urgency === 'high' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      {urgency === 'medium' && <Clock className="h-4 w-4 text-yellow-500" />}
                      {urgency === 'low' && <Bell className="h-4 w-4 text-blue-500" />}
                    </div>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* System Info */}
            <div>
              <h3 className="text-lg font-medium mb-3">System Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span>{new Date(configData.lastUpdated).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Next Processing:</span>
                  <span>Every hour</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge className={config.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {config.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Help and Documentation */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">How Automated Reminders Work</h3>
              <p className="text-sm text-blue-700 mt-1">
                The system automatically sends reminder emails based on your configuration. 
                Initial reminders are sent after agreements are sent, follow-up reminders help 
                maintain engagement, and urgent/final reminders ensure timely completion before expiration. 
                All reminders respect business hours and weekend settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
