import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button } from './Button';

/**
 * Copies `text` to the clipboard and flips to "Copied" for a moment. If the
 * clipboard is unavailable (insecure context, denied permission) it stays as
 * "Copy" rather than claiming success — callers show the text in a
 * `select-all` element so copying by hand is still one click away.
 */
export function CopyButton({ text }: { text: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button size="sm" icon={copied ? <Check size={12} /> : <Copy size={12} />} onClick={copy}>
      {copied ? t('common.copied') : t('common.copy')}
    </Button>
  );
}
