import React, { Suspense, lazy, useEffect, useState } from 'react';
import { B2BProvider, useB2B } from './context/B2BContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { NotificationToasts } from './components/NotificationToasts';
import { MobileBottomNav } from './components/MobileBottomNav';
import { BuyerLogin } from './components/auth/BuyerLogin';
import { BuyerRegister } from './components/auth/BuyerRegister';
import { MerchantLogin } from './components/auth/MerchantLogin';
import { EmployeeLogin } from './components/auth/EmployeeLogin';
import { PlatformAdminLogin } from './components/auth/PlatformAdminLogin';
import { RegistrationPortal } from './components/auth/RegistrationPortal';
import { Loader2 } from 'lucide-react';
import { rememberReferral } from './utils/share';
import { ScrollToTopButton } from './components/common/ScrollToTopButton';
import { getMarketingAnalyticsConsent, setMarketingAnalyticsConsent, trackMarketingEvent } from './utils/marketingAnalytics';
import type { AdminTab } from './components/admin/adminNavigation';
import { getLocalizedSeo, getMerchantSeo, getProductSeo, localizedPath, SEO_LANGUAGES, type SeoPage } from './shared/seo';

const LazyMerchantPortal = lazy(() => import('./components/merchant/MerchantPortal').then(m => ({ default: m.MerchantPortal })));
const LazyMerchantEmployeeMobileApp = lazy(() => import('./components/merchant/MerchantEmployeeMobileApp').then(m => ({ default: m.MerchantEmployeeMobileApp })));
const LazyPlatformAdmin = lazy(() => import('./components/admin/PlatformAdmin').then(m => ({ default: m.PlatformAdmin })));
const LazyPlatformAdminMobile = lazy(() => import('./components/admin/PlatformAdminMobile').then(m => ({ default: m.PlatformAdminMobile })));
const LazyHomeView = lazy(() => import('./components/frontend/HomeView').then(m => ({ default: m.HomeView })));
const LazyCatalogView = lazy(() => import('./components/frontend/CatalogView').then(m => ({ default: m.CatalogView })));
const LazyProductDetailView = lazy(() => import('./components/frontend/ProductDetailView').then(m => ({ default: m.ProductDetailView })));
const LazyShowroomsView = lazy(() => import('./components/frontend/ShowroomsView').then(m => ({ default: m.ShowroomsView })));
const LazyMerchantStoreView = lazy(() => import('./components/frontend/MerchantStoreView').then(m => ({ default: m.MerchantStoreView })));
const LazyFashionTrendsView = lazy(() => import('./components/frontend/FashionTrendsView').then(m => ({ default: m.FashionTrendsView })));
const LazyCheckoutView = lazy(() => import('./components/frontend/CheckoutView').then(m => ({ default: m.CheckoutView })));
const LazyAccountHubView = lazy(() => import('./components/frontend/AccountHubView').then(m => ({ default: m.AccountHubView })));
const LazyRequirementDocView = lazy(() => import('./components/common/RequirementDocView').then(m => ({ default: m.RequirementDocView })));
const LazyAboutView = lazy(() => import('./components/frontend/AboutView').then(m => ({ default: m.AboutView })));
const LazyPurchaseOrderView = lazy(() => import('./components/frontend/PurchaseOrderView').then(m => ({ default: m.PurchaseOrderView })));
const LazyOrdersView = lazy(() => import('./components/frontend/OrdersView').then(m => ({ default: m.OrdersView })));
const LazyOrderCenterView = lazy(() => import('./components/frontend/OrderCenterView').then(m => ({ default: m.OrderCenterView })));

