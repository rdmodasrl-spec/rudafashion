import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { PhoneNumberInput, formatInternationalPhoneNumber } from '../common/PhoneNumberInput';
import { countryCallingCodes, phoneCountryOptions } from '../../constants/countries';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Factory,
  Globe2,
  LogIn,
  Moon,
  Settings2,
  Store,
  Sun,
  Truck,
  MessageCircle,
} from 'lucide-react';
import { ApiError, apiGet, apiPost } from '../../api/client';
import { useB2B } from '../../context/B2BContext';
import { LANGUAGE_OPTIONS, type Language } from '../../i18n/translations';
import type { SupportedCurrency } from '../../types/b2b';
import type { Order, SolanaPaymentDetails } from '../../types/b2b';
import { CustomerLogin } from '../auth/CustomerLogin';

const currencies: SupportedCurrency[] = ['EUR', 'USD', 'CNY', 'GBP', 'JPY', 'CHF'];
const LazyMyBusinessPortal = lazy(() => import('../buyer/MyBusinessPortal').then(module => ({ default: module.MyBusinessPortal })));

export const AccountHubView: React.FC = () => {
  const {
    authRole,
    authCustomerAccount,
    authBuyer,
    currentCustomer,
    lang,
    setLang,
    setAutoLanguage,
    languagePreference,
    displayCurrency,
    setDisplayCurrency,
    monochromeMode,
    setMonochromeMode,
    accountPreferencesSynced,
    accountPreferencesSyncError,
    addNotification,
    replaceOrderFromServer,
    logout,
    setCurrentView, localizeCopy,
  } = useB2B();
  const [showBusinessWorkspace, setShowBusinessWorkspace] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [activePanel, setActivePanel] = useState<'settings' | 'support' | 'join' | 'services' | null>(null);
  const [supportName, setSupportName] = useState(authBuyer?.companyName || currentCustomer?.companyName || authCustomerAccount?.email || authCustomerAccount?.phone || '');
  const [supportEmail, setSupportEmail] = useState(authCustomerAccount?.email || '');
  const [supportPhoneCountry, setSupportPhoneCountry] = useState(() => {
    const phoneDigits = (authCustomerAccount?.phone || '').replace(/\D/g, '');
    return [...phoneCountryOptions]
      .sort((a, b) => countryCallingCodes[b].length - countryCallingCodes[a].length)
      .find(country => phoneDigits.startsWith(countryCallingCodes[country])) || (lang === 'it' ? 'Italy' : 'France');
  });
  const [supportPhone, setSupportPhone] = useState(() => {
    const rawPhone = authCustomerAccount?.phone || '';
    const digits = rawPhone.replace(/\D/g, '');
    const callingCode = countryCallingCodes[supportPhoneCountry] || '';
    return rawPhone.startsWith('+') && callingCode && digits.startsWith(callingCode)
      ? digits.slice(callingCode.length)
      : rawPhone;
  });
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportBusy, setSupportBusy] = useState(false);
  const [supportError, setSupportError] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [solanaPayment, setSolanaPayment] = useState<SolanaPaymentDetails | null>(null);
  const [solanaPaymentError, setSolanaPaymentError] = useState('');
  const [solanaRequestCopied, setSolanaRequestCopied] = useState(false);
  const paypalReturnStarted = useRef<string | null>(null);
  const stripeReturnStarted = useRef<string | null>(null);
  const solanaPaymentStarted = useRef<string | null>(null);
  const replaceOrderFromServerRef = useRef(replaceOrderFromServer);
  replaceOrderFromServerRef.current = replaceOrderFromServer;
  const addNotificationRef = useRef(addNotification);
  addNotificationRef.current = addNotification;
  const isIt = lang === 'it';
  const signedInBuyer = authRole === 'buyer' || authRole === 'company';
  const signedIn = signedInBuyer || authRole === 'customer';
  const canSyncPreferences = ['buyer', 'company', 'merchant', 'customer'].includes(authRole);
  const customerName = authBuyer?.companyName || currentCustomer?.companyName || authCustomerAccount?.email || authCustomerAccount?.phone;

  const copySolanaPaymentRequest = async () => {
    if (!solanaPayment?.uri) return;
    try {
      await navigator.clipboard.writeText(solanaPayment.uri);
      setSolanaRequestCopied(true);
      addNotification('success', '支付请求已复制', '请粘贴到支持 Solana Pay 的钱包中，并在钱包内核对后确认。');
      window.setTimeout(() => setSolanaRequestCopied(false), 2500);
    } catch (error) {
      addNotification('warning', '复制失败', error instanceof Error ? error.message : '浏览器未允许访问剪贴板，请使用二维码付款。');
    }
  };

  useEffect(() => {
    if (!supportName && customerName) setSupportName(customerName);
  }, [customerName, supportName]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paypalStatus = params.get('paypal');
    if (paypalStatus !== 'return' && paypalStatus !== 'cancelled') return;
    const clearPaypalReturn = () => {
      params.delete('paypal');
      params.delete('order');
      params.delete('token');
      const query = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    };
    if (paypalStatus === 'cancelled') {
      clearPaypalReturn();
      addNotificationRef.current('info', 'PayPal 付款已取消', '订单仍为待付款状态；如需继续，请在订单页面联系商家。');
      return;
    }
    if (!signedInBuyer) return;
    const paypalOrderId = params.get('token');
    const orderNo = params.get('order');
    const requestKey = `${paypalOrderId || ''}:${orderNo || ''}`;
    if (!paypalOrderId || !orderNo) {
      clearPaypalReturn();
      addNotificationRef.current('warning', 'PayPal 回跳信息不完整', '未能取得 PayPal 订单编号，请联系商家核对订单。');
      return;
    }
    if (paypalReturnStarted.current === requestKey) return;
    paypalReturnStarted.current = requestKey;
    apiPost<{ success: true; payment: { status: string }; order?: Order }>('/api/payments/paypal/capture', { paypalOrderId, orderNo })
      .then(result => {
        if (result.order) replaceOrderFromServerRef.current(result.order);
        clearPaypalReturn();
        addNotificationRef.current('success', 'PayPal 付款成功', '付款已由服务端确认，订单状态已更新。');
      })
      .catch(error => {
        paypalReturnStarted.current = null;
        addNotificationRef.current('warning', 'PayPal 付款确认失败', error instanceof Error ? error.message : '请勿重复付款；稍后刷新页面重试或联系商家核对。');
      });
  }, [signedInBuyer]);

  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get('solanaOrder');
    if (!orderId || !signedInBuyer || solanaPaymentStarted.current === orderId) return;
    solanaPaymentStarted.current = orderId;
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const checkPayment = async () => {
      try {
        const result = await apiGet<{ success: true; payment: SolanaPaymentDetails; order: Order }>(
          `/api/payments/solana/${encodeURIComponent(orderId)}`
        );
        if (!active) return;
        setSolanaPayment(result.payment);
        setSolanaPaymentError('');
        if (result.payment.status === 'paid') {
          replaceOrderFromServerRef.current(result.order);
          addNotificationRef.current('success', 'Solana Pay 付款成功', '链上转账已验证，订单状态已更新并可供商家处理。');
          return;
        }
        if (result.payment.status === 'expired' || result.payment.status === 'late_payment') return;
        retryTimer = setTimeout(checkPayment, 2_000);
      } catch (error) {
        if (!active) return;
        const retryable = !(error instanceof ApiError) || [408, 429, 500, 502, 503, 504].includes(error.status);
        setSolanaPaymentError(error instanceof Error ? error.message : 'Solana 付款状态读取失败');
        if (retryable) retryTimer = setTimeout(checkPayment, 5_000);
      }
    };
    void checkPayment();
    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
      solanaPaymentStarted.current = null;
    };
  }, [signedInBuyer]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get('stripe');
    if (stripeStatus !== 'return' && stripeStatus !== 'cancelled') return;
    const clearStripeReturn = () => {
      params.delete('stripe');
      params.delete('order');
      params.delete('session_id');
      const query = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    };
    if (stripeStatus === 'cancelled') {
      clearStripeReturn();
      addNotificationRef.current('info', 'Stripe 付款已取消', '订单仍为待付款状态；如需继续付款，请联系商家。');
      return;
    }
    if (!signedInBuyer) return;
    const sessionId = params.get('session_id');
    const orderNo = params.get('order');
    const requestKey = `${sessionId || ''}:${orderNo || ''}`;
    if (!sessionId || !orderNo) {
      clearStripeReturn();
      addNotificationRef.current('warning', 'Stripe 回跳信息不完整', '未能取得 Stripe 结账编号，请联系商家核对订单。');
      return;
    }
    if (stripeReturnStarted.current === requestKey) return;
    stripeReturnStarted.current = requestKey;
    apiPost<{ success: true; payment: { status: string }; order?: Order }>('/api/payments/stripe/confirm', { sessionId, orderNo })
      .then(result => {
        if (result.order) replaceOrderFromServerRef.current(result.order);
        clearStripeReturn();
        addNotificationRef.current('success', 'Stripe 付款成功', 'Stripe 已确认付款，订单状态已更新。');
      })
      .catch(error => {
        stripeReturnStarted.current = null;
        addNotificationRef.current('warning', 'Stripe 付款确认失败', error instanceof Error ? error.message : '请勿重复付款；稍后刷新页面重试或联系商家核对。');
      });
  }, [signedInBuyer]);

  useEffect(() => {
    const openSignIn = () => setShowSignIn(true);
    try {
      if (window.sessionStorage.getItem('ruda:open-customer-login') === '1') {
        window.sessionStorage.removeItem('ruda:open-customer-login');
        openSignIn();
      }
    } catch (error) {
      console.warn('[customer-login-navigation]', error);
    }
    window.addEventListener('ruda:open-customer-login', openSignIn);
    return () => window.removeEventListener('ruda:open-customer-login', openSignIn);
  }, []);

  const submitSupportRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSupportError('');
    setSupportSubmitted(false);
    if (!supportEmail.trim() && !supportPhone.trim()) {
      setSupportError(localizeCopy('请至少填写邮箱或联系电话。', 'Inserisci un indirizzo email o un numero di telefono.'));
      return;
    }
    setSupportBusy(true);
    try {
      await apiPost('/api/support-requests', {
        name: supportName.trim(),
        email: supportEmail.trim(),
        phone: formatInternationalPhoneNumber(supportPhoneCountry, supportPhone),
        subject: supportSubject.trim(),
        message: supportMessage.trim()
      });
      setSupportSubject('');
      setSupportMessage('');
      setSupportSubmitted(true);
      addNotification('success', localizeCopy('咨询已提交', 'Richiesta inviata'), localizeCopy('RUDA 客服团队会通过你留下的联系方式回复。', 'Il team RUDA ti risponderà usando i recapiti indicati.'));
    } catch (error) {
      const message = error instanceof Error ? error.message : (localizeCopy('请稍后重试。', 'Riprova più tardi.'));
      setSupportError(localizeCopy("提交失败：{{RUDA_ARG_0}}", "Invio non riuscito: {{RUDA_ARG_0}}", [String(message)]));
    } finally {
      setSupportBusy(false);
    }
  };

  const chooseLanguage = (value: Language | 'auto') => {
    if (value === 'auto') {
      setAutoLanguage();
    } else {
      setLang(value);
    }
  };

  const destinations = [
    { label: localizeCopy('RUDA 特价', 'Catalogo sconti'), detail: localizeCopy('浏览全站商家折扣商品', 'Offerte da tutti i partner'), icon: CircleDollarSign, view: 'catalog' as const },
    { label: localizeCopy('品牌商家', 'Showroom partner'), detail: localizeCopy('浏览合作品牌与独立店铺', 'Scopri i brand e i negozi'), icon: Store, view: 'showrooms' as const },
    { label: localizeCopy('生产商家', 'Produttori'), detail: localizeCopy('寻找源头工厂与生产商', 'Fabbriche e produttori'), icon: Factory, view: 'showrooms' as const, path: '/producers' },
    { label: localizeCopy('批发商家', 'Grossisti'), detail: localizeCopy('浏览批发供货商', 'Partner all’ingrosso'), icon: Truck, view: 'showrooms' as const, path: '/wholesalers' },
    { label: localizeCopy('零售商家', 'Rivenditori'), detail: localizeCopy('浏览零售门店与买手店', 'Boutique e negozi'), icon: Building2, view: 'showrooms' as const, path: '/retailers' },
    { label: localizeCopy('RUDA 时尚', 'RUDA Fashion'), detail: localizeCopy('阅读趋势与时尚灵感', 'Tendenze e ispirazioni'), icon: Globe2, view: 'fashion_trends' as const },
  ];

  const navigate = (view: typeof destinations[number]['view'], path?: string) => {
    setCurrentView(view);
    if (path) window.history.pushState({}, '', path);
    else if (view === 'catalog') window.history.pushState({}, '', '/catalog');
    else if (view === 'showrooms') window.history.pushState({}, '', '/showrooms');
    else if (view === 'fashion_trends') window.history.pushState({}, '', '/trends');
  };

  if (showSignIn && !signedIn) {
    return (
      <div className="ui-page-shell max-w-xl">
        <button type="button" onClick={() => setShowSignIn(false)} className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-black">
          <ArrowLeft className="h-4 w-4" /> {localizeCopy('返回功能中心', 'Impostazioni e servizi')}
        </button>
        <CustomerLogin onSwitchToRegister={() => {
          setShowSignIn(false);
          setCurrentView('register_wholesale');
        }} />
      </div>
    );
  }

  if (showBusinessWorkspace && signedInBuyer) {
    return (
      <div className="ui-page-shell">
        <button type="button" onClick={() => setShowBusinessWorkspace(false)} className="mb-5 text-xs font-semibold text-neutral-600 hover:text-black">
          ← {localizeCopy('返回功能中心', 'Impostazioni e servizi')}
        </button>
        <Suspense fallback={<div className="py-12 text-center text-sm text-neutral-500">{localizeCopy('正在加载采购商工作台...', 'Caricamento area aziendale...')}</div>}>
          <LazyMyBusinessPortal />
        </Suspense>
      </div>
    );
  }

  const panelTitles = {
    settings: localizeCopy('设置', 'Impostazioni'),
    support: localizeCopy('联系平台客服', 'Assistenza RUDA'),
    join: localizeCopy('申请入驻', 'Diventa partner'),
    services: localizeCopy('平台服务', 'Esplora RUDA')
  };
  const menuItems = [
    { key: 'settings' as const, label: localizeCopy('设置', 'Impostazioni'), detail: localizeCopy('语言、货币与显示模式', 'Lingua, valuta e aspetto'), icon: Settings2 },
    { key: 'support' as const, label: localizeCopy('联系平台客服', 'Assistenza RUDA'), detail: localizeCopy('提交问题，联系 RUDA 客服团队', 'Invia una richiesta al team'), icon: MessageCircle },
    { key: 'join' as const, label: localizeCopy('申请入驻', 'Diventa partner'), detail: localizeCopy('生产商、批发商或零售商申请', 'Produttore, grossista o rivenditore'), icon: Building2 },
    { key: 'services' as const, label: localizeCopy('平台服务', 'Esplora RUDA'), detail: localizeCopy('特价、品牌商家与时尚趋势', 'Collezioni, partner e tendenze'), icon: Globe2 }
  ];

  return (
    <div className="ui-page-shell max-w-3xl space-y-4 pb-8">
      <header className="border-b border-neutral-300 pb-4 pt-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-neutral-500">RUDA / MY RUDA</p>
        {activePanel ? (
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={() => setActivePanel(null)} aria-label={localizeCopy('返回我的', 'Indietro')} className="flex h-9 w-9 shrink-0 items-center justify-center border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-950">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="font-serif text-2xl font-medium tracking-tight text-neutral-950">{panelTitles[activePanel]}</h1>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl font-medium tracking-tight text-neutral-950">{localizeCopy('我的 RUDA', 'Il tuo spazio RUDA')}</h1>
              {customerName && <p className="mt-1 text-xs text-neutral-500">{customerName}</p>}
            </div>
            <div className="flex items-center gap-2">
              {signedInBuyer && (
                <button type="button" onClick={() => setShowBusinessWorkspace(true)} className="inline-flex min-h-9 items-center gap-1.5 bg-neutral-950 px-3 text-[11px] font-semibold text-white hover:bg-neutral-700">
                  {localizeCopy('采购商工作台', 'Area aziendale')} <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              )}
              {!signedIn && (
                <button type="button" onClick={() => setShowSignIn(true)} className="inline-flex min-h-9 items-center gap-1.5 border border-neutral-300 px-3 text-[11px] font-semibold text-neutral-800 hover:border-neutral-950">
                  <LogIn className="h-3.5 w-3.5" /> {localizeCopy('登录', 'Accedi')}
                </button>
              )}
              {authRole === 'customer' && (
                <button type="button" onClick={logout} className="inline-flex min-h-9 items-center border border-neutral-300 px-3 text-[11px] font-semibold text-neutral-800 hover:border-neutral-950">
                  {localizeCopy('退出', 'Esci')}
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {solanaPayment && <section aria-live="polite" className={`rounded-2xl border p-4 sm:p-5 ${solanaPayment.status === 'paid' ? 'border-emerald-200 bg-emerald-50' : ['late_payment', 'review', 'expired'].includes(solanaPayment.status) ? 'border-amber-200 bg-amber-50' : 'border-violet-200 bg-violet-50'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-neutral-950">
              {solanaPayment.status === 'paid' ? 'Solana Pay 已确认到账' : solanaPayment.status === 'expired' ? '付款报价已过期' : solanaPayment.status === 'late_payment' ? '检测到过期时间后的转账' : solanaPayment.status === 'review' ? '付款需要人工核对' : '等待 Solana 钱包付款'}
            </h2>
            <p className="mt-1 text-xs leading-5 text-neutral-700">订单金额 €{Number(solanaPayment.eurAmount).toFixed(2)} · 扫码支付 {Number(solanaPayment.tokenAmount).toFixed(6)} {solanaPayment.tokenSymbol}</p>
            <p className="mt-1 text-xs leading-5 text-neutral-700">分账：商家收到 {Number(solanaPayment.merchantAmount).toFixed(6)} {solanaPayment.tokenSymbol}（{((1 - Number(solanaPayment.commissionRate)) * 100).toFixed(2)}%） · RUDA 平台服务费 {Number(solanaPayment.commissionAmount).toFixed(6)} {solanaPayment.tokenSymbol}（{(Number(solanaPayment.commissionRate) * 100).toFixed(2)}%）</p>
          </div>
          {solanaPayment.status === 'paid' && solanaPayment.signature && <a href={`https://explorer.solana.com/tx/${encodeURIComponent(solanaPayment.signature)}`} target="_blank" rel="noreferrer noopener" className="text-xs font-semibold text-emerald-800 underline">查看链上交易</a>}
        </div>
        {solanaPayment.status === 'pending' && <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="mx-auto flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-950 px-3 py-1.5 text-[10px] font-extrabold tracking-wide text-white shadow-sm">
                <svg aria-hidden="true" viewBox="0 0 32 24" className="h-4 w-5">
                  <defs><linearGradient id="solana-mark-gradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#9945FF" /><stop offset="100%" stopColor="#14F195" /></linearGradient></defs>
                  <path fill="url(#solana-mark-gradient)" d="M5 2h25l-4 4H1l4-4Zm0 8h25l-4 4H1l4-4Zm0 8h25l-4 4H1l4-4Z" />
                </svg>
                SOLANA · SPL
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-extrabold tracking-wide text-blue-800">
                <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-full bg-blue-600 text-[9px] text-white">$</span>
                {solanaPayment.tokenSymbol}
              </span>
            </div>
            <div className="rounded-xl bg-white p-3"><QRCodeSVG value={solanaPayment.uri} size={220} level="M" includeMargin /></div>
            <button type="button" onClick={() => void copySolanaPaymentRequest()} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-50">
              {solanaRequestCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {solanaRequestCopied ? 'Payment Request Copied（已复制）' : 'Copy Payment Request（复制支付请求）'}
            </button>
            <p className="max-w-[260px] break-all text-center text-[10px] leading-4 text-neutral-500">复制后可粘贴至支持 Solana Pay Transaction Request 的钱包；付款前请核对网络与金额。</p>
          </div>
          <div className="space-y-2 text-xs leading-5 text-neutral-700">
            <h3 className="font-semibold text-neutral-900">Solana Pay 支付说明</h3>
            <p>1. 打开支持 Solana 网络的钱包 App（Phantom、Solflare 或 OKX 钱包）。</p>
            <p>2. 使用钱包的“扫一扫”扫描二维码，并确认当前网络为 Solana (SPL)。</p>
            <p>3. 核对订单金额与分账：{Number(solanaPayment.merchantAmount).toFixed(6)} {solanaPayment.tokenSymbol} 支付给商家，{Number(solanaPayment.commissionAmount).toFixed(6)} {solanaPayment.tokenSymbol} 为 RUDA 平台技术服务费；确认无误后在钱包中批准交易。</p>
            <p className="font-semibold text-neutral-900">重要提示：仅支持存放在 Solana (SPL) 主网上的 USDC 或 EURC。请勿从其他网络转账。</p>
            <p>钱包需留有少量 SOL 用于网络费；首次创建收款代币账户时还可能产生账户租金。实际费用由钱包在确认前显示，可能随网络和账户状态变化，不是固定的 0.01 SOL。</p>
            <p>报价汇率：1 EUR = {Number(solanaPayment.exchangeRate).toFixed(6)} {solanaPayment.tokenSymbol}（{solanaPayment.exchangeRateSource}）</p>
            <p>汇率数据更新时间：{new Date(solanaPayment.exchangeRateUpdatedAt).toLocaleString()} · 报价有效至：{new Date(solanaPayment.expiresAt).toLocaleString()}</p>
            <p>RUDA 每 2 秒向 Solana 主网核验一次；未完成链上验证前不会把订单标记为已付款。</p>
          </div>
        </div>}
        {solanaPayment.status === 'expired' && <p className="mt-2 text-xs leading-5 text-amber-900">二维码已过期，请勿再向该地址付款；如已发起转账，请联系商家核对订单。库存仍需由商家确认后处理。</p>}
        {solanaPayment.status === 'late_payment' && <p className="mt-2 text-xs leading-5 text-amber-900">链上检测到转账，但交易时间晚于锁定报价或订单已取消。系统不会自动把订单标记为已付款，请联系商家人工核对到账。</p>}
        {solanaPayment.status === 'review' && <p className="mt-2 text-xs leading-5 text-amber-900">检测到该付款编号相关交易，但收款方、资产、金额或确认时间需要人工核对。订单尚未标记为已付款，请联系商家。</p>}
        {solanaPaymentError && <p role="alert" className="mt-2 text-xs text-rose-800">状态检查暂时失败：{solanaPaymentError}。页面会继续重试；请勿重复付款。</p>}
      </section>}

      {!activePanel ? (
        <nav aria-label={localizeCopy('我的功能菜单', 'Menu personale')} className="divide-y divide-neutral-200 border-y border-neutral-200 bg-white">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.key} type="button" onClick={() => setActivePanel(item.key)} className="group flex min-h-16 w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-neutral-50 sm:px-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-neutral-100 text-neutral-700"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-neutral-950">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-neutral-500">{item.detail}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-900" />
              </button>
            );
          })}
        </nav>
      ) : activePanel === 'settings' ? (
        <section aria-label={localizeCopy('账户偏好设置', 'Preferenze account')} className="space-y-3">
          <p className="text-xs text-neutral-500" role="status">
            {canSyncPreferences
              ? accountPreferencesSynced
                ? (localizeCopy('偏好已同步到 RUDA 账户，可在其他设备恢复。', 'Sincronizzato con il tuo account RUDA.'))
                : accountPreferencesSyncError
                  ? (localizeCopy('偏好同步失败，请检查网络后重试。', 'Sincronizzazione non riuscita. Controlla la connessione.'))
                  : (localizeCopy('正在同步账户偏好…', 'Sincronizzazione in corso...'))
              : (localizeCopy('偏好保存在本设备；登录账户后可同步。', 'Le preferenze vengono salvate su questo dispositivo.'))}
          </p>
          <div className="border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{localizeCopy('网站语言', 'Lingua')}</p>
                <p className="mt-1 text-xs text-neutral-500">{localizeCopy('选择 RUDA 网站显示语言', 'Scegli la lingua dell’interfaccia')}</p>
              </div>
              <Globe2 className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => chooseLanguage('auto')} aria-pressed={languagePreference === 'auto'} className={`inline-flex min-h-9 items-center gap-1.5 border px-3 text-xs font-semibold ${languagePreference === 'auto' ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-300 text-neutral-700 hover:border-neutral-950'}`}>
                {languagePreference === 'auto' && <Check className="h-3.5 w-3.5" />}{localizeCopy('自动', 'Automatico')}
              </button>
              {LANGUAGE_OPTIONS.map(({ code, nativeName }) => {
                const active = lang === code && languagePreference === code;
                return <button key={code} type="button" onClick={() => chooseLanguage(code)} aria-pressed={active} className={`inline-flex min-h-9 items-center gap-1.5 border px-3 text-xs font-semibold ${active ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-300 text-neutral-700 hover:border-neutral-950'}`}>{active && <Check className="h-3.5 w-3.5" />}{nativeName}</button>;
              })}
            </div>
          </div>
          <div className="border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{localizeCopy('展示货币', 'Valuta')}</p>
                <p className="mt-1 text-xs text-neutral-500">{localizeCopy('订单以 EUR 结算，其他货币仅用于展示', 'Gli ordini sono regolati in EUR')}</p>
              </div>
              <CircleDollarSign className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {currencies.map(currency => <button key={currency} type="button" onClick={() => setDisplayCurrency(currency)} aria-pressed={displayCurrency === currency} className={`min-h-9 border text-xs font-semibold ${displayCurrency === currency ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-300 text-neutral-700 hover:border-neutral-950'}`}>{currency}</button>)}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 border border-neutral-200 bg-white p-4">
            <div>
              <p className="text-sm font-semibold">{localizeCopy('黑白显示模式', 'Modalità bianco e nero')}</p>
              <p className="mt-1 text-xs text-neutral-500">{localizeCopy('切换全站黑白显示', 'Visualizzazione monocromatica del sito')}</p>
            </div>
            <button type="button" role="switch" aria-checked={monochromeMode} aria-label={localizeCopy('黑白显示模式', 'Modalità bianco e nero')} onClick={() => void setMonochromeMode(!monochromeMode)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${monochromeMode ? 'bg-neutral-950' : 'bg-neutral-300'}`}>
              <span className={`absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-neutral-800 transition-transform ${monochromeMode ? 'translate-x-6' : 'translate-x-1'}`}>{monochromeMode ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}</span>
            </button>
          </div>
        </section>
      ) : activePanel === 'support' ? (
        <section aria-label={localizeCopy('联系平台客服', 'Contatta RUDA')} className="border border-neutral-200 bg-white p-4 sm:p-5">
          <p className="mb-4 text-xs leading-5 text-neutral-500">{localizeCopy('填写问题和联系方式，客服工单会提交至平台总后台，由团队跟进处理。', 'Descrivi la tua richiesta. Il team ti ricontatterà usando email o telefono.')}</p>
          <form onSubmit={event => void submitSupportRequest(event)} className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-neutral-700">{localizeCopy('姓名', 'Nome')}<input required maxLength={120} value={supportName} onChange={event => setSupportName(event.target.value)} className="mt-1.5 min-h-10 w-full border border-neutral-200 bg-neutral-50 px-3 text-sm font-normal outline-none focus:border-neutral-700" /></label>
            <label className="text-xs font-semibold text-neutral-700">{localizeCopy('邮箱（或电话）', 'Email (o telefono)')}<input type="email" maxLength={254} value={supportEmail} onChange={event => setSupportEmail(event.target.value)} placeholder="name@example.com" className="mt-1.5 min-h-10 w-full border border-neutral-200 bg-neutral-50 px-3 text-sm font-normal outline-none focus:border-neutral-700" /></label>
            <label className="text-xs font-semibold text-neutral-700">{localizeCopy('联系电话（或邮箱）', 'Telefono (o email)')}<PhoneNumberInput country={supportPhoneCountry} onCountryChange={setSupportPhoneCountry} value={supportPhone} onChange={setSupportPhone} maxLength={32} className="mt-1.5 min-h-10 w-full" inputClassName="bg-neutral-50 text-sm focus:border-neutral-700 focus:ring-0" countrySelectClassName="min-h-10 text-xs" /></label>
            <label className="text-xs font-semibold text-neutral-700">{localizeCopy('咨询主题', 'Oggetto')}<input required maxLength={120} value={supportSubject} onChange={event => setSupportSubject(event.target.value)} className="mt-1.5 min-h-10 w-full border border-neutral-200 bg-neutral-50 px-3 text-sm font-normal outline-none focus:border-neutral-700" /></label>
            <label className="text-xs font-semibold text-neutral-700 sm:col-span-2">{localizeCopy('问题描述', 'Messaggio')}<textarea required minLength={10} maxLength={4000} rows={4} value={supportMessage} onChange={event => setSupportMessage(event.target.value)} placeholder={localizeCopy('请描述问题（至少 10 个字符）...', 'Scrivi almeno 10 caratteri...')} className="mt-1.5 w-full resize-y border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-normal outline-none focus:border-neutral-700" /></label>
            {supportError && <p role="alert" className="text-xs text-rose-700 sm:col-span-2">{supportError}</p>}
            {supportSubmitted && <p role="status" className="text-xs text-emerald-700 sm:col-span-2">{localizeCopy('咨询已登记，已同步到 RUDA 平台后台。', 'La richiesta è stata registrata nel sistema RUDA.')}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
              <p className="text-[11px] text-neutral-500">{localizeCopy('邮箱和电话至少填写一项。', 'È necessario indicare almeno un recapito.')}</p>
              <button type="submit" disabled={supportBusy} className="inline-flex min-h-10 items-center gap-2 bg-neutral-950 px-4 text-xs font-semibold text-white hover:bg-neutral-700 disabled:cursor-wait disabled:opacity-50"><MessageCircle className="h-3.5 w-3.5" />{supportBusy ? (localizeCopy('提交中…', 'Invio...')) : (localizeCopy('提交客服咨询', 'Invia richiesta'))}</button>
            </div>
          </form>
        </section>
      ) : activePanel === 'join' ? (
        <section className="border border-neutral-200 bg-white p-5 sm:p-6">
          <h2 className="font-serif text-2xl font-medium">{localizeCopy('让你的时尚生意连接欧洲市场。', 'Porta la tua attività nella moda europea.')}</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">{localizeCopy('生产商、批发商、零售商均可申请入驻，展示商品并拓展欧洲商业合作。', 'Candidati come produttore, grossista o rivenditore e presenta il tuo business alla rete RUDA.')}</p>
          <button type="button" onClick={() => setCurrentView('register_wholesale')} className="mt-5 inline-flex min-h-10 items-center gap-2 bg-neutral-950 px-4 text-xs font-semibold text-white hover:bg-neutral-700">{localizeCopy('开始申请入驻', 'Richiedi l’accesso')}<ArrowUpRight className="h-4 w-4" /></button>
        </section>
      ) : (
        <nav aria-label={localizeCopy('RUDA 平台服务', 'Servizi RUDA')} className="divide-y divide-neutral-200 border-y border-neutral-200 bg-white">
          {destinations.map(item => {
            const Icon = item.icon;
            return <button key={item.label} type="button" onClick={() => navigate(item.view, item.path)} className="group flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-neutral-50 sm:px-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center bg-neutral-100 text-neutral-700"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-neutral-950">{item.label}</span><span className="mt-0.5 block text-xs text-neutral-500">{item.detail}</span></span><ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-900" /></button>;
          })}
        </nav>
      )}
    </div>
  );
};
