import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronRight, 
  Layers, 
  X,
  Building2,
  Store,
  Lock,
  Eye,
  ShoppingBag,
  MapPin,
  Star,
  Tag
} from 'lucide-react';
import { useB2B } from '../../context/B2BContext';
import { Product } from '../../types/b2b';
import { getLocalizedMerchantName, getLocalizedMerchantTagline, getLocalizedProductName } from '../../i18n/translations';
import { ProductImage } from '../common/ProductImage';

export const CatalogView: React.FC = () => {
  const { 
    products, 
    merchants,
    catalogSearchQuery, 
    setCatalogSearchQuery,
    quickNavigateToProduct,
    calculateCustomerPrice,
    setCurrentView,
    quickSearchStyle,
    addToCart,
    addNotification,
    setSelectedMerchantId,
    lang, localizeCopy
  } = useB2B();

  const isIt = lang === 'it';

  // The catalog route is the single cross-merchant clearance showroom.
  const [activeCatalogMode, setActiveCatalogMode] = useState<'marketplace' | 'suppliers'>('marketplace');

  // Filters
  const [selectedSaleCategory, setSelectedSaleCategory] = useState<string>('all');
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedPrivacyFilter, setSelectedPrivacyFilter] = useState<'all' | 'public_only' | 'private_only'>('all');
  const [sortBy, setSortBy] = useState<'new' | 'hot' | 'price_asc' | 'price_desc'>('hot');

  // Quick Pack Sizing Modal
  const [packSizingProduct, setPackSizingProduct] = useState<Product | null>(null);
  const [packRatio, setPackRatio] = useState<string>('1:2:2:1');
  const [packQuantity, setPackQuantity] = useState<number>(1);

  const saleProducts = useMemo(() => (products || []).filter(product =>
    product.merchantId &&
    product.status === 'clearance' &&
    product.lifecycleStatus !== 'archived' &&
    product.lifecycleStatus !== 'draft' &&
    product.lifecycleStatus !== 'pending_review' &&
    product.lifecycleStatus !== 'rejected' &&
    product.visibility !== 'private' &&
    !product.isExclusiveProtected
  ), [products]);

  const saleCategories = useMemo(() => [...new Set(saleProducts.map(product => product.category).filter(Boolean))], [saleProducts]);

  // Filtered & Sorted clearance products
  const filteredProducts = useMemo(() => {
    return saleProducts.filter(p => {
      if (selectedSaleCategory !== 'all' && p.category !== selectedSaleCategory) return false;
      if (catalogSearchQuery.trim()) {
        const query = catalogSearchQuery.toLowerCase().trim();
        const matchesStyle = p.styleNo.toLowerCase().includes(query);
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesBrand = p.brand.toLowerCase().includes(query);
        const matchesSub = p.subCategory.toLowerCase().includes(query);
        const matchesSku = p.skus.some(s => s.sku.toLowerCase().includes(query) || s.color.toLowerCase().includes(query));
        if (!matchesStyle && !matchesName && !matchesBrand && !matchesSub && !matchesSku) {
          return false;
        }
      }
      if (selectedStockStatus !== 'all') {
        if (p.inventoryStatus !== selectedStockStatus) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'new') return Date.parse(b.updatedAt || b.createdAt || '') - Date.parse(a.updatedAt || a.createdAt || '');
      if (sortBy === 'hot') return Number(Boolean(b.featuredOnHome)) - Number(Boolean(a.featuredOnHome));
      if (sortBy === 'price_asc') return a.wholesalePrice - b.wholesalePrice;
      if (sortBy === 'price_desc') return b.wholesalePrice - a.wholesalePrice;
      return 0;
    });
  }, [
    saleProducts,
    selectedSaleCategory,
    catalogSearchQuery, 
    selectedStockStatus, 
    sortBy
  ]);

  // Handle Quick Pack Add
  const handleQuickPackAdd = (product: Product) => {
    if (product.id.startsWith('demo-showroom-product-')) {
      addNotification('warning', localizeCopy('演示商品不可采购', 'Articolo demo non acquistabile'), localizeCopy('此商品仅用于页面展示，没有真实库存或可用报价。', 'Articolo solo dimostrativo, senza disponibilità reale.'));
      return;
    }
    if (product.visibility === 'private' || product.isExclusiveProtected) {
      addNotification(
        'warning',
        localizeCopy('该商品需要生产商授权', 'Accesso riservato'),
        localizeCopy('请先完成企业实名注册，再向生产商申请看货权限。', 'Registrati con i dati aziendali per richiedere l’accesso.')
      );
      quickNavigateToProduct(product.id);
      return;
    }
    const skus = product.skus.slice(0, 4);
    if (skus.length === 0) return;

    const ratioWeights = [1, 2, 2, 1];
    let totalItemsAdded = 0;

    skus.forEach((sku, idx) => {
      const weight = ratioWeights[idx] || 1;
      const qty = weight * packQuantity;
      addToCart({
        productId: product.id,
        styleNo: product.styleNo,
        productName: getLocalizedProductName(product, lang),
        image: product.images[0],
        sku: sku.sku,
        color: sku.color,
        size: sku.size,
        quantity: qty,
        unitPrice: calculateCustomerPrice(product.wholesalePrice),
        packSize: product.packSize || 6
      });
      totalItemsAdded += qty;
    });

    addNotification(
      'success', 
      localizeCopy('智能配码加购成功', 'Aggiunto al carrello'),
      isIt 
        ? `${product.styleNo} (${totalItemsAdded} pz) aggiunto in rapporto ${packRatio}.`
        : `已按 ${packRatio} 智能配码将 ${product.styleNo} (${totalItemsAdded}件) 加入采购车`
    );
    setPackSizingProduct(null);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
      <section
        aria-label={localizeCopy('RUDA 特价市场', 'RUDA showroom saldi')}
        className="relative left-1/2 -mt-6 flex h-[calc(100svh-150px)] min-h-[440px] w-screen -translate-x-1/2 items-end overflow-hidden bg-neutral-950 sm:-mt-9 sm:h-[calc(100svh-176px)] sm:min-h-[520px]"
      >
        <video
          src="/videos/ruda-sale.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={localizeCopy('RUDA 特价商品视频', 'Video RUDA Sale')}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/20" />
        <div className="relative z-10 w-full px-6 pb-10 text-white sm:px-10 sm:pb-12 lg:px-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/75 sm:text-xs">
            RUDA / SALE
          </p>
          <h1 className="mt-2 font-serif text-3xl font-medium leading-none tracking-tight sm:text-5xl lg:text-6xl">
            {localizeCopy('RUDA 特价', 'Occasioni RUDA')}
          </h1>
        </div>
      </section>

      <header className="flex justify-end border-b border-neutral-200 pb-4 pt-1">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={catalogSearchQuery}
            onChange={event => setCatalogSearchQuery(event.target.value)}
            placeholder={localizeCopy('搜索折扣商品', 'Cerca prodotti in promozione')}
            className="w-full rounded-full border border-neutral-200 bg-white py-2.5 pl-10 pr-9 text-xs transition-colors focus:border-neutral-500 focus:outline-none"
          />
          {catalogSearchQuery && (
            <button type="button" aria-label={localizeCopy('清除搜索', 'Cancella ricerca')} onClick={() => setCatalogSearchQuery('')} className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-950">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Legacy supplier mode is retained below but cannot be selected from the clearance showroom. */}
      {activeCatalogMode === 'suppliers' && (
        <div className="space-y-6">
          <div className="bg-neutral-900 text-white rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-white/20 text-white rounded">
                  <Store className="w-4 h-4" />
                </span>
                <h2 className="text-base sm:text-lg font-bold">
                  {localizeCopy('长期合作直供工坊与品牌商户', 'Fornitori Diretti & Maestranze B2B')}
                </h2>
              </div>
              <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
                {localizeCopy('浏览认证商家与批发系列。', 'Fornitori e collezioni B2B.')}
              </p>
            </div>
            <div className="text-xs bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 text-neutral-200">
              {localizeCopy('数字版权防抄板水印保护已启用', 'Protezione Proprietà Intellettuale Attiva')}
            </div>
          </div>

          {/* Supplier Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {merchants.map((merchant) => {
              const merchantProds = products.filter(p => p.merchantId === merchant.id);
              const publicProds = merchantProds.filter(p => p.visibility !== 'private' && !p.isExclusiveProtected);
              const privateProds = merchantProds.filter(p => p.visibility === 'private' || p.isExclusiveProtected);

              const merchantName = getLocalizedMerchantName(merchant, lang);
              const merchantTagline = getLocalizedMerchantTagline(merchant, lang);
              const merchantCity = isIt ? merchant.city.replace(/[\u4e00-\u9fa5]/g, '').trim() : merchant.city;
              const merchantCountry = localizeCopy('意大利', 'Italia');

              return (
                <div 
                  key={merchant.id}
                  className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs hover:border-neutral-400 transition-all flex flex-col justify-between"
                >
                  {/* Supplier Header Banner */}
                  <div className="relative h-28 bg-neutral-100">
                    <img 
                      src={merchant.banner} 
                      alt={merchantName} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-3.5">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={merchant.logo} 
                          alt={merchantName} 
                          className="w-10 h-10 rounded-lg object-cover border-2 border-white bg-white shrink-0"
                        />
                        <div className="text-white">
                          <h3 className="font-bold text-sm tracking-wide leading-tight">{merchantName}</h3>
                          <div className="flex items-center gap-1.5 text-[11px] text-neutral-300">
                            <MapPin className="w-3 h-3 text-neutral-400" />
                            <span>{merchantCity}, {merchantCountry}</span>
                            <span className="text-amber-400 flex items-center gap-0.5 ml-1">
                              <Star className="w-3 h-3 fill-amber-400" />
                              {merchant.rating}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Supplier 3-Channel Navigation Hierarchy */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="text-xs text-neutral-500 line-clamp-2">
                      {merchantTagline}
                    </div>

                    {/* 3 Blocks: 店铺 / 展厅 / Private Collection */}
                    <div className="space-y-2 pt-2 border-t border-neutral-100 text-xs">
                      {/* 1. 店铺 (Store) */}
                      <button
                        type="button"
                        onClick={() => {
                          quickSearchStyle(merchant.name);
                          setActiveCatalogMode('marketplace');
                        }}
                        className="w-full p-2.5 bg-neutral-50 hover:bg-neutral-100 rounded-xl flex items-center justify-between border border-neutral-200 transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-neutral-600" />
                          <div>
                            <div className="font-bold text-neutral-900">{localizeCopy('公开在售现货', 'Campionario Aperto')}</div>
                            <div className="text-[11px] text-neutral-400">
                              {localizeCopy("公开在售款 ({{RUDA_ARG_0}} 款)", "{{RUDA_ARG_0}} capi disponibili", [String(publicProds.length)])}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] text-neutral-700 font-semibold flex items-center">
                          {localizeCopy('浏览货源', 'Visualizza')} <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>

                      {/* 2. 展厅 (Showroom) */}
                      <button
                        type="button"
                        onClick={() => setCurrentView('showrooms')}
                        className="w-full p-2.5 bg-neutral-50 hover:bg-neutral-100 rounded-xl flex items-center justify-between border border-neutral-200 transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-neutral-600" />
                          <div>
                            <div className="font-bold text-neutral-900">{localizeCopy('线下实体展厅', 'Showroom Ufficiale')}</div>
                            <div className="text-[11px] text-neutral-400">
                              {localizeCopy('现场提货与实体看样', 'Visite e campionatura dal vivo')}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] text-neutral-700 font-semibold flex items-center">
                          {localizeCopy('预约到店', 'Prenota')} <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>

                      {/* 3. Private Collection */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPrivacyFilter('private_only');
                          setSelectedBrand(merchant.name);
                          setActiveCatalogMode('marketplace');
                        }}
                        className="w-full p-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl flex items-center justify-between transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-amber-300" />
                          <div>
                            <div className="font-bold text-white flex items-center gap-1">
                              <span>{localizeCopy('授权专属系列', 'Collezione Riservata')}</span>
                              <span className="px-1.5 py-0.2 bg-white text-neutral-950 text-[9px] font-bold rounded">
                                {localizeCopy('专属', 'B2B')}
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-400">
                              {localizeCopy("授权买家专属新款 ({{RUDA_ARG_0}} 款)", "{{RUDA_ARG_0}} capi per rivenditori accreditati", [String(privateProds.length)])}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] text-white font-semibold flex items-center">
                          {localizeCopy('进入专区', 'Accedi')} <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. MARKETPLACE MODE */}
      {activeCatalogMode === 'marketplace' && (
        <div className="space-y-5">
          <div className="sticky top-[104px] z-30 -mx-4 border-b border-neutral-300 bg-white/95 px-4 pt-2 backdrop-blur-md sm:top-[160px] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex gap-6 overflow-x-auto text-sm">
              {['all', ...saleCategories].map(category => {
                const categoryLabels: Record<string, string> = isIt
                  ? { all: 'Tutte le categorie', women: 'Donna', men: 'Uomo', bags: 'Borse', shoes: 'Scarpe' }
                  : { all: '全部分类', women: '女装', men: '男装', bags: '箱包', shoes: '鞋履' };
                const selected = selectedSaleCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setSelectedSaleCategory(category);
                    }}
                    className={`shrink-0 border-b-2 pb-2.5 font-semibold transition-colors ${selected ? 'border-neutral-950 text-neutral-950' : 'border-transparent text-neutral-500 hover:text-neutral-900'}`}
                  >
                    {categoryLabels[category] || category}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 border-b border-neutral-300 pb-4 pt-1 text-xs">
              <div className="flex items-center gap-2">
                <select
                  value={selectedStockStatus}
                  onChange={event => setSelectedStockStatus(event.target.value)}
                  aria-label={localizeCopy('库存筛选', 'Stato disponibilità')}
                  className="rounded-full border border-neutral-300 bg-white px-3 py-2 text-[11px]"
                >
                  <option value="all">{localizeCopy('全部库存状态', 'Tutta la disponibilità')}</option>
                  <option value="in_stock">{localizeCopy('有现货', 'Disponibile')}</option>
                  <option value="low_stock">{localizeCopy('库存紧张', 'Scorte limitate')}</option>
                  <option value="pre_order">{localizeCopy('可预订', 'Preordine')}</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  aria-label={localizeCopy('商品排序', 'Ordina articoli')}
                  className="rounded-full border border-neutral-300 bg-white px-3 py-2 text-[11px]"
                >
                  <option value="hot">{localizeCopy('精选优先', 'In evidenza')}</option>
                  <option value="new">{localizeCopy('最新上架', 'Più recenti')}</option>
                  <option value="price_asc">{localizeCopy('价格由低到高', 'Prezzo crescente')}</option>
                  <option value="price_desc">{localizeCopy('价格由高到低', 'Prezzo decrescente')}</option>
                </select>
              </div>
          </div>

          {/* Product Cards Grid */}
          {filteredProducts.length === 0 ? (
            <div className="border-y border-neutral-200 py-16 text-center">
              <p className="font-serif text-2xl text-neutral-900">{localizeCopy('暂无折扣商品', 'Nessun articolo in promozione')}</p>
              <p className="mt-2 text-xs text-neutral-500">{localizeCopy('商家将商品分类为“商品折扣”后，会自动展示在这里。', 'I nuovi articoli scontati appariranno qui.')}</p>
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-4">
            {filteredProducts.map((prod) => {
              const customerPrice = calculateCustomerPrice(prod.wholesalePrice);
              const localizedName = getLocalizedProductName(prod, lang);
              const isDemoProduct = prod.id.startsWith('demo-showroom-product-');
              const sourceMerchant = merchants.find(merchant => merchant.id === prod.merchantId);
              const sourceMerchantName = sourceMerchant
                ? getLocalizedMerchantName(sourceMerchant, lang)
                : prod.merchantName || prod.brand || localizeCopy('RUDA 入驻商家', 'Partner RUDA');
              const stockTotal = prod.skus.reduce((sum, sku) => sum + sku.stockCentral, 0);
              const savingPercent = prod.rrpPrice > 0 ? Math.max(0, Math.round(((prod.rrpPrice - customerPrice) / prod.rrpPrice) * 100)) : 0;

              return (
                <div
                  key={prod.id}
                  className="group flex min-w-0 flex-col"
                >
                  {/* Image & Badges */}
                  <div 
                    onClick={() => quickNavigateToProduct(prod.id)}
                    className="relative aspect-[3/4] overflow-hidden bg-neutral-100 cursor-pointer"
                  >
                    <ProductImage
                      src={prod.images[0]}
                      alt={localizedName}
                      contain
                      className="h-full w-full"
                      imageClassName="group-hover:scale-105 transition-transform duration-700"
                    />

                    {/* Top badging */}
                    <div className="absolute left-2 top-2">
                      <span className="inline-flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
                        <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-white">
                          <Tag className="h-2.5 w-2.5 text-black" />
                        </span>
                        {localizeCopy('折扣', 'Promo')}
                      </span>
                    </div>

                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono font-bold rounded">
                      {prod.styleNo}
                    </div>
                  </div>

                  {/* Body & Actions */}
                  <div className="flex flex-1 flex-col justify-between gap-2 pt-3">
                    <div>
                      <div className="mb-2 border-b border-neutral-200 pb-2">
                        {sourceMerchant ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMerchantId(sourceMerchant.id);
                              setCurrentView('merchant_store');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="inline-flex max-w-full items-center gap-1.5 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-700 transition-colors hover:text-neutral-950 hover:underline"
                            aria-label={localizeCopy("进入商家店铺：{{RUDA_ARG_0}}", "Apri lo showroom {{RUDA_ARG_0}}", [String(sourceMerchantName)])}
                          >
                            <Store className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{sourceMerchantName}</span>
                            <ChevronRight className="h-3 w-3 shrink-0" />
                          </button>
                        ) : (
                          <div className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-700">
                            <Store className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />
                            {sourceMerchantName}
                          </div>
                        )}
                      </div>
                      <h3 
                        onClick={() => quickNavigateToProduct(prod.id)}
                        className="mt-1 line-clamp-2 min-h-9 cursor-pointer font-serif text-sm font-medium leading-5 text-neutral-950 hover:underline sm:text-base"
                        title={localizedName}
                      >
                        {localizedName}
                      </h3>

                      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="font-serif text-lg font-semibold text-neutral-950">
                          €{customerPrice.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-neutral-500 line-through">
                          RRP €{prod.rrpPrice}
                        </span>
                        {savingPercent > 0 && <span className="text-[10px] font-semibold text-rose-700">{localizeCopy("低于 RRP {{RUDA_ARG_0}}%", "{{RUDA_ARG_0}}% sotto RRP", [String(savingPercent)])}</span>}
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-neutral-500">
                        <span>{localizeCopy("{{RUDA_ARG_0}} 件/包", "{{RUDA_ARG_0}} pz/pacco", [String(prod.packSize)])}</span>
                        <span>{localizeCopy("起订: {{RUDA_ARG_0}}件", "Min. {{RUDA_ARG_0}} pz", [String(prod.moq)])}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2 text-[10px]">
                        <span className={stockTotal > 0 ? 'text-neutral-600' : 'text-amber-700'}>
                          {isDemoProduct
                            ? (localizeCopy('演示商品 · 不可订购', 'Demo · non in vendita'))
                            : stockTotal > 0
                              ? (localizeCopy("现货 {{RUDA_ARG_0}} 件", "{{RUDA_ARG_0}} disponibili", [String(stockTotal)]))
                              : (localizeCopy('可预订', 'Su ordinazione'))}
                        </span>
                        <span className="font-semibold text-neutral-700">
                          {isDemoProduct
                            ? (localizeCopy('仅供页面预览', 'Solo anteprima'))
                            : (localizeCopy('商家折扣款', 'Da più brand'))}
                        </span>
                      </div>
                    </div>

                    {/* 2 Bottom Buttons: View Detail & Pack Sizing */}
                    <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-neutral-100">
                      <button
                        type="button"
                        onClick={() => quickNavigateToProduct(prod.id)}
                        className="py-2 text-[10px] font-semibold text-neutral-700 transition-colors hover:text-neutral-950"
                      >
                        {localizeCopy('详情', 'Dettagli')}
                      </button>

                      <button
                        type="button"
                        onClick={() => setPackSizingProduct(prod)}
                        disabled={isDemoProduct}
                        className="flex items-center justify-center gap-1 bg-neutral-950 px-2 py-2 text-[10px] font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                      >
                        <Layers className="w-3 h-3" />
                        <span>{isDemoProduct ? (localizeCopy('演示款', 'Demo')) : (localizeCopy('智能配码', 'A Pacchi'))}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* 4. Pack Sizing Modal */}
      {packSizingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-black text-white rounded-lg">
                  <Layers className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-neutral-900 text-sm sm:text-base">
                  {localizeCopy('智能整包配码下单', 'Ordine Rapido a Pacchi')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPackSizingProduct(null)}
                className="p-1 text-neutral-400 hover:text-black rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <img
                src={packSizingProduct.images[0]}
                alt={packSizingProduct.name}
                className="w-16 h-20 object-cover rounded-lg border border-neutral-200"
              />
              <div className="space-y-1 text-xs">
                <span className="font-mono font-bold text-neutral-900">{packSizingProduct.styleNo}</span>
                <h4 className="font-medium text-neutral-700 line-clamp-1">
                  {getLocalizedProductName(packSizingProduct, lang)}
                </h4>
                <div className="text-black font-serif font-bold text-sm">
                  €{calculateCustomerPrice(packSizingProduct.wholesalePrice).toFixed(2)} {localizeCopy('/ 件', '/ capo')}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-neutral-800 block">
                {localizeCopy('标准配码比例 (S : M : L : XL):', 'Rapporto taglie (S : M : L : XL):')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['1:2:2:1', '1:1:1:1', '2:2:1:1'].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setPackRatio(ratio)}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                      packRatio === ratio
                        ? 'bg-black text-white border-black'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-neutral-400">
                {localizeCopy('1:2:2:1 为欧洲精品女装畅销黄金尺码配比 (每包共 6 件)', 'Rapporto ottimale per la distribuzione retail europea (6 capi/pacco)')}
              </p>
            </div>

            {/* Pack quantity */}
            <div className="flex items-center justify-between bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-xs">
              <span className="font-bold text-neutral-800">
                {localizeCopy('订购包数:', 'Numero pacchi:')}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPackQuantity(Math.max(1, packQuantity - 1))}
                  className="w-7 h-7 rounded-lg bg-white border border-neutral-300 font-bold text-neutral-700 flex items-center justify-center hover:bg-neutral-100 cursor-pointer"
                >
                  -
                </button>
                <span className="font-mono font-bold text-sm">
                  {localizeCopy("{{RUDA_ARG_0}} 包 ({{RUDA_ARG_1}} 件)", "{{RUDA_ARG_0}} pacchi ({{RUDA_ARG_1}} capi)", [String(packQuantity), String(packQuantity * 6)])}
                </span>
                <button
                  type="button"
                  onClick={() => setPackQuantity(packQuantity + 1)}
                  className="w-7 h-7 rounded-lg bg-white border border-neutral-300 font-bold text-neutral-700 flex items-center justify-center hover:bg-neutral-100 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
              <div className="text-right">
                <span className="text-[11px] text-neutral-400 block">
                  {localizeCopy("预计总额 ({{RUDA_ARG_0}} 件)", "Totale ({{RUDA_ARG_0}} capi)", [String(packQuantity * 6)])}
                </span>
                <span className="font-serif font-black text-base text-black">
                  €{(calculateCustomerPrice(packSizingProduct.wholesalePrice) * packQuantity * 6).toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleQuickPackAdd(packSizingProduct)}
                className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{localizeCopy('加入采购清单', 'Aggiungi all\'Ordine')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
