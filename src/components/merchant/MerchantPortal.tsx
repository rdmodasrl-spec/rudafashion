import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { 
  Building2, 
  Package, 
  ShoppingBag, 
  Truck, 
  Layers, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  DollarSign, 
  AlertTriangle, 
  Search, 
  Plus, 
  Home,
  ArrowRightLeft, 
  Clock, 
  UserCheck, 
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Barcode,
  ChevronDown,
  ArrowUp,
  Globe,
  SlidersHorizontal,
  FileSpreadsheet,
  Eye,
  RefreshCw,
  Maximize2,
  Minimize2,
  Send,
  X,
  Boxes,
  ClipboardCheck,
  Receipt,
  Smartphone,
  FolderOpen,
  MessageCircle,
  Headphones,
  Pencil,
  Trash2,
  ImagePlus,
  Bell,
  Store,
  BarChart3,
  UserRound,
  Grid2X2,
  List,
  Menu,
  BookOpen,
  FileText,
  ShoppingCart,
  Bot
} from 'lucide-react';
import { useB2B } from '../../context/B2BContext';
import { PasswordChangeForm } from '../auth/PasswordChangeForm';
import { LANGUAGE_OPTIONS, getIntlLocale } from '../../i18n/translations';
import { PasswordInput } from '../common/PasswordInput';
import { Product, ProductMedia, SKUItem, Order, VaultAccessRequest, StockTransferRecord, ProductVisibility } from '../../types/b2b';
import { MerchantMobileApp } from './MerchantMobileApp';
import { PaymentSettingsCard } from '../common/PaymentSettingsCard';
import { ShareButton } from '../common/ShareButton';
import { getMerchantStoreUrl } from '../../utils/share';
import { getProductZone, getProductZoneUpdates } from '../../utils/productZone';
import { SmartMediaUploader } from './SmartMediaUploader';
import { MerchantGallery } from './MerchantGallery';
import { MerchantSupportChat } from './MerchantSupportChat';
import { MerchantAiEmployees } from './MerchantAiEmployees';
import { MerchantAiReports } from './MerchantAiReports';
import { MerchantAiOrderDrafts } from './MerchantAiOrderDrafts';
import type { GrowthSection } from './MerchantGrowthWorkspace';
import type { ContentKind } from './MerchantContentWorkspace';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../../api/client';
import { DEFAULT_MERCHANT_BANNER, DEFAULT_MERCHANT_LOGO, merchantMediaUrl } from '../../utils/merchantMedia';
import { parseCsvRecords } from '../../utils/csv';

const MerchantGrowthWorkspace = lazy(() =>
  import('./MerchantGrowthWorkspace').then(module => ({ default: module.MerchantGrowthWorkspace }))
);
const MerchantContentWorkspace = lazy(() =>
  import('./MerchantContentWorkspace').then(module => ({ default: module.MerchantContentWorkspace }))
);
const MerchantProcurementWorkspace = lazy(() =>
  import('./MerchantProcurementWorkspace').then(module => ({ default: module.MerchantProcurementWorkspace }))
);
const MerchantSmartPos = lazy(() =>
  import('./MerchantSmartPos').then(module => ({ default: module.MerchantSmartPos }))
);

type MerchantSettingsEntryId =
  | 'general' | 'plan' | 'billing' | 'users' | 'roles' | 'security' | 'payments'
  | 'checkout' | 'customer-accounts' | 'shipping' | 'taxes' | 'locations' | 'apps'
  | 'sales-channels' | 'domains' | 'customer-events' | 'notifications' | 'custom-data'
  | 'languages' | 'privacy' | 'policies';

type MerchantSettingsNotice = { title: string; body: string; distinction?: string };
type MerchantPaymentStatus = {
  provider: 'manual' | 'stripe' | 'adyen' | 'custom';
  enabled: boolean;
  credentialsConfigured: boolean;
  supportsPayments: boolean;
  supportsRefunds: boolean;
  mode: 'placeholder' | 'configured';
  onlineCheckoutEnabled: boolean;
};
type MerchantPayPalStatus = {
  configured: boolean;
  enabled: boolean;
  environment: 'sandbox' | 'live' | null;
  clientIdHint: string | null;
};
type MerchantStripeStatus = {
  configured: boolean;
  enabled: boolean;
  accountId: string | null;
  livemode: boolean | null;
};
type MerchantSolanaStatus = {
  configured: boolean;
  enabled: boolean;
  walletAddress: string | null;
};

const LazyPrivySolanaWalletButton = lazy(() => import('./PrivySolanaWalletButton'));

const MerchantWorkspaceHeader: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, description, icon, action }) => (
  <header className="merchant-home-intro relative overflow-hidden rounded-3xl border border-neutral-200 bg-[radial-gradient(ellipse_at_85%_0%,rgba(209,250,229,0.7),transparent_38%),linear-gradient(145deg,#fff_18%,#f8fafc_72%,#eef2ff_100%)] p-4 shadow-sm sm:p-6">
    <div className="pointer-events-none absolute -right-16 -top-24 h-52 w-52 rounded-full bg-emerald-100/70 blur-3xl" />
    <div className="relative flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 shadow-sm">
          <span className="text-emerald-700">{icon}</span>RUDA 商家工作台
        </div>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">{title}</h1>
        <p className="mt-1.5 max-w-3xl text-xs leading-5 text-neutral-600 sm:text-sm">{description}</p>
      </div>
      {action && <div className="relative shrink-0">{action}</div>}
    </div>
  </header>
);

export const MerchantPortal: React.FC = () => {
  const [isMobileMode, setIsMobileMode] = useState<boolean>(() => window.innerWidth < 768);
  const { 
    merchants,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    orders,
    vaultRequests,
    allCustomers,
    transfers = [],
    payouts = [],
    addNotification,
    updateMerchant,
    setCurrentView,
    authMerchantId,
    lang,
    languagePreference,
    setLang,
    setAutoLanguage,
    t, localizeCopy
  } = useB2B();

  const isIt = lang === 'it';
  const navItemClass = (active: boolean) => `inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
    active
      ? 'bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-200'
      : 'text-neutral-600 hover:bg-white hover:text-neutral-950 hover:shadow-sm'
  }`;
  const settingsSubItemClass = (active: boolean) => `flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold transition ${active ? 'bg-emerald-50 text-emerald-800' : 'text-neutral-600 hover:bg-white hover:text-neutral-950'}`;

  // Active sub-tab inside Merchant Portal
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'pos' | 'products' | 'sku_matrix' | 'materials' | 'production' | 'inventory' | 'procurement' | 'orders' | 'vault_requests' | 'customers' | 'growth' | 'content' | 'finance' | 'profile' | 'settings' | 'gallery' | 'support' | 'ai_employees'
  >('dashboard');
  const [dashboardNavSection, setDashboardNavSection] = useState<'home' | 'analytics'>('home');
  const [growthSection, setGrowthSection] = useState<GrowthSection>('overview');
  const [contentSection, setContentSection] = useState<ContentKind>('metaobject');
  const [assistantUsesPageContext, setAssistantUsesPageContext] = useState(true);
  const [sidebarNavExpanded, setSidebarNavExpanded] = useState<'dashboard' | 'products' | 'customers' | 'growth' | 'store' | 'settings' | null>(null);
  const [moreNavExpanded, setMoreNavExpanded] = useState(false);
  const [settingsSubsection, setSettingsSubsection] = useState<'general' | 'rules' | 'payments' | 'notifications' | 'mobile' | 'team' | 'roles' | 'language' | 'info'>('general');
  const [activeSettingsEntry, setActiveSettingsEntry] = useState<MerchantSettingsEntryId>('general');
  const [settingsSearch, setSettingsSearch] = useState('');
  const [settingsNotice, setSettingsNotice] = useState<MerchantSettingsNotice | null>(null);
  const [merchantPaymentStatus, setMerchantPaymentStatus] = useState<MerchantPaymentStatus | null>(null);
  const [merchantPaymentStatusLoading, setMerchantPaymentStatusLoading] = useState(false);
  const [merchantPaymentStatusError, setMerchantPaymentStatusError] = useState('');
  const [merchantPaymentStatusRefresh, setMerchantPaymentStatusRefresh] = useState(0);
  const [merchantPayPalStatus, setMerchantPayPalStatus] = useState<MerchantPayPalStatus | null>(null);
  const [paypalCredentialsForm, setPaypalCredentialsForm] = useState({ clientId: '', clientSecret: '', environment: 'sandbox' as 'sandbox' | 'live' });
  const [paypalCredentialsBusy, setPaypalCredentialsBusy] = useState(false);
  const [merchantStripeStatus, setMerchantStripeStatus] = useState<MerchantStripeStatus | null>(null);
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeCredentialsBusy, setStripeCredentialsBusy] = useState(false);
  const [merchantSolanaStatus, setMerchantSolanaStatus] = useState<MerchantSolanaStatus | null>(null);
  const [solanaWalletAddress, setSolanaWalletAddress] = useState('');
  const [solanaConfigBusy, setSolanaConfigBusy] = useState(false);
  const openSidebarNav = (section: NonNullable<typeof sidebarNavExpanded>) => setSidebarNavExpanded(section);
  const toggleSidebarNav = (section: NonNullable<typeof sidebarNavExpanded>) => setSidebarNavExpanded(current => current === section ? null : section);
  const productNavIsExpanded = sidebarNavExpanded === 'products';
  const customerNavIsExpanded = sidebarNavExpanded === 'customers';
  const growthNavIsExpanded = sidebarNavExpanded === 'growth';
  const storeNavIsExpanded = sidebarNavExpanded === 'store';
  const dashboardNavIsExpanded = sidebarNavExpanded === 'dashboard';
  const moreNavIsExpanded = moreNavExpanded;
  const productNavIsActive = ['products', 'sku_matrix', 'inventory', 'production', 'materials', 'procurement'].includes(activeTab);
  const customerNavIsActive = activeTab === 'customers' || activeTab === 'vault_requests';
  const storeNavIsActive = ['content', 'gallery', 'profile'].includes(activeTab);
  const [orderView, setOrderView] = useState<'orders' | 'drafts'>('orders');
  useEffect(() => {
    if (['products', 'sku_matrix', 'inventory', 'production', 'materials', 'procurement'].includes(activeTab)) openSidebarNav('products');
    else if (activeTab === 'vault_requests') openSidebarNav('customers');
    else if (activeTab === 'growth') openSidebarNav('growth');
    else if (['gallery', 'profile', 'content'].includes(activeTab)) openSidebarNav('store');
    else if (activeTab === 'settings') setSidebarNavExpanded(null);
    else if (activeTab === 'dashboard' && dashboardNavSection === 'analytics') openSidebarNav('dashboard');
    if (['sku_matrix', 'inventory', 'production', 'materials', 'procurement', 'vault_requests', 'content', 'gallery', 'support', 'ai_employees', 'settings', 'profile'].includes(activeTab)
      || (activeTab === 'dashboard' && dashboardNavSection === 'analytics')) setMoreNavExpanded(true);
  }, [activeTab, dashboardNavSection, growthSection]);
  const assistantContextLabel = activeTab === 'dashboard'
    ? dashboardNavSection === 'analytics' ? (localizeCopy('分析', 'Analisi')) : (localizeCopy('主页', 'Home'))
    : ({
      products: localizeCopy('产品', 'Prodotti'),
      pos: localizeCopy('智能 POS', 'POS intelligente'),
      sku_matrix: localizeCopy('规格', 'Varianti SKU'),
      materials: localizeCopy('物料', 'Materiali'),
      procurement: localizeCopy('成衣采购', 'Acquisti'),
      production: localizeCopy('生产', 'Produzione'),
      inventory: localizeCopy('库存', 'Scorte'),
      orders: localizeCopy('订单', 'Ordini'),
      vault_requests: localizeCopy('授权', 'Richieste private'),
      customers: localizeCopy('客户', 'Clienti'),
      growth: localizeCopy('增长', 'Crescita'),
      content: localizeCopy('内容', 'Contenuti'),
      finance: localizeCopy('财务', 'Finanza'),
      profile: localizeCopy('店铺', 'Vetrina'),
      settings: localizeCopy('设置', 'Impostazioni'),
      gallery: localizeCopy('内容', 'Contenuti media'),
      support: localizeCopy('客服', 'Supporto RUDA'),
      ai_employees: localizeCopy('AI 员工', 'Team AI')
    } as const)[activeTab];
  const assistantContextScope = activeTab === 'dashboard'
    ? dashboardNavSection
    : activeTab === 'content'
      ? contentSection
      : activeTab === 'growth'
        ? growthSection
        : activeTab === 'orders'
          ? orderView
          : 'overview';
  const assistantScopeLabel = activeTab === 'content'
    ? ({ metaobject: '元对象', page: '页面', blog: '博客', menu: '菜单' } as const)[contentSection]
    : activeTab === 'growth'
      ? ({ overview: '增长概览', autopilot: 'Autopilot', campaigns: '宣传活动' } as const)[growthSection]
      : activeTab === 'orders'
        ? orderView === 'drafts' ? '草稿订单' : '订单列表'
        : activeTab === 'dashboard' && dashboardNavSection === 'analytics' ? '经营分析' : '';
  const assistantRequestContext = assistantUsesPageContext
    ? activeTab === 'dashboard'
      ? dashboardNavSection === 'analytics' ? 'analytics' : 'dashboard'
      : activeTab === 'ai_employees'
        ? 'dashboard'
      : activeTab === 'procurement'
        ? 'materials'
        : activeTab === 'pos'
          ? 'orders'
        : activeTab
    : 'dashboard';
  const assistantRequestScope = assistantUsesPageContext ? assistantContextScope : 'overview';
  const assistantContextKey = `${assistantRequestContext}:${assistantRequestScope}`;
  const defaultAssistantSuggestions = isIt
    ? activeTab === 'pos'
      ? ['Scansiona un codice a barre e prepara una vendita', 'Trova articoli disponibili in magazzino', 'Controlla sconti e plafond del cliente']
      : activeTab === 'orders'
      ? ['Quali ordini sono ancora da evadere?', 'Riassumi pagamenti e spedizioni in sospeso', 'Prepara una bozza di risposta per un reso']
      : activeTab === 'inventory'
        ? ['Quali SKU sono sotto scorta?', 'Quali articoli sono fermi da più tempo?', 'Suggerisci quantità di riordino da verificare']
        : activeTab === 'finance'
          ? ['Riassumi i saldi e i payout recenti', 'Quali payout sono in attesa?', 'Quali dati mancano per verificare il conto?']
          : activeTab === 'customers'
            ? ['Chi sono i clienti più importanti?', 'Quali clienti abituali non ordinano da 60 giorni?', 'Prepara un messaggio per i clienti inattivi']
            : activeTab === 'growth'
              ? ['Analizza le vendite degli ultimi 30 giorni', 'Suggerisci tattiche di crescita basate sui miei prodotti', 'Scrivi una bozza per i nuovi arrivi']
              : activeTab === 'content'
                ? ['Progetta i campi per una scheda materiale', 'Prepara una bozza per la pagina Chi siamo', 'Suggerisci una struttura di menu per il negozio']
                : activeTab === 'products'
                  ? ['Cerca un prodotto per codice', 'Quali prodotti hanno dati incompleti?', 'Prepara una descrizione prodotto da verificare']
                  : activeTab === 'sku_matrix'
                    ? ['Come strutturare colori e taglie?', 'Controlla il formato degli SKU', 'Quali campi includere in una variante?']
                    : activeTab === 'production'
                      ? ['Quali ordini di produzione sono aperti?', 'Riassumi la produzione in corso', 'Spiegami come registrare un controllo qualità']
                      : activeTab === 'materials'
                        ? ['Quali materiali sono sotto la scorta minima?', 'Prepara una lista di materiali da riordinare', 'Spiegami i movimenti di magazzino materiali']
                        : activeTab === 'vault_requests'
                          ? ['Quali richieste di accesso attendono revisione?', 'Riassumi i criteri di una revisione sicura', 'Prepara una risposta per un acquirente']
                          : activeTab === 'profile'
                            ? ['Migliora la presentazione del negozio', 'Prepara una descrizione breve del brand', 'Quali informazioni mancano nella vetrina?']
                            : activeTab === 'settings'
                              ? ['Dove gestisco regole e notifiche?', 'Quali impostazioni sono solo per la vista mobile?', 'Spiega i ruoli e i permessi del team']
                              : ['Riassumi l’andamento recente del negozio', 'Quali sono le priorità operative?', 'Quali dati posso analizzare qui?']
    : activeTab === 'pos'
      ? ['扫描商品条码并快速开单', '按在售库存寻找可售商品', '查看客户折扣和账期额度']
      : activeTab === 'orders'
      ? ['列出待处理和待发货订单', '总结未付款订单与履约状态', '为退货申请准备一份回复草稿']
      : activeTab === 'inventory'
        ? ['哪些 SKU 库存偏低？', '哪些商品近期滞销？', '按近期销量给出待确认的补货建议']
        : activeTab === 'finance'
          ? ['总结近期结算和销售款', '有哪些结算款待处理？', '收款账户审核还缺什么？']
          : activeTab === 'customers'
            ? ['本店消费最高的客户是谁？', '找出 60 天没回购的老客户', '为沉睡客户准备一封回访草稿']
            : activeTab === 'growth'
              ? ['分析近 30 天本店营收', '根据热销商品准备增长战术', '为新品写一份营销文案草稿']
              : activeTab === 'content'
                ? ['为材质说明设计元对象字段', '起草一页关于我们页面', '规划店铺顶部菜单和页脚链接']
                : activeTab === 'products'
                  ? ['按款号查询商品', '哪些商品资料或图片不完整？', '为选中的商品准备一段描述草稿']
                  : activeTab === 'sku_matrix'
                    ? ['颜色和尺码应该如何拆分 SKU？', '检查某款 SKU 规格完整性', '条码和 SKU 的区别是什么？']
                    : activeTab === 'production'
                      ? ['有哪些未完成的生产工单？', '总结当前生产进度和异常', '生产报产后库存如何变化？']
                      : activeTab === 'materials'
                        ? ['哪些面辅料低于安全库存？', '生成一份待确认的补料清单', '解释这批物料库存流水']
                        : activeTab === 'vault_requests'
                          ? ['有哪些授权申请待审核？', '审核授权申请时要核对什么？', '为买手准备一份授权结果通知']
                          : activeTab === 'profile'
                            ? ['帮我润色店铺品牌介绍', '为店铺写一个简短标语', '检查店铺展示信息完整性']
                            : activeTab === 'settings'
                              ? ['员工权限在哪里管理？', '订单和授权通知在哪里设置？', '哪些设置会影响手机端首页？']
                              : activeTab === 'gallery'
                                ? ['为这组商品图片写简短说明', '制定品牌素材分类标签', '写一份素材使用说明草稿']
                                : activeTab === 'support'
                                  ? ['帮我整理要咨询客服的问题', '概括当前需要平台协助的事项', '怎么向 RUDA 客服提交请求？']
                                  : ['总结近期经营表现', '今天有哪些待处理事项？', '我可以让 AI 帮忙完成哪些工作？'];
  const assistantSuggestions = isIt
    ? activeTab === 'orders' && orderView === 'drafts'
      ? ['Rivedi i preventivi in bozza e dimmi quali dati mancano', 'Prepara una risposta per inviare un preventivo', 'Quali controlli fare prima di condividere una bozza?']
      : activeTab === 'growth' && growthSection === 'autopilot'
        ? ['Prepara una tattica email da approvare, senza inviarla', 'Quali dati dovrei controllare prima di approvare una campagna?', 'Scrivi un oggetto e un testo per il pubblico scelto']
        : activeTab === 'growth' && growthSection === 'campaigns'
          ? ['Prepara tre varianti di testo per la campagna', 'Adatta questo messaggio a un pubblico B2B', 'Crea una checklist per verificare una campagna']
          : activeTab === 'content' && contentSection === 'metaobject'
            ? ['Progetta i campi per scheda materiale e istruzioni di cura', 'Quali campi dovrebbero essere obbligatori?', 'Crea un esempio di voce con dati da completare']
            : activeTab === 'content' && contentSection === 'page'
              ? ['Scrivi una pagina Chi siamo senza inventare la storia del brand', 'Prepara una FAQ con i fatti che devo confermare', 'Ottimizza titolo e descrizione SEO della pagina']
              : activeTab === 'content' && contentSection === 'blog'
                ? ['Crea una scaletta per un articolo di moda B2B', 'Prepara una bozza articolo usando solo i fatti forniti', 'Suggerisci titolo, sommario e meta description']
                : activeTab === 'content' && contentSection === 'menu'
                  ? ['Progetta un menu per negozio e footer', 'Organizza queste categorie in una gerarchia chiara', 'Rivedi le etichette del menu per chiarezza']
                  : defaultAssistantSuggestions
    : activeTab === 'orders' && orderView === 'drafts'
      ? ['检查草稿报价中缺少哪些信息', '为客户准备一段发送报价时的说明', '分享草稿前需要核对哪些项目？']
      : activeTab === 'growth' && growthSection === 'autopilot'
        ? ['准备一条待审批的邮件营销战术，不要发送', '批准营销活动前应该先核对什么？', '为指定受众写邮件标题和正文草稿']
        : activeTab === 'growth' && growthSection === 'campaigns'
          ? ['为这次活动准备三种文案方向', '把这段文案改成适合 B2B 买手的版本', '为活动生成上线前检查清单']
          : activeTab === 'content' && contentSection === 'metaobject'
            ? ['为材质与护理说明设计字段结构', '哪些字段应该设置为必填？', '生成一条带待补充项的示例条目']
            : activeTab === 'content' && contentSection === 'page'
              ? ['写一页关于我们，但不要编造品牌历史', '根据已确认信息起草常见问题页面', '为当前页面生成 SEO 标题与描述']
              : activeTab === 'content' && contentSection === 'blog'
                ? ['生成一篇时尚 B2B 文章大纲', '仅用我提供的事实起草文章', '生成文章标题、摘要和 SEO 描述']
                : activeTab === 'content' && contentSection === 'menu'
                  ? ['规划店铺主导航和页脚菜单', '把这些商品分类整理成清晰层级', '检查菜单名称是否容易理解']
                  : defaultAssistantSuggestions;
  const [operationsIntelligence, setOperationsIntelligence] = useState<{
    summary: {
      gmv30d: number;
      orders30d: number;
      pendingFulfillment: number;
      pendingReturns: number;
      pendingTransfers: number;
      lowStockSkus: number;
      slowMoverSkus?: number;
      recentGmv?: number;
      previousGmv?: number;
      gmvTrend?: number;
    };
    replenishment: Array<{ variantId: string; styleNo: string; sku: string; availableQuantity: number; sold30d: number; daysCover: number | null; suggestedQuantity: number }>;
    slowMovers?: Array<{ variantId: string; styleNo: string; name: string; sku: string; availableQuantity: number; sold30d: number; daysCover: number | null }>;
    alerts: Array<{ severity: 'critical' | 'warning' | 'info'; type: string; message: string }>;
  } | null>(null);
  const [bankAccounts, setBankAccounts] = useState<Array<{
    id: string; accountHolder: string; iban: string; status: 'pending' | 'verified' | 'rejected'; rejectionReason?: string | null;
  }>>([]);
  const [bankAccountForm, setBankAccountForm] = useState({ accountHolder: '', iban: '' });
  const [bankAccountBusy, setBankAccountBusy] = useState(false);
  type ProductionBalance = {
    variantId: string; sku: string; product: { id: string; styleNo: string; name: string };
    location: { id: string; code: string; name: string };
  };
  type ProductionWorkOrder = {
    id: string; workOrderNo: string; plannedQuantity: number; completedQuantity: number; rejectedQuantity: number;
    status: string; priority: string; dueDate?: string | null;
    product: { styleNo: string; name: string }; variant: { sku: string; color?: string | null; size?: string | null };
    outputLocation: { code: string; name: string };
  };
  const [productionBalances, setProductionBalances] = useState<ProductionBalance[]>([]);
  const [productionWorkOrders, setProductionWorkOrders] = useState<ProductionWorkOrder[]>([]);
  const [productionBusy, setProductionBusy] = useState(false);
  const [productionForm, setProductionForm] = useState({ variantId: '', outputLocationId: '', plannedQuantity: 100, priority: 'normal', dueDate: '' });
  type Material = {
    id: string; code: string; name: string; category: string; unit: string; unitCost: number; reorderPoint: number;
    leadTimeDays: number; status: string; unitLocked: boolean; notes?: string | null; supplier?: { id: string; name: string } | null;
    onHandQuantity: number; availableQuantity: number;
    balances: Array<{ location: { code: string; name: string }; onHandQuantity: number; reservedQuantity: number }>;
  };
  type MaterialMovement = {
    id: string;
    quantity: number;
    movementType: string;
    referenceType?: string | null;
    referenceId?: string | null;
    operatorId?: string | null;
    note?: string | null;
    createdAt: string;
    material: { code: string; name: string; unit: string };
    location: { code: string; name: string };
  };
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialMovements, setMaterialMovements] = useState<MaterialMovement[]>([]);
  const [materialBusy, setMaterialBusy] = useState(false);
  const [materialInbound, setMaterialInbound] = useState({ materialId: '', quantity: '', locationCode: 'central', note: '' });
  const emptyMaterialForm = {
    code: '', name: '', category: 'fabric', unit: 'meter', unitCost: '0',
    reorderPoint: '0', leadTimeDays: '0', status: 'active', notes: ''
  };
  const [materialForm, setMaterialForm] = useState(emptyMaterialForm);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingMaterialUnitLocked, setEditingMaterialUnitLocked] = useState(false);
  type AssistantAction = { label: string; target: 'products' | 'sku_matrix' | 'inventory' | 'materials' | 'production' | 'orders' | 'vault_requests' | 'customers' | 'growth' | 'content' | 'finance' | 'profile' | 'settings' | 'gallery' | 'support' };
  type AssistantSummary = {
    gmv30d?: number; recentGmv?: number; previousGmv?: number; gmvTrend?: number; averageOrderValue?: number;
    periodLabel?: string; topSellingSkus?: Array<[string, number]>;
    pendingOrders?: number; stockouts?: number; openWorkOrders?: number; overdueWorkOrders?: number;
    pendingReturns?: number; pendingTransfers?: number; products?: number; customers?: number;
    pendingVaultRequests?: number; pendingPayouts?: number; bankAccountVerified?: boolean;
  };
  type AssistantProductCard = {
    id: string;
    styleNo: string;
    name: string;
    image: string;
    wholesalePrice: number;
    rrpPrice: number;
    moq: number;
    packSize: number;
    lifecycleStatus: string;
  };
  type AssistantTurn = { role: 'user' | 'assistant'; text: string; product?: AssistantProductCard };
  type AssistantConversation = { id: string; title: string; updatedAt: string; messageCount: number };
  type AssistantMemory = { id: string; content: string; updatedAt: string };
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantPanelOpen, setAssistantPanelOpen] = useState(false);
  const [assistantPanelExpanded, setAssistantPanelExpanded] = useState(false);
  const [selectedOrderDetailId, setSelectedOrderDetailId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [merchantQuotes, setMerchantQuotes] = useState<Array<{
    id: string; quoteNo: string; customerId: string; status: string; validUntil: string | null;
    totalQty: number; totalAmount: number; notes: string | null; createdAt: string; shareUrl: string;
    items: Array<{ id: string; productId: string; sku: string; styleNo: string; productName: string; color: string; size: string; quantity: number; unitPrice: number }>;
  }>>([]);
  const [merchantQuotesLoading, setMerchantQuotesLoading] = useState(false);
  const [merchantQuotesRefresh, setMerchantQuotesRefresh] = useState(0);
  const [draftQuoteOpen, setDraftQuoteOpen] = useState(false);
  const [draftQuoteBusy, setDraftQuoteBusy] = useState(false);
  const [draftQuoteCustomerId, setDraftQuoteCustomerId] = useState('');
  const [draftQuoteNotes, setDraftQuoteNotes] = useState('');
  const [draftQuoteItems, setDraftQuoteItems] = useState<Array<{ productId: string; sku: string; quantity: number }>>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'unfulfilled' | 'unpaid' | 'open' | 'complete'>('all');
  const [orderDateRange, setOrderDateRange] = useState<'7' | '30' | '90' | 'all'>('30');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<'all' | 'paid' | 'partially_refunded' | 'unpaid' | 'pending_credit' | 'pending_refund' | 'refunded'>('all');
  const [orderDeliveryFilter, setOrderDeliveryFilter] = useState<'all' | 'shipping' | 'showroom_pickup'>('all');
  const [orderSort, setOrderSort] = useState<'date' | 'amount' | 'quantity'>('date');
  const [orderSortDirection, setOrderSortDirection] = useState<'asc' | 'desc'>('desc');
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize, setOrderPageSize] = useState(20);
  const [orderAnalyticsGranularity, setOrderAnalyticsGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [orderAiQuestion, setOrderAiQuestion] = useState('');
  const [orderAiAnswerVisible, setOrderAiAnswerVisible] = useState(false);
  const [orderEditOpen, setOrderEditOpen] = useState(false);
  const [orderEditTargetId, setOrderEditTargetId] = useState<string | null>(null);
  const [orderEditBusy, setOrderEditBusy] = useState(false);
  const [orderEditForm, setOrderEditForm] = useState({ street: '', city: '', country: '', zip: '', notes: '' });
  const [assistantConversationId, setAssistantConversationId] = useState<string | null>(null);
  const [assistantConversations, setAssistantConversations] = useState<AssistantConversation[]>([]);
  const [assistantConversationMenuOpen, setAssistantConversationMenuOpen] = useState(false);
  const [assistantSettingsOpen, setAssistantSettingsOpen] = useState(false);
  const [assistantPromptMenuOpen, setAssistantPromptMenuOpen] = useState(false);
  const [assistantMemories, setAssistantMemories] = useState<AssistantMemory[]>([]);
  const [assistantMemoryDraft, setAssistantMemoryDraft] = useState('');
  const [assistantMemoriesLoading, setAssistantMemoriesLoading] = useState(false);
  const [assistantMemorySaving, setAssistantMemorySaving] = useState(false);
  const [assistantHistory, setAssistantHistory] = useState<AssistantTurn[]>([]);
  const assistantContextKeyRef = useRef(assistantContextKey);
  assistantContextKeyRef.current = assistantContextKey;
  const assistantMessagesEndRef = useRef<HTMLDivElement>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [assistantAnswer, setAssistantAnswer] = useState<{
    reply: string;
    actions: AssistantAction[];
    summary?: AssistantSummary;
    dataBasis?: string[];
    product?: AssistantProductCard;
  } | null>(null);
  const [assistantFocusedProductId, setAssistantFocusedProductId] = useState<string | null>(null);
  const [serverProducts, setServerProducts] = useState<Product[] | null>(null);
  const [serverOrders, setServerOrders] = useState<Order[] | null>(null);
  const [serverTransfers, setServerTransfers] = useState<StockTransferRecord[] | null>(null);
  const [serverVaultRequests, setServerVaultRequests] = useState<VaultAccessRequest[] | null>(null);
  type MerchantCustomer = {
    id: string; companyName: string; vatNumber: string; address: string; city: string; country: string;
    contactPerson: string; phone: string; email: string; businessType: string;
    tier: string; discountRate: number; creditLimit: number; usedCredit: number; status: 'pending' | 'approved' | 'rejected';
    customerLevel?: string; registrationDate?: string; createdAt?: string; updatedAt?: string;
    merchantNotes?: string; merchantTags?: string[];
  };
  type MerchantReturn = {
    id: string; orderId: string; reason: string; status: 'requested' | 'approved' | 'rejected' | 'received' | 'refunded';
    requestedQty: number; approvedQty: number | null; refundAmount: number | null; createdAt: string;
    order: { orderNo: string; companyName: string };
  };
  type MerchantPayout = {
    id: string; period: string; grossSales: number; platformFeeRate?: number; platformFeeAmount: number;
    paymentProcessingFee: number; refunds?: number; netPayout: number; status: 'pending' | 'processing' | 'paid' | 'failed';
    bankAccount: string; merchantAcknowledgedAt?: string | null;
    settlementReference?: string | null; settlementProof?: string | null; settledAt?: string | null; settledBy?: string | null;
    allocations?: Array<{ orderId: string; grossAmount: number; refundAmount: number; netAmount: number; order?: { orderNo: string; date: string } }>;
  };
  const [serverCustomers, setServerCustomers] = useState<MerchantCustomer[] | null>(null);
  const [customerEditor, setCustomerEditor] = useState<MerchantCustomer | null>(null);
  const [customerEditorOpen, setCustomerEditorOpen] = useState(false);
  const [customerEditorBusy, setCustomerEditorBusy] = useState(false);
  const [customerForm, setCustomerForm] = useState({ companyName: '', contactPerson: '', email: '', vatNumber: '', address: '', city: '', country: 'Italy', phone: '', businessType: 'Boutique', merchantNotes: '', merchantTags: '' });
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState('all');
  const [customerCountryFilter, setCustomerCountryFilter] = useState('all');
  const [customerSegment, setCustomerSegment] = useState<'all' | 'repeat' | 'new' | 'at-risk' | 'no-orders'>('all');
  const [customerMinOrders, setCustomerMinOrders] = useState('');
  const [customerLookbackDays, setCustomerLookbackDays] = useState('');
  const [customerSavedSegments, setCustomerSavedSegments] = useState<Array<{
    id: string; name: string; search: string; status: string; country: string; segment: 'all' | 'repeat' | 'new' | 'at-risk' | 'no-orders'; minOrders: string; lookbackDays: string;
  }>>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [customerBatchTag, setCustomerBatchTag] = useState('');
  const [customerBatchBusy, setCustomerBatchBusy] = useState(false);
  const [customerDetail, setCustomerDetail] = useState<MerchantCustomer | null>(null);
  const [customerAiQuestion, setCustomerAiQuestion] = useState('');
  const [customerAiAnswer, setCustomerAiAnswer] = useState('');
  const [customerAiBusy, setCustomerAiBusy] = useState(false);
  const [serverReturns, setServerReturns] = useState<MerchantReturn[] | null>(null);
  const [serverPayouts, setServerPayouts] = useState<MerchantPayout[] | null>(null);
  type StoreCategory = { id: string; name: string; slug: string; sortOrder: number };
  type ProductViewPreset = {
    id: string;
    name: string;
    search: string;
    lifecycle: string;
    zone: string;
    category: string;
    sort: string;
    quickView: 'all' | 'published' | 'draft' | 'archived' | 'low-stock' | 'under-five' | 'no-image' | 'clearance' | 'private';
  };
  const [savedProductViews, setSavedProductViews] = useState<ProductViewPreset[]>([]);
  const [selectedProductView, setSelectedProductView] = useState('');
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [editingStoreCategoryId, setEditingStoreCategoryId] = useState<string | null>(null);
  const [categoryAiQuestion, setCategoryAiQuestion] = useState('');
  const [categoryAiAnswer, setCategoryAiAnswer] = useState('');
  const [categoryAiProducts, setCategoryAiProducts] = useState<Product[]>([]);
  const [categoryMembershipId, setCategoryMembershipId] = useState('');
  const [categoryMembershipSearch, setCategoryMembershipSearch] = useState('');
  const [categoryMembershipProductIds, setCategoryMembershipProductIds] = useState<string[]>([]);
  const [categoryMembershipBusy, setCategoryMembershipBusy] = useState(false);
  type InventoryBalance = {
    id: string; variantId: string; sku: string; color?: string | null; size?: string | null;
    product: { id: string; styleNo: string; name: string };
    location: { id: string; code: string; name: string };
    onHandQuantity: number; reservedQuantity: number; availableQuantity: number;
    inTransitQuantity: number; version: number; updatedAt: string;
  };
  const [inventoryBalances, setInventoryBalances] = useState<InventoryBalance[]>([]);
  const [inventoryBalancesLoaded, setInventoryBalancesLoaded] = useState(false);
  type InventoryMovement = {
    id: string; quantity: number; movementType: string; note?: string | null; createdAt: string;
    variant: { sku: string; color?: string | null; size?: string | null; product: { styleNo: string; name: string } };
    location: { code: string; name: string };
  };
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryAdjustment, setInventoryAdjustment] = useState<{ balance: InventoryBalance; quantity: string; note: string } | null>(null);
  const [inventoryBusy, setInventoryBusy] = useState(false);

  // Merchant tenant identity is determined by the authenticated session only.
  const currentMerchantId = authMerchantId;
  const currentMerchant = currentMerchantId ? merchants.find(m => m.id === currentMerchantId) : undefined;
  useEffect(() => {
    setSelectedProductView('');
    if (!currentMerchantId) {
      setInventoryBalancesLoaded(false);
      setSavedProductViews([]);
      return;
    }
    try {
      const stored = window.localStorage.getItem(`ruda-product-views:${currentMerchantId}`);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(parsed)) throw new Error('INVALID_PRODUCT_VIEW_STORAGE');
      const validViews = parsed.filter((item): item is ProductViewPreset =>
        Boolean(item && typeof item === 'object'
          && typeof item.id === 'string'
          && typeof item.name === 'string'
          && typeof item.search === 'string'
          && typeof item.lifecycle === 'string'
          && typeof item.zone === 'string'
          && typeof item.category === 'string'
          && typeof item.sort === 'string'
          && ['all', 'published', 'draft', 'low-stock', 'clearance', 'private'].includes(item.quickView))
      ).slice(0, 20);
      setSavedProductViews(validViews);
    } catch (error) {
      setSavedProductViews([]);
      addNotification('warning', '已保存商品视图读取失败', '请刷新页面重试。');
    }
  }, [currentMerchantId]);
  useEffect(() => {
    if (!currentMerchantId) {
      setCustomerSavedSegments([]);
      return;
    }
    try {
      const stored = window.localStorage.getItem(`ruda-customer-segments:${currentMerchantId}`);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(parsed)) throw new Error('INVALID_CUSTOMER_SEGMENT_STORAGE');
      setCustomerSavedSegments(parsed.filter((segment): segment is typeof customerSavedSegments[number] =>
        Boolean(segment && typeof segment === 'object'
          && typeof segment.id === 'string' && typeof segment.name === 'string'
          && typeof segment.search === 'string' && typeof segment.status === 'string'
          && typeof segment.country === 'string' && typeof segment.minOrders === 'string'
          && typeof segment.lookbackDays === 'string'
          && ['all', 'repeat', 'new', 'at-risk', 'no-orders'].includes(segment.segment))
      ).slice(0, 20));
    } catch (error) {
      setCustomerSavedSegments([]);
      addNotification('warning', '已保存客户筛选读取失败', '请刷新页面重试。');
    }
  }, [currentMerchantId]);
  useEffect(() => {
    setAssistantMemories([]);
  }, [currentMerchantId]);
  useEffect(() => {
    setAssistantHistory([]);
    setAssistantAnswer(null);
    setAssistantQuestion('');
    setAssistantConversationId(null);
    setAssistantConversations([]);
    if (!currentMerchantId) return;
    let active = true;
    const query = new URLSearchParams({ context: assistantRequestContext, scope: assistantRequestScope });
    void apiGet<{ success: true; conversations: AssistantConversation[] }>(`/api/merchant/assistant/conversations?${query}`)
      .then(result => { if (active) setAssistantConversations(result.conversations); })
      .catch(error => {
        if (active) addNotification('warning', '助手历史加载失败', error instanceof Error ? error.message : '请稍后重试');
      });
    return () => { active = false; };
  }, [currentMerchantId, assistantRequestContext, assistantRequestScope]);
  useEffect(() => {
      if (!assistantSettingsOpen || !currentMerchantId) return;
      let active = true;
      setAssistantMemoriesLoading(true);
      void apiGet<{ success: true; memories: AssistantMemory[] }>('/api/merchant/assistant/memories')
        .then(result => { if (active) setAssistantMemories(result.memories); })
        .catch(error => {
          if (active) addNotification('warning', '助手偏好记忆加载失败', error instanceof Error ? error.message : '请稍后重试');
        })
        .finally(() => { if (active) setAssistantMemoriesLoading(false); });
      return () => { active = false; };
  }, [assistantSettingsOpen, currentMerchantId]);
  const [storefrontForm, setStorefrontForm] = useState({
    logo: '', banner: '', showroomImage: '', showroomPanoramicImages: [] as string[],
    storefrontVideo: '',
    storefrontSeoTitle: '', storefrontSeoDescription: '',
    storefrontShippingPolicy: '', storefrontReturnsPolicy: '',
    tagline: '', tagline_zh: '', tagline_it: '', description: '', description_zh: '', description_it: '',
    specialties: [] as string[]
  });
  const [storefrontVideoFile, setStorefrontVideoFile] = useState<File | null>(null);
  const [storefrontVideoPreview, setStorefrontVideoPreview] = useState('');
  const [storefrontBusy, setStorefrontBusy] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [settingsBusy, setSettingsBusy] = useState(false);
  const defaultMobileSettings = { mobileAlerts: true, mobileCompact: false, mobileDefaultTab: 'dashboard', mobileLanguage: 'auto' };
  const [settingsForm, setSettingsForm] = useState({
    name: '', companyLegalName: '', vatNumber: '', country: '', city: '', showroomAddress: '',
    contactPerson: '', contactPhone: '', contactEmail: '', moq: 1, defaultPaymentTerm: 'prepaid',
    shippingNote: '', notifyOrders: true, notifyPayouts: true, notifyVault: true, notifyMarketing: false
    , mobileAlerts: true, mobileCompact: false, mobileDefaultTab: 'dashboard', mobileLanguage: 'auto'
  });
  type TeamEmployee = {
    id: string;
    name: string;
    email: string;
    role: 'sales' | 'warehouse' | 'production' | 'pos_cashier' | 'store_manager';
    permissions: string[];
    active: boolean;
    lastLoginAt: string | null;
    createdAt: string;
  };
  const employeePermissionOptions = [
    ['sales.order.create', '创建销售单'],
    ['pricing.request', '提交改价申请'],
    ['pricing.approve', '审批改价'],
    ['warehouse.pick', '拣货与差异登记'],
    ['warehouse.review', '复核库存与订单'],
    ['warehouse.pack', '打包'],
    ['warehouse.ship', '出库与发货'],
    ['production.report', '生产报工与质检'],
    ['purchase.manage', '管理成衣采购订单'],
    ['return.manage', '审核退货与退款'],
    ['employees.manage', '创建员工与管理权限']
  ] as const;
  const rolePermissionDefaults: Record<TeamEmployee['role'], string[]> = {
    sales: ['sales.order.create', 'pricing.request'],
    warehouse: ['warehouse.pick', 'warehouse.review', 'warehouse.pack', 'warehouse.ship'],
    production: ['production.report'],
    pos_cashier: ['sales.order.create'],
    store_manager: employeePermissionOptions.map(([permission]) => permission)
  };
  const employeeRoleLabels: Record<TeamEmployee['role'], string> = {
    sales: '销售',
    warehouse: '仓库',
    production: '生产',
    pos_cashier: 'POS 收银',
    store_manager: '店长'
  };
  const employeeRoleDescriptions: Record<TeamEmployee['role'], string> = {
    sales: '创建销售单并提交改价申请。',
    warehouse: '拣货、复核、打包与出库。',
    production: '生产报工与质检。',
    pos_cashier: '仅授予销售开单权限，可使用 POS 收银；不含员工管理等后台权限。',
    store_manager: '包含员工管理和全部当前岗位权限，请仅授予可信管理员。'
  };
  const [teamEmployees, setTeamEmployees] = useState<TeamEmployee[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamLoadError, setTeamLoadError] = useState('');
  const [teamBusy, setTeamBusy] = useState(false);
  const [teamBusyId, setTeamBusyId] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamStatusFilter, setTeamStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const filteredTeamEmployees = teamEmployees.filter(employee => {
    const matchesSearch = `${employee.name} ${employee.email} ${employeeRoleLabels[employee.role]}`.toLowerCase().includes(teamSearch.trim().toLowerCase());
    const matchesStatus = teamStatusFilter === 'all' || employee.active === (teamStatusFilter === 'active');
    return matchesSearch && matchesStatus;
  });
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sales' as TeamEmployee['role'],
    permissions: rolePermissionDefaults.sales
  });
  useEffect(() => {
    if (!currentMerchant) return;
    setStorefrontForm({
      logo: currentMerchant.logo || '',
      banner: currentMerchant.banner || '',
      showroomImage: currentMerchant.showroomImage || '',
      showroomPanoramicImages: currentMerchant.showroomPanoramicImages || [],
      storefrontVideo: currentMerchant.storefrontVideo || '',
      storefrontSeoTitle: currentMerchant.storefrontSeoTitle || '',
      storefrontSeoDescription: currentMerchant.storefrontSeoDescription || '',
      storefrontShippingPolicy: currentMerchant.storefrontShippingPolicy || '',
      storefrontReturnsPolicy: currentMerchant.storefrontReturnsPolicy || '',
      tagline: currentMerchant.tagline || '',
      tagline_zh: currentMerchant.tagline_zh || '',
      tagline_it: currentMerchant.tagline_it || '',
      description: currentMerchant.description || '',
      description_zh: currentMerchant.description_zh || '',
      description_it: currentMerchant.description_it || '',
      specialties: currentMerchant.specialties || []
    });
    setStorefrontVideoFile(null);
  }, [currentMerchant]);
  useEffect(() => {
    if (!storefrontVideoFile) {
      setStorefrontVideoPreview('');
      return;
    }
    const previewUrl = URL.createObjectURL(storefrontVideoFile);
    setStorefrontVideoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [storefrontVideoFile]);
  useEffect(() => {
    if (activeTab !== 'settings' || !currentMerchantId || !currentMerchant) return;
    let active = true;
    void apiGet<{ success: true; settings: Partial<typeof settingsForm> }>('/api/merchant/settings').then(result => {
      if (!active) return;
      setSettingsForm(previous => ({ ...previous, ...result.settings, name: currentMerchant.name, companyLegalName: currentMerchant.companyLegalName, vatNumber: currentMerchant.vatNumber || '', country: currentMerchant.country, city: currentMerchant.city, showroomAddress: currentMerchant.showroomAddress, contactPerson: currentMerchant.contactPerson, contactPhone: currentMerchant.contactPhone, contactEmail: currentMerchant.contactEmail }));
    }).catch(error => addNotification('warning', '设置加载失败', error instanceof Error ? error.message : '请稍后重试'));
    return () => { active = false; };
  }, [activeTab, currentMerchant, currentMerchantId]);
  useEffect(() => {
    if (activeTab !== 'settings' || settingsSubsection !== 'payments' || !currentMerchantId) return;
    let active = true;
    setMerchantPaymentStatusLoading(true);
    setMerchantPaymentStatusError('');
    void apiGet<{ success: true; payment: MerchantPaymentStatus; paypal: MerchantPayPalStatus; stripe: MerchantStripeStatus; solana: MerchantSolanaStatus }>('/api/merchant/payment-config')
      .then(result => {
        if (active) {
          setMerchantPaymentStatus(result.payment);
          setMerchantPayPalStatus(result.paypal);
          setMerchantStripeStatus(result.stripe);
          setMerchantSolanaStatus(result.solana);
          setSolanaWalletAddress(result.solana.walletAddress || '');
          if (result.paypal.environment) setPaypalCredentialsForm(previous => ({ ...previous, environment: result.paypal.environment! }));
        }
      })
      .catch(error => {
        if (active) {
          setMerchantPaymentStatus(null);
          setMerchantPaymentStatusError(error instanceof Error ? error.message : '付款状态读取失败');
        }
      })
      .finally(() => {
        if (active) setMerchantPaymentStatusLoading(false);
      });
    return () => { active = false; };
  }, [activeTab, currentMerchantId, merchantPaymentStatusRefresh, settingsSubsection]);
  useEffect(() => {
    if (activeTab !== 'settings' || !currentMerchantId) return;
    let active = true;
    setTeamLoading(true);
    setTeamLoadError('');
    void apiGet<{ success: true; employees: Array<Omit<TeamEmployee, 'permissions'> & { permissions: string }> }>('/api/merchant/employees')
      .then(result => {
        if (!active) return;
        setTeamEmployees(result.employees.map(employee => {
          let permissions: string[] = [];
          try {
            const parsed: unknown = JSON.parse(employee.permissions || '[]');
            if (Array.isArray(parsed)) permissions = parsed.filter((permission): permission is string => typeof permission === 'string');
          } catch {
            permissions = [];
          }
          return { ...employee, permissions };
        }));
      })
      .catch(error => {
        if (!active) return;
        setTeamLoadError(error instanceof Error ? error.message : '当前账号没有员工管理权限');
        setTeamEmployees([]);
      })
      .finally(() => {
        if (active) setTeamLoading(false);
      });
    return () => { active = false; };
  }, [activeTab, currentMerchantId]);
  const reloadTeamEmployees = async () => {
    const result = await apiGet<{ success: true; employees: Array<Omit<TeamEmployee, 'permissions'> & { permissions: string }> }>('/api/merchant/employees');
    setTeamEmployees(result.employees.map(employee => {
      let permissions: string[] = [];
      try {
        const parsed: unknown = JSON.parse(employee.permissions || '[]');
        if (Array.isArray(parsed)) permissions = parsed.filter((permission): permission is string => typeof permission === 'string');
      } catch {
        permissions = [];
      }
      return { ...employee, permissions };
    }));
  };
  const createTeamEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (teamBusy) return;
    setTeamBusy(true);
    try {
      await apiPost('/api/merchant/employees', employeeForm);
      setEmployeeForm({
        name: '',
        email: '',
        password: '',
        role: 'sales',
        permissions: rolePermissionDefaults.sales
      });
      await reloadTeamEmployees();
      addNotification('success', '员工账号已创建', '员工可使用邮箱和初始密码登录；所选权限已即时生效');
    } catch (error) {
      addNotification('warning', '员工创建失败', error instanceof Error ? error.message : '请检查资料和邮箱后重试');
    } finally {
      setTeamBusy(false);
    }
  };
  const saveStripeCredentials = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (stripeCredentialsBusy) return;
    setStripeCredentialsBusy(true);
    try {
      const result = await apiPut<{ success: true; stripe: MerchantStripeStatus }>('/api/merchant/payment-config/stripe', { secretKey: stripeSecretKey });
      setMerchantStripeStatus(result.stripe);
      setStripeSecretKey('');
      addNotification('success', 'Stripe 已连接', `${result.stripe.livemode ? 'Live 正式环境' : 'Test 测试环境'}密钥已验证并加密保存`);
    } catch (error) {
      addNotification('warning', 'Stripe 连接失败', error instanceof Error ? error.message : '密钥验证或保存失败，请检查后重试');
    } finally {
      setStripeCredentialsBusy(false);
    }
  };
  const disconnectStripe = async () => {
    if (!merchantStripeStatus?.configured || stripeCredentialsBusy) return;
    if (!window.confirm('断开 Stripe 后，顾客将无法使用此商家的 Stripe 在线卡付款。确认继续？')) return;
    setStripeCredentialsBusy(true);
    try {
      await apiDelete('/api/merchant/payment-config/stripe');
      setMerchantStripeStatus({ configured: false, enabled: false, accountId: null, livemode: null });
      addNotification('success', 'Stripe 已断开', '该商家的 Stripe 密钥已从 RUDA 删除');
    } catch (error) {
      addNotification('warning', 'Stripe 断开失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setStripeCredentialsBusy(false);
    }
  };
  const saveSolanaWallet = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (solanaConfigBusy) return;
    setSolanaConfigBusy(true);
    try {
      const result = await apiPut<{ success: true; solana: MerchantSolanaStatus }>('/api/merchant/payment-config/solana', {
        walletAddress: solanaWalletAddress
      });
      setMerchantSolanaStatus(result.solana);
      setSolanaWalletAddress(result.solana.walletAddress || '');
      addNotification('success', 'Solana 钱包已绑定', '顾客支付的 USDC 或 EURC 将直接转入此公钥地址。');
    } catch (error) {
      addNotification('warning', 'Solana 钱包保存失败', error instanceof Error ? error.message : '请检查钱包地址并重试');
    } finally {
      setSolanaConfigBusy(false);
    }
  };
  const disconnectSolanaWallet = async () => {
    if (!merchantSolanaStatus?.configured || solanaConfigBusy) return;
    if (!window.confirm('断开钱包后，顾客将无法创建新的 Solana Pay 付款。已创建的订单仍按其原收款地址核验。确认继续？')) return;
    setSolanaConfigBusy(true);
    try {
      await apiDelete('/api/merchant/payment-config/solana');
      setMerchantSolanaStatus({ configured: false, enabled: false, walletAddress: null });
      setSolanaWalletAddress('');
      addNotification('success', 'Solana 钱包已断开', '该钱包不会再用于新订单；已创建付款仍保留原收款地址供链上核对。');
    } catch (error) {
      addNotification('warning', 'Solana 钱包断开失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setSolanaConfigBusy(false);
    }
  };
  const toggleTeamEmployee = async (employee: TeamEmployee) => {
    setTeamBusyId(employee.id);
    try {
      await apiPatch(`/api/merchant/employees/${encodeURIComponent(employee.id)}/status`, { active: !employee.active });
      setTeamEmployees(current => current.map(item => item.id === employee.id ? { ...item, active: !employee.active } : item));
      addNotification('success', employee.active ? '员工账号已停用' : '员工账号已启用', employee.name);
    } catch (error) {
      addNotification('warning', '员工状态更新失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setTeamBusyId(null);
    }
  };
  const saveTeamEmployeePermissions = async (employee: TeamEmployee) => {
    setTeamBusyId(employee.id);
    try {
      await apiPatch(`/api/merchant/employees/${encodeURIComponent(employee.id)}/permissions`, { permissions: employee.permissions });
      addNotification('success', '员工权限已保存', `${employee.name} 的权限已即时同步`);
    } catch (error) {
      addNotification('warning', '员工权限保存失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setTeamBusyId(null);
    }
  };
  const savePayPalCredentials = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (paypalCredentialsBusy) return;
    setPaypalCredentialsBusy(true);
    try {
      const result = await apiPut<{ success: true; paypal: MerchantPayPalStatus }>('/api/merchant/payment-config/paypal', paypalCredentialsForm);
      setMerchantPayPalStatus(result.paypal);
      setPaypalCredentialsForm(previous => ({ ...previous, clientId: '', clientSecret: '' }));
      addNotification('success', 'PayPal 已连接', `${result.paypal.environment === 'live' ? '正式环境' : '沙盒环境'}凭证已通过验证并加密保存`);
    } catch (error) {
      addNotification('warning', 'PayPal 连接失败', error instanceof Error ? error.message : '凭证验证或保存失败，请检查后重试');
    } finally {
      setPaypalCredentialsBusy(false);
    }
  };
  const disconnectPayPal = async () => {
    if (!merchantPayPalStatus?.configured || paypalCredentialsBusy) return;
    if (!window.confirm('断开 PayPal 后，顾客将无法使用此商家的 PayPal 结账。确认继续？')) return;
    setPaypalCredentialsBusy(true);
    try {
      await apiDelete('/api/merchant/payment-config/paypal');
      setMerchantPayPalStatus({ configured: false, enabled: false, environment: null, clientIdHint: null });
      addNotification('success', 'PayPal 已断开', '该商家的 PayPal 凭证已从 RUDA 删除');
    } catch (error) {
      addNotification('warning', 'PayPal 断开失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setPaypalCredentialsBusy(false);
    }
  };
  const saveSettings = async () => {
    if (settingsBusy) return;
    if (!settingsForm.name.trim() || !settingsForm.companyLegalName.trim() || !settingsForm.contactEmail.includes('@')) {
      addNotification('warning', '资料校验失败', '请填写店铺名称、法定主体和有效邮箱'); return;
    }
    setSettingsBusy(true);
    try {
      const result = await apiPut<{ success: true; settings: Partial<typeof settingsForm>; merchant: typeof currentMerchant }>('/api/merchant/settings', settingsForm);
      if (currentMerchant && result.merchant) await updateMerchant(currentMerchant.id, result.merchant);
      addNotification('success', '设置已保存', '店铺资料、交易规则和通知偏好已更新');
    } catch (error) { addNotification('warning', '设置保存失败', error instanceof Error ? error.message : '请稍后重试'); }
    finally { setSettingsBusy(false); }
  };
  const resetMobileSettings = () => {
    setSettingsForm(previous => ({ ...previous, ...defaultMobileSettings }));
    addNotification('success', '手机端设置已恢复默认', '点击“保存设置”后才会写入商户配置');
  };
  const readStorefrontImage = (file: File, callback: (value: string) => void) => {
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type) || file.size > 5 * 1024 * 1024) {
      addNotification('warning', '图片不符合要求', '仅支持 JPG、PNG、WebP，单张不超过 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' && callback(reader.result);
    reader.onerror = () => addNotification('warning', '图片读取失败', '请重新选择图片');
    reader.readAsDataURL(file);
  };
  const uploadStorefrontMedia = async (value: string) => {
    if (!value.startsWith('data:')) return value;
    const match = value.match(/^data:([^;]+);base64,/);
    if (!match) throw new Error('图片数据格式无效');
    const contentType = match[1];
    const presignResponse = await fetch('/api/merchant/media/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ contentType })
    });
    if (presignResponse.status === 503) return value;
    const presign = await presignResponse.json() as { success?: boolean; uploadUrl?: string; publicUrl?: string; error?: string };
    if (!presignResponse.ok || !presign.success || !presign.uploadUrl || !presign.publicUrl) {
      throw new Error(presign.error || '媒体上传授权失败');
    }
    const binary = Uint8Array.from(atob(value.slice(value.indexOf(',') + 1)), character => character.charCodeAt(0));
    const upload = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public,max-age=31536000,immutable' },
      body: binary
    });
    if (!upload.ok) throw new Error('媒体上传失败，请检查对象存储 CORS 配置');
    return presign.publicUrl;
  };
  const uploadStorefrontVideo = async (file: File) => {
    if (!['video/mp4', 'video/webm'].includes(file.type) || file.size > 100 * 1024 * 1024) {
      throw new Error('店铺视频仅支持 MP4/WebM，单个文件最大 100MB');
    }
    const presignResponse = await fetch('/api/merchant/media/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ contentType: file.type })
    });
    const presign = await presignResponse.json() as { success?: boolean; uploadUrl?: string; publicUrl?: string; error?: string };
    if (!presignResponse.ok || !presign.success || !presign.uploadUrl || !presign.publicUrl) {
      throw new Error(presign.error || '店铺视频上传授权失败，请确认对象存储已配置');
    }
    const upload = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type, 'Cache-Control': 'public,max-age=31536000,immutable' },
      body: file
    });
    if (!upload.ok) throw new Error('店铺视频上传失败，请检查对象存储 CORS 配置');
    return presign.publicUrl;
  };
  const saveStorefront = async () => {
    if (!currentMerchant || storefrontBusy) return;
    setStorefrontBusy(true);
    try {
      const [logo, banner, showroomImage, ...gallery] = await Promise.all([
        uploadStorefrontMedia(storefrontForm.logo),
        uploadStorefrontMedia(storefrontForm.banner),
        uploadStorefrontMedia(storefrontForm.showroomImage),
        ...storefrontForm.showroomPanoramicImages.map(image => uploadStorefrontMedia(image))
      ]);
      const storefrontVideo = storefrontVideoFile
        ? await uploadStorefrontVideo(storefrontVideoFile)
        : storefrontForm.storefrontVideo;
      const result = await apiPut<{ success: true; merchant: typeof currentMerchant }>('/api/merchant/storefront', {
        ...storefrontForm, logo, banner, showroomImage, showroomPanoramicImages: gallery, storefrontVideo
      });
      await updateMerchant(currentMerchant.id, result.merchant);
      setStorefrontVideoFile(null);
      addNotification('success', '店铺装修已发布', '公开店铺的图片、文案和特色标签已更新');
    } catch (error) {
      addNotification('warning', '店铺装修保存失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setStorefrontBusy(false);
    }
  };
  useEffect(() => {
    if (!currentMerchantId) {
      setOperationsIntelligence(null);
      return;
    }
    let active = true;
    const loadIntelligence = async () => {
      try {
        const result = await apiGet<{ success: true } & NonNullable<typeof operationsIntelligence>>('/api/merchant/operations/intelligence');
        if (active) setOperationsIntelligence(result);
      } catch (error) {
        console.error('[merchant-operations-intelligence]', error);
        if (active) setOperationsIntelligence(null);
      }
    };
    void loadIntelligence();
    const interval = window.setInterval(() => void loadIntelligence(), 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [currentMerchantId]);
  const refreshMerchantOperations = async () => {
    const [productResult, orderResult, transferResult, vaultResult, customerResult, returnResult, financeResult, categoryResult] = await Promise.all([
      apiGet<{ success: true; products: Product[] }>('/api/merchant/products'),
      apiGet<{ success: true; orders: Order[] }>('/api/merchant/orders'),
      apiGet<{ success: true; transfers: StockTransferRecord[] }>('/api/merchant/transfers'),
      apiGet<{ success: true; requests: VaultAccessRequest[] }>('/api/merchant/vault-requests'),
      apiGet<{ success: true; customers: MerchantCustomer[] }>('/api/merchant/customers'),
      apiGet<{ success: true; returns: MerchantReturn[] }>('/api/merchant/returns'),
      apiGet<{ success: true; payouts: MerchantPayout[] }>('/api/merchant/finance'),
      apiGet<{ success: true; categories: StoreCategory[] }>('/api/merchant/store-categories')
    ]);
    setServerProducts(productResult.products);
    setServerOrders(orderResult.orders);
    setServerTransfers(transferResult.transfers);
    setServerVaultRequests(vaultResult.requests);
    setServerCustomers(customerResult.customers);
    setServerReturns(returnResult.returns);
    setServerPayouts(financeResult.payouts);
    setStoreCategories(categoryResult.categories);
  };
  useEffect(() => {
    if (!currentMerchantId) {
      setServerProducts(null);
      setServerOrders(null);
      setServerTransfers(null);
      setServerVaultRequests(null);
      setServerCustomers(null);
      setServerReturns(null);
      setServerPayouts(null);
      setStoreCategories([]);
      return;
    }
    void refreshMerchantOperations().catch(error => {
      console.error('[merchant-operations]', error);
      setServerProducts(null);
      setServerOrders(null);
      setServerTransfers(null);
      setServerVaultRequests(null);
      setServerCustomers(null);
      setServerReturns(null);
      setServerPayouts(null);
      setStoreCategories([]);
    });
  }, [currentMerchantId]);
  useEffect(() => {
    if (activeTab !== 'orders' || orderView !== 'drafts' || !currentMerchantId) return;
    let active = true;
    setMerchantQuotesLoading(true);
    void apiGet<{ success: true; quotes: Array<{
      id: string; quoteNo: string; customerId: string; status: string; validUntil: string | null;
      totalQty: number; totalAmount: number; notes: string | null; createdAt: string; shareUrl: string;
      items: Array<{ id: string; productId: string; sku: string; styleNo: string; productName: string; color: string; size: string; quantity: number; unitPrice: number }>;
    }> }>('/api/merchant/quotes')
      .then(result => {
        if (active) setMerchantQuotes(result.quotes.map(quote => ({ ...quote, totalAmount: Number(quote.totalAmount), items: quote.items.map(item => ({ ...item, unitPrice: Number(item.unitPrice) })) })));
      })
      .catch(error => {
        if (active) addNotification('warning', '草稿订单读取失败', error instanceof Error ? error.message : '请稍后重试');
      })
      .finally(() => { if (active) setMerchantQuotesLoading(false); });
    return () => { active = false; };
  }, [activeTab, orderView, currentMerchantId, merchantQuotesRefresh]);
  useEffect(() => {
    if (activeTab !== 'finance' || !currentMerchantId) return;
    let active = true;
    void apiGet<{ success: true; accounts: typeof bankAccounts }>('/api/merchant/bank-accounts')
      .then(result => { if (active) setBankAccounts(result.accounts); })
      .catch(error => console.error('[merchant-bank-accounts]', error));
    return () => { active = false; };
  }, [activeTab, currentMerchantId]);
  useEffect(() => {
    if (!currentMerchantId) return;
    let active = true;
    setInventoryLoading(true);
    void Promise.all([
      apiGet<{ success: true; balances: InventoryBalance[] }>('/api/merchant/inventory/balances?pageSize=500'),
      activeTab === 'inventory'
        ? apiGet<{ success: true; movements: InventoryMovement[] }>('/api/merchant/inventory/movements?limit=100')
        : Promise.resolve({ movements: [] as InventoryMovement[] })
    ])
      .then(([balanceResult, movementResult]) => { if (active) { setInventoryBalances(balanceResult.balances); setInventoryBalancesLoaded(true); if (activeTab === 'inventory') setInventoryMovements(movementResult.movements); } })
      .catch(error => { console.error('[merchant-inventory-balances]', error); if (active) addNotification('warning', '库存加载失败', '请稍后重试'); })
      .finally(() => { if (active) setInventoryLoading(false); });
    return () => { active = false; };
  }, [activeTab, currentMerchantId]);
  const visibleInventoryBalances = inventoryBalances.filter(balance => {
    const query = inventorySearch.trim().toLowerCase();
    return !query || `${balance.product.styleNo} ${balance.product.name} ${balance.sku} ${balance.color || ''} ${balance.size || ''} ${balance.location.name}`.toLowerCase().includes(query);
  });
  const submitInventoryAdjustment = async () => {
    if (!inventoryAdjustment || inventoryBusy) return;
    const desiredQuantity = Number(inventoryAdjustment.quantity);
    const quantity = desiredQuantity - inventoryAdjustment.balance.onHandQuantity;
    if (!Number.isInteger(desiredQuantity) || desiredQuantity < 0 || !inventoryAdjustment.note.trim()) {
      addNotification('warning', '商品件数信息不完整', '请输入不小于 0 的整数件数和调整原因');
      return;
    }
    if (quantity === 0) {
      setInventoryAdjustment(null);
      return;
    }
    setInventoryBusy(true);
    try {
      const result = await apiPost<{ success: true; balance: InventoryBalance }>('/api/merchant/inventory/adjustments', {
        balanceId: inventoryAdjustment.balance.id,
        variantId: inventoryAdjustment.balance.variantId,
        locationId: inventoryAdjustment.balance.location.id,
        version: inventoryAdjustment.balance.version,
        quantity,
        note: inventoryAdjustment.note
      });
      setInventoryBalances(previous => previous.map(balance => balance.id === result.balance.id ? result.balance : balance));
      setInventoryMovements(previous => [{
        id: `local-${Date.now()}`, quantity, movementType: 'adjustment', note: inventoryAdjustment.note,
        createdAt: new Date().toISOString(),
        variant: { sku: result.balance.sku, color: result.balance.color, size: result.balance.size, product: result.balance.product },
        location: { code: result.balance.location.code, name: result.balance.location.name }
      }, ...previous]);
      setInventoryAdjustment(null);
      addNotification('success', '库存已更新', `${result.balance.sku} 当前可用库存 ${result.balance.availableQuantity} 件`);
    } catch (error) {
      addNotification('warning', '库存更新失败', error instanceof Error ? error.message : '库存版本可能已变化，请刷新后重试');
    } finally {
      setInventoryBusy(false);
    }
  };
  const uploadOrderDocument = async (order: Order, documentType: string, file: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type) || file.size > 6 * 1024 * 1024) {
      addNotification('warning', '文件不符合要求', '支持 PDF、JPG、PNG、WebP，单个文件不超过 6MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== 'string') return;
      try {
        await apiPost(`/api/merchant/orders/${encodeURIComponent(order.id)}/documents`, {
          documentType, fileName: file.name, mimeType: file.type, storageUrl: reader.result
        });
        addNotification('success', '单据已上传', `${file.name} 已归档到订单 ${order.orderNo}`);
      } catch (error) {
        addNotification('warning', '单据上传失败', error instanceof Error ? error.message : '请稍后重试');
      }
    };
    reader.onerror = () => addNotification('warning', '文件读取失败', '请重新选择文件');
    reader.readAsDataURL(file);
  };
  const sendOrderDocument = async (order: Order) => {
    const recipient = window.prompt('发送到邮箱', order.companyName ? '' : '');
    if (!recipient) return;
    try {
      const result = await apiPost<{ success: true; shareUrl: string }>(`/api/merchant/orders/${encodeURIComponent(order.id)}/documents/send`, { recipient });
      await navigator.clipboard?.writeText(result.shareUrl);
      addNotification('success', '单据已发送', '邮件已发送，分享链接也已复制');
    } catch (error) {
      addNotification('warning', '单据发送失败', error instanceof Error ? error.message : '请检查邮件配置');
    }
  };
  const refreshMaterials = async () => {
    const [result, movementResult] = await Promise.all([
      apiGet<{ success: true; materials: Material[] }>('/api/merchant/materials'),
      apiGet<{ success: true; movements: MaterialMovement[] }>('/api/merchant/material-movements?limit=100')
    ]);
    setMaterials(result.materials);
    setMaterialMovements(movementResult.movements);
    if (!result.materials.some(material => material.id === materialInbound.materialId && material.status === 'active')) {
      const firstActive = result.materials.find(material => material.status === 'active');
      setMaterialInbound(previous => ({ ...previous, materialId: firstActive?.id || '' }));
    }
  };
  const openMaterialEditor = (material?: Material) => {
    if (!material) {
      setEditingMaterialId(null);
      setEditingMaterialUnitLocked(false);
      setMaterialForm(emptyMaterialForm);
      return;
    }
    setEditingMaterialId(material.id);
    setEditingMaterialUnitLocked(material.unitLocked);
    setMaterialForm({
      code: material.code,
      name: material.name,
      category: material.category,
      unit: material.unit,
      unitCost: String(material.unitCost),
      reorderPoint: String(material.reorderPoint),
      leadTimeDays: String(material.leadTimeDays),
      status: material.status,
      notes: material.notes || ''
    });
  };
  const saveMaterial = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (materialBusy) return;
    const unitCost = Number(materialForm.unitCost);
    const reorderPoint = Number(materialForm.reorderPoint);
    const leadTimeDays = Number(materialForm.leadTimeDays);
    if (!Number.isFinite(unitCost) || unitCost < 0 || !Number.isFinite(reorderPoint) || reorderPoint < 0
      || !Number.isInteger(leadTimeDays) || leadTimeDays < 0) {
      addNotification('warning', '物料资料不正确', '成本、安全库存需为非负数，交期需为非负整数');
      return;
    }
    setMaterialBusy(true);
    try {
      const payload = {
        ...materialForm,
        code: materialForm.code.trim().toUpperCase(),
        name: materialForm.name.trim(),
        unitCost,
        reorderPoint,
        leadTimeDays
      };
      if (editingMaterialId) {
        await apiPut(`/api/merchant/materials/${encodeURIComponent(editingMaterialId)}`, payload);
      } else {
        await apiPost('/api/merchant/materials', payload);
      }
      await refreshMaterials();
      setMaterialForm(emptyMaterialForm);
      setEditingMaterialId(null);
      setEditingMaterialUnitLocked(false);
      addNotification('success', editingMaterialId ? '物料资料已更新' : '物料已创建', `${payload.code} · ${payload.name}`);
    } catch (error) {
      addNotification('warning', editingMaterialId ? '物料更新失败' : '物料创建失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setMaterialBusy(false);
    }
  };
  useEffect(() => {
    if (activeTab !== 'materials' || !currentMerchantId) return;
    void refreshMaterials().catch(error => {
      console.error('[merchant-materials]', error);
      addNotification('warning', '面辅料数据读取失败', '请稍后重试');
    });
  }, [activeTab, currentMerchantId]);
  const askOperatingAssistant = async (question: string, options: { openPanel?: boolean; onReply?: (reply: string) => void; context?: string; scope?: string; forcePageContext?: boolean } = {}) => {
    if (!question.trim() || assistantBusy) return false;
    const requestContext = options.context || (options.forcePageContext
      ? activeTab === 'dashboard'
        ? dashboardNavSection === 'analytics' ? 'analytics' : 'dashboard'
        : activeTab
      : assistantRequestContext);
    const requestScope = options.scope || (options.forcePageContext ? assistantContextScope : assistantRequestScope);
    const requestContextKey = `${requestContext}:${requestScope}`;
    if (options.openPanel !== false) {
      setAssistantPanelOpen(true);
      setAssistantPanelExpanded(true);
      setAssistantConversationMenuOpen(false);
      setAssistantSettingsOpen(false);
      setAssistantPromptMenuOpen(false);
    }
    setAssistantBusy(true);
    try {
      const result = await apiPost<{
        success: true;
        reply: string;
        actions: AssistantAction[];
        summary?: AssistantSummary;
        dataBasis?: string[];
        product?: AssistantProductCard;
        conversationId: string;
        conversationTitle: string;
        conversationUpdatedAt: string;
        messageCount: number;
      }>('/api/merchant/assistant/query', {
        question,
        conversationId: assistantContextKeyRef.current === requestContextKey ? assistantConversationId : null,
        context: requestContext,
        scope: requestScope
      }, 30_000, { 'Idempotency-Key': `assistant-${crypto.randomUUID()}` });
      options.onReply?.(result.reply);
      if (assistantContextKeyRef.current !== requestContextKey) return true;
      setAssistantConversationId(result.conversationId);
      setAssistantAnswer({ reply: result.reply, actions: result.actions, summary: result.summary, dataBasis: result.dataBasis, product: result.product });
      const nextHistory: AssistantTurn[] = [
        ...assistantHistory.slice(-98),
        { role: 'user', text: question.trim() },
        { role: 'assistant', text: result.reply, product: result.product }
      ];
      setAssistantHistory(nextHistory);
      setAssistantConversations(current => [
        {
          id: result.conversationId,
          title: result.conversationTitle,
          updatedAt: result.conversationUpdatedAt,
          messageCount: result.messageCount
        },
        ...current.filter(conversation => conversation.id !== result.conversationId)
      ].slice(0, 30));
      setAssistantQuestion('');
      return true;
    } catch (error) {
      addNotification('warning', '经营助手暂时不可用', error instanceof Error ? error.message : '请稍后重试');
      return false;
    } finally {
      setAssistantBusy(false);
    }
  };
  useEffect(() => {
    if (assistantPanelOpen && assistantPanelExpanded) {
      assistantMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [assistantHistory, assistantBusy, assistantPanelOpen, assistantPanelExpanded]);
  const openAssistantProduct = (productId: string) => {
    setProductViewMode('pos');
    setProductWorkspaceSection('catalog');
    setActiveTab('products');
    setProductSearch('');
    setProductLifecycleFilter('all');
    setProductZoneFilter('all');
    setProductCategoryFilter('all');
    setProductQuickView('all');
    setAssistantFocusedProductId(productId);
    window.setTimeout(() => {
      document.getElementById(`merchant-product-${productId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
    window.setTimeout(() => setAssistantFocusedProductId(current => current === productId ? null : current), 2600);
  };
  const startNewAssistantConversation = () => {
    if (assistantBusy) return;
    setAssistantConversationId(null);
    setAssistantHistory([]);
    setAssistantAnswer(null);
    setAssistantQuestion('');
    setAssistantConversationMenuOpen(false);
    setAssistantSettingsOpen(false);
    setAssistantPromptMenuOpen(false);
  };
  const openAssistantConversation = async (conversationId: string) => {
    const requestContextKey = assistantContextKeyRef.current;
    try {
      const result = await apiGet<{
        success: true;
        conversation: {
          id: string;
          title: string;
          messages: Array<{
            role: string;
            text: string;
            actions?: AssistantAction[];
            summary?: AssistantSummary;
            dataBasis?: string[];
            product?: AssistantProductCard;
          }>;
        };
      }>(`/api/merchant/assistant/conversations/${encodeURIComponent(conversationId)}?${new URLSearchParams({ context: assistantRequestContext, scope: assistantRequestScope })}`);
      if (assistantContextKeyRef.current !== requestContextKey) return;
      const messages = result.conversation.messages;
      setAssistantConversationId(result.conversation.id);
      setAssistantHistory(messages.flatMap(message =>
        message.role === 'user' || message.role === 'assistant'
          ? [{ role: message.role, text: message.text, product: message.product }]
          : []
      ));
      const lastAssistantMessage = [...messages].reverse().find(message => message.role === 'assistant');
      setAssistantAnswer(lastAssistantMessage ? {
        reply: lastAssistantMessage.text,
        actions: lastAssistantMessage.actions || [],
        summary: lastAssistantMessage.summary,
        dataBasis: lastAssistantMessage.dataBasis,
        product: lastAssistantMessage.product
      } : null);
      setAssistantPanelOpen(true);
      setAssistantPanelExpanded(true);
      setAssistantConversationMenuOpen(false);
      setAssistantSettingsOpen(false);
    } catch (error) {
      addNotification('warning', '无法打开助手历史', error instanceof Error ? error.message : '请稍后重试');
    }
  };
  const deleteAssistantConversation = async (conversationId: string) => {
    if (assistantBusy || !window.confirm(localizeCopy('确定删除这段 GPTmoda 对话及其历史记录吗？', 'Eliminare questa conversazione e la cronologia?'))) return;
    try {
      await apiDelete(`/api/merchant/assistant/conversations/${encodeURIComponent(conversationId)}`);
      setAssistantConversations(current => current.filter(conversation => conversation.id !== conversationId));
      if (assistantConversationId === conversationId) startNewAssistantConversation();
    } catch (error) {
      addNotification('warning', '删除助手历史失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };
  const saveAssistantMemory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = assistantMemoryDraft.trim();
    if (!content || assistantMemorySaving) return;
    setAssistantMemorySaving(true);
    try {
      const result = await apiPost<{ success: true; memory: AssistantMemory }>('/api/merchant/assistant/memories', { content });
      setAssistantMemories(current => [result.memory, ...current]);
      setAssistantMemoryDraft('');
      addNotification('success', '已保存助手偏好', '此偏好将用于你后续的 GPTmoda 对话');
    } catch (error) {
      addNotification('warning', '保存助手偏好失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setAssistantMemorySaving(false);
    }
  };
  const deleteAssistantMemory = async (memoryId: string) => {
    try {
      await apiDelete(`/api/merchant/assistant/memories/${encodeURIComponent(memoryId)}`);
      setAssistantMemories(current => current.filter(memory => memory.id !== memoryId));
    } catch (error) {
      addNotification('warning', '删除助手偏好失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };
  const refreshProduction = async () => {
    const [workOrders, balances] = await Promise.all([
      apiGet<{ success: true; workOrders: ProductionWorkOrder[] }>('/api/merchant/production/work-orders'),
      apiGet<{ success: true; balances: ProductionBalance[] }>('/api/merchant/inventory/balances?pageSize=500')
    ]);
    setProductionWorkOrders(workOrders.workOrders);
    setProductionBalances(balances.balances);
    const first = balances.balances[0];
    if (first) setProductionForm(previous => ({
      ...previous,
      variantId: previous.variantId || first.variantId,
      outputLocationId: previous.outputLocationId || first.location.id
    }));
  };
  useEffect(() => {
    setInventoryBalances([]);
    setInventoryBalancesLoaded(false);
  }, [currentMerchantId]);
  useEffect(() => {
    if (activeTab !== 'production' || !currentMerchantId) return;
    void refreshProduction().catch(error => {
      console.error('[merchant-production]', error);
      addNotification('warning', '生产数据加载失败', '请稍后刷新重试');
    });
  }, [activeTab, currentMerchantId]);
  if (!currentMerchantId || !currentMerchant) {
    return null;
  }
  const merchantSharePath = getMerchantStoreUrl(currentMerchant);
  const merchantLogo = merchantMediaUrl(currentMerchant.logo, DEFAULT_MERCHANT_LOGO);

  // 严格数据隔离：只筛选属于该商家的商品
  const merchantProducts = serverProducts ?? products.filter(p => p.merchantId === currentMerchantId);
  const standardInventoryLoaded = inventoryBalancesLoaded;
  const productStock = new Map<string, number>();
  const productAvailableStock = new Map<string, number>();
  const skuStock = new Map<string, number>();
  inventoryBalances.forEach(balance => {
    productStock.set(balance.product.id, (productStock.get(balance.product.id) || 0) + balance.onHandQuantity);
    productAvailableStock.set(balance.product.id, (productAvailableStock.get(balance.product.id) || 0) + balance.onHandQuantity - balance.reservedQuantity);
    skuStock.set(balance.sku, (skuStock.get(balance.sku) || 0) + balance.onHandQuantity);
  });
  const getProductStock = (product: Product) => standardInventoryLoaded
    ? (productStock.get(product.id) || 0)
    : (product.skus || []).reduce((sum, sku) => sum + (sku.stockCentral || 0), 0);
  const getProductAvailableStock = (product: Product) => standardInventoryLoaded
    ? (productAvailableStock.get(product.id) || 0)
    : getProductStock(product);
  const visibleMerchantProducts = merchantProducts
    .filter(product => {
      const query = productSearch.trim().toLocaleLowerCase();
      const matchesSearch = !query || [
        product.styleNo,
        product.name,
        product.name_zh,
        product.name_it,
        product.category,
        product.subCategory,
        product.brand,
        product.fabric,
        ...(product.skus || []).flatMap(sku => [sku.sku, sku.barcode, sku.color, sku.size])
      ].some(value => value?.toLocaleLowerCase().includes(query));
      const matchesLifecycle = productLifecycleFilter === 'all' || (product.lifecycleStatus || 'published') === productLifecycleFilter;
      const zone = getProductZone(product);
      const matchesZone = productZoneFilter === 'all' || zone === productZoneFilter;
      const matchesCategory = productCategoryFilter === 'all' || product.category === productCategoryFilter;
      const stock = getProductStock(product);
      const matchesQuickView = productQuickView === 'all'
        || (productQuickView === 'published' && product.lifecycleStatus === 'published')
        || (productQuickView === 'draft' && product.lifecycleStatus === 'draft')
        || (productQuickView === 'archived' && product.lifecycleStatus === 'archived')
        || (productQuickView === 'low-stock' && stock < 20)
        || (productQuickView === 'under-five' && getProductAvailableStock(product) < 5)
        || (productQuickView === 'no-image' && !(product.media?.some(media => media.type === 'image' && Boolean(media.url)) || product.images?.some(Boolean)))
        || (productQuickView === 'clearance' && zone === 'clearance')
        || (productQuickView === 'private' && zone === 'private');
      return matchesSearch && matchesLifecycle && matchesZone && matchesCategory && matchesQuickView;
    })
    .sort((left, right) => {
      if (productSort === 'name') return left.name.localeCompare(right.name);
      if (productSort === 'price-asc') return left.wholesalePrice - right.wholesalePrice;
      if (productSort === 'price-desc') return right.wholesalePrice - left.wholesalePrice;
      if (productSort === 'stock-asc') return getProductStock(left) - getProductStock(right);
      return (right.updatedAt || right.createdAt || '').localeCompare(left.updatedAt || left.createdAt || '');
    });
  const merchantProductIds = new Set(merchantProducts.map(p => p.id));
  const merchantStyleNos = new Set(merchantProducts.map(p => p.styleNo));
  const categoryMembershipCategory = storeCategories.find(category => category.id === categoryMembershipId) || null;
  const categoryMembershipVisibleProducts = merchantProducts.filter(product => {
    const query = categoryMembershipSearch.trim().toLocaleLowerCase();
    return !query || [product.styleNo, product.name, product.name_zh, product.name_it, ...(product.skus || []).map(sku => sku.sku)]
      .some(value => value?.toLocaleLowerCase().includes(query));
  });

  // 严格数据隔离：只筛选包含该商家款式的订单
  const fallbackMerchantOrders = orders.flatMap(order => {
    if (order.merchantId === currentMerchantId) return [order];
    if (order.subOrders?.length) {
      return order.subOrders.filter(subOrder => subOrder.merchantId === currentMerchantId);
    }

    const merchantItems = order.items.filter(item => merchantProductIds.has(item.productId) || merchantStyleNos.has(item.styleNo));
    if (merchantItems.length === 0) return [];

    return [{
      ...order,
      items: merchantItems,
      totalQty: merchantItems.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: Number(merchantItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2)),
      merchantId: currentMerchantId,
      merchantName: currentMerchant.name
    }];
  });
  const merchantOrders = serverOrders ?? fallbackMerchantOrders;
  const productSales30d = new Map<string, { quantity: number; amount: number }>();
  for (const order of merchantOrders) {
    const createdAt = new Date(order.createdAt || `${order.date}T00:00:00`);
    if (!Number.isFinite(createdAt.getTime()) || Date.now() - createdAt.getTime() > 30 * 24 * 60 * 60 * 1000) continue;
    for (const item of order.items) {
      const key = item.productId || item.styleNo;
      const current = productSales30d.get(key) || { quantity: 0, amount: 0 };
      current.quantity += item.quantity;
      current.amount += item.quantity * item.unitPrice;
      productSales30d.set(key, current);
    }
  }
  const productSalesRank = merchantProducts
    .map(product => ({
      product,
      sales: productSales30d.get(product.id) || productSales30d.get(product.styleNo) || { quantity: 0, amount: 0 }
    }))
    .filter(entry => entry.sales.quantity > 0)
    .sort((left, right) => right.sales.quantity - left.sales.quantity)
    .slice(0, 5);
  const productMissingImageCount = merchantProducts.filter(product =>
    !(product.media?.some(media => media.type === 'image' && Boolean(media.url)) || product.images?.some(Boolean))
  ).length;
  const productUnderFiveCount = merchantProducts.filter(product =>
    getProductAvailableStock(product) < 5
  ).length;

  // 严格数据隔离：买手向该商家发起的看货申请
  const merchantVaultRequests = serverVaultRequests ?? vaultRequests.filter(vr => vr.merchantId === currentMerchantId);

  const merchantCustomerIds = new Set([
    ...merchantOrders.map(order => order.customerId),
    ...merchantVaultRequests.map(request => request.customerId)
  ]);
  const merchantCustomers: MerchantCustomer[] = serverCustomers ?? allCustomers
    .filter(customer => merchantCustomerIds.has(customer.id))
    .map(customer => ({ ...customer, registrationDate: customer.appliedAt, createdAt: customer.appliedAt }));
  const customerOrderStats = new Map<string, { orders: Order[]; spend: number; latestOrderAt: number | null; recentOrderCount: number }>();
  for (const order of merchantOrders) {
    const current = customerOrderStats.get(order.customerId) || { orders: [], spend: 0, latestOrderAt: null, recentOrderCount: 0 };
    const timestamp = new Date(order.createdAt || `${order.date}T00:00:00`).getTime();
    current.orders.push(order);
    current.spend += order.totalAmount;
    if (Number.isFinite(timestamp)) {
      current.latestOrderAt = current.latestOrderAt === null ? timestamp : Math.max(current.latestOrderAt, timestamp);
      if (timestamp >= Date.now() - 90 * 24 * 60 * 60 * 1000 && timestamp <= Date.now()) current.recentOrderCount += 1;
    }
    customerOrderStats.set(order.customerId, current);
  }
  const getCustomerOrderStats = (customerId: string) =>
    customerOrderStats.get(customerId) || { orders: [], spend: 0, latestOrderAt: null, recentOrderCount: 0 };
  const getCustomerOrderCountWithin = (customerId: string, days: number) => getCustomerOrderStats(customerId).orders.filter(order => {
    const timestamp = new Date(order.createdAt || `${order.date}T00:00:00`).getTime();
    return Number.isFinite(timestamp) && timestamp >= Date.now() - days * 24 * 60 * 60 * 1000 && timestamp <= Date.now();
  }).length;
  const customerCountryOptions = [...new Set(merchantCustomers.map(customer => customer.country).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  const customerMatchesCountry = (country: string, filter: string) => filter === 'all'
    || (filter === '__italy__' ? /^(italy|italia)$/i.test(country) : country === filter);
  const visibleMerchantCustomers = merchantCustomers.filter(customer => {
    const query = customerSearch.trim().toLocaleLowerCase();
    if (query && ![customer.companyName, customer.contactPerson, customer.email, customer.phone, customer.vatNumber, customer.city, customer.country, ...(customer.merchantTags || [])]
      .some(value => value?.toLocaleLowerCase().includes(query))) return false;
    if (customerStatusFilter !== 'all' && customer.status !== customerStatusFilter) return false;
    if (!customerMatchesCountry(customer.country, customerCountryFilter)) return false;
    const stats = getCustomerOrderStats(customer.id);
    if (customerSegment === 'repeat' && stats.orders.length < 2) return false;
    if (customerSegment === 'new') {
      const created = new Date(customer.registrationDate || customer.createdAt || '').getTime();
      if (!Number.isFinite(created) || created < Date.now() - 30 * 24 * 60 * 60 * 1000) return false;
    }
    if (customerSegment === 'at-risk' && (stats.orders.length < 2 || stats.latestOrderAt === null || stats.latestOrderAt > Date.now() - 60 * 24 * 60 * 60 * 1000)) return false;
    if (customerSegment === 'no-orders' && stats.orders.length > 0) return false;
    const minimumOrders = Number(customerMinOrders);
    if (customerMinOrders && (!Number.isInteger(minimumOrders) || getCustomerOrderCountWithin(customer.id, Number(customerLookbackDays) || 90) < minimumOrders)) return false;
    const lookbackDays = Number(customerLookbackDays);
    if (customerLookbackDays && (stats.latestOrderAt === null || stats.latestOrderAt < Date.now() - lookbackDays * 24 * 60 * 60 * 1000)) return false;
    return true;
  }).sort((left, right) => getCustomerOrderStats(right.id).spend - getCustomerOrderStats(left.id).spend);
  const customerTotalSpend = [...customerOrderStats.values()].reduce((total, stats) => total + stats.spend, 0);
  const customerRepeatCount = merchantCustomers.filter(customer => getCustomerOrderStats(customer.id).orders.length >= 2).length;
  const customerAtRiskCount = merchantCustomers.filter(customer => {
    const stats = getCustomerOrderStats(customer.id);
    return stats.orders.length >= 2 && stats.latestOrderAt !== null && stats.latestOrderAt <= Date.now() - 60 * 24 * 60 * 60 * 1000;
  }).length;
  const customerRecentCount = merchantCustomers.filter(customer => {
    const created = new Date(customer.registrationDate || customer.createdAt || '').getTime();
    return Number.isFinite(created) && created >= Date.now() - 30 * 24 * 60 * 60 * 1000;
  }).length;
  const customerRegionRank = [...merchantCustomers.reduce((regions, customer) => {
    const region = customer.country || '未填写国家';
    regions.set(region, (regions.get(region) || 0) + 1);
    return regions;
  }, new Map<string, number>())].sort((left, right) => right[1] - left[1]).slice(0, 5);
  const ordersInSelectedDateRange = orderDateRange === 'all'
    ? merchantOrders
    : merchantOrders.filter(order => {
      const orderDate = new Date(order.createdAt || `${order.date}T00:00:00`);
      const orderAge = Date.now() - orderDate.getTime();
      return Number.isFinite(orderDate.getTime()) && orderAge >= 0 && orderAge <= Number(orderDateRange) * 24 * 60 * 60 * 1000;
    });
  const visibleMerchantOrders = ordersInSelectedDateRange
    .filter(order => {
      if (orderStatusFilter === 'unfulfilled' && ['shipped', 'delivered', 'cancelled', 'returned'].includes(order.status)) return false;
      if (orderStatusFilter === 'unpaid' && order.paymentStatus !== 'unpaid') return false;
      if (orderStatusFilter === 'open' && !['placed', 'pending', 'confirmed', 'picking', 'shipped'].includes(order.status)) return false;
      if (orderStatusFilter === 'complete' && !['delivered', 'returned', 'cancelled'].includes(order.status)) return false;
      if (orderPaymentFilter !== 'all' && order.paymentStatus !== orderPaymentFilter) return false;
      if (orderDeliveryFilter !== 'all' && order.deliveryType !== orderDeliveryFilter) return false;
      const query = orderSearch.trim().toLocaleLowerCase();
      if (!query) return true;
      const customer = merchantCustomers.find(candidate => candidate.id === order.customerId);
      return [
        order.orderNo, order.companyName, order.shippingAddress?.city, order.shippingAddress?.country, order.carrier, order.trackingNumber,
        order.notes, customer?.contactPerson, customer?.email, customer?.phone,
        ...order.items.flatMap(item => [item.styleNo, item.sku, item.productName])
      ].some(value => String(value || '').toLocaleLowerCase().includes(query));
    })
    .sort((left, right) => {
      const direction = orderSortDirection === 'asc' ? 1 : -1;
      if (orderSort === 'amount') return (left.totalAmount - right.totalAmount) * direction;
      if (orderSort === 'quantity') return (left.totalQty - right.totalQty) * direction;
      return (new Date(left.createdAt || `${left.date}T00:00:00`).getTime() - new Date(right.createdAt || `${right.date}T00:00:00`).getTime()) * direction;
    });
  const orderPageCount = Math.max(1, Math.ceil(visibleMerchantOrders.length / orderPageSize));
  const currentOrderPage = Math.min(orderPage, orderPageCount);
  const paginatedMerchantOrders = visibleMerchantOrders.slice((currentOrderPage - 1) * orderPageSize, currentOrderPage * orderPageSize);
  const selectedVisibleOrderCount = visibleMerchantOrders.filter(order => selectedOrderIds.includes(order.id)).length;
  useEffect(() => {
    setOrderPage(1);
    setSelectedOrderIds([]);
  }, [orderSearch, orderStatusFilter, orderDateRange, orderPaymentFilter, orderDeliveryFilter, orderSort, orderSortDirection]);
  useEffect(() => {
    if (orderPage !== currentOrderPage) setOrderPage(currentOrderPage);
  }, [orderPage, currentOrderPage]);
  const orderAnalyticsBuckets = (() => {
    const now = new Date();
    const bucketCount = orderAnalyticsGranularity === 'day' ? 7 : 8;
    const bucketStart = (date: Date) => {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      if (orderAnalyticsGranularity === 'week') {
        start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      } else if (orderAnalyticsGranularity === 'month') {
        start.setDate(1);
      }
      return start;
    };
    const moveBucket = (date: Date, offset: number) => {
      const moved = new Date(date);
      if (orderAnalyticsGranularity === 'day') moved.setDate(moved.getDate() + offset);
      else if (orderAnalyticsGranularity === 'week') moved.setDate(moved.getDate() + offset * 7);
      else moved.setMonth(moved.getMonth() + offset);
      return moved;
    };
    const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const starts = Array.from({ length: bucketCount }, (_, index) => moveBucket(bucketStart(now), index - bucketCount + 1));
    const buckets = starts.map(start => ({
      key: dateKey(start),
      label: orderAnalyticsGranularity === 'month'
        ? `${start.getMonth() + 1}月`
        : orderAnalyticsGranularity === 'week'
          ? `${start.getMonth() + 1}/${start.getDate()}周`
          : `${start.getMonth() + 1}/${start.getDate()}`,
      amount: 0,
      count: 0
    }));
    const bucketsByKey = new Map(buckets.map(bucket => [bucket.key, bucket]));
    for (const order of ordersInSelectedDateRange) {
      const date = new Date(order.createdAt || `${order.date}T00:00:00`);
      if (!Number.isFinite(date.getTime())) continue;
      const start = bucketStart(date);
      const bucket = bucketsByKey.get(dateKey(start));
      if (bucket) {
        bucket.amount += order.totalAmount + (order.shippingFee || 0);
        bucket.count += 1;
      }
    }
    return buckets;
  })();
  const orderAnalyticsMaxAmount = Math.max(1, ...orderAnalyticsBuckets.map(bucket => bucket.amount));
  const orderAnalyticsTotals = {
    count: ordersInSelectedDateRange.length,
    amount: ordersInSelectedDateRange.reduce((sum, order) => sum + order.totalAmount + (order.shippingFee || 0), 0),
    average: ordersInSelectedDateRange.length
      ? ordersInSelectedDateRange.reduce((sum, order) => sum + order.totalAmount + (order.shippingFee || 0), 0) / ordersInSelectedDateRange.length
      : 0,
    refunds: ordersInSelectedDateRange.reduce((sum, order) => sum + (order.refundAmount || 0), 0)
  };
  const orderAnalyticsTopProducts = [...ordersInSelectedDateRange.reduce((totals, order) => {
    for (const item of order.items) {
      const label = item.styleNo || item.productName || item.sku;
      totals.set(label, (totals.get(label) || 0) + item.quantity);
    }
    return totals;
  }, new Map<string, number>())].sort((left, right) => right[1] - left[1]).slice(0, 5);
  const orderAnalyticsTopCustomers = [...ordersInSelectedDateRange.reduce((totals, order) => {
    const current = totals.get(order.companyName) || { count: 0, amount: 0 };
    current.count += 1;
    current.amount += order.totalAmount + (order.shippingFee || 0);
    totals.set(order.companyName, current);
    return totals;
  }, new Map<string, { count: number; amount: number }>())].sort((left, right) => right[1].amount - left[1].amount).slice(0, 5);
  const orderAnalyticsCountries = [...ordersInSelectedDateRange.reduce((totals, order) => {
    const country = order.shippingAddress?.country?.trim() || '未填写';
    totals.set(country, (totals.get(country) || 0) + 1);
    return totals;
  }, new Map<string, number>())].sort((left, right) => right[1] - left[1]).slice(0, 5);
  const runOrderAiQuery = (question: string) => {
    const query = question.trim();
    if (!query || assistantBusy) return;
    setOrderAiQuestion(query);
    setOrderAiAnswerVisible(false);
    if (/未付款|待付款|尚未付款|unpaid/i.test(query)) {
      setOrderPaymentFilter('unpaid');
      setOrderStatusFilter('all');
    } else if (/未发货|未履约|待发货|unfulfilled|not shipped/i.test(query)) {
      setOrderStatusFilter('unfulfilled');
      setOrderPaymentFilter('all');
    }
    const matchingCustomer = merchantCustomers
      .flatMap(customer => [customer.companyName, customer.contactPerson, customer.email])
      .filter((value): value is string => Boolean(value && value.length > 2 && query.toLocaleLowerCase().includes(value.toLocaleLowerCase())))
      .sort((left, right) => right.length - left.length)[0];
    const matchingOrder = merchantOrders.find(order => order.orderNo && query.toLocaleLowerCase().includes(order.orderNo.toLocaleLowerCase()));
    const matchingProduct = merchantOrders.flatMap(order => order.items)
      .map(item => item.styleNo || item.sku || item.productName)
      .filter((value): value is string => Boolean(value && value.length > 2 && query.toLocaleLowerCase().includes(value.toLocaleLowerCase())))
      .sort((left, right) => right.length - left.length)[0];
    const matchingCountry = [...new Set(merchantOrders.map(order => order.shippingAddress?.country).filter((value): value is string => Boolean(value && value.length > 2)))]
      .filter(country => query.toLocaleLowerCase().includes(country.toLocaleLowerCase()))
      .sort((left, right) => right.length - left.length)[0];
    const searchTerm = matchingOrder?.orderNo || matchingCustomer || matchingProduct || matchingCountry;
    if (searchTerm) setOrderSearch(searchTerm);
    void askOperatingAssistant(query, { openPanel: false }).then(success => setOrderAiAnswerVisible(success));
  };
  const selectedOrderDetail = merchantOrders.find(order => order.id === selectedOrderDetailId) || null;
  const selectedOrderForAiEdit = selectedOrderIds.length === 1
    ? merchantOrders.find(order => order.id === selectedOrderIds[0]) || null
    : null;
  const selectedOrderDetailCustomer = selectedOrderDetail
    ? merchantCustomers.find(customer => customer.id === selectedOrderDetail.customerId)
    : undefined;
  const openDraftQuoteForm = (request = '') => {
    const normalizedRequest = request.toLocaleLowerCase();
    const approvedCustomers = merchantCustomers.filter(customer => customer.status === 'approved');
    const requestedCustomer = approvedCustomers
      .filter(customer => [customer.companyName, customer.contactPerson, customer.email].some(value => value && normalizedRequest.includes(value.toLocaleLowerCase())))
      .sort((left, right) => Math.max(right.companyName.length, right.contactPerson.length) - Math.max(left.companyName.length, left.contactPerson.length))[0];
    setDraftQuoteCustomerId(requestedCustomer?.id || approvedCustomers[0]?.id || '');
    const publishedProducts = merchantProducts.filter(product => product.lifecycleStatus === 'published');
    const requestedProduct = publishedProducts
      .filter(product => [product.styleNo, product.name, product.name_zh, product.name_it].some(value => value && normalizedRequest.includes(value.toLocaleLowerCase())))
      .sort((left, right) => Math.max(right.styleNo.length, right.name.length) - Math.max(left.styleNo.length, left.name.length))[0];
    const firstProduct = requestedProduct || publishedProducts[0];
    const requestedQuantity = Number(request.match(/(\d+)\s*(?:件|个|pcs|pieces)/i)?.[1]);
    setDraftQuoteItems(firstProduct ? [{
      productId: firstProduct.id,
      sku: firstProduct.skus[0]?.sku || '',
      quantity: Math.max(
        Math.ceil(firstProduct.moq / Math.max(1, firstProduct.packSize)),
        Number.isFinite(requestedQuantity) && requestedQuantity > 0
          ? Math.ceil(requestedQuantity / Math.max(1, firstProduct.packSize))
          : 0
      ) * Math.max(1, firstProduct.packSize)
    }] : []);
    setDraftQuoteNotes('');
    setDraftQuoteOpen(true);
  };
  const prepareOrderEdit = (order: Order) => {
    setOrderEditTargetId(order.id);
    setOrderEditForm({
      street: order.shippingAddress?.street || '',
      city: order.shippingAddress?.city || '',
      country: order.shippingAddress?.country || '',
      zip: order.shippingAddress?.zip || '',
      notes: order.notes || ''
    });
    setOrderEditOpen(true);
  };
  const saveOrderEdit = async (event: React.FormEvent, order: Order) => {
    event.preventDefault();
    if (orderEditBusy) return;
    setOrderEditBusy(true);
    try {
      const result = await apiPut<{ success: true; order: Order }>(`/api/merchant/orders/${encodeURIComponent(order.id)}/edit`, {
        companyName: order.companyName,
        deliveryType: order.deliveryType,
        paymentMethod: order.paymentMethod,
        pickupLocation: order.pickupLocation,
        shippingAddress: orderEditForm,
        notes: orderEditForm.notes,
        items: order.items.map(item => ({ id: item.id, quantity: item.quantity, unitPrice: item.unitPrice }))
      });
      setServerOrders(current => (current || merchantOrders).map(currentOrder => currentOrder.id === result.order.id ? result.order : currentOrder));
      setOrderEditOpen(false);
      setOrderEditTargetId(null);
      addNotification('success', '订单信息已更新', `${result.order.orderNo} 的收货信息已保存`);
    } catch (error) {
      addNotification('warning', '订单信息保存失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setOrderEditBusy(false);
    }
  };
  const openCustomerEditor = (customer?: MerchantCustomer) => {
    setCustomerForm(customer ? {
      companyName: customer.companyName, contactPerson: customer.contactPerson, email: customer.email,
      vatNumber: customer.vatNumber, address: customer.address, city: customer.city, country: customer.country,
      phone: customer.phone, businessType: customer.businessType,
      merchantNotes: customer.merchantNotes || '', merchantTags: (customer.merchantTags || []).join(', ')
    } : { companyName: '', contactPerson: '', email: '', vatNumber: '', address: '', city: '', country: 'Italy', phone: '', businessType: 'Boutique', merchantNotes: '', merchantTags: '' });
    setCustomerEditor(customer || null);
    setCustomerEditorOpen(true);
  };
  const saveCustomerEditor = async (event: React.FormEvent) => {
    event.preventDefault();
    if (customerEditorBusy) return;
    setCustomerEditorBusy(true);
    try {
      const payload = {
        ...customerForm,
        notes: customerForm.merchantNotes,
        merchantTags: [...new Set(customerForm.merchantTags.split(',').map(tag => tag.trim()).filter(Boolean))].slice(0, 30)
      };
      const result = customerEditor
        ? await apiPut<{ success: true; customer: MerchantCustomer }>(`/api/merchant/customers/${encodeURIComponent(customerEditor.id)}`, payload)
        : await apiPost<{ success: true; customer: MerchantCustomer }>('/api/merchant/customers', payload);
      setServerCustomers(previous => {
        const current = previous || [];
        return [result.customer, ...current.filter(customer => customer.id !== result.customer.id)];
      });
      setCustomerEditor(null);
      setCustomerEditorOpen(false);
      if (customerDetail?.id === result.customer.id) setCustomerDetail(result.customer);
      addNotification('success', customerEditor ? '客户资料已更新' : '合作客户已新增', `${result.customer.companyName} 已同步到商家后台和 App`);
    } catch (error) {
      addNotification('warning', customerEditor ? '客户资料更新失败' : '客户新增失败', error instanceof Error ? error.message : '请检查客户资料后重试');
    } finally {
      setCustomerEditorBusy(false);
    }
  };
  const saveCustomerSegment = () => {
    if (!currentMerchantId) return;
    const name = window.prompt('为当前客户条件命名（例如：90 天内复购的意大利客户）')?.trim();
    if (!name) return;
    const preset = {
      id: crypto.randomUUID(),
      name: name.slice(0, 40),
      search: customerSearch,
      status: customerStatusFilter,
      country: customerCountryFilter,
      segment: customerSegment,
      minOrders: customerMinOrders,
      lookbackDays: customerLookbackDays
    };
    const nextSegments = [...customerSavedSegments.filter(segment => segment.name !== preset.name), preset].slice(-20);
    try {
      window.localStorage.setItem(`ruda-customer-segments:${currentMerchantId}`, JSON.stringify(nextSegments));
      setCustomerSavedSegments(nextSegments);
      addNotification('success', '客户筛选已保存', '此筛选仅保存在此设备，不会自动更新或用于发送营销活动。');
    } catch (error) {
      addNotification('warning', '客户筛选保存失败', '设备可用空间不足，请清理空间后重试。');
    }
  };
  const applyCustomerSegment = (id: string) => {
    const segment = customerSavedSegments.find(item => item.id === id);
    if (!segment) return;
    setCustomerSearch(segment.search);
    setCustomerStatusFilter(segment.status);
    setCustomerCountryFilter(segment.country);
    setCustomerSegment(segment.segment);
    setCustomerMinOrders(segment.minOrders);
    setCustomerLookbackDays(segment.lookbackDays);
  };
  const exportMerchantCustomers = () => {
    const escapeCsv = (value: unknown) => {
      const text = String(value ?? '').replace(/^[\t\r ]*[=+\-@]/, prefix => `'${prefix}`);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const customersToExport = selectedCustomerIds.length
      ? merchantCustomers.filter(customer => selectedCustomerIds.includes(customer.id))
      : visibleMerchantCustomers;
    const rows = [
      ['公司名称', '联系人', '邮箱', '电话', '国家', '城市', '客户状态', '订单数', '累计订单金额(EUR)', '最近下单', '标签'],
      ...customersToExport.map(customer => {
        const stats = getCustomerOrderStats(customer.id);
        return [
          customer.companyName, customer.contactPerson, customer.email, customer.phone, customer.country, customer.city,
          customer.status, stats.orders.length, stats.spend.toFixed(2),
          stats.latestOrderAt ? new Date(stats.latestOrderAt).toISOString().slice(0, 10) : '',
          (customer.merchantTags || []).join('; ')
        ];
      })
    ];
    const csv = `\uFEFF${rows.map(row => row.map(escapeCsv).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `ruda-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const updateSelectedCustomerTag = async (mode: 'add' | 'remove') => {
    const tag = customerBatchTag.trim();
    const customers = merchantCustomers.filter(customer => selectedCustomerIds.includes(customer.id));
    if (!tag || !customers.length || customerBatchBusy) return;
    if (customers.length > 500) {
      addNotification('warning', '一次最多批量更新 500 位客户', '请减少选择后重试');
      return;
    }
    if (!window.confirm(`${mode === 'add' ? '为' : '从'} ${customers.length} 位已选客户${mode === 'add' ? '添加' : '移除'}标签“${tag}”吗？`)) return;
    setCustomerBatchBusy(true);
    try {
      const result = await apiPut<{ success: true; customerIds: string[] }>('/api/merchant/customers/batch/tags', {
        customerIds: customers.map(customer => customer.id),
        tag,
        mode
      });
      const updatedIds = new Set(result.customerIds);
      if (serverCustomers === null) {
        try {
          await refreshMerchantOperations();
        } catch (error) {
          addNotification('warning', '客户标签已保存，但列表刷新失败', error instanceof Error ? error.message : '请刷新页面确认结果');
          return;
        }
      } else {
        setServerCustomers(previous => previous?.map(customer => {
          if (!updatedIds.has(customer.id)) return customer;
          const currentTags = customer.merchantTags || [];
          const merchantTags = mode === 'add'
            ? [...new Set([...currentTags, tag])]
            : currentTags.filter(currentTag => currentTag !== tag);
          return { ...customer, merchantTags };
        }) || previous);
      }
      addNotification('success', mode === 'add' ? '客户标签已添加' : '客户标签已移除', `已更新 ${result.customerIds.length} 位客户`);
    } catch (error) {
      addNotification('warning', '批量客户标签更新失败', error instanceof Error ? error.message : '请刷新页面确认结果');
    } finally {
      setCustomerBatchBusy(false);
    }
  };
  const runCustomerAiQuery = (question: string) => {
    const query = question.trim();
    if (!query || customerAiBusy) return;
    setCustomerAiQuestion(query);
    if (/新增客户|创建客户|录入客户|add customer|create customer/i.test(query)) {
      const extract = (pattern: RegExp) => query.match(pattern)?.[1]?.trim() || '';
      const email = query.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
      const phone = query.match(/(?:电话|手机|phone)\s*[：:]?\s*([+()\d][+()\d\s.-]{5,})/i)?.[1]?.trim() || '';
      const vatNumber = query.match(/(?:VAT|P\.IVA|税号)\s*[：:]?\s*([A-Z0-9-]{5,})/i)?.[1]?.trim() || '';
      const form = {
        companyName: extract(/(?:公司名称|公司|企业名称|企业)\s*[：:]?\s*([^，,；;\n]+)/),
        contactPerson: extract(/(?:联系人|买手)\s*[：:]?\s*([^，,；;\n]+)/),
        email,
        vatNumber,
        phone,
        city: extract(/(?:城市|市)\s*[：:]?\s*([^，,；;\n]+)/),
        country: extract(/(?:国家|地区)\s*[：:]?\s*([^，,；;\n]+)/),
        address: extract(/(?:地址)\s*[：:]?\s*([^，,；;\n]+)/),
        businessType: 'Boutique',
        merchantNotes: '',
        merchantTags: ''
      };
      setCustomerForm(form);
      setCustomerEditor(null);
      setCustomerEditorOpen(true);
      setCustomerAiAnswer('已从你提供的文字中提取明确填写的客户资料并预填表单；未提供的必填信息请自行补齐。检查无误后再点击保存。');
      setCustomerAiBusy(false);
      return;
    }
    setCustomerAiBusy(true);
    setCustomerAiAnswer('');
    const normalized = query.toLocaleLowerCase();
    let nextSegment = customerSegment;
    let nextCountry = customerCountryFilter;
    let nextMinOrders = customerMinOrders;
    let nextLookbackDays = customerLookbackDays;
    let nextSearch = customerSearch;
    let nextStatus = customerStatusFilter;
    if (/挽回|流失|at.risk|churn|60\s*天没|60天没有/i.test(query)) {
      nextSegment = 'at-risk';
      nextMinOrders = '';
      nextLookbackDays = '';
    } else if (/首次购买|新客户|新客|最近新增|recent new|new customer/i.test(query)) {
      nextSegment = 'new';
      nextMinOrders = '';
      nextLookbackDays = '';
    } else if (/订阅.{0,8}(?:邮件|电子邮件)|邮件.{0,8}订阅|email opt.in/i.test(query)) {
      setCustomerAiAnswer('当前商家批发客户资料没有邮件营销订阅状态字段，无法准确筛选订阅客户；为避免误判，没有应用该筛选。');
      setCustomerAiBusy(false);
      return;
    } else if (/复购|回头客|买过两次|repeat/i.test(query)) {
      nextSegment = 'repeat';
      nextMinOrders = '';
      nextLookbackDays = '';
    } else if (/没有下过单|未下单|没下过单|无订单/i.test(query)) {
      nextSegment = 'no-orders';
      nextMinOrders = '';
      nextLookbackDays = '';
    } else if (/消费最多|消费最高|高价值|top customer|highest spending/i.test(query)) {
      nextSegment = 'all';
      nextMinOrders = '';
      nextLookbackDays = '';
    }

    const countryMatch = query.match(/意大利|意国|Italy|Italia/i);
    if (countryMatch) nextCountry = '__italy__';
    const lookbackMatch = query.match(/(?:过去|最近|近)\s*(\d+)\s*天/) || query.match(/(?:last|past)\s*(\d+)\s*days?/i);
    if (lookbackMatch) nextLookbackDays = lookbackMatch[1];
    const minOrderMatch = query.match(/(?:买过|购买|下单|订单|消费)\s*(\d+|两|二|三|四|五)\s*次/);
    if (minOrderMatch) nextMinOrders = ({ '两': '2', '二': '2', '三': '3', '四': '4', '五': '5' } as Record<string, string>)[minOrderMatch[1]] || minOrderMatch[1];
    if (countryMatch || lookbackMatch || minOrderMatch) {
      nextSegment = 'all';
      nextSearch = '';
      nextStatus = 'all';
      setCustomerSearch('');
      setCustomerStatusFilter('all');
    }
    setCustomerSegment(nextSegment);
    setCustomerCountryFilter(nextCountry);
    setCustomerMinOrders(nextMinOrders);
    setCustomerLookbackDays(nextLookbackDays);

    const matchedCustomer = merchantCustomers.find(customer =>
      [customer.companyName, customer.contactPerson, customer.email, customer.phone, customer.vatNumber]
        .some(value => value && normalized.includes(value.toLocaleLowerCase()))
    );
    if (matchedCustomer) {
      nextSegment = 'all';
      nextCountry = 'all';
      nextMinOrders = '';
      nextLookbackDays = '';
      nextSearch = matchedCustomer.companyName;
      nextStatus = 'all';
      setCustomerSearch(matchedCustomer.companyName);
      setCustomerStatusFilter('all');
      setCustomerSegment('all');
      setCustomerCountryFilter('all');
      setCustomerMinOrders('');
      setCustomerLookbackDays('');
    }
    const previewCount = merchantCustomers.filter(customer => {
      if (nextStatus !== 'all' && customer.status !== nextStatus) return false;
      if (!customerMatchesCountry(customer.country, nextCountry)) return false;
      const activeSearch = nextSearch.trim().toLocaleLowerCase();
      if (activeSearch && ![customer.companyName, customer.contactPerson, customer.email, customer.phone, customer.vatNumber, customer.city, customer.country, ...(customer.merchantTags || [])]
        .some(value => value?.toLocaleLowerCase().includes(activeSearch))) return false;
      const stats = getCustomerOrderStats(customer.id);
      if (nextSegment === 'repeat' && stats.orders.length < 2) return false;
      if (nextSegment === 'new') {
        const created = new Date(customer.registrationDate || customer.createdAt || '').getTime();
        if (!Number.isFinite(created) || created < Date.now() - 30 * 24 * 60 * 60 * 1000) return false;
      }
      if (nextSegment === 'at-risk' && (stats.orders.length < 2 || stats.latestOrderAt === null || stats.latestOrderAt > Date.now() - 60 * 24 * 60 * 60 * 1000)) return false;
      if (nextSegment === 'no-orders' && stats.orders.length > 0) return false;
      if (nextMinOrders && getCustomerOrderCountWithin(customer.id, Number(nextLookbackDays) || 90) < Number(nextMinOrders)) return false;
      if (nextLookbackDays && (stats.latestOrderAt === null || stats.latestOrderAt < Date.now() - Number(nextLookbackDays) * 24 * 60 * 60 * 1000)) return false;
      return true;
    }).length;
    const renderAnswer = () => {
      const latestCustomers = [...merchantCustomers].sort((left, right) =>
        new Date(right.registrationDate || right.createdAt || 0).getTime() - new Date(left.registrationDate || left.createdAt || 0).getTime()
      );
      const topCustomers = [...merchantCustomers].sort((left, right) => getCustomerOrderStats(right.id).spend - getCustomerOrderStats(left.id).spend).slice(0, 5);
      let response: string;
      if (matchedCustomer) {
        const stats = getCustomerOrderStats(matchedCustomer.id);
        setCustomerDetail(matchedCustomer);
        response = `找到客户「${matchedCustomer.companyName}」（${matchedCustomer.contactPerson}）。本店订单 ${stats.orders.length} 单，订单金额合计 €${stats.spend.toFixed(2)}；${stats.latestOrderAt ? `最近下单 ${new Date(stats.latestOrderAt).toLocaleDateString()}` : '本店订单记录中没有找到该客户的订单'}。`;
      } else if (/流失|挽回|at.risk|churn|60\s*天/i.test(query)) {
        setCustomerSegment('at-risk');
        const atRiskCustomers = merchantCustomers.filter(customer => {
          const stats = getCustomerOrderStats(customer.id);
          return stats.orders.length >= 2 && stats.latestOrderAt !== null && stats.latestOrderAt <= Date.now() - 60 * 24 * 60 * 60 * 1000;
        });
        response = `找到 ${atRiskCustomers.length} 位至少下过 2 单且最近下单距今超过 60 天的客户。可先核对其历史订单，再考虑发送个性化回访；系统不会代发邮件。`;
      } else if (/最近新增|新客|新客户|new customer/i.test(query)) {
        setCustomerSegment('new');
        response = `本店近 30 天新增 ${customerRecentCount} 位客户。${latestCustomers.slice(0, 5).map(customer => `${customer.companyName}（${customer.registrationDate || '登记日期未知'}）`).join('、') || '目前没有客户资料'}。`;
      } else if (/地区|国家|分布|region|country/i.test(query)) {
        response = `客户地区分布：${customerRegionRank.map(([region, count]) => `${region} ${count} 位`).join('；') || '暂无客户数据'}。`;
      } else if (/复购|回头|比例|repeat/i.test(query)) {
        response = `当前客户中有 ${customerRepeatCount} 位存在至少 2 笔本店订单${merchantCustomers.length ? `，约占 ${Math.round(customerRepeatCount / merchantCustomers.length * 100)}%` : ''}。统计基于已加载的本店订单记录。`;
      } else if (countryMatch || lookbackMatch || minOrderMatch) {
        const matching = merchantCustomers.filter(customer => {
          if (nextStatus !== 'all' && customer.status !== nextStatus) return false;
          if (!customerMatchesCountry(customer.country, nextCountry)) return false;
          if (nextSearch && ![customer.companyName, customer.contactPerson, customer.email, customer.phone, customer.vatNumber, customer.city, customer.country, ...(customer.merchantTags || [])]
            .some(value => value?.toLocaleLowerCase().includes(nextSearch.toLocaleLowerCase()))) return false;
          const stats = getCustomerOrderStats(customer.id);
          if (nextMinOrders && getCustomerOrderCountWithin(customer.id, Number(nextLookbackDays) || 90) < Number(nextMinOrders)) return false;
          if (nextLookbackDays && (stats.latestOrderAt === null || stats.latestOrderAt < Date.now() - Number(nextLookbackDays) * 24 * 60 * 60 * 1000)) return false;
          return true;
        });
        response = `符合条件的客户有 ${matching.length} 位${nextCountry !== 'all' ? `（国家：${nextCountry === '__italy__' ? '意大利' : nextCountry}` : ''}${nextLookbackDays ? `，最近 ${nextLookbackDays} 天内有下单` : ''}${nextMinOrders ? `，该期间至少 ${nextMinOrders} 单` : ''}${nextCountry !== 'all' ? '）' : '。'}${matching.length ? `\n${matching.slice(0, 8).map(customer => `${customer.companyName} · ${getCustomerOrderStats(customer.id).orders.length} 单 · €${getCustomerOrderStats(customer.id).spend.toFixed(2)}`).join('\n')}` : ''}`;
      } else if (/消费最多|消费最高|高价值|top customer|highest spending/i.test(query)) {
        response = `按本店订单金额排序：${topCustomers.map((customer, index) => `${index + 1}. ${customer.companyName} €${getCustomerOrderStats(customer.id).spend.toFixed(2)}（${getCustomerOrderStats(customer.id).orders.length} 单）`).join('；') || '暂无订单数据'}。这只是本店订单金额汇总，不代表客户终身价值。`;
      } else if (/邮件|营销|文案|email|campaign/i.test(query)) {
        return;
      } else {
        response = `当前商家客户档案 ${merchantCustomers.length} 位，订单金额合计 €${customerTotalSpend.toFixed(2)}。可查询客户姓名/邮箱、消费排行、近期新增、复购、流失风险、地区分布，或描述筛选条件（如「过去 90 天买过两次以上的意大利客户」）。`;
      }
      setCustomerAiAnswer(`${response}\n\n筛选结果 ${previewCount} 位。保存的筛选仅保存在此设备，不会自动更新或用于发送营销活动。`);
      setCustomerAiBusy(false);
    };
    if (/邮件|营销文案|写.*(?:邮件|营销)|email|campaign/i.test(query)) {
      void askOperatingAssistant(`请为商家起草营销邮件文案，商家需求：${query}。当前页面筛选命中 ${previewCount} 位客户。不要接收或复述任何客户姓名、邮箱或其他个人资料；只写通用草稿，不声称已发送邮件，不要虚构客户事实、折扣或订单数据。`, {
        openPanel: false,
        onReply: reply => setCustomerAiAnswer(reply)
      }).finally(() => setCustomerAiBusy(false));
      return;
    }
    renderAnswer();
  };
  const merchantReturnsByOrderId = new Map<string, MerchantReturn>();
  for (const returnRequest of serverReturns ?? []) {
    if (!merchantReturnsByOrderId.has(returnRequest.orderId)) {
      merchantReturnsByOrderId.set(returnRequest.orderId, returnRequest);
    }
  }

  // 严格数据隔离：该商家的调拨记录
  const merchantTransfers = serverTransfers ?? transfers.filter(t => t.merchantId === currentMerchantId);

  // 严格数据隔离：该商家的财务结算
  const merchantPayouts = serverPayouts ?? payouts.filter(p => p.merchantId === currentMerchantId);

  // 计算看板指标
  const totalSales = merchantOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const pendingOrders = merchantOrders.filter(o => o.status === 'placed' || o.status === 'picking');
  const orderActionCount = merchantOrders.filter(order => ['placed', 'pending', 'confirmed', 'picking'].includes(order.status)).length;
  const pendingVaultCount = merchantVaultRequests.filter(vr => vr.status === 'pending').length;
  const normalizedGlobalSearch = globalSearch.trim().toLocaleLowerCase();
  const globalSearchResults = normalizedGlobalSearch ? [
    ...merchantOrders
      .filter(order => `${order.orderNo} ${order.companyName}`.toLocaleLowerCase().includes(normalizedGlobalSearch))
      .slice(0, 4)
      .map(order => ({ key: `order-${order.id}`, title: order.orderNo, detail: `${order.companyName} · ${order.status}`, target: 'orders' as const, icon: Truck })),
    ...merchantProducts
      .filter(product => `${product.styleNo} ${product.name} ${product.category}`.toLocaleLowerCase().includes(normalizedGlobalSearch))
      .slice(0, 4)
      .map(product => ({ key: `product-${product.id}`, title: `${product.styleNo} · ${product.name}`, detail: product.category, target: 'products' as const, icon: Package })),
    ...merchantCustomers
      .filter(customer => `${customer.companyName} ${customer.contactPerson} ${customer.email}`.toLocaleLowerCase().includes(normalizedGlobalSearch))
      .slice(0, 4)
      .map(customer => ({ key: `customer-${customer.id}`, title: customer.companyName, detail: customer.contactPerson, target: 'customers' as const, icon: UserCheck }))
  ].slice(0, 8) : [];

  let lowStockCount = 0;
  let totalStockCount = 0;
  merchantProducts.forEach(p => {
    (p.skus || []).forEach(s => {
      const total = standardInventoryLoaded ? (skuStock.get(s.sku) || 0) : (s.stockCentral || 0);
      totalStockCount += total;
      if (total < 15) lowStockCount++;
    });
  });

  const nowTimestamp = Date.now();
  const recentSales = merchantOrders.filter(order => nowTimestamp - new Date(order.date).getTime() <= 7 * 24 * 60 * 60 * 1000);
  const previousSales = merchantOrders.filter(order => {
    const orderAge = nowTimestamp - new Date(order.date).getTime();
    return orderAge > 7 * 24 * 60 * 60 * 1000 && orderAge <= 14 * 24 * 60 * 60 * 1000;
  });
  const recentSalesQty = recentSales.reduce((sum, order) => sum + order.totalQty, 0);
  const previousSalesQty = previousSales.reduce((sum, order) => sum + order.totalQty, 0);
  const salesTrendPercent = previousSalesQty > 0 ? Math.round(((recentSalesQty - previousSalesQty) / previousSalesQty) * 100) : recentSalesQty > 0 ? 100 : 0;
  const productSales = new Map<string, number>();
  merchantOrders.forEach(order => order.items.forEach(item => productSales.set(item.productId, (productSales.get(item.productId) || 0) + item.quantity)));
  const replenishmentRecommendations = merchantProducts.map(product => {
    const stock = getProductStock(product);
    const sold = productSales.get(product.id) || 0;
    const dailyDemand = sold / 30;
    const daysCover = dailyDemand > 0 ? Math.round(stock / dailyDemand) : null;
    return { product, stock, sold, daysCover, suggestedQty: Math.max(0, Math.ceil(dailyDemand * 30 - stock)) };
  }).sort((left, right) => {
    if (left.daysCover === null) return 1;
    if (right.daysCover === null) return -1;
    return left.daysCover - right.daysCover;
  });
  const smartRecommendations = [...replenishmentRecommendations]
    .sort((left, right) => right.sold - left.sold)
    .slice(0, 3);

  // State for adding new product
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProductImages, setEditingProductImages] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productViewMode, setProductViewMode] = useState<'table' | 'pos'>('table');
  const [productWorkspaceSection, setProductWorkspaceSection] = useState<'catalog' | 'categories'>('catalog');
  const [productSearch, setProductSearch] = useState('');
  const [productLifecycleFilter, setProductLifecycleFilter] = useState('all');
  const [productZoneFilter, setProductZoneFilter] = useState('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productSort, setProductSort] = useState('updated');
  const [productQuickView, setProductQuickView] = useState<'all' | 'published' | 'draft' | 'archived' | 'low-stock' | 'under-five' | 'no-image' | 'clearance' | 'private'>('all');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [batchProductBusy, setBatchProductBusy] = useState(false);
  const [productImportBusy, setProductImportBusy] = useState(false);
  const [productBatchPriceOpen, setProductBatchPriceOpen] = useState(false);
  const [productBatchPriceBusy, setProductBatchPriceBusy] = useState(false);
  const [productBatchPrices, setProductBatchPrices] = useState({ wholesalePrice: '', rrpPrice: '' });
  const [productAiQuestion, setProductAiQuestion] = useState('');
  const [productAiAnswerVisible, setProductAiAnswerVisible] = useState(false);
  const [productAiDescriptionDraft, setProductAiDescriptionDraft] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingProductImages, setSavingProductImages] = useState(false);
  const [newProdData, setNewProdData] = useState({
    styleNo: `STY-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    name: '',
    category: '',
    subCategory: '连衣裙',
    wholesalePrice: 22.0,
    rrpPrice: 69.0,
    costPrice: 12.0,
    moq: 6,
    packSize: 6,
    origin: 'Made in Italy (Prato)',
    fabric: '100% 意式精纺双绉天然桑蚕丝',
    composition: '高垂坠感，抗皱防透光',
    description: '',
    visibility: 'public' as ProductVisibility,
    status: 'new' as Product['status'],
    images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop'],
    media: [] as ProductMedia[]
  });

  // State for SKU Matrix Generator
  const [skuTargetStyleNo, setSkuTargetStyleNo] = useState(merchantProducts[0]?.styleNo || 'DRS-2026-0088');
  const [selectedColors, setSelectedColors] = useState([
    { name: 'Nero 极夜黑', code: 'BLK', colorCode: '#111111', checked: true },
    { name: 'Avorio 象牙白', code: 'WHT', colorCode: '#F8F9FA', checked: true },
    { name: 'Cammello 皇室驼', code: 'CML', colorCode: '#C19A6B', checked: true },
    { name: 'Bordeaux 勃艮第酒红', code: 'RED', colorCode: '#722F37', checked: false }
  ]);
  const [selectedSizes, setSelectedSizes] = useState([
    { size: 'S', checked: true },
    { size: 'M', checked: true },
    { size: 'L', checked: true },
    { size: 'XL', checked: false }
  ]);
  const [skuBasePrice, setSkuBasePrice] = useState(20.0);
  const [skuCostPrice, setSkuCostPrice] = useState(12.0);
  const [generatedSkusList, setGeneratedSkusList] = useState<SKUItem[]>([]);

  // State for Fulfillment Modal
  const [selectedOrderForFulfill, setSelectedOrderForFulfill] = useState<Order | null>(null);
  const [fulfillCarrier, setFulfillCarrier] = useState('DHL Express Europe');
  const [fulfillTracking, setFulfillTracking] = useState('');
  const [fulfillNotes, setFulfillNotes] = useState('');
  const [fulfillShipments, setFulfillShipments] = useState<Array<{ id: string; shipmentNo: string; carrier?: string | null; trackingNumber?: string | null; status: string; items: Array<{ orderItemId: string; quantity: number }> }>>([]);
  const [fulfillShipmentsLoading, setFulfillShipmentsLoading] = useState(false);
  const [trackingShipmentId, setTrackingShipmentId] = useState<string | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<Array<{ id: string; status: string; location?: string | null; description?: string | null; occurredAt: string }>>([]);
  const [trackingEventForm, setTrackingEventForm] = useState({ status: '运输中', location: '', description: '' });

  // State for Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    styleNo: merchantProducts[0]?.styleNo || 'DRS-2026-0088',
    sku: merchantProducts[0]?.skus[0]?.sku || '',
    fromLocation: 'central',
    toLocation: 'central',
    quantity: 20,
    notes: '单仓模式不支持库存调拨'
  });

  // Generate SKU Matrix
  const handleGenerateSKUs = () => {
    const activeColors = selectedColors.filter(c => c.checked);
    const activeSizes = selectedSizes.filter(s => s.checked);

    if (activeColors.length === 0 || activeSizes.length === 0) {
      addNotification('warning', '变体配置不足', '请至少勾选一种颜色与一种尺码以生成矩阵');
      return;
    }

    const skus: SKUItem[] = [];
    activeColors.forEach(color => {
      activeSizes.forEach(size => {
        const skuCode = `${skuTargetStyleNo}-${color.code}-${size.size}`;
        const barcode = `800${Math.floor(1000000000 + Math.random() * 9000000000)}`;
        skus.push({
          sku: skuCode,
          color: color.name,
          colorCode: color.colorCode,
          size: size.size,
          stockCentral: 50,
          stockMestre: 12,
          stockMilano: 8,
          barcode,
          cost: skuCostPrice,
          wholesalePrice: skuBasePrice,
          rrp: Math.round(skuBasePrice * 3),
          weight: '0.38 kg'
        });
      });
    });

    setGeneratedSkusList(skus);
    addNotification('success', 'SKU 矩阵生成成功', `已自动根据笛卡尔积生成 ${skus.length} 个多规格 SKU 条码`);
  };

  // Save generated SKUs to selected product
  const handleSaveSkusToProduct = () => {
    const targetProd = merchantProducts.find(p => p.styleNo === skuTargetStyleNo);
    if (!targetProd) {
      addNotification('warning', '未找到目标款式', '请核对款号是否属于本店商品');
      return;
    }

    updateProduct(targetProd.id, {
      skus: [...(targetProd.skus || []), ...generatedSkusList]
    });

    addNotification('success', 'SKU 已写入款式库', `已将 ${generatedSkusList.length} 个 SKU 变体并入款号 ${skuTargetStyleNo}`);
    setGeneratedSkusList([]);
  };

  // Submit new product
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (savingProduct) return;
    if (!newProdData.name.trim() || !newProdData.styleNo.trim()) {
      addNotification('warning', '信息不完整', '请填写款号与品名');
      return;
    }
    if (!newProdData.images.length) {
      addNotification('warning', '请先上传商品图片', '至少添加一张商品图，第一张将作为主图');
      return;
    }
    if (!Number.isFinite(newProdData.wholesalePrice) || newProdData.wholesalePrice <= 0 || !Number.isFinite(newProdData.rrpPrice) || newProdData.rrpPrice < newProdData.wholesalePrice || !Number.isFinite(newProdData.costPrice) || newProdData.costPrice < 0) {
      addNotification('warning', '价格信息无效', '请确保成本价不小于 0，批发价大于 0，建议零售价不低于批发价');
      return;
    }
    if (!Number.isInteger(newProdData.moq) || newProdData.moq <= 0 || !Number.isInteger(newProdData.packSize) || newProdData.packSize <= 0) {
      addNotification('warning', '采购规则无效', '起订量和箱规必须是大于 0 的整数');
      return;
    }
    if (newProdData.media.length > 32) {
      addNotification('warning', '媒体数量超限', '单个商品最多保存 32 个图片或视频媒体');
      return;
    }
    setSavingProduct(true);

    const initialSkus: SKUItem[] = [
      {
        sku: `${newProdData.styleNo}-BLK-S`,
        color: 'Nero 经典黑',
        colorCode: '#111111',
        size: 'S',
        stockCentral: 40,
        stockMestre: 10,
        stockMilano: 6,
        barcode: `800${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        wholesalePrice: newProdData.wholesalePrice,
        rrp: newProdData.rrpPrice,
        cost: newProdData.costPrice
      },
      {
        sku: `${newProdData.styleNo}-BLK-M`,
        color: 'Nero 经典黑',
        colorCode: '#111111',
        size: 'M',
        stockCentral: 50,
        stockMestre: 15,
        stockMilano: 10,
        barcode: `800${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        wholesalePrice: newProdData.wholesalePrice,
        rrp: newProdData.rrpPrice,
        cost: newProdData.costPrice
      }
    ];

    addProduct({
      styleNo: newProdData.styleNo.trim().toUpperCase(),
      name: newProdData.name.trim(),
      category: newProdData.category,
      subCategory: newProdData.subCategory,
      brand: currentMerchant.name,
      season: '2026/27 FW 秋冬新品',
      images: newProdData.images,
      media: newProdData.media.length ? newProdData.media : newProdData.images.map((url, index) => ({ id: `image-${index}`, type: 'image' as const, url })),
      wholesalePrice: Number(newProdData.wholesalePrice),
      rrpPrice: Number(newProdData.rrpPrice),
      costPrice: Number(newProdData.costPrice),
      moq: Number(newProdData.moq),
      packSize: Number(newProdData.packSize),
      status: newProdData.status,
      inventoryStatus: 'in_stock',
      origin: newProdData.origin,
      fabric: newProdData.fabric,
      composition: newProdData.composition,
      weight: '0.40 kg / 件',
      packaging: '防尘袋独立挂装 + 原厂外箱',
      washCare: '专业干洗 / 手洗轻柔',
      description: newProdData.description || '2026意式快时尚核心版型，剪裁流畅优雅。',
      merchantId: currentMerchant.id,
      merchantName: currentMerchant.name,
      visibility: newProdData.visibility,
      lifecycleStatus: 'published',
      isExclusiveProtected: newProdData.visibility === 'private',
      skus: initialSkus
    });

    const storefrontZone = newProdData.status === 'clearance'
      ? '🏷️ 特价区'
      : newProdData.visibility === 'private'
        ? '🔒 授权订货区'
        : '✨ 新款区';
    addNotification('success', '商品发布成功', `款式 ${newProdData.styleNo} 已同步到商家网店和买手端店铺的${storefrontZone}`);
    setIsAddingProduct(false);
    setProductAiDescriptionDraft('');
    setSavingProduct(false);
  };

  const handleBatchProductLifecycle = async (lifecycleStatus: 'published' | 'draft') => {
    if (!selectedProductIds.length || batchProductBusy) return;
    const activeProductIds = selectedProductIds.filter(id => merchantProducts.some(product => product.id === id && product.lifecycleStatus !== 'archived'));
    if (!activeProductIds.length) {
      addNotification('warning', '没有可批量更新的商品', '已归档商品不能通过批量上下架操作修改');
      return;
    }
    setBatchProductBusy(true);
    try {
      await apiPut('/api/merchant/products/batch', { productIds: activeProductIds, lifecycleStatus });
      await refreshMerchantOperations();
      setSelectedProductIds([]);
      addNotification('success', lifecycleStatus === 'published' ? '商品已批量上架' : '商品已批量下架',
        `已更新 ${activeProductIds.length} 款商品的销售状态`);
    } catch (error) {
      addNotification('warning', '批量上下架失败', error instanceof Error ? error.message : '请刷新后重试');
    } finally {
      setBatchProductBusy(false);
    }
  };
  const handleBatchProductZone = async (zone: 'new' | 'clearance' | 'private') => {
    if (!selectedProductIds.length || batchProductBusy) return;
    const activeProductIds = selectedProductIds.filter(id => merchantProducts.some(product => product.id === id && product.lifecycleStatus !== 'archived'));
    if (!activeProductIds.length) {
      addNotification('warning', '没有可调整的商品', '已归档商品不能通过批量展示区操作修改');
      return;
    }
    const zoneLabel = zone === 'private' ? '授权订货区' : zone === 'clearance' ? '特价区' : '新款区';
    if (!window.confirm(`确定将选中的 ${activeProductIds.length} 款商品批量移动到${zoneLabel}吗？`)) return;
    setBatchProductBusy(true);
    try {
      await apiPut('/api/merchant/products/batch', { productIds: activeProductIds, zone });
      await refreshMerchantOperations();
      setSelectedProductIds([]);
      addNotification('success', '商品展示区已批量更新', `${activeProductIds.length} 款商品已移至${zoneLabel}`);
    } catch (error) {
      addNotification('warning', '批量更新展示区失败', error instanceof Error ? error.message : '请刷新后重试');
    } finally {
      setBatchProductBusy(false);
    }
  };
  const exportMerchantProducts = (productsToExport: Product[]) => {
    const escapeCsv = (value: unknown) => {
      const normalized = String(value ?? '');
      const safe = /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
      return `"${safe.replaceAll('"', '""')}"`;
    };
    const rows = [
      ['款号', '名称', '分类slug', '子分类', '批发价EUR', '建议零售价EUR', '成本EUR', 'MOQ', '箱规', '展示区', '可见性', '状态', '库存件数', 'SKU列表', '图片URL'],
      ...productsToExport.map(product => [
        product.styleNo, product.name_zh || product.name, product.category, product.subCategory,
        product.wholesalePrice, product.rrpPrice, product.costPrice || 0, product.moq, product.packSize,
        getProductZone(product), product.visibility, product.lifecycleStatus, getProductStock(product),
        (product.skus || []).map(sku => sku.sku).join(' | '), product.images.join(' | ')
      ])
    ];
    const csv = `\uFEFF${rows.map(row => row.map(escapeCsv).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `ruda-products-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const downloadProductImportTemplate = () => {
    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const rows = [
      ['styleNo', 'name', 'category', 'subCategory', 'wholesalePrice', 'rrpPrice', 'costPrice', 'moq', 'packSize', 'origin', 'fabric', 'description', 'visibility'],
      ['STY-2026-0001', '意式棉质衬衫', storeCategories[0]?.slug || '请替换为分类slug', '衬衫', '22', '69', '12', '6', '6', 'Made in Italy', 'Cotton', '请核对商品描述', 'wholesale']
    ];
    const csv = `\uFEFF${rows.map(row => row.map(escapeCsv).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ruda-product-import-template.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importMerchantProducts = async (file: File) => {
    if (productImportBusy) return;
    if (!file.name.toLocaleLowerCase().endsWith('.csv') || file.size > 2 * 1024 * 1024) {
      addNotification('warning', '商品 CSV 文件不符合要求', '请选择不超过 2MB 的 .csv 文件');
      return;
    }
    setProductImportBusy(true);
    try {
      const records = parseCsvRecords(await file.text()).filter(record => record.some(value => value.trim()));
      if (records.length < 2) throw new Error('CSV 至少需要标题行和一行商品数据');
      const headers = records[0].map(header => header.trim());
      const requiredHeaders = ['styleNo', 'name', 'category', 'wholesalePrice', 'rrpPrice'];
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
      if (missingHeaders.length) throw new Error(`缺少必需列：${missingHeaders.join('、')}`);
      const rows = records.slice(1);
      if (rows.length > 500) throw new Error('单次最多导入 500 款商品');
      const productsToImport = rows.map((row, rowIndex) => {
        const values = Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() || '']));
        const styleNo = String(values.styleNo || '').toUpperCase();
        const name = String(values.name || '');
        const category = String(values.category || '');
        const wholesalePrice = Number(values.wholesalePrice);
        const rrpPrice = Number(values.rrpPrice);
        const costPrice = values.costPrice ? Number(values.costPrice) : 0;
        const moq = values.moq ? Number(values.moq) : 1;
        const packSize = values.packSize ? Number(values.packSize) : 1;
        if (!styleNo || !name || !category || !Number.isFinite(wholesalePrice) || wholesalePrice <= 0 || !Number.isFinite(rrpPrice) || rrpPrice <= 0 || !Number.isFinite(costPrice) || costPrice < 0 || !Number.isInteger(moq) || moq < 1 || !Number.isInteger(packSize) || packSize < 1) {
          throw new Error(`第 ${rowIndex + 2} 行资料无效；请检查款号、名称、分类及价格、MOQ、箱规`);
        }
        return {
          styleNo, name, category,
          subCategory: String(values.subCategory || ''),
          wholesalePrice, rrpPrice, costPrice, moq, packSize,
          origin: String(values.origin || ''),
          fabric: String(values.fabric || ''),
          description: String(values.description || ''),
          visibility: ['public', 'wholesale', 'private'].includes(String(values.visibility)) ? String(values.visibility) : 'wholesale'
        };
      });
      if (new Set(productsToImport.map(product => product.styleNo)).size !== productsToImport.length) {
        throw new Error('CSV 中款号重复，请先修正后再导入');
      }
      const result = await apiPost<{ success: true; count: number; products: Product[] }>('/api/merchant/products/batch', { products: productsToImport });
      setServerProducts(current => [...(current || merchantProducts), ...result.products]);
      addNotification('success', 'CSV 商品已导入为草稿', `${result.count} 款已创建；请补充商品图片与 SKU 后再上架`);
    } catch (error) {
      addNotification('warning', '商品 CSV 导入失败', error instanceof Error ? error.message : '请检查模板列名、分类 slug 与商品数据');
    } finally {
      setProductImportBusy(false);
    }
  };
  const saveProductBatchPrices = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProductIds.length || productBatchPriceBusy) return;
    const wholesalePrice = Number(productBatchPrices.wholesalePrice);
    const rrpPrice = Number(productBatchPrices.rrpPrice);
    if (!Number.isFinite(wholesalePrice) || wholesalePrice <= 0 || !Number.isFinite(rrpPrice) || rrpPrice < wholesalePrice) {
      addNotification('warning', '商品价格无效', '批发价必须大于 0，建议零售价不得低于批发价');
      return;
    }
    if (!window.confirm(`将 ${selectedProductIds.length} 款已选商品的批发价和建议零售价统一设置为 €${wholesalePrice.toFixed(2)} / €${rrpPrice.toFixed(2)}？`)) return;
    setProductBatchPriceBusy(true);
    const results = await Promise.allSettled(selectedProductIds.map(id => apiPut(`/api/merchant/products/${encodeURIComponent(id)}`, { wholesalePrice, rrpPrice })));
    const updatedCount = results.filter(result => result.status === 'fulfilled').length;
    try {
      await refreshMerchantOperations();
    } catch (error) {
      addNotification('warning', '商品已提交更新，但列表刷新失败', error instanceof Error ? error.message : '请刷新页面确认结果');
    }
    setProductBatchPriceBusy(false);
    if (updatedCount === results.length) {
      setProductBatchPriceOpen(false);
      setSelectedProductIds([]);
      addNotification('success', '批量价格已更新', `已更新 ${updatedCount} 款商品`);
    } else {
      const errors = results.flatMap(result => result.status === 'rejected' ? [result.reason instanceof Error ? result.reason.message : String(result.reason)] : []);
      addNotification('warning', '部分商品价格未更新', `${updatedCount}/${results.length} 款已更新。${errors[0] || '请检查权限或重试失败商品'}`);
    }
  };
  const archiveSelectedProducts = async () => {
    if (!selectedProductIds.length || batchProductBusy) return;
    if (!window.confirm(`确定归档选中的 ${selectedProductIds.length} 款商品吗？商品与历史记录会保留，但不再公开展示。`)) return;
    setBatchProductBusy(true);
    const ids = [...selectedProductIds];
    const results = await Promise.allSettled(ids.map(id => apiDelete(`/api/merchant/products/${encodeURIComponent(id)}`)));
    const archivedCount = results.filter(result => result.status === 'fulfilled').length;
    try {
      await refreshMerchantOperations();
    } catch (error) {
      addNotification('warning', '商品已提交归档，但列表刷新失败', error instanceof Error ? error.message : '请刷新页面确认结果');
    }
    setBatchProductBusy(false);
    if (archivedCount === ids.length) {
      setSelectedProductIds([]);
      addNotification('success', '商品已批量归档', `已归档 ${archivedCount} 款商品`);
    } else {
      const failedCount = ids.length - archivedCount;
      addNotification('warning', '部分商品归档失败', `${archivedCount} 款已归档，${failedCount} 款未成功；请刷新后核对列表`);
    }
  };
  const runProductAiQuery = (question: string) => {
    const query = question.trim();
    if (!query || assistantBusy) return;
    setProductAiQuestion(query);
    setProductAiAnswerVisible(false);
    setSelectedProductView('');
    const lowerQuery = query.toLocaleLowerCase();
    if (/缺图片|没有图片|无图片|没图片|missing image|no image/i.test(query)) {
      setProductQuickView('no-image');
      setProductSearch('');
      setProductLifecycleFilter('all');
      setProductZoneFilter('all');
      setProductCategoryFilter('all');
    } else if (/库存.{0,8}(?:低于|少于|不足)\s*5|(?:低于|少于|不足)\s*5\s*(?:件|个)?库存|stock.{0,8}<\s*5/i.test(query)) {
      setProductQuickView('under-five');
      setProductSearch('');
      setProductLifecycleFilter('all');
      setProductZoneFilter('all');
      setProductCategoryFilter('all');
    } else if (/低库存|缺货|库存偏低|low stock|out of stock/i.test(query)) {
      setProductQuickView('low-stock');
      setProductSearch('');
      setProductLifecycleFilter('all');
      setProductZoneFilter('all');
      setProductCategoryFilter('all');
    } else if (/草稿|draft/i.test(query)) {
      setProductQuickView('draft');
      setProductSearch('');
      setProductLifecycleFilter('all');
      setProductZoneFilter('all');
      setProductCategoryFilter('all');
    } else if (/已归档|archived/i.test(query)) {
      setProductQuickView('archived');
      setProductSearch('');
      setProductLifecycleFilter('all');
      setProductZoneFilter('all');
      setProductCategoryFilter('all');
    } else if (/在售|已上架|published/i.test(query)) {
      setProductQuickView('published');
      setProductSearch('');
      setProductLifecycleFilter('all');
      setProductZoneFilter('all');
      setProductCategoryFilter('all');
    } else {
      const matchedProduct = merchantProducts.find(product =>
        [product.styleNo, product.name, product.name_zh, product.name_it, ...(product.skus || []).flatMap(sku => [sku.sku, sku.barcode])]
          .some(value => value && lowerQuery.includes(value.toLocaleLowerCase()))
      );
      if (matchedProduct) {
        setProductQuickView('all');
        setProductLifecycleFilter('all');
        setProductZoneFilter('all');
        setProductCategoryFilter('all');
        setProductSearch(matchedProduct.styleNo);
      }
    }
    void askOperatingAssistant(query, { openPanel: false }).then(success => setProductAiAnswerVisible(success));
  };
  const runProductSeriesAiQuery = (question: string) => {
    const query = question.trim();
    if (!query || assistantBusy) return;
    setCategoryAiQuestion(query);
    setCategoryAiAnswer('');
    setCategoryAiProducts([]);
    const normalized = query.toLocaleLowerCase();
    const matchedCategory = storeCategories.find(category =>
      normalized.includes(category.name.toLocaleLowerCase()) || normalized.includes(category.slug.toLocaleLowerCase())
    );
    const isCreateRequest = /新建|创建|新增|建一个|create|new collection|new category/i.test(query)
      && /系列|分类|collection|category/i.test(query);
    const isRenameRequest = /改名|重命名|rename/i.test(query) && Boolean(matchedCategory);
    const isContentRequest = /写|生成|撰写|优化|文案|描述|seo|搜索引擎|write|generate/i.test(query)
      && /描述|文案|seo|搜索引擎|description|title/i.test(query);

    if (isCreateRequest || isRenameRequest || isContentRequest) {
      const assistantPrompt = isContentRequest
        ? `请根据商家的要求，为店铺分类${matchedCategory ? `「${matchedCategory.name}」` : ''}创作可供人工核对的系列文案。商家要求：${query}。RUDA 当前只保存分类名称，不支持保存系列描述、SEO 字段或封面图片；请只输出文案草稿，并明确它尚未保存，不要声称已更新店铺或已生成图片。按商家要求使用中文、意大利语或英语。`
        : `商家希望${isRenameRequest ? `将店铺分类「${matchedCategory?.name}」改名` : '新建一个店铺分类'}。商家的需求：${query}。请结合需求提炼一个简洁、适合店铺导航的分类名称。RUDA 当前系列仅支持手动店铺分类，不支持按标签自动匹配的智能规则。只输出一行，格式必须为：系列名称：<名称>。不要声称已创建、已修改或已配置规则。`;
      const renameTarget = isRenameRequest ? matchedCategory : undefined;
      void askOperatingAssistant(assistantPrompt, {
        openPanel: false,
        onReply: reply => {
          const suggestedName = reply.match(/系列名称\s*[：:]\s*([^\n]+)/)?.[1]?.trim().replace(/^["'“”*]+|["'“”*]+$/g, '');
          setCategoryAiAnswer(isCreateRequest || isRenameRequest
            ? `${reply}\n\n名称仅填入下方待确认表单，尚未保存。当前系统只支持手动店铺分类，不会按标签自动收录商品。`
            : `${reply}\n\n这是文案草稿，尚未写入店铺。分类目前只支持名称和商品归类，暂不支持描述、SEO 或封面内容。`);
          if (suggestedName) {
            setNewCategoryName(suggestedName.slice(0, 40));
            setEditingStoreCategoryId(renameTarget?.id || null);
            addNotification('success', '系列名称草稿已准备', '请核对下方名称，再手动点击保存');
          }
        }
      });
      return;
    }

    const hasImage = (product: Product) => Boolean(
      product.media?.some(media => media.type === 'image' && Boolean(media.url))
      || product.images?.some(Boolean)
    );
    const categoryProducts = storeCategories.map(category => ({
      category,
      products: merchantProducts.filter(product => product.category === category.slug)
    }));
    const unassignedProducts = merchantProducts.filter(product =>
      !storeCategories.some(category => category.slug === product.category)
    );
    let answer = '';
    let resultProducts: Product[] = [];

    if (/空系列|空分类|没有商品的系列|empty collection|empty categor/i.test(query)) {
      const emptyCategories = categoryProducts.filter(item => item.products.length === 0);
      answer = emptyCategories.length
        ? `找到 ${emptyCategories.length} 个空系列：${emptyCategories.map(item => item.category.name).join('、')}。`
        : '当前没有空系列；每个店铺分类至少关联了一款商品。';
    } else if (/没有系列|未归类|未分类|不属于任何系列|unassigned|uncategorized/i.test(query)) {
      resultProducts = unassignedProducts;
      answer = `找到 ${unassignedProducts.length} 款商品没有关联到现有店铺分类。产品支持单一分类归属，下面列出款号与名称供你检查。`;
    } else if (/系列|分类/.test(query) && /图片/.test(query) && /描述/.test(query) && /缺|没有|无/.test(query)) {
      const missingImageProducts = merchantProducts.filter(product => !hasImage(product));
      const missingDescriptionProducts = merchantProducts.filter(product => !product.description?.trim());
      const affectedCategories = categoryProducts.filter(item =>
        item.products.some(product => !hasImage(product) || !product.description?.trim())
      );
      resultProducts = [...new Map([...missingImageProducts, ...missingDescriptionProducts]
        .filter(product => storeCategories.some(category => category.slug === product.category))
        .map(product => [product.id, product])).values()];
      answer = `${affectedCategories.length} 个系列至少有一款商品缺图或缺商品描述：${affectedCategories.map(item => item.category.name).join('、') || '无'}。系列本身没有独立的图片/描述字段；下方列出系列内需补充资料的商品。`;
    } else if (/系列.{0,8}(?:没有图片|缺图片|无图片)|分类.{0,8}(?:没有图片|缺图片|无图片)|collection.{0,12}no image/i.test(query)) {
      const affected = categoryProducts.filter(item => item.products.length > 0 && item.products.some(product => !hasImage(product)));
      resultProducts = affected.flatMap(item => item.products.filter(product => !hasImage(product)));
      answer = `有 ${affected.length} 个系列至少包含一款缺少商品图片的商品：${affected.map(item => item.category.name).join('、') || '无'}；共 ${resultProducts.length} 款。当前系统没有系列封面字段；以下检查的是系列内商品图片。`;
    } else if (/系列.{0,8}(?:没有描述|缺描述|无描述)|分类.{0,8}(?:没有描述|缺描述|无描述)|collection.{0,12}no description/i.test(query)) {
      const affected = categoryProducts.filter(item => item.products.length > 0 && item.products.some(product => !product.description?.trim()));
      resultProducts = affected.flatMap(item => item.products.filter(product => !product.description?.trim()));
      answer = `有 ${affected.length} 个系列至少包含一款缺少商品描述的商品：${affected.map(item => item.category.name).join('、') || '无'}；共 ${resultProducts.length} 款。当前系统没有系列描述字段；以下检查的是系列内商品描述。`;
    } else if (/产品.{0,12}(?:属于|在哪|所属)|(?:属于|在哪个).{0,12}系列|product.{0,12}collection/i.test(query)) {
      const matchedProduct = merchantProducts.find(product =>
        [product.styleNo, product.name, product.name_zh, product.name_it, ...(product.skus || []).flatMap(sku => [sku.sku, sku.barcode])]
          .some(value => Boolean(value) && normalized.includes(value!.toLocaleLowerCase()))
      );
      if (matchedProduct) {
        const memberships = storeCategories.filter(category => category.slug === matchedProduct.category);
        answer = memberships.length
          ? `${matchedProduct.styleNo} · ${matchedProduct.name_zh || matchedProduct.name} 当前属于「${memberships.map(category => category.name).join('、')}」。每款商品目前仅支持一个店铺分类。`
          : `${matchedProduct.styleNo} · ${matchedProduct.name_zh || matchedProduct.name} 没有匹配到现有店铺分类。`;
        resultProducts = [matchedProduct];
      } else {
        answer = '没有从问题中识别到确切的款号、SKU、条码或商品名称。请补充其中一项，我会按本店商品资料查询。';
      }
    } else if (/建议|规划|recommend|plan/i.test(query) && /系列|分类|商品|产品|collection|categor/i.test(query)) {
      const groups = new Map<string, number>();
      merchantProducts.forEach(product => {
        const group = product.subCategory?.trim() || product.category?.trim();
        if (group) groups.set(group, (groups.get(group) || 0) + 1);
      });
      const recommendations = [...groups.entries()].sort((left, right) => right[1] - left[1]).slice(0, 6);
      answer = recommendations.length
        ? `按现有商品类型，优先考虑以下手动系列规划：${recommendations.map(([name, count]) => `${name}（${count} 款）`).join('、')}。这是按商品资料归类的建议，不会自动创建系列；确认后可用下方表单逐个添加。`
        : '当前商品资料没有可用于分组的商品类型。请先补充商品分类，再规划店铺系列。';
    } else if (matchedCategory) {
      const productsInCategory = merchantProducts.filter(product => product.category === matchedCategory.slug);
      resultProducts = productsInCategory;
      answer = `「${matchedCategory.name}」是手动店铺分类，当前包含 ${productsInCategory.length} 款商品；系统没有该分类的智能规则。${productsInCategory.length ? `商品：${productsInCategory.slice(0, 12).map(product => `${product.styleNo} ${product.name_zh || product.name}`).join('、')}${productsInCategory.length > 12 ? '…' : ''}` : '这是一个空系列。'}`;
    } else if (/系列|分类|collection|category|手动|智能|规则/i.test(query)) {
      const listing = categoryProducts.map(({ category, products: items }) => `${category.name}（手动，${items.length} 款）`);
      answer = `本店共有 ${storeCategories.length} 个手动店铺分类、0 个智能系列。${listing.length ? `\n${listing.join('；')}` : '\n目前还没有店铺分类。'}\n产品可关联到一个分类；智能规则、系列描述、SEO 与封面字段尚未接入。`;
    } else {
      answer = '可以查询系列清单、系列商品数、空系列、缺图/缺商品描述、未归类商品以及商品所属系列。也可以让我预填系列名称或生成描述/SEO 文案草稿。';
    }
    setCategoryAiAnswer(answer);
    setCategoryAiProducts(resultProducts);
  };
  const saveCategoryMembership = async () => {
    const category = storeCategories.find(item => item.id === categoryMembershipId);
    if (!category || categoryMembershipBusy) return;
    const productsToMove = categoryMembershipProductIds.filter(id =>
      merchantProducts.some(product => product.id === id && product.category !== category.slug)
    );
    if (!productsToMove.length) {
      addNotification('warning', '没有需要调整的商品', '所选商品已经属于这个系列');
      return;
    }
    if (productsToMove.length > 500) {
      addNotification('warning', '一次最多调整 500 款商品', '请分批选择后再次保存');
      return;
    }
    if (!window.confirm(`确认将 ${productsToMove.length} 款商品归入「${category.name}」？这会替换这些商品当前的单一分类。`)) return;
    setCategoryMembershipBusy(true);
    try {
      const result = await apiPut<{ success: true; count: number; products: Product[] }>('/api/merchant/products/batch', { productIds: productsToMove, category: category.slug });
      if (serverProducts === null) {
        try {
          await refreshMerchantOperations();
        } catch (error) {
          addNotification('warning', '系列归属已保存，但商品列表刷新失败', error instanceof Error ? error.message : '请刷新页面确认结果');
          return;
        }
      } else {
        setServerProducts(previous => previous?.map(product => result.products.find(updated => updated.id === product.id) || product) || previous);
      }
      setCategoryMembershipProductIds(previous => [...new Set([...previous, ...result.products.map(product => product.id)])]);
      addNotification('success', '系列商品已更新', `${result.count} 款商品已归入「${category.name}」`);
    } catch (error) {
      addNotification('warning', '系列商品更新失败', error instanceof Error ? error.message : '请刷新页面确认商品归属');
    } finally {
      setCategoryMembershipBusy(false);
    }
  };
  const saveCurrentProductView = () => {
    if (!currentMerchantId) return;
    const name = window.prompt('为当前商品筛选视图命名（例如：冬季低库存）')?.trim();
    if (!name) return;
    const preset: ProductViewPreset = {
      id: crypto.randomUUID(),
      name: name.slice(0, 40),
      search: productSearch,
      lifecycle: productLifecycleFilter,
      zone: productZoneFilter,
      category: productCategoryFilter,
      sort: productSort,
      quickView: productQuickView
    };
    const nextViews = [...savedProductViews.filter(view => view.name !== preset.name), preset].slice(-20);
    try {
      window.localStorage.setItem(`ruda-product-views:${currentMerchantId}`, JSON.stringify(nextViews));
      setSavedProductViews(nextViews);
      setSelectedProductView(preset.id);
      addNotification('success', '商品视图已保存', '此视图仅保存在此设备，并按商家账号区分。');
    } catch (error) {
      addNotification('warning', '商品视图保存失败', '设备可用空间不足，请清理空间后重试。');
    }
  };
  const applySavedProductView = (viewId: string) => {
    setSelectedProductView(viewId);
    const view = savedProductViews.find(item => item.id === viewId);
    if (!view) return;
    setProductSearch(view.search);
    setProductLifecycleFilter(view.lifecycle);
    setProductZoneFilter(view.zone);
    setProductCategoryFilter(view.category);
    setProductSort(view.sort);
    setProductQuickView(view.quickView);
  };
  const deleteSavedProductView = () => {
    if (!currentMerchantId || !selectedProductView) return;
    const nextViews = savedProductViews.filter(view => view.id !== selectedProductView);
    try {
      window.localStorage.setItem(`ruda-product-views:${currentMerchantId}`, JSON.stringify(nextViews));
      setSavedProductViews(nextViews);
      setSelectedProductView('');
    } catch (error) {
      addNotification('warning', '商品视图删除失败', '请刷新页面后重试。');
    }
  };

  // Submit stock transfer
  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPost('/api/merchant/transfers', {
        fromLocation: transferData.fromLocation,
        toLocation: transferData.toLocation,
        styleNo: transferData.styleNo,
        sku: transferData.sku,
        quantity: Number(transferData.quantity),
        notes: transferData.notes
      });
      await refreshMerchantOperations();
      addNotification('success', '调拨申请已提交', `已向仓储中心提交 ${transferData.quantity} 件商品的调拨申请`);
      setIsTransferModalOpen(false);
    } catch (error) {
      addNotification('warning', '调拨申请失败', error instanceof Error ? error.message : '请核对库存与仓库信息');
    }
  };

  const handleReturnReview = async (returnRequest: MerchantReturn, status: 'approved' | 'rejected') => {
    try {
      await apiPut(`/api/merchant/returns/${encodeURIComponent(returnRequest.id)}/review`, { status });
      await refreshMerchantOperations();
      addNotification(
        status === 'approved' ? 'success' : 'info',
        status === 'approved' ? '退货申请已批准' : '退货申请已拒绝',
        `${returnRequest.order.orderNo} 的售后状态已更新`
      );
    } catch (error) {
      addNotification('warning', '退货审核失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  const handleReturnReceive = async (returnRequest: MerchantReturn) => {
    try {
      await apiPost(`/api/merchant/returns/${encodeURIComponent(returnRequest.id)}/receive`, {});
      await refreshMerchantOperations();
      addNotification('success', '已登记退货收货', `${returnRequest.order.orderNo}：已入库并提交退款处理；实际退款以支付渠道回执为准`);
    } catch (error) {
      addNotification('warning', '退货收货登记失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  // Order fulfillment submission
  const handleFulfillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForFulfill) return;
    try {
      const nextStatus = selectedOrderForFulfill.status === 'placed' || selectedOrderForFulfill.status === 'pending'
        ? 'confirmed'
        : selectedOrderForFulfill.status === 'confirmed' ? 'picking' : null;
      if (nextStatus) {
        await apiPut(`/api/merchant/orders/${encodeURIComponent(selectedOrderForFulfill.id)}/fulfill`, {
          status: nextStatus,
          notes: fulfillNotes || (nextStatus === 'confirmed' ? '商家已确认订单' : '商家已开始配货')
        });
      } else if (selectedOrderForFulfill.status === 'picking') {
        if (!fulfillCarrier.trim() || !fulfillTracking.trim()) {
          throw new Error('请填写真实承运商和物流单号后再创建包裹');
        }
        const shippedByItem = new Map<string, number>();
        fulfillShipments.filter(shipment => ['shipped', 'delivered', 'exception'].includes(shipment.status)).forEach(shipment => shipment.items.forEach(item => {
          shippedByItem.set(item.orderItemId, (shippedByItem.get(item.orderItemId) || 0) + item.quantity);
        }));
        await apiPost(`/api/merchant/orders/${encodeURIComponent(selectedOrderForFulfill.id)}/shipments`, {
          items: selectedOrderForFulfill.items
            .map(item => ({ orderItemId: item.id, quantity: Math.max(0, item.quantity - (shippedByItem.get(item.id) || 0)) }))
            .filter(item => item.quantity > 0),
          carrier: fulfillCarrier,
          trackingNumber: fulfillTracking.trim(),
        });
      } else {
        throw new Error('ORDER_NOT_READY_FOR_FULFILLMENT');
      }
      await refreshMerchantOperations();
      addNotification('success', nextStatus === 'confirmed' ? '订单已确认' : nextStatus === 'picking' ? '订单已进入配货' : '包裹已创建', `订单 ${selectedOrderForFulfill.orderNo} 履约状态已更新`);
      setSelectedOrderForFulfill(null);
      setFulfillTracking('');
      setFulfillNotes('');
    } catch (error) {
      addNotification('warning', '订单发货失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  const updateShipmentStatus = async (shipment: (typeof fulfillShipments)[number], status: 'shipped' | 'exception' | 'cancelled') => {
    if (!selectedOrderForFulfill) return;
    try {
      await apiPut(`/api/merchant/orders/${encodeURIComponent(selectedOrderForFulfill.id)}/shipments/${encodeURIComponent(shipment.id)}`, {
        status,
        note: status === 'exception' ? '商家标记包裹物流异常' : status === 'cancelled' ? '商家取消未完成包裹' : '商家恢复包裹履约'
      });
      const result = await apiGet<{ success: true; shipments: typeof fulfillShipments }>(
        `/api/merchant/orders/${encodeURIComponent(selectedOrderForFulfill.id)}/shipments`
      );
      setFulfillShipments(result.shipments);
      await refreshMerchantOperations();
      addNotification(status === 'exception' ? 'warning' : 'success', status === 'exception' ? '包裹已标记异常' : status === 'cancelled' ? '包裹已取消' : '包裹已恢复履约', shipment.shipmentNo);
    } catch (error) {
      addNotification('warning', '包裹状态更新失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  const loadTrackingEvents = async (shipmentId: string) => {
    if (!selectedOrderForFulfill) return;
    try {
      const result = await apiGet<{ success: true; events: typeof trackingEvents }>(`/api/merchant/orders/${encodeURIComponent(selectedOrderForFulfill.id)}/shipments/${encodeURIComponent(shipmentId)}/tracking`);
      setTrackingShipmentId(shipmentId);
      setTrackingEvents(result.events);
    } catch (error) {
      addNotification('warning', '物流轨迹读取失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };
  const openProductCategories = () => {
    openSidebarNav('products');
    setProductWorkspaceSection('categories');
    setActiveTab('products');
  };
  const openProductCatalog = () => {
    setProductWorkspaceSection('catalog');
    setActiveTab('products');
  };
  const openContentSection = (section: ContentKind) => {
    setContentSection(section);
    setActiveTab('content');
    openSidebarNav('store');
  };
  const openMerchantHome = () => {
    setDashboardNavSection('home');
    setActiveTab('dashboard');
    setSidebarNavExpanded(null);
    window.requestAnimationFrame(() => document.getElementById('merchant-dashboard-home')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const openMerchantSettings = () => {
    setSidebarNavExpanded(null);
    setSettingsSubsection('general');
    setActiveSettingsEntry('general');
    setSettingsNotice(null);
    setSettingsSearch('');
    setAssistantPanelOpen(false);
    setAssistantPanelExpanded(false);
    setActiveTab('settings');
  };
  const openMerchantAnalytics = () => {
    openSidebarNav('dashboard');
    setDashboardNavSection('analytics');
    setActiveTab('dashboard');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById('merchant-analytics')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  };
  const openTeamSettings = (section: 'team' | 'roles' = 'team') => {
    setSidebarNavExpanded(null);
    setSettingsSubsection(section);
    setActiveSettingsEntry(section === 'team' ? 'users' : 'roles');
    setActiveTab('settings');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById('merchant-team-settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  };
  const openSettingsSection = (section: 'general' | 'rules' | 'notifications' | 'mobile' | 'team' | 'storefront') => {
    if (section === 'storefront') {
      setActiveTab('profile');
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          document.getElementById('merchant-storefront-settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
      return;
    }
    const sectionIds = {
      general: 'merchant-settings-general',
      rules: 'merchant-settings-rules',
      notifications: 'merchant-settings-notifications',
      mobile: 'merchant-settings-mobile',
      team: 'merchant-team-settings'
    } as const;
    setSidebarNavExpanded(null);
    if (section === 'rules') setActiveSettingsEntry('checkout');
    else if (section === 'notifications') setActiveSettingsEntry('notifications');
    else if (section === 'team') setActiveSettingsEntry('users');
    setSettingsSubsection(section);
    setActiveTab('settings');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(sectionIds[section])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  };
  const merchantSettingsGroups = [
    {
      label: localizeCopy('店铺与账户', 'Negozio e account'),
      entries: [
        ['general', localizeCopy('常规', 'Generale'), localizeCopy('店铺资料、地址和联系人。', 'Profilo, indirizzo e contatti.')],
        ['plan', localizeCopy('套餐', 'Piano'), localizeCopy('RUDA 套餐管理尚未开放。', 'Piani self-service non disponibili.')],
        ['billing', localizeCopy('账单', 'Fatturazione'), localizeCopy('查看 RUDA 结算与收款账户。', 'Saldo e liquidazioni RUDA.')],
        ['users', localizeCopy('用户', 'Utenti'), localizeCopy('员工账号及其后台访问。', 'Account dei dipendenti.')],
        ['roles', localizeCopy('角色', 'Ruoli'), localizeCopy('配置员工岗位权限。', 'Permessi per ruolo.')],
        ['security', localizeCopy('安全', 'Sicurezza'), localizeCopy('商家登录保护尚无独立配置页。', 'Protezione account non gestita qui.')]
      ] as const
    },
    {
      label: localizeCopy('销售与交付', 'Vendite e consegna'),
      entries: [
        ['payments', localizeCopy('支付', 'Pagamenti'), localizeCopy('结算账户与收款状态；线下 POS 需人工确认。', 'Liquidazioni e incassi manuali.')],
        ['checkout', localizeCopy('结账', 'Checkout'), localizeCopy('MOQ、默认账期和运费说明。', 'Regole ordine e termini.')],
        ['customer-accounts', localizeCopy('客户账户', 'Account clienti'), localizeCopy('管理已认证的 B2B 客户账户。', 'Clienti B2B verificati.')],
        ['shipping', localizeCopy('发货和配送', 'Spedizione e consegna'), localizeCopy('订单履约、物流与自提处理。', 'Ordini, ritiro e spedizioni.')],
        ['taxes', localizeCopy('税款和关税', 'Imposte e dazi'), localizeCopy('商家资料中的 VAT/税号。', 'Dati fiscali nel profilo.')],
        ['locations', localizeCopy('地点', 'Sedi'), localizeCopy('门店地址与 RUDA 中心仓。', 'Indirizzo negozio e magazzino centrale.')]
      ] as const
    },
    {
      label: localizeCopy('渠道与内容', 'Canali e contenuti'),
      entries: [
        ['apps', localizeCopy('应用', 'App'), localizeCopy('RUDA 尚无商家应用市场。', 'Marketplace non disponibile.')],
        ['sales-channels', localizeCopy('销售渠道', 'Canali di vendita'), localizeCopy('RUDA 网店与店铺链接。', 'Vetrina RUDA e link negozio.')],
        ['domains', localizeCopy('域名', 'Domini'), localizeCopy('查看 RUDA 店铺链接；暂不支持自定义域名。', 'URL RUDA assegnato.')],
        ['languages', localizeCopy('语言', 'Lingue'), localizeCopy('商家后台语言与多语言店铺内容。', 'Lingua account e contenuti.')],
        ['notifications', localizeCopy('通知', 'Notifiche'), localizeCopy('订单、结算和授权申请提醒。', 'Preferenze avvisi merchant.')]
      ] as const
    },
    {
      label: localizeCopy('数据与合规', 'Dati e conformità'),
      entries: [
        ['customer-events', localizeCopy('客户事件', 'Eventi cliente'), localizeCopy('经营分析；客户行为像素尚未接入。', 'Analisi operativa; pixel non collegati.')],
        ['custom-data', localizeCopy('元字段和元对象', 'Metacampi e metaoggetti'), localizeCopy('管理网店元对象内容。', 'Contenuti metaoggetto.')],
        ['privacy', localizeCopy('客户隐私', 'Privacy clienti'), localizeCopy('客户同意及跟踪设置尚未接入。', 'Consenso e pixel non configurabili.')],
        ['policies', localizeCopy('政策', 'Policy'), localizeCopy('网店配送、退货等公开政策。', 'Policy vetrina pubblica.')]
      ] as const
    }
  ];
  const runMerchantSettingsEntry = (entry: MerchantSettingsEntryId) => {
    setActiveSettingsEntry(entry);
    setSettingsNotice(null);
    const showNotice = (title: string, body: string, distinction?: string) => {
      setSettingsNotice({ title, body, distinction });
      setActiveTab('settings');
      setSettingsSubsection('info');
      setSidebarNavExpanded(null);
    };
    switch (entry) {
      case 'general':
        openSettingsSection('general');
        break;
      case 'plan':
        showNotice(localizeCopy('RUDA 套餐', 'Piano RUDA'), localizeCopy('当前账户尚未开放自助套餐管理。', 'La gestione self-service dei piani non è attiva per questo account.'), localizeCopy('套餐订阅不同于结算和账单流水；这里不会虚构套餐状态。', 'Non è il riepilogo delle fatture o delle liquidazioni.'));
        break;
      case 'billing':
        setSidebarNavExpanded(null);
        setActiveTab('finance');
        setSettingsNotice({ title: localizeCopy('账单与结算', 'Fatturazione e liquidazioni'), body: localizeCopy('此页管理商家收款账户及 RUDA 结算记录。', 'Questa pagina mostra saldo merchant, conto di accredito e liquidazioni RUDA.'), distinction: localizeCopy('这是 RUDA 向商家的结算，不是商家支付给平台的套餐账单。', 'Non sono le fatture di abbonamento Shopify.') });
        break;
      case 'users':
      case 'roles':
        openTeamSettings(entry === 'users' ? 'team' : 'roles');
        break;
      case 'security':
        setSidebarNavExpanded(null);
        setActiveTab('settings');
        setSettingsSubsection('info');
        break;
      case 'payments':
        setSidebarNavExpanded(null);
        setActiveTab('settings');
        setSettingsSubsection('payments');
        break;
      case 'checkout':
        setSettingsNotice({ title: localizeCopy('下单规则', 'Regole ordine'), body: localizeCopy('在常规设置中配置全店 MOQ、默认账期和运费说明。', 'Configura quantità minima, termini di pagamento e note di spedizione.'), distinction: localizeCopy('结账规则决定客户如何提交订单；支付通道是另一项能力。', 'Le preferenze di incasso sono gestite nella sezione finanza.') });
        openSettingsSection('rules');
        break;
      case 'customer-accounts':
        setSidebarNavExpanded(null);
        setActiveTab('customers');
        setSettingsNotice({ title: localizeCopy('客户账户', 'Account clienti'), body: localizeCopy('客户页管理已认证 B2B 买家资料和关系。', 'La pagina clienti gestisce acquirenti B2B verificati e il loro stato.'), distinction: localizeCopy('客户账户是购物买家；后台用户是商家员工，两者不同。', 'Non sono gli utenti merchant che accedono al pannello.') });
        break;
      case 'shipping':
        setSidebarNavExpanded(null);
        setActiveTab('orders');
        setSettingsNotice({ title: localizeCopy('发货和配送', 'Spedizione e consegna'), body: localizeCopy('在订单履约中登记承运商、物流单号、物流轨迹和门店自提。', 'Gestisci evasione, corrieri, tracking e ritiro dagli ordini.'), distinction: localizeCopy('履约处理具体包裹；MOQ、账期等下单规则在“结账/经营规则”。', 'Le regole MOQ e pagamento restano nelle impostazioni ordine.') });
        break;
      case 'taxes':
        setSettingsNotice({ title: localizeCopy('税务资料', 'Dati fiscali'), body: localizeCopy('VAT/税号和法定主体信息可在商家资料中维护。', 'La partita IVA e i dati aziendali sono nel profilo merchant.'), distinction: localizeCopy('保存税号不等于已配置自动税费计算或跨境关税规则。', 'Il calcolo e la riscossione automatica delle imposte non sono collegati.') });
        openSettingsSection('general');
        break;
      case 'locations':
        setSettingsNotice({ title: localizeCopy('营业地点与库存', 'Sede e magazzino'), body: localizeCopy('门店地址在商家资料中维护；RUDA 库存目前统一使用共享中心仓。', 'L’indirizzo della sede è nel profilo; RUDA usa un magazzino centrale condiviso.'), distinction: localizeCopy('地点不是销售市场；当前不能配置多个独立库存地点。', 'Non sono configurabili più sedi con inventario indipendente.') });
        openSettingsSection('general');
        break;
      case 'apps':
        showNotice(localizeCopy('应用与集成', 'App e integrazioni'), localizeCopy('RUDA 当前没有商家应用市场；只有已接入的系统功能才会显示为可用。', 'RUDA non dispone di un marketplace merchant; le integrazioni vengono attivate solo quando supportate dal servizio.'), localizeCopy('应用是扩展工具；销售渠道是实际卖货入口，概念不同。', 'Un canale di vendita non è la stessa cosa di un’app installata.'));
        break;
      case 'sales-channels':
        setSettingsNotice({ title: localizeCopy('销售渠道', 'Canali di vendita'), body: localizeCopy('店铺展示页管理 RUDA 网店品牌资料、内容和公开政策。', 'Apri la vetrina RUDA e gestisci brand, contenuti e policy pubbliche.'), distinction: localizeCopy('当前可用的是 RUDA 网店入口；第三方销售渠道尚未接入。', 'I canali esterni aggiuntivi non sono collegati.') });
        openSettingsSection('storefront');
        break;
      case 'domains':
        setSettingsNotice({ title: localizeCopy('店铺域名', 'Dominio del negozio'), body: localizeCopy("当前 RUDA 店铺链接：{{RUDA_ARG_0}}", "URL negozio assegnato: {{RUDA_ARG_0}}", [String(merchantSharePath)]), distinction: localizeCopy('店铺网址与显示名称不同；目前只使用 RUDA 分配链接，尚不支持在此绑定自定义域名。', 'La connessione di un dominio personalizzato non è disponibile qui.') });
        openSettingsSection('storefront');
        break;
      case 'customer-events':
        setSettingsNotice({ title: localizeCopy('客户事件与分析', 'Eventi cliente e analisi'), body: localizeCopy('查看 RUDA 经营分析中的订单、销售和库存汇总。', 'Apri le analisi operative RUDA per vendite e scorte.'), distinction: localizeCopy('这里的经营报表不是网站像素事件；客户行为像素及广告追踪尚未接入，使用外部追踪前需确认用户同意与隐私要求。', 'Pixel e tracciamento pubblicitario non sono configurabili; verifica consenso e privacy prima di integrare strumenti esterni.') });
        openMerchantAnalytics();
        break;
      case 'notifications':
        setSettingsNotice({ title: localizeCopy('通知', 'Notifiche'), body: localizeCopy('在通知偏好中选择订单、结算、私密货盘申请和营销提醒。', 'Imposta le preferenze di avviso merchant per ordini, liquidazioni e richieste private.'), distinction: localizeCopy('当前是商家提醒偏好，不是客户营销群发，也不包含邮件模板/自动化编辑。', 'Template email e automazioni evento non sono configurabili separatamente.') });
        openSettingsSection('notifications');
        break;
      case 'custom-data':
        setSettingsNotice({ title: localizeCopy('元字段和元对象', 'Metaoggetti e dati personalizzati'), body: localizeCopy('在网店内容工作台中维护现有元对象内容。', 'Gestisci i contenuti metaoggetto disponibili nella vetrina RUDA.'), distinction: localizeCopy('元字段/元对象是结构化数据；新增后是否展示还取决于网店内容配置，当前不是完整的 Shopify 元字段系统。', 'La struttura completa dei metacampi e il collegamento automatico al tema non sono disponibili.') });
        openContentSection('metaobject');
        break;
      case 'languages':
        setSettingsNotice({ title: localizeCopy('语言', 'Lingua'), body: localizeCopy('选择 RUDA 商家后台账户语言。', 'Scegli la lingua dell’intero account merchant.'), distinction: localizeCopy('更改后台语言不会自动翻译商品、政策或店铺文案。', 'La traduzione delle schede prodotto deve essere gestita nei relativi contenuti.') });
        setSidebarNavExpanded(null);
        setSettingsSubsection('language');
        setActiveTab('settings');
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => document.getElementById('merchant-settings-language')?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
        break;
      case 'privacy':
        showNotice(localizeCopy('客户隐私', 'Privacy clienti'), localizeCopy('RUDA 商家后台尚未提供客户同意/追踪像素配置。', 'Le preferenze di consenso e i pixel non sono ancora configurabili nel portale.'), localizeCopy('隐私数据收集设置与向客户展示的政策文本不同；现有政策可在网店设置管理。', 'Le policy pubbliche sono gestite separatamente nella vetrina.'));
        break;
      case 'policies':
        setSettingsNotice({ title: localizeCopy('网店政策', 'Policy del negozio'), body: localizeCopy('在网店展示设置里编辑配送与退换货政策等公开文本。', 'Gestisci policy di spedizione e reso mostrate nella vetrina.'), distinction: localizeCopy('政策文本向客户公开；不等于系统自动计算税费、运费或退货资格。', 'Il testo deve riflettere le regole effettive e gli obblighi locali.') });
        openSettingsSection('storefront');
        break;
    }
  };
  const filteredMerchantSettingsGroups = merchantSettingsGroups
    .map(group => ({
      ...group,
      entries: group.entries.filter(([, label, description]) => `${label} ${description}`.toLocaleLowerCase().includes(settingsSearch.trim().toLocaleLowerCase()))
    }))
    .filter(group => group.entries.length > 0);

  const addTrackingEvent = async () => {
    if (!selectedOrderForFulfill || !trackingShipmentId || !trackingEventForm.status.trim()) return;
    try {
      await apiPost(`/api/merchant/orders/${encodeURIComponent(selectedOrderForFulfill.id)}/shipments/${encodeURIComponent(trackingShipmentId)}/tracking`, trackingEventForm);
      setTrackingEventForm({ status: '运输中', location: '', description: '' });
      await loadTrackingEvents(trackingShipmentId);
      addNotification('success', '物流轨迹已记录', '包裹最新状态已保存');
    } catch (error) {
      addNotification('warning', '物流轨迹保存失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  useEffect(() => {
    if (!selectedOrderForFulfill) {
      setFulfillShipments([]);
      return;
    }
    let active = true;
    setFulfillShipmentsLoading(true);
    void apiGet<{ success: true; shipments: typeof fulfillShipments }>(
      `/api/merchant/orders/${encodeURIComponent(selectedOrderForFulfill.id)}/shipments`
    ).then(result => {
      if (active) setFulfillShipments(result.shipments);
    }).catch(error => {
      if (active) addNotification('warning', '包裹读取失败', error instanceof Error ? error.message : '请稍后重试');
    }).finally(() => {
      if (active) setFulfillShipmentsLoading(false);
    });
    return () => { active = false; };
  }, [selectedOrderForFulfill?.id]);

  if (activeTab === 'pos') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-neutral-100 text-neutral-900">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 shadow-sm sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-950 text-xs font-black text-white">R</span>
            <div className="min-w-0">
              <p className="text-xs font-black tracking-wide text-neutral-950">RUDA SMART POS</p>
              <p className="truncate text-[10px] text-neutral-500">{currentMerchant.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            <Minimize2 className="h-4 w-4" />
            {localizeCopy('退出 POS', 'Esci dal POS')}
          </button>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
          {!currentMerchant.isVerified && (
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">{localizeCopy('后台已开通，店铺尚未公开', 'Workspace attivo, negozio non ancora pubblico')}</p>
                <p className="mt-1 text-xs leading-5 text-amber-900">{localizeCopy('你可以使用商家后台完善资料和商品；完成企业资质验证前，店铺与商品不会对外展示或销售。', 'Puoi configurare il workspace; negozio e prodotti resteranno nascosti fino alla verifica aziendale.')}</p>
              </div>
              <button type="button" onClick={() => { setActiveTab('settings'); openSettingsSection('general'); }} className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100">
                {localizeCopy('完善商家资料', 'Completa il profilo')}
              </button>
            </div>
          )}
          <Suspense fallback={<div className="flex min-h-64 items-center justify-center text-sm text-neutral-500">{localizeCopy('智能 POS 正在加载…', 'Caricamento del POS…')}</div>}>
            <MerchantSmartPos
              key={currentMerchant.id}
              merchantId={currentMerchant.id}
              products={merchantProducts}
              customers={merchantCustomers}
              orders={serverOrders ?? []}
              operationsIntelligence={operationsIntelligence}
              merchantName={currentMerchant.name}
              merchantLocation={{
                city: isIt ? currentMerchant.city_it || currentMerchant.city : currentMerchant.city_zh || currentMerchant.city,
                country: isIt ? currentMerchant.country_it || currentMerchant.country : currentMerchant.country_zh || currentMerchant.country,
                address: currentMerchant.showroomAddress
              }}
              isIt={isIt}
              onOrderCreated={refreshMerchantOperations}
              onRefreshProducts={async () => {
                const result = await apiGet<{ success: true; products: Product[] }>('/api/merchant/products');
                setServerProducts(result.products);
              }}
              onNotify={addNotification}
              onAskAI={(question, onReply) => askOperatingAssistant(question, {
                openPanel: false,
                context: 'orders',
                scope: 'orders',
                onReply
              })}
              onOpenMerchantSettings={section => {
                setActiveTab('settings');
                if (section === 'staff') openTeamSettings();
                else openSettingsSection('general');
              }}
            />
          </Suspense>
        </main>
      </div>
    );
  }

  if (isMobileMode) {
    return <MerchantMobileApp onSwitchToDesktop={() => setIsMobileMode(false)} />;
  }

  return (
    <div className={`merchant-web-layout mx-auto grid min-h-screen w-full max-w-none grid-cols-1 gap-0 lg:gap-0 ${activeTab === 'settings' ? 'lg:grid-cols-1' : assistantPanelOpen && !assistantPanelExpanded ? 'lg:grid-cols-[192px_minmax(0,1fr)_360px]' : 'lg:grid-cols-[192px_minmax(0,1fr)]'}`}>
      <header className="merchant-web-topbar sticky top-0 z-50 col-span-full flex h-14 items-center gap-3 bg-neutral-950 px-3 text-white shadow-sm sm:px-5">
        <div className="flex w-[204px] shrink-0 items-center gap-2 font-bold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-[11px] font-black text-neutral-950">R</span>
          <span className="text-sm">RUDA</span>
          <span className="hidden text-[10px] font-medium text-neutral-400 sm:inline">商家后台</span>
        </div>
        <div className="relative mx-auto flex min-w-0 max-w-xl flex-1 items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-500" />
          <input
            aria-label={localizeCopy('搜索订单、商品和客户', 'Cerca in tutto il pannello')}
            value={globalSearch}
            onChange={event => setGlobalSearch(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && globalSearchResults[0]) {
                setActiveTab(globalSearchResults[0].target);
                setGlobalSearch('');
              }
              if (event.key === 'Escape') setGlobalSearch('');
            }}
            placeholder={localizeCopy('搜索订单、商品和客户', 'Cerca ordini, prodotti e clienti')}
            className="h-9 w-full rounded-lg border border-white/10 bg-white/10 pl-9 pr-14 text-xs text-white placeholder:text-neutral-400 focus:border-white/30 focus:bg-white/15 focus:outline-none"
          />
          <kbd className="pointer-events-none absolute right-2.5 rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-neutral-400">⌕</kbd>
          {normalizedGlobalSearch && (
            <div className="absolute left-0 right-0 top-11 z-[60] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 text-neutral-900 shadow-xl">
              {globalSearchResults.length ? globalSearchResults.map(result => {
                const ResultIcon = result.icon;
                return (
                  <button
                    type="button"
                    key={result.key}
                    onClick={() => {
                      setActiveTab(result.target);
                      setGlobalSearch('');
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-neutral-50"
                  >
                    <ResultIcon className="h-4 w-4 shrink-0 text-neutral-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-neutral-800">{result.title}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-neutral-500">{result.detail}</span>
                    </span>
                  </button>
                );
              }) : <p className="px-3 py-3 text-xs text-neutral-500">{localizeCopy('没有找到相关订单、商品或客户', 'Nessun risultato')}</p>}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <a href="/" className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-2 text-[11px] font-semibold text-neutral-200 hover:bg-white/10 sm:px-3">
            <Home className="h-3.5 w-3.5" />{t('navStorefront')}
          </a>
          <a href={merchantSharePath} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-semibold text-neutral-200 hover:bg-white/10 sm:flex">
            <ExternalLink className="h-3.5 w-3.5" />{localizeCopy('查看店铺', 'Negozio')}
          </a>
          <button type="button" aria-label={localizeCopy('查看待处理订单', 'Ordini da gestire')} onClick={() => setActiveTab('orders')} className="relative flex h-9 w-9 items-center justify-center rounded-lg text-neutral-300 hover:bg-white/10 hover:text-white">
            <Bell className="h-4 w-4" />
            {orderActionCount > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-neutral-950" />}
          </button>
          <button type="button" aria-label={assistantPanelOpen ? (localizeCopy('关闭 GPTmoda 助手', 'Chiudi GPTmoda')) : (localizeCopy('打开 GPTmoda 助手', 'Apri GPTmoda'))} aria-expanded={assistantPanelOpen} onClick={() => setAssistantPanelOpen(open => !open)} className={`flex h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold transition ${assistantPanelOpen ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'text-neutral-200 hover:bg-white/10'}`}>
            <UserRound className="h-4 w-4" /><span className="hidden sm:inline">GPTmoda</span>
          </button>
        </div>
      </header>
      <aside className={`${activeTab === 'settings' ? 'hidden' : 'hidden lg:sticky lg:top-14 lg:flex lg:h-[calc(100vh-3.5rem)] lg:flex-col lg:overflow-hidden'} border-r border-neutral-200 bg-neutral-100 p-3`}>
        <div className="flex items-center gap-3 border-b border-neutral-100 px-2 pb-4 pt-2">
          <img src={merchantLogo} alt="" className="h-10 w-10 rounded-xl border border-neutral-200 object-cover" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-neutral-950">{currentMerchant.name}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{localizeCopy('RUDA 商家工作台', 'RUDA MERCHANT DESK')}</p>
          </div>
        </div>
        <nav aria-label="商家后台导航" className="merchant-web-sidebar-nav mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto px-1">
          <div>
            <div className="flex items-center gap-1">
              <button type="button" id="merchant-sidebar-tab-dashboard" onClick={openMerchantHome} className={`${navItemClass(activeTab === 'dashboard' && dashboardNavSection === 'home')} flex-1`}><Home className="h-4 w-4" />{localizeCopy('主页', 'Home')}</button>
              <button type="button" aria-label={dashboardNavIsExpanded ? '收起主页菜单' : '展开主页菜单'} aria-expanded={dashboardNavIsExpanded} onClick={() => toggleSidebarNav('dashboard')} className="rounded-lg p-2 text-neutral-500 hover:bg-white hover:text-neutral-900"><ChevronDown className={`h-3.5 w-3.5 transition-transform ${dashboardNavIsExpanded ? 'rotate-180' : ''}`} /></button>
            </div>
            {dashboardNavIsExpanded && <button type="button" id="merchant-sidebar-growth-analytics" onClick={openMerchantAnalytics} className={settingsSubItemClass(activeTab === 'dashboard' && dashboardNavSection === 'analytics')}><BarChart3 className="h-3.5 w-3.5" />{localizeCopy('分析', 'Analisi')}</button>}
            <button type="button" id="merchant-sidebar-tab-orders" onClick={() => { setSidebarNavExpanded(null); setActiveTab('orders'); }} className={navItemClass(activeTab === 'orders')}><Truck className="h-4 w-4" />{localizeCopy('订单', 'Ordini')}{orderActionCount > 0 && <span className="ml-auto min-w-5 rounded-full bg-blue-100 px-1.5 py-0.5 text-center text-[10px] font-bold text-blue-800">{orderActionCount > 99 ? '99+' : orderActionCount}</span>}</button>
            <button type="button" id="merchant-sidebar-tab-pos" onClick={() => { setSidebarNavExpanded(null); setActiveTab('pos'); }} className={navItemClass(false)}><ShoppingCart className="h-4 w-4" />{localizeCopy('智能 POS', 'Smart POS')}</button>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <button type="button" id="merchant-sidebar-tab-products" onClick={() => { openSidebarNav('products'); openProductCatalog(); }} className={`${navItemClass(productNavIsActive)} flex-1`}><Package className="h-4 w-4" />{localizeCopy('商品与库存', 'Prodotti e scorte')}<span className="ml-auto text-[10px] text-neutral-400">{merchantProducts.length}</span></button>
              <button type="button" aria-label={productNavIsExpanded ? '收起商品与库存菜单' : '展开商品与库存菜单'} aria-expanded={productNavIsExpanded} onClick={() => toggleSidebarNav('products')} className="rounded-lg p-2 text-neutral-500 hover:bg-white hover:text-neutral-900"><ChevronDown className={`h-3.5 w-3.5 transition-transform ${productNavIsExpanded ? 'rotate-180' : ''}`} /></button>
            </div>
            {productNavIsExpanded && <div className="ml-3 mt-2 space-y-3 border-l border-neutral-200 pl-2">
              <section>
                <h3 className="px-2 pb-1 text-[9px] font-bold uppercase tracking-wide text-neutral-400">{localizeCopy('商品管理', 'Catalogo')}</h3>
                <div className="space-y-0.5">
                  <button type="button" id="merchant-sidebar-product-list" onClick={openProductCatalog} className={settingsSubItemClass(activeTab === 'products' && productWorkspaceSection === 'catalog')}><Package className="h-3.5 w-3.5" />{localizeCopy('商品列表', 'Catalogo prodotti')}</button>
                  <button type="button" id="merchant-sidebar-product-categories" onClick={openProductCategories} className={settingsSubItemClass(false)}><Layers className="h-3.5 w-3.5" />{localizeCopy('商品分类', 'Collezioni')}</button>
                  <button type="button" id="merchant-sidebar-tab-sku-matrix" onClick={() => setActiveTab('sku_matrix')} className={settingsSubItemClass(activeTab === 'sku_matrix')}><Barcode className="h-3.5 w-3.5" />{localizeCopy('款式与规格', 'Varianti SKU')}</button>
                </div>
              </section>
              <section>
                <h3 className="px-2 pb-1 text-[9px] font-bold uppercase tracking-wide text-neutral-400">{localizeCopy('库存管理', 'Scorte')}</h3>
                <div className="space-y-0.5">
                  <button type="button" id="merchant-sidebar-tab-inventory" onClick={() => setActiveTab('inventory')} className={settingsSubItemClass(activeTab === 'inventory')}><Boxes className="h-3.5 w-3.5" />{localizeCopy('库存', 'Giacenze')}</button>
                </div>
              </section>
              <section>
                <h3 className="px-2 pb-1 text-[9px] font-bold uppercase tracking-wide text-neutral-400">{localizeCopy('生产与采购', 'Produzione e approvvigionamento')}</h3>
                <div className="space-y-0.5">
                  <button type="button" id="merchant-sidebar-tab-production" onClick={() => setActiveTab('production')} className={settingsSubItemClass(activeTab === 'production')}><ClipboardCheck className="h-3.5 w-3.5" />{localizeCopy('生产工单', 'Produzione')}<span className="ml-auto text-[10px] text-neutral-400">{productionWorkOrders.filter(order => !['completed', 'cancelled'].includes(order.status)).length}</span></button>
                  <button type="button" id="merchant-sidebar-tab-materials" onClick={() => setActiveTab('materials')} className={settingsSubItemClass(activeTab === 'materials')}><Layers className="h-3.5 w-3.5" />{localizeCopy('物料', 'Materiali')}</button>
                  <button type="button" id="merchant-sidebar-tab-procurement" onClick={() => setActiveTab('procurement')} className={settingsSubItemClass(activeTab === 'procurement')}><ClipboardCheck className="h-3.5 w-3.5" />{localizeCopy('采购订单', 'Acquisti')}</button>
                </div>
              </section>
            </div>}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <button type="button" id="merchant-sidebar-tab-customers" onClick={() => { openSidebarNav('customers'); setActiveTab('customers'); }} className={`${navItemClass(customerNavIsActive)} flex-1`}><UserCheck className="h-4 w-4" />{localizeCopy('客户', 'Clienti')}{pendingVaultCount > 0 && <span className="ml-auto min-w-5 rounded-full bg-blue-100 px-1.5 py-0.5 text-center text-[10px] font-bold text-blue-800">{pendingVaultCount > 99 ? '99+' : pendingVaultCount}</span>}</button>
              <button type="button" aria-label={customerNavIsExpanded ? '收起客户菜单' : '展开客户菜单'} aria-expanded={customerNavIsExpanded} onClick={() => toggleSidebarNav('customers')} className="rounded-lg p-2 text-neutral-500 hover:bg-white hover:text-neutral-900"><ChevronDown className={`h-3.5 w-3.5 transition-transform ${customerNavIsExpanded ? 'rotate-180' : ''}`} /></button>
            </div>
            {customerNavIsExpanded && <button type="button" id="merchant-sidebar-tab-vault" onClick={() => setActiveTab('vault_requests')} className={`${settingsSubItemClass(activeTab === 'vault_requests')} relative`}><Lock className="h-3.5 w-3.5" />{localizeCopy('授权申请', 'Richieste private')}{pendingVaultCount > 0 && <span className="ml-auto min-w-5 rounded-full bg-blue-100 px-1.5 py-0.5 text-center text-[10px] font-bold text-blue-800">{pendingVaultCount > 99 ? '99+' : pendingVaultCount}</span>}</button>}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <button type="button" id="merchant-sidebar-tab-growth" onClick={() => { setGrowthSection('overview'); setActiveTab('growth'); }} className={`${navItemClass(activeTab === 'growth')} flex-1`}><TrendingUp className="h-4 w-4" />{localizeCopy('增长', 'Crescita')}</button>
              <button type="button" aria-label={growthNavIsExpanded ? '收起增长菜单' : '展开增长菜单'} aria-expanded={growthNavIsExpanded} onClick={() => toggleSidebarNav('growth')} className="rounded-lg p-2 text-neutral-500 hover:bg-white hover:text-neutral-900"><ChevronDown className={`h-3.5 w-3.5 transition-transform ${growthNavIsExpanded ? 'rotate-180' : ''}`} /></button>
            </div>
            {growthNavIsExpanded && <div className="ml-3 mt-1 space-y-0.5 border-l border-neutral-200 pl-2">
              <button type="button" id="merchant-sidebar-growth-overview" onClick={() => { setGrowthSection('overview'); setActiveTab('growth'); }} className={settingsSubItemClass(activeTab === 'growth' && growthSection === 'overview')}><BarChart3 className="h-3.5 w-3.5" />{localizeCopy('增长概览', 'Panoramica')}</button>
              <button type="button" id="merchant-sidebar-growth-autopilot" onClick={() => { setGrowthSection('autopilot'); setActiveTab('growth'); }} className={settingsSubItemClass(activeTab === 'growth' && growthSection === 'autopilot')}><Sparkles className="h-3.5 w-3.5" />Autopilot</button>
              <button type="button" id="merchant-sidebar-growth-campaigns" onClick={() => { setGrowthSection('campaigns'); setActiveTab('growth'); }} className={settingsSubItemClass(activeTab === 'growth' && growthSection === 'campaigns')}><Send className="h-3.5 w-3.5" />{localizeCopy('宣传活动', 'Campagne')}</button>
            </div>}
            <button type="button" id="merchant-sidebar-tab-finance" onClick={() => { setSidebarNavExpanded(null); setActiveTab('finance'); }} className={navItemClass(activeTab === 'finance')}><Receipt className="h-4 w-4" />{localizeCopy('财务', 'Pagamenti e saldo')}</button>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <button type="button" id="merchant-sidebar-tab-store-content" onClick={() => toggleSidebarNav('store')} className={`${navItemClass(storeNavIsActive)} flex-1`}><Store className="h-4 w-4" />{localizeCopy('店铺与内容', 'Negozio e contenuti')}</button>
              <button type="button" aria-label={storeNavIsExpanded ? '收起店铺与内容菜单' : '展开店铺与内容菜单'} aria-expanded={storeNavIsExpanded} onClick={() => toggleSidebarNav('store')} className="rounded-lg p-2 text-neutral-500 hover:bg-white hover:text-neutral-900"><ChevronDown className={`h-3.5 w-3.5 transition-transform ${storeNavIsExpanded ? 'rotate-180' : ''}`} /></button>
            </div>
            {storeNavIsExpanded && <div className="ml-3 mt-1 space-y-0.5 border-l border-neutral-200 pl-2">
              <a href={merchantSharePath} target="_blank" rel="noopener noreferrer" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-neutral-600 transition hover:bg-white hover:text-neutral-950"><ExternalLink className="h-3.5 w-3.5" />{localizeCopy('网店', 'Negozio online')}</a>
              <button type="button" id="merchant-sidebar-content-metaobject" onClick={() => openContentSection('metaobject')} className={settingsSubItemClass(activeTab === 'content' && contentSection === 'metaobject')}><Layers className="h-3.5 w-3.5" />{localizeCopy('元对象', 'Metaoggetti')}</button>
              <button type="button" id="merchant-sidebar-content-menu" onClick={() => openContentSection('menu')} className={settingsSubItemClass(activeTab === 'content' && contentSection === 'menu')}><Menu className="h-3.5 w-3.5" />{localizeCopy('菜单', 'Menu')}</button>
              <button type="button" id="merchant-sidebar-content-blog" onClick={() => openContentSection('blog')} className={settingsSubItemClass(activeTab === 'content' && contentSection === 'blog')}><BookOpen className="h-3.5 w-3.5" />{localizeCopy('博客文章', 'Articoli del blog')}</button>
              <button type="button" id="merchant-sidebar-content-pages" onClick={() => openContentSection('page')} className={settingsSubItemClass(activeTab === 'content' && contentSection === 'page')}><FileText className="h-3.5 w-3.5" />{localizeCopy('页面', 'Pagine')}</button>
              <button type="button" id="merchant-sidebar-tab-gallery" onClick={() => setActiveTab('gallery')} className={settingsSubItemClass(activeTab === 'gallery')}><FolderOpen className="h-3.5 w-3.5" />{localizeCopy('内容素材', 'Contenuti media')}</button>
              <button type="button" id="merchant-sidebar-storefront-settings" onClick={() => openSettingsSection('storefront')} className={settingsSubItemClass(activeTab === 'profile')}><Store className="h-3.5 w-3.5" />{localizeCopy('店铺展示设置', 'Impostazioni vetrina')}</button>
            </div>}
          </div>
          <button type="button" id="merchant-sidebar-tab-settings" onClick={openMerchantSettings} className={navItemClass(activeTab === 'settings')}><SlidersHorizontal className="h-4 w-4" />{localizeCopy('设置', 'Impostazioni')}</button>
        </nav>
        <div className="mt-3 space-y-2 border-t border-neutral-100 pt-3">
          <button type="button" id="merchant-sidebar-tab-ai-employees" onClick={() => { setSidebarNavExpanded(null); setActiveTab('ai_employees'); }} className={navItemClass(activeTab === 'ai_employees')}><Bot className="h-4 w-4" />{localizeCopy('AI 员工', 'Team AI')}</button>
          <button type="button" id="merchant-sidebar-tab-support" onClick={() => { setSidebarNavExpanded(null); setActiveTab('support'); }} className={navItemClass(activeTab === 'support')}><Headphones className="h-4 w-4" />{localizeCopy('帮助与客服', 'Supporto RUDA')}</button>
          <button type="button" onClick={() => setIsMobileMode(true)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50"><Smartphone className="h-4 w-4" />{localizeCopy('切换手机端', 'Modalità mobile')}</button>
        </div>
      </aside>
      <main className="min-w-0 space-y-4 bg-neutral-100/70 px-3 py-4 sm:px-5 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto lg:px-6 lg:py-5">
      {!currentMerchant.isVerified && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">{localizeCopy('后台已开通，店铺尚未公开', 'Workspace attivo, negozio non ancora pubblico')}</p>
            <p className="mt-1 text-xs leading-5 text-amber-900">{localizeCopy('你可以使用商家后台完善资料和商品；完成企业资质验证前，店铺与商品不会对外展示或销售。', 'Puoi configurare il workspace; negozio e prodotti resteranno nascosti fino alla verifica aziendale.')}</p>
          </div>
          <button type="button" onClick={() => { setActiveTab('settings'); openSettingsSection('general'); }} className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100">
            {localizeCopy('完善商家资料', 'Completa il profilo')}
          </button>
        </div>
      )}
      {/* 1. TOP TENANT HEADER & MERCHANT SWITCHER */}
      {activeTab === 'dashboard' && dashboardNavSection === 'analytics' && (
      <>
      <MerchantWorkspaceHeader title="经营分析" description="查看本店商品、订单、库存与客户数据概览。" icon={<BarChart3 className="h-3.5 w-3.5" />} />
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="relative flex items-end gap-4">
            <img 
              src={merchantLogo}
              alt={currentMerchant.name} 
              className="h-16 w-16 rounded-xl border border-neutral-200 bg-white object-cover"
              referrerPolicy="no-referrer"
              onError={event => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = DEFAULT_MERCHANT_LOGO;
              }}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
              </div>
              <h2 className="mt-0 text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl">
                {currentMerchant.name}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span>{currentMerchant.companyLegalName}</span>
                <span>·</span>
                <span>{currentMerchant.city}, {currentMerchant.country}</span>
                <span>·</span>
                <span>{localizeCopy('展厅:', 'Superficie Showroom:')} {currentMerchant.showroomArea}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ShareButton
                  title={`${currentMerchant.name} · RUDA Fashion B2B`}
                  text={localizeCopy("查看 {{RUDA_ARG_0}} 的官方独立店铺、现货货盘与授权系列", "Visita il negozio ufficiale {{RUDA_ARG_0}} e scopri la collezione pronta consegna.", [String(currentMerchant.name)])}
                  path={merchantSharePath}
                  source={`merchant-${currentMerchantId}`}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                <span className="font-semibold text-neutral-700">
                  {localizeCopy('店铺地址：', 'Store URL:')}
                </span>
                <code className="max-w-full truncate rounded-lg bg-neutral-100 px-2 py-1 text-neutral-600">
                  {merchantSharePath}
                </code>
              </div>
            </div>
          </div>

          {/* Session identity determines the merchant tenant; there is no client-side tenant switch. */}
          <div className="relative flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setIsMobileMode(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
              title={localizeCopy('切换为手机掌上端', 'Passa alla visualizzazione mobile')}
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-700" />
              <span>{localizeCopy('手机掌上端', 'Modalità Mobile')}</span>
            </button>
            <a
              href={merchantSharePath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
              title={localizeCopy('在新标签页打开买手看到的公开店铺', 'Apri il negozio pubblico in una nuova scheda')}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{localizeCopy('进入我的独立店铺', 'Apri il mio negozio')}</span>
            </a>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              {localizeCopy('店铺所有者：', 'Proprietario del negozio:')} <span className="font-semibold text-neutral-900">{currentMerchant.name}</span>
            </div>
          </div>
        </div>

        {/* Real-time KPI Bar */}
        <div className="relative mt-5 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-4 text-xs sm:grid-cols-3 xl:grid-cols-6">
          <div className="bg-neutral-50/80 p-3.5 rounded-2xl border border-neutral-100 ui-card-hover">
            <div className="text-neutral-500">{localizeCopy('本店累计成交额', 'Fatturato Cumulato')}</div>
            <div className="text-base font-bold text-neutral-900 mt-0.5">€{totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="bg-neutral-50/80 p-3.5 rounded-2xl border border-neutral-100 ui-card-hover">
            <div className="text-neutral-500">{localizeCopy('待配货/待发货订单', 'Ordini da Allestire')}</div>
            <div className="text-base font-bold text-amber-600 mt-0.5">{pendingOrders.length} {localizeCopy('单', 'ordini')}</div>
          </div>
          <div className="bg-neutral-50/80 p-3.5 rounded-2xl border border-neutral-100 ui-card-hover">
            <div className="text-neutral-500">{localizeCopy('独家爆款待审批', 'Richieste Vault in Attesa')}</div>
            <div className="text-base font-bold text-indigo-600 mt-0.5">{pendingVaultCount} {localizeCopy('位买手', 'buyer')}</div>
          </div>
          <div className="bg-neutral-50/80 p-3.5 rounded-2xl border border-neutral-100 ui-card-hover">
            <div className="text-neutral-500">{localizeCopy('在售款式总数', 'Modelli a Catalogo')}</div>
            <div className="text-base font-bold text-neutral-900 mt-0.5">{merchantProducts.length} {localizeCopy('款', 'modelli')}</div>
          </div>
          <div className="bg-neutral-50/80 p-3.5 rounded-2xl border border-neutral-100 ui-card-hover">
            <div className="text-neutral-500">{localizeCopy('现货总件数', 'Giacenza Totale Capi')}</div>
            <div className="text-base font-bold text-emerald-600 mt-0.5">{totalStockCount} {localizeCopy('件', 'pz')}</div>
          </div>
          <div className="bg-neutral-50/80 p-3.5 rounded-2xl border border-neutral-100 ui-card-hover">
            <div className="text-neutral-500">{localizeCopy('低库存预警 SKU', 'Avvisi Scorta Minima')}</div>
            <div className="text-base font-bold text-rose-600 mt-0.5">{lowStockCount} {localizeCopy('组', 'varianti')}</div>
          </div>
        </div>
        </div>
      </div>
      <MerchantAiReports />
      </>
      )}

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="merchant-web-horizontal-nav rounded-2xl border border-neutral-200/80 bg-white p-2 shadow-sm lg:hidden">
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-neutral-50/80 p-1">
          <button id="merchant-tab-dashboard" type="button" onClick={openMerchantHome} className={navItemClass(activeTab === 'dashboard' && dashboardNavSection === 'home')}><Home className="h-3.5 w-3.5" />{localizeCopy('主页', 'Home')}</button>
          <button id="merchant-tab-orders" type="button" onClick={() => setActiveTab('orders')} className={`${navItemClass(activeTab === 'orders')} relative`}><Truck className="h-3.5 w-3.5" />{localizeCopy('订单', 'Ordini')}{orderActionCount > 0 && <span className="min-w-4 rounded-full bg-blue-100 px-1 text-center text-[10px] font-bold text-blue-800">{orderActionCount > 99 ? '99+' : orderActionCount}</span>}</button>
          <button id="merchant-tab-pos" type="button" onClick={() => setActiveTab('pos')} className={navItemClass(false)}><ShoppingCart className="h-3.5 w-3.5" />{localizeCopy('智能 POS', 'Smart POS')}</button>
          <button id="merchant-tab-products" type="button" onClick={openProductCatalog} className={navItemClass(activeTab === 'products')}><Package className="h-3.5 w-3.5" />{localizeCopy('商品', 'Prodotti')} ({merchantProducts.length})</button>
          <button id="merchant-tab-customers" type="button" onClick={() => setActiveTab('customers')} className={navItemClass(activeTab === 'customers')}><UserCheck className="h-3.5 w-3.5" />{localizeCopy('客户', 'Clienti')}</button>
          <button id="merchant-tab-growth" type="button" onClick={() => { setGrowthSection('overview'); setActiveTab('growth'); }} className={navItemClass(activeTab === 'growth')}><TrendingUp className="h-3.5 w-3.5" />{localizeCopy('增长', 'Crescita')}</button>
          <button id="merchant-tab-finance" type="button" onClick={() => setActiveTab('finance')} className={navItemClass(activeTab === 'finance')}><Receipt className="h-3.5 w-3.5" />{localizeCopy('财务', 'Finanza')}</button>
          <button id="merchant-tab-more" type="button" aria-expanded={moreNavIsExpanded} aria-controls="merchant-tab-more-menu" onClick={() => setMoreNavExpanded(expanded => !expanded)} className={navItemClass(moreNavIsExpanded)}><SlidersHorizontal className="h-3.5 w-3.5" />{localizeCopy('更多', 'Altro')}<ChevronDown className={`h-3 w-3 transition-transform ${moreNavIsExpanded ? 'rotate-180' : ''}`} /></button>
        </div>
        {moreNavIsExpanded && <div id="merchant-tab-more-menu" className="mt-2 grid gap-3 rounded-xl border border-neutral-100 bg-white p-3 sm:grid-cols-2 xl:grid-cols-4">
          <section>
            <h2 className="px-2 text-[10px] font-bold uppercase tracking-wide text-neutral-400">{localizeCopy('商品与库存', 'Prodotti e scorte')}</h2>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg bg-neutral-50 p-2">
                <h3 className="px-2 pb-1 text-[9px] font-bold uppercase tracking-wide text-neutral-400">{localizeCopy('商品管理', 'Catalogo')}</h3>
                <div className="flex flex-wrap gap-1">
                  <button id="merchant-tab-product-categories" type="button" onClick={openProductCategories} className={navItemClass(false)}><Layers className="h-3.5 w-3.5" />{localizeCopy('商品分类', 'Collezioni')}</button>
                  <button id="merchant-tab-sku-matrix" type="button" onClick={() => setActiveTab('sku_matrix')} className={navItemClass(activeTab === 'sku_matrix')}><Barcode className="h-3.5 w-3.5" />{localizeCopy('款式与规格', 'Varianti SKU')}</button>
                </div>
              </div>
              <div className="rounded-lg bg-neutral-50 p-2">
                <h3 className="px-2 pb-1 text-[9px] font-bold uppercase tracking-wide text-neutral-400">{localizeCopy('库存管理', 'Scorte')}</h3>
                <div className="flex flex-wrap gap-1">
                  <button id="merchant-tab-inventory" type="button" onClick={() => setActiveTab('inventory')} className={navItemClass(activeTab === 'inventory')}><Boxes className="h-3.5 w-3.5" />{localizeCopy('库存', 'Giacenze')}</button>
                </div>
              </div>
              <div className="rounded-lg bg-neutral-50 p-2">
                <h3 className="px-2 pb-1 text-[9px] font-bold uppercase tracking-wide text-neutral-400">{localizeCopy('生产与采购', 'Produzione e approvvigionamento')}</h3>
                <div className="flex flex-wrap gap-1">
                  <button id="merchant-tab-production" type="button" onClick={() => setActiveTab('production')} className={navItemClass(activeTab === 'production')}><ClipboardCheck className="h-3.5 w-3.5" />{localizeCopy('生产工单', 'Produzione')}</button>
                  <button id="merchant-tab-materials" type="button" onClick={() => setActiveTab('materials')} className={navItemClass(activeTab === 'materials')}><Layers className="h-3.5 w-3.5" />{localizeCopy('物料', 'Materiali')}</button>
                  <button id="merchant-tab-procurement" type="button" onClick={() => setActiveTab('procurement')} className={navItemClass(activeTab === 'procurement')}><ClipboardCheck className="h-3.5 w-3.5" />{localizeCopy('采购订单', 'Acquisti')}</button>
                </div>
              </div>
            </div>
          </section>
          <section>
            <h2 className="px-2 text-[10px] font-bold uppercase tracking-wide text-neutral-400">{localizeCopy('客户与分析', 'Clienti e analisi')}</h2>
            <div className="mt-1 flex flex-wrap gap-1">
              <button id="merchant-tab-vault" type="button" onClick={() => setActiveTab('vault_requests')} className={`${navItemClass(activeTab === 'vault_requests')} relative`}><Lock className="h-3.5 w-3.5" />{localizeCopy('授权申请', 'Richieste private')}{pendingVaultCount > 0 && <span className="min-w-4 rounded-full bg-blue-100 px-1 text-center text-[10px] font-bold text-blue-800">{pendingVaultCount > 99 ? '99+' : pendingVaultCount}</span>}</button>
              <button id="merchant-tab-analytics" type="button" onClick={openMerchantAnalytics} className={navItemClass(activeTab === 'dashboard' && dashboardNavSection === 'analytics')}><BarChart3 className="h-3.5 w-3.5" />{localizeCopy('分析', 'Analisi')}</button>
            </div>
          </section>
          <section>
            <h2 className="px-2 text-[10px] font-bold uppercase tracking-wide text-neutral-400">{localizeCopy('店铺与帮助', 'Negozio e assistenza')}</h2>
            <div className="mt-1 flex flex-wrap gap-1">
              <a id="merchant-tab-online-store" href={merchantSharePath} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"><Store className="h-3.5 w-3.5" />{localizeCopy('网店', 'Negozio online')}<ExternalLink className="h-3 w-3" /></a>
              <button id="merchant-tab-content-metaobject" type="button" onClick={() => openContentSection('metaobject')} className={navItemClass(activeTab === 'content' && contentSection === 'metaobject')}><Layers className="h-3.5 w-3.5" />{localizeCopy('元对象', 'Metaoggetti')}</button>
              <button id="merchant-tab-content-menu" type="button" onClick={() => openContentSection('menu')} className={navItemClass(activeTab === 'content' && contentSection === 'menu')}><Menu className="h-3.5 w-3.5" />{localizeCopy('菜单', 'Menu')}</button>
              <button id="merchant-tab-content-blog" type="button" onClick={() => openContentSection('blog')} className={navItemClass(activeTab === 'content' && contentSection === 'blog')}><BookOpen className="h-3.5 w-3.5" />{localizeCopy('博客文章', 'Blog')}</button>
              <button id="merchant-tab-content-pages" type="button" onClick={() => openContentSection('page')} className={navItemClass(activeTab === 'content' && contentSection === 'page')}><FileText className="h-3.5 w-3.5" />{localizeCopy('页面', 'Pagine')}</button>
              <button id="merchant-tab-gallery" type="button" onClick={() => setActiveTab('gallery')} className={navItemClass(activeTab === 'gallery')}><FolderOpen className="h-3.5 w-3.5" />{localizeCopy('内容素材', 'Contenuti media')}</button>
              <button id="merchant-tab-storefront-settings" type="button" onClick={() => openSettingsSection('storefront')} className={navItemClass(activeTab === 'profile')}><Store className="h-3.5 w-3.5" />{localizeCopy('店铺展示设置', 'Impostazioni vetrina')}</button>
              <button id="merchant-tab-ai-employees" type="button" onClick={() => setActiveTab('ai_employees')} className={navItemClass(activeTab === 'ai_employees')}><Bot className="h-3.5 w-3.5" />{localizeCopy('AI 员工', 'Team AI')}</button>
              <button id="merchant-tab-support" type="button" onClick={() => setActiveTab('support')} className={navItemClass(activeTab === 'support')}><Headphones className="h-3.5 w-3.5" />{localizeCopy('帮助与客服', 'Supporto RUDA')}</button>
            </div>
          </section>
          <section>
            <h2 className="px-2 text-[10px] font-bold uppercase tracking-wide text-neutral-400">{localizeCopy('设置', 'Impostazioni')}</h2>
            <button type="button" id="merchant-tab-settings" onClick={openMerchantSettings} className={`${navItemClass(activeTab === 'settings')} mt-1`}><SlidersHorizontal className="h-3.5 w-3.5" />{localizeCopy('打开设置目录', 'Apri impostazioni')}</button>
          </section>
        </div>}
      </div>

      {/* 3. TAB CONTENT */}

      {activeTab !== 'dashboard' && activeTab !== 'settings' && !assistantPanelOpen && (
        <section className="merchant-home-card rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="min-w-0 lg:w-72">
              <div className="flex items-center gap-2 text-sm font-bold text-neutral-900"><MessageCircle className="h-4 w-4 text-emerald-700" /> 经营助手<span className="truncate text-[10px] font-medium text-neutral-500">{assistantContextLabel}{assistantScopeLabel ? ` · ${assistantScopeLabel}` : ''}</span></div>
            </div>
            <div className="flex min-w-0 flex-1 gap-2">
              <input value={assistantQuestion} onChange={event => setAssistantQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void askOperatingAssistant(assistantQuestion, { forcePageContext: true }); }} placeholder={`直接提问${assistantContextLabel}相关问题…`} className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-900 outline-none transition focus:border-neutral-400 focus:bg-white" />
              <button type="button" disabled={assistantBusy || !assistantQuestion.trim()} onClick={() => void askOperatingAssistant(assistantQuestion, { forcePageContext: true })} className="rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-neutral-700 disabled:opacity-50">{assistantBusy ? '分析中' : '提问'}</button>
            </div>
          </div>
          {assistantAnswer && <div className="mt-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-xs text-neutral-800"><p className="leading-5">{assistantAnswer.reply}</p>{assistantAnswer.actions.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{assistantAnswer.actions.map(action => <button type="button" key={action.target} onClick={() => setActiveTab(action.target)} className="rounded-lg bg-neutral-950 px-2.5 py-1.5 font-semibold text-white">{action.label}</button>)}</div>}</div>}
        </section>
      )}

      {settingsNotice && activeTab !== 'settings' && (
        <section role="status" className="merchant-home-card rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="text-sm font-bold text-sky-950">{settingsNotice.title}</h2><p className="mt-1 text-xs leading-5 text-sky-900">{settingsNotice.body}</p>{settingsNotice.distinction && <p className="mt-2 border-t border-sky-200 pt-2 text-[11px] leading-5 text-sky-800">{settingsNotice.distinction}</p>}</div>
            <button type="button" aria-label={localizeCopy('关闭提示', 'Chiudi avviso')} onClick={() => setSettingsNotice(null)} className="rounded-lg p-1 text-sky-700 hover:bg-sky-100"><X className="h-4 w-4" /></button>
          </div>
        </section>
      )}

      {activeTab === 'gallery' && <MerchantGallery onBack={() => setActiveTab('dashboard')} />}
      {activeTab === 'support' && <MerchantSupportChat />}
      {activeTab === 'ai_employees' && <MerchantAiEmployees isIt={isIt} />}
      {/* ======================================================== */}
      {/* SUB-TAB 1: 仪表盘 (OVERVIEW) */}
      {/* ======================================================== */}
      {activeTab === 'dashboard' && (
        <div id="merchant-dashboard-home" className={`space-y-6 ${dashboardNavSection === 'home' ? 'merchant-dashboard-home' : ''}`}>
          {dashboardNavSection === 'home' && (
            <section className="merchant-dashboard-featured space-y-9">
              <div className="merchant-home-intro mx-auto max-w-3xl px-2 pt-5 text-center sm:pt-10">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-neutral-600 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                  <span>{currentMerchant.name} · GPTmoda 经营助手</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
                  今天，想先处理什么？
                </h1>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-500">
                  询问订单、库存或销售表现，GPTmoda 会结合你有权限查看的店铺数据给出建议。
                </p>
                <form
                  onSubmit={event => {
                    event.preventDefault();
                    void askOperatingAssistant(assistantQuestion);
                  }}
                  className="merchant-home-prompt mx-auto mt-7 flex max-w-2xl items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-2 pl-4 text-left shadow-lg shadow-neutral-900/5 transition focus-within:border-neutral-400 focus-within:shadow-xl"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <input
                    aria-label="向 GPTmoda 提问"
                    value={assistantQuestion}
                    onChange={event => setAssistantQuestion(event.target.value)}
                    placeholder="问问 GPTmoda：哪些订单需要优先发货？"
                    maxLength={1000}
                    className="h-11 min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                  />
                  <button
                    type="submit"
                    aria-label={assistantBusy ? '正在分析' : '发送问题'}
                    disabled={assistantBusy || !assistantQuestion.trim()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
                  >
                    {assistantBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {assistantSuggestions.slice(0, 3).map(question => (
                    <button
                      key={question}
                      type="button"
                      disabled={assistantBusy}
                      onClick={() => void askOperatingAssistant(question)}
                      className="rounded-full border border-neutral-200 bg-white/70 px-3 py-1.5 text-[11px] text-neutral-600 transition hover:border-neutral-400 hover:bg-white hover:text-neutral-950 disabled:opacity-50"
                    >
                      {question}
                    </button>
                  ))}
                </div>
                {assistantBusy && (
                  <div role="status" className="mx-auto mt-5 flex max-w-2xl items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left text-xs text-neutral-600 shadow-sm">
                    <RefreshCw className="h-4 w-4 animate-spin text-emerald-700" />
                    正在分析店铺经营数据…
                  </div>
                )}
                {assistantAnswer && (
                  <article className="merchant-home-answer mx-auto mt-5 max-w-2xl rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-md sm:p-6">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
                      <Sparkles className="h-4 w-4 text-emerald-700" />
                      GPTmoda 回复
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-neutral-800">{assistantAnswer.reply}</p>
                    {assistantAnswer.summary?.gmv30d !== undefined && (
                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-3 text-left sm:grid-cols-3">
                        <div>
                          <span className="block text-[10px] text-neutral-500">{assistantAnswer.summary.periodLabel || '所选期间'}成交额</span>
                          <strong className="mt-1 block text-sm text-neutral-900">€{assistantAnswer.summary.gmv30d.toFixed(2)}</strong>
                        </div>
                        {assistantAnswer.summary.gmvTrend !== undefined && (
                          <div>
                            <span className="block text-[10px] text-neutral-500">较前一等长期间</span>
                            <strong className={`mt-1 block text-sm ${assistantAnswer.summary.gmvTrend < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                              {assistantAnswer.summary.gmvTrend >= 0 ? '+' : ''}{assistantAnswer.summary.gmvTrend}%
                            </strong>
                          </div>
                        )}
                        {assistantAnswer.summary.averageOrderValue !== undefined && (
                          <div>
                            <span className="block text-[10px] text-neutral-500">平均客单价</span>
                            <strong className="mt-1 block text-sm text-neutral-900">€{assistantAnswer.summary.averageOrderValue.toFixed(2)}</strong>
                          </div>
                        )}
                      </div>
                    )}
                    {assistantAnswer.dataBasis?.length ? (
                      <p className="mt-3 text-[10px] leading-5 text-neutral-500">数据依据：{assistantAnswer.dataBasis.join(' · ')}</p>
                    ) : null}
                    {assistantAnswer.product && (
                      <button
                        type="button"
                        onClick={() => openAssistantProduct(assistantAnswer.product!.id)}
                        className="mt-4 flex w-full items-center gap-3 rounded-xl border border-neutral-200 p-2 text-left transition hover:bg-neutral-50"
                      >
                        <img src={merchantMediaUrl(assistantAnswer.product.image, DEFAULT_MERCHANT_BANNER)} alt="" className="h-16 w-12 rounded-lg object-cover" />
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-xs text-neutral-900">{assistantAnswer.product.name}</strong>
                          <span className="mt-1 block text-[10px] text-neutral-500">{assistantAnswer.product.styleNo} · 批发价 €{assistantAnswer.product.wholesalePrice.toFixed(2)}</span>
                        </span>
                        <ExternalLink className="h-4 w-4 shrink-0 text-neutral-400" />
                      </button>
                    )}
                    {assistantAnswer.actions.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {assistantAnswer.actions.map(action => (
                          <button key={action.target} type="button" onClick={() => setActiveTab(action.target)} className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-950 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-neutral-700">
                            {action.label}<ArrowRightLeft className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                )}
              </div>

              <section className="mx-auto w-full max-w-6xl">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">YOUR COLLECTION</p>
                    <h2 className="mt-1 text-base font-semibold text-neutral-900">从本店货盘开始</h2>
                  </div>
                  <button type="button" onClick={() => setActiveTab('products')} className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 transition hover:text-neutral-950">
                    查看全部商品<ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
                {merchantProducts.length ? (
                  <div className="merchant-home-product-grid grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                    {merchantProducts.slice(0, 6).map((product, index) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          setActiveTab('products');
                          setProductSearch(product.styleNo);
                        }}
                        className="merchant-home-card group overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-xl"
                      >
                        <div className="relative aspect-[4/4.6] overflow-hidden bg-neutral-100">
                          <img
                            src={merchantMediaUrl(product.media?.find(media => media.type === 'image')?.url || product.images[0] || '', DEFAULT_MERCHANT_BANNER)}
                            alt={product.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            onError={event => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = DEFAULT_MERCHANT_BANNER;
                            }}
                          />
                          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-semibold text-neutral-700 shadow-sm">
                            {product.lifecycleStatus === 'published' ? '在售' : product.lifecycleStatus === 'draft' ? '草稿' : '新款'}
                          </span>
                        </div>
                        <div className="p-3">
                          <p className="truncate text-[11px] font-semibold text-neutral-900">{product.name_zh || product.name}</p>
                          <p className="mt-1 truncate text-[9px] tracking-wide text-neutral-500">{product.styleNo} · {product.category}</p>
                          <div className="mt-2 flex items-center justify-between gap-1">
                            <span className="text-[10px] font-semibold text-neutral-800">€{product.wholesalePrice.toFixed(2)}</span>
                            <span className="text-[9px] text-neutral-500">库存 {getProductStock(product)}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <button type="button" onClick={() => setActiveTab('products')} className="merchant-home-empty-card flex min-h-40 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white px-5 py-8 text-center transition hover:border-neutral-500 hover:bg-neutral-50">
                    <Package className="h-7 w-7 text-neutral-400" />
                    <span className="mt-3 text-sm font-semibold text-neutral-800">发布第一款商品</span>
                    <span className="mt-1 text-xs text-neutral-500">添加商品后，可在这里快速查看你的店铺货盘</span>
                  </button>
                )}
              </section>

              <section className="mx-auto w-full max-w-6xl">
                <div className="mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">QUICK ACTIONS</p>
                  <h2 className="mt-1 text-base font-semibold text-neutral-900">经营快捷入口</h2>
                </div>
                <div className="merchant-home-action-grid grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { title: '待处理订单', detail: '查看配货、发货与订单状态', count: pendingOrders.length, Icon: Truck, tab: 'orders' as const, tone: 'merchant-home-tone-blue' },
                    { title: '库存与补货', detail: '查看低库存 SKU 和补货建议', count: operationsIntelligence?.summary.lowStockSkus ?? lowStockCount, Icon: Boxes, tab: 'inventory' as const, tone: 'merchant-home-tone-amber' },
                    { title: '在售商品', detail: '维护款式、价格和商品可见性', count: merchantProducts.length, Icon: Package, tab: 'products' as const, tone: 'merchant-home-tone-green' },
                    { title: '客户授权', detail: '处理买手的私密货盘申请', count: pendingVaultCount, Icon: Lock, tab: 'vault_requests' as const, tone: 'merchant-home-tone-violet' }
                  ].map(({ title, detail, count, Icon, tab, tone }) => (
                    <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`merchant-home-card ${tone} flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg`}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700"><Icon className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-xs text-neutral-900">{title}</strong>
                        <span className="mt-1 block text-[10px] leading-4 text-neutral-500">{detail}</span>
                      </span>
                      <span className="text-lg font-semibold tabular-nums text-neutral-800">{count}</span>
                    </button>
                  ))}
                </div>
              </section>

              <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: '近 30 日成交', value: `€${(operationsIntelligence?.summary.gmv30d ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
                  { label: '累计在售款式', value: `${merchantProducts.length} 款` },
                  { label: '当前现货', value: `${totalStockCount} 件` },
                  { label: '生产中工单', value: `${productionWorkOrders.filter(order => !['completed', 'cancelled'].includes(order.status)).length} 单` }
                ].map(({ label, value }) => (
                  <div key={label} className="merchant-home-card rounded-2xl border border-neutral-200/80 bg-white/70 p-4 shadow-sm">
                    <p className="text-[10px] text-neutral-500">{label}</p>
                    <p className="mt-2 truncate text-base font-semibold tabular-nums text-neutral-900">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-700">今日工作台</p>
                <h2 className="mt-1 text-lg font-bold text-neutral-900">先处理这几件事</h2>
              </div>
              <div className="rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600">近 30 日成交 <strong className="text-neutral-900">€{operationsIntelligence?.summary.gmv30d.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</strong></div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button type="button" onClick={() => setActiveTab('orders')} className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-left hover:bg-amber-100">
                <div className="flex items-center justify-between"><Truck className="h-5 w-5 text-amber-700" /><span className="text-2xl font-bold text-amber-900">{pendingOrders.length}</span></div>
                <p className="mt-3 text-sm font-semibold text-amber-900">待配货 / 待发货</p><p className="mt-1 text-xs text-amber-800">点击处理订单</p>
              </button>
              <button type="button" onClick={() => setActiveTab('inventory')} className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-left hover:bg-rose-100">
                <div className="flex items-center justify-between"><Boxes className="h-5 w-5 text-rose-700" /><span className="text-2xl font-bold text-rose-900">{operationsIntelligence?.summary.lowStockSkus ?? lowStockCount}</span></div>
                <p className="mt-3 text-sm font-semibold text-rose-900">需要补货的 SKU</p><p className="mt-1 text-xs text-rose-800">点击查看库存与调拨</p>
              </button>
              <button type="button" onClick={() => setActiveTab('production')} className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-left hover:bg-indigo-100">
                <div className="flex items-center justify-between"><ClipboardCheck className="h-5 w-5 text-indigo-700" /><span className="text-2xl font-bold text-indigo-900">{productionWorkOrders.filter(order => !['completed', 'cancelled'].includes(order.status)).length}</span></div>
                <p className="mt-3 text-sm font-semibold text-indigo-900">生产中的工单</p><p className="mt-1 text-xs text-indigo-800">点击报产或查看进度</p>
              </button>
              <button type="button" onClick={() => setActiveTab('vault_requests')} className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-left hover:bg-sky-100">
                <div className="flex items-center justify-between"><Lock className="h-5 w-5 text-sky-700" /><span className="text-2xl font-bold text-sky-900">{pendingVaultCount}</span></div>
                <p className="mt-3 text-sm font-semibold text-sky-900">待处理客户申请</p><p className="mt-1 text-xs text-sky-800">点击统一审批</p>
              </button>
            </div>
          </section>
          {!assistantPanelOpen && <section className="rounded-xl border border-neutral-900 bg-neutral-950 p-5 text-white shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold"><MessageCircle className="h-4 w-4 text-amber-400" /> {currentMerchant.name} 经营助手</div>
                <p className="mt-1 text-xs text-neutral-300">可以直接用自然语言提问或追问；我只读取你有权限查看的数据，实际操作由你在工作台确认。</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {['今天我该做什么？', '我有点忙，先做哪几件事？', '哪些订单需要先发？', '哪些成衣 SKU 快缺货？', '哪些款需要补货？', '哪些款卖不动？', '最近销售是在上升还是下降？', '上周订单和平均客单价怎么样？', '哪些 SKU 最畅销？'].map(question => (
                <button type="button" key={question} disabled={assistantBusy} onClick={() => void askOperatingAssistant(question)} className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs text-white hover:bg-white/10 disabled:opacity-50">{question}</button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input value={assistantQuestion} onChange={event => setAssistantQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void askOperatingAssistant(assistantQuestion); }} placeholder="直接提问，例如：上周销售如何？查订单号、款号或 SKU 也可以。" className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white px-3 py-2 text-xs text-neutral-900 outline-none" />
              <button type="button" disabled={assistantBusy || !assistantQuestion.trim()} onClick={() => void askOperatingAssistant(assistantQuestion)} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-neutral-950 disabled:opacity-50">{assistantBusy ? '分析中' : '提问'}</button>
            </div>
            {assistantAnswer && <div className="mt-4 rounded-lg bg-white p-3 text-xs text-neutral-800">
              <p className="leading-5">{assistantAnswer.reply}</p>
              {assistantAnswer.dataBasis?.length ? <p className="mt-2 border-t border-neutral-100 pt-2 text-[10px] leading-4 text-neutral-500">数据依据：{assistantAnswer.dataBasis.join(' · ')}</p> : null}
              {assistantAnswer.summary?.gmv30d !== undefined && (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3 text-[11px] sm:grid-cols-3">
                  <div><span className="text-neutral-500">{assistantAnswer.summary.periodLabel || '所选期间'}成交额</span><strong className="ml-1">€{assistantAnswer.summary.gmv30d.toFixed(2)}</strong></div>
                  <div><span className="text-neutral-500">较前一等长期间</span><strong className={assistantAnswer.summary.gmvTrend && assistantAnswer.summary.gmvTrend < 0 ? 'ml-1 text-rose-700' : 'ml-1 text-emerald-700'}>{assistantAnswer.summary.gmvTrend && assistantAnswer.summary.gmvTrend >= 0 ? '+' : ''}{assistantAnswer.summary.gmvTrend ?? 0}%</strong></div>
                  {assistantAnswer.summary.averageOrderValue !== undefined && <div><span className="text-neutral-500">平均客单价</span><strong className="ml-1">€{assistantAnswer.summary.averageOrderValue.toFixed(2)}</strong></div>}
                </div>
              )}
              {assistantAnswer.actions.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{assistantAnswer.actions.map(action => <button type="button" key={action.target} onClick={() => setActiveTab(action.target)} className="rounded-md bg-neutral-900 px-2.5 py-1.5 font-semibold text-white">{action.label}</button>)}</div>}
            </div>}
          </section>}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
              <h2 className="text-sm font-bold text-neutral-900">马上要发的订单</h2>
              <div className="mt-3 divide-y divide-neutral-100">
                {pendingOrders.slice(0, 4).map(order => <button type="button" key={order.id} onClick={() => setActiveTab('orders')} className="flex w-full items-center justify-between py-3 text-left text-xs hover:bg-neutral-50"><span><strong>{order.orderNo}</strong><span className="ml-2 text-neutral-500">{order.companyName}</span></span><span className="font-semibold text-amber-700">{order.totalQty} 件</span></button>)}
                {pendingOrders.length === 0 && <p className="py-4 text-xs text-neutral-500">暂无需要处理的发货订单。</p>}
              </div>
            </section>
            <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
              <h2 className="text-sm font-bold text-neutral-900">需要注意</h2>
              <div className="mt-3 space-y-3 text-xs">
                {(operationsIntelligence?.alerts || []).slice(0, 4).map(alert => <div key={`${alert.type}-${alert.message}`} className="flex gap-2"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${alert.severity === 'critical' ? 'bg-rose-500' : alert.severity === 'warning' ? 'bg-amber-500' : 'bg-sky-500'}`} /><span className="text-neutral-700">{alert.message}</span></div>)}
                {(!operationsIntelligence || operationsIntelligence.alerts.length === 0) && <p className="text-neutral-500">目前没有紧急提醒。</p>}
              </div>
            </section>
          </div>
          <section id="merchant-analytics" className="grid grid-cols-1 gap-4 lg:grid-cols-2 scroll-mt-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-amber-950">近30日销量补货建议</h2>
                <button type="button" onClick={() => setActiveTab('inventory')} className="text-xs font-semibold text-amber-800 underline">查看库存</button>
              </div>
              <p className="mt-1 text-xs text-amber-900/70">按近30日实际销量估算未来30日需求，不会自动下单。</p>
              <div className="mt-3 space-y-2">
                {(operationsIntelligence?.replenishment || []).slice(0, 4).map(item => (
                  <div key={item.variantId} className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 text-xs">
                    <span><strong>{item.sku}</strong><span className="ml-2 text-neutral-600">可售 {item.availableQuantity} 件</span></span>
                    <span className="font-semibold text-amber-800">建议补 {item.suggestedQuantity} 件</span>
                  </div>
                ))}
                {!operationsIntelligence?.replenishment?.length && <p className="text-xs text-amber-900/70">当前没有需要立即补货的 SKU。</p>}
              </div>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-sky-950">库存周转提醒</h2>
                <span className={`text-xs font-bold ${(operationsIntelligence?.summary.gmvTrend || 0) < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {(operationsIntelligence?.summary.gmvTrend || 0) >= 0 ? '+' : ''}{operationsIntelligence?.summary.gmvTrend || 0}%
                </span>
              </div>
              <p className="mt-1 text-xs text-sky-900/70">比较近7日与前7日真实成交额，并识别库存积压风险。</p>
              <div className="mt-3 space-y-2">
                {(operationsIntelligence?.slowMovers || []).slice(0, 4).map(item => (
                  <div key={item.variantId} className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 text-xs">
                    <span><strong>{item.sku}</strong><span className="ml-2 text-neutral-600">库存 {item.availableQuantity}</span></span>
                    <span className="font-semibold text-sky-800">{item.sold30d === 0 ? '30日无销量' : `${item.daysCover}天库存覆盖`}</span>
                  </div>
                ))}
                {!operationsIntelligence?.slowMovers?.length && <p className="text-xs text-sky-900/70">当前没有明显滞销 SKU。</p>}
              </div>
            </div>
          </section>
          <div className="hidden">
          {operationsIntelligence && (
            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" />实时经营智能</h2>
                  <p className="mt-1 text-xs text-neutral-500">基于本商户已规范化库存、订单、售后与调拨数据，每分钟更新。</p>
                </div>
                <span className="text-xs font-bold text-neutral-900">€{operationsIntelligence.summary.gmv30d.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-lg bg-amber-50 border border-amber-100 p-3"><div className="text-amber-700">待履约</div><div className="mt-1 text-lg font-bold text-amber-800">{operationsIntelligence.summary.pendingFulfillment}</div></div>
                <div className="rounded-lg bg-rose-50 border border-rose-100 p-3"><div className="text-rose-700">缺货 / 低覆盖 SKU</div><div className="mt-1 text-lg font-bold text-rose-800">{operationsIntelligence.summary.lowStockSkus}</div></div>
                <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3"><div className="text-indigo-700">待审退货</div><div className="mt-1 text-lg font-bold text-indigo-800">{operationsIntelligence.summary.pendingReturns}</div></div>
                <div className="rounded-lg bg-sky-50 border border-sky-100 p-3"><div className="text-sky-700">在途调拨</div><div className="mt-1 text-lg font-bold text-sky-800">{operationsIntelligence.summary.pendingTransfers}</div></div>
              </div>
              {operationsIntelligence.alerts.length > 0 && <div className="mt-4 divide-y divide-neutral-100 text-xs">{operationsIntelligence.alerts.slice(0, 4).map(alert => <div key={`${alert.type}-${alert.message}`} className="py-2 flex gap-2"><span className={`mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full ${alert.severity === 'critical' ? 'bg-rose-500' : alert.severity === 'warning' ? 'bg-amber-500' : 'bg-sky-500'}`} /><span className="text-neutral-700">{alert.message}</span></div>)}</div>}
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-neutral-950 text-white rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">经营数据 · Merchandising</p>
                  <h2 className="mt-1 text-lg font-bold">库存与销售趋势</h2>
                  <p className="mt-1 text-xs text-neutral-400">根据本店订单、SKU 库存和近 30 天动销自动生成，不替代财务或仓库最终确认。</p>
                </div>
                <TrendingUp className={`w-5 h-5 ${salesTrendPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
              </div>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="border-l border-white/20 pl-3"><p className="text-neutral-400">近 7 日销售</p><p className="mt-1 text-lg font-bold">{recentSalesQty} <span className="text-[10px] font-normal text-neutral-400">件</span></p></div>
                <div className="border-l border-white/20 pl-3"><p className="text-neutral-400">环比趋势</p><p className={`mt-1 text-lg font-bold ${salesTrendPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{salesTrendPercent >= 0 ? '+' : ''}{salesTrendPercent}%</p></div>
                <div className="border-l border-white/20 pl-3"><p className="text-neutral-400">需关注 SKU</p><p className="mt-1 text-lg font-bold">{replenishmentRecommendations.filter(item => item.daysCover !== null && item.daysCover <= 14).length}</p></div>
                <div className="border-l border-white/20 pl-3"><p className="text-neutral-400">推荐补货</p><p className="mt-1 text-lg font-bold">{replenishmentRecommendations.reduce((sum, item) => sum + item.suggestedQty, 0)} <span className="text-[10px] font-normal text-neutral-400">件</span></p></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-bold text-neutral-900"><Sparkles className="w-4 h-4 text-amber-500" />智能推荐热销款</div>
              <div className="mt-3 space-y-3">
                {smartRecommendations.length === 0 ? <p className="text-xs text-neutral-500">积累订单后将生成款式推荐。</p> : smartRecommendations.map(item => (
                  <div key={item.product.id} className="flex items-center gap-2 text-xs">
                    <img src={item.product.images[0]} alt={item.product.name} className="h-20 w-16 shrink-0 rounded object-cover" />
                    <div className="min-w-0"><p className="font-semibold truncate">{item.product.styleNo}</p><p className="text-neutral-500">近 30 日售出 {item.sold} 件</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-neutral-900">补货预测清单</h2><p className="text-xs text-neutral-500 mt-1">按当前动销速度估算可售天数，优先处理库存低于 14 天的款式。</p></div><Boxes className="w-5 h-5 text-neutral-500" /></div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {replenishmentRecommendations.slice(0, 4).map(item => (
                <div key={item.product.id} className="rounded-lg bg-neutral-50 border border-neutral-200 p-3 text-xs">
                  <div className="flex justify-between gap-2"><span className="font-bold truncate">{item.product.styleNo}</span><span className={item.daysCover !== null && item.daysCover <= 14 ? 'text-rose-600 font-bold' : 'text-emerald-700'}>{item.daysCover === null ? '待积累' : `${item.daysCover} 天`}</span></div>
                  <p className="mt-2 text-neutral-500">库存 {item.stock} 件 · 建议补 {item.suggestedQty} 件</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Action Cards */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  待办运营事项 (Action Required)
                </h2>
                <span className="text-xs text-neutral-500">今日实时</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div 
                  onClick={() => setActiveTab('orders')}
                  className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-amber-600" />
                      待配货与发货订单
                    </div>
                    <div className="text-neutral-600">有 {pendingOrders.length} 笔订单需要打印面单与安排发货</div>
                  </div>
                  <span className="text-base font-bold text-amber-700">{pendingOrders.length}</span>
                </div>

                <div 
                  onClick={() => setActiveTab('vault_requests')}
                  className="p-3.5 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-indigo-900 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-indigo-600" />
                      独家爆款看货申请
                    </div>
                    <div className="text-neutral-600">有 {pendingVaultCount} 位买手正在申请解锁首发款式</div>
                  </div>
                  <span className="text-base font-bold text-indigo-700">{pendingVaultCount}</span>
                </div>

                <div 
                  onClick={() => setActiveTab('inventory')}
                  className="p-3.5 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      库存告急预警
                    </div>
                    <div className="text-neutral-600">有 {lowStockCount} 组 SKU 库存低于 15 件阈值</div>
                  </div>
                  <span className="text-base font-bold text-rose-700">{lowStockCount}</span>
                </div>

                <div 
                  onClick={() => setIsAddingProduct(true)}
                  className="p-3.5 rounded-lg border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-neutral-700" />
                      发布新季款式
                    </div>
                    <div className="text-neutral-600">支持批量生成款式编号与配置新款区、特价区（倒货）及授权订货区</div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-neutral-900 text-white rounded font-medium">快速发布</span>
                </div>
              </div>

              {/* Best Selling Products for this merchant */}
              <div className="pt-3 border-t border-neutral-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-3">
                  本店热销爆款排行
                </h3>
                <div className="divide-y divide-neutral-100">
                  {merchantProducts.slice(0, 4).map((p, idx) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center font-bold text-neutral-400">0{idx + 1}</span>
                        <img src={p.images[0]} alt={p.name} className="h-20 w-16 shrink-0 rounded object-cover border border-neutral-200" />
                        <div>
                          <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                            {p.styleNo} · {p.name.slice(0, 24)}...
                            {p.visibility === 'private' && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-100 text-indigo-800">
                                🔒 私密
                              </span>
                            )}
                          </div>
                          <div className="text-neutral-500 text-[11px]">{p.category.toUpperCase()} · 批发价 €{p.wholesalePrice.toFixed(2)} · MOQ {p.moq}件</div>
                        </div>
                      </div>
                            <div className="text-right">
                              <div className="font-semibold text-emerald-600">当前仓库现货</div>
                        <div className="text-neutral-400 text-[10px]">
                                {getProductStock(p)} 件
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Single warehouse inventory summary */}
            <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4 shadow-xs">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-neutral-700" />
                当前仓库现货
              </h2>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-neutral-800">当前仓库</span>
                    <span className="font-bold text-neutral-900">
                      {merchantProducts.reduce((acc, p) => acc + getProductStock(p), 0)} 件
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-neutral-800 h-full rounded-full" style={{ width: '100%' }}></div>
                  </div>
                  <div className="text-[11px] text-neutral-500">所有商品从当前仓库统一出库和履约。</div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: 商品管理 (PRODUCTS & 3-TIER VISIBILITY) */}
      {/* ======================================================== */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <header className="merchant-home-intro relative overflow-hidden rounded-3xl border border-neutral-200 bg-[radial-gradient(ellipse_at_85%_0%,rgba(209,250,229,0.7),transparent_38%),linear-gradient(145deg,#fff_18%,#f8fafc_72%,#eef2ff_100%)] p-5 shadow-sm sm:p-7">
            <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />
            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500 shadow-sm">
                  <Package className="h-3.5 w-3.5 text-neutral-800" /> Products · RUDA Merchant
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {merchantProducts.length} 款商品
                </div>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">{productWorkspaceSection === 'catalog' ? '商品目录' : '商品分类'}</h1>
                <p className="mt-2 max-w-xl text-xs leading-5 text-neutral-600 sm:text-sm">{productWorkspaceSection === 'catalog' ? '管理商品资料、价格、SKU 与上架状态；可用筛选和批量操作快速维护目录。' : '创建店铺分类并整理商品归属；分类将同步显示在独立店铺。'}</p>
              </div>
              {productWorkspaceSection === 'catalog' && <div className="relative flex flex-wrap gap-2">
                <button type="button" onClick={() => exportMerchantProducts(selectedProductIds.length ? merchantProducts.filter(product => selectedProductIds.includes(product.id)) : visibleMerchantProducts)} disabled={!merchantProducts.length} className="inline-flex items-center gap-1.5 rounded-xl border border-white/90 bg-white/80 px-3.5 py-2.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:bg-white disabled:opacity-40">
                  <FileSpreadsheet className="h-3.5 w-3.5" />导出 CSV{selectedProductIds.length ? ` (${selectedProductIds.length})` : ''}
                </button>
                <button type="button" onClick={downloadProductImportTemplate} className="inline-flex items-center gap-1.5 rounded-xl border border-white/90 bg-white/80 px-3.5 py-2.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:bg-white">
                  <FileSpreadsheet className="h-3.5 w-3.5" />下载导入模板
                </button>
                <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/90 bg-white/80 px-3.5 py-2.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:bg-white ${productImportBusy ? 'pointer-events-none opacity-50' : ''}`}>
                  {productImportBusy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <FolderOpen className="h-3.5 w-3.5" />}
                  {productImportBusy ? '导入中…' : '导入 CSV'}
                  <input type="file" accept=".csv,text/csv" className="sr-only" disabled={productImportBusy} onChange={event => {
                    const file = event.currentTarget.files?.[0];
                    if (file) void importMerchantProducts(file);
                    event.currentTarget.value = '';
                  }} />
                </label>
                <button type="button" id="merchant-add-product-btn" onClick={() => setIsAddingProduct(true)} className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-700 hover:shadow-md">
                  <Plus className="h-4 w-4" />添加产品
                </button>
              </div>}
            </div>
            {productWorkspaceSection === 'catalog' && <div className="relative mt-5 grid grid-cols-2 gap-2 xl:grid-cols-4">
              {[
                { label: '产品总数', value: merchantProducts.length.toLocaleString(), detail: `${merchantProducts.filter(product => product.lifecycleStatus === 'published').length} 款在售`, tone: 'merchant-home-tone-blue', Icon: Package },
                { label: '库存低于 5 件', value: productUnderFiveCount.toLocaleString(), detail: standardInventoryLoaded ? '按可售库存统计' : '按商品 SKU 库存估算', tone: 'merchant-home-tone-amber', Icon: AlertTriangle },
                { label: '缺少商品图片', value: productMissingImageCount.toLocaleString(), detail: '需要补充主图', tone: 'merchant-home-tone-violet', Icon: ImagePlus },
                { label: '近 30 日已售件数', value: [...productSales30d.values()].reduce((sum, sale) => sum + sale.quantity, 0).toLocaleString(), detail: `${productSalesRank.length} 款有订单销量`, tone: 'merchant-home-tone-green', Icon: TrendingUp }
              ].map(metric => (
                <div key={metric.label} className={`merchant-home-card ${metric.tone} rounded-2xl border border-neutral-200/80 p-3 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-4`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="text-[10px] font-medium text-neutral-500">{metric.label}</p><p className="mt-1.5 text-lg font-semibold tabular-nums tracking-tight text-neutral-950 sm:text-xl">{metric.value}</p><p className="mt-1 truncate text-[9px] text-neutral-500">{metric.detail}</p></div>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/75 text-neutral-700 shadow-sm"><metric.Icon className="h-4 w-4" /></span>
                  </div>
                </div>
              ))}
            </div>}
            {productWorkspaceSection === 'catalog' && <p className="relative mt-3 text-[9px] leading-4 text-neutral-500">CSV 导入只新建草稿，不覆盖现有商品；勾选商品后可批量改价、上下架或归档。</p>}
          </header>

          <nav aria-label="商品二级导航" className="flex flex-wrap gap-2 rounded-xl border border-neutral-200 bg-white p-2 shadow-sm">
            <button type="button" aria-current={productWorkspaceSection === 'catalog' ? 'page' : undefined} onClick={openProductCatalog} className={`flex min-w-40 flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition sm:flex-none ${productWorkspaceSection === 'catalog' ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>
              <Package className="h-4 w-4" /><span>{localizeCopy('商品列表', 'Catalogo prodotti')}</span><span className={`ml-auto text-[10px] ${productWorkspaceSection === 'catalog' ? 'text-neutral-300' : 'text-neutral-400'}`}>{merchantProducts.length}</span>
            </button>
            <button type="button" aria-current={productWorkspaceSection === 'categories' ? 'page' : undefined} onClick={openProductCategories} className={`flex min-w-40 flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition sm:flex-none ${productWorkspaceSection === 'categories' ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>
              <Layers className="h-4 w-4" /><span>{localizeCopy('商品分类', 'Collezioni')}</span><span className={`ml-auto text-[10px] ${productWorkspaceSection === 'categories' ? 'text-neutral-300' : 'text-neutral-400'}`}>{storeCategories.length}</span>
            </button>
          </nav>

          {productWorkspaceSection === 'catalog' && <section className="merchant-home-card overflow-hidden rounded-3xl border border-neutral-200 bg-[radial-gradient(ellipse_at_90%_0%,rgba(224,231,255,0.65),transparent_40%),linear-gradient(145deg,#fff,#f8fafc)] p-4 shadow-sm sm:p-6" aria-label="GPTmoda 商品智能助手">
            <div className="grid gap-5 xl:grid-cols-[minmax(260px,1.1fr)_minmax(260px,0.9fr)]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/85 px-3 py-1.5 text-[10px] font-semibold text-neutral-600 shadow-sm"><Sparkles className="h-3.5 w-3.5 text-emerald-700" />GPTmoda · 产品助手</div>
                <h2 className="mt-3 text-lg font-semibold tracking-tight text-neutral-950 sm:text-xl">查商品、看库存、准备文案</h2>
                <p className="mt-1.5 text-xs leading-5 text-neutral-600">询问商品资料、库存与销量；识别到筛选条件时同步更新列表。文案会先作为草稿供你检查，不会自动发布。</p>
                <form onSubmit={event => { event.preventDefault(); runProductAiQuery(productAiQuestion); }} className="merchant-home-prompt mt-4 flex max-w-2xl items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-2 pl-3 shadow-md shadow-neutral-900/5 transition focus-within:border-neutral-400">
                  <Search className="h-4 w-4 shrink-0 text-neutral-400" />
                  <input value={productAiQuestion} onChange={event => setProductAiQuestion(event.target.value)} maxLength={500} placeholder="例如：哪些商品库存低于 5 件？查 SKU 号…" className="h-10 min-w-0 flex-1 bg-transparent text-xs text-neutral-900 outline-none placeholder:text-neutral-400 sm:text-sm" />
                  <button type="submit" aria-label="向商品助手提问" disabled={assistantBusy || !productAiQuestion.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400">{assistantBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}</button>
                </form>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    '哪些商品库存低于 5 件？',
                    '查一下没有商品图片的款式',
                    '近 30 天哪些商品卖得最好？',
                    productAiQuestion.trim() ? `按这些资料写商品描述：${productAiQuestion.trim().slice(0, 100)}` : '帮我写一段商品描述'
                  ].map(question => <button key={question} type="button" disabled={assistantBusy} onClick={() => runProductAiQuery(question)} className="rounded-full border border-white/90 bg-white/80 px-3 py-1.5 text-[10px] font-medium text-neutral-600 transition hover:border-neutral-300 hover:bg-white hover:text-neutral-950 disabled:opacity-50">{question.length > 48 ? `${question.slice(0, 48)}…` : question}</button>)}
                  <button type="button" onClick={() => setIsAddingProduct(true)} className="rounded-full bg-neutral-950 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-neutral-700">打开添加产品表单</button>
                </div>
                {assistantBusy && activeTab === 'products' && <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/80 px-3 py-2.5 text-[10px] text-neutral-600"><RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-700" />正在查询商品与经营数据…</div>}
                {productAiAnswerVisible && assistantAnswer && (
                  <article className="merchant-home-answer mt-4 rounded-2xl border border-white bg-white/90 p-4 shadow-md">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800"><Sparkles className="h-4 w-4 text-emerald-700" />GPTmoda 回复</div>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-neutral-700">{assistantAnswer.reply}</p>
                    {assistantAnswer.summary?.gmv30d !== undefined && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"><div className="rounded-xl bg-neutral-50 p-3"><span className="block text-[9px] text-neutral-500">{assistantAnswer.summary.periodLabel || '统计期间'}销售额</span><strong className="mt-1 block text-sm text-neutral-900">€{assistantAnswer.summary.gmv30d.toFixed(2)}</strong></div>{assistantAnswer.summary.averageOrderValue !== undefined && <div className="rounded-xl bg-neutral-50 p-3"><span className="block text-[9px] text-neutral-500">平均客单价</span><strong className="mt-1 block text-sm text-neutral-900">€{assistantAnswer.summary.averageOrderValue.toFixed(2)}</strong></div>}{assistantAnswer.summary.topSellingSkus?.length ? <div className="rounded-xl bg-neutral-50 p-3"><span className="block text-[9px] text-neutral-500">热销 SKU</span><strong className="mt-1 block truncate text-sm text-neutral-900">{assistantAnswer.summary.topSellingSkus[0][0]}</strong></div> : null}</div>}
                    {assistantAnswer.dataBasis?.length ? <p className="mt-2 text-[9px] leading-4 text-neutral-400">数据依据：{assistantAnswer.dataBasis.join(' · ')}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => { setProductAiDescriptionDraft(assistantAnswer.reply); setNewProdData(previous => ({ ...previous, description: assistantAnswer.reply })); setIsAddingProduct(true); }} className="rounded-lg border border-neutral-200 px-3 py-2 text-[10px] font-semibold text-neutral-700 transition hover:bg-neutral-50">用回复预填新产品描述</button>
                      {assistantAnswer.product && <button type="button" onClick={() => openAssistantProduct(assistantAnswer.product!.id)} className="rounded-lg bg-neutral-950 px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-neutral-700">打开这款商品</button>}
                      {assistantAnswer.product && <button type="button" onClick={() => setEditingProductImages(merchantProducts.find(product => product.id === assistantAnswer.product?.id) || null)} className="rounded-lg border border-neutral-200 px-3 py-2 text-[10px] font-semibold text-neutral-700 transition hover:bg-neutral-50">管理商品图片</button>}
                      <button type="button" onClick={() => { setAssistantPanelOpen(true); setAssistantPanelExpanded(true); }} className="rounded-lg border border-neutral-200 px-3 py-2 text-[10px] font-semibold text-neutral-700 transition hover:bg-neutral-50">展开 GPTmoda 对话</button>
                    </div>
                  </article>
                )}
                <p className="mt-3 text-[9px] leading-4 text-neutral-500">AI 回复请人工核对后再使用。当前没有自动生成商品图片的服务；商品级 SEO 字段、供应商/标签/销售渠道也未接入商品数据模型。</p>
              </div>
              <div className="rounded-2xl border border-white/90 bg-white/75 p-4 shadow-sm backdrop-blur-sm sm:p-5">
                <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">近 30 日商品表现</p><p className="mt-1 text-xs text-neutral-600">按订单商品明细统计件数；库存显示当前可售量。</p></div><BarChart3 className="h-4 w-4 text-neutral-500" /></div>
                {productSalesRank.length ? (
                  <ol className="mt-4 space-y-3">
                    {productSalesRank.map(({ product, sales }, index) => {
                      const maxSales = productSalesRank[0]?.sales.quantity || 1;
                      return <li key={product.id} className="flex items-center gap-3">
                        <span className="w-5 text-center text-[10px] font-semibold text-neutral-400">0{index + 1}</span>
                        <img src={merchantMediaUrl(product.media?.find(media => media.type === 'image')?.url || product.images[0] || '', DEFAULT_MERCHANT_BANNER)} alt="" className="h-11 w-9 shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2"><button type="button" onClick={() => { setProductSearch(product.styleNo); setProductQuickView('all'); }} className="truncate text-left text-[10px] font-semibold text-neutral-800 hover:underline">{product.styleNo} · {product.name_zh || product.name}</button><strong className="shrink-0 text-[10px] tabular-nums text-neutral-700">{sales.quantity} 件</strong></div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-emerald-400" style={{ width: `${Math.max(5, sales.quantity / maxSales * 100)}%` }} /></div>
                          <p className="mt-1 text-[9px] text-neutral-400">批发额 €{sales.amount.toFixed(2)} · 可售 {getProductAvailableStock(product)} 件</p>
                        </div>
                      </li>;
                    })}
                  </ol>
                ) : <div className="mt-4 rounded-xl border border-dashed border-neutral-200 bg-white/70 px-4 py-8 text-center"><TrendingUp className="mx-auto h-5 w-5 text-neutral-300" /><p className="mt-2 text-[10px] text-neutral-500">近 30 日暂无商品订单明细</p><p className="mt-1 text-[9px] text-neutral-400">有订单后将按商品 SKU 汇总销量。</p></div>}
              </div>
            </div>
          </section>
          }

          {productWorkspaceSection === 'catalog' && <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">商品目录</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                商品资料、SKU、价格、店铺分类与上架状态
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5" aria-label="商品视图">
                <button type="button" aria-label="表格视图" aria-pressed={productViewMode === 'table'} onClick={() => setProductViewMode('table')} className={`rounded-md p-2 transition ${productViewMode === 'table' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>
                  <List className="h-4 w-4" />
                </button>
                <button type="button" aria-label="POS 大图视图" title="POS 大图视图" aria-pressed={productViewMode === 'pos'} onClick={() => setProductViewMode('pos')} className={`rounded-md p-2 transition ${productViewMode === 'pos' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}>
                  <Grid2X2 className="h-4 w-4" />
                </button>
              </div>
              <button
                id="merchant-add-product-btn"
                onClick={() => setIsAddingProduct(true)}
                className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> 发布新商品
              </button>
            </div>
          </div>}
          {productWorkspaceSection === 'categories' && <div id="merchant-product-categories" className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-neutral-900">产品系列 · 店铺分类</h3>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">{storeCategories.length} 个手动系列</span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">0 个智能系列</span>
                </div>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-neutral-500">系列会显示在独立店铺。当前每款商品只能归属一个手动分类；标签自动规则、系列描述、SEO 和封面暂未接入。</p>
              </div>
              <form className="flex flex-wrap gap-2" onSubmit={async event => {
                event.preventDefault();
                if (!newCategoryName.trim() || categoryBusy) return;
                setCategoryBusy(true);
                try {
                  if (editingStoreCategoryId) {
                    const result = await apiPut<{ success: true; category: StoreCategory }>(`/api/merchant/store-categories/${encodeURIComponent(editingStoreCategoryId)}`, { name: newCategoryName.trim() });
                    setStoreCategories(previous => previous.map(category => category.id === result.category.id ? result.category : category).sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)));
                    addNotification('success', '系列名称已更新', '商品归属和店铺分类标识保持不变');
                  } else {
                    const result = await apiPost<{ success: true; category: StoreCategory }>('/api/merchant/store-categories', { name: newCategoryName.trim() });
                    setStoreCategories(previous => [...previous, result.category].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)));
                    setNewProdData(previous => ({ ...previous, category: result.category.slug }));
                    addNotification('success', '店铺分类已添加', '新分类已同步到您的独立店铺');
                  }
                  setNewCategoryName('');
                  setEditingStoreCategoryId(null);
                } catch (error) {
                  addNotification('warning', editingStoreCategoryId ? '更新系列失败' : '添加分类失败', error instanceof Error ? error.message : '请检查分类名称后重试');
                } finally {
                  setCategoryBusy(false);
                }
              }}>
                <input value={newCategoryName} onChange={event => setNewCategoryName(event.target.value)} maxLength={40} placeholder={editingStoreCategoryId ? '修改系列名称' : '例如：夏季新品'} className="w-40 rounded-lg border border-neutral-300 px-3 py-2 text-xs" />
                <button type="submit" disabled={categoryBusy || !newCategoryName.trim()} className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{categoryBusy ? '保存中…' : editingStoreCategoryId ? '保存修改' : '添加系列'}</button>
                {editingStoreCategoryId && <button type="button" onClick={() => { setEditingStoreCategoryId(null); setNewCategoryName(''); }} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-600">取消</button>}
              </form>
            </div>

            <details className="group mt-4 rounded-xl border border-indigo-100 bg-indigo-50/40">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-3 text-xs font-semibold text-neutral-800 marker:hidden">
                <Sparkles className="h-4 w-4 text-emerald-700" />
                GPTmoda 系列助手
                <span className="ml-auto text-[10px] font-normal text-neutral-500">查询系列、检查归属或生成名称草稿</span>
                <ChevronDown className="h-3.5 w-3.5 text-neutral-500 transition group-open:rotate-180" />
              </summary>
              <section className="border-t border-indigo-100 p-4 sm:p-5" aria-label="GPTmoda 产品系列助手">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"><Sparkles className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-neutral-900">GPTmoda · 产品系列助手</h4>
                  <p className="mt-1 text-[11px] leading-5 text-neutral-600">查询系列与商品归属、检查空系列/缺图/缺描述/未归类商品；也可生成名称或文案草稿。所有写入都需你核对并点击保存。</p>
                  <form className="mt-3 flex max-w-3xl items-center gap-2 rounded-xl border border-neutral-200 bg-white p-1.5 pl-3 shadow-sm focus-within:border-neutral-400" onSubmit={event => { event.preventDefault(); runProductSeriesAiQuery(categoryAiQuestion); }}>
                    <Search className="h-4 w-4 shrink-0 text-neutral-400" />
                    <input value={categoryAiQuestion} onChange={event => setCategoryAiQuestion(event.target.value)} maxLength={500} placeholder="例如：哪些系列是空的？款号 ABC 属于哪个系列？" className="h-9 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-neutral-400" />
                    <button type="submit" disabled={assistantBusy || !categoryAiQuestion.trim()} className="rounded-lg bg-neutral-950 px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-40">{assistantBusy ? '处理中…' : '查询'}</button>
                  </form>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      '列出所有系列和商品数',
                      '找出空系列',
                      '哪些商品没有归入系列？',
                      '检查系列内缺图片或缺描述的商品'
                    ].map(question => <button key={question} type="button" onClick={() => runProductSeriesAiQuery(question)} disabled={assistantBusy} className="rounded-full border border-white bg-white/80 px-2.5 py-1.5 text-[10px] font-medium text-neutral-600 hover:border-neutral-300 disabled:opacity-50">{question}</button>)}
                    <button type="button" onClick={() => runProductSeriesAiQuery(`请新建一个系列名称草稿，需求：${categoryAiQuestion.trim() || '为我的商品规划一个清晰易懂的系列'}`)} disabled={assistantBusy} className="rounded-full border border-white bg-white/80 px-2.5 py-1.5 text-[10px] font-medium text-neutral-600 hover:border-neutral-300 disabled:opacity-50">AI 拟定系列名称</button>
                  </div>
                  {assistantBusy && activeTab === 'products' && categoryAiQuestion && <div role="status" className="mt-3 flex items-center gap-2 text-[10px] text-neutral-500"><RefreshCw className="h-3.5 w-3.5 animate-spin" />GPTmoda 正在准备系列草稿…</div>}
                  {categoryAiAnswer && (
                    <div className="mt-3 rounded-xl border border-white bg-white/90 p-3 shadow-sm">
                      <p className="whitespace-pre-wrap text-xs leading-5 text-neutral-700">{categoryAiAnswer}</p>
                      {categoryAiProducts.length > 0 && <div className="mt-2 space-y-1.5 border-t border-neutral-100 pt-2">
                        {categoryAiProducts.slice(0, 20).map(product => <div key={product.id} className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                          <span className="min-w-0 truncate text-neutral-600">{product.styleNo} · {product.name_zh || product.name}</span>
                          <button type="button" onClick={() => openAssistantProduct(product.id)} className="shrink-0 font-semibold text-emerald-800 hover:underline">查看商品</button>
                        </div>)}
                        {categoryAiProducts.length > 20 && <p className="text-[10px] text-neutral-400">还有 {categoryAiProducts.length - 20} 款未展开</p>}
                      </div>}
                    </div>
                  )}
                  <p className="mt-2 text-[9px] leading-4 text-neutral-400">数据检查基于当前商家商品与分类记录。智能系列、系列级描述/SEO/图片及主题编辑器尚未接入；生成内容只作为未保存草稿。</p>
                </div>
              </div>
              </section>
            </details>

            <div className="mt-4 space-y-2">
              {storeCategories.length === 0 ? <p className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-800">目前没有店铺分类。可创建手动系列；创建后再把商品归入其中。</p> : storeCategories.map(category => {
                const categoryProducts = merchantProducts.filter(product => product.category === category.slug);
                const isManagingProducts = categoryMembershipId === category.id;
                return <article key={category.id} className="rounded-xl border border-neutral-200 bg-white p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h5 className="text-xs font-semibold text-neutral-900">{category.name}</h5><span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] text-neutral-500">手动系列</span><span className="text-[10px] text-neutral-500">{categoryProducts.length} 款商品</span></div>
                      <p className="mt-1 truncate text-[9px] text-neutral-400">店铺分类标识：{category.slug}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button type="button" onClick={() => {
                        setCategoryMembershipId(isManagingProducts ? '' : category.id);
                        setCategoryMembershipProductIds(categoryProducts.map(product => product.id));
                        setCategoryMembershipSearch('');
                      }} className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-50">{isManagingProducts ? '收起商品' : '管理商品'}</button>
                      <button type="button" onClick={() => { setEditingStoreCategoryId(category.id); setNewCategoryName(category.name); }} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-50"><Pencil className="h-3 w-3" />改名</button>
                      <button type="button" onClick={async () => {
                        if (!window.confirm(`确定删除系列「${category.name}」吗？已有商品需先调整归属。`)) return;
                        try {
                          await apiDelete(`/api/merchant/store-categories/${encodeURIComponent(category.id)}`);
                          setStoreCategories(previous => previous.filter(item => item.id !== category.id));
                          setNewProdData(previous => previous.category === category.slug ? { ...previous, category: '' } : previous);
                          if (categoryMembershipId === category.id) setCategoryMembershipId('');
                          addNotification('success', '店铺分类已删除', `已删除“${category.name}”`);
                        } catch (error) {
                          addNotification('warning', '无法删除分类', error instanceof Error ? error.message : '请先调整使用该分类的商品');
                        }
                      }} className="rounded-lg p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-700" title={`删除 ${category.name}`}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  {isManagingProducts && <div className="mt-3 border-t border-neutral-100 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="max-w-xl text-[10px] leading-4 text-neutral-500">勾选后点击保存，将所选商品归入「{category.name}」；商品当前只支持一个系列，保存会替换已选商品的原分类。未勾选商品不变，每次最多 500 款。</p>
                      <button type="button" disabled={categoryMembershipBusy || !categoryMembershipProductIds.some(id => merchantProducts.some(product => product.id === id && product.category !== category.slug))} onClick={() => void saveCategoryMembership()} className="rounded-lg bg-neutral-950 px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-40">{categoryMembershipBusy ? '保存中…' : `确认归入所选 (${categoryMembershipProductIds.length})`}</button>
                    </div>
                    <label className="relative mt-2 block max-w-sm"><Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-400" /><input value={categoryMembershipSearch} onChange={event => setCategoryMembershipSearch(event.target.value)} placeholder="筛选款号、名称或 SKU" className="w-full rounded-lg border border-neutral-200 py-1.5 pl-8 pr-3 text-[10px] outline-none focus:border-neutral-400" /></label>
                    <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-neutral-100 bg-neutral-50/60 p-2">
                      {categoryMembershipVisibleProducts.map(product => <label key={product.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[10px] hover:bg-white">
                        <input type="checkbox" checked={categoryMembershipProductIds.includes(product.id)} onChange={event => setCategoryMembershipProductIds(previous => event.target.checked ? [...new Set([...previous, product.id])] : previous.filter(id => id !== product.id))} className="accent-emerald-700" />
                        <span className="min-w-0 flex-1 truncate text-neutral-700">{product.styleNo} · {product.name_zh || product.name}</span>
                        <span className="shrink-0 text-neutral-400">{storeCategories.find(item => item.slug === product.category)?.name || '未归类'}</span>
                      </label>)}
                      {!categoryMembershipVisibleProducts.length && <p className="px-2 py-3 text-center text-[10px] text-neutral-400">没有匹配的商品</p>}
                    </div>
                  </div>}
                </article>;
              })}
            </div>
          </div>}

          {productWorkspaceSection === 'catalog' && <>
          <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5" aria-label="商品搜索和筛选">
            <label className="relative block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <input value={productSearch} onChange={event => setProductSearch(event.target.value)} placeholder="搜索商品名称、款号、SKU、条码或面料" className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-neutral-500 focus:bg-white" />
            </label>
            <details className="group rounded-lg border border-neutral-200">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[11px] font-semibold text-neutral-700 marker:hidden">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                高级筛选与排序
                <span className="ml-auto text-[10px] font-normal text-neutral-500">
                  {[
                    productLifecycleFilter !== 'all',
                    productZoneFilter !== 'all',
                    productCategoryFilter !== 'all',
                    productSort !== 'updated'
                  ].filter(Boolean).length || '状态、展示区、分类、排序'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-neutral-500 transition group-open:rotate-180" />
              </summary>
              <div className="grid grid-cols-1 gap-2 border-t border-neutral-100 p-3 sm:grid-cols-2 xl:grid-cols-4">
              <select aria-label="按销售状态筛选" value={productLifecycleFilter} onChange={event => setProductLifecycleFilter(event.target.value)} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs">
                <option value="all">全部销售状态</option><option value="published">已上架</option><option value="draft">草稿</option><option value="pending_review">待审核</option><option value="rejected">未通过</option><option value="archived">已归档</option>
              </select>
              <select aria-label="按展示区筛选" value={productZoneFilter} onChange={event => setProductZoneFilter(event.target.value)} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs">
                <option value="all">全部展示区</option><option value="new">新款区</option><option value="clearance">特价区</option><option value="private">授权订货区</option>
              </select>
              <select aria-label="按店铺分类筛选" value={productCategoryFilter} onChange={event => setProductCategoryFilter(event.target.value)} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs">
                <option value="all">全部分类</option>{storeCategories.map(category => <option key={category.id} value={category.slug}>{category.name}</option>)}
              </select>
              <select aria-label="商品排序方式" value={productSort} onChange={event => setProductSort(event.target.value)} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs">
                <option value="updated">最近更新</option><option value="name">名称 A–Z</option><option value="price-asc">批发价从低到高</option><option value="price-desc">批发价从高到低</option><option value="stock-asc">库存从低到高</option>
              </select>
              </div>
            </details>
            <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
              {([
                ['all', '全部'],
                ['published', '在售'],
                ['draft', '草稿'],
                ['archived', '已归档'],
                ['under-five', '可售 < 5'],
                ['no-image', '缺少图片'],
                ['clearance', '特价区'],
                ['private', '授权款']
              ] as const).map(([view, label]) => {
                const count = view === 'all' ? merchantProducts.length
                  : view === 'published' ? merchantProducts.filter(product => product.lifecycleStatus === 'published').length
                    : view === 'draft' ? merchantProducts.filter(product => product.lifecycleStatus === 'draft').length
                      : view === 'archived' ? merchantProducts.filter(product => product.lifecycleStatus === 'archived').length
                          : view === 'under-five' ? productUnderFiveCount
                            : view === 'no-image' ? productMissingImageCount
                              : merchantProducts.filter(product => getProductZone(product) === view).length;
                return <button key={view} type="button" aria-pressed={productQuickView === view} onClick={() => { setProductQuickView(view); if (['all', 'published', 'draft', 'archived'].includes(view)) setProductLifecycleFilter('all'); }} className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${productQuickView === view ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'}`}>{label}<span className={`ml-1.5 ${productQuickView === view ? 'text-neutral-300' : 'text-neutral-400'}`}>{count}</span></button>;
              })}
              <div className="flex w-full flex-wrap items-center gap-2 border-t border-neutral-100 pt-2 sm:w-auto sm:border-0 sm:pt-0">
                <select aria-label="已保存的商品视图" value={selectedProductView} onChange={event => applySavedProductView(event.target.value)} className="max-w-48 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px]">
                  <option value="">已保存视图{savedProductViews.length ? ` (${savedProductViews.length})` : ''}</option>
                  {savedProductViews.map(view => <option key={view.id} value={view.id}>{view.name}</option>)}
                </select>
                <button type="button" onClick={saveCurrentProductView} className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50">保存当前视图</button>
                {selectedProductView && <button type="button" onClick={deleteSavedProductView} className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50">删除视图</button>}
              </div>
              <span className="ml-auto text-[11px] text-neutral-500">显示 {visibleMerchantProducts.length} / {merchantProducts.length} 款</span>
              {(productSearch || productLifecycleFilter !== 'all' || productZoneFilter !== 'all' || productCategoryFilter !== 'all' || productQuickView !== 'all') && <button type="button" onClick={() => { setProductSearch(''); setProductLifecycleFilter('all'); setProductZoneFilter('all'); setProductCategoryFilter('all'); setProductQuickView('all'); }} className="text-[11px] font-semibold text-neutral-600 underline underline-offset-2 hover:text-neutral-950">清除筛选</button>}
            </div>
          </section>

          {/* Product Table */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            {selectedProductIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-emerald-50/70 px-4 py-3 text-xs">
                <span className="font-semibold text-neutral-800">已选择 {selectedProductIds.length} 款商品</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={batchProductBusy || productBatchPriceBusy} onClick={() => {
                    setProductBatchPrices({ wholesalePrice: '', rrpPrice: '' });
                    setProductBatchPriceOpen(true);
                  }} className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">批量改价格</button>
                  <select aria-label="批量调整商品展示区" disabled={batchProductBusy} defaultValue="" onChange={event => {
                    const zone = event.target.value;
                    if (zone === 'new' || zone === 'clearance' || zone === 'private') void handleBatchProductZone(zone);
                    event.currentTarget.value = '';
                  }} className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-neutral-700 disabled:opacity-50">
                    <option value="" disabled>批量调整展示区…</option><option value="new">移动到新款区</option><option value="clearance">移动到特价区</option><option value="private">移动到授权订货区</option>
                  </select>
                  <button type="button" disabled={batchProductBusy} onClick={() => void handleBatchProductLifecycle('published')} className="rounded-lg bg-emerald-700 px-3 py-1.5 font-semibold text-white disabled:opacity-50">批量上架</button>
                  <button type="button" disabled={batchProductBusy} onClick={() => void handleBatchProductLifecycle('draft')} className="rounded-lg bg-neutral-900 px-3 py-1.5 font-semibold text-white disabled:opacity-50">批量下架</button>
                  <button type="button" disabled={batchProductBusy} onClick={() => void archiveSelectedProducts()} className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">批量归档</button>
                  <button type="button" onClick={() => setSelectedProductIds([])} className="rounded-lg px-2 py-1.5 font-semibold text-neutral-500 hover:bg-white">清除选择</button>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 py-2 text-[11px] text-neutral-500">
              <span>{selectedProductIds.length ? `已选 ${selectedProductIds.length} 款` : `当前显示 ${visibleMerchantProducts.length} 款商品`}</span>
              <button type="button" onClick={() => {
                const visibleIds = visibleMerchantProducts.map(product => product.id);
                const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedProductIds.includes(id));
                setSelectedProductIds(previous => allVisibleSelected
                  ? previous.filter(id => !visibleIds.includes(id))
                  : [...new Set([...previous, ...visibleIds])]);
              }} className="rounded-md px-2 py-1 font-semibold text-neutral-700 hover:bg-neutral-100">
                {visibleMerchantProducts.length > 0 && visibleMerchantProducts.every(product => selectedProductIds.includes(product.id)) ? '取消全选当前结果' : '全选当前结果'}
              </button>
            </div>
            {productViewMode === 'pos' ? (
              <div className="divide-y divide-neutral-200">
                {visibleMerchantProducts.map(product => {
                  const totalQty = getProductStock(product);
                  return (
                    <article id={`merchant-product-${product.id}`} key={product.id} className={`flex flex-col gap-4 p-4 transition-colors hover:bg-neutral-50/70 sm:flex-row sm:items-center sm:gap-5 ${assistantFocusedProductId === product.id ? 'bg-emerald-50 ring-2 ring-inset ring-emerald-400' : ''}`}>
                      <img src={merchantMediaUrl(product.media?.find(media => media.type === 'image')?.url || product.images[0] || '', DEFAULT_MERCHANT_BANNER)} alt={product.name} className="h-56 w-full shrink-0 rounded-lg border border-neutral-200 bg-neutral-100 object-cover sm:h-52 sm:w-40" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg font-bold text-neutral-950">{product.styleNo}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${product.lifecycleStatus === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>
                            {product.lifecycleStatus === 'published' ? '已上架' : product.lifecycleStatus === 'archived' ? '已归档' : '已下架'}
                          </span>
                          {product.visibility === 'private' && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">授权订货区</span>}
                          {product.status === 'clearance' && product.visibility !== 'private' && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">特价</span>}
                        </div>
                        <h3 className="mt-1 truncate text-sm font-semibold text-neutral-800">{product.name}</h3>
                        <p className="mt-1 text-xs text-neutral-500">{product.category} · {product.subCategory} · {product.origin}</p>
                        <div className="mt-4 flex flex-wrap items-end gap-x-7 gap-y-3">
                          <div><p className="text-[10px] text-neutral-500">批发价</p><p className="text-xl font-bold text-neutral-950">€{product.wholesalePrice.toFixed(2)}</p></div>
                          <div><p className="text-[10px] text-neutral-500">建议零售价</p><p className="text-sm font-semibold text-neutral-700">€{product.rrpPrice.toFixed(2)}</p></div>
                          <div><p className="text-[10px] text-neutral-500">库存 / SKU</p><p className={`text-sm font-bold ${getProductAvailableStock(product) < 20 ? 'text-rose-600' : 'text-emerald-700'}`}>{getProductAvailableStock(product)} 可售 <span className="font-normal text-neutral-400">· 共 {product.skus?.length || 0} 组</span></p>{standardInventoryLoaded && <p className="mt-0.5 text-[9px] font-normal text-neutral-400">{totalQty} 在手 · {Math.max(0, totalQty - getProductAvailableStock(product))} 已预留</p>}</div>
                          <div><p className="text-[10px] text-neutral-500">起订 / 箱规</p><p className="text-sm font-semibold text-neutral-700">{product.moq} / {product.packSize} 件</p></div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:max-w-52 sm:justify-end">
                        <select value={getProductZone(product)} aria-label={`${product.styleNo} 商品展示区`} onChange={async event => {
                          const zone = event.target.value as 'new' | 'clearance' | 'private';
                          try {
                            await updateProduct(product.id, getProductZoneUpdates(zone));
                            addNotification('success', '商品展示区已更新', `款式 ${product.styleNo} 已调整为：${zone === 'private' ? '授权订货区' : zone === 'clearance' ? '特价区（倒货）' : '新款区'}`);
                          } catch (error) {
                            addNotification('warning', '商品展示区更新失败', error instanceof Error ? error.message : '请稍后重试');
                          }
                        }} className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs sm:w-auto">
                          <option value="new">新款区</option><option value="clearance">特价区</option><option value="private">授权订货区</option>
                        </select>
                        <button type="button" onClick={() => setSelectedProductIds(previous => previous.includes(product.id) ? previous.filter(id => id !== product.id) : [...previous, product.id])} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${selectedProductIds.includes(product.id) ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'}`}>{selectedProductIds.includes(product.id) ? '已选择' : '选择'}</button>
                        <button type="button" onClick={() => setEditingProduct(product)} className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800"><Pencil className="mr-1 inline h-3.5 w-3.5" />编辑</button>
                        <button type="button" onClick={() => setEditingProductImages(product)} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"><ImagePlus className="mr-1 inline h-3.5 w-3.5" />图片</button>
                        <button type="button" onClick={() => { setSkuTargetStyleNo(product.styleNo); setActiveTab('sku_matrix'); }} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">SKU</button>
                        <button type="button" onClick={() => { if (!window.confirm(`确定停用商品“${product.name}”吗？历史订单和数据会保留。`)) return; void deleteProduct(product.id).catch(() => undefined); }} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"><Trash2 className="mr-1 inline h-3.5 w-3.5" />停用</button>
                      </div>
                    </article>
                  );
                })}
                {visibleMerchantProducts.length === 0 && <p className="p-8 text-center text-sm text-neutral-500">{merchantProducts.length ? '没有符合当前搜索和筛选条件的商品。' : '暂无商品，点击“发布新商品”添加。'}</p>}
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600 uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">
                      <input type="checkbox" aria-label="全选当前筛选结果" checked={visibleMerchantProducts.length > 0 && visibleMerchantProducts.every(product => selectedProductIds.includes(product.id))} onChange={event => {
                        const visibleIds = visibleMerchantProducts.map(product => product.id);
                        setSelectedProductIds(previous => event.target.checked ? [...new Set([...previous, ...visibleIds])] : previous.filter(id => !visibleIds.includes(id)));
                      }} />
                    </th>
                    <th className="py-3 px-4">款号 / 款式名称</th>
                    <th className="py-3 px-4">类目</th>
                    <th className="py-3 px-4">基础批发价</th>
                    <th className="py-3 px-4">建议零售价 (RRP)</th>
                    <th className="py-3 px-4">起订量 / 箱规</th>
                    <th className="py-3 px-4">商品展示区</th>
                    <th className="py-3 px-4">总库存</th>
                    <th className="py-3 px-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {visibleMerchantProducts.map((p) => {
                    const totalQty = getProductStock(p);
                    return (
                      <tr id={`merchant-product-${p.id}`} key={p.id} className={`hover:bg-neutral-50/60 transition-colors ${assistantFocusedProductId === p.id ? 'bg-emerald-50 ring-2 ring-inset ring-emerald-400' : ''}`}>
                        <td className="py-3 px-4 align-top">
                          <input type="checkbox" aria-label={`选择 ${p.styleNo}`} checked={selectedProductIds.includes(p.id)} onChange={event => setSelectedProductIds(previous => event.target.checked ? [...previous, p.id] : previous.filter(id => id !== p.id))} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={merchantMediaUrl(p.media?.find(media => media.type === 'image')?.url || p.images[0] || '', DEFAULT_MERCHANT_BANNER)}
                              alt={p.name}
                              className="h-32 w-24 rounded object-cover border border-neutral-200 shrink-0"
                            />
                            <div>
                              <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                                {p.styleNo}
                                {p.visibility === 'private' && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    🔒 授权订货区
                                  </span>
                                )}
                              </div>
                              <div className="text-neutral-600 line-clamp-1 max-w-xs">{p.name}</div>
                              <div className="text-[11px] text-neutral-400">{p.origin}</div>
                              <div className={`text-[11px] font-semibold ${p.lifecycleStatus === 'published' ? 'text-emerald-700' : 'text-neutral-500'}`}>
                                {p.lifecycleStatus === 'published' ? '已上架' : p.lifecycleStatus === 'archived' ? '已归档' : '已下架'}
                              </div>
                              {p.status === 'clearance' && p.visibility !== 'private' && !p.isExclusiveProtected && (
                                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                  🏷️ 特价区 · 已同步两端店铺
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize font-medium text-neutral-700">{p.category}</span>
                          <div className="text-neutral-400 text-[11px]">{p.subCategory}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-neutral-900">
                          €{p.wholesalePrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-neutral-500">
                          €{p.rrpPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <div>MOQ: {p.moq} 件</div>
                          <div className="text-neutral-400 text-[11px]">{p.packSize} 件/箱</div>
                        </td>
                        <td className="py-3 px-4">
                          {/* 3-Tier Visibility Selector */}
                          <select
                            id={`visibility-select-${p.id}`}
                            value={getProductZone(p)}
                            onChange={async (e) => {
                              const zone = e.target.value as 'new' | 'clearance' | 'private';
                              try {
                                await updateProduct(p.id, getProductZoneUpdates(zone));
                                addNotification('success', '商品展示区已更新', `款式 ${p.styleNo} 已调整为：${zone === 'private' ? '授权订货区' : zone === 'clearance' ? '特价区（倒货）' : '新款区'}`);
                              } catch (error) {
                                addNotification('warning', '商品展示区更新失败', error instanceof Error ? error.message : '请稍后重试');
                              }
                            }}
                            className="text-[11px] font-medium bg-white border border-neutral-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-neutral-900 cursor-pointer"
                          >
                            <option value="new">✨ 新款区</option>
                            <option value="clearance">🏷️ 特价区（倒货）</option>
                            <option value="private">🔒 授权订货区</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-bold ${getProductAvailableStock(p) < 20 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {getProductAvailableStock(p)} 件可售
                          </span>
                          <div className="text-[11px] text-neutral-400">{totalQty} 件在手 · {p.skus?.length || 0} 组 SKU</div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1.5 mb-2">
                            <ShareButton
                              compact
                              title={`${p.name} · ${currentMerchant.name}`}
                              text={`查看 ${currentMerchant.name} 的商品 ${p.name}（款号 ${p.styleNo}）`}
                              path={`${window.location.origin}${window.location.pathname}#/product/${p.id}`}
                              source={`product-${p.id}`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingProduct(p)}
                            className="px-2.5 py-1 text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded transition-colors cursor-pointer mr-1.5"
                          >
                            <Pencil className="mr-1 inline h-3.5 w-3.5" />编辑商品
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingProductImages(p)}
                            className="px-2.5 py-1 text-[11px] font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 rounded transition-colors cursor-pointer mr-1.5"
                          >
                            <ImagePlus className="mr-1 inline h-3.5 w-3.5" />管理图片
                          </button>
                          <button
                            onClick={() => {
                              setSkuTargetStyleNo(p.styleNo);
                              setActiveTab('sku_matrix');
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded transition-colors cursor-pointer mr-1.5"
                          >
                            SKU 矩阵
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!window.confirm(`确定停用商品“${p.name}”吗？历史订单和数据会保留。`)) return;
                              void deleteProduct(p.id).catch(() => undefined);
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium bg-rose-50 hover:bg-rose-100 text-rose-700 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="mr-1 inline h-3.5 w-3.5" />停用
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {visibleMerchantProducts.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-sm text-neutral-500">{merchantProducts.length ? '没有符合当前搜索和筛选条件的商品。' : '暂无商品，点击“发布新商品”添加。'}</td></tr>}
                </tbody>
              </table>
            </div>
            )}
          </div>
          {productBatchPriceOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-neutral-950/50 p-4 backdrop-blur-sm">
              <form onSubmit={event => void saveProductBatchPrices(event)} className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="text-base font-bold text-neutral-950">批量调整价格</h3><p className="mt-1 text-xs leading-5 text-neutral-500">为选中的 {selectedProductIds.length} 款商品统一设置批发价与建议零售价。每款商品分别保存，失败项会明确提示。</p></div>
                  <button type="button" disabled={productBatchPriceBusy} onClick={() => setProductBatchPriceOpen(false)} aria-label="关闭批量价格窗口" className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-50"><X className="h-4 w-4" /></button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="text-xs font-semibold text-neutral-700">批发价 (€)<input type="number" required min="0.01" step="0.01" value={productBatchPrices.wholesalePrice} onChange={event => setProductBatchPrices(current => ({ ...current, wholesalePrice: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-neutral-200 px-3 py-2.5 font-normal outline-none focus:border-neutral-500" /></label>
                  <label className="text-xs font-semibold text-neutral-700">建议零售价 (€)<input type="number" required min={productBatchPrices.wholesalePrice || '0.01'} step="0.01" value={productBatchPrices.rrpPrice} onChange={event => setProductBatchPrices(current => ({ ...current, rrpPrice: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-neutral-200 px-3 py-2.5 font-normal outline-none focus:border-neutral-500" /></label>
                </div>
                <div className="mt-4 flex justify-end gap-2 border-t border-neutral-100 pt-4">
                  <button type="button" disabled={productBatchPriceBusy} onClick={() => setProductBatchPriceOpen(false)} className="rounded-lg border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 disabled:opacity-50">取消</button>
                  <button type="submit" disabled={productBatchPriceBusy || !selectedProductIds.length} className="rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-700 disabled:opacity-50">{productBatchPriceBusy ? '正在更新…' : '确认批量保存'}</button>
                </div>
              </form>
            </div>
          )}
          </>}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: SKU 变体与笛卡尔积批量生成器 */}
      {/* ======================================================== */}
      {activeTab === 'sku_matrix' && (
        <div className="space-y-4">
          <MerchantWorkspaceHeader title="SKU 规格管理" description="按颜色和尺码批量生成 SKU、条码、价格与初始库存。" icon={<Barcode className="h-3.5 w-3.5" />} />
          <div className="merchant-home-card space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">目标款式 (Style No.)</label>
                <select
                  id="sku-matrix-style-selector"
                  value={skuTargetStyleNo}
                  onChange={(e) => setSkuTargetStyleNo(e.target.value)}
                  className="w-full text-xs bg-neutral-50 border border-neutral-300 rounded-lg p-2.5 focus:bg-white"
                >
                  {merchantProducts.map(p => (
                    <option key={p.id} value={p.styleNo}>
                      {p.styleNo} - {p.name.slice(0, 20)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">批发底价 (€)</label>
                <input
                  type="number"
                  step="0.5"
                  value={skuBasePrice}
                  onChange={(e) => setSkuBasePrice(Number(e.target.value))}
                  className="w-full text-xs bg-neutral-50 border border-neutral-300 rounded-lg p-2.5 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">出厂成本价 (€ - 仅内部)</label>
                <input
                  type="number"
                  step="0.5"
                  value={skuCostPrice}
                  onChange={(e) => setSkuCostPrice(Number(e.target.value))}
                  className="w-full text-xs bg-neutral-50 border border-neutral-300 rounded-lg p-2.5 focus:bg-white"
                />
              </div>

              <div className="flex items-end">
                <button
                  id="generate-skus-btn"
                  onClick={handleGenerateSKUs}
                  className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> 笛卡尔积批量生成
                </button>
              </div>
            </div>

            {/* Colors and Sizes Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200">
                <span className="text-xs font-bold text-neutral-800 block mb-2">选择色系 (Colors)</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedColors.map((color, idx) => (
                    <label key={color.code} className="flex items-center gap-2 p-1.5 bg-white rounded border border-neutral-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={color.checked}
                        onChange={(e) => {
                          const updated = [...selectedColors];
                          updated[idx].checked = e.target.checked;
                          setSelectedColors(updated);
                        }}
                        className="rounded text-neutral-900"
                      />
                      <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 shrink-0" style={{ backgroundColor: color.colorCode }}></span>
                      <span className="text-neutral-800 font-medium">{color.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200">
                <span className="text-xs font-bold text-neutral-800 block mb-2">选择尺码 (Sizes)</span>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {selectedSizes.map((size, idx) => (
                    <label key={size.size} className="flex items-center gap-2 p-2 bg-white rounded border border-neutral-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={size.checked}
                        onChange={(e) => {
                          const updated = [...selectedSizes];
                          updated[idx].checked = e.target.checked;
                          setSelectedSizes(updated);
                        }}
                        className="rounded text-neutral-900"
                      />
                      <span className="font-bold text-neutral-900">{size.size}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Generated SKU Preview Table */}
          {generatedSkusList.length > 0 && (
            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-900">
                  已生成待写入变体列表 ({generatedSkusList.length} 组)
                </h3>
                <button
                  id="save-skus-to-product-btn"
                  onClick={handleSaveSkusToProduct}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> 确认合并写入该款式 (Write to Master)
                </button>
              </div>

              <div className="overflow-x-auto border border-neutral-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-600 uppercase border-b border-neutral-200">
                    <tr>
                      <th className="py-2.5 px-3">SKU 编码</th>
                      <th className="py-2.5 px-3">条形码 (EAN-13)</th>
                      <th className="py-2.5 px-3">颜色</th>
                      <th className="py-2.5 px-3">尺码</th>
                      <th className="py-2.5 px-3">出厂成本</th>
                      <th className="py-2.5 px-3">批发价</th>
                      <th className="py-2.5 px-3">RRP</th>
                      <th className="py-2.5 px-3">当前仓库件数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {generatedSkusList.map((s, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50">
                        <td className="py-2 px-3 font-mono font-bold text-neutral-900">{s.sku}</td>
                        <td className="py-2 px-3 font-mono text-neutral-500">{s.barcode}</td>
                        <td className="py-2 px-3 flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full border border-neutral-300" style={{ backgroundColor: s.colorCode }}></span>
                          {s.color}
                        </td>
                        <td className="py-2 px-3 font-bold">{s.size}</td>
                        <td className="py-2 px-3 text-neutral-500">€{s.cost?.toFixed(2)}</td>
                        <td className="py-2 px-3 font-semibold text-neutral-900">€{s.wholesalePrice?.toFixed(2)}</td>
                        <td className="py-2 px-3 text-neutral-500">€{s.rrp?.toFixed(2)}</td>
                        <td className="py-2 px-3">{s.stockCentral}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Existing SKUs for currently selected style */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-neutral-900">
              当前款号【{skuTargetStyleNo}】在库 SKU 明细
            </h3>
            <div className="overflow-x-auto border border-neutral-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600 uppercase border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3">SKU Code</th>
                    <th className="py-2.5 px-3">Color</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">当前仓库件数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {merchantProducts.find(p => p.styleNo === skuTargetStyleNo)?.skus.map((s, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-neutral-900">{s.sku}</td>
                      <td className="py-2.5 px-3 flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full border border-neutral-300" style={{ backgroundColor: s.colorCode }}></span>
                        {s.color}
                      </td>
                      <td className="py-2.5 px-3 font-bold">{s.size}</td>
                      <td className="py-2.5 px-3 font-semibold">{s.stockCentral} 件</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB: optional factory tools for merchants with own production */}
      {/* ======================================================== */}
      {activeTab === 'procurement' && currentMerchantId && (
        <Suspense fallback={<div className="rounded-2xl border border-neutral-200 bg-white p-6 text-xs text-neutral-500">正在加载采购工作台…</div>}>
          <MerchantProcurementWorkspace products={merchantProducts} isIt={isIt} />
        </Suspense>
      )}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          <MerchantWorkspaceHeader
            title="面辅料管理"
            description="仅适用于自有工厂生产或定制补单，可维护物料档案、入库、备料和生产预留。"
            icon={<Layers className="h-3.5 w-3.5" />}
            action={<button type="button" onClick={() => void refreshMaterials()} disabled={materialBusy} className="inline-flex items-center gap-2 rounded-xl border border-white/90 bg-white/80 px-3.5 py-2.5 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${materialBusy ? 'animate-spin' : ''}`} />刷新</button>}
          />
          <div className="merchant-home-card rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
            <form className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4" onSubmit={event => void saveMaterial(event)}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">{editingMaterialId ? '编辑面辅料档案' : '新增面料 / 辅料'}</h3>
                  <p className="mt-1 text-[11px] text-neutral-500">维护物料编码、计量单位、成本和安全库存；已用于 BOM 的物料不能删除，停用后不可用于新的生产备料。</p>
                </div>
                {editingMaterialId && <button type="button" onClick={() => openMaterialEditor()} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700">取消编辑</button>}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                <label className="font-semibold text-neutral-700">物料编码<input required maxLength={80} value={materialForm.code} onChange={event => setMaterialForm(previous => ({ ...previous, code: event.target.value }))} placeholder="例如 FAB-COTTON-01" className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal uppercase" /></label>
                <label className="font-semibold text-neutral-700">物料名称<input required maxLength={200} value={materialForm.name} onChange={event => setMaterialForm(previous => ({ ...previous, name: event.target.value }))} placeholder="例如 220g 纯棉针织面料" className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal" /></label>
                <label className="font-semibold text-neutral-700">物料分类<select value={materialForm.category} onChange={event => setMaterialForm(previous => ({ ...previous, category: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal"><option value="fabric">面料</option><option value="lining">里料</option><option value="trim">辅料 / 配件</option><option value="label">标签 / 标牌</option><option value="packaging">包装材料</option><option value="other">其他</option></select></label>
                <label className="font-semibold text-neutral-700">计量单位<select value={materialForm.unit} disabled={editingMaterialUnitLocked} onChange={event => setMaterialForm(previous => ({ ...previous, unit: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal disabled:bg-neutral-100 disabled:text-neutral-500"><option value="meter">米</option><option value="piece">件 / 个</option><option value="kg">千克</option><option value="roll">卷</option></select>{editingMaterialUnitLocked && <span className="mt-1 block font-normal text-neutral-500">已关联库存流水或 BOM，不能更改单位。</span>}</label>
                <label className="font-semibold text-neutral-700">单位成本（€）<input type="number" min="0" step="0.0001" value={materialForm.unitCost} onChange={event => setMaterialForm(previous => ({ ...previous, unitCost: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal" /></label>
                <label className="font-semibold text-neutral-700">安全库存（{({ meter: '米', piece: '件', kg: '千克', roll: '卷' } as Record<string, string>)[materialForm.unit] || materialForm.unit}）<input type="number" min="0" step="0.001" value={materialForm.reorderPoint} onChange={event => setMaterialForm(previous => ({ ...previous, reorderPoint: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal" /></label>
                <label className="font-semibold text-neutral-700">采购交期（天）<input type="number" min="0" step="1" value={materialForm.leadTimeDays} onChange={event => setMaterialForm(previous => ({ ...previous, leadTimeDays: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal" /></label>
                <label className="font-semibold text-neutral-700">物料状态<select value={materialForm.status} onChange={event => setMaterialForm(previous => ({ ...previous, status: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal"><option value="active">启用</option><option value="suspended">停用</option></select></label>
                <label className="font-semibold text-neutral-700 sm:col-span-2 lg:col-span-4">规格 / 供应备注<textarea maxLength={2000} rows={2} value={materialForm.notes} onChange={event => setMaterialForm(previous => ({ ...previous, notes: event.target.value }))} placeholder="例如：成分、克重、幅宽、颜色号或采购注意事项" className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal" /></label>
              </div>
              <button type="submit" disabled={materialBusy} className="mt-3 rounded-lg bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{materialBusy ? '保存中…' : editingMaterialId ? '保存物料修改' : '创建物料档案'}</button>
            </form>
            <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5" onSubmit={async event => {
              event.preventDefault();
              const quantity = Number(materialInbound.quantity);
              if (!materialInbound.materialId || !Number.isFinite(quantity) || quantity <= 0) {
                addNotification('warning', '请填写入库数量', '选择物料并输入大于 0 的收货数量');
                return;
              }
              setMaterialBusy(true);
              try {
                await apiPost(`/api/merchant/materials/${encodeURIComponent(materialInbound.materialId)}/inbound`, {
                  quantity, locationCode: materialInbound.locationCode, note: materialInbound.note, idempotencyKey: crypto.randomUUID()
                });
                await refreshMaterials();
                setMaterialInbound(previous => ({ ...previous, quantity: '', note: '' }));
                addNotification('success', '面辅料已入库', '库存已更新，可用于自有工厂的补货生产');
              } catch (error) {
                addNotification('warning', '面辅料入库失败', error instanceof Error ? error.message : '请稍后重试');
              } finally {
                setMaterialBusy(false);
              }
            }}>
              <select value={materialInbound.materialId} onChange={event => setMaterialInbound(previous => ({ ...previous, materialId: event.target.value }))} className="border border-neutral-300 rounded-lg px-3 py-2 text-xs md:col-span-2">
                <option value="">选择面辅料</option>
                {materials.filter(material => material.status === 'active').map(material => <option key={material.id} value={material.id}>{material.code} · {material.name}（{material.unit}）</option>)}
              </select>
              <input type="number" min="0.001" step="0.001" value={materialInbound.quantity} onChange={event => setMaterialInbound(previous => ({ ...previous, quantity: event.target.value }))} placeholder={`本次收货数量${materials.find(material => material.id === materialInbound.materialId)?.unit ? `（${materials.find(material => material.id === materialInbound.materialId)?.unit}）` : ''}`} className="border border-neutral-300 rounded-lg px-3 py-2 text-xs" />
              <select value={materialInbound.locationCode} onChange={event => setMaterialInbound(previous => ({ ...previous, locationCode: event.target.value }))} className="border border-neutral-300 rounded-lg px-3 py-2 text-xs">
                <option value="central">RUDA 总仓</option>
              </select>
              <button type="submit" disabled={materialBusy || !materials.some(material => material.id === materialInbound.materialId && material.status === 'active')} className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{materialBusy ? '入库中...' : '确认入库'}</button>
              <input value={materialInbound.note} onChange={event => setMaterialInbound(previous => ({ ...previous, note: event.target.value }))} maxLength={500} placeholder="备注（选填，如送货单号）" className="border border-neutral-300 rounded-lg px-3 py-2 text-xs md:col-span-5" />
            </form>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-neutral-200 text-xs font-bold text-neutral-800">工厂物料库存：红色表示可用库存低于安全库存；可编辑基础资料，停用物料保留历史和 BOM 关联。</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600"><tr><th className="p-3">物料</th><th className="p-3">分类</th><th className="p-3">成本 / 交期</th><th className="p-3">可用 / 现有</th><th className="p-3">安全库存</th><th className="p-3">仓库明细</th><th className="p-3">状态 / 操作</th></tr></thead>
                <tbody className="divide-y divide-neutral-200">
                  {materials.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-neutral-400">暂无工厂物料数据。可在上方创建面料、里料、辅料、标签或包装材料档案；成衣现货商家可直接管理商品库存、调拨和发货，无需配置此项。</td></tr> : materials.map(material => {
                    const lowStock = material.availableQuantity <= material.reorderPoint;
                    return <tr key={material.id} className="hover:bg-neutral-50">
                      <td className="p-3 font-semibold text-neutral-900"><span className="font-mono text-neutral-500">{material.code}</span><span className="block">{material.name}</span></td>
                      <td className="p-3">{({ fabric: '面料', lining: '里料', trim: '辅料 / 配件', label: '标签 / 标牌', packaging: '包装材料', other: '其他' } as Record<string, string>)[material.category] || material.category} · {({ meter: '米', piece: '件 / 个', kg: '千克', roll: '卷' } as Record<string, string>)[material.unit] || material.unit}</td>
                      <td className="p-3">€{material.unitCost.toFixed(4)} / {material.unit}<span className="block text-neutral-500">交期 {material.leadTimeDays} 天</span></td>
                      <td className={`p-3 font-bold ${lowStock ? 'text-rose-700' : 'text-emerald-700'}`}>{material.availableQuantity.toFixed(3)} / {material.onHandQuantity.toFixed(3)}</td>
                      <td className="p-3">{material.reorderPoint.toFixed(3)}</td>
                      <td className="p-3 text-neutral-600">{material.balances.length ? material.balances.map(balance => `${balance.location.name}: ${balance.onHandQuantity.toFixed(3)}（预留 ${balance.reservedQuantity.toFixed(3)}）`).join(' · ') : '暂无库存'}</td>
                      <td className="p-3"><div className="flex flex-col items-start gap-2">{material.status !== 'active' ? <span className="rounded bg-neutral-100 px-2 py-0.5 font-semibold text-neutral-600">已停用</span> : lowStock ? <span className="rounded bg-rose-100 px-2 py-0.5 font-semibold text-rose-800">需要补货</span> : <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">库存正常</span>}<button type="button" onClick={() => openMaterialEditor(material)} className="rounded border border-neutral-300 px-2.5 py-1.5 font-semibold text-neutral-700 hover:bg-neutral-100">编辑</button></div></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
            <div className="border-b border-neutral-200 p-4">
              <h3 className="text-xs font-bold text-neutral-800">面辅料库存流水</h3>
              <p className="mt-1 text-[11px] text-neutral-500">收货入库、生产预留、实际消耗和工单取消释放都会记录在这里，最近显示 100 条。</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600"><tr><th className="p-3">时间</th><th className="p-3">物料</th><th className="p-3">动作</th><th className="p-3">数量</th><th className="p-3">仓库 / 操作人</th><th className="p-3">关联单据 / 备注</th></tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {materialMovements.map(movement => <tr key={movement.id}>
                    <td className="whitespace-nowrap p-3 text-neutral-500">{new Date(movement.createdAt).toLocaleString()}</td>
                    <td className="p-3"><strong>{movement.material.code}</strong><span className="block text-neutral-500">{movement.material.name}</span></td>
                    <td className="p-3">{({ inbound: '收货入库', reservation: '生产预留', release: '取消释放', consumption: '生产消耗', adjustment: '库存调整' } as Record<string, string>)[movement.movementType] || movement.movementType}</td>
                    <td className="p-3 font-semibold">{movement.quantity > 0 ? '+' : ''}{movement.quantity.toFixed(3)} {movement.material.unit}</td>
                    <td className="p-3">{movement.location.name}<span className="block text-neutral-500">{movement.operatorId || '系统'}</span></td>
                    <td className="p-3 text-neutral-600">{movement.referenceType === 'ProductionWorkOrder' ? `生产工单 ${movement.referenceId || ''}` : movement.referenceType === 'MaterialInbound' ? '面辅料收货' : movement.referenceType || '—'}{movement.note ? <span className="block max-w-xs truncate text-neutral-500">{movement.note}</span> : null}</td>
                  </tr>)}
                  {materialMovements.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-neutral-400">暂无库存流水；首次收货或工单备料后会显示在这里。</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB: optional production replenishment */}
      {/* ======================================================== */}
      {activeTab === 'production' && (
        <div className="space-y-4">
          <MerchantWorkspaceHeader
            title="自有工厂补货生产"
            description="仅在自有工厂补单时按款号、颜色和尺码建立计划；合格品会自动进入成衣库存。"
            icon={<ClipboardCheck className="h-3.5 w-3.5" />}
            action={<button type="button" onClick={() => void refreshProduction()} disabled={productionBusy} className="inline-flex items-center gap-2 rounded-xl border border-white/90 bg-white/80 px-3.5 py-2.5 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${productionBusy ? 'animate-spin' : ''}`} />刷新</button>}
          />
          <div className="merchant-home-card rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
            {productionBalances.length === 0 ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">尚无规范 SKU 库存记录。请先完成库存迁移或为款式创建 SKU 变体。</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <select value={productionForm.variantId} onChange={event => setProductionForm(previous => ({ ...previous, variantId: event.target.value }))} className="border border-neutral-300 rounded-lg px-3 py-2 text-xs md:col-span-2">
                  {Array.from(new Map(productionBalances.map(balance => [balance.variantId, balance])).values()).map(balance => <option key={balance.variantId} value={balance.variantId}>{balance.product.styleNo} · {balance.sku}</option>)}
                </select>
                <select value={productionForm.outputLocationId} onChange={event => setProductionForm(previous => ({ ...previous, outputLocationId: event.target.value }))} className="border border-neutral-300 rounded-lg px-3 py-2 text-xs">
                  {Array.from(new Map(productionBalances.map(balance => [balance.location.id, balance.location])).values()).map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
                <input type="number" min="1" value={productionForm.plannedQuantity} onChange={event => setProductionForm(previous => ({ ...previous, plannedQuantity: Number(event.target.value) }))} className="border border-neutral-300 rounded-lg px-3 py-2 text-xs" placeholder="计划件数" />
                <button type="button" disabled={productionBusy} onClick={async () => {
                  const selected = productionBalances.find(balance => balance.variantId === productionForm.variantId);
                  if (!selected) return;
                  setProductionBusy(true);
                  try {
                    await apiPost('/api/merchant/production/work-orders', { ...productionForm, productId: selected.product.id });
                    await refreshProduction();
                    addNotification('success', '生产工单已创建', '请先释放工单，再开始车间报产');
                  } catch (error) {
                    addNotification('warning', '创建生产工单失败', error instanceof Error ? error.message : '请检查输入');
                  } finally { setProductionBusy(false); }
                }} className="bg-neutral-900 text-white rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50">创建工单</button>
              </div>
            )}
          </div>
          <div className="merchant-home-card overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="p-4 border-b border-neutral-200 text-xs font-bold text-neutral-800">工单排产看板</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600"><tr><th className="p-3">工单</th><th className="p-3">款式 / SKU</th><th className="p-3">计划 / 合格 / 不合格</th><th className="p-3">成品仓</th><th className="p-3">状态</th><th className="p-3 text-right">操作</th></tr></thead>
                <tbody className="divide-y divide-neutral-200">
                  {productionWorkOrders.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-neutral-400">暂无生产工单</td></tr> : productionWorkOrders.map(order => (
                    <tr key={order.id}>
                      <td className="p-3 font-mono font-semibold">{order.workOrderNo}</td>
                      <td className="p-3">{order.product.styleNo}<span className="block text-neutral-500">{order.variant.sku}</span></td>
                      <td className="p-3">{order.plannedQuantity} / {order.completedQuantity} / <span className="text-rose-700">{order.rejectedQuantity}</span></td>
                      <td className="p-3">{order.outputLocation.name}</td>
                      <td className="p-3 font-semibold">{order.status}</td>
                      <td className="p-3 text-right space-x-2">
                        {order.status === 'draft' && <button type="button" onClick={async () => { try { await apiPut(`/api/merchant/production/work-orders/${order.id}/status`, { status: 'released' }); await refreshProduction(); } catch (error) { addNotification('warning', '工单释放失败', error instanceof Error ? error.message : '请重试'); } }} className="text-neutral-900 font-semibold">释放</button>}
                        {['released', 'in_progress', 'qc_hold'].includes(order.status) && <button type="button" onClick={async () => {
                          const value = window.prompt('本次合格报产数量');
                          const goodQuantity = Number(value);
                          if (!Number.isInteger(goodQuantity) || goodQuantity <= 0) return;
                          try {
                            await apiPost(`/api/merchant/production/work-orders/${order.id}/reports`, { goodQuantity, rejectedQuantity: 0, idempotencyKey: crypto.randomUUID() });
                            await refreshProduction();
                            addNotification('success', '报产已入库', `${goodQuantity} 件合格成衣已进入成品仓`);
                          } catch (error) { addNotification('warning', '报产失败', error instanceof Error ? error.message : '请重试'); }
                        }} className="text-emerald-700 font-semibold">报产入库</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 5: 单仓库存与商品件数 (INVENTORY) */}
      {/* ======================================================== */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <MerchantWorkspaceHeader title="库存与商品件数" description="查看各 SKU 实际在库、预留和可用数量；库存调整会记录原因与操作记录。" icon={<Boxes className="h-3.5 w-3.5" />} />

          <div className="merchant-home-card overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">实时库存台账</h3>
                <p className="mt-1 text-xs text-neutral-500">可用库存 = 在库 - 已预留；每次手工调整都会记录原因、操作人和版本。</p>
              </div>
              <input value={inventorySearch} onChange={event => setInventorySearch(event.target.value)} placeholder="搜索款号 / SKU" className="rounded-lg border border-neutral-300 px-3 py-2 text-xs sm:w-64" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr><th className="px-4 py-3">商品 / SKU</th><th className="px-4 py-3">仓库</th><th className="px-4 py-3 text-right">在库</th><th className="px-4 py-3 text-right">预留</th><th className="px-4 py-3 text-right">可用</th><th className="px-4 py-3 text-right">在途</th><th className="px-4 py-3 text-right">操作</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {inventoryLoading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-neutral-500">正在读取实时库存...</td></tr> : visibleInventoryBalances.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-neutral-500">暂无标准化库存台账，请先为 SKU 建立库存。</td></tr> : visibleInventoryBalances.map(balance => (
                    <tr key={balance.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3"><div className="font-semibold text-neutral-900">{balance.product.styleNo} · {balance.product.name}</div><div className="mt-0.5 font-mono text-[11px] text-neutral-500">{balance.sku} {balance.color || ''} {balance.size || ''}</div></td>
                      <td className="px-4 py-3 font-medium">{balance.location.name}</td>
                      <td className="px-4 py-3 text-right font-semibold">{balance.onHandQuantity}</td>
                      <td className="px-4 py-3 text-right text-amber-700">{balance.reservedQuantity}</td>
                      <td className={`px-4 py-3 text-right font-bold ${balance.availableQuantity <= 0 ? 'text-rose-700' : balance.availableQuantity <= 5 ? 'text-amber-700' : 'text-emerald-700'}`}>{balance.availableQuantity}</td>
                      <td className="px-4 py-3 text-right text-indigo-700">{balance.inTransitQuantity}</td>
                      <td className="px-4 py-3 text-right"><button type="button" onClick={() => setInventoryAdjustment({ balance, quantity: String(balance.onHandQuantity), note: '' })} className="rounded-lg bg-neutral-900 px-2.5 py-1.5 text-[11px] font-semibold text-white">修改商品件数</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs">
            <div className="border-b border-neutral-200 p-4">
              <h3 className="text-sm font-bold text-neutral-900">库存流水与仓库作业记录</h3>
              <p className="mt-1 text-xs text-neutral-500">入库、销售、退货、调拨和手工盘点统一记录，便于服装批发对账和追溯。</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3">时间</th><th className="px-4 py-3">商品 / SKU</th><th className="px-4 py-3">仓库</th><th className="px-4 py-3">作业</th><th className="px-4 py-3 text-right">数量</th><th className="px-4 py-3">备注</th></tr></thead>
                <tbody className="divide-y divide-neutral-200">
                  {inventoryMovements.length === 0 ? <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-400">暂无库存流水</td></tr> : inventoryMovements.slice(0, 30).map(movement => (
                    <tr key={movement.id}>
                      <td className="px-4 py-3 text-neutral-500">{new Date(movement.createdAt).toLocaleString(getIntlLocale(lang))}</td>
                      <td className="px-4 py-3"><span className="font-semibold">{movement.variant.product.styleNo}</span><span className="ml-2 font-mono text-neutral-500">{movement.variant.sku}</span></td>
                      <td className="px-4 py-3">{movement.location.name}</td>
                      <td className="px-4 py-3">{({ inbound: '采购/生产入库', purchase_order: '采购在途', reservation: '订单预留', release: '释放预留', sale: '销售出库', return: '退货入库', transfer: '调拨', adjustment: '盘点调整' } as Record<string, string>)[movement.movementType] || movement.movementType}</td>
                      <td className={`px-4 py-3 text-right font-bold ${movement.quantity >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{movement.quantity > 0 ? '+' : ''}{movement.quantity}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-neutral-500">{movement.note || '系统作业'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transfers Table */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-neutral-200 font-bold text-xs uppercase tracking-wider text-neutral-700">
              调拨单记录 (Stock Transfer Orders)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600 uppercase border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">调拨单号</th>
                    <th className="py-3 px-4">发起时间</th>
                    <th className="py-3 px-4">款号 / SKU</th>
                    <th className="py-3 px-4">调出仓库 (From)</th>
                    <th className="py-3 px-4">调入仓库 (To)</th>
                    <th className="py-3 px-4">调拨件数</th>
                    <th className="py-3 px-4">状态</th>
                    <th className="py-3 px-4">备注原因</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {merchantTransfers.map((tr) => (
                    <tr key={tr.id} className="hover:bg-neutral-50">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900">{tr.transferNo || tr.id}</td>
                      <td className="py-3 px-4 text-neutral-500">{tr.date}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900">{tr.styleNo}</div>
                        <div className="text-neutral-500 font-mono text-[11px]">{tr.sku}</div>
                      </td>
                      <td className="py-3 px-4 capitalize font-medium">{tr.fromLocation} 仓</td>
                      <td className="py-3 px-4 capitalize font-medium text-amber-700">{tr.toLocation} 展厅</td>
                      <td className="py-3 px-4 font-bold text-neutral-900">{tr.quantity} 件</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          tr.status === 'completed' || tr.status === 'received'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tr.status === 'in_transit'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-neutral-100 text-neutral-800'
                        }`}>
                          {tr.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-500 text-[11px]">{tr.notes || '常规调货'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 5: 订单配货与发货全流程 (ORDERS & FULFILLMENT) */}
      {/* ======================================================== */}
      {activeTab === 'orders' && (
        <section className="merchant-orders-workspace space-y-4" aria-label="订单管理">
          <header className="merchant-orders-header merchant-home-intro relative overflow-hidden rounded-3xl border border-neutral-200 bg-[radial-gradient(ellipse_at_85%_0%,rgba(209,250,229,0.7),transparent_38%),linear-gradient(145deg,#fff_18%,#f8fafc_72%,#eef2ff_100%)] p-5 shadow-sm sm:p-7">
            <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-neutral-100/80 blur-3xl" />
            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500 shadow-sm">
                  <ShoppingBag className="h-3.5 w-3.5 text-neutral-800" />
                  Orders & fulfillment
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {orderView === 'drafts' ? 'Draft quotes' : `${merchantOrders.length} orders`}
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">{orderView === 'drafts' ? '草稿订单与报价' : '订单管理'}</h2>
                <p className="mt-2 max-w-xl text-xs leading-5 text-neutral-500 sm:text-sm">
                  {orderView === 'drafts' ? '以销售报价单形式保存待确认订单；客户确认后会生成正式订单。' : '从付款确认、订单履约到售后处理，在一个工作区掌握每笔交易。'}
                </p>
              </div>
              <div className="relative flex flex-wrap gap-2">
                {orderView === 'orders' && (
                  <select aria-label="订单日期范围" value={orderDateRange} onChange={event => setOrderDateRange(event.target.value as typeof orderDateRange)} className="rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-300 focus:border-neutral-500 focus:outline-none">
                    <option value="7">最近 7 天</option>
                    <option value="30">最近 30 天</option>
                    <option value="90">最近 90 天</option>
                    <option value="all">全部时间</option>
                  </select>
                )}
                <button type="button" onClick={() => openDraftQuoteForm()} className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-700 hover:shadow-md">
                  <Plus className="h-4 w-4" />新建草稿订单
                </button>
                {orderView === 'orders' && (
                  <button
                    type="button"
                    disabled={!visibleMerchantOrders.length}
                    onClick={() => {
                      const ordersToExport = selectedOrderIds.length
                        ? visibleMerchantOrders.filter(order => selectedOrderIds.includes(order.id))
                        : visibleMerchantOrders;
                      const escapeCsv = (value: unknown) => {
                        const normalized = String(value ?? '');
                        const safe = /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
                        return `"${safe.replaceAll('"', '""')}"`;
                      };
                      const rows = [
                        ['订单号', '日期', '客户', '国家', '商品款数', '件数', '商品金额EUR', '运费EUR', '总金额EUR', '付款状态', '履约状态', '承运商', '物流单号'],
                        ...ordersToExport.map(order => [
                          order.orderNo, order.date, order.companyName, order.shippingAddress?.country,
                          order.items.length, order.totalQty, order.totalAmount, order.shippingFee || 0,
                          order.totalAmount + (order.shippingFee || 0), order.paymentStatus, order.status,
                          order.carrier, order.trackingNumber
                        ])
                      ];
                      const csv = `\uFEFF${rows.map(row => row.map(escapeCsv).join(',')).join('\r\n')}`;
                      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `ruda-orders-${new Date().toISOString().slice(0, 10)}.csv`;
                      link.click();
                      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-40"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    {selectedVisibleOrderCount ? `导出已选 (${selectedVisibleOrderCount})` : '导出订单'}
                  </button>
                )}
              </div>
            </div>
          </header>

          <div className="flex w-fit items-center gap-1 rounded-2xl border border-neutral-200 bg-white/80 p-1.5 shadow-sm">
            <button type="button" onClick={() => setOrderView('orders')} className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition ${orderView === 'orders' ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'}`}>正式订单<span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${orderView === 'orders' ? 'bg-white/15 text-white' : 'bg-neutral-100 text-neutral-500'}`}>{merchantOrders.length}</span></button>
            <button type="button" onClick={() => setOrderView('drafts')} className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition ${orderView === 'drafts' ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'}`}>草稿订单 / 报价单<span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${orderView === 'drafts' ? 'bg-white/15 text-white' : 'bg-neutral-100 text-neutral-500'}`}>{merchantQuotes.length}</span></button>
          </div>

          {orderView === 'orders' && (
            <section className="merchant-orders-ai merchant-home-card overflow-hidden rounded-3xl border border-neutral-200 bg-[radial-gradient(ellipse_at_85%_0%,rgba(209,250,229,0.7),transparent_38%),linear-gradient(145deg,#fff_18%,#f8fafc_72%,#eef2ff_100%)] p-4 shadow-sm sm:p-6" aria-labelledby="merchant-orders-ai-title">
              <div className="grid gap-5 xl:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.1fr)] xl:items-start">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 shadow-sm">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-700" /> GPTmoda · 订单工作台
                  </div>
                  <h3 id="merchant-orders-ai-title" className="mt-3 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">订单查找、分析与准备</h3>
                  <p className="mt-2 max-w-xl text-xs leading-5 text-neutral-600">按订单号、客户、商品提问；AI 使用当前商家权限查询并给出分析。创建报价和编辑资料会预填表单，最后保存由你确认。</p>
                  <form onSubmit={event => { event.preventDefault(); runOrderAiQuery(orderAiQuestion); }} className="merchant-home-prompt mt-4 flex max-w-2xl items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-2 pl-3 shadow-md shadow-neutral-900/5 transition focus-within:border-neutral-400">
                    <Search className="h-4 w-4 shrink-0 text-neutral-400" />
                    <input value={orderAiQuestion} onChange={event => setOrderAiQuestion(event.target.value)} maxLength={500} placeholder="例如：找一下 ACME 的订单，或分析本月销售趋势" className="h-10 min-w-0 flex-1 bg-transparent text-xs text-neutral-900 outline-none placeholder:text-neutral-400 sm:text-sm" />
                    <button type="submit" aria-label="向订单助手提问" disabled={assistantBusy || !orderAiQuestion.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400">
                      {assistantBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                    </button>
                  </form>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['找未发货的订单', '查看未付款订单', '分析销售趋势和热销商品'].map(question => (
                      <button key={question} type="button" disabled={assistantBusy} onClick={() => runOrderAiQuery(question)} className="rounded-full border border-white/90 bg-white/75 px-3 py-1.5 text-[10px] font-medium text-neutral-600 transition hover:border-neutral-300 hover:bg-white hover:text-neutral-950 disabled:opacity-50">{question}</button>
                    ))}
                    <button type="button" onClick={() => openDraftQuoteForm(orderAiQuestion)} className="rounded-full border border-neutral-900/10 bg-neutral-950 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-neutral-700">准备草稿报价</button>
                    <button type="button" disabled={!selectedOrderForAiEdit || !['placed', 'pending', 'confirmed'].includes(selectedOrderForAiEdit.status)} onClick={() => {
                      if (!selectedOrderForAiEdit) return;
                      setSelectedOrderDetailId(selectedOrderForAiEdit.id);
                      prepareOrderEdit(selectedOrderForAiEdit);
                    }} className="rounded-full border border-white/90 bg-white/75 px-3 py-1.5 text-[10px] font-medium text-neutral-600 transition hover:border-neutral-300 hover:bg-white hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-50">预填所选订单资料</button>
                  </div>
                  {orderAiAnswerVisible && assistantAnswer && (
                    <article className="merchant-home-answer mt-4 rounded-2xl border border-white bg-white/90 p-4 shadow-md sm:p-5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800"><Sparkles className="h-4 w-4 text-emerald-700" /> GPTmoda 回复</div>
                      <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-neutral-700 sm:text-sm">{assistantAnswer.reply}</p>
                      {assistantAnswer.summary?.gmv30d !== undefined && (
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          <div className="rounded-xl bg-neutral-50 p-3"><span className="block text-[9px] text-neutral-500">{assistantAnswer.summary.periodLabel || '所选期间'}订单金额</span><strong className="mt-1 block text-sm text-neutral-900">€{assistantAnswer.summary.gmv30d.toFixed(2)}</strong></div>
                          {assistantAnswer.summary.averageOrderValue !== undefined && <div className="rounded-xl bg-neutral-50 p-3"><span className="block text-[9px] text-neutral-500">平均客单价</span><strong className="mt-1 block text-sm text-neutral-900">€{assistantAnswer.summary.averageOrderValue.toFixed(2)}</strong></div>}
                          {assistantAnswer.summary.gmvTrend !== undefined && <div className="rounded-xl bg-neutral-50 p-3"><span className="block text-[9px] text-neutral-500">较前一等长期间</span><strong className={`mt-1 block text-sm ${assistantAnswer.summary.gmvTrend < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{assistantAnswer.summary.gmvTrend >= 0 ? '+' : ''}{assistantAnswer.summary.gmvTrend}%</strong></div>}
                        </div>
                      )}
                      {assistantAnswer.dataBasis?.length ? <p className="mt-3 text-[9px] leading-4 text-neutral-400">数据依据：{assistantAnswer.dataBasis.join(' · ')}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => openDraftQuoteForm(orderAiQuestion)} className="rounded-lg bg-neutral-950 px-3 py-2 text-[10px] font-semibold text-white hover:bg-neutral-700">按请求预填草稿报价</button>
                        <button type="button" onClick={() => { setAssistantPanelOpen(true); setAssistantPanelExpanded(true); }} className="rounded-lg border border-neutral-200 px-3 py-2 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-50">展开右侧 GPTmoda 对话</button>
                      </div>
                    </article>
                  )}
                  <p className="mt-3 text-[9px] leading-4 text-neutral-500">AI 可查询、分析和预填资料；收款、退款、取消、履约及自动化操作仍需你在后台确认。</p>
                </div>

                <div className="rounded-2xl border border-white/90 bg-white/75 p-4 shadow-sm backdrop-blur-sm sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">真实订单数据分析</p>
                      <p className="mt-1 text-xs text-neutral-600">按上方日期范围汇总；趋势图展示最近周期。</p>
                    </div>
                    <div role="group" aria-label="订单趋势周期" className="flex rounded-xl border border-neutral-200 bg-white p-1">
                      {([
                        ['day', '日'],
                        ['week', '周'],
                        ['month', '月']
                      ] as const).map(([period, label]) => (
                        <button key={period} type="button" aria-pressed={orderAnalyticsGranularity === period} onClick={() => setOrderAnalyticsGranularity(period)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition ${orderAnalyticsGranularity === period ? 'bg-neutral-950 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ['订单数', orderAnalyticsTotals.count.toLocaleString()],
                      ['订单金额', `€${orderAnalyticsTotals.amount.toFixed(2)}`],
                      ['平均客单价', `€${orderAnalyticsTotals.average.toFixed(2)}`],
                      ['记录退款额', `€${orderAnalyticsTotals.refunds.toFixed(2)}`]
                    ].map(([label, value]) => <div key={label} className="rounded-xl border border-neutral-100 bg-white/90 px-3 py-2.5"><span className="block text-[9px] text-neutral-500">{label}</span><strong className="mt-1 block truncate text-sm font-semibold tabular-nums text-neutral-900">{value}</strong></div>)}
                  </div>
                  <div className="mt-4 flex h-28 items-end gap-1.5 sm:gap-2" role="img" aria-label={`订单金额趋势，按${orderAnalyticsGranularity === 'day' ? '日' : orderAnalyticsGranularity === 'week' ? '周' : '月'}统计`}>
                    {orderAnalyticsBuckets.map(bucket => (
                      <div key={bucket.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${bucket.label}：${bucket.count} 笔，€${bucket.amount.toFixed(2)}`}>
                        <span className="max-w-full truncate text-[8px] tabular-nums text-neutral-400">{bucket.amount ? `€${Math.round(bucket.amount)}` : ''}</span>
                        <div className="w-full max-w-9 rounded-t-md bg-gradient-to-t from-emerald-700 to-emerald-400 transition-all" style={{ height: `${Math.max(4, bucket.amount / orderAnalyticsMaxAmount * 100)}%` }} />
                        <span className="w-full truncate text-center text-[8px] text-neutral-500">{bucket.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-4 border-t border-neutral-100 pt-4 sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] font-semibold text-neutral-700">热销商品 · 件数</p>
                      {orderAnalyticsTopProducts.length ? <ol className="mt-2 space-y-1.5">{orderAnalyticsTopProducts.map(([name, quantity], index) => <li key={name} className="flex items-center justify-between gap-2 text-[9px]"><span className="min-w-0 truncate text-neutral-600"><span className="mr-1.5 text-neutral-400">{index + 1}.</span>{name}</span><strong className="shrink-0 tabular-nums text-neutral-800">{quantity}</strong></li>)}</ol> : <p className="mt-2 text-[9px] text-neutral-400">所选期间暂无商品销售记录</p>}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-neutral-700">客户排行 · 金额</p>
                      {orderAnalyticsTopCustomers.length ? <ol className="mt-2 space-y-1.5">{orderAnalyticsTopCustomers.map(([name, totals], index) => <li key={name} className="flex items-center justify-between gap-2 text-[9px]"><span className="min-w-0 truncate text-neutral-600"><span className="mr-1.5 text-neutral-400">{index + 1}.</span>{name} · {totals.count} 单</span><strong className="shrink-0 tabular-nums text-neutral-800">€{totals.amount.toFixed(0)}</strong></li>)}</ol> : <p className="mt-2 text-[9px] text-neutral-400">所选期间暂无客户订单</p>}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-neutral-700">地区分布 · 订单数</p>
                      {orderAnalyticsCountries.length ? <ol className="mt-2 space-y-1.5">{orderAnalyticsCountries.map(([country, count], index) => <li key={country} className="flex items-center justify-between gap-2 text-[9px]"><span className="min-w-0 truncate text-neutral-600"><span className="mr-1.5 text-neutral-400">{index + 1}.</span>{country}</span><strong className="shrink-0 tabular-nums text-neutral-800">{count}</strong></li>)}</ol> : <p className="mt-2 text-[9px] text-neutral-400">所选期间暂无地区数据</p>}
                    </div>
                  </div>
                  <p className="mt-3 text-[9px] leading-4 text-neutral-400">金额按订单商品金额加运费汇总，包含未付款订单；退款额仅统计系统订单已有退款金额，不等同于财务结算。渠道字段暂未接入订单数据。</p>
                </div>
              </div>
            </section>
          )}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              { label: orderView === 'drafts' ? '草稿报价' : '订单数', value: orderView === 'drafts' ? merchantQuotes.length : ordersInSelectedDateRange.length, detail: orderView === 'drafts' ? '报价跟进' : '所选时间范围', Icon: ShoppingBag, tone: 'merchant-home-tone-blue' },
              { label: orderView === 'drafts' ? '草稿件数' : '订购件数', value: orderView === 'drafts' ? merchantQuotes.reduce((sum, quote) => sum + quote.totalQty, 0) : ordersInSelectedDateRange.reduce((sum, order) => sum + order.totalQty, 0), detail: '件商品', Icon: Boxes, tone: 'merchant-home-tone-green' },
              { label: orderView === 'drafts' ? '待客户确认' : '待履约', value: orderView === 'drafts' ? merchantQuotes.filter(quote => ['draft', 'sent'].includes(quote.status)).length : ordersInSelectedDateRange.filter(order => ['placed', 'pending', 'confirmed', 'picking'].includes(order.status)).length, detail: orderView === 'drafts' ? '等待客户回复' : '需要仓库处理', Icon: Truck, tone: 'merchant-home-tone-amber' },
              { label: orderView === 'drafts' ? '报价总额' : '未付款订单', value: orderView === 'drafts' ? `€${merchantQuotes.reduce((sum, quote) => sum + quote.totalAmount, 0).toFixed(2)}` : ordersInSelectedDateRange.filter(order => order.paymentStatus === 'unpaid').length, detail: orderView === 'drafts' ? '报价金额合计' : '需要跟进收款', Icon: DollarSign, tone: 'merchant-home-tone-violet' }
            ].map(metric => (
              <div key={metric.label} className={`merchant-orders-metric ${metric.tone} rounded-2xl border border-neutral-200/80 p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-5`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium text-neutral-500">{metric.label}</p>
                    <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-neutral-950 sm:text-2xl">{typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}</p>
                    <p className="mt-1 text-[10px] text-neutral-500">{metric.detail}</p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/75 text-neutral-700 shadow-sm"><metric.Icon className="h-4 w-4" /></span>
                </div>
              </div>
            ))}
          </div>

          {orderView === 'orders' ? (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200/80 p-3 sm:p-5">
              <div className="flex flex-wrap items-center gap-1 border-b border-neutral-100 pb-3">
                {([
                  ['all', '全部', ordersInSelectedDateRange.length],
                  ['unfulfilled', '未履约', ordersInSelectedDateRange.filter(order => !['shipped', 'delivered', 'cancelled', 'returned'].includes(order.status)).length],
                  ['unpaid', '未付款', ordersInSelectedDateRange.filter(order => order.paymentStatus === 'unpaid').length],
                  ['open', '进行中', ordersInSelectedDateRange.filter(order => ['placed', 'pending', 'confirmed', 'picking', 'shipped'].includes(order.status)).length],
                  ['complete', '已完成', ordersInSelectedDateRange.filter(order => ['delivered', 'returned', 'cancelled'].includes(order.status)).length]
                ] as const).map(([filter, label, count]) => (
                  <button key={filter} type="button" onClick={() => setOrderStatusFilter(filter)} className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${orderStatusFilter === filter ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'}`}>
                    {label}<span className={`ml-1.5 ${orderStatusFilter === filter ? 'text-neutral-300' : 'text-neutral-400'}`}>{count}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_170px_170px_150px_auto]">
                <label className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input value={orderSearch} onChange={event => setOrderSearch(event.target.value)} placeholder="搜索订单、客户、商品、SKU 或物流" className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-xs outline-none transition focus:border-neutral-400 focus:bg-white" />
                </label>
                <select aria-label="付款状态筛选" value={orderPaymentFilter} onChange={event => setOrderPaymentFilter(event.target.value as typeof orderPaymentFilter)} className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-700">
                  <option value="all">所有付款状态</option>
                  <option value="paid">已付款</option>
                  <option value="partially_refunded">部分退款</option>
                  <option value="unpaid">未付款</option>
                  <option value="pending_credit">账期待结</option>
                  <option value="pending_refund">退款处理中</option>
                  <option value="refunded">已退款</option>
                </select>
                <select aria-label="配送方式筛选" value={orderDeliveryFilter} onChange={event => setOrderDeliveryFilter(event.target.value as typeof orderDeliveryFilter)} className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-700">
                  <option value="all">所有配送方式</option>
                  <option value="shipping">配送发货</option>
                  <option value="showroom_pickup">展厅自提</option>
                </select>
                <select aria-label="订单排序方式" value={orderSort} onChange={event => setOrderSort(event.target.value as typeof orderSort)} className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-700">
                  <option value="date">按日期</option>
                  <option value="amount">按金额</option>
                  <option value="quantity">按件数</option>
                </select>
                <button type="button" aria-label={orderSortDirection === 'desc' ? '降序排列' : '升序排列'} onClick={() => setOrderSortDirection(direction => direction === 'desc' ? 'asc' : 'desc')} className="h-10 rounded-xl border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                  {orderSortDirection === 'desc' ? '降序 ↓' : '升序 ↑'}
                </button>
              </div>
              {(orderSearch || orderPaymentFilter !== 'all' || orderDeliveryFilter !== 'all' || orderStatusFilter !== 'all') && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">当前筛选</span>
                  {orderSearch && <button type="button" onClick={() => setOrderSearch('')} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] text-neutral-700">“{orderSearch}” ×</button>}
                  {orderPaymentFilter !== 'all' && <button type="button" onClick={() => setOrderPaymentFilter('all')} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] text-neutral-700">{({ paid: '已付款', partially_refunded: '部分退款', unpaid: '未付款', pending_credit: '账期待结', pending_refund: '退款处理中', refunded: '已退款', all: '全部' } as Record<string, string>)[orderPaymentFilter]} ×</button>}
                  {orderDeliveryFilter !== 'all' && <button type="button" onClick={() => setOrderDeliveryFilter('all')} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] text-neutral-700">{orderDeliveryFilter === 'shipping' ? '配送发货' : '展厅自提'} ×</button>}
                  <button type="button" onClick={() => { setOrderSearch(''); setOrderStatusFilter('all'); setOrderPaymentFilter('all'); setOrderDeliveryFilter('all'); }} className="text-[10px] font-semibold text-neutral-500 underline decoration-neutral-300 underline-offset-2 hover:text-neutral-900">清除筛选</button>
                </div>
              )}
              {selectedVisibleOrderCount > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2">
                  <span className="text-xs font-semibold text-neutral-700">当前筛选中已选择 {selectedVisibleOrderCount} 笔订单</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => {
                      const selected = visibleMerchantOrders.filter(order => selectedOrderIds.includes(order.id));
                      if (!selected.length) return;
                      const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
                      const rows = selected.map(order => `<tr><td>${escapeHtml(order.orderNo)}</td><td>${escapeHtml(order.date)}</td><td>${escapeHtml(order.companyName)}</td><td>${order.totalQty}</td><td>€${order.totalAmount.toFixed(2)}</td><td>${escapeHtml(order.status)}</td></tr>`).join('');
                      const printWindow = window.open('', '_blank');
                      if (!printWindow) {
                        addNotification('warning', '无法打开打印窗口', '请允许此网站打开弹出窗口后重试');
                        return;
                      }
                      printWindow.opener = null;
                      printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>订单清单</title><style>body{font:13px Arial,sans-serif;margin:28px;color:#111}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #bbb;padding:8px;text-align:left}th{background:#f1f5f9}@media print{button{display:none}}</style></head><body><button onclick="window.print()">打印 / 保存 PDF</button><h1>RUDA 商家订单清单</h1><table><thead><tr><th>订单号</th><th>日期</th><th>客户</th><th>件数</th><th>金额</th><th>状态</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
                      printWindow.document.close();
                    }} className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-100">打印订单清单</button>
                    <button type="button" onClick={() => setSelectedOrderIds([])} className="rounded-lg px-2 py-1.5 text-[11px] text-neutral-500 hover:bg-white">取消选择</button>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3"><input aria-label="选择本页全部订单" type="checkbox" checked={paginatedMerchantOrders.length > 0 && paginatedMerchantOrders.every(order => selectedOrderIds.includes(order.id))} onChange={event => setSelectedOrderIds(current => event.target.checked ? Array.from(new Set([...current, ...paginatedMerchantOrders.map(order => order.id)])) : current.filter(id => !paginatedMerchantOrders.some(order => order.id === id)))} className="accent-neutral-900" /></th>
                    <th className="px-4 py-3">订单 / 日期</th>
                    <th className="px-4 py-3">客户 / 收货地</th>
                    <th className="px-4 py-3">商品</th>
                    <th className="px-4 py-3">件数</th>
                    <th className="px-4 py-3">总金额</th>
                    <th className="px-4 py-3">付款状态</th>
                    <th className="px-4 py-3">履约状态</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {paginatedMerchantOrders.map(order => {
                    const isPendingFulfill = ['confirmed', 'picking', 'placed', 'pending'].includes(order.status);
                    const returnRequest = merchantReturnsByOrderId.get(order.id);
                    const isReturnRequested = returnRequest?.status === 'requested' || (!serverReturns && order.refundStatus === 'requested');
                    return (
                      <tr key={order.id} className="group transition hover:bg-neutral-50/80">
                        <td className="px-4 py-3"><input aria-label={`选择订单 ${order.orderNo}`} type="checkbox" checked={selectedOrderIds.includes(order.id)} onChange={event => setSelectedOrderIds(current => event.target.checked ? [...current, order.id] : current.filter(id => id !== order.id))} className="accent-neutral-900" /></td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => setSelectedOrderDetailId(order.id)} className="font-bold text-neutral-900 hover:underline">{order.orderNo}</button>
                          <span className="mt-1 block text-[10px] text-neutral-500">{order.date}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => setSelectedOrderDetailId(order.id)} className="text-left font-semibold text-neutral-800 hover:underline">{order.companyName}</button>
                          <span className="mt-1 block text-[10px] text-neutral-500">{[order.shippingAddress?.city, order.shippingAddress?.country].filter(Boolean).join(', ') || '未填写收货地址'}</span>
                        </td>
                        <td className="max-w-[240px] px-4 py-3">
                          <span className="block truncate font-medium text-neutral-800">{order.items.slice(0, 2).map(item => item.productName || item.styleNo).join('、')}{order.items.length > 2 ? ` 等 ${order.items.length} 款` : ''}</span>
                          <span className="mt-1 block truncate text-[10px] text-neutral-500">{order.items.slice(0, 2).map(item => item.sku).join(' · ')}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold tabular-nums text-neutral-800">{order.totalQty}</td>
                        <td className="px-4 py-3 font-semibold tabular-nums text-neutral-900">€{(order.totalAmount + (order.shippingFee || 0)).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${order.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' : order.paymentStatus === 'partially_refunded' ? 'bg-amber-50 text-amber-700' : order.paymentStatus === 'refunded' ? 'bg-neutral-100 text-neutral-600' : 'bg-amber-50 text-amber-700'}`}>
                            {order.paymentStatus === 'paid' ? '已付款' : order.paymentStatus === 'partially_refunded' ? '部分退款' : order.paymentStatus === 'pending_credit' ? '账期待结' : order.paymentStatus === 'refunded' ? '已退款' : order.paymentStatus === 'pending_refund' ? '退款处理中' : '未付款'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${['shipped', 'delivered'].includes(order.status) ? 'bg-emerald-50 text-emerald-700' : ['cancelled', 'returned'].includes(order.status) ? 'bg-neutral-100 text-neutral-600' : 'bg-blue-50 text-blue-700'}`}>
                            {({ placed: '待确认', pending: '待处理', confirmed: '已确认', picking: '配货中', shipped: '已发货', delivered: '已送达', return_requested: '退货申请', returned: '已退货', cancelled: '已取消' } as Record<string, string>)[order.status] || order.status}
                          </span>
                          {order.trackingNumber && <span className="mt-1 block max-w-36 truncate font-mono text-[9px] text-neutral-500" title={`${order.carrier || ''} ${order.trackingNumber}`}>{order.carrier ? `${order.carrier} · ` : ''}{order.trackingNumber}</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button type="button" onClick={() => setSelectedOrderDetailId(order.id)} className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[10px] font-semibold text-neutral-700 hover:bg-white">详情</button>
                            {isReturnRequested && returnRequest ? (
                              <button type="button" onClick={() => setSelectedOrderDetailId(order.id)} className="rounded-lg bg-neutral-950 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-neutral-700">审核售后</button>
                            ) : isPendingFulfill ? (
                              <button id={`fulfill-btn-${order.id}`} type="button" onClick={() => { setSelectedOrderForFulfill(order); setFulfillTracking(''); }} className="rounded-lg bg-neutral-950 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-neutral-700">处理履约</button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {visibleMerchantOrders.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-14 text-center">
                      <ShoppingBag className="mx-auto h-8 w-8 text-neutral-300" />
                      <p className="mt-3 text-sm font-semibold text-neutral-700">{merchantOrders.length ? '没有符合条件的订单' : '还没有订单'}</p>
                      <p className="mt-1 text-xs text-neutral-500">{merchantOrders.length ? '试试调整搜索关键词、状态或日期范围。' : '客户在你的店铺下单后，订单会显示在这里。'}</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 border-t border-neutral-100 p-3 lg:hidden">
              {paginatedMerchantOrders.map(order => {
                const isPendingFulfill = ['confirmed', 'picking', 'placed', 'pending'].includes(order.status);
                const returnRequest = merchantReturnsByOrderId.get(order.id);
                const isReturnRequested = returnRequest?.status === 'requested' || (!serverReturns && order.refundStatus === 'requested');
                return (
                  <article key={order.id} className="merchant-order-mobile-card rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <input aria-label={`选择订单 ${order.orderNo}`} type="checkbox" checked={selectedOrderIds.includes(order.id)} onChange={event => setSelectedOrderIds(current => event.target.checked ? [...current, order.id] : current.filter(id => id !== order.id))} className="mt-1 accent-neutral-900" />
                      <button type="button" onClick={() => setSelectedOrderDetailId(order.id)} className="min-w-0 flex-1 text-left">
                        <span className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm text-neutral-950">{order.orderNo}</strong>
                          <span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${['shipped', 'delivered'].includes(order.status) ? 'bg-emerald-50 text-emerald-700' : ['cancelled', 'returned'].includes(order.status) ? 'bg-neutral-100 text-neutral-600' : 'bg-blue-50 text-blue-700'}`}>
                            {({ placed: '待确认', pending: '待处理', confirmed: '已确认', picking: '配货中', shipped: '已发货', delivered: '已送达', return_requested: '退货申请', returned: '已退货', cancelled: '已取消' } as Record<string, string>)[order.status] || order.status}
                          </span>
                        </span>
                        <span className="mt-1.5 block truncate text-xs font-medium text-neutral-700">{order.companyName}</span>
                        <span className="mt-0.5 block text-[10px] text-neutral-500">{order.date} · {[order.shippingAddress?.city, order.shippingAddress?.country].filter(Boolean).join(', ') || '未填写收货地'}</span>
                      </button>
                      <span className="text-right">
                        <strong className="block text-sm tabular-nums text-neutral-950">€{(order.totalAmount + (order.shippingFee || 0)).toFixed(2)}</strong>
                        <span className="mt-1 block text-[10px] text-neutral-500">{order.totalQty} 件</span>
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
                      <span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${order.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' : order.paymentStatus === 'partially_refunded' ? 'bg-amber-50 text-amber-700' : order.paymentStatus === 'refunded' ? 'bg-neutral-100 text-neutral-600' : 'bg-amber-50 text-amber-700'}`}>
                        {order.paymentStatus === 'paid' ? '已付款' : order.paymentStatus === 'partially_refunded' ? '部分退款' : order.paymentStatus === 'pending_credit' ? '账期待结' : order.paymentStatus === 'refunded' ? '已退款' : order.paymentStatus === 'pending_refund' ? '退款处理中' : '未付款'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[10px] text-neutral-500">{order.items.slice(0, 2).map(item => item.productName || item.styleNo).join('、')}{order.items.length > 2 ? ` 等 ${order.items.length} 款` : ''}</span>
                      {order.trackingNumber && <span className="w-full truncate font-mono text-[9px] text-neutral-500">{order.carrier ? `${order.carrier} · ` : ''}{order.trackingNumber}</span>}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => setSelectedOrderDetailId(order.id)} className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50">查看详情</button>
                      {isReturnRequested && returnRequest ? (
                        <button type="button" onClick={() => setSelectedOrderDetailId(order.id)} className="flex-1 rounded-xl bg-neutral-950 px-3 py-2 text-[11px] font-semibold text-white hover:bg-neutral-700">审核售后</button>
                      ) : isPendingFulfill ? (
                        <button type="button" onClick={() => { setSelectedOrderForFulfill(order); setFulfillTracking(''); }} className="flex-1 rounded-xl bg-neutral-950 px-3 py-2 text-[11px] font-semibold text-white hover:bg-neutral-700">处理履约</button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
              {paginatedMerchantOrders.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <ShoppingBag className="mx-auto h-8 w-8 text-neutral-300" />
                  <p className="mt-3 text-sm font-semibold text-neutral-700">{merchantOrders.length ? '没有符合条件的订单' : '还没有订单'}</p>
                  <p className="mt-1 text-xs text-neutral-500">{merchantOrders.length ? '试试调整搜索关键词、状态或日期范围。' : '客户在你的店铺下单后，订单会显示在这里。'}</p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 border-t border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-neutral-500">
                <span>显示 {visibleMerchantOrders.length ? (currentOrderPage - 1) * orderPageSize + 1 : 0}–{Math.min(currentOrderPage * orderPageSize, visibleMerchantOrders.length)} / {visibleMerchantOrders.length} 笔</span>
                <label className="inline-flex items-center gap-1.5">
                  每页
                  <select aria-label="每页订单数量" value={orderPageSize} onChange={event => { setOrderPageSize(Number(event.target.value)); setOrderPage(1); }} className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[10px] text-neutral-700">
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  笔
                </label>
                <span className="hidden text-neutral-400 sm:inline">金额包括商品金额与运费</span>
              </div>
              <nav aria-label="订单分页" className="flex items-center gap-1 self-end sm:self-auto">
                <button type="button" disabled={currentOrderPage <= 1} onClick={() => setOrderPage(page => Math.max(1, page - 1))} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40">上一页</button>
                <span aria-live="polite" className="min-w-16 text-center text-[10px] font-semibold text-neutral-600">{currentOrderPage} / {orderPageCount}</span>
                <button type="button" disabled={currentOrderPage >= orderPageCount} onClick={() => setOrderPage(page => Math.min(orderPageCount, page + 1))} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40">下一页</button>
              </nav>
            </div>
          </div>
          ) : (
            <>
            <MerchantAiOrderDrafts
              customers={merchantCustomers.map(customer => ({ id: customer.id, companyName: customer.companyName, status: customer.status }))}
              onQuoteCreated={() => setMerchantQuotesRefresh(value => value + 1)}
            />
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
              <div className="border-b border-neutral-100 px-4 py-3 text-xs text-neutral-500 sm:px-5">
                草稿以 RUDA 销售报价单保存；客户通过有效链接确认后，系统会转换为正式订单。
              </div>
              {merchantQuotesLoading ? (
                <div role="status" className="px-4 py-12 text-center text-xs text-neutral-500">正在读取草稿订单…</div>
              ) : merchantQuotes.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[740px] text-left text-xs">
                    <thead className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-semibold text-neutral-500">
                      <tr><th className="px-4 py-3">报价 / 创建时间</th><th className="px-4 py-3">客户</th><th className="px-4 py-3">商品</th><th className="px-4 py-3">件数</th><th className="px-4 py-3">金额</th><th className="px-4 py-3">状态 / 有效期</th><th className="px-4 py-3 text-right">操作</th></tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {merchantQuotes.map(quote => {
                        const quoteCustomer = merchantCustomers.find(customer => customer.id === quote.customerId);
                        const expired = quote.validUntil ? new Date(quote.validUntil).getTime() < Date.now() && ['draft', 'sent'].includes(quote.status) : false;
                        const statusLabel = expired ? '已过期' : ({ draft: '草稿', sent: '已发送', accepted: '客户已确认', rejected: '客户已拒绝', expired: '已过期', converted: '已转为订单' } as Record<string, string>)[quote.status] || quote.status;
                        return (
                          <tr key={quote.id} className="hover:bg-neutral-50/70">
                            <td className="px-4 py-3"><strong className="text-neutral-900">{quote.quoteNo}</strong><span className="mt-1 block text-[10px] text-neutral-500">{new Date(quote.createdAt).toLocaleString(getIntlLocale(lang), { dateStyle: 'medium', timeStyle: 'short' })}</span></td>
                            <td className="px-4 py-3"><strong className="text-neutral-800">{quoteCustomer?.companyName || '客户档案不可用'}</strong>{quoteCustomer?.contactPerson && <span className="mt-1 block text-[10px] text-neutral-500">{quoteCustomer.contactPerson}</span>}</td>
                            <td className="max-w-56 px-4 py-3"><span className="block truncate text-neutral-800">{quote.items.slice(0, 2).map(item => item.productName).join('、')}{quote.items.length > 2 ? ` 等 ${quote.items.length} 款` : ''}</span><span className="mt-1 block text-[10px] text-neutral-500">{quote.items.length} 款商品</span></td>
                            <td className="px-4 py-3 font-semibold tabular-nums text-neutral-800">{quote.totalQty}</td>
                            <td className="px-4 py-3 font-semibold tabular-nums text-neutral-900">€{quote.totalAmount.toFixed(2)}</td>
                            <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${quote.status === 'converted' ? 'bg-emerald-50 text-emerald-700' : expired ? 'bg-neutral-100 text-neutral-600' : 'bg-amber-50 text-amber-700'}`}>{statusLabel}</span><span className="mt-1 block text-[10px] text-neutral-500">{quote.validUntil ? `有效至 ${new Date(quote.validUntil).toLocaleDateString(getIntlLocale(lang))}` : '未设置有效期'}</span></td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1.5">
                                {quote.shareUrl && <button type="button" onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(quote.shareUrl);
                                    addNotification('success', '报价链接已复制', `${quote.quoteNo} 的客户确认链接已复制`);
                                  } catch (error) {
                                    addNotification('warning', '报价链接复制失败', error instanceof Error ? error.message : '请检查浏览器剪贴板权限');
                                  }
                                }} className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[10px] font-semibold text-neutral-700 hover:bg-white">复制客户链接</button>}
                                <button type="button" onClick={() => window.open(`/api/merchant/quotes/${encodeURIComponent(quote.id)}/print`, '_blank', 'noopener,noreferrer')} className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[10px] font-semibold text-neutral-700 hover:bg-white">打印报价</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-4 py-14 text-center">
                  <FileSpreadsheet className="mx-auto h-8 w-8 text-neutral-300" />
                  <p className="mt-3 text-sm font-semibold text-neutral-700">还没有草稿订单</p>
                  <p className="mt-1 text-xs text-neutral-500">创建一份销售报价单，发送给已审核客户确认。</p>
                </div>
              )}
            </div>
            </>
          )}

          {draftQuoteOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-neutral-950/50 p-3 backdrop-blur-sm sm:p-6">
              <form onSubmit={async event => {
                event.preventDefault();
                if (draftQuoteBusy) return;
                setDraftQuoteBusy(true);
                try {
                  const quoteItems = draftQuoteItems.map(item => {
                    const product = merchantProducts.find(candidate => candidate.id === item.productId);
                    const sku = product?.skus.find(candidate => candidate.sku === item.sku);
                    if (!product || !sku) throw new Error('请选择有效的商品和 SKU');
                    if (!Number.isInteger(item.quantity) || item.quantity < product.moq || item.quantity % Math.max(1, product.packSize) !== 0) {
                      throw new Error(`${product.styleNo} 数量需不少于 MOQ，且为 ${product.packSize} 件/箱的整数倍`);
                    }
                    return { productId: product.id, sku: sku.sku, quantity: item.quantity, color: sku.color, size: sku.size };
                  });
                  if (!quoteItems.length) throw new Error('请至少添加一项商品');
                  if (!draftQuoteCustomerId) throw new Error('请选择已审核客户');
                  const result = await apiPost<{
                    success: true;
                    quote: {
                      id: string; quoteNo: string; customerId: string; status: string; validUntil: string | null;
                      totalQty: number; totalAmount: number; notes: string | null; createdAt: string;
                      items: Array<{ id: string; productId: string; sku: string; styleNo: string; productName: string; color: string; size: string; quantity: number; unitPrice: number }>;
                    };
                    shareUrl: string;
                  }>('/api/merchant/quotes', { customerId: draftQuoteCustomerId, items: quoteItems, notes: draftQuoteNotes.trim() });
                  const nextQuote = {
                    ...result.quote,
                    totalAmount: Number(result.quote.totalAmount),
                    items: result.quote.items.map(item => ({ ...item, unitPrice: Number(item.unitPrice) })),
                    shareUrl: result.shareUrl
                  };
                  setMerchantQuotes(current => [nextQuote, ...current.filter(quote => quote.id !== nextQuote.id)]);
                  setDraftQuoteOpen(false);
                  setDraftQuoteItems([]);
                  addNotification('success', '草稿报价已创建', `${nextQuote.quoteNo} · 有效期 7 天`);
                  try {
                    await navigator.clipboard.writeText(result.shareUrl);
                    addNotification('success', '客户确认链接已复制', '可发送给客户查看并确认报价');
                  } catch {
                    addNotification('info', '请从草稿列表复制链接', '报价已创建，浏览器未授予剪贴板权限');
                  }
                } catch (error) {
                  addNotification('warning', '草稿订单创建失败', error instanceof Error ? error.message : '请检查客户和商品信息');
                } finally {
                  setDraftQuoteBusy(false);
                }
              }} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
                <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-4">
                  <div><h3 className="text-lg font-bold text-neutral-950">新建草稿订单</h3><p className="mt-1 text-xs leading-5 text-neutral-500">以 RUDA 销售报价单生成客户确认链接；确认后会转成正式订单。</p></div>
                  <button type="button" aria-label="关闭" onClick={() => setDraftQuoteOpen(false)} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"><X className="h-4 w-4" /></button>
                </div>
                <label className="mt-4 block text-xs font-semibold text-neutral-700">已审核客户
                  <select required value={draftQuoteCustomerId} onChange={event => setDraftQuoteCustomerId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-xs font-normal outline-none focus:border-neutral-500">
                    <option value="">选择客户</option>
                    {merchantCustomers.filter(customer => customer.status === 'approved').map(customer => <option key={customer.id} value={customer.id}>{customer.companyName} · {customer.contactPerson}</option>)}
                  </select>
                </label>
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between"><h4 className="text-xs font-bold text-neutral-800">商品清单</h4><button type="button" disabled={!merchantProducts.some(product => product.lifecycleStatus === 'published')} onClick={() => {
                    const product = merchantProducts.find(candidate => candidate.lifecycleStatus === 'published');
                    if (product) setDraftQuoteItems(current => [...current, { productId: product.id, sku: product.skus[0]?.sku || '', quantity: Math.ceil(product.moq / Math.max(1, product.packSize)) * Math.max(1, product.packSize) }]);
                  }} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"><Plus className="h-3 w-3" />添加商品</button></div>
                  <div className="space-y-2">
                    {draftQuoteItems.map((line, index) => {
                      const product = merchantProducts.find(candidate => candidate.id === line.productId);
                      return (
                        <div key={index} className="grid grid-cols-1 gap-2 rounded-xl border border-neutral-200 p-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_100px_32px] sm:items-end">
                          <label className="text-[10px] font-semibold text-neutral-600">商品
                            <select value={line.productId} onChange={event => {
                              const nextProduct = merchantProducts.find(candidate => candidate.id === event.target.value);
                              setDraftQuoteItems(current => current.map((item, itemIndex) => itemIndex === index ? {
                                productId: nextProduct?.id || '',
                                sku: nextProduct?.skus[0]?.sku || '',
                                quantity: nextProduct ? Math.ceil(nextProduct.moq / Math.max(1, nextProduct.packSize)) * Math.max(1, nextProduct.packSize) : 1
                              } : item));
                            }} className="mt-1 block w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs font-normal">
                              <option value="">选择商品</option>
                              {merchantProducts.filter(item => item.lifecycleStatus === 'published').map(item => <option key={item.id} value={item.id}>{item.styleNo} · {item.name}</option>)}
                            </select>
                          </label>
                          <label className="text-[10px] font-semibold text-neutral-600">SKU / 颜色 / 尺码
                            <select value={line.sku} onChange={event => setDraftQuoteItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, sku: event.target.value } : item))} className="mt-1 block w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs font-normal">
                              <option value="">选择 SKU</option>
                              {product?.skus.map(sku => <option key={sku.sku} value={sku.sku}>{sku.sku} · {sku.color} / {sku.size}</option>)}
                            </select>
                          </label>
                          <label className="text-[10px] font-semibold text-neutral-600">数量（件）
                            <input type="number" min={product?.moq || 1} step={product?.packSize || 1} value={line.quantity} onChange={event => setDraftQuoteItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Number(event.target.value) } : item))} className="mt-1 block w-full rounded-lg border border-neutral-200 px-2.5 py-2 text-xs font-normal" />
                          </label>
                          <button type="button" aria-label="移除商品" disabled={draftQuoteItems.length === 1} onClick={() => setDraftQuoteItems(current => current.filter((_, itemIndex) => itemIndex !== index))} className="flex h-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30"><X className="h-4 w-4" /></button>
                        </div>
                      );
                    })}
                    {!draftQuoteItems.length && <p className="rounded-xl border border-dashed border-neutral-300 px-3 py-6 text-center text-xs text-neutral-500">请添加至少一款已上架商品。</p>}
                  </div>
                </div>
                <label className="mt-4 block text-xs font-semibold text-neutral-700">给客户的报价备注（选填）
                  <textarea value={draftQuoteNotes} maxLength={2000} onChange={event => setDraftQuoteNotes(event.target.value)} rows={3} className="mt-1.5 block w-full resize-y rounded-lg border border-neutral-200 px-3 py-2.5 text-xs font-normal outline-none focus:border-neutral-500" placeholder="交付、包装或报价相关说明" />
                </label>
                {!merchantCustomers.some(customer => customer.status === 'approved') && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">当前没有已审核客户，请先完成客户资质审核后再创建草稿报价。</p>}
                <div className="mt-5 flex justify-end gap-2 border-t border-neutral-100 pt-4">
                  <button type="button" onClick={() => setDraftQuoteOpen(false)} className="rounded-lg border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">取消</button>
                  <button type="submit" disabled={draftQuoteBusy || !draftQuoteCustomerId || !draftQuoteItems.length || !merchantCustomers.some(customer => customer.status === 'approved')} className="rounded-lg bg-neutral-950 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-700 disabled:opacity-40">{draftQuoteBusy ? '创建中…' : '创建并复制确认链接'}</button>
                </div>
              </form>
            </div>
          )}
        </section>
      )}

      {selectedOrderDetail && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-neutral-950/35 backdrop-blur-[2px]" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) setSelectedOrderDetailId(null);
        }}>
          <aside role="dialog" aria-modal="true" aria-labelledby="merchant-order-detail-title" className="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-neutral-50 shadow-2xl">
            <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button type="button" aria-label="关闭订单详情" onClick={() => setSelectedOrderDetailId(null)} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"><X className="h-4 w-4" /></button>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">订单详情</p>
                  <h2 id="merchant-order-detail-title" className="truncate text-base font-bold text-neutral-950">{selectedOrderDetail.orderNo}</h2>
                </div>
                <span className="hidden rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-700 sm:inline-flex">{selectedOrderDetail.date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {(() => {
                  const currentIndex = merchantOrders.findIndex(order => order.id === selectedOrderDetail.id);
                  const previousOrder = currentIndex > 0 ? merchantOrders[currentIndex - 1] : undefined;
                  const nextOrder = currentIndex >= 0 && currentIndex < merchantOrders.length - 1 ? merchantOrders[currentIndex + 1] : undefined;
                  return (
                    <>
                      <button type="button" disabled={!previousOrder} onClick={() => previousOrder && setSelectedOrderDetailId(previousOrder.id)} aria-label="上一笔订单" className="rounded-lg border border-neutral-200 px-2.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-40">←</button>
                      <button type="button" disabled={!nextOrder} onClick={() => nextOrder && setSelectedOrderDetailId(nextOrder.id)} aria-label="下一笔订单" className="rounded-lg border border-neutral-200 px-2.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-40">→</button>
                    </>
                  );
                })()}
                <button type="button" onClick={() => window.open(`/api/merchant/orders/${encodeURIComponent(selectedOrderDetail.id)}/print?document=invoice`, '_blank', 'noopener,noreferrer')} className="hidden rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 sm:inline-flex">打印订单</button>
                <button type="button" onClick={() => setSelectedOrderDetailId(null)} aria-label="关闭订单详情" className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"><X className="h-4 w-4" /></button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
              <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                  <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-neutral-500">订单状态</p>
                        <p className="mt-1 text-base font-bold text-neutral-900">{({ placed: '待确认', pending: '待处理', confirmed: '已确认', picking: '配货中', shipped: '已发货', delivered: '已送达', return_requested: '退货申请中', returned: '已退货', cancelled: '已取消' } as Record<string, string>)[selectedOrderDetail.status] || selectedOrderDetail.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-neutral-500">付款状态</p>
                        <p className="mt-1 text-sm font-semibold text-neutral-800">{({ paid: '已付款', partially_refunded: '部分退款', unpaid: '未付款', pending_credit: '账期待结', pending_refund: '退款处理中', refunded: '已退款' } as Record<string, string>)[selectedOrderDetail.paymentStatus] || selectedOrderDetail.paymentStatus}</p>
                      </div>
                    </div>
                    {(selectedOrderDetail.status === 'placed' || selectedOrderDetail.status === 'pending' || selectedOrderDetail.status === 'confirmed' || selectedOrderDetail.status === 'picking') && (
                      <button type="button" onClick={() => { setSelectedOrderForFulfill(selectedOrderDetail); setFulfillTracking(''); setSelectedOrderDetailId(null); }} className="mt-4 rounded-lg bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-neutral-700">继续处理履约</button>
                    )}
                  </section>

                  <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
                    <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 sm:px-5">
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900">商品明细</h3>
                        <p className="mt-0.5 text-[10px] text-neutral-500">{selectedOrderDetail.items.length} 款 · 共 {selectedOrderDetail.totalQty} 件</p>
                      </div>
                      {['placed', 'pending', 'confirmed'].includes(selectedOrderDetail.status) && <button type="button" onClick={() => { setSelectedOrderForFulfill(selectedOrderDetail); setFulfillTracking(''); setSelectedOrderDetailId(null); }} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-50">履约</button>}
                    </div>
                    <div className="divide-y divide-neutral-100">
                      {selectedOrderDetail.items.map(item => (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                          <img src={merchantMediaUrl(item.image, DEFAULT_MERCHANT_BANNER)} alt="" className="h-14 w-11 shrink-0 rounded-md bg-neutral-100 object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-neutral-900">{item.productName}</p>
                            <p className="mt-1 truncate text-[10px] text-neutral-500">{item.styleNo} · {item.sku} · {item.color} / {item.size}</p>
                          </div>
                          <div className="text-right text-[10px] text-neutral-500">
                            <p>{item.quantity} 件 × €{item.unitPrice.toFixed(2)}</p>
                            <p className="mt-1 font-semibold text-neutral-800">€{(item.quantity * item.unitPrice).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 border-t border-neutral-100 px-4 py-4 text-xs sm:px-5">
                      <div className="flex justify-between text-neutral-600"><span>商品小计</span><span>€{selectedOrderDetail.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2)}</span></div>
                      <div className="flex justify-between text-neutral-600"><span>运费</span><span>€{(selectedOrderDetail.shippingFee || 0).toFixed(2)}</span></div>
                      <div className="flex justify-between border-t border-neutral-100 pt-2 text-sm font-bold text-neutral-950"><span>订单总额</span><span>€{(selectedOrderDetail.totalAmount + (selectedOrderDetail.shippingFee || 0)).toFixed(2)}</span></div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5">
                    <h3 className="text-sm font-bold text-neutral-900">订单时间线</h3>
                    {selectedOrderDetail.timeline.length ? (
                      <ol className="mt-4 space-y-4">
                        {[...selectedOrderDetail.timeline].reverse().map((event, index) => (
                          <li key={`${event.time}-${event.title}-${index}`} className="relative flex gap-3">
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${index === 0 ? 'bg-neutral-900' : 'bg-neutral-300'}`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <p className="text-xs font-semibold text-neutral-800">{event.title || event.status}</p>
                                <time className="text-[10px] text-neutral-400">{event.time}</time>
                              </div>
                              {event.note && <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-neutral-500">{event.note}</p>}
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : <p className="mt-3 text-xs text-neutral-500">暂无可显示的操作记录。</p>}
                  </section>
                </div>

                <aside className="space-y-4">
                  <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
                    <h3 className="text-sm font-bold text-neutral-900">客户信息</h3>
                    <p className="mt-3 text-xs font-semibold text-neutral-800">{selectedOrderDetail.companyName}</p>
                    {selectedOrderDetailCustomer && (
                      <div className="mt-2 space-y-1 text-[11px] text-neutral-600">
                        {selectedOrderDetailCustomer.contactPerson && <p>联系人：{selectedOrderDetailCustomer.contactPerson}</p>}
                        {selectedOrderDetailCustomer.email && <p className="break-all">邮箱：{selectedOrderDetailCustomer.email}</p>}
                        {selectedOrderDetailCustomer.phone && <p>电话：{selectedOrderDetailCustomer.phone}</p>}
                      </div>
                    )}
                    <div className="mt-3 border-t border-neutral-100 pt-3 text-[11px] leading-5 text-neutral-600">
                      <p className="font-semibold text-neutral-800">收货地址</p>
                      <p>{selectedOrderDetail.shippingAddress?.street}</p>
                      <p>{[selectedOrderDetail.shippingAddress?.city, selectedOrderDetail.shippingAddress?.country, selectedOrderDetail.shippingAddress?.zip].filter(Boolean).join(', ')}</p>
                      {['placed', 'pending', 'confirmed'].includes(selectedOrderDetail.status) && (
                        <button type="button" onClick={() => prepareOrderEdit(selectedOrderDetail)} className="mt-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[10px] font-semibold text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50">预填并编辑订单资料</button>
                      )}
                      {orderEditOpen && orderEditTargetId === selectedOrderDetail.id && (
                        <form onSubmit={event => void saveOrderEdit(event, selectedOrderDetail)} className="mt-3 space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                          <p className="text-[9px] leading-4 text-neutral-600">已将当前订单资料预填到表单。请核对变更后再点击保存；发货后订单不可编辑。</p>
                          {([
                            ['street', '街道地址'],
                            ['city', '城市'],
                            ['country', '国家'],
                            ['zip', '邮编']
                          ] as const).map(([field, label]) => (
                            <label key={field} className="block text-[9px] font-semibold text-neutral-600">{label}
                              <input value={orderEditForm[field]} onChange={event => setOrderEditForm(form => ({ ...form, [field]: event.target.value }))} maxLength={field === 'street' ? 240 : field === 'zip' ? 30 : 100} className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-[10px] font-normal text-neutral-800 outline-none focus:border-neutral-500" />
                            </label>
                          ))}
                          <label className="block text-[9px] font-semibold text-neutral-600">订单备注
                            <textarea value={orderEditForm.notes} onChange={event => setOrderEditForm(form => ({ ...form, notes: event.target.value }))} maxLength={2000} rows={2} className="mt-1 w-full resize-y rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-[10px] font-normal text-neutral-800 outline-none focus:border-neutral-500" />
                          </label>
                          <div className="flex gap-2 pt-1">
                            <button type="button" disabled={orderEditBusy} onClick={() => { setOrderEditOpen(false); setOrderEditTargetId(null); }} className="flex-1 rounded-lg border border-neutral-200 bg-white px-2 py-2 text-[10px] font-semibold text-neutral-600 disabled:opacity-50">取消</button>
                            <button type="submit" disabled={orderEditBusy} className="flex-1 rounded-lg bg-neutral-950 px-2 py-2 text-[10px] font-semibold text-white hover:bg-neutral-700 disabled:opacity-50">{orderEditBusy ? '正在保存…' : '确认并保存资料'}</button>
                          </div>
                        </form>
                      )}
                    </div>
                  </section>
                  <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
                    <h3 className="text-sm font-bold text-neutral-900">付款与配送</h3>
                    <dl className="mt-3 space-y-2 text-[11px]">
                      <div className="flex justify-between gap-3"><dt className="text-neutral-500">付款方式</dt><dd className="text-right font-medium text-neutral-800">{selectedOrderDetail.paymentMethod.replaceAll('_', ' ')}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-neutral-500">配送方式</dt><dd className="text-right font-medium text-neutral-800">{selectedOrderDetail.deliveryType === 'showroom_pickup' ? '展厅自提' : '配送'}</dd></div>
                      {selectedOrderDetail.pickupLocation && <div className="flex justify-between gap-3"><dt className="text-neutral-500">自提地点</dt><dd className="text-right font-medium text-neutral-800">{selectedOrderDetail.pickupLocation}</dd></div>}
                      {selectedOrderDetail.carrier && <div className="flex justify-between gap-3"><dt className="text-neutral-500">承运商</dt><dd className="text-right font-medium text-neutral-800">{selectedOrderDetail.carrier}</dd></div>}
                      {selectedOrderDetail.trackingNumber && <div className="flex justify-between gap-3"><dt className="text-neutral-500">物流单号</dt><dd className="break-all text-right font-mono font-medium text-neutral-800">{selectedOrderDetail.trackingNumber}</dd></div>}
                    </dl>
                  </section>
                  {selectedOrderDetail.notes && (
                    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
                      <h3 className="text-sm font-bold text-neutral-900">订单备注</h3>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-neutral-600">{selectedOrderDetail.notes}</p>
                    </section>
                  )}
                  {merchantReturnsByOrderId.get(selectedOrderDetail.id)?.status === 'requested' && (
                    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <h3 className="text-sm font-bold text-amber-950">待审核的售后申请</h3>
                      <p className="mt-2 text-xs leading-5 text-amber-900">{merchantReturnsByOrderId.get(selectedOrderDetail.id)?.reason}</p>
                      <p className="mt-1 text-[10px] text-amber-800">申请退货 {merchantReturnsByOrderId.get(selectedOrderDetail.id)?.requestedQty} 件{merchantReturnsByOrderId.get(selectedOrderDetail.id)?.refundAmount ? ` · 申请退款 €${merchantReturnsByOrderId.get(selectedOrderDetail.id)?.refundAmount?.toFixed(2)}` : ''}</p>
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => {
                          const request = merchantReturnsByOrderId.get(selectedOrderDetail.id);
                          if (request) void handleReturnReview(request, 'approved');
                        }} className="flex-1 rounded-lg bg-neutral-950 px-3 py-2 text-[11px] font-semibold text-white hover:bg-neutral-700">批准申请</button>
                        <button type="button" onClick={() => {
                          const request = merchantReturnsByOrderId.get(selectedOrderDetail.id);
                          if (request) void handleReturnReview(request, 'rejected');
                        }} className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-100">拒绝申请</button>
                      </div>
                    </section>
                  )}
                  {merchantReturnsByOrderId.get(selectedOrderDetail.id)?.status === 'approved' && (
                    <section className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                      <h3 className="text-sm font-bold text-sky-950">退货已批准，等待实物验收</h3>
                      <p className="mt-2 text-xs leading-5 text-sky-900">{merchantReturnsByOrderId.get(selectedOrderDetail.id)?.reason}</p>
                      <p className="mt-1 text-[10px] text-sky-800">请先确认收到退货商品，再登记收货并提交退款；仅批准申请不会增加库存或发起退款。</p>
                      <button type="button" onClick={() => {
                        const request = merchantReturnsByOrderId.get(selectedOrderDetail.id);
                        if (request) void handleReturnReceive(request);
                      }} className="mt-3 w-full rounded-lg bg-neutral-950 px-3 py-2 text-[11px] font-semibold text-white hover:bg-neutral-700">登记已收货并提交退款</button>
                    </section>
                  )}
                  {merchantReturnsByOrderId.get(selectedOrderDetail.id)?.status === 'received' && (
                    <section className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                      <h3 className="text-sm font-bold text-violet-950">已收货 · 退款处理中</h3>
                      <p className="mt-2 text-xs leading-5 text-violet-900">{merchantReturnsByOrderId.get(selectedOrderDetail.id)?.reason}</p>
                      <p className="mt-1 text-[10px] text-violet-800">退款结果由已配置支付渠道的回执确认；请勿重复创建退款。</p>
                    </section>
                  )}
                </aside>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 6: 独家爆款看货审批台 (VAULT REQUESTS APPROVAL) */}
      {/* ======================================================== */}
      {activeTab === 'vault_requests' && (
        <div className="space-y-4">
          <MerchantWorkspaceHeader title="授权申请" description="审核买手的私密货盘访问申请；通过后对方才能查看授权商品并发起采购。" icon={<Lock className="h-3.5 w-3.5" />} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {merchantVaultRequests.length === 0 ? (
              <div className="md:col-span-2 p-8 text-center bg-white rounded-xl border border-neutral-200 text-neutral-500 text-xs">
                暂无买手看货申请记录
              </div>
            ) : (
              merchantVaultRequests.map((req) => (
                <div key={req.id} className="merchant-home-card rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-neutral-900">{req.companyName}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          req.status === 'approved' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : req.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {req.status === 'approved' ? '已授权解锁' : req.status === 'rejected' ? '已拒绝' : '待您审核'}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        申请人: {req.contactPerson} · 类型: {req.businessType}
                      </div>
                    </div>
                    <span className="text-[11px] text-neutral-400">{req.appliedAt}</span>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-lg text-xs text-neutral-700 border border-neutral-100">
                    <span className="font-semibold text-neutral-900">买手附言：</span>
                    {req.note || '申请查阅最新首发独家爆款专区'}
                  </div>

                  {req.status === 'pending' ? (
                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                      <button
                        id={`approve-vault-${req.id}`}
                        onClick={async () => {
                          try {
                            await apiPut(`/api/merchant/vault-requests/${encodeURIComponent(req.id)}/review`, { status: 'approved' });
                            await refreshMerchantOperations();
                            addNotification('success', '已授权看货', `已向 ${req.companyName} 开放本店私密首发货盘`);
                          } catch (error) {
                            addNotification('warning', '授权操作失败', error instanceof Error ? error.message : '请稍后重试');
                          }
                        }}
                        className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> 批准看货 (Grant Access)
                      </button>
                      <button
                        id={`reject-vault-${req.id}`}
                        onClick={async () => {
                          try {
                            await apiPut(`/api/merchant/vault-requests/${encodeURIComponent(req.id)}/review`, { status: 'rejected' });
                            await refreshMerchantOperations();
                            addNotification('info', '已拒绝看货申请', `已拒绝 ${req.companyName} 的看货申请`);
                          } catch (error) {
                            addNotification('warning', '审核操作失败', error instanceof Error ? error.message : '请稍后重试');
                          }
                        }}
                        className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 text-neutral-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" /> 拒绝
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-500 pt-2 border-t border-neutral-100 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      已完成审核并记录于系统审计流水
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 7: 我的买手客户 (MY CUSTOMERS) */}
      {/* ======================================================== */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div><h1 className="text-xl font-semibold tracking-tight text-neutral-950">客户工作台</h1><p className="mt-1 text-xs text-neutral-500">管理与本店建立订单或授权关系的批发客户，按真实本店订单查看客户表现。</p></div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={exportMerchantCustomers} disabled={!visibleMerchantCustomers.length} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 disabled:opacity-40"><FileSpreadsheet className="h-3.5 w-3.5" />导出 CSV{selectedCustomerIds.length ? ` (${selectedCustomerIds.length})` : ` (${visibleMerchantCustomers.length})`}</button>
                <button type="button" onClick={() => openCustomerEditor()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-950 px-3.5 py-2 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" />新增客户</button>
              </div>
            </div>

            <section className="merchant-home-intro relative overflow-hidden rounded-3xl border border-neutral-200 bg-[radial-gradient(ellipse_at_85%_0%,rgba(209,250,229,0.7),transparent_38%),linear-gradient(145deg,#fff_18%,#f8fafc_72%,#eef2ff_100%)] p-4 shadow-sm sm:p-6">
              <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-emerald-100/70 blur-3xl" />
              <div className="relative grid grid-cols-2 gap-2 xl:grid-cols-4">
                {[
                  { label: '客户档案', value: merchantCustomers.length, detail: `${merchantCustomers.filter(customer => customer.status === 'approved').length} 位已审核`, tone: 'merchant-home-tone-blue', Icon: UserRound },
                  { label: '本店订单金额', value: `€${customerTotalSpend.toFixed(0)}`, detail: `${merchantOrders.length} 笔订单`, tone: 'merchant-home-tone-green', Icon: DollarSign },
                  { label: '回头客户', value: customerRepeatCount, detail: merchantCustomers.length ? `${Math.round(customerRepeatCount / merchantCustomers.length * 100)}% 至少 2 单` : '暂无客户数据', tone: 'merchant-home-tone-violet', Icon: TrendingUp },
                  { label: '需关注客户', value: customerAtRiskCount, detail: '曾下单 ≥ 2 次，60 天未回购', tone: 'merchant-home-tone-amber', Icon: Clock }
                ].map(metric => <article key={metric.label} className={`merchant-home-card ${metric.tone} rounded-2xl border border-neutral-200/80 bg-white/75 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-4`}>
                  <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] text-neutral-500">{metric.label}</p><p className="mt-1 text-xl font-semibold tabular-nums text-neutral-950">{metric.value}</p><p className="mt-1 text-[9px] text-neutral-500">{metric.detail}</p></div><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 text-neutral-700 shadow-sm"><metric.Icon className="h-4 w-4" /></span></div>
                </article>)}
              </div>
              <p className="relative mt-3 text-[9px] leading-4 text-neutral-500">金额只统计本店订单，不代表客户终身价值；邮件/短信订阅和自动营销暂不可用。</p>
            </section>

            <section className="merchant-home-card rounded-3xl border border-neutral-200 bg-[radial-gradient(ellipse_at_90%_0%,rgba(224,231,255,0.65),transparent_40%),linear-gradient(145deg,#fff,#f8fafc)] p-4 shadow-sm sm:p-5" aria-label="GPTmoda 客户助手">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"><Sparkles className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-neutral-900">GPTmoda · 客户助手</h2>
                  <p className="mt-1 text-[11px] leading-5 text-neutral-600">可问「过去 90 天买过两次以上的意大利客户」「哪些老客户 60 天没回来」或「给当前筛选客户写一封回访邮件」。结果基于本店订单和客户资料；邮件由你自行发送。</p>
                  <form className="mt-3 flex max-w-3xl items-center gap-2 rounded-xl border border-neutral-200 bg-white p-1.5 pl-3 shadow-sm focus-within:border-neutral-400" onSubmit={event => { event.preventDefault(); runCustomerAiQuery(customerAiQuestion); }}>
                    <Search className="h-4 w-4 shrink-0 text-neutral-400" />
                    <input value={customerAiQuestion} onChange={event => setCustomerAiQuestion(event.target.value)} maxLength={500} placeholder="询问客户、复购、流失风险、地区或营销文案草稿…" className="h-9 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-neutral-400" />
                    <button type="submit" disabled={customerAiBusy || !customerAiQuestion.trim()} className="rounded-lg bg-neutral-950 px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-40">{customerAiBusy ? '处理中…' : '分析'}</button>
                  </form>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['消费金额最高的客户', '近 30 天新增客户', '复购客户比例和地区分布', '找出 60 天未回购的老客户', '过去 90 天买过两次以上的意大利客户'].map(question => <button key={question} type="button" disabled={customerAiBusy} onClick={() => runCustomerAiQuery(question)} className="rounded-full border border-white bg-white/80 px-2.5 py-1.5 text-[10px] font-medium text-neutral-600 hover:border-neutral-300 disabled:opacity-50">{question}</button>)}
                    <button type="button" disabled={customerAiBusy} onClick={() => openCustomerEditor()} className="rounded-full bg-neutral-950 px-2.5 py-1.5 text-[10px] font-semibold text-white">预填/新增客户</button>
                  </div>
                  {customerAiAnswer && <div className="mt-3 rounded-xl border border-white bg-white/90 p-3 shadow-sm"><p className="whitespace-pre-wrap text-xs leading-5 text-neutral-700">{customerAiAnswer}</p>{/草稿/.test(customerAiAnswer) && <p className="mt-2 text-[9px] text-neutral-400">草稿仅供审核，尚未发送。</p>}</div>}
                </div>
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5" aria-label="客户搜索和细分条件">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(140px,1fr))]">
                <label className="relative block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" /><input value={customerSearch} onChange={event => setCustomerSearch(event.target.value)} placeholder="搜索企业、联系人、邮箱、电话、VAT 或标签" className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-neutral-500 focus:bg-white" /></label>
                <select aria-label="按客户状态筛选" value={customerStatusFilter} onChange={event => setCustomerStatusFilter(event.target.value)} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs"><option value="all">全部客户状态</option><option value="approved">已审核</option><option value="pending">待审核</option><option value="rejected">未通过</option></select>
                <select aria-label="按国家筛选客户" value={customerCountryFilter} onChange={event => setCustomerCountryFilter(event.target.value)} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs"><option value="all">所有国家 / 地区</option><option value="__italy__">意大利（Italy / Italia）</option>{customerCountryOptions.filter(country => !/^(italy|italia)$/i.test(country)).map(country => <option key={country} value={country}>{country}</option>)}</select>
                <select aria-label="客户细分条件" value={customerSegment} onChange={event => setCustomerSegment(event.target.value as typeof customerSegment)} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs"><option value="all">全部客户</option><option value="repeat">回头客户（≥ 2 单）</option><option value="new">近 30 天新增</option><option value="at-risk">流失风险（60 天未回购）</option><option value="no-orders">尚无本店订单</option></select>
                <label className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-600"><span className="shrink-0">近 90 天至少订单</span><input type="number" min="1" max="100" value={customerMinOrders} onChange={event => setCustomerMinOrders(event.target.value)} className="w-full min-w-0 bg-transparent outline-none" placeholder="任意" /></label>
                <label className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-600"><span className="shrink-0">最近下单 ≤ 天</span><input type="number" min="1" max="3650" value={customerLookbackDays} onChange={event => setCustomerLookbackDays(event.target.value)} className="w-full min-w-0 bg-transparent outline-none" placeholder="任意" /></label>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
                <select aria-label="已保存客户筛选" defaultValue="" onChange={event => applyCustomerSegment(event.target.value)} className="max-w-56 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px]"><option value="">已保存的客户筛选{customerSavedSegments.length ? ` (${customerSavedSegments.length})` : ''}</option>{customerSavedSegments.map(segment => <option key={segment.id} value={segment.id}>{segment.name}</option>)}</select>
                <button type="button" onClick={saveCustomerSegment} className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50">保存当前筛选</button>
                <button type="button" onClick={() => { setCustomerSearch(''); setCustomerStatusFilter('all'); setCustomerCountryFilter('all'); setCustomerSegment('all'); setCustomerMinOrders(''); setCustomerLookbackDays(''); }} className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-neutral-500 hover:bg-neutral-50">清除条件</button>
                <span className="ml-auto text-[11px] text-neutral-500">符合 {visibleMerchantCustomers.length} / {merchantCustomers.length} 位</span>
              </div>
              <p className="text-[9px] leading-4 text-neutral-400">已保存筛选仅保存在此设备；可按当前客户资料重新筛选，不能自动更新或直接用于发送活动。</p>
            </section>

            <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3">
                <div><h3 className="text-sm font-semibold text-neutral-900">本店客户</h3><p className="mt-0.5 text-[10px] text-neutral-500">按本店已加载订单金额排序 · 客户标签与备注为商家私有</p></div>
                {selectedCustomerIds.length > 0 && <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-medium text-neutral-600">已选 {selectedCustomerIds.length} 位</span>
                  <input value={customerBatchTag} onChange={event => setCustomerBatchTag(event.target.value)} maxLength={40} placeholder="标签名称" className="w-28 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[10px] outline-none focus:border-neutral-400" />
                  <button type="button" disabled={customerBatchBusy || !customerBatchTag.trim()} onClick={() => void updateSelectedCustomerTag('add')} className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[10px] font-semibold text-neutral-700 disabled:opacity-40">{customerBatchBusy ? '处理中…' : '批量加标签'}</button>
                  <button type="button" disabled={customerBatchBusy || !customerBatchTag.trim()} onClick={() => void updateSelectedCustomerTag('remove')} className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[10px] font-semibold text-neutral-700 disabled:opacity-40">批量移除标签</button>
                </div>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600"><tr>
                    <th className="px-4 py-3"><input aria-label="全选当前筛选客户" type="checkbox" checked={visibleMerchantCustomers.length > 0 && visibleMerchantCustomers.every(customer => selectedCustomerIds.includes(customer.id))} onChange={event => setSelectedCustomerIds(previous => event.target.checked ? [...new Set([...previous, ...visibleMerchantCustomers.map(customer => customer.id)])] : previous.filter(id => !visibleMerchantCustomers.some(customer => customer.id === id)))} /></th>
                    <th className="px-4 py-3">企业 / 联系人</th><th className="px-4 py-3">所在地</th><th className="px-4 py-3">状态 / 标签</th><th className="px-4 py-3 text-right">本店订单</th><th className="px-4 py-3 text-right">订单金额</th><th className="px-4 py-3">最近下单</th><th className="px-4 py-3 text-right">操作</th>
                  </tr></thead>
                  <tbody className="divide-y divide-neutral-100">
                    {visibleMerchantCustomers.map(customer => {
                      const stats = getCustomerOrderStats(customer.id);
                      return <tr key={customer.id} className="transition hover:bg-neutral-50/70">
                        <td className="px-4 py-3"><input aria-label={`选择 ${customer.companyName}`} type="checkbox" checked={selectedCustomerIds.includes(customer.id)} onChange={event => setSelectedCustomerIds(previous => event.target.checked ? [...new Set([...previous, customer.id])] : previous.filter(id => id !== customer.id))} /></td>
                        <td className="px-4 py-3"><button type="button" onClick={() => setCustomerDetail(customer)} className="text-left"><strong className="block text-neutral-900 hover:underline">{customer.companyName}</strong><span className="mt-1 block text-[10px] text-neutral-500">{customer.contactPerson} · {customer.email}</span></button></td>
                        <td className="px-4 py-3 text-neutral-600">{customer.city}{customer.city && customer.country ? ', ' : ''}{customer.country}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${customer.status === 'approved' ? 'bg-emerald-50 text-emerald-800' : customer.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{customer.status === 'approved' ? '已审核' : customer.status === 'rejected' ? '未通过' : '待审核'}</span><div className="mt-1 flex max-w-52 flex-wrap gap-1">{(customer.merchantTags || []).map(tag => <span key={tag} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] text-neutral-600">{tag}</span>)}</div></td>
                        <td className="px-4 py-3 text-right tabular-nums text-neutral-700">{stats.orders.length}</td><td className="px-4 py-3 text-right font-semibold tabular-nums text-neutral-900">€{stats.spend.toFixed(2)}</td>
                        <td className="px-4 py-3 text-neutral-500">{stats.latestOrderAt ? new Date(stats.latestOrderAt).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3 text-right"><div className="inline-flex gap-1"><button type="button" onClick={() => setCustomerDetail(customer)} className="rounded-lg border border-neutral-200 px-2 py-1.5 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-50">查看</button><button type="button" onClick={() => openCustomerEditor(customer)} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-50"><Pencil className="h-3 w-3" />编辑</button></div></td>
                      </tr>;
                    })}
                    {!visibleMerchantCustomers.length && <tr><td colSpan={8} className="px-4 py-12 text-center text-xs text-neutral-500">{merchantCustomers.length ? '没有符合当前条件的客户。' : '目前没有与本店建立订单或授权关系的客户。新增客户档案可从上方开始。'}</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
            {customerRegionRank.length > 0 && <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"><h3 className="text-xs font-semibold text-neutral-800">客户地区分布</h3><div className="mt-3 flex flex-wrap gap-2">{customerRegionRank.map(([region, count]) => <span key={region} className="rounded-full bg-neutral-50 px-3 py-1.5 text-[10px] text-neutral-600">{region}<strong className="ml-2 text-neutral-900">{count}</strong></span>)}</div><p className="mt-2 text-[9px] text-neutral-400">按本店客户档案中的国家字段统计，不代表邮件订阅或营销授权范围。</p></section>}
            {customerEditorOpen && (
              <CustomerEditorModal title={customerEditor ? '编辑客户资料' : '新增合作客户'} form={customerForm} busy={customerEditorBusy} onChange={setCustomerForm} onSubmit={saveCustomerEditor} onClose={() => { setCustomerEditor(null); setCustomerEditorOpen(false); }} />
            )}
            {customerDetail && (() => {
              const stats = getCustomerOrderStats(customerDetail.id);
              const recentOrders = [...stats.orders].sort((left, right) => new Date(right.createdAt || `${right.date}T00:00:00`).getTime() - new Date(left.createdAt || `${left.date}T00:00:00`).getTime()).slice(0, 8);
              return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-neutral-950/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setCustomerDetail(null); }}>
                <section role="dialog" aria-modal="true" aria-label={`${customerDetail.companyName}客户详情`} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
                  <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-4"><div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-800">本店客户档案</span><h2 className="mt-2 text-lg font-semibold text-neutral-950">{customerDetail.companyName}</h2><p className="mt-1 text-xs text-neutral-500">{customerDetail.contactPerson} · {customerDetail.email} · {customerDetail.phone}</p></div><button type="button" aria-label="关闭客户详情" onClick={() => setCustomerDetail(null)} className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100"><X className="h-4 w-4" /></button></div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[{ label: '本店订单', value: stats.orders.length }, { label: '本店订单金额', value: `€${stats.spend.toFixed(2)}` }, { label: '客户状态', value: customerDetail.status }, { label: '客户时长', value: customerDetail.registrationDate || '未知' }].map(metric => <div key={metric.label} className="rounded-xl bg-neutral-50 p-3"><span className="text-[9px] text-neutral-500">{metric.label}</span><strong className="mt-1 block truncate text-xs text-neutral-900">{metric.value}</strong></div>)}</div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-neutral-100 p-3"><h3 className="text-xs font-semibold text-neutral-800">联系方式与地址</h3><p className="mt-2 text-[10px] leading-5 text-neutral-600">{customerDetail.address}<br />{customerDetail.city}, {customerDetail.country}<br />VAT / P.IVA: {customerDetail.vatNumber || '—'}<br />经营类型：{customerDetail.businessType}</p></div><div className="rounded-xl border border-neutral-100 p-3"><h3 className="text-xs font-semibold text-neutral-800">商家私有备注与标签</h3><p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-neutral-600">{customerDetail.merchantNotes || '暂无备注'}</p><div className="mt-2 flex flex-wrap gap-1">{(customerDetail.merchantTags || []).map(tag => <span key={tag} className="rounded-full bg-neutral-100 px-2 py-1 text-[9px] text-neutral-600">{tag}</span>)}</div><button type="button" onClick={() => openCustomerEditor(customerDetail)} className="mt-3 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[10px] font-semibold text-neutral-700">编辑资料与标签</button></div></div>
                  <div className="mt-4 rounded-xl border border-neutral-100 p-3"><div className="flex items-center justify-between"><h3 className="text-xs font-semibold text-neutral-800">最近本店订单</h3><span className="text-[9px] text-neutral-400">最近 {recentOrders.length} / {stats.orders.length} 笔</span></div>{recentOrders.length ? <div className="mt-2 divide-y divide-neutral-100">{recentOrders.map(order => <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[10px]"><span className="font-semibold text-neutral-800">{order.orderNo} · {new Date(order.createdAt || `${order.date}T00:00:00`).toLocaleDateString()}</span><span className="text-neutral-500">{order.status} · €{order.totalAmount.toFixed(2)}</span></div>)}</div> : <p className="mt-2 text-[10px] text-neutral-500">本店订单列表中没有该客户的订单记录。</p>}</div>
                  <p className="mt-3 text-[9px] leading-4 text-neutral-400">目前仅显示本店客户关系和订单；暂不提供完整客户动态记录。</p>
                  <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => { setCustomerDetail(null); openDraftQuoteForm(customerDetail.companyName); setActiveTab('orders'); setOrderView('drafts'); }} disabled={customerDetail.status !== 'approved'} className="rounded-lg border border-neutral-200 px-3 py-2 text-[10px] font-semibold text-neutral-700 disabled:opacity-40">准备草稿报价</button><button type="button" onClick={() => { setCustomerDetail(null); openCustomerEditor(customerDetail); }} className="rounded-lg bg-neutral-950 px-3 py-2 text-[10px] font-semibold text-white">编辑客户</button></div>
                </section>
              </div>;
            })()}
          </div>
        )}

        {activeTab === 'content' && currentMerchant && currentMerchantId && (
          <Suspense fallback={<div className="rounded-2xl border border-neutral-200 bg-white p-6 text-xs text-neutral-500">正在加载内容工作台…</div>}>
            <MerchantContentWorkspace
              merchantId={currentMerchantId}
              merchantName={currentMerchant.name}
              isIt={isIt}
              section={contentSection}
              generateCopy={prompt => new Promise(resolve => {
                void askOperatingAssistant(prompt, { openPanel: false, onReply: resolve, context: 'content', scope: contentSection, forcePageContext: true })
                  .then(success => { if (!success) resolve(null); })
                  .catch(() => resolve(null));
              })}
              addNotification={addNotification}
            />
          </Suspense>
        )}

          {activeTab === 'growth' && currentMerchant && currentMerchantId && (
          <Suspense fallback={<div className="rounded-2xl border border-neutral-200 bg-white p-6 text-xs text-neutral-500">正在加载增长工作区…</div>}>
            <MerchantGrowthWorkspace
              merchantId={currentMerchantId}
              merchantName={currentMerchant.name}
              merchantSharePath={`/shop/${encodeURIComponent(currentMerchant.storeSlug || currentMerchant.slug || currentMerchant.id)}`}
              products={merchantProducts}
              orders={merchantOrders}
              customers={merchantCustomers}
              isIt={isIt}
              section={growthSection}
              onSectionChange={setGrowthSection}
              generateCopy={prompt => new Promise(resolve => {
                void askOperatingAssistant(prompt, { openPanel: false, onReply: resolve, context: 'growth', scope: growthSection, forcePageContext: true })
                  .then(success => { if (!success) resolve(null); })
                  .catch(() => resolve(null));
              })}
              addNotification={addNotification}
            />
          </Suspense>
        )}

      {/* ======================================================== */}
      {/* SUB-TAB 8: 财务结算与分账对账 (FINANCE & PAYOUTS) */}
      {/* ======================================================== */}
      {activeTab === 'finance' && (
        <div className="space-y-4">
          <MerchantWorkspaceHeader title="财务与结算" description="核对收款账户、结算记录和平台扣费；提交或更换账户后需等待平台审核。" icon={<Receipt className="h-3.5 w-3.5" />} />
          <PaymentSettingsCard audience="merchant" isIt={isIt} />
          <div className="merchant-home-card space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                结算收款账户核验
              </h2>
              <p className="text-xs text-neutral-500 mt-1">IBAN 将加密保存；提交或更换账户后需由平台财务审核，页面仅显示脱敏号码。</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={bankAccountForm.accountHolder} onChange={event => setBankAccountForm(previous => ({ ...previous, accountHolder: event.target.value }))} placeholder="账户持有人（法定主体）" className="border border-neutral-300 rounded-lg px-3 py-2 text-xs" />
              <input value={bankAccountForm.iban} onChange={event => setBankAccountForm(previous => ({ ...previous, iban: event.target.value }))} placeholder="IBAN" className="border border-neutral-300 rounded-lg px-3 py-2 text-xs font-mono" />
              <button type="button" disabled={bankAccountBusy} onClick={async () => {
                setBankAccountBusy(true);
                try {
                  await apiPost('/api/merchant/bank-accounts', bankAccountForm);
                  const result = await apiGet<{ success: true; accounts: typeof bankAccounts }>('/api/merchant/bank-accounts');
                  setBankAccounts(result.accounts);
                  setBankAccountForm({ accountHolder: '', iban: '' });
                  addNotification('success', '收款账户已提交', '平台财务将在核验后启用此账户用于结算');
                } catch (error) {
                  addNotification('warning', '账户提交失败', error instanceof Error ? error.message : '请检查账户信息');
                } finally {
                  setBankAccountBusy(false);
                }
              }} className="bg-neutral-900 text-white rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50">提交审核</button>
            </div>
            <div className="space-y-2">
              {bankAccounts.length === 0 ? <div className="text-xs text-neutral-600">尚未提交收款账户；提交并审核后可用于后续人工结算核对。</div> : bankAccounts.map(account => (
                <div key={account.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-xs">
                  <span className="font-medium text-neutral-900">{account.accountHolder} · <span className="font-mono">{account.iban}</span></span>
                  <span className={account.status === 'verified' ? 'text-emerald-700 font-semibold' : account.status === 'rejected' ? 'text-rose-700 font-semibold' : 'text-amber-700 font-semibold'}>
                    {account.status === 'verified' ? '已核验' : account.status === 'rejected' ? `已拒绝：${account.rejectionReason || '请更新资料'}` : '审核中'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="merchant-home-card space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-700" />
                财务结算中心与平台分账 (Payouts & Commission Settlement)
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                结算周期：每月 1 号与 15 号双周出账 · 平台技术服务抽佣按商户协议执行 · 扣除款项自动电汇至您绑定的欧洲 IBAN
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                <div className="text-xs text-neutral-500">累计销售总额 (Gross)</div>
                <div className="text-xl font-bold text-neutral-900 mt-1">
                  €{merchantPayouts.reduce((acc, p) => acc + p.grossSales, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                <div className="text-xs text-neutral-500">平台技术抽佣（按商户协议）</div>
                <div className="text-xl font-bold text-neutral-700 mt-1">
                  €{merchantPayouts.reduce((acc, p) => acc + p.platformFeeAmount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                <div className="text-xs text-neutral-500">支付通道手续费 (2%)</div>
                <div className="text-xl font-bold text-neutral-700 mt-1">
                  €{merchantPayouts.reduce((acc, p) => acc + p.paymentProcessingFee, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                <div className="text-xs text-neutral-500">退款扣减</div>
                <div className="text-xl font-bold text-neutral-700 mt-1">
                  €{merchantPayouts.reduce((acc, p) => acc + (p.refunds || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                <div className="text-xs text-neutral-600 font-semibold">应结算净额</div>
                <div className="text-xl font-bold text-neutral-900 mt-1">
                  €{merchantPayouts.reduce((acc, p) => acc + p.netPayout, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Payouts Table */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-neutral-200 font-bold text-xs uppercase text-neutral-700">
              人工结算账单明细
            </div>
            <p className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs leading-5 text-neutral-600">
              RUDA 当前未集成自动资金转账。此处显示平台手工登记的结算状态和凭证；“已登记”不代表本页面发起了转账或收到银行回执。
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-600 uppercase border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">结算批次</th>
                    <th className="py-3 px-4">结算周期</th>
                    <th className="py-3 px-4">总销售额 (Gross)</th>
                    <th className="py-3 px-4">平台抽佣（按商户比例）</th>
                    <th className="py-3 px-4">通道手续费</th>
                    <th className="py-3 px-4">退款扣减</th>
                    <th className="py-3 px-4">应结算净额</th>
                    <th className="py-3 px-4">结算状态</th>
                    <th className="py-3 px-4">收款账户（掩码）</th>
                    <th className="py-3 px-4">人工结算凭证</th>
                    <th className="py-3 px-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {merchantPayouts.map(p => (
                    <tr key={p.id} className="hover:bg-neutral-50">
                      <td className="py-3 px-4 font-mono font-bold">{p.id}</td>
                      <td className="py-3 px-4 font-semibold text-neutral-900">{p.period}</td>
                      <td className="py-3 px-4 font-semibold">€{p.grossSales.toFixed(2)}</td>
                      <td className="py-3 px-4 text-neutral-600">-€{p.platformFeeAmount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-neutral-600">-€{p.paymentProcessingFee.toFixed(2)}</td>
                      <td className="py-3 px-4 text-neutral-600">-€{(p.refunds || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 font-bold text-neutral-900 text-sm">€{p.netPayout.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className="border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-800">
                          {p.status === 'paid' ? (p.settlementReference && p.settlementProof ? '已登记人工结算' : '历史结算状态待核验') : p.status === 'processing' ? '人工结算处理中' : p.status === 'failed' ? '人工结算记录失败' : '待结算'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-600">{p.bankAccount}</td>
                      <td className="max-w-64 py-3 px-4 text-[11px] text-neutral-600">
                        {p.status === 'paid' && p.settlementReference && p.settlementProof ? (
                          <div className="space-y-1 break-words">
                            <div>参考号：{p.settlementReference || '—'}</div>
                            <div>凭证：{p.settlementProof || '—'}</div>
                            <div>{p.settledBy || '—'} · {p.settledAt ? new Date(p.settledAt).toLocaleString(getIntlLocale(lang)) : '—'}</div>
                          </div>
                        ) : p.status === 'paid' ? '历史记录尚无结算凭证' : '完成后显示人工登记的凭证'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.status === 'pending' && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await apiPut(`/api/merchant/payouts/${encodeURIComponent(p.id)}/status`, { status: 'acknowledged' });
                                await refreshMerchantOperations();
                                addNotification('success', '结算单已确认', '平台运营可据此核对并手动记录后续结算；系统不会自动转账。');
                              } catch (error) {
                                addNotification('warning', '结算确认失败', error instanceof Error ? error.message : '请稍后重试');
                              }
                            }}
                            className="px-2.5 py-1 bg-neutral-900 text-white rounded text-[11px] font-semibold cursor-pointer"
                          >
                            确认对账
                          </button>
                        )}
                        {p.status === 'processing' && <span className="text-neutral-600 text-[11px] font-medium">平台正在处理人工结算</span>}
                        {p.status === 'failed' && <span className="text-neutral-600 text-[11px] font-medium">请联系平台客服核实记录</span>}
                        {p.status === 'paid' && <span className="text-neutral-700 text-[11px] font-medium">{p.settlementReference && p.settlementProof ? '详情见人工结算凭证' : '请联系平台核验历史记录'}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 9: 商户资料与展厅资质 (MERCHANT PROFILE) */}
      {/* ======================================================== */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          <MerchantWorkspaceHeader
            title="店铺展示设置"
            description="管理买手看到的品牌形象、展厅内容与网店介绍。"
            icon={<Store className="h-3.5 w-3.5" />}
            action={<button type="button" onClick={() => void saveStorefront()} disabled={storefrontBusy} className="rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-700 disabled:opacity-50">{storefrontBusy ? '发布中…' : '保存并发布'}</button>}
          />
          <div id="merchant-storefront-settings" className="merchant-home-card scroll-mt-6 space-y-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 text-xs">
            {([
              ['logo', '品牌 Logo', '店铺头像与品牌标识'],
              ['banner', '店铺首屏横幅', '建议使用宽幅品牌大片'],
              ['showroomImage', '展厅主图', '用于店铺介绍和展厅入口']
            ] as const).map(([key, label, hint]) => (
              <div key={key} className="space-y-2">
                <label className="font-semibold text-neutral-700">{label}<span className="ml-2 font-normal text-neutral-400">{hint}</span></label>
                <label className="block cursor-pointer overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
                  <div className={`h-36 ${key === 'logo' ? 'p-8' : ''}`}><img src={storefrontForm[key]} alt={label} className="h-full w-full object-cover" /></div>
                  <div className="border-t bg-white px-3 py-2 text-center text-[11px] text-neutral-500">点击更换图片（JPG/PNG/WebP，≤5MB）</div>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) readStorefrontImage(file, value => setStorefrontForm(previous => ({ ...previous, [key]: value }))); event.currentTarget.value = ''; }} />
                </label>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <label className="font-semibold text-neutral-700">展厅图集（最多 12 张）</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {storefrontForm.showroomPanoramicImages.map((image, index) => <div key={`${image.slice(-20)}-${index}`} className="group relative aspect-square overflow-hidden rounded-lg border"><img src={image} alt={`展厅图 ${index + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => setStorefrontForm(previous => ({ ...previous, showroomPanoramicImages: previous.showroomPanoramicImages.filter((_, itemIndex) => itemIndex !== index) }))} className="absolute right-1 top-1 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100">删除</button></div>)}
              {storefrontForm.showroomPanoramicImages.length < 12 && <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 text-neutral-400"><ImagePlus className="h-5 w-5" /><input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={event => { const files = Array.from(event.target.files || []); files.forEach(file => readStorefrontImage(file, value => setStorefrontForm(previous => previous.showroomPanoramicImages.length >= 12 ? previous : ({ ...previous, showroomPanoramicImages: [...previous.showroomPanoramicImages, value] })))); event.currentTarget.value = ''; }} /></label>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">网店首页大屏视频</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">客户打开独立网店时优先播放此视频。支持 MP4/WebM，最大 100MB；不上传自定义视频时使用 RUDA 默认视频。</p>
              </div>
              <video
                key={storefrontVideoPreview || storefrontForm.storefrontVideo || 'default-storefront-video'}
                src={storefrontVideoPreview || storefrontForm.storefrontVideo || '/videos/ruda-home.mp4'}
                poster={storefrontForm.banner || DEFAULT_MERCHANT_BANNER}
                controls
                muted
                playsInline
                preload="metadata"
                className="aspect-video w-full rounded-xl bg-neutral-950 object-cover"
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-lg bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white">
                  {storefrontVideoFile ? '更换视频' : '上传自定义视频'}
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    className="sr-only"
                    onChange={event => {
                      const file = event.target.files?.[0];
                      if (file && (!['video/mp4', 'video/webm'].includes(file.type) || file.size > 100 * 1024 * 1024)) {
                        addNotification('warning', '视频不符合要求', '仅支持 MP4/WebM，单个文件最大 100MB');
                      } else if (file) {
                        setStorefrontVideoFile(file);
                      }
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
                {(storefrontVideoFile || storefrontForm.storefrontVideo) && (
                  <button type="button" onClick={() => { setStorefrontVideoFile(null); setStorefrontForm(previous => ({ ...previous, storefrontVideo: '' })); }} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-xs font-semibold text-neutral-700">
                    恢复默认视频
                  </button>
                )}
                <span className="text-[10px] text-neutral-500">{storefrontVideoFile?.name || (storefrontForm.storefrontVideo ? '已设置自定义视频' : '正在使用默认视频')}</span>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="text-sm font-bold text-neutral-900">图片展示</h3>
              <p className="mt-2 text-[11px] leading-relaxed text-neutral-600">品牌 Logo、店铺横幅、展厅主图和图集都会同步到独立网店。客户页以横幅作为视频封面；商家视频无法播放时也会自动回退到横幅图片。</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-xs">
            {([
              ['tagline', '品牌短标语（默认）'],
              ['tagline_zh', '中文品牌短标语'],
              ['tagline_it', '意大利语品牌短标语']
            ] as const).map(([key, label]) => <label key={key} className="font-semibold text-neutral-700">{label}<input value={storefrontForm[key]} maxLength={160} onChange={event => setStorefrontForm(previous => ({ ...previous, [key]: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 p-2.5 font-normal" /></label>)}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-xs">
            {([
              ['description', '品牌介绍（默认）'],
              ['description_zh', '中文品牌介绍'],
              ['description_it', '意大利语品牌介绍']
            ] as const).map(([key, label]) => <label key={key} className="font-semibold text-neutral-700">{label}<textarea value={storefrontForm[key]} maxLength={3000} rows={5} onChange={event => setStorefrontForm(previous => ({ ...previous, [key]: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 p-2.5 font-normal" /></label>)}
          </div>
          <section className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">网店搜索与交易政策</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">这些内容会显示在公开网店，并用于浏览器标题、搜索摘要与社交分享卡片。标题最多 70 字，摘要最多 320 字。</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-xs">
              <label className="font-semibold text-neutral-700">SEO / 分享标题
                <input value={storefrontForm.storefrontSeoTitle} maxLength={70} onChange={event => setStorefrontForm(previous => ({ ...previous, storefrontSeoTitle: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 p-2.5 font-normal" placeholder={currentMerchant?.name || '品牌名称 · 官方店铺'} />
              </label>
              <label className="font-semibold text-neutral-700">SEO / 分享摘要
                <textarea value={storefrontForm.storefrontSeoDescription} maxLength={320} rows={3} onChange={event => setStorefrontForm(previous => ({ ...previous, storefrontSeoDescription: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 p-2.5 font-normal" placeholder="简要介绍店铺、品牌特色和批发货盘。" />
              </label>
              <label className="font-semibold text-neutral-700">配送与运费政策
                <textarea value={storefrontForm.storefrontShippingPolicy} maxLength={2000} rows={5} onChange={event => setStorefrontForm(previous => ({ ...previous, storefrontShippingPolicy: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 p-2.5 font-normal" placeholder="配送区域、预计时效、运费与偏远地区规则。" />
              </label>
              <label className="font-semibold text-neutral-700">退换货与售后政策
                <textarea value={storefrontForm.storefrontReturnsPolicy} maxLength={2000} rows={5} onChange={event => setStorefrontForm(previous => ({ ...previous, storefrontReturnsPolicy: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 p-2.5 font-normal" placeholder="申请时限、商品状态要求、处理方式与联系渠道。" />
              </label>
            </div>
          </section>
          <div className="text-xs">
            <label className="font-semibold text-neutral-700">店铺特色标签</label>
            <div className="mt-2 flex flex-wrap gap-2">{storefrontForm.specialties.map(tag => <span key={tag} className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-700">{tag}<button type="button" onClick={() => setStorefrontForm(previous => ({ ...previous, specialties: previous.specialties.filter(item => item !== tag) }))} className="ml-2 font-bold text-neutral-400">×</button></span>)}</div>
            <form className="mt-2 flex gap-2" onSubmit={event => { event.preventDefault(); const tag = newSpecialty.trim().slice(0, 40); if (tag && !storefrontForm.specialties.includes(tag) && storefrontForm.specialties.length < 12) setStorefrontForm(previous => ({ ...previous, specialties: [...previous.specialties, tag] })); setNewSpecialty(''); }}>
              <input value={newSpecialty} onChange={event => setNewSpecialty(event.target.value)} maxLength={40} placeholder="例如：意大利制造 / 真丝 / 小单快返" className="w-full max-w-sm rounded-lg border border-neutral-300 p-2.5" />
              <button type="submit" className="rounded-lg border border-neutral-300 px-3 font-semibold">添加</button>
            </form>
          </div>
        </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid min-h-full gap-4 lg:grid-cols-[232px_minmax(0,1fr)]">
          <aside className="flex max-h-[48vh] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm lg:sticky lg:top-0 lg:max-h-[calc(100vh-6rem)]">
            <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-4">
              <img src={merchantLogo} alt="" className="h-9 w-9 rounded-lg border border-neutral-200 object-cover" />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-neutral-900">{currentMerchant.name}</p>
                <p className="mt-0.5 text-[10px] text-neutral-500">{localizeCopy('商家设置', 'RUDA Impostazioni')}</p>
              </div>
            </div>
            <label className="relative block border-b border-neutral-100 p-3">
              <Search className="pointer-events-none absolute left-6 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input value={settingsSearch} onChange={event => setSettingsSearch(event.target.value)} placeholder={localizeCopy('搜索设置', 'Cerca impostazioni')} aria-label={localizeCopy('搜索设置', 'Cerca impostazioni')} className="h-9 w-full rounded-lg border border-neutral-200 bg-white pl-8 pr-2 text-[11px] outline-none focus:border-neutral-400" />
            </label>
            <nav aria-label={localizeCopy('设置导航', 'Impostazioni merchant')} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-2">
              {filteredMerchantSettingsGroups.map(group => <section key={group.label}>
                <h2 className="px-2 pb-1 pt-1 text-[9px] font-bold uppercase tracking-wide text-neutral-400">{group.label}</h2>
                <div className="space-y-0.5">
                  {group.entries.map(tuple => {
                    const [entry, label] = tuple;
                    return <button key={entry} type="button" onClick={() => runMerchantSettingsEntry(entry)} aria-current={activeSettingsEntry === entry ? 'page' : undefined} className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[11px] font-medium transition ${activeSettingsEntry === entry ? 'bg-neutral-100 text-neutral-950' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950'}`}>
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                    </button>;
                  })}
                </div>
              </section>)}
              {!filteredMerchantSettingsGroups.length && <p className="px-3 py-4 text-center text-[11px] text-neutral-500">{localizeCopy('没有匹配的设置项。', 'Nessuna impostazione corrispondente.')}</p>}
            </nav>
            <div className="flex items-center gap-2 border-t border-neutral-100 px-3 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-100 text-[9px] font-bold text-fuchsia-800">R</span>
              <span className="truncate text-[10px] font-semibold text-neutral-600">{currentMerchant.name}</span>
            </div>
          </aside>
          <div className="min-w-0 space-y-4">
          <MerchantWorkspaceHeader
            title={settingsSubsection === 'general' ? '常规' : settingsSubsection === 'rules' ? '结账与经营规则' : settingsSubsection === 'payments' ? '付款' : settingsSubsection === 'notifications' ? '通知' : settingsSubsection === 'mobile' ? '手机端偏好' : settingsSubsection === 'team' ? '用户' : settingsSubsection === 'roles' ? '角色与权限' : settingsSubsection === 'language' ? '语言' : '设置说明'}
            description={settingsSubsection === 'general' ? '管理店铺资料、联系方式和默认经营偏好。' : settingsSubsection === 'payments' ? '查看 RUDA 当前支持的付款方式与线上收款状态。支付服务由平台统一接入；商家结算账户在「财务与结算」中管理。' : '按店铺账户、销售交付、渠道内容和数据合规分类。已有功能直达对应页面，未接入的能力会明确说明，不显示为可用配置。'}
            icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
            action={<div className="flex gap-2">
              <button type="button" onClick={openMerchantHome} className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700">{localizeCopy('返回工作台', 'Torna al pannello')}</button>
              {['general', 'rules', 'notifications', 'mobile'].includes(settingsSubsection) && <button type="button" onClick={() => void saveSettings()} disabled={settingsBusy} className="rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-700 disabled:opacity-50">{settingsBusy ? '保存中…' : '保存设置'}</button>}
            </div>}
          />
          {settingsSubsection === 'payments' && <div className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 p-4 sm:p-5">
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">线上付款服务</h2>
                  <p className="mt-1 text-xs text-neutral-500">线上卡支付是否可用由 RUDA 平台端的支付服务与结账配置共同决定。</p>
                </div>
                <button type="button" onClick={() => setMerchantPaymentStatusRefresh(value => value + 1)} disabled={merchantPaymentStatusLoading} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 disabled:opacity-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${merchantPaymentStatusLoading ? 'animate-spin' : ''}`} />刷新状态
                </button>
              </div>
              {merchantPaymentStatusError
                ? <div role="alert" className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 sm:m-5">付款状态读取失败：{merchantPaymentStatusError}。请刷新重试；未确认状态前不要向顾客承诺线上付款已开通。</div>
                : <div className="p-4 sm:p-5">
                  <div className={`rounded-xl border p-4 ${merchantPaymentStatus?.onlineCheckoutEnabled ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {merchantPaymentStatus?.onlineCheckoutEnabled ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <AlertTriangle className="h-4 w-4 text-amber-700" />}
                        <h3 className="text-sm font-bold text-neutral-900">{merchantPaymentStatusLoading && !merchantPaymentStatus ? '正在读取线上付款状态…' : merchantPaymentStatus?.onlineCheckoutEnabled ? '线上卡付款已启用' : '线上卡付款未启用'}</h3>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${merchantPaymentStatus?.onlineCheckoutEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{merchantPaymentStatus?.onlineCheckoutEnabled ? '可用' : '未启用'}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-neutral-700">
                      {merchantPaymentStatus?.onlineCheckoutEnabled
                        ? `RUDA 平台级线上卡支付服务已就绪（${merchantPaymentStatus.provider === 'stripe' ? 'Stripe' : merchantPaymentStatus.provider}）；下方还可单独连接商家自己的 Stripe 账户。`
                        : 'RUDA 平台级线上卡支付当前未启用；你仍可在下方连接自己的 Stripe 或 PayPal 商家账户。'}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-neutral-200 p-4">
                      <div className="flex items-center justify-between gap-2"><h3 className="text-xs font-bold text-neutral-900">RUDA 线上卡支付</h3><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${merchantPaymentStatus?.onlineCheckoutEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>{merchantPaymentStatus?.onlineCheckoutEnabled ? '已就绪' : merchantPaymentStatusLoading && !merchantPaymentStatus ? '读取中' : '未启用'}</span></div>
                      <p className="mt-2 text-[11px] leading-5 text-neutral-500">这是 RUDA 平台级收款配置，与下方商家自己的 Stripe 账户分开管理。启用此方式时款项进入平台配置的账户。</p>
                    </div>
                    <div className="rounded-xl border border-neutral-200 p-4 sm:col-span-2">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-neutral-900">Stripe · 商家自有收款账户</h3>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${merchantStripeStatus?.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>{merchantStripeStatus?.enabled ? '已连接' : '未连接'}</span>
                          </div>
                          <p className="mt-1 text-[11px] leading-5 text-neutral-500">粘贴 Stripe Secret Key 即可验证账户并启用 Stripe Checkout。顾客银行卡付款会直接进入此商家的 Stripe 账户，不经过 RUDA 平台账户。</p>
                          <p className="mt-1 text-[10px] leading-4 text-amber-700">仅支持单商家购物车。后台退货退款流程会通过此商家 Stripe 账户处理；不要粘贴 Publishable Key（pk_）或 Restricted Key（rk_）。</p>
                        </div>
                        {merchantStripeStatus?.configured && <button type="button" onClick={() => void disconnectStripe()} disabled={stripeCredentialsBusy} className="rounded-lg border border-rose-200 px-3 py-2 text-[11px] font-semibold text-rose-700 disabled:opacity-50">{stripeCredentialsBusy ? '处理中…' : '断开 Stripe'}</button>}
                      </div>
                      {merchantStripeStatus?.configured && <p className="mt-2 rounded-lg bg-neutral-50 p-2 text-[10px] text-neutral-600">
                        账户：{merchantStripeStatus.accountId || '已验证'} · 环境：{merchantStripeStatus.livemode ? 'Live 正式收款' : 'Test 测试模式'} · Secret Key：加密保存在服务端，不会再次显示。
                      </p>}
                      <form onSubmit={event => void saveStripeCredentials(event)} className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="text-[11px] font-semibold text-neutral-700 sm:col-span-2">Stripe Secret Key
                          <PasswordInput required={!merchantStripeStatus?.configured} minLength={20} maxLength={512} autoComplete="new-password" value={stripeSecretKey} onChange={event => setStripeSecretKey(event.target.value)} placeholder={merchantStripeStatus?.configured ? '留空保留现有密钥；输入新密钥可轮换' : '粘贴 sk_test_… 或 sk_live_…'} className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 pr-10 text-xs font-normal" />
                        </label>
                        <div className="flex items-end">
                          <button type="submit" disabled={stripeCredentialsBusy} className="h-10 w-full rounded-lg bg-neutral-950 px-4 text-xs font-semibold text-white disabled:opacity-50">{stripeCredentialsBusy ? '验证并保存中…' : merchantStripeStatus?.configured ? '验证并更新密钥' : '验证并连接 Stripe'}</button>
                        </div>
                        <p className="self-center text-[10px] leading-4 text-neutral-500">会向 Stripe 验证账户和 Test/Live 环境；通过 TLS 传输并以 AES-GCM 加密保存。测试环境密钥使用测试卡，不会真实扣款。</p>
                      </form>
                    </div>
                    <div className="rounded-xl border border-neutral-200 p-4 sm:col-span-2">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2"><h3 className="text-xs font-bold text-neutral-900">PayPal · 商家自有收款账户</h3>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${merchantPayPalStatus?.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>{merchantPayPalStatus?.enabled ? '已连接' : '未连接'}</span>
                          </div>
                          <p className="mt-1 text-[11px] leading-5 text-neutral-500">每个商家使用自己的 PayPal Business 应用凭证；顾客完成 PayPal 批准后，RUDA 服务端捕获付款并更新订单状态。</p>
                          <p className="mt-1 text-[10px] leading-4 text-amber-700">注意：PayPal 退款暂不支持 RUDA 自动处理。退款申请需在 PayPal 商家账户中手动操作；RUDA 不会把 PayPal 退款请求误发给平台银行卡通道。</p>
                        </div>
                        {merchantPayPalStatus?.configured && <button type="button" onClick={() => void disconnectPayPal()} disabled={paypalCredentialsBusy} className="rounded-lg border border-rose-200 px-3 py-2 text-[11px] font-semibold text-rose-700 disabled:opacity-50">{paypalCredentialsBusy ? '处理中…' : '断开 PayPal'}</button>}
                      </div>
                      {merchantPayPalStatus?.configured && <p className="mt-2 rounded-lg bg-neutral-50 p-2 text-[10px] text-neutral-600">
                        环境：{merchantPayPalStatus.environment === 'live' ? '正式收款' : '沙盒测试'} · Client ID：••••{merchantPayPalStatus.clientIdHint || '已保存'} · Secret：加密保存在服务端，不会再次显示。
                      </p>}
                      <form onSubmit={event => void savePayPalCredentials(event)} className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="text-[11px] font-semibold text-neutral-700">PayPal Client ID
                          <input required={!merchantPayPalStatus?.configured} minLength={8} maxLength={512} autoComplete="off" value={paypalCredentialsForm.clientId} onChange={event => setPaypalCredentialsForm(previous => ({ ...previous, clientId: event.target.value }))} placeholder={merchantPayPalStatus?.configured ? '留空保留现有 Client ID' : '粘贴 Client ID'} className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs font-normal" />
                        </label>
                        <label className="text-[11px] font-semibold text-neutral-700">PayPal Secret
                          <PasswordInput required={!merchantPayPalStatus?.configured} minLength={8} maxLength={512} autoComplete="new-password" value={paypalCredentialsForm.clientSecret} onChange={event => setPaypalCredentialsForm(previous => ({ ...previous, clientSecret: event.target.value }))} placeholder={merchantPayPalStatus?.configured ? '留空保留现有 Secret' : '粘贴 Secret'} className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 pr-10 text-xs font-normal" />
                        </label>
                        <label className="text-[11px] font-semibold text-neutral-700">PayPal 环境
                          <select value={paypalCredentialsForm.environment} onChange={event => setPaypalCredentialsForm(previous => ({ ...previous, environment: event.target.value as 'sandbox' | 'live' }))} className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs font-normal">
                            <option value="sandbox">沙盒测试（Sandbox）</option><option value="live">正式收款（Live）</option>
                          </select>
                        </label>
                        <div className="flex items-end">
                          <button type="submit" disabled={paypalCredentialsBusy} className="h-10 w-full rounded-lg bg-neutral-950 px-4 text-xs font-semibold text-white disabled:opacity-50">{paypalCredentialsBusy ? '验证并保存中…' : merchantPayPalStatus?.configured ? '验证并更新凭证' : '验证并连接 PayPal'}</button>
                        </div>
                        <p className="text-[10px] leading-4 text-neutral-500 sm:col-span-2">保存前会向对应 PayPal 环境验证凭证。已有连接时，凭证输入留空表示保留已保存密钥；填写新值则轮换对应凭证。RUDA 使用 TLS 传输、服务端 AES-GCM 加密存储；密钥仅用于该商家的订单，不会发给顾客或暴露在浏览器响应中。先用 Sandbox 测试，确认无误后再切换 Live。</p>
                      </form>
                    </div>
                    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 sm:col-span-2">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-neutral-900">Solana Pay · 商家钱包绑定</h3>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${merchantSolanaStatus?.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>{merchantSolanaStatus?.enabled ? '已连接' : '未连接'}</span>
                          </div>
                          <p className="mt-1 text-[11px] leading-5 text-neutral-600">仅支持 Solana (SPL) 主网 USDC 或 EURC。可创建并绑定 Privy 嵌入式钱包，也可粘贴其他 Solana 钱包的公开地址；顾客必须从 Solana 网络付款。</p>
                        </div>
                        {merchantSolanaStatus?.configured && <button type="button" onClick={() => void disconnectSolanaWallet()} disabled={solanaConfigBusy} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-[11px] font-semibold text-rose-700 disabled:opacity-50">{solanaConfigBusy ? '处理中…' : '断开钱包'}</button>}
                      </div>
                      {merchantSolanaStatus?.configured && <p className="mt-2 break-all rounded-lg bg-white p-2 text-[10px] text-neutral-600">当前收款公钥：{merchantSolanaStatus.walletAddress}</p>}
                      <form onSubmit={event => void saveSolanaWallet(event)} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                        <label className="text-[11px] font-semibold text-neutral-700 sm:col-span-3">请输入您的 Solana 钱包地址（支持接收 USDC/EURC）
                          <input required minLength={32} maxLength={44} autoComplete="off" spellCheck={false} value={solanaWalletAddress} onChange={event => setSolanaWalletAddress(event.target.value)} placeholder="粘贴 Phantom 或 Solflare 的公开钱包地址" className="mt-1.5 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs font-normal" />
                        </label>
                        <Suspense fallback={<button type="button" disabled className="h-10 rounded-lg border border-violet-300 bg-white px-4 text-xs font-semibold text-violet-900 opacity-50">加载 Privy 钱包组件…</button>}>
                          <LazyPrivySolanaWalletButton disabled={solanaConfigBusy} onWalletAddress={setSolanaWalletAddress} />
                        </Suspense>
                        <button type="submit" disabled={solanaConfigBusy} className="h-10 rounded-lg bg-violet-800 px-4 text-xs font-semibold text-white disabled:opacity-50">{solanaConfigBusy ? '验证并保存中…' : merchantSolanaStatus?.configured ? '更新钱包地址' : '验证并绑定钱包'}</button>
                        <p className="text-[10px] leading-4 text-neutral-500 sm:col-span-3">仅绑定 Solana 主网钱包地址；只支持 Solana (SPL) USDC 或 EURC。Privy App ID 是公开配置，App Secret、私钥和助记词均不得提交给 RUDA 或放入前端。每笔二维码只对应一笔订单、一个收款地址和锁定金额。</p>
                      </form>
                    </div>
                  </div>
                </div>}
              <div className="border-t border-neutral-100 px-4 py-3 text-[11px] text-neutral-500 sm:px-5">
                Shopify Payments 是 Shopify 自有服务，RUDA 不是 Shopify 商店；这里不会显示 Shopify 的手续费报价、开通按钮或伪造的连接状态。
              </div>
            </section>
            <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs">
              <h2 className="font-bold text-neutral-900">其他商家自选支付通道</h2>
              <p className="mt-1 leading-5 text-neutral-600">商家自有线上收款目前支持 Stripe、PayPal 和 Solana Pay（USDC/EURC）。支付宝、微信支付仍需各自的商户协议、凭证及回调验签后才能开放线上收款；IBAN 转账属于线下收款资料，不是在线支付密钥。</p>
            </section>
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-bold text-neutral-900">付款配置</h2>
              <div className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-200">
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div><h3 className="text-xs font-semibold text-neutral-900">付款入账方式</h3><p className="mt-1 text-[11px] leading-5 text-neutral-500">B2B 结账支持银行转账预付；审核通过且有可用额度的客户可选择账期。POS 现金、转账及刷卡由收银员人工确认登记。</p></div>
                  <span className="shrink-0 rounded-full bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-800">按订单场景提供</span>
                </div>
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div><h3 className="text-xs font-semibold text-neutral-900">手动付款方式</h3><p className="mt-1 text-[11px] leading-5 text-neutral-500">银行转账是订单付款选项，但当前没有独立的商家收款说明/银行账号配置表单。请通过已确认的订单与结算流程对账，勿在此填写或展示敏感账户信息。</p></div>
                  <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">说明配置未接入</span>
                </div>
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div><h3 className="text-xs font-semibold text-neutral-900">付款方式自定义</h3><p className="mt-1 text-[11px] leading-5 text-neutral-500">暂不支持按商家启用/禁用顾客可选方式、配置自定义付款名称或附加结账说明。</p></div>
                  <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-600">暂不支持</span>
                </div>
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div><h3 className="text-xs font-semibold text-neutral-900">礼品卡与 Apple Wallet 卡券</h3><p className="mt-1 text-[11px] leading-5 text-neutral-500">RUDA 尚未提供礼品卡发行、余额核销或 Apple Wallet 卡券管理。</p></div>
                  <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-600">暂不支持</span>
                </div>
              </div>
            </section>
            <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-950">
              <h2 className="font-bold">与「财务与结算」的区别</h2>
              <p className="mt-1 leading-5">此页说明顾客如何付款；「财务与结算」管理 RUDA 向商家结算的账户和记录。POS 刷卡被人工确认登记，不代表已接入刷卡终端或在线支付网关。</p>
            </section>
          </div>}
          {settingsSubsection === 'general' && <div id="merchant-settings-general" className="merchant-home-card scroll-mt-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-neutral-900">业务详细信息与商店联系信息</h3>
              <p className="mt-1 text-xs text-neutral-500">管理经营主体、VAT/税号、门店地址和顾客可联系到你的资料；资料变更可能影响结算与合规，请确保真实准确。</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-xs">
              {([['name','店铺名称'],['companyLegalName','法定主体'],['vatNumber','VAT/税号'],['country','国家/地区'],['city','城市'],['showroomAddress','店铺地址'],['contactPerson','联系人'],['contactPhone','联系电话'],['contactEmail','联系邮箱']] as const).map(([key,label]) => (
                <label key={key} className="font-semibold text-neutral-700">{label}<input required={['name','companyLegalName','country','city','contactEmail'].includes(key)} value={settingsForm[key]} onChange={event => setSettingsForm(previous => ({ ...previous, [key]: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal outline-none focus:border-neutral-900" /></label>
              ))}
            </div>
            <p className="mt-4 text-right text-[10px] text-neutral-400">RUDA 商家资料 · 保存后用于店铺展示及联系信息</p>
          </div>}
          {settingsSubsection === 'general' && <div className="grid gap-3 md:grid-cols-2">
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold">{localizeCopy('商店默认设置', 'Impostazioni predefinite del negozio')}</h3>
              <dl className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between gap-3"><dt className="text-neutral-500">{localizeCopy('POS 价格币种', 'Valuta prezzi POS')}</dt><dd className="font-semibold">EUR (€)</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-neutral-500">{localizeCopy('库存计量', 'Unità inventario')}</dt><dd className="font-semibold">{localizeCopy('件', 'Pezzi')}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-neutral-500">{localizeCopy('店铺时区', 'Fuso orario negozio')}</dt><dd className="font-semibold">{localizeCopy('当前无独立设置', 'Non configurabile separatamente')}</dd></div>
              </dl>
              <p className="mt-3 text-[10px] leading-4 text-neutral-500">{localizeCopy('币种与商品计量单位由 RUDA 平台当前规则提供；本页没有可修改的货币、重量或时区选项。', 'Valuta e unità sono gestite dalla configurazione RUDA; non modificabili in questo profilo.')}</p>
            </section>
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold">{localizeCopy('订单编号与处理', 'ID ordine e gestione')}</h3>
              <p className="mt-2 text-xs leading-5 text-neutral-600">{localizeCopy('订单编号由 RUDA 系统生成，目前不能自定义前缀或编号格式。订单处理状态在订单工作台管理。', 'I numeri ordine sono generati dal sistema; non è disponibile un formato/prefisso personalizzato.')}</p>
              <button type="button" onClick={() => { setSidebarNavExpanded(null); setActiveTab('orders'); }} className="mt-3 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold">{localizeCopy('打开订单履约', 'Apri ordini')}</button>
            </section>
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:col-span-2">
              <h3 className="text-sm font-bold">{localizeCopy('商店素材与所有权', 'Risorse negozio e proprietà')}</h3>
              <p className="mt-2 text-xs leading-5 text-neutral-600">{localizeCopy('品牌 Logo、横幅、展厅图集、SEO 与网店政策在“店铺展示设置”维护；当前后台不提供店铺所有权转移入口。', 'Logo, banner, immagini, SEO e policy si gestiscono nelle impostazioni vetrina. Il trasferimento della proprietà del negozio non è disponibile nel portale.')}</p>
              <button type="button" onClick={() => runMerchantSettingsEntry('sales-channels')} className="mt-3 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold">{localizeCopy('打开店铺展示设置', 'Apri vetrina')}</button>
            </section>
          </div>}
          {['rules', 'notifications', 'mobile'].includes(settingsSubsection) && <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {settingsSubsection === 'rules' && <div id="merchant-settings-rules" className="merchant-home-card scroll-mt-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="font-bold text-sm">营业与订单规则</h3>
              <div className="mt-4 space-y-3 text-xs">
                <label className="block font-semibold">全店默认 MOQ（件）<input type="number" min="1" max="100000" value={settingsForm.moq} onChange={event => setSettingsForm(previous => ({ ...previous, moq: Number(event.target.value) }))} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
                <label className="block font-semibold">默认账期<select value={settingsForm.defaultPaymentTerm} onChange={event => setSettingsForm(previous => ({ ...previous, defaultPaymentTerm: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="prepaid">预付</option><option value="net_15">Net 15</option><option value="net_30">Net 30</option><option value="net_60">Net 60</option></select></label>
                <label className="block font-semibold">运费说明<textarea maxLength={500} rows={3} value={settingsForm.shippingNote} onChange={event => setSettingsForm(previous => ({ ...previous, shippingNote: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" placeholder="例如：满 €500 免运费，偏远地区另计" /></label>
              </div>
            </div>}
            {settingsSubsection === 'notifications' && <div className="merchant-home-card rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              <h3 id="merchant-settings-notifications" className="scroll-mt-6 font-bold text-sm">通知偏好</h3>
              <div className="mt-4 space-y-3 text-xs">{([['notifyOrders','订单与发货通知'],['notifyPayouts','结算与收款通知'],['notifyVault','私密货盘申请通知'],['notifyMarketing','平台活动与营销通知']] as const).map(([key,label]) => <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 px-3 py-3"><span>{label}</span><input type="checkbox" checked={settingsForm[key]} onChange={event => setSettingsForm(previous => ({ ...previous, [key]: event.target.checked }))} className="h-4 w-4 accent-neutral-900" /></label>)}</div>
              <p className="mt-3 text-[11px] leading-5 text-neutral-500">{localizeCopy('这里控制商家后台提醒偏好；顾客通知模板和事件自动化尚未提供编辑入口。', 'Preferenze di avviso interne al merchant; template email e automazioni non sono configurabili qui.')}</p>
            </div>}
            {settingsSubsection === 'mobile' && <div className="merchant-home-card rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              <h3 id="merchant-settings-mobile" className="mt-6 scroll-mt-6 font-bold text-sm">手机端设置</h3>
              <p className="mt-1 text-xs text-neutral-500">这里设置会同步到商家手机端和 PWA，不需要在每台手机重复配置。</p>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 text-xs">
                <label className="block font-semibold">手机端首页<select value={settingsForm.mobileDefaultTab} onChange={event => setSettingsForm(previous => ({ ...previous, mobileDefaultTab: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 p-2.5 font-normal"><option value="dashboard">经营看板</option><option value="orders">订单履约</option><option value="inventory">库存</option><option value="customers">客户</option><option value="new_styles">新品</option><option value="profile">设置</option></select></label>
                <div className="rounded-lg border border-neutral-200 p-2.5">
                  <span className="block font-semibold">手机端语言</span>
                  <span className="mt-1 block font-normal text-neutral-500">
                    跟随商家账户语言：{languagePreference === 'auto' ? '跟随浏览器' : LANGUAGE_OPTIONS.find(language => language.code === languagePreference)?.nativeName}
                  </span>
                </div>
                <div className="space-y-2"><label className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-3 font-normal"><span>手机运营提醒</span><input type="checkbox" checked={settingsForm.mobileAlerts} onChange={event => setSettingsForm(previous => ({ ...previous, mobileAlerts: event.target.checked }))} className="h-4 w-4 accent-neutral-900" /></label><label className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-3 font-normal"><span>紧凑显示</span><input type="checkbox" checked={settingsForm.mobileCompact} onChange={event => setSettingsForm(previous => ({ ...previous, mobileCompact: event.target.checked }))} className="h-4 w-4 accent-neutral-900" /></label></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setIsMobileMode(true)} className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">在当前设备打开手机端</button>
                <button type="button" onClick={resetMobileSettings} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">恢复手机端默认设置</button>
              </div>
            </div>}
          </div>}
          {settingsSubsection === 'language' && <section id="merchant-settings-language" className="scroll-mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-sm font-bold">{localizeCopy('商家账户语言', 'Lingua dell’account merchant')}</h2>
            <p className="mt-1 text-xs text-neutral-500">{localizeCopy('语言选择应用于整个商家后台；商品、政策等店铺内容仍需单独维护翻译。', 'La scelta si applica al portale; i contenuti dei prodotti richiedono traduzioni separate.')}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <button type="button" onClick={() => setAutoLanguage()} className={`rounded-xl border p-3 text-left text-xs ${languagePreference === 'auto' ? 'border-emerald-300 bg-emerald-50' : 'border-neutral-200'}`}><b className="block">{localizeCopy('跟随浏览器', 'Automatico · Browser')}</b><small className="mt-1 block text-neutral-500">{localizeCopy('按浏览器语言偏好自动选择。', 'Rileva la lingua preferita del browser.')}</small></button>
              {LANGUAGE_OPTIONS.map(language => <button key={language.code} type="button" onClick={() => setLang(language.code)} className={`rounded-xl border p-3 text-left text-xs ${languagePreference === language.code ? 'border-emerald-300 bg-emerald-50' : 'border-neutral-200'}`}><b className="block">{language.nativeName}</b></button>)}
            </div>
          </section>}
          {settingsSubsection === 'info' && activeSettingsEntry === 'security' && <PasswordChangeForm audience="merchant" />}
          {settingsSubsection === 'info' && settingsNotice && <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm text-sky-950">
            <h2 className="font-bold">{settingsNotice.title}</h2>
            <p className="mt-2 text-xs leading-5">{settingsNotice.body}</p>
            {settingsNotice.distinction && <p className="mt-3 border-t border-sky-200 pt-3 text-xs leading-5">{settingsNotice.distinction}</p>}
          </section>}
          {settingsSubsection === 'roles' && <section id="merchant-team-settings" className="space-y-4 scroll-mt-6">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">岗位角色与权限模板</h2>
                  <p className="mt-1 text-xs leading-5 text-neutral-500">角色是权限模板，不是用户账号。RUDA 提供固定岗位模板；员工创建后还可逐人调整权限。</p>
                </div>
                <button type="button" onClick={() => openTeamSettings('team')} className="rounded-lg bg-neutral-950 px-3 py-2 text-xs font-semibold text-white">管理用户权限</button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(Object.keys(rolePermissionDefaults) as TeamEmployee['role'][]).map(role => {
                  const roleEmployees = teamEmployees.filter(employee => employee.role === role);
                  return <article key={role} className="rounded-xl border border-neutral-200 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div><h3 className="text-sm font-semibold text-neutral-900">{employeeRoleLabels[role]}</h3><p className="mt-1 text-[11px] leading-4 text-neutral-500">{employeeRoleDescriptions[role]}</p></div>
                      <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-600">{teamLoadError ? '人数不可用' : teamLoading ? '加载中…' : `${roleEmployees.length} 人`}</span>
                    </div>
                    <p className="mt-3 text-[10px] font-semibold text-neutral-600">模板权限 · {rolePermissionDefaults[role].length} 项</p>
                    <div className="mt-2 flex flex-wrap gap-1">{rolePermissionDefaults[role].map(permission => <span key={permission} className="rounded-full bg-neutral-50 px-2 py-1 text-[10px] text-neutral-600">{employeePermissionOptions.find(([key]) => key === permission)?.[1] || permission}</span>)}</div>
                    {roleEmployees.length > 0 && <p className="mt-3 border-t border-neutral-100 pt-2 text-[10px] text-neutral-500">当前账号权限可由管理员逐人覆盖模板，以上为新账号默认权限。</p>}
                  </article>;
                })}
              </div>
              {teamLoadError && <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">当前账号无法读取用户分配数量；岗位模板仍可查看。请使用拥有员工管理权限的账号查看团队数据。</p>}
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
                目前不支持创建可复用的自定义角色或角色目录；以上是系统固定岗位模板。POS 收银模板仅包含销售开单权限，不包含员工管理权限。用户配额由套餐控制的功能尚未接入。
              </div>
            </div>
          </section>}
          {settingsSubsection === 'team' && <section id="merchant-team-settings" className="scroll-mt-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">商家用户账号</h3>
                <p className="mt-1 text-xs text-neutral-500">用户是登录人员；岗位角色和权限决定其可执行的操作。权限保存后即时生效。</p>
              </div>
              <button type="button" onClick={() => { setTeamLoading(true); void reloadTeamEmployees().catch(error => setTeamLoadError(error instanceof Error ? error.message : '员工列表加载失败')).finally(() => setTeamLoading(false)); }} disabled={teamLoading} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 disabled:opacity-50">{teamLoading ? '加载中…' : '刷新员工列表'}</button>
            </div>
            {teamLoading && teamEmployees.length === 0
              ? <p className="mt-4 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500">正在加载员工管理权限…</p>
              : teamLoadError
                ? <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">无法加载员工管理功能：{teamLoadError}。请使用商户管理员账号，或联系店铺所有者开通“员工与权限管理”。</p>
                : <>
                  <form onSubmit={event => void createTeamEmployee(event)} className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
                    <h4 className="text-xs font-bold text-neutral-800">添加用户</h4>
                    <p className="mt-1 text-[11px] leading-4 text-neutral-500">当前通过管理员创建账号并设置初始密码；暂不发送邮件邀请，创建后可单独停用账号。</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                      <label className="font-semibold text-neutral-700">员工姓名
                        <input required maxLength={100} value={employeeForm.name} onChange={event => setEmployeeForm(previous => ({ ...previous, name: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal" />
                      </label>
                      <label className="font-semibold text-neutral-700">员工邮箱
                        <input required type="email" maxLength={200} value={employeeForm.email} onChange={event => setEmployeeForm(previous => ({ ...previous, email: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal" />
                      </label>
                      <label className="font-semibold text-neutral-700">初始密码（至少 8 位）
                        <PasswordInput required minLength={8} maxLength={128} autoComplete="new-password" value={employeeForm.password} onChange={event => setEmployeeForm(previous => ({ ...previous, password: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 pr-10 font-normal" />
                      </label>
                      <label className="font-semibold text-neutral-700">岗位模板
                        <select value={employeeForm.role} onChange={event => {
                          const role = event.target.value as TeamEmployee['role'];
                          setEmployeeForm(previous => ({ ...previous, role, permissions: [...rolePermissionDefaults[role]] }));
                        }} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal">
                          <option value="sales">销售</option><option value="warehouse">仓库</option><option value="production">生产</option><option value="pos_cashier">POS 收银（仅销售开单）</option><option value="store_manager">店长（全部权限模板）</option>
                        </select>
                      </label>
                    </div>
                    <fieldset className="mt-4">
                      <legend className="text-xs font-semibold text-neutral-700">为该员工选择权限</legend>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {employeePermissionOptions.map(([permission, label]) => <label key={permission} className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700">
                          <input type="checkbox" checked={employeeForm.permissions.includes(permission)} onChange={event => setEmployeeForm(previous => ({
                            ...previous,
                            permissions: event.target.checked
                              ? [...new Set([...previous.permissions, permission])]
                              : previous.permissions.filter(item => item !== permission)
                          }))} className="h-4 w-4 accent-neutral-900" />
                          {label}
                        </label>)}
                      </div>
                      <p className="mt-2 text-[11px] text-amber-800">“创建员工与管理权限”会允许该员工继续创建账号和分配权限，请仅授予可信管理员。</p>
                    </fieldset>
                    <button type="submit" disabled={teamBusy} className="mt-4 rounded-lg bg-neutral-950 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{teamBusy ? '创建中…' : '创建员工账号'}</button>
                  </form>
                  <div className="mt-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h4 className="text-xs font-bold text-neutral-800">用户列表</h4><span className="text-[11px] text-neutral-500">{teamEmployees.filter(employee => employee.active).length} / {teamEmployees.length} 个账号启用</span></div>
                    <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input value={teamSearch} onChange={event => setTeamSearch(event.target.value)} placeholder="搜索姓名、邮箱或岗位" aria-label="搜索员工账号" className="rounded-lg border border-neutral-200 px-3 py-2 text-xs" />
                      <select value={teamStatusFilter} onChange={event => setTeamStatusFilter(event.target.value as typeof teamStatusFilter)} aria-label="按账号状态筛选" className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs"><option value="all">全部状态</option><option value="active">已启用</option><option value="inactive">已停用</option></select>
                    </div>
                    <div className="space-y-3">
                      {filteredTeamEmployees.map(employee => <article key={employee.id} className="rounded-xl border border-neutral-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0"><strong className="block truncate text-sm text-neutral-900">{employee.name}</strong><p className="mt-1 text-xs text-neutral-500">{employee.email} · {employeeRoleLabels[employee.role]} · {employee.lastLoginAt ? `上次登录 ${new Date(employee.lastLoginAt).toLocaleString()}` : '尚未登录'}</p></div>
                          <button type="button" onClick={() => void toggleTeamEmployee(employee)} disabled={teamBusyId === employee.id} className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${employee.active ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{teamBusyId === employee.id ? '处理中…' : employee.active ? '停用账号' : '重新启用'}</button>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {employeePermissionOptions.map(([permission, label]) => <label key={permission} className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
                            <input type="checkbox" checked={employee.permissions.includes(permission)} onChange={event => setTeamEmployees(current => current.map(item => item.id === employee.id ? {
                              ...item,
                              permissions: event.target.checked
                                ? [...new Set([...item.permissions, permission])]
                                : item.permissions.filter(value => value !== permission)
                            } : item))} className="h-4 w-4 accent-neutral-900" />
                            {label}
                          </label>)}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] text-neutral-500">当前已选 {employee.permissions.length} 项权限</p>
                          <button type="button" onClick={() => void saveTeamEmployeePermissions(employee)} disabled={teamBusyId === employee.id} className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{teamBusyId === employee.id ? '保存中…' : '保存权限'}</button>
                        </div>
                      </article>)}
                      {filteredTeamEmployees.length === 0 && <p className="rounded-lg bg-neutral-50 p-4 text-center text-xs text-neutral-500">{teamEmployees.length === 0 ? '还没有员工账号，可在上方添加。' : '没有符合条件的用户。'}</p>}
                    </div>
                  </div>
                </>}
          </section>}
        </div>
        </div>
      )}

      {inventoryAdjustment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="font-bold text-neutral-900">修改商品件数</h3><p className="mt-1 text-xs text-neutral-500">{inventoryAdjustment.balance.product.styleNo} · {inventoryAdjustment.balance.sku} · 当前仓库</p></div>
              <button type="button" onClick={() => setInventoryAdjustment(null)} className="text-xl text-neutral-400">×</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-neutral-50 p-3"><span className="text-neutral-500">当前在库</span><strong className="mt-1 block text-lg">{inventoryAdjustment.balance.onHandQuantity}</strong></div>
              <div className="rounded-lg bg-neutral-50 p-3"><span className="text-neutral-500">当前可用</span><strong className="mt-1 block text-lg text-emerald-700">{inventoryAdjustment.balance.availableQuantity}</strong></div>
            </div>
            <label className="mt-4 block text-xs font-semibold text-neutral-700">修改后商品件数<input type="number" min="0" step="1" value={inventoryAdjustment.quantity} onChange={event => setInventoryAdjustment(previous => previous ? { ...previous, quantity: event.target.value } : previous)} className="mt-1 w-full rounded-lg border border-neutral-300 p-2.5 font-normal" /></label>
            <label className="mt-3 block text-xs font-semibold text-neutral-700">调整原因<textarea value={inventoryAdjustment.note} onChange={event => setInventoryAdjustment(previous => previous ? { ...previous, note: event.target.value } : previous)} maxLength={500} rows={3} placeholder="例如：到货入库、盘点差异、质检报损" className="mt-1 w-full rounded-lg border border-neutral-300 p-2.5 font-normal" /></label>
            <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setInventoryAdjustment(null)} className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold">取消</button><button type="button" onClick={() => void submitInventoryAdjustment()} disabled={inventoryBusy} className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{inventoryBusy ? '保存中...' : '确认调整'}</button></div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: 发布新商品 (NEW PRODUCT MODAL) */}
      {/* ======================================================== */}
      {isAddingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-base font-bold text-neutral-900">发布新款式入库</h3>
              <button 
                onClick={() => setIsAddingProduct(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">款式编号 (Style No.)</label>
                  <input
                    type="text"
                    value={newProdData.styleNo}
                    onChange={(e) => setNewProdData({ ...newProdData, styleNo: e.target.value })}
                    required
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">款式品名 (Product Title)</label>
                  <input
                    type="text"
                    value={newProdData.name}
                    onChange={(e) => setNewProdData({ ...newProdData, name: e.target.value })}
                    required
                    placeholder="例如：意式羊毛双面手工长大衣"
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">店铺分类</label>
                  <select
                    value={newProdData.category}
                    onChange={(e) => setNewProdData({ ...newProdData, category: e.target.value })}
                    required
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2"
                  >
                    <option value="">请选择分类</option>
                    {storeCategories.map(category => <option key={category.id} value={category.slug}>{category.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">批发底价 (€)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newProdData.wholesalePrice}
                    onChange={(e) => setNewProdData({ ...newProdData, wholesalePrice: Number(e.target.value) })}
                    required
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">建议零售价 (RRP €)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newProdData.rrpPrice}
                    onChange={(e) => setNewProdData({ ...newProdData, rrpPrice: Number(e.target.value) })}
                    required
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">出厂成本 (€ - 内部私密)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newProdData.costPrice}
                    onChange={(e) => setNewProdData({ ...newProdData, costPrice: Number(e.target.value) })}
                    required
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2"
                  />
                  <p className="mt-1 text-[10px] text-neutral-500">批发毛利估算 €{(newProdData.wholesalePrice - newProdData.costPrice).toFixed(2)} · {newProdData.wholesalePrice > 0 ? (((newProdData.wholesalePrice - newProdData.costPrice) / newProdData.wholesalePrice) * 100).toFixed(1) : '0.0'}%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">起订量 MOQ (件)</label>
                  <input
                    type="number"
                    value={newProdData.moq}
                    onChange={(e) => setNewProdData({ ...newProdData, moq: Number(e.target.value) })}
                    required
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">商品分类 / 展示区</label>
                  <select
                    value={newProdData.status === 'clearance' ? 'clearance' : newProdData.visibility === 'private' ? 'private' : 'public'}
                    onChange={(e) => {
                      const storefrontZone = e.target.value;
                      setNewProdData({
                        ...newProdData,
                        visibility: storefrontZone === 'private' ? 'private' : 'public',
                        status: storefrontZone === 'clearance' ? 'clearance' : 'new'
                      });
                    }}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2 font-medium"
                  >
                    <option value="public">✨ 新款区</option>
                    <option value="private">🔒 授权订货区</option>
                    <option value="clearance">🏷️ 特价区（倒货）</option>
                  </select>
                  <p className="mt-1 text-[11px] text-neutral-500">商品发布后会按展示区同步到商家端网店和买手端的本店页面，无需重复发布。</p>
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">面料材质与产地工艺</label>
                <input
                  type="text"
                  value={newProdData.fabric}
                  onChange={(e) => setNewProdData({ ...newProdData, fabric: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="merchant-new-product-description" className="font-semibold text-neutral-700">商品描述</label>
                  {productAiDescriptionDraft && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">GPTmoda 草稿 · 请核对</span>}
                </div>
                <textarea id="merchant-new-product-description" value={newProdData.description} onChange={event => { setProductAiDescriptionDraft(''); setNewProdData(previous => ({ ...previous, description: event.target.value })); }} maxLength={3000} rows={4} placeholder="描述剪裁、面料、版型与适用场景；仅填写已确认的商品信息。" className="mt-1.5 w-full resize-y rounded-lg border border-neutral-300 bg-neutral-50 p-3 text-xs outline-none focus:border-neutral-500 focus:bg-white" />
                <p className="mt-1 text-right text-[9px] text-neutral-400">{newProdData.description.length}/3000</p>
              </div>

              <SmartMediaUploader
                value={newProdData.media.length ? newProdData.media : newProdData.images.map((url, index) => ({ id: `image-${index}`, type: 'image' as const, url }))}
                onChange={media => setNewProdData(previous => ({ ...previous, media, images: media.filter(item => item.type === 'image').map(item => item.url) }))}
                isIt={isIt}
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsAddingProduct(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-100 font-medium cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-semibold cursor-pointer disabled:opacity-50"
                >
                  {savingProduct ? '发布中...' : '确认发布商品'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProductImages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs">
          <div className="my-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900">管理商品图片</h3>
                <p className="mt-1 text-xs text-neutral-500">{editingProductImages.styleNo} · {editingProductImages.name}</p>
              </div>
              <button type="button" onClick={() => setEditingProductImages(null)} className="p-1 text-neutral-400 hover:text-neutral-700">✕</button>
            </div>
            <div className="py-4">
              <SmartMediaUploader value={editingProductImages.media || editingProductImages.images.map((url, index) => ({ id: `legacy-${index}`, type: 'image' as const, url }))} maxItems={32} onChange={media => setEditingProductImages(previous => previous ? { ...previous, media, images: media.filter(item => item.type === 'image').map(item => item.url) } : previous)} isIt={isIt} />
              <p className="mt-3 rounded-lg bg-sky-50 p-3 text-xs leading-5 text-sky-800">第一张图片是商品主图。支持商品组图和 MP4/WebM 视频，拖拽可排序，删除后点击保存才会写入服务器。</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-neutral-200 pt-3">
              <button type="button" onClick={() => setEditingProductImages(null)} className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700">取消</button>
              <button type="button" disabled={savingProductImages || editingProductImages.images.length === 0} onClick={async () => {
                setSavingProductImages(true);
                try {
                  await updateProduct(editingProductImages.id, { images: editingProductImages.images, media: editingProductImages.media });
                  setEditingProductImages(null);
                  addNotification('success', '商品图片已保存', `${editingProductImages.images.length} 张图片已同步到服务器`);
                } catch (error) {
                  addNotification('warning', '图片保存失败', error instanceof Error ? error.message : '请稍后重试');
                } finally {
                  setSavingProductImages(false);
                }
              }} className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{savingProductImages ? '保存中...' : '保存图片变更'}</button>
            </div>
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs">
          <div className="my-8 w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div><h3 className="text-base font-bold text-neutral-900">编辑商品资料</h3><p className="mt-1 text-xs text-neutral-500">{editingProduct.styleNo} · 所有修改保存后立即同步店铺和商品分享页</p></div>
              <button type="button" onClick={() => setEditingProduct(null)} className="p-1 text-neutral-400 hover:text-neutral-700">✕</button>
            </div>
            <div className="grid grid-cols-1 gap-3 py-4 text-xs sm:grid-cols-2">
              <label className="font-semibold text-neutral-700">款号<input value={editingProduct.styleNo} onChange={event => setEditingProduct(previous => previous ? { ...previous, styleNo: event.target.value.toUpperCase() } : previous)} className="mt-1 w-full rounded-lg border border-neutral-300 p-2 font-normal" /></label>
              <label className="font-semibold text-neutral-700">商品名称<input value={editingProduct.name} onChange={event => setEditingProduct(previous => previous ? { ...previous, name: event.target.value } : previous)} className="mt-1 w-full rounded-lg border border-neutral-300 p-2 font-normal" /></label>
              <label className="font-semibold text-neutral-700">店铺分类<select value={editingProduct.category} onChange={event => setEditingProduct(previous => previous ? { ...previous, category: event.target.value } : previous)} className="mt-1 w-full rounded-lg border border-neutral-300 p-2 font-normal">{storeCategories.map(category => <option key={category.id} value={category.slug}>{category.name}</option>)}</select></label>
              <label className="font-semibold text-neutral-700">子分类<input value={editingProduct.subCategory} onChange={event => setEditingProduct(previous => previous ? { ...previous, subCategory: event.target.value } : previous)} className="mt-1 w-full rounded-lg border border-neutral-300 p-2 font-normal" /></label>
              <label className="font-semibold text-neutral-700">商品展示区<select value={getProductZone(editingProduct)} onChange={event => setEditingProduct(previous => {
                if (!previous) return previous;
                const zone = event.target.value as 'new' | 'clearance' | 'private';
                return {
                  ...previous,
                  ...getProductZoneUpdates(zone)
                };
              })} className="mt-1 w-full rounded-lg border border-neutral-300 p-2 font-normal"><option value="new">✨ 新款区</option><option value="clearance">🏷️ 特价区（倒货）</option><option value="private">🔒 授权订货区</option></select><span className="mt-1 block font-normal text-neutral-500">商品发布后会同步到商家端网店和买手端对应分区。</span></label>
              <label className="font-semibold text-neutral-700">批发价 (€)<input type="number" min="0.01" step="0.01" value={editingProduct.wholesalePrice} onChange={event => setEditingProduct(previous => previous ? { ...previous, wholesalePrice: Number(event.target.value) } : previous)} className="mt-1 w-full rounded-lg border border-neutral-300 p-2 font-normal" /></label>
              <label className="font-semibold text-neutral-700">建议零售价 (€)<input type="number" min="0.01" step="0.01" value={editingProduct.rrpPrice} onChange={event => setEditingProduct(previous => previous ? { ...previous, rrpPrice: Number(event.target.value) } : previous)} className="mt-1 w-full rounded-lg border border-neutral-300 p-2 font-normal" /></label>
              <label className="font-semibold text-neutral-700">单位成本 (€ · 仅商家内部)<input type="number" min="0" step="0.01" value={editingProduct.costPrice ?? 0} onChange={event => setEditingProduct(previous => previous ? { ...previous, costPrice: Number(event.target.value) } : previous)} className="mt-1 w-full rounded-lg border border-neutral-300 p-2 font-normal" /><span className="mt-1 block font-normal text-neutral-500">按批发价估算毛利 €{(editingProduct.wholesalePrice - (editingProduct.costPrice || 0)).toFixed(2)} · 毛利率 {editingProduct.wholesalePrice > 0 ? (((editingProduct.wholesalePrice - (editingProduct.costPrice || 0)) / editingProduct.wholesalePrice) * 100).toFixed(1) : '0.0'}%</span></label>
              <label className="font-semibold text-neutral-700">MOQ<input type="number" min="1" step="1" value={editingProduct.moq} onChange={event => setEditingProduct(previous => previous ? { ...previous, moq: Number(event.target.value) } : previous)} className="mt-1 w-full rounded-lg border border-neutral-300 p-2 font-normal" /></label>
              <label className="font-semibold text-neutral-700">箱规<input type="number" min="1" step="1" value={editingProduct.packSize} onChange={event => setEditingProduct(previous => previous ? { ...previous, packSize: Number(event.target.value) } : previous)} className="mt-1 w-full rounded-lg border border-neutral-300 p-2 font-normal" /></label>
              <label className="font-semibold text-neutral-700 sm:col-span-2">面料材质<input value={editingProduct.fabric} onChange={event => setEditingProduct(previous => previous ? { ...previous, fabric: event.target.value } : previous)} className="mt-1 w-full rounded-lg border border-neutral-300 p-2 font-normal" /></label>
              <label className="font-semibold text-neutral-700 sm:col-span-2">商品描述<textarea rows={4} value={editingProduct.description} onChange={event => setEditingProduct(previous => previous ? { ...previous, description: event.target.value } : previous)} className="mt-1 w-full rounded-lg border border-neutral-300 p-2 font-normal" /></label>
              <div className="sm:col-span-2"><div className="mb-1 font-semibold text-neutral-700">商品媒体</div><SmartMediaUploader value={editingProduct.media || editingProduct.images.map((url, index) => ({ id: `legacy-${index}`, type: 'image' as const, url }))} maxItems={32} onChange={media => setEditingProduct(previous => previous ? { ...previous, media, images: media.filter(item => item.type === 'image').map(item => item.url) } : previous)} isIt={isIt} /></div>
            </div>
            <div className="flex justify-end gap-2 border-t border-neutral-200 pt-3">
              <button type="button" onClick={() => setEditingProduct(null)} className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700">取消</button>
              <button type="button" disabled={savingProduct || !editingProduct.name.trim() || !editingProduct.styleNo.trim() || editingProduct.images.length === 0} onClick={async () => {
                setSavingProduct(true);
                try {
                  await updateProduct(editingProduct.id, {
                    styleNo: editingProduct.styleNo.trim().toUpperCase(),
                    name: editingProduct.name.trim(),
                    category: editingProduct.category,
                    subCategory: editingProduct.subCategory,
                    status: editingProduct.status,
                    wholesalePrice: Number(editingProduct.wholesalePrice),
                    rrpPrice: Number(editingProduct.rrpPrice),
                    costPrice: Number(editingProduct.costPrice || 0),
                    moq: Number(editingProduct.moq),
                    packSize: Number(editingProduct.packSize),
                    visibility: editingProduct.visibility,
                    isExclusiveProtected: editingProduct.visibility === 'private',
                    fabric: editingProduct.fabric,
                    description: editingProduct.description,
                    images: editingProduct.images
                  });
                  setEditingProduct(null);
                  addNotification('success', '商品资料已保存', '商品详情、图片和分享页已同步更新');
                } catch (error) {
                  addNotification('warning', '商品保存失败', error instanceof Error ? error.message : '请检查填写内容后重试');
                } finally {
                  setSavingProduct(false);
                }
              }} className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{savingProduct ? '保存中...' : '保存全部修改'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: 订单配货发货 (FULFILLMENT MODAL) */}
      {/* ======================================================== */}
      {selectedOrderForFulfill && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-base font-bold text-neutral-900">
                订单配货发货 · {selectedOrderForFulfill.orderNo}
              </h3>
              <button 
                onClick={() => setSelectedOrderForFulfill(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFulfillSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
                <div className="font-bold text-neutral-900">收件客户: {selectedOrderForFulfill.companyName}</div>
                <div className="text-neutral-600">
                  收件地址: {selectedOrderForFulfill.shippingAddress?.street}, {selectedOrderForFulfill.shippingAddress?.city} ({selectedOrderForFulfill.shippingAddress?.country})
                </div>
                <div className="text-neutral-600">订购件数: {selectedOrderForFulfill.totalQty} 件 · 金额: €{selectedOrderForFulfill.totalAmount.toFixed(2)}</div>
                <div className="pt-1 font-semibold text-amber-700">
                  当前状态：{selectedOrderForFulfill.status === 'placed' || selectedOrderForFulfill.status === 'pending'
                    ? '待确认，将推进为已确认'
                    : selectedOrderForFulfill.status === 'confirmed'
                      ? '已确认，将进入配货'
                      : selectedOrderForFulfill.status === 'picking'
                        ? '配货中，将创建发货包裹'
                        : selectedOrderForFulfill.status}
                </div>
              </div>

              {selectedOrderForFulfill.status === 'picking' && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                  <div className="font-semibold">多包裹履约</div>
                  {fulfillShipmentsLoading ? (
                    <div className="mt-1 text-blue-700">正在读取历史包裹...</div>
                  ) : fulfillShipments.length === 0 ? (
                    <div className="mt-1 text-blue-700">尚未创建包裹，本次将按订单剩余数量创建第一个包裹。</div>
                  ) : (
                    <div className="mt-1 space-y-1">
                      <div>已创建 {fulfillShipments.length} 个包裹：</div>
                      {fulfillShipments.map(shipment => (
                        <div key={shipment.id} className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                          <span>{shipment.shipmentNo} · {shipment.status}</span>
                          <span>{shipment.carrier || '-'} · {shipment.trackingNumber || '无单号'}</span>
                          <span className="flex gap-1">
                            <button type="button" onClick={() => void loadTrackingEvents(shipment.id)} className="rounded bg-sky-100 px-2 py-1 font-sans font-semibold text-sky-700">轨迹</button>
                            {shipment.status === 'shipped' && (
                              <button type="button" onClick={() => void updateShipmentStatus(shipment, 'exception')} className="rounded bg-rose-100 px-2 py-1 font-sans font-semibold text-rose-700">标记异常</button>
                            )}
                            {shipment.status === 'exception' && (
                              <button type="button" onClick={() => void updateShipmentStatus(shipment, 'shipped')} className="rounded bg-emerald-100 px-2 py-1 font-sans font-semibold text-emerald-700">恢复发货</button>
                            )}
                            {shipment.status !== 'delivered' && shipment.status !== 'cancelled' && (
                              <button type="button" onClick={() => void updateShipmentStatus(shipment, 'cancelled')} className="rounded bg-neutral-200 px-2 py-1 font-sans font-semibold text-neutral-700">取消包裹</button>
                            )}
                          </span>
                        </div>
                      ))}
                    {trackingShipmentId && (
                      <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-2 font-sans">
                        <div className="mb-2 font-semibold text-neutral-800">物流轨迹</div>
                        <div className="space-y-1">
                          {trackingEvents.length === 0 ? <div className="text-neutral-500">暂无轨迹，请录入承运商更新。</div> : trackingEvents.map(event => (
                            <div key={event.id} className="border-b border-neutral-100 pb-1 text-[11px]">
                              <div className="flex justify-between font-semibold"><span>{event.status}</span><span>{new Date(event.occurredAt).toLocaleString()}</span></div>
                              <div className="text-neutral-500">{event.location || '未填写地点'} · {event.description || '无备注'}</div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                          <input value={trackingEventForm.status} onChange={event => setTrackingEventForm(previous => ({ ...previous, status: event.target.value }))} placeholder="状态" className="rounded border border-neutral-300 px-2 py-1 text-[11px]" />
                          <input value={trackingEventForm.location} onChange={event => setTrackingEventForm(previous => ({ ...previous, location: event.target.value }))} placeholder="地点" className="rounded border border-neutral-300 px-2 py-1 text-[11px]" />
                          <input value={trackingEventForm.description} onChange={event => setTrackingEventForm(previous => ({ ...previous, description: event.target.value }))} placeholder="备注" className="rounded border border-neutral-300 px-2 py-1 text-[11px]" />
                        </div>
                        <button type="button" onClick={() => void addTrackingEvent()} className="mt-2 rounded bg-neutral-900 px-2 py-1 text-[11px] font-semibold text-white">保存轨迹</button>
                      </div>
                    )}
                    </div>
                  )}
                </div>
              )}

              {selectedOrderForFulfill.status === 'picking' && <div>
                <label className="font-semibold text-neutral-700 block mb-1">物流承运商 (Carrier)</label>
                <select
                  value={fulfillCarrier}
                  onChange={(e) => setFulfillCarrier(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2.5 font-medium"
                >
                  <option value="DHL Express Europe">DHL Express Europe (全欧48h空运航空件)</option>
                  <option value="UPS Standard">UPS Standard (欧洲公路专线卡航)</option>
                  <option value="GLS Italy / Euroba">GLS Italy (意大利与欧陆干线)</option>
                  <option value="TNT Fedex">TNT / FedEx International</option>
                  <option value="Showroom Pickup">客户 Mestre / Milano 展厅自提</option>
                </select>
              </div>}

              {selectedOrderForFulfill.status === 'picking' && <div>
                <label className="font-semibold text-neutral-700 block mb-1">国际物流单号 (Waybill / Tracking No.)</label>
                <input
                  type="text"
                  value={fulfillTracking}
                  onChange={(e) => setFulfillTracking(e.target.value)}
                  required
                  placeholder="例如：IT-DHL-928174619X"
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2.5 font-mono"
                />
              </div>}

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">装箱打标附言 (Packing Slip Notes)</label>
                <input
                  type="text"
                  value={fulfillNotes}
                  onChange={(e) => setFulfillNotes(e.target.value)}
                  placeholder="例如：已附官方吊牌与原产地溯源码，外箱打气柱保护"
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2.5"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForFulfill(null)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-100 font-medium cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5" />
                  {selectedOrderForFulfill.status === 'placed' || selectedOrderForFulfill.status === 'pending'
                    ? '确认订单'
                    : selectedOrderForFulfill.status === 'confirmed'
                      ? '开始配货'
                      : '创建包裹并通知买手'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: 创建调拨单 (TRANSFER MODAL) */}
      {/* ======================================================== */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-base font-bold text-neutral-900">发起多仓调拨单 (TR-000xxx)</h3>
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">调拨款式 (Style)</label>
                <select
                  value={transferData.styleNo}
                  onChange={(e) => setTransferData({ ...transferData, styleNo: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2.5"
                >
                  {merchantProducts.map(p => (
                    <option key={p.id} value={p.styleNo}>{p.styleNo} - {p.name.slice(0, 20)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">调出仓库 (From)</label>
                  <select
                    value={transferData.fromLocation}
                    onChange={(e) => setTransferData({ ...transferData, fromLocation: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2.5 font-medium"
                  >
                    <option value="central">Prato 主仓枢纽</option>
                    <option value="central">RUDA 总仓</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">调入仓库 (To)</label>
                  <select
                    value={transferData.toLocation}
                    onChange={(e) => setTransferData({ ...transferData, toLocation: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2.5 font-medium"
                  >
                    <option value="central">RUDA 总仓</option>
                    <option value="central">Prato 主仓中心</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">调拨数量 (件)</label>
                <input
                  type="number"
                  value={transferData.quantity}
                  onChange={(e) => setTransferData({ ...transferData, quantity: Number(e.target.value) })}
                  required
                  min="1"
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">调拨原因说明</label>
                <input
                  type="text"
                  value={transferData.notes}
                  onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                  placeholder="例如：补充展厅现货，应对订货会拿样"
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-lg p-2.5"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-100 font-medium cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" /> 提交调拨单
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
    {assistantPanelOpen && (
      <aside className={`merchant-web-assistant fixed inset-y-14 right-0 z-40 flex ${assistantPanelExpanded ? 'left-0 w-screen lg:left-[192px] lg:w-auto' : 'w-[min(360px,94vw)]'} flex-col border-l border-neutral-200 bg-white shadow-2xl ${assistantPanelExpanded ? 'lg:fixed lg:right-0 lg:top-14 lg:z-[60] lg:h-[calc(100vh-3.5rem)] lg:shadow-xl' : 'lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-auto lg:shadow-none'}`}>
        <div className="relative flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-3">
          <div className="relative min-w-0">
            <button type="button" aria-expanded={assistantConversationMenuOpen} onClick={() => { setAssistantConversationMenuOpen(open => !open); setAssistantSettingsOpen(false); }} className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-100">
              <span className="max-w-44 truncate">{assistantConversationId ? assistantConversations.find(conversation => conversation.id === assistantConversationId)?.title || (isIt ? 'Conversazione' : '对话') : (localizeCopy('新对话', 'Nuova conversazione'))}</span><ChevronDown className="h-3.5 w-3.5 text-neutral-500" />
            </button>
            {assistantConversationMenuOpen && (
              <div className="absolute left-0 top-11 z-50 w-72 overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 text-xs shadow-xl">
                <button type="button" disabled={assistantBusy} onClick={startNewAssistantConversation} className="w-full rounded-lg px-2.5 py-2 text-left font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50">{localizeCopy('开始新对话', 'Inizia una nuova conversazione')}</button>
                <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold text-neutral-500">{localizeCopy('最近对话', 'Conversazioni recenti')}</p>
                <div className="max-h-64 space-y-0.5 overflow-y-auto">
                  {assistantConversations.length ? assistantConversations.slice(0, 12).map(conversation => (
                    <div key={conversation.id} className="flex items-center gap-1 rounded-lg hover:bg-neutral-50">
                      <button type="button" disabled={assistantBusy} onClick={() => void openAssistantConversation(conversation.id)} className="min-w-0 flex-1 px-2.5 py-2 text-left disabled:opacity-50">
                        <span className="block truncate font-medium text-neutral-800">{conversation.title}</span>
                        <span className="mt-0.5 block text-[9px] text-neutral-400">{new Date(conversation.updatedAt).toLocaleString(getIntlLocale(lang), { dateStyle: 'short', timeStyle: 'short' })} · {conversation.messageCount}</span>
                      </button>
                      <button type="button" disabled={assistantBusy} aria-label={localizeCopy('删除对话', 'Elimina conversazione')} onClick={() => void deleteAssistantConversation(conversation.id)} className="mr-1 rounded-md p-2 text-neutral-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )) : <p className="px-2.5 py-3 text-[10px] leading-4 text-neutral-400">{localizeCopy('还没有保存的对话。', 'Nessuna conversazione salvata.')}</p>}
                </div>
                <p className="px-2.5 pb-1 pt-2 text-[9px] leading-4 text-neutral-400">{localizeCopy('对话仅对当前商户账号及员工本人可见。', 'Le conversazioni sono private per il tuo account del negozio.')}</p>
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center">
            <button type="button" aria-label={localizeCopy('助手设置', 'Impostazioni assistente')} aria-expanded={assistantSettingsOpen} onClick={() => { setAssistantSettingsOpen(open => !open); setAssistantConversationMenuOpen(false); setAssistantPromptMenuOpen(false); }} className={`rounded-md p-2 hover:bg-neutral-100 ${assistantUsesPageContext ? 'text-neutral-600' : 'text-neutral-400'}`}><SlidersHorizontal className="h-4 w-4" /></button>
            {assistantSettingsOpen && (
              <div className="absolute right-12 top-12 z-50 w-72 rounded-xl border border-neutral-200 bg-white p-3 text-xs shadow-xl">
                <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 hover:bg-neutral-50">
                  <input type="checkbox" checked={assistantUsesPageContext} onChange={event => setAssistantUsesPageContext(event.target.checked)} className="mt-0.5 accent-neutral-900" />
                  <span><strong className="block text-neutral-800">{localizeCopy('使用当前页面作为上下文', 'Usa la pagina corrente come contesto')}</strong><span className="mt-1 block text-[10px] leading-4 text-neutral-500">{localizeCopy("当前：{{RUDA_ARG_0}}{{RUDA_ARG_1}}。数据仍受账号权限限制。", "Pagina: {{RUDA_ARG_0}}{{RUDA_ARG_1}}. I dati restano limitati ai permessi dell’account.", [String(assistantContextLabel), String(assistantScopeLabel ? ` · ${assistantScopeLabel}` : '')])}</span></span>
                </label>
                <p className="px-2 pt-1 text-[9px] leading-4 text-neutral-400">{localizeCopy('助手会获得当前模块标识，不会自动读取屏幕上未加载的所有内容。', 'L’assistente non vede automaticamente ogni dettaglio dello schermo.')}</p>
                <div className="mt-2 border-t border-neutral-100 pt-2">
                  <p className="px-2 text-[10px] font-semibold text-neutral-700">{localizeCopy('助手记忆与偏好', 'Preferenze da ricordare')}</p>
                  <p className="px-2 pt-1 text-[9px] leading-4 text-neutral-500">{localizeCopy('手动保存回答风格或工作偏好；不要保存密码、账户号等敏感资料。', 'Salva istruzioni di stile, non dati aziendali riservati.')}</p>
                  <form onSubmit={event => void saveAssistantMemory(event)} className="mt-2 flex gap-1.5">
                    <input value={assistantMemoryDraft} onChange={event => setAssistantMemoryDraft(event.target.value)} maxLength={500} placeholder={localizeCopy('例如：优先用简体中文、回答简洁', 'Es. Rispondi in modo conciso')} className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-2 py-2 text-[10px] outline-none focus:border-neutral-500" />
                    <button type="submit" disabled={assistantMemorySaving || !assistantMemoryDraft.trim()} className="rounded-lg bg-neutral-900 px-2.5 text-[10px] font-semibold text-white disabled:opacity-40">{assistantMemorySaving ? '…' : localizeCopy('记住', 'Salva')}</button>
                  </form>
                  <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                    {assistantMemoriesLoading
                      ? <p className="px-2 py-2 text-[9px] text-neutral-400">{localizeCopy('正在读取记忆…', 'Caricamento…')}</p>
                      : assistantMemories.length
                        ? assistantMemories.map(memory => <div key={memory.id} className="flex items-start gap-1 rounded-lg bg-neutral-50 px-2 py-1.5"><span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[9px] leading-4 text-neutral-600">{memory.content}</span><button type="button" aria-label={localizeCopy('删除偏好', 'Elimina preferenza')} onClick={() => void deleteAssistantMemory(memory.id)} className="shrink-0 rounded p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-3 w-3" /></button></div>)
                        : <p className="px-2 py-2 text-[9px] text-neutral-400">{localizeCopy('暂无保存的偏好。', 'Nessuna preferenza salvata.')}</p>}
                  </div>
                </div>
              </div>
            )}
            <button type="button" aria-label={assistantPanelExpanded ? (localizeCopy('收窄助手面板', 'Riduci pannello')) : (localizeCopy('展开助手面板', 'Espandi pannello'))} onClick={() => setAssistantPanelExpanded(expanded => !expanded)} className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100">{assistantPanelExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
            <button type="button" aria-label={localizeCopy('关闭助手面板', 'Chiudi assistente')} onClick={() => { setAssistantPanelOpen(false); setAssistantPanelExpanded(false); setAssistantConversationMenuOpen(false); setAssistantSettingsOpen(false); setAssistantPromptMenuOpen(false); }} className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!assistantHistory.length ? (
            <div className="flex min-h-full flex-col items-center justify-center px-6 pb-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-800"><Sparkles className="h-6 w-6" /></span>
              <h2 className="mt-4 text-base font-semibold text-neutral-800">{localizeCopy('我们从哪里开始？', 'Da dove iniziamo?')}</h2>
              <p className="mt-2 max-w-sm text-xs leading-5 text-neutral-500">{isIt ? `Chiedimi qualcosa su ${assistantContextLabel.toLowerCase()}, oppure descrivi il risultato che vuoi ottenere.` : `可以问我“${assistantContextLabel}”相关问题，也可以直接说你想达成什么目标。`}</p>
            </div>
          ) : (
            <div className={`space-y-5 px-4 py-5 ${assistantPanelExpanded ? 'mx-auto w-full max-w-3xl sm:px-8 sm:py-8' : ''}`}>
              {assistantHistory.map((turn, index) => (
                <div key={`${index}-${turn.role}`} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[94%] ${turn.role === 'assistant' && assistantPanelExpanded ? 'w-full max-w-none' : ''}`}>
                    <div className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 ${assistantPanelExpanded ? 'text-sm leading-7' : 'text-xs leading-5'} ${turn.role === 'user' ? 'bg-neutral-100 text-neutral-800' : 'text-neutral-700'}`}>{turn.text}</div>
                    {turn.role === 'assistant' && turn.product && (
                      <div className="mt-2 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                        <div className="flex gap-3 p-2.5">
                          {turn.product.image && <img src={turn.product.image} alt={turn.product.name} className="h-24 w-20 shrink-0 rounded-lg bg-neutral-100 object-cover" />}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-neutral-900">{turn.product.name}</p>
                            <p className="mt-0.5 text-[10px] text-neutral-500">款号 {turn.product.styleNo}</p>
                            <p className="mt-2 text-base font-bold text-neutral-950">€{turn.product.wholesalePrice.toFixed(2)}</p>
                            <p className="text-[10px] text-neutral-500">建议零售价 €{turn.product.rrpPrice.toFixed(2)}</p>
                            <p className="mt-1 text-[10px] text-neutral-500">起订 {turn.product.moq} 件 · {turn.product.packSize} 件/箱</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => turn.product && openAssistantProduct(turn.product.id)} className="flex w-full items-center justify-center gap-1.5 border-t border-neutral-100 bg-neutral-50 px-3 py-2 text-[10px] font-semibold text-neutral-700 hover:bg-emerald-50 hover:text-emerald-800">
                          <Package className="h-3.5 w-3.5" />查看并定位商品
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {assistantBusy && <div role="status" className="text-xs text-neutral-500">{localizeCopy('正在读取有权限的数据并分析…', 'Sto controllando i dati accessibili…')}</div>}
              {assistantAnswer?.dataBasis?.length ? <p className="rounded-lg bg-neutral-50 px-3 py-2 text-[10px] leading-4 text-neutral-500">{localizeCopy('数据依据：', 'Fonte dati: ')}{assistantAnswer.dataBasis.join(' · ')}</p> : null}
              {assistantAnswer?.summary?.gmv30d !== undefined && (
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-neutral-200 p-3 text-[10px]">
                  <div><span className="text-neutral-500">{assistantAnswer.summary.periodLabel || (isIt ? 'Periodo' : '所选期间')} GMV</span><strong className="mt-1 block text-xs text-neutral-900">€{assistantAnswer.summary.gmv30d.toFixed(2)}</strong></div>
                  {assistantAnswer.summary.averageOrderValue !== undefined && <div><span className="text-neutral-500">{localizeCopy('平均客单价', 'Valore medio ordine')}</span><strong className="mt-1 block text-xs text-neutral-900">€{assistantAnswer.summary.averageOrderValue.toFixed(2)}</strong></div>}
                  {assistantAnswer.summary.gmvTrend !== undefined && <div><span className="text-neutral-500">{localizeCopy('较上一期间', 'Variazione periodo')}</span><strong className="mt-1 block text-xs text-neutral-900">{assistantAnswer.summary.gmvTrend > 0 ? '+' : ''}{assistantAnswer.summary.gmvTrend}%</strong></div>}
                  {assistantAnswer.summary.topSellingSkus?.length ? <div className="col-span-2 border-t border-neutral-100 pt-2"><span className="text-neutral-500">{localizeCopy('热销 SKU', 'SKU più venduti')}</span><strong className="mt-1 block text-xs text-neutral-900">{assistantAnswer.summary.topSellingSkus.slice(0, 3).map(([sku, quantity]) => `${sku} (${quantity})`).join(' · ')}</strong></div> : null}
                </div>
              )}
              {assistantAnswer?.summary && (
                <div className="grid grid-cols-2 gap-2">
                  {([
                    [localizeCopy('待处理订单', 'Ordini da gestire'), assistantAnswer.summary.pendingOrders],
                    [localizeCopy('缺货 SKU', 'SKU esauriti'), assistantAnswer.summary.stockouts],
                    [localizeCopy('未完成工单', 'Lavori di produzione'), assistantAnswer.summary.openWorkOrders],
                    [localizeCopy('逾期工单', 'Lavori in ritardo'), assistantAnswer.summary.overdueWorkOrders],
                    [localizeCopy('待处理退货', 'Resi in attesa'), assistantAnswer.summary.pendingReturns],
                    [localizeCopy('待处理调拨', 'Trasferimenti in attesa'), assistantAnswer.summary.pendingTransfers],
                    [localizeCopy('商品数', 'Prodotti'), assistantAnswer.summary.products],
                    [localizeCopy('客户数', 'Clienti'), assistantAnswer.summary.customers],
                    [localizeCopy('待审私密商品', 'Richieste private'), assistantAnswer.summary.pendingVaultRequests],
                    [localizeCopy('待结算批次', 'Pagamenti in attesa'), assistantAnswer.summary.pendingPayouts]
                  ] as Array<[string, number | undefined]>).filter(([, value]) => value !== undefined).map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-neutral-50 px-3 py-2"><span className="block text-[9px] text-neutral-500">{label}</span><strong className="mt-0.5 block text-xs text-neutral-800">{value}</strong></div>
                  ))}
                </div>
              )}
              {assistantAnswer?.actions.length ? <div><div className="flex flex-wrap gap-2">{assistantAnswer.actions.map(action => <button type="button" key={action.target} onClick={() => setActiveTab(action.target)} className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[10px] font-semibold text-neutral-700 hover:border-emerald-300 hover:bg-emerald-50">{action.label}</button>)}</div><p className="mt-1.5 text-[9px] text-neutral-400">{localizeCopy('按钮只会打开对应页面，不会自动应用或保存更改。', 'Il pulsante apre la sezione; non applica modifiche.')}</p></div> : null}
              <div ref={assistantMessagesEndRef} />
            </div>
          )}
        </div>
        <div className="relative shrink-0 bg-gradient-to-t from-white via-white to-white/90 px-3 pb-3 pt-2">
          {assistantPromptMenuOpen && (
            <div className="absolute bottom-[4.5rem] left-3 z-50 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-neutral-200 bg-white p-2 shadow-xl">
              <p className="px-2 py-1.5 text-[10px] font-semibold text-neutral-500">{isIt ? 'Esempi per questa pagina' : `关于“${assistantContextLabel}”的示例问题`}</p>
              {assistantSuggestions.map(question => <button type="button" key={question} disabled={assistantBusy} onClick={() => { setAssistantPromptMenuOpen(false); void askOperatingAssistant(question); }} className="block w-full rounded-lg px-2 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">{question}</button>)}
            </div>
          )}
          <form onSubmit={event => { event.preventDefault(); void askOperatingAssistant(assistantQuestion); }} className={`flex items-end gap-2 rounded-xl border border-neutral-200 bg-white px-2 py-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] focus-within:border-neutral-400 ${assistantPanelExpanded ? 'mx-auto w-full max-w-3xl' : ''}`}>
            <button type="button" aria-label={localizeCopy('查看示例问题', 'Mostra esempi di domande')} aria-expanded={assistantPromptMenuOpen} onClick={() => { setAssistantPromptMenuOpen(open => !open); setAssistantSettingsOpen(false); setAssistantConversationMenuOpen(false); }} className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100"><Plus className="h-4 w-4" /></button>
            <textarea
              aria-label={localizeCopy('与 GPTmoda 协作', 'Collabora con GPTmoda')}
              value={assistantQuestion}
              onChange={event => setAssistantQuestion(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void askOperatingAssistant(assistantQuestion); } }}
              rows={1}
              placeholder={localizeCopy('与 GPTmoda 协作', 'Collabora con GPTmoda')}
              className="max-h-28 min-h-8 min-w-0 flex-1 resize-y border-0 bg-transparent px-1 py-1.5 text-xs text-neutral-900 outline-none focus:ring-0"
            />
            <button type="submit" aria-label={localizeCopy('发送消息', 'Invia messaggio')} disabled={assistantBusy || !assistantQuestion.trim()} className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40">{assistantBusy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-4 w-4" />}</button>
          </form>
          <p className="mt-2 text-center text-[9px] text-neutral-400">{localizeCopy('助手可能出错；经营数据请核对，具体修改请在业务页面确认。', 'Verifica i dati; le modifiche vanno confermate nelle pagine operative.')}</p>
        </div>
      </aside>
    )}
    </div>
  );
};

const CustomerEditorModal: React.FC<{
  title: string;
  form: { companyName: string; contactPerson: string; email: string; vatNumber: string; address: string; city: string; country: string; phone: string; businessType: string; merchantNotes: string; merchantTags: string };
  busy: boolean;
  onChange: React.Dispatch<React.SetStateAction<{ companyName: string; contactPerson: string; email: string; vatNumber: string; address: string; city: string; country: string; phone: string; businessType: string; merchantNotes: string; merchantTags: string }>>;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
}> = ({ title, form, busy, onChange, onSubmit, onClose }) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-neutral-950/50 p-4 backdrop-blur-sm">
    <form onSubmit={onSubmit} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between border-b border-neutral-100 pb-4"><div><h3 className="text-lg font-bold text-neutral-950">{title}</h3><p className="mt-1 text-xs text-neutral-500">资料会同步到商家后台和手机端 App。</p></div><button type="button" onClick={onClose} className="text-xl text-neutral-400">×</button></div>
      <div className="mt-5 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
        {([['companyName', '公司名称', true], ['contactPerson', '联系人', true], ['email', '联系邮箱', true], ['vatNumber', 'VAT / P.IVA', true], ['phone', '联系电话', true], ['city', '城市', true], ['country', '国家', true], ['address', '公司地址', true]] as const).map(([key, label, required]) => <label key={key} className={`font-semibold text-neutral-700 ${key === 'address' ? 'sm:col-span-2' : ''}`}>{label}<input required={required} value={form[key]} onChange={event => onChange(previous => ({ ...previous, [key]: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 font-normal outline-none focus:border-neutral-900" /></label>)}
        <label className="font-semibold text-neutral-700">经营类型<select value={form.businessType} onChange={event => onChange(previous => ({ ...previous, businessType: event.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 font-normal"><option>Boutique</option><option>Retail Store</option><option>Online Store</option><option>Distributor</option><option>Other</option></select></label>
        <label className="font-semibold text-neutral-700">商家私有标签（逗号分隔）<input maxLength={1000} value={form.merchantTags} onChange={event => onChange(previous => ({ ...previous, merchantTags: event.target.value }))} placeholder="例如：VIP, 重点跟进" className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 font-normal outline-none focus:border-neutral-900" /></label>
        <label className="font-semibold text-neutral-700 sm:col-span-2">内部备注<textarea maxLength={2000} rows={3} value={form.merchantNotes} onChange={event => onChange(previous => ({ ...previous, merchantNotes: event.target.value }))} placeholder="仅当前商家可见，不会发送给客户。" className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 font-normal outline-none focus:border-neutral-900" /></label>
      </div>
      <div className="mt-6 flex justify-end gap-2 border-t border-neutral-100 pt-4"><button type="button" onClick={onClose} className="rounded-lg border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700">取消</button><button type="submit" disabled={busy} className="rounded-lg bg-neutral-950 px-5 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? '保存中...' : '保存客户资料'}</button></div>
    </form>
  </div>
);
