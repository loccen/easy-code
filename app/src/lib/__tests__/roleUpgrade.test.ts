import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createRoleUpgradeRequest,
  getUserRoleUpgradeRequests,
  getAllRoleUpgradeRequests,
  reviewRoleUpgradeRequest,
  getRoleUpgradeRequestById,
  hasPendingUpgradeRequest,
  getRoleUpgradeStats
} from '../roleUpgrade';

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Get the mocked supabase instance
const { supabase: mockSupabase } = await import('../supabase');

// Helper function to create mock Supabase response
function createMockSupabaseResponse(data: any, error: any = null) {
  return { data, error };
}

// Mock data factories
function createMockRoleUpgradeRequest(overrides = {}) {
  return {
    id: 'req-123',
    user_id: 'user-123',
    from_role: 'buyer',
    to_role: 'seller',
    reason: 'I want to sell my projects',
    experience: '5 years of development experience',
    portfolio_url: 'https://portfolio.example.com',
    github_url: 'https://github.com/user',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    reviewed_at: null,
    reviewed_by: null,
    review_notes: null,
    ...overrides,
  };
}

function createMockUser(overrides = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    role: 'buyer',
    ...overrides,
  };
}

describe('Role Upgrade API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRoleUpgradeRequest', () => {
    it('should create role upgrade request successfully', async () => {
      const mockUser = createMockUser();
      const mockUserData = [{ role: 'buyer' }];
      const mockRequest = createMockRoleUpgradeRequest();

      mockSupabase.auth.getUser.mockResolvedValue(createMockSupabaseResponse({ user: mockUser }));

      const mockUsersQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockUserData)),
      };

      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockRequest)),
      };

      mockSupabase.from.mockReturnValueOnce(mockUsersQuery).mockReturnValueOnce(mockInsertQuery);

      const requestData = {
        to_role: 'seller' as const,
        reason: 'I want to sell my projects',
        experience: '5 years of development experience',
        portfolio_url: 'https://portfolio.example.com',
        github_url: 'https://github.com/user',
      };

      const result = await createRoleUpgradeRequest(requestData);

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockUsersQuery.eq).toHaveBeenCalledWith('id', 'user-123');
      expect(mockInsertQuery.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        from_role: 'buyer',
        to_role: 'seller',
        reason: 'I want to sell my projects',
        experience: '5 years of development experience',
        portfolio_url: 'https://portfolio.example.com',
        github_url: 'https://github.com/user',
      });
      expect(result).toEqual(mockRequest);
    });

    it('should handle authentication errors', async () => {
      const mockError = new Error('Authentication failed');
      mockSupabase.auth.getUser.mockResolvedValue(createMockSupabaseResponse({ user: null }, mockError));

      const requestData = {
        to_role: 'seller' as const,
        reason: 'I want to sell my projects',
      };

      await expect(createRoleUpgradeRequest(requestData)).rejects.toThrow('用户未登录');
    });

    it('should handle missing user data', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue(createMockSupabaseResponse({ user: mockUser }));

      const mockUsersQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(createMockSupabaseResponse([])),
      };

      mockSupabase.from.mockReturnValue(mockUsersQuery);

      const requestData = {
        to_role: 'seller' as const,
        reason: 'I want to sell my projects',
      };

      await expect(createRoleUpgradeRequest(requestData)).rejects.toThrow('用户信息不存在');
    });
  });

  describe('getUserRoleUpgradeRequests', () => {
    it('should fetch user role upgrade requests successfully', async () => {
      const mockRequests = [
        createMockRoleUpgradeRequest(),
        createMockRoleUpgradeRequest({ id: 'req-456', to_role: 'admin' }),
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockRequests)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getUserRoleUpgradeRequests();

      expect(mockSupabase.from).toHaveBeenCalledWith('role_upgrade_requests');
      expect(result).toEqual(mockRequests);
    });
  });

  describe('getAllRoleUpgradeRequests', () => {
    it('should fetch all role upgrade requests', async () => {
      const mockRequests = [
        createMockRoleUpgradeRequest(),
        createMockRoleUpgradeRequest({ id: 'req-456', user_id: 'user-456' }),
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockRequests)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getAllRoleUpgradeRequests();

      expect(mockSupabase.from).toHaveBeenCalledWith('role_upgrade_requests');
      expect(result).toEqual(mockRequests);
    });

    it('should filter by status when provided', async () => {
      const mockRequests = [createMockRoleUpgradeRequest({ status: 'pending' })];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockRequests)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getAllRoleUpgradeRequests('pending');

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'pending');
      expect(result).toEqual(mockRequests);
    });
  });

  describe('reviewRoleUpgradeRequest', () => {
    it('should approve role upgrade request successfully', async () => {
      const mockUser = createMockUser({ id: 'admin-123' });
      const mockRequest = createMockRoleUpgradeRequest({ status: 'approved' });

      mockSupabase.auth.getUser.mockResolvedValue(createMockSupabaseResponse({ user: mockUser }));

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockRequest)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await reviewRoleUpgradeRequest('req-123', 'approved', 'Approved based on experience');

      expect(mockSupabase.from).toHaveBeenCalledWith('role_upgrade_requests');
      expect(result).toEqual(mockRequest);
    });

    it('should handle review errors', async () => {
      const mockUser = createMockUser({ id: 'admin-123' });
      mockSupabase.auth.getUser.mockResolvedValue(createMockSupabaseResponse({ user: mockUser }));

      const mockError = new Error('Review failed');
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(
        reviewRoleUpgradeRequest('req-123', 'approved', 'Approved')
      ).rejects.toThrow('Review failed');
    });
  });

  describe('getRoleUpgradeRequestById', () => {
    it('should fetch role upgrade request by ID successfully', async () => {
      const mockRequest = createMockRoleUpgradeRequest();

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockRequest)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getRoleUpgradeRequestById('req-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('role_upgrade_requests');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'req-123');
      expect(result).toEqual(mockRequest);
    });

    it('should return null when request not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, { code: 'PGRST116' })),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getRoleUpgradeRequestById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('hasPendingUpgradeRequest', () => {
    it('should check if user has pending upgrade request', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue(createMockSupabaseResponse({ user: mockUser }));
      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(true));

      const result = await hasPendingUpgradeRequest('seller');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('has_pending_upgrade_request', {
        user_uuid: 'user-123',
        target_role: 'seller',
      });
      expect(result).toBe(true);
    });

    it('should return false when no pending request', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth.getUser.mockResolvedValue(createMockSupabaseResponse({ user: mockUser }));
      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(false));

      const result = await hasPendingUpgradeRequest('seller');

      expect(result).toBe(false);
    });
  });

  describe('getRoleUpgradeStats', () => {
    it('should fetch role upgrade stats successfully', async () => {
      const mockRequests = [
        createMockRoleUpgradeRequest({ status: 'pending' }),
        createMockRoleUpgradeRequest({ status: 'approved' }),
        createMockRoleUpgradeRequest({ status: 'rejected' }),
      ];

      const mockQuery = {
        select: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockRequests)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getRoleUpgradeStats();

      expect(mockSupabase.from).toHaveBeenCalledWith('role_upgrade_requests');
      expect(result.total).toBe(3);
      expect(result.pending).toBe(1);
      expect(result.approved).toBe(1);
      expect(result.rejected).toBe(1);
    });
  });
});
