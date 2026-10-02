type PublicSupportArticle = {
  title: string;
  keywords: string[];
  content: string;
  source: 'platform_verified' | 'industry_general';
};

const publicSupportArticles: PublicSupportArticle[] = [
  {
    title: 'RUDA 平台与商家目录',
    keywords: ['RUDA', '平台', '商家', '供应商', '公司', '品牌', '店铺', 'showroom', '商家地图', 'directory'],
    source: 'platform_verified',
    content: 'RUDA Fashion 是面向服装行业的 B2B 平台。访客可以在官方展厅/商家地图浏览已认证商家，并打开商家的官方店铺查看公开资料。商家搜索结果以平台已认证且公开展示的商家资料为准；没有匹配结果时不能推测平台外的公司。'
  },
  {
    title: '查找商品、商品价格与起订量',
    keywords: ['找货', '商品', '产品', '现货', '价格', '批发价', '起订量', 'MOQ', '库存', '款号', '配码'],
    source: 'platform_verified',
    content: '买家可以在现货商城或商家官方店铺浏览公开商品。商品详情页展示该商品已发布的价格、起订量及可公开的规格资料。AI 可以按平台当前已发布的公开商品记录查找，但不能保证实时可分配库存、报价有效期、税费、运费或交货时间；下单前应在商品页和商家确认。'
  },
  {
    title: '特价与折扣市场',
    keywords: ['特价', '折扣', '清仓', '促销', '便宜', '最低价', '打折', 'clearance', 'discount', 'sale'],
    source: 'platform_verified',
    content: 'RUDA 首页有特价市场。特价搜索只应匹配已发布、非私密、未受独家保护且状态为 clearance 的公开商品。商品价格比较使用平台展示的批发单价；起订量和实际库存仍需查看商品详情并向商家确认。'
  },
  {
    title: '买家批发采购流程',
    keywords: ['怎么采购', '怎么下单', '批发', '采购', '购物车', '结算', '订单', '买家注册', '买手'],
    source: 'platform_verified',
    content: '买家通常先浏览公开商品或商家店铺，核对款号、颜色、尺码、价格和起订量，再将可采购商品加入采购车并按页面流程提交订单。具体商品的 SKU 配比、库存、付款和发货条件以商品页、订单页及买卖双方确认的信息为准。'
  },
  {
    title: '商家入驻与经营类型',
    keywords: ['商家入驻', '开店', '注册商家', '申请商家', '生产厂家', '工厂', '批发商', '零售店', '品牌商', '制造商'],
    source: 'platform_verified',
    content: 'RUDA 商家申请可选择生产商/品牌商、制造商、批发商、Atelier/设计工作室或分销商等经营类型，并选择平台经营区域。申请表需要填写企业及联系人资料，提交后进入平台审核。审核结果、所需补件、费用和处理时间必须以平台实际通知为准，不能预先承诺。'
  },
  {
    title: '商家工作台常用功能',
    keywords: ['商家工作台', '商品管理', '上架', '库存流水', '发货', '物流', '商户资料', '系统设置', '财务对账'],
    source: 'platform_verified',
    content: '商家工作台中，经营总览查看经营数据和待办；商品管理维护商品资料和上架；库存流水查看库存变动；配货发货处理订单履约和物流记录；商户资料维护店铺基本信息；系统设置管理店铺规则与通知偏好；财务对账查看对账记录和收款账户审核状态。AI 不读取商家私有后台数据，不能确认个案状态。'
  },
  {
    title: '公开目录搜索边界',
    keywords: ['国家', '城市', '地点', '希腊', '意大利', '找商家', '找公司', '有哪些店'],
    source: 'platform_verified',
    content: '商家目录可按平台登记的国家、城市、商家类型和公开主营资料筛选。搜索仅返回平台已认证商家；没有匹配时应如实说明，并可建议浏览全部商家目录或调整筛选条件。'
  },
  {
    title: 'RUDA AI 助手可以做什么',
    keywords: [
      '你能做什么', '你能帮我做什么', '你可以做什么', '可以做什么', '你会什么', '能帮什么', '你可以帮我', '可以帮忙', '怎么用你', '助手功能', '功能介绍', 'AI功能', '能不能帮我',
      '订单查询', '我的订单', '订单号', '客户资料', '销售额', '销售数据', '流量分析',
      '后台数据', '主题', '域名', '自动化', '促销活动', '修改商品', '编辑商品', '保存设置',
      'shopify', 'Shopify后台', 'capabilities', 'what can you do'
    ],
    source: 'platform_verified',
    content: 'RUDA 首页 AI 助手可按公司名、国家/城市、商家类型和公开主营资料查找已认证商家；可查找公开上架商品，问“便宜/最低价”时只在特价区按平台批发单价筛选，普通品类查询则搜索公开商品；可解释 RUDA 已确认的公开流程、服装批发和 B2B 基础知识，并协助起草文案或给出经营建议。首页助手不能读取买家或商家的私有订单、客户、后台库存、销售分析或账户资料；不能替用户编辑并保存商品、订单、设置、主题或营销自动化，也不能声称已完成这些操作。价格、库存和交易条件以商品详情及商家确认为准。'
  },
  {
    title: '服装批发经营建议与文案',
    keywords: ['经营建议', '选品建议', '销售建议', '写文案', '商品标题', '商品描述', '促销文案', '营销创意', '利润', '毛利'],
    source: 'industry_general',
    content: '助手可以根据用户提供的商品特点、目标客户和市场，起草商品标题、描述、推广文案或给出一般性的选品与经营建议。此类内容属于通用辅助，不代表 RUDA 的经营承诺、销售数据、平台政策或专业法律/税务意见；发布前应由商家核对事实并自行决定。'
  }
];

