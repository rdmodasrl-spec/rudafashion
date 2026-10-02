import React, { useState } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { useB2B } from '../../context/B2BContext';
import { AuthErrorMessage, AuthField, AuthPasswordField, AuthPrimaryButton, AuthShell } from './AuthShell';

export const PlatformAdminLogin: React.FC = () => {
  const { loginAsAdmin, adminIpWhitelistInfo, adminLoginError, t, localizeCopy } = useB2B();
  const ipAllowed = adminIpWhitelistInfo?.allowed !== false;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const displayedError = adminLoginError === 'ADMIN_IP_NOT_ALLOWED'
    ? t('authAdminNetworkUnauthorized')
    : adminLoginError === 'ADMIN_NOT_FOUND' || adminLoginError === 'WRONG_PASSWORD'
      ? t('authAdminCredentialsInvalid')
      : adminLoginError === 'ADMIN_OTP_REQUIRED' || adminLoginError === 'INVALID_OTP'
        ? t('authAdminOtpInvalid')
        : adminLoginError === 'ADMIN_2FA_CONFIGURATION_INVALID'
          ? t('authAdminTwoFactorConfig')
    : err;

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const ok = await loginAsAdmin(username, password, otp || undefined);
      if (!ok) {
        setErr(t('authLoginFailed'));
      }
    } catch {
      setErr(t('authLoginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t('authAdminTitle')} subtitle={t('authAdminSubtitle')}>
          <form onSubmit={handle} className="space-y-4 p-5 sm:p-7">
            {adminIpWhitelistInfo && (
              <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs ${ipAllowed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                {!ipAllowed && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                <div>
                  <div className="font-medium">{ipAllowed ? t('authAdminNetworkAuthorized') : t('authAdminNetworkUnauthorized')}</div>
                  {!ipAllowed && <div className="mt-1">{t('authAdminNetworkContact')}</div>}
                </div>
              </div>
            )}

            <AuthField label={t('authAdminUsername')} value={username} onChange={event => setUsername(event.target.value.trim())} autoComplete="username" required />
            <AuthPasswordField label={t('authPassword')} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required />
            {(adminLoginError === 'ADMIN_OTP_REQUIRED' || adminLoginError === 'INVALID_OTP') && (
              <AuthField
                label={localizeCopy('6 位动态验证码或一次性恢复码', 'Codice dinamico a 6 cifre o codice di recupero monouso')}
                inputMode="text"
                autoComplete="one-time-code"
                value={otp}
                onChange={event => setOtp(event.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20).toUpperCase())}
                maxLength={20}
                autoFocus
              />
            )}
            {displayedError && <AuthErrorMessage>{displayedError}</AuthErrorMessage>}

            <AuthPrimaryButton
              type="submit"
              disabled={loading || !ipAllowed}
            >
              <Shield className="h-4 w-4" />
              {loading
                ? t('authAdminVerifying')
                : t('authAdminSubmit')}
            </AuthPrimaryButton>
          </form>
    </AuthShell>
  );
};
