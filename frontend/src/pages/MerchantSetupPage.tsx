import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const MerchantSetupPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenFromUrl = params.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      toast.error('Invalid invitation link. No token provided.');
    }
  }, [location]);

  const setupMutation = useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      return await api.post('/users/merchant-setup', data);
    },
    onSuccess: () => {
      toast.success('Password set successfully! You can now log in.');
      navigate('/login');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to set password. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (token) {
      setupMutation.mutate({ token, password });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Up Your Merchant Account</CardTitle>
          <CardDescription>Create a password to activate your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={setupMutation.isPending}>
              {setupMutation.isPending ? 'Setting Up...' : 'Set Password & Activate'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchantSetupPage;
