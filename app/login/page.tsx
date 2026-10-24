'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function LoginPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const schoolId = searchParams.get('schoolId');
  const schoolName = searchParams.get('schoolName')
    ? decodeURIComponent(searchParams.get('schoolName')!)
    : null;
  const role = searchParams.get('role');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // If user navigates directly to /login without going through gateway
  if (!schoolId || !role) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-2">School Gateway Required</h2>
          <p className="text-slate-500 text-sm mb-6">
            Please select your school and role before logging in.
          </p>
          <button
            onClick={() => router.push('/select-school')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all"
          >
            Go to School Selection
          </button>
        </div>
      </main>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      // Step 3a: Verify user exists in app_users for this exact school & role
      const { data: appUserData, error: userCheckError } = await supabase
        .from('app_users')
        .select('id, organization_id, role, active')
        .eq('email', email.trim().toLowerCase())
        .eq('organization_id', schoolId)
        .eq('role', role)
        .single();

      if (userCheckError || !appUserData) {
        setErrorMessage(
          `Access Denied: No ${role.toUpperCase()} account found with this email for ${schoolName || 'this school'}.`
        );
        setLoading(false);
        return;
      }

      if (!appUserData.active) {
        setErrorMessage('Your account is currently inactive. Please contact your school administrator.');
        setLoading(false);
        return;
      }

      // Step 3b: Authenticate user with Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setErrorMessage('Invalid password. Please check your credentials and try again.');
        setLoading(false);
        return;
      }

      // Successful login -> route to user dashboard
      router.push(`/dashboard?schoolId=${schoolId}&role=${role}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">
        <div className="text-center mb-6">
          <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
            Step 3 of 3
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-3">
            {schoolName}
          </h1>
          <p className="text-slate-500 text-xs mt-1 capitalize">
            Logging in as <span className="font-semibold text-blue-600">{role}</span>
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl leading-relaxed">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.com"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-md text-sm disabled:opacity-50 mt-2"
          >
            {loading ? 'Verifying Account...' : `Sign In to Portal`}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <div>
            <button
              onClick={() => router.push(`/select-role?schoolId=${schoolId}&schoolName=${encodeURIComponent(schoolName || '')}`)}
              className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
            >
              &larr; Change Role
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">Loading login portal...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}