export function getPublicAssistantIntroReply(message: string): string | null {
  const normalized = normalize(message);
  const isChinese = /[\u4e00-\u9fff]/.test(message);
  const isItalian = /\b(?:chi sei|cosa sei|cosa puoi fare|come puoi aiutarmi)\b/i.test(message);
  const asksIdentity = /你是谁|你叫什么|你是(?:谁|什么|哪种|一个|人工智能|AI|机器人)?[?？。!！ ]*$/i.test(message) ||
    /\bwho are you\b|\bwhat are you\b/i.test(normalized);
  const asksCapabilities = /你能(?:帮我)?做什么|你可以(?:帮我)?做什么|你会什么|你能帮什么|你可以帮我|能帮我什么|what can you do|how can you help|cosa puoi fare|come puoi aiutarmi/i.test(message);
  if (!asksIdentity && !asksCapabilities) return null;

  if (isChinese) {
    return asksIdentity
      ? '我是 RUDA Fashion 的 AI 助手，可以帮你查找平台认证商家、公开商品和特价商品，也能回答 RUDA 平台流程及服装批发问题。你可以直接告诉我国家、城市、品类或商家名称。'
      : '我可以按公司名、国家/城市、经营类型和主营资料查找认证商家；查找公开商品和特价区最低价；解释 RUDA 平台流程、服装批发和 B2B 常识，也可以帮你起草商品文案和经营建议。私人订单、客户资料和后台数据需要登录后查看，我不能假装已经替你修改或保存设置。';
  }
  if (isItalian) {
    return asksIdentity
      ? 'Sono l’assistente AI di RUDA Fashion. Posso aiutarti a trovare commercianti verificati e prodotti pubblici e a rispondere a domande sulla piattaforma RUDA e sul commercio B2B della moda.'
      : 'Posso cercare commercianti verificati per nome, paese, città e attività; trovare prodotti pubblici e offerte; spiegare le procedure RUDA e aiutarti a preparare testi e suggerimenti commerciali. Ordini privati, clienti e dati riservati sono accessibili solo dopo l’accesso.';
  }
  return asksIdentity
    ? 'I’m the RUDA Fashion AI assistant. I can help find verified merchants and public products, including sale items, and answer questions about RUDA and fashion B2B.'
    : 'I can find verified merchants by name, location, business type, and specialties; search public products and sale prices; explain confirmed RUDA workflows and general fashion B2B topics; and help draft product copy or business suggestions. Private orders, customer records, and back-office data require an authenticated account.';
}

