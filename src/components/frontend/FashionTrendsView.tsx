import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Bookmark, Camera, Download, Heart, Home, Link2, LoaderCircle, MessageCircle, Pause, Play, Plus, RotateCcw, Share2, Sparkles, UserRoundPlus, Volume2, VolumeX, X } from 'lucide-react';
import { useB2B } from '../../context/B2BContext';
import { apiGet, apiPost, apiPostWithUploadProgress } from '../../api/client';
import { getFeedWindowBounds } from '../../utils/feedWindow';
import { parseFashionDismissedItems, parseFashionTasteProfile, rankFashionItems, updateFashionDismissedItems, updateFashionTaste, type FashionTasteProfile, type FashionTasteSignal } from '../../utils/fashionTaste';
import { getIntlLocale } from '../../i18n/translations';


const editorialStories = [
  {
    id: 'silhouette',
    title: '流动的廓形',
    description: '宽肩、柔软垂坠和轻盈层次，重新定义日常着装比例。',
    category: '女装趋势',
    image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=85&w=1400&auto=format&fit=crop'
  },
  {
    id: 'texture',
    title: '触感先于颜色',
    description: '真丝、皮革与细密针织，把趋势变成可以触摸的商品语言。',
    category: '面料与针织',
    image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?q=85&w=1200&auto=format&fit=crop'
  },
  {
    id: 'city-uniform',
    title: '城市轻制服',
    description: '精确剪裁与舒适面料，成为下一季的核心日常。',
    category: '男装趋势',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=85&w=1200&auto=format&fit=crop'
  },
  {
    id: 'accessories',
    title: '小件，大态度',
    description: '包袋、鞋履和金属配饰，为造型增加记忆点。',
    category: '包袋配饰',
    image: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?q=85&w=1200&auto=format&fit=crop'
  }
];

const trendTags = [
  { zh: '女装趋势', it: 'Moda donna' },
  { zh: '男装趋势', it: 'Moda uomo' },
  { zh: '鞋履趋势', it: 'Calzature' },
  { zh: '包袋配饰', it: 'Borse e accessori' },
  { zh: '面料与针织', it: 'Tessuti e maglieria' },
  { zh: '秀场街拍', it: 'Sfilate e street style' }
];
const fashionCategories = trendTags.map(tag => tag.zh);
const getFashionCategory = (category?: string, ...content: string[]) => {
  if (category && fashionCategories.includes(category)) return category;
  const text = content.join(' ').toLocaleLowerCase();
  return trendTags.find(tag => text.includes(tag.zh.toLocaleLowerCase()))?.zh;
};
const postPageSize = 12;
const maximumUploadSize = 2_200_000;
const maximumVideoSize = 20 * 1024 * 1024;
const maximumVideoDurationSeconds = 180;

type FashionPost = {
  id: string;
  image: string | null;
  title: string;
  text: string;
  createdAt: string;
  mediaType: 'image' | 'video';
  videoUrl: string | null;
  category?: string;
};

type FeedItem = {
  id: string;
  image: string | null;
  title: string;
  text: string;
  sourceName: string;
  creatorId: string;
  mediaType: 'image' | 'video';
  videoUrl: string | null;
  category?: string;
};

type FashionSocialStats = {
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  followersCount: number;
  liked: boolean;
  saved: boolean;
  following: boolean;
};

type FashionSocialComment = {
  id: string;
  displayName: string;
  text: string;
  createdAt: string;
};

const compressImage = async (file: File) => {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('IMAGE_PROCESSING_UNAVAILABLE');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('IMAGE_COMPRESSION_FAILED')), 'image/jpeg', 0.82);
    });
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('IMAGE_READ_FAILED'));
      reader.onerror = () => reject(new Error('IMAGE_READ_FAILED'));
      reader.readAsDataURL(blob);
    });
    if (dataUrl.length > maximumUploadSize) throw new Error('IMAGE_TOO_LARGE');
    return dataUrl;
  } finally {
    bitmap.close();
  }
};

const createVideoPoster = async (file: File) => {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;
  try {
    const duration = await new Promise<number>((resolve, reject) => {
      video.onloadedmetadata = () => resolve(video.duration);
      video.onerror = () => reject(new Error('VIDEO_READ_FAILED'));
      video.src = objectUrl;
    });
    if (!Number.isFinite(duration) || duration <= 0 || duration > maximumVideoDurationSeconds) {
      throw new Error('VIDEO_DURATION_INVALID');
    }
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error('VIDEO_READ_FAILED'));
      video.currentTime = Math.min(0.5, duration / 2);
    });
    const scale = Math.min(1, 1400 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('IMAGE_PROCESSING_UNAVAILABLE');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(poster => poster ? resolve(poster) : reject(new Error('VIDEO_POSTER_FAILED')), 'image/jpeg', 0.78);
    });
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
};

const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('FILE_READ_FAILED'));
  reader.onerror = () => reject(new Error('FILE_READ_FAILED'));
  reader.readAsDataURL(file);
});

