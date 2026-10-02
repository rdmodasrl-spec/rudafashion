import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BarChart3, Check, Copy, ExternalLink, Megaphone, RefreshCw, Sparkles, Target, Users, X } from 'lucide-react';
import { Order, Product } from '../../types/b2b';
import { useB2B } from '../../context/B2BContext';


export type GrowthSection = 'overview' | 'autopilot' | 'campaigns';
type GrowthChannel = 'email' | 'instagram' | 'facebook' | 'google_ads' | 'whatsapp';
type GrowthPermission = 'approval_required' | 'draft_only';
type GrowthCustomer = {
  id: string;
  companyName: string;
  country: string;
  status: string;
  registrationDate?: string;
  createdAt?: string;
};
type GrowthTactic = {
  id: string;
  title: string;
  objective: string;
  audience: string;
  channel: GrowthChannel;
  productId?: string;
  status: 'pending' | 'prepared' | 'dismissed';
  createdAt: string;
};
type GrowthCampaign = {
  id: string;
  name: string;
  objective: string;
  audience: string;
  channel: GrowthChannel;
  copy: string;
  landingUrl: string;
  status: 'draft';
  createdAt: string;
};
type GrowthPreferences = {
  channels: GrowthChannel[];
  permission: GrowthPermission;
  market: string;
  language: 'zh' | 'it' | 'en';
};
type WorkspaceSnapshot = {
  preferences: GrowthPreferences;
  tactics: GrowthTactic[];
  campaigns: GrowthCampaign[];
};

const storageKey = (merchantId: string) => `ruda-merchant-growth:${merchantId}`;
const defaultPreferences: GrowthPreferences = {
  channels: [],
  permission: 'approval_required',
  market: 'Italy',
  language: 'zh'
};
const availableChannels: Array<{ id: GrowthChannel; label: string }> = [
  { id: 'email', label: 'Email' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'google_ads', label: 'Google Ads' },
  { id: 'whatsapp', label: 'WhatsApp' }
];
const emptySnapshot: WorkspaceSnapshot = { preferences: defaultPreferences, tactics: [], campaigns: [] };
const isChannel = (value: unknown): value is GrowthChannel => availableChannels.some(channel => channel.id === value);
const parseSnapshot = (value: unknown): WorkspaceSnapshot => {
  if (!value || typeof value !== 'object') return emptySnapshot;
  const record = value as Partial<WorkspaceSnapshot>;
  const preferences = record.preferences && typeof record.preferences === 'object'
    ? record.preferences as Partial<GrowthPreferences>
    : {};
  return {
    preferences: {
      channels: Array.isArray(preferences.channels) ? [...new Set(preferences.channels.filter(isChannel))] : [],
      permission: preferences.permission === 'draft_only' ? 'draft_only' : 'approval_required',
      market: typeof preferences.market === 'string' ? preferences.market.slice(0, 80) : 'Italy',
      language: preferences.language === 'it' || preferences.language === 'en' ? preferences.language : 'zh'
    },
    tactics: Array.isArray(record.tactics) ? record.tactics.filter((item): item is GrowthTactic =>
      Boolean(item && typeof item === 'object'
        && typeof item.id === 'string' && typeof item.title === 'string'
        && typeof item.objective === 'string' && typeof item.audience === 'string'
        && isChannel(item.channel)
        && ['pending', 'prepared', 'dismissed'].includes(item.status)
        && typeof item.createdAt === 'string')
    ).slice(0, 50) : [],
    campaigns: Array.isArray(record.campaigns) ? record.campaigns.filter((item): item is GrowthCampaign =>
      Boolean(item && typeof item === 'object'
        && typeof item.id === 'string' && typeof item.name === 'string'
        && typeof item.objective === 'string' && typeof item.audience === 'string'
        && isChannel(item.channel) && typeof item.copy === 'string'
        && typeof item.landingUrl === 'string' && typeof item.createdAt === 'string'
        && item.status === 'draft')
    ).slice(0, 100) : []
  };
};

