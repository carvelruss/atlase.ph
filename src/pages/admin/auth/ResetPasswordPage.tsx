import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch, ApiError } from '@/lib/api';
import { AuthLayout } from '@/layouts/AuthLayout';

const schema = z
  .object({
    password: z.string().min(10, 'Use at least 10 characters.'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await apiFetch('/api/auth/admin/reset-password', {
        method: 'POST',
        body: { token, password: values.password },
      });
      navigate('/admin/login', { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Could not reset password.');
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Invalid link" footer={<Link to="/admin/forgot-password">Request a new link</Link>}>
        <div className="alert alert-warning py-3 small mb-0" role="alert">
          This reset link is missing its token. Please request a new one.
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password" footer={<Link to="/admin/login">Back to sign in</Link>}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && (
          <div className="alert alert-danger py-2 small" role="alert">
            {serverError}
          </div>
        )}
        <div className="mb-3">
          <label htmlFor="password" className="form-label">
            New password
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
            Confirm new password
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
          {isSubmitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </AuthLayout>
  );
}
