import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, apiGet } from '../src/api/client';

test('GET requests do not immediately retry rate limits and expose Retry-After', async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return new Response(JSON.stringify({ success: false, error: 'API_RATE_LIMITED' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '120' }
    });
  };

  try {
    await assert.rejects(apiGet('/api/test'), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, 'API_RATE_LIMITED');
      assert.equal(error.retryAfter, 120);
      return true;
    });
    assert.equal(requestCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('successful empty JSON responses are rejected instead of returned as valid data', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('null', {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

  try {
    await assert.rejects(apiGet('/api/test'), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, 'INVALID_API_RESPONSE');
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
