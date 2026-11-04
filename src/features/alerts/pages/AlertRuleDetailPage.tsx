import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button, Card, Pill, Switch } from '@/components/ui';
import { ConfirmDialog, EmptyText } from '@/components/feedback';
import { NotFoundState, Page, PageHeader, SectionTitle } from '@/components/page';
import { StatGrid, SummaryTile } from '@/components/display';
import { useCampaigns } from '@/features/campaigns';
import { useSeatMembers, useSeats } from '@/features/seats';
import { useAlertRules } from '../alertRulesContext';
import { AlertLogTable } from '../components/AlertLogTable';
import { AlertRuleDialog } from '../components/AlertRuleDialog';
import { useAlertLog } from '../hooks/useAlertLog';
import { notifyLabel } from '../lib/notify';
import { matchesScope } from '../lib/ruleEngine';
import { ruleCondition, ruleDisplayName } from '../lib/ruleText';

/**
 * One rule: what it checks and where, its on/off state, and the campaigns it is
 * flagging right now. The definition level's detail page — the triggered
 * alerts themselves open from the list on the other level.
 */
export function AlertRuleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { rules, setRuleEnabled, removeRule } = useAlertRules();
  const { rows } = useAlertLog();
  const { data: campaigns = [] } = useCampaigns();
  const { data: seats = [] } = useSeats();
  const { data: members = [] } = useSeatMembers();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const rule = rules.find((r) => r.id === id);
  usePageTitle(rule ? ruleDisplayName(rule, rule.name, t) : undefined);

  if (!rule) {
    return (
      <NotFoundState
        title={t('alerts.ruleDetail.goneTitle')}
        body={t('alerts.ruleDetail.goneBody')}
        backTo={paths.alertRules}
        backLabel={t('alerts.backToRules')}
      />
    );
  }

  const name = ruleDisplayName(rule, rule.name, t);
  const flagged = rows.filter((r) => r.ruleId === rule.id);
  const inScope = campaigns.filter((c) => matchesScope(c, rule.scope)).length;
  const scope =
    rule.scope.level === 'portfolio'
      ? t('alerts.rules.scope.portfolio')
      : rule.scope.level === 'company'
        ? rule.scope.companyName
        : rule.scope.campaignName;

  return (
    <Page>
      <PageHeader
        back={{ to: paths.alertRules, label: t('alerts.backToRules') }}
        title={name}
        badges={
          <>
            <Pill tone="purple">{t(`alerts.rules.type.${rule.type}`)}</Pill>
            {rule.builtInKey && <Pill tone="lime">{t('alerts.rules.builtIn')}</Pill>}
            {!rule.enabled && <Pill tone="neutral">{t('alerts.rules.disabled')}</Pill>}
          </>
        }
        subtitle={ruleCondition(rule, t)}
        actions={
          <>
            <Button icon={<Pencil size={13} />} onClick={() => setEditing(true)}>
              {t('common.edit')}
            </Button>
            {!rule.builtInKey && (
              <Button icon={<Trash2 size={13} />} onClick={() => setDeleting(true)}>
                {t('common.remove')}
              </Button>
            )}
            <Switch
              checked={rule.enabled}
              onChange={(enabled) => setRuleEnabled(rule.id, enabled)}
              label={rule.enabled ? t('alerts.rules.disabled') : t('alerts.rules.enabled')}
            />
          </>
        }
      />

      <StatGrid>
        <SummaryTile label={t('alerts.ruleDetail.scope')} value={scope} />
        <SummaryTile label={t('alerts.ruleDetail.inScope')} value={String(inScope)} />
        <SummaryTile label={t('alerts.ruleDetail.flagging')} value={rule.enabled ? String(flagged.length) : '—'} />
        <SummaryTile label={t('alerts.ruleDetail.notifies')} value={notifyLabel(rule, seats, members, t)} />
      </StatGrid>

      <Card padded={false}>
        <div className="p-5 pb-0">
          <SectionTitle hint={t('alerts.ruleDetail.flaggingHint')}>{t('alerts.ruleDetail.flaggingTitle')}</SectionTitle>
        </div>
        {!rule.enabled ? (
          <EmptyText>{t('alerts.ruleDetail.off')}</EmptyText>
        ) : flagged.length === 0 ? (
          <EmptyText>{t('alerts.ruleDetail.none')}</EmptyText>
        ) : (
          <AlertLogTable rows={flagged} />
        )}
      </Card>

      <AlertRuleDialog rule={rule} open={editing} onOpenChange={setEditing} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t('alerts.rules.deleteTitle')}
        description={t('alerts.rules.deleteBody', { name: rule.name })}
        onConfirm={() => {
          removeRule(rule.id);
          navigate(paths.alertRules);
        }}
      />
    </Page>
  );
}
