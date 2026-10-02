import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { SelectField } from './SelectField';

function Harness({ onValueChange }: { onValueChange?: (value: string) => void }) {
  const { control } = useForm({ defaultValues: { role: 'viewer' } });
  return (
    <SelectField
      control={control}
      name="role"
      label="Role"
      options={[
        { value: 'admin', label: 'Admin' },
        { value: 'viewer', label: 'Viewer' },
      ]}
      onValueChange={onValueChange}
    />
  );
}

describe('SelectField', () => {
  it('renders the label and current value', () => {
    render(<Harness />);
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveTextContent('Viewer');
  });

  it('calls onValueChange when a new option is picked', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    render(<Harness onValueChange={(v) => calls.push(v)} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Admin' }));

    expect(calls).toEqual(['admin']);
  });
});
