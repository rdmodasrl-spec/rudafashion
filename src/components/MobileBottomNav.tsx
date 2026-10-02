import React from 'react';
import { Home, Store, Sparkles, Tag, User, type LucideIcon } from 'lucide-react';
import { useB2B } from '../context/B2BContext';
import type { ActiveView } from '../context/B2BContext';

type NavigationTab = {
  id: string;
  label: string;
  view: ActiveView;
  icon: LucideIcon;
  onClick: () => void;
  isActive: boolean;
  badge?: number | string;
};

export const MobileBottomNav: React.FC = () => {
  const { currentView, setCurrentView, setActiveBuyerTab, lang, localizeCopy } = useB2B();
  const isIt = lang === 'it';

  // Merchant and employee portals render their own task navigation. Rendering
  // the buyer bar here would cover the mobile controls at the bottom.
  if (currentView === 'merchant_portal') {
    return null;
  }

  // Hide on admin dashboard to avoid overlapping ERP controls, unless user wants to go back
  if (currentView === 'admin' || currentView === 'platform_admin') {
    return (
      <nav 
        id="mobile-admin-bottom-bar"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black text-white border-t border-neutral-800 px-4 py-3 flex items-center justify-between shadow-2xl safe-area-bottom"
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
          <span className="text-xs font-mono font-bold tracking-widest uppercase">
            {localizeCopy('RUDA 平台总控', 'RUDA Direzione')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCurrentView('catalog')}
          className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded hover:bg-neutral-200 transition-colors cursor-pointer"
        >
          {localizeCopy('返回前台选款', 'Torna al Catalogo')}
        </button>
      </nav>
    );
  }

  const tabs: NavigationTab[] = [
    {
      id: 'home',
      label: localizeCopy('首页', 'Home'),
      view: 'home' as const,
      icon: Home,
      onClick: () => setCurrentView('home'),
      isActive: currentView === 'home',
    },
    {
      id: 'showrooms',
      label: localizeCopy('商家', 'Negozi'),
      view: 'showrooms' as const,
      icon: Store,
      onClick: () => {
        setCurrentView('showrooms');
        if (window.location.pathname !== '/showrooms') {
          window.history.pushState({}, '', '/showrooms');
        }
      },
      isActive: currentView === 'showrooms' || currentView === 'merchant_store',
    },
    {
      id: 'fashion_trends',
      label: localizeCopy('时尚', 'Moda'),
      view: 'fashion_trends' as const,
      icon: Sparkles,
      onClick: () => {
        setCurrentView('fashion_trends');
        if (window.location.pathname !== '/trends') {
          window.history.pushState({}, '', '/trends');
        }
      },
      isActive: currentView === 'fashion_trends',
    },
    {
      id: 'discount',
      label: localizeCopy('折扣', 'Sconti'),
      view: 'catalog' as const,
      icon: Tag,
      onClick: () => {
        setCurrentView('catalog');
        if (window.location.pathname !== '/catalog') {
          window.history.pushState({}, '', '/catalog');
        }
      },
      isActive: currentView === 'catalog',
    },
    {
      id: 'account',
      label: localizeCopy('我的', 'Area B2B'),
      view: 'account' as const,
      icon: User,
      onClick: () => {
        setActiveBuyerTab('dashboard');
        setCurrentView('account');
      },
      isActive: currentView === 'account',
    },
  ];

  return (
    <nav 
      id="mobile-app-bottom-nav"
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-neutral-200 px-2 py-1.5 flex items-center justify-around shadow-lg select-none safe-area-bottom"
    >
      {tabs.map((tab) => {
        const isActive = tab.isActive;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            id={`mobile-nav-${tab.id}`}
            type="button"
            onClick={tab.onClick}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 min-w-[54px] min-h-[44px] rounded-lg transition-all active:scale-95 cursor-pointer ${
              isActive ? 'text-black font-semibold' : 'text-neutral-400 hover:text-neutral-700'
            }`}
          >
            <div className="relative">
              <Icon 
                className={`w-5 h-5 transition-transform ${
                  isActive ? 'stroke-[2.2px] scale-105' : 'stroke-[1.6px]'
                }`} 
              />
              {tab.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 bg-black text-white text-[10px] font-black rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">
              {tab.label}
            </span>
            {isActive && (
              <span className="absolute bottom-0 w-6 h-0.5 bg-black rounded-full"></span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
