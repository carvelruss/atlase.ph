import clsx from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
  center?: boolean;
}

const SIZES: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: '1rem',
  md: '1.75rem',
  lg: '2.5rem',
};

export function Spinner({ size = 'md', label = 'Loading', className, center }: SpinnerProps) {
  const dimension = SIZES[size];
  const spinner = (
    <span
      className={clsx('spinner-border text-primary', className)}
      style={{ width: dimension, height: dimension, borderWidth: size === 'sm' ? 2 : 3 }}
      role="status"
    >
      <span className="visually-hidden">{label}…</span>
    </span>
  );
  if (!center) return spinner;
  return (
    <div className="d-flex justify-content-center align-items-center py-5 w-100">{spinner}</div>
  );
}
