import { useState } from 'react';
import { Laptop, Lock, Smartphone } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button, Pill } from '@/components/ui';
import { FieldMessage, PasswordField } from '@/components/form';
import { ListRow } from '@/components/display';

interface MockSession {
  id: string;
  device: string;
  kind: 'desktop' | 'mobile';
  location: string;
  /** Reuses the existing time.* i18n keys rather than inventing new ones. */
  lastActive: { key: string; n?: number };
  current?: boolean;
}

const INITIAL_SESSIONS: MockSession[] = [
  { id: 'current', device: 'Chrome on macOS', kind: 'desktop', location: 'Zurich, CH', lastActive: { key: 'time.justNow' }, current: true },
  { id: 's2', device: 'Safari on iPhone', kind: 'mobile', location: 'Zurich, CH', lastActive: { key: 'time.hAgo', n: 2 } },
  { id: 's3', device: 'Chrome on Windows', kind: 'desktop', location: 'Bern, CH', lastActive: { key: 'time.dAgo', n: 3 } },
];

export function SecurityTab() {
  const { t } = useI18n();
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-brame-dark dark:text-gray-100">{t('profile.security.password')}</span>
          <Lock size={11} className="text-gray-300 dark:text-gray-600" />
        </div>
        <div className="space-y-2">
          <PasswordField label={t('profile.security.currentPassword')} autoComplete="current-password" />
          <PasswordField label={t('profile.security.newPassword')} autoComplete="new-password" />
          <PasswordField label={t('profile.security.confirmPassword')} autoComplete="new-password" />
        </div>
        <FieldMessage help={t('profile.security.passwordHint')} />
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-brame-dark dark:text-gray-100">{t('profile.security.sessions')}</span>
        <div className="space-y-2">
          {sessions.map((s) => {
            const Icon = s.kind === 'desktop' ? Laptop : Smartphone;
            return (
              <ListRow key={s.id} className="gap-3">
                <div className="flex items-center gap-2.5">
                  <Icon size={15} className="text-gray-400 dark:text-gray-500" />
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-brame-dark dark:text-gray-100">
                      {s.device}
                      {s.current && <Pill tone="teal">{t('profile.security.thisDevice')}</Pill>}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {s.location} · {t(s.lastActive.key, s.lastActive.n !== undefined ? { n: s.lastActive.n } : undefined)}
                    </div>
                  </div>
                </div>
                {!s.current && (
                  <Button size="sm" variant="ghost" onClick={() => setSessions((prev) => prev.filter((x) => x.id !== s.id))}>
                    {t('profile.security.logOutSession')}
                  </Button>
                )}
              </ListRow>
            );
          })}
        </div>
        <FieldMessage help={t('profile.security.sessionsHint')} />
      </div>
    </div>
  );
}
