import React, { useCallback, useEffect, useRef, useState } from 'react';
import { 
  ArrowRight,
  Building2,
  Bot,
  Send,
  ChevronRight, 
  Sparkles, 
  Store,
  Search,
  MapPin,
  X
} from 'lucide-react';
import { useB2B } from '../../context/B2BContext';
import { getLocalizedMerchantName, getLocalizedProductName } from '../../i18n/translations';
import type { Merchant } from '../../types/b2b';
import type { PublicMerchantSearchResult } from '../../utils/merchantSearch';
import type { PublicProductSearchRecord } from '../../utils/publicProductSearch';
import { ProductImage } from '../common/ProductImage';
import { apiGet, apiPost } from '../../api/client';
import { trackMarketingEvent } from '../../utils/marketingAnalytics';
import { getMerchantStorePath } from '../../utils/share';

type HomeAiMessage = {
  role: 'assistant' | 'user';
  text: string;
  merchants?: PublicMerchantSearchResult[];
  products?: PublicProductSearchRecord[];
  showShowroomsLink?: boolean;
  showCatalogLink?: boolean;
};

const getPublicProductImage = (images: string | null | undefined): string | undefined => {
  if (!images) return undefined;
  try {
    const parsed: unknown = JSON.parse(images);
    return Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0] : undefined;
  } catch {
    return images;
  }
};

const getMerchantBusinessTypeLabel = (businessType: string | undefined): [string, string] | null => {
  const normalized = (businessType || '').trim().toLocaleLowerCase().replace(/[\s_-]+/g, '');
  const labels: Record<string, [string, string]> = {
    brandsupplier: ['品牌/生产商', 'Brand / produttore'],
    manufacturer: ['生产厂家', 'Produttore'],
    atelier: ['设计工作室', 'Atelier'],
    wholesaler: ['批发商', 'Grossista'],
    distributor: ['分销商', 'Distributore'],
    retailer: ['零售店', 'Negozio al dettaglio'],
    retailstore: ['零售店', 'Negozio al dettaglio'],
    boutique: ['精品店', 'Boutique']
  };
  return labels[normalized] || null;
};

