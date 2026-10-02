import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import type { ReactNode } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui';
import { FormField } from './FormField';

export interface SelectOption {
  value: string;
  label: ReactNode;
}

/** The shared `Select` bound to react-hook-form — the Controller counterpart
 *  of spreading `register()` onto a `TextField`. */
export function SelectField<TValues extends FieldValues, TName extends Path<TValues>>({
  control,
  name,
  label,
  placeholder,
  options,
  help,
  error,
  onValueChange,
}: {
  control: Control<TValues>;
  name: TName;
  label: string;
  placeholder?: string;
  options: readonly SelectOption[];
  help?: ReactNode;
  error?: ReactNode;
  /** Fires after the field's own onChange — e.g. clearing a dependent field
   *  when CreateSeatModal's category picker changes. */
  onValueChange?: (value: string) => void;
}) {
  return (
    <FormField label={label} error={error} help={help}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            value={field.value as string}
            onValueChange={(v) => {
              field.onChange(v);
              onValueChange?.(v);
            }}
          >
            <SelectTrigger placeholder={placeholder} />
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </FormField>
  );
}
