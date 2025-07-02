/**
 * API客户端单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorCode } from '../response';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
    auth: {
      getUser: vi.fn(),
    },
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

// Import after mocking
import { ApiClient } from '../client';

interface MockSupabase {
  from: ReturnType<typeof vi.fn>;
  storage: {
    from: ReturnType<typeof vi.fn>;
  };
  auth: {
    getUser: ReturnType<typeof vi.fn>;
  };
  channel: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
}



describe('ApiClient', () => {
  let client: ApiClient;
  let mockSupabase: MockSupabase;

  beforeEach(async () => {
    // Get the mocked supabase
    const { supabase } = await import('@/lib/supabase');
    mockSupabase = supabase as unknown as MockSupabase;
    client = new ApiClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      const defaultClient = new ApiClient();
      expect(defaultClient).toBeInstanceOf(ApiClient);
    });

    it('should create client with custom config', () => {
      const customClient = new ApiClient({
        useApiRoutes: true,
        timeout: 5000,
        retries: 1,
      });
      expect(customClient).toBeInstanceOf(ApiClient);
    });
  });

  describe('callSupabase', () => {
    it('should handle successful Supabase response', async () => {
      const mockData = [{ id: 1, name: 'test' }];
      const mockOperation = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
        count: 1,
      });

      const result = await client.callSupabase(mockOperation);

      expect(mockOperation).toHaveBeenCalledWith(mockSupabase);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it('should handle Supabase error response', async () => {
      const mockError = { message: 'Database error', code: '42501' };
      const mockOperation = vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await client.callSupabase(mockOperation);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.PERMISSION_DENIED);
    });

    it('should handle operation exception', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await client.callSupabase(mockOperation);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.NETWORK_ERROR);
    });

    it('should apply transform function', async () => {
      const mockData = { id: 1, name: 'test' };
      const mockOperation = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      const transform = (data: typeof mockData) => ({
        ...data,
        transformed: true,
      });

      const result = await client.callSupabase(mockOperation, { transform });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 1,
        name: 'test',
        transformed: true,
      });
    });
  });

  describe('callApi', () => {
    it('should make successful API call', async () => {
      const mockResponse = {
        success: true,
        data: { id: 1, name: 'test' },
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as unknown as Response);

      const result = await client.callApi('/test');

      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle API error response', async () => {
      const mockErrorResponse = {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
        },
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue(mockErrorResponse),
      } as unknown as Response);

      const result = await client.callApi('/test');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('should handle network error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await client.callApi('/test');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.NETWORK_ERROR);
    });

    it.skip('should handle timeout', async () => {
      // Skip timeout test due to complex Mock requirements
      // Timeout functionality is tested in integration tests
    });

    it('should include query parameters', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true, data: {} }),
      } as unknown as Response);

      await client.callApi('/test', {
        params: { page: '1', limit: '10' },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/test?page=1&limit=10',
        expect.any(Object)
      );
    });

    it('should include request body for POST', async () => {
      const requestBody = { name: 'test' };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true, data: {} }),
      } as unknown as Response);

      await client.callApi('/test', {
        method: 'POST',
        body: requestBody,
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );
    });
  });

  describe('call (smart routing)', () => {
    it('should use Supabase when useApiRoutes is false', async () => {
      const mockData = [{ id: 1 }];
      const mockSupabaseOperation = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await client.call({
        supabase: mockSupabaseOperation,
        api: { endpoint: '/test' },
      });

      expect(mockSupabaseOperation).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it('should use API Routes when useApiRoutes is true', async () => {
      const mockResponse = { success: true, data: { id: 1 } };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as unknown as Response);

      const result = await client.call(
        {
          supabase: vi.fn(),
          api: { endpoint: '/test' },
        },
        { useApiRoutes: true }
      );

      expect(fetch).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('should return error for invalid operation', async () => {
      const result = await client.call({});

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
    });
  });

  describe('getCurrentUser', () => {
    it('should return user when authenticated', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await client.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });

    it('should return error when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await client.getCurrentUser();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.UNAUTHORIZED);
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const mockUploadData = { path: 'test/test.txt' };
      const mockPublicUrl = 'https://example.com/test.txt';

      const mockStorageBucket = {
        upload: vi.fn().mockResolvedValue({
          data: mockUploadData,
          error: null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: mockPublicUrl },
        }),
      };

      mockSupabase.storage.from.mockReturnValue(mockStorageBucket);

      const result = await client.uploadFile('test-bucket', 'test/test.txt', mockFile);

      expect(mockStorageBucket.upload).toHaveBeenCalledWith(
        'test/test.txt',
        mockFile,
        undefined
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        path: 'test/test.txt',
        fullPath: mockPublicUrl,
      });
    });

    it('should handle upload error', async () => {
      const mockFile = new File(['content'], 'test.txt');
      const mockError = { message: 'Upload failed' };

      const mockStorageBucket = {
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };

      mockSupabase.storage.from.mockReturnValue(mockStorageBucket);

      const result = await client.uploadFile('test-bucket', 'test/test.txt', mockFile);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
    });
  });

  describe('deleteFile', () => {
    it('should delete files successfully', async () => {
      const mockStorageBucket = {
        remove: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabase.storage.from.mockReturnValue(mockStorageBucket);

      const result = await client.deleteFile('test-bucket', ['file1.txt', 'file2.txt']);

      expect(mockStorageBucket.remove).toHaveBeenCalledWith(['file1.txt', 'file2.txt']);
      expect(result.success).toBe(true);
    });

    it('should handle delete error', async () => {
      const mockError = { message: 'Delete failed' };
      const mockStorageBucket = {
        remove: vi.fn().mockResolvedValue({
          error: mockError,
        }),
      };

      mockSupabase.storage.from.mockReturnValue(mockStorageBucket);

      const result = await client.deleteFile('test-bucket', ['file1.txt']);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
    });
  });

  describe('subscribeToChanges', () => {
    it('should set up real-time subscription', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      };

      mockSupabase.channel.mockReturnValue(mockChannel);

      const callback = vi.fn();
      const unsubscribe = client.subscribeToChanges('test_table', callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith('test_table_changes');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_table',
          filter: undefined,
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();

      // Test unsubscribe
      unsubscribe();
      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('should handle subscription callback', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      };

      mockSupabase.channel.mockReturnValue(mockChannel);

      const callback = vi.fn();
      client.subscribeToChanges('test_table', callback);

      // Get the callback function passed to .on()
      const onCallback = mockChannel.on.mock.calls[0][2];

      // Simulate a payload
      const mockPayload = {
        eventType: 'INSERT',
        new: { id: 1, name: 'test' },
        old: null,
      };

      onCallback(mockPayload);

      expect(callback).toHaveBeenCalledWith({
        eventType: 'INSERT',
        new: { id: 1, name: 'test' },
        old: null,
      });
    });
  });
});
