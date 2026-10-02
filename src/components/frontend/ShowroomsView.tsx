import React, { useMemo, useRef, useState } from 'react';
import { 
  MapPin, 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  Send, 
  Store, 
  BadgeCheck
} from 'lucide-react';
import { useB2B } from '../../context/B2BContext';
import { getLocalizedMerchantName, getLocalizedMerchantTagline } from '../../i18n/translations';
import { Merchant } from '../../types/b2b';
import { DEFAULT_MERCHANT_BANNER, DEFAULT_MERCHANT_LOGO, merchantMediaUrl } from '../../utils/merchantMedia';

const normalizeFilterValue = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
const getMerchantCategory = (merchant: Merchant) => {
  const businessType = normalizeFilterValue(merchant.businessType || '').replace(/[\s_-]/g, '');
  if (/producer|brandsupplier|manufacturer|atelier|生产商|品牌商|工厂|produttor|manifattur/.test(businessType)) return 'iolo';
  if (/wholesaler|wholesale|distributor|批发商|分销商|代理|grossist|distribut/.test(businessType)) return 'tavoro';
  if (/retailer|retail|boutique|零售商|零售店|rivenditor/.test(businessType)) return 'boutique_department';

  if (merchant.merchantZone === 'iolo' || merchant.merchantZone === 'tavoro' || merchant.merchantZone === 'boutique_department') {
    return merchant.merchantZone;
  }
  return null;
};
const countryAliases: Record<string, string> = {
  italia: 'italy',
  italy: 'italy',
  意大利: 'italy',
  it: 'italy',
  francia: 'france',
  france: 'france',
  法国: 'france',
  spagna: 'spain',
  spain: 'spain',
  西班牙: 'spain',
  grecia: 'greece',
  greece: 'greece',
  希腊: 'greece',
  polonia: 'poland',
  poland: 'poland',
  波兰: 'poland',
  germania: 'germany',
  germany: 'germany',
  deutschland: 'germany',
  德国: 'germany',
  de: 'germany',
  'paesi bassi': 'netherlands',
  netherlands: 'netherlands',
  nederland: 'netherlands',
  olanda: 'netherlands',
  荷兰: 'netherlands',
  nl: 'netherlands',
  belgio: 'belgium',
  belgium: 'belgium',
  belgië: 'belgium',
  比利时: 'belgium',
  be: 'belgium',
  portogallo: 'portugal',
  portugal: 'portugal',
  葡萄牙: 'portugal',
  austria: 'austria',
  奥地利: 'austria',
  at: 'austria',
  svizzera: 'switzerland',
  switzerland: 'switzerland',
  schweiz: 'switzerland',
  suisse: 'switzerland',
  瑞士: 'switzerland',
  ch: 'switzerland',
  'regno unito': 'united kingdom',
  'united kingdom': 'united kingdom',
  uk: 'united kingdom',
  britain: 'united kingdom',
  '大不列颠': 'united kingdom',
  英国: 'united kingdom'
};
const europeanCountryOptions = [
  { key: 'italy', zh: '意大利', it: 'Italia' },
  { key: 'france', zh: '法国', it: 'Francia' },
  { key: 'spain', zh: '西班牙', it: 'Spagna' },
  { key: 'germany', zh: '德国', it: 'Germania' },
  { key: 'netherlands', zh: '荷兰', it: 'Paesi Bassi' },
  { key: 'belgium', zh: '比利时', it: 'Belgio' },
  { key: 'portugal', zh: '葡萄牙', it: 'Portogallo' },
  { key: 'greece', zh: '希腊', it: 'Grecia' },
  { key: 'poland', zh: '波兰', it: 'Polonia' },
  { key: 'austria', zh: '奥地利', it: 'Austria' },
  { key: 'switzerland', zh: '瑞士', it: 'Svizzera' },
  { key: 'united kingdom', zh: '英国', it: 'Regno Unito' }
];
const getCountryKey = (merchant: Merchant) => {
  const value = normalizeFilterValue(merchant.country || merchant.country_it || merchant.country_zh || '');
  return value ? countryAliases[value] || value : 'unknown';
};
const getCityKey = (merchant: Merchant) => {
  const value = normalizeFilterValue(merchant.city || merchant.city_it || merchant.city_zh || '');
  return value || 'unknown';
};

