/**
 * FetchClient 测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchClient, authTokenManager } from '../fetch-client';
import { ErrorCode } from '../types';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('FetchClient', () => {
  let client: FetchClient;

  beforeEach(() => {
    client = new FetchClient('/api', 5000);
    mockFetch.mockClear();
    authTokenManager.setToken(null);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('constructor', () => {
    it('should create client with default values', () => {
      const defaultClient = new FetchClient();
      expect(defaultClient).toBeInstanceOf(FetchClient);
    });

    it('should create client with custom values', () => {
      const customClient = new FetchClient('/custom', 10000);
      expect(customClient).toBeInstanceOf(FetchClient);
    });
  });

  describe('setAuthToken', () => {
    it('should set auth token', () => {
      const token = 'test-token';
      client.setAuthToken(token);
      expect(authTokenManager.getToken()).toBe(token);
    });

    it('should clear auth token', () => {
      client.setAuthToken('test-token');
      client.setAuthToken(null);
      expect(authTokenManager.getToken()).toBeNull();
    });
  });

  describe('request', () => {
    it('should make successful GET request', async () => {
      const mockResponse = {
        success: true,
        data: { id: 1, name: 'test' },
        meta: { timestamp: '2023-01-01T00:00:00Z' }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.request('/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: expect.any(AbortSignal)
      });

      expect(result).toEqual(mockResponse);
    });

    it('should make POST request with body', async () => {
      const requestBody = { name: 'test' };
      const mockResponse = {
        success: true,
        data: { id: 1, ...requestBody }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.request('/test', {
        method: 'POST',
        body: requestBody
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: expect.any(AbortSignal)
      });

      expect(result).toEqual(mockResponse);
    });

    it('should include auth headers when token is set', async () => {
      const token = 'test-token';
      client.setAuthToken(token);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} })
      });

      await client.request('/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: expect.any(AbortSignal)
      });
    });

    it('should handle query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} })
      });

      await client.request('/test', {
        params: { page: 1, limit: 10, search: 'test query' }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test?page=1&limit=10&search=test+query',
        expect.any(Object)
      );
    });

    it('should handle HTTP error responses', async () => {
      const errorResponse = {
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Resource not found'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve(errorResponse)
      });

      const result = await client.request('/test');

      expect(result).toEqual(errorResponse);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.request('/test');

      expect(result).toEqual({
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: '网络请求失败',
          details: 'Network error'
        }
      });
    });

    it('should handle timeout', async () => {
      vi.useFakeTimers();

      // Mock a request that never resolves
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      const requestPromise = client.request('/test', { timeout: 1000 });

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(1001);

      const result = await requestPromise;

      expect(result).toEqual({
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: '请求超时'
        }
      });

      vi.useRealTimers();
    }, 15000); // 增加测试超时时间
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} })
      });
    });

    it('should make GET request', async () => {
      await client.get('/test', { page: 1 });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test?page=1',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should make POST request', async () => {
      const body = { name: 'test' };
      await client.post('/test', body);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body)
        })
      );
    });

    it('should make PUT request', async () => {
      const body = { name: 'updated' };
      await client.put('/test', body);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(body)
        })
      );
    });

    it('should make DELETE request', async () => {
      await client.delete('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should make PATCH request', async () => {
      const body = { status: 'active' };
      await client.patch('/test', body);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(body)
        })
      );
    });
  });
});

describe('AuthTokenManager', () => {
  beforeEach(() => {
    authTokenManager.setToken(null);
  });

  it('should be singleton', () => {
    const manager1 = authTokenManager;
    const manager2 = authTokenManager;
    expect(manager1).toBe(manager2);
  });

  it('should manage token state', () => {
    expect(authTokenManager.getToken()).toBeNull();
    expect(authTokenManager.getAuthHeaders()).toEqual({});

    authTokenManager.setToken('test-token');
    expect(authTokenManager.getToken()).toBe('test-token');
    expect(authTokenManager.getAuthHeaders()).toEqual({
      Authorization: 'Bearer test-token'
    });

    authTokenManager.setToken(null);
    expect(authTokenManager.getToken()).toBeNull();
    expect(authTokenManager.getAuthHeaders()).toEqual({});
  });
});
