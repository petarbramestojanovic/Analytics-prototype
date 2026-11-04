import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@/i18n';
import type { ComboboxOption } from '@/components/ui';
import { FilterCombobox } from './FilterCombobox';

const OPTIONS: ComboboxOption[] = [
  { value: 'a', label: 'Migros Harvest Festival', description: 'Migros' },
  { value: 'b', label: 'Zalando Autumn Drop', description: 'Zalando' },
  { value: 'c', label: 'Café Crème Launch', description: 'Nestlé' },
];

function Harness({ options = OPTIONS }: { options?: ComboboxOption[] }) {
  const [values, setValues] = useState<string[]>([]);
  return (
    <I18nProvider>
      <FilterCombobox values={values} onChange={setValues} allLabel="All campaigns" options={options} />
    </I18nProvider>
  );
}

const open = async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: /all campaigns/i }));
  return { user, search: await screen.findByRole('combobox') };
};

describe('FilterCombobox', () => {
  it('narrows the list as you type, ignoring case and accents', async () => {
    const { user, search } = await open();
    await user.type(search, 'cafe creme');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: /café crème launch/i })).toBeInTheDocument();
  });

  it('needs every word to match, and searches the description too', async () => {
    const { user, search } = await open();
    await user.type(search, 'zalando drop');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await user.clear(search);
    await user.type(search, 'nestle');
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });

  it('says so when nothing matches', async () => {
    const { user, search } = await open();
    await user.type(search, 'xyzzy');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  it('ticks with the keyboard and shows the pick on the trigger', async () => {
    const { user, search } = await open();
    await user.type(search, 'zalando');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('option', { name: /zalando/i })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: /zalando autumn drop/i })).toBeInTheDocument();
  });

  it('never draws more than 100 rows, and says how many more there are', async () => {
    const many = Array.from({ length: 1000 }, (_, i) => ({ value: `c${i}`, label: `Campaign ${i}` }));
    const user = userEvent.setup();
    render(<Harness options={many} />);
    await user.click(screen.getByRole('button', { name: /all campaigns/i }));
    expect(await screen.findAllByRole('option')).toHaveLength(100);
    expect(screen.getByText(/Showing 100 of 1000/)).toBeInTheDocument();
    await user.type(screen.getByRole('combobox'), 'Campaign 99');
    // Contains "99": 99, 199 … 899 and 990–999.
    expect(screen.getAllByRole('option')).toHaveLength(19);
  });
});
