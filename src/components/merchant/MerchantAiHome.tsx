import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, Check, ChevronDown, Copy, CreditCard, Download, Heart, ImagePlus, Lightbulb, Menu, MessageSquarePlus, Mic, MoreVertical, Paperclip, Plus, RefreshCw, Search, Shirt, Sparkles, ThumbsDown, ThumbsUp, Trash2, UserRound, X } from 'lucide-react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../api/client';
import { ModaGptPricingSheet } from './ModaGptPricingSheet';
import { useB2B } from '../../context/B2BContext';
import { getIntlLocale } from '../../i18n/translations';



type AssistantMessage = {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  feedback?: 'up' | 'down';
  imageDataUrl?: string;
  attachments?: ChatAttachment[];
  actions?: AssistantAction[];
  dataBasis?: string[];
  designCategory?: 'imageGeneration' | 'tryOn';
  designId?: string;
};

type AssistantAction = {
  label: string;
  target: 'products' | 'sku_matrix' | 'inventory' | 'materials' | 'production' | 'orders' | 'vault_requests' | 'customers' | 'growth' | 'content' | 'finance' | 'profile' | 'settings' | 'gallery' | 'support';
};

type AssistantMobileTab = 'products' | 'inventory' | 'orders' | 'customers' | 'profile';

type ChatAttachment = {
  name: string;
  dataUrl: string;
  kind: 'image' | 'document';
  size: number;
};

type SpeechRecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

type SpeechRecognitionErrorEvent = { error: string };

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type ModaGptDesign = {
  id: string;
  title: string;
  prompt: string;
  category: 'design' | 'imageGeneration' | 'tryOn';
  imageMime: string;
  imageWidth: number;
  imageHeight: number;
  isFavorite: boolean;
  createdAt: string;
  imageUrl: string;
};

type AssistantConversation = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
};

type FashionMode = 'design' | 'generate' | 'tryon' | 'edit' | 'inspiration' | 'productLaunch';
type ModaGptSection = 'chat' | 'create' | 'designs';
type ModaGptEntitlements = {
  plan: 'free' | 'plus' | 'pro' | 'business' | 'fashion_pro';
  expiresAt: string | null;
  period: string;
  quotas: { chat: number; imageGeneration: number; tryOn: number };
  usage: { chat: number; imageGeneration: number; tryOn: number };
  remaining: { chat: number; imageGeneration: number; tryOn: number };
  capabilities: { fashionDesign: boolean; imageGeneration: boolean; tryOn: boolean };
  providers: { reasoning: 'deepseek' | 'local'; image: 'fal' | 'local' | 'unavailable' };
  billing: {
    active: boolean;
    planId: 'FREE' | 'PLUS' | 'PRO' | 'BUSINESS' | 'FASHION_PRO' | null;
    monthlyCredits: number | null;
    creditBalance: number;
  };
};

type MerchantAiHomeProps = {
  isIt: boolean;
  merchantId: string;
  merchantName: string;
  onExit: () => void;
  onNavigate: (tab: AssistantMobileTab) => void;
};

function fashionModeAvailable(mode: FashionMode, entitlements: ModaGptEntitlements | null): boolean {
  if (!entitlements) return false;
  if (mode === 'generate') return entitlements.capabilities.imageGeneration;
  if (mode === 'tryon') return entitlements.capabilities.tryOn;
  if (mode === 'productLaunch') {
    return ['pro', 'business', 'fashion_pro'].includes(entitlements.plan) && entitlements.capabilities.imageGeneration;
  }
  return true;
}

const sharedChatContext = { context: 'dashboard', scope: 'home' };
const productLaunchShotDirections = [
  'European adult fashion model, full-body front view, clean premium wholesale lookbook, balanced studio lighting',
  'European adult fashion model, three-quarter pose, refined commercial fashion photography, neutral studio background',
  'European adult fashion model, full-body side pose showing garment silhouette and fit, premium catalog photography',
  'European adult fashion model, editorial pose with clear garment details, elegant European fashion campaign'
] as const;
const assistantActionTargets: Partial<Record<AssistantAction['target'], AssistantMobileTab>> = {
  products: 'products',
  sku_matrix: 'products',
  inventory: 'inventory',
  orders: 'orders',
  vault_requests: 'customers',
  customers: 'customers',
  profile: 'profile',
  settings: 'profile'
};

function renderMessageContent(content: string, messageIndex: number) {
  const formatInline = (line: string) => line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, partIndex) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={partIndex}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={partIndex} className="rounded bg-neutral-100 px-1 py-0.5 text-[0.92em]">{part.slice(1, -1)}</code>;
    return part;
  });
  const segments = content.split(/```([^\n]*)\n([\s\S]*?)```/g);
  return segments.map((segment, index) => {
    if (index % 3 === 1) {
      const code = segments[index + 1] || '';
      return <pre key={`code-${index}`} className="my-3 overflow-x-auto rounded-xl bg-neutral-950 p-3 text-[11px] leading-5 text-neutral-100"><code>{code}</code></pre>;
    }
    if (index % 3 === 2) return null;
    return segment.split('\n').map((line, lineIndex) => {
      const key = `${messageIndex}-${index}-${lineIndex}`;
      if (!line.trim()) return <div key={key} className="h-2" />;
      if (/^#{1,3}\s/.test(line)) return <h3 key={key} className="mb-1 mt-3 font-semibold">{formatInline(line.replace(/^#{1,3}\s/, ''))}</h3>;
      if (/^[-*]\s/.test(line)) return <p key={key} className="pl-3 before:mr-2 before:content-['•']">{formatInline(line.replace(/^[-*]\s/, ''))}</p>;
      return <p key={key}>{formatInline(line)}</p>;
    });
  });
}

function readImageFile(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) {
    return Promise.reject(new Error('只支持不超过 3MB 的 JPG、PNG 或 WebP 图片。'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('无法读取图片文件。'));
    reader.onerror = () => reject(reader.error || new Error('读取图片失败。'));
    reader.readAsDataURL(file);
  });
}

function readAttachmentFile(file: File): Promise<string> {
  const extension = file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || '';
  const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
  const isPdf = extension === '.pdf' && file.type === 'application/pdf';
  const isText = ['.txt', '.md', '.csv'].includes(extension)
    && ['text/plain', 'text/markdown', 'text/csv', 'application/vnd.ms-excel'].includes(file.type);
  if ((!isImage && !isPdf && !isText) || file.size > 3 * 1024 * 1024 || file.size === 0) {
    return Promise.reject(new Error('MODAGPT_ATTACHMENT_INVALID'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('无法读取附件。'));
    reader.onerror = () => reject(reader.error || new Error('读取附件失败。'));
    reader.readAsDataURL(file);
  });
}

