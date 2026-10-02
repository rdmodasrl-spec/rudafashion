import { getIntlLocale } from '../../i18n/translations';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Edit3, Film, Heart, Image as ImageIcon, LoaderCircle, MessageCircle, RefreshCw, Search, ShieldAlert, Trash2, UploadCloud, X } from 'lucide-react';
import { apiDelete, apiGet, apiPost, apiPostWithUploadProgress, apiRequest } from '../../api/client';
import { useB2B } from '../../context/B2BContext';

type FashionModerationItem = {
  id: string;
  image: string;
  videoUrl: string | null;
  mediaType: 'image' | 'video';
  merchantName: string;
  title: string;
  caption: string;
  category?: string;
  createdAt: string;
  publicationStatus: 'pending' | 'approved' | 'unpublished';
  rightsStatus?: 'authorized' | 'pending' | 'restricted';
  stats: { likes: number; comments: number; saves: number };
  comments: Array<{ id: string; displayName: string; text: string; createdAt: string }>;
};

type FashionModerationSummary = {
  total: number;
  pending: number;
  approved: number;
  unpublished: number;
};

type FilterStatus = 'all' | 'pending' | 'approved' | 'unpublished';
const fashionCategories = ['女装趋势', '男装趋势', '鞋履趋势', '包袋配饰', '面料与针织', '秀场街拍'] as const;

const readFileAsDataUrl = (file: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('FILE_READ_FAILED'));
  reader.onerror = () => reject(new Error('FILE_READ_FAILED'));
  reader.readAsDataURL(file);
});

const createAdminVideoPoster = async (file: File): Promise<Blob> => {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;
  try {
    const duration = await new Promise<number>((resolve, reject) => {
      video.onloadedmetadata = () => resolve(video.duration);
      video.onerror = () => reject(new Error('视频读取失败'));
      video.src = url;
    });
    if (!Number.isFinite(duration) || duration <= 0 || duration > 180) throw new Error('视频时长不能超过 3 分钟');
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error('视频封面生成失败'));
      video.currentTime = Math.min(0.5, duration / 2);
    });
    const scale = Math.min(1, 1400 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('视频封面生成失败');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(poster => poster ? resolve(poster) : reject(new Error('视频封面生成失败')), 'image/jpeg', 0.78);
    });
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
};

const compressAdminImage = async (file: File): Promise<string> => {
  if (file.size > 24 * 1024 * 1024) throw new Error('IMAGE_FILE_TOO_LARGE');
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('INVALID_IMAGE'));
      image.src = objectUrl;
    });
    const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('IMAGE_PROCESSING_UNAVAILABLE');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.86));
    if (!blob) throw new Error('IMAGE_PROCESSING_UNAVAILABLE');
    if (blob.size > 1.5 * 1024 * 1024) throw new Error('IMAGE_OUTPUT_TOO_LARGE');
    return await readFileAsDataUrl(blob);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

type AdminMediaPayload =
  | { mediaType: 'image'; image: string; video: '' }
  | { mediaType: 'video'; image: ''; videoFile: File; poster: Blob };

const getAdminMediaPayload = async (file: File): Promise<AdminMediaPayload> => {
  const extension = file.name.split('.').pop()?.toLocaleLowerCase() || '';
  const isVideo = file.type.startsWith('video/') || ['mp4', 'm4v', 'webm', 'mov'].includes(extension);
  if (isVideo) {
    if (file.size > 20 * 1024 * 1024) throw new Error('视频最大支持 20 MB');
    const mimeType = file.type || (extension === 'mov' ? 'video/quicktime' : extension === 'm4v' ? 'video/mp4' : `video/${extension}`);
    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(mimeType)) throw new Error('仅支持 MP4、WebM、MOV 视频');
    const normalizedVideo = file.type === mimeType ? file : new File([file], file.name, { type: mimeType });
    const poster = await createAdminVideoPoster(normalizedVideo);
    if (poster.size > 2_200_000) throw new Error('视频封面文件过大');
    return {
      mediaType: 'video',
      image: '',
      videoFile: normalizedVideo,
      poster
    };
  }
  if (!file.type.startsWith('image/') && !['jpg', 'jpeg', 'png', 'webp'].includes(extension)) throw new Error('文件格式不支持');
  return { mediaType: 'image', image: await compressAdminImage(file), video: '' };
};

