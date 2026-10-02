import React, { useEffect, useState } from 'react';
import { ClipboardList, ShoppingBag } from 'lucide-react';
import { useB2B } from '../../context/B2BContext';
import { CartView } from './CartView';
import { OrdersView } from './OrdersView';

type OrderCenterTab = 'cart' | 'orders';

export const OrderCenterView: React.FC<{ showOrdersTab?: boolean }> = ({ showOrdersTab = true }) => {
  const { orders, totalCartQty, currentView, lang, localizeCopy } = useB2B();
  const isIt = lang === 'it';
  const [activeTab, setActiveTab] = useState<OrderCenterTab>(currentView === 'orders' ? 'orders' : 'cart');

  useEffect(() => {
    setActiveTab(currentView === 'orders' ? 'orders' : 'cart');
  }, [currentView]);

  return (
    <div className="ui-page-shell max-w-5xl space-y-5">
      <header className="border-b border-neutral-300 pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
          RUDA / ORDER CENTER
        </p>
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-neutral-950 sm:text-4xl">
          {localizeCopy('订单中心', 'Ordini e acquisti')}
        </h1>
        <p className="mt-2 text-xs leading-5 text-neutral-500">
          {localizeCopy('统一管理采购清单、提交采购以及查看历史订单。', 'Gestisci il carrello e consulta lo storico degli ordini.')}
        </p>
      </header>

      <div role="tablist" aria-label={localizeCopy('订单中心栏目', 'Sezioni ordini')} className="flex gap-2 border-b border-neutral-200">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'cart'}
          onClick={() => setActiveTab('cart')}
          className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-xs font-semibold transition-colors ${
            activeTab === 'cart' ? 'border-neutral-950 text-neutral-950' : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          {localizeCopy('采购清单', 'Lista acquisti')}
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">{totalCartQty}</span>
        </button>
        {showOrdersTab && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'orders'}
            onClick={() => setActiveTab('orders')}
            className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-xs font-semibold transition-colors ${
              activeTab === 'orders' ? 'border-neutral-950 text-neutral-950' : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            {localizeCopy('订单记录', 'Storico ordini')}
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">{orders.length}</span>
          </button>
        )}
      </div>

      <div role="tabpanel" aria-label={activeTab === 'cart' ? (localizeCopy('采购清单', 'Lista acquisti')) : (localizeCopy('订单记录', 'Storico ordini'))}>
        {activeTab === 'orders' && showOrdersTab
          ? <OrdersView onReorderToCart={() => setActiveTab('cart')} />
          : <CartView />}
      </div>
    </div>
  );
};
