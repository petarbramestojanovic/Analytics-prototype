import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@/i18n';
import { FormModal } from './FormModal';

function renderWithProviders(ui: ReactNode) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('FormModal', () => {
  it('calls onSubmit when the form is submitted', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    renderWithProviders(
      <FormModal open onClose={vi.fn()} title="Test modal" onSubmit={onSubmit} submitLabel="Save">
        <input aria-label="name" />
      </FormModal>
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(
      <FormModal open onClose={onClose} title="Test modal" onSubmit={vi.fn((e) => e.preventDefault())} submitLabel="Save">
        <input aria-label="name" />
      </FormModal>
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the pending label and disables submit while pending', () => {
    renderWithProviders(
      <FormModal open onClose={vi.fn()} title="Test modal" onSubmit={vi.fn()} submitLabel="Save" pending>
        <input aria-label="name" />
      </FormModal>
    );

    const submit = screen.getByRole('button', { name: 'Saving…' });
    expect(submit).toBeDisabled();
  });

  it('does not render when closed', () => {
    renderWithProviders(
      <FormModal open={false} onClose={vi.fn()} title="Test modal" onSubmit={vi.fn()} submitLabel="Save">
        <input aria-label="name" />
      </FormModal>
    );

    expect(screen.queryByText('Test modal')).not.toBeInTheDocument();
  });
});