// ---- NEW: Consumer (C端零售)
const LazyConsumerStore = lazy(() => import('./components/consumer/ConsumerStore').then(m => ({ default: m.ConsumerStore })));
const LazyConsumerCart = lazy(() => import('./components/consumer/ConsumerCart').then(m => ({ default: m.ConsumerCart })));
const LazyConsumerCheckout = lazy(() => import('./components/consumer/ConsumerCheckout').then(m => ({ default: m.ConsumerCheckout })));
const LazyConsumerOrders = lazy(() => import('./components/consumer/ConsumerOrders').then(m => ({ default: m.ConsumerOrders })));
const LazyConsumerAccount = lazy(() => import('./components/consumer/ConsumerAccount').then(m => ({ default: m.ConsumerAccount })));
const LazyConsumerWishlist = lazy(() => import('./components/consumer/ConsumerWishlist').then(m => ({ default: m.ConsumerWishlist })));
const LazyConsumerLogin = lazy(() => import('./components/consumer/ConsumerAuth').then(m => ({ default: m.ConsumerLogin })));
const LazyConsumerRegister = lazy(() => import('./components/consumer/ConsumerAuth').then(m => ({ default: m.ConsumerRegister })));

// ---- NEW: Admin Extras (Onboarding)
const LazyAdminMessagesCenter = lazy(() => import('./components/common/MessagesCenter').then(m => ({ default: m.MessagesCenter })));
const LazyMerchantOnboarding = lazy(() => import('./components/common/MerchantOnboarding').then(m => ({ default: m.MerchantOnboarding })));
const LazyAiTeamChatOnboarding = lazy(() => import('./components/common/AiTeamChatOnboarding').then(m => ({ default: m.AiTeamChatOnboarding })));

// ---- NEW: RFQ (Buyer / Merchant)
const LazyBuyerRfqCenter = lazy(() => import('./components/buyer/BuyerRfqCenter').then(m => ({ default: m.BuyerRfqCenter })));
const LazyMerchantRfqCenter = lazy(() => import('./components/merchant/MerchantRfqCenter').then(m => ({ default: m.MerchantRfqCenter })));

const LoadingFallback: React.FC<{ label?: string }> = ({ label }) => (
  <div className="min-h-[60vh] flex items-center justify-center flex-col gap-3 text-neutral-500">
    <Loader2 className="w-10 h-10 animate-spin text-black" />
    <div className="text-sm font-medium">{label || '加载中...'}</div>
  </div>
);

class AppErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[app-render] failed:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 text-center">
        <div className="max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-lg">
          <h1 className="text-lg font-bold text-neutral-950">页面加载遇到问题</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">登录状态已经保留。请刷新页面重试；如果问题持续，请联系 RUDA 客服。</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-6 bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800">
            刷新页面
          </button>
        </div>
      </div>
    );
  }
}

const AnalyticsConsentPanel: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (choice: 'granted' | 'denied') => void;
}> = ({ open, onOpenChange, onChoose }) => {
  const { t } = useB2B();

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {open && (
        <section aria-label={t('analyticsPrivacySettings')} className="mb-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-neutral-200 bg-white p-4 shadow-xl">
          <h2 className="text-sm font-bold text-neutral-950">{t('analyticsTitle')}</h2>
          <p className="mt-2 text-xs leading-5 text-neutral-600">{t('analyticsMessage')}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => onChoose('granted')} className="min-h-9 flex-1 bg-neutral-950 px-3 text-xs font-semibold text-white">{t('analyticsAllow')}</button>
            <button type="button" onClick={() => onChoose('denied')} className="min-h-9 flex-1 border border-neutral-300 px-3 text-xs font-semibold text-neutral-700">{t('analyticsDeny')}</button>
          </div>
        </section>
      )}
      <button type="button" onClick={() => onOpenChange(!open)} className="ml-auto block rounded-full border border-neutral-300 bg-white px-3 py-2 text-[10px] font-semibold text-neutral-600 shadow-sm">{t('analyticsPrivacySettings')}</button>
    </div>
  );
};

