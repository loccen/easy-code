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
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get fresh mock reference
    mockSupabase = (await import('../supabase')).supabase;
  });

  describe('getUserCredits', () => {
    it('should fetch user credits successfully', async () => {
      const mockCredits = {
        user_id: 'user-123',
        available_credits: 1000,
        total_earned: 1500,
        total_spent: 500,
        updated_at: new Date().toISOString(),
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockCredits)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getUserCredits('user-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('credits');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result).toEqual(mockCredits);
    });

    it('should return default credits for new user', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, { code: 'PGRST116' })),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getUserCredits('new-user');

      expect(result).toEqual({
        user_id: 'new-user',
        available_credits: 0,
        total_earned: 0,
        total_spent: 0,
      });
    });

    it('should handle database errors', async () => {
      const mockError = new Error('Database connection failed');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(getUserCredits('user-123')).rejects.toThrow('Database connection failed');
    });
  });

  describe('grantRegistrationBonus', () => {
    it('should grant registration bonus successfully', async () => {
      const mockSettings = {
        registration_bonus: 100,
        currency_exchange_rate: 0.01,
      };

      const mockSettingsQuery = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockSettings)),
      };

      mockSupabase.from.mockReturnValue(mockSettingsQuery);
      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(null));

      await grantRegistrationBonus('user-123');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('add_user_credits', {
        user_id: 'user-123',
        amount: 100,
        transaction_type: 'earn_registration',
        description: '注册奖励',
      });
    });

    it('should handle missing settings gracefully', async () => {
      const mockSettingsQuery = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, { code: 'PGRST116' })),
      };

      mockSupabase.from.mockReturnValue(mockSettingsQuery);
      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(null));

      await grantRegistrationBonus('user-123');

      // Should use default bonus amount
      expect(mockSupabase.rpc).toHaveBeenCalledWith('add_user_credits', {
        user_id: 'user-123',
        amount: 100, // default amount
        transaction_type: 'earn_registration',
        description: '注册奖励',
      });
    });

    it('should handle RPC errors', async () => {
      const mockSettings = { registration_bonus: 100 };
      const mockSettingsQuery = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockSettings)),
      };

      const mockError = new Error('RPC failed');
      mockSupabase.from.mockReturnValue(mockSettingsQuery);
      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(null, mockError));

      await expect(grantRegistrationBonus('user-123')).rejects.toThrow('RPC failed');
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

      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(null));

      await spendUserCredits(spendData);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('spend_user_credits', spendData);
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

      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(null));

      await addUserCredits(addData);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('add_user_credits', addData);
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
        range: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockHistory, null, 2)),
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
        range: vi.fn().mockResolvedValue(createMockSupabaseResponse([], null, 0)),
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
        currency_exchange_rate: 0.01,
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
