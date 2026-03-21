import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../lib/AuthContext';

export const ProfileSettings: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [role, setRole] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  if (!user) return null;

  React.useEffect(() => {
    setName(user.name || '');
    setEmail(user.email || '');
    setUsername(user.username || '');
    setRole(user.role || '');
  }, [user.name, user.email, user.username, user.role]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: name.trim(),
      email: email.trim(),
      username: username.trim(),
      role: role.trim(),
    };

    if (!payload.name || !payload.email || !payload.username || !payload.role) {
      toast.error('All profile fields are required');
      return;
    }

    if (
      payload.name === user.name &&
      payload.email === user.email &&
      payload.username === user.username &&
      payload.role === user.role
    ) {
      toast.info('No profile changes to save');
      return;
    }

    try {
      setIsSaving(true);
      await updateProfile(payload);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <CardTitle>Profile Information</CardTitle>
        </div>
        <CardDescription>
          Update your personal details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={role} onChange={e => setRole(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-medium">
              Access: {user.accessRole === 'super_admin' ? 'Super Admin' : 'Admin'}
            </Badge>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
