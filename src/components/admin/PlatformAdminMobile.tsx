import { getIntlLocale } from '../../i18n/translations';
import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Users, 
  Truck, 
  Sparkles, 
  AlertTriangle, 
  Calendar, 
  Bell, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Monitor, 
  Boxes,
  FolderOpen,
  Film,
  Settings2,
  RefreshCw
} from 'lucide-react';
import { useB2B } from '../../context/B2BContext';
import { MerchantGallery } from '../merchant/MerchantGallery';
import { AdminFashionCommunity } from './AdminFashionCommunity';
import { apiGet, ApiError } from '../../api/client';
import { AdminDatabaseCenter } from './AdminDatabaseCenter';
import { AdminRiskMonitor } from './AdminRiskMonitor';
import { AdminNotificationEvents } from './AdminNotificationEvents';
import { AdminMerchantSupport } from './AdminMerchantSupport';
import { ADMIN_AREAS, ADMIN_NAV_GROUPS, type AdminArea, type AdminTab } from './adminNavigation';

type MobileAdminTab =
  | 'orders' | 'merchants' | 'customers' | 'product_audit' | 'inventory_alert' | 'appointments' | 'notifications'
  | 'gallery' | 'fashion_community' | 'finance' | 'settings' | 'audit_logs' | 'database_center' | 'risk_monitor'
  | 'merchant_support_settings';

function getMobileTab(tab: AdminTab): MobileAdminTab | null {
  const tabs: Partial<Record<AdminTab, MobileAdminTab>> = {
    merchants: 'merchants',
    customers: 'customers',
    products: 'product_audit',
    orders: 'orders',
    inventory: 'inventory_alert',
    showrooms: 'appointments',
    finance: 'finance',
    notifications: 'notifications',
    settings: 'settings',
    audit_logs: 'audit_logs',
    gallery: 'gallery',
    fashion_community: 'fashion_community',
    risk_monitor: 'risk_monitor',
    database_center: 'database_center',
    merchant_support_settings: 'merchant_support_settings'
  };
  return tabs[tab] ?? null;
}

interface PlatformAdminMobileProps {
  onSwitchToDesktop?: (tab?: AdminTab) => void;
}