export const MerchantGrowthWorkspace: React.FC<{
  merchantId: string;
  merchantName: string;
  merchantSharePath: string;
  products: Product[];
  orders: Order[];
  customers: GrowthCustomer[];
  isIt: boolean;
  section: GrowthSection;
  onSectionChange: (section: GrowthSection) => void;
  generateCopy: (prompt: string) => Promise<string | null>;
  addNotification: (type: 'success' | 'warning' | 'info', title: string, message: string) => void;
}> = ({ merchantId, merchantName, merchantSharePath, products, orders, customers, isIt, section, onSectionChange, generateCopy, addNotification }) => {
  const { localizeCopy } = useB2B();
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(emptySnapshot);
  const [preferences, setPreferences] = useState<GrowthPreferences>(defaultPreferences);
  const [query, setQuery] = useState('');
  const [strategyBusy, setStrategyBusy] = useState(false);
  const [copyBusy, setCopyBusy] = useState(false);
  const [copyDraft, setCopyDraft] = useState('');
  const [editingTacticId, setEditingTacticId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('');
  const [campaignAudience, setCampaignAudience] = useState('');
  const [campaignChannel, setCampaignChannel] = useState<GrowthChannel>('email');
  const [campaignProductId, setCampaignProductId] = useState('');
  const [utmSource, setUtmSource] = useState('merchant');
  const [utmMedium, setUtmMedium] = useState('email');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey(merchantId));
      const loaded = stored ? parseSnapshot(JSON.parse(stored)) : emptySnapshot;
      setSnapshot(loaded);
      setPreferences(loaded.preferences);
    } catch (error) {
      setSnapshot(emptySnapshot);
      setPreferences(defaultPreferences);
      addNotification('warning', '增长数据读取失败', '请刷新页面重试；已保存的内容未被修改。');
    }
  }, [merchantId, addNotification]);

  const persist = (next: WorkspaceSnapshot) => {
    try {
      window.localStorage.setItem(storageKey(merchantId), JSON.stringify(next));
      setSnapshot(next);
      setPreferences(next.preferences);
      return true;
    } catch (error) {
      addNotification('warning', '增长内容保存失败', '设备可用空间不足，请清理空间后重试。');
      return false;
    }
  };

  const daysAgo = (value?: string) => {
    const timestamp = value ? new Date(value).getTime() : Number.NaN;
    return Number.isFinite(timestamp) ? (Date.now() - timestamp) / 86_400_000 : Number.POSITIVE_INFINITY;
  };
  const orders30d = orders.filter(order => daysAgo(order.createdAt || order.date) <= 30);
  const ordersPrevious30d = orders.filter(order => {
    const age = daysAgo(order.createdAt || order.date);
    return age > 30 && age <= 60;
  });
  const sales30d = orders30d.reduce((sum, order) => sum + order.totalAmount, 0);
  const previousSales30d = ordersPrevious30d.reduce((sum, order) => sum + order.totalAmount, 0);
  const averageOrderValue = orders30d.length ? sales30d / orders30d.length : 0;
  const returningCustomers = new Set(orders.map(order => order.customerId)).size;
  const recentCustomers = customers.filter(customer => daysAgo(customer.registrationDate || customer.createdAt) <= 30).length;
  const topProduct = useMemo(() => {
    const sales = new Map<string, number>();
    orders30d.forEach(order => order.items.forEach(item => {
      const key = item.productId || item.styleNo;
      sales.set(key, (sales.get(key) || 0) + item.quantity);
    }));
    return [...products].map(product => ({
      product,
      quantity: sales.get(product.id) || sales.get(product.styleNo) || 0
    })).sort((left, right) => right.quantity - left.quantity)[0] || null;
  }, [orders30d, products]);
  const atRiskCount = customers.filter(customer => {
    const customerOrders = orders.filter(order => order.customerId === customer.id);
    return customerOrders.length >= 2 && Math.min(...customerOrders.map(order => daysAgo(order.createdAt || order.date))) >= 60;
  }).length;
  const campaignSlug = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ruda-campaign';
  const campaignUrl = useMemo(() => {
    try {
      const url = new URL(merchantSharePath, window.location.origin);
      if (utmSource.trim()) url.searchParams.set('utm_source', utmSource.trim());
      if (utmMedium.trim()) url.searchParams.set('utm_medium', utmMedium.trim());
      if (utmCampaign.trim()) url.searchParams.set('utm_campaign', utmCampaign.trim());
      return url.toString();
    } catch {
      return '';
    }
  }, [merchantSharePath, utmCampaign, utmMedium, utmSource]);

  const savePreferences = () => {
    if (!preferences.market.trim()) {
      addNotification('warning', '目标市场不能为空', '请填写主要经营市场');
      return;
    }
    if (persist({ ...snapshot, preferences })) {
      addNotification('success', 'Autopilot 偏好已保存', '仅保存在此设备；营销渠道尚未连接。');
    }
  };
  const generateStrategy = () => {
    if (strategyBusy) return;
    setStrategyBusy(true);
    const primaryChannel = preferences.channels[0] || 'email';
    const generated: GrowthTactic[] = [];
    if (topProduct?.quantity) {
      generated.push({
        id: crypto.randomUUID(),
        title: `为热销款 ${topProduct.product.styleNo} 准备推广内容`,
        objective: `近 30 天该款售出 ${topProduct.quantity} 件；生成商品介绍草稿，供你审核`,
        audience: '通过已审核的客户细分自行选择；系统不会读取或发送客户名单',
        channel: primaryChannel,
        productId: topProduct.product.id,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    }
    const newProduct = products.find(product => product.lifecycleStatus === 'published' && daysAgo(product.createdAt) <= 60);
    if (newProduct) {
      generated.push({
        id: crypto.randomUUID(),
        title: `为新品 ${newProduct.styleNo} 准备上新宣传`,
        objective: `${newProduct.name_zh || newProduct.name} · 批发价 €${newProduct.wholesalePrice.toFixed(2)}；先生成可核对文案`,
        audience: '自主选择目标客户；请确认商品状态、价格与库存后再使用',
        channel: primaryChannel,
        productId: newProduct.id,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    }
    if (atRiskCount > 0) {
      generated.push({
        id: crypto.randomUUID(),
        title: '准备老客户回访文案',
        objective: `有 ${atRiskCount} 位客户过去至少下过两单且 60 天未下单；只提供通用回访草稿，不发送消息`,
        audience: `流失风险客户 ${atRiskCount} 位（人数统计；名单不传给文案助手）`,
        channel: primaryChannel,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    }
    if (!generated.length) {
      setStrategyBusy(false);
      addNotification('info', '暂时没有可生成的建议', '需要本店有近 30 日订单、已上架新品或复购客户后，才能基于数据准备增长战术');
      return;
    }
    const existingIds = new Set(snapshot.tactics.map(tactic => tactic.id));
    const next = { ...snapshot, tactics: [...generated, ...snapshot.tactics.filter(tactic => !existingIds.has(tactic.id))].slice(0, 50) };
    persist(next);
    setStrategyBusy(false);
    addNotification('success', '已生成增长战术草稿', `${generated.length} 条建议待你审核；未连接任何营销渠道`);
  };
  const prepareTactic = async (tactic: GrowthTactic) => {
    const product = products.find(item => item.id === tactic.productId);
    const prompt = `为商家「${merchantName}」写一份${tactic.channel}营销内容草稿。目标：${tactic.objective}。受众描述：${tactic.audience}。${product ? `商品资料：${product.name_zh || product.name}，款号 ${product.styleNo}，商品分类 ${product.subCategory}，面料 ${product.fabric}，批发价 €${product.wholesalePrice.toFixed(2)}，RRP €${product.rrpPrice.toFixed(2)}。` : ''}用${preferences.language === 'it' ? '意大利语' : preferences.language === 'en' ? '英语' : '中文'}写标题和简洁正文；只使用已提供事实，不承诺未知库存/优惠。只生成草稿，不发送、不投放广告。`;
    setCopyBusy(true);
    setEditingTacticId(tactic.id);
    try {
      const copy = await generateCopy(prompt);
      if (!copy) return;
      setCampaignName(tactic.title);
      setCampaignObjective(tactic.objective);
      setCampaignAudience(tactic.audience);
      setCampaignChannel(tactic.channel);
      setCampaignProductId(tactic.productId || '');
      setCopyDraft(copy);
      setUtmMedium(tactic.channel);
      setUtmCampaign(campaignSlug(tactic.title));
      onSectionChange('campaigns');
    } finally {
      setCopyBusy(false);
      setEditingTacticId(null);
    }
  };
  const saveCampaignDraft = () => {
    if (!campaignName.trim() || !campaignObjective.trim() || !copyDraft.trim() || !campaignUrl) {
      addNotification('warning', '活动草稿资料不完整', '请填写活动名称、目标、文案，并确认落地链接');
      return;
    }
    const campaign: GrowthCampaign = {
      id: crypto.randomUUID(),
      name: campaignName.trim().slice(0, 100),
      objective: campaignObjective.trim().slice(0, 500),
      audience: campaignAudience.trim().slice(0, 300),
      channel: campaignChannel,
      copy: copyDraft.trim().slice(0, 5000),
      landingUrl: campaignUrl,
      status: 'draft',
      createdAt: new Date().toISOString()
    };
    const next = { ...snapshot, campaigns: [campaign, ...snapshot.campaigns].slice(0, 100) };
    if (!persist(next)) return;
    if (editingTacticId) {
      const updated = { ...next, tactics: next.tactics.map(tactic => tactic.id === editingTacticId ? { ...tactic, status: 'prepared' as const } : tactic) };
      persist(updated);
    }
    setCampaignName('');
    setCampaignObjective('');
    setCampaignAudience('');
    setCampaignProductId('');
    setCopyDraft('');
    setUtmCampaign('');
    addNotification('success', '营销活动草稿已保存', '仅保存在此设备，尚未发送或投放。');
  };
  const dismissTactic = (tactic: GrowthTactic) => {
    const next = { ...snapshot, tactics: snapshot.tactics.map(item => item.id === tactic.id ? { ...item, status: 'dismissed' as const } : item) };
    if (persist(next)) addNotification('info', '已忽略此建议', '建议列表已更新。');
  };
  const copyCampaignUrl = async () => {
    if (!campaignUrl) return;
    try {
      await navigator.clipboard.writeText(campaignUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      addNotification('warning', '复制链接失败', '请检查设备的剪贴板权限后重试。');
    }
  };
  const deleteCampaign = (campaign: GrowthCampaign) => {
    if (!window.confirm(`确定删除活动草稿「${campaign.name}」吗？`)) return;
    persist({ ...snapshot, campaigns: snapshot.campaigns.filter(item => item.id !== campaign.id) });
  };

  const title = section === 'overview' ? (localizeCopy('增长', 'Crescita'))
    : section === 'autopilot' ? 'Autopilot'
      : (localizeCopy('宣传活动', 'Campagne promozionali'));
  const mobileSectionLabels: Record<GrowthSection, string> = {
    overview: localizeCopy('增长概览', 'Panoramica'),
    autopilot: 'Autopilot',
    campaigns: localizeCopy('宣传活动', 'Campagne')
  };

  return (
    <div className="space-y-4">
      <header className="merchant-home-intro relative overflow-hidden rounded-3xl border border-neutral-200 bg-[radial-gradient(ellipse_at_85%_0%,rgba(209,250,229,0.7),transparent_38%),linear-gradient(145deg,#fff_18%,#f8fafc_72%,#eef2ff_100%)] p-5 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-neutral-600">查看本店销售与复购情况，准备营销建议和活动文案。</p>
          </div>
          <nav aria-label="增长子页面" className="flex flex-wrap gap-1 rounded-xl border border-white bg-white/70 p-1 shadow-sm lg:hidden">
            {(['overview', 'autopilot', 'campaigns'] as const).map(item => <button key={item} type="button" aria-current={section === item ? 'page' : undefined} onClick={() => onSectionChange(item)} className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition ${section === item ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:bg-white hover:text-neutral-950'}`}>{mobileSectionLabels[item]}</button>)}
          </nav>
        </div>
      </header>

      {section === 'overview' && <>
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          {[
            { label: '近 30 天本店销售额', value: `€${sales30d.toFixed(0)}`, detail: `${orders30d.length} 笔本店订单`, Icon: BarChart3, tone: 'merchant-home-tone-blue' },
            { label: '平均订单金额', value: `€${averageOrderValue.toFixed(2)}`, detail: '按本店近 30 天订单计算', Icon: Target, tone: 'merchant-home-tone-green' },
            { label: '近 30 天新客户', value: recentCustomers, detail: '按客户登记日期统计', Icon: Users, tone: 'merchant-home-tone-violet' },
            { label: '流失风险客户', value: atRiskCount, detail: '至少 2 单且 60 天未回购', Icon: RefreshCw, tone: 'merchant-home-tone-amber' }
          ].map(metric => <article key={metric.label} className={`merchant-home-card ${metric.tone} rounded-2xl border border-neutral-200/80 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}>
            <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-medium text-neutral-500">{metric.label}</p><p className="mt-1.5 text-xl font-semibold tabular-nums text-neutral-950">{metric.value}</p><p className="mt-1 text-[9px] text-neutral-500">{metric.detail}</p></div><metric.Icon className="h-4 w-4 text-neutral-500" /></div>
          </article>)}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-neutral-600" /><h2 className="text-sm font-semibold text-neutral-900">营收表现</h2></div>
            <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-neutral-50 p-3"><span className="text-[10px] text-neutral-500">近 30 天</span><strong className="mt-1 block text-lg text-neutral-900">€{sales30d.toFixed(2)}</strong></div><div className="rounded-xl bg-neutral-50 p-3"><span className="text-[10px] text-neutral-500">前 30 天</span><strong className="mt-1 block text-lg text-neutral-900">€{previousSales30d.toFixed(2)}</strong></div></div>
            <p className="mt-3 text-[10px] leading-5 text-neutral-500">仅为订单销售额比较，不代表广告归因收入、访问转化率或投放回报。RUDA 当前没有商家级营销渠道访问/转化归因数据。</p>
          </section>
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-neutral-600" /><h2 className="text-sm font-semibold text-neutral-900">开始增长工作流</h2></div>
            <p className="mt-2 text-xs leading-5 text-neutral-600">根据本店热销商品、上新和复购情况生成建议，再到“Autopilot”或“宣传活动”中继续处理。</p>
          </section>
        </div>
      </>}

      {section === 'autopilot' && <>
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-emerald-700" /><h2 className="text-sm font-semibold text-neutral-900">Autopilot 偏好</h2></div>
            <fieldset className="mt-4"><legend className="text-[11px] font-semibold text-neutral-700">计划使用的渠道（尚未连接）</legend><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{availableChannels.map(channel => <label key={channel.id} className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5 text-xs text-neutral-700"><input type="checkbox" checked={preferences.channels.includes(channel.id)} onChange={event => setPreferences(current => ({ ...current, channels: event.target.checked ? [...new Set([...current.channels, channel.id])] : current.channels.filter(item => item !== channel.id) }))} className="accent-emerald-700" />{channel.label}</label>)}</div></fieldset>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-[11px] font-semibold text-neutral-700">创建活动权限<select value={preferences.permission} onChange={event => setPreferences(current => ({ ...current, permission: event.target.value as GrowthPermission }))} className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-xs"><option value="approval_required">需要我批准每一步（推荐）</option><option value="draft_only">只允许准备草稿</option></select></label>
              <label className="text-[11px] font-semibold text-neutral-700">目标市场<input maxLength={80} value={preferences.market} onChange={event => setPreferences(current => ({ ...current, market: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-xs" placeholder="Italy" /></label>
            </div>
            <label className="mt-3 block text-[11px] font-semibold text-neutral-700">文案语言<select value={preferences.language} onChange={event => setPreferences(current => ({ ...current, language: event.target.value as GrowthPreferences['language'] }))} className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-xs sm:max-w-xs"><option value="zh">中文</option><option value="it">Italiano</option><option value="en">English</option></select></label>
            <button type="button" onClick={savePreferences} className="mt-4 rounded-lg bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white">保存偏好</button>
          </article>
          <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-neutral-900">当前能力</h2>
            <dl className="mt-3 divide-y divide-neutral-100 text-[11px]"><div className="flex justify-between gap-3 py-2"><dt className="text-neutral-500">活动处理方式</dt><dd className="font-semibold text-neutral-800">{preferences.permission === 'approval_required' ? '每次由你审核' : '仅生成草稿'}</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-neutral-500">已连接渠道</dt><dd className="font-semibold text-amber-700">尚未连接</dd></div><div className="flex justify-between gap-3 py-2"><dt className="text-neutral-500">自动发送与投放</dt><dd className="font-semibold text-neutral-800">暂不可用</dd></div></dl>
            <p className="mt-3 rounded-xl bg-neutral-50 p-3 text-[10px] leading-5 text-neutral-500">目前可生成建议和文案草稿；需要你自行复制到邮件或广告平台发布。</p>
          </article>
        </section>
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-neutral-900">增长策略 · 待审核建议</h2><p className="mt-1 text-[10px] text-neutral-500">建议从本店商品与订单计算；不会自动读取营销受众名单或执行战术。</p></div><button type="button" onClick={generateStrategy} disabled={strategyBusy} className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Sparkles className="h-3.5 w-3.5" />{strategyBusy ? '正在分析…' : '生成增长建议'}</button></div>
          <div className="mt-4 space-y-2">{snapshot.tactics.filter(tactic => tactic.status !== 'dismissed').map(tactic => <article key={tactic.id} className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-xs font-semibold text-neutral-900">{tactic.title}</h3><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-800">待审核</span></div><p className="mt-1 text-[10px] leading-5 text-neutral-600">{tactic.objective}</p><p className="mt-1 text-[9px] text-neutral-400">建议渠道：{availableChannels.find(channel => channel.id === tactic.channel)?.label}（未连接） · 受众：{tactic.audience} · 预算与排期未接入</p></div><div className="flex shrink-0 gap-2"><button type="button" disabled={copyBusy} onClick={() => void prepareTactic(tactic)} className="rounded-lg bg-neutral-950 px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-50">{copyBusy && editingTacticId === tactic.id ? '生成中…' : '审核并准备草稿'}</button><button type="button" onClick={() => dismissTactic(tactic)} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[10px] font-semibold text-neutral-600">忽略</button></div></div></article>)}
          {!snapshot.tactics.some(tactic => tactic.status !== 'dismissed') && <div className="rounded-xl border border-dashed border-neutral-200 px-4 py-9 text-center"><Sparkles className="mx-auto h-5 w-5 text-neutral-300" /><p className="mt-2 text-xs text-neutral-500">还没有增长建议。生成策略后会按本店可核实数据准备草稿建议。</p></div>}</div>
          {snapshot.tactics.some(tactic => tactic.status === 'prepared') && <p className="mt-3 text-[10px] text-emerald-800">{snapshot.tactics.filter(tactic => tactic.status === 'prepared').length} 条建议已生成活动草稿；未批准投放，未连接渠道。</p>}
        </section>
      </>}

      {section === 'campaigns' && <>
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
          <form className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm" onSubmit={event => { event.preventDefault(); saveCampaignDraft(); }}>
            <div><h2 className="text-sm font-semibold text-neutral-900">创建宣传活动草稿</h2><p className="mt-1 text-[10px] leading-5 text-neutral-500">手动撰写或让 GPTmoda 起草；保存后仅保存在此设备，需自行发布。</p></div>
            <label className="block text-[11px] font-semibold text-neutral-700">活动名称<input required maxLength={100} value={campaignName} onChange={event => setCampaignName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-xs" placeholder="例如：秋季新品上架" /></label>
            <label className="block text-[11px] font-semibold text-neutral-700">活动目标<input required maxLength={500} value={campaignObjective} onChange={event => setCampaignObjective(event.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-xs" placeholder="例如：让意大利精品店了解本季新款" /></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-[11px] font-semibold text-neutral-700">渠道<select value={campaignChannel} onChange={event => { setCampaignChannel(event.target.value as GrowthChannel); setUtmMedium(event.target.value); }} className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-xs">{availableChannels.map(channel => <option key={channel.id} value={channel.id}>{channel.label}（未连接）</option>)}</select></label>
              <label className="text-[11px] font-semibold text-neutral-700">商品（可选）<select value={campaignProductId} onChange={event => setCampaignProductId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-xs"><option value="">不关联商品</option>{products.filter(product => product.lifecycleStatus === 'published').map(product => <option key={product.id} value={product.id}>{product.styleNo} · {product.name_zh || product.name}</option>)}</select></label></div>
            <label className="block text-[11px] font-semibold text-neutral-700">目标受众描述（不填客户个人信息）<input maxLength={300} value={campaignAudience} onChange={event => setCampaignAudience(event.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-xs" placeholder="例如：意大利已审核精品店买手" /></label>
            <label className="block text-[11px] font-semibold text-neutral-700">文案<textarea required maxLength={5000} rows={6} value={copyDraft} onChange={event => setCopyDraft(event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-neutral-200 px-3 py-2.5 text-xs leading-5" placeholder="仅填写已核实的商品、价格和供货信息。" /></label>
            <div className="flex flex-wrap items-center justify-between gap-2"><button type="button" disabled={copyBusy || !campaignObjective.trim()} onClick={async () => {
              setCopyBusy(true);
              try {
                const product = products.find(item => item.id === campaignProductId);
                const generated = await generateCopy(`为商家「${merchantName}」写一份${campaignChannel}宣传活动文案。目标：${campaignObjective}。目标受众描述：${campaignAudience || '由商家自行选择'}。${product ? `商品事实：${product.name_zh || product.name}，款号 ${product.styleNo}，面料 ${product.fabric}，批发价 €${product.wholesalePrice.toFixed(2)}。` : ''}用${preferences.language === 'it' ? '意大利语' : preferences.language === 'en' ? '英语' : '中文'}写标题和正文；不虚构促销、库存或效果。只生成未发送的文案草稿。`);
                if (generated) setCopyDraft(generated);
              } finally {
                setCopyBusy(false);
              }
            }} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-[10px] font-semibold text-neutral-700 disabled:opacity-40"><Sparkles className="h-3.5 w-3.5" />{copyBusy ? '文案生成中…' : 'GPTmoda 写文案'}</button><button type="submit" className="rounded-lg bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white">保存活动草稿</button></div>
          </form>
          <aside className="space-y-4">
            <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-semibold text-neutral-900">活动追踪链接</h2><p className="mt-1 text-[10px] leading-5 text-neutral-500">链接指向你的 RUDA 店铺，可用于区分不同推广来源；此处暂不统计点击和销售效果。</p>
              <label className="mt-3 block text-[10px] font-semibold text-neutral-600">来源<input maxLength={64} value={utmSource} onChange={event => setUtmSource(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs" /></label>
              <label className="mt-2 block text-[10px] font-semibold text-neutral-600">媒介<input maxLength={64} value={utmMedium} onChange={event => setUtmMedium(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs" /></label>
              <label className="mt-2 block text-[10px] font-semibold text-neutral-600">活动标识<input maxLength={100} value={utmCampaign} onChange={event => setUtmCampaign(event.target.value)} onBlur={() => { if (utmCampaign.trim()) setUtmCampaign(campaignSlug(utmCampaign)); }} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs" placeholder="autumn-new-arrivals" /></label>
              <div className="mt-3 break-all rounded-lg bg-neutral-50 p-3 text-[10px] leading-5 text-neutral-700">{campaignUrl || '无法生成落地链接'}</div>
              <button type="button" disabled={!campaignUrl} onClick={() => void copyCampaignUrl()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-40">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? '已复制' : '复制链接'}</button>
              <a href={merchantSharePath} target="_blank" rel="noopener noreferrer" className="ml-3 inline-flex items-center gap-1 text-[10px] font-semibold text-neutral-600 underline">查看店铺<ExternalLink className="h-3 w-3" /></a>
            </section>
            <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-semibold text-neutral-900">最近活动草稿</h2><p className="mt-1 text-[10px] text-neutral-500">{snapshot.campaigns.length} 条</p><div className="mt-3 space-y-2">{snapshot.campaigns.slice(0, 8).map(campaign => <article key={campaign.id} className="rounded-xl border border-neutral-100 p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate text-[11px] font-semibold text-neutral-800">{campaign.name}</h3><p className="mt-1 text-[9px] text-neutral-500">{availableChannels.find(channel => channel.id === campaign.channel)?.label} · {new Date(campaign.createdAt).toLocaleDateString()}</p></div><button type="button" aria-label={`删除草稿 ${campaign.name}`} onClick={() => deleteCampaign(campaign)} className="rounded p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-700"><X className="h-3.5 w-3.5" /></button></div><p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[10px] leading-4 text-neutral-600">{campaign.copy}</p><a href={campaign.landingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[9px] font-medium text-emerald-800">打开活动链接<ArrowUpRight className="h-3 w-3" /></a></article>)}
              {!snapshot.campaigns.length && <p className="rounded-xl border border-dashed border-neutral-200 px-4 py-7 text-center text-[10px] text-neutral-400">尚无活动草稿</p>}</div></section>
          </aside>
        </section>
      </>}
    </div>
  );
};
