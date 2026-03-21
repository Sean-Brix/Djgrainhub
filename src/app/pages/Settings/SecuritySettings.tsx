import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Shield, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';

export const SecuritySettings: React.FC = () => {
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setIsSaving(true);
      await api.patch('/auth/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update password');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Security</CardTitle>
        </div>
        <CardDescription>
          Manage your password and security preferences.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input id="current-password" type="password" className="pl-9" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="new-password" type="password" className="pl-9" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="confirm-password" type="password" className="pl-9" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" disabled={isSaving}>{isSaving ? 'Updating...' : 'Update Password'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
