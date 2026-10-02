import React, { useEffect, useRef, useState } from 'react';
import { PasswordInput } from '../common/PasswordInput';
import { useB2B } from '../../context/B2BContext';

declare global {
  interface Window {
    google?: any;
  }
}

/**
 * 商家「开始免费试用」快速开店页 —— 视觉上对齐 Shopify 官方注册页（用户要求“一字不差，只换名字”）。
 * 功能上遵循“不做假按钮”原则：
 *  - 邮箱注册会立即创建可登录的商家后台；公开店铺和销售仍需资质验证。
 *  - WhatsApp / Apple 图标目前没有对应的后端登录能力，点击时明确提示“开发中”，不会假装成功。
 */

const GoogleIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.88 12c0-.79.14-1.56.39-2.28V6.63H1.29A11.98 11.98 0 0 0 0 12c0 1.94.46 3.78 1.29 5.37l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
  </svg>
);

const WhatsAppIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#25D366">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.82L2 22l5.4-1.41a9.9 9.9 0 0 0 4.64 1.18h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.02h-.01a8.1 8.1 0 0 1-4.14-1.14l-.3-.18-3.09.81.82-3-.2-.31a8.13 8.13 0 0 1-1.25-4.29c0-4.48 3.65-8.13 8.15-8.13 2.18 0 4.22.85 5.76 2.39a8.08 8.08 0 0 1 2.38 5.76c0 4.48-3.65 8.09-8.12 8.09z" />
  </svg>
);

const AppleIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#000000">
    <path d="M16.365 1.43c0 1.14-.474 2.152-1.27 2.95-.902.9-2.084 1.44-3.164 1.35-.126-1.14.462-2.2 1.27-2.98.9-.9 2.16-1.45 3.164-1.32zM20.7 17.1c-.4.94-.6 1.34-1.12 2.16-.72 1.16-1.74 2.6-3 2.62-1.12.02-1.4-.72-2.92-.72-1.52 0-1.84.7-2.94.74-1.2.04-2.1-1.26-2.82-2.42-1.5-2.4-2.64-6.8-1.1-9.76.76-1.48 2.12-2.42 3.6-2.44 1.14-.02 2.22.78 2.92.78.7 0 2-.96 3.36-.82.58.02 2.2.24 3.24 1.78-.08.06-1.94 1.14-1.92 3.4.02 2.7 2.36 3.6 2.4 3.62z" />
  </svg>
);

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

