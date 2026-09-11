import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCorsJson } from './http';

describe('fetchCorsJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests JSON without credentials so Safari can follow the Apps Script redirect', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => ({
      ok: true,
      json: async () => [{ preferredName: 'Sofia' }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchCorsJson('https://script.google.com/macros/s/example/exec')).resolves.toEqual([
      { preferredName: 'Sofia' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith('https://script.google.com/macros/s/example/exec', {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'follow',
      headers: { Accept: 'application/json' },
    });
  });

  it('surfaces HTTP failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, json: async () => null })));
    await expect(fetchCorsJson('https://example.test')).rejects.toThrow('HTTP 502');
  });
});