export const PlatformAdminMobile: React.FC<PlatformAdminMobileProps> = ({ onSwitchToDesktop }) => {
  const { 
    orders = [], 
    merchants = [], 
    customers = [], 
    products = [], 
    appointments = [], 
    updateOrderStatus,
    reviewCustomer,
    updateProduct,
    approveReturn,
    rejectReturn,
    addNotification
  , lang} = useB2B();

  // Tabs: 订单 / 生产商审核 / 零售商审核 / 新品审核 / 库存预警 / 预约 / 通知
  const [activeTab, setActiveTab] = useState<
    MobileAdminTab
  >('orders');
  const [adminArea, setAdminArea] = useState<AdminArea>('operations');
  const [selectedAdminTab, setSelectedAdminTab] = useState<AdminTab>('orders');
  const selectMobileArea = (area: AdminArea) => {
    setAdminArea(area);
    const defaultTab: AdminTab = area === 'platform' ? 'database_center' : 'orders';
    setSelectedAdminTab(defaultTab);
    setActiveTab(getMobileTab(defaultTab) || 'orders');
  };
  type MobilePayout = {
    id: string;
    merchantName: string;
    period: string;
    grossSales: number;
    netPayout: number;
    status: string;
    bankAccount: string;
    settlementReference?: string | null;
    settlementProof?: string | null;
    settledAt?: string | null;
    settledBy?: string | null;
    createdAt: string;
  };
  type MobileAuditLog = {
    id: string;
    userName: string;
    role: string;
    action: string;
    entity: string;
    entityId: string;
    timestamp: string;
    ip?: string | null;
  };
  const [mobilePayouts, setMobilePayouts] = useState<MobilePayout[]>([]);
  const [mobileAuditLogs, setMobileAuditLogs] = useState<MobileAuditLog[]>([]);
  const [advancedSectionLoading, setAdvancedSectionLoading] = useState(false);
  const [advancedSectionError, setAdvancedSectionError] = useState('');
  const [advancedRefreshKey, setAdvancedRefreshKey] = useState(0);
  const [intelligence, setIntelligence] = useState<{
    summary: { critical: number; warning: number; info: number };
    alerts: Array<{ severity: 'critical' | 'warning' | 'info'; type: string; message: string; entityId?: string | null }>;
  } | null>(null);
  const [intelligenceStale, setIntelligenceStale] = useState(false);
  const [focusedAlert, setFocusedAlert] = useState<{
    severity: 'critical' | 'warning' | 'info';
    type: string;
    message: string;
    entityId?: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let timer: number | undefined;
    let retryDelay = 60_000;
    const schedule = (delay: number) => {
      if (cancelled || document.visibilityState !== 'visible') return;
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(), delay);
    };
    const load = async () => {
      if (cancelled || inFlight || document.visibilityState !== 'visible') return;
      inFlight = true;
      try {
        const data = await apiGet<{ success: boolean; summary: { critical: number; warning: number; info: number }; alerts: Array<{ severity: 'critical' | 'warning' | 'info'; type: string; message: string; entityId?: string | null }> }>('/api/admin/operations/intelligence');
        if (!cancelled && data.success) {
          setIntelligence(data);
          setIntelligenceStale(false);
          retryDelay = 60_000;
        }
      } catch (error) {
        if (!cancelled) setIntelligenceStale(true);
        if (!(error instanceof ApiError && error.status === 429)) {
          console.error('[admin-mobile-intelligence]', error);
        }
        retryDelay = Math.min(
          15 * 60_000,
          Math.max(retryDelay * 2, (error instanceof ApiError ? error.retryAfter ?? 0 : 0) * 1000)
        );
      } finally {
        inFlight = false;
      }
      schedule(retryDelay);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (timer !== undefined) window.clearTimeout(timer);
        void load();
      } else if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    void load();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'finance' && activeTab !== 'audit_logs') return;
    let cancelled = false;
    setAdvancedSectionLoading(true);
    setAdvancedSectionError('');
    const request = activeTab === 'finance'
      ? apiGet<{ payouts: MobilePayout[] }>('/api/admin/payouts').then(result => {
          if (!cancelled) setMobilePayouts(result.payouts);
        })
      : apiGet<{ logs: MobileAuditLog[] }>('/api/admin/audit-logs').then(result => {
          if (!cancelled) setMobileAuditLogs(result.logs);
        });
    request.catch(error => {
      if (!cancelled) setAdvancedSectionError(error instanceof Error ? error.message : '管理数据读取失败');
    }).finally(() => {
      if (!cancelled) setAdvancedSectionLoading(false);
    });
    return () => { cancelled = true; };
  }, [activeTab, advancedRefreshKey]);

  const pendingOrders = orders.filter(o => o.status === 'placed' || o.status === 'picking');
  const pendingCustomers = customers.filter(c => c.status === 'pending');
  const pendingMerchants = merchants.filter(m => !m.isVerified);
  const pendingProducts = products.filter(p => p.lifecycleStatus === 'pending_review' || p.visibility === 'private');
  const lowStockSkuCount = products.reduce((count, product) => count + product.skus.filter(sku => (sku.stockCentral - (sku.reserved || 0)) < 15).length, 0);

  return (
    <div id="platform-admin-mobile-root" className="min-h-screen bg-neutral-100 text-neutral-900 pb-20 select-none">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-40 bg-neutral-900 text-white px-4 py-3 shadow-md flex items-center justify-between safe-area-top">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-200 font-bold text-xs">
            ADM
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-widest uppercase font-mono text-white">ADMIN MOBILE</span>
              <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 text-[10px] font-bold">平台总控</span>
            </div>
            <p className="text-[11px] text-neutral-400">RUDA Pronto Moda 全网运营中枢</p>
          </div>
        </div>

        {onSwitchToDesktop && (
          <button
            onClick={() => onSwitchToDesktop()}
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>切换电脑端</span>
          </button>
        )}
      </header>

      <nav aria-label="总后台分区" className="sticky top-[58px] z-30 grid grid-cols-2 gap-1 border-b border-neutral-200 bg-white p-2">
        {ADMIN_AREAS.map(area => (
          <button
            key={area.key}
            type="button"
            aria-pressed={adminArea === area.key}
            onClick={() => selectMobileArea(area.key)}
            className={`rounded-lg px-2 py-2 text-xs font-bold ${adminArea === area.key ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'}`}
          >
            {area.label}
          </button>
        ))}
      </nav>
      <div className="sticky top-[106px] z-30 border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-[10px] text-neutral-500">
        当前目录：{ADMIN_AREAS.find(area => area.key === adminArea)?.description}
      </div>
      <nav aria-label={`${ADMIN_AREAS.find(area => area.key === adminArea)?.label}导航`} className="sticky top-[136px] z-30 max-h-44 overflow-y-auto border-b border-neutral-200 bg-white px-2 py-1">
        {ADMIN_NAV_GROUPS.filter(group => group.area === adminArea).map(group => (
          <section key={group.label} className="py-1">
            <h2 className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-neutral-400">{group.label}</h2>
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {group.items.map(item => {
                const mobileTab = getMobileTab(item.key);
                const isActive = selectedAdminTab === item.key;
                const badge = item.key === 'orders' ? pendingOrders.length
                  : item.key === 'merchants' ? pendingMerchants.length
                    : item.key === 'customers' ? pendingCustomers.length
                      : item.key === 'products' ? pendingProducts.length
                        : item.key === 'inventory' ? lowStockSkuCount : 0;
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => {
                      if (mobileTab) {
                        setAdminArea(group.area);
                        setSelectedAdminTab(item.key);
                        setActiveTab(mobileTab);
                      } else {
                        onSwitchToDesktop?.(item.key);
                      }
                    }}
                    className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-semibold ${isActive ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'}`}
                  >
                    <item.icon className="h-3 w-3" />
                    {item.label}
                    {badge > 0 && <span className="rounded-full bg-neutral-300 px-1 text-[9px] text-neutral-900">{badge > 99 ? '99+' : badge}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      {/* Main Tab Content */}
      <div className="p-4 space-y-3">
        {activeTab === 'gallery' && <MerchantGallery mode="admin" onBack={() => setActiveTab('orders')} />}
        {activeTab === 'fashion_community' && <AdminFashionCommunity />}
        {activeTab === 'database_center' && <AdminDatabaseCenter />}
        {activeTab === 'merchant_support_settings' && <AdminMerchantSupport mode="settings" />}
        {activeTab === 'risk_monitor' && <AdminRiskMonitor />}
        {(activeTab === 'finance' || activeTab === 'audit_logs') && (
          <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs">
            <span className="font-semibold text-neutral-700">
              {activeTab === 'finance' ? '平台财务结算' : activeTab === 'audit_logs' ? '平台操作审计' : '平台通知事件'}
            </span>
            <button
              type="button"
              onClick={() => setAdvancedRefreshKey(current => current + 1)}
              className="inline-flex items-center gap-1 text-neutral-600"
              aria-label="刷新"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${advancedSectionLoading ? 'animate-spin' : ''}`} />
              {advancedSectionLoading ? '读取中' : '刷新'}
            </button>
          </div>
        )}
        {advancedSectionError && (activeTab === 'finance' || activeTab === 'audit_logs') && (
          <div className="rounded-lg border border-neutral-300 bg-neutral-100 p-3 text-xs text-neutral-800">{advancedSectionError}</div>
        )}
        {activeTab === 'finance' && (
          <section className="space-y-2">
            <p className="rounded-lg border border-neutral-200 bg-white p-3 text-[11px] leading-5 text-neutral-600">未集成自动转账。此处只显示手工维护的结算状态；只有登记参考号、凭证、操作员和时间后才显示为已登记，系统不验证资金到账。</p>
            {mobilePayouts.map(payout => (
              <article key={payout.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-neutral-900">{payout.merchantName}</div>
                    <div className="mt-1 text-[10px] text-neutral-500">{payout.period} · {new Date(payout.createdAt).toLocaleDateString(getIntlLocale(lang))}</div>
                  </div>
                  <span className="border border-neutral-300 bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-700">{payout.status === 'paid' ? (payout.settlementReference && payout.settlementProof ? '已登记人工结算' : '历史状态待核验') : payout.status === 'processing' ? '人工结算处理中' : payout.status === 'failed' ? '人工结算记录失败' : '待结算'}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded bg-neutral-50 p-2"><div className="text-neutral-500">销售额</div><div className="mt-1 font-bold">€{payout.grossSales.toFixed(2)}</div></div>
                  <div className="rounded bg-neutral-50 p-2"><div className="text-neutral-500">应结金额</div><div className="mt-1 font-bold text-neutral-900">€{payout.netPayout.toFixed(2)}</div></div>
                </div>
                {payout.status === 'paid' && payout.settlementReference && payout.settlementProof && <div className="mt-2 break-words border-t border-neutral-100 pt-2 text-[10px] text-neutral-600">参考号：{payout.settlementReference}<br />凭证：{payout.settlementProof}<br />{payout.settledBy || '—'} · {payout.settledAt ? new Date(payout.settledAt).toLocaleString(getIntlLocale(lang)) : '—'}</div>}
                {payout.status === 'paid' && (!payout.settlementReference || !payout.settlementProof) && <p className="mt-2 border-t border-neutral-100 pt-2 text-[10px] text-neutral-600">此历史记录没有人工结算凭证，请在桌面财务页核对。</p>}
              </article>
            ))}
            {!advancedSectionLoading && !advancedSectionError && mobilePayouts.length === 0 && <p className="rounded-xl bg-white p-4 text-center text-xs text-neutral-500">暂无结算记录</p>}
          </section>
        )}
        {activeTab === 'audit_logs' && (
          <section className="space-y-2">
            {mobileAuditLogs.map(log => (
              <article key={log.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-bold text-neutral-900">{log.action}</div>
                  <time className="shrink-0 text-[10px] text-neutral-500">{new Date(log.timestamp).toLocaleString(getIntlLocale(lang))}</time>
                </div>
                <div className="mt-1 text-[10px] text-neutral-600">{log.userName} · {log.role} · {log.entity}</div>
                <div className="mt-1 break-all font-mono text-[10px] text-neutral-500">{log.entityId || '—'}{log.ip ? ` · ${log.ip}` : ''}</div>
              </article>
            ))}
            {!advancedSectionLoading && !advancedSectionError && mobileAuditLogs.length === 0 && <p className="rounded-xl bg-white p-4 text-center text-xs text-neutral-500">暂无操作记录</p>}
          </section>
        )}
        {activeTab === 'notifications' && (
          <AdminNotificationEvents />
        )}
        {activeTab === 'settings' && (
          <div className="space-y-3">
            <section className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-neutral-900"><Settings2 className="h-4 w-4" />系统配置</div>
              <p className="mt-2 text-xs leading-5 text-neutral-600">支付渠道与管理员安全等平台级配置统一在平台设置中心管理。移动页面不重复展示配置表单；敏感凭证只在服务端处理。</p>
              {onSwitchToDesktop && <button type="button" onClick={() => onSwitchToDesktop('settings')} className="mt-3 w-full rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white">打开完整平台设置</button>}
            </section>
          </div>
        )}
        {intelligence && (
          <section className="bg-white rounded-xl border border-neutral-200 p-3 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                <AlertTriangle className="w-3.5 h-3.5 text-neutral-800" /> 经营待办提醒
              </div>
              <span className="text-[10px] text-neutral-500">{intelligenceStale ? '显示最近成功数据 · 正在退避重试' : '页面可见时自动刷新'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="rounded-lg bg-neutral-200 p-2 text-center"><div className="text-[10px] text-neutral-900">严重</div><div className="font-bold text-neutral-900">{intelligence.summary.critical}</div></div>
              <div className="rounded-lg bg-neutral-100 p-2 text-center"><div className="text-[10px] text-neutral-700">预警</div><div className="font-bold text-neutral-700">{intelligence.summary.warning}</div></div>
              <div className="rounded-lg bg-neutral-50 p-2 text-center"><div className="text-[10px] text-neutral-600">待办</div><div className="font-bold text-neutral-600">{intelligence.summary.info}</div></div>
            </div>
            {intelligence.alerts.slice(0, 5).map(alert => (
              <button
                type="button"
                key={`${alert.type}-${alert.entityId || alert.message}`}
                onClick={() => {
                  setFocusedAlert(alert);
                  if (alert.type === 'low_stock' || alert.type === 'inventory_stockout') setActiveTab('inventory_alert');
                  else if (alert.type === 'customer_review') setActiveTab('customers');
                  else if (alert.type === 'merchant_review') setActiveTab('merchants');
                  else if (alert.type === 'order' || alert.type === 'refund' || alert.type === 'fulfillment' || alert.type === 'payment_failed') setActiveTab('orders');
                  else if (alert.type === 'payout' || alert.type === 'settlement_anomaly') setActiveTab('notifications');
                }}
                className="flex w-full items-center gap-2 py-1.5 border-t border-neutral-100 text-[11px] text-left hover:bg-neutral-50"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${alert.severity === 'critical' ? 'bg-neutral-950' : alert.severity === 'warning' ? 'bg-neutral-600' : 'bg-neutral-300'}`} />
                <span className="text-neutral-700 truncate">{alert.message}</span>
                {alert.entityId && <span className="ml-auto shrink-0 text-[10px] text-neutral-400">处理</span>}
              </button>
            ))}
            {focusedAlert && (
              <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-neutral-900">已定位待办对象</span>
                  <button type="button" onClick={() => setFocusedAlert(null)} className="text-neutral-500">关闭</button>
                </div>
                <p className="mt-1 text-neutral-700">{focusedAlert.message}</p>
                {focusedAlert.entityId && <p className="mt-1 font-mono text-[10px] text-neutral-500">对象 ID: {focusedAlert.entityId}</p>}
                <p className="mt-1 text-neutral-500">已进入对应处理界面，请核对对象后使用现有审核/状态操作。</p>
              </div>
            )}
          </section>
        )}
        {/* 1. 订单 */}
        {activeTab === 'orders' && (
          <div className="space-y-2.5 animate-fadeIn">
            <div className="text-xs font-bold text-neutral-600">全平台实时订单流 ({orders.length})</div>
            {orders.map((o) => (
              <div key={o.id} className={`bg-white rounded-xl p-3 border shadow-2xs space-y-1.5 ${focusedAlert?.entityId === o.id ? 'border-neutral-950 ring-2 ring-neutral-200' : 'border-neutral-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-neutral-900">{o.orderNo}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    o.status === 'shipped' ? 'bg-neutral-200 text-neutral-800' :
                    o.status === 'delivered' ? 'bg-neutral-100 text-neutral-700' :
                    'bg-neutral-50 text-neutral-600'
                  }`}>
                    {o.status === 'shipped' ? '已发货' : o.status === 'delivered' ? '已签收' : '待处理'}
                  </span>
                </div>
                <div className="text-xs text-neutral-600 flex justify-between">
                  <span>批发商: {o.companyName}</span>
                  <span className="font-bold text-neutral-900">€{o.totalAmount.toFixed(2)}</span>
                </div>
                {o.refundStatus === 'requested' && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => approveReturn(o.id, o.refundAmount)} className="flex-1 py-1.5 bg-neutral-900 text-white text-xs font-bold rounded-lg cursor-pointer">批准退款</button>
                    <button onClick={() => rejectReturn(o.id)} className="flex-1 py-1.5 bg-neutral-100 text-neutral-700 text-xs font-bold rounded-lg cursor-pointer">拒绝退货</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 2. 生产商审核 */}
        {activeTab === 'merchants' && (
          <div className="space-y-2.5 animate-fadeIn">
            <div className="text-xs font-bold text-neutral-600">生产商资质管理 ({merchants.length})</div>
            {merchants.map((m) => (
              <div key={m.id} className="bg-white rounded-xl p-3 border border-neutral-200 shadow-2xs space-y-2">
                <div className="flex items-center gap-3">
                  <img src={m.logo} alt={m.name} className="w-10 h-10 rounded-lg object-cover bg-neutral-100" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-neutral-900 block truncate">{m.name}</span>
                    <span className="text-[11px] text-neutral-500 block">{m.city}, {m.country} · {m.showroomArea}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 text-[10px] font-bold">
                    正常经营
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. 客户审核 */}
        {activeTab === 'customers' && (
          <div className="space-y-2.5 animate-fadeIn">
            <div className="text-xs font-bold text-neutral-600">零售商注册审批 ({customers.length})</div>
            {customers.map((c) => (
              <div key={c.id} className={`bg-white rounded-xl p-3 border shadow-2xs space-y-2 ${focusedAlert?.entityId === c.id ? 'border-neutral-950 ring-2 ring-neutral-200' : 'border-neutral-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-neutral-900">{c.companyName}</span>
                    <span className="text-[11px] text-neutral-500 block">税号: {c.vatNumber} ({c.country})</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    c.status === 'approved' ? 'bg-neutral-100 text-neutral-700' : 'bg-neutral-200 text-neutral-900'
                  }`}>
                    {c.status === 'approved' ? '已通过认证' : '待合规审核'}
                  </span>
                </div>

                {c.status === 'pending' && (
                  <div className="flex gap-2 pt-1 border-t border-neutral-100">
                    <button
                      onClick={() => reviewCustomer(c.id, 'approved', 'tier_vip')}
                      className="flex-1 py-1.5 bg-neutral-900 text-white text-xs font-bold rounded-lg"
                    >
                      通过审核并授信
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 4. 新品审核 */}
        {activeTab === 'product_audit' && (
          <div className="space-y-2.5 animate-fadeIn">
            <div className="text-xs font-bold text-neutral-600">首发新品与授权专属商品准入</div>
            {pendingProducts.map((p) => (
              <div key={p.id} className="bg-white rounded-xl p-3 border border-neutral-200 shadow-2xs flex items-center gap-3">
                <img src={p.images[0]} alt={p.name} className="w-12 h-12 rounded-lg object-cover bg-neutral-100" />
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs font-bold text-neutral-900 block truncate">{p.styleNo}</span>
                  <span className="text-[11px] text-neutral-500 block truncate">{p.name}</span>
                  <span className="text-[10px] font-bold text-neutral-700">意式原产准入合规</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 5. 库存预警 */}
        {activeTab === 'inventory_alert' && (
          <div className="space-y-2.5 animate-fadeIn">
            <div className="bg-neutral-100 border border-neutral-300 rounded-xl p-3 text-xs text-neutral-900">
              <span className="font-bold block">现货库存断码预警雷达</span>
              <span className="text-[11px] text-neutral-700">以下 {lowStockSkuCount} 个 SKU 总可用库存已低于安全线 (15件)。</span>
            </div>
            <div className="bg-white rounded-xl p-3 border border-neutral-200 shadow-2xs space-y-2">
              {products.flatMap(product => product.skus
                .filter(sku => (sku.stockCentral - (sku.reserved || 0)) < 15)
                .slice(0, 10)
                .map(sku => (
                  <div key={sku.sku} className={`flex justify-between text-xs font-bold ${focusedAlert?.entityId === product.id ? 'rounded bg-neutral-100 px-1' : ''}`}>
                    <span>{product.styleNo} · {sku.sku}</span>
                    <span className="text-neutral-700">可售 {Math.max(0, sku.stockCentral - (sku.reserved || 0))} 件</span>
                  </div>
                )))}
              {lowStockSkuCount === 0 && <p className="text-xs text-neutral-600">当前没有低库存 SKU。</p>}
            </div>
          </div>
        )}

        {/* 6. 预约 */}
        {activeTab === 'appointments' && (
          <div className="space-y-2.5 animate-fadeIn">
            <div className="text-xs font-bold text-neutral-600">展厅到店看货预约</div>
            {appointments.map((a) => (
              <div key={a.id} className="bg-white rounded-xl p-3 border border-neutral-200 shadow-2xs space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>{a.companyName}</span>
                  <span className="text-neutral-500">{a.date} {a.timeSlot ?? a.time}</span>
                </div>
                <div className="text-[11px] text-neutral-600">预约展厅: {a.showroomName} ({a.visitorCount}人)</div>
                <span className="inline-flex rounded-full border border-neutral-300 bg-neutral-50 px-2 py-0.5 text-[10px] text-neutral-700">{{ pending: '待确认', confirmed: '已确认', completed: '已完成', cancelled: '已取消', no_show: '爽约' }[a.status]}</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
