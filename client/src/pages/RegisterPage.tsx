import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '../app/AuthContext';
import { ApiError } from '../lib/api';
import { Button, Card, FormField, Input } from '../components/ui/Primitives';
import { useToast } from '../components/ui/Toast';

const registerFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100)
});

export function RegisterPage() {
  const { register } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = registerFormSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      const errs = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        name: errs.name?.[0],
        email: errs.email?.[0],
        password: errs.password?.[0]
      });
      return;
    }

    setSubmitting(true);
    try {
      await register(parsed.data.name, parsed.data.email, parsed.data.password);
      pushToast({ type: 'success', title: 'Customer account created' });
      navigate('/app', { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Registration failed';
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
            <h1 className="font-display text-2xl font-bold text-ink">Create customer account</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Register to raise support tickets and chat with our policy-grounded assistant.
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
            <FormField label="Full name" htmlFor="reg-name" error={fieldErrors.name} required>
              <Input
                id="reg-name"
                type="text"
                autoComplete="name"
                placeholder="Neha Verma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={Boolean(fieldErrors.name)}
              />
            </FormField>

            <FormField label="Email address" htmlFor="reg-email" error={fieldErrors.email} required>
              <Input
                id="reg-email"
                type="email"
                autoComplete="email"
                placeholder="neha@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={Boolean(fieldErrors.email)}
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="reg-password"
              error={fieldErrors.password}
              hint="Minimum 8 characters."
              required
            >
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
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
              Register & Continue
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