export const MerchantQuickStart: React.FC = () => {
  const { registerMerchantQuick, requestMerchantRegistrationCode, verifyMerchantRegistrationCode, lang, localizeCopy } = useB2B() as any;
  const isZh = lang === 'zh';
  const [step, setStep] = useState<'email' | 'password' | 'helpWith'>('email');
  const [email, setEmail] = useState('');
  const [industry, setIndustry] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationCodeSent, setVerificationCodeSent] = useState(false);
  const [devNotice, setDevNotice] = useState('');
  const [helpWith, setHelpWith] = useState<string[]>(['online']);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/providers', { credentials: 'include' })
      .then(r => (r.ok ? r.json() as Promise<{ google?: { enabled?: boolean; clientId?: string | null } }> : Promise.reject()))
      .then(data => {
        if (!cancelled && data.google?.enabled && data.google.clientId) setGoogleClientId(data.google.clientId);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;
    let cancelled = false;
    const renderButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        ux_mode: 'redirect',
        login_uri: `${window.location.origin}/api/auth/register/google/redirect/merchant${industry ? `?industry=${encodeURIComponent(industry)}` : ''}`
      });
      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'icon', shape: 'circle', theme: 'outline', size: 'large'
      });
      setGoogleReady(true);
    };
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      if (window.google?.accounts?.id) renderButton();
      else existing.addEventListener('load', renderButton, { once: true });
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = renderButton;
      document.head.appendChild(script);
    }
    return () => { cancelled = true; };
  }, [googleClientId, industry, isZh]);

  const HELP_OPTIONS: { id: string; label: string }[] = [
    { id: 'online', label: localizeCopy("在线销售", "Vendita online") },
    { id: 'in_store', label: localizeCopy("在实体店销售", "Vendita in negozio") },
    { id: 'dropship', label: localizeCopy("代发货", "Dropshipping") },
    { id: 'digital', label: localizeCopy("销售数字产品", "Prodotti digitali") },
    { id: 'migrate', label: localizeCopy("迁移现有商店", "Migra un negozio esistente") },
  ];
  const toggleHelp = (id: string) => setHelpWith(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  const sendRegistrationCode = async () => {
    setErr('');
    setNotice('');
    setLoading(true);
    try {
      const result = await requestMerchantRegistrationCode(email);
      if (!result.ok) {
        setErr(localizeCopy(
          result.error === 'VERIFICATION_CODE_COOLDOWN'
            ? "请稍后再试，之后可以重新发送验证码。"
            : "邮箱验证码无法发送，请检查邮箱或联系平台管理员。",
          result.error === 'VERIFICATION_CODE_COOLDOWN'
            ? "Attendi prima di richiedere un altro codice."
            : "Impossibile inviare il codice email. Controlla l’indirizzo o contatta l’amministratore."
        ));
        return;
      }
      setVerificationCodeSent(true);
      setNotice(localizeCopy("验证码已发送，请检查邮箱。", "Codice inviato. Controlla la tua email."));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr(localizeCopy("请输入有效的邮箱地址", "Inserisci un indirizzo email valido"));
      return;
    }
    if (!industry) {
      setErr(localizeCopy("请先选择企业所属行业", "Seleziona prima il settore della tua azienda"));
      return;
    }
    setErr('');
    setStep('password');
  };

  const handlePasswordContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setErr(localizeCopy("密码至少需要 8 位", "La password deve avere almeno 8 caratteri"));
      return;
    }
    setErr('');
    setStep('helpWith');
  };

  const handleFinish = async () => {
    setErr('');
    setNotice('');
    if (!verificationCodeSent) {
      await sendRegistrationCode();
      return;
    }
    setLoading(true);
    try {
      const salesChannels = HELP_OPTIONS.filter(o => helpWith.includes(o.id)).map(o => o.label).join('、');
      const verification = await verifyMerchantRegistrationCode(email, verificationCode);
      if (!verification.ok || !verification.verificationToken) {
        setErr(localizeCopy("验证码错误或已过期，请重试。", "Codice non valido o scaduto. Riprova."));
        return;
      }
      const ok = await registerMerchantQuick(email, password, undefined, salesChannels, verification.verificationToken, industry);
      if (!ok) setErr(localizeCopy("开店失败，请稍后重试", "Impossibile creare il negozio, riprova"));
      else setSubmitted(true);
    } catch {
      setErr(localizeCopy("开店失败，请稍后重试", "Impossibile creare il negozio, riprova"));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b0c] px-4 text-white">
        <section className="w-full max-w-md rounded-2xl bg-white p-7 text-neutral-900 shadow-2xl">
          <div className="text-3xl">✓</div>
          <h1 className="mt-3 text-xl font-semibold">{localizeCopy("商家账号已开通", "Account merchant creato")}</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            {localizeCopy("商家后台现在可以使用；完成企业资料并通过资质验证前，店铺和商品不会公开展示或销售。", "Il workspace merchant è subito disponibile; negozio e prodotti resteranno nascosti fino alla verifica aziendale.")}
          </p>
          <a href="/merchant" className="mt-5 inline-flex w-full justify-center rounded-lg bg-neutral-950 px-4 py-3 text-sm font-semibold text-white">
            {localizeCopy("进入商家后台", "Apri il pannello merchant")}
          </a>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg flex items-center gap-2 self-start sm:self-center sm:max-w-none sm:w-auto sm:absolute sm:left-8 sm:top-8">
        <div className="w-7 h-7 rounded bg-white flex items-center justify-center text-black font-serif font-black text-sm">R</div>
        <span className="font-semibold tracking-wide">RUDA</span>
      </div>

      {step === 'helpWith' && (
        <button
          type="button"
          onClick={() => setStep('password')}
          className="sm:absolute sm:left-8 sm:top-24 mt-16 sm:mt-0 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          aria-label={localizeCopy("返回", "Indietro")}
        >
          ←
        </button>
      )}

      {step !== 'helpWith' && (
        <div className="mt-16 sm:mt-24 text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold">{localizeCopy("开始免费试用", "Inizia la prova gratuita")}</h1>
          <p className="mt-3 text-sm text-white/60">
            {localizeCopy("免费试用 3 天，之后 3 个月，每月 €1", "Prova gratuita di 3 giorni, poi 3 mesi a €1/mese")}
          </p>
        </div>
      )}

      {step === 'helpWith' && (
        <div className="mt-16 sm:mt-24 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold">{localizeCopy("我们能为您提供哪些帮助？", "Come possiamo aiutarti?")}</h1>
          <p className="mt-3 text-sm text-white/60">
            {localizeCopy("选择所有适用项。我们将为您量身定制设置。", "Seleziona tutte le opzioni pertinenti. Personalizzeremo la configurazione per te.")}
          </p>
        </div>
      )}

      <div className={`mt-8 w-full ${step === 'helpWith' ? 'max-w-md' : 'max-w-sm'} bg-white text-neutral-900 rounded-2xl shadow-2xl p-6`}>
        {step === 'email' && (
          <form onSubmit={handleEmailContinue} className="space-y-3">
            <label className="block text-xs font-semibold text-neutral-700">
              {localizeCopy("企业所属行业（必选）", "Settore aziendale (obbligatorio)")}
              <select
                value={industry}
                onChange={event => setIndustry(event.target.value)}
                required
                className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm font-normal text-neutral-900"
              >
                <option value="">{localizeCopy("请选择行业", "Seleziona un settore")}</option>
                {merchantIndustryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              placeholder={localizeCopy("电子邮件地址", "Indirizzo email")}
              required
              autoFocus
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            {err && <div className="text-xs text-red-600">{err}</div>}
            {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</div>}
            <button
              type="submit"
              className="w-full bg-neutral-950 text-white py-3 rounded-lg font-semibold text-sm hover:bg-neutral-800 transition-colors"
            >
              {localizeCopy("使用电子邮件继续", "Continua con email")}
            </button>

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-neutral-200" />
              <span className="text-xs text-neutral-400">{localizeCopy("或", "oppure")}</span>
              <div className="flex-1 h-px bg-neutral-200" />
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDevNotice(localizeCopy("WhatsApp 登录暂未开放，敬请期待", "Accesso WhatsApp non ancora disponibile"))}
                className="w-11 h-11 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition-colors"
                aria-label="WhatsApp"
              >
                <WhatsAppIcon />
              </button>
              {industry ? (
                <div ref={googleButtonRef} className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center" aria-label="Google">
                  {!googleReady && (
                    <div className="w-11 h-11 rounded-full border border-neutral-200 flex items-center justify-center">
                      <GoogleIcon />
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-11 h-11 rounded-full border border-neutral-200 flex items-center justify-center opacity-40" aria-label="Google">
                  <GoogleIcon />
                </div>
              )}
              <button
                type="button"
                onClick={() => setDevNotice(localizeCopy("Apple 登录暂未开放，敬请期待", "Accesso Apple non ancora disponibile"))}
                className="w-11 h-11 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition-colors"
                aria-label="Apple"
              >
                <AppleIcon />
              </button>
            </div>
            {devNotice && <p className="text-center text-[11px] text-neutral-500">{devNotice}</p>}

            <p className="text-center text-xs text-neutral-500 pt-1">
              {localizeCopy("已有 RUDA 账户？", "Hai già un account RUDA?")}{' '}
              <button type="button" onClick={() => { window.location.href = '/merchant'; }} className="font-semibold text-neutral-900 underline underline-offset-2">
                {localizeCopy("登录", "Accedi")}
              </button>
            </p>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handlePasswordContinue} className="space-y-3">
            <p className="text-sm text-neutral-600">{email}</p>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={localizeCopy("设置密码（至少 8 位）", "Imposta una password (min. 8 caratteri)")}
              required
              autoFocus
              minLength={8}
              className="w-full px-4 py-3 pr-10 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            {err && <div className="text-xs text-red-600">{err}</div>}
            <button
              type="submit"
              className="w-full bg-neutral-950 text-white py-3 rounded-lg font-semibold text-sm hover:bg-neutral-800 transition-colors"
            >
              {localizeCopy("继续", "Continua")}
            </button>
            <button type="button" onClick={() => setStep('email')} className="w-full text-xs font-semibold text-neutral-500 hover:text-neutral-900">
              {localizeCopy("返回", "Indietro")}
            </button>
          </form>
        )}

        {step === 'helpWith' && (
          <div className="space-y-4">
            {verificationCodeSent && (
              <div className="space-y-2">
                <label htmlFor="merchant-quick-verification-code" className="block text-xs font-semibold text-neutral-700">
                  {localizeCopy("邮箱验证码", "Codice email")}
                </label>
                <input
                  id="merchant-quick-verification-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={verificationCode}
                  onChange={event => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {HELP_OPTIONS.map(opt => {
                const active = helpWith.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleHelp(opt.id)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium border transition-colors ${
                      active ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-neutral-100 text-neutral-700 border-transparent hover:bg-neutral-200'
                    }`}
                  >
                    <span>{active ? '✓' : '+'}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {err && <div className="text-xs text-red-600">{err}</div>}
            <button
              type="button"
              onClick={handleFinish}
              disabled={loading}
              className="w-full bg-neutral-950 text-white py-3 rounded-lg font-semibold text-sm hover:bg-neutral-800 transition-colors disabled:opacity-60"
            >
              {loading
                ? (localizeCopy("正在为你开店...", "Creazione negozio..."))
                : verificationCodeSent
                  ? localizeCopy("验证并创建商家账号", "Verifica e crea account merchant")
                  : localizeCopy("发送邮箱验证码", "Invia codice email")}
            </button>
            {verificationCodeSent && (
              <button type="button" onClick={() => void sendRegistrationCode()} disabled={loading} className="w-full text-xs font-semibold text-neutral-600 hover:text-black disabled:opacity-50">
                {localizeCopy("重新发送验证码", "Invia di nuovo il codice")}
              </button>
            )}
          </div>
        )}
      </div>

      <button type="button" className="mt-8 flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-white/70 cursor-default">
        🇮🇹 Italia
      </button>
    </div>
  );
};

export default MerchantQuickStart;
