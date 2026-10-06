import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SignOutModal } from './SignOutModal.js';

describe('SignOutModal', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <SignOutModal isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders confirmation dialog when isOpen is true', () => {
    render(<SignOutModal isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByRole('alertdialog')).toBeDefined();
    expect(screen.getAllByText('Sign Out')).toHaveLength(2);
    expect(screen.getByText(/Are you sure you want to sign out of ExzaEstate ERP\?/)).toBeDefined();
    expect(screen.getByText('Cancel')).toBeDefined();
  });

  it('calls onClose when Cancel is clicked', () => {
    const handleClose = vi.fn();
    render(<SignOutModal isOpen={true} onClose={handleClose} onConfirm={vi.fn()} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Sign Out button is clicked', () => {
    const handleConfirm = vi.fn();
    render(<SignOutModal isOpen={true} onClose={vi.fn()} onConfirm={handleConfirm} />);

    // Click the confirm button in the modal
    const confirmButton = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent === 'Sign Out');
    expect(confirmButton).toBeDefined();
    fireEvent.click(confirmButton!);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(<SignOutModal isOpen={true} onClose={handleClose} onConfirm={vi.fn()} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when isSigningOut is true', () => {
    render(
      <SignOutModal isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} isSigningOut={true} />,
    );

    expect(screen.getByText('Signing out...')).toBeDefined();
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn.hasAttribute('disabled')).toBe(true);
    });
  });
});
