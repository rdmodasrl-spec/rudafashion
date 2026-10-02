import React, { useState } from 'react';
import { Check, Copy, Mail, MessageCircle, Share2 } from 'lucide-react';
import { buildShareUrl, recordShare, shareOrCopy, SharePayload } from '../../utils/share';

export const ShareButton: React.FC<SharePayload & { compact?: boolean }> = ({ compact, title, text, path, source }) => {
  const [status, setStatus] = useState<'idle' | 'done'>('idle');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const handleShare = async (channel: 'native' | 'copy' | 'whatsapp' | 'email' | 'wechat' | 'facebook' = 'native') => {
    if (busy) return;
    setBusy(true);
    try {
      const url = buildShareUrl(path, source || 'ruda');
      if (channel === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener,noreferrer');
        recordShare(source || 'ruda', 'whatsapp');
      } else if (channel === 'facebook') {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
        recordShare(source || 'ruda', 'facebook');
      } else if (channel === 'email') {
        window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n${url}`)}`;
        recordShare(source || 'ruda', 'email');
      } else {
        await shareOrCopy({ title, text, path, source }, channel === 'copy' ? 'copy' : 'native');
      }
      setStatus('done');
      setOpen(false);
      window.setTimeout(() => setStatus('idle'), 2200);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => setOpen(value => !value)}
      disabled={busy}
      aria-label={status === 'done' ? '分享链接已复制' : '分享此页面'}
      title={status === 'done' ? '分享链接已复制' : '分享此页面'}
      className="relative inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:border-neutral-900 hover:text-black disabled:cursor-wait disabled:opacity-60"
    >
      {status === 'done' ? <Check className="h-3.5 w-3.5" /> : (compact ? <Copy className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />)}
      <span>{status === 'done' ? '已完成' : '分享'}</span>
      {open && (
        <span className="absolute z-20 mt-24 flex min-w-40 flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-1.5 text-left shadow-xl">
          <span role="menuitem" onClick={(event) => { event.stopPropagation(); void handleShare('native'); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-neutral-100"><Share2 className="h-3.5 w-3.5" />系统分享</span>
          <span role="menuitem" onClick={(event) => { event.stopPropagation(); void handleShare('whatsapp'); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-neutral-100"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</span>
          <span role="menuitem" onClick={(event) => { event.stopPropagation(); void handleShare('facebook'); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-neutral-100"><Share2 className="h-3.5 w-3.5" />Facebook</span>
          <span role="menuitem" onClick={(event) => { event.stopPropagation(); void handleShare('email'); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-neutral-100"><Mail className="h-3.5 w-3.5" />邮件</span>
          <span role="menuitem" onClick={(event) => { event.stopPropagation(); void handleShare('copy'); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-neutral-100"><Copy className="h-3.5 w-3.5" />复制链接 / 微信</span>
        </span>
      )}
    </button>
  );
};
