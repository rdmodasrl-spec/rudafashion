import React, { useEffect, useRef, useState } from 'react';
import { 
  Truck, 
  CreditCard, 
  MapPin, 
  ArrowLeft,
  Package,
  Layers,
  FileText,
  QrCode
} from 'lucide-react';
import { useB2B } from '../../context/B2BContext';
import { apiGet } from '../../api/client';
import { DeliveryType, PaymentMethod, SolanaTokenSymbol } from '../../types/b2b';
import { getLocalizedColor } from '../../i18n/translations';

export const CheckoutView: React.FC = () => {
  const { 
    cart, 
    totalCartAmount, 
    totalCartQty, 
    currentCustomer, 
    singleItemCheckoutToken,
    showrooms, 
    placeOrder, 
    canCustomerPlaceNet30Order,
    getCustomerCreditExposure,
    setCurrentView,
    setSingleItemCheckoutToken,
    addNotification,
    lang,
    t, localizeCopy
  } = useB2B();

  const isIt = lang === 'it';
  const isSingleItemCheckout = Boolean(singleItemCheckoutToken);
  const singleItemCartValid = cart.length === 1 && cart[0]?.quantity === 1;
  const singleItemBuyerApproved = currentCustomer?.status === 'approved';
  const [onlinePaymentsEnabled, setOnlinePaymentsEnabled] = useState<boolean | null>(null);
  const [paypalAvailable, setPaypalAvailable] = useState<boolean | null>(null);
  const [stripeAvailable, setStripeAvailable] = useState<boolean | null>(null);
  const [solanaAvailable, setSolanaAvailable] = useState<boolean | null>(null);
  const [solanaCommissionRate, setSolanaCommissionRate] = useState<number | null>(null);
  const [solanaToken, setSolanaToken] = useState<SolanaTokenSymbol>('USDC');
  const merchantIds = [...new Set(cart.map(item => item.merchantId).filter((id): id is string => Boolean(id)))];
  const paypalMerchantId = merchantIds.length === 1 && cart.every(item => Boolean(item.merchantId)) ? merchantIds[0] : null;
  const addNotificationRef = useRef(addNotification);
  addNotificationRef.current = addNotification;

  // Delivery configuration
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('express_delivery');
  const [pickupShowroomId, setPickupShowroomId] = useState<string>('sh-mestre');
  const [shippingAddress, setShippingAddress] = useState(
    currentCustomer?.address || '12 Rue du Faubourg Saint-Honoré, 75008 Paris, France'
  );
  const [notes, setNotes] = useState('');

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(isSingleItemCheckout ? 'credit_card' : 'net_30_days');

  useEffect(() => {
    let active = true;
    fetch('/api/payments/status')
      .then(async response => {
        const result = await response.json() as { onlinePaymentsEnabled?: boolean };
        if (!response.ok) throw new Error('PAYMENT_STATUS_UNAVAILABLE');
        if (active) setOnlinePaymentsEnabled(result.onlinePaymentsEnabled === true);
      })
      .catch(() => {
        if (active) {
          setOnlinePaymentsEnabled(false);
          addNotificationRef.current('warning', '在线支付状态暂不可用', '请稍后重试，状态确认前不会提交单件付款订单。');
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!paypalMerchantId || !currentCustomer) {
      setPaypalAvailable(false);
      return;
    }
    let active = true;
    setPaypalAvailable(null);
    apiGet<{ success: true; available: boolean }>(`/api/payments/paypal/availability?merchantId=${encodeURIComponent(paypalMerchantId)}`)
      .then(result => { if (active) setPaypalAvailable(result.available); })
      .catch(() => { if (active) setPaypalAvailable(false); });
    return () => { active = false; };
  }, [paypalMerchantId, currentCustomer?.id]);

  useEffect(() => {
    if (!paypalMerchantId || !currentCustomer || isSingleItemCheckout) {
      setSolanaAvailable(false);
      setSolanaCommissionRate(null);
      return;
    }
    let active = true;
    setSolanaAvailable(null);
    apiGet<{ success: true; available: boolean; commissionRate?: string }>(`/api/payments/solana/availability?merchantId=${encodeURIComponent(paypalMerchantId)}`)
      .then(result => {
        if (!active) return;
        setSolanaAvailable(result.available);
        setSolanaCommissionRate(result.available && result.commissionRate ? Number(result.commissionRate) : null);
      })
      .catch(() => { if (active) setSolanaAvailable(false); });
    return () => { active = false; };
  }, [paypalMerchantId, currentCustomer?.id, isSingleItemCheckout]);

  useEffect(() => {
    if (!paypalMerchantId || !currentCustomer) {
      setStripeAvailable(false);
      return;
    }
    let active = true;
    setStripeAvailable(null);
    apiGet<{ success: true; available: boolean }>(`/api/payments/stripe/availability?merchantId=${encodeURIComponent(paypalMerchantId)}`)
      .then(result => { if (active) setStripeAvailable(result.available); })
      .catch(() => { if (active) setStripeAvailable(false); });
    return () => { active = false; };
  }, [paypalMerchantId, currentCustomer?.id]);

  useEffect(() => {
    if (paymentMethod === 'paypal' && paypalAvailable === false) {
      setPaymentMethod(isSingleItemCheckout ? 'credit_card' : 'bank_transfer_prepay');
    } else if (paymentMethod === 'stripe' && stripeAvailable === false) {
      setPaymentMethod(isSingleItemCheckout ? 'credit_card' : 'bank_transfer_prepay');
    } else if (paymentMethod === 'solana_pay' && solanaAvailable === false) {
      setPaymentMethod('bank_transfer_prepay');
    } else if (isSingleItemCheckout && !['paypal', 'stripe', 'credit_card'].includes(paymentMethod)) {
      setPaymentMethod('credit_card');
    }
  }, [isSingleItemCheckout, paymentMethod, paypalAvailable, solanaAvailable, stripeAvailable]);

  // Pricing calculation
  const shippingFee = deliveryType === 'showroom_pickup' ? 0 : (totalCartAmount > 1000 ? 0 : 45);
  const orderTotal = totalCartAmount + shippingFee;
  const remainingNet30 = currentCustomer && currentCustomer.status === 'approved'
    ? Math.max(0, (currentCustomer.creditLimit || 0) - (currentCustomer.usedCredit || 0) - getCustomerCreditExposure())
    : 0;
  const net30Allowed = (paymentMethod === 'net_30_days' || paymentMethod === 'net_30')
    ? currentCustomer?.status === 'approved' && canCustomerPlaceNet30Order(orderTotal)
    : true;
  const selectedOnlinePaymentReady = paymentMethod === 'paypal'
    ? paypalAvailable === true
    : paymentMethod === 'stripe'
      ? stripeAvailable === true
      : onlinePaymentsEnabled === true;

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const newOrder = await placeOrder({
      deliveryType,
      pickupShowroomId: deliveryType === 'showroom_pickup' ? pickupShowroomId : undefined,
      shippingAddress: deliveryType === 'express_delivery' ? shippingAddress : undefined,
      shippingFee,
      paymentMethod,
      solanaToken,
      notes,
      singleItemToken: isSingleItemCheckout ? singleItemCheckoutToken || undefined : undefined
    });

    if (newOrder) {
      if (paymentMethod === 'solana_pay' && newOrder.solanaPayment) {
        window.history.pushState({}, '', `/account?solanaOrder=${encodeURIComponent(newOrder.id)}`);
      }
      setCurrentView('account');
    }
  };

  const selectedPaymentLabel =
    paymentMethod === 'paypal' ? 'PayPal 在线付款' : paymentMethod === 'stripe' ? 'Stripe 银行卡在线付款' : paymentMethod === 'solana_pay' ? `Solana Pay · ${solanaToken}` : isSingleItemCheckout ? '在线信用卡付款' : paymentMethod === 'net_30_days' ? 'Net 30 账期' : paymentMethod === 'credit_line' ? '展厅现场结算' : '银行转账预付';

  if (cart.length === 0) {
    return (
      <div className="ui-empty-state my-10 space-y-4">
        <h2 className="text-xl font-bold text-neutral-900">
          {localizeCopy('采购车内无选款', 'Nessun articolo da ordinare')}
        </h2>
        <button
          type="button"
          onClick={() => setCurrentView('catalog')}
          className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          {localizeCopy('返回采购大厅', 'Torna al Catalogo')}
        </button>
      </div>
    );
  }

  return (
    <div className="ui-page-shell max-w-6xl space-y-8">
      {/* Header */}
      <div className="ui-page-header mb-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-neutral-900">
            {localizeCopy('提交批发采购订单', 'Conferma Ordine B2B')}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            {localizeCopy('确认履约方式、企业开票信息与结算账期', 'Verifica le modalità di spedizione, i dati di fatturazione e le condizioni di pagamento.')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isSingleItemCheckout) setSingleItemCheckoutToken(null);
            setCurrentView('cart');
          }}
          className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 cursor-pointer min-h-[44px] px-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{localizeCopy('返回修改采购清单', 'Modifica Carrello')}</span>
        </button>
      </div>

      <form onSubmit={handleConfirmOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (8 cols): Delivery, Invoicing, Payment Method */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Fulfillment Method */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-neutral-700" />
              <span>{localizeCopy('1. 物流履约方式', '1. Modalità di Consegna')}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: Express Shipping */}
              <label 
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between min-h-[100px] ${
                  deliveryType === 'express_delivery'
                    ? 'border-neutral-900 bg-neutral-50 shadow-xs'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="deliveryType"
                    checked={deliveryType === 'express_delivery'}
                    onChange={() => setDeliveryType('express_delivery')}
                    className="mt-1 accent-neutral-900 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-xs text-neutral-900 block">
                      {localizeCopy('中央仓库发货 · 48H 快递直发', 'Spedizione Espressa Hub Centrale (48h BRT / DHL)')}
                    </span>
                    <span className="text-[11px] text-neutral-500 block mt-0.5 leading-relaxed">
                      {localizeCopy('从普拉托立体仓库直接打托，DHL Express / UPS 直达全欧', 'Spedizione palletizzata con corriere espresso da Prato verso tutta Europa.')}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-neutral-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">{localizeCopy('国际运费:', 'Tariffa:')}</span>
                  <span className="font-bold text-neutral-900">
                    {shippingFee === 0 ? (localizeCopy('满 €1000 免运费', 'Gratis per ordini > €1.000')) : `€${shippingFee.toFixed(2)}`}
                  </span>
                </div>
              </label>

              {/* Option B: Showroom Pickup */}
              <label 
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between min-h-[100px] ${
                  deliveryType === 'showroom_pickup'
                    ? 'border-neutral-900 bg-neutral-50 shadow-xs'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="deliveryType"
                    checked={deliveryType === 'showroom_pickup'}
                    onChange={() => setDeliveryType('showroom_pickup')}
                    className="mt-1 accent-neutral-900 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-xs text-neutral-900 block">
                      {localizeCopy('自营展厅自提 (Click & Collect 免运费)', 'Ritiro Diretto in Showroom (Gratuito)')}
                    </span>
                    <span className="text-[11px] text-neutral-500 block mt-0.5 leading-relaxed">
                      {localizeCopy('线上下单锁定现货，前往 Mestre / Milano 等线下展厅验货自提', 'Ritiro immediato presso uno dei nostri showroom autorizzati.')}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-neutral-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">{localizeCopy('自提服务费:', 'Costo Ritiro:')}</span>
                  <span className="font-bold text-neutral-900">{localizeCopy('免费 (0 €)', 'Gratuito (0 €)')}</span>
                </div>
              </label>
            </div>

            {/* Sub-inputs depending on selection */}
            {deliveryType === 'express_delivery' ? (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {localizeCopy('欧洲收件与大货卸货地址:', 'Indirizzo di Spedizione / Scarico Merci:')}
                </label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:bg-white focus:outline-none"
                  required
                />
              </div>
            ) : (
              <div className="pt-2 space-y-2">
                <label className="block text-xs font-semibold text-neutral-700">
                  {localizeCopy('选择自提提货网点:', 'Seleziona lo Showroom per il Ritiro:')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {showrooms.map((sh) => (
                    <div 
                      key={sh.id}
                      onClick={() => setPickupShowroomId(sh.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        pickupShowroomId === sh.id
                          ? 'border-black bg-neutral-50 font-bold'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                        <MapPin className="w-3.5 h-3.5 text-black" />
                        <span>{sh.name}</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1">{sh.address}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. B2B Invoicing Information */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-neutral-700" />
              <span>{localizeCopy('2. 欧盟合规开票信息', '2. Dati Fatturazione Elettronica B2B')}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80">
                <span className="text-neutral-400 block text-[11px]">{localizeCopy('企业全称:', 'Ragione Sociale:')}</span>
                <span className="font-bold text-neutral-900">
                  {currentCustomer?.companyName || 'Boutique Elegance Paris SAS'}
                </span>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80">
                <span className="text-neutral-400 block text-[11px]">{localizeCopy('欧盟增值税号 (P.IVA):', 'Partita IVA / Codice Fiscale:')}</span>
                <span className="font-mono font-bold text-neutral-900">
                  {currentCustomer?.vatNumber || 'FR88921004812'}
                </span>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80">
                <span className="text-neutral-400 block text-[11px]">{localizeCopy('开票税率:', 'Regime IVA:')}</span>
                <span className="font-bold text-neutral-900">
                  {localizeCopy('欧盟跨国采购 0% 增值税 (Reverse Charge)', 'Reverse Charge 0% IVA (Intracomunitario)')}
                </span>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80">
                <span className="text-neutral-400 block text-[11px]">{localizeCopy('企业注册国别:', 'Nazione di Registrazione:')}</span>
                <span className="font-bold text-neutral-900">
                  {currentCustomer?.country || localizeCopy('法国 (France)', 'Francia (FR)')}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Payment Terms */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-neutral-700" />
              <span>{localizeCopy('3. 货款结算方式', '3. Condizioni di Pagamento')}</span>
            </h2>

            {isSingleItemCheckout ? (
              <>
              <div className={`rounded-xl border p-3 text-[11px] ${selectedOnlinePaymentReady ? 'border-neutral-300 bg-neutral-50 text-neutral-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                <div className="font-bold">单件付款 · {paymentMethod === 'paypal' ? 'PayPal' : paymentMethod === 'stripe' ? 'Stripe 在线银行卡' : '在线信用卡'}</div>
                <div className="mt-1">
                  {!singleItemBuyerApproved
                    ? '仅已完成资质审核的批发买手可以购买，请先登录已审核的买手账户。'
                    : paymentMethod === 'paypal' && paypalAvailable
                      ? '此安全结算链接只购买当前商品规格 1 件，PayPal 付款由商家自己的账户收取。'
                      : paymentMethod === 'stripe' && stripeAvailable
                        ? '此安全结算链接只购买当前商品规格 1 件，银行卡付款将直接进入商家自己的 Stripe 账户。'
                      : onlinePaymentsEnabled
                      ? '此安全结算链接只购买当前商品规格 1 件，且不受商品 MOQ 限制。'
                      : '在线支付通道尚未配置或暂时无法连接，当前不能提交单件收款订单。'}
                </div>
                {!singleItemCartValid && <div className="mt-1 font-semibold">购物车商品已变化，请返回店铺并重新打开单件付款链接。</div>}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className={`rounded-xl border-2 p-3 text-xs ${paymentMethod === 'credit_card' ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'} ${onlinePaymentsEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                  <input type="radio" name="paymentMethod" checked={paymentMethod === 'credit_card'} disabled={!onlinePaymentsEnabled} onChange={() => setPaymentMethod('credit_card')} className="mr-2 accent-neutral-900" />
                  在线信用卡付款
                </label>
                {paypalAvailable && <label className={`rounded-xl border-2 p-3 text-xs ${paymentMethod === 'paypal' ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'} cursor-pointer`}>
                  <input type="radio" name="paymentMethod" checked={paymentMethod === 'paypal'} onChange={() => setPaymentMethod('paypal')} className="mr-2 accent-neutral-900" />
                  PayPal 在线付款
                </label>}
                {stripeAvailable && <label className={`rounded-xl border-2 p-3 text-xs ${paymentMethod === 'stripe' ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'} cursor-pointer`}>
                  <input type="radio" name="paymentMethod" checked={paymentMethod === 'stripe'} onChange={() => setPaymentMethod('stripe')} className="mr-2 accent-neutral-900" />
                  Stripe 银行卡在线付款
                </label>}
              </div>
              </>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label 
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  paymentMethod === 'bank_transfer_prepay'
                    ? 'border-neutral-900 bg-neutral-50 font-bold'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="space-y-1">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'bank_transfer_prepay'}
                    onChange={() => setPaymentMethod('bank_transfer_prepay')}
                    className="accent-neutral-900"
                  />
                  <span className="text-xs font-bold text-neutral-900 block">
                    {localizeCopy('银行转账预付', 'Bonifico Bancario Anticipato')}
                  </span>
                  <span className="text-[10px] text-neutral-500 block leading-tight">
                    {localizeCopy('支持 SEPA Instant / 享 2% 现款折扣', 'Sconto cassa 2% immediato')}
                  </span>
                </div>
              </label>

              <label 
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  paymentMethod === 'net_30_days'
                    ? 'border-neutral-900 bg-neutral-50 font-bold'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="space-y-1">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'net_30_days'}
                    onChange={() => setPaymentMethod('net_30_days')}
                    className="accent-neutral-900"
                  />
                  <span className="text-xs font-bold text-neutral-900 block">
                    {localizeCopy('30 天账期结算 (NET 30)', 'Ri.Ba. / Bonifico a 30 Giorni')}
                  </span>
                  <span className="text-[10px] text-neutral-500 block leading-tight">
                    {localizeCopy('授信额度内免预付先发货', 'Fido commerciale concordato')}
                  </span>
                </div>
              </label>

              <label 
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  paymentMethod === 'credit_line'
                    ? 'border-neutral-900 bg-neutral-50 font-bold'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="space-y-1">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'credit_line'}
                    onChange={() => setPaymentMethod('credit_line')}
                    className="accent-neutral-900"
                  />
                  <span className="text-xs font-bold text-neutral-900 block">
                    {localizeCopy('展厅提货现场结算', 'Pagamento al Ritiro')}
                  </span>
                  <span className="text-[10px] text-neutral-500 block leading-tight">
                    {localizeCopy('展厅现场支付', 'Pagamento al banco showroom')}
                  </span>
                </div>
              </label>
              {paypalAvailable && <label className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                paymentMethod === 'paypal' ? 'border-neutral-900 bg-neutral-50 font-bold' : 'border-neutral-200 hover:border-neutral-300'
              }`}>
                <div className="space-y-1">
                  <input type="radio" name="paymentMethod" checked={paymentMethod === 'paypal'} onChange={() => setPaymentMethod('paypal')} className="accent-neutral-900" />
                  <span className="text-xs font-bold text-neutral-900 block">PayPal 在线付款</span>
                  <span className="text-[10px] text-neutral-500 block leading-tight">由该商品商家自己的 PayPal 账户收款</span>
                </div>
              </label>}
              {stripeAvailable && <label className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                paymentMethod === 'stripe' ? 'border-neutral-900 bg-neutral-50 font-bold' : 'border-neutral-200 hover:border-neutral-300'
              }`}>
                <div className="space-y-1">
                  <input type="radio" name="paymentMethod" checked={paymentMethod === 'stripe'} onChange={() => setPaymentMethod('stripe')} className="accent-neutral-900" />
                  <span className="text-xs font-bold text-neutral-900 block">Stripe 银行卡在线付款</span>
                  <span className="text-[10px] text-neutral-500 block leading-tight">款项直接进入该商家的 Stripe 账户</span>
                </div>
              </label>}
              {solanaAvailable && <label className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                paymentMethod === 'solana_pay' ? 'border-neutral-900 bg-neutral-50 font-bold' : 'border-neutral-200 hover:border-neutral-300'
              }`}>
                <div className="space-y-1">
                  <input type="radio" name="paymentMethod" checked={paymentMethod === 'solana_pay'} onChange={() => setPaymentMethod('solana_pay')} className="accent-neutral-900" />
                  <span className="text-xs font-bold text-neutral-900 block">Solana Pay</span>
                  <span className="text-[10px] text-neutral-500 block leading-tight">USDC 或 EURC{solanaCommissionRate !== null ? `；商家 ${(1 - solanaCommissionRate) * 100}% · RUDA 平台服务费 ${solanaCommissionRate * 100}%` : ''}</span>
                </div>
              </label>}
              {paymentMethod === 'solana_pay' && <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 sm:col-span-2 lg:col-span-4">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-950"><QrCode className="h-4 w-4" />选择支付稳定币 · 仅限 Solana (SPL) 网络</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['USDC', 'EURC'] as const).map(token => <button key={token} type="button" onClick={() => setSolanaToken(token)} aria-pressed={solanaToken === token} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${solanaToken === token ? 'border-violet-800 bg-violet-800 text-white' : 'border-violet-200 bg-white text-violet-950'}`}>{token}</button>)}
                </div>
                <p className="mt-2 text-[10px] leading-4 text-violet-900">仅支持 Solana (SPL) 主网上的 USDC 或 EURC。请勿从其他网络发送代币，否则可能无法到账或找回。确认下单后显示二维码；请在钱包中核对网络、收款金额和分账明细，并手动确认。若钱包需要首次创建收款代币账户，还需少量 SOL 支付网络费和账户租金，具体金额以钱包显示为准。</p>
              </div>}
              {!paypalMerchantId && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-5 text-amber-800 sm:col-span-2 lg:col-span-4">
                商家自有 PayPal、Stripe 和 Solana 钱包付款仅支持单一商家的购物车。当前购物车包含多个商家或商品商家信息不完整，请拆分购物车后再选择；银行转账和账期仍可使用。
              </div>}
            </div>
            )}

            {!isSingleItemCheckout && paymentMethod === 'net_30_days' && (
              <div className={`rounded-xl border p-3 text-[11px] ${net30Allowed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                <div className="font-bold">{currentCustomer?.status === 'approved' ? 'Net 30 授信已批准' : 'Net 30 授信待审核'}</div>
                <div className="mt-1">
                  {currentCustomer?.status === 'approved'
                    ? `剩余可用账期: €${remainingNet30.toFixed(2)} / 总额度 €${(currentCustomer.creditLimit || 0).toFixed(2)}`
                    : '该零售商账号尚未完成平台资质审核，暂不能使用账期结算。'}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                {localizeCopy('订单备注与配货特殊要求:', 'Note per la logistica o etichettatura personalizzata:')}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={localizeCopy('如需指定特定物流、纸箱麦头打标或合并分箱，请在此注明...', 'Indicazioni su orari di scarico, sponda idraulica, ecc.')}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-neutral-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Order Summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-100 pb-3 flex items-center justify-between">
              <span>{localizeCopy('采购清单小计', 'Riepilogo Ordine B2B')}</span>
              <span className="text-[11px] font-mono font-bold text-neutral-600">
                {totalCartQty} {localizeCopy('件', 'capi')}
              </span>
            </h3>

            {/* Scrollable Items preview */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 text-xs divide-y divide-neutral-100">
              {cart.map((item) => (
                <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono font-bold text-[10px] text-neutral-800 block">
                      {item.styleNo}
                    </span>
                    <span className="text-neutral-600 truncate block text-[11px]">
                      {item.productName}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {getLocalizedColor(item.color, lang)} · {item.size} · {item.quantity} {localizeCopy('件', 'pz')}
                    </span>
                  </div>
                  <span className="font-serif font-bold text-neutral-900 text-xs shrink-0">
                    €{(item.quantity * item.unitPrice).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="border-t border-neutral-200 pt-3 space-y-2 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>{localizeCopy('货款小计:', 'Subtotale Merce:')}</span>
                <span className="font-serif font-bold text-neutral-900">€{totalCartAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>{localizeCopy('物流运费:', 'Spedizione:')}</span>
                <span className="font-serif font-bold text-neutral-900">
                  {shippingFee === 0 ? (localizeCopy('免费', 'Gratis')) : `€${shippingFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{localizeCopy('欧盟反向增值税 (Reverse Charge):', 'IVA Reverse Charge:')}</span>
                <span className="text-neutral-500 font-mono">0% (0.00 €)</span>
              </div>
              <div className="border-t border-neutral-200 pt-2 flex justify-between items-baseline">
                <span className="font-bold text-neutral-900 text-sm">{localizeCopy('应付总额:', 'Totale Fattura:')}</span>
                <span className="font-serif font-black text-2xl text-black">
                  €{orderTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSingleItemCheckout && (!selectedOnlinePaymentReady || !singleItemCartValid || !singleItemBuyerApproved)}
              className="w-full py-3 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:bg-neutral-400"
            >
              <Package className="w-4 h-4" />
              <span>{paymentMethod === 'paypal' ? '前往 PayPal 付款' : paymentMethod === 'stripe' ? '前往 Stripe 付款' : paymentMethod === 'solana_pay' ? '生成 Solana Pay 二维码' : isSingleItemCheckout ? '前往安全支付' : localizeCopy('确认并提交采购单', 'Invia Ordine Definitivo')}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