export const FashionTrendsView: React.FC = () => {
  const { setCurrentView, lang, addNotification, localizeCopy } = useB2B();
  const isIt = lang === 'it';
  const localizeTrendTag = (category: string) => {
    const tag = trendTags.find(item => item.zh === category || item.it === category);
    return tag ? localizeCopy(tag.zh, tag.it) : category;
  };
  const [viewerId] = useState(() => {
    const key = 'ruda_fashion_viewer_id';
    try {
      const existing = window.localStorage.getItem(key);
      if (existing && /^[a-f0-9-]{36}$/i.test(existing)) return existing;
      const generated = window.crypto.randomUUID();
      window.localStorage.setItem(key, generated);
      return generated;
    } catch {
      return window.crypto.randomUUID();
    }
  });
  const [tasteProfile, setTasteProfile] = useState<FashionTasteProfile>(() => {
    try {
      const saved = window.localStorage.getItem(`ruda_fashion_taste_${viewerId}`);
      return saved ? parseFashionTasteProfile(JSON.parse(saved)) : {};
    } catch (error) {
      console.warn('[fashion-taste-load]', error);
      return {};
    }
  });
  const [dismissedRecommendationIds, setDismissedRecommendationIds] = useState<string[]>(() => {
    try {
      const saved = window.localStorage.getItem(`ruda_fashion_dismissed_${viewerId}`);
      return saved ? parseFashionDismissedItems(JSON.parse(saved)) : [];
    } catch (error) {
      console.warn('[fashion-dismissed-load]', error);
      return [];
    }
  });
  const [recommendationTaste, setRecommendationTaste] = useState(tasteProfile);
  const [approvedImages, setApprovedImages] = useState<Array<{ id: string; image: string; title: string; sourceName: string; category?: string }>>([]);
  const [publicPosts, setPublicPosts] = useState<FashionPost[]>([]);
  const [socialById, setSocialById] = useState<Record<string, FashionSocialStats>>({});
  const [socialPending, setSocialPending] = useState<Record<string, boolean>>({});
  const [commentTarget, setCommentTarget] = useState<FeedItem | null>(null);
  const [comments, setComments] = useState<FashionSocialComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [feedStartId, setFeedStartId] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState('');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postText, setPostText] = useState('');
  const [postCategory, setPostCategory] = useState(fashionCategories[0]);
  const [postImage, setPostImage] = useState<string | null>(null);
  const [postVideo, setPostVideo] = useState<File | null>(null);
  const [postVideoPoster, setPostVideoPoster] = useState<Blob | null>(null);
  const [postVideoPreviewUrl, setPostVideoPreviewUrl] = useState<string | null>(null);
  const [postVideoPosterPreviewUrl, setPostVideoPosterPreviewUrl] = useState<string | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [postMediaProcessing, setPostMediaProcessing] = useState(false);
  const [feedMode, setFeedMode] = useState<'for-you' | 'latest' | 'following' | 'saved'>('for-you');
  const [mediaActionsItemId, setMediaActionsItemId] = useState<string | null>(null);
  const [activeSoundId, setActiveSoundId] = useState<string | null>(null);
  const [pausedVideoIds, setPausedVideoIds] = useState<Record<string, boolean>>({});
  const [heartBurstId, setHeartBurstId] = useState<string | null>(null);
  const [activeFeedIndex, setActiveFeedIndex] = useState(0);
  const [feedViewportHeight, setFeedViewportHeight] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postUploadProgress, setPostUploadProgress] = useState<number | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedScrollRef = useRef<HTMLDivElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const feedCardRefs = useRef(new Map<string, HTMLElement>());
  const feedVideoRefs = useRef(new Map<string, HTMLVideoElement>());
  const activeSoundIdRef = useRef<string | null>(null);
  const tasteProfileRef = useRef(tasteProfile);
  const tasteObservedItemsRef = useRef(new Set<string>());
  const pendingMediaTapRef = useRef<{ id: string; timer: number } | null>(null);
  const heartBurstTimerRef = useRef<number | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const postOffsetRef = useRef(0);
  const postCursorRef = useRef<string | null>(null);
  const loadingPostsRef = useRef(false);
  const postRequestGenerationRef = useRef(0);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  activeSoundIdRef.current = activeSoundId;

  const recordTasteSignal = (category: string | undefined, signal: FashionTasteSignal, active: boolean) => {
    if (!category) return;
    const nextProfile = updateFashionTaste(tasteProfileRef.current, category, signal, active);
    tasteProfileRef.current = nextProfile;
    setTasteProfile(nextProfile);
    try {
      window.localStorage.setItem(`ruda_fashion_taste_${viewerId}`, JSON.stringify(nextProfile));
    } catch (error) {
      console.warn('[fashion-taste-save]', error);
    }
  };
  const resetTasteProfile = () => {
    tasteProfileRef.current = {};
    setTasteProfile({});
    setRecommendationTaste({});
    setDismissedRecommendationIds([]);
    tasteObservedItemsRef.current.clear();
    try {
      window.localStorage.removeItem(`ruda_fashion_taste_${viewerId}`);
      window.localStorage.removeItem(`ruda_fashion_dismissed_${viewerId}`);
    } catch (error) {
      console.warn('[fashion-taste-reset]', error);
      addNotification('warning', '推荐偏好已清除', '本设备无法更新本地存储，请检查浏览器设置。');
      return;
    }
    setActiveFeedIndex(0);
    feedScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    addNotification('success', '推荐偏好已重置', '推荐内容将从通用排序重新开始。');
  };
  const dismissRecommendedItem = (item: FeedItem) => {
    const nextDismissed = updateFashionDismissedItems(dismissedRecommendationIds, item.id);
    setDismissedRecommendationIds(nextDismissed);
    try {
      window.localStorage.setItem(`ruda_fashion_dismissed_${viewerId}`, JSON.stringify(nextDismissed));
    } catch (error) {
      console.warn('[fashion-dismissed-save]', error);
      addNotification('warning', '暂时无法记录反馈', '请检查浏览器存储空间后重试。');
      return;
    }
    recordTasteSignal(item.category, 'dislike', true);
    setMediaActionsItemId(null);
    addNotification('success', '已减少相似推荐', '这条内容已从本设备的推荐中隐藏。');
  };
  const reduceRecommendedCategory = (item: FeedItem) => {
    recordTasteSignal(item.category, 'dislike', true);
    setMediaActionsItemId(null);
    addNotification('success', '已调整推荐偏好', item.category ? `之后会减少「${item.category}」相关内容。` : '之后会减少相似内容。');
  };

  useEffect(() => {
    const videoUrl = postVideo ? URL.createObjectURL(postVideo) : null;
    const posterUrl = postVideoPoster ? URL.createObjectURL(postVideoPoster) : null;
    setPostVideoPreviewUrl(videoUrl);
    setPostVideoPosterPreviewUrl(posterUrl);
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (posterUrl) URL.revokeObjectURL(posterUrl);
    };
  }, [postVideo, postVideoPoster]);

  const navigateToCatalog = () => {
    setCurrentView('catalog');
    if (window.location.pathname !== '/catalog') window.history.pushState({}, '', '/catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openFeed = (id: string) => {
    setFeedStartId(id);
    setFeedMode('for-you');
    setRecommendationTaste(tasteProfileRef.current);
    setMediaActionsItemId(null);
    setActiveFeedIndex(0);
    setFeedOpen(true);
  };
  const changeFeedMode = async (mode: 'for-you' | 'latest' | 'following' | 'saved') => {
    setFeedStartId(null);
    setFeedMode(mode);
    if (mode === 'for-you') setRecommendationTaste(tasteProfileRef.current);
    setMediaActionsItemId(null);
    setActiveFeedIndex(0);
    feedScrollRef.current?.scrollTo({ top: 0 });
    const generation = ++postRequestGenerationRef.current;
    loadingPostsRef.current = true;
    postCursorRef.current = null;
    setLoadingMorePosts(true);
    try {
      const sort = mode === 'latest' ? 'latest' : 'recommended';
      const savedQuery = mode === 'saved' ? `&saved=true&viewerId=${encodeURIComponent(viewerId)}` : '';
      const result = await apiGet<{ success: boolean; posts: FashionPost[]; hasMore: boolean; nextCursor?: string | null }>(
        `/api/fashion/posts?sort=${sort}&limit=${postPageSize}&offset=0${savedQuery}`
      );
      if (generation !== postRequestGenerationRef.current) return;
      setPublicPosts(result.posts || []);
      postOffsetRef.current = result.posts?.length || 0;
      postCursorRef.current = result.nextCursor || null;
      setHasMorePosts(result.hasMore);
    } catch {
      if (generation === postRequestGenerationRef.current) addNotification('warning', '信息流切换失败', '暂时无法刷新时尚内容，请稍后重试。');
    } finally {
      if (generation === postRequestGenerationRef.current) {
        loadingPostsRef.current = false;
        setLoadingMorePosts(false);
      }
    }
  };

  const feedItems = useMemo<FeedItem[]>(() => [
    ...publicPosts.map((post): FeedItem => ({
      id: post.id,
      image: post.image,
      title: post.title,
      text: post.text,
      sourceName: localizeCopy('RUDA 时尚社区', 'RUDA Community'),
      creatorId: 'creator-ruda-community',
      mediaType: post.mediaType === 'video' ? 'video' : 'image',
      videoUrl: post.videoUrl || null,
      category: getFashionCategory(post.category, post.title, post.text)
    })),
    ...approvedImages.map((item): FeedItem => ({
      id: item.id,
      image: item.image,
      title: item.title,
      text: '',
      sourceName: item.sourceName,
      creatorId: 'creator-ruda-editors',
      mediaType: 'image',
      videoUrl: null,
      category: getFashionCategory(item.category, item.title)
    })),
    ...editorialStories.map((story): FeedItem => ({
      id: story.id,
      image: story.image,
      title: story.title,
      text: story.description,
      sourceName: localizeCopy('RUDA 趋势精选', 'RUDA Fashion Edit'),
      creatorId: 'creator-ruda-editors',
      mediaType: 'image',
      videoUrl: null,
      category: story.category
    }))
  ], [publicPosts, approvedImages, isIt]);
  const archiveItems = useMemo(() => [
    ...publicPosts.map(post => ({ id: post.id, image: post.image, title: post.title, text: post.text, mediaType: post.mediaType, category: getFashionCategory(post.category, post.title, post.text) })),
    ...approvedImages.map(item => ({ id: item.id, image: item.image, title: item.title, text: '', mediaType: 'image' as const, category: getFashionCategory(item.category, item.title) })),
    ...editorialStories.map(story => ({ id: story.id, image: story.image, title: story.title, text: story.description, mediaType: 'image' as const, category: story.category }))
  ], [publicPosts, approvedImages]);
  const filteredArchiveItems = useMemo(() => {
    const query = archiveSearch.trim().replace(/^#/, '').toLocaleLowerCase();
    return archiveItems.filter(item => {
      const matchesCategory = !activeTag || item.category === activeTag;
      const matchesQuery = !query || `${item.title} ${item.text}`.toLocaleLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [activeTag, archiveItems, archiveSearch]);
  const visibleFeedItems = useMemo(
    () => {
      const followedItems = feedMode === 'following'
        ? feedItems.filter(item => socialById[item.creatorId]?.following)
        : feedItems;
      const selectedItems = feedMode === 'saved'
        ? followedItems.filter(item => socialById[item.id]?.saved)
        : followedItems;
      return feedMode === 'for-you'
        ? rankFashionItems(selectedItems.filter(item => !dismissedRecommendationIds.includes(item.id)), recommendationTaste)
        : selectedItems;
    },
    [dismissedRecommendationIds, feedItems, feedMode, recommendationTaste, socialById]
  );
  const { start: feedWindowStart, end: feedWindowEnd } = getFeedWindowBounds(visibleFeedItems.length, activeFeedIndex);
  const virtualFeedItems = visibleFeedItems.slice(feedWindowStart, feedWindowEnd);
  const feedVideoIds = virtualFeedItems.filter(item => item.videoUrl).map(item => item.id).join(',');
  const visibleCommunityPostCount = visibleFeedItems.filter(item => item.creatorId === 'creator-ruda-community').length;
  const lastCommunityFeedIndex = visibleFeedItems.reduce(
    (lastIndex, item, index) => item.creatorId === 'creator-ruda-community' ? index : lastIndex,
    -1
  );

  useEffect(() => {
    let active = true;
    void apiGet<{ success: boolean; items: Array<{ id: string; image: string; title: string; sourceName: string; category?: string }> }>('/api/fashion/editorial')
      .then(result => { if (active) setApprovedImages(result.items || []); })
      .catch(() => { if (active) addNotification('warning', '时尚内容暂不可用', '编辑精选图片加载失败，请稍后重试。'); });
    void apiGet<{ success: boolean; posts: FashionPost[]; hasMore: boolean; nextCursor?: string | null }>(`/api/fashion/posts?sort=recommended&limit=${postPageSize}&offset=0`)
      .then(result => {
        if (!active) return;
        const loadedPosts = result.posts || [];
        setPublicPosts(loadedPosts);
        postOffsetRef.current = loadedPosts.length;
        postCursorRef.current = result.nextCursor || null;
        setHasMorePosts(result.hasMore);
      })
      .catch(() => { if (active) addNotification('warning', '社区内容暂不可用', '时尚社区内容加载失败，请稍后重试。'); });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const nearbyItems = visibleFeedItems.slice(Math.max(0, activeFeedIndex - 3), activeFeedIndex + 9);
    const ids = [...new Set([
      ...nearbyItems.map(item => item.id),
      ...nearbyItems.map(item => item.creatorId)
    ])].filter(id => !socialById[id]);
    if (!ids.length) return;
    void apiGet<{ success: boolean; items: Record<string, FashionSocialStats> }>(
      `/api/fashion/social?ids=${encodeURIComponent(ids.join(','))}&viewerId=${encodeURIComponent(viewerId)}`
    ).then(result => {
      if (active) setSocialById(previous => ({ ...previous, ...result.items }));
    }).catch(() => {
      if (active) addNotification('warning', '互动数据暂不可用', '点赞、评论和收藏状态加载失败，请稍后重试。');
    });
    return () => { active = false; };
  }, [activeFeedIndex, visibleFeedItems, socialById, viewerId]);

  useEffect(() => {
    if (!feedOpen || feedMode !== 'for-you' || commentTarget || showComposer) return;
    const item = visibleFeedItems[activeFeedIndex];
    if (!item?.category || tasteObservedItemsRef.current.has(item.id)) return;
    const timer = window.setTimeout(() => {
      tasteObservedItemsRef.current.add(item.id);
      recordTasteSignal(item.category, 'view', true);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [feedOpen, feedMode, activeFeedIndex, visibleFeedItems, commentTarget, showComposer]);

  useEffect(() => {
    if (!commentTarget) return;
    let active = true;
    setCommentsLoading(true);
    void apiGet<{ success: boolean; comments: FashionSocialComment[] }>(
      `/api/fashion/social/${encodeURIComponent(commentTarget.id)}/comments?limit=100`
    ).then(result => {
      if (active) setComments(result.comments || []);
    }).catch(() => {
      if (active) addNotification('warning', '评论加载失败', '暂时无法读取评论，请稍后重试。');
    }).finally(() => {
      if (active) setCommentsLoading(false);
    });
    return () => { active = false; };
  }, [commentTarget, addNotification]);

  useEffect(() => {
    const resumeVideo = () => {
      const video = heroVideoRef.current;
      if (!video || document.visibilityState !== 'visible' || (!video.paused && !video.ended)) return;
      if (video.ended) video.currentTime = 0;
      void video.play().catch(error => console.warn('[fashion-video-playback]', error));
    };
    document.addEventListener('visibilitychange', resumeVideo);
    window.addEventListener('focus', resumeVideo);
    return () => {
      document.removeEventListener('visibilitychange', resumeVideo);
      window.removeEventListener('focus', resumeVideo);
    };
  }, []);

  useEffect(() => {
    if (!feedOpen || !feedStartId) return;
    const targetIndex = visibleFeedItems.findIndex(item => item.id === feedStartId);
    if (targetIndex < 0) return;
    setActiveFeedIndex(targetIndex);
    const frame = window.requestAnimationFrame(() => {
      const root = feedScrollRef.current;
      if (root) root.scrollTo({ top: targetIndex * root.clientHeight });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [feedOpen, feedStartId, visibleFeedItems.length]);

  useEffect(() => {
    setMediaActionsItemId(null);
  }, [activeFeedIndex]);

  useEffect(() => {
    if (!feedOpen) return;
    const root = feedScrollRef.current;
    if (!root) return;
    const updateHeight = () => setFeedViewportHeight(root.clientHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(root);
    return () => observer.disconnect();
  }, [feedOpen]);

  useEffect(() => {
    if (!feedOpen) return;
    const root = feedScrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(entries => {
      const activeEntry = entries
        .filter(entry => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (!activeEntry) return;
      const index = Number((activeEntry.target as HTMLElement).dataset.feedIndex);
      if (Number.isInteger(index)) setActiveFeedIndex(index);
      const activeId = (activeEntry.target as HTMLElement).dataset.feedId;
      const activeVideo = activeId ? feedVideoRefs.current.get(activeId) : null;
      setVideoProgress(activeVideo && activeVideo.duration ? activeVideo.currentTime / activeVideo.duration : 0);
    }, { root, threshold: [0.45, 0.7, 0.9] });
    feedCardRefs.current.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [feedOpen, feedWindowStart, feedWindowEnd]);

  useEffect(() => {
    if (!feedOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleFeedKeyDown = (event: KeyboardEvent) => {
      if (commentTarget || showComposer || lightboxImage) return;
      if (event.key === 'Escape') setFeedOpen(false);
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        feedScrollRef.current?.scrollBy({ top: feedScrollRef.current.clientHeight, behavior: 'smooth' });
      }
      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        feedScrollRef.current?.scrollBy({ top: -feedScrollRef.current.clientHeight, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleFeedKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleFeedKeyDown);
    };
  }, [feedOpen, commentTarget, showComposer, lightboxImage]);

  useEffect(() => {
    if (feedOpen) return;
    feedVideoRefs.current.forEach(video => video.pause());
    setActiveSoundId(null);
  }, [feedOpen]);

  useEffect(() => {
    if (!feedOpen || !feedVideoRefs.current.size) return;
    if (commentTarget || showComposer) {
      feedVideoRefs.current.forEach((video, id) => {
        video.pause();
        setPausedVideoIds(previous => previous[id] ? previous : { ...previous, [id]: true });
      });
      return;
    }
    const root = feedScrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          void video.play().then(() => setPausedVideoIds(previous => ({ ...previous, [video.dataset.itemId || '']: false }))).catch(error => {
            console.warn('[fashion-feed-video-playback]', error);
            setPausedVideoIds(previous => ({ ...previous, [video.dataset.itemId || '']: true }));
          });
        } else {
          video.pause();
          setPausedVideoIds(previous => ({ ...previous, [video.dataset.itemId || '']: true }));
          if (video.dataset.itemId === activeSoundIdRef.current) setActiveSoundId(null);
        }
      });
    }, { root, threshold: 0.65 });
    feedVideoRefs.current.forEach(video => observer.observe(video));
    return () => observer.disconnect();
  }, [feedOpen, feedVideoIds, commentTarget, showComposer]);

  useEffect(() => {
    if (!feedOpen) return;
    const root = feedScrollRef.current;
    const target = feedEndRef.current;
    if (!root || !target || !hasMorePosts
      || (feedMode === 'following' && !visibleCommunityPostCount)) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting) || loadingPostsRef.current) return;
      loadingPostsRef.current = true;
      setLoadingMorePosts(true);
      const generation = postRequestGenerationRef.current;
      const savedQuery = feedMode === 'saved' ? `&saved=true&viewerId=${encodeURIComponent(viewerId)}` : '';
      const cursorQuery = postCursorRef.current ? `&cursor=${encodeURIComponent(postCursorRef.current)}` : '';
      void apiGet<{ success: boolean; posts: FashionPost[]; hasMore: boolean; nextCursor?: string | null }>(
        `/api/fashion/posts?sort=${feedMode === 'latest' ? 'latest' : 'recommended'}&limit=${postPageSize}&offset=${postOffsetRef.current}${cursorQuery}${savedQuery}`
      ).then(result => {
        if (generation !== postRequestGenerationRef.current) return;
        const nextPosts = result.posts || [];
        postOffsetRef.current += nextPosts.length;
        postCursorRef.current = result.nextCursor || null;
        setPublicPosts(previous => {
          const existingIds = new Set(previous.map(post => post.id));
          return [...previous, ...nextPosts.filter(post => !existingIds.has(post.id))];
        });
        setHasMorePosts(result.hasMore && nextPosts.length > 0);
      }).catch(() => {
        if (generation === postRequestGenerationRef.current) addNotification('warning', '加载失败', '继续加载时尚内容失败，请稍后重试。');
      }).finally(() => {
        if (generation === postRequestGenerationRef.current) {
          loadingPostsRef.current = false;
          setLoadingMorePosts(false);
        }
      });
    }, { root, rootMargin: '400px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [feedOpen, hasMorePosts, feedMode, visibleCommunityPostCount, viewerId]);

  const toggleReaction = async (item: FeedItem, reaction: 'like' | 'save') => {
    const actionKey = `${item.id}:${reaction}`;
    if (socialPending[actionKey]) return;
    setSocialPending(previous => ({ ...previous, [actionKey]: true }));
    try {
      const result = await apiPost<{
        success: true;
        liked: boolean;
        saved: boolean;
        likesCount: number;
        savesCount: number;
      }>(`/api/fashion/social/${encodeURIComponent(item.id)}/reaction`, { viewerId, reaction });
      setSocialById(previous => ({
        ...previous,
        [item.id]: {
          likesCount: result.likesCount,
          commentsCount: previous[item.id]?.commentsCount || 0,
          savesCount: result.savesCount,
          followersCount: previous[item.id]?.followersCount || 0,
          liked: result.liked,
          saved: result.saved,
          following: previous[item.id]?.following || false
        }
      }));
      recordTasteSignal(item.category, reaction, reaction === 'like' ? result.liked : result.saved);
    } catch {
      addNotification('warning', reaction === 'like' ? '点赞失败' : '收藏失败', '操作未能保存，请稍后重试。');
    } finally {
      setSocialPending(previous => ({ ...previous, [actionKey]: false }));
    }
  };

  const toggleFeedVideo = (item: FeedItem) => {
    if (!item.videoUrl) return;
    const video = feedVideoRefs.current.get(item.id);
    if (!video) return;
    if (video.paused) {
      void video.play().then(() => setPausedVideoIds(previous => ({ ...previous, [item.id]: false }))).catch(error => {
        console.warn('[fashion-feed-video-playback]', error);
        setPausedVideoIds(previous => ({ ...previous, [item.id]: true }));
      });
    } else {
      video.pause();
      setPausedVideoIds(previous => ({ ...previous, [item.id]: true }));
    }
  };

  const handleFeedMediaTap = (item: FeedItem) => {
    const pendingTap = pendingMediaTapRef.current;
    if (pendingTap?.id === item.id) {
      window.clearTimeout(pendingTap.timer);
      pendingMediaTapRef.current = null;
      if (!socialById[item.id]?.liked) void toggleReaction(item, 'like');
      setHeartBurstId(item.id);
      if (heartBurstTimerRef.current !== null) window.clearTimeout(heartBurstTimerRef.current);
      heartBurstTimerRef.current = window.setTimeout(() => setHeartBurstId(null), 750);
      return;
    }
    if (pendingTap) {
      window.clearTimeout(pendingTap.timer);
      const previousItem = visibleFeedItems.find(feedItem => feedItem.id === pendingTap.id);
      if (previousItem) toggleFeedVideo(previousItem);
    }
    const timer = window.setTimeout(() => {
      if (pendingMediaTapRef.current?.timer !== timer) return;
      pendingMediaTapRef.current = null;
      toggleFeedVideo(item);
    }, 280);
    pendingMediaTapRef.current = { id: item.id, timer };
  };

  const toggleFollow = async (item: FeedItem) => {
    const actionKey = `${item.creatorId}:follow`;
    if (socialPending[actionKey]) return;
    setSocialPending(previous => ({ ...previous, [actionKey]: true }));
    try {
      const result = await apiPost<{ success: true; following: boolean; followersCount: number }>(
        `/api/fashion/social/${encodeURIComponent(item.creatorId)}/follow`,
        { viewerId }
      );
      setSocialById(previous => ({
        ...previous,
        [item.creatorId]: {
          likesCount: previous[item.creatorId]?.likesCount || 0,
          commentsCount: previous[item.creatorId]?.commentsCount || 0,
          savesCount: previous[item.creatorId]?.savesCount || 0,
          followersCount: result.followersCount,
          liked: previous[item.creatorId]?.liked || false,
          saved: previous[item.creatorId]?.saved || false,
          following: result.following
        }
      }));
    } catch {
      addNotification('warning', '关注失败', '暂时无法关注该创作者，请稍后重试。');
    } finally {
      setSocialPending(previous => ({ ...previous, [actionKey]: false }));
    }
  };

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = commentDraft.trim();
    if (!commentTarget || !text || text.length > 300 || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      const result = await apiPost<{
        success: true;
        comment: FashionSocialComment;
        commentsCount: number;
      }>(`/api/fashion/social/${encodeURIComponent(commentTarget.id)}/comments`, { viewerId, text });
      setComments(previous => [...previous, result.comment]);
      setSocialById(previous => ({
        ...previous,
        [commentTarget.id]: {
          likesCount: previous[commentTarget.id]?.likesCount || 0,
          commentsCount: result.commentsCount,
          savesCount: previous[commentTarget.id]?.savesCount || 0,
          followersCount: previous[commentTarget.id]?.followersCount || 0,
          liked: previous[commentTarget.id]?.liked || false,
          saved: previous[commentTarget.id]?.saved || false,
          following: previous[commentTarget.id]?.following || false
        }
      }));
      setCommentDraft('');
    } catch {
      addNotification('warning', '评论发送失败', '评论未能发布，请检查内容后重试。');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const submitPublicPost = async (event: React.FormEvent) => {
    event.preventDefault();
    if ((!postTitle.trim() && !postText.trim() && !postImage && !postVideo) || postSubmitting) return;
    if (!rightsConfirmed) {
      addNotification('warning', '请确认内容授权', '请确认你拥有该图片或视频的发布权，或已获得权利人许可。');
      return;
    }
    setPostSubmitting(true);
    try {
      const result = postVideo
        ? await (async () => {
          if (!postVideoPoster) throw new Error('VIDEO_POSTER_MISSING');
          const form = new FormData();
          form.set('title', postTitle);
          form.set('text', postText);
          form.set('category', postCategory);
          form.set('rightsConfirmed', 'true');
          form.set('video', postVideo, postVideo.name);
          form.set('poster', postVideoPoster, 'poster.jpg');
          setPostUploadProgress(0);
          return apiPostWithUploadProgress<{ success: true; post: FashionPost }>(
            '/api/fashion/posts/video',
            form,
            600_000,
            (loaded, total) => setPostUploadProgress(total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0)
          );
        })()
        : await apiPost<{ success: true; post: FashionPost }>('/api/fashion/posts', {
          title: postTitle,
          text: postText,
          category: postCategory,
          image: postImage || '',
          rightsConfirmed: true,
          mediaType: 'image',
          video: ''
        });
      setPostTitle('');
      setPostText('');
      setPostCategory(fashionCategories[0]);
      setPostImage(null);
      setPostVideo(null);
      setPostVideoPoster(null);
      setRightsConfirmed(false);
      setShowComposer(false);
      addNotification('success', '投稿已提交', '内容已进入审核队列，通过审核后会显示在时尚信息流。');
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      const message = code === 'REQUEST_FAILED_413'
            ? '视频请求超过服务器限制，请换用较小的视频重试。'
            : code === 'REQUEST_FAILED_429'
              ? '发布过于频繁，请稍后再试。'
            : code === 'REQUEST_TIMEOUT'
              ? '上传超时，请检查网络后重试。'
            : code === 'FASHION_POST_VIDEO_TOO_LARGE'
              ? '视频不能超过 20 MB。'
            : code === 'FASHION_POST_VIDEO_POSTER_TOO_LARGE'
              ? '视频封面文件过大，请重新选择视频。'
            : code === 'FASHION_POST_VIDEO_FORMAT_INVALID' || code === 'FASHION_POST_VIDEO_INVALID'
              ? '视频格式不受支持，请选择 MP4、WebM 或 MOV。'
            : code === 'FASHION_POST_VIDEO_POSTER_INVALID'
              ? '视频封面无法读取，请重新选择视频。'
            : code === 'FASHION_COMMUNITY_CAPACITY_REACHED'
              ? '社区投稿暂时已满，请稍后再试。'
            : code === 'FASHION_POST_VIDEO_DURATION_INVALID'
              ? '视频时长必须在 3 分钟以内。'
            : code === 'FASHION_POST_RIGHTS_CONFIRMATION_REQUIRED'
              ? '请先确认你拥有内容发布权或已获得授权。'
            : code === 'NETWORK_ERROR'
              ? '网络连接失败，请检查网络后重试。'
            : code === 'FASHION_POST_CATEGORY_INVALID'
              ? '时尚分类无效，请重新选择分类后发布。'
                : code === 'VIDEO_POSTER_MISSING'
                  ? '视频封面生成失败，请重新选择视频。'
                  : code || '内容未能上传，请检查网络后重试。';
      addNotification('warning', '发布失败', message);
    } finally {
      setPostSubmitting(false);
      setPostUploadProgress(null);
    }
  };

  const handleMediaSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setRightsConfirmed(false);
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const videoMimeByExtension: Record<string, string> = {
      mp4: 'video/mp4',
      m4v: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime'
    };
    const detectedVideoType = videoTypes.includes(file.type) ? file.type : videoMimeByExtension[extension];
    if (!imageTypes.includes(file.type) && !detectedVideoType) {
      addNotification('warning', '媒体格式不支持', '请选择 JPG、PNG、WebP、MP4、WebM 或 MOV 文件。');
      return;
    }
    const isVideo = Boolean(detectedVideoType);
    if (file.size > (isVideo ? maximumVideoSize : 12 * 1024 * 1024)) {
      addNotification('warning', '文件太大', isVideo ? '视频不能超过 20 MB。' : '图片请选择小于 12 MB 的文件。');
      return;
    }
    setPostMediaProcessing(true);
    try {
      if (isVideo) {
        const normalizedVideoFile = file.type === detectedVideoType ? file : new File([file], file.name, { type: detectedVideoType });
        const poster = await createVideoPoster(normalizedVideoFile);
        if (poster.size > maximumUploadSize) throw new Error('VIDEO_POSTER_TOO_LARGE');
        setPostImage(null);
        setPostVideo(normalizedVideoFile);
        setPostVideoPoster(poster);
      } else {
        setPostImage(await compressImage(file));
        setPostVideo(null);
        setPostVideoPoster(null);
        setRightsConfirmed(false);
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      addNotification('warning', '媒体处理失败', code === 'VIDEO_DURATION_INVALID'
        ? '视频时长需在 3 分钟以内。'
        : code === 'IMAGE_TOO_LARGE' || code === 'VIDEO_POSTER_TOO_LARGE'
          ? '图片压缩后仍过大，请换一张图片重试。'
          : '无法读取此媒体文件，请换一个 MP4、WebM 或 MOV 文件重试。');
    } finally {
      setPostMediaProcessing(false);
    }
  };

  const shareImage = async (src: string, title: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: 'RUDA Fashion', url: src });
      } else {
        await navigator.clipboard.writeText(src);
        addNotification('success', '分享地址已复制', '图片地址已复制到剪贴板。');
      }
    } catch {
      if (!navigator.share) addNotification('warning', '分享失败', '请稍后重试或手动复制图片地址。');
    }
  };

  const shareFeedItem = async (item: FeedItem) => {
    const mediaUrl = item.videoUrl || item.image;
    if (!mediaUrl) return;
    setMediaActionsItemId(null);
    const url = new URL(mediaUrl, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, text: item.text || 'RUDA Fashion', url });
      } else {
        await navigator.clipboard.writeText(url);
        addNotification('success', '分享地址已复制', '内容链接已复制到剪贴板。');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (!navigator.share) addNotification('warning', '分享失败', '请稍后重试或手动复制内容地址。');
      else console.warn('[fashion-share]', error);
    }
  };

  const copyFeedItemLink = async (item: FeedItem) => {
    const mediaUrl = item.videoUrl || item.image;
    if (!mediaUrl) return;
    try {
      await navigator.clipboard.writeText(new URL(mediaUrl, window.location.origin).toString());
      addNotification('success', '链接已复制', '内容链接已复制到剪贴板。');
    } catch (error) {
      console.error('[fashion-copy-link]', error);
      addNotification('warning', '复制失败', '请检查浏览器剪贴板权限后重试。');
    }
    setMediaActionsItemId(null);
  };

  const downloadFeedItem = async (
    item: FeedItem,
    mediaUrl = item.videoUrl || item.image,
    downloadLabel = item.videoUrl ? 'video' : 'image'
  ) => {
    if (!mediaUrl) return;
    try {
      const response = await fetch(new URL(mediaUrl, window.location.origin), { mode: 'cors' });
      if (!response.ok) throw new Error(`DOWNLOAD_FAILED_${response.status}`);
      const blobUrl = URL.createObjectURL(await response.blob());
      const extension = new URL(mediaUrl, window.location.origin).pathname.split('.').pop() || (downloadLabel === 'video' ? 'mp4' : 'jpg');
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `ruda-fashion-${item.id}-${downloadLabel}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error('[fashion-download]', error);
      addNotification('warning', '下载失败', '媒体服务器暂不支持下载，请稍后重试。');
    }
    setMediaActionsItemId(null);
  };

  useEffect(() => {
    if (!lightboxImage) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxImage(null);
      if (event.key === '+' || event.key === '=') setLightboxZoom(value => Math.min(3, Number((value + 0.25).toFixed(2))));
      if (event.key === '-') setLightboxZoom(value => Math.max(1, Number((value - 0.25).toFixed(2))));
      if (event.key === '0') setLightboxZoom(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage]);

  useEffect(() => () => {
    if (heartBurstTimerRef.current !== null) window.clearTimeout(heartBurstTimerRef.current);
    if (pendingMediaTapRef.current) window.clearTimeout(pendingMediaTapRef.current.timer);
  }, []);

  return (
    <>
    <section className="group relative isolate flex min-h-[min(780px,calc(100svh-8rem))] items-end overflow-hidden bg-neutral-950 text-white sm:min-h-[min(900px,calc(100svh-9rem))]">
      <img
        src={editorialStories[0].image}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover transition-transform duration-[1800ms] group-hover:scale-[1.02] ${heroVideoReady ? 'opacity-0' : 'opacity-70'}`}
        referrerPolicy="no-referrer"
      />
      <video
        ref={heroVideoRef}
        src="/videos/ruda-fashion.mp4"
        aria-label={localizeCopy('RUDA 时尚全屏视频', 'Film di moda RUDA')}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onCanPlay={event => {
          setHeroVideoReady(true);
          if (event.currentTarget.paused) void event.currentTarget.play().catch(error => console.warn('[fashion-video-playback]', error));
        }}
        onError={() => setHeroVideoReady(false)}
        onEnded={event => {
          event.currentTarget.currentTime = 0;
          void event.currentTarget.play().catch(error => console.warn('[fashion-video-playback]', error));
        }}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${heroVideoReady ? 'opacity-80' : 'opacity-0'}`}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.04)_35%,rgba(0,0,0,0.72)_100%)]" />
      <div className="absolute left-5 top-1/2 hidden -translate-y-1/2 [writing-mode:vertical-rl] text-[9px] font-semibold uppercase tracking-[0.34em] text-white/65 lg:block">
        {localizeCopy('意大利风格 · 欧洲灵感', 'ITALIAN STYLE · EUROPEAN VISION')}
      </div>
        <div className="absolute right-3 top-[calc(env(safe-area-inset-top)+6.85rem)] z-10 flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[9px] text-white/75 backdrop-blur-sm">
          <span>{String(activeFeedIndex + 1).padStart(2, '0')} / {String(visibleFeedItems.length).padStart(2, '0')}</span>
          <span className="h-2.5 w-px bg-white/30" />
          <span>{localizeCopy('双击点赞 · 点击视频暂停', 'Doppio tocco · Mi piace')}</span>
        </div>
      <div className="relative mx-auto flex w-full max-w-[1440px] flex-col items-center px-5 pb-16 pt-20 text-center sm:px-10 sm:pb-24">
        <p className="inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.36em] text-white/80 sm:text-[11px]"><span className="h-px w-7 bg-white/50" />{localizeCopy('时尚 · 文化 · 趋势', 'Moda · Cultura · Tendenze')}<span className="h-px w-7 bg-white/50" /></p>
        <h1 className="mt-6 font-serif text-7xl font-medium leading-[0.76] tracking-[-0.09em] sm:text-9xl lg:text-[11rem]">RUDA<span className="mt-4 block font-sans text-[0.13em] font-medium tracking-[0.72em]">FASHION</span></h1>
        <p className="mt-7 max-w-xl text-xs leading-6 text-white/85 sm:text-sm">{localizeCopy('从意大利风格出发，捕捉欧洲时尚的每一束灵感。', 'Un diario visivo dedicato allo stile italiano e alle nuove idee della moda europea.')}</p>
        <button type="button" onClick={() => document.getElementById('fashion-visuals')?.scrollIntoView({ behavior: 'smooth' })} className="mt-7 inline-flex min-h-11 cursor-pointer items-center gap-2 border border-white/80 px-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-white hover:text-black">
          {localizeCopy('浏览时尚内容', 'Entra nel mondo RUDA')} <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
      <div className="absolute bottom-5 left-5 flex items-center gap-3 text-[8px] font-semibold uppercase tracking-[0.22em] text-white/60 sm:bottom-7 sm:left-8"><span>01</span><span className="h-px w-10 bg-white/40" /><span>RUDA FASHION FILM</span></div>
      <span className="absolute bottom-5 right-5 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/70 sm:bottom-7 sm:right-8">{localizeCopy('秋冬 · 2026', 'AUTUNNO / INVERNO 2026')}</span>
    </section>

    <main className="bg-white text-neutral-950">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between border-b border-neutral-200 px-4 sm:px-8">
        <button type="button" onClick={() => setCurrentView('home')} className="text-left">
          <span className="block text-[8px] font-semibold uppercase tracking-[0.24em] text-neutral-500">{localizeCopy('RUDA 时尚视觉誌', 'IL DIARIO DELLA MODA')}</span>
          <span className="font-serif text-lg font-semibold tracking-tight">{localizeCopy('时尚 · 趋势', 'Moda · Tendenze')}</span>
        </button>
        <div className="flex items-center gap-3">
          <button type="button" onClick={navigateToCatalog} className="inline-flex items-center gap-1 border-b border-neutral-400 pb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-700 transition-colors hover:border-black hover:text-black">
            {localizeCopy('逛折扣', 'Shopping')} <ArrowUpRight className="h-3 w-3" />
          </button>
          <button type="button" onClick={() => setShowComposer(true)} aria-label={localizeCopy('发布内容', 'Pubblica')} className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-950 text-white transition-transform hover:scale-105">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div id="fashion-visuals" className="mx-auto max-w-6xl px-4 pb-12 sm:px-8">
        <section className="grid gap-5 py-5 sm:grid-cols-[1.5fr_1fr] sm:py-8">
          <button type="button" onClick={() => openFeed('silhouette')} className="group relative min-h-[26rem] overflow-hidden bg-neutral-900 text-left text-white sm:min-h-[36rem]">
            <img src={editorialStories[0].image} alt={editorialStories[0].title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <span className="absolute bottom-6 left-5 right-5 sm:bottom-9 sm:left-8">
              <span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-white/75">{localizeCopy('RUDA · 本季趋势', 'RUDA · Fashion edit')}</span>
              <span className="mt-2 block font-serif text-4xl sm:text-6xl">{editorialStories[0].title}</span>
              <span className="mt-2 block max-w-md text-xs leading-5 text-white/85">{editorialStories[0].description}</span>
              <span className="mt-4 inline-flex items-center gap-2 border-b border-white/70 pb-1 text-[9px] font-bold uppercase tracking-[0.15em]">{localizeCopy('点击图片沉浸浏览', 'Guarda la storia')} <ArrowUpRight className="h-3.5 w-3.5" /></span>
            </span>
          </button>
          <div className="grid grid-cols-2 gap-3">
            {editorialStories.slice(1).map(story => (
              <button key={story.id} type="button" onClick={() => openFeed(story.id)} className="group relative min-h-44 overflow-hidden bg-neutral-200 text-left text-white sm:min-h-0">
                <img src={story.image} alt={story.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                <span className="absolute bottom-3 left-3 right-3 font-serif text-base sm:text-xl">{story.title}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="border-t border-neutral-300 py-5">
          <div className="mb-4 flex items-center justify-between">
            <div><p className="text-[9px] font-bold uppercase tracking-[0.22em] text-neutral-500">{localizeCopy('TREND REPORT · 2026', 'Trend report · 2026')}</p><h2 className="mt-1 font-serif text-2xl">{localizeCopy('正在关注的趋势', 'Tendenze da seguire')}</h2></div>
            <span className="text-[10px] text-neutral-500">{activeTag ? localizeTrendTag(activeTag) : localizeCopy('全部分类', 'Tutte le categorie')}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button type="button" onClick={() => { setActiveTag(''); setArchiveSearch(''); }} aria-pressed={!activeTag} className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-semibold transition-colors ${!activeTag ? 'border-black bg-black text-white' : 'border-neutral-300 text-neutral-600 hover:border-black'}`}>{localizeCopy('全部', 'Tutte')}</button>
            {trendTags.map(tag => <button key={tag.zh} type="button" onClick={() => { setActiveTag(tag.zh); setArchiveSearch(''); document.getElementById('fashion-archive')?.scrollIntoView({ behavior: 'smooth' }); }} aria-pressed={activeTag === tag.zh} className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-semibold transition-colors ${activeTag === tag.zh ? 'border-black bg-black text-white' : 'border-neutral-300 text-neutral-600 hover:border-black'}`}>{localizeCopy(tag.zh, tag.it)}</button>)}
          </div>
        </section>

        <section id="fashion-archive" className="border-t border-neutral-300 py-7 sm:py-9">
          <div className="mb-5 flex items-end justify-between">
            <div><p className="text-[9px] font-bold uppercase tracking-[0.22em] text-neutral-500">{localizeCopy('VISUAL ARCHIVE', 'Visual archive')}</p><h2 className="mt-1 font-serif text-3xl">{localizeCopy('时尚视觉档案', 'Immagini selezionate')}</h2></div>
            <span className="text-[10px] font-medium text-neutral-500">{localizeCopy("{{RUDA_ARG_0}} / {{RUDA_ARG_1}} 条内容", "{{RUDA_ARG_0}} / {{RUDA_ARG_1}} immagini", [String(filteredArchiveItems.length), String(archiveItems.length)])}</span>
          </div>
          <input value={archiveSearch} onChange={event => setArchiveSearch(event.target.value)} placeholder={localizeCopy('搜索标题或话题…', 'Cerca per titolo o hashtag...')} aria-label={localizeCopy('搜索时尚内容', 'Cerca nella moda')} className="mb-4 min-h-11 w-full border border-neutral-300 bg-transparent px-4 text-sm outline-none focus:border-neutral-950 sm:max-w-md" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredArchiveItems.map(item => (
              <button key={item.id} type="button" onClick={() => openFeed(item.id)} className="group relative aspect-[4/5] overflow-hidden bg-neutral-100 text-left">
                {item.image && <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" />}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-10 text-xs font-semibold text-white">{item.title}</span>
                {item.mediaType === 'video' && <span className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm">VIDEO</span>}
              </button>
            ))}
          </div>
          {filteredArchiveItems.length === 0 && <p className="py-10 text-center text-sm text-neutral-500">{localizeCopy('没有找到匹配的内容。', 'Nessuna storia corrispondente.')}</p>}
          {publicPosts.length > 0 && hasMorePosts && (
            <button type="button" onClick={() => setShowComposer(true)} className="mt-6 w-full border border-neutral-300 py-3 text-xs font-semibold hover:border-black">
              {localizeCopy('发布你的时尚灵感', 'Condividi una storia')}
            </button>
          )}
        </section>
      </div>
    </main>

      {feedOpen && <div className="fixed inset-0 z-[65] bg-neutral-950 text-white">
        <button type="button" onClick={() => setFeedOpen(false)} aria-label={localizeCopy('退出沉浸浏览', 'Chiudi feed')} className="absolute right-2 top-[calc(env(safe-area-inset-top)+0.5rem)] z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/45 backdrop-blur">
          <X className="h-4 w-4" />
        </button>
        <div className="absolute left-1/2 top-[calc(env(safe-area-inset-top)+0.65rem)] z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/30 px-2.5 py-1.5 backdrop-blur-md">
          <button type="button" disabled={loadingMorePosts} title={localizeCopy('根据本设备的观看停留、点赞和收藏调整推荐', 'Personalizzato in base alla permanenza, ai like e ai salvataggi su questo dispositivo')} aria-label={localizeCopy('个性化推荐', 'Feed personalizzato')} onClick={() => void changeFeedMode('for-you')} className={`text-[10px] font-semibold disabled:opacity-50 ${feedMode === 'for-you' ? 'text-white' : 'text-white/60'}`}>{localizeCopy('推荐', 'Per te')}</button>
          <span className="h-2.5 w-px bg-white/30" />
          <button type="button" disabled={loadingMorePosts} onClick={() => void changeFeedMode('latest')} className={`text-[10px] font-semibold disabled:opacity-50 ${feedMode === 'latest' ? 'text-white' : 'text-white/60'}`}>{localizeCopy('最新', 'Recenti')}</button>
          <span className="h-2.5 w-px bg-white/30" />
          <button type="button" onClick={() => { setFeedOpen(false); setCurrentView('home'); }} className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/75 transition-colors hover:text-white"><Home className="h-3 w-3" />{localizeCopy('回到商城', 'Shopping')}</button>
          <span className="h-2.5 w-px bg-white/30" />
          <button type="button" disabled={loadingMorePosts} onClick={() => void changeFeedMode('following')} className={`text-[10px] font-semibold disabled:opacity-50 ${feedMode === 'following' ? 'text-white' : 'text-white/60'}`}>{localizeCopy('关注', 'Seguiti')}</button>
          {(Object.keys(tasteProfile).length > 0 || dismissedRecommendationIds.length > 0) && <>
            <span className="h-2.5 w-px bg-white/30" />
            <button type="button" onClick={resetTasteProfile} title={localizeCopy('重置本设备的推荐偏好', 'Reimposta le preferenze')} aria-label={localizeCopy('重置推荐偏好', 'Reimposta le preferenze')} className="flex h-5 w-5 items-center justify-center rounded-full text-white/65 transition-colors hover:bg-white/15 hover:text-white"><RotateCcw className="h-3 w-3" /></button>
          </>}
        </div>
      <div
        ref={feedScrollRef}
        aria-label={localizeCopy('时尚视频信息流', 'Feed moda')}
        onScroll={event => {
          const root = event.currentTarget;
          if (root.clientHeight > 0 && visibleFeedItems.length > 0) {
            setActiveFeedIndex(Math.min(
              visibleFeedItems.length - 1,
              Math.max(0, Math.floor((root.scrollTop + root.clientHeight / 2) / root.clientHeight))
            ));
          }
        }}
        className="h-[100svh] snap-y snap-mandatory overflow-y-auto overscroll-y-contain bg-neutral-900 [scrollbar-width:none]"
      >
        {feedWindowStart > 0 && <div aria-hidden="true" style={{ height: feedViewportHeight * feedWindowStart }} />}
        {virtualFeedItems.map((item, windowIndex) => {
          const index = feedWindowStart + windowIndex;
          return (
          <React.Fragment key={`${item.id}-${index}`}>
          <article data-feed-index={index} data-feed-id={item.id} ref={node => { if (node) feedCardRefs.current.set(item.id, node); else feedCardRefs.current.delete(item.id); }} className="relative h-[100svh] min-h-[100svh] snap-start snap-always overflow-hidden bg-neutral-900 [content-visibility:auto] [contain-intrinsic-size:0_100svh]">
            {item.mediaType === 'video' && item.videoUrl ? (
              <video
                ref={node => {
                  if (node) {
                    node.dataset.itemId = item.id;
                    feedVideoRefs.current.set(item.id, node);
                  } else feedVideoRefs.current.delete(item.id);
                }}
                src={item.videoUrl}
                poster={item.image || undefined}
                muted={activeSoundId !== item.id}
                loop
                playsInline
                preload="none"
                onClick={() => handleFeedMediaTap(item)}
                onTimeUpdate={event => {
                  if (index === activeFeedIndex && event.currentTarget.duration) {
                    setVideoProgress(event.currentTarget.currentTime / event.currentTarget.duration);
                  }
                }}
                onLoadedMetadata={event => {
                  if (index === activeFeedIndex && event.currentTarget.duration) {
                    setVideoProgress(event.currentTarget.currentTime / event.currentTarget.duration);
                  }
                }}
                onError={() => console.warn('[fashion-feed-video-load]', item.id)}
                className="absolute inset-0 h-full w-full cursor-pointer object-cover"
              />
            ) : item.image ? (
              <img
                src={item.image}
                alt={item.title}
                className="absolute inset-0 h-full w-full object-cover"
                loading={index < 2 ? 'eager' : 'lazy'}
                referrerPolicy="no-referrer"
                onClick={() => handleFeedMediaTap(item)}
              />
            ) : <div className="absolute inset-0 bg-neutral-900" />}
            {heartBurstId === item.id && <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center"><Heart className="h-20 w-20 animate-[pulse_0.35s_ease-in-out_2] fill-rose-500 text-rose-500 drop-shadow-xl" /></div>}
            {item.videoUrl && pausedVideoIds[item.id] && (
              <button type="button" onClick={() => {
                const video = feedVideoRefs.current.get(item.id);
                if (!video) return;
                void video.play().then(() => setPausedVideoIds(previous => ({ ...previous, [item.id]: false }))).catch(error => console.warn('[fashion-feed-video-playback]', error));
              }} className="absolute left-1/2 top-1/2 z-[1] flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur" aria-label="播放视频">
                <Play className="ml-1 h-6 w-6 fill-current" />
              </button>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/25" />
            {item.videoUrl && <div className="absolute inset-x-0 bottom-0 z-[3] h-1 bg-white/20"><div className="h-full bg-white/90 transition-[width] duration-150" style={{ width: `${Math.min(100, Math.max(0, videoProgress * 100))}%` }} /></div>}
            <div className="absolute left-4 top-4 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-[9px] font-bold uppercase tracking-[0.18em]">{item.sourceName}</span>
            </div>
            <div className="absolute bottom-5 left-4 right-[4.5rem] sm:bottom-8 sm:left-8 sm:right-20">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/70">
                {localizeCopy('RUDA · 时尚灵感 {{RUDA_ARG_0}}', 'RUDA · Fashion story {{RUDA_ARG_0}}', [String((index % 99) + 1).padStart(2, '0')])}
              </p>
              {item.category && <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex rounded-full border border-white/35 bg-black/25 px-2.5 py-1 text-[9px] font-semibold text-white/90 backdrop-blur-sm">{localizeTrendTag(item.category)}</span>
                {feedMode === 'for-you' && (recommendationTaste[item.category] || 0) > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[8px] font-medium text-white/85 backdrop-blur-sm"><Sparkles className="h-2.5 w-2.5" />{localizeCopy('根据你的兴趣推荐', 'In base ai tuoi interessi')}</span>}
              </div>}
              <h2 className="font-serif text-3xl font-medium leading-tight sm:text-4xl">{item.title}</h2>
              {item.text && <p className="mt-2 line-clamp-4 text-xs leading-5 text-white/90 sm:text-sm">{item.text}</p>}
              <button type="button" onClick={navigateToCatalog} className="mt-4 inline-flex items-center gap-2 border-b border-white/70 pb-1 text-[9px] font-semibold uppercase tracking-[0.14em]">
                {localizeCopy('发现本季精选', 'Scopri la selezione')} <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] right-2 z-[2] flex max-h-[min(72svh,34rem)] flex-col items-center gap-1.5 overflow-y-auto rounded-full border border-white/10 bg-black/20 px-1 py-2 shadow-2xl backdrop-blur-md [scrollbar-width:none] sm:bottom-8 sm:right-4 sm:gap-2">
              <button type="button" onClick={() => void toggleFollow(item)} disabled={socialPending[`${item.creatorId}:follow`]} className="flex flex-col items-center gap-1 disabled:opacity-60" aria-label={socialById[item.creatorId]?.following ? '取消关注创作者' : '关注创作者'}>
                <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/20 text-xs font-semibold backdrop-blur-md">
                  {item.sourceName.slice(0, 1)}
                  {!socialById[item.creatorId]?.following && <span className="absolute -bottom-1 flex h-3 w-3 items-center justify-center rounded-full bg-rose-500"><UserRoundPlus className="h-2 w-2" /></span>}
                </span>
                <span className="text-[8px] font-medium">{socialById[item.creatorId]?.followersCount || 0}</span>
              </button>
              <button type="button" onClick={() => void toggleReaction(item, 'like')} disabled={socialPending[`${item.id}:like`]} className="flex flex-col items-center gap-1 disabled:opacity-60" aria-label={socialById[item.id]?.liked ? '取消点赞' : '点赞'}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/25 backdrop-blur-md ${socialById[item.id]?.liked ? 'bg-rose-500/90 text-white' : 'bg-white/15 text-white'}`}>
                  <Heart className={`h-4 w-4 ${socialById[item.id]?.liked ? 'fill-current' : ''}`} />
                </span>
                <span className="text-[8px] font-medium">{socialById[item.id]?.likesCount || 0}</span>
              </button>
              <button type="button" onClick={() => { setCommentTarget(item); setComments([]); }} className="flex flex-col items-center gap-1" aria-label="打开评论">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-md"><MessageCircle className="h-4 w-4" /></span>
                <span className="text-[8px] font-medium">{socialById[item.id]?.commentsCount || 0}</span>
              </button>
              <button type="button" onClick={() => void toggleReaction(item, 'save')} disabled={socialPending[`${item.id}:save`]} className="flex flex-col items-center gap-1 disabled:opacity-60" aria-label={socialById[item.id]?.saved ? '取消收藏' : '收藏'}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/25 backdrop-blur-md ${socialById[item.id]?.saved ? 'bg-amber-400/90 text-black' : 'bg-white/15 text-white'}`}><Bookmark className={`h-4 w-4 ${socialById[item.id]?.saved ? 'fill-current' : ''}`} /></span>
                <span className="text-[8px] font-medium">{socialById[item.id]?.savesCount || 0}</span>
              </button>
              {item.videoUrl && (
                <>
                <button type="button" onClick={() => {
                  const video = feedVideoRefs.current.get(item.id);
                  if (!video) return;
                  if (video.paused) {
                    void video.play().then(() => setPausedVideoIds(previous => ({ ...previous, [item.id]: false }))).catch(error => console.warn('[fashion-feed-video-playback]', error));
                  } else {
                    video.pause();
                    setPausedVideoIds(previous => ({ ...previous, [item.id]: true }));
                  }
                }} className="flex flex-col items-center gap-1" aria-label={pausedVideoIds[item.id] ? '播放视频' : '暂停视频'}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-md">{pausedVideoIds[item.id] ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4" />}</span>
                  <span className="text-[8px] font-medium">{pausedVideoIds[item.id] ? '播放' : '暂停'}</span>
                </button>
                <button type="button" onClick={() => setActiveSoundId(value => value === item.id ? null : item.id)} className="flex flex-col items-center gap-1" aria-label={activeSoundId === item.id ? '关闭声音' : '打开声音'}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-md">{activeSoundId === item.id ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</span>
                  <span className="text-[8px] font-medium">{activeSoundId === item.id ? '声音开' : '静音'}</span>
                </button>
                </>
              )}
              {(item.image || item.videoUrl) && (
                <>
                  <button type="button" onClick={() => setShowComposer(true)} className="flex flex-col items-center gap-1" aria-label={localizeCopy('上传图片', 'Carica immagine')}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-md"><Camera className="h-4 w-4" /></span>
                    <span className="text-[8px] font-medium">{localizeCopy('上传', 'Carica')}</span>
                  </button>
                  <button type="button" onClick={() => setMediaActionsItemId(current => current === item.id ? null : item.id)} className="flex flex-col items-center gap-1" aria-label={localizeCopy('分享或下载', 'Condividi o scarica')}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-md"><Share2 className="h-4 w-4" /></span>
                    <span className="text-[8px] font-medium">{localizeCopy('更多', 'Altro')}</span>
                  </button>
                </>
              )}
            </div>
            {mediaActionsItemId === item.id && (
              <div role="menu" aria-label={localizeCopy('内容操作', 'Azioni media')} className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-[3.5rem] z-[4] flex w-48 flex-col gap-1 rounded-2xl border border-white/15 bg-neutral-950/85 p-2 text-left shadow-2xl backdrop-blur-xl sm:bottom-10 sm:right-16">
                <button role="menuitem" type="button" onClick={() => void shareFeedItem(item)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[11px] hover:bg-white/10"><Share2 className="h-4 w-4 shrink-0" />{localizeCopy('分享内容', 'Condividi')}</button>
                <button role="menuitem" type="button" onClick={() => void copyFeedItemLink(item)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[11px] hover:bg-white/10"><Link2 className="h-4 w-4 shrink-0" />{localizeCopy('复制链接', 'Copia link')}</button>
                <button role="menuitem" type="button" onClick={() => void downloadFeedItem(item)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[11px] hover:bg-white/10"><Download className="h-4 w-4 shrink-0" />{item.videoUrl ? (localizeCopy('下载视频', 'Scarica video')) : (localizeCopy('下载图片', 'Scarica immagine'))}</button>
                {item.videoUrl && item.image && <button role="menuitem" type="button" onClick={() => void downloadFeedItem(item, item.image, 'cover')} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[11px] hover:bg-white/10"><Camera className="h-4 w-4 shrink-0" />{localizeCopy('下载视频封面', 'Scarica copertina')}</button>}
                {feedMode === 'for-you' && <>
                  <span className="mx-2 h-px bg-white/15" />
                  <button role="menuitem" type="button" onClick={() => dismissRecommendedItem(item)} className="rounded-xl px-3 py-2.5 text-left text-[11px] text-white/85 hover:bg-white/10">{localizeCopy('不感兴趣', 'Non mi interessa')}</button>
                  <button role="menuitem" type="button" onClick={() => reduceRecommendedCategory(item)} className="rounded-xl px-3 py-2.5 text-left text-[11px] text-white/85 hover:bg-white/10">{localizeCopy('少看这类内容', 'Mostra meno contenuti simili')}</button>
                </>}
              </div>
            )}
            {index === lastCommunityFeedIndex && hasMorePosts && (
              <div ref={feedEndRef} className="pointer-events-none absolute inset-x-0 bottom-2 h-1" aria-hidden="true" />
            )}
          </article>
          </React.Fragment>
          );
        })}
        {feedWindowEnd < visibleFeedItems.length && <div aria-hidden="true" style={{ height: feedViewportHeight * (visibleFeedItems.length - feedWindowEnd) }} />}
        {visibleFeedItems.length === 0 && (feedMode === 'following' || feedMode === 'saved') && (
          <div className="flex h-[100svh] flex-col items-center justify-center px-8 text-center">
            {feedMode === 'saved' ? <Bookmark className="h-10 w-10 text-white/70" /> : <UserRoundPlus className="h-10 w-10 text-white/70" />}
            <h2 className="mt-4 font-serif text-2xl">{feedMode === 'saved' ? (localizeCopy('收藏夹还是空的', 'Nessun contenuto salvato')) : (localizeCopy('还没有关注创作者', 'Nessun creator seguito'))}</h2>
            <p className="mt-2 max-w-xs text-xs leading-5 text-white/65">{feedMode === 'saved' ? (localizeCopy('在信息流收藏喜欢的内容，之后可以在这里继续查看。', 'Salva storie e video per ritrovarli qui.')) : (localizeCopy('先在“为你推荐”中关注喜欢的创作者，新内容会汇集在这里。', 'Segui un creator nel feed Per te per vedere qui i suoi nuovi contenuti.'))}</p>
            <button type="button" onClick={() => void changeFeedMode('for-you')} className="mt-5 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black">{localizeCopy('去发现', 'Esplora')}</button>
          </div>
        )}
        {feedWindowEnd === visibleFeedItems.length && <div className="flex h-28 items-center justify-center snap-start text-xs text-white/65">
          {loadingMorePosts ? (
            <span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" />{localizeCopy('继续加载…', 'Caricamento')}</span>
          ) : hasMorePosts ? (
            <span>{localizeCopy('上滑继续发现', 'Scorri per continuare')}</span>
          ) : (
            <button type="button" onClick={() => setShowComposer(true)} className="inline-flex items-center gap-2 border border-white/40 px-4 py-2">
              {localizeCopy('发布你的时尚灵感', 'Condividi la tua ispirazione')} <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>}
      </div>
      </div>}

      {commentTarget && (
        <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/65 sm:items-center sm:p-4" onClick={() => setCommentTarget(null)}>
          <section role="dialog" aria-modal="true" aria-label="评论" onClick={event => event.stopPropagation()} className="flex max-h-[82svh] w-full max-w-xl flex-col rounded-t-2xl bg-white text-neutral-950 sm:rounded-2xl">
            <header className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-bold">{localizeCopy('评论', 'Commenti')} · {socialById[commentTarget.id]?.commentsCount || 0}</p>
                <p className="truncate text-[10px] text-neutral-500">{commentTarget.title}</p>
              </div>
              <button type="button" onClick={() => setCommentTarget(null)} aria-label={localizeCopy('关闭评论', 'Chiudi commenti')} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100"><X className="h-4 w-4" /></button>
            </header>
            <div className="min-h-48 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {commentsLoading ? (
                <div className="flex justify-center py-8"><LoaderCircle className="h-5 w-5 animate-spin text-neutral-500" /></div>
              ) : comments.length === 0 ? (
                <div className="py-10 text-center">
                  <MessageCircle className="mx-auto h-8 w-8 text-neutral-300" />
                  <p className="mt-3 text-sm font-medium">{localizeCopy('还没有评论', 'Nessun commento ancora')}</p>
                  <p className="mt-1 text-xs text-neutral-500">{localizeCopy('来说说你的看法，开启讨论。', 'Inizia la conversazione.')}</p>
                </div>
              ) : comments.map(comment => (
                <article key={comment.id} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">{comment.displayName.slice(-2, -1)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-neutral-700">{comment.displayName}</p>
                      <time className="text-[10px] text-neutral-400">{new Date(comment.createdAt).toLocaleDateString(getIntlLocale(lang))}</time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5">{comment.text}</p>
                  </div>
                </article>
              ))}
            </div>
            <form onSubmit={submitComment} className="flex items-center gap-2 border-t border-neutral-100 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <input
                value={commentDraft}
                onChange={event => setCommentDraft(event.target.value.slice(0, 300))}
                maxLength={300}
                placeholder={localizeCopy('添加评论…', 'Aggiungi un commento...')}
                aria-label={localizeCopy('写评论', 'Scrivi un commento')}
                className="min-h-11 min-w-0 flex-1 rounded-full bg-neutral-100 px-4 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
              />
              <button type="submit" disabled={!commentDraft.trim() || commentSubmitting} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white disabled:opacity-40" aria-label={localizeCopy('发送评论', 'Invia commento')}>
                {commentSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
              </button>
            </form>
          </section>
        </div>
      )}

      {showComposer && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={() => { if (!postSubmitting) setShowComposer(false); }}>
          <form onSubmit={submitPublicPost} onClick={event => event.stopPropagation()} className="max-h-[88svh] w-full max-w-lg space-y-3 overflow-y-auto rounded-t-2xl bg-white p-4 text-neutral-950 sm:rounded-2xl sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold">{localizeCopy('发布时尚内容', 'Condividi una storia')}</h2>
              <button type="button" disabled={postSubmitting} onClick={() => setShowComposer(false)} aria-label={localizeCopy('关闭', 'Chiudi')} className="p-2 disabled:opacity-50"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs text-neutral-500">{localizeCopy('无需登录，所有人都可以发布图片和视频。', 'Non serve accedere: tutti possono condividere foto e video.')}</p>
            <input value={postTitle} onChange={event => setPostTitle(event.target.value)} placeholder={localizeCopy('标题', 'Titolo')} className="w-full border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-black" maxLength={120} />
            <textarea value={postText} onChange={event => setPostText(event.target.value)} placeholder={localizeCopy('写下你的时尚观点、穿搭或灵感...', 'Scrivi una nota di stile...')} className="min-h-24 w-full border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-black" maxLength={2000} />
            <label className="block text-xs font-semibold text-neutral-700">{localizeCopy('时尚分类', 'Categoria moda')}
              <select value={postCategory} onChange={event => setPostCategory(event.target.value)} className="mt-1.5 min-h-11 w-full border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-black">
                {trendTags.map(tag => <option key={tag.zh} value={tag.zh}>{localizeCopy(tag.zh, tag.it)}</option>)}
              </select>
            </label>
            <label className="flex items-start gap-2 text-xs leading-5 text-neutral-600">
              <input
                type="checkbox"
                checked={rightsConfirmed}
                onChange={event => setRightsConfirmed(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-neutral-950"
              />
              <span>{localizeCopy('我确认拥有此内容的发布权或已获得权利人授权，并同意遵守社区规范。', 'Confermo di possedere i diritti su questo contenuto o di avere l’autorizzazione del titolare e accetto le regole della community.')}</span>
            </label>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/*,.mp4,.m4v,.webm,.mov" className="hidden" onChange={event => void handleMediaSelection(event)} />
            {postVideo ? <video src={postVideoPreviewUrl || undefined} poster={postVideoPosterPreviewUrl || undefined} controls playsInline className="max-h-64 w-full bg-neutral-950 object-contain" /> : postImage && <img src={postImage} alt={localizeCopy('图片预览', 'Anteprima')} className="max-h-64 w-full bg-neutral-100 object-contain" />}
            {postVideo && <p className="truncate text-[10px] text-neutral-500">{postVideo.name} · {(postVideo.size / (1024 * 1024)).toFixed(1)} MB</p>}
            <div className="flex gap-2">
              <button type="button" disabled={postMediaProcessing || postSubmitting} onClick={() => fileInputRef.current?.click()} className="flex min-h-11 flex-1 items-center justify-center gap-2 border border-neutral-300 px-3 text-xs font-semibold disabled:opacity-50">
                <Camera className="h-4 w-4" /> {postMediaProcessing ? (localizeCopy('处理中…', 'Elaborazione…')) : postImage || postVideo ? (localizeCopy('更换媒体', 'Cambia media')) : (localizeCopy('添加图片 / 视频', 'Aggiungi foto o video'))}
              </button>
              {(postImage || postVideo) && <button type="button" onClick={() => { setPostImage(null); setPostVideo(null); setPostVideoPoster(null); setRightsConfirmed(false); }} className="border border-neutral-300 px-3" aria-label={localizeCopy('移除媒体', 'Rimuovi media')}><X className="h-4 w-4" /></button>}
              <button type="submit" disabled={postSubmitting || postMediaProcessing || !rightsConfirmed} className="min-h-11 bg-black px-5 text-xs font-bold text-white disabled:opacity-50">
                {postSubmitting ? (localizeCopy('发布中…', 'Pubblicazione…')) : (localizeCopy('发布', 'Pubblica'))}
              </button>
            </div>
            {postSubmitting && postVideo && postUploadProgress !== null && (
              <div className="space-y-1.5" aria-live="polite">
                <div role="progressbar" aria-label={localizeCopy('视频上传进度', 'Caricamento video')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={postUploadProgress} className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
                  <div className="h-full bg-neutral-950 transition-[width] duration-150" style={{ width: `${postUploadProgress}%` }} />
                </div>
                <p className="text-[10px] text-neutral-500">{postUploadProgress >= 100 ? (localizeCopy('视频已上传，正在保存…', 'Salvataggio del video…')) : (localizeCopy("视频上传中 {{RUDA_ARG_0}}%", "Caricamento video {{RUDA_ARG_0}}%", [String(postUploadProgress)]))}</p>
              </div>
            )}
            <p className="text-[10px] text-neutral-500">{localizeCopy('支持图片及 MP4 / WebM / MOV 视频；视频最大 20 MB、最长 3 分钟，图片自动压缩', 'Foto: JPG, PNG, WebP · Video: MP4, WebM, MOV · massimo 20 MB e 3 minuti')}</p>
          </form>
        </div>
      )}

      {lightboxImage && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black/95 p-3 text-white sm:p-6" role="dialog" aria-modal="true" aria-label={localizeCopy('图片预览', 'Anteprima immagine')} onClick={() => setLightboxImage(null)}>
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-xs font-bold uppercase tracking-[0.16em] text-white/70">{lightboxImage.title}</p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={event => { event.stopPropagation(); setLightboxZoom(value => Math.max(1, Number((value - 0.25).toFixed(2)))); }} className="p-2" aria-label={localizeCopy('缩小', 'Riduci')}>−</button>
              <span className="min-w-12 text-center text-xs">{Math.round(lightboxZoom * 100)}%</span>
              <button type="button" onClick={event => { event.stopPropagation(); setLightboxZoom(value => Math.min(3, Number((value + 0.25).toFixed(2)))); }} className="p-2" aria-label={localizeCopy('放大', 'Ingrandisci')}>+</button>
              <button type="button" onClick={event => { event.stopPropagation(); void shareImage(lightboxImage.src, lightboxImage.title); }} className="p-2" aria-label={localizeCopy('分享图片', 'Condividi immagine')}><Share2 className="h-4 w-4" /></button>
              <button type="button" onClick={() => setLightboxImage(null)} className="p-2" aria-label={localizeCopy('关闭', 'Chiudi')}><X className="h-5 w-5" /></button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto py-4" onClick={event => event.stopPropagation()}>
            <img src={lightboxImage.src} alt={lightboxImage.title} className="max-h-full max-w-full object-contain transition-transform duration-200" style={{ transform: `scale(${lightboxZoom})` }} referrerPolicy="no-referrer" onWheel={event => { event.preventDefault(); setLightboxZoom(value => Math.min(3, Math.max(1, Number((value + (event.deltaY < 0 ? 0.1 : -0.1)).toFixed(2))))); }} />
          </div>
        </div>
      )}
    </>
  );
};
