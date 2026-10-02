import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { paths } from '@/config/paths';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button, Checkbox } from '@/components/ui';
import { PasswordField, TextField } from '@/components/form';
import { AuthLayout } from '../components/AuthLayout';
import { AuthHeader, AuthSwitchPrompt } from '../components/AuthParts';
import { usePasswordConfirmation } from '../hooks/usePasswordConfirmation';

export function SignupPage() {
  const { t } = useI18n();
  usePageTitle(t('auth.signup.title'));
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const passwords = usePasswordConfirmation();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!passwords.validate()) return;
    // Prototype: no account is actually created — move straight into the app.
    navigate(paths.overview);
  };

  return (
    <AuthLayout>
      <AuthHeader title={t('auth.signup.title')} subtitle={t('auth.signup.subtitle')} />

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <TextField label={t('auth.signup.name')} required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <TextField
          label={t('auth.signup.company')}
          required
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          autoComplete="organization"
        />
        <TextField
          label={t('auth.signup.email')}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <PasswordField label={t('auth.signup.password')} required autoComplete="new-password" {...passwords.passwordProps} />
        <PasswordField
          label={t('auth.signup.confirmPassword')}
          required
          autoComplete="new-password"
          {...passwords.confirmProps}
        />

        <Checkbox label={t('auth.signup.terms')} required checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />

        <Button type="submit" variant="primary" icon={<UserPlus size={15} />} disabled={!agreed}>
          {t('auth.signup.submit')}
        </Button>
      </form>

      <AuthSwitchPrompt prompt={t('auth.signup.haveAccount')} linkLabel={t('auth.signup.signIn')} to={paths.login} />
    </AuthLayout>
  );
}