export const MerchantAiHome: React.FC<MerchantAiHomeProps> = ({ isIt, merchantId, merchantName, onExit, onNavigate }) => {
  const { localizeCopy, lang } = useB2B();
  const [question, setQuestion] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ModaGptSection>('chat');
  const [selectedCreation, setSelectedCreation] = useState<FashionMode | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [composerToolsOpen, setComposerToolsOpen] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState<number | null>(null);
  const [feedbackBusyId, setFeedbackBusyId] = useState<string | null>(null);
  const [fashionMode, setFashionMode] = useState<FashionMode | null>(null);
  const [productLaunchImageCount, setProductLaunchImageCount] = useState(4);
  const [productLaunchProgress, setProductLaunchProgress] = useState<{
    stage: 'copy' | 'images' | 'complete' | 'partial';
    completedImages: number;
    totalImages: number;
  } | null>(null);
  const [productLaunchRecovery, setProductLaunchRecovery] = useState<{
    prompt: string;
    nextImageIndex: number;
    totalImages: number;
  } | null>(null);
  const [entitlements, setEntitlements] = useState<ModaGptEntitlements | null>(null);
  const [designs, setDesigns] = useState<ModaGptDesign[]>([]);
  const [designFilter, setDesignFilter] = useState<'all' | 'design' | 'imageGeneration' | 'tryOn' | 'favorite'>('all');
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [designsLoading, setDesignsLoading] = useState(false);
  const [designsRefresh, setDesignsRefresh] = useState(0);
  const [savingDesignMessage, setSavingDesignMessage] = useState<AssistantMessage | null>(null);
  const [designActionId, setDesignActionId] = useState<string | null>(null);
  const [designNotice, setDesignNotice] = useState('');
  const [personImage, setPersonImage] = useState('');
  const [garmentImage, setGarmentImage] = useState('');
  const [tryOnCategory, setTryOnCategory] = useState<'tops' | 'bottoms' | 'one-pieces'>('tops');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const conversationIdRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const personImageInputRef = useRef<HTMLInputElement>(null);
  const garmentImageInputRef = useRef<HTMLInputElement>(null);
  const chatAttachmentInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  conversationIdRef.current = conversationId;
  busyRef.current = busy;

  useEffect(() => () => speechRecognitionRef.current?.stop(), []);

  useEffect(() => {
    if (activeSection !== 'designs') return;
    let active = true;
    setDesignsLoading(true);
    apiGet<{ success: true; designs: ModaGptDesign[] }>(`/api/merchant/modagpt/designs?category=${designFilter}`)
      .then(result => {
        if (active) {
          setDesigns(result.designs);
          setDesignNotice('');
        }
      })
      .catch(loadError => {
        if (active) setDesignNotice(loadError instanceof Error ? loadError.message : (localizeCopy('作品加载失败，请稍后重试。', 'Impossibile caricare il portfolio.')));
      })
      .finally(() => {
        if (active) setDesignsLoading(false);
      });
    return () => { active = false; };
  }, [activeSection, designFilter, designsRefresh, isIt, merchantId]);

  const fashionModes: Array<{ id: FashionMode; title: string; description: string; prompt: string; Icon: typeof Shirt; imageTask?: boolean; available: boolean }> = [
      { id: 'design', title: localizeCopy("服装设计", "Fashion Design"), description: localizeCopy("廓形、面料、配色与设计方案", "Silhouette, tessuti, palette e scheda tecnica"), prompt: localizeCopy("帮我设计一款服装。先询问我还没有提供的关键信息，再整理成完整的设计方案。", "Aiutami a progettare un capo. Chiedimi prima le informazioni che mancano e poi prepara una scheda di design."), Icon: Shirt, available: true },
      { id: 'generate', title: localizeCopy("图片生成", "Generazione immagini"), description: localizeCopy("将服装创意转成视觉方案", "Trasforma un brief in un’immagine moda"), prompt: '', Icon: ImagePlus, imageTask: true, available: true },
      { id: 'tryon', title: localizeCopy("AI 换衣", "AI Try-On"), description: localizeCopy("使用已获授权的人物照进行虚拟试穿", "Prova virtuale con immagini autorizzate"), prompt: '', Icon: UserRound, imageTask: true, available: true },
      { id: 'edit', title: localizeCopy("图片修改", "Modifica immagini"), description: localizeCopy("修改颜色、面料、细节或背景", "Ritocca colore, materiale o sfondo"), prompt: '', Icon: ImagePlus, available: false },
      { id: 'inspiration', title: localizeCopy("设计灵感", "Ispirazione"), description: localizeCopy("探索趋势与系列创意方向", "Nuove direzioni creative e trend"), prompt: localizeCopy("请为我提出三个服装系列创意方向，并说明配色、廓形、面料和适合的客群。", "Proponi tre direzioni creative per una nuova collezione di moda e spiega palette, silhouette e materiali."), Icon: Lightbulb, available: true },
      { id: 'productLaunch', title: localizeCopy("商品上新工作流", "Workflow nuovo prodotto"), description: localizeCopy("先拟商品标题与描述，再生成多张上新视觉图", "Crea titolo e descrizione, poi genera più immagini prodotto"), prompt: '', Icon: Sparkles, imageTask: true, available: true }
    ];
  const modeQuickPrompts = fashionMode === 'design'
    ? (isIt ? ['Abito da sera', 'Streetwear', 'Alta moda', 'Borsa o accessori'] : ['女装', '男装', '童装', '礼服', '街头风', '运动装', '高级定制', '鞋包配饰'])
    : fashionMode === 'generate'
      ? ([localizeCopy("Lookbook", "Lookbook"), localizeCopy("电商白底图", "E-commerce"), localizeCopy("时尚大片", "Editoriale"), localizeCopy("面料细节", "Dettaglio tessuto")])
      : fashionMode === 'tryon'
        ? ([localizeCopy("上传人物照片", "Carica foto persona"), localizeCopy("选择服装", "Scegli un capo"), localizeCopy("描述想要的风格", "Definisci lo stile")])
        : fashionMode === 'inspiration'
          ? ([localizeCopy("春季趋势", "Tendenza primavera"), localizeCopy("配色灵感", "Palette colori"), localizeCopy("胶囊系列", "Capsule collection")])
          : [];

  const loadConversations = async () => {
    const query = new URLSearchParams(sharedChatContext);
    const result = await apiGet<{ success: true; conversations: AssistantConversation[] }>(
      `/api/merchant/assistant/conversations?${query}`
    );
    setConversations(result.conversations);
    return result.conversations;
  };

  const openConversation = async (id: string) => {
    const query = new URLSearchParams(sharedChatContext);
    const result = await apiGet<{
      success: true;
      conversation: {
        id: string;
        messages: Array<{ id: string; role: string; text: string; actions?: AssistantAction[]; dataBasis?: string[]; feedback?: 'up' | 'down' }>;
      };
    }>(`/api/merchant/assistant/conversations/${encodeURIComponent(id)}?${query}`);
    if (conversationIdRef.current !== id) return;
    setMessages(result.conversation.messages.flatMap(message =>
      message.role === 'user' || message.role === 'assistant'
        ? [{ id: message.id, role: message.role, content: message.text, actions: message.actions, dataBasis: message.dataBasis, feedback: message.feedback }]
        : []
    ));
  };

  useEffect(() => {
    let active = true;
    void apiGet<ModaGptEntitlements & { success: true }>('/api/merchant/modagpt/entitlements')
      .then(result => { if (active) setEntitlements(result); })
      .catch(loadError => {
        if (active) setError(loadError instanceof Error ? loadError.message : (localizeCopy('AI 权益读取失败，请稍后重试。', 'Caricamento piano AI non riuscito.')));
      });
    return () => { active = false; };
  }, [isIt, merchantId]);

  useEffect(() => {
    let active = true;
    setLoadingHistory(true);
    setError('');
    setMessages([]);
    setConversations([]);
    setConversationId(null);
    conversationIdRef.current = null;
    void (async () => {
      try {
        const query = new URLSearchParams(sharedChatContext);
        const result = await apiGet<{ success: true; conversations: AssistantConversation[] }>(
          `/api/merchant/assistant/conversations?${query}`
        );
        if (!active) return;
        setConversations(result.conversations);
        const latest = result.conversations[0];
        if (latest) {
          conversationIdRef.current = latest.id;
          setConversationId(latest.id);
          const detailQuery = new URLSearchParams(sharedChatContext);
          const detail = await apiGet<{
            success: true;
            conversation: {
              id: string;
              messages: Array<{ id: string; role: string; text: string; actions?: AssistantAction[]; dataBasis?: string[]; feedback?: 'up' | 'down' }>;
            };
          }>(`/api/merchant/assistant/conversations/${encodeURIComponent(latest.id)}?${detailQuery}`);
          if (active && conversationIdRef.current === latest.id) {
            setMessages(detail.conversation.messages.flatMap(message =>
              message.role === 'user' || message.role === 'assistant'
                ? [{ id: message.id, role: message.role, content: message.text, actions: message.actions, dataBasis: message.dataBasis, feedback: message.feedback }]
                : []
            ));
          }
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error
          ? loadError.message
          : (localizeCopy('AI 对话历史加载失败，请重试。', 'Impossibile caricare la cronologia AI.')));
      } finally {
        if (active) setLoadingHistory(false);
      }
    })();
    return () => { active = false; };
  }, [isIt, merchantId]);

  useEffect(() => {
    const synchronize = async () => {
      try {
        await loadConversations();
        const selectedId = conversationIdRef.current;
        if (selectedId && !busyRef.current) await openConversation(selectedId);
      } catch (syncError) {
        setError(syncError instanceof Error
          ? syncError.message
          : (localizeCopy('同步 ModaGPT 对话失败，请重试。', 'Sincronizzazione conversazione non riuscita.')));
      }
    };
    const interval = window.setInterval(() => void synchronize(), 5000);
    return () => window.clearInterval(interval);
  }, [isIt, merchantId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  const startNewConversation = () => {
    if (busy) return;
    setConversationId(null);
    conversationIdRef.current = null;
    setMessages([]);
    setQuestion('');
    setError('');
    setProductLaunchProgress(null);
    setProductLaunchRecovery(null);
    setHistoryOpen(false);
  };

  const activateCreation = (mode: FashionMode, preserveDraft = false) => {
    const selected = fashionModes.find(item => item.id === mode);
    if (!selected?.available) return;
    setActiveSection('chat');
    setFashionMode(mode);
    setQuestion(preserveDraft && selectedCreation === mode && question.trim() ? question : selected.prompt);
    setError('');
    if (mode === 'inspiration') {
      window.setTimeout(() => {
        const input = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="发送消息给 ModaGPT"], textarea[aria-label="Messaggio per ModaGPT"]');
        input?.focus();
      }, 0);
    }
  };

  const generateProductLaunchImage = async (prompt: string, index: number, totalImages: number) => {
    const result = await apiPost<{
      success: true;
      imageDataUrl: string;
      quota?: { used: number; limit: number; remaining: number };
      credits?: { used: number; remaining: number };
    }>('/api/merchant/modagpt/images', {
      task: 'imageGeneration',
      prompt: [
        'Create an original commercial fashion product image for an adult European apparel B2B lookbook.',
        'Respect only the garment facts explicitly provided; do not add logos, text, watermarks, unsupported claims, or unrelated objects.',
        `Garment brief: ${prompt}`,
        `Shot direction ${index + 1}: ${productLaunchShotDirections[index]}`
      ].join(' ')
    }, 180_000, { 'Idempotency-Key': `image-${crypto.randomUUID()}` });
    if (result.quota) {
      setEntitlements(current => current ? {
        ...current,
        usage: { ...current.usage, imageGeneration: result.quota!.used },
        remaining: { ...current.remaining, imageGeneration: result.quota!.remaining }
      } : current);
    }
    setMessages(current => [...current, {
      role: 'assistant',
      content: localizeCopy(
        `商品上新视觉图 ${index + 1}/${totalImages}。请检查款式细节和生成结果；只有点击“保存到作品库”后才会保存。`,
        `Immagine prodotto ${index + 1}/${totalImages}. Verifica il risultato; verrà salvato solo dopo aver scelto “Salva nei progetti”.`
      ),
      imageDataUrl: result.imageDataUrl,
      designCategory: 'imageGeneration'
    }]);
  };

  const selectConversation = async (id: string) => {
    if (busy) return;
    setConversationId(id);
    conversationIdRef.current = id;
    setMessages([]);
    setHistoryOpen(false);
    setError('');
    setProductLaunchProgress(null);
    setProductLaunchRecovery(null);
    try {
      await openConversation(id);
    } catch (loadError) {
      setError(loadError instanceof Error
        ? loadError.message
        : (localizeCopy('无法打开这段对话，请重试。', 'Impossibile aprire la conversazione.')));
    }
  };

  const sendQuestion = async (value = question, messageAttachments = attachments) => {
    const prompt = value.trim() || (messageAttachments.length ? (localizeCopy('请分析我上传的附件并帮助我。', 'Analizza gli allegati e aiutami.')) : '');
    if (!prompt || busy) return;
    const productLaunchTask = fashionMode === 'productLaunch';
    const imageTask = fashionMode === 'generate' || fashionMode === 'tryon';
    if (imageTask && !entitlements) {
      setError(localizeCopy('正在核对 AI 套餐权限，请稍后重试。', 'Verifica il piano AI e riprova.'));
      return;
    }
    if (fashionMode === 'generate' && !entitlements?.capabilities.imageGeneration) {
      setError(entitlements?.plan === 'free'
        ? (localizeCopy('服装出图需要 ModaGPT Pro 套餐，请联系平台管理员开通。', 'La generazione immagini richiede il piano ModaGPT Pro. Contatta il tuo amministratore per l’attivazione.'))
        : (localizeCopy('图像服务暂不可用，请联系平台管理员。', 'Il provider immagini non è configurato.')));
      return;
    }
    if (fashionMode === 'tryon' && !entitlements?.capabilities.tryOn) {
      setError(entitlements?.plan === 'free'
        ? (localizeCopy('AI 换衣需要 ModaGPT Pro 套餐，请联系平台管理员开通。', 'AI Try-On richiede il piano ModaGPT Pro. Contatta il tuo amministratore per l’attivazione.'))
        : (localizeCopy('当前图像服务暂不支持 AI 换衣，请联系平台管理员。', 'AI Try-On non è disponibile per il provider configurato.')));
      return;
    }
    if (fashionMode === 'tryon' && (!personImage || !garmentImage || !privacyConsent)) {
      setError(localizeCopy('请上传人物和服装图片，并确认将照片发送到 Fal AI 处理。', 'Carica entrambe le immagini e conferma il trasferimento al provider AI.'));
      return;
    }
    if (productLaunchTask) {
      if (!entitlements) {
        setError(localizeCopy('正在核对 AI 套餐权限，请稍后重试。', 'Verifica il piano AI e riprova.'));
        return;
      }
      if (!entitlements.billing.active && entitlements.remaining.chat < 1) {
        setError(localizeCopy('本月对话额度已用完，无法启动商品上新工作流。', 'Quota chat mensile esaurita; impossibile avviare il workflow.'));
        return;
      }
      if (!entitlements.capabilities.imageGeneration
        || (!entitlements.billing.active && entitlements.remaining.imageGeneration < productLaunchImageCount)) {
        setError(entitlements.plan === 'free'
          ? localizeCopy('商品上新工作流需要 ModaGPT Pro，请联系平台管理员开通。', 'Il workflow richiede ModaGPT Pro. Contatta l’amministratore RUDA.')
          : localizeCopy(`本月图片额度不足；本次需要 ${productLaunchImageCount} 次图片生成额度。`, `Quota immagini insufficiente: servono ${productLaunchImageCount} generazioni.`));
        return;
      }
      if (!window.confirm(localizeCopy(
        `此工作流会消耗 1 次对话额度和 ${productLaunchImageCount} 次图片额度，并连续调用已配置的 AI 服务。图片生成可能产生第三方服务费用；结果不会自动发布商品。继续吗？`,
        `Il workflow usa 1 quota chat e ${productLaunchImageCount} quote immagini. Il provider potrebbe addebitare costi; nessun prodotto verrà pubblicato. Continuare?`
      ))) return;
    }
    setBusy(true);
    busyRef.current = true;
    setError('');
    setQuestion('');
    setProductLaunchProgress(productLaunchTask
      ? { stage: 'copy', completedImages: 0, totalImages: productLaunchImageCount }
      : null);
    if (productLaunchTask) setProductLaunchRecovery(null);
    setMessages(current => [...current, { role: 'user', content: prompt, attachments: messageAttachments }]);
    const chatIdempotencyKey = `assistant-${crypto.randomUUID()}`;
    let productLaunchCopyCompleted = false;
    let completedProductLaunchImages = 0;
    try {
      if (productLaunchTask) {
        const copyResult = await apiPost<{
          success: true;
          reply: string;
          conversationId: string;
          conversationTitle: string;
          conversationUpdatedAt: string;
          messageCount: number;
          actions?: AssistantAction[];
          dataBasis?: string[];
          messageId: string;
          quota?: { used: number; limit: number; remaining: number };
          credits?: { used: number; remaining: number };
        }>('/api/merchant/assistant/query', {
          question: prompt,
          conversationId: conversationIdRef.current,
          attachments: messageAttachments.map(({ name, dataUrl }) => ({ name, dataUrl })),
          workflow: 'product_launch_copy',
          ...sharedChatContext
        }, 60_000, { 'Idempotency-Key': chatIdempotencyKey });
        productLaunchCopyCompleted = true;
        conversationIdRef.current = copyResult.conversationId;
        setConversationId(copyResult.conversationId);
        setMessages(current => [...current, {
          role: 'assistant',
          id: copyResult.messageId,
          content: `${localizeCopy('商品文案草稿（请核实后再使用）：', 'Bozza descrizione prodotto (verifica prima dell’uso):')}\n\n${copyResult.reply}`,
          actions: copyResult.actions || [],
          dataBasis: copyResult.dataBasis || []
        }]);
        if (copyResult.quota) setEntitlements(current => current ? {
          ...current,
          usage: { ...current.usage, chat: copyResult.quota!.used },
          remaining: { ...current.remaining, chat: copyResult.quota!.remaining }
        } : current);
        setConversations(current => [
          {
            id: copyResult.conversationId,
            title: copyResult.conversationTitle,
            updatedAt: copyResult.conversationUpdatedAt,
            messageCount: copyResult.messageCount
          },
          ...current.filter(conversation => conversation.id !== copyResult.conversationId)
        ].slice(0, 30));
        setAttachments([]);

        setProductLaunchProgress({ stage: 'images', completedImages: 0, totalImages: productLaunchImageCount });
        setImageBusy(true);
        for (let index = 0; index < productLaunchImageCount; index += 1) {
          await generateProductLaunchImage(prompt, index, productLaunchImageCount);
          completedProductLaunchImages = index + 1;
          setProductLaunchProgress({ stage: 'images', completedImages: index + 1, totalImages: productLaunchImageCount });
        }
        setProductLaunchRecovery(null);
        setProductLaunchProgress({ stage: 'complete', completedImages: productLaunchImageCount, totalImages: productLaunchImageCount });
        return;
      }
      if (fashionMode === 'generate' || fashionMode === 'tryon') {
        setImageBusy(true);
        const result = await apiPost<{
          success: true;
          imageDataUrl: string;
          quota?: { used: number; limit: number; remaining: number };
          credits?: { used: number; remaining: number };
        }>('/api/merchant/modagpt/images', fashionMode === 'tryon'
          ? { task: 'tryOn', prompt, category: tryOnCategory, personImage, garmentImage, privacyConsent }
          : { task: 'imageGeneration', prompt }, 180_000, { 'Idempotency-Key': `image-${crypto.randomUUID()}` });
        const feature = fashionMode === 'tryon' ? 'tryOn' : 'imageGeneration';
        if (result.quota) {
          setEntitlements(current => current ? {
            ...current,
            usage: { ...current.usage, [feature]: result.quota!.used },
            remaining: { ...current.remaining, [feature]: result.quota!.remaining }
          } : current);
        }
        setMessages(current => [...current, {
          role: 'assistant',
          content: fashionMode === 'tryon'
            ? (localizeCopy('这是本次 AI 换衣效果图。', 'Ecco il risultato del virtual try-on.'))
            : (localizeCopy('这是生成的服装设计图。', 'Ecco la proposta visiva.')),
          imageDataUrl: result.imageDataUrl,
          designCategory: fashionMode === 'tryon' ? 'tryOn' : 'imageGeneration'
        }]);
        setPersonImage('');
        setGarmentImage('');
        setPrivacyConsent(false);
        return;
      }
      const result = await apiPost<{
        success: true;
        reply: string;
        conversationId: string;
        conversationTitle: string;
        conversationUpdatedAt: string;
        messageCount: number;
        actions?: AssistantAction[];
        dataBasis?: string[];
        messageId: string;
        quota?: { used: number; limit: number; remaining: number };
        credits?: { used: number; remaining: number };
      }>('/api/merchant/assistant/query', {
        question: prompt,
        conversationId: conversationIdRef.current,
        attachments: messageAttachments.map(({ name, dataUrl }) => ({ name, dataUrl })),
        ...sharedChatContext
      }, 30_000, { 'Idempotency-Key': chatIdempotencyKey });
      conversationIdRef.current = result.conversationId;
      setConversationId(result.conversationId);
      setMessages(current => [...current, {
        role: 'assistant',
        id: result.messageId,
        content: result.reply,
        actions: result.actions || [],
        dataBasis: result.dataBasis || []
      }]);
      if (result.quota) setEntitlements(current => current ? {
        ...current,
        usage: { ...current.usage, chat: result.quota!.used },
        remaining: { ...current.remaining, chat: result.quota!.remaining }
      } : current);
      setConversations(current => [
        {
          id: result.conversationId,
          title: result.conversationTitle,
          updatedAt: result.conversationUpdatedAt,
          messageCount: result.messageCount
        },
        ...current.filter(conversation => conversation.id !== result.conversationId)
      ].slice(0, 30));
      setAttachments([]);
    } catch (requestError) {
      if (!productLaunchCopyCompleted) {
        setProductLaunchProgress(null);
        setMessages(current => current.filter((message, index) =>
          !(index === current.length - 1 && message.role === 'user' && message.content === prompt)
        ));
        setQuestion(prompt);
      }
      const errorCode = requestError instanceof Error ? requestError.message : '';
      if (productLaunchCopyCompleted) {
        setProductLaunchRecovery({
          prompt,
          nextImageIndex: completedProductLaunchImages,
          totalImages: productLaunchImageCount
        });
        setProductLaunchProgress(current => current
          ? { ...current, stage: 'partial', completedImages: completedProductLaunchImages }
          : { stage: 'partial', completedImages: completedProductLaunchImages, totalImages: productLaunchImageCount });
      }
      setError(productLaunchCopyCompleted
        ? localizeCopy(
          `商品文案已生成，图片工作流中途停止。${completedProductLaunchImages} 张已完成图片目前只在当前对话中，请离开前保存；可单独补生成剩余图片。若服务超时，供应商可能已处理该请求，请确认可能产生的费用后再重试。错误：${errorCode || '图片生成失败'}`,
          `Bozza testo creata, ma la generazione immagini si è interrotta. Le ${completedProductLaunchImages} immagini completate sono solo nella chat: salvale prima di uscire. Puoi generare solo quelle mancanti. In caso di timeout, il provider potrebbe aver già elaborato la richiesta: verifica i costi prima di riprovare. Errore: ${errorCode || 'generazione non riuscita'}`
        )
        : errorCode === 'MODAGPT_ATTACHMENT_INVALID'
        ? (localizeCopy('附件格式或大小不符合要求，请使用指定图片/PDF/TXT/MD/CSV 格式并检查大小限制。', 'Formato o dimensione allegato non valido. Usa immagini JPG/PNG/WebP, PDF, TXT, MD o CSV entro i limiti indicati.'))
        : errorCode === 'MODAGPT_ATTACHMENT_NO_TEXT'
          ? (localizeCopy('附件中未找到可读取的文本；暂不支持扫描版 PDF。', 'Non è stato trovato testo leggibile nel file. I PDF scannerizzati non sono ancora supportati.'))
          : errorCode === 'MODAGPT_ATTACHMENT_TOO_MANY_PAGES'
            ? (localizeCopy('PDF 页数超过 20 页限制。', 'Il PDF supera il limite di 20 pagine.'))
            : errorCode === 'MODAGPT_VISION_PROVIDER_UNAVAILABLE'
              ? (localizeCopy('图片识别服务当前不可用，请联系 RUDA 管理员检查视觉模型配置。', 'Il servizio AI visivo non è disponibile. Contatta l’amministratore RUDA per verificare il modello visivo.'))
        : errorCode === 'MODAGPT_UPGRADE_REQUIRED'
        ? (localizeCopy('该功能需要 ModaGPT 高级版，请联系 RUDA 管理员开通。', 'Questa funzione richiede il piano Pro. Contatta l’amministratore RUDA.'))
        : errorCode === 'MODAGPT_QUOTA_EXCEEDED'
          ? (localizeCopy('本月此功能的使用额度已用完。', 'Hai raggiunto il limite mensile per questa funzione.'))
          : errorCode === 'MODAGPT_IMAGE_PROVIDER_NOT_CONFIGURED' || errorCode === 'MODAGPT_TRYON_PROVIDER_NOT_CONFIGURED'
            ? (localizeCopy('服务器尚未配置此 AI 服务，请联系管理员。', 'Il provider AI richiesto non è configurato dal server.'))
            : errorCode || localizeCopy('ModaGPT 暂时无法回答，请稍后重试。', 'Assistente AI non disponibile. Riprova.'));
    } finally {
      setImageBusy(false);
      setBusy(false);
      busyRef.current = false;
    }
  };

  const resumeProductLaunchImages = async () => {
    const recovery = productLaunchRecovery;
    if (!recovery || busy) return;
    const remainingImages = recovery.totalImages - recovery.nextImageIndex;
    if (remainingImages <= 0) {
      setProductLaunchRecovery(null);
      return;
    }
    if (!entitlements?.capabilities.imageGeneration || entitlements.remaining.imageGeneration < remainingImages) {
      setError(localizeCopy(
        `剩余图片额度不足；补生成还需要 ${remainingImages} 次图片额度。`,
        `Quota immagini insufficiente: servono altre ${remainingImages} generazioni.`
      ));
      return;
    }
    if (!window.confirm(localizeCopy(
      `只补生成剩余 ${remainingImages} 张图片，不会重新生成文案。将消耗 ${remainingImages} 次图片额度并可能产生服务费用。若上次超时，供应商可能已完成处理；仍要继续吗？`,
      `Genera solo le ${remainingImages} immagini mancanti, senza rifare il testo. Usa ${remainingImages} quote e può comportare costi. Se la richiesta precedente è scaduta, il provider potrebbe averla completata: continuare?`
    ))) return;
    setBusy(true);
    busyRef.current = true;
    setImageBusy(true);
    setError('');
    setProductLaunchProgress({
      stage: 'images',
      completedImages: recovery.nextImageIndex,
      totalImages: recovery.totalImages
    });
    let completedImages = recovery.nextImageIndex;
    try {
      for (let index = recovery.nextImageIndex; index < recovery.totalImages; index += 1) {
        await generateProductLaunchImage(recovery.prompt, index, recovery.totalImages);
        completedImages = index + 1;
        setProductLaunchProgress({
          stage: 'images',
          completedImages,
          totalImages: recovery.totalImages
        });
      }
      setProductLaunchRecovery(null);
      setProductLaunchProgress({
        stage: 'complete',
        completedImages: recovery.totalImages,
        totalImages: recovery.totalImages
      });
    } catch (requestError) {
      const errorCode = requestError instanceof Error ? requestError.message : '';
      setProductLaunchRecovery({ ...recovery, nextImageIndex: completedImages });
      setProductLaunchProgress({
        stage: 'partial',
        completedImages,
        totalImages: recovery.totalImages
      });
      setError(localizeCopy(
        `补生成中途停止，${completedImages} 张图片已完成。核对额度和服务费用后，可继续补生成剩余图片。错误：${errorCode || '图片生成失败'}`,
        `Generazione interrotta: ${completedImages} immagini completate. Controlla quote e costi prima di continuare. Errore: ${errorCode || 'generazione non riuscita'}`
      ));
    } finally {
      setImageBusy(false);
      setBusy(false);
      busyRef.current = false;
    }
  };

  const filteredConversations = conversations.filter(conversation =>
    conversation.title.toLocaleLowerCase().includes(historySearch.trim().toLocaleLowerCase())
  );
  const latestUserMessage = [...messages].reverse().find(message => message.role === 'user');
  const selectedDesign = designs.find(design => design.id === selectedDesignId) || null;

  const copyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessage(index);
      window.setTimeout(() => setCopiedMessage(current => current === index ? null : current), 1800);
    } catch (copyError) {
      setError(copyError instanceof Error
        ? copyError.message
        : (localizeCopy('复制失败，请检查剪贴板权限。', 'Impossibile copiare il messaggio.')));
    }
  };

  const submitMessageFeedback = async (message: AssistantMessage, feedback: 'up' | 'down') => {
    if (!message.id || feedbackBusyId) return;
    setFeedbackBusyId(message.id);
    try {
      await apiPatch<{ success: true; feedback: 'up' | 'down' }>(
        `/api/merchant/assistant/messages/${encodeURIComponent(message.id)}/feedback`,
        { feedback }
      );
      setMessages(current => current.map(item => item.id === message.id ? { ...item, feedback } : item));
    } catch (feedbackError) {
      setError(feedbackError instanceof Error
        ? feedbackError.message
        : localizeCopy('反馈保存失败，请重试。', 'Impossibile salvare il feedback. Riprova.'));
    } finally {
      setFeedbackBusyId(null);
    }
  };

  const addChatAttachments = async (files: FileList | null) => {
    if (!files?.length) return;
    const selectedFiles = Array.from(files);
    const existingBytes = attachments.reduce((total, item) => total + item.size, 0);
    const newAttachments: ChatAttachment[] = [];
    let totalBytes = existingBytes;
    let imageCount = attachments.filter(item => item.kind === 'image').length;
    let documentCount = attachments.length - imageCount;
    try {
      if (attachments.length + selectedFiles.length > 4) throw new Error('MODAGPT_ATTACHMENT_INVALID');
      for (const file of selectedFiles) {
        const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
        totalBytes += file.size;
        if (totalBytes > 5 * 1024 * 1024) throw new Error('MODAGPT_ATTACHMENT_INVALID');
        if (isImage) imageCount += 1;
        else documentCount += 1;
        if (imageCount > 3 || documentCount > 2) throw new Error('MODAGPT_ATTACHMENT_INVALID');
        newAttachments.push({
          name: file.name,
          dataUrl: await readAttachmentFile(file),
          kind: isImage ? 'image' : 'document',
          size: file.size
        });
      }
      setAttachments(current => [...current, ...newAttachments]);
      setError('');
    } catch (attachmentError) {
      const code = attachmentError instanceof Error ? attachmentError.message : '';
      setError(code === 'MODAGPT_ATTACHMENT_INVALID'
        ? (localizeCopy('可上传最多 3 张图片（JPG、PNG、WebP）和 2 个 PDF/TXT/MD/CSV 文件；单个文件不超过 3MB，总大小不超过 5MB。', 'Allega fino a 3 immagini (JPG, PNG o WebP) e 2 file PDF, TXT, MD o CSV. Massimo 3 MB per file e 5 MB totali.'))
        : (attachmentError instanceof Error ? attachmentError.message : (localizeCopy('读取附件失败，请重试。', 'Lettura allegato non riuscita.'))));
    }
  };

  const toggleVoiceInput = () => {
    if (recordingVoice) {
      speechRecognitionRef.current?.stop();
      return;
    }
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError(localizeCopy('当前浏览器不支持语音输入，请使用更新版 Safari 或 Chrome 并允许麦克风权限。', 'Questo browser non supporta la dettatura vocale. Prova con Safari o Chrome aggiornato.'));
      return;
    }
    const recognition = new Recognition();
    recognition.lang = getIntlLocale(lang);
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = event => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .filter(result => result.isFinal)
        .map(result => result[0]?.transcript.trim())
        .filter(Boolean)
        .join(' ');
      if (transcript) setQuestion(current => current ? `${current}${/[\s，。！？]$/.test(current) ? '' : ' '}${transcript}` : transcript);
    };
    recognition.onerror = event => {
      setRecordingVoice(false);
      speechRecognitionRef.current = null;
      setError(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? (localizeCopy('请在浏览器设置中允许使用麦克风。', 'Consenti l’accesso al microfono nelle impostazioni del browser.'))
        : (localizeCopy("语音识别失败：{{RUDA_ARG_0}}", "Riconoscimento vocale non riuscito: {{RUDA_ARG_0}}", [String(event.error)])));
    };
    recognition.onend = () => {
      setRecordingVoice(false);
      speechRecognitionRef.current = null;
    };
    try {
      speechRecognitionRef.current = recognition;
      recognition.start();
      setRecordingVoice(true);
      setError('');
    } catch (voiceError) {
      speechRecognitionRef.current = null;
      setRecordingVoice(false);
      setError(voiceError instanceof Error ? voiceError.message : (localizeCopy('无法启动语音输入，请检查麦克风权限。', 'Impossibile avviare la dettatura.')));
    }
  };

  const saveDesign = async (message: AssistantMessage, index: number) => {
    if (!message.imageDataUrl || !message.designCategory || message.designId || savingDesignMessage !== null) return;
    const prompt = messages.slice(0, index).reverse().find(item => item.role === 'user')?.content || message.content;
    setSavingDesignMessage(message);
    setError('');
    try {
      const result = await apiPost<{ success: true; design: ModaGptDesign }>('/api/merchant/modagpt/designs', {
        title: prompt.slice(0, 160),
        prompt,
        category: message.designCategory,
        imageDataUrl: message.imageDataUrl
      });
      setMessages(current => current.map(item => item === message
        ? { ...item, designId: result.design.id }
        : item));
      setDesignsRefresh(current => current + 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : (localizeCopy('作品保存失败，请稍后重试。', 'Impossibile salvare il progetto.')));
    } finally {
      setSavingDesignMessage(null);
    }
  };

  const toggleDesignFavorite = async (design: ModaGptDesign) => {
    setDesignActionId(design.id);
    setDesignNotice('');
    try {
      await apiPatch<{ success: true }>(`/api/merchant/modagpt/designs/${encodeURIComponent(design.id)}/favorite`, {
        isFavorite: !design.isFavorite
      });
      setDesigns(current => current
        .map(item => item.id === design.id ? { ...item, isFavorite: !item.isFavorite } : item)
        .filter(item => designFilter !== 'favorite' || item.isFavorite));
    } catch (actionError) {
      setDesignNotice(actionError instanceof Error ? actionError.message : (localizeCopy('收藏状态更新失败，请重试。', 'Impossibile aggiornare i preferiti.')));
    } finally {
      setDesignActionId(null);
    }
  };

  const deleteDesign = async (design: ModaGptDesign) => {
    const confirmed = window.confirm(localizeCopy('确定永久删除这件作品吗？', 'Eliminare definitivamente questo progetto?'));
    if (!confirmed) return;
    setDesignActionId(design.id);
    setDesignNotice('');
    try {
      await apiDelete<{ success: true }>(`/api/merchant/modagpt/designs/${encodeURIComponent(design.id)}`);
      setDesigns(current => current.filter(item => item.id !== design.id));
      setSelectedDesignId(null);
    } catch (actionError) {
      setDesignNotice(actionError instanceof Error ? actionError.message : (localizeCopy('作品删除失败，请重试。', 'Impossibile eliminare il progetto.')));
    } finally {
      setDesignActionId(null);
    }
  };

  return (
    <main className="relative mx-auto flex h-[calc(100dvh-env(safe-area-inset-top))] max-w-3xl flex-col overflow-hidden bg-white text-neutral-900">
      {settingsOpen && <button type="button" aria-label={localizeCopy('关闭设置', 'Chiudi impostazioni')} onClick={() => setSettingsOpen(false)} className="absolute inset-0 z-30 cursor-default" />}
      <header className="relative z-40 flex h-14 shrink-0 items-center justify-between border-b border-neutral-200/70 bg-white px-3">
        <div className="flex min-w-0 items-center gap-1">
          {activeSection === 'chat' ? <button
            type="button"
            aria-label={localizeCopy('打开聊天历史', 'Apri cronologia')}
            aria-expanded={historyOpen}
            onClick={() => { setHistoryOpen(true); setModelMenuOpen(false); }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-700 hover:bg-neutral-100"
          >
            <Menu className="h-5 w-5" />
          </button> : <button type="button" onClick={() => setActiveSection('chat')} aria-label={localizeCopy('返回聊天', 'Torna alla chat')} className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-700 hover:bg-neutral-100"><ArrowLeft className="h-5 w-5" /></button>}
          <div className="relative">
            <button
              type="button"
              aria-label={localizeCopy('账户设置', 'Impostazioni account')}
              aria-expanded={settingsOpen}
              onClick={() => { setSettingsOpen(open => !open); setHistoryOpen(false); setModelMenuOpen(false); }}
              className="flex h-10 w-9 items-center justify-center rounded-xl text-neutral-700 hover:bg-neutral-100"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {settingsOpen && <div role="dialog" aria-label={localizeCopy('账户与设置', 'Account e impostazioni')} onClick={event => event.stopPropagation()} className="absolute left-0 top-12 z-50 max-h-[min(75dvh,520px)] w-[min(86vw,320px)] overflow-y-auto rounded-2xl border border-neutral-200 bg-[#f7f7f8] p-3 shadow-2xl">
              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">{localizeCopy('账户', 'ACCOUNT')}</p>
                <h2 className="mt-1 text-base font-bold text-neutral-950">{merchantName || (localizeCopy("商家账户", "Account commerciante"))}</h2>
                <p className="mt-1 text-[10px] text-neutral-500">{isIt ? `Piano ${entitlements?.plan === 'pro' ? 'Pro' : 'Free'}` : `当前套餐：${entitlements?.plan === 'pro' ? 'Pro 高级版' : 'Free 免费版'}`}</p>
              </div>
              <button type="button" onClick={() => { setPricingOpen(true); setSettingsOpen(false); }} className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left">
                <CreditCard className="h-4 w-4 shrink-0 text-neutral-600" />
                <span><b className="block text-xs text-neutral-900">{localizeCopy('会员与 Credits', 'Piano e Credits')}</b><small className="mt-1 block text-[9px] text-neutral-500">{localizeCopy('查看价格和功能状态', 'Prezzi e stato del servizio')}</small></span>
              </button>
              <div className="mt-3 rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-4 w-4 shrink-0 text-neutral-600" />
                  <span><b className="block text-xs text-neutral-900">{localizeCopy('本月聊天额度', 'Chat questo mese')}</b><small className="mt-1 block text-[9px] text-neutral-500">{entitlements ? `${entitlements.remaining.chat} / ${entitlements.quotas.chat}` : '—'}</small></span>
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-neutral-200 bg-white p-4">
                <b className="text-xs text-neutral-900">{localizeCopy('隐私与帮助', 'Privacy e supporto')}</b>
                <p className="mt-1 text-[10px] leading-4 text-neutral-500">{localizeCopy('AI 换衣仅在你明确同意后才会将图片发送到 Fal。请勿上传个人敏感信息或未获授权的照片。', 'Le foto per Try-On sono inviate a Fal solo dopo il consenso esplicito; non caricare dati o immagini sensibili.')}</p>
              </div>
            </div>}
          </div>
          {activeSection === 'chat' ? <div className="relative min-w-0">
          <button
            type="button"
            aria-expanded={modelMenuOpen}
            onClick={() => { setModelMenuOpen(open => !open); setHistoryOpen(false); }}
            className="flex max-w-[56vw] items-center gap-1.5 rounded-xl px-2.5 py-2 text-left text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            <span className="truncate">ModaGPT</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
          </button>
          {modelMenuOpen && <div className="absolute left-0 top-11 z-40 w-64 rounded-2xl border border-neutral-200 bg-white p-3 shadow-xl">
            <p className="text-xs font-semibold text-neutral-900">{localizeCopy('AI 助手', 'Assistente')}</p>
            <p className="mt-1 text-[10px] text-neutral-500">
              {isIt
                ? `Piano ${entitlements?.plan === 'pro' ? 'Pro' : 'Free'} · Chat ${entitlements?.remaining.chat ?? '—'}/${entitlements?.quotas.chat ?? '—'} rimanenti questo mese`
                : `套餐：${entitlements?.plan === 'pro' ? '高级版' : '基础版'} · 本月聊天剩余 ${entitlements?.remaining.chat ?? '—'}/${entitlements?.quotas.chat ?? '—'}`}
            </p>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2.5">
                <span><b className="block text-xs">ModaGPT</b><small className="text-[10px] text-neutral-500">{isIt ? `Ragionamento: ${entitlements?.providers.reasoning === 'deepseek' ? 'DeepSeek' : 'AI locale'}` : `推理：${entitlements?.providers.reasoning === 'deepseek' ? 'DeepSeek' : '本地 AI'}`}</small></span>
              <Check className="h-4 w-4 text-emerald-700" />
            </div>
              <p className="mt-2 text-[10px] leading-4 text-neutral-500">{isIt ? `Immagini: ${entitlements?.providers.image === 'fal' ? 'Fal' : entitlements?.providers.image === 'local' ? 'locale' : 'non disponibile'}. Provider e credenziali sono gestiti dal server.` : `图像：${entitlements?.providers.image === 'fal' ? 'Fal' : entitlements?.providers.image === 'local' ? '本地服务' : '未配置'}。模型和密钥由服务器安全管理。`}</p>
          </div>}
          </div> : <div className="min-w-0 px-2 text-sm font-semibold text-neutral-900">{activeSection === 'create' ? (localizeCopy('创作中心', 'Create')) : (localizeCopy('我的作品', 'Designs'))}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setPricingOpen(true)}
            className="rounded-xl border border-neutral-200 px-2.5 py-2 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            {localizeCopy('方案', 'Piani')}
          </button>
          {activeSection === 'chat' && <button type="button" onClick={startNewConversation} disabled={busy} aria-label={localizeCopy('新对话', 'Nuova conversazione')} className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-700 hover:bg-neutral-100 disabled:opacity-40">
            <MessageSquarePlus className="h-5 w-5" />
          </button>}
          <button type="button" onClick={onExit} aria-label={localizeCopy('退出聊天', 'Esci dalla chat')} className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-700 hover:bg-neutral-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </header>
      {historyOpen && <div className="absolute inset-0 z-40 bg-neutral-950/35" onClick={() => setHistoryOpen(false)}>
        <aside role="dialog" aria-modal="true" aria-label={localizeCopy('聊天历史', 'Cronologia chat')} onClick={event => event.stopPropagation()} className="flex h-full w-[min(86vw,340px)] flex-col border-r border-neutral-200 bg-[#f7f7f8] p-3 shadow-2xl">
          <div className="flex items-center justify-between px-1 pb-3">
            <span className="text-sm font-semibold">ModaGPT</span>
            <button type="button" onClick={() => setHistoryOpen(false)} aria-label={localizeCopy('关闭历史', 'Chiudi cronologia')} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-neutral-200"><X className="h-4 w-4" /></button>
          </div>
          <button type="button" onClick={startNewConversation} className="flex h-11 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-left text-xs font-semibold hover:bg-neutral-50">
            <MessageSquarePlus className="h-4 w-4" />{localizeCopy('新聊天', 'Nuova conversazione')}
          </button>
          <label className="relative mt-3 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input value={historySearch} onChange={event => setHistorySearch(event.target.value)} placeholder={localizeCopy('搜索聊天', 'Cerca nelle chat')} className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-neutral-400" />
          </label>
          <p className="px-1 pb-2 pt-4 text-[10px] font-semibold text-neutral-500">{localizeCopy('最近 · 与 Web 商家端同步', 'Recenti · Cronologia condivisa con Web')}</p>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {filteredConversations.map(conversation => <button key={conversation.id} type="button" onClick={() => void selectConversation(conversation.id)} className={`block w-full rounded-xl px-3 py-2.5 text-left hover:bg-white ${conversation.id === conversationId ? 'bg-white shadow-sm' : ''}`}>
              <span className="block truncate text-xs font-medium text-neutral-800">{conversation.title}</span>
              <span className="mt-1 block text-[9px] text-neutral-400">{new Date(conversation.updatedAt).toLocaleString(getIntlLocale(lang), { dateStyle: 'short', timeStyle: 'short' })} · {conversation.messageCount}</span>
            </button>)}
            {!filteredConversations.length && <p className="px-3 py-4 text-[10px] text-neutral-400">{loadingHistory ? (localizeCopy('正在加载…', 'Caricamento…')) : (historySearch ? (localizeCopy('没有找到匹配的聊天。', 'Nessun risultato.')) : (localizeCopy('还没有聊天记录。', 'Nessuna conversazione.')))}</p>}
          </div>
          <div className="border-t border-neutral-200 px-1 pt-3 text-[9px] leading-4 text-neutral-500">{isIt ? 'Le conversazioni sono associate al tuo account commerciante.' : `当前商家：${merchantName || 'RUDA'}`}</div>
        </aside>
      </div>}

      <section className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-3 ${activeSection === 'chat' ? 'flex flex-col' : ''}`}>
        {activeSection === 'chat' ? (!messages.length ? (
          <div className="my-auto flex flex-col items-center justify-center py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-emerald-300 shadow-lg">
              <Sparkles className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-xl font-semibold tracking-tight text-neutral-900">
              {localizeCopy("ModaGPT{{RUDA_ARG_0}}", "ModaGPT{{RUDA_ARG_0}}", [String(merchantName ? ` · ${merchantName}` : '')])}
            </h1>
            <p className="mt-2 max-w-sm text-xs leading-5 text-neutral-500">
              {localizeCopy('把聊天作为入口，逐步整合服装设计、服装出图与 AI 换衣能力。', 'ModaGPT unisce chat, progettazione moda e strumenti creativi in un unico spazio.')}
            </p>
            <div className="mt-5 grid w-full max-w-md grid-cols-2 gap-2.5">
              {fashionModes.filter(mode => ['design', 'generate', 'tryon', 'inspiration'].includes(mode.id)).map(({ id, title, description, Icon, imageTask }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => activateCreation(id)}
                  className="relative min-h-28 rounded-2xl border border-neutral-200 bg-white p-3 text-left shadow-sm transition hover:border-neutral-300 hover:shadow-md active:scale-[0.99]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800"><Icon className="h-4 w-4" /></span>
                  <b className="mt-2 block text-xs text-neutral-900">{title}</b>
                  <span className="mt-1 block text-[9px] leading-4 text-neutral-500">{description}</span>
                  {imageTask && <span className={`absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${entitlements?.plan === 'pro' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{fashionModeAvailable(id, entitlements) ? (localizeCopy('高级版', 'Pro')) : entitlements?.plan === 'free' ? (localizeCopy('升级', 'Pro')) : (localizeCopy('暂不可用', 'Non disponibile'))}</span>}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-2xl space-y-5 py-3" aria-live="polite">
            {messages.map((message, index) => (
              <div key={`${index}-${message.role}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={message.role === 'user' ? 'max-w-[88%] rounded-3xl rounded-br-lg bg-neutral-100 px-4 py-3 text-sm leading-6 text-neutral-900' : 'w-full max-w-[94%] text-sm leading-6 text-neutral-800'}>
                  {message.role === 'assistant' && <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-neutral-700"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-950 text-emerald-300"><Sparkles className="h-3.5 w-3.5" /></span>ModaGPT</div>}
                  <div className="break-words">{renderMessageContent(message.content, index)}</div>
                  {message.role === 'assistant' && message.dataBasis?.length ? <div className="mt-2 rounded-xl border border-neutral-200/80 bg-neutral-50 px-3 py-2 text-[10px] leading-4 text-neutral-500">
                    <span className="font-semibold text-neutral-600">{localizeCopy('回答依据：', 'Fonti utilizzate:')}</span>
                    {message.dataBasis.filter((basis): basis is string => typeof basis === 'string').join(' · ')}
                  </div> : null}
                  {message.role === 'assistant' && message.actions?.some(action => assistantActionTargets[action.target]) && <div className="mt-3 flex flex-wrap gap-2">
                    {message.actions.filter(action => assistantActionTargets[action.target]).map(action => {
                      const target = assistantActionTargets[action.target];
                      if (!target) return null;
                      return <button key={action.target} type="button" onClick={() => onNavigate(target)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-neutral-950 px-3 text-[10px] font-semibold text-white hover:bg-neutral-700">
                        {action.label}<ArrowRight className="h-3 w-3" />
                      </button>;
                    })}
                  </div>}
                  {message.role === 'user' && message.attachments?.length ? <div className="mt-2 flex flex-wrap justify-end gap-2">
                    {message.attachments.map((attachment, attachmentIndex) => attachment.kind === 'image'
                      ? <img key={`${attachment.name}-${attachmentIndex}`} src={attachment.dataUrl} alt={attachment.name} className="h-20 w-20 rounded-xl border border-neutral-200 object-cover" />
                      : <span key={`${attachment.name}-${attachmentIndex}`} className="max-w-48 truncate rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[10px] text-neutral-600"><Paperclip className="mr-1 inline h-3 w-3" />{attachment.name}</span>)}
                  </div> : null}
                  {message.imageDataUrl && <img src={message.imageDataUrl} alt={localizeCopy('ModaGPT 生成结果', 'Risultato ModaGPT')} className="mt-3 max-h-[65dvh] w-full rounded-2xl border border-neutral-200 object-contain" />}
                  {message.imageDataUrl && <div className="mt-2 flex flex-wrap gap-2">
                    <a href={message.imageDataUrl} download={`modagpt-design-${index + 1}.webp`} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50"><Download className="h-3.5 w-3.5" />{localizeCopy('下载图片', 'Scarica immagine')}</a>
                    {message.designCategory && (message.designId
                      ? <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold text-emerald-800"><Check className="h-3.5 w-3.5" />{localizeCopy('已保存到作品库', 'Salvato nei progetti')}</span>
                      : <button type="button" onClick={() => void saveDesign(message, index)} disabled={savingDesignMessage !== null} className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-950 px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50">
                        {savingDesignMessage === message ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                        {savingDesignMessage === message ? (localizeCopy('正在保存…', 'Salvataggio…')) : (localizeCopy('保存到作品库', 'Salva nei progetti'))}
                      </button>)}
                  </div>}
                  {message.role === 'assistant' && <div className="mt-2 flex items-center gap-1 text-neutral-400">
                    <button type="button" onClick={() => void copyMessage(message.content, index)} aria-label={localizeCopy('复制回答', 'Copia risposta')} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-neutral-100 hover:text-neutral-700">{copiedMessage === index ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}</button>
                    {message.id && <>
                      <button type="button" onClick={() => void submitMessageFeedback(message, 'up')} disabled={feedbackBusyId !== null} aria-label={localizeCopy('回答有帮助', 'Risposta utile')} aria-pressed={message.feedback === 'up'} className={`flex h-8 w-8 items-center justify-center rounded-lg hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50 ${message.feedback === 'up' ? 'text-emerald-700' : ''}`}><ThumbsUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => void submitMessageFeedback(message, 'down')} disabled={feedbackBusyId !== null} aria-label={localizeCopy('回答没帮助', 'Risposta non utile')} aria-pressed={message.feedback === 'down'} className={`flex h-8 w-8 items-center justify-center rounded-lg hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50 ${message.feedback === 'down' ? 'text-rose-700' : ''}`}><ThumbsDown className="h-4 w-4" /></button>
                    </>}
                    {index === messages.length - 1 && latestUserMessage && <button type="button" onClick={() => void sendQuestion(latestUserMessage.content, latestUserMessage.attachments || [])} disabled={busy} aria-label={localizeCopy('重新生成回答', 'Rigenera risposta')} className="flex h-8 items-center gap-1 rounded-lg px-2 text-[10px] hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-40"><RefreshCw className="h-3.5 w-3.5" />{localizeCopy('重新生成', 'Rigenera')}</button>}
                  </div>}
                </div>
              </div>
            ))}
            {busy && (
              <div role="status" className="flex items-center gap-2 pl-9 text-[11px] text-neutral-500">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                {fashionMode === 'productLaunch' && productLaunchProgress?.stage === 'copy'
                  ? (localizeCopy('正在撰写商品文案…', 'Creazione descrizione prodotto…'))
                  : imageBusy
                ? fashionMode === 'productLaunch' && productLaunchProgress
                  ? localizeCopy(`正在生成上新图片 ${Math.min(productLaunchProgress.completedImages + 1, productLaunchProgress.totalImages)}/${productLaunchProgress.totalImages}…`, `Generazione immagine ${Math.min(productLaunchProgress.completedImages + 1, productLaunchProgress.totalImages)}/${productLaunchProgress.totalImages}…`)
                  : (localizeCopy('正在生成图片…', 'Creazione immagine…'))
                : (localizeCopy('ModaGPT 正在思考…', 'ModaGPT sta rispondendo…'))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )) : activeSection === 'create' ? (
              <div className="mx-auto w-full max-w-2xl py-4">
                <div className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800">{localizeCopy('FASHION AI STUDIO', 'FASHION AI STUDIO')}</p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">{localizeCopy('今天想创作什么？', 'Cosa vuoi creare oggi?')}</h1>
                  <p className="mt-1 text-xs leading-5 text-neutral-500">{localizeCopy('选择一个专业创作流程，随后可在聊天中继续完善需求。', 'Scegli un flusso guidato. Puoi continuare a perfezionare il brief in chat.')}</p>
                </div>
                <div className="space-y-3">
                  {fashionModes.filter(mode => mode.id !== 'inspiration').map(mode => {
                    const isAvailable = mode.available && fashionModeAvailable(mode.id, entitlements);
                    const lockedByPlan = mode.available
                      && (mode.id === 'generate' || mode.id === 'tryon' || mode.id === 'productLaunch')
                      && entitlements?.plan === 'free';
                    return (
                      <article key={mode.id} className={`rounded-2xl border bg-white p-4 ${selectedCreation === mode.id ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200'}`}>
                        <button type="button" onClick={() => {
                          setSelectedCreation(mode.id);
                          setQuestion(mode.prompt);
                        }} className="flex w-full items-start gap-3 text-left">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800"><mode.Icon className="h-5 w-5" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <b className="text-sm text-neutral-900">{mode.title}</b>
                              {mode.available
                                ? lockedByPlan
                                  ? <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-800">{localizeCopy('需高级版', 'Pro required')}</span>
                                  : <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-800">{localizeCopy('可使用', 'Disponibile')}</span>
                                : <span className="rounded-full bg-neutral-100 px-2 py-1 text-[9px] font-semibold text-neutral-500">{localizeCopy('后续阶段', 'In sviluppo')}</span>}
                            </span>
                            <span className="mt-1 block text-[10px] leading-4 text-neutral-500">{mode.description}</span>
                          </span>
                        </button>
                        {selectedCreation === mode.id && (
                          <div className="mt-4 border-t border-neutral-100 pt-3">
                            {mode.id === 'design' && <div className="mb-3 flex flex-wrap gap-1.5">
                              {([localizeCopy("女装", "Donna"), localizeCopy("男装", "Uomo"), localizeCopy("童装", "Bambino"), localizeCopy("礼服", "Abito"), localizeCopy("街头风", "Streetwear"), localizeCopy("鞋包配饰", "Accessori")]).map(item => (
                                <button key={item} type="button" onClick={() => setQuestion(current => current ? `${current}，${item}` : item)} className="rounded-full border border-neutral-200 px-2.5 py-1.5 text-[9px] text-neutral-600 hover:bg-neutral-50">{item}</button>
                              ))}
                            </div>}
                            {mode.id === 'generate' && <p className="mb-3 text-[10px] leading-4 text-neutral-500">{localizeCopy('描述服装款式、材质、颜色、构图和背景。图片由服务器当前配置的图像服务生成。', 'Descrivi capo, materiale, colore, inquadratura e sfondo. La generazione usa il provider immagini configurato dal server.')}</p>}
                            {mode.id === 'tryon' && <p className="mb-3 text-[10px] leading-4 text-neutral-500">{localizeCopy('下一步上传人物照和服装图，并选择服装类别。发送到 Fal 处理前必须确认授权。', 'Nel passaggio successivo caricherai la foto della persona e del capo e sceglierai la categoria. È richiesto il consenso prima dell’invio a Fal.')}</p>}
                            {mode.id === 'edit' && <p className="mb-3 rounded-xl bg-neutral-50 p-3 text-[10px] leading-4 text-neutral-500">{localizeCopy('图片编辑模型、局部蒙版和参考图处理尚未接入；此处只展示规划流程，不会提交或生成。', 'Modifica immagine, maschere e riferimenti non sono ancora collegati a un modello di editing.')}</p>}
                            <button
                              type="button"
                              disabled={!isAvailable}
                              onClick={() => isAvailable && activateCreation(mode.id, true)}
                              className="min-h-10 w-full rounded-xl bg-neutral-950 px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
                            >
                              {!mode.available
                                ? (localizeCopy('暂未开放', 'Non ancora disponibile'))
                                : lockedByPlan
                                  ? (localizeCopy('需要高级版 · 查看方案', 'Upgrade richiesto · vedi piani'))
                                  : (localizeCopy('继续到聊天', 'Continua in chat'))}
                            </button>
                            {lockedByPlan && <button type="button" onClick={() => setPricingOpen(true)} className="mt-2 w-full py-1 text-[10px] font-semibold text-neutral-600">{localizeCopy('查看套餐方案', 'Visualizza i piani')}</button>}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
                <button type="button" onClick={() => activateCreation('inspiration')} className="mt-3 flex min-h-12 w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 text-left text-xs font-semibold text-neutral-800">
                  <Lightbulb className="h-4 w-4 text-amber-600" />{localizeCopy('打开设计灵感助手', 'Apri l’assistente di ispirazione')}<span className="ml-auto text-neutral-400">→</span>
                </button>
              </div>
            ) : (
              <div className="mx-auto min-h-full w-full max-w-2xl py-4">
                {selectedDesign ? (
                  <div>
                    <button type="button" onClick={() => setSelectedDesignId(null)} className="mb-3 inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"><ArrowLeft className="h-4 w-4" />{localizeCopy('返回作品库', 'Portfolio')}</button>
                    <img src={selectedDesign.imageUrl} alt={selectedDesign.title} className="max-h-[55dvh] w-full rounded-2xl border border-neutral-200 bg-neutral-50 object-contain" />
                    <h1 className="mt-4 text-base font-bold text-neutral-950">{selectedDesign.title}</h1>
                    <p className="mt-1 text-[10px] text-neutral-500">{new Date(selectedDesign.createdAt).toLocaleString(getIntlLocale(lang))} · {selectedDesign.imageWidth} × {selectedDesign.imageHeight}</p>
                    <p className="mt-3 whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 text-xs leading-5 text-neutral-700">{selectedDesign.prompt}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href={`/api/merchant/modagpt/designs/${encodeURIComponent(selectedDesign.id)}/image?download=1`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-neutral-950 px-3 text-xs font-semibold text-white"><Download className="h-4 w-4" />{localizeCopy('下载作品', 'Scarica')}</a>
                      <button type="button" onClick={() => void toggleDesignFavorite(selectedDesign)} disabled={designActionId === selectedDesign.id} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 disabled:opacity-50"><Heart className={`h-4 w-4 ${selectedDesign.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />{selectedDesign.isFavorite ? (localizeCopy('取消收藏', 'Rimuovi dai preferiti')) : (localizeCopy('收藏', 'Preferiti'))}</button>
                      <button type="button" onClick={() => void deleteDesign(selectedDesign)} disabled={designActionId === selectedDesign.id} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 px-3 text-xs font-semibold text-rose-700 disabled:opacity-50"><Trash2 className="h-4 w-4" />{localizeCopy('删除', 'Elimina')}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-lg font-bold text-neutral-950">{localizeCopy('我的 ModaGPT 作品', 'Il tuo portfolio moda')}</h1>
                        <p className="mt-1 text-[10px] text-neutral-500">{localizeCopy('已保存的创作仅对当前商家账号可见。', 'Le tue immagini salvate, private e accessibili solo al tuo negozio.')}</p>
                      </div>
                      <button type="button" aria-label={localizeCopy('刷新作品', 'Aggiorna portfolio')} onClick={() => setDesignsRefresh(current => current + 1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50"><RefreshCw className={`h-4 w-4 ${designsLoading ? 'animate-spin' : ''}`} /></button>
                    </div>
                    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                      {(['all', 'imageGeneration', 'tryOn', 'favorite'] as const).map(filter => (
                        <button key={filter} type="button" onClick={() => { setDesignFilter(filter); setSelectedDesignId(null); }} className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-semibold ${designFilter === filter ? 'bg-neutral-950 text-white' : 'border border-neutral-200 text-neutral-600'}`}>
                          {filter === 'all' ? (localizeCopy('全部', 'Tutti')) : filter === 'imageGeneration' ? (localizeCopy('图片', 'Immagini')) : filter === 'tryOn' ? (localizeCopy('换衣', 'Try-On')) : (localizeCopy('收藏', 'Preferiti'))}
                        </button>
                      ))}
                    </div>
                    {designNotice && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[10px] text-rose-800">{designNotice}</p>}
                    {designsLoading ? (
                      <div className="flex min-h-48 items-center justify-center text-xs text-neutral-500"><RefreshCw className="mr-2 h-4 w-4 animate-spin" />{localizeCopy('正在加载作品…', 'Caricamento…')}</div>
                    ) : designs.length ? (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {designs.map(design => (
                          <button key={design.id} type="button" onClick={() => setSelectedDesignId(design.id)} className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left">
                            <span className="relative block aspect-[4/5] bg-neutral-50">
                              <img src={design.imageUrl} alt={design.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                              <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm"><Heart className={`h-3.5 w-3.5 ${design.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-neutral-400'}`} /></span>
                            </span>
                            <span className="block truncate px-3 pt-2 text-[11px] font-semibold text-neutral-800">{design.title}</span>
                            <span className="block px-3 pb-3 pt-1 text-[9px] text-neutral-500">{design.category === 'tryOn' ? (localizeCopy('AI 换衣', 'AI Try-On')) : (localizeCopy('AI 图片设计', 'Image design'))} · {new Date(design.createdAt).toLocaleDateString(getIntlLocale(lang))}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600"><ImagePlus className="h-5 w-5" /></div>
                        <p className="mt-3 text-sm font-semibold text-neutral-900">{localizeCopy('还没有保存的作品', 'Nessun progetto salvato')}</p>
                        <p className="mt-1 max-w-xs text-[10px] leading-4 text-neutral-500">{localizeCopy('生成图片后，点击“保存到作品库”即可在这里查看、收藏或下载。', 'Dopo aver generato un’immagine, tocca “Salva nei progetti” per conservarla qui.')}</p>
                        <button type="button" onClick={() => setActiveSection('create')} className="mt-4 rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white">{localizeCopy('去创作中心', 'Esplora Create')}</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
      </section>

      {activeSection === 'chat' && <footer className="z-10 shrink-0 border-t border-neutral-100 bg-white px-3 pt-2">
        {error && (
          <div role="alert" className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-[10px] leading-4 text-rose-800">
            <p>{error}</p>
            {productLaunchRecovery && <button
              type="button"
              onClick={() => void resumeProductLaunchImages()}
              disabled={busy}
              className="mt-2 rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-semibold text-rose-900 disabled:opacity-50"
            >{localizeCopy(`只补生成剩余 ${productLaunchRecovery.totalImages - productLaunchRecovery.nextImageIndex} 张图片`, `Genera solo le ${productLaunchRecovery.totalImages - productLaunchRecovery.nextImageIndex} immagini mancanti`)}</button>}
          </div>
        )}
        {fashionMode && <div className="mx-auto mb-2 w-full max-w-2xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-neutral-600">{fashionModes.find(mode => mode.id === fashionMode)?.title}{fashionMode === 'generate' && entitlements && ` · ${entitlements.remaining.imageGeneration}/${entitlements.quotas.imageGeneration}`}{fashionMode === 'tryon' && entitlements && ` · ${entitlements.remaining.tryOn}/${entitlements.quotas.tryOn}`}{fashionMode === 'productLaunch' && entitlements && ` · ${entitlements.remaining.imageGeneration}/${entitlements.quotas.imageGeneration} ${localizeCopy('图片额度', 'quote immagini')}`}</span>
            <button type="button" onClick={() => setFashionMode(null)} disabled={busy} className="text-[10px] text-neutral-500 hover:text-neutral-900 disabled:opacity-50">{localizeCopy('关闭', 'Chiudi')}</button>
          </div>
          {fashionMode === 'productLaunch' && <div className="mb-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <label className="flex items-center justify-between gap-3 text-[10px] font-semibold text-neutral-700">
              <span>{localizeCopy('本次生成图片数量（每张消耗 1 次图片额度）', 'Numero immagini (1 quota per immagine)')}</span>
              <select value={productLaunchImageCount} disabled={busy} onChange={event => setProductLaunchImageCount(Number(event.target.value))} className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 disabled:opacity-50">
                {[1, 2, 3, 4].map(count => <option key={count} value={count}>{count}</option>)}
              </select>
            </label>
            <p className="mt-2 text-[9px] leading-4 text-neutral-500">{localizeCopy('生成文案与图片草稿，需人工审核；不会创建或发布商品。图片仅按文字生成，服务商可能收费。', 'Crea bozze di testo e immagini da verificare. Nessuna pubblicazione automatica; il provider può addebitare costi.')}</p>
          </div>}
          {(fashionMode === 'generate' || fashionMode === 'tryon') && entitlements?.plan === 'free' && <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-900">{localizeCopy('该创作能力需开通 ModaGPT 高级版，当前由 RUDA 管理员人工开通。', 'Questa capacità richiede ModaGPT Pro. Il piano Pro è attivato manualmente dall’amministratore RUDA.')}</p>}
          {fashionMode === 'productLaunch' && entitlements?.plan === 'free' && <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-900">{localizeCopy('商品上新工作流需要 ModaGPT Pro，并且对话与图片额度都必须充足。', 'Il workflow richiede ModaGPT Pro e quote sufficienti sia per la chat che per le immagini.')}</p>}
          {fashionMode === 'tryon' && <div className="mb-2 space-y-2">
            <input ref={personImageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => {
              const file = event.target.files?.[0];
              if (!file) return;
              void readImageFile(file).then(setPersonImage).catch(fileError => setError(fileError instanceof Error ? fileError.message : '读取人物图片失败。'));
              event.currentTarget.value = '';
            }} />
            <input ref={garmentImageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => {
              const file = event.target.files?.[0];
              if (!file) return;
              void readImageFile(file).then(setGarmentImage).catch(fileError => setError(fileError instanceof Error ? fileError.message : '读取服装图片失败。'));
              event.currentTarget.value = '';
            }} />
            <select
              value={tryOnCategory}
              onChange={event => setTryOnCategory(event.target.value as 'tops' | 'bottoms' | 'one-pieces')}
              aria-label={localizeCopy('服装类别', 'Categoria del capo')}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700"
            >
              <option value="tops">{localizeCopy('上装、衬衫和外套', 'Top, camicie e giacche')}</option>
              <option value="bottoms">{localizeCopy('裤装和裙装', 'Pantaloni e gonne')}</option>
              <option value="one-pieces">{localizeCopy('连衣裙和连体服', 'Abiti interi e tute')}</option>
            </select>
            <p className="text-[9px] leading-4 text-neutral-500">
              {localizeCopy('此换衣模型根据两张图片和所选类别生成，不处理文字风格指令。图片副本会发送到 Fal，设置为一天后过期。', 'Il modello usa le due immagini e la categoria selezionata; non applica istruzioni testuali. Fal riceve copie temporanee delle immagini, con scadenza di un giorno.')}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => personImageInputRef.current?.click()} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 text-[10px] font-semibold">
                <UserRound className="h-4 w-4" />{personImage ? (localizeCopy('已选人物照', 'Persona caricata')) : (localizeCopy('上传人物照片', 'Foto persona'))}
              </button>
              <button type="button" onClick={() => garmentImageInputRef.current?.click()} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 text-[10px] font-semibold">
                <Shirt className="h-4 w-4" />{garmentImage ? (localizeCopy('已选服装', 'Capo caricato')) : (localizeCopy('上传服装图片', 'Foto capo'))}
              </button>
            </div>
            {(personImage || garmentImage) && <div className="flex gap-2">
              {personImage && <img src={personImage} alt={localizeCopy('已选人物照片', 'Persona selezionata')} className="h-16 w-16 rounded-lg border object-cover" />}
              {garmentImage && <img src={garmentImage} alt={localizeCopy('已选服装照片', 'Capo selezionato')} className="h-16 w-16 rounded-lg border object-cover" />}
            </div>}
            <label className="flex items-start gap-2 rounded-xl bg-neutral-50 p-2.5 text-[9px] leading-4 text-neutral-600">
              <input type="checkbox" checked={privacyConsent} onChange={event => setPrivacyConsent(event.target.checked)} className="mt-0.5 accent-neutral-900" />
              <span>{localizeCopy('我同意将所选人物照和服装图发送到 Fal 服务商服务器进行 AI 换衣。请只上传已获授权的图片，不要上传其他敏感信息。', 'Acconsento all’invio delle immagini a Fal per il try-on. Carica solo immagini che sei autorizzato a usare e non includere dati o foto sensibili.')}</span>
            </label>
          </div>}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {modeQuickPrompts.map(prompt => <button key={prompt} type="button" onClick={() => setQuestion(current => current ? `${current}，${prompt}` : prompt)} className="shrink-0 rounded-full border border-neutral-200 px-3 py-1.5 text-[10px] text-neutral-600 hover:bg-neutral-50">{prompt}</button>)}
          </div>
        </div>}
        {composerToolsOpen && <div className="mx-auto mb-2 grid w-full max-w-2xl grid-cols-2 gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg">
          {fashionModes.filter(mode => mode.id !== 'edit').map(({ id, title, Icon }) => <button key={id} type="button" onClick={() => {
            activateCreation(id);
            setComposerToolsOpen(false);
          }} className="flex min-h-11 items-center gap-2 rounded-xl px-2.5 text-left text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50">
            <Icon className="h-4 w-4 shrink-0 text-neutral-500" />{title}
          </button>)}
          <button type="button" onClick={() => {
            chatAttachmentInputRef.current?.click();
            setComposerToolsOpen(false);
          }} className="flex min-h-11 items-center gap-2 rounded-xl px-2.5 text-left text-[11px] font-medium text-neutral-700 hover:bg-neutral-50">
            <Paperclip className="h-4 w-4" />{localizeCopy('上传图片或文件', 'Allega immagini o file')}
          </button>
        </div>}
        {fashionMode !== 'generate' && fashionMode !== 'tryon' && <input
          ref={chatAttachmentInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,text/markdown,text/csv,.pdf,.txt,.md,.csv"
          className="hidden"
          onChange={event => {
            void addChatAttachments(event.currentTarget.files);
            event.currentTarget.value = '';
          }}
        />}
        {attachments.length > 0 && <div className="mx-auto mb-2 flex w-full max-w-2xl flex-wrap gap-2">
          {attachments.map((attachment, index) => <span key={`${attachment.name}-${index}`} className="relative flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-1.5 pr-8 text-[10px] text-neutral-600">
            {attachment.kind === 'image'
              ? <img src={attachment.dataUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
              : <Paperclip className="ml-2 h-4 w-4" />}
            <span className="max-w-36 truncate">{attachment.name}</span>
            <button type="button" aria-label={localizeCopy("移除 {{RUDA_ARG_0}}", "Rimuovi {{RUDA_ARG_0}}", [String(attachment.name)])} onClick={() => setAttachments(current => current.filter((_, currentIndex) => currentIndex !== index))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"><X className="h-3.5 w-3.5" /></button>
          </span>)}
        </div>}
        <form
          onSubmit={event => {
            event.preventDefault();
            void sendQuestion();
          }}
          className="mx-auto flex w-full max-w-2xl items-end gap-2 rounded-3xl border border-neutral-200 bg-white p-2 shadow-[0_2px_14px_rgba(0,0,0,0.08)] focus-within:border-neutral-400"
        >
          <button type="button" aria-label={localizeCopy('创作工具', 'Strumenti creativi')} aria-expanded={composerToolsOpen} onClick={() => setComposerToolsOpen(open => !open)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100"><Plus className="h-5 w-5" /></button>
          <textarea
            value={question}
            onChange={event => setQuestion(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendQuestion();
              }
            }}
            maxLength={500}
            rows={1}
            aria-label={localizeCopy('发送消息给 ModaGPT', 'Messaggio per ModaGPT')}
            placeholder={isIt ? 'Scrivi a ModaGPT…' : fashionMode === 'tryon' ? '描述你想试穿的服装…' : fashionMode === 'generate' ? '描述你想生成的服装图…' : fashionMode === 'design' ? '说说你想设计的服装…' : '给 ModaGPT 发消息…'}
            className="max-h-32 min-h-10 flex-1 resize-y border-0 bg-transparent px-2 py-2 text-sm leading-5 text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-0"
          />
          {fashionMode !== 'generate' && fashionMode !== 'tryon' && <button type="button" onClick={toggleVoiceInput} aria-label={recordingVoice ? (localizeCopy('停止语音输入', 'Interrompi dettatura')) : (localizeCopy('语音输入', 'Dettatura vocale'))} aria-pressed={recordingVoice} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${recordingVoice ? 'bg-rose-100 text-rose-700' : 'text-neutral-600 hover:bg-neutral-100'}`}><Mic className="h-4 w-4" /></button>}
          <button
            type="submit"
            aria-label={localizeCopy('发送消息', 'Invia messaggio')}
            disabled={busy || (!question.trim() && attachments.length === 0)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </form>
        <p className="mt-1.5 text-center text-[9px] leading-4 text-neutral-400">
          {localizeCopy('语音由浏览器识别。附件原文件不保存；提取文本和图片说明会进入与 Web 共用的聊天记录，请核对重要信息。', 'La voce è riconosciuta dal browser. I file originali non vengono salvati; testo e descrizioni entrano nella cronologia condivisa con Web.')}
        </p>
      </footer>}
      <nav className="z-20 grid h-[58px] shrink-0 grid-cols-3 border-t border-neutral-200/80 bg-white px-2 pb-[env(safe-area-inset-bottom)]" aria-label={localizeCopy('ModaGPT 导航', 'Navigazione ModaGPT')}>
        {([
          { id: 'chat', label: localizeCopy('聊天', 'Chat'), Icon: MessageSquarePlus },
          { id: 'create', label: localizeCopy('创作', 'Create'), Icon: Sparkles },
          { id: 'designs', label: localizeCopy('作品', 'Designs'), Icon: Shirt }
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={activeSection === id ? 'page' : undefined}
            onClick={() => { setActiveSection(id); setHistoryOpen(false); setModelMenuOpen(false); setSettingsOpen(false); setError(''); }}
            className={`flex flex-col items-center justify-center gap-1 text-[9px] font-medium transition-colors ${activeSection === id ? 'text-neutral-950' : 'text-neutral-400 hover:text-neutral-700'}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
      {pricingOpen && (
        <ModaGptPricingSheet
          isIt={isIt}
          currentPlan={entitlements?.plan || 'free'}
          onClose={() => setPricingOpen(false)}
        />
      )}
    </main>
  );
};
