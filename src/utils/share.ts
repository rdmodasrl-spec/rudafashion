export type SharePayload = {
  title: string;
  text: string;
  path?: string;
  source?: string;
};

export function getMerchantStorePath(merchant: { id: string; slug?: string; storeSlug?: string }): string {
  const slug = merchant.storeSlug || merchant.slug || merchant.id;
  return `/shop/${encodeURIComponent(slug)}`;
}

export function getProductPath(productId: string): string {
  return `/product/${encodeURIComponent(productId)}`;
}

export function getMerchantStoreUrl(merchant: { id: string; slug?: string; storeSlug?: string }): string {
  return new URL(getMerchantStorePath(merchant), window.location.origin).toString();
}

export function buildShareUrl(path = window.location.href, source = 'ruda'): string {
  const url = new URL(path, window.location.origin);
  url.searchParams.set('utm_source', 'share');
  url.searchParams.set('utm_medium', 'web');
  url.searchParams.set('utm_campaign', 'ruda_b2b');
  url.searchParams.set('utm_content', source);
  url.searchParams.set('ref', source);
  return url.toString();
}

export function rememberReferral(): void {
  const params = new URLSearchParams(window.location.search);
  const source = params.get('ref') || params.get('utm_content');
  if (!source) return;
  localStorage.setItem('ruda_referral', JSON.stringify({
    source,
    landingPath: window.location.pathname + window.location.hash,
    capturedAt: new Date().toISOString()
  }));
}

export function recordShare(source = 'ruda', channel = 'native'): void {
  const key = 'ruda_share_events';
  const events = JSON.parse(localStorage.getItem(key) || '[]') as Array<Record<string, string>>;
  events.push({ source, channel, createdAt: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(events.slice(-100)));
}

export async function shareOrCopy(payload: SharePayload, channel: 'native' | 'copy' = 'native'): Promise<'shared' | 'copied'> {
  const url = buildShareUrl(payload.path, payload.source);
  if (typeof navigator.share === 'function') {
    await navigator.share({ title: payload.title, text: payload.text, url });
    recordShare(payload.source, 'native');
    return 'shared';
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(`${payload.text}\n${url}`);
    recordShare(payload.source, channel === 'copy' ? 'copy' : 'native');
    return 'copied';
  }
  const input = document.createElement('textarea');
  input.value = `${payload.text}\n${url}`;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
  recordShare(payload.source, 'copy');
  return 'copied';
}
