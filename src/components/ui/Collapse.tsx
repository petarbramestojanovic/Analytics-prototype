import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Slides its content open and shut instead of mounting and unmounting it. The
 * 0fr → 1fr grid-row trick animates to the content's natural height without
 * measuring it. While closed the content is `inert` (not focusable, not read
 * out) and clipped, but stays mounted, so its state survives a close.
 */
export function Collapse({ open, children, className }: { open: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      inert={!open}
      className={cn(
        'grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 motion-safe:ease-out',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        className
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
