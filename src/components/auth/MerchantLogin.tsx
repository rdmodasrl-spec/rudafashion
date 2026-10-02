import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { useB2B } from '../../context/B2BContext';
import { GoogleSignInButton } from './GoogleSignInButton';
import { AuthErrorMessage, AuthField, AuthPasswordField, AuthPrimaryButton, AuthShell } from './AuthShell';

type MerchantLoginProps = { initialMode?: 'login' | 'register' };

const merchantAuthLogo = '/ruda-wordmark.png';

const merchantIndustryOptions = [
  ['FASHION_COMPANY', '服装公司 / Azienda moda'],
  ['FASHION_WHOLESALE', '服装批发 / Ingrosso moda'],
  ['DEPARTMENT_STORE', '百货公司 / Grande magazzino'],
  ['RETAIL_STORE', '零售店 / Negozio retail'],
  ['TRADING_COMPANY', '贸易公司 / Società commerciale'],
  ['WHOLESALE_COMPANY', '批发公司 / Società all’ingrosso'],
  ['RESTAURANT', '餐馆 / Ristorante'],
  ['OTHER', '其他 / Altro']
] as const;

export const MerchantLogin: React.FC<MerchantLoginProps> = ({ initialMode = 'login' }) => {
  const {
    loginAsMerchant,
    requestMerchantRegistrationCode,
    verifyMerchantRegistrationCode,
    requestMerchantPasswordReset,
    resetMerchantPassword,
    registerMerchantQuick,
    merchantLoginError,
    setCurrentView,
    t,
    localizeCopy
  } = useB2B();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [registrationCodeSent, setRegistrationCodeSent] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [industry, setIndustry] = useState('');
  const [salesChannels, setSalesChannels] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  React.useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'register') {
      setMode('register');
    }
  }, []);
  React.useEffect(() => {
    if (!merchantLoginError) return;
    if (merchantLoginError.code === 'AUTH_RATE_LIMITED' || merchantLoginError.code === 'REQUEST_FAILED_429') {
      const retryMinutes = Math.max(1, Math.ceil((merchantLoginError.retryAfter || 900) / 60));
      setErr(t('authTooManyAttempts').replace('{minutes}', String(retryMinutes)));
    } else if (merchantLoginError.code === 'MERCHANT_PENDING_REVIEW') {
      setErr(t('authMerchantPending'));
    } else if (merchantLoginError.code === 'MERCHANT_APPLICATION_REQUIRED') {
      setErr(t('authMerchantAccessRequired'));
    } else if (merchantLoginError.code === 'MERCHANT_NOT_FOUND' || merchantLoginError.code === 'WRONG_PASSWORD') {
      setErr(t('authMerchantInvalidLogin'));
    } else {
      setErr(`${t('authLoginFailed')}: ${merchantLoginError.code}`);
    }
  }, [merchantLoginError, t]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const ok = await loginAsMerchant(email, password);
      if (!ok) {
        setErr(t('authLoginFailed'));
      }
    } catch {
      setErr(t('authLoginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const sendRegistrationCode = async () => {
    setErr('');
    setNotice('');
    setLoading(true);
    try {
      const result = await requestMerchantRegistrationCode(email);
      if (!result.ok) {
        setErr(localizeCopy(
          result.error === 'EMAIL_VERIFICATION_NOT_CONFIGURED' || result.error === 'EMAIL_DELIVERY_FAILED'
            ? '邮箱验证码暂时无法发送，请联系平台管理员。'
            : result.error === 'EMAIL_ALREADY_EXISTS'
              ? '此邮箱已注册，请直接登录或使用找回密码。'
              : '验证码发送失败，请检查邮箱后重试。',
          result.error === 'EMAIL_VERIFICATION_NOT_CONFIGURED' || result.error === 'EMAIL_DELIVERY_FAILED'
            ? 'La verifica email non è disponibile. Contatta l’amministratore.'
            : 'Impossibile inviare il codice. Controlla l’indirizzo e riprova.'
        ));
        return;
      }
      setRegistrationCodeSent(true);
      setNotice(localizeCopy('验证码已发送，请检查邮箱（包括垃圾邮件文件夹）。', 'Codice inviato. Controlla anche la cartella spam.'));
    } finally {
      setLoading(false);
    }
  };

  const submitApplication = async (event: React.FormEvent) => {
    event.preventDefault();
    setErr('');
    setNotice('');
    if (!industry) {
      setErr(localizeCopy('请先选择企业所属行业。', 'Seleziona prima il settore aziendale.'));
      return;
    }
    if (!registrationCodeSent) {
      await sendRegistrationCode();
      return;
    }
    if (password.length < 8) {
      setErr(t('authPasswordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setErr(t('authPasswordMismatch'));
      return;
    }
    setLoading(true);
    try {
      const verification = await verifyMerchantRegistrationCode(email, verificationCode);
      if (!verification.ok || !verification.verificationToken) {
        setErr(localizeCopy('验证码错误或已过期，请重新检查或获取新验证码。', 'Codice non valido o scaduto. Controlla il codice o richiedine uno nuovo.'));
        return;
      }
      const submitted = await registerMerchantQuick(
        email,
        password,
        storeName.trim() || undefined,
        salesChannels.trim() || undefined,
        verification.verificationToken,
        industry
      );
      if (submitted) setAccountCreated(true);
      else setErr(t('authMerchantApplicationError'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setErr('');
    setNotice('');
    setLoading(true);
    try {
      if (!resetCodeSent) {
        const result = await requestMerchantPasswordReset(email);
        if (!result.ok) {
          setErr(localizeCopy(
            result.error === 'EMAIL_VERIFICATION_NOT_CONFIGURED' || result.error === 'EMAIL_DELIVERY_FAILED'
              ? '邮箱暂时无法发送找回验证码，请联系平台管理员。'
              : '无法发送找回验证码，请稍后重试。',
            'Impossibile inviare il codice di recupero. Riprova più tardi o contatta l’amministratore.'
          ));
          return;
        }
        setResetCodeSent(true);
        setNotice(localizeCopy('如果此邮箱已注册商家账号，找回验证码将发送到该邮箱。', 'Se l’email è associata a un account merchant, riceverai un codice di recupero.'));
        return;
      }
      if (password.length < 8) {
        setErr(t('authPasswordTooShort'));
        return;
      }
      if (password !== confirmPassword) {
        setErr(t('authPasswordMismatch'));
        return;
      }
      const result = await resetMerchantPassword(email, verificationCode, password);
      if (!result.ok) {
        setErr(localizeCopy('验证码错误或已过期，请重新获取后重试。', 'Codice non valido o scaduto. Richiedine uno nuovo.'));
        return;
      }
      setMode('login');
      setPassword('');
      setConfirmPassword('');
      setVerificationCode('');
      setResetCodeSent(false);
      setNotice(localizeCopy('密码已更新，请使用新密码登录。', 'Password aggiornata. Accedi con la nuova password.'));
    } finally {
      setLoading(false);
    }
  };

  if (accountCreated) {
    return (
      <AuthShell title={t('authMerchantCreatedTitle')} subtitle={t('authMerchantCreatedSubtitle')} logoSrc={merchantAuthLogo}>
        <div className="space-y-4 p-5 sm:p-7">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {t('authMerchantVerificationNotice')}
          </div>
          <button type="button" onClick={() => setCurrentView('merchant_portal')} className="w-full rounded-lg bg-black py-2.5 text-sm font-semibold text-white">
            {t('authMerchantOpenDashboard')}
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={mode === 'login' ? t('authMerchantLoginTitle') : mode === 'register' ? t('authMerchantRegisterTitle') : localizeCopy('找回商家密码', 'Recupera password merchant')}
      subtitle={mode === 'login'
        ? undefined
        : mode === 'register' ? t('authMerchantRegisterSubtitle') : localizeCopy('通过商家注册邮箱验证并设置新密码。', 'Verifica l’email merchant e imposta una nuova password.')}
      logoSrc={merchantAuthLogo}
    >
        <div className="px-6 pt-6 sm:px-8">
          {mode !== 'forgot-password' && <div className="grid grid-cols-2 rounded-lg bg-neutral-100 p-1" role="tablist" aria-label={`${t('authMerchantLoginTab')} / ${t('authMerchantRegisterTab')}`}>
            <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => { setMode('login'); setErr(''); setNotice(''); }} className={`rounded-md py-2 text-sm font-semibold ${mode === 'login' ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500'}`}>
              {t('authMerchantLoginTab')}
            </button>
            <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => { setMode('register'); setErr(''); setNotice(''); }} className={`rounded-md py-2 text-sm font-semibold ${mode === 'register' ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500'}`}>
              {t('authMerchantRegisterTab')}
            </button>
          </div>}
        </div>
        <form onSubmit={mode === 'login' ? handle : mode === 'register' ? submitApplication : handlePasswordReset} className="space-y-4 p-5 sm:p-7">
            <AuthField
              label={mode === 'login' ? t('authMerchantEmailPhone') : t('authMerchantRegisterEmail')}
              icon={Building2}
              type={mode === 'login' ? 'text' : 'email'}
              value={email}
              onChange={event => setEmail(event.target.value.trim())}
              placeholder={mode === 'login' ? t('authMerchantEmailPhone') : t('authMerchantRegisterEmail')}
              autoComplete="username"
              required
            />

            {mode === 'register' && (
              <>
                <label className="block text-xs font-semibold text-neutral-700">
                  {localizeCopy('企业所属行业（必选）', 'Settore aziendale (obbligatorio)')}
                  <select
                    value={industry}
                    onChange={event => setIndustry(event.target.value)}
                    required
                    className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm font-normal text-neutral-900"
                  >
                    <option value="">{localizeCopy('请选择行业', 'Seleziona un settore')}</option>
                    {merchantIndustryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <AuthField label={t('authMerchantStoreName')} value={storeName} onChange={event => setStoreName(event.target.value)} />
                <AuthField label={t('authMerchantSalesChannels')} value={salesChannels} onChange={event => setSalesChannels(event.target.value)} placeholder={t('authMerchantSalesExample')} />
              </>
            )}

            {mode !== 'forgot-password' || resetCodeSent ? (
              <AuthPasswordField
                label={mode === 'login' ? t('authPassword') : localizeCopy('新密码', 'Nuova password')}
                value={password}
                onChange={event => setPassword(event.target.value)}
                minLength={mode === 'login' ? undefined : 8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={mode === 'register' ? t('authMerchantPasswordMin') : undefined}
                required
              />
            ) : null}

            {mode === 'register' && (
              <AuthPasswordField label={t('authConfirmPassword')} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
            )}

            {(mode === 'register' && registrationCodeSent || mode === 'forgot-password' && resetCodeSent) && (
              <AuthField
                label={localizeCopy('邮箱验证码', 'Codice email')}
                value={verificationCode}
                onChange={event => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
              />
            )}
            {mode === 'forgot-password' && resetCodeSent && (
              <AuthPasswordField label={t('authConfirmPassword')} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
            )}
            {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</div>}
            {err && <AuthErrorMessage>{err}</AuthErrorMessage>}

            <AuthPrimaryButton
              type="submit"
              disabled={loading}
            >
              {loading
                ? t('authProcessing')
                : mode === 'login'
                  ? t('authMerchantLoginButton')
                  : mode === 'register'
                    ? registrationCodeSent
                      ? t('authMerchantCreateAccountButton')
                      : localizeCopy('发送邮箱验证码', 'Invia codice email')
                    : resetCodeSent
                      ? localizeCopy('更新密码', 'Aggiorna password')
                      : localizeCopy('发送找回验证码', 'Invia codice di recupero')}
            </AuthPrimaryButton>
            {mode === 'login' && (
              <>
                <button type="button" onClick={() => { setMode('forgot-password'); setErr(''); setNotice(''); setResetCodeSent(false); setVerificationCode(''); }} className="w-full text-xs font-semibold text-neutral-600 hover:text-black">
                  {localizeCopy('忘记密码？通过邮箱找回', 'Password dimenticata? Recuperala via email')}
                </button>
                <button type="button" onClick={() => setMode('register')} className="w-full text-xs font-semibold text-neutral-600 hover:text-black">
                  {t('authMerchantNewAccount')}
                </button>
                <button type="button" onClick={() => setCurrentView('merchant_onboarding')} className="w-full text-xs font-semibold text-neutral-600 hover:text-black">
                  {t('authMerchantFullApplication')}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('ai_team_preview')}
                  className="w-full text-xs font-semibold text-amber-700 hover:text-amber-900 border border-amber-200 bg-amber-50 rounded-lg py-2"
                >
                  {t('authMerchantAiOnboarding')}
                </button>
              </>
            )}
            {mode === 'register' && registrationCodeSent && (
              <button type="button" disabled={loading} onClick={() => void sendRegistrationCode()} className="w-full text-xs font-semibold text-neutral-600 hover:text-black disabled:opacity-50">
                {localizeCopy('重新发送验证码', 'Invia di nuovo il codice')}
              </button>
            )}
            {mode === 'forgot-password' && (
              <button type="button" onClick={() => { setMode('login'); setErr(''); setNotice(''); setResetCodeSent(false); setVerificationCode(''); }} className="w-full text-xs font-semibold text-neutral-600 hover:text-black">
                {localizeCopy('返回登录', 'Torna all’accesso')}
              </button>
            )}
        </form>
        <div className="px-5 pb-6 sm:px-7">
          {mode !== 'forgot-password' && (mode !== 'register' || industry
            ? <GoogleSignInButton role="merchant" intent={mode === 'register' ? 'register' : 'login'} industry={industry} />
            : <p className="text-center text-xs text-neutral-500">{localizeCopy('使用 Google 注册前，请先在表单中选择行业。', 'Seleziona il settore nel modulo prima di registrarti con Google.')}</p>)}
        </div>
    </AuthShell>
  );
};
