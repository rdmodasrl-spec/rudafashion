import React, { useState } from 'react';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  FileText, 
  Printer, 
  X,
  Layers,
  ArrowRight
  ,Share2
} from 'lucide-react';
import { useB2B } from '../../context/B2BContext';
import { Order } from '../../types/b2b';
import { apiPost } from '../../api/client';
import { ProductImage } from '../common/ProductImage';

export const OrdersView: React.FC<{ onReorderToCart?: () => void }> = ({ onReorderToCart }) => {
  const { orders, reorderHistoricOrder, requestReturn, setCurrentView, addNotification, lang, t, localizeCopy } = useB2B();
  const isIt = lang === 'it';

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'shipped' | 'delivered'>('all');
  const [activeDocModal, setActiveDocModal] = useState<'invoice' | 'packing_list' | null>(null);
  const [docOrder, setDocOrder] = useState<Order | null>(null);
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnQuantity, setReturnQuantity] = useState(0);
  const [sharingOrderId, setSharingOrderId] = useState<string | null>(null);

  // Filter orders
  const filteredOrders = orders.filter(o => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return o.status === 'placed' || o.status === 'pending' || o.status === 'confirmed';
    if (activeTab === 'shipped') return o.status === 'picking' || o.status === 'shipped';
    if (activeTab === 'delivered') return o.status === 'delivered';
    return true;
  });

  const handleOpenDoc = (order: Order, type: 'invoice' | 'packing_list') => {
    setDocOrder(order);
    setActiveDocModal(type);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async (order: Order, scope: 'order' | 'invoice') => {
    if (sharingOrderId) return;
    setSharingOrderId(order.id);
    try {
      const result = await apiPost<{ success: true; links: { order: string; invoice: string } }>(
        `/api/orders/${encodeURIComponent(order.id)}/share-links`, {}
      );
      const url = result.links[scope];
      const title = scope === 'invoice'
        ? localizeCopy('RUDA 发票 {{RUDA_ARG_0}}', 'Fattura RUDA {{RUDA_ARG_0}}', [String(order.orderNo)])
        : localizeCopy('RUDA 订单 {{RUDA_ARG_0}}', 'Ordine RUDA {{RUDA_ARG_0}}', [String(order.orderNo)]);
      const text = scope === 'invoice'
        ? `${title} · €${order.totalAmount.toFixed(2)}`
        : localizeCopy(
          '{{RUDA_ARG_0}} · {{RUDA_ARG_1}} 件 · €{{RUDA_ARG_2}}',
          '{{RUDA_ARG_0}} · {{RUDA_ARG_1}} pz · €{{RUDA_ARG_2}}',
          [title, String(order.totalQty), order.totalAmount.toFixed(2)]
        );
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        addNotification('success', localizeCopy('分享链接已复制', 'Link copiato'), localizeCopy('可粘贴到 WhatsApp、微信或邮件发送。', 'Puoi inviarlo via WhatsApp o email.'));
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        addNotification('warning', localizeCopy('分享失败', 'Condivisione non riuscita'), localizeCopy('请稍后重试。', 'Riprova tra poco.'));
      }
    } finally {
      setSharingOrderId(null);
    }
  };

  const handleReorder = (orderId: string) => {
    reorderHistoricOrder(orderId);
    addNotification(
      'success',
      localizeCopy('已加入采购车', 'Articoli Aggiunti'),
      localizeCopy('历史订单款项与配码已成功载入采购车，可直接进行二次确认下单。', 'I capi dell\'ordine sono stati ricaricati nel carrello per il riassortimento.')
    );
    if (onReorderToCart) onReorderToCart();
    else setCurrentView('cart');
  };

  const handleReturnSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!returnOrder || !returnReason.trim()) return;
    requestReturn(returnOrder.id, returnReason.trim(), returnQuantity || undefined);
    setReturnOrder(null);
    setReturnReason('');
    setReturnQuantity(0);
  };

  const pendingCount = orders.filter(o => o.status === 'placed' || o.status === 'pending' || o.status === 'confirmed').length;
  const shippedCount = orders.filter(o => o.status === 'picking' || o.status === 'shipped').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  return (
    <div className="ui-page-shell max-w-5xl space-y-6">
      {/* 1. Header */}
      <div className="ui-page-header mb-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-black text-white rounded-lg">
              <Package className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 font-serif">
              {localizeCopy('采购订单与发货单据', 'Gestione Ordini e Spedizioni')}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            {localizeCopy('实时查看全欧物流轨迹、形式发票、装箱单与一键快捷补货。', 'Tracciamento spedizioni in Europa, fatturazione elettronica e riordino rapido.')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCurrentView('catalog')}
          className="px-4 py-2 text-xs font-semibold text-white bg-black hover:bg-neutral-800 rounded-xl transition-colors shrink-0 cursor-pointer shadow-xs"
        >
          {localizeCopy('前往选款补货', 'Nuovo Riassortimento')}
        </button>
      </div>

      {/* 2. Status Filter Tabs */}
      <div className="ui-tab-list no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`ui-tab cursor-pointer ${
            activeTab === 'all' ? 'bg-black text-white shadow-xs' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          {localizeCopy("全部订单 ({{RUDA_ARG_0}})", "Tutti gli Ordini ({{RUDA_ARG_0}})", [String(orders.length)])}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`ui-tab flex cursor-pointer items-center gap-1.5 ${
            activeTab === 'pending' ? 'bg-black text-white shadow-xs' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{localizeCopy("待处理 ({{RUDA_ARG_0}})", "In Preparazione ({{RUDA_ARG_0}})", [String(pendingCount)])}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shipped')}
          className={`ui-tab flex cursor-pointer items-center gap-1.5 ${
            activeTab === 'shipped' ? 'bg-black text-white shadow-xs' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>{localizeCopy("发货中 / 运输中 ({{RUDA_ARG_0}})", "In Spedizione ({{RUDA_ARG_0}})", [String(shippedCount)])}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('delivered')}
          className={`ui-tab flex cursor-pointer items-center gap-1.5 ${
            activeTab === 'delivered' ? 'bg-black text-white shadow-xs' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{localizeCopy("已完成 ({{RUDA_ARG_0}})", "Consegnati ({{RUDA_ARG_0}})", [String(deliveredCount)])}</span>
        </button>
      </div>

      {/* 3. Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-3">
          <Package className="w-10 h-10 text-neutral-300 mx-auto" />
          <h3 className="text-sm font-bold text-neutral-700">
            {localizeCopy('当前分类暂无订单', 'Nessun ordine presente in questa sezione')}
          </h3>
          <p className="text-xs text-neutral-400">
            {localizeCopy('您可以直接通过采购单快速下单或从商城挑选现货', 'Puoi iniziare un ordine direttamente dal catalogo all\'ingrosso.')}
          </p>
          <button
            type="button"
            onClick={() => setCurrentView('catalog')}
            className="mt-2 px-4 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            {localizeCopy('开始采购选款', 'Esplora Catalogo')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const isDelivered = order.status === 'delivered';
            const isShipped = order.status === 'shipped';
            const isPicking = order.status === 'picking';

            return (
              <div
                key={order.id}
                className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 hover:border-neutral-300 transition-all"
              >
                {/* Order Top Line */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-neutral-900">{order.orderNo}</span>
                    <span className="text-xs text-neutral-400">
                      {localizeCopy("下单日期: {{RUDA_ARG_0}}", "Data: {{RUDA_ARG_0}}", [String(order.date)])}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 bg-neutral-100 text-neutral-700 rounded-lg font-medium">
                      {order.deliveryType === 'showroom_pickup' 
                        ? localizeCopy('展厅自提 ({{RUDA_ARG_0}})', 'Ritiro showroom ({{RUDA_ARG_0}})', [String(order.pickupLocation || 'Prato')])
                        : (localizeCopy('国际物流直邮', 'Spedizione Corriere Espresso'))}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                      isDelivered ? 'bg-emerald-100 text-emerald-800' :
                      isShipped ? 'bg-blue-100 text-blue-800' :
                      isPicking ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-800'
                    }`}>
                      {isDelivered && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {isShipped && <Truck className="w-3.5 h-3.5" />}
                      {isPicking && <Clock className="w-3.5 h-3.5" />}
                      <span>
                        {isDelivered 
                          ? (localizeCopy('已妥投收货', 'Consegnato'))
                          : isShipped 
                          ? (localizeCopy('已发货运输中', 'In Viaggio'))
                          : isPicking 
                          ? (localizeCopy('仓储备货配码中', 'Picking a Magazzino'))
                          : (localizeCopy('订单已确认待备货', 'Confermato'))}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {order.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                      <ProductImage
                        src={item.image}
                        alt={item.productName}
                        contain
                        className="w-12 h-14 rounded-lg border border-neutral-200 shrink-0"
                      />
                      <div className="min-w-0 text-xs">
                        <div className="font-mono font-bold text-neutral-900 truncate">{item.styleNo}</div>
                        <div className="text-neutral-600 truncate">{item.productName}</div>
                        <div className="text-neutral-400 mt-0.5">
                          {item.color} / {item.size} × <strong>{item.quantity} {localizeCopy('件', 'pz')}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="flex items-center justify-center bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 text-xs text-neutral-500 font-medium">
                      {localizeCopy("+ 另有 {{RUDA_ARG_0}} 款商品", "+ altri {{RUDA_ARG_0}} articoli", [String(order.items.length - 3)])}
                    </div>
                  )}
                </div>

                {/* Tracking line if shipped */}
                {order.trackingNumber && (
                  <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span>{localizeCopy('承运商:', 'Corriere:')} <strong>{order.carrier || 'DHL Express Europe'}</strong></span>
                      <span className="font-mono font-bold text-blue-950">{localizeCopy('单号:', 'Lettera di Vettura:')} {order.trackingNumber}</span>
                    </div>
                    <span className="text-[11px] text-blue-700 font-medium">
                      {localizeCopy('已发出 · 预计 48h 达', 'Consegna stimata 24-48h')}
                    </span>
                  </div>
                )}

                {/* Bottom Order Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-4 text-xs text-neutral-600">
                    <span>
                      {localizeCopy('总件数:', 'Totale Capi:')} <strong className="text-neutral-950 font-bold">{order.totalQty} {localizeCopy('件', 'pz')}</strong>
                    </span>
                    <span>
                      {localizeCopy('批发总额:', 'Totale Imponibile:')} <strong className="text-neutral-950 font-serif font-black text-sm">€{order.totalAmount.toFixed(2)}</strong>
                    </span>
                    <span className="text-[11px] px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-lg">
                      {localizeCopy('结算方式: 银行电汇 / 授信', 'Pagamento: Bonifico Bancario / Ricevuta')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Invoice View */}
                    <button
                      type="button"
                      onClick={() => handleOpenDoc(order, 'invoice')}
                      className="px-3 py-1.5 border border-neutral-200 hover:border-black rounded-xl text-xs font-bold text-neutral-800 hover:bg-neutral-50 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{localizeCopy('查看发票', 'Fattura Proforma')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleShare(order, 'order')}
                      disabled={sharingOrderId === order.id}
                      className="px-3 py-1.5 border border-neutral-200 hover:border-black rounded-xl text-xs font-bold text-neutral-800 hover:bg-neutral-50 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Share2 className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{sharingOrderId === order.id ? (localizeCopy('处理中', '...')) : (localizeCopy('分享订单', 'Condividi ordine'))}</span>
                    </button>

                    {/* Packing List View */}
                    <button
                      type="button"
                      onClick={() => handleOpenDoc(order, 'packing_list')}
                      className="px-3 py-1.5 border border-neutral-200 hover:border-black rounded-xl text-xs font-bold text-neutral-800 hover:bg-neutral-50 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{localizeCopy('查看装箱单', 'Distinta Colli')}</span>
                    </button>

                    {/* Reorder Button */}
                    <button
                      type="button"
                      onClick={() => handleReorder(order.id)}
                      className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{localizeCopy('再次补货', 'Riassortisci')}</span>
                    </button>

                    {order.status === 'delivered' && !order.refundStatus && (
                      <button
                        type="button"
                        onClick={() => {
                          setReturnOrder(order);
                          setReturnQuantity(order.totalQty);
                        }}
                        className="px-3 py-1.5 border border-amber-300 text-amber-800 hover:bg-amber-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{localizeCopy('申请退货退款', 'Reso / Rimborso')}</span>
                      </button>
                    )}

                    {order.refundStatus === 'requested' && (
                      <span className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold">
                        {localizeCopy('退货审核中', 'Reso in verifica')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Document Modal (Invoice / Packing List) */}
      {activeDocModal && docOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-black text-white rounded-lg">
                  <FileText className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-neutral-900 text-sm sm:text-base">
                  {activeDocModal === 'invoice' 
                    ? (localizeCopy('商业发票 Proforma', 'Fattura Proforma Commerciale'))
                    : (localizeCopy('发货装箱单 Packing List', 'Distinta di Spedizione Colli'))}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-1.5 text-neutral-600 hover:text-black hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
                  title={localizeCopy('打印此单据', 'Stampa documento')}
                >
                  <Printer className="w-4 h-4" />
                </button>
                {activeDocModal === 'invoice' && (
                  <button
                    type="button"
                    onClick={() => void handleShare(docOrder, 'invoice')}
                    disabled={sharingOrderId === docOrder.id}
                    className="p-1.5 text-neutral-600 hover:text-black hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    title={localizeCopy('分享发票', 'Condividi fattura')}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveDocModal(null)}
                  className="p-1.5 text-neutral-400 hover:text-black rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-neutral-800 text-xs font-sans">
              <div className="flex justify-between items-start border-b border-neutral-200 pb-4">
                <div>
                  <h2 className="text-lg font-serif font-bold text-black tracking-wider">RUDA B2B WHOLESALE</h2>
                  <p className="text-[11px] text-neutral-500">Distretto Moda Tessile, 59100 Prato (PO), Italia</p>
                  <p className="text-[11px] text-neutral-500">P.IVA: IT09887766554</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-neutral-100 rounded-lg">
                    {activeDocModal === 'invoice' ? 'INV-' : 'PKL-'}{docOrder.orderNo.replace('#', '')}
                  </span>
                  <div className="text-[11px] text-neutral-400 mt-1">
                    {localizeCopy("日期: {{RUDA_ARG_0}}", "Data: {{RUDA_ARG_0}}", [String(docOrder.date)])}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-neutral-100 border-b border-neutral-200 font-bold text-neutral-700">
                    <tr>
                      <th className="py-2.5 px-3">{localizeCopy('款号 / 描述', 'Modello')}</th>
                      <th className="py-2.5 px-2">{localizeCopy('颜色 / 尺码', 'Colore / Taglia')}</th>
                      <th className="py-2.5 px-2 text-center">{localizeCopy('件数', 'Q.tà')}</th>
                      {activeDocModal === 'invoice' ? (
                        <>
                          <th className="py-2.5 px-2 text-right">{localizeCopy('单价', 'Prezzo Unit.')}</th>
                          <th className="py-2.5 px-3 text-right">{localizeCopy('金额 (€)', 'Totale (€)')}</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2.5 px-2 text-center">{localizeCopy('包规', 'Collo')}</th>
                          <th className="py-2.5 px-3 text-right">{localizeCopy('毛重 (kg)', 'Peso (kg)')}</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {docOrder.items.map((item, i) => (
                      <tr key={i} className="hover:bg-neutral-50">
                        <td className="py-2 px-3">
                          <span className="font-mono font-bold block">{item.styleNo}</span>
                          <span className="text-neutral-500 text-[10px] line-clamp-1">{item.productName}</span>
                        </td>
                        <td className="py-2 px-2 text-neutral-700">
                          {item.color} / {item.size}
                        </td>
                        <td className="py-2 px-2 text-center font-bold">{item.quantity}</td>
                        {activeDocModal === 'invoice' ? (
                          <>
                            <td className="py-2 px-2 text-right font-mono">€{item.unitPrice.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold">€{(item.unitPrice * item.quantity).toFixed(2)}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-2 text-center text-neutral-600">{item.packSize} pz/pacco</td>
                            <td className="py-2 px-3 text-right font-mono">{(item.quantity * 0.45).toFixed(2)} kg</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Summary */}
              <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
                <div className="text-[11px] text-neutral-400">
                  {localizeCopy('电子形式单据，可作为清关与收货凭证', 'Documento commerciale generato elettronicamente')}
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-neutral-500">
                    {localizeCopy('合计总件数:', 'Totale Pezzi:')} <span className="font-bold text-neutral-900">{docOrder.totalQty} {localizeCopy('件', 'pz')}</span>
                  </div>
                  {activeDocModal === 'invoice' ? (
                    <div className="text-base font-serif font-black text-black">
                      {localizeCopy('总额:', 'Totale:')} €{docOrder.totalAmount.toFixed(2)}
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-black">
                      {localizeCopy('预估总重:', 'Peso Stimato:')} {(docOrder.totalQty * 0.45).toFixed(2)} kg
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">RUDA B2B Wholesale Management</span>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{localizeCopy('打印单据', 'Stampa')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {returnOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleReturnSubmit} className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="font-bold text-neutral-900">申请退货 / 退款</h3>
                <p className="text-[11px] text-neutral-500 mt-1">订单 {returnOrder.orderNo} · 最高退款 €{returnOrder.totalAmount.toFixed(2)}</p>
              </div>
              <button type="button" onClick={() => setReturnOrder(null)} className="p-1.5 text-neutral-400 hover:text-black rounded-lg cursor-pointer" title="关闭">
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="block text-xs font-semibold text-neutral-700">
              退货件数
              <input
                type="number"
                min="1"
                max={returnOrder.totalQty}
                value={returnQuantity}
                onChange={event => setReturnQuantity(Math.min(returnOrder.totalQty, Math.max(1, Number(event.target.value))))}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-semibold text-neutral-700">
              退货原因
              <textarea
                required
                rows={4}
                value={returnReason}
                onChange={event => setReturnReason(event.target.value)}
                placeholder="请填写质量、错发、缺件或其他原因"
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setReturnOrder(null)} className="px-3 py-2 rounded-xl border border-neutral-200 text-xs font-bold cursor-pointer">取消</button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-black text-white text-xs font-bold cursor-pointer">提交审核</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
