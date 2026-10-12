import { useEffect, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { Card, Input } from '@/components/ui';
import { FieldMessage } from '@/components/form';
import { useAlertThresholds } from '../alertThresholdsContext';

/** The default watch/investigate thresholds every campaign is checked
 *  against — the same pair the Compare tab reads. A compact one-row strip
 *  that sits beside the page's tabs. */
export function ThresholdSettings({ className }: { className?: string }) {
  const { t } = useI18n();
  const { watch, investigate, setWatch, setInvestigate } = useAlertThresholds();

  return (
    <Card padded={false} className={cn('px-4 py-2.5', className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-brame-dark dark:text-gray-100">
            <TriangleAlert size={13} className="shrink-0 text-amber-500" />
            {t('alerts.settingsTitle')}
          </div>
          <p
            title={t('alerts.settingsHint')}
            className="mt-0.5 line-clamp-2 text-[11px] text-gray-500 dark:text-gray-400"
          >
            {t('alerts.settingsHint')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <PercentInput label={t('alerts.watchThreshold')} value={watch} onChange={setWatch} dotClassName="bg-amber-400" />
          <PercentInput
            label={t('alerts.investigateThreshold')}
            value={investigate}
            onChange={setInvestigate}
            dotClassName="bg-red-500"
          />
        </div>
      </div>
      {investigate <= watch && <FieldMessage error={t('alerts.thresholdInvalid')} />}
    </Card>
  );
}

/** A 0–100% input bound to a 0–1 fraction. */
function PercentInput({
  label,
  value,
  onChange,
  dotClassName,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  dotClassName: string;
}) {
  const displayValue = String(Math.round(value * 1000) / 10);
  // Local text buffer, decoupled from the numeric value while typing — a
  // controlled number input re-formatting on every keystroke is what turns
  // "clear the 4, type 8" into a stuck "08" the backspace can't touch.
  const [raw, setRaw] = useState(displayValue);

  useEffect(() => {
    setRaw((prev) => (Number(prev) === value * 100 ? prev : displayValue));
  }, [displayValue, value]);

  return (
    <label className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-gray-600 dark:text-gray-300">
        <span className={cn('h-2 w-2 rounded-full', dotClassName)} />
        {label}
      </span>
      <div className="relative w-20">
        <Input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={raw}
          onChange={(e) => {
            const text = e.target.value;
            setRaw(text);
            if (text.trim() === '') return;
            const n = Number(text);
            if (!Number.isNaN(n)) onChange(Math.max(0, n) / 100);
          }}
          onBlur={() => setRaw(displayValue)}
          className="py-1.5 pr-7"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
      </div>
    </label>
  );
}
