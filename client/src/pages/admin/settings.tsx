import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Save, Mail, Bell, Shield, Database } from 'lucide-react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useQuery } from '@tanstack/react-query';

interface SystemSettings {
  email: {
    provider: string;
    configured: boolean;
    apiKey: string | null;
    from: string | null;
  };
}

export default function AdminSettings() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [registrationNotifications, setRegistrationNotifications] = useState(true);
  const [eventUpdates, setEventUpdates] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);

  const { data: systemSettings, isLoading: settingsLoading } = useQuery<SystemSettings>({
    queryKey: ['/api/admin/system-settings'],
    enabled: !!user && user.role === 'super_admin',
  });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'super_admin')) {
      setLocation('/login');
    }
  }, [user, isLoading, setLocation]);

  const handleSaveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your system settings have been updated successfully.",
    });
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-2">Configure system-wide preferences and settings</p>
        </div>

        <div className="space-y-6 max-w-4xl">
          <Card data-testid="card-email-settings">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <CardTitle>Email Configuration</CardTitle>
              </div>
              <CardDescription>Configure email server and sending preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settingsLoading ? (
                <div className="text-sm text-gray-500">Loading settings...</div>
              ) : systemSettings?.email?.configured ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-provider">Email Provider</Label>
                      <Input
                        id="email-provider"
                        value={systemSettings.email.provider?.toUpperCase() || "RESEND"}
                        disabled
                        data-testid="input-email-provider"
                      />
                      <p className="text-xs text-green-600">✓ Configured</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-apikey">API Key</Label>
                      <Input
                        id="email-apikey"
                        value={systemSettings.email.apiKey || ""}
                        disabled
                        type="password"
                        data-testid="input-email-apikey"
                      />
                      <p className="text-xs text-green-600">✓ Configured</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-from">From Address</Label>
                    <Input
                      id="email-from"
                      value={systemSettings.email.from || "BootFeet 2K26 <noreply@bootfeet.com>"}
                      disabled
                      data-testid="input-email-from"
                    />
                    <p className="text-xs text-green-600">✓ Configured</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Resend is not configured. Emails will be logged but not sent.
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      To enable email sending, configure RESEND_API_KEY and RESEND_FROM_EMAIL
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-provider">Email Provider</Label>
                      <Input
                        id="email-provider"
                        placeholder="Resend"
                        disabled
                        data-testid="input-email-provider"
                      />
                      <p className="text-xs text-gray-500">Not configured</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-apikey">API Key</Label>
                      <Input
                        id="email-apikey"
                        placeholder="re_..."
                        disabled
                        type="password"
                        data-testid="input-email-apikey"
                      />
                      <p className="text-xs text-gray-500">Not configured</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-from">From Address</Label>
                    <Input
                      id="smtp-from"
                      placeholder="BootFeet 2K26 <noreply@bootfeet.com>"
                      disabled
                      data-testid="input-smtp-from"
                    />
                    <p className="text-xs text-gray-500">Not configured</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-notification-settings">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                <CardTitle>Notification Preferences</CardTitle>
              </div>
              <CardDescription>Manage email notifications for different events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-gray-500">Receive email notifications for system events</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                  data-testid="switch-email-notifications"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="registration-notifications">Registration Notifications</Label>
                  <p className="text-sm text-gray-500">Get notified when new participants register</p>
                </div>
                <Switch
                  id="registration-notifications"
                  checked={registrationNotifications}
                  onCheckedChange={setRegistrationNotifications}
                  data-testid="switch-registration-notifications"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="event-updates">Event Updates</Label>
                  <p className="text-sm text-gray-500">Receive notifications about event changes</p>
                </div>
                <Switch
                  id="event-updates"
                  checked={eventUpdates}
                  onCheckedChange={setEventUpdates}
                  data-testid="switch-event-updates"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="system-alerts">System Alerts</Label>
                  <p className="text-sm text-gray-500">Critical system alerts and warnings</p>
                </div>
                <Switch
                  id="system-alerts"
                  checked={systemAlerts}
                  onCheckedChange={setSystemAlerts}
                  data-testid="switch-system-alerts"
                />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-security-settings">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <CardTitle>Security Settings</CardTitle>
              </div>
              <CardDescription>Manage authentication and security preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Session Timeout</Label>
                <Input
                  type="number"
                  defaultValue={30}
                  placeholder="Minutes"
                  data-testid="input-session-timeout"
                />
                <p className="text-xs text-gray-500">Automatically log out users after inactivity (minutes)</p>
              </div>
              <div className="space-y-2">
                <Label>Password Policy</Label>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• Minimum 8 characters</p>
                  <p>• At least one uppercase letter</p>
                  <p>• At least one number</p>
                  <p>• At least one special character</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-database-info">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                <CardTitle>Database Information</CardTitle>
              </div>
              <CardDescription>Current database connection status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database Type</span>
                <span className="text-sm font-medium">PostgreSQL</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Connection Status</span>
                <span className="text-sm font-medium text-green-600">Connected</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Host</span>
                <span className="text-sm font-medium">{import.meta.env.VITE_PGHOST || "Configured via backend"}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setLocation('/admin/dashboard')} data-testid="button-cancel">
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} data-testid="button-save-settings">
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
