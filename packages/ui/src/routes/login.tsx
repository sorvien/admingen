import React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/Logo';

export const Route = createFileRoute('/login')({
  component: LoginComponent,
});

function LoginComponent() {
  const navigate = useNavigate();
  const { user, checkAuth } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  // If already authenticated, redirect to admin home
  React.useEffect(() => {
    if (user) {
      navigate({ to: '/' });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch('/admin/api/_auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include' // <--- Key fix
      });

      if (res.ok) {
        // Fetch user session first so Root route doesn't bounce back to /login
        const authUser = await checkAuth();
        toast.success(`Welcome back${authUser?.name ? `, ${authUser.name}` : ''}!`);
        navigate({ to: '/' });
      } else {
        const err = await res.text();
        const msg = err || 'Login failed. Please check your credentials.';
        setError(msg);
        toast.error(msg);
      }
    } catch (e: any) {
      const msg = 'An unexpected error occurred during login';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
        <div className="flex justify-center mb-6">
          <Logo size={44} showText={true} />
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email / Username</Label>
            <Input 
              id="email" 
              name="email" 
              type="text" 
              required 
              className="bg-gray-700 border-gray-600 focus:border-[#00eaff]"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              required 
              className="bg-gray-700 border-gray-600 focus:border-[#00eaff]"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-[#00eaff] text-black hover:bg-[#00eaff]/80"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </div>
    </div>
  );
}
