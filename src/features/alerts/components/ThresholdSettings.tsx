import { useEffect, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { Card, Input } from '@/components/ui';
import { FieldLabel, FieldMessage } from '@/components/form';
import { useAlertThresholds } from '../alertThresholdsContext';

/** The default watch/investigate thresholds every campaign is checked
 *  against — the same pair the Compare tab reads. */
export function ThresholdSettings() {
  const { t } = useI18n();
  const { watch, investigate, setWatch, setInvestigate } = useAlertThresholds();

  return (
    <Card className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-brame-dark dark:text-gray-100">
            <TriangleAlert size={15} className="shrink-0 text-amber-500" />
            {t('alerts.settingsTitle')}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('alerts.settingsHint')}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-start gap-3">
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
    <label className="block">
      <FieldLabel className="whitespace-nowrap">
        <span className={cn('h-2 w-2 rounded-full', dotClassName)} />
        {label}
      </FieldLabel>
      <div className="relative w-28">
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
          className="pr-8"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
      </div>
    </label>
  );
}
