import React, { useState } from 'react';
import {
  ShoppingBag,
  Building2,
  ChevronDown,
  Layers,
  Sparkles,
  Truck,
  ShieldCheck,
  Globe,
  Store,
  LogOut,
  UserCircle,
  Package,
  BarChart3,
  FileText,
  Menu,
  Settings,
  BadgeCheck,
  Bot
} from 'lucide-react';
import { useB2B } from '../context/B2BContext';
import { isLanguage, LANGUAGE_OPTIONS } from '../i18n/translations';

export const Header: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    totalCartQty,
    totalCartAmount,
    currentCustomer,
    lang,
    languagePreference,
    setLang,
    setAutoLanguage,
    t,
    authRole,
    authBuyer,
    authMerchant,
    authCustomerAccount,
    authCompanyId,
    authAdminName,
    logout,
    returnToAdminPortal,
    setShowBuyerRegister,
    setActiveBuyerTab, localizeCopy,
  } = useB2B();

  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const isIt = lang === 'it';
  const isZh = lang === 'zh';

  const openCustomerLogin = () => {
    try {
      window.sessionStorage.setItem('ruda:open-customer-login', '1');
    } catch (error) {
      console.warn('[customer-login-navigation]', error);
    }
    setCurrentView('account');
    window.dispatchEvent(new Event('ruda:open-customer-login'));
  };

  const EffectiveLangSwitch = (
    <label className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-neutral-700 px-2 text-[11px] font-semibold text-white" title={localizeCopy("选择网站语言", "Scegli la lingua del sito")}>
      <Globe className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
      <select
        aria-label={localizeCopy("选择网站语言", "Lingua del sito")}
        value={languagePreference}
        onChange={event => {
          if (event.target.value === 'auto') setAutoLanguage();
          else if (isLanguage(event.target.value)) setLang(event.target.value);
        }}
        className="max-w-32 cursor-pointer bg-transparent text-white outline-none"
      >
        <option className="text-neutral-900" value="auto">{localizeCopy("自动", "Automatico")}</option>
        {LANGUAGE_OPTIONS.map(language => <option className="text-neutral-900" key={language.code} value={language.code}>{language.nativeName}</option>)}
      </select>
    </label>
  );
  const PublicLanguageSwitch = (
    <label className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-neutral-300 bg-white px-2 text-[11px] font-semibold text-neutral-700 shadow-sm">
      <Globe className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
      <select
        aria-label={localizeCopy("选择网站语言", "Lingua del sito")}
        value={languagePreference === 'auto' ? lang : languagePreference}
        onChange={event => {
          if (event.target.value === 'auto') setAutoLanguage();
          else if (isLanguage(event.target.value)) setLang(event.target.value);
        }}
        className="max-w-24 cursor-pointer bg-transparent outline-none"
      >
        <option value="auto">{localizeCopy("自动", "Auto")}</option>
        {LANGUAGE_OPTIONS.map(language => (
          <option key={language.code} value={language.code}>{language.code.toUpperCase()}</option>
        ))}
      </select>
    </label>
  );

  // ================================
  // 🔴 PLATFORM ADMIN HEADER (super-admin / admin)
  // ================================
  if (authRole === 'admin') {
    return (
      <header className="sticky top-0 z-40 shadow-md">
        <div className="bg-black text-white text-xs px-4 py-1.5 border-b border-neutral-800">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-white font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {localizeCopy("RUDA 平台管理中心", "RUDA Gestione Piattaforma")}
                <span className="ml-2 px-2 py-0.5 rounded bg-emerald-600 text-[10px] font-black tracking-widest animate-pulse">
                  {localizeCopy("运营中", "OPERATIVO")}
                </span>
              </span>
              <span className="hidden lg:inline-flex items-center gap-1 text-neutral-400">
                <BarChart3 className="w-3.5 h-3.5" />
                {localizeCopy("运营管理 · 生产商审核 · 财务结算 · 合规管理", "Gestione · Produttori · Finanza · Conformità")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {EffectiveLangSwitch}
              <div className="flex items-center gap-2 bg-neutral-900/70 px-2.5 py-1 rounded-lg border border-neutral-700">
                <UserCircle className="w-4 h-4 text-emerald-300" />
                <span className="font-bold text-white">{authAdminName || 'SuperAdmin'}</span>
                <span className="text-neutral-400 text-[10px]">平台</span>
                <button
                  type="button"
                  onClick={() => void returnToAdminPortal()}
                  className="ml-1 px-2 py-0.5 text-neutral-200 hover:text-white hover:bg-black rounded flex items-center gap-1 transition-colors cursor-pointer text-[10px] font-semibold border border-neutral-600 hover:border-emerald-500"
                >
                  <ShieldCheck className="w-3 h-3" /> {localizeCopy("返回总后台", "Back to admin")}
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="px-2 py-0.5 text-neutral-200 hover:text-white hover:bg-black rounded flex items-center gap-1 transition-colors cursor-pointer text-[10px] font-semibold border border-neutral-600 hover:border-emerald-500"
                >
                  <LogOut className="w-3 h-3" /> {localizeCopy("退出", "Logout")}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white border-b border-neutral-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div onClick={() => setCurrentView('platform_admin')} className="cursor-pointer flex items-center gap-2.5 shrink-0">
              <div className="portal-logo-mark w-9 h-9 flex items-center justify-center font-serif text-lg font-bold tracking-tighter rounded-md shadow">
                R
              </div>
              <div>
                <div className="font-serif font-black text-lg tracking-wider text-neutral-900">RUDA · 平台管理</div>
                <div className="hidden sm:block text-[10px] text-neutral-500 uppercase tracking-widest">
                  {localizeCopy("运营管理 · 生产商合规与服务", "Gestione produttori e conformità")}
                </div>
              </div>
            </div>
            <div className="text-right text-[11px] text-neutral-600 hidden md:block">
              <div className="font-semibold text-neutral-900">
                {localizeCopy("管理员中心 · 操作全程留痕", "Area amministratori · Operazioni registrate")}
              </div>
              <div className="font-mono text-neutral-500">
                {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // ================================
  // 🟡 MERCHANT SELLER HEADER (/merchant)
  // ================================
  if (authRole === 'merchant' && authMerchant && currentView === 'merchant_portal') {
    return (
      <header className="sticky top-0 z-40 shadow-md">
        <div className="bg-black text-white text-xs px-4 py-1.5 border-b border-neutral-800">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-white font-bold">
                <Store className="w-3.5 h-3.5 text-emerald-300" />
                {localizeCopy("RUDA 生产商中心", "RUDA Producer Center")}
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
              </span>
              <span className="hidden lg:inline-flex items-center gap-1 text-neutral-300/90">
                <Package className="w-3.5 h-3.5" />
                {localizeCopy("商品管理 · 订单发货 · 库存管理 · 财务结算", "Catalogo · Spedizioni · Magazzino · Pagamenti")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {EffectiveLangSwitch}
              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                className="px-2.5 py-1.5 text-neutral-100 hover:text-white hover:bg-black rounded flex items-center gap-1.5 transition-colors cursor-pointer text-[10px] font-semibold border border-neutral-600 hover:border-emerald-500"
              >
                <Store className="w-3.5 h-3.5" /> {t('navStorefront')}
              </button>
              <div className="flex items-center gap-2 bg-neutral-900/60 px-2.5 py-1 rounded-lg border border-neutral-700">
                <div
                  className="w-6 h-6 rounded bg-emerald-500 text-black flex items-center justify-center font-black text-xs"
                  title={authMerchant.companyLegalName}
                >
                  {authMerchant.code ? authMerchant.code.slice(0, 2).toUpperCase() : 'M'}
                </div>
                <div className="leading-tight">
                  <div className="font-bold text-white text-[11px]">{authMerchant.name}</div>
                  <div className="text-neutral-300 text-[9px] font-mono">{authMerchant.code || authMerchant.id}</div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="ml-1 px-2 py-0.5 text-neutral-200 hover:text-white hover:bg-black rounded flex items-center gap-1 transition-colors cursor-pointer text-[10px] font-semibold border border-neutral-600 hover:border-emerald-500"
                >
                  <LogOut className="w-3 h-3" /> {localizeCopy("退出", "Logout")}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white border-b border-neutral-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div onClick={() => setCurrentView('merchant_portal')} className="cursor-pointer flex items-center gap-2.5 shrink-0">
              <img
                src="/merchant-app-logo.png"
                alt="RUDA Fashion"
                className="w-9 h-9 rounded-md object-cover shadow"
              />
              <div>
                <div className="font-serif font-black text-lg tracking-wider text-neutral-900">RUDA · 生产商中心</div>
                <div className="hidden sm:block text-[10px] text-neutral-500 uppercase tracking-widest">
                  {localizeCopy('商户管理 · {{RUDA_ARG_0}}, {{RUDA_ARG_1}}', 'Gestione fornitore · {{RUDA_ARG_0}}, {{RUDA_ARG_1}}', [String(authMerchant.city), String(authMerchant.country)])}
                </div>
              </div>
            </div>
            <div className="text-right text-[11px] text-neutral-600 hidden md:block">
              <div className="font-semibold">{localizeCopy("现货直发 · 当日配货 · 次日出库", "In-Stock · Same-day Picking · Next-day Dispatch")}</div>
              <div className="font-mono text-neutral-500">
                {t('currencyEu')} · DHL / GLS / Bartolini
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // ================================
  // 🛍️ DEFAULT: BUYER FRONTEND (首页/选款/展厅等)
  //  - 如果批发商已登录，显示批发商信息和退出
  //  - 未登录则显示"登录/注册"入口
  // ================================
  const isBuyerLoggedIn = authRole === 'buyer';
  const isBusinessLoggedIn = authRole === 'buyer' || authRole === 'company';
  const isMerchantLoggedIn = authRole === 'merchant' && Boolean(authMerchant);
  const hasSession = authRole !== 'guest' && authRole !== 'consumer';
  const buyerDisplay = isBuyerLoggedIn && authBuyer ? authBuyer : currentCustomer;
  const directoryNav = [
    { label: localizeCopy("首页", "HOME"), path: '/', view: 'home' as const },
    { label: 'RUDA FASHION', path: '/trends', view: 'fashion_trends' as const },
    { label: localizeCopy("RUDA特价", "RUDA SALE"), path: '/catalog', view: 'catalog' as const },
    { label: localizeCopy("品牌商家", "BRAND SHOWROOMS"), path: '/showrooms', view: 'showrooms' as const },
    { label: localizeCopy("生产商家", "PRODUCERS"), path: '/producers', view: 'showrooms' as const },
    { label: localizeCopy("批发商家", "WHOLESALERS"), path: '/wholesalers', view: 'showrooms' as const },
    { label: localizeCopy("零售商家", "RETAILERS"), path: '/retailers', view: 'showrooms' as const },
  ];
  const navigateDirectory = (path: string, view: 'home' | 'fashion_trends' | 'catalog' | 'showrooms') => {
    setCurrentView(view);
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-xs">
      {/* Top Utility Announcement Bar */}
      <div className="hidden sm:block bg-neutral-950 text-neutral-300 text-xs px-4 py-1.5 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs tracking-wide">
            <span className="flex items-center gap-1.5 text-white font-medium">
              <Sparkles className="w-3.5 h-3.5 text-neutral-300" />
              {t('topAnnouncement')}
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-neutral-400">
              <Truck className="w-3.5 h-3.5 text-neutral-400" />
              {t('fastDispatch')}
            </span>
            <span className="hidden lg:inline-flex items-center gap-1 text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-300" />
              {t('footerVatCompliance')}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs ml-auto">
            <div className="hidden lg:flex items-center gap-1 text-neutral-400">
              <Globe className="w-3 h-3" />
              <span>{t('currencyEu')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-1 px-4 py-3 sm:py-4">
        <button
          type="button"
          onClick={() => setCurrentView('account')}
          aria-label={localizeCopy("网站设置与服务", "Impostazioni e servizi")}
          title={localizeCopy("网站设置与服务", "Impostazioni e servizi")}
          className="col-start-1 row-start-1 hidden h-10 w-10 cursor-pointer items-center justify-center text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-black md:flex"
        >
          <Menu className="h-5 w-5" strokeWidth={1.6} />
        </button>
        <div
          onClick={() => setCurrentView('home')}
          className="col-start-2 row-start-1 cursor-pointer text-center"
        >
          <span className="font-serif text-4xl font-black tracking-[0.18em] text-neutral-950 sm:text-5xl">RUDA</span>
          <p className="text-xs font-semibold uppercase tracking-[0.38em] text-neutral-500 sm:text-sm">FASHION</p>
        </div>

        {currentView === 'home' && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('ruda:open-ai-support'))}
            aria-label={localizeCopy("打开 AI 客服", "Apri assistenza AI")}
            title={localizeCopy("AI 客服", "Assistenza AI")}
            className="col-start-3 row-start-1 ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-neutral-950 text-white shadow-sm transition-colors hover:bg-neutral-700 md:hidden"
          >
            <Bot className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="col-span-3 col-start-1 row-start-2 flex items-center justify-center gap-2 sm:gap-3 md:col-span-1 md:col-start-3 md:row-start-1 md:justify-self-end">
          {PublicLanguageSwitch}
          {!hasSession && (
            <div className="flex items-center gap-1.5">
              <button
                id="header-sign-in-btn"
                type="button"
                onClick={openCustomerLogin}
                className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-semibold text-neutral-800 transition-colors hover:border-neutral-500 hover:bg-neutral-50 sm:px-3"
              >
                {localizeCopy("登录", "Sign in")}
              </button>
              <button
                id="header-start-free-trial-btn"
                type="button"
                onClick={() => setCurrentView('merchant_quick_start')}
                className="rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 sm:px-4"
              >
                {localizeCopy("开始免费试用", "Start free trial")}
              </button>
            </div>
          )}

          {/* Account menu */}
          {hasSession && <div className="relative block">
            <button
              id="account-menu-toggle"
              type="button"
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-neutral-300 text-xs font-medium bg-neutral-50 transition-colors cursor-pointer"
            >
              {isMerchantLoggedIn && authMerchant ? (
                <>
                  <Store className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                  <span className="hidden sm:inline max-w-[120px] truncate text-xs font-semibold text-neutral-800">
                    {authMerchant.name}
                  </span>
                </>
              ) : isBusinessLoggedIn && buyerDisplay ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-black"></div>
                  <div className="text-left leading-tight max-w-[90px] sm:max-w-[120px] truncate">
                    <span className="block font-semibold text-neutral-900 truncate text-[11px] sm:text-xs">
                      {buyerDisplay.companyName}
                    </span>
                    <span className="block text-[9px] sm:text-[10px] text-neutral-500">
                      {buyerDisplay.tier === 'tier_major'
                        ? localizeCopy('核心大客户 (82.5折)', 'Direzionale (-17.5%)')
                        : buyerDisplay.tier === 'tier_vip'
                        ? localizeCopy('VIP客户 (9折)', 'VIP (-10%)')
                        : localizeCopy('批发商', 'Rivenditore')}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <UserCircle className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-600" />
                  <span className="hidden sm:inline text-xs font-semibold text-neutral-800">
                    {localizeCopy("我的 RUDA", "My RUDA")}
                  </span>
                </>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
            </button>

            {showAccountMenu && (
              <div
                id="account-dropdown-menu"
                className="absolute right-0 mt-2 w-72 bg-white border border-neutral-200 rounded-xl shadow-xl p-3 z-50"
              >
                {isMerchantLoggedIn && authMerchant ? (
                  <>
                    <div className="mb-2 rounded-xl bg-neutral-950 px-3 py-3 text-white">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">{t('navMerchantBusiness')}</div>
                      <div className="mt-1 truncate font-bold">{authMerchant.name}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { window.location.href = '/merchant'; }}
                      className="w-full rounded-lg bg-black px-3 py-2.5 text-left text-xs font-bold text-white"
                    >
                      <Store className="mr-2 inline h-3.5 w-3.5" />
                      {localizeCopy("进入商务后台", "Apri l’area business")}
                    </button>
                    <button
                      type="button"
                      onClick={() => { logout(); setShowAccountMenu(false); }}
                      className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-left text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                    >
                      <LogOut className="mr-2 inline h-3.5 w-3.5" />
                      {localizeCopy("退出登录", "Sign out")}
                    </button>
                  </>
                ) : isBuyerLoggedIn && authBuyer ? (
                  <>
                    <div className="px-2 py-2 mb-1 rounded-lg bg-black text-white">
                      <div className="text-[11px] text-neutral-300 uppercase tracking-widest">
                        {localizeCopy("已登录批发商账户", "WHOLESALER CONNECTED")}
                      </div>
                      <div className="font-bold truncate">{authBuyer.companyName}</div>
                      <div className="text-[10px] text-neutral-300 font-mono">
                        {authBuyer.city}, {authBuyer.country} · VAT {authBuyer.vatNumber}
                      </div>
                    </div>
                    <div className="border-t border-neutral-100 my-2"></div>
                    <button
                      type="button"
                      onClick={() => { setActiveBuyerTab('dashboard'); setCurrentView('account'); setShowAccountMenu(false); }}
                      className="w-full text-left px-2 py-2 text-black font-bold hover:bg-neutral-100 rounded flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      {t('navMyBusiness')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCurrentView('orders'); setShowAccountMenu(false); }}
                      className="w-full text-left px-2 py-2 text-neutral-800 font-semibold hover:bg-neutral-100 rounded flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <Package className="w-3.5 h-3.5" />
                      {t('ordersTitle')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCurrentView('purchase_order'); setShowAccountMenu(false); }}
                      className="w-full text-left px-2 py-2 text-neutral-800 font-semibold hover:bg-neutral-100 rounded flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {localizeCopy("采购单快速下单", "Purchase Order Upload")}
                    </button>
                    <div className="border-t border-neutral-100 mt-2 pt-2"></div>
                    <button
                      type="button"
                      onClick={() => { logout(); setShowAccountMenu(false); }}
                      className="w-full text-left px-2 py-2 text-black font-semibold hover:bg-neutral-100 rounded flex items-center gap-1.5 cursor-pointer text-xs border border-neutral-200 hover:border-emerald-400"
                    >
                      <LogOut className="w-3.5 h-3.5 text-emerald-600" />
                      {localizeCopy("安全退出登录", "Secure Logout")}
                    </button>
                  </>
                ) : authRole === 'company' ? (
                  <>
                    <div className="mb-2 rounded-xl bg-neutral-950 px-3 py-3 text-white">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">MY RUDA</div>
                      <div className="mt-1 font-bold">{localizeCopy("零售商账户", "Retailer account")}</div>
                      <div className="mt-1 text-[10px] text-neutral-400">ID · {authCompanyId?.slice(0, 8) || '—'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowBuyerRegister(true); setShowAccountMenu(false); }}
                      className="w-full rounded-lg bg-black px-3 py-2.5 text-left text-xs font-bold text-white"
                    >
                      <Building2 className="mr-2 inline h-3.5 w-3.5" />
                      {localizeCopy("完善零售商资料", "Complete retailer profile")}
                    </button>
                    <button
                      type="button"
                      onClick={() => { logout(); setShowAccountMenu(false); }}
                      className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-left text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                    >
                      <LogOut className="mr-2 inline h-3.5 w-3.5" />
                      {localizeCopy("退出登录", "Sign out")}
                    </button>
                  </>
                ) : authRole === 'customer' && authCustomerAccount ? (
                  <>
                    <div className="mb-2 rounded-xl bg-neutral-950 px-3 py-3 text-white">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">{localizeCopy("客户账户", "Account cliente")}</div>
                      <div className="mt-1 truncate font-bold">{authCustomerAccount.email || authCustomerAccount.phone || localizeCopy("已登录", "Connesso")}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setCurrentView('account'); setShowAccountMenu(false); }}
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-left text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                    >
                      <UserCircle className="mr-2 inline h-3.5 w-3.5" />
                      {localizeCopy("我的账户", "Il mio account")}
                    </button>
                    <button
                      type="button"
                      onClick={() => { logout(); setShowAccountMenu(false); }}
                      className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-left text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                    >
                      <LogOut className="mr-2 inline h-3.5 w-3.5" />
                      {localizeCopy("退出登录", "Sign out")}
                    </button>
                  </>
                ) : null}
              </div>
            )}
          </div>}

          {isMerchantLoggedIn && currentView !== 'merchant_portal' && (
            <button
              id="header-merchant-dashboard-btn"
              type="button"
              onClick={() => { window.location.href = '/merchant'; }}
              aria-label={localizeCopy("进入商务后台", "Apri l’area business")}
              title={localizeCopy("进入商务后台", "Apri l’area business")}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-semibold text-neutral-900 transition-colors hover:border-neutral-500 hover:bg-neutral-50"
            >
              <Store className="h-4 w-4" />
              {t('navMerchantBusiness')}
            </button>
          )}

          {/* Cart */}
          <button
            id="header-order-center-btn"
            type="button"
            onClick={() => setCurrentView('orders')}
            aria-label={localizeCopy("订单中心", "Centro ordini")}
            title={localizeCopy("订单中心", "Centro ordini")}
            className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-black text-white hover:bg-neutral-800 transition-colors text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">{localizeCopy("订单", "Ordini")}</span>
            {totalCartQty > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-white text-black font-extrabold rounded-full text-[10px] sm:text-[11px] leading-tight">
                {totalCartQty}
              </span>
            )}
            {totalCartAmount > 0 && (
              <span className="hidden md:inline text-neutral-300 font-normal pl-1 border-l border-neutral-700">
                €{totalCartAmount.toFixed(2)}
              </span>
            )}
          </button>
        </div>
      </div>

      <nav aria-label={localizeCopy("商家与特价导航", "Navigazione showroom e offerte")} className="hidden border-t border-neutral-200 md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-6 overflow-x-auto px-4 py-3 lg:gap-10">
          {directoryNav.map(item => {
            const isActive = item.path === '/catalog'
              ? currentView === 'catalog'
              : item.path === '/'
                ? currentView === 'home'
                : item.path === '/trends'
                  ? currentView === 'fashion_trends'
                  : window.location.pathname === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigateDirectory(item.path, item.view)}
                aria-current={isActive ? 'page' : undefined}
                className={`shrink-0 border-b pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                  isActive
                    ? 'border-neutral-950 text-neutral-950'
                    : 'border-transparent text-neutral-600 hover:border-neutral-400 hover:text-neutral-950'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

    </header>
  );
};
