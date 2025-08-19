'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Save, Settings, Home, Bell, DollarSign } from 'lucide-react';

interface PropertySettings {
  id: string;
  propertyId: string;
  general: {
    timezone: string;
    currency: string;
    dateFormat: string;
    language: string;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    reminderSchedule: number[];
  };
  payment: {
    dueDate: number;
    lateFeeAmount: number;
    lateFeeGracePeriod: number;
    autoReminders: boolean;
  };
  property: {
    name: string;
    address: string;
    description: string;
    houseRules: string;
    amenities: string[];
    maxOccupancy: number;
  };
}

const timezones = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Bangkok',
  'Australia/Sydney',
];

const currencies = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'JPY', name: 'Japanese Yen' },
];

const dateFormats = [
  'MM/DD/YYYY',
  'DD/MM/YYYY',
  'YYYY-MM-DD',
  'DD-MM-YYYY',
];

export function PropertySettings() {
  const [settings, setSettings] = useState<PropertySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      } else {
        // Initialize with default settings if none exist
        setSettings({
          id: 'default',
          propertyId: 'default',
          general: {
            timezone: 'Asia/Bangkok',
            currency: 'VND',
            dateFormat: 'DD/MM/YYYY',
            language: 'en',
          },
          notifications: {
            emailEnabled: true,
            smsEnabled: false,
            pushEnabled: true,
            reminderSchedule: [7, 3, 1],
          },
          payment: {
            dueDate: 1,
            lateFeeAmount: 50000,
            lateFeeGracePeriod: 3,
            autoReminders: true,
          },
          property: {
            name: '',
            address: '',
            description: '',
            houseRules: '',
            amenities: [],
            maxOccupancy: 10,
          },
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (section: keyof PropertySettings, field: string, value: any) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [section]: {
        ...(settings[section] as Record<string, any> || {}),
        [field]: value,
      },
    });
  };

  const updateNestedSettings = (section: keyof PropertySettings, field: string, value: any) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [section]: {
        ...(settings[section] as Record<string, any> || {}),
        [field]: value,
      },
    });
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading settings...</div>;
  }

  if (!settings) {
    return <div className="text-center p-8">Failed to load settings</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Property Settings</h2>
          <p className="text-gray-600">Configure your property and system preferences</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="property">
            <Home className="h-4 w-4 mr-2" />
            Property
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="payment">
            <DollarSign className="h-4 w-4 mr-2" />
            Payment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure system-wide preferences and localization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={settings.general.timezone}
                    onValueChange={(value) => updateNestedSettings('general', 'timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={settings.general.currency}
                    onValueChange={(value) => updateNestedSettings('general', 'currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select
                    value={settings.general.dateFormat}
                    onValueChange={(value) => updateNestedSettings('general', 'dateFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateFormats.map((format) => (
                        <SelectItem key={format} value={format}>
                          {format}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={settings.general.language}
                    onValueChange={(value) => updateNestedSettings('general', 'language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="vi">Vietnamese</SelectItem>
                      <SelectItem value="th">Thai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="property">
          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
              <CardDescription>
                Configure property details and house rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="propertyName">Property Name</Label>
                  <Input
                    id="propertyName"
                    value={settings.property.name}
                    onChange={(e) => updateNestedSettings('property', 'name', e.target.value)}
                    placeholder="Enter property name"
                  />
                </div>

                <div>
                  <Label htmlFor="maxOccupancy">Maximum Occupancy</Label>
                  <Input
                    id="maxOccupancy"
                    type="number"
                    value={settings.property.maxOccupancy}
                    onChange={(e) => updateNestedSettings('property', 'maxOccupancy', parseInt(e.target.value))}
                    min="1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={settings.property.address}
                  onChange={(e) => updateNestedSettings('property', 'address', e.target.value)}
                  placeholder="Enter property address"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="description">Property Description</Label>
                <Textarea
                  id="description"
                  value={settings.property.description}
                  onChange={(e) => updateNestedSettings('property', 'description', e.target.value)}
                  placeholder="Describe your property"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="houseRules">House Rules</Label>
                <Textarea
                  id="houseRules"
                  value={settings.property.houseRules}
                  onChange={(e) => updateNestedSettings('property', 'houseRules', e.target.value)}
                  placeholder="Enter house rules and policies"
                  rows={5}
                />
              </div>

              <div>
                <Label htmlFor="amenities">Amenities (comma-separated)</Label>
                <Input
                  id="amenities"
                  value={settings.property.amenities.join(', ')}
                  onChange={(e) => updateNestedSettings('property', 'amenities', e.target.value.split(', ').filter(Boolean))}
                  placeholder="WiFi, Kitchen, Laundry, Parking"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how and when notifications are sent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailEnabled">Email Notifications</Label>
                    <p className="text-sm text-gray-600">Send notifications via email</p>
                  </div>
                  <Switch
                    id="emailEnabled"
                    checked={settings.notifications.emailEnabled}
                    onCheckedChange={(checked) => updateNestedSettings('notifications', 'emailEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="smsEnabled">SMS Notifications</Label>
                    <p className="text-sm text-gray-600">Send notifications via SMS</p>
                  </div>
                  <Switch
                    id="smsEnabled"
                    checked={settings.notifications.smsEnabled}
                    onCheckedChange={(checked) => updateNestedSettings('notifications', 'smsEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="pushEnabled">Push Notifications</Label>
                    <p className="text-sm text-gray-600">Send browser push notifications</p>
                  </div>
                  <Switch
                    id="pushEnabled"
                    checked={settings.notifications.pushEnabled}
                    onCheckedChange={(checked) => updateNestedSettings('notifications', 'pushEnabled', checked)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reminderSchedule">Reminder Schedule (days before due)</Label>
                <Input
                  id="reminderSchedule"
                  value={settings.notifications.reminderSchedule.join(', ')}
                  onChange={(e) => updateNestedSettings('notifications', 'reminderSchedule', e.target.value.split(', ').map(Number).filter(Boolean))}
                  placeholder="7, 3, 1"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Comma-separated list of days before payment due date to send reminders
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>
                Configure payment schedules and late fee policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="dueDate">Monthly Due Date</Label>
                  <Select
                    value={settings.payment.dueDate.toString()}
                    onValueChange={(value) => updateNestedSettings('payment', 'dueDate', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of each month
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="lateFeeAmount">Late Fee Amount ({settings.general.currency})</Label>
                  <Input
                    id="lateFeeAmount"
                    type="number"
                    value={settings.payment.lateFeeAmount}
                    onChange={(e) => updateNestedSettings('payment', 'lateFeeAmount', parseInt(e.target.value))}
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="lateFeeGracePeriod">Late Fee Grace Period (days)</Label>
                  <Input
                    id="lateFeeGracePeriod"
                    type="number"
                    value={settings.payment.lateFeeGracePeriod}
                    onChange={(e) => updateNestedSettings('payment', 'lateFeeGracePeriod', parseInt(e.target.value))}
                    min="0"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoReminders"
                    checked={settings.payment.autoReminders}
                    onCheckedChange={(checked) => updateNestedSettings('payment', 'autoReminders', checked)}
                  />
                  <Label htmlFor="autoReminders">Automatic Payment Reminders</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
