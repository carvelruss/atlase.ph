import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch, setCsrfToken, ApiError } from '@/lib/api';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ADMIN_SESSION_KEY, type AdminUser } from '@/features/auth/AuthProvider';

const schema = z
  .object({
    name: z.string().min(1, 'Your name is required.'),
    email: z.string().email('Enter a valid email address.'),
    password: z.string().min(10, 'Use at least 10 characters.'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
type FormValues = z.infer<typeof schema>;

export function SetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const result = await apiFetch<{ admin: AdminUser; csrfToken: string }>('/api/auth/admin/setup', {
        method: 'POST',
        body: { name: values.name, email: values.email, password: values.password },
      });
      setCsrfToken(result.csrfToken);
      await queryClient.invalidateQueries({ queryKey: ADMIN_SESSION_KEY });
      navigate('/admin', { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Could not complete setup.');
    }
  }

  return (
    <AuthLayout title="Create your admin account" subtitle="This is a one-time setup for the store owner.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && (
          <div className="alert alert-danger py-2 small" role="alert">
            {serverError}
          </div>
        )}
        <div className="mb-3">
          <label htmlFor="name" className="form-label">
            Full name
          </label>
          <input id="name" className={`form-control ${errors.name ? 'is-invalid' : ''}`} {...register('name')} />
          {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
        </div>
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
            autoComplete="new-password"
            className={`form-control ${errors.password ? 'is-invalid' : ''}`}
            {...register('password')}
          />
          {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
        </div>
        <div className="mb-4">
          <label htmlFor="confirmPassword" className="form-label">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword.message}</div>}
        </div>
        <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account & continue'}
        </button>
      </form>
    </AuthLayout>
  );
}
