import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { I18nProvider } from '@/i18n';
import { FormModal } from './FormModal';
import { SearchSelectField } from './SearchSelectField';

const OPTIONS = [
  { value: 'a', label: 'Migros Harvest Festival', description: 'Migros' },
  { value: 'b', label: 'Zalando Autumn Drop', description: 'Zalando' },
  { value: 'c', label: 'Café Crème Launch', description: 'Nestlé' },
];

function Harness({ onClose = vi.fn(), onSubmit = vi.fn() }: { onClose?: () => void; onSubmit?: (v: string) => void }) {
  const { control, handleSubmit } = useForm({ defaultValues: { campaignId: '' } });
  return (
    <I18nProvider>
      <FormModal
        open
        onClose={onClose}
        title="Scope"
        onSubmit={handleSubmit((v) => onSubmit(v.campaignId))}
        submitLabel="Save"
      >
        <SearchSelectField
          control={control}
          name="campaignId"
          label="Campaign"
          placeholder="Pick one"
          options={OPTIONS}
        />
      </FormModal>
    </I18nProvider>
  );
}

describe('SearchSelectField in a modal form', () => {
  it('searches, picks, and submits the picked value', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /pick one/i }));
    await user.type(await screen.findByRole('combobox'), 'cafe');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await user.click(screen.getByRole('option', { name: /café crème launch/i }));

    // The list closed and the trigger shows the pick with its client.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /café crème launch/i })).toHaveTextContent('Café Crème Launch · Nestlé');

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith('c');
  });

  it('picks with Enter without submitting the form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /pick one/i }));
    await user.type(await screen.findByRole('combobox'), 'zalando{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /zalando autumn drop/i })).toBeInTheDocument();
  });

  it('closes only the list on Escape, not the form', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /pick one/i }));
    await screen.findByRole('combobox');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
