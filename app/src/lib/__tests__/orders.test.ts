import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createOrder,
  completeCreditsOrder,
  cancelOrder,
  getOrderById,
  getUserPurchaseHistory,
  getSellerSalesStats,
  checkUserPurchased
} from '../orders';

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

// Get the mocked supabase instance
const { supabase: mockSupabase } = await import('../supabase');

// Type for mocked Supabase instance
type MockSupabase = {
  rpc: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
  auth: {
    getUser: ReturnType<typeof vi.fn>;
  };
};

// Helper function to create mock Supabase response
function createMockSupabaseResponse<T>(data: T, error: Error | null = null) {
  return { data, error };
}

// Mock data factories
function createMockOrder(overrides = {}) {
  return {
    id: 'order-123',
    buyer_id: 'buyer-123',
    project_id: 'project-123',
    payment_method: 'credits',
    status: 'completed',
    total_amount: 100,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockPurchaseHistoryItem(overrides = {}) {
  return {
    id: 'order-123',
    project_id: 'project-123',
    project_title: 'Test Project',
    project_description: 'Test Description',
    seller_username: 'test-seller',
    total_amount: 100,
    payment_method: 'credits',
    status: 'completed',
    created_at: new Date().toISOString(),
    download_count: 0,
    ...overrides,
  };
}

describe('Orders API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create order successfully', async () => {
      const mockUser = { id: 'buyer-123' };
      mockSupabase.auth.getUser.mockResolvedValue(createMockSupabaseResponse({ user: mockUser }));
      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse('order-123'));

      const request = {
        project_id: 'project-123',
        payment_method: 'credits' as const,
      };

      const result = await createOrder(request);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_order', {
        p_buyer_id: 'buyer-123',
        p_project_id: 'project-123',
        p_payment_method: 'credits',
      });
      expect(result).toBe('order-123');
    });

    it('should handle RPC errors', async () => {
      const mockUser = { id: 'buyer-123' };
      mockSupabase.auth.getUser.mockResolvedValue(createMockSupabaseResponse({ user: mockUser }));
      
      const mockError = new Error('Order creation failed');
      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(null, mockError));

      const request = {
        project_id: 'project-123',
        payment_method: 'credits' as const,
      };

      await expect(createOrder(request)).rejects.toThrow('Order creation failed');
    });
  });

  describe('completeCreditsOrder', () => {
    it('should complete credits order successfully', async () => {
      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(true));

      const result = await completeCreditsOrder('order-123');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('complete_credits_order', {
        p_order_id: 'order-123',
      });
      expect(result).toBe(true);
    });

    it('should handle completion errors', async () => {
      const mockError = new Error('Payment processing failed');
      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(null, mockError));

      await expect(completeCreditsOrder('order-123')).rejects.toThrow('Payment processing failed');
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order successfully', async () => {
      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(true));

      const result = await cancelOrder('order-123', 'User requested cancellation');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('cancel_order', {
        p_order_id: 'order-123',
        p_reason: 'User requested cancellation',
      });
      expect(result).toBe(true);
    });

    it('should cancel order without reason', async () => {
      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(true));

      const result = await cancelOrder('order-123');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('cancel_order', {
        p_order_id: 'order-123',
        p_reason: null,
      });
      expect(result).toBe(true);
    });
  });

  describe('getUserPurchaseHistory', () => {
    it('should fetch user purchase history successfully', async () => {
      const mockPurchases = [
        createMockPurchaseHistoryItem(),
        createMockPurchaseHistoryItem({ id: 'order-456', project_title: 'Another Project' }),
      ];

      // Mock RPC call for purchase history
      (mockSupabase as MockSupabase).rpc.mockResolvedValueOnce(createMockSupabaseResponse(mockPurchases));

      // Mock count query
      const mockCountQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      // Setup chain: select -> eq -> eq -> resolved value
      mockCountQuery.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 2, error: null })
        })
      });

      (mockSupabase as MockSupabase).from.mockReturnValue(mockCountQuery);

      const result = await getUserPurchaseHistory('buyer-123', 10, 0);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_purchase_history', {
        p_user_id: 'buyer-123',
        p_limit: 10,
        p_offset: 0,
      });
      expect(result.purchases).toEqual(mockPurchases);
      expect(result.total).toBe(2);
    });
  });

  describe('getOrderById', () => {
    it('should fetch order by ID successfully', async () => {
      const mockOrder = createMockOrder();

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockOrder)),
      };

      (mockSupabase as MockSupabase).from.mockReturnValue(mockQuery);

      const result = await getOrderById('order-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('orders');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'order-123');
      expect(result).toEqual(mockOrder);
    });

    it('should return null when order not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, { code: 'PGRST116' })),
      };

      (mockSupabase as MockSupabase).from.mockReturnValue(mockQuery);

      const result = await getOrderById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('checkUserPurchased', () => {
    it('should check if user purchased project', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(createMockSupabaseResponse([{ id: 'order-123' }])),
      };

      (mockSupabase as MockSupabase).from.mockReturnValue(mockQuery);

      const result = await checkUserPurchased('buyer-123', 'project-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('orders');
      expect(mockQuery.eq).toHaveBeenCalledWith('buyer_id', 'buyer-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('project_id', 'project-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'completed');
      expect(result).toBe(true); // 修正：找到已完成订单应返回true
    });

    it('should return false when user has not purchased', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(createMockSupabaseResponse([])), // 返回空数组表示未找到
      };

      (mockSupabase as MockSupabase).from.mockReturnValue(mockQuery);

      const result = await checkUserPurchased('buyer-123', 'project-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('orders');
      expect(mockQuery.eq).toHaveBeenCalledWith('buyer_id', 'buyer-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('project_id', 'project-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'completed');
      expect(result).toBe(false); // 未找到订单应返回false
    });
  });

  describe('getSellerSalesStats', () => {
    it('should fetch seller sales stats successfully', async () => {
      const mockStats = {
        total_sales: 1500,
        total_orders: 15,
        this_month_sales: 300,
        this_month_orders: 3,
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockStats)),
      };

      (mockSupabase as MockSupabase).from.mockReturnValue(mockQuery);

      const result = await getSellerSalesStats('seller-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('seller_sales_stats');
      expect(mockQuery.eq).toHaveBeenCalledWith('seller_id', 'seller-123');
      expect(result).toEqual(mockStats);
    });

    it('should handle stats fetch errors', async () => {
      const mockError = new Error('Stats fetch failed');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockError)),
      };

      (mockSupabase as MockSupabase).from.mockReturnValue(mockQuery);

      await expect(getSellerSalesStats('seller-123')).rejects.toThrow('Stats fetch failed');
    });
  });
});
