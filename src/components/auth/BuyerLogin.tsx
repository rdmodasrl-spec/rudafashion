import React, { useState } from 'react';
import { Mail, Building2 } from 'lucide-react';
import { useB2B } from '../../context/B2BContext';
import { GoogleSignInButton } from './GoogleSignInButton';
import { AuthErrorMessage, AuthField, AuthPasswordField, AuthPrimaryButton, AuthShell } from './AuthShell';

export const BuyerLogin: React.FC<{ onSwitchToRegister: () => void }> = ({ onSwitchToRegister }) => {
  const { loginAsBusiness, t } = useB2B();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const ok = await loginAsBusiness(identifier, password);
      if (!ok) {
        setErr(t('authBuyerInvalid'));
      }
    } catch (e) {
      setErr(t('authBuyerInvalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t('authBuyerTitle')} subtitle={t('authBuyerSubtitle')}>
        <form onSubmit={handle} className="space-y-4 p-5 sm:p-7">
            <AuthField label={t('authEmailOrPhone')} icon={Mail} type="text" value={identifier} onChange={event => setIdentifier(event.target.value)} placeholder={t('authEmailOrPhone')} autoComplete="username" required />
            <AuthPasswordField label={t('authPassword')} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required />

            {err && <AuthErrorMessage>{err}</AuthErrorMessage>}

            <AuthPrimaryButton
              type="submit"
              disabled={loading}
            >
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              {loading ? t('authSignInLoading') : t('authSignIn')}
            </AuthPrimaryButton>

            <GoogleSignInButton role="buyer" />

            <button
              type="button"
              onClick={onSwitchToRegister}
              className="min-h-11 w-full rounded-lg border border-neutral-300 bg-white py-2.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 flex items-center justify-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              {t('authCreateAccount')}
            </button>
        </form>
    </AuthShell>
  );
};
