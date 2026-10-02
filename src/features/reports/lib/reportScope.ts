import type { TranslateFn } from '@/i18n';
import type { Campaign, EmailReport, ReportScope } from '@/types';

/** Resolves a report's scope down to the company it belongs to, if any — a
 *  campaign-level report inherits its campaign's company; an agency-level
 *  report has no single company. */
export function reportScopeCompanyId(scope: ReportScope, campaigns: Campaign[]): string | null {
  if (scope.level === 'client') return scope.companyId;
  if (scope.level === 'campaign') return campaigns.find((c) => c.id === scope.campaignId)?.companyId ?? null;
  return null;
}

/** Same as reportScopeCompanyId but for the agency a report belongs to. */
export function reportScopeAgencyId(scope: ReportScope, campaigns: Campaign[]): string | null {
  if (scope.level === 'agency') return scope.agencyId;
  if (scope.level === 'campaign') return campaigns.find((c) => c.id === scope.campaignId)?.agencyId ?? null;
  return null;
}

/** The scope's target display name, regardless of level. */
export function reportScopeName(scope: ReportScope): string {
  if (scope.level === 'client') return scope.companyName;
  if (scope.level === 'agency') return scope.agencyName;
  return scope.campaignName;
}

/** "Client: Migros" — the level and target together. */
export function reportScopeLabel(scope: ReportScope, t: TranslateFn): string {
  return `${t(`reports.email.level.${scope.level}`)}: ${reportScopeName(scope)}`;
}

/** The reports a seat may see: every report for an internal seat, otherwise
 *  only those belonging to its own agency or company. */
export function scopeReports(
  reports: EmailReport[],
  campaigns: Campaign[],
  scope: { isInternal: boolean; seatCategory: string; companyId: string; agencyId: string }
): EmailReport[] {
  if (scope.isInternal) return reports;
  if (scope.seatCategory === 'agency') return reports.filter((r) => reportScopeAgencyId(r.scope, campaigns) === scope.agencyId);
  return reports.filter((r) => reportScopeCompanyId(r.scope, campaigns) === scope.companyId);
}
