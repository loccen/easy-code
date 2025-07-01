/**
 * 积分系统单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase first
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Import after mocking
import {
  getUserCredits,
  grantRegistrationBonus,
  spendUserCredits,
  addUserCredits,
  getCreditHistory,
  getCreditSettings,
  updateCreditSettings
} from '../credits';

describe('Credits API', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get fresh mock reference
    mockSupabase = (await import('../supabase')).supabase;
  });

  describe('getUserCredits', () => {
    it('should fetch user credits successfully', async () => {
      const mockCredits = {
        id: 'credit-123',
        user_id: 'user-123',
        total_credits: 1000,
        available_credits: 800,
        frozen_credits: 200,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(createMockSupabaseResponse([mockCredits])),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getUserCredits('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('user_credits');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockQuery.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockCredits);
    });

    it('should return default credits for new user', async () => {
      const mockNewCredits = {
        id: 'credit-new',
        user_id: 'new-user',
        total_credits: 0,
        available_credits: 0,
        frozen_credits: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // First query returns empty array (no existing credits)
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(createMockSupabaseResponse([])),
      };

      // Second query for insert
      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(createMockSupabaseResponse([mockNewCredits])),
      };

      mockSupabase.from.mockReturnValueOnce(mockQuery).mockReturnValueOnce(mockInsertQuery);

      const result = await getUserCredits('new-user');

      expect(result).toEqual(mockNewCredits);
    });

    it('should handle database errors', async () => {
      const mockError = new Error('Database connection failed');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(getUserCredits('user-123')).rejects.toThrow('Database connection failed');
    });
  });

  describe('grantRegistrationBonus', () => {
    it('should grant registration bonus successfully', async () => {
      // Mock get_credit_config RPC call
      mockSupabase.rpc.mockResolvedValueOnce(createMockSupabaseResponse(100)); // register_bonus
      mockSupabase.rpc.mockResolvedValueOnce(createMockSupabaseResponse('tx-123')); // add_user_credits

      await grantRegistrationBonus('user-123');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_credit_config', {
        p_config_key: 'register_bonus',
      });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('add_user_credits', {
        p_user_id: 'user-123',
        p_amount: 100,
        p_transaction_type: 'earn_register',
        p_description: '注册奖励积分',
        p_reference_id: null,
        p_reference_type: 'system',
        p_created_by: null,
      });
    });

    it('should handle missing settings gracefully', async () => {
      // Mock get_credit_config RPC call returning null (use default)
      mockSupabase.rpc.mockResolvedValueOnce(createMockSupabaseResponse(null)); // register_bonus
      mockSupabase.rpc.mockResolvedValueOnce(createMockSupabaseResponse('tx-123')); // add_user_credits

      await grantRegistrationBonus('user-123');

      // Should use default bonus amount when config returns null
      expect(mockSupabase.rpc).toHaveBeenCalledWith('add_user_credits', {
        p_user_id: 'user-123',
        p_amount: null, // Will be null when config not found
        p_transaction_type: 'earn_register',
        p_description: '注册奖励积分',
        p_reference_id: null,
        p_reference_type: 'system',
        p_created_by: null,
      });
    });

    it('should handle RPC errors', async () => {
      const mockError = new Error('RPC failed');
      mockSupabase.rpc.mockResolvedValueOnce(createMockSupabaseResponse(null, mockError)); // get_credit_config fails

      // Should not throw error, just log it (registration bonus failure shouldn't block registration)
      await expect(grantRegistrationBonus('user-123')).resolves.toBeUndefined();
    });
  });

  describe('spendUserCredits', () => {
    it('should spend credits successfully', async () => {
      const spendData = {
        user_id: 'user-123',
        amount: 50,
        transaction_type: 'spend_purchase' as const,
        description: '购买项目',
        reference_id: 'project-456',
      };

      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse('tx-456'));

      await spendUserCredits(spendData);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('spend_user_credits', {
        p_user_id: 'user-123',
        p_amount: 50,
        p_transaction_type: 'spend_purchase',
        p_description: '购买项目',
        p_reference_id: 'project-456',
        p_reference_type: null,
        p_created_by: null,
      });
    });

    it('should handle insufficient credits error', async () => {
      const spendData = {
        user_id: 'user-123',
        amount: 1000,
        transaction_type: 'spend_purchase' as const,
        description: '购买项目',
      };

      const mockError = new Error('Insufficient credits');
      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(null, mockError));

      await expect(spendUserCredits(spendData)).rejects.toThrow('Insufficient credits');
    });
  });

  describe('addUserCredits', () => {
    it('should add credits successfully', async () => {
      const addData = {
        user_id: 'user-123',
        amount: 200,
        transaction_type: 'earn_upload' as const,
        description: '项目上传奖励',
        reference_id: 'project-789',
      };

      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse('tx-789'));

      await addUserCredits(addData);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('add_user_credits', {
        p_user_id: 'user-123',
        p_amount: 200,
        p_transaction_type: 'earn_upload',
        p_description: '项目上传奖励',
        p_reference_id: 'project-789',
        p_reference_type: null,
        p_created_by: null,
      });
    });

    it('should handle RPC errors', async () => {
      const addData = {
        user_id: 'user-123',
        amount: 200,
        transaction_type: 'earn_upload' as const,
        description: '项目上传奖励',
      };

      const mockError = new Error('RPC execution failed');
      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(null, mockError));

      await expect(addUserCredits(addData)).rejects.toThrow('RPC execution failed');
    });
  });

  describe('getCreditHistory', () => {
    it('should fetch credit history with pagination', async () => {
      const mockHistory = [
        {
          id: 'tx-1',
          user_id: 'user-123',
          amount: 100,
          transaction_type: 'earn_registration',
          description: '注册奖励',
          created_at: new Date().toISOString(),
        },
        {
          id: 'tx-2',
          user_id: 'user-123',
          amount: -50,
          transaction_type: 'spend_purchase',
          description: '购买项目',
          created_at: new Date().toISOString(),
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockHistory,
          error: null,
          count: 2
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getCreditHistory('user-123', { page: 1, limit: 10 });

      expect(mockSupabase.from).toHaveBeenCalledWith('credit_transactions');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result.transactions).toEqual(mockHistory);
      expect(result.total).toBe(2);
    });

    it('should apply transaction type filter', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await getCreditHistory('user-123', {
        page: 1,
        limit: 10,
        transactionType: 'earn_upload'
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('transaction_type', 'earn_upload');
    });
  });

  describe('getCreditSettings', () => {
    it('should fetch credit settings successfully', async () => {
      const mockSettings = {
        registration_bonus: 100,
        upload_bonus: 50,
        docker_bonus_multiplier: 2,
        currency_exchange_rate: 0.01,
        demo_site_cost_per_hour: 5,
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockSettings)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getCreditSettings();

      expect(mockSupabase.from).toHaveBeenCalledWith('credit_settings');
      expect(result).toEqual(mockSettings);
    });

    it('should return default settings when not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, { code: 'PGRST116' })),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getCreditSettings();

      expect(result).toEqual({
        registration_bonus: 100,
        upload_bonus: 50,
        docker_bonus_multiplier: 2,
        review_bonus: 10,
        demo_site_cost_per_hour: 5,
      });
    });
  });

  describe('updateCreditSettings', () => {
    it('should update credit settings successfully', async () => {
      const newSettings = {
        registration_bonus: 150,
        upload_bonus: 75,
      };

      const mockUpdatedSettings = {
        ...newSettings,
        docker_bonus_multiplier: 2,
        currency_exchange_rate: 0.01,
        demo_site_cost_per_hour: 5,
      };

      const mockQuery = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockUpdatedSettings)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await updateCreditSettings(newSettings);

      expect(mockSupabase.from).toHaveBeenCalledWith('credit_settings');
      expect(mockQuery.upsert).toHaveBeenCalledWith(newSettings);
      expect(result).toEqual(mockUpdatedSettings);
    });

    it('should handle update errors', async () => {
      const newSettings = { registration_bonus: 150 };
      const mockError = new Error('Update failed');

      const mockQuery = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(updateCreditSettings(newSettings)).rejects.toThrow('Update failed');
    });
  });
});
