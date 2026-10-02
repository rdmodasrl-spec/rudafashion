import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Bot, Check, Copy, ExternalLink, MessageCircle, RefreshCw, Search, ShoppingBag, Store, Users } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../../api/client';
import { useB2B } from '../../context/B2BContext';

type GrowthOverview = {
  periodDays: number;
  metrics: {
    pageViews: number;
    aiOpens: number;
    aiQuestions: number;
    merchantApplicationViews: number;
    buyerRegistrationViews: number;
    inquiries: number;
    customers: number;
    merchants: number;
    orders: number;
  };
  daily: Array<{ day: string; pageViews: number; aiQuestions: number; inquiries: number }>;
  campaigns: Array<{ source: string; medium: string; campaign: string; events: number }>;
  assistant: { enabled: boolean; mode: string };
  notifications: Record<'email' | 'sms' | 'whatsapp', { enabled: boolean; configured: boolean }>;
};

type MarketingChannel = 'instagram' | 'facebook' | 'tiktok' | 'google_ads' | 'whatsapp';
type MarketingCampaign = {
  id: string;
  name: string;
  objective: string;
  channels: MarketingChannel[];
  landingPath: string;
  copies: Partial<Record<MarketingChannel, string>>;
  instagramImageUrl?: string | null;
  publications?: Array<{
    channel: 'instagram' | 'facebook';
    pageId: string;
    accountName: string;
    status: 'publishing' | 'published' | 'failed';
    startedAt: string;
    publishedAt?: string;
    externalPostId?: string;
    providerErrorCode?: number;
  }>;
  status: 'draft' | 'approved';
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
};
type MetaPublishingPage = {
  id: string;
  name: string;
  tasks: string[];
  instagramAccount: { id: string; username: string } | null;
  instagramUserTokenExpiresAt: string | null;
  connectedAt: string;
};
type MetaConnectionStatus = {
  configured: boolean;
  graphVersion: string;
  callbackUrl: string;
  pages: MetaPublishingPage[];
};

const publishingChannels: Array<{ id: MarketingChannel; name: string; paid: boolean }> = [
  { id: 'instagram', name: 'Instagram', paid: false },
  { id: 'facebook', name: 'Facebook', paid: false },
  { id: 'tiktok', name: 'TikTok', paid: false },
  { id: 'google_ads', name: 'Google Ads', paid: true },
  { id: 'whatsapp', name: 'WhatsApp', paid: false }
];

const metricCards = [
  { key: 'pageViews', title: '同意统计后的页面浏览', icon: BarChart3 },
  { key: 'aiOpens', title: 'AI 客服打开', icon: Bot },
  { key: 'aiQuestions', title: 'AI 客服提问', icon: MessageCircle },
  { key: 'inquiries', title: '已提交客服咨询', icon: Users },
  { key: 'buyerRegistrationViews', title: '买手注册入口访问', icon: ShoppingBag },
  { key: 'merchantApplicationViews', title: '商家入驻入口访问', icon: Store },
  { key: 'customers', title: '新买手注册', icon: Users },
  { key: 'merchants', title: '新商家入驻', icon: Store },
  { key: 'orders', title: '新订单', icon: ShoppingBag }
] as const;