export const HomeView: React.FC = () => {
  const { 
    products, 
    merchants,
    setSelectedMerchantId,
    setCurrentView, 
    setCatalogCategory,
    setCatalogFilterStatus,
    setCatalogSearchQuery,
    quickSearchStyle,
    quickNavigateToProduct, 
    calculateCustomerPrice,
    lang,
    t, localizeCopy
  } = useB2B();
  const [selectedZone, setSelectedZone] = useState<'iolo' | 'tavoro' | 'leather' | 'boutique_department' | null>(null);
  const [showAiHelp, setShowAiHelp] = useState(false);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const [heroVideoRequested, setHeroVideoRequested] = useState(false);
  const [heroVideoSrc, setHeroVideoSrc] = useState('/videos/ruda-home.mp4');
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [searchInput, setSearchInput] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<HomeAiMessage[]>([]);
  const [aiQuickQuestions, setAiQuickQuestions] = useState<string[]>([]);

  const openAiHelp = useCallback(async () => {
    setShowAiHelp(true);
    void trackMarketingEvent('ai_open', 'home');
    if (aiMessages.length > 0) return;
    try {
      const result = await apiGet<{ success: boolean; config: { enabled: boolean; welcomeMessage: string; quickQuestions: string[] } }>('/api/ai/support/config');
      if (!result.config.enabled) {
        setAiMessages([{ role: 'assistant', text: localizeCopy('AI 客服暂未开放，请用商品搜索。', 'Assistenza AI non disponibile. Usa la ricerca.') }]);
        setAiQuickQuestions([]);
        return;
      }
      setAiMessages([{ role: 'assistant', text: result.config.welcomeMessage }]);
      setAiQuickQuestions(result.config.quickQuestions || []);
    } catch {
      setAiMessages([{ role: 'assistant', text: localizeCopy('AI 客服暂不可用，请稍后重试。', 'Assistenza AI non disponibile. Riprova più tardi.') }]);
      setAiQuickQuestions([]);
    }
  }, [aiMessages.length, localizeCopy]);

  useEffect(() => {
    const openAiHelpFromHeader = () => {
      void openAiHelp();
    };
    window.addEventListener('ruda:open-ai-support', openAiHelpFromHeader);
    return () => window.removeEventListener('ruda:open-ai-support', openAiHelpFromHeader);
  }, [openAiHelp]);

  const askAi = async (question = aiInput) => {
    const text = question.trim();
    if (!text || aiLoading) return;
    setAiInput('');
    setAiMessages(previous => [...previous, { role: 'user', text }]);
    void trackMarketingEvent('ai_question', 'home');
    setAiLoading(true);
    try {
      const result = await apiPost<{
        success: boolean;
        reply: string;
        suggestions?: string[];
        productSearch?: boolean;
        productResults?: PublicProductSearchRecord[];
        merchantSearch?: boolean;
        merchantResults?: PublicMerchantSearchResult[];
        browseShowrooms?: boolean;
        browseCatalog?: boolean;
      }>('/api/ai/support/chat', {
        message: text,
        history: aiMessages.slice(-6).map(({ role, text: content }) => ({ role, text: content }))
      });
      setAiMessages(previous => [...previous, {
        role: 'assistant',
        text: result.reply,
        products: result.productSearch ? result.productResults || [] : undefined,
        merchants: result.merchantSearch ? result.merchantResults || [] : undefined,
        showShowroomsLink: Boolean(result.browseShowrooms),
        showCatalogLink: Boolean(result.browseCatalog)
      }]);
      if (result.suggestions) setAiQuickQuestions(result.suggestions);
    } catch {
      setAiMessages(previous => [...previous, { role: 'assistant', text: localizeCopy('客服繁忙，请用商品搜索。', 'Assistenza occupata. Usa la ricerca prodotti.') }]);
    } finally {
      setAiLoading(false);
    }
  };

  const isIt = lang === 'it';
  const openMerchantStore = (event: React.MouseEvent<HTMLAnchorElement>, merchant: PublicMerchantSearchResult) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setSelectedMerchantId(merchant.id);
    setCurrentView('merchant_store');
    setShowAiHelp(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openShowrooms = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setCurrentView('showrooms');
    setShowAiHelp(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openCatalog = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setCatalogCategory('all');
    setCatalogSearchQuery('');
    setCatalogFilterStatus('all');
    setCurrentView('catalog');
    setShowAiHelp(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openCatalogCategory = (category: string) => {
    setCatalogCategory(category);
    setCatalogSearchQuery('');
    setCatalogFilterStatus('all');
    setCurrentView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!heroVideoRequested) return undefined;
    let active = true;
    apiGet<{ success: boolean; config?: { videoUrl?: string } } | null>('/api/homepage-video-config')
      .then(result => {
        if (active && result?.config?.videoUrl) setHeroVideoSrc(result.config.videoUrl);
      })
      .catch(error => console.error('[homepage-video-config]', error));
    return () => {
      active = false;
    };
  }, [heroVideoRequested]);

  // New Collection products
  const newCollection = products.filter(p => p.status === 'new' && (!p.visibility || p.visibility !== 'private')).slice(0, 6);
  const allSpecialMarketProducts = products
    .filter(product => product.merchantId && product.status === 'clearance' && !product.isExclusiveProtected && product.visibility !== 'private')
    .sort((left, right) => Number(right.featuredOnHome) - Number(left.featuredOnHome));
  const specialMarketMerchantCount = new Set(allSpecialMarketProducts.map(product => product.merchantId)).size;
  const visibleMerchants = selectedZone ? merchants.filter(merchant => merchant.merchantZone === selectedZone) : merchants;
  const homepageCategoryCards = [...new Set(
    products
      .filter(product => product.visibility !== 'private' && !product.isExclusiveProtected)
      .map(product => product.category)
      .filter(Boolean)
  )].slice(0, 5).map(category => ({
    category,
    product: products.find(product => product.category === category && product.visibility !== 'private' && !product.isExclusiveProtected)!
  }));
  const cityWholesalers = merchants.filter(merchant => merchant.merchantZone === 'tavoro').slice(0, 4);
  const cityRetailStores = merchants.filter(merchant => merchant.merchantZone === 'boutique_department').slice(0, 4);
  const wholesaleCountryOptions = [
    { key: 'greece', zh: '希腊', it: 'Grecia', aliases: ['greece', 'grecia', '希腊'] },
    { key: 'spain', zh: '西班牙', it: 'Spagna', aliases: ['spain', 'spagna', '西班牙'] },
    { key: 'france', zh: '法国', it: 'Francia', aliases: ['france', 'francia', '法国'] },
    { key: 'italy', zh: '意大利', it: 'Italia', aliases: ['italy', 'italia', '意大利'] },
    { key: 'poland', zh: '波兰', it: 'Polonia', aliases: ['poland', 'polonia', '波兰'] },
    { key: 'portugal', zh: '葡萄牙', it: 'Portogallo', aliases: ['portugal', 'portogallo', '葡萄牙'] }
  ];
  const getMerchantName = (merchant: Merchant) => getLocalizedMerchantName(merchant, lang);
  const getMerchantCity = (merchant: Merchant) => {
    const city = (lang === 'zh'
      ? merchant.city_zh || merchant.city
      : merchant.city_it || merchant.city).trim();
    if (!city || ['待完善', '未填写', '待补充'].includes(city)) {
      return localizeCopy('城市未填写', 'Città non specificata');
    }
    return city;
  };

  return (
    <div className="w-full max-w-7xl mx-auto bg-[#faf9f7] px-4 py-5 sm:px-6 sm:py-8 lg:px-8 space-y-10 sm:space-y-12">
      <section className="hidden min-h-[660px] flex-col items-center justify-center px-6 pb-8 pt-14 text-neutral-950 lg:flex" aria-labelledby="home-ai-title">
        <div className="w-full max-w-4xl text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-800 shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 id="home-ai-title" className="mt-5 text-3xl font-semibold tracking-tight text-neutral-800 xl:text-4xl">
            {localizeCopy('欢迎来到 RUDA', 'Benvenuto su RUDA')}
          </h1>
          <p className="mt-1 text-2xl font-medium tracking-tight text-neutral-700 xl:text-3xl">
            {localizeCopy('今天想发现什么？', 'Cosa vuoi scoprire oggi?')}
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-500">
            {localizeCopy('告诉 AI 你想找什么商品、供应商或时尚灵感。', 'Chiedi all’assistente di trovare prodotti, fornitori o ispirazioni moda.')}
          </p>
          <form onSubmit={event => { event.preventDefault(); void askAi(); }} className="mx-auto mt-7 flex max-w-2xl items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-[0_8px_32px_-18px_rgba(0,0,0,0.28)] transition focus-within:border-neutral-400 focus-within:shadow-[0_12px_36px_-18px_rgba(0,0,0,0.3)]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-800"><Bot className="h-4 w-4" /></span>
            <input
              aria-label={localizeCopy('向 RUDA AI 提问', 'Chiedi all’assistente RUDA')}
              value={aiInput}
              onChange={event => setAiInput(event.target.value)}
              placeholder={localizeCopy('例如：帮我找意大利女装批发、查看本季新款…', 'Es. Cerco abiti da donna all’ingrosso…')}
              className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
              disabled={aiLoading}
            />
            <button type="button" onClick={() => void openAiHelp()} aria-label={localizeCopy('更多 AI 对话', 'Altre domande')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900">
              <Sparkles className="h-4 w-4" />
            </button>
            <button type="submit" aria-label={localizeCopy('发送问题', 'Invia domanda')} disabled={!aiInput.trim() || aiLoading} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400">
              {aiLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
          {aiMessages.length > 0 && (
            <div className="mx-auto mt-4 max-h-64 max-w-2xl space-y-3 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm">
              {aiMessages.slice(-6).map((message, index) => (
                <div key={`${message.role}-${index}`} className={`rounded-xl px-3.5 py-2.5 text-sm leading-6 ${message.role === 'user' ? 'ml-auto max-w-[88%] bg-neutral-100 text-neutral-800' : 'text-neutral-700'}`}>
                  <p>{message.text}</p>
                  {message.products?.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{message.products.slice(0, 4).map(product => <button key={product.id} type="button" onClick={() => quickNavigateToProduct(product.id)} className="flex min-w-0 items-center gap-3 rounded-xl border border-neutral-200 p-2 text-left transition duration-200 hover:-translate-y-0.5 hover:border-neutral-400 hover:bg-neutral-50 hover:shadow-md"><img src={getPublicProductImage(product.images)} alt={getLocalizedProductName(product, lang)} className="h-16 w-12 shrink-0 rounded-lg bg-neutral-100 object-cover" /><span className="min-w-0"><span className="block truncate text-xs font-semibold text-neutral-800">{getLocalizedProductName(product, lang)}</span><span className="mt-1 block text-[10px] text-neutral-500">{product.styleNo}</span><span className="mt-1 block text-xs font-bold text-neutral-900">€{product.wholesalePrice.toFixed(2)}</span></span></button>)}</div> : null}
                  {message.merchants?.length ? <div className="mt-3 flex flex-wrap gap-2">{message.merchants.slice(0, 4).map(merchant => <button key={merchant.id} type="button" onClick={() => { setSelectedMerchantId(merchant.id); setCurrentView('merchant_store'); }} className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:border-neutral-500">{getLocalizedMerchantName(merchant, lang)}</button>)}</div> : null}
                  {(message.showCatalogLink || message.showShowroomsLink) && <div className="mt-2 flex gap-2">{message.showCatalogLink && <button type="button" onClick={() => openCatalogCategory('all')} className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white">{localizeCopy('打开商品目录', 'Apri catalogo')}</button>}{message.showShowroomsLink && <button type="button" onClick={() => setCurrentView('showrooms')} className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700">{localizeCopy('查看品牌展厅', 'Vedi showroom')}</button>}</div>}
                </div>
              ))}
              {aiLoading && <p role="status" className="text-xs text-neutral-500">{localizeCopy('正在为你查找…', 'Sto cercando…')}</p>}
              {aiQuickQuestions.slice(0, 3).length > 0 && <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3">{aiQuickQuestions.slice(0, 3).map(question => <button key={question} type="button" onClick={() => void askAi(question)} className="rounded-full border border-neutral-200 px-3 py-1.5 text-[11px] text-neutral-600 hover:border-neutral-400">{question}</button>)}</div>}
            </div>
          )}
        </div>
        <div className="mt-14 w-full max-w-5xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-800">{localizeCopy('发现精选商品', 'Esplora le collezioni')}</h2>
            <button type="button" onClick={() => openCatalogCategory('all')} className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-950">{localizeCopy('全部商品', 'Tutti i prodotti')}<ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {homepageCategoryCards.map(({ category, product }, index) => (
              <button key={category} type="button" onClick={() => openCatalogCategory(category)} style={{ animationDelay: `${index * 65}ms` }} className="homepage-card-enter group overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-neutral-400 hover:shadow-lg active:scale-[0.98]">
                <ProductImage src={product.images[0]} alt={getLocalizedProductName(product, lang)} contain className="aspect-[4/3] w-full bg-neutral-100" imageClassName="transition-transform duration-500 group-hover:scale-105" />
                <span className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-neutral-800"><span className="truncate">{category}</span><ArrowRight className="h-3.5 w-3.5 shrink-0 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-neutral-900" /></span>
              </button>
            ))}
            <button type="button" onClick={() => { setCatalogCategory('all'); setCatalogSearchQuery(''); setCatalogFilterStatus('clearance'); setCurrentView('catalog'); }} style={{ animationDelay: `${homepageCategoryCards.length * 65}ms` }} className="homepage-card-enter group overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-neutral-400 hover:shadow-lg active:scale-[0.98]">
              {allSpecialMarketProducts[0] ? <ProductImage src={allSpecialMarketProducts[0].images[0]} alt="" contain className="aspect-[4/3] w-full bg-neutral-100" imageClassName="transition-transform duration-500 group-hover:scale-105" /> : <span className="flex aspect-[4/3] w-full items-center justify-center bg-amber-50 text-amber-700"><Sparkles className="h-8 w-8" /></span>}
              <span className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-neutral-800"><span>{localizeCopy('特价精选', 'Outlet')}</span><ArrowRight className="h-3.5 w-3.5 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-neutral-900" /></span>
            </button>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <button type="button" onClick={() => setCurrentView('showrooms')} style={{ animationDelay: '100ms' }} className="homepage-card-enter group flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-neutral-400 hover:shadow-md active:scale-[0.99]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700"><Building2 className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-neutral-900">{localizeCopy('官方品牌展厅与认证供应商', 'Showroom e fornitori verificati')}</span><span className="mt-1 block text-xs text-neutral-500">{localizeCopy('浏览品牌系列、现货和批发商家。', 'Esplora collezioni e disponibilità B2B.')}</span></span>
              <ChevronRight className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-0.5" />
            </button>
            <button type="button" onClick={() => setCurrentView('register_wholesale')} style={{ animationDelay: '165ms' }} className="homepage-card-enter group flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-neutral-400 hover:shadow-md active:scale-[0.99]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Store className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-neutral-900">{localizeCopy('申请 B2B 批发采购', 'Inizia a comprare all’ingrosso')}</span><span className="mt-1 block text-xs text-neutral-500">{localizeCopy('认证后浏览批发货盘与采购服务。', 'Accedi a prezzi e collezioni per buyer.')}</span></span>
              <ChevronRight className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Fashion editorial entrance */}
      <section className="group relative min-h-[23rem] overflow-hidden bg-neutral-950 text-white shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)] sm:min-h-[32rem] lg:hidden">
        {heroVideoRequested && (
          <video
            ref={heroVideoRef}
            src={heroVideoSrc}
            poster="/pwa-512x512.png"
            aria-label={localizeCopy('RUDA 本季时尚视频', 'Video RUDA: tendenze moda della stagione')}
            controls
            muted
            loop
            playsInline
            preload="metadata"
            onCanPlay={event => {
              setHeroVideoReady(true);
              if (event.currentTarget.paused) {
                void event.currentTarget.play().catch(error => console.warn('[homepage-video-playback]', error));
              }
            }}
            onError={event => {
              console.error('[homepage-video-load]', event.currentTarget.error);
              setHeroVideoReady(false);
              setHeroVideoRequested(false);
            }}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${heroVideoReady ? 'opacity-75' : 'opacity-0'}`}
          />
        )}
        {!heroVideoReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-950 px-6 text-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/60">RUDA / FASHION FILM</p>
              <p className="mt-3 font-serif text-2xl text-white/90 sm:text-3xl">
                {heroVideoRequested
                  ? localizeCopy('正在加载品牌影片…', 'Caricamento del video…')
                  : localizeCopy('本季时尚影片', 'Fashion film della stagione')}
              </p>
              {!heroVideoRequested && (
                <button
                  type="button"
                  onClick={() => setHeroVideoRequested(true)}
                  className="mt-5 inline-flex min-h-10 items-center justify-center border border-white/70 px-4 text-xs font-semibold text-white hover:bg-white hover:text-black"
                >
                  {localizeCopy('加载并播放影片', 'Carica e riproduci')}
                </button>
              )}
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/10 sm:bg-gradient-to-r sm:from-black/75 sm:via-black/20 sm:to-transparent" />
        <div className="relative flex min-h-[23rem] max-w-7xl flex-col justify-end p-6 sm:min-h-[32rem] sm:p-12 lg:p-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/80">RUDA / EDITORIAL</p>
          <h1 className="mt-3 max-w-xl font-serif text-5xl font-medium leading-[0.95] tracking-tight sm:text-7xl">
            {localizeCopy('本季时尚', 'La moda, ora')}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/85 sm:text-base">
            {localizeCopy('从当季趋势、全新廓形到精选现货，发现下一季灵感。', 'Tendenze, nuove silhouette e selezioni dai migliori atelier.')}
          </p>
          <button
            type="button"
            onClick={() => setCurrentView('fashion_trends')}
            className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 border border-white/70 px-5 text-xs font-semibold transition-colors hover:bg-white hover:text-black cursor-pointer"
          >
            {localizeCopy('探索时尚趋势', 'Scopri le tendenze')}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      <section className="border-y border-neutral-300 py-8 text-center sm:py-12 lg:hidden">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-500">RUDA / FASHION CONNECTIONS</p>
        <h2 className="mx-auto mt-3 max-w-2xl font-serif text-2xl font-medium leading-tight tracking-tight text-neutral-950 sm:text-4xl">
          {localizeCopy('连接意大利时尚与欧洲商业', 'La moda italiana, connessa al mondo')}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-xs leading-6 text-neutral-600 sm:text-sm sm:leading-7">
          {localizeCopy('连接意大利供应商与欧洲买家。', 'Fornitori italiani, buyer europei.')}
        </p>
        <form
          onSubmit={event => {
            event.preventDefault();
            if (searchInput.trim()) quickSearchStyle(searchInput.trim());
          }}
          className="relative mx-auto mt-5 max-w-xl"
        >
          <input
            id="home-style-search-input"
            type="search"
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-full border border-neutral-300 bg-white py-3 pl-11 pr-24 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-neutral-950 focus:outline-none focus:ring-1 focus:ring-neutral-950"
          />
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <button
            id="home-style-search-button"
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-700"
          >
            {t('searchButton')}
          </button>
        </form>
        <div className="mx-auto mt-6 grid max-w-3xl grid-cols-3 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setCurrentView('showrooms')}
            className="inline-flex min-h-12 items-center justify-center gap-1 border border-neutral-300 bg-white px-2 text-[11px] font-semibold text-neutral-900 transition-colors hover:border-neutral-950 sm:gap-2 sm:px-4 sm:text-sm"
          >
            <Building2 className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span>{localizeCopy('官方品牌展厅', 'Showroom ufficiale')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCatalogCategory('all');
              setCatalogSearchQuery('');
              setCatalogFilterStatus('clearance');
              setCurrentView('catalog');
            }}
            className="inline-flex min-h-12 items-center justify-center gap-1 border border-neutral-300 bg-white px-2 text-[11px] font-semibold text-neutral-900 transition-colors hover:border-neutral-950 sm:gap-2 sm:px-4 sm:text-sm"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span>{localizeCopy('RUDA 特价展厅', 'RUDA Outlet')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrentView('register_wholesale');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex min-h-12 items-center justify-center gap-1 bg-neutral-950 px-2 text-[11px] font-semibold text-white transition-colors hover:bg-neutral-700 sm:gap-2 sm:px-4 sm:text-sm"
          >
            <span>{localizeCopy('马上免费入驻', 'Iscriviti gratis')}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </button>
        </div>
      </section>

      {/* New collection */}
      <section className="space-y-4 border-t border-neutral-300 pt-5 sm:pt-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-500">RUDA / NEW SEASON</p>
            <h2 className="mt-1 font-serif text-2xl font-medium tracking-tight text-neutral-950 sm:text-3xl">
              {t('homeNewArrivalsTitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setCatalogCategory('all');
              setCatalogSearchQuery('');
              setCatalogFilterStatus('clearance');
              setCurrentView('catalog');
            }}
            className="text-xs font-semibold text-neutral-500 hover:text-black flex items-center gap-0.5 cursor-pointer"
          >
            <span>{localizeCopy('查看全部', 'Vedi tutti')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
          {newCollection.slice(0, 6).map((prod) => {
            const customerPrice = calculateCustomerPrice(prod.wholesalePrice);
            const localizedName = getLocalizedProductName(prod, lang);

            return (
              <div
                key={prod.id}
                onClick={() => quickNavigateToProduct(prod.id)}
                className="group overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_8px_25px_-18px_rgba(0,0,0,0.5)] transition-all hover:-translate-y-1 hover:border-neutral-400 hover:shadow-lg cursor-pointer"
              >
                <div className="aspect-3/4 overflow-hidden relative bg-neutral-100">
                  <ProductImage
                    src={prod.images[0]}
                    alt={localizedName}
                    contain
                    className="h-full w-full"
                    imageClassName="group-hover:scale-105 transition-transform duration-700"
                  />
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.2 bg-black/75 backdrop-blur-xs text-white text-[9px] font-mono font-bold rounded">
                    {prod.styleNo.split('-')[0] || 'RUDA'}
                  </span>
                </div>
                <div className="space-y-1 p-3">
                  <div className="text-[10px] font-mono text-neutral-500 truncate">{prod.styleNo}</div>
                  <div className="text-xs font-medium text-neutral-800 truncate" title={localizedName}>
                    {localizedName}
                  </div>
                  <div className="text-xs font-bold text-neutral-900 font-serif">€{customerPrice.toFixed(2)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. Featured merchant storefronts */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Store className="w-4 h-4 text-neutral-500" />
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-neutral-800">
                {localizeCopy('优质生产批发商', 'Negozi Ufficiali')}
              </h3>
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              {localizeCopy('进入优质生产批发商页面，浏览全部现货与授权系列', 'Scopri collezioni e disponibilità di ogni atelier.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentView('showrooms')}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-neutral-500 hover:text-black cursor-pointer"
          >
            <span>{localizeCopy('查看全部生产商', 'Tutti i negozi')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide">
          {visibleMerchants.slice(0, 4).map((merchant) => {
            const merchantName = getMerchantName(merchant);
            const merchantCity = getMerchantCity(merchant);
            const merchantProductCount = products.filter(product => product.merchantId === merchant.id).length;

            return (
              <button
                key={merchant.id}
                type="button"
                onClick={() => {
                  setSelectedMerchantId(merchant.id);
                  setCurrentView('merchant_store');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group relative min-w-[190px] flex-1 snap-start overflow-hidden rounded-2xl border border-neutral-200/80 bg-white text-left shadow-[0_8px_25px_-18px_rgba(0,0,0,0.5)] transition-all hover:-translate-y-1 hover:border-neutral-400 hover:shadow-lg cursor-pointer"
              >
                <div className="relative h-28 overflow-hidden bg-neutral-900">
                  <img
                    src={merchant.banner}
                    alt={merchantName}
                    className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 flex items-end gap-2">
                    <img
                      src={merchant.logo}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-lg border border-white/70 object-cover shadow-md"
                      referrerPolicy="no-referrer"
                    />
                    <span className="truncate text-xs font-bold text-white">{merchantName}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-[11px] text-neutral-500">{merchantCity}</div>
                    <div className="mt-1 text-[10px] font-semibold text-neutral-800">
                      {merchantProductCount} {localizeCopy('款商品在售', 'articoli disponibili')}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-black" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured city wholesalers */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Store className="h-4 w-4 text-neutral-500" />
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-neutral-800">
                {localizeCopy('优质城市批发商', 'Grossisti della città')}
              </h3>
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              {localizeCopy('查看城市批发商的现货货盘与独立批发店铺。', 'Scopri i grossisti locali e le loro collezioni disponibili.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.history.replaceState({}, '', `${window.location.pathname}?businessType=wholesaler&showroomZone=tavoro${window.location.hash}`);
              setSelectedZone('tavoro');
              setCurrentView('showrooms');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-neutral-500 hover:text-black cursor-pointer"
          >
            <span>{localizeCopy('查看全部城市批发商', 'Vedi tutti')}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={localizeCopy('按国家查看城市批发商', 'Cerca grossisti per paese')}>
          {wholesaleCountryOptions.map(country => {
            const localWholesalerCount = merchants.filter(merchant => {
              if (merchant.merchantZone !== 'tavoro') return false;
              const countryValues = [merchant.country, merchant.country_zh, merchant.country_it]
                .filter(Boolean)
                .map(value => value!.toLowerCase());
              return country.aliases.some(alias => countryValues.some(value => value.includes(alias)));
            }).length;

            return (
            <button
              key={country.key}
              type="button"
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set('wholesaleCountry', country.key);
                params.set('businessType', 'wholesaler');
                params.set('showroomZone', 'tavoro');
                window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
                setSelectedZone('tavoro');
                setCurrentView('showrooms');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="group min-h-24 rounded-2xl border border-neutral-200/90 bg-white p-4 text-left shadow-[0_8px_25px_-20px_rgba(0,0,0,0.55)] transition-all hover:-translate-y-1 hover:border-neutral-500 hover:shadow-lg"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-base font-bold tracking-tight text-neutral-950">{localizeCopy(country.zh, country.it)}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-black" />
              </span>
              <span className="mt-3 block text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                {localWholesalerCount} {localizeCopy('家当地批发商', 'grossisti locali')}
              </span>
              <span className="mt-1 block text-[11px] text-neutral-500">
                {localizeCopy('进入当地商家', 'Vedi negozi locali')}
              </span>
            </button>
            );
          })}
        </div>

        {cityWholesalers.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cityWholesalers.map(merchant => {
              const merchantName = getMerchantName(merchant);
              const merchantCity = getMerchantCity(merchant);
              const merchantProductCount = products.filter(product => product.merchantId === merchant.id).length;

              return (
                <button
                  key={merchant.id}
                  type="button"
                  onClick={() => {
                    setSelectedMerchantId(merchant.id);
                    setCurrentView('merchant_store');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group overflow-hidden rounded-2xl border border-neutral-200/80 bg-white text-left shadow-[0_8px_25px_-18px_rgba(0,0,0,0.5)] transition-all hover:-translate-y-1 hover:border-neutral-400 hover:shadow-lg cursor-pointer"
                >
                  <div className="relative h-24 overflow-hidden bg-neutral-900">
                    <img src={merchant.banner} alt={merchantName} className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
                      <img src={merchant.logo} alt="" className="h-8 w-8 shrink-0 rounded-lg border border-white/70 object-cover" referrerPolicy="no-referrer" />
                      <span className="truncate text-xs font-bold text-white">{merchantName}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <div className="truncate text-[11px] text-neutral-500">{merchantCity}</div>
                      <div className="mt-1 text-[10px] font-semibold text-neutral-800">{merchantProductCount} {localizeCopy('款现货', 'articoli')}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-black" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-5 py-8 text-center text-xs text-neutral-500">
            {localizeCopy('城市批发商正在陆续入驻，敬请期待。', 'I grossisti della città saranno disponibili a breve.')}
          </div>
        )}
      </section>

      {/* Featured city retail stores */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Store className="h-4 w-4 text-neutral-500" />
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-neutral-800">
                {localizeCopy('城市零售店', 'Negozi retail della città')}
              </h3>
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              {localizeCopy('浏览城市零售店与其精选商品，进入独立店铺页面。', 'Scopri le boutique e i negozi locali della rete RUDA.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedZone('boutique_department');
              setCurrentView('showrooms');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-neutral-500 hover:text-black cursor-pointer"
          >
            <span>{localizeCopy('查看全部城市零售店', 'Vedi tutti')}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {cityRetailStores.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cityRetailStores.map(merchant => {
              const merchantName = getMerchantName(merchant);
              const merchantCity = getMerchantCity(merchant);
              const merchantProductCount = products.filter(product => product.merchantId === merchant.id).length;

              return (
                <button
                  key={merchant.id}
                  type="button"
                  onClick={() => {
                    setSelectedMerchantId(merchant.id);
                    setCurrentView('merchant_store');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group overflow-hidden rounded-2xl border border-neutral-200/80 bg-white text-left shadow-[0_8px_25px_-18px_rgba(0,0,0,0.5)] transition-all hover:-translate-y-1 hover:border-neutral-400 hover:shadow-lg cursor-pointer"
                >
                  <div className="relative h-24 overflow-hidden bg-neutral-900">
                    <img src={merchant.banner} alt={merchantName} className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
                      <img src={merchant.logo} alt="" className="h-8 w-8 shrink-0 rounded-lg border border-white/70 object-cover" referrerPolicy="no-referrer" />
                      <span className="truncate text-xs font-bold text-white">{merchantName}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <div className="truncate text-[11px] text-neutral-500">{merchantCity}</div>
                      <div className="mt-1 text-[10px] font-semibold text-neutral-800">{merchantProductCount} {localizeCopy('款商品', 'articoli')}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-black" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-5 py-8 text-center text-xs text-neutral-500">
            {localizeCopy('城市零售店正在陆续入驻，敬请期待。', 'I negozi retail della città saranno disponibili a breve.')}
          </div>
        )}
      </section>

      {/* Platform special market: all public clearance products, grouped from every verified merchant. */}
      <section className="space-y-5 pt-4">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-neutral-900 bg-neutral-950 px-5 py-7 text-center shadow-[0_20px_45px_-25px_rgba(0,0,0,0.8)] sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#14edfc]/15 blur-3xl" />
          <div className="relative flex flex-col items-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-black">
              <Sparkles className="h-3.5 w-3.5" />
              RUDA CLEARANCE
            </div>
            <h3 className="text-3xl font-serif font-bold tracking-tight text-white sm:text-4xl">{localizeCopy('特价精选', 'Outlet')}</h3>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-neutral-300 sm:text-sm">
              {localizeCopy('现货特价商品：{{RUDA_ARG_0}} 款 · {{RUDA_ARG_1}} 家商家', 'Outlet: {{RUDA_ARG_0}} articoli · {{RUDA_ARG_1}} fornitori', [allSpecialMarketProducts.length, specialMarketMerchantCount])}
            </p>
            <button
              type="button"
              onClick={() => setCurrentView('catalog')}
              className="mt-5 inline-flex items-center gap-1 rounded-full bg-[#14edfc] px-5 py-2.5 text-xs font-bold text-black shadow-[0_0_20px_rgba(20,237,252,0.35)] transition-all hover:bg-[#72f5ff] hover:shadow-[0_0_28px_rgba(20,237,252,0.65)] cursor-pointer"
            >
              <span>{localizeCopy('进入特价市场', 'Vedi tutto')}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="grid gap-3 rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-neutral-950 sm:grid-cols-[1fr_auto] sm:items-center sm:px-4 sm:py-3.5">
          <div>
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              <Store className="h-3 w-3" />
              {localizeCopy('面向服装批发商', 'Per grossisti')}
            </div>
            <h4 className="mt-0.5 text-base font-serif font-bold tracking-tight">
              {localizeCopy('批发商入驻', 'Apri il tuo negozio B2B')}
            </h4>
            <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">
              {localizeCopy('开设独立店铺，上传真实库存，统一管理订单。', 'Negozio indipendente, stock reale e ordini centralizzati.')}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-medium text-neutral-700">
              <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5">{localizeCopy('独立店铺', 'Negozio indipendente')}</span>
              <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5">{localizeCopy('真实库存', 'Stock reale')}</span>
              <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5">{localizeCopy('订单管理', 'Gestione ordini')}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const isRudaDomain = window.location.hostname.endsWith('.ruda.fashion') || window.location.hostname === 'ruda.fashion';
              window.location.assign(isRudaDomain ? 'https://vip.ruda.fashion' : '/merchant');
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-bold text-neutral-950 transition-colors hover:bg-neutral-200 cursor-pointer"
          >
            {localizeCopy('申请批发商入驻', 'Diventa grossista')}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {allSpecialMarketProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-5 text-center text-xs text-neutral-500">{localizeCopy('暂无特价商品。', 'Nessun prodotto outlet.')}</div>
        ) : (
          <div className="grid grid-cols-6 items-start gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {allSpecialMarketProducts.map((product, index) => {
              const merchant = merchants.find(item => item.id === product.merchantId);
              const localizedName = getLocalizedProductName(product, lang);
              const isThreeColumnCard = index % 7 >= 4 && index % 7 <= 6;
              return (
                <div key={product.id} onClick={() => quickNavigateToProduct(product.id)} className={`group ${isThreeColumnCard ? 'col-span-2' : 'col-span-3'} cursor-pointer overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xs transition-all hover:-translate-y-0.5 hover:border-[#14edfc] hover:shadow-[0_0_18px_rgba(20,237,252,0.24)] sm:col-span-1`}>
                  <div className="relative overflow-hidden bg-neutral-100">
                    <ProductImage src={product.images[0]} alt={localizedName} contain className="aspect-[3/4] h-auto w-full p-1" imageClassName="group-hover:scale-105 transition-transform duration-700" />
                    <span className="absolute left-1 top-1 rounded bg-white px-1.5 py-0.5 text-[9px] font-bold text-black shadow-sm">{localizeCopy('特价', 'Outlet')}</span>
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="truncate text-[10px] font-semibold text-neutral-900">{localizedName}</p>
                    <p className="mt-0.5 truncate text-[10px] text-neutral-500">{merchant?.name || product.merchantName || 'RUDA Partner'}</p>
                    <p className="mt-1 text-xs font-bold text-neutral-950">€{calculateCustomerPrice(product.wholesalePrice).toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="border-y border-neutral-200 py-10" aria-labelledby="seo-intent-heading">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-neutral-500">
              {localizeCopy('RUDA FASHION · 欧洲 B2B', 'RUDA FASHION · B2B ITALIA')}
            </p>
            <h2 id="seo-intent-heading" className="mt-2 max-w-2xl font-serif text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl">
              {localizeCopy('意大利服装现货与女装批发采购', 'Ingrosso moda pronta e abbigliamento per boutique')}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-600">
              {localizeCopy('采购意大利女装现货与配饰，直达欧洲买家。', 'Moda pronta e accessori italiani per buyer europei.')}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
              <a href="/catalog" className="rounded-full border border-neutral-300 bg-white px-3 py-2 hover:border-black">
                {localizeCopy('服装批发目录', 'Catalogo ingrosso')}
              </a>
              <a href="/showrooms" className="rounded-full border border-neutral-300 bg-white px-3 py-2 hover:border-black">
                {localizeCopy('生产商 / 批发商 / 零售商', 'Produttori, Grossisti & Rivenditori')}
              </a>
              <a href="/register-wholesale" className="rounded-full border border-neutral-300 bg-white px-3 py-2 hover:border-black">
                {localizeCopy('申请 B2B 采购认证', 'Accreditamento B2B')}
              </a>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-neutral-950">
              {localizeCopy('服装批发常见问题', 'Domande frequenti sulla moda all’ingrosso')}
            </h3>
            <details className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
              <summary className="cursor-pointer text-xs font-semibold text-neutral-900">
                {localizeCopy('哪里可以找到意大利服装现货生产商？', 'Dove trovare produttori di moda pronta in Italia?')}
              </summary>
              <p className="mt-2 text-xs leading-6 text-neutral-600">
                {localizeCopy('RUDA 汇集意大利和欧洲生产商、批发商与零售商，支持公开现货 B2B 采购。', 'Nel catalogo RUDA trovi showroom e produttori verificati per acquisti B2B in Italia e in Europa.')}
              </p>
            </details>
            <details className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
              <summary className="cursor-pointer text-xs font-semibold text-neutral-900">
                {localizeCopy('可以采购女装批发吗？', 'Posso acquistare abbigliamento donna all’ingrosso?')}
              </summary>
              <p className="mt-2 text-xs leading-6 text-neutral-600">
                {localizeCopy('可以，平台提供连衣裙、外套、针织、裤装、箱包和时尚配饰。', 'Sì, il marketplace include abiti, giacche, maglieria, pantaloni, borse e accessori moda.')}
              </p>
            </details>
          </div>
        </div>
      </section>

      <div className="fixed bottom-20 right-4 z-40 sm:bottom-6 sm:right-6 lg:hidden">
        {showAiHelp && (
          <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-[min(72vh,640px)] max-h-[calc(100vh-9rem)] w-[min(92vw,480px)] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl md:absolute md:bottom-14 md:right-0">
            <div className="flex shrink-0 items-center justify-between bg-neutral-950 px-5 py-4 text-white">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div><span className="block text-sm font-bold">{localizeCopy('AI 客服', 'Assistenza AI')}</span><span className="block text-[10px] text-neutral-400">{localizeCopy('RUDA 买手助手', 'Assistente RUDA')}</span></div>
              </div>
              <button type="button" onClick={() => setShowAiHelp(false)} aria-label={localizeCopy('关闭 AI 客服', 'Chiudi assistenza AI')}><X className="w-4 h-4 text-neutral-400" /></button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-neutral-50 p-4">
              {aiMessages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${message.role === 'user' ? 'ml-auto max-w-[92%] bg-black text-white' : 'w-full border border-neutral-200 bg-white text-neutral-700'}`}>
                  <p>{message.text}</p>
                  {message.products?.length ? (
                    <div className="mt-3 space-y-2">
                      {message.products.map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            quickNavigateToProduct(product.id);
                            setShowAiHelp(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-500 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                        >
                          {product.images
                            ? <ProductImage src={(() => {
                                try {
                                  const images = JSON.parse(product.images) as string[];
                                  return images[0] || '';
                                } catch {
                                  return '';
                                }
                              })()} alt={product.name_zh || product.name} className="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100" imageClassName="h-full w-full object-cover" />
                            : <span className="flex h-14 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100"><Store className="h-5 w-5" /></span>}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-neutral-900">{getLocalizedProductName(product, lang)}</span>
                            <span className="mt-1 block truncate text-xs text-neutral-500">{product.merchant?.name || product.merchantName || product.brand}{product.merchant?.city ? ` · ${lang === 'zh' ? product.merchant.city_zh || product.merchant.city : product.merchant.city_it || product.merchant.city}` : ''}</span>
                            <span className="mt-1 block text-xs text-neutral-500">{localizeCopy('起订量', 'MOQ')} {product.moq}</span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block font-bold text-neutral-900">€{product.wholesalePrice.toFixed(2)}</span>
                            <span className="text-[10px] text-neutral-500">{localizeCopy('批发价 / 件', 'all’ingrosso / pezzo')}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {message.merchants?.length ? (
                    <div className="mt-3 space-y-2">
                      {message.merchants.map(merchant => {
                        const businessTypeLabel = getMerchantBusinessTypeLabel(merchant.businessType);
                        const merchantName = getLocalizedMerchantName(merchant, lang);
                        const tagline = lang === 'zh'
                          ? merchant.tagline_zh || merchant.tagline
                          : merchant.tagline_it || (merchant.tagline || '').replace(/[\u4e00-\u9fa5]/g, '').trim();
                        const city = lang === 'zh'
                          ? merchant.city_zh || merchant.city
                          : merchant.city_it || merchant.city;
                        const country = lang === 'zh'
                          ? merchant.country_zh || merchant.country
                          : merchant.country_it || merchant.country;
                        const visibleCity = city && !['待完善', '未填写', '待补充'].includes(city.trim())
                          ? city
                          : localizeCopy('城市未填写', 'Città non specificata');
                        const location = [visibleCity, country].filter(Boolean).join(', ');
                        return <a
                          key={merchant.id}
                          href={getMerchantStorePath(merchant)}
                          onClick={event => openMerchantStore(event, merchant)}
                          className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-500 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                        >
                          {merchant.logo
                            ? <img src={merchant.logo} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                            : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100"><Store className="h-5 w-5" /></span>}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-neutral-900">{merchantName}</span>
                            {merchant.businessType && <span className="mt-0.5 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">{businessTypeLabel ? localizeCopy(businessTypeLabel[0], businessTypeLabel[1]) : merchant.businessType}</span>}
                            {tagline && <span className="mt-0.5 block truncate text-xs text-neutral-500">{tagline}</span>}
                            {location && <span className="mt-1 flex items-center gap-1 text-xs text-neutral-500"><MapPin className="h-3 w-3 shrink-0" />{location}</span>}
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-neutral-700">{localizeCopy('进入店铺', 'Apri')} <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></span>
                        </a>;
                      })}
                    </div>
                  ) : null}
                  {message.showShowroomsLink && (
                    <a href="/showrooms" onClick={openShowrooms} className="mt-3 inline-flex items-center gap-1 font-semibold text-neutral-900 underline underline-offset-2">
                      {localizeCopy('打开商家地图查看全部认证店铺', 'Apri la mappa con tutti i negozi RUDA')} <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {message.showCatalogLink && (
                    <a href="/catalog" onClick={openCatalog} className="mt-3 inline-flex items-center gap-1 font-semibold text-neutral-900 underline underline-offset-2">
                      {localizeCopy('打开现货商城浏览公开商品', 'Apri il catalogo prodotti')} <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))}
              {aiLoading && <div className="w-fit rounded-xl bg-white px-4 py-3 text-sm text-neutral-400 border border-neutral-200">{localizeCopy('正在查询…', 'Ricerca…')}</div>}
              {aiMessages.length === 1 && <div className="flex flex-wrap gap-2 pt-1">{aiQuickQuestions.map(question => <button key={question} type="button" onClick={() => void askAi(question)} className="rounded-full border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-600 hover:border-black hover:text-black">{question}</button>)}</div>}
            </div>
            <form onSubmit={event => { event.preventDefault(); void askAi(); }} className="flex shrink-0 items-center gap-3 border-t border-neutral-200 bg-white p-4">
              <input value={aiInput} onChange={event => setAiInput(event.target.value)} placeholder={localizeCopy('输入款号、品类或问题…', 'Codice, categoria o domanda…')} className="min-w-0 flex-1 rounded-lg bg-neutral-100 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-black" />
              <button type="submit" disabled={aiLoading || !aiInput.trim()} aria-label={localizeCopy('发送问题', 'Invia domanda')} className="rounded-lg bg-black p-3 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>
            </form>
          </div>
        )}
        <button type="button" onClick={() => { if (showAiHelp) setShowAiHelp(false); else void openAiHelp(); }} aria-label={localizeCopy('打开 AI 客服', 'Apri assistenza AI')} title={localizeCopy('AI 客服', 'Assistenza AI')} className="hidden h-10 w-10 rounded-full bg-black text-white shadow-lg items-center justify-center hover:bg-neutral-800 transition-colors md:flex">
          <Bot className="h-4 w-4" />
        </button>
      </div>

    </div>
  );
};
