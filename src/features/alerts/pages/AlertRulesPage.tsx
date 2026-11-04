import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui';
import { ConfirmDialog } from '@/components/feedback';
import { PageHeader, SectionTitle } from '@/components/page';
import { EmptyCard } from '@/components/display';
import { useAlertRules } from '../alertRulesContext';
import { AlertRuleCard } from '../components/AlertRuleCard';
import { AlertRuleDialog } from '../components/AlertRuleDialog';
import type { AlertRule } from '../types';

/** The title block of the Alert rules level, with the New rule button. */
export function AlertRulesHeader({ onNew }: { onNew: () => void }) {
  const { t } = useI18n();
  return (
    <PageHeader
      title={t('alerts.rulesPage.title')}
      subtitle={t('alerts.rulesPage.subtitle')}
      actions={
        <Button variant="primary" icon={<Plus size={13} />} onClick={onNew}>
          {t('alerts.rules.new')}
        </Button>
      }
    />
  );
}

/**
 * The rules (definitions) level: the standard rules and any the user has
 * made. Each opens its own detail page; this list is only for scanning,
 * switching on and off, and adding.
 */
export function AlertRulesBody({ creating, onCreatingChange }: { creating: boolean; onCreatingChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const { rules, removeRule, setRuleEnabled, isModified } = useAlertRules();
  const [editing, setEditing] = useState<AlertRule | null>(null);
  const [deleting, setDeleting] = useState<AlertRule | null>(null);

  const builtIn = rules.filter((r) => r.builtInKey);
  const custom = rules.filter((r) => !r.builtInKey);

  const card = (rule: AlertRule) => (
    <AlertRuleCard
      key={rule.id}
      rule={rule}
      modified={!!rule.builtInKey && isModified(rule.id)}
      onToggle={(enabled) => setRuleEnabled(rule.id, enabled)}
      onEdit={() => setEditing(rule)}
      onDelete={() => setDeleting(rule)}
    />
  );

  return (
    <>
      <div className="space-y-8">
        <section className="space-y-5">
          <SectionTitle className="mb-0" hint={t('alerts.rules.builtInHintPage')}>
            {t('alerts.rules.builtInTitle')}
          </SectionTitle>
          <div className="space-y-3">{builtIn.map(card)}</div>
        </section>

        <section className="space-y-5">
          <SectionTitle className="mb-0" hint={t('alerts.rules.customHint')}>
            {t('alerts.rules.customTitle')}
          </SectionTitle>
          {custom.length === 0 ? <EmptyCard>{t('alerts.rules.empty')}</EmptyCard> : <div className="space-y-3">{custom.map(card)}</div>}
        </section>
      </div>

      <AlertRuleDialog open={creating} onOpenChange={onCreatingChange} />
      <AlertRuleDialog rule={editing ?? undefined} open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('alerts.rules.deleteTitle')}
        description={deleting ? t('alerts.rules.deleteBody', { name: deleting.name }) : ''}
        onConfirm={() => {
          if (deleting) removeRule(deleting.id);
          setDeleting(null);
        }}
      />
    </>
  );
}