export const AdminFashionCommunity: React.FC = () => {
  const { addNotification, lang } = useB2B();
  const [items, setItems] = useState<FashionModerationItem[]>([]);
  const [summary, setSummary] = useState<FashionModerationSummary>({ total: 0, pending: 0, approved: 0, unpublished: 0 });
  const [hasMoreItems, setHasMoreItems] = useState(false);
  const itemOffsetRef = useRef(0);
  const [status, setStatus] = useState<FilterStatus>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadCategory, setUploadCategory] = useState<(typeof fashionCategories)[number]>(fashionCategories[0]);
  const [uploadStatus, setUploadStatus] = useState<'pending' | 'approved'>('approved');
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadByteProgress, setUploadByteProgress] = useState(0);
  const [editingItem, setEditingItem] = useState<FashionModerationItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editCategory, setEditCategory] = useState<(typeof fashionCategories)[number]>(fashionCategories[0]);
  const [editMediaFile, setEditMediaFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadItems = useCallback(async (append = false) => {
    setLoading(true);
    try {
      const offset = append ? itemOffsetRef.current : 0;
      const params = new URLSearchParams({ status, q: query.trim(), limit: '50', offset: String(offset) });
      const result = await apiGet<{
        success: true;
        items: FashionModerationItem[];
        summary: FashionModerationSummary;
        hasMore?: boolean;
      }>(`/api/admin/fashion/community?${params.toString()}`);
      const loadedItems = result.items || [];
      setItems(current => append ? [...current, ...loadedItems] : loadedItems);
      itemOffsetRef.current = offset + loadedItems.length;
      setHasMoreItems(Boolean(result.hasMore));
      setSummary(result.summary);
    } catch (error) {
      console.error('[admin-fashion-community]', error);
      addNotification('warning', '时尚社区加载失败', '请确认管理员权限后重试。');
    } finally {
      setLoading(false);
    }
  }, [addNotification, query, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadItems(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadItems, query]);

  const reviewPost = async (item: FashionModerationItem, publicationStatus: FilterStatus) => {
    if (publicationStatus === 'all') return;
    setBusyId(item.id);
    try {
      await apiRequest(`/api/admin/fashion/community/${encodeURIComponent(item.id)}`, {
        method: 'PUT',
        body: JSON.stringify({
          publicationStatus,
          rightsStatus: publicationStatus === 'approved' ? 'authorized' : item.rightsStatus
        })
      });
      addNotification('success', '审核状态已更新', publicationStatus === 'approved' ? '内容已发布到时尚社区。' : publicationStatus === 'pending' ? '内容已退回待审核。' : '内容已从公开信息流隐藏。');
      await loadItems();
    } catch (error) {
      addNotification('warning', '审核操作失败', error instanceof Error ? error.message : '请稍后重试。');
    } finally {
      setBusyId(null);
    }
  };

  const deletePost = async (item: FashionModerationItem) => {
    if (!window.confirm(`确定永久删除“${item.title || '未命名内容'}”及其评论吗？`)) return;
    setBusyId(item.id);
    try {
      await apiDelete(`/api/admin/fashion/community/${encodeURIComponent(item.id)}`);
      addNotification('success', '内容已删除', '帖子及其关联互动已从社区移除。');
      await loadItems();
    } catch (error) {
      addNotification('warning', '删除失败', error instanceof Error ? error.message : '请稍后重试。');
    } finally {
      setBusyId(null);
    }
  };

  const deleteComment = async (item: FashionModerationItem, commentId: string) => {
    if (!window.confirm('确定删除这条评论吗？')) return;
    setBusyId(`${item.id}:${commentId}`);
    try {
      await apiDelete(`/api/admin/fashion/community/${encodeURIComponent(item.id)}/comments/${encodeURIComponent(commentId)}`);
      addNotification('success', '评论已删除', '不适宜评论已从帖子中移除。');
      await loadItems();
    } catch (error) {
      addNotification('warning', '评论删除失败', error instanceof Error ? error.message : '请稍后重试。');
    } finally {
      setBusyId(null);
    }
  };

  const uploadSelectedFiles = async () => {
    if (!selectedFiles.length || uploadProgress) return;
    const files = [...selectedFiles];
    setUploadProgress({ current: 0, total: files.length });
    let uploaded = 0;
    const failures: string[] = [];
    for (const [index, file] of files.entries()) {
      setUploadProgress({ current: index + 1, total: files.length });
      try {
        const media = await getAdminMediaPayload(file);
        const title = file.name.replace(/\.[^.]+$/, '').trim().slice(0, 120) || 'RUDA Fashion';
        if (media?.mediaType === 'video') {
          const form = new FormData();
          form.set('title', title);
          form.set('text', uploadCaption);
          form.set('category', uploadCategory);
          form.set('publicationStatus', uploadStatus);
          form.set('video', media.videoFile, media.videoFile.name);
          form.set('poster', media.poster, 'poster.jpg');
          setUploadByteProgress(0);
          await apiPostWithUploadProgress('/api/admin/fashion/community/video', form, 600_000, (loaded, total) => {
            setUploadByteProgress(total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0);
          });
          setUploadByteProgress(0);
        } else {
          await apiPost('/api/admin/fashion/community', {
            title,
            caption: uploadCaption,
            category: uploadCategory,
            ...media,
            publicationStatus: uploadStatus
          }, 120_000);
        }
        uploaded += 1;
      } catch (error) {
        failures.push(`${file.name}: ${error instanceof Error ? error.message : '上传失败'}`);
      }
    }
    setSelectedFiles([]);
    setUploadProgress(null);
    setUploadByteProgress(0);
    await loadItems();
    if (failures.length) {
      addNotification('warning', `批量上传完成：成功 ${uploaded} 个，失败 ${failures.length} 个`, failures.slice(0, 3).join('；'));
    } else {
      addNotification('success', '批量上传完成', `已成功上传 ${uploaded} 个内容。`);
    }
  };

  const beginEdit = (item: FashionModerationItem) => {
    setEditingItem(item);
    setEditTitle(item.title || '');
    setEditCaption(item.caption || '');
    setEditCategory(fashionCategories.includes(item.category as (typeof fashionCategories)[number]) ? item.category as (typeof fashionCategories)[number] : fashionCategories[0]);
    setEditMediaFile(null);
  };

  const saveEdit = async () => {
    if (!editingItem || savingEdit) return;
    setSavingEdit(true);
    try {
      const media: AdminMediaPayload | null = editMediaFile ? await getAdminMediaPayload(editMediaFile) : null;
      if (media?.mediaType === 'video') {
        const form = new FormData();
        form.set('title', editTitle);
        form.set('text', editCaption);
        form.set('category', editCategory);
        form.set('publicationStatus', editingItem.publicationStatus === 'approved' ? 'approved' : 'pending');
        form.set('replaceId', editingItem.id);
        form.set('video', media.videoFile, media.videoFile.name);
        form.set('poster', media.poster, 'poster.jpg');
        await apiPostWithUploadProgress('/api/admin/fashion/community/video', form, 600_000, () => undefined);
      } else {
        await apiRequest(`/api/admin/fashion/community/${encodeURIComponent(editingItem.id)}`, {
          method: 'PUT',
          body: JSON.stringify({ title: editTitle, caption: editCaption, category: editCategory, ...media })
        });
      }
      addNotification('success', '内容编辑已保存', '标题和内容说明已更新。');
      setEditingItem(null);
      await loadItems();
    } catch (error) {
      addNotification('warning', '内容编辑失败', error instanceof Error ? error.message : '请稍后重试。');
    } finally {
      setSavingEdit(false);
    }
  };

  const filters: Array<{ id: FilterStatus; label: string; count: number }> = [
    { id: 'all', label: '全部内容', count: summary.total },
    { id: 'pending', label: '待审核', count: summary.pending },
    { id: 'approved', label: '已发布', count: summary.approved },
    { id: 'unpublished', label: '已隐藏', count: summary.unpublished }
  ];

  return (
    <section className="space-y-5">
      <header className="rounded-2xl bg-neutral-950 p-5 text-white sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-300"><Film className="h-5 w-5" /><span className="text-[10px] font-bold uppercase tracking-[0.2em]">RUDA FASHION COMMUNITY</span></div>
            <h2 className="mt-2 font-serif text-2xl font-semibold sm:text-3xl">时尚社区内容管理</h2>
            <p className="mt-1 text-xs text-white/65">集中审核社区图片与短视频、查看互动数据，并管理评论与公开状态。</p>
          </div>
          <button type="button" onClick={() => void loadItems()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 px-3 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />刷新
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {filters.map(filter => (
          <button key={filter.id} type="button" onClick={() => setStatus(filter.id)} className={`rounded-xl border p-3 text-left transition-colors sm:p-4 ${status === filter.id ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 bg-white hover:border-neutral-400'}`}>
            <span className={`text-[10px] font-semibold ${status === filter.id ? 'text-white/65' : 'text-neutral-500'}`}>{filter.label}</span>
            <span className="mt-1 block text-2xl font-bold">{filter.count}</span>
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold"><UploadCloud className="h-4 w-4" />批量上传图片 / 视频</h3>
            <p className="mt-1 text-[11px] text-neutral-500">可多选文件，系统逐个上传；图片自动压缩，视频支持 MP4 / WebM / MOV（每个最大 20 MB、3 分钟）。</p>
          </div>
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold hover:bg-neutral-50 ${uploadProgress ? 'pointer-events-none opacity-50' : ''}`}>
            <ImageIcon className="h-4 w-4" />选择文件
            <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" className="hidden" disabled={Boolean(uploadProgress)} onChange={event => {
              const chosen = Array.from(event.currentTarget.files || []);
              setSelectedFiles(current => [...current, ...chosen].slice(0, 40));
              event.currentTarget.value = '';
            }} />
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <textarea value={uploadCaption} onChange={event => setUploadCaption(event.target.value)} maxLength={2000} rows={2} placeholder="为本批内容填写统一说明（可选）" className="w-full resize-y rounded-lg border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-neutral-800" />
          <div className="flex flex-wrap items-center gap-2">
            <select value={uploadCategory} onChange={event => setUploadCategory(event.target.value as (typeof fashionCategories)[number])} className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-xs">{fashionCategories.map(category => <option key={category} value={category}>{category}</option>)}</select>
            <select value={uploadStatus} onChange={event => setUploadStatus(event.target.value as 'pending' | 'approved')} className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-xs">
              <option value="approved">上传后立即发布</option>
              <option value="pending">上传后待审核</option>
            </select>
            <button type="button" disabled={!selectedFiles.length || Boolean(uploadProgress)} onClick={() => void uploadSelectedFiles()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-neutral-950 px-3 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50">
              {uploadProgress ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {uploadProgress ? `上传中 ${uploadProgress.current}/${uploadProgress.total}` : `开始上传${selectedFiles.length ? ` (${selectedFiles.length})` : ''}`}
            </button>
          </div>
        </div>
        {selectedFiles.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{selectedFiles.map((file, index) => <span key={`${file.name}-${file.lastModified}-${index}`} className="inline-flex max-w-full items-center gap-1 rounded-full bg-neutral-100 py-1 pl-2.5 pr-1 text-[10px] text-neutral-700"><span className="max-w-52 truncate">{file.name}</span><button type="button" disabled={Boolean(uploadProgress)} onClick={() => setSelectedFiles(current => current.filter((_, fileIndex) => fileIndex !== index))} className="rounded-full p-1 hover:bg-neutral-200 disabled:opacity-40" aria-label={`移除 ${file.name}`}><X className="h-3 w-3" /></button></span>)}</div>}
        {uploadProgress && uploadByteProgress > 0 && (
          <div className="mt-3" aria-live="polite">
            <div role="progressbar" aria-label="视频上传进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadByteProgress} className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
              <div className="h-full bg-neutral-950 transition-[width] duration-150" style={{ width: `${uploadByteProgress}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-neutral-500">当前文件上传 {uploadByteProgress}%</p>
          </div>
        )}
        {selectedFiles.length >= 40 && <p className="mt-2 text-[10px] text-amber-700">每批最多选择 40 个文件，已达到上限。</p>}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map(filter => <button key={filter.id} type="button" onClick={() => setStatus(filter.id)} className={`rounded-full px-3 py-2 text-[11px] font-semibold ${status === filter.id ? 'bg-neutral-950 text-white' : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:ring-neutral-400'}`}>{filter.label} · {filter.count}</button>)}
        </div>
        <label className="relative block sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索标题、描述或发布来源" className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-neutral-800" />
        </label>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center rounded-xl border border-neutral-200 bg-white text-xs text-neutral-500"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />正在读取社区内容…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-14 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-3 text-sm font-semibold text-neutral-700">没有找到社区内容</p>
          <p className="mt-1 text-xs text-neutral-500">尝试切换审核状态，或调整搜索关键词。</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map(item => (
            <article key={item.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
              <div className="relative aspect-[4/3] bg-neutral-100">
                {item.mediaType === 'video' && item.videoUrl ? (
                  <video src={item.videoUrl} poster={item.image || undefined} controls preload="none" playsInline className="h-full w-full object-contain bg-neutral-950" />
                ) : item.image ? (
                  <img src={item.image} alt={item.title || '时尚社区图片'} loading="lazy" className="h-full w-full object-cover" />
                ) : <div className="flex h-full items-center justify-center text-neutral-300"><ImageIcon className="h-10 w-10" /></div>}
                <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-bold ${item.publicationStatus === 'approved' ? 'bg-emerald-600 text-white' : item.publicationStatus === 'pending' ? 'bg-amber-400 text-neutral-950' : 'bg-neutral-800 text-white'}`}>
                  {item.publicationStatus === 'approved' ? '已发布' : item.publicationStatus === 'pending' ? '待审核' : '已隐藏'}
                </span>
                {item.mediaType === 'video' && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-[9px] font-semibold text-white"><Film className="h-3 w-3" />视频</span>}
              </div>
              <div className="space-y-3 p-4">
                <div>
                  {item.category && <span className="mb-1 inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] font-semibold text-neutral-600">{item.category}</span>}
                  <h3 className="line-clamp-1 text-sm font-bold">{item.title || 'RUDA Fashion'}</h3>
                  <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-4 text-neutral-600">{item.caption || '暂无文字说明'}</p>
                  <p className="mt-2 text-[10px] text-neutral-400">{item.merchantName} · {new Date(item.createdAt).toLocaleString(getIntlLocale(lang))}</p>
                </div>
                <div className="flex items-center gap-4 border-y border-neutral-100 py-2 text-[10px] text-neutral-500">
                  <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{item.stats.likes}</span>
                  <button type="button" onClick={() => setExpandedComments(current => current === item.id ? null : item.id)} className="inline-flex items-center gap-1 hover:text-neutral-900"><MessageCircle className="h-3.5 w-3.5" />{item.stats.comments} 评论</button>
                  <span>收藏 {item.stats.saves}</span>
                </div>
                {expandedComments === item.id && (
                  <div className="space-y-2">
                    {item.comments.length ? item.comments.map(comment => (
                      <div key={comment.id} className="flex items-start justify-between gap-2 rounded-lg bg-neutral-50 p-2">
                        <div className="min-w-0"><p className="text-[10px] font-semibold text-neutral-600">{comment.displayName}</p><p className="break-words text-xs text-neutral-700">{comment.text}</p></div>
                        <button type="button" disabled={busyId === `${item.id}:${comment.id}`} onClick={() => void deleteComment(item, comment.id)} aria-label="删除评论" className="rounded p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    )) : <p className="text-[10px] text-neutral-400">暂无评论</p>}
                    {item.stats.comments > item.comments.length && <p className="text-[10px] text-neutral-400">仅显示最近 5 条；共 {item.stats.comments} 条</p>}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busyId === item.id} onClick={() => beginEdit(item)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"><Edit3 className="h-3.5 w-3.5" />编辑</button>
                  {item.publicationStatus !== 'approved' && <button type="button" disabled={busyId === item.id} onClick={() => void reviewPost(item, 'approved')} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-[11px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><Check className="h-3.5 w-3.5" />审核通过并发布</button>}
                  {item.publicationStatus === 'approved' && <button type="button" disabled={busyId === item.id} onClick={() => void reviewPost(item, 'unpublished')} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-300 px-3 text-[11px] font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"><ShieldAlert className="h-3.5 w-3.5" />隐藏内容</button>}
                  {item.publicationStatus === 'unpublished' && <button type="button" disabled={busyId === item.id} onClick={() => void reviewPost(item, 'pending')} className="min-h-9 rounded-lg border border-neutral-300 px-3 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">恢复为待审核</button>}
                  <button type="button" disabled={busyId === item.id} onClick={() => void deletePost(item)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 px-3 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />删除</button>
                </div>
                {busyId === item.id && <p className="inline-flex items-center gap-1 text-[10px] text-neutral-400"><LoaderCircle className="h-3 w-3 animate-spin" />正在保存…</p>}
              </div>
            </article>
          ))}
        </div>
      )}
      {hasMoreItems && (
        <button type="button" onClick={() => void loadItems(true)} disabled={loading} className="mx-auto flex h-10 items-center gap-2 rounded-full border border-neutral-300 px-5 text-xs font-semibold hover:border-neutral-800 disabled:opacity-50">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          {loading ? '正在加载…' : '加载更多内容'}
        </button>
      )}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setEditingItem(null); }}>
          <form className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-2xl" onSubmit={event => { event.preventDefault(); void saveEdit(); }}>
            <div className="flex items-center justify-between"><h3 className="text-base font-bold">编辑社区内容</h3><button type="button" onClick={() => setEditingItem(null)} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100" aria-label="关闭"><X className="h-4 w-4" /></button></div>
            <label className="block space-y-1.5 text-xs font-semibold text-neutral-700">标题<input value={editTitle} onChange={event => setEditTitle(event.target.value)} maxLength={120} required className="h-10 w-full rounded-lg border border-neutral-200 px-3 font-normal outline-none focus:border-neutral-800" /></label>
            <label className="block space-y-1.5 text-xs font-semibold text-neutral-700">内容说明<textarea value={editCaption} onChange={event => setEditCaption(event.target.value)} maxLength={2000} rows={5} className="w-full rounded-lg border border-neutral-200 px-3 py-2 font-normal outline-none focus:border-neutral-800" /></label>
            <label className="block space-y-1.5 text-xs font-semibold text-neutral-700">时尚分类<select value={editCategory} onChange={event => setEditCategory(event.target.value as (typeof fashionCategories)[number])} className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 font-normal">{fashionCategories.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
            <label className="block space-y-1.5 text-xs font-semibold text-neutral-700">替换图片或视频（可选）<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={event => setEditMediaFile(event.currentTarget.files?.[0] || null)} className="block w-full rounded-lg border border-neutral-200 p-2 text-xs font-normal" /></label>
            {editMediaFile && <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-xs"><span className="truncate">{editMediaFile.name}</span><button type="button" onClick={() => setEditMediaFile(null)} className="ml-2 text-neutral-500 hover:text-rose-600">移除</button></div>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingItem(null)} className="h-10 rounded-lg border border-neutral-200 px-4 text-xs font-semibold">取消</button><button type="submit" disabled={savingEdit} className="inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-xs font-semibold text-white disabled:opacity-50">{savingEdit && <LoaderCircle className="h-4 w-4 animate-spin" />}保存修改</button></div>
          </form>
        </div>
      )}
    </section>
  );
};
