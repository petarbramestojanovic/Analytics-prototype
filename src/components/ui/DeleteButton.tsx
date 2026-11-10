import { Trash2 } from 'lucide-react';
import type { ComponentProps } from 'react';
import { IconButton } from './IconButton';

/**
 * The one "remove this" control: a trash icon with a tooltip. Use it wherever a
 * single item (a column, a chart, a saved view, a clicktag) can be deleted, so
 * every such control looks and behaves the same. `field` makes it a bordered
 * square the height of the inputs next to it; the default is a quiet icon.
 */
export function DeleteButton({
  label,
  field = false,
  ...props
}: { label: string; field?: boolean } & Omit<ComponentProps<typeof IconButton>, 'icon' | 'variant' | 'label'>) {
  return <IconButton {...props} label={label} variant={field ? 'dangerField' : 'danger'} icon={<Trash2 size={14} />} />;
}