const MainContent: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    authRole,
    showBuyerRegister,
    setShowBuyerRegister,
    initRouteFromURL,
    selectedProductId,
    selectedMerchantId,
    setSelectedMerchantId,
    products,
    merchants,
    lang,
    localizeCopy,
    addNotification
  } = useB2B();
  const [portalZone, setPortalZone] = useState<'buyer' | 'merchant' | 'employee' | 'admin' | 'guest' | 'consumer'>('guest');
  const [booted, setBooted] = useState(false);
  const [isMobileAdminViewport, setIsMobileAdminViewport] = useState(false);
  const [forceDesktopAdmin, setForceDesktopAdmin] = useState(false);
  const [desktopAdminInitialTab, setDesktopAdminInitialTab] = useState<AdminTab>('overview');
  const [analyticsChoice, setAnalyticsChoice] = useState<'granted' | 'denied' | 'unknown'>(() => getMarketingAnalyticsConsent());
  const [analyticsPromptOpen, setAnalyticsPromptOpen] = useState(() => getMarketingAnalyticsConsent() === 'unknown');
  const chooseAnalytics = (choice: 'granted' | 'denied') => {
    if (!setMarketingAnalyticsConsent(choice)) {
      addNotification('warning', '隐私设置无法保存', '浏览器存储不可用，请检查隐私模式或网站存储权限。');
      return;
    }
    setAnalyticsChoice(choice);
    setAnalyticsPromptOpen(false);
  };

  useEffect(() => {
    if (analyticsChoice !== 'granted' || typeof document === 'undefined') return;
    if (document.querySelector('script[data-ruda-gtm]')) return;
    const trackingWindow = window as Window & { dataLayer?: Array<Record<string, unknown>> };
    trackingWindow.dataLayer = trackingWindow.dataLayer || [];
    trackingWindow.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-NBP93S5M';
    script.dataset.rudaGtm = 'true';
    document.head.appendChild(script);
  }, [analyticsChoice]);

  useEffect(() => {
    try {
      const monochrome = localStorage.getItem('ruda_monochrome_mode') === 'true';
      document.documentElement.classList.toggle('ruda-monochrome', monochrome);
      document.getElementById('root')?.classList.toggle('ruda-monochrome', monochrome);
    } catch (error) {
      console.warn('[account-display-preference]', error);
    }
    rememberReferral();
    const z = initRouteFromURL();
    setPortalZone(z);
    setTimeout(() => setBooted(true), 30);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => setIsMobileAdminViewport(media.matches);
    updateViewport();
    media.addEventListener('change', updateViewport);
    return () => media.removeEventListener('change', updateViewport);
  }, []);

  useEffect(() => {
    if (booted && portalZone === 'guest' && authRole === 'merchant' && currentView === 'merchant_portal') {
      setCurrentView('home');
    }
  }, [authRole, booted, currentView, portalZone, setCurrentView]);

  useEffect(() => {
    if (!booted || portalZone !== 'guest') return;
    const host = window.location.hostname.toLowerCase();
    const reservedHosts = new Set([
      'ruda.fashion', 'www.ruda.fashion', 'app.ruda.fashion', 'buyer.ruda.fashion',
      'admin.ruda.fashion', 'vip.ruda.fashion', 'merchant.ruda.fashion',
      'bos.ruda.fashion', 'xs.ruda.fashion'
    ]);
    if (!host.endsWith('.ruda.fashion') || reservedHosts.has(host)) return;
    const merchantSlug = host.slice(0, -'.ruda.fashion'.length);
    const merchant = merchants.find(item => (item.storeSlug || item.slug || item.id).toLowerCase() === merchantSlug);
    if (merchant && selectedMerchantId !== merchant.id) {
      setSelectedMerchantId(merchant.id);
      setCurrentView('merchant_store');
    }
  }, [booted, merchants, portalZone, selectedMerchantId, setCurrentView, setSelectedMerchantId]);

  useEffect(() => {
    const product = selectedProductId ? products.find(item => item.id === selectedProductId) : null;
    const merchant = selectedMerchantId ? merchants.find(item => item.id === selectedMerchantId) : null;
    const productMerchant = product
      ? merchants.find(item => item.id === product.merchantId) || merchant
      : null;
    const pageByView: Partial<Record<string, SeoPage>> = {
      home: 'home',
      catalog: 'catalog',
      showrooms: 'showrooms',
      fashion_trends: 'trends',
      about: 'about'
    };
    const page = pageByView[currentView] || 'home';
    const fallbackSeo = getLocalizedSeo(page, lang);
    const productName = product
      ? lang === 'it' ? product.name_it || product.name : lang === 'zh' ? product.name_zh || product.name : product.name
      : '';
    const productDescription = product
      ? lang === 'it' ? product.description_it || product.description
        : lang === 'zh' ? product.description_zh || product.description
          : product.description
      : '';
    const merchantName = merchant
      ? lang === 'it' ? merchant.name_it || merchant.name : lang === 'zh' ? merchant.name_zh || merchant.name : merchant.name
      : '';
    const merchantDescription = merchant
      ? lang === 'it' ? merchant.description_it || merchant.tagline_it || merchant.description
        : lang === 'zh' ? merchant.description_zh || merchant.tagline_zh || merchant.description
          : undefined
      : undefined;
    const metadata = product
      ? getProductSeo({ name: productName, styleNo: product.styleNo, description: productDescription }, lang)
      : merchant
        ? getMerchantSeo({ name: merchantName, description: merchantDescription, city: lang === 'it' ? merchant.city_it || merchant.city : merchant.city }, lang)
        : fallbackSeo;
    const title = metadata.title;
    const description = metadata.description;
    const image = new URL(product?.images?.[0] || merchant?.banner || '/pwa-512x512.png', window.location.origin).toString();
    const merchantSlug = merchant?.storeSlug || merchant?.slug || merchant?.id;
    const productMerchantSlug = productMerchant?.storeSlug || productMerchant?.slug || productMerchant?.id;
    const seoOrigin = product
      ? productMerchantSlug ? `https://${productMerchantSlug}.ruda.fashion` : window.location.origin
      : merchantSlug ? `https://${merchantSlug}.ruda.fashion` : window.location.origin;
    const publicPath = product
      ? `/product/${encodeURIComponent(product.id)}`
      : merchantSlug
        ? window.location.hostname.toLowerCase() === `${merchantSlug}.ruda.fashion`
          ? '/'
          : `/shop/${encodeURIComponent(merchantSlug)}`
        : ({ home: '/', catalog: '/catalog', showrooms: '/showrooms', trends: '/trends', about: '/about' } as const)[page];
    const indexable = ['home', 'catalog', 'showrooms', 'fashion_trends', 'about', 'product_detail', 'merchant_store'].includes(currentView);
    const canonicalPath = indexable ? localizedPath(publicPath, lang) : window.location.pathname;
    const canonicalUrl = new URL(canonicalPath, seoOrigin);
    canonicalUrl.search = '';
    canonicalUrl.hash = '';
    const setMeta = (selector: string, content: string) => {
      const element = document.querySelector<HTMLMetaElement>(selector);
      if (element) element.content = content;
    };
    document.title = title;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:type"]', product ? 'product' : 'website');
    setMeta('meta[property="og:image"]', image);
    setMeta('meta[property="og:url"]', canonicalUrl.toString());
    setMeta('meta[property="og:locale"]', metadata.ogLocale);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);
    setMeta('meta[name="twitter:image"]', image);
    setMeta('meta[name="robots"]', indexable ? 'index,follow' : 'noindex,nofollow');
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = canonicalUrl.toString();
    document.querySelectorAll('link[data-seo-alternate]').forEach(link => link.remove());
    if (indexable) {
      for (const language of SEO_LANGUAGES) {
        const alternate = document.createElement('link');
        alternate.rel = 'alternate';
        alternate.hreflang = language;
        alternate.href = new URL(localizedPath(publicPath, language), seoOrigin).toString();
        alternate.dataset.seoAlternate = 'true';
        document.head.appendChild(alternate);
      }
      const defaultAlternate = document.createElement('link');
      defaultAlternate.rel = 'alternate';
      defaultAlternate.hreflang = 'x-default';
      defaultAlternate.href = `${seoOrigin}/`;
      defaultAlternate.dataset.seoAlternate = 'true';
      document.head.appendChild(defaultAlternate);
    }
    const schema = document.querySelector<HTMLScriptElement>('script[data-seo-schema]');
    if (schema) {
      schema.textContent = JSON.stringify(product ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: productName,
        description: productDescription,
        image: product.images,
        sku: product.styleNo,
        category: product.subCategory || product.category,
        brand: { '@type': 'Brand', name: product.brand || 'RUDA Fashion B2B' },
        url: canonicalUrl.toString(),
        inLanguage: lang
      } : merchant ? {
        '@context': 'https://schema.org',
        '@type': 'ClothingStore',
        name: merchantName,
        description: merchantDescription || description,
        url: canonicalUrl.toString(),
        image: merchant.banner || merchant.logo || image,
        inLanguage: lang,
        address: {
          '@type': 'PostalAddress',
          addressLocality: merchant.city,
          addressCountry: merchant.country || 'IT'
        }
      } : {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'RUDA Fashion B2B',
        description,
        logo: `${seoOrigin}/pwa-512x512.png`,
        url: canonicalUrl.toString(),
        inLanguage: lang
      });
    }
  }, [currentView, lang, merchants, products, selectedMerchantId, selectedProductId]);

  useEffect(() => {
    if (!booted || portalZone !== 'guest' || currentView.startsWith('consumer_') || analyticsChoice !== 'granted') return;
    const event = currentView === 'merchant_onboarding'
      ? 'merchant_application_view'
      : showBuyerRegister || currentView === 'register_wholesale'
        ? 'buyer_registration_view'
        : 'page_view';
    void trackMarketingEvent(event, currentView);
  }, [analyticsChoice, booted, currentView, portalZone, showBuyerRegister]);

  useEffect(() => {
    if (!booted || portalZone === 'admin' || portalZone === 'merchant' || portalZone === 'employee') return;

    const product = selectedProductId ? products.find(item => item.id === selectedProductId) : null;
    const merchant = selectedMerchantId ? merchants.find(item => item.id === selectedMerchantId) : null;
    const merchantSlug = merchant?.storeSlug || merchant?.slug || merchant?.id;
    const routes: Record<string, string> = {
      home: '/',
      catalog: '/catalog',
      showrooms: '/showrooms',
      fashion_trends: '/trends',
      cart: '/cart',
      account: '/account',
      purchase_order: '/purchase-order',
      orders: '/orders',
      checkout: '/checkout',
      register_wholesale: '/register-wholesale',
      about: '/about',
      requirement_doc: '/requirements'
    };
    const showroomPath = currentView === 'showrooms'
      ? ['/producers', '/wholesalers', '/retailers'].includes(window.location.pathname)
        ? window.location.pathname
        : '/showrooms'
      : null;
    const publicSeoPath = currentView === 'product_detail' && product
      ? `/product/${encodeURIComponent(product.id)}`
      : currentView === 'merchant_store' && merchantSlug
        ? window.location.hostname.toLowerCase() === `${merchantSlug}.ruda.fashion`
          ? '/'
          : `/shop/${encodeURIComponent(merchantSlug)}`
        : currentView === 'home' || currentView === 'catalog' || currentView === 'showrooms' || currentView === 'fashion_trends' || currentView === 'about'
          ? showroomPath || routes[currentView]
          : null;
    const nextPath = publicSeoPath ? localizedPath(publicSeoPath, lang) : routes[currentView];

    if (nextPath && window.location.pathname !== nextPath) {
      window.history.replaceState({}, '', `${nextPath}${window.location.search}`);
    }
  }, [booted, currentView, lang, merchants, portalZone, products, selectedMerchantId, selectedProductId]);

  if (!booted) return <LoadingFallback label="正在准备页面..." />;

  // ================= PLATFORM ADMIN ZONE (路径: /super-admin 或 /admin) =================
  if (portalZone === 'admin' && !(currentView === 'merchant_portal' && authRole === 'merchant')) {
    if (authRole !== 'admin') {
      return (
        <div className="min-h-screen bg-neutral-50">
          <PlatformAdminLogin />
          <NotificationToasts />
        </div>
      );
    }
    return (
      <div className="portal-theme-admin min-h-screen bg-neutral-100/60 text-neutral-900 flex flex-col font-sans antialiased">
        {/* Admin portals render their own shell, so the global Header is skipped here. */}
        <Suspense fallback={<LoadingFallback label="正在打开平台管理中心..." />}>
          {isMobileAdminViewport && !forceDesktopAdmin
            ? <LazyPlatformAdminMobile onSwitchToDesktop={tab => {
                if (tab) setDesktopAdminInitialTab(tab);
                setForceDesktopAdmin(true);
              }} />
            : <LazyPlatformAdmin initialTab={desktopAdminInitialTab} />}
        </Suspense>
        <NotificationToasts />
      </div>
    );
  }

  // ================= MERCHANT ZONE (路径: /merchant) =================
  if (
    currentView !== 'ai_team_preview' &&
    currentView !== 'merchant_quick_start' &&
    (
      portalZone === 'merchant' ||
      portalZone === 'employee' ||
      (portalZone === 'admin' && currentView === 'merchant_portal' && authRole === 'merchant')
    )
  ) {
    if (authRole !== 'merchant') {
      if (portalZone === 'employee') {
        return <EmployeeLogin onSuccess={() => window.location.reload()} />;
      }
      return (
        <div className="min-h-screen bg-neutral-50">
          <MerchantLogin />
          <NotificationToasts />
        </div>
      );
    }
    return (
      <div className={`portal-theme-${portalZone === 'admin' ? 'merchant' : portalZone} min-h-screen bg-neutral-100 text-neutral-900 flex flex-col font-sans antialiased overflow-hidden`}>
        <main className="flex-1">
          <Suspense fallback={<LoadingFallback label="正在打开商户管理中心..." />}>
            {portalZone === 'employee' || window.location.pathname.startsWith('/employee') || window.location.hostname === 'xs.ruda.fashion'
              ? <LazyMerchantEmployeeMobileApp />
              : <LazyMerchantPortal />}
          </Suspense>
        </main>
        <NotificationToasts />
      </div>
    );
  }

  // ================= CONSUMER ZONE (C端零售: consumer_* 视图) =================
  const isConsumerLoggedIn = authRole === 'consumer';
  const consumerView = currentView.startsWith('consumer_') || currentView === 'consumer_login' || currentView === 'consumer_register';
  const merchantOnboardingView = currentView === 'merchant_onboarding';
  const aiTeamPreviewView = currentView === 'ai_team_preview';
  const merchantQuickStartView = currentView === 'merchant_quick_start';

  if (merchantOnboardingView) {
    return (
      <div className="portal-theme-merchant min-h-screen bg-gradient-to-br from-neutral-50 to-amber-50/40">
        <Suspense fallback={<LoadingFallback label="加载商户入驻页面..." />}>
          <LazyMerchantOnboarding />
        </Suspense>
        <NotificationToasts />
        <AnalyticsConsentPanel open={analyticsPromptOpen} onOpenChange={setAnalyticsPromptOpen} onChoose={chooseAnalytics} />
      </div>
    );
  }

  if (merchantQuickStartView) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <MerchantLogin initialMode="register" />
        <NotificationToasts />
      </div>
    );
  }

  if (aiTeamPreviewView) {
    return (
      <div className="min-h-screen">
        <Suspense fallback={<LoadingFallback label="加载 AI 店长对话..." />}>
          <LazyAiTeamChatOnboarding />
        </Suspense>
        <NotificationToasts />
      </div>
    );
  }

  if (consumerView) {
    if ((currentView === 'consumer_checkout' || currentView === 'consumer_account' || currentView === 'consumer_orders' || currentView === 'consumer_wishlist') && !isConsumerLoggedIn) {
      return (
        <div className="portal-theme-buyer min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-200/60">
          <Suspense fallback={<LoadingFallback label="请先登录..." />}>
            <LazyConsumerLogin />
          </Suspense>
          <NotificationToasts />
        </div>
      );
    }
    if (currentView === 'consumer_login' && !isConsumerLoggedIn) {
      return (
        <div className="portal-theme-buyer min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-200/60">
          <Suspense fallback={<LoadingFallback />}><LazyConsumerLogin /></Suspense>
          <NotificationToasts />
        </div>
      );
    }
    if (currentView === 'consumer_register' && !isConsumerLoggedIn) {
      return (
        <div className="portal-theme-buyer min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-200/60">
          <Suspense fallback={<LoadingFallback />}><LazyConsumerRegister /></Suspense>
          <NotificationToasts />
        </div>
      );
    }
    return (
      <div className="portal-theme-buyer min-h-screen bg-neutral-50 text-neutral-900 flex flex-col font-sans antialiased selection:bg-neutral-900 selection:text-white">
        <Header />
        <main className="flex-1 pb-28 md:pb-12">
          <Suspense fallback={<LoadingFallback label="加载 RUDA 零售商城..." />}>
            {currentView === 'consumer_store' && <LazyConsumerStore />}
            {currentView === 'consumer_cart' && <LazyConsumerCart />}
            {currentView === 'consumer_checkout' && isConsumerLoggedIn && <LazyConsumerCheckout />}
            {currentView === 'consumer_orders' && isConsumerLoggedIn && <LazyConsumerOrders />}
            {currentView === 'consumer_account' && isConsumerLoggedIn && <LazyConsumerAccount />}
            {currentView === 'consumer_wishlist' && isConsumerLoggedIn && <LazyConsumerWishlist />}
          </Suspense>
        </main>
        <Footer />
        <MobileBottomNav />
        <NotificationToasts />
      </div>
    );
  }

  // ================= PLATFORM ADMIN ZONE (extended views) =================
  // Note: promotions/BI/risk-monitor are now embedded as nav tabs inside
  // PlatformAdmin itself (see AdminTab in PlatformAdmin.tsx) so they share
  // its own header/nav shell instead of the buyer-facing Header/Footer here.
  if (portalZone === 'admin' && authRole === 'admin') {
    const extra = currentView === 'messages_center';
    if (extra) {
      return (
        <div className="portal-theme-admin min-h-screen bg-neutral-100/60 text-neutral-900 flex flex-col font-sans antialiased">
          <Header />
          <main className="flex-1 pb-12">
            <Suspense fallback={<LoadingFallback label="加载模块..." />}>
              {currentView === 'messages_center' && <LazyAdminMessagesCenter />}
            </Suspense>
          </main>
          <Footer />
          <MobileBottomNav />
          <NotificationToasts />
        </div>
      );
    }
  }

  // ================= MERCHANT ZONE (RFQ extras) =================
  if (authRole === 'merchant' && (currentView === 'rfq_merchant_list' || currentView === 'messages_center')) {
    return (
      <div className="portal-theme-merchant min-h-screen bg-neutral-100 text-neutral-900 flex flex-col font-sans antialiased">
        <Header />
        <main className="flex-1 pb-12">
          <Suspense fallback={<LoadingFallback label="加载中..." />}>
            {currentView === 'rfq_merchant_list' && <LazyMerchantRfqCenter />}
            {currentView === 'messages_center' && <LazyAdminMessagesCenter />}
          </Suspense>
        </main>
        <Footer />
        <NotificationToasts />
      </div>
    );
  }

  // ================= BUYER ZONE (RFQ extras) =================
  if (authRole === 'buyer' && (currentView === 'rfq_buyer_list' || currentView === 'rfq_buyer_create' || currentView === 'messages_center')) {
    return (
      <div className="portal-theme-buyer min-h-screen bg-neutral-100/60 text-neutral-900 flex flex-col font-sans antialiased">
        <Header />
        <main className="flex-1 pb-12">
          <Suspense fallback={<LoadingFallback label="加载 RFQ 询报价..." />}>
            {(currentView === 'rfq_buyer_list' || currentView === 'rfq_buyer_create') && <LazyBuyerRfqCenter />}
            {currentView === 'messages_center' && <LazyAdminMessagesCenter />}
          </Suspense>
        </main>
        <Footer />
        <MobileBottomNav />
        <NotificationToasts />
      </div>
    );
  }

  // ================= BUYER ZONE (默认: / 其他所有路径) =================
  const isBuyerLoggedIn = authRole === 'buyer' || authRole === 'company';

  if (showBuyerRegister) {
    return (
      <div className="portal-theme-buyer min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-200/50">
        <RegistrationPortal onBack={() => setShowBuyerRegister(false)} />
        <NotificationToasts />
      </div>
    );
  }

  // 买手端敏感页面：未登录显示登录页
  const buyerGateRequired =
    currentView === 'checkout' ||
    currentView === 'purchase_order' ||
    currentView === 'orders';

  if (buyerGateRequired && !isBuyerLoggedIn) {
    return (
      <div className="portal-theme-buyer min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-200/50">
        <BuyerLogin onSwitchToRegister={() => setShowBuyerRegister(true)} />
        <NotificationToasts />
      </div>
    );
  }

  // 普通前台 (home/catalog/product_detail/showrooms/merchant_store/cart) 不强制登录
  return (
    <div className="portal-theme-buyer min-h-screen bg-neutral-100/60 text-neutral-900 flex flex-col font-sans antialiased selection:bg-neutral-900 selection:text-white">
      {currentView !== 'merchant_store' && <Header />}
      <main className={`flex-1 pb-28 md:pb-12 ${currentView === 'showrooms' || currentView === 'catalog' ? 'overflow-x-clip' : ''}`}>
        <Suspense fallback={<LoadingFallback label="加载买家门户..." />}>
          {currentView === 'home' && <LazyHomeView />}
          {currentView === 'catalog' && <LazyCatalogView />}
          {currentView === 'purchase_order' && isBuyerLoggedIn && <LazyPurchaseOrderView />}
          {(currentView === 'orders' || currentView === 'cart') && (
            <LazyOrderCenterView showOrdersTab={isBuyerLoggedIn} />
          )}
          {currentView === 'product_detail' && <LazyProductDetailView />}
          {currentView === 'showrooms' && <LazyShowroomsView />}
          {currentView === 'merchant_store' && <LazyMerchantStoreView />}
          {currentView === 'fashion_trends' && <LazyFashionTrendsView />}
          {currentView === 'checkout' && isBuyerLoggedIn && <LazyCheckoutView />}
          {currentView === 'register_wholesale' && <RegistrationPortal onBack={() => setCurrentView('home')} />}
          {currentView === 'about' && <LazyAboutView />}
          {currentView === 'account' && <LazyAccountHubView />}
          {currentView === 'requirement_doc' && <LazyRequirementDocView />}
        </Suspense>
      </main>
      <Footer />
      <MobileBottomNav />
      <NotificationToasts />
      <AnalyticsConsentPanel open={analyticsPromptOpen} onOpenChange={setAnalyticsPromptOpen} onChoose={chooseAnalytics} />
    </div>
  );
};

export default function App() {
  return (
    <B2BProvider>
      <ScrollToTopButton />
      <AppErrorBoundary>
        <MainContent />
      </AppErrorBoundary>
    </B2BProvider>
  );
}
