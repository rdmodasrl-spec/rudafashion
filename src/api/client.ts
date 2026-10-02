export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly retryAfter?: number;

  constructor(message: string, status: number, code?: string, retryAfter?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

function getRetryAfterSeconds(response: Response): number | undefined {
  const value = response.headers.get('Retry-After');
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const retryAt = Date.parse(value);
  return Number.isFinite(retryAt) ? Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)) : undefined;
}

export async function apiRequest<T>(
  input: string,
  init: RequestInit = {},
  timeoutMs = 15_000
): Promise<T> {
  const canRetry = !init.method || init.method.toUpperCase() === 'GET';
  for (let attempt = 0; attempt < (canRetry ? 2 : 1); attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const abortOnCallerSignal = () => controller.abort();
    init.signal?.addEventListener('abort', abortOnCallerSignal, { once: true });
    let response: Response;
    try {
      response = await fetch(input, {
        ...init,
        credentials: init.credentials || 'include',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers
        }
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (init.signal?.aborted) {
          throw error;
        }
        throw new ApiError('REQUEST_TIMEOUT', 408, 'REQUEST_TIMEOUT');
      }
      if (canRetry && attempt === 0) {
        await new Promise(resolve => setTimeout(resolve, 250));
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      init.signal?.removeEventListener('abort', abortOnCallerSignal);
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false) {
      if (canRetry && attempt === 0 && [408, 500, 502, 503, 504].includes(response.status)) {
        await new Promise(resolve => setTimeout(resolve, 250));
        continue;
      }
      throw new ApiError(
        payload?.error || `REQUEST_FAILED_${response.status}`,
        response.status,
        payload?.error,
        typeof payload?.retryAfter === 'number' ? payload.retryAfter : getRetryAfterSeconds(response)
      );
    }
    if (payload === null && response.status !== 204) {
      throw new ApiError('INVALID_API_RESPONSE', response.status, 'INVALID_API_RESPONSE');
    }
    return payload as T;
  }
  throw new ApiError('REQUEST_FAILED', 500, 'REQUEST_FAILED');
}

export function apiGet<T>(input: string): Promise<T> {
  return apiRequest<T>(input);
}

export function apiPost<T>(input: string, body: unknown, timeoutMs?: number, headers?: HeadersInit): Promise<T> {
  const requestBody = body instanceof Blob ? body : JSON.stringify(body);
  return apiRequest<T>(input, {
    method: 'POST',
    body: requestBody,
    ...(headers ? { headers } : {})
  }, timeoutMs);
}

export function apiPostWithUploadProgress<T>(
  input: string,
  body: FormData,
  timeoutMs: number,
  onProgress: (loaded: number, total: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', input);
    request.withCredentials = true;
    request.timeout = timeoutMs;
    request.setRequestHeader('Accept', 'application/json');
    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(event.loaded, event.total);
    };
    request.onerror = () => reject(new ApiError('NETWORK_ERROR', 0, 'NETWORK_ERROR'));
    request.ontimeout = () => reject(new ApiError('REQUEST_TIMEOUT', 408, 'REQUEST_TIMEOUT'));
    request.onabort = () => reject(new ApiError('REQUEST_ABORTED', 0, 'REQUEST_ABORTED'));
    request.onload = () => {
      let payload: Record<string, unknown> | null = null;
      try {
        const parsed: unknown = JSON.parse(request.responseText);
        if (parsed && typeof parsed === 'object') payload = parsed as Record<string, unknown>;
      } catch {
        payload = null;
      }
      if (request.status < 200 || request.status >= 300 || payload?.success === false || !payload) {
        const error = typeof payload?.error === 'string' ? payload.error : `REQUEST_FAILED_${request.status}`;
        reject(new ApiError(
          error,
          request.status,
          error,
          typeof payload?.retryAfter === 'number' ? payload.retryAfter : undefined
        ));
        return;
      }
      resolve(payload as T);
    };
    request.send(body);
  });
}

export function apiPut<T>(input: string, body: unknown): Promise<T> {
  return apiRequest<T>(input, { method: 'PUT', body: JSON.stringify(body) });
}

export function apiPatch<T>(input: string, body: unknown): Promise<T> {
  return apiRequest<T>(input, { method: 'PATCH', body: JSON.stringify(body) });
}

export function apiDelete<T>(input: string): Promise<T> {
  return apiRequest<T>(input, { method: 'DELETE' });
}
