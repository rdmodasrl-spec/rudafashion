import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Building2, 
  ShieldCheck, 
  Package, 
  Sparkles, 
  Layers, 
  Info,
  Plus,
  Minus,
  Lock,
  Clock,
  Store,
  CheckCircle2,
  FileSpreadsheet,
  Truck,
  CalendarDays,
  BadgeCheck
} from 'lucide-react';
import { useB2B } from '../../context/B2BContext';
import { SKUItem } from '../../types/b2b';
import { getLocalizedProductName, getLocalizedColor } from '../../i18n/translations';
import { ShareButton } from '../common/ShareButton';
import { ProductImage } from '../common/ProductImage';
import { getProductPath } from '../../utils/share';

export const ProductDetailView: React.FC = () => {
  const { 
    selectedProductId, 
    getProductById, 
    setCurrentView, 
    calculateCustomerPrice,
    addMultipleToCart,
    isRegisteredWholesale,
    currentCustomer,
    hasVaultAccess,
    getVaultStatus,
    requestVaultAccess,
    addNotification,
    setSelectedMerchantId,
    setShowBuyerRegister,
    lang,
    t, localizeCopy
  } = useB2B();

  const isIt = lang === 'it';
  const product = selectedProductId ? getProductById(selectedProductId) : null;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestNote, setRequestNote] = useState(
    localizeCopy('申请查看该商户首发新款大货报价与下达试单', 'Richiesta di consultazione campionario e preventivo lotti')
  );

  // Matrix quantities state: map sku string to ordered quantity
  const [matrixQuantities, setMatrixQuantities] = useState<Record<string, number>>({});

  // If product is not found, fallback to catalog
  if (!product) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-neutral-800">
          {localizeCopy('未找到对应商品', 'Articolo non trovato')}
        </h2>
        <button
          type="button"
          onClick={() => setCurrentView('catalog')}
          className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
        >
          {localizeCopy('返回采购大厅', 'Torna al Catalogo')}
        </button>
      </div>
    );
  }

  // Vault access check: if product is exclusive protected, merchant must have approved customer
  const isRestrictedProduct = product.visibility === 'private' || product.isExclusiveProtected;
  const isDemoProduct = product.id.startsWith('demo-showroom-product-');
  const isLocked = Boolean(isRestrictedProduct && !hasVaultAccess(product.merchantId));
  const vaultStatus = getVaultStatus(product.merchantId);

  // Calculate pricing & margins
  const wholesalePrice = calculateCustomerPrice(product.wholesalePrice);
  const retailPrice = product.rrpPrice;
  const markupPercent = Math.round(((retailPrice - wholesalePrice) / retailPrice) * 100);

  // Single-warehouse inventory
  const centralStockTotal = product.skus.reduce((sum, s) => sum + s.stockCentral, 0);
  const totalStock = centralStockTotal;

  // Matrix manipulation helpers
  const handleQuantityChange = (skuCode: string, qty: number) => {
    const skuItem = product.skus.find(s => s.sku === skuCode);
    const maxStock = skuItem?.stockCentral ?? 0;
    setMatrixQuantities(prev => {
      const nextVal = Math.min(maxStock, Math.max(0, qty));
      if (nextVal === 0) {
        const { [skuCode]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [skuCode]: nextVal };
    });
  };

  const handleQuickFillMoq = () => {
    const defaultSku = product.skus[0];
    if (defaultSku) {
      handleQuantityChange(defaultSku.sku, product.moq);
    }
  };

  const handleQuickClearAll = () => {
    setMatrixQuantities({});
  };

  const totalSelectedQty = (Object.values(matrixQuantities) as number[]).reduce((a, b) => a + b, 0);
  const totalSelectedAmount: number = totalSelectedQty * wholesalePrice;

  const handleBatchAddToCart = () => {
    if (totalSelectedQty === 0) return;

    const itemsToAdd = Object.entries(matrixQuantities)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([skuCode, qty]) => {
        const skuItem = product.skus.find(s => s.sku === skuCode);
        return {
          productId: product.id,
          styleNo: product.styleNo,
          productName: getLocalizedProductName(product, lang),
          image: product.images[0],
          sku: skuCode,
          color: skuItem?.color || 'Standard',
          size: skuItem?.size || 'OneSize',
          quantity: Number(qty),
          unitPrice: wholesalePrice,
          packSize: product.packSize || 6
        };
      });

    addMultipleToCart(itemsToAdd);
    setMatrixQuantities({});
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestVaultAccess(product.merchantId, requestNote);
    setShowRequestModal(false);
  };

  const handleRequestAccess = () => {
    if (!currentCustomer) {
      setShowRequestModal(false);
      setShowBuyerRegister(true);
      return;
    }
    if (currentCustomer.status !== 'approved') {
      addNotification(
        'warning',
        localizeCopy('需要完成企业认证', 'Verifica aziendale necessaria'),
        localizeCopy('注册后可正常浏览公开内容，企业认证通过后才可查看私密或锁定货品。', 'Puoi navigare i contenuti pubblici; le collezioni private sono disponibili dopo l’approvazione.')
      );
      return;
    }
    setShowRequestModal(true);
  };

  const localizedProductName = getLocalizedProductName(product, lang);
  const localizedCategory = isIt
    ? (product.category === 'women' ? 'Donna' : 'Uomo')
    : (product.category === 'women' ? '女装' : '男装');
  const productMedia = product.media?.length
    ? product.media
    : product.images.map((url, index) => ({ id: `legacy-${index}`, type: 'image' as const, url }));
  const sharePath = `${window.location.origin}${getProductPath(product.id)}`;

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 ${!isLocked ? 'pb-28' : ''}`}>
      {/* 1. Breadcrumbs and Return Button */}
      <div className="flex items-center justify-between text-xs text-neutral-500 border-b border-neutral-200 pb-3">
        <button
          type="button"
          onClick={() => setCurrentView('catalog')}
          className="flex items-center gap-1.5 text-neutral-800 hover:text-black font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{localizeCopy('返回采购选款大厅', 'Torna al Catalogo Capi')}</span>
        </button>

        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span>{localizedCategory}</span>
          <span>/</span>
          <span>{product.brand}</span>
          <span>/</span>
          <span className="text-black font-bold">{product.styleNo}</span>
        </div>
        <ShareButton
          title={`${localizedProductName} · RUDA Fashion B2B`}
          text={`查看 ${localizedProductName}（款号 ${product.styleNo}）`}
          path={sharePath}
          source={`product-${product.id}`}
        />
      </div>

      {/* 2. Top Grid: Gallery (5 cols) & Product Summary (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image Gallery */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative aspect-3/4 rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 shadow-sm">
            {productMedia[activeImageIndex]?.type === 'video' ? (
              <video src={productMedia[activeImageIndex].url} controls className="h-full w-full object-contain" />
            ) : (
              <ProductImage
                src={productMedia[activeImageIndex]?.url || product.images[0]}
                alt={localizedProductName}
                priority
                contain
                className="h-full w-full"
                imageClassName={`transition-none ${isLocked ? 'filter blur-sm brightness-90' : ''}`}
              />
            )}

            {/* Private Collection Protection Overlay if locked */}
            {isLocked && (
              <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white space-y-2 select-none">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-sm">
                  {localizeCopy('授权专属商品', 'Collezione Riservata')}
                </span>
                <span className="text-[11px] text-neutral-300 max-w-xs">
                  {localizeCopy("需向【{{RUDA_ARG_0}}】申请专属看货权限方可查看高清细节与大货起订配比。", "Per visionare i dettagli e ordinare questo capo è richiesta l'autorizzazione diretta di {{RUDA_ARG_0}}.", [String(product.merchantName)])}
                </span>
                <button
                  type="button"
                  onClick={handleRequestAccess}
                  className="mt-2 px-3 py-1.5 bg-white text-black font-bold text-xs rounded-lg hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  {vaultStatus === 'pending' 
                    ? (localizeCopy('审核中 · 查看进度', 'Richiesta in elaborazione'))
                    : (localizeCopy('申请专属商品权限', 'Richiedi Accesso al Campionario'))}
                </button>
              </div>
            )}

            <div className="absolute top-3 left-3 bg-neutral-900/90 text-white text-[10px] font-mono px-2 py-1 rounded font-semibold">
              {localizeCopy('意大利原产', 'Made in Italy')}
            </div>

            {isRestrictedProduct && !isLocked && (
              <div className="absolute top-3 right-3 bg-black text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3 h-3 text-white" />
                <span>{localizeCopy('已获看货授权', 'Accesso Autorizzato')}</span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {productMedia.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {productMedia.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-16 h-20 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                    activeImageIndex === idx ? 'border-neutral-900 shadow-xs' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {item.type === 'video' ? <video src={item.url} className="h-full w-full object-cover" /> : <ProductImage src={item.url} alt={`${localizedProductName} ${idx + 1}`} contain className="h-full w-full" />}
                </button>
              ))}
            </div>
          )}

          {/* Authenticity guarantee box */}
          <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs space-y-1.5 text-neutral-600">
            <div className="flex items-center gap-1.5 font-bold text-neutral-900">
              <ShieldCheck className="w-4 h-4 text-black" />
              <span>
                {isDemoProduct
                  ? (localizeCopy('演示商品 · 不可采购', 'Articolo demo · non in vendita'))
                  : (localizeCopy('普拉托工坊直供保证 (Made in Italy)', 'Garanzia di Origine Artigianale'))}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-neutral-500">
              {isDemoProduct
                ? (localizeCopy('页面效果测试数据，商品与库存均为虚构信息，不能用于实际采购。', 'Scheda di prova con dati e disponibilità fittizi. Nessun ordine reale può essere effettuato.'))
                : localizeCopy('出厂配备意大利国家商会溯源码，支持欧盟反向增值税开票 (Reverse Charge 0% VAT)，支持大货现货直发全欧。', 'Capi prodotti con standard di conformità UE, predisposti per fatturazione elettronica intracomunitaria Reverse Charge.')}
            </p>
          </div>
        </div>

        {/* Right Column: Pricing, Inventory & Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header Title */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 bg-black text-white text-[10px] font-bold rounded uppercase tracking-wider">
                {product.season}
              </span>
              <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-[10px] font-semibold rounded">
                {product.subCategory}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-neutral-900 leading-snug">
              {localizedProductName}
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              {localizeCopy('款号:', 'Codice Articolo:')} <strong className="font-mono text-neutral-800">{product.styleNo}</strong> · {localizeCopy('工坊:', 'Atelier:')} {product.brand}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg border border-neutral-200 bg-white p-3">
                <span className="block text-[10px] uppercase tracking-wider text-neutral-500">{localizeCopy('可采购库存', 'Disponibilità')}</span>
                <strong className="mt-1 block text-lg font-black text-neutral-900">{totalStock}<span className="ml-1 text-xs font-normal text-neutral-500">{localizeCopy('件', 'pz')}</span></strong>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-3">
                <span className="block text-[10px] uppercase tracking-wider text-neutral-500">{localizeCopy('最低起订量', 'Ordine minimo')}</span>
                <strong className="mt-1 block text-lg font-black text-neutral-900">{product.moq}<span className="ml-1 text-xs font-normal text-neutral-500">{localizeCopy('件', 'pz')}</span></strong>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-3">
                <span className="block text-[10px] uppercase tracking-wider text-neutral-500">{localizeCopy('包装规格', 'Confezione')}</span>
                <strong className="mt-1 block text-lg font-black text-neutral-900">{product.packSize}<span className="ml-1 text-xs font-normal text-neutral-500">{localizeCopy('件/包', 'pz')}</span></strong>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-3">
                <span className="block text-[10px] uppercase tracking-wider text-neutral-500">{localizeCopy('预计发货', 'Pronta evasione')}</span>
                <strong className="mt-1 block text-sm font-black text-neutral-900">{localizeCopy('24–48 小时', '24–48h')}</strong>
              </div>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="bg-neutral-950 text-white border border-neutral-900 rounded-2xl p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-5 shadow-lg">
            <div className="sm:col-span-1">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-medium">
                {isRegisteredWholesale 
                  ? (localizeCopy('专属批发价', 'Prezzo B2B Riservato'))
                  : (localizeCopy('批发参考价', 'Prezzo Ingrosso'))}
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl sm:text-4xl font-black text-white font-serif">
                  €{wholesalePrice.toFixed(2)}
                </span>
                <span className="text-xs text-neutral-400 font-medium">{localizeCopy('/ 件', '/ capo')}</span>
              </div>
              {isRegisteredWholesale && currentCustomer?.tier !== 'tier_standard' && (
                <span className="inline-block mt-1 text-[10px] text-white bg-black px-1.5 py-0.5 rounded font-bold">
                  {currentCustomer?.tier === 'tier_major' 
                    ? (localizeCopy('大客户 82.5折', 'Sconto Grandi Volumi 17.5%'))
                    : (localizeCopy('VIP 9折', 'Sconto VIP 10%'))}
                </span>
              )}
            </div>

            <div className="border-t sm:border-t-0 sm:border-l border-neutral-800 sm:pl-5">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-medium">
                {localizeCopy('建议零售价 (RRP)', 'Prezzo Consigliato Retail')}
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold text-neutral-200 font-serif">
                  €{retailPrice.toFixed(2)}
                </span>
                <span className="text-xs text-neutral-500">{localizeCopy('/ 件', '/ capo')}</span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                {localizeCopy('零售毛利率预估:', 'Margine indicativo:')} <strong className="text-black font-bold">~{markupPercent}%</strong>
              </p>
            </div>

            <div className="border-t sm:border-t-0 sm:border-l border-neutral-800 sm:pl-5">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-medium">
                {localizeCopy('起订与包装', 'Lotto Minimo')}
              </span>
              <div className="mt-1 text-xs space-y-0.5">
                <p>{localizeCopy('最低起订:', 'Minimo d\'ordine:')} <strong className="text-white font-bold">{product.moq} {localizeCopy('件', 'pz')}</strong></p>
                <p>{localizeCopy('箱规:', 'Confezione:')} <strong className="text-white">{product.packSize} {localizeCopy('件/包', 'pz/pacco')}</strong></p>
                <p className="text-[10px] text-neutral-400">
                  {localizeCopy('支持各颜色与尺码任意混批', 'Mix taglie e colori consentito')}
                </p>
              </div>
            </div>
          </div>

          {/* Multi-Location Inventory */}
          <div className="border border-neutral-200 rounded-xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-black" />
                {localizeCopy('总仓实时现货', 'Disponibilità in Magazzino')}
              </h3>
              <span className="text-xs font-bold text-white bg-black px-2 py-0.5 rounded">
                {localizeCopy("全网现货: {{RUDA_ARG_0}} 件", "Totale: {{RUDA_ARG_0}} pz", [String(totalStock)])}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/60">
                <p className="text-neutral-500 text-[11px]">{localizeCopy('中央仓库 (Central)', 'Hub Centrale Prato')}</p>
                <p className="text-base font-bold text-neutral-900 mt-0.5">{centralStockTotal} <span className="text-xs font-normal text-neutral-500">{localizeCopy('件', 'pz')}</span></p>
                <span className="text-[10px] text-neutral-600">{localizeCopy('支持快递 48h 发货', 'Spedizione 24-48h')}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/60">
                <p className="text-neutral-500 text-[11px]">{localizeCopy('备货时效', 'Preparazione')}</p>
                <p className="text-base font-bold text-neutral-900 mt-0.5">24–48 <span className="text-xs font-normal text-neutral-500">{localizeCopy('小时', 'ore')}</span></p>
                <span className="text-[10px] text-neutral-600">{localizeCopy('确认订单后出库', 'Ordini confermati')}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/60">
                <p className="text-neutral-500 text-[11px]">{localizeCopy('配送范围', 'Copertura')}</p>
                <p className="text-base font-bold text-neutral-900 mt-0.5">{localizeCopy('全欧', 'UE')}</p>
                <span className="text-[10px] text-neutral-600">{localizeCopy('中央仓直发', 'Spedizione diretta')}</span>
              </div>
            </div>

            <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 pt-1">
              <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>
                {localizeCopy('平台统一总仓库存，线上订单、POS 和入库操作实时同步。', 'Giacenza unica del magazzino centrale, aggiornata in tempo reale.')}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
                  <Truck className="w-4 h-4 text-neutral-700" />
                  <span><strong className="text-neutral-900">{localizeCopy('全欧配送', 'Spedizione UE')}</strong><span className="block text-neutral-500">{localizeCopy('中央仓统一发货', 'Dal magazzino centrale')}</span></span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
                  <CalendarDays className="w-4 h-4 text-neutral-700" />
                  <span><strong className="text-neutral-900">{localizeCopy('预计到货', 'Consegna stimata')}</strong><span className="block text-neutral-500">{localizeCopy('发货后 2–4 个工作日', '2–4 giorni lavorativi')}</span></span>
              </div>
            </div>
          </div>

          {/* Merchant Connection */}
          <div className="rounded-xl bg-neutral-950 text-white border border-neutral-900 p-4 text-xs shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 text-neutral-800">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-bold text-white flex items-center gap-1.5">
                  {localizeCopy('所属源头商户:', 'Fornitore Diretto:')} {product.merchantName}
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                </span>
                <span className="block text-[11px] text-neutral-400">
                  {localizeCopy('拥有自营独立展厅与工坊现货直发', 'Showroom permanente e spedizioni dirette dall\'atelier')}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-[11px]">
              <div><span className="block text-neutral-500">{localizeCopy('生产地', 'Origine')}</span><strong>{product.origin}</strong></div>
              <div><span className="block text-neutral-500">{localizeCopy('包装方式', 'Packaging')}</span><strong>{product.packaging}</strong></div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedMerchantId(product.merchantId);
                setCurrentView('merchant_store');
              }}
              className="w-full px-3 py-2 bg-white hover:bg-neutral-200 text-black rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              {localizeCopy('进入展厅 →', 'Visita Atelier →')}
            </button>
          </div>
        </div>
      </div>

      {/* 3. SKU ORDERING MATRIX TABLE */}
      {isLocked ? (
        <section className="bg-neutral-900 text-white rounded-2xl p-6 sm:p-10 text-center space-y-5 border border-neutral-800 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-white/10 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8 text-white" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>{localizeCopy('授权专属商品', 'Collezione Riservata per Boutique Accreditate')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif">
              {vaultStatus === 'pending'
                ? (localizeCopy('专属商品申请正在生产商审核中', 'Richiesta di accesso in fase di verifica'))
                : (localizeCopy("需【{{RUDA_ARG_0}}】专属授权", "Accesso riservato per {{RUDA_ARG_0}}", [String(product.merchantName)]))}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              {localizeCopy('通过专属授权与严格的买家认证保护新品设计。审核通过后将即时开放完整配色与下单矩阵。', 'I modelli esclusivi sono protetti per garantire la massima riservatezza commerciale ai nostri rivenditori partner.')}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {vaultStatus === 'pending' ? (
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-800 text-white text-xs font-semibold border border-neutral-700">
                <Clock className="w-4 h-4 text-white animate-spin" />
                <span>{localizeCopy('生产商审核中 · 核验通过后自动开放', 'In attesa di approvazione')}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRequestAccess}
                className="px-6 py-3 bg-white text-black hover:bg-neutral-200 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-lg"
              >
                <Lock className="w-4 h-4" />
                <span>{localizeCopy('申请看货权限', 'Invia Richiesta di Accreditamento')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedMerchantId(product.merchantId);
                setCurrentView('merchant_store');
              }}
              className="px-5 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              {localizeCopy('浏览该商户公开现货', 'Visualizza Capi Pubblici')}
            </button>
          </div>
        </section>
      ) : (
        <section className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-neutral-800" />
                <span>{localizeCopy('颜色与尺码配比选款矩阵', 'Matrice Ordine per Taglia e Colore')}</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {localizeCopy('直接在下方矩阵填入所需件数，系统自动计算总件数与采购金额。', 'Inserisci le quantità desiderate per ogni combinazione taglia/colore.')}
              </p>
            </div>

            {/* Quick Action presets */}
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleQuickFillMoq}
                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium rounded transition-colors cursor-pointer"
              >
                {localizeCopy("填入起订量 ({{RUDA_ARG_0}}件)", "Riempi Minimo ({{RUDA_ARG_0}} pz)", [String(product.moq)])}
              </button>
              {totalSelectedQty > 0 && (
                <button
                  type="button"
                  onClick={handleQuickClearAll}
                  className="px-2.5 py-1 text-neutral-500 hover:text-black transition-colors cursor-pointer"
                >
                  {localizeCopy('清空所选', 'Azzera')}
                </button>
              )}
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-neutral-100/90 text-neutral-700 uppercase font-semibold border-b border-neutral-200">
                  <th className="p-3">{localizeCopy('颜色', 'Colore')}</th>
                  <th className="p-3">{localizeCopy('尺码', 'Taglia')}</th>
                  <th className="p-3">{localizeCopy('单品 SKU', 'Codice SKU')}</th>
                    <th className="p-3 text-center">{localizeCopy('可用库存', 'Disponibile')}</th>
                  <th className="p-3 text-right">{localizeCopy('订购数量 (件)', 'Quantità (pz)')}</th>
                  <th className="p-3 text-right">{localizeCopy('小计', 'Subtotale')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/80">
                {product.skus.map((skuItem) => {
                  const qty = matrixQuantities[skuItem.sku] || 0;
                  const skuTotalStock = skuItem.stockCentral;
                  const itemSubtotal = qty * wholesalePrice;
                  const displayColor = getLocalizedColor(skuItem.color, lang);

                  return (
                    <tr 
                      key={skuItem.sku}
                      className={`hover:bg-neutral-50 transition-colors ${qty > 0 ? 'bg-neutral-100/80 font-medium' : ''}`}
                    >
                      {/* Color */}
                      <td className="p-3 font-medium text-neutral-900">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-3.5 h-3.5 rounded-full border border-neutral-300 shrink-0 shadow-2xs" 
                            style={{ backgroundColor: skuItem.colorCode }}
                          />
                          <span>{displayColor}</span>
                        </div>
                      </td>

                      {/* Size */}
                      <td className="p-3">
                        <span className="font-bold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded">
                          {skuItem.size}
                        </span>
                      </td>

                      {/* SKU Code */}
                      <td className="p-3 font-mono text-[11px] text-neutral-500">
                        {skuItem.sku}
                      </td>

                      {/* Total Stock */}
                      <td className="p-3 text-center font-mono font-bold text-neutral-900">
                        {skuTotalStock}
                      </td>

                      {/* Quantity Stepper */}
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center border border-neutral-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(skuItem.sku, qty - 1)}
                            disabled={qty <= 0}
                            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            max={skuTotalStock}
                            value={qty === 0 ? '' : qty}
                            onChange={(e) => handleQuantityChange(skuItem.sku, parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="w-12 text-center text-xs font-bold py-1.5 focus:outline-none border-x border-neutral-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(skuItem.sku, qty + 1)}
                            disabled={qty >= skuTotalStock}
                            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td className="p-3 text-right font-bold text-neutral-900">
                        {qty > 0 ? `€${itemSubtotal.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Matrix Batch Checkout Bottom Bar */}
          <div className="sticky bottom-4 z-20 bg-black text-white rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl ring-1 ring-white/10">
            <div className="flex flex-wrap items-center gap-6 text-xs w-full sm:w-auto">
              <div>
                <span className="text-neutral-400 block">{localizeCopy('已选总量:', 'Totale Capi:')}</span>
                <span className="text-xl font-bold font-mono text-white">
                  {totalSelectedQty} <span className="text-xs font-normal text-neutral-400">{localizeCopy('件', 'pz')}</span>
                </span>
              </div>

              <div>
                <span className="text-neutral-400 block">{localizeCopy('货款总计:', 'Totale Merce:')}</span>
                <span className="text-xl font-bold font-serif text-white">
                  €{totalSelectedAmount.toFixed(2)}
                </span>
              </div>
              <div className={`text-[11px] ${totalSelectedQty >= product.moq ? 'text-emerald-300' : 'text-amber-300'}`}>
                {totalSelectedQty >= product.moq
                  ? (localizeCopy('✓ 已达到起订量', '✓ Minimo raggiunto'))
                  : (localizeCopy("还差 {{RUDA_ARG_0}} 件起订", "Mancano {{RUDA_ARG_0}} pz al minimo", [String(product.moq - totalSelectedQty)]))}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleBatchAddToCart}
                disabled={totalSelectedQty === 0}
                className="w-full sm:w-auto px-6 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-bold rounded-xl transition-colors disabled:opacity-30 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{localizeCopy('整单批量加入采购车', 'Aggiungi all\'Ordine')}</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 4. Vault Access Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-neutral-900 text-base">
              {localizeCopy('申请专属商品查看与订货权限', 'Richiesta di Accesso al Campionario Riservato')}
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {localizeCopy("向【{{RUDA_ARG_0}}】申请查看该商户的授权专属款式。", "La richiesta verrà inviata direttamente alla direzione commerciale di {{RUDA_ARG_0}}.", [String(product.merchantName)])}
            </p>

            <form onSubmit={handleRequestSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {localizeCopy('采购意向说明 / 门店简介:', 'Note per il fornitore:')}
                </label>
                <textarea
                  rows={3}
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-900 focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-xs text-neutral-600 hover:text-black cursor-pointer font-medium"
                >
                  {localizeCopy('取消', 'Annulla')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-neutral-800 cursor-pointer shadow-xs"
                >
                  {localizeCopy('提交申请', 'Invia Richiesta')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
