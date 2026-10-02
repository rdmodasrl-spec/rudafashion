import React, { useId, useRef, useState } from 'react';
import { Check, GripVertical, ImagePlus, Loader2, Film, Trash2 } from 'lucide-react';
import { ProductMedia } from '../../types/b2b';
import { useB2B } from '../../context/B2BContext';

type Props = { value: ProductMedia[]; onChange: (media: ProductMedia[]) => void; maxItems?: number; isIt?: boolean; capture?: boolean };
const MAX_IMAGE = 12 * 1024 * 1024;
const MAX_VIDEO = 6 * 1024 * 1024;
const MAX_IMAGE_OUTPUT = 2.1 * 1024 * 1024;

const compressImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    if (image.naturalWidth < 600 || image.naturalHeight < 600) {
      reject(new Error('IMAGE_RESOLUTION_LOW'));
      return;
    }
    const scale = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) {
      reject(new Error('IMAGE_PROCESSING_UNAVAILABLE'));
      return;
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let quality = 0.86;
    let output = canvas.toDataURL('image/jpeg', quality);
    while (output.length > MAX_IMAGE_OUTPUT * 1.37 && quality > 0.5) {
      quality -= 0.08;
      output = canvas.toDataURL('image/jpeg', quality);
    }
    resolve(output);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('INVALID_IMAGE'));
  };
  image.src = objectUrl;
});

const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('READ_FAILED'));
  reader.onerror = () => reject(new Error('READ_FAILED'));
  reader.readAsDataURL(file);
});

export const SmartMediaUploader: React.FC<Props> = ({ value, onChange, maxItems = 32, isIt = false, capture = false }) => {
  const { localizeCopy } = useB2B();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const addFiles = async (files: FileList | File[]) => {
    const candidates = Array.from(files);
    const selected = candidates.slice(0, Math.max(0, maxItems - value.length));
    if (!selected.length) return;
    setBusy(true); setMessage(''); setProgress(0);
    try {
      const existing = new Set(value.map(item => `${item.type}:${item.url.length}:${item.url.slice(-80)}`));
      const added: ProductMedia[] = [];
      const rejected: string[] = [];
      for (const [index, file] of selected.entries()) {
        const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : null;
        try {
          if (!type || file.size > (type === 'video' ? MAX_VIDEO : MAX_IMAGE)) throw new Error('FILE_SIZE_OR_TYPE_INVALID');
          if (type === 'image' && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('FILE_SIZE_OR_TYPE_INVALID');
          if (type === 'video' && !['video/mp4', 'video/webm'].includes(file.type)) throw new Error('FILE_SIZE_OR_TYPE_INVALID');
          const url = type === 'image' ? await compressImage(file) : await readAsDataUrl(file);
          const fingerprint = `${type}:${url.length}:${url.slice(-80)}`;
          if (existing.has(fingerprint)) throw new Error('DUPLICATE_MEDIA');
          existing.add(fingerprint);
          added.push({ id: `media-${crypto.randomUUID()}`, type, url, alt: file.name });
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'INVALID_MEDIA';
          rejected.push(reason === 'DUPLICATE_MEDIA' ? `${file.name}（重复）` : `${file.name}（格式、大小或分辨率不符合）`);
        } finally {
          setProgress(Math.round(((index + 1) / selected.length) * 100));
        }
      }
      if (added.length) onChange([...value, ...added]);
      setMessage(rejected.length
        ? (isIt ? `${rejected.length} file(s) skipped` : `${rejected.length} 个文件未添加：${rejected.slice(0, 2).join('、')}${rejected.length > 2 ? '…' : ''}`)
        : (localizeCopy("已处理 {{RUDA_ARG_0}} 个媒体文件", "{{RUDA_ARG_0}} media item(s) ready", [String(added.length)])));
    } finally { setBusy(false); }
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value]; const [item] = next.splice(from, 1); next.splice(to, 0, item); onChange(next);
  };
  return <div className="space-y-3">
    <div className="flex items-center justify-between"><div><div className="text-sm font-semibold">商品媒体资产</div><div className="text-[11px] text-neutral-500">支持组图、MP4/WebM 视频；图片自动压缩；第一张为主图，最多 {maxItems} 项</div></div><span className="text-[11px] font-medium text-neutral-500">{value.length}/{maxItems}</span></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void addFiles(event.dataTransfer.files); }}>
      {value.map((item, index) => <div key={item.id} draggable onDragStart={() => setDragIndex(index)} onDragOver={event => event.preventDefault()} onDrop={() => { if (dragIndex !== null) move(dragIndex, index); setDragIndex(null); }} className="group relative aspect-square overflow-hidden rounded-xl border bg-neutral-100">
        {item.type === 'video' ? <video src={item.url} controls className="h-full w-full object-cover" /> : <img src={item.url} alt={item.alt || `商品图 ${index + 1}`} className="h-full w-full object-cover" />}
        {index === 0 && item.type === 'image' && <span className="absolute left-1 top-1 rounded bg-black/75 px-1.5 py-1 text-[10px] font-bold text-white"><Check className="mr-0.5 inline h-3 w-3" />主图</span>}
        {item.type === 'video' && <span className="absolute left-1 top-1 rounded bg-indigo-700/90 px-1.5 py-1 text-[10px] font-bold text-white"><Film className="mr-0.5 inline h-3 w-3" />视频</span>}
        <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition-opacity group-hover:opacity-100"><button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} className="rounded bg-white/90 p-1 disabled:opacity-30"><GripVertical className="h-3.5 w-3.5" /></button><button type="button" onClick={() => onChange(value.filter((_, i) => i !== index))} className="rounded bg-rose-600 p-1 text-white"><Trash2 className="h-3.5 w-3.5" /></button></div>
      </div>)}
      {value.length < maxItems && <label htmlFor={inputId} className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-neutral-500 transition-colors hover:border-neutral-900 hover:bg-white">{busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}<span className="text-[11px] font-semibold">{busy ? `处理中 ${progress}%` : capture ? '拍照 / 上传' : '添加图片/视频'}</span><span className="text-[10px] text-neutral-400">支持拖拽</span><input ref={inputRef} id={inputId} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" capture={capture ? 'environment' : undefined} multiple className="hidden" onChange={event => { if (event.target.files) void addFiles(event.target.files); event.currentTarget.value = ''; }} /></label>}
    </div>
    {message && <p className="text-xs text-amber-700">{message}</p>}
  </div>;
};
