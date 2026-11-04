import { Avatar } from '@/components/ui';

/** A Salesforce user as "photo + name" — used in filter dropdowns and chips. */
export function PersonLabel({ name, avatarUrl, size = 20 }: { name: string; avatarUrl: string | null; size?: number }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar name={name} imageUrl={avatarUrl} size={size} />
      <span className="truncate">{name}</span>
    </span>
  );
}