export const AdminGrowthCenter: React.FC<{
  onManageAi: () => void;
  onManageLeads: () => void;
  onManageNotifications: () => void;
  onManageIntegrations: () => void;
  onManageMerchants: () => void;
  onManageCustomers: () => void;
}> = ({ onManageAi, onManageLeads, onManageNotifications, onManageIntegrations, onManageMerchants, onManageCustomers }) => {
  const { lang, addNotification, localizeCopy } = useB2B();
  const [overview, setOverview] = useState<GrowthOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [source, setSource] = useState('newsletter');
  const [medium, setMedium] = useState('email');
  const [campaign, setCampaign] = useState('');
  const [landingPage, setLandingPage] = useState('/');
  const [copied, setCopied] = useState(false);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [campaignError, setCampaignError] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('');
  const [campaignCopy, setCampaignCopy] = useState('');
  const [instagramImageUrl, setInstagramImageUrl] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<MarketingChannel[]>(['instagram', 'facebook', 'tiktok']);
  const [metaStatus, setMetaStatus] = useState<MetaConnectionStatus | null>(null);
  const [metaStatusError, setMetaStatusError] = useState('');
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaDisconnecting, setMetaDisconnecting] = useState<string | null>(null);
  const [publishingCampaignKey, setPublishingCampaignKey] = useState<string | null>(null);
  const [selectedMetaTargets, setSelectedMetaTargets] = useState<Record<string, string>>({});
  const isIt = lang === 'it';

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await apiGet<GrowthOverview>('/api/admin/growth/overview');
      setOverview(result);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '读取获客数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    setCampaignLoading(true);
    setCampaignError('');
    try {
      const result = await apiGet<{ campaigns: MarketingCampaign[] }>('/api/admin/growth/campaigns');
      setCampaigns(result.campaigns);
    } catch (error) {
      setCampaignError(error instanceof Error ? error.message : '读取活动失败');
    } finally {
      setCampaignLoading(false);
    }
  }, []);

  const loadMetaStatus = useCallback(async () => {
    setMetaLoading(true);
    setMetaStatusError('');
    try {
      const result = await apiGet<MetaConnectionStatus>('/api/admin/growth/meta');
      setMetaStatus(result);
    } catch (error) {
      setMetaStatusError(error instanceof Error ? error.message : '读取 Meta 授权状态失败');
    } finally {
      setMetaLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
    void loadCampaigns();
    void loadMetaStatus();
  }, [loadCampaigns, loadMetaStatus, loadOverview]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get('meta_oauth');
    if (!result) return;
    if (result === 'connected') addNotification('success', 'Meta 账号授权完成', '已同步可发布的 Facebook Page 和关联的 Instagram 专业账号');
    else if (result === 'denied') addNotification('warning', 'Meta 授权已取消', '没有更改已保存的社媒账号');
    else if (result === 'invalid_state') addNotification('warning', 'Meta 授权验证失败', '请重新发起连接，OAuth 状态已过期或与当前管理员会话不匹配');
    else addNotification('warning', 'Meta 连接失败', '请确认 App 模式、回调 URL、权限审核和 Page 内容管理任务后重试');
    url.searchParams.delete('meta_oauth');
    window.history.replaceState({}, '', url.toString());
    void loadMetaStatus();
  }, [addNotification, loadMetaStatus]);

  const campaignUrl = useMemo(() => {
    if (!campaign.trim()) return '';
    const url = new URL(landingPage, window.location.origin);
    url.searchParams.set('utm_source', source.trim());
    url.searchParams.set('utm_medium', medium.trim());
    url.searchParams.set('utm_campaign', campaign.trim());
    return url.toString();
  }, [campaign, landingPage, medium, source]);

  const copyCampaignUrl = async () => {
    if (!campaignUrl) return;
    try {
      await navigator.clipboard.writeText(campaignUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      addNotification('warning', localizeCopy('复制失败', 'Copia non riuscita'), error instanceof Error ? error.message : '请检查浏览器剪贴板权限');
    }
  };

  const campaignDestination = campaignUrl || new URL(landingPage, window.location.origin).toString();

  const campaignSlug = (name: string) => {
    const slug = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return slug || `campaign-${Date.now().toString(36)}`;
  };

  const createCampaign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!campaignName.trim() || !selectedChannels.length || !campaignCopy.trim() || campaignSaving) return;
    setCampaignSaving(true);
    setCampaignError('');
    try {
      const nameTag = campaignSlug(campaignName.trim());
      const copies = Object.fromEntries(selectedChannels.map(channel => [
        channel,
        `${campaignCopy.trim()}\n\n${(() => {
          const url = new URL(landingPage, window.location.origin);
          url.searchParams.set('utm_source', channel);
          url.searchParams.set('utm_medium', channel === 'google_ads' ? 'paid' : 'organic');
          url.searchParams.set('utm_campaign', nameTag);
          return url.toString();
        })()}`
      ]));
      const result = await apiPost<{ campaign: MarketingCampaign }>('/api/admin/growth/campaigns', {
        name: campaignName.trim(),
        objective: campaignObjective.trim(),
        channels: selectedChannels,
        landingPath: landingPage,
        copies,
        instagramImageUrl: instagramImageUrl.trim() || null
      });
      setCampaigns(current => [result.campaign, ...current]);
      setCampaignName('');
      setCampaignObjective('');
      setCampaignCopy('');
      setInstagramImageUrl('');
      addNotification('success', '活动草稿已保存', '内容已保存到总后台；尚未连接社媒发布或广告账户');
    } catch (error) {
      setCampaignError(error instanceof Error ? error.message : '保存活动失败');
    } finally {
      setCampaignSaving(false);
    }
  };

  const changeCampaignStatus = async (campaign: MarketingCampaign) => {
    const status = campaign.status === 'approved' ? 'draft' : 'approved';
    try {
      const result = await apiPut<{ campaign: MarketingCampaign }>(`/api/admin/growth/campaigns/${encodeURIComponent(campaign.id)}`, { status });
      setCampaigns(current => current.map(item => item.id === campaign.id ? result.campaign : item));
      addNotification('success', status === 'approved' ? '文案审核通过' : '文案已退回草稿', status === 'approved' ? '请复制内容到平台官方账号手动发布' : '内容可在确认后重新审核');
    } catch (error) {
      addNotification('warning', '活动状态更新失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  const disconnectMetaPage = async (page: MetaPublishingPage) => {
    if (!window.confirm(`确定断开「${page.name}」的 Meta 授权吗？`)) return;
    setMetaDisconnecting(page.id);
    try {
      const result = await apiPost<{ pages: MetaPublishingPage[] }>('/api/admin/growth/meta/disconnect', { pageId: page.id });
      setMetaStatus(current => current ? { ...current, pages: result.pages } : current);
      addNotification('success', 'Meta Page 已断开', `${page.name} 的加密访问令牌已从本平台移除`);
    } catch (error) {
      addNotification('warning', '断开 Meta Page 失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setMetaDisconnecting(null);
    }
  };

  const publishMetaCampaign = async (campaign: MarketingCampaign, channel: 'instagram' | 'facebook', page: MetaPublishingPage) => {
    const target = channel === 'instagram'
      ? `Instagram @${page.instagramAccount?.username || page.instagramAccount?.id}`
      : `Facebook Page「${page.name}」`;
    if (!window.confirm(`即将把「${campaign.name}」的已审核文案立即公开发布到${target}。确认发布？`)) return;
    const key = `${campaign.id}:${channel}:${page.id}`;
    setPublishingCampaignKey(key);
    try {
      const result = await apiPost<{ campaign: MarketingCampaign }>(`/api/admin/growth/campaigns/${encodeURIComponent(campaign.id)}/publish`, {
        channel,
        pageId: page.id
      });
      setCampaigns(current => current.map(item => item.id === campaign.id ? result.campaign : item));
      addNotification('success', 'Meta 内容已发布', `已提交到${target}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('META_PUBLISH_RESULT_UNCERTAIN') || message.includes('META_PUBLICATION_REQUIRES_REVIEW')) {
        addNotification('warning', '发布结果需要核实', '请先检查对应的 Meta 账号；为避免重复公开发布，系统不会自动重试');
      } else {
        addNotification('warning', 'Meta 发布失败', message || '请检查 Page 权限、App Review 状态和图片要求后重试');
      }
      void loadCampaigns();
    } finally {
      setPublishingCampaignKey(null);
    }
  };

  const copyChannelText = async (copy: string) => {
    try {
      await navigator.clipboard.writeText(copy);
      addNotification('success', '文案已复制', '请粘贴到相应平台的官方发布工具');
    } catch (error) {
      addNotification('warning', '复制失败', error instanceof Error ? error.message : '请检查浏览器剪贴板权限');
    }
  };

  const maxDailyViews = Math.max(1, ...(overview?.daily.map(day => day.pageViews) || []));
  const metricLabels = overview?.metrics;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-200 pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">RUDA / GROWTH INTELLIGENCE</p>
          <h2 className="mt-1 font-serif text-2xl font-medium text-neutral-950">{localizeCopy('智能获客工作台', 'Crescita intelligente')}</h2>
          <p className="mt-1 max-w-3xl text-sm text-neutral-600">{localizeCopy('查看获客漏斗、制作可追踪推广链接，并检查 AI 客服与通知渠道。访问统计仅记录同意后的匿名事件；注册、咨询和订单来自平台业务数据。', 'Misura il funnel, prepara link tracciabili e controlla i canali di assistenza.')}</p>
        </div>
        <button type="button" onClick={() => void loadOverview()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-700 hover:border-neutral-800 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />{localizeCopy('刷新数据', 'Aggiorna')}
        </button>
      </header>

      {loadError && <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{localizeCopy("数据加载失败：{{RUDA_ARG_0}}", "Errore: {{RUDA_ARG_0}}", [String(loadError)])}</div>}

      {loading && !overview ? <p className="py-12 text-center text-sm text-neutral-500">{localizeCopy('正在加载获客数据...', 'Caricamento...')}</p> : overview && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {metricCards.map(({ key, title, icon: Icon }) => (
              <article key={key} className="border border-neutral-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-neutral-600">{title}</span>
                  <Icon className="h-4 w-4 text-neutral-400" />
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">{metricLabels?.[key].toLocaleString() ?? 0}</p>
                <p className="mt-1 text-[10px] text-neutral-400">近 {overview.periodDays} 天</p>
              </article>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
            <section className="border border-neutral-200 bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="text-sm font-bold text-neutral-900">{localizeCopy('流量与意向趋势', 'Andamento del traffico')}</h3><p className="mt-1 text-xs text-neutral-500">按自然日统计页面浏览、AI 对话和客服咨询</p></div>
                <span className="text-[10px] text-neutral-400">UTC</span>
              </div>
              <div className="mt-5 space-y-2">
                {overview.daily.map(day => (
                  <div key={day.day} className="grid grid-cols-[72px_minmax(0,1fr)_92px] items-center gap-2 text-[10px]">
                    <span className="text-neutral-500">{day.day.slice(5)}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full rounded-full bg-neutral-900" style={{ width: `${Math.max(day.pageViews ? 2 : 0, day.pageViews / maxDailyViews * 100)}%` }} />
                    </div>
                    <span className="text-right text-neutral-600">{day.pageViews} 浏览 · {day.aiQuestions} 问</span>
                  </div>
                ))}
                {overview.daily.length === 0 && <p className="py-8 text-center text-xs text-neutral-400">暂无同意统计的访问数据</p>}
              </div>
              <p className="mt-4 border-t border-neutral-100 pt-3 text-[10px] leading-5 text-neutral-500">访问量是匿名事件数，不代表去重访客。用户拒绝统计或尚未选择时不会记录页面浏览。</p>
            </section>

            <section className="border border-neutral-200 bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-neutral-900">渠道运行状态</h3><p className="mt-1 text-xs text-neutral-500">已配置不等于已验证送达</p></div><Bot className="h-4 w-4 text-neutral-400" /></div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-xs"><span>AI 客服（商品目录规则助手）</span><StatusBadge ready={overview.assistant.enabled} readyText="已启用" /></div>
                {(['email', 'sms', 'whatsapp'] as const).map(channel => (
                  <div key={channel} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-xs">
                    <span>{channel === 'email' ? 'Email' : channel === 'sms' ? '短信 SMS' : 'WhatsApp'}</span>
                    <StatusBadge ready={overview.notifications[channel].enabled && overview.notifications[channel].configured} readyText="凭证已配，需实测" />
                  </div>
                ))}
              </div>
              <button type="button" onClick={onManageAi} className="mt-4 w-full border border-neutral-300 px-3 py-2 text-xs font-semibold hover:border-neutral-950">管理 AI 客服问候语与快捷问题</button>
              <button type="button" onClick={onManageNotifications} className="mt-2 w-full border border-neutral-300 px-3 py-2 text-xs font-semibold hover:border-neutral-950">管理通知渠道并发送实测</button>
              <p className="mt-3 text-[10px] leading-5 text-amber-800">凭证配置不代表投递成功，请先发测试通知确认发件域名、试用收件人和 WhatsApp 发送方资格。营销自动发送未启用：普通注册或客服咨询不是营销许可；需先保存独立订阅授权与退订状态。</p>
            </section>
          </div>

          <section className="border border-neutral-200 bg-white p-4 sm:p-5">
            <h3 className="text-sm font-bold text-neutral-900">线索处理入口</h3>
            <p className="mt-1 text-xs text-neutral-500">现有平台数据可继续在对应审核/客服模块中处理；客服咨询仅用于答复原请求，不作为营销订阅名单。</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <button type="button" onClick={onManageLeads} className="min-h-10 border border-neutral-300 px-3 text-xs font-semibold hover:border-neutral-950">打开客服咨询与跟进记录</button>
              <button type="button" onClick={onManageMerchants} className="min-h-10 border border-neutral-300 px-3 text-xs font-semibold hover:border-neutral-950">审核商家入驻与资料</button>
              <button type="button" onClick={onManageCustomers} className="min-h-10 border border-neutral-300 px-3 text-xs font-semibold hover:border-neutral-950">审核买手注册与企业</button>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="border border-neutral-200 bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2"><Search className="h-4 w-4 text-neutral-500" /><h3 className="text-sm font-bold text-neutral-900">推广链接生成器（UTM）</h3></div>
              <p className="mt-1 text-xs text-neutral-500">为社交媒体、邮件或广告生成可区分来源的落地链接。</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-[11px] font-semibold text-neutral-600 sm:col-span-2">落地页
                  <select value={landingPage} onChange={event => setLandingPage(event.target.value)} className="mt-1 w-full border border-neutral-300 bg-white px-3 py-2 text-xs">
                    <option value="/">RUDA 首页</option>
                    <option value="/catalog">现货商品目录</option>
                    <option value="/showrooms">官方商家展厅</option>
                  </select>
                </label>
                <label className="text-[11px] font-semibold text-neutral-600">来源 utm_source<input value={source} onChange={event => setSource(event.target.value)} maxLength={64} className="mt-1 w-full border border-neutral-300 px-3 py-2 text-xs" placeholder="instagram" /></label>
                <label className="text-[11px] font-semibold text-neutral-600">媒介 utm_medium<input value={medium} onChange={event => setMedium(event.target.value)} maxLength={64} className="mt-1 w-full border border-neutral-300 px-3 py-2 text-xs" placeholder="social" /></label>
                <label className="text-[11px] font-semibold text-neutral-600 sm:col-span-2">活动 utm_campaign<input value={campaign} onChange={event => setCampaign(event.target.value)} maxLength={100} className="mt-1 w-full border border-neutral-300 px-3 py-2 text-xs" placeholder="autumn-wholesale-2026" /></label>
              </div>
              {campaignUrl && <div className="mt-3 break-all rounded-lg bg-neutral-50 p-3 text-[11px] text-neutral-700">{campaignUrl}</div>}
              <button type="button" disabled={!campaignUrl} onClick={() => void copyCampaignUrl()} className="mt-3 inline-flex min-h-9 items-center gap-2 bg-neutral-950 px-3 text-xs font-semibold text-white disabled:opacity-40">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? '已复制' : '复制推广链接'}</button>
              <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="ml-4 inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 underline">查看站点地图<ExternalLink className="h-3 w-3" /></a>
            </section>

            <section className="border border-neutral-200 bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-neutral-500" /><h3 className="text-sm font-bold text-neutral-900">来源与活动表现</h3></div>
              <p className="mt-1 text-xs text-neutral-500">只统计访客同意分析后访问的来源和活动事件。</p>
              {overview.campaigns.length ? <div className="mt-4 divide-y divide-neutral-100">
                {overview.campaigns.map((item, index) => <div key={`${item.source}-${item.medium}-${item.campaign}-${index}`} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                  <div className="min-w-0"><p className="truncate font-semibold text-neutral-800">{item.campaign || '未标记活动'}</p><p className="truncate text-[10px] text-neutral-500">{item.source} / {item.medium}</p></div><span className="shrink-0 font-semibold text-neutral-700">{item.events} 事件</span>
                </div>)}
              </div> : <p className="py-8 text-center text-xs text-neutral-400">暂无活动数据；用上方工具生成链接并分享。</p>}
            </section>
          </div>

          <section className="border border-neutral-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="text-sm font-bold text-neutral-900">跨平台内容活动台</h3><p className="mt-1 text-xs text-neutral-500">一次准备多渠道文案 → 总后台审核 → 管理员逐条确认后可发布到 Meta；其他渠道仍手动复制，不会自动投放广告。</p></div>
              <button type="button" onClick={onManageIntegrations} className="border border-neutral-300 px-3 py-2 text-xs font-semibold hover:border-neutral-950">查看第三方接入配置</button>
            </div>
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-blue-950">Meta 账号连接 · Facebook Page + Instagram</h4>
                  <p className="mt-1 text-[10px] leading-5 text-blue-900">使用 Meta 官方 OAuth，不收集账号密码。Instagram 需为已关联 Facebook Page 的 Business/Creator 专业账号，且授权人需要对应内容管理任务。</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void loadMetaStatus()}
                    disabled={metaLoading}
                    className="border border-blue-300 bg-white px-3 py-2 text-[11px] font-semibold text-blue-950 disabled:opacity-50"
                  >{metaLoading ? '检查中…' : '刷新状态'}</button>
                  {metaStatus?.configured ? (
                    <a href="/api/admin/growth/meta/connect" className="bg-blue-950 px-3 py-2 text-[11px] font-semibold text-white">连接 Meta 账号</a>
                  ) : (
                    <button type="button" onClick={onManageIntegrations} className="bg-blue-950 px-3 py-2 text-[11px] font-semibold text-white">先配置 Meta App</button>
                  )}
                </div>
              </div>
              {metaStatusError && <p role="alert" className="mt-2 text-[11px] text-rose-700">Meta 状态读取失败：{metaStatusError}</p>}
              {metaStatus && (
                <>
                  <p className="mt-2 break-all rounded bg-white/80 px-2 py-1.5 text-[10px] text-neutral-600">Meta 控制台需登记的 Valid OAuth Redirect URI：{metaStatus.callbackUrl} · Graph API {metaStatus.graphVersion}</p>
                  {!metaStatus.configured && <p className="mt-2 text-[10px] text-amber-800">请在「第三方接入配置」填写 Facebook/Meta App ID、App Secret 和 Login for Business Config ID 并加密保存，然后把上面的回调地址登记到 Meta App。Login 配置选择 User access token，并按 Meta 审核要求配置 pages_show_list、pages_read_engagement、pages_manage_posts、pages_manage_engagement、pages_read_user_engagement、instagram_basic、instagram_content_publish 及所需 Page/Instagram 资产。</p>}
                  {metaStatus.pages.length > 0 ? (
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {metaStatus.pages.map(page => (
                        <div key={page.id} className="flex items-start justify-between gap-3 rounded border border-blue-100 bg-white p-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-bold text-neutral-900">{page.name}</p>
                            <p className="mt-1 text-[10px] text-neutral-500">Facebook Page · {page.tasks.join(', ')}</p>
                            <p className="mt-1 text-[10px] text-neutral-600">{page.instagramAccount ? `Instagram @${page.instagramAccount.username || page.instagramAccount.id}` : '未检测到关联的 Instagram 专业账号'}</p>
                            {page.instagramUserTokenExpiresAt && <p className="mt-1 text-[10px] text-neutral-500">Instagram 令牌有效至 {new Date(page.instagramUserTokenExpiresAt).toLocaleDateString()}</p>}
                          </div>
                          <button
                            type="button"
                            onClick={() => void disconnectMetaPage(page)}
                            disabled={metaDisconnecting === page.id}
                            className="shrink-0 border border-neutral-300 px-2 py-1 text-[10px] font-semibold text-neutral-700 disabled:opacity-50"
                          >{metaDisconnecting === page.id ? '断开中…' : '断开'}</button>
                        </div>
                      ))}
                    </div>
                  ) : <p className="mt-2 text-[10px] text-neutral-600">尚未连接 Page。连接后只保存具备内容管理任务的 Page 令牌，并加密存储。</p>}
                </>
              )}
              <p className="mt-2 text-[10px] leading-5 text-blue-900">连接成功仅表示已授权并同步 Page/关联 Instagram 资产，不等于 Meta App Review 已通过或已发布内容。Business Manager 分配的 Page 角色可能还要求 ads_read/ads_management；本平台不请求这些广告权限，所以这类 Instagram 发布可能被 Meta 拒绝。断开只删除本平台保存的令牌；若要完全撤销授权，请到 Meta 商务集成设置移除应用。Meta 内容须审核后由管理员逐条确认发布；广告投放尚未启用。</p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {publishingChannels.map(channel => {
                const connected = channel.id === 'facebook'
                  ? Boolean(metaStatus?.pages.length)
                  : channel.id === 'instagram'
                    ? Boolean(metaStatus?.pages.some(page => page.instagramAccount))
                    : false;
                return <div key={channel.id} className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px]">
                  <span>{channel.name}{channel.paid ? ' · 付费广告' : ' · 内容发布'}</span><span className={`shrink-0 ${connected ? 'text-emerald-700' : 'text-amber-700'}`}>{connected ? 'OAuth 资产已连接' : '账号未连接'}</span>
                </div>;
              })}
            </div>
            <p className="mt-2 text-[10px] leading-5 text-neutral-500">Meta OAuth 资产连接与登录集成分开；实际发布仍受 Meta App Review、账号类型和 Page 任务限制。请勿把个人账号密码交给网站。Google Ads 与 Meta 广告尚未连接，也不会创建或扣费。</p>
            <form onSubmit={event => void createCampaign(event)} className="mt-4 grid gap-3 rounded-lg border border-neutral-200 p-3 sm:grid-cols-2">
              <label className="text-[11px] font-semibold text-neutral-600">活动名称<input required maxLength={100} value={campaignName} onChange={event => setCampaignName(event.target.value)} className="mt-1 w-full border border-neutral-300 px-3 py-2 text-xs" placeholder="2026 秋季意大利现货推广" /></label>
              <label className="text-[11px] font-semibold text-neutral-600">目标说明（内部）<input maxLength={300} value={campaignObjective} onChange={event => setCampaignObjective(event.target.value)} className="mt-1 w-full border border-neutral-300 px-3 py-2 text-xs" placeholder="吸引欧洲精品店买手浏览新品" /></label>
              <div className="sm:col-span-2">
                <span className="text-[11px] font-semibold text-neutral-600">推广渠道</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {publishingChannels.map(channel => <label key={channel.id} className="inline-flex items-center gap-1.5 rounded border border-neutral-200 px-2 py-1.5 text-[11px]">
                    <input type="checkbox" checked={selectedChannels.includes(channel.id)} onChange={event => setSelectedChannels(current => event.target.checked ? [...current, channel.id] : current.filter(item => item !== channel.id))} />
                    {channel.name}{channel.paid ? ' 广告' : ''}
                  </label>)}
                </div>
              </div>
              <label className="text-[11px] font-semibold text-neutral-600 sm:col-span-2">推广文案（人工核实商品、价格及素材授权）
                <textarea required maxLength={4000} rows={3} value={campaignCopy} onChange={event => setCampaignCopy(event.target.value)} className="mt-1 w-full border border-neutral-300 px-3 py-2 text-xs" placeholder="介绍真实商品/商家、供货信息和行动号召；不要承诺未经核实的库存或价格。" />
              </label>
              <label className="text-[11px] font-semibold text-neutral-600 sm:col-span-2">Instagram 图片 URL（可选；发 Instagram 时必填）
                <input type="url" maxLength={2000} value={instagramImageUrl} onChange={event => setInstagramImageUrl(event.target.value)} className="mt-1 w-full border border-neutral-300 px-3 py-2 text-xs" placeholder="https://公开可访问的商品 JPEG 图片地址" />
                <span className="mt-1 block font-normal text-neutral-500">Meta 服务器必须能直接读取公网 HTTPS 图片；请确保图片已获授权并符合 Instagram 图片规格。</span>
              </label>
              {campaignError && <p role="alert" className="sm:col-span-2 text-xs text-rose-700">{campaignError}</p>}
              <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
                <p className="break-all text-[10px] text-neutral-500">落地页：{campaignDestination}</p>
                <button type="submit" disabled={campaignSaving || !selectedChannels.length || !campaignCopy.trim()} className="min-h-9 bg-neutral-950 px-3 text-xs font-semibold text-white disabled:opacity-40">{campaignSaving ? '保存中…' : '保存待审核草稿'}</button>
              </div>
            </form>
            <div className="mt-4 space-y-3">
              {campaignError && !campaignName && <p role="alert" className="text-xs text-rose-700">{campaignError}</p>}
              {campaignLoading ? <p className="py-4 text-center text-xs text-neutral-400">正在读取活动...</p> : campaigns.map(item => (
                <article key={item.id} className="rounded-lg border border-neutral-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><h4 className="text-xs font-bold text-neutral-900">{item.name}</h4><p className="mt-1 text-[10px] text-neutral-500">{item.channels.map(channel => publishingChannels.find(entry => entry.id === channel)?.name || channel).join(' · ')} · {item.objective || '未填写目标'}</p></div>
                    <div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{item.status === 'approved' ? '已审核，可人工确认发布' : '待审核'}</span><button type="button" onClick={() => void changeCampaignStatus(item)} className="border border-neutral-300 px-2 py-1 text-[10px] font-semibold">{item.status === 'approved' ? '退回草稿' : '审核通过'}</button></div>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {item.channels.map(channel => <div key={channel} className="rounded bg-neutral-50 p-2">
                      <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold">{publishingChannels.find(entry => entry.id === channel)?.name}</span><button type="button" onClick={() => void copyChannelText(item.copies[channel] || '')} className="inline-flex items-center gap-1 text-[10px] font-semibold"><Copy className="h-3 w-3" />复制</button></div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-[10px] leading-4 text-neutral-600">{item.copies[channel]}</p>
                    </div>)}
                  </div>
                  {item.status === 'approved' && item.channels.some(channel => channel === 'facebook' || channel === 'instagram') && (
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {(['facebook', 'instagram'] as const).filter(channel => item.channels.includes(channel)).map(channel => {
                        const candidates = (metaStatus?.pages || []).filter(page => channel === 'facebook' || page.instagramAccount);
                        const selectionKey = `${item.id}:${channel}`;
                        const pageId = selectedMetaTargets[selectionKey] || candidates[0]?.id || '';
                        const page = candidates.find(candidate => candidate.id === pageId);
                        const publication = item.publications?.find(record => record.channel === channel && record.pageId === pageId);
                        const requestKey = `${item.id}:${channel}:${pageId}`;
                        const isPublishing = publishingCampaignKey === requestKey;
                        const isInstagram = channel === 'instagram';
                        return (
                          <div key={channel} className="rounded border border-blue-100 bg-blue-50/60 p-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[10px] font-bold">{isInstagram ? 'Instagram' : 'Facebook Page'}</span>
                              {candidates.length > 0 && <select
                                aria-label={`${isInstagram ? 'Instagram' : 'Facebook'}发布目标`}
                                value={pageId}
                                onChange={event => setSelectedMetaTargets(current => ({ ...current, [selectionKey]: event.target.value }))}
                                className="max-w-full border border-neutral-300 bg-white px-2 py-1 text-[10px]"
                              >{candidates.map(candidate => <option key={candidate.id} value={candidate.id}>{isInstagram ? `@${candidate.instagramAccount?.username || candidate.name}` : candidate.name}</option>)}</select>}
                            </div>
                            {publication?.status === 'published' && <p className="mt-2 text-[10px] font-semibold text-emerald-800">已发布 · 帖子 ID {publication.externalPostId}</p>}
                            {publication?.status === 'publishing' && <p className="mt-2 text-[10px] font-semibold text-amber-800">发布结果待核实，请先检查 Meta 账号，切勿重复提交。</p>}
                            {publication?.status === 'failed' && <p className="mt-2 text-[10px] text-rose-700">上次发布被 Meta 拒绝（错误码 {publication.providerErrorCode ?? '未知'}），确认原因后可重试。</p>}
                            {!page && <p className="mt-2 text-[10px] text-neutral-600">请先连接具备内容管理任务的 Meta Page{isInstagram ? ' 和关联的 Instagram 专业账号' : ''}。</p>}
                            {isInstagram && !item.instagramImageUrl && <p className="mt-2 text-[10px] text-amber-800">该活动尚未保存 Instagram 图片 URL。</p>}
                            {page && (
                              <button
                                type="button"
                                onClick={() => void publishMetaCampaign(item, channel, page)}
                                disabled={isPublishing || publication?.status === 'published' || publication?.status === 'publishing' || (isInstagram && !item.instagramImageUrl)}
                                className="mt-2 min-h-8 bg-blue-950 px-3 text-[10px] font-semibold text-white disabled:opacity-40"
                              >{isPublishing ? '向 Meta 提交中…' : publication?.status === 'failed' ? '确认后重试' : '审核通过并立即发布'}</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              ))}
              {!campaignLoading && !campaignError && campaigns.length === 0 && <p className="py-4 text-center text-xs text-neutral-400">还没有活动草稿。保存后的文案需人工审核；Meta 可在确认后即时发布，其他渠道从官方账号手动发布。</p>}
            </div>
          </section>

          <section className="border border-sky-200 bg-sky-50 p-4 text-xs leading-5 text-sky-950">
            <h3 className="font-bold">SEO 与转化操作建议</h3>
            <p className="mt-1">持续补全可公开索引的商品与商家页标题、描述、真实图片和库存；已发布商品页、店铺页会生成结构化数据并收录在站点地图。关注入驻入口访问、咨询提交和订单增长，不要用重复或未经核实的 AI 内容堆搜索页。</p>
          </section>
        </>
      )}
    </section>
  );
};

const StatusBadge: React.FC<{ ready: boolean; readyText?: string }> = ({ ready, readyText = '已启用 / 已配置' }) => (
  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{ready ? readyText : '未就绪'}</span>
);
