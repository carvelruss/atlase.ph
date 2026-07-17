import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '@/components/common/Modal';

describe('Modal', () => {
  it('does not render when closed', () => {
    render(<Modal open={false} onClose={() => {}} title="Hidden">body</Modal>);
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('renders title and content when open', () => {
    render(<Modal open onClose={() => {}} title="Edit item"><p>Form here</p></Modal>);
    expect(screen.getByRole('dialog', { name: 'Edit item' })).toBeInTheDocument();
    expect(screen.getByText('Form here')).toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Edit"><input aria-label="field" /></Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Edit">body</Modal>);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