export const ShowroomsView: React.FC = () => {
  const { 
    merchants, 
    products, 
    setSelectedMerchantId, 
    setCurrentView,
    hasVaultAccess,
    getVaultStatus,
    requestVaultAccess,
    currentCustomer,
    lang, localizeCopy
  } = useB2B();

  const isIt = lang === 'it';
  const businessTypeToZone: Record<string, string> = {
    producer: 'iolo',
    wholesaler: 'tavoro',
    retailer: 'boutique_department'
  };
  const zoneToBusinessType: Record<string, string> = {
    iolo: 'producer',
    tavoro: 'wholesaler',
    boutique_department: 'retailer'
  };
  const zoneToPath: Record<string, string> = {
    iolo: '/producers',
    tavoro: '/wholesalers',
    boutique_department: '/retailers'
  };
  const initialParams = new URLSearchParams(window.location.search);
  const pathBusinessType = window.location.pathname === '/producers'
    ? 'producer'
    : window.location.pathname === '/wholesalers'
      ? 'wholesaler'
      : window.location.pathname === '/retailers'
        ? 'retailer'
        : null;
  const [selectedZone, setSelectedZone] = useState<string>(() => {
    const businessType = initialParams.get('businessType');
    return pathBusinessType
      ? businessTypeToZone[pathBusinessType]
      : (businessType && businessTypeToZone[businessType]) || initialParams.get('showroomZone') || 'all';
  });
  const [selectedCountry, setSelectedCountry] = useState(() => {
    const country = new URLSearchParams(window.location.search).get('wholesaleCountry');
    if (!country) return 'all';
    const normalized = normalizeFilterValue(country);
    return countryAliases[normalized] || normalized;
  });
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const merchantListRef = useRef<HTMLDivElement>(null);
  const [requestModalMerchant, setRequestModalMerchant] = useState<Merchant | null>(null);
  const [requestNote, setRequestNote] = useState(
    localizeCopy('申请查看当季首发新款、样板细节及大货起订报价', 'Richiesta di consultazione campionario e listino wholesale')
  );

  const zoneLabels: Record<string, string> = {
    iolo: localizeCopy('生产商', 'Produttori'),
    tavoro: localizeCopy('批发商', 'Grossisti'),
    leather: localizeCopy('精品皮包区', 'Pelletteria premium'),
    boutique_department: localizeCopy('零售商', 'Rivenditori')
  };
  const getCountryLabel = (merchant: Merchant) => {
    const matchedCountry = europeanCountryOptions.find(option => option.key === getCountryKey(merchant));
    if (matchedCountry) return localizeCopy(matchedCountry.zh, matchedCountry.it);
    const country = lang === 'zh'
      ? (merchant.country_zh || merchant.country)
      : (merchant.country_it || merchant.country);
    if (country) return country;
    if (getCountryKey(merchant) === 'unknown') return localizeCopy('国家未填写', 'Paese non specificato');
    return merchant.country;
  };
  const getCityLabel = (merchant: Merchant) => {
    const city = lang === 'zh'
      ? (merchant.city_zh || merchant.city)
      : (merchant.city_it || merchant.city);
    return city && !['待完善', '未填写', '待补充'].includes(city.trim())
      ? city
      : localizeCopy('城市未填写', 'Città non specificata');
  };
  const getIndustryValues = (merchant: Merchant) => {
    const values = [merchant.specialtyCategory, ...(merchant.specialties || [])]
      .filter((value): value is string => Boolean(value?.trim()))
      .map(value => value.trim());
    return values.length > 0 ? [...new Set(values)] : [zoneLabels[merchant.merchantZone || ''] || localizeCopy('时尚行业', 'Settore moda')];
  };
  const merchantsInZone = useMemo(
    () => merchants.filter(merchant => selectedZone === 'all' || getMerchantCategory(merchant) === selectedZone),
    [merchants, selectedZone]
  );
  const countryOptions = useMemo(() => {
    const options = new Map<string, string>();
    europeanCountryOptions.forEach(country => {
      options.set(country.key, localizeCopy(country.zh, country.it));
    });
    merchantsInZone.forEach(merchant => {
      const key = getCountryKey(merchant);
      if (!options.has(key)) options.set(key, getCountryLabel(merchant));
    });
    return [...options.entries()].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [merchantsInZone, isIt, lang, localizeCopy]);
  const cityOptions = useMemo(() => {
    const options = new Map<string, string>();
    merchantsInZone
      .filter(merchant => selectedCountry === 'all' || getCountryKey(merchant) === selectedCountry)
      .forEach(merchant => options.set(getCityKey(merchant), getCityLabel(merchant)));
    return [...options.entries()].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [merchantsInZone, selectedCountry, lang, localizeCopy]);
  const industryOptions = useMemo(() => {
    const options = new Map<string, string>();
    merchantsInZone.forEach(merchant => getIndustryValues(merchant).forEach(value => options.set(normalizeFilterValue(value), value)));
    return [...options.entries()].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [merchantsInZone, lang, localizeCopy]);
  const filteredMerchants = useMemo(() => merchantsInZone.filter(merchant =>
    (selectedCountry === 'all' || getCountryKey(merchant) === selectedCountry) &&
    (selectedCity === 'all' || getCityKey(merchant) === selectedCity) &&
    (selectedIndustry === 'all' || getIndustryValues(merchant).some(value => normalizeFilterValue(value) === selectedIndustry))
  ), [merchantsInZone, selectedCountry, selectedCity, selectedIndustry, isIt]);
  const handleEnterMerchantStore = (merchantId: string) => {
    setSelectedMerchantId(merchantId);
    setCurrentView('merchant_store');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleZoneSelect = (zone: string) => {
    setSelectedZone(zone);
    setSelectedCountry('all');
    setSelectedCity('all');
    setSelectedIndustry('all');
    const businessType = zone === 'iolo' ? 'producer' : zone === 'tavoro' ? 'wholesaler' : zone === 'boutique_department' ? 'retailer' : null;
    const params = new URLSearchParams(window.location.search);
    if (businessType) {
      params.set('businessType', businessType);
      params.set('showroomZone', zone);
    } else {
      params.delete('businessType');
      params.delete('showroomZone');
    }
    params.delete('wholesaleCountry');
    if (zoneToPath[zone]) {
      params.set('businessType', zoneToBusinessType[zone]);
      params.delete('showroomZone');
      window.history.replaceState({}, '', `${zoneToPath[zone]}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`);
    } else {
      window.history.replaceState({}, '', `/showrooms${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`);
    }
    window.setTimeout(() => {
      merchantListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };
  const handleCountrySelect = (countryKey: string) => {
    setSelectedCountry(countryKey);
    setSelectedCity('all');
    const params = new URLSearchParams(window.location.search);
    if (countryKey === 'all') params.delete('wholesaleCountry');
    else params.set('wholesaleCountry', countryKey);
    if (selectedZone !== 'all') params.set('businessType', zoneToBusinessType[selectedZone]);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
  };
  const clearDirectoryFilters = () => {
    setSelectedCountry('all');
    setSelectedCity('all');
    setSelectedIndustry('all');
    const params = new URLSearchParams(window.location.search);
    params.delete('wholesaleCountry');
    window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`);
  };

  const handleOpenRequestModal = (merchant: Merchant, e: React.MouseEvent) => {
    e.stopPropagation();
    setRequestModalMerchant(merchant);
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestModalMerchant) return;
    requestVaultAccess(requestModalMerchant.id, requestNote);
    setRequestModalMerchant(null);
  };

  const zoneDescriptions: Record<string, string> = {
    iolo: localizeCopy('生产自己的品牌与商品，提供现货、系列和授权合作。', 'Brand e produttori con collezioni e stock disponibili.'),
    tavoro: localizeCopy('面向零售商供货的批发商，提供货盘、价格和独立批发店铺。', 'Partner wholesale con assortimenti pronti per i rivenditori.'),
    leather: localizeCopy('主打精品皮包和皮革配件，适合品牌零售商与精品店采购。', 'Borse in pelle premium e accessori di pelletteria.'),
    boutique_department: localizeCopy('服务本地消费者的零售商与城市门店，展示精选商品和独立店铺。', 'Negozi e boutique retail per acquisti locali.')
  };
  const businessCards = [
    { key: 'iolo', label: localizeCopy('生产商', 'Produttori') },
    { key: 'tavoro', label: localizeCopy('批发商', 'Grossisti') },
    { key: 'boutique_department', label: localizeCopy('零售商', 'Rivenditori') }
  ];
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 bg-[#f7f7f5] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <section
        aria-label={localizeCopy('商家分类', 'Categorie showroom')}
        className="relative left-1/2 -mt-4 flex h-[calc(100svh-150px)] min-h-[440px] w-screen -translate-x-1/2 items-end overflow-hidden bg-neutral-950 sm:-mt-6 sm:h-[calc(100svh-176px)] sm:min-h-[520px]"
      >
        <video
          src="/videos/showrooms.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={localizeCopy('RUDA 品牌展厅视频', 'Video dei showroom RUDA')}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/20" />
        <div className="relative z-10 w-full px-6 pb-10 text-white sm:px-10 sm:pb-12 lg:px-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75 sm:text-xs">
            RUDA / SHOWROOMS
          </p>
          <h1 className="mt-2 font-serif text-3xl font-medium leading-none tracking-tight sm:text-5xl lg:text-6xl">
            {localizeCopy('品牌展厅', 'Showroom')}
          </h1>
        </div>
      </section>

      <nav
        aria-label={localizeCopy('商家分类目录', 'Categorie showroom')}
        className="sticky top-[104px] z-30 -mx-4 overflow-x-auto border-y border-neutral-300 bg-[#f7f7f5] px-4 shadow-[0_8px_10px_-10px_rgba(0,0,0,0.4)] sm:top-[160px] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      >
        <div className="flex min-w-max items-center gap-5 sm:gap-8">
          {[
            { key: 'all', label: localizeCopy('全部商家', 'Tutti i partner'), count: merchants.length },
            ...businessCards.map(card => ({
              ...card,
              count: merchants.filter(merchant => getMerchantCategory(merchant) === card.key).length
            }))
          ].map(item => {
            const isSelected = selectedZone === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleZoneSelect(item.key)}
                aria-pressed={isSelected}
                className={`flex min-h-11 items-center gap-2 border-b-2 px-0.5 text-sm font-semibold transition-colors sm:min-h-12 sm:text-base ${
                  isSelected ? 'border-neutral-950 text-neutral-950' : 'border-transparent text-neutral-500 hover:text-neutral-950'
                }`}
              >
                <span>{item.label}</span>
                <span className={`text-[11px] font-normal ${isSelected ? 'text-neutral-500' : 'text-neutral-400'}`}>{item.count}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <section aria-label={localizeCopy('商家目录筛选', 'Filtri showroom')} className="grid grid-cols-3 items-end gap-1.5 border-b border-neutral-300 pb-2">
        <label className="flex min-w-0 flex-col gap-0.5 text-[6px] font-semibold uppercase tracking-[0.04em] text-neutral-500">
          {localizeCopy('国家', 'Paese')}
          <select
            value={selectedCountry}
            onChange={event => handleCountrySelect(event.target.value)}
            className="h-6 w-full min-w-0 border border-neutral-300 bg-white px-1 text-[7px] font-medium normal-case tracking-normal text-neutral-900 outline-none focus:border-neutral-950 sm:px-1.5"
          >
            <option value="all">{localizeCopy('全部国家', 'Tutti i paesi')}</option>
            {countryOptions.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-0.5 text-[6px] font-semibold uppercase tracking-[0.04em] text-neutral-500">
          {localizeCopy('城市', 'Città')}
          <select
            value={selectedCity}
            onChange={event => setSelectedCity(event.target.value)}
            className="h-6 w-full min-w-0 border border-neutral-300 bg-white px-1 text-[7px] font-medium normal-case tracking-normal text-neutral-900 outline-none focus:border-neutral-950 sm:px-1.5"
          >
            <option value="all">{localizeCopy('全部城市', 'Tutte le città')}</option>
            {cityOptions.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-0.5 text-[6px] font-semibold uppercase tracking-[0.04em] text-neutral-500">
          <span className="flex items-center justify-between gap-0.5 whitespace-nowrap">
            <span>{localizeCopy('行业 / 主营', 'Settore / specialità')}</span>
            <button
              type="button"
              onClick={clearDirectoryFilters}
              disabled={selectedCountry === 'all' && selectedCity === 'all' && selectedIndustry === 'all'}
              className="text-[6px] font-semibold normal-case tracking-normal text-neutral-500 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {localizeCopy('清除', 'Azzera')}
            </button>
          </span>
          <select
            value={selectedIndustry}
            onChange={event => setSelectedIndustry(event.target.value)}
            className="h-6 w-full min-w-0 border border-neutral-300 bg-white px-1 text-[7px] font-medium normal-case tracking-normal text-neutral-900 outline-none focus:border-neutral-950 sm:px-1.5"
          >
            <option value="all">{localizeCopy('全部行业', 'Tutti i settori')}</option>
            {industryOptions.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
        </label>
      </section>
      {/* Merchant Cards Grid */}
      <div ref={merchantListRef} className="scroll-mt-6 space-y-5">
        <div className="flex justify-end">
          <span className="text-[9px] text-neutral-500">
            {filteredMerchants.length} {localizeCopy('家', 'partner')}
          </span>
        </div>

        {filteredMerchants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-xs text-neutral-500">
            {localizeCopy('该分区暂时没有批发商。', 'Nessun produttore in questa zona.')}
          </div>
        ) : (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredMerchants.map(merchant => {
          const merchantProds = products.filter(p => p.merchantId === merchant.id);
          const publicCount = merchantProds.filter(p => !p.isExclusiveProtected && p.visibility !== 'private').length;
          const vaultCount = merchantProds.filter(p => p.isExclusiveProtected || p.visibility === 'private').length;
          const hasAccess = hasVaultAccess(merchant.id);
          const vaultStatus = getVaultStatus(merchant.id);

          const merchantName = getLocalizedMerchantName(merchant, lang);
          const merchantTagline = getLocalizedMerchantTagline(merchant, lang);
          const merchantCity = getCityLabel(merchant);
          const merchantSpecialties = merchant.specialties?.filter(Boolean).slice(0, 3) || [];
          const isDemoMerchant = merchant.id.startsWith('demo-showroom-');
          const zoneLabel = zoneLabels[merchant.merchantZone || ''] || localizeCopy('品牌生产商', 'Partner showroom');
          const zoneDescription = zoneDescriptions[merchant.merchantZone || ''] || localizeCopy('面向专业零售商的精选商品与现货服务。', 'Collezioni selezionate per rivenditori professionali.');
          const merchantCountry = getCountryLabel(merchant);
          const merchantIndustry = merchant.specialtyCategory || merchantSpecialties[0] || zoneLabel;

          return (
            <div 
              key={merchant.id}
              className="group flex flex-col justify-between overflow-hidden border border-neutral-200/80 bg-white transition-all hover:-translate-y-0.5 hover:border-neutral-950"
            >
              <div>
                {/* Banner & Logo Cover */}
                <div className="relative h-40 overflow-hidden bg-neutral-900 sm:h-48">
                  <img 
                    src={merchantMediaUrl(merchant.banner, DEFAULT_MERCHANT_BANNER)}
                    alt={merchantName} 
                    className="h-full w-full object-cover opacity-75 transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = DEFAULT_MERCHANT_BANNER;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  
                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-[#14edfc] text-black font-black text-[8px]">
                      {zoneLabel}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white text-black font-bold text-[8px] flex items-center gap-1 shadow-xs">
                      <BadgeCheck className="w-2.5 h-2.5 text-black" />
                      {isDemoMerchant
                        ? (localizeCopy('演示商家', 'Demo showroom'))
                        : (localizeCopy('认证源头工坊', 'Atelier Certificato'))}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-black/80 text-white text-[8px] backdrop-blur-xs">
                      {merchantCountry} · {merchantCity}
                    </span>
                  </div>

                  {/* Logo anchored at bottom left */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white bg-white shadow-lg">
                      <img 
                        src={merchantMediaUrl(merchant.logo, DEFAULT_MERCHANT_LOGO)}
                        alt={merchantName} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = DEFAULT_MERCHANT_LOGO;
                        }}
                      />
                    </div>
                    <div className="text-white">
                      <h2 className="text-xs font-bold font-serif tracking-tight drop-shadow-sm">
                        {merchantName}
                      </h2>
                      <p className="text-[8px] text-neutral-300">
                        {merchant.showroomArea} · {merchant.showroomAddress}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Details & Two-Tier Product Counters */}
                <div className="space-y-2 p-3">
                  <div>
                    <div className="flex items-start gap-2 border-b border-neutral-200 pb-2 text-[10px] text-neutral-600">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500" />
                      <span className="leading-4">{merchantCountry} · {merchantCity}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                        {localizeCopy('行业 / 主营', 'Settore / specialità')}
                      </span>
                      <span className="text-[9px] font-semibold text-neutral-500">{zoneLabel}</span>
                    </div>
                    <h3 className="mt-1 text-sm font-serif font-bold tracking-tight text-neutral-950">
                      {merchantIndustry}
                    </h3>
                    <p className="mt-1 text-[10px] font-medium leading-relaxed text-neutral-600">
                      {localizeCopy('主营品类：', 'Specialità: ')}{merchantSpecialties.length > 0 ? merchantSpecialties.join(' · ') : merchantIndustry}
                    </p>
                    <p className="mt-1 text-[9px] leading-4 text-neutral-600 line-clamp-2">
                      {zoneDescription} {merchantTagline || merchant.description}
                    </p>
                    {merchantSpecialties.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {merchantSpecialties.map(specialty => (
                          <span key={specialty} className="rounded-full border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[8px] font-medium text-neutral-600">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1.5 px-3 pb-3">
                <button
                  type="button"
                  id={`btn-enter-store-${merchant.id}`}
                  onClick={() => handleEnterMerchantStore(merchant.id)}
                  className="flex-1 py-2 px-2 bg-black hover:bg-neutral-800 text-white text-[9px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>{localizeCopy('进入店铺', 'Enter showroom')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {!hasAccess && vaultStatus !== 'pending' && (
                  <button
                    type="button"
                    id={`btn-quick-vault-${merchant.id}`}
                    onClick={(e) => handleOpenRequestModal(merchant, e)}
                    className="py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title={localizeCopy('向生产商申请最新爆款', 'Richiedi accesso ai modelli riservati')}
                  >
                    <Lock className="w-3.5 h-3.5 text-black" />
                    <span className="hidden sm:inline">{localizeCopy('申请看爆款', 'Richiedi Accesso')}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
        )}
      </div>

      {/* QUICK REQUEST MODAL */}
      {requestModalMerchant && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-neutral-200 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-serif text-neutral-900">
                    {localizeCopy("向【{{RUDA_ARG_0}}】申请看货权限", "Richiesta di autorizzazione per {{RUDA_ARG_0}}", [String(requestModalMerchant.name)])}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {localizeCopy('解锁生产商独家保密首发爆款，保护原创设计', 'Accesso ai modelli protetti e listini riservati per rivenditori accreditati')}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setRequestModalMerchant(null)}
                className="text-neutral-400 hover:text-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-1">
                <span className="text-neutral-500">{localizeCopy('申请买家企业:', 'Boutique / Azienda Richiedente:')}</span>
                <p className="font-bold text-neutral-900">
                  {currentCustomer?.companyName || localizeCopy('已验证零售商账户，提交后由生产商审核资质', 'Boutique registrata; il produttore verificherà la richiesta')}
                </p>
                <p className="text-neutral-500 text-[11px]">
                  {localizeCopy(
                    '联系人：{{RUDA_ARG_0}} | 税号：{{RUDA_ARG_1}}',
                    'Referente: {{RUDA_ARG_0}} | P.IVA: {{RUDA_ARG_1}}',
                    [String(currentCustomer?.contactPerson || '—'), String(currentCustomer?.vatNumber || '—')]
                  )}
                </p>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-neutral-700">
                  {localizeCopy('看货留言与意向订单规模:', 'Presentazione attività e volumi stimati:')}
                </label>
                <textarea
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  rows={3}
                  className="w-full border border-neutral-300 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder={localizeCopy('说明您的门店定位、主营风格及预计采购数量...', 'Descrivi brevemente i tuoi punti vendita e i marchi trattati...')}
                />
              </div>

              <div className="p-3 rounded-xl bg-neutral-100 text-neutral-800 text-[11px] leading-relaxed border border-neutral-300">
                <strong>{localizeCopy('专属商品安全须知：', 'Informativa riservatezza campionario: ')}</strong>
                {localizeCopy('生产商审核通过后，所有高清图片将打入零售商专属数字签名水印。平台通过严格准入与访问日志保护欧洲批发原创款式生态。', 'I modelli visualizzati sono protetti da marcatura digitale anticopia e vincolati all\'accordo commerciale tra le parti.')}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRequestModalMerchant(null)}
                  className="flex-1 py-2 px-3 border border-neutral-300 rounded-xl text-neutral-700 font-semibold hover:bg-neutral-100 cursor-pointer"
                >
                  {localizeCopy('取消', 'Annulla')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 bg-black text-white rounded-xl font-bold hover:bg-neutral-800 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{localizeCopy('提交生产商审核', 'Invia Richiesta')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
