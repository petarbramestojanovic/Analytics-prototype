import { useCallback, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { FloatingTip } from '@/components/ui';

/**
 * One line of text that ends in an ellipsis when its column is too narrow,
 * and — only then — shows the full value in a tooltip. Width decides, not a
 * character count, so it adapts to the column, the font and the screen.
 * `children` replaces the plain text (a link, say); `text` is still the tip.
 */
export function TruncatedText({
  text,
  children,
  className,
}: {
  text: string;
  children?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [clipped, setClipped] = useState(false);
  // Measured when the pointer or focus arrives: the column may have resized
  // since first paint, and nothing needs it earlier.
  const measure = useCallback(() => {
    const el = ref.current;
    if (el) setClipped(el.scrollWidth > el.clientWidth + 1);
  }, []);

  return (
    <FloatingTip
      content={text}
      disabled={!clipped}
      className="flex w-full min-w-0"
    >
      <span
        ref={ref}
        onMouseEnter={measure}
        onFocus={measure}
        className={cn('block min-w-0 max-w-full truncate', className)}
      >
        {children ?? text}
      </span>
    </FloatingTip>
  );
}
