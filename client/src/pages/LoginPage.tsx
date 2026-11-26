import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '../app/AuthContext';
import { ApiError } from '../lib/api';
import { Button, Card, FormField, Input } from '../components/ui/Primitives';
import { useToast } from '../components/ui/Toast';

const loginFormSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

export function LoginPage() {
  const { login } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = loginFormSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs = parsed.error.flatten().fieldErrors;
      setFieldErrors({ email: errs.email?.[0], password: errs.password?.[0] });
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(parsed.data.email, parsed.data.password);
      pushToast({ type: 'success', title: `Welcome back, ${user.name}` });
      navigate(user.role === 'CUSTOMER' ? '/app' : '/staff', { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Unable to sign in right now';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas bg-editorial-grid flex flex-col justify-center px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Kestrel Care
        </Link>

        <Card className="animate-rise p-7 sm:p-8">
          <div className="mb-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-ink-rail font-display text-base font-bold text-white">
              K
            </div>
            <h1 className="font-display text-2xl font-bold text-ink">Sign in to your account</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Access customer support tickets or the staff operations console.
            </p>
          </div>

          {formError && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-rose-200 bg-crimson-soft px-4 py-3 text-sm font-medium text-crimson-ops"
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <FormField label="Email address" htmlFor="login-email" error={fieldErrors.email} required>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={Boolean(fieldErrors.email)}
              />
            </FormField>

            <FormField label="Password" htmlFor="login-password" error={fieldErrors.password} required>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={Boolean(fieldErrors.password)}
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-muted hover:bg-subtle hover:text-ink"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>

            <Button type="submit" className="w-full" size="lg" loading={submitting}>
              Sign In
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-border bg-subtle/60 p-3.5 text-xs text-ink-muted">
            <div className="flex items-center gap-1.5 font-semibold text-ink">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-ops" />
              Local Demo Environment
            </div>
            <p className="mt-1">
              Seeded customer, support agent, and admin demo credentials are documented in{' '}
              <span className="font-mono font-semibold text-ink">README.md</span>.
            </p>
          </div>

          <p className="mt-5 text-center text-sm text-ink-muted">
            New customer?{' '}
            <Link to="/register" className="font-semibold text-accent hover:underline">
              Create a customer account
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
