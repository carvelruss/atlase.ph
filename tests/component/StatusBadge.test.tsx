import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';

describe('StatusBadge', () => {
  it('humanizes a status value by default', () => {
    render(<StatusBadge status="partially_refunded" />);
    expect(screen.getByText('Partially Refunded')).toBeInTheDocument();
  });

  it('uses a custom label when provided', () => {
    render(<StatusBadge status="paid" label="Payment: paid" />);
    expect(screen.getByText('Payment: paid')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders title, description, and action', () => {
    render(<EmptyState title="No products" description="Add one to begin" action={<button>Add</button>} />);
    expect(screen.getByRole('heading', { name: 'No products' })).toBeInTheDocument();
    expect(screen.getByText('Add one to begin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });
});
