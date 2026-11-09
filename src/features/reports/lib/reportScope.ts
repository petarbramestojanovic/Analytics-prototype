import type { TranslateFn } from '@/i18n';
import type { Campaign, EmailReport, ReportScope } from '@/types';

/** Resolves a report's scope down to the company it belongs to, if any — a
 *  campaign-level report inherits its campaign's company; an account-level
 *  report has no single company. */
export function reportScopeCompanyId(scope: ReportScope, campaigns: Campaign[]): string | null {
  if (scope.level === 'client') return scope.companyId;
  if (scope.level === 'campaign') return campaigns.find((c) => c.id === scope.campaignId)?.companyId ?? null;
  return null;
}

/** Same as reportScopeCompanyId but for the account a report belongs to. */
function reportScopeAccountId(scope: ReportScope, campaigns: Campaign[]): string | null {
  if (scope.level === 'account') return scope.accountId;
  if (scope.level === 'campaign') return campaigns.find((c) => c.id === scope.campaignId)?.accountId ?? null;
  return null;
}

/** The scope's target display name, regardless of level. */
export function reportScopeName(scope: ReportScope): string {
  if (scope.level === 'client') return scope.companyName;
  if (scope.level === 'account') return scope.accountName;
  return scope.campaignName;
}

/** "Client: Migros" — the level and target together. */
export function reportScopeLabel(scope: ReportScope, t: TranslateFn): string {
  return `${t(`reports.email.level.${scope.level}`)}: ${reportScopeName(scope)}`;
}

/** The reports a seat may see: every report for an internal seat, otherwise
 *  only those belonging to its own account or company. */
export function scopeReports(
  reports: EmailReport[],
  campaigns: Campaign[],
  scope: { isInternal: boolean; seatCategory: string; companyId: string; accountId: string }
): EmailReport[] {
  if (scope.isInternal) return reports;
  if (scope.seatCategory === 'account') return reports.filter((r) => reportScopeAccountId(r.scope, campaigns) === scope.accountId);
  return reports.filter((r) => reportScopeCompanyId(r.scope, campaigns) === scope.companyId);
}
