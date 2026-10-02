import React, { useEffect, useMemo, useState } from 'react';
import { useB2B } from '../../context/B2BContext';
import { ArrowLeft, MapPin, CreditCard, Truck, CheckCircle2, ShieldCheck, Building2, User } from 'lucide-react';
import type { ConsumerAddress } from '../../types/b2b';

type ConsumerAddressForm = Partial<ConsumerAddress> & { line2?: string; province?: string };

export const ConsumerCheckout: React.FC = () => {
  const { consumerCart, consumerAddresses, loadConsumerAddresses, saveConsumerAddress, placeConsumerOrder, formatMoney, setCurrentView, lastPromoCalc, calculateConsumerCartPromo, authConsumer } = useB2B();
  const [addrId, setAddrId] = useState<string>('new');
  const [form, setForm] = useState<ConsumerAddressForm>({ firstName: authConsumer?.firstName || '', lastName: authConsumer?.lastName || '', phone: authConsumer?.phone || '', country: 'Italy', city: '', zip: '', street: '' });
  const [pay, setPay] = useState<'card' | 'paypal' | 'apple' | 'alipay'>('card');
  const [coupon] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => { void loadConsumerAddresses(); }, [loadConsumerAddresses]);
  useEffect(() => {
    if (consumerCart.length > 0 && addrId !== 'new') {
      void calculateConsumerCartPromo(coupon || undefined);
    }
  }, [addrId]);

  const patch = (k: keyof ConsumerAddressForm, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const subtotal = useMemo(() => consumerCart.reduce((s, c) => s + c.retailPrice * c.quantity, 0), [consumerCart]);
  const discount = lastPromoCalc?.discountTotal || 0;
  const shipping = lastPromoCalc?.shippingFee ?? (subtotal - discount > 200 ? 0 : 12.9);
  const tax = Math.max(0, (subtotal - discount + shipping) * 0.22);
  const total = Math.max(0, subtotal - discount + shipping + tax);
  const itemsQty = consumerCart.reduce((s, c) => s + c.quantity, 0);

  const submit = async () => {
    if (placing) return;
    if (addrId === 'new') {
      if (!form.firstName || !form.lastName || !form.phone || !form.street || !form.city || !form.country || !form.zip) {
        alert('请完整填写收货地址信息'); return;
      }
    }
    setPlacing(true);
    try {
      const selAddr = addrId === 'new'
        ? {
          ...form,
          street: [form.street, form.line2].filter(Boolean).join(', '),
          city: [form.city, form.province].filter(Boolean).join(', '),
        } as ConsumerAddress
        : consumerAddresses.find(a => a.id === addrId);
      const order = await placeConsumerOrder({
        shippingAddress: selAddr as ConsumerAddress,
        paymentMethod: pay,
        couponCode: coupon || undefined,
        giftNote: ''
      });
      if (order.ok) setOk(order.orderNo || order.id || '');
    } finally {
      setPlacing(false);
    }
  };

  if (ok) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 md:py-24 text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>
        <h1 className="font-serif font-black text-4xl mb-3 text-neutral-950">下单成功!🎉</h1>
        <p className="text-sm text-neutral-600 mb-2 leading-7">您的订单 <span className="font-mono font-bold bg-neutral-100 px-2 py-0.5 rounded-lg">{ok}</span> 已提交，确认邮件已发送至您的邮箱。</p>
        <p className="text-xs text-neutral-500 mb-8">RUDA 将在 24 小时内审核并发货，您可以在"我的订单"查看实时状态。</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => setCurrentView('consumer_orders')} className="ui-primary-button px-7 py-3 text-sm">查看我的订单</button>
          <button onClick={() => setCurrentView('consumer_store')} className="ui-secondary-button px-7 py-3 text-sm">继续选购</button>
        </div>
      </div>
    );
  }

  if (consumerCart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="font-serif font-black text-2xl mb-3">购物袋为空</h1>
        <button onClick={() => setCurrentView('consumer_store')} className="ui-primary-button mt-4">返回商城</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <button onClick={() => setCurrentView('consumer_cart')} className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition">
        <ArrowLeft className="w-3.5 h-3.5" /> 返回购物袋
      </button>
      <h1 className="font-serif font-black text-3xl md:text-4xl mb-8 text-neutral-950">结算中心 · Checkout</h1>
      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <section className="ui-card p-6">
            <h2 className="flex items-center gap-2 font-black text-lg mb-5 text-neutral-950">
              <MapPin className="w-5 h-5" /> 收货地址
            </h2>
            {consumerAddresses.length > 0 && (
              <div className="grid md:grid-cols-2 gap-3 mb-5">
                {consumerAddresses.map(a => (
                  <label key={a.id} className={`relative flex gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${addrId === a.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400 bg-white'}`}>
                    <input type="radio" checked={addrId === a.id} onChange={() => setAddrId(a.id)} className="sr-only" />
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-neutral-100 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-neutral-600" />
                    </div>
                    <div className="text-sm min-w-0">
                      <div className="font-bold text-neutral-900 mb-0.5">{a.firstName} {a.lastName}</div>
                      <div className="text-neutral-500 text-xs leading-6 line-clamp-2">{a.street}, {a.city}, {a.zip}, {a.country}</div>
                      <div className="text-xs text-neutral-400 mt-1">📞 {a.phone}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 text-sm font-semibold mb-4 text-neutral-800">
              <input type="radio" checked={addrId === 'new'} onChange={() => setAddrId('new')} className="accent-neutral-900" />
              <span>+ 使用新收货地址</span>
            </label>
            {addrId === 'new' && (
              <div className="grid md:grid-cols-2 gap-3.5 pt-3 border-t border-neutral-200/70">
                <label className="block"><span className="ui-section-title block mb-1.5">姓 First</span><input required value={form.lastName} onChange={e => patch('lastName', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:border-neutral-900 focus:outline-none" /></label>
                <label className="block"><span className="ui-section-title block mb-1.5">名 Last</span><input required value={form.firstName} onChange={e => patch('firstName', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:border-neutral-900 focus:outline-none" /></label>
                <label className="block col-span-2"><span className="ui-section-title block mb-1.5">手机号 Phone</span><input required value={form.phone} onChange={e => patch('phone', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:border-neutral-900 focus:outline-none" /></label>
                <label className="block col-span-2"><span className="ui-section-title block mb-1.5">地址 Street</span><input required value={form.street} onChange={e => patch('street', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:border-neutral-900 focus:outline-none" /></label>
                <label className="block col-span-2"><span className="ui-section-title block mb-1.5">地址 Line 2 (可选)</span><input value={form.line2} onChange={e => patch('line2', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:border-neutral-900 focus:outline-none" /></label>
                <label className="block"><span className="ui-section-title block mb-1.5">城市 City</span><input required value={form.city} onChange={e => patch('city', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:border-neutral-900 focus:outline-none" /></label>
                <label className="block"><span className="ui-section-title block mb-1.5">邮编 Postal</span><input required value={form.zip} onChange={e => patch('zip', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:border-neutral-900 focus:outline-none" /></label>
                <label className="block"><span className="ui-section-title block mb-1.5">省 Province</span><input value={form.province} onChange={e => patch('province', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:border-neutral-900 focus:outline-none" /></label>
                <label className="block"><span className="ui-section-title block mb-1.5">国家 Country</span><input required value={form.country} onChange={e => patch('country', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:border-neutral-900 focus:outline-none" /></label>
              </div>
            )}
          </section>

          <section className="ui-card p-6">
            <h2 className="flex items-center gap-2 font-black text-lg mb-5 text-neutral-950">
              <CreditCard className="w-5 h-5" /> 支付方式
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {([
                ['card', '💳 信用卡 / 借记卡', 'Visa · MasterCard · Amex', true],
                ['paypal', '🅿️ PayPal', '安全快捷全球支付', false],
                ['apple', ' Pay', 'Apple 设备一键支付', false],
                ['alipay', '支付宝 Alipay', '人民币结算', false],
              ] as const).map(([k, t, d, def]) => (
                <label key={k} className={`flex gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${pay === k ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400 bg-white'}`}>
                  <input type="radio" name="pm" checked={pay === k} onChange={() => setPay(k as any)} defaultChecked={def} className="sr-only" />
                  <div className="flex-1">
                    <div className="font-bold text-sm mb-1">{t}</div>
                    <div className="text-xs text-neutral-500">{d}</div>
                  </div>
                  {pay === k && <CheckCircle2 className="w-5 h-5 text-neutral-900 shrink-0 mt-0.5" />}
                </label>
              ))}
            </div>
            <div className="mt-5 p-4 rounded-2xl bg-sky-50 text-sky-800 text-xs flex items-start gap-3 leading-6">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <div>采用 256-bit SSL 加密传输，所有支付均通过 PCI-DSS 认证通道完成，RUDA 不存储您的银行卡信息。</div>
            </div>
          </section>

          <section className="ui-card p-6">
            <h2 className="flex items-center gap-2 font-black text-lg mb-5 text-neutral-950">
              <Truck className="w-5 h-5" /> 配送信息 ({itemsQty} 件商品)
            </h2>
            <div className="grid md:grid-cols-2 gap-2 mb-4">
              {consumerCart.slice(0, 4).map(it => (
                <div key={it.productId + it.size} className="flex gap-3 items-center p-2 rounded-xl bg-neutral-50">
                  <img src={it.image || '/pwa-512x512.png'} className="w-12 h-14 rounded-lg object-cover" />
                  <div className="min-w-0 text-xs">
                    <div className="font-semibold truncate">{it.productName}</div>
                    <div className="text-neutral-500">x{it.quantity} · {formatMoney(it.retailPrice)}</div>
                  </div>
                </div>
              ))}
              {consumerCart.length > 4 && <div className="flex items-center justify-center text-xs text-neutral-500 p-2">+ {consumerCart.length - 4} 件</div>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 text-neutral-600 leading-5"><div className="font-bold text-neutral-900 mb-0.5">🚚 标准配送</div>意大利 2-4 工作日</div>
              <div className="p-3 rounded-xl bg-neutral-50 text-neutral-600 leading-5"><div className="font-bold text-neutral-900 mb-0.5">✈️ 欧盟直邮</div>EU 3-5 工作日</div>
              <div className="p-3 rounded-xl bg-neutral-50 text-neutral-600 leading-5"><div className="font-bold text-neutral-900 mb-0.5">🌏 全球速递</div>4-9 工作日 / DHL</div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2">
          <div className="ui-card p-6 sticky top-24">
            <h2 className="font-black text-xl mb-5 text-neutral-950">订单总览</h2>
            <dl className="space-y-2.5 mb-5 text-sm">
              <div className="flex justify-between"><dt className="text-neutral-600">商品 ({itemsQty})</dt><dd className="font-semibold tabular-nums">{formatMoney(subtotal)}</dd></div>
              {discount > 0 && <div className="flex justify-between text-emerald-700"><dt>优惠折扣</dt><dd className="font-bold tabular-nums">-{formatMoney(discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-neutral-600">运费</dt><dd className="font-semibold tabular-nums">{shipping === 0 ? <span className="text-emerald-700">免费</span> : formatMoney(shipping)}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-600">VAT 22%</dt><dd className="font-semibold tabular-nums">{formatMoney(tax)}</dd></div>
            </dl>
            <div className="pt-4 border-t border-neutral-200/70 mb-5">
              <div className="flex items-end justify-between mb-1">
                <span className="text-sm text-neutral-600">应付总额 Total</span>
                <span className="font-black text-3xl text-neutral-950 tabular-nums">{formatMoney(total)}</span>
              </div>
              <p className="text-[11px] text-neutral-400">以结算货币 EUR 为最终支付金额。</p>
            </div>
            <button onClick={submit} disabled={placing} className="ui-primary-button w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {placing ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 正在处理...</>
              ) : (
                <><CreditCard className="w-4 h-4" /> 确认支付 {formatMoney(total)}</>
              )}
            </button>
            <div className="mt-5 pt-4 border-t border-neutral-200/70 space-y-2 text-[11px] text-neutral-500 leading-6">
              <p>· 下单即视为同意 RUDA Fashion 零售《购物条款》与《隐私政策》。</p>
              <p>· 所有服饰支持 14 天无理由退换（标签未拆，未洗涤穿着）。</p>
              <p>· 需退换的商品请保留原包装，我们将安排上门取件。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
