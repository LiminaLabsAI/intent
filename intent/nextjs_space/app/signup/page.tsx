'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FlowLogo } from '@/components/flow-logo';
import Link from 'next/link';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Signup failed');
        setLoading(false);
        return;
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Account created. Please sign in.');
      } else {
        router.replace('/dashboard');
      }
    } catch (err: any) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <FlowLogo size="xl" showText={false} className="mb-4" />
          <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight">Join Flow</h1>
          <p className="text-gray-500 mt-2">Start managing intents intelligently</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Create Account</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-gray-700">Full Name</Label>
              <Input id="name" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Jane Smith" required className="mt-1 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400" />
            </div>
            <div>
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="you@company.com" required className="mt-1 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400" />
            </div>
            <div>
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} className="mt-1 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">Already have an account?{' '}<Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