export function getPublicAssistantSmallTalkReply(message: string): string | null {
  const normalized = normalize(message).replace(/[!?.,，。！、]+$/g, '').trim();
  const isChinese = /[\u4e00-\u9fff]/.test(message);
  const isItalian = /\b(?:ciao|salve|buongiorno|buonasera|buonanotte|grazie|arrivederci|a presto|come stai|posso chiederti|per favore|aiuto)\b/i.test(message);

  if (/^(?:你)?(?:吃了没有|吃了没|吃饭了吗|吃饭了没|吃过饭了吗|吃过了吗|have you eaten|did you eat|hai mangiato)$/.test(normalized)) {
    return isItalian ? 'Non mangio, sono un assistente AI, ma grazie per avermelo chiesto! E tu, come va?'
      : isChinese ? '我不会吃饭，不过谢谢你关心我！你呢，吃过了吗？'
        : 'I don’t eat, since I’m an AI assistant, but thanks for asking! How are you doing?';
  }
  if (/^(?:你多大|你几岁|你年龄多大|你多大了|多大了|how old are you|quanti anni hai)$/.test(normalized)) {
    return isItalian ? 'Non ho un’età reale: sono un assistente AI. Però sono qui volentieri per fare due chiacchiere!'
      : isChinese ? '我没有真实年龄，是一个 AI 助手。不过很乐意陪你聊聊天！'
        : 'I don’t have a real age—I’m an AI assistant. But I’m happy to chat with you!';
  }

  if (/^(?:你好|您好|嗨|哈喽|哈啰|早|早上好|上午好|中午好|下午好|晚上好|在吗|有人吗|ciao|salve|buongiorno|buonasera|hello|hello there|hi|hey|hey there|good morning|good afternoon|good evening)(?:呀|啊|喔|哦|呢)?$/.test(normalized)) {
    if (isChinese) return '你好！我在这里，可以帮你找认证商家、查公开商品和特价，也可以回答 RUDA 平台和服装批发问题。你想先了解什么？';
    if (isItalian) return 'Ciao! Sono qui per aiutarti a trovare commercianti verificati, prodotti pubblici e offerte, oppure a rispondere alle domande su RUDA e sulla moda B2B. Da dove vuoi iniziare?';
    return 'Hello! I can help you find verified merchants, public products and sale offers, or answer questions about RUDA and fashion B2B. What would you like to do?';
  }
  if (/^(?:谢谢|谢谢你|多谢|辛苦了|感谢|thank you|thanks|thanks a lot|thank you so much|thx|grazie|grazie mille)$/.test(normalized)) {
    return isChinese ? '不客气！如果你愿意，可以告诉我想找的商品、商家或平台问题，我继续帮你查。'
      : isItalian ? 'Prego! Dimmi pure se vuoi cercare un prodotto, un commerciante o hai una domanda sulla piattaforma.'
        : 'You’re welcome! Tell me if you’d like to find a product or merchant, or ask about the platform.';
  }
  if (/^(?:再见|拜拜|回头见|下次聊|bye|goodbye|see you|arrivederci|a presto)$/.test(normalized)) {
    return isChinese ? '再见，欢迎随时回来咨询 RUDA 商家、商品或批发采购问题！'
      : isItalian ? 'Arrivederci! Torna quando vuoi per domande su commercianti, prodotti o acquisti B2B RUDA.'
        : 'Goodbye! Come back anytime for help with RUDA merchants, products, or B2B purchasing.';
  }
  if (/^(?:你好吗|最近怎么样|你还好吗|how are you|come stai)$/.test(normalized)) {
    return isChinese ? '谢谢关心，我随时可以帮你查 RUDA 商家和公开商品。你今天想找什么？'
      : isItalian ? 'Grazie, sono pronto ad aiutarti. Che commerciante o prodotto stai cercando?'
        : 'Thanks for asking! I’m ready to help you find RUDA merchants or public products. What are you looking for today?';
  }
  if (/^(?:我想问一下|我可以问你吗|可以问你吗|有个问题|我有问题|帮帮我|需要帮助|我需要帮助|can i ask you something|can i ask you a question|i need help|help me|posso chiederti una cosa|ho bisogno di aiuto)$/.test(normalized)) {
    return isChinese ? '当然可以，请说。你可以问商家怎么找、某类商品哪里有、特价商品价格，或 RUDA 平台怎么使用。'
      : isItalian ? 'Certo, chiedimi pure. Posso aiutarti a trovare commercianti, prodotti e offerte o spiegarti come usare RUDA.'
        : 'Of course—go ahead. You can ask me to find merchants, products or sale prices, or explain how to use RUDA.';
  }
  if (/^(?:好的|好吧|明白了|知道了|ok|okay|got it|va bene|capito)$/.test(normalized)) {
    return isChinese ? '好的！需要查找时，直接告诉我商品品类、商家名称，或国家和城市即可。'
      : isItalian ? 'Perfetto! Quando vuoi, indicami il prodotto, il commerciante oppure paese e città.'
        : 'Great! When you’re ready, tell me a product category, merchant name, or country and city.';
  }
  return null;
}

export function getPublicAssistantFallbackReply(message: string): string {
  const isChinese = /[\u4e00-\u9fff]/.test(message);
  const isItalian = /\b(?:ciao|grazie|negozio|negozi|prodotto|prodotti|commerciante|commercianti|prezzo|aiuto|come|quale|quali)\b/i.test(message);
  if (isChinese) {
    return '没关系，我在这里，可以陪你把问题一步步理清楚。我们可以随便聊聊，也可以从找商家、查公开商品和特价、了解 RUDA 平台流程，或讨论服装批发生意开始。你现在最想聊什么？';
  }
  if (isItalian) {
    return 'Nessun problema, sono qui per aiutarti. Possiamo fare due chiacchiere, cercare commercianti e prodotti pubblici, trovare offerte o chiarire come funziona RUDA. Di cosa vorresti parlare?';
  }
  return 'No worries—I’m here to help. We can chat, look for verified merchants or public products, find sale offers, or talk through how RUDA works and general fashion B2B questions. What’s on your mind?';
}

function normalize(value: string): string {
  return value.normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function retrievePublicSupportKnowledge(question: string): string[] {
  const normalizedQuestion = normalize(question);
  return publicSupportArticles
    .map(article => ({
      article,
      score: article.keywords.reduce((score, keyword) => {
        const normalizedKeyword = normalize(keyword);
        return normalizedQuestion.includes(normalizedKeyword) ? score + normalizedKeyword.length : score;
      }, 0)
    }))
    .filter(result => result.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map(({ article }) => {
      const source = article.source === 'platform_verified' ? 'RUDA 已确认公开平台资料' : '服装/B2B 行业通用参考';
      return `[来源：${source}；标题：${article.title}]\n${article.content}`;
    });
}
