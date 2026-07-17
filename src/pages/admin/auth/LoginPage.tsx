import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch, setCsrfToken, ApiError } from '@/lib/api';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ADMIN_SESSION_KEY, type AdminUser } from '@/features/auth/AuthProvider';

const schema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
  rememberMe: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

interface LoginResponse {
  admin: AdminUser;
  csrfToken: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { rememberMe: false } });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const result = await apiFetch<LoginResponse>('/api/auth/admin/login', {
        method: 'POST',
        body: values,
      });
      setCsrfToken(result.csrfToken);
      await queryClient.invalidateQueries({ queryKey: ADMIN_SESSION_KEY });
      navigate('/admin', { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.');
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Enter your credentials to continue."
      footer={<Link to="/admin/forgot-password">Forgot your password?</Link>}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && (
          <div className="alert alert-danger py-2 small" role="alert">
            {serverError}
          </div>
        )}
        <div className="mb-3">
          <label htmlFor="email" className="form-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
            {...register('email')}
          />
          {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
        </div>
        <div className="mb-3">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className={`form-control ${errors.password ? 'is-invalid' : ''}`}
            {...register('password')}
          />
          {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
        </div>
        <div className="form-check mb-4">
          <input id="rememberMe" type="checkbox" className="form-check-input" {...register('rememberMe')} />
          <label htmlFor="rememberMe" className="form-check-label">
            Keep me signed in
          </label>
        </div>
        <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